#!/usr/bin/env python
"""
Startup script for YojanaMitra backend server.
"""
import os
import sys
import uvicorn
from dotenv import load_dotenv

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
# Change to that directory
os.chdir(script_dir)
# Load .env from the script directory
load_dotenv(os.path.join(script_dir, '.env'))
# Ensure the app can be imported
sys.path.insert(0, script_dir)

if __name__ == "__main__":
    environment = os.getenv("ENVIRONMENT", "development").strip().lower()
    debug_enabled = os.getenv("DEBUG", "false").strip().lower() == "true"

    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=environment != "production" and debug_enabled,
        log_level="info"
    )
