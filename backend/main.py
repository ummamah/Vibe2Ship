import os
from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from pydantic import BaseModel
from datetime import datetime
import uuid
from routers.tasks import router as tasks_router, check_notifications, cleanup_tasks, get_tasks, get_prioritized_tasks, create_task
from routers.planner import router as planner_router
from routers.focus import router as focus_router
from routers.study_ai import router as study_ai_router, collections_db, documents_db
# from routers.auth import router as auth_router  # Auth disabled - uncomment to re-enable
from services.rag_service import get_rag_service
from services.timer import get_timer_service
from schemas.focus import FocusSessionInput, TimerAction
import db

app = FastAPI(
    title="AI Productivity API",
    description="AI-powered task prioritization and management",
    version="1.0.0"
)

# CORS: allow local dev and Firebase Hosting domains
_firebase_url = os.environ.get("FIREBASE_HOSTING_URL", "")
_origins = ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:3000"]
if _firebase_url:
    _origins.append(_firebase_url)
    _origins.append("https://" + _firebase_url.replace("https://", ""))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Log SMTP status at startup so configuration issues are visible immediately
# from services.email_service import smtp_status  # Auth disabled
_status = {"configured": False}
print("=" * 60)
print(f"[STARTUP] Auth router disabled - app is open access.")
print("=" * 60)

app.include_router(tasks_router, prefix="/api/v1", tags=["tasks"])
# app.include_router(auth_router, prefix="/api/v1", tags=["auth"])  # Auth disabled
app.include_router(planner_router, prefix="/api/v1", tags=["planner"])
app.include_router(focus_router, prefix="/api/v1", tags=["focus"])
app.include_router(study_ai_router, prefix="/api/v1", tags=["study-ai"])

@app.get("/")
async def root():
    return {"message": "AI Productivity API is running!", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "mode": "firestore" if db.is_firestore() else "memory"}

class CreateCollectionRoot(BaseModel):
    name: str
    description: str = ""

class UploadTextRoot(BaseModel):
    title: str
    content: str
    collection_id: str = "default"

def _pdf_text(content: bytes) -> str:
    try:
        from io import BytesIO
        import PyPDF2
        reader = PyPDF2.PdfReader(BytesIO(content))
        text = ""
        for page in reader.pages:
            pt = page.extract_text()
            if pt:
                text += pt + "\n"
        return text if text else "[No text extracted from PDF]"
    except ImportError:
        return "[PyPDF2 not installed; cannot read PDF]"
    except Exception as e:
        return f"[Error extracting PDF: {e}]"

# ── Root-level aliases (frontend expects these without /api/v1 prefix) ──
@app.get("/study-ai/collections")
async def _root_collections(user_id: str = "default"):
    result = []
    for cid, coll in collections_db.items():
        if coll.get("user_id") == user_id:
            doc_count = sum(1 for d in documents_db.values() if d.get("collection_id") == cid)
            result.append({"id": cid, "name": coll["name"], "description": coll["description"], "document_count": doc_count, "created_at": coll["created_at"]})
    return {"collections": result}

@app.post("/study-ai/collections")
async def _root_create_collection(request: CreateCollectionRoot, user_id: str = "default"):
    cid = str(uuid.uuid4())
    collections_db[cid] = {
        "id": cid,
        "name": request.name,
        "description": request.description,
        "user_id": user_id,
        "created_at": datetime.now().isoformat()
    }
    return {"id": cid, "name": request.name, "message": "Created"}

@app.delete("/study-ai/collections/{cid}")
async def _root_delete_collection(cid: str):
    if cid not in collections_db:
        return {"message": "Collection not found"}
    for doc_id in list(documents_db.keys()):
        if documents_db[doc_id].get("collection_id") == cid:
            del documents_db[doc_id]
    del collections_db[cid]
    return {"message": "Collection and documents deleted"}

@app.get("/study-ai/documents")
async def _root_get_docs(collection_id: str = "default", user_id: str = "default"):
    result = []
    is_default = collection_id == "default"
    for doc_id, doc in documents_db.items():
        if doc.get("user_id") == user_id and (is_default or doc.get("collection_id") == collection_id):
            result.append({
                "id": doc_id,
                "title": doc["title"],
                "collection_id": doc.get("collection_id", "default"),
                "collection_name": collections_db.get(doc.get("collection_id", "default"), {}).get("name", "Default"),
                "doc_type": doc["doc_type"],
                "created_at": doc["created_at"]
            })
    return {"documents": result, "count": len(result)}

@app.post("/study-ai/documents/upload-text")
async def _root_upload_text(request: UploadTextRoot, user_id: str = "default"):
    service = get_rag_service()
    result = await service.add_document(request.title, request.content, "text", user_id, request.collection_id)
    doc_id = result["doc_id"]
    documents_db[doc_id] = {
        "id": doc_id,
        "title": request.title,
        "content": request.content,
        "collection_id": request.collection_id,
        "doc_type": "text",
        "user_id": user_id,
        "created_at": datetime.now().isoformat(),
        "chunk_count": result["chunks_created"]
    }
    return {"message": "Document uploaded", "document": documents_db[doc_id]}

