#!/usr/bin/env python
"""Create multiple user accounts for testing."""
import sys
sys.path.insert(0, '.')

from app.database import SessionLocal, init_db
from app.services.auth_service import AuthService

try:
    init_db()
    db = SessionLocal()
    
    # List of test users to create
    test_users = [
        {
            'email': 'test@example.com',
            'password': 'password123',
            'name': 'Test User',
            'lang': 'en'
        },
        {
            'email': 'newuser8@example.com',
            'password': 'password123',
            'name': 'New User 8',
            'lang': 'en'
        },
        {
            'email': 'demo@yojanamitra.in',
            'password': 'password123',
            'name': 'Demo User',
            'lang': 'te'  # Telugu
        },
    ]
    
    print("\n" + "="*60)
    print("Creating Test User Accounts")
    print("="*60 + "\n")
    
    created = 0
    skipped = 0
    
    for user_data in test_users:
        try:
            user = AuthService.create_user(
                db=db,
                email=user_data['email'],
                password=user_data['password'],
                name=user_data['name'],
                preferred_lang=user_data['lang']
            )
            print(f"✓ Created: {user_data['email']}")
            created += 1
        except Exception as e:
            if 'already exists' in str(e):
                print(f"- Skipped: {user_data['email']} (already exists)")
                skipped += 1
            else:
                print(f"✗ Error: {user_data['email']} - {str(e)}")
    
    print("\n" + "="*60)
    print(f"Result: {created} created, {skipped} skipped")
    print("="*60)
    print("\nYou can login with any of these accounts:")
    print("-" * 60)
    for user_data in test_users:
        print(f"Email:    {user_data['email']}")
        print(f"Password: {user_data['password']}")
        print(f"Lang:     {user_data['lang']}")
        print()
    
    db.close()
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
