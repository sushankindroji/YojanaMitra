import sys
import os
print(f"Current working dir: {os.getcwd()}")
print(f"Python executable: {sys.executable}")
print(f"Python path: {sys.path[:3]}")  # First 3 entries
try:
    from app.main import app
    print("✅ App imported successfully")
except Exception as e:
    print(f"❌ Error: {e}")
