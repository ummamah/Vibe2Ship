# Core Services Implementation

## LLM Service (`backend/app/services/llm.py`)

```python
import httpx
import json
from typing import Dict, Any
from app.core.config import settings

class LLMService:
    """Service for interacting with cloud LLM APIs"""
    
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.model = settings.LLM_MODEL
        
        if self.provider == "openrouter":
            self.api_key = settings.OPENROUTER_API_KEY
            self.base_url = "https://openrouter.ai/api/v1"
        elif self.provider == "groq":
            self.api_key = settings.GROQ_API_KEY
            self.base_url = "https://api.groq.com/openai/v1"
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
    
    async def chat_completion(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """Get chat completion from LLM"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        if self.provider == "openrouter":
            headers["HTTP-Referer"] = "http://localhost:8000"
            headers["X-Title"] = "Personal AI Assistant"
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                raise Exception(f"LLM API error: {response.status_code} - {response.text}")
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    async def generate_schedule(self, prompt: str) -> dict:
        """Generate a schedule from a goal"""
        messages = [
            {
                "role": "system",
                "content": "You are an expert productivity coach. You help users break down goals into actionable schedules. Always respond with valid JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        response = await self.chat_completion(messages, temperature=0.5)
        
        # Try to extract JSON from response
        try:
            # Find JSON in response (might be wrapped in markdown)
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0].strip()
            else:
                json_str = response.strip()
            
            return json.loads(json_str)
        except json.JSONDecodeError:
            # Fallback: return as text if not valid JSON
            return {"text_response": response}
    
    async def answer_with_context(
        self,
        question: str,
        context: str,
        conversation_history: list[dict] = None
    ) -> str:
        """Answer a question given context (for RAG)"""
        messages = [
            {
                "role": "system",
                "content": """You are a helpful study assistant. Answer questions based on the provided context from the user's study materials. 

Guidelines:
- Always base your answer on the provided context
- If the context doesn't contain the answer, say so
- Be clear and concise
- Use examples from the context when helpful
- If asked to explain, break down complex topics simply"""
            }
        ]
        
        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history[-6:])  # Last 3 exchanges
        
        # Add context and question
        messages.append({
            "role": "user",
            "content": f"""Context from study materials:
{context}

Question: {question}

Please answer based on the context above."""
        })
        
        return await self.chat_completion(messages, temperature=0.3)


# Example usage:
# llm = LLMService()
# response = await llm.chat_completion([
#     {"role": "user", "content": "Hello!"}
# ])
```

## RAG Service (`backend/app/services/rag.py`)

```python
import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Tuple
import hashlib
from app.core.config import settings
from app.services.llm import LLMService

class RAGService:
    """Retrieval Augmented Generation service for study documents"""
    
    def __init__(self):
        # Initialize ChromaDB
        self.client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self.llm = LLMService()
    
    def _get_collection(self, folder_id: str):
        """Get or create a collection for a folder"""
        # Sanitize folder_id for collection name
        collection_name = f"folder_{folder_id}".replace("-", "_").replace(" ", "_")
        
        return self.client.get_or_create_collection(
            name=collection_name,
            metadata={"folder_id": folder_id}
        )
    
    async def add_documents(
        self,
        folder_id: str,
        chunks: List[dict],
        source_file: str
    ):
        """Add document chunks to vector database"""
        collection = self._get_collection(folder_id)
        
        documents = []
        metadatas = []
        ids = []
        
        for i, chunk in enumerate(chunks):
            # Create unique ID for chunk
            chunk_id = hashlib.md5(
                f"{source_file}_{i}_{chunk['text'][:50]}".encode()
            ).hexdigest()
            
            documents.append(chunk["text"])
            metadatas.append({
                "source": source_file,
                "chunk_index": i,
                "page": chunk.get("page", 0)
            })
            ids.append(chunk_id)
        
        # Add to collection (ChromaDB handles embedding automatically)
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        
        print(f"✓ Added {len(chunks)} chunks from {source_file} to {folder_id}")
    
    async def query(
        self,
        folder_id: str,
        question: str,
        conversation_id: str = None,
        top_k: int = 5
    ) -> Tuple[str, List[dict]]:
        """Query documents and get AI response"""
collection = self._get_collection(folder_id)
        
        # Search for relevant chunks
        results = collection.query(
            query_texts=[question],
            n_results=top_k
        )
        
        if not results["documents"] or not results["documents"][0]:
            return "I don't have any documents in this folder yet. Please upload some files first.", []
        
        # Combine retrieved chunks into context
        context_pieces = []
        sources = []
        
        for i, (doc, metadata) in enumerate(zip(
            results["documents"][0],
            results["metadatas"][0]
        )):
            context_pieces.append(f"[Source {i+1} - {metadata['source']}, page {metadata.get('page', 'N/A')}]:\n{doc}")
            sources.append({
                "source": metadata["source"],
                "page": metadata.get("page"),
                "text": doc[:200] + "..." if len(doc) > 200 else doc
            })
        
        context = "\n\n".join(context_pieces)
        
        # Get answer from LLM
        # TODO: Implement conversation history retrieval based on conversation_id
        answer = await self.llm.answer_with_context(
            question=question,
            context=context
        )
        
        return answer, sources
    
    def delete_folder(self, folder_id: str):
        """Delete all documents in a folder"""
        try:
            collection_name = f"folder_{folder_id}".replace("-", "_").replace(" ", "_")
            self.client.delete_collection(collection_name)
            print(f"✓ Deleted collection for {folder_id}")
        except Exception as e:
            print(f"Error deleting collection: {e}")
```

