import sys
import os
sys.path.append('backend')
from sqlalchemy import create_engine, inspect
from app.core.config import settings
from app.db.base import Base

try:
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    metadata_tables = set(Base.metadata.tables.keys())
    
    missing = metadata_tables - existing_tables
    if missing:
        print(f"Missing tables: {missing}")
        sys.exit(1)
    else:
        print("All metadata tables exist in DB.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
