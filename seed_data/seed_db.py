"""
Seed database with schemes from JSON files.
Run: python seed_db.py
"""
import json
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal, init_db
from app.models import Scheme
import uuid
from datetime import datetime

def seed_schemes():
    """Seed schemes from JSON files into database."""
    init_db()
    db = SessionLocal()

    try:
        # Load schemes from JSON
        schemes_file = Path(__file__).parent / "schemes_central.json"
        
        if schemes_file.exists():
            with open(schemes_file, encoding='utf-8') as f:
                schemes_data = json.load(f)

            for scheme_data in schemes_data:
                # Check if already exists
                existing = db.query(Scheme).filter(
                    Scheme.scheme_code == scheme_data["scheme_code"]
                ).first()

                if existing:
                    print(f"⏭️  {scheme_data['scheme_code']} already exists, skipping...")
                    continue

                # Create scheme
                scheme = Scheme(
                    id=str(uuid.uuid4()),
                    scheme_code=scheme_data["scheme_code"],
                    name_en=scheme_data.get("name_en"),
                    description_en=scheme_data.get("description_en"),
                    ministry=scheme_data.get("ministry"),
                    sector=scheme_data.get("sector"),
                    state=scheme_data.get("state", "Central"),
                    benefit_type=scheme_data.get("benefit_type"),
                    benefit_amount=scheme_data.get("benefit_amount"),
                    benefit_frequency=scheme_data.get("benefit_frequency"),
                    eligibility_rules=json.dumps(scheme_data.get("eligibility_rules", {})),
                    required_documents=json.dumps(scheme_data.get("required_documents", [])),
                    application_steps=json.dumps(scheme_data.get("application_steps", [])),
                    application_mode=scheme_data.get("application_mode"),
                    official_portal_url=scheme_data.get("official_portal_url"),
                    is_active=1,
                    created_at=datetime.utcnow().isoformat(),
                )
                db.add(scheme)
                print(f"✅ Added: {scheme_data['scheme_code']} - {scheme_data['name_en']}")

            db.commit()
            print(f"\n🎉 Seeding complete! {len(schemes_data)} schemes loaded.")

        else:
            print(f"❌ File not found: {schemes_file}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_schemes()
