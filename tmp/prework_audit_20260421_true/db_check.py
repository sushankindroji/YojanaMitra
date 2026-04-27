from app.database import engine
from sqlalchemy import text, inspect

try:
    with engine.connect() as c:
        c.execute(text("SELECT 1"))
    insp = inspect(engine)
    tables = insp.get_table_names()
    print("DB OK. Tables:", tables)
except Exception as e:
    print("DB FAILED:", e)
    raise