@app.delete("/study-ai/documents/{doc_id}")
async def _root_delete_document(doc_id: str):
    if doc_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    del documents_db[doc_id]
    return {"message": "Document deleted"}

class RenameDocRoot(BaseModel):
    new_title: str

@app.patch("/study-ai/documents/{doc_id}/rename")
async def _root_rename_document(doc_id: str, request: RenameDocRoot):
    if doc_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    documents_db[doc_id]["title"] = request.new_title
    return {"message": "Renamed", "new_title": request.new_title}

@app.post("/study-ai/documents/upload-file")
async def _root_upload_file(file: UploadFile = File(...), collection_id: str = Form("default"), user_id: str = Form("default")):
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
    documents_db[doc_id] = {
        "id": doc_id,
        "title": file.filename,
        "content": text,
        "collection_id": collection_id,
        "doc_type": doc_type,
        "user_id": user_id,
        "created_at": datetime.now().isoformat(),
        "chunk_count": result["chunks_created"]
    }
    return {"message": "File uploaded", "document": documents_db[doc_id]}

class ChatMessageRoot(BaseModel):
    message: str
    user_id: str = "default"

@app.post("/study-ai/chat")
async def _root_chat_ai(request: ChatMessageRoot):
    service = get_rag_service()
    chunks = await service.query_documents(request.message, request.user_id)
    if not chunks:
        return {"response": "I couldn't find any relevant documents to answer that.", "sources": [], "confidence": 0.0}
    
    response_text = ""
    if service.gemini_client and service.gemini_model:
        try:
            from google import genai
            prompt = "You are a helpful study assistant.\n\nContext from study materials:\n"
            for chunk in chunks:
                prompt += f"From '{chunk['title']}': {chunk['chunk']}\n\n"
            prompt += f"User Question: {request.message}\n\nPlease provide a clear, concise answer."
            res = service.gemini_client.models.generate_content(model=service.gemini_model, contents=prompt)
            response_text = res.text
        except Exception as e:
            response_text = f"Error generating response: {e}"
    else:
        # Simple local fallback
        key_points = []
        for chunk in chunks:
            sentences = chunk["chunk"].split(". ")[:2]
            key_points.extend([s.strip() for s in sentences if len(s) > 10])
        unique_points = list(dict.fromkeys(key_points))[:5]
        response_text = "Based on your study materials:\n" + "\n".join(f"- {p}" for p in unique_points) if unique_points else "I found relevant material but couldn't form a specific answer."

    sources = [{"doc_id": c.get("doc_id", ""), "title": c["title"], "relevance": c["score"]} for c in chunks]
    conf = min(sum(c["score"] for c in chunks) / len(chunks), 1.0) if chunks else 0.0

    return {"response": response_text, "sources": sources, "confidence": conf}

@app.get("/tasks")
async def _root_get_tasks():
    return await get_tasks()

@app.post("/tasks")
async def _root_create_task(request: Request):
    """Forward POST /tasks to the registered /api/v1/tasks/ endpoint"""
    body = await request.json()
    from routers.tasks import create_task
    from schemas.task import TaskCreate
    task_obj = TaskCreate(**body)
    task_id = str(uuid.uuid4())
    task_data = task_obj.model_dump()
    task_data["id"] = task_id
    task_data["created_at"] = datetime.now()
    task_data["status"] = "have_to_start"
    from routers.tasks import tasks_db, get_prioritizer
    tasks_db[task_id] = task_data
    from services.prioritizer import get_prioritizer as _gp
    prioritizer = _gp()
    analysis = await prioritizer.analyze_single_task(task_obj)
    tasks_db[task_id]["ai_analysis"] = analysis["ai_analysis"]
    tasks_db[task_id]["overall_score"] = analysis["ai_analysis"].overall_priority_score
    tasks_db[task_id]["is_critical"] = analysis["is_critical"]
    return {"success": True, "task": tasks_db[task_id]}

@app.get("/tasks/prioritized")
async def _root_get_prioritized_tasks():
    return await get_prioritized_tasks()

@app.get("/tasks/check-notifications")
async def _root_check_notifications():
    return await check_notifications()

@app.post("/tasks/cleanup")
async def _root_cleanup_tasks():
    return await cleanup_tasks()

class GeneratePlanRequest(BaseModel):
    title: str = ""
    description: str = ""
    deadline: datetime = None
    available_hours_per_day: float = 4.0
    preferences: dict = {}
    include_buffer: bool = True
    subtasks: list = []

