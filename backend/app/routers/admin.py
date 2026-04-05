"""
Admin router - Admin-only endpoints for system management.
Includes: dashboard stats, user management, scheme management, application review.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Scheme, SavedApplication, Profile
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["admin"])


def check_admin(current_user: User = Depends(get_current_user)):
    """Verify user is admin"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    admin_user: User = Depends(check_admin),
    db: Session = Depends(get_db),
):
    """Get admin dashboard statistics"""
    try:
        # Count users
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        
        # Count schemes
        total_schemes = db.query(Scheme).count()
        active_schemes = db.query(Scheme).filter(Scheme.is_active == True).count()
        
        # Count applications
        total_applications = db.query(SavedApplication).count()
        pending_applications = db.query(SavedApplication).filter(
            SavedApplication.status == "submitted"
        ).count()
        
        # Calculate submission rate (apps in last 30 days vs total)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_apps = db.query(SavedApplication).filter(
            SavedApplication.created_at >= thirty_days_ago
        ).count()
        submission_rate = int((recent_apps / total_applications * 100)) if total_applications > 0 else 0
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "total_schemes": total_schemes,
            "active_schemes": active_schemes,
            "total_applications": total_applications,
            "pending_applications": pending_applications,
            "submission_rate": submission_rate,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")


@router.get("/users")
async def get_all_users(
    admin_user: User = Depends(check_admin),
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
):
    """Get all users with pagination"""
    try:
        users = db.query(User).offset(offset).limit(limit).all()
        total = db.query(User).count()
        
        users_data = []
        for user in users:
            profile = db.query(Profile).filter(Profile.user_id == user.id).first()
            users_data.append({
                "id": user.id,
                "email": user.email,
                "phone": user.phone,
                "full_name": profile.full_name if profile else user.name or "N/A",
                "role": user.role,
                "status": "active" if user.is_active else "inactive",
                "created_at": user.created_at,
                "last_login": user.last_login,
            })
        
        return {
            "users": users_data,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")


@router.get("/schemes")
async def get_all_schemes(
    admin_user: User = Depends(check_admin),
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
):
    """Get all schemes with pagination"""
    try:
        schemes = db.query(Scheme).offset(offset).limit(limit).all()
        total = db.query(Scheme).count()
        
        schemes_data = [
            {
                "id": str(scheme.id),
                "name": scheme.name,
                "ministry": scheme.ministry if hasattr(scheme, 'ministry') else "N/A",
                "is_active": scheme.is_active if hasattr(scheme, 'is_active') else True,
                "created_at": scheme.created_at if hasattr(scheme, 'created_at') else None,
            }
            for scheme in schemes
        ]
        
        return {
            "schemes": schemes_data,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching schemes: {str(e)}")


@router.get("/applications")
async def get_all_applications(
    admin_user: User = Depends(check_admin),
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
):
    """Get all applications with pagination"""
    try:
        applications = db.query(SavedApplication).offset(offset).limit(limit).all()
        total = db.query(SavedApplication).count()
        
        apps_data = [
            {
                "id": str(app.id),
                "user_id": str(app.user_id),
                "user_name": db.query(User).filter(User.id == app.user_id).first().name or "Unknown",
                "user_email": db.query(User).filter(User.id == app.user_id).first().email or "Unknown",
                "scheme_id": str(app.scheme_id),
                "scheme_name": db.query(Scheme).filter(Scheme.id == app.scheme_id).first().name if hasattr(app, 'scheme_id') else "Unknown",
                "status": app.status if hasattr(app, 'status') else "submitted",
                "created_at": app.created_at if hasattr(app, 'created_at') else None,
            }
            for app in applications
        ]
        
        return {
            "applications": apps_data,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching applications: {str(e)}")


@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    admin_user: User = Depends(check_admin),
    db: Session = Depends(get_db),
):
    """Deactivate a user account"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.is_active = False
        db.commit()
        
        return {"message": f"User {user.email} deactivated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deactivating user: {str(e)}")


@router.patch("/users/{user_id}/ban")
async def ban_user(
    user_id: str,
    admin_user: User = Depends(check_admin),
    db: Session = Depends(get_db),
):
    """Ban a user (permanent block)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.is_active = False
        db.commit()
        
        return {"message": f"User {user.email} banned successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error banning user: {str(e)}")
