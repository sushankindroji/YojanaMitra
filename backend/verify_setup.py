#!/usr/bin/env python
"""Verify database and backend status."""
import sys
sys.path.insert(0, '.')

from app.database import SessionLocal, init_db
from app.models import User
from app.core.security import verify_password

print("\n" + "="*60)
print("YojanaMitra Backend Startup Verification")
print("="*60)

try:
    # Initialize database
    print("\n✅ Database initialized")
    init_db()
    
    db = SessionLocal()
    
    # Check for test user
    user = db.query(User).filter(User.email == 'test@example.com').first()
    
    if user:
        print("✅ Test user found in database")
        print(f"   Email: test@example.com")
        print(f"   Name: {user.full_name or 'N/A'}")
        print(f"   Active: {'Yes' if user.is_active else 'No'}")
        
        # Test password
        if verify_password('password123', user.password_hash):
            print("✅ Password verification working correctly")
        else:
            print("❌ Password verification failed")
    else:
        print("⚠️ Test user not found! Creating now...")
        from app.services.auth_service import AuthService
        user = AuthService.create_user(
            db=db,
            email='test@example.com',
            password='password123',
            name='Test User',
            preferred_lang='en'
        )
        print("✅ Test user created!")
        print(f"   Email: test@example.com")
        print(f"   Password: password123")
    
    db.close()
    
    print("\n" + "="*60)
    print("Backend is ready! You can login with:")
    print("  Email:    test@example.com")
    print("  Password: password123")
    print("="*60 + "\n")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
