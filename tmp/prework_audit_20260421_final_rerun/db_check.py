import sys
import os
sys.path.append('backend')
from sqlalchemy import create_engine, inspect
from app.core.config import settings

try:
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("Connection successful")
    print("Tables found:")
    for table in tables:
        print(f" - {table}")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
