import json

print("=== SEED DATA ANALYSIS ===\n")

# Check government_schemes.json
try:
    with open('seed_data/government_schemes.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    if isinstance(data, dict) and 'schemes' in data:
        schemes = data['schemes']
        print(f'government_schemes.json: {len(schemes)} schemes')
        if schemes:
            print(f'  Sample: {schemes[0].get("name_en", "Unknown")[:50]}')
except Exception as e:
    print(f'government_schemes.json error: {e}')

# Check schemes_central.json
try:
    with open('seed_data/schemes_central.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f'schemes_central.json: {len(data)} schemes')
    if data:
        print(f'  Sample: {data[0].get("name_en", "Unknown")[:50]}')
except Exception as e:
    print(f'schemes_central.json error: {e}')

print("\n=== CURRENT DATABASE ===\n")

import sys
sys.path.insert(0, 'backend')
from app.database import SessionLocal
from app.models import Scheme

db = SessionLocal()
total = db.query(Scheme).count()
print(f'PostgreSQL: {total} schemes currently loaded')
db.close()
