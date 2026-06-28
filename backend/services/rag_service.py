"""RAG (Retrieval Augmented Generation) Service for Study AI with Gemini Integration"""
import os, re, uuid, socket, traceback
from datetime import datetime
from typing import List, Dict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Try to import optional dependencies
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

try:
    import chromadb
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False

# Try to import Google Gemini
try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# Global storage for study materials (in-memory fallback)
study_materials_db: Dict[str, dict] = {}
chat_history_db: Dict[str, List[Dict]] = {}


class RAGStudyService:
    def __init__(self):
        self.model = None
        self.collection = None
        self.gemini_client = None
        self.gemini_model = None
        self._initialize_model()
        self._initialize_vector_store()
        self._initialize_gemini()

    def _initialize_model(self):
        """Initialize the embedding model."""
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
                print("SentenceTransformer model loaded successfully")
            except Exception as e:
                print(f"Could not load SentenceTransformer: {e}")
        else:
            print("SentenceTransformers not available.")

    def _initialize_vector_store(self):
        """Initialize ChromaDB for vector storage."""
        if not CHROMADB_AVAILABLE:
            print("ChromaDB not available.")
            return

        try:
            os.makedirs("chroma_db", exist_ok=True)
            self.client = chromadb.PersistentClient(path="chroma_db")
            self.collection = self.client.get_or_create_collection(
                name="study_materials",
                metadata={"hnsw:space": "cosine"}
            )
            print("ChromaDB vector store initialized")
        except Exception as e:
            print(f"Could not initialize ChromaDB: {e}")

    def _initialize_gemini(self):
        """Initialize Gemini 1.5 Flash model."""
        if not GEMINI_AVAILABLE:
            print("Gemini not available (google.genai not installed).")
            return

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            print("Warning: GEMINI_API_KEY not configured.")
            return

        try:
            # Support both old AIzaSy... keys and new AQ... keys
            self.gemini_client = genai.Client(api_key=api_key.strip())
            self.gemini_model = "gemini-flash-latest"
            print("Gemini 1.5 Flash model initialized successfully")
        except Exception as e:
            print(f"Could not initialize Gemini: {e}")

    def chunk_text(self, text: str, chunk_size: int = 400, overlap: int = 100) -> List[str]:
        """Split text into overlapping chunks."""
        if len(text) <= chunk_size:
            return [text]

        chunks = []
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunks.append(text[start:end].strip())
            start = end - overlap if end < len(text) else end

        return chunks

    async def add_document(self, title: str, content: str, doc_type: str = "text",
                           user_id: str = "default", collection_id: str = "default") -> dict:

        doc_id = str(uuid.uuid4())
        chunks = self.chunk_text(content)

        embeddings = []
        if self.model:
            try:
                embeddings = self.model.encode(chunks).tolist()
            except Exception as e:
                print(f"Embedding generation failed: {e}")

        doc_data = {
            "id": doc_id,
            "title": title,
            "content": content,
            "chunks": chunks,
            "doc_type": doc_type,
            "user_id": user_id,
            "collection_id": collection_id,
            "created_at": datetime.now().isoformat(),
            "chunk_count": len(chunks)
        }

        study_materials_db[doc_id] = doc_data

        if self.collection and embeddings:
            try:
                for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                    chunk_id = f"{doc_id}_chunk_{i}"
                    self.collection.add(
                        ids=[chunk_id],
                        embeddings=[embedding],
                        metadatas=[{
                            "doc_id": doc_id,
                            "title": title,
                            "chunk_index": i,
                            "user_id": user_id
                        }],
                        documents=[chunk]
                    )
            except Exception as e:
                print(f"Could not add to vector store: {e}")

        return {
            "doc_id": doc_id,
            "title": title,
            "chunks_created": len(chunks),
            "status": "success",
            "message": f"Document '{title}' processed and stored successfully"
        }

    async def query_documents(self, query: str, user_id: str = "default",
                              top_k: int = 8) -> List[Dict]:
        """Query documents from in-memory DB (ChromaDB is supplementary)."""
        results = []

        # Try in-memory keyword search first (most reliable for current session)
        if study_materials_db:
            in_mem_results = self._keyword_search(query, user_id, top_k)
            if in_mem_results:
                return in_mem_results

        # Fallback: try ChromaDB vector search
        if self.collection and self.model:
            try:
                query_embedding = self.model.encode([query]).tolist()
                vector_results = self.collection.query(
                    query_embeddings=query_embedding,
                    n_results=top_k
                )

                if vector_results and vector_results['ids']:
                    for i in range(len(vector_results['ids'][0])):
                        doc_id = vector_results['metadatas'][0][i].get('doc_id', 'unknown')
                        if doc_id in study_materials_db:
                            results.append({
                                "chunk": vector_results['documents'][0][i],
                                "score": float(vector_results['distances'][0][i]),
                                "doc_id": doc_id,
                                "title": vector_results['metadatas'][0][i].get('title', 'Untitled')
                            })
            except Exception as e:
                print(f"Vector search failed: {e}")
        return results

    def _keyword_search(self, query: str, user_id: str, top_k: int) -> List[Dict]:
        """Keyword-based search with sentence-level scoring."""
        results = []
        if not query.strip():
            return results

        query_lower = query.lower()
        query_words = set(query_lower.split())

        for doc_id, doc in study_materials_db.items():
            if doc.get("user_id") != user_id:
                continue

            for i, chunk in enumerate(doc.get("chunks", [])):
                chunk_lower = chunk.lower()
                
                # Enhanced scoring
                score = 0
                # Exact phrase match
                if query_lower in chunk_lower:
                    score += 10.0
                # Word overlap
                chunk_words = set(chunk_lower.split())
                intersection = query_words & chunk_words
                if query_words:
                    word_score = len(intersection) / len(query_words)
                    score += word_score * 5.0
                
                # Sentence contains key question words
                if any(qw in chunk_lower for qw in ["definition", "define", "is a", "refers to", "means"]):
                    score += 2.0

                if score > 0.2:
                    results.append({
                        "chunk": chunk,
                        "score": score,
                        "doc_id": doc_id,
                        "title": doc.get("title", "Untitled")
                    })

            # Title matching with bonus
            title_words = set(doc.get("title", "").lower().split())
            intersection = query_words & title_words
            if intersection and query_words:
                score = len(intersection) / len(query_words) * 8.0
                results.append({
                    "chunk": doc.get("content", ""),
                    "score": score,
                    "doc_id": doc_id,
                    "title": doc.get("title", "Untitled")
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    async def generate_study_response(self, query: str, user_id: str = "default") -> str:
        """Generate a study-focused response using RAG with Gemini."""
        relevant_chunks = await self.query_documents(query, user_id)

        if not relevant_chunks:
            return self._generate_fallback_response(query)

        seen = set()
        unique_chunks = []
        for chunk in relevant_chunks:
            key = (chunk['title'], chunk['chunk'][:100])
            if key not in seen:
                seen.add(key)
                unique_chunks.append(chunk)

        if not unique_chunks:
            return self._generate_fallback_response(query)

        # Try Gemini first if available and configured
        if self.gemini_client and self.gemini_model:
            try:
                return await self._generate_with_gemini(query, unique_chunks)
            except (socket.gaierror, ConnectionError) as e:
                print(f"Network error connecting to Gemini: {e}")
                return await self._generate_local_response(query, unique_chunks, network_error=True)
            except Exception as e:
                print(f"Gemini generation failed, using local fallback: {e}")
                pass  # fall through to local

        return await self._generate_local_response(query, unique_chunks)

    async def _generate_with_gemini(self, query: str, chunks: List[Dict]) -> str:
        """Generate response using Gemini 1.5 Flash with google.genai."""
        context_parts = []
        for chunk in chunks:
            context_parts.append(f"From '{chunk['title']}': {chunk['chunk']}")

        context = "\n\n".join(context_parts)

        prompt = f"""You are a helpful study assistant. Answer the user's question based ONLY on the provided context from their study materials.

Context from study materials:
{context}

User Question: {query}

Please provide a clear, concise answer. Format your response like this:

**Answer:** [Your answer here]

**Sources:**
- [Source Title]
"""
        try:
            response = self.gemini_client.models.generate_content(
                model=self.gemini_model,
                contents=prompt
            )
            return response.text
        except Exception as e:
            raise e

    async def _generate_local_response(self, query: str, chunks: List[Dict], network_error: bool = False) -> str:
        """Enhanced fallback: Generate response locally from document chunks."""
        query_lower = query.lower()

        # Determine query type
        is_definition_query = any(kw in query_lower for kw in ['definition', 'define', 'what is', 'what does', 'meaning of', 'explain'])
        is_list_query = any(kw in query_lower for kw in ['list', 'name all', 'enumerate', 'outline', 'what are the', 'what are some', 'topics in', 'subjects in', 'key terms'])
        
        # Collect all relevant text
        all_text = ""
        seen_chunks = set()
        for chunk in chunks:
            clean = chunk['chunk'].strip()
            if clean and clean not in seen_chunks:
                seen_chunks.add(clean)
                all_text += clean + "\n\n"

        if not all_text.strip():
            return "I found some relevant documents but couldn't extract specific text. Try uploading the document again or asking a more specific question."

        # Build response
        header = ""
        if network_error:
            header = "*(Using offline mode - no internet connection to AI service)*\n\n"
        
        response = header + f"Based on your study materials, here is what I found about '{query}':\n\n"

        if is_definition_query:
            definitions = self._extract_definitions(all_text, query)
            if definitions:
                response += "**Definitions & Explanations:**\n"
                for i, defn in enumerate(definitions[:5], 1):
                    response += f"{i}. {defn}\n"
                response += "\n"
            else:
                response += self._get_relevant_excerpt(all_text, query) + "\n\n"

        elif is_list_query:
            topics = self._extract_topics(chunks)
            if topics:
                response += "**Key Terms & Topics Found:**\n"
                for i, topic in enumerate(topics[:10], 1):
                    response += f"{i}. {topic}\n"
                response += "\n"
            else:
                response += self._get_relevant_excerpt(all_text, query) + "\n\n"

        else:
            # General question
            response += self._get_relevant_excerpt(all_text, query) + "\n\n"

        response += "**Sources:**\n"
        sources = list(set(chunk['title'] for chunk in chunks))
        for src in sources:
            response += f"- {src}\n"

        return response

    def _extract_definitions(self, text: str, query: str) -> List[str]:
        """Extract definitions from text matching query terms."""
        definitions = []
        query_terms = set(query.lower().replace("definition", "").replace("define", "").replace("what is", "").replace("meaning of", "").strip().split())
        
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
        
        for sentence in sentences:
            sentence_clean = sentence.strip()
            if len(sentence_clean) < 20:
                continue
            
            sentence_lower = sentence_clean.lower()
            # Check if sentence contains query terms
            if any(term in sentence_lower for term in query_terms if len(term) > 2):
                # Check if it looks like a definition
                if any(marker in sentence_lower for marker in [' is a ', ' is defined as ', ' refers to ', ' means ', ' is the ', ' are ', ' is an ']):
                    definitions.append(sentence_clean)
                elif ' is ' in sentence_lower and len(sentence_clean) < 300:
                    definitions.append(sentence_clean)

        # Remove duplicates
        seen = set()
        unique = []
        for d in definitions:
            key = d[:80].lower()
            if key not in seen:
                seen.add(key)
                unique.append(d)
        return unique[:8]

    def _extract_topics(self, chunks: List[Dict]) -> List[str]:
        """Extract topics/headings from chunks."""
        topics = []
        skip_phrases = ['here are', 'count lines', 'output:', 'example', 'sample', 'the following']

        for chunk in chunks:
            text = chunk['chunk']
            lines = text.split('\n')
            for line in lines:
                line_stripped = line.strip()
                if not line_stripped or len(line_stripped) < 5:
                    continue
                lower = line_stripped.lower()
                is_heading = (lower.startswith('#') or 
                             lower.startswith('*') or 
                             lower.startswith('-') or 
                             line_stripped[0].isupper())
                if is_heading:
                    topic = line_stripped.lstrip('#-* ').strip()
                    if len(topic) > 5 and not any(topic.lower().startswith(sp) for sp in skip_phrases):
                        topics.append(topic)
                        
                # Also pick up bolded terms like **Term** or __Term__
                bold_matches = re.findall(r'\*\*(.+?)\*\*|__(.+?)__', line_stripped)
                for match in bold_matches:
                    term = match[0] or match[1]
                    if len(term) > 3 and len(term) < 80:
                        topics.append(term)

        seen = set()
        unique = []
        for t in topics:
            lower = t.lower()
            if lower not in seen:
                seen.add(lower)
                unique.append(t)
        return unique[:15]

    def _get_relevant_excerpt(self, text: str, query: str) -> str:
        """Get the most relevant excerpt from text for a query."""
        query_terms = set(query.lower().split())
        
        # Split into sentences
        sentences = re.split(r'(?<i>[.!?])\s+(?=[A-Z])', text)
        
        # Score each sentence
        scored = []
        for sentence in sentences:
            if not sentence or len(sentence) < 10:
                continue
            score = 0
            sentence_lower = sentence.lower()
            for term in query_terms:
                if len(term) < 3:
                    continue
                if term in sentence_lower:
                    score += 1
            if score > 0:
                scored.append((score, sentence))
        
        # Sort by score
        scored.sort(key=lambda x: x[0], reverse=True)
        
        # Return top sentences
        if scored:
            selected = scored[:5]
            return "\n\n".join(s[1] for s in selected)
        
        # Fallback: return first 500 chars
        return text[:500] + "..." if len(text) > 500 else text

    def _generate_fallback_response(self, query: str) -> str:
        """Fallback when no relevant documents are found."""
        return (f"I couldn't find specific information about '{query}' in your study materials. "
                f"\n\n**Tip:** Upload relevant documents first, then ask specific questions about their content.")


# Singleton instance
_rag_service = None


def get_rag_service():
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGStudyService()
    return _rag_service
