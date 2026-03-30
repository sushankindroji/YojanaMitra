#!/usr/bin/env python
"""
Startup script for YojanaMitra backend server.
"""
import uvicorn
import os
import sys
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
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
