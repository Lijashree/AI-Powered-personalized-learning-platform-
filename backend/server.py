"""Bootstrap entry point for StudyMind API."""
import os
import sys

# Ensure backend directory is in the path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    is_dev = os.environ.get("ENVIRONMENT", "development").lower() == "development"
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=is_dev)
