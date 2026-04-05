#!/usr/bin/env python3
"""
PHASE 9: Government Schemes Bulk Import Script
Imports 100+ real government schemes into YojanaMitra database
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal, engine
from app.models import Scheme
from sqlalchemy.exc import SQLAlchemyError


def load_schemes_from_json(json_file: str) -> list:
    """Load schemes from JSON file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get('schemes', [])
    except FileNotFoundError:
        print(f"[ERROR] File not found: {json_file}")
        return []
    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON in {json_file}: {e}")
        return []


def transform_scheme_data(scheme_dict: dict) -> dict:
    """Transform JSON scheme to database format"""
    # Create shorthand for easier access
    scheme_id = scheme_dict.get('id', '').replace('_', '-')
    
    return {
        'scheme_code': scheme_id,
        'name_en': scheme_dict.get('name', ''),
        'description_en': scheme_dict.get('description', ''),
        'ministry': scheme_dict.get('ministry', ''),
        'sector': ','.join(scheme_dict.get('category', [])),  # Use category as sector
        'scheme_type': scheme_dict.get('benefits', {}).get('type', 'Unknown'),
        'benefit_type': scheme_dict.get('benefits', {}).get('type', 'Financial Assistance'),
        'benefit_amount': extract_amount(scheme_dict.get('benefits', {}).get('amount', '0')),
        'benefit_frequency': scheme_dict.get('benefits', {}).get('frequency', 'Unknown'),
        'benefit_details': scheme_dict.get('benefits', {}).get('description', ''),
        'eligibility_rules': json.dumps(scheme_dict.get('eligibility', {})),
        'required_documents': json.dumps(scheme_dict.get('requiredDocuments', [])),
        'official_portal_url': scheme_dict.get('applicationUrl', ''),
        'is_active': 1 if scheme_dict.get('status', 'Active') == 'Active' else 0,
        'is_verified': 1,
        'state': scheme_dict.get('areaOfCoverage', 'Central'),
        'source_name': 'Government Schemes Database',
        'source_url': scheme_dict.get('applicationUrl', ''),
        'scheme_start_date': scheme_dict.get('startDate', ''),
        'last_synced_at': datetime.utcnow().isoformat(),
    }


def extract_amount(amount_str: str) -> float:
    """Extract numerical amount from string like '2000-5000' or '5 lakh'"""
    if not amount_str:
        return 0.0
    try:
        # Handle 'lakh' notation
        if 'lakh' in amount_str.lower():
            return float(amount_str.lower().split('lakh')[0].strip()) * 100000
        # Handle range like '2000-5000', take first number
        if '-' in amount_str:
            return float(amount_str.split('-')[0].strip().replace('₹', '').replace('INR', '').strip())
        # Direct number
        return float(amount_str.replace('₹', '').replace('INR', '').strip())
    except:
        return 0.0


def import_schemes(json_file: str) -> bool:
    """Import schemes into database"""
    
    print("\n" + "="*70)
    print("PHASE 9: GOVERNMENT SCHEMES BULK IMPORT")
    print("="*70)
    print(f"\n[*] Loading schemes from: {json_file}")
    
    # Load schemes
    schemes_data = load_schemes_from_json(json_file)
    if not schemes_data:
        print("[ERROR] No schemes found or error loading file!")
        return False
    
    print(f"[OK] Loaded {len(schemes_data)} schemes")
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Count existing schemes
        existing_count = db.query(Scheme).count()
        print(f"\n[*] Database Status:")
        print(f"    Existing schemes: {existing_count}")
        
        # Insert new schemes one by one to handle duplicates
        print(f"\n[*] Importing {len(schemes_data)} schemes...")
        imported = 0
        skipped = 0
        errors = 0
        
        for idx, scheme_dict in enumerate(schemes_data, 1):
            try:
                # Transform data
                scheme_data = transform_scheme_data(scheme_dict)
                scheme_code = scheme_data['scheme_code']
                
                # Check if scheme already exists
                existing = db.query(Scheme).filter_by(scheme_code=scheme_code).first()
                if existing:
                    skipped += 1
                    continue
                
                # Create Scheme object
                scheme = Scheme(**scheme_data)
                db.add(scheme)
                
                # Commit individual inserts to handle each separately
                db.commit()
                imported += 1
                
                if idx % 10 == 0:
                    print(f"    [OK] {idx}/{len(schemes_data)} processed...")
                
            except Exception as e:
                errors += 1
                print(f"    [WARN] Error importing scheme {idx}: {str(e)[:80]}")
                db.rollback()
        
        # Verify import
        final_count = db.query(Scheme).count()
        
        print(f"\n[SUCCESS] IMPORT COMPLETE!")
        print(f"="*70)
        print(f"    Imported (new): {imported}")
        print(f"    Skipped (duplicate): {skipped}")
        print(f"    Errors: {errors}")
        print(f"    Total in database: {final_count}")
        print(f"    Success rate: {round(100*imported/len(schemes_data))}%")
        print(f"="*70)
        
        # Show sample schemes
        print(f"\n[*] Sample Schemes in Database:")
        samples = db.query(Scheme).limit(5).all()
        for scheme in samples:
            print(f"    - {scheme.name_en}")
        
        if final_count > existing_count:
            print(f"\n[SUCCESS] {final_count - existing_count} new schemes added to database!")
            return True
        else:
            print(f"\n[INFO] No new schemes added (all duplicates or no imports)")
            return False
            
    except SQLAlchemyError as e:
        print(f"[ERROR] Database Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def main():
    """Main entry point"""
    
    # Determine the schemes file path
    script_dir = Path(__file__).parent.parent.parent  # Go back to project root
    json_file = script_dir / "seed_data" / "government_schemes.json"
    
    print(f"\n[*] Looking for schemes file...")
    print(f"    Path: {json_file}")
    
    if not json_file.exists():
        print(f"[ERROR] File not found: {json_file}")
        print(f"\n[INFO] Please ensure government_schemes.json exists in seed_data/")
        return False
    
    # Run import
    success = import_schemes(str(json_file))
    
    if success:
        print(f"\n[SUCCESS] Phase 9 Data Import Complete!")
        print(f"[INFO] Next: Run frontend tests and verify search/filter functionality")
        return True
    else:
        print(f"\n[ERROR] Import failed. Check errors above.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
