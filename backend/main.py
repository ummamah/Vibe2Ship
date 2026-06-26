from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.tasks import router as tasks_router
from routers.planner import router as planner_router
from routers.focus import router as focus_router

app = FastAPI(
    title="AI Productivity API",
    description="AI-powered task prioritization and management",
    version="1.0.0"
)

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002", "http://127.0.0.1:3002", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks_router, prefix="/api/v1", tags=["tasks"])
app.include_router(planner_router, prefix="/api/v1", tags=["planner"])
app.include_router(focus_router, prefix="/api/v1", tags=["focus"])

@app.get("/")
async def root():
    return {"message": "AI Productivity API is running!", "status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