## File Processor (`backend/app/utils/file_processor.py`)

```python
import PyPDF2
import docx
from typing import List
import os

class FileProcessor:
    """Process different file types and extract text"""
    
    async def process_file(self, file_path: str, file_type: str) -> List[dict]:
        """Process a file and return text chunks"""
        if file_type == "pdf":
            return await self._process_pdf(file_path)
        elif file_type in ["docx", "doc"]:
            return await self._process_docx(file_path)
        elif file_type in ["txt", "md"]:
            return await self._process_text(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    async def _process_pdf(self, file_path: str) -> List[dict]:
        """Extract text from PDF"""
        chunks = []
        
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                
                if text.strip():
                    # Split page into smaller chunks (500-1000 chars)
                    page_chunks = self._split_text(text, max_chars=800)
                    
                    for chunk_text in page_chunks:
                        chunks.append({
                            "text": chunk_text,
                            "page": page_num + 1
                        })
        
        return chunks
    
    async def _process_docx(self, file_path: str) -> List[dict]:
        """Extract text from DOCX"""
        doc = docx.Document(file_path)
        full_text = "\n\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        
        # Split into chunks
        chunks = self._split_text(full_text, max_chars=800)
        
        return [{"text": chunk, "page": 0} for chunk in chunks]
    
    async def _process_text(self, file_path: str) -> List[dict]:
        """Extract text from TXT/MD files"""
        with open(file_path, 'r', encoding='utf-8') as file:
            text = file.read()
        
        chunks = self._split_text(text, max_chars=800)
        return [{"text": chunk, "page": 0} for chunk in chunks]
    
    def _split_text(self, text: str, max_chars: int = 800) -> List[str]:
        """Split text into chunks at sentence boundaries"""
        # Simple sentence splitter
        sentences = text.replace('\n', ' ').split('. ')
        
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            # Add period back if it was removed
            if not sentence.endswith('.'):
                sentence += '.'
            
            if len(current_chunk) + len(sentence) < max_chars:
                current_chunk += " " + sentence
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
```

## Scheduler Service (`backend/app/services/scheduler.py`)

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from typing import Optional

scheduler: Optional[AsyncIOScheduler] = None

async def check_reminders():
    """Check for tasks that need reminders"""
    print(f"[{datetime.now()}] Checking for reminders...")
    # TODO: Query database for tasks with reminders due
    # TODO: Send notifications
    pass

async def check_screen_time():
    """Check for excessive screen time"""
    print(f"[{datetime.now()}] Checking screen time...")
    # TODO: Query screen time data
    # TODO: Send warning if exceeded threshold
    pass

def start_scheduler():
    """Start the background scheduler"""
    global scheduler
    
    scheduler = AsyncIOScheduler()
    
    # Check reminders every minute
    scheduler.add_job(
        check_reminders,
        'interval',
        minutes=1,
        id='check_reminders'
    )
    
    # Check screen time every 30 minutes
    scheduler.add_job(
        check_screen_time,
        'interval',
        minutes=30,
        id='check_screen_time'
    )
    
    scheduler.start()
    print("✓ Scheduler started")

def stop_scheduler():
    """Stop the scheduler"""
    global scheduler
    
    if scheduler:
        scheduler.shutdown()
        print("✓ Scheduler stopped")
```

Continue to [FRONTEND_SETUP.md](FRONTEND_SETUP.md) for frontend implementation...
