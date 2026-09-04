from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from insights_api import router as insights_router


app = FastAPI(
    title="InSightAI API",
    description="Backend API for the InSightAI dashboard",
    version="1.0.0"
)


# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include Insights API routes
app.include_router(insights_router)


@app.get("/")
def root():
    return {
        "message": "InSightAI backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }