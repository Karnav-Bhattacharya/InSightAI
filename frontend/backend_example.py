"""
============================================================
FUTURE FASTAPI BACKEND REFERENCE EXAMPLE (main.py)
============================================================
This file provides a blueprint for connecting your colleague's
`generate_recommendations()` Python function to the InSightAI frontend.

RUNNING THIS BACKEND:
1. Install dependencies:
   pip install fastapi uvicorn pydantic

2. Run with uvicorn:
   uvicorn main:app --reload --port 8000
============================================================
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel

# ============================================================
# FUTURE IMPORT: YOUR COLLEAGUE'S RECOMMENDATION MODULE
# ============================================================
# When you receive your colleague's recommendation code:
# 1. Place the Python file in your backend folder (e.g., `recommendations.py`)
# 2. Uncomment and adjust the import below:
#
# from recommendations import generate_recommendations
# ============================================================

app = FastAPI(title="InSightAI Recommendation API")

# ============================================================
# FUTURE CORS CONFIGURATION
# ============================================================
# Required when the frontend connects directly to FastAPI from
# a different port (e.g., http://localhost:3000 or http://localhost:5173).
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify ["http://localhost:3000", "http://127.0.0.1:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TypeScript 'Insight' schema equivalent in Pydantic
class InsightModel(BaseModel):
    id: int
    severity: str  # "High" | "Medium" | "Low"
    title: str
    metric: str
    change: str
    trend: str  # "up" | "down"
    region: str
    summary: str
    cause: str
    recommendations: List[str]
    category: Optional[str] = "Operations"
    timestamp: Optional[str] = "Just now"
    impactScore: Optional[int] = 75

# ============================================================
# FUTURE ENDPOINT: GET /insights
# ============================================================
# This endpoint connects the recommendation layer with the frontend.
#
# BEFORE ACTIVATING WITH REAL RECOMMENDATIONS:
# 1. Confirm where `generate_recommendations()` is located.
# 2. Check what arguments it requires (e.g., dataset path, company ID, query).
# 3. Check its return format:
#    - If it returns objects/dictionaries matching InsightModel, return directly.
#    - If it returns plain text or an LLM response, parse it into JSON.
# ============================================================
@app.get("/insights", response_model=List[InsightModel])
async def get_insights():
    """
    Returns recommendations for the HR Dashboard.
    """
    # --------------------------------------------------------
    # Step 1: Call your colleague's recommendation engine
    # --------------------------------------------------------
    # insights = generate_recommendations()
    # return insights
    
    # Placeholder return matching the structure:
    return [
        {
            "id": 1,
            "severity": "High",
            "title": "Logistics Route Disruption",
            "metric": "On-time Delivery",
            "change": "-14%",
            "trend": "down",
            "region": "Northern Hub",
            "summary": "Delivery transit times spiked due to weather delays.",
            "cause": "Severe monsoon weather affecting road freight corridor.",
            "recommendations": [
                "Reroute shipments via rail freight",
                "Buffer safety stock in regional fulfillment centers",
                "Alert tier-1 customers of 24h delay"
            ],
            "category": "Operations",
            "timestamp": "5 mins ago",
            "impactScore": 88
        }
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
