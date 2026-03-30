#!/usr/bin/env python
"""Seed test user into database."""
import sys
sys.path.insert(0, '.')

from app.database import SessionLocal, init_db
from app.services.auth_service import AuthService

try:
    print("Initializing database...")
    init_db()
    db = SessionLocal()
    
    print("Creating test user...")
    user = AuthService.create_user(
        db=db,
        email='test@example.com',
        password='password123',
        name='Test User',
        preferred_lang='en'
    )
    
    print("\n✅ Test user created successfully!")
    print("=" * 50)
    print(f"Email:    test@example.com")
    print(f"Password: password123")
    print("=" * 50)
    print("\nYou can now login with these credentials.")
    
    db.close()
except Exception as e:
    print(f"\n⚠️ Error: {str(e)}")
    import traceback
    traceback.print_exc()
