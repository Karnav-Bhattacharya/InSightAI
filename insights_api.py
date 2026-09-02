import json
from pathlib import Path

from fastapi import APIRouter, HTTPException


router = APIRouter()


# Folder where this file exists
BASE_DIR = Path(__file__).resolve().parent


# # Role-based insights JSON
# JSON_FILE = BASE_DIR / "role_based_insights.json"
JSON_FILE = (
    BASE_DIR
    / "InSightAI-main"
    / "frontend"
    / "src"
    / "data"
    / "role_based_insights.json"
)


def load_role_based_insights():
    """
    Load all role-based insights from JSON.
    """

    if not JSON_FILE.exists():
        raise FileNotFoundError(
            f"Insights JSON file not found: {JSON_FILE}"
        )

    with JSON_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


@router.get("/insights")
def get_insights(role: str = "HR"):

    try:
        data = load_role_based_insights()

        # Get insights only for requested role
        role_insights = data.get(role, [])

        if not isinstance(role_insights, list):
            role_insights = []

        return {
            "success": True,
            "role": role,
            "count": len(role_insights),
            "data": role_insights
        }

    except FileNotFoundError as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load insights: {str(error)}"
        )
