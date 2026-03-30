#!/usr/bin/env python
"""Quick seed script."""
import sys
sys.path.insert(0, '.')

import json
from app.database import SessionLocal, init_db
from app.models import Scheme
import uuid
from datetime import datetime
from pathlib import Path

init_db()
db = SessionLocal()

schemes_file = Path('..') / 'seed_data' / 'schemes_central.json'

with open(schemes_file, 'r', encoding='utf-8') as f:
    schemes_data = json.load(f)

count = 0
for scheme_data in schemes_data:
    existing = db.query(Scheme).filter(Scheme.scheme_code == scheme_data['scheme_code']).first()
    if existing:
        continue
    
    scheme = Scheme(
        id=str(uuid.uuid4()),
        scheme_code=scheme_data['scheme_code'],
        name_en=scheme_data.get('name_en'),
        description_en=scheme_data.get('description_en'),
        ministry=scheme_data.get('ministry'),
        sector=scheme_data.get('sector'),
        state=scheme_data.get('state', 'Central'),
        benefit_type=scheme_data.get('benefit_type'),
        benefit_amount=scheme_data.get('benefit_amount'),
        benefit_frequency=scheme_data.get('benefit_frequency'),
        eligibility_rules=json.dumps(scheme_data.get('eligibility_rules', {})),
        required_documents=json.dumps(scheme_data.get('required_documents', [])),
        application_steps=json.dumps(scheme_data.get('application_steps', [])),
        application_mode=scheme_data.get('application_mode'),
        official_portal_url=scheme_data.get('official_portal_url'),
        is_active=1,
        created_at=datetime.utcnow().isoformat(),
    )
    db.add(scheme)
    count += 1
    if count % 10 == 0:
        print(f'Added {count} schemes...')

db.commit()
db.close()
print(f'✅ Database seeded with {count} schemes!')
