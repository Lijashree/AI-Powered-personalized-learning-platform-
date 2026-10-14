"""Bootstrap entry point for StudyMind API."""
import os
import sys

# Ensure backend directory is in the path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
