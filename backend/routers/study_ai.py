"""Study AI Router"""
import os, uuid
from datetime import datetime
from typing import Dict
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.rag_service import get_rag_service

router = APIRouter(prefix="/study-ai", tags=["study-ai"])

collections_db: Dict[str, dict] = {}
documents_db: Dict[str, dict] = {}

class ChatMessage(BaseModel):
    message: str
    user_id: str = "default"

class CreateCollection(BaseModel):
    name: str
    description: str = ""

class UploadText(BaseModel):
    title: str
    content: str
    collection_id: str = "default"

class RenameDoc(BaseModel):
    new_title: str

def _pdf_text(content: bytes) -> str:
    try:
        from io import BytesIO
        import PyPDF2
        reader = PyPDF2.PdfReader(BytesIO(content))
        text = ""
        for page in reader.pages:
            pt = page.extract_text()
            if pt: text += pt + "\n"
        return text if text else "[No text extracted from PDF]"
    except Exception as e:
        return f"[Error extracting PDF: {e}]"

@router.get("/collections")
async def get_collections(user_id: str = "default"):
    result = []
    for cid, coll in collections_db.items():
        if coll.get("user_id") == user_id:
            doc_count = sum(1 for d in documents_db.values() if d.get("collection_id") == cid)
            result.append({"id": cid, "name": coll["name"], "description": coll["description"], "document_count": doc_count, "created_at": coll["created_at"]})
    return {"collections": result}

@router.post("/collections")
async def post_collection(request: CreateCollection, user_id: str = "default"):
    cid = str(uuid.uuid4())
    collections_db[cid] = {"id": cid, "name": request.name, "description": request.description, "user_id": user_id, "created_at": datetime.now().isoformat()}
    return {"id": cid, "name": request.name, "message": "Created"}

@router.delete("/collections/{cid}")
async def del_collection(cid: str):
    if cid not in collections_db:
        raise HTTPException(status_code=404, detail="Collection not found")
    for doc_id in list(documents_db.keys()):
        if documents_db[doc_id].get("collection_id") == cid:
            del documents_db[doc_id]
    del collections_db[cid]
    return {"message": "Collection and documents deleted"}

@router.get("/documents")
async def get_docs(collection_id: str = "default", user_id: str = "default"):
    result = []
    is_default = collection_id == "default"
    for doc_id, doc in documents_db.items():
        if doc.get("user_id") == user_id and (is_default or doc.get("collection_id") == collection_id):
            result.append({"id": doc_id, "title": doc["title"], "collection_id": doc.get("collection_id", "default"),"collection_name": collections_db.get(doc.get("collection_id", "default"), {}).get("name", "Default"), "doc_type": doc["doc_type"], "created_at": doc["created_at"]})
    return {"documents": result, "count": len(result)}

@router.post("/documents/upload-text")
async def upload_text(request: UploadText, user_id: str = "default"):
    service = get_rag_service()
    result = await service.add_document(request.title, request.content, "text", user_id, request.collection_id)
    doc_id = result["doc_id"]
    documents_db[doc_id] = {"id": doc_id, "title": request.title, "content": request.content, "collection_id": request.collection_id, "doc_type": "text", "user_id": user_id, "created_at": datetime.now().isoformat(), "chunk_count": result["chunks_created"]}
    return {"message": "Document uploaded", "document": documents_db[doc_id]}

@router.post("/documents/upload-file")
async def upload_file(file: UploadFile = File(...), collection_id: str = Form("default"), user_id: str = Form("default")):
    service = get_rag_service()
    content = await file.read()
    if file.content_type == "application/pdf":
        text = _pdf_text(content)
        doc_type = "pdf"
    else:
        text = content.decode("utf-8", errors="ignore")
        doc_type = "txt"
    result = await service.add_document(file.filename, text, "text", user_id, collection_id)
    doc_id = result["doc_id"]
    documents_db[doc_id] = {"id": doc_id, "title": file.filename, "content": text, "collection_id": collection_id, "doc_type": doc_type, "user_id": user_id, "created_at": datetime.now().isoformat(), "chunk_count": result["chunks_created"]}
    return {"message": "File uploaded", "document": documents_db[doc_id]}

@router.delete("/documents/{doc_id}")
async def del_doc(doc_id: str):
    if doc_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    del documents_db[doc_id]
    return {"message": "Document deleted"}

@router.patch("/documents/{doc_id}/rename")
async def rename_doc(doc_id: str, request: RenameDoc):
    if doc_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    documents_db[doc_id]["title"] = request.new_title
    return {"message": "Renamed", "new_title": request.new_title}

@router.post("/chat")
async def chat_ai(message: ChatMessage):
    service = get_rag_service()
    chunks = await service.query_documents(message.message, message.user_id)
    text = await service.generate_study_response(message.message, message.user_id)
    conf = 0.0
    if chunks:
        conf = min(sum(c["score"] for c in chunks) / len(chunks), 1.0)
    return {"response": text, "sources": [{"doc_id": c["doc_id"], "title": c["title"], "relevance": c["score"]} for c in chunks],"confidence": conf}

@router.post("/quick-study")
async def quick_study(message: ChatMessage):
    service = get_rag_service()
    chunks = await service.query_documents(message.message, message.user_id, top_k=3)
    if not chunks:
        return {"key_points": ["No relevant material found. Upload some study documents first!"], "summary": "Start by uploading your notes or textbooks."}
    key_points = []
    for chunk in chunks:
        sentences = chunk["chunk"].split(". ")[:2]
        key_points.extend([s.strip() for s in sentences if len(s) > 10])
    key_points = list(dict.fromkeys(key_points))[:5]
    return {"key_points": key_points, "summary": f"Top {len(chunks)} most relevant sections found."}
