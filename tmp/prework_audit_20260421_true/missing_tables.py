from app.database import engine, Base
from app import models
from sqlalchemy import inspect

insp = inspect(engine)
existing = set(insp.get_table_names())
defined = set(Base.metadata.tables.keys())
print("Missing from DB:", defined - existing)
print("Extra in DB:", existing - defined)