@app.post("/tasks/planner/generate")
async def _root_generate_plan_direct(request: GeneratePlanRequest):
    """Generate an AI plan from a task description (creates task + generates subtasks + plan)"""
    from routers.tasks import tasks_db as _db
    from services.llm_service import get_llm_service
    from services.planner import get_planner_service
    from schemas.planner import TaskPlanRequest
    
    task_id = str(uuid.uuid4())
    task_data = {
        "id": task_id,
        "title": request.title,
        "description": request.description,
        "deadline": request.deadline,
        "created_at": datetime.now(),
        "user_id": "default",
        "status": "have_to_start"
    }
    _db[task_id] = task_data
    
    llm_service = get_llm_service()
    subtasks = []
    try:
        subtasks = await llm_service.generate_subtasks(
            title=request.title,
            description=request.description,
            deadline=request.deadline,
            available_hours_per_day=request.available_hours_per_day,
            preferences=request.preferences
        )
    except Exception:
        subtasks = []
    
    if not subtasks:
        planner = get_planner_service()
        subtasks = planner.generate_fallback_subtasks(
            request.title, request.description, request.deadline,
            request.available_hours_per_day, request.preferences
        )
    
    plan_request = TaskPlanRequest(
        title=request.title,
        description=request.description,
        deadline=request.deadline,
        start_date=datetime.now(),
        subtasks=subtasks,
        available_hours_per_day=request.available_hours_per_day,
        preferences=request.preferences,
        include_buffer=request.include_buffer
    )
    
    planner = get_planner_service()
    plan = planner.generate_plan(plan_request, task_id=task_id)
    
    return {"plan": plan, "subtasks": subtasks, "task_id": task_id}

@app.post("/tasks/{task_id}/ai-plan")
async def _root_generate_ai_plan(task_id: str, request: GeneratePlanRequest):
    """Generate AI subtasks + plan for an existing task"""
    from routers.tasks import tasks_db as _db
    if task_id not in _db:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = _db[task_id]
    from services.llm_service import get_llm_service
    from services.planner import get_planner_service
    from schemas.planner import TaskPlanRequest
    
    llm_service = get_llm_service()
    subtasks = []
    try:
        subtasks = await llm_service.generate_subtasks(
            title=task.get("title", "Untitled Task"),
            description=task.get("description", ""),
            deadline=task.get("deadline"),
            available_hours_per_day=request.available_hours_per_day,
            preferences=request.preferences
        )
    except Exception:
        subtasks = []
    
    if not subtasks:
        planner = get_planner_service()
        subtasks = planner.generate_fallback_subtasks(
            task.get("title", "Untitled Task"),
            task.get("description", ""),
            task.get("deadline"),
            request.available_hours_per_day,
            request.preferences
        )
    
    plan_request = TaskPlanRequest(
        title=task.get("title", "Untitled Task"),
        description=task.get("description", ""),
        deadline=task.get("deadline"),
        start_date=datetime.now(),
        subtasks=subtasks,
        available_hours_per_day=request.available_hours_per_day,
        preferences=request.preferences,
        include_buffer=request.include_buffer
    )
    
    planner = get_planner_service()
    plan = planner.generate_plan(plan_request, task_id=task_id)
    
    return {"plan": plan, "subtasks": subtasks}

focus_timer_service = get_timer_service()

@app.post("/focus/start")
async def _root_focus_start(input_data: FocusSessionInput):
    state = focus_timer_service.start_session(input_data)
    return {
        "success": True,
        "session_id": focus_timer_service.active_session_id,
        "state": state,
        "message": "Focus session started! Timer will auto-transition between phases."
    }

@app.get("/focus/status")
async def _root_focus_status():
    if not focus_timer_service.active_session_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No active focus session")
    state = focus_timer_service.get_status()
    return {
        "active": True,
        "session_id": focus_timer_service.active_session_id,
        "state": state,
        "completed_sessions": len(focus_timer_service.sessions_completed),
        "total_cycle_time_seconds": sum(s.total_seconds for s in focus_timer_service.sessions_completed)
    }

@app.post("/focus/action")
async def _root_focus_action(action: TimerAction):
    if action.action == "pause":
        state = focus_timer_service.pause()
        return {"message": "Timer paused", "state": state}
    elif action.action == "resume":
        state = focus_timer_service.resume()
        return {"message": "Timer resumed", "state": state}
    elif action.action == "stop":
        result = focus_timer_service.stop()
        return {"message": "Session stopped", "result": result}
    elif action.action == "skip":
        state = focus_timer_service.skip_phase()
        return {"message": "Phase skipped", "state": state}
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Unknown action: {action.action}")

@app.get("/focus/analytics")
async def _root_focus_analytics():
    analytics = focus_timer_service.get_analytics()
    return {"analytics": analytics, "generated_at": datetime.now().isoformat()}

@app.get("/focus/history")
async def _root_focus_history(limit: int = 10):
    from services.timer import session_history
    return {
        "history": session_history[-limit:] if session_history else [],
        "count": len(session_history)
    }

@app.patch("/tasks/{task_id}/status")
async def _root_task_status(task_id: str, request: Request):
    """Update task status - accepts ?status=completed OR JSON body"""
    from routers.tasks import tasks_db as _db
    if task_id not in _db:
        raise HTTPException(status_code=404, detail="Task not found")
    body = {}
    try:
        body = await request.json()
    except Exception:
        body = {}
    new_status = body.get("status") or request.query_params.get("status")
    if not new_status:
        new_status = "completed"
    _db[task_id]["status"] = new_status
    if new_status == "completed":
        _db[task_id]["completed_at"] = datetime.now().isoformat()
    return {"success": True, "task": _db[task_id]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
