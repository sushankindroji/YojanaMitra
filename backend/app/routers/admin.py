"""
Admin router - Admin-only endpoints for system management.
Includes: dashboard stats, user management, scheme management, application review.
"""
import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.dependencies import get_admin_user, get_db
from app.models import User, Scheme, SavedApplication, Profile, AuditLog, SchemeSyncLog
from app.core.audit import log_audit

router = APIRouter(prefix="/admin", tags=["admin"])


class UserRoleUpdate(BaseModel):
    role: str


class AdminSchemeUpdate(BaseModel):
    name_en: Optional[str] = None
    ministry: Optional[str] = None
    benefit_amount: Optional[float] = None
    is_active: Optional[bool] = None


class AdminApplicationUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None


def _safe_json_parse(raw_value, default):
    if raw_value is None:
        return default
    if isinstance(raw_value, (dict, list)):
        return raw_value
    try:
        return json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return default


def _bool_int(value) -> bool:
    return bool(int(value or 0))


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get admin dashboard statistics"""
    try:
        # Count users
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == 1).count()
        
        # Count schemes
        total_schemes = db.query(Scheme).count()
        active_schemes = db.query(Scheme).filter(Scheme.is_active == 1).count()
        
        # Count applications
        total_applications = db.query(SavedApplication).count()
        pending_applications = db.query(SavedApplication).filter(
            SavedApplication.status == "submitted"
        ).count()
        
        # Calculate submission rate (apps in last 30 days vs total)
        thirty_days_ago_iso = (datetime.utcnow() - timedelta(days=30)).isoformat()
        recent_apps = db.query(SavedApplication).filter(
            SavedApplication.saved_at >= thirty_days_ago_iso
        ).count()
        submission_rate = int((recent_apps / total_applications * 100)) if total_applications > 0 else 0

        users_profile_complete = db.query(Profile).filter(Profile.profile_complete_pct >= 80).count()
        users_email_verified = db.query(User).filter(User.is_verified == 1).count()

        status_counts = {
            "saved": db.query(SavedApplication).filter(SavedApplication.status == "saved").count(),
            "started": db.query(SavedApplication).filter(SavedApplication.status == "started").count(),
            "submitted": db.query(SavedApplication).filter(SavedApplication.status == "submitted").count(),
            "acknowledged": db.query(SavedApplication).filter(SavedApplication.status == "acknowledged").count(),
            "rejected": db.query(SavedApplication).filter(SavedApplication.status == "rejected").count(),
        }

        latest_sync = db.query(SchemeSyncLog).order_by(SchemeSyncLog.created_at.desc()).first()

        users_registered_pct = 100 if total_users else 0
        users_profile_complete_pct = int((users_profile_complete / total_users) * 100) if total_users else 0
        users_email_verified_pct = int((users_email_verified / total_users) * 100) if total_users else 0

        apps_total = total_applications or 1
        app_pct = {
            key: int((count / apps_total) * 100) for key, count in status_counts.items()
        }
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "total_schemes": total_schemes,
            "active_schemes": active_schemes,
            "total_applications": total_applications,
            "pending_applications": pending_applications,
            "submission_rate": submission_rate,
            "users_registered": total_users,
            "users_profile_complete": users_profile_complete,
            "users_email_verified": users_email_verified,
            "users_registered_pct": users_registered_pct,
            "users_profile_complete_pct": users_profile_complete_pct,
            "users_email_verified_pct": users_email_verified_pct,
            "apps_saved": status_counts["saved"],
            "apps_started": status_counts["started"],
            "apps_submitted": status_counts["submitted"],
            "apps_acknowledged": status_counts["acknowledged"],
            "apps_rejected": status_counts["rejected"],
            "apps_saved_pct": app_pct["saved"],
            "apps_started_pct": app_pct["started"],
            "apps_submitted_pct": app_pct["submitted"],
            "apps_acknowledged_pct": app_pct["acknowledged"],
            "apps_rejected_pct": app_pct["rejected"],
            "last_sync_timestamp": latest_sync.created_at if latest_sync else None,
            "last_updated": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")


@router.get("/users")
async def get_all_users(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
):
    """Get all users with pagination"""
    try:
        query = db.query(User)
        if search:
            query = query.filter(
                or_(
                    User.email.ilike(f"%{search}%"),
                    User.phone.ilike(f"%{search}%"),
                )
            )

        total = query.count()
        users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

        profile_map = {
            profile.user_id: profile
            for profile in db.query(Profile).filter(Profile.user_id.in_([u.id for u in users])).all()
        } if users else {}
        
        users_data = []
        for user in users:
            profile = profile_map.get(user.id)
            users_data.append({
                "id": user.id,
                "email": user.email,
                "phone": user.phone,
                "full_name": profile.full_name if profile else user.email or user.phone or "N/A",
                "role": user.role,
                "status": "active" if _bool_int(user.is_active) else "inactive",
                "created_at": user.created_at,
                "last_login": user.last_login,
                "profile_completion_pct": profile.profile_complete_pct if profile else 0,
                "profile_complete": bool(profile and (profile.profile_complete_pct or 0) >= 80),
                "email_verified": _bool_int(user.is_verified),
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
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    include_inactive: bool = Query(True),
):
    """Get all schemes with pagination"""
    try:
        query = db.query(Scheme)
        if not include_inactive:
            query = query.filter(Scheme.is_active == 1)
        if search:
            query = query.filter(
                or_(
                    Scheme.name_en.ilike(f"%{search}%"),
                    Scheme.ministry.ilike(f"%{search}%"),
                )
            )

        total = query.count()
        schemes = query.order_by(Scheme.created_at.desc()).offset(offset).limit(limit).all()

        app_counts = {}
        if schemes:
            scheme_ids = [scheme.id for scheme in schemes]
            counts = (
                db.query(SavedApplication.scheme_id, func.count(SavedApplication.id))
                .filter(SavedApplication.scheme_id.in_(scheme_ids))
                .group_by(SavedApplication.scheme_id)
                .all()
            )
            app_counts = {scheme_id: count for scheme_id, count in counts}
        
        schemes_data = []
        for scheme in schemes:
            conditions = _safe_json_parse(scheme.eligibility_rules, [])
            conditions_count = len(conditions) if isinstance(conditions, list) else len(conditions.keys()) if isinstance(conditions, dict) else 0
            schemes_data.append(
                {
                    "id": str(scheme.id),
                    "name": scheme.name_en,
                    "name_en": scheme.name_en,
                    "description": scheme.description_en,
                    "ministry": scheme.ministry,
                    "is_active": _bool_int(scheme.is_active),
                    "created_at": scheme.created_at,
                    "benefit_amount": scheme.benefit_amount,
                    "sector": scheme.sector,
                    "state": scheme.state,
                    "conditions_count": conditions_count,
                    "applications_count": app_counts.get(scheme.id, 0),
                }
            )
        
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
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """Get all applications with pagination"""
    try:
        query = db.query(SavedApplication)
        if status:
            query = query.filter(SavedApplication.status == status)

        total = query.count()
        applications = query.order_by(SavedApplication.saved_at.desc()).offset(offset).limit(limit).all()

        user_map = {
            user.id: user for user in db.query(User).filter(User.id.in_([a.user_id for a in applications])).all()
        } if applications else {}
        profile_map = {
            profile.user_id: profile
            for profile in db.query(Profile).filter(Profile.user_id.in_([a.user_id for a in applications])).all()
        } if applications else {}
        scheme_map = {
            scheme.id: scheme for scheme in db.query(Scheme).filter(Scheme.id.in_([a.scheme_id for a in applications])).all()
        } if applications else {}

        apps_data = []
        for app in applications:
            user = user_map.get(app.user_id)
            profile = profile_map.get(app.user_id)
            scheme = scheme_map.get(app.scheme_id)
            apps_data.append(
                {
                    "id": str(app.id),
                    "user_id": str(app.user_id),
                    "user_name": (profile.full_name if profile else None) or (user.email if user else "Unknown"),
                    "user_email": user.email if user else "Unknown",
                    "scheme_id": str(app.scheme_id),
                    "scheme_name": scheme.name_en if scheme else "Unknown",
                    "scheme_ministry": scheme.ministry if scheme else None,
                    "status": app.status,
                    "created_at": app.saved_at,
                    "saved_at": app.saved_at,
                    "submission_date": app.submission_date or app.saved_at,
                    "notes": app.notes,
                    "documents_count": 0,
                }
            )

        if search:
            lowered = search.lower()
            apps_data = [
                app for app in apps_data
                if lowered in (app.get("user_name") or "").lower()
                or lowered in (app.get("user_email") or "").lower()
                or lowered in (app.get("scheme_name") or "").lower()
            ]
            total = len(apps_data)
        
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
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Deactivate a user account"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.is_active = False
        db.commit()

        log_audit(db, "admin_user_deactivate", "user", user_id, admin_user.id)
        
        return {"message": f"User {user.email} deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deactivating user: {str(e)}")


@router.patch("/users/{user_id}/ban")
async def ban_user(
    user_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Ban a user (permanent block)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.is_active = False
        db.commit()

        log_audit(db, "admin_user_ban", "user", user_id, admin_user.id)
        
        return {"message": f"User {user.email} banned successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error banning user: {str(e)}")


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Update user role."""
    allowed_roles = {"user", "admin", "official"}
    role = (payload.role or "").strip().lower()
    if role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Invalid role")

    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.role = role
        db.commit()

        log_audit(db, "admin_user_role_update", "user", user_id, admin_user.id, metadata={"role": role})
        return {"message": "User role updated", "user_id": user_id, "role": role}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating user role: {str(e)}")


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Stub endpoint to trigger password reset flow."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    log_audit(db, "admin_user_password_reset", "user", user_id, admin_user.id)
    return {
        "message": "Password reset flow triggered",
        "user_id": user_id,
    }


@router.patch("/schemes/{scheme_id}")
async def update_scheme(
    scheme_id: str,
    payload: AdminSchemeUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Update scheme metadata and active status."""
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    try:
        if payload.name_en is not None:
            scheme.name_en = payload.name_en.strip() if payload.name_en else scheme.name_en
        if payload.ministry is not None:
            scheme.ministry = payload.ministry.strip() if payload.ministry else scheme.ministry
        if payload.benefit_amount is not None:
            scheme.benefit_amount = payload.benefit_amount
        if payload.is_active is not None:
            scheme.is_active = 1 if payload.is_active else 0

        scheme.updated_at = datetime.utcnow().isoformat()
        db.commit()
        db.refresh(scheme)

        log_audit(db, "admin_scheme_update", "scheme", scheme_id, admin_user.id)

        return {
            "id": scheme.id,
            "name_en": scheme.name_en,
            "ministry": scheme.ministry,
            "is_active": _bool_int(scheme.is_active),
            "benefit_amount": scheme.benefit_amount,
            "updated_at": scheme.updated_at,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating scheme: {str(e)}")


@router.delete("/schemes/{scheme_id}")
async def delete_scheme(
    scheme_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Delete a scheme."""
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    try:
        db.delete(scheme)
        db.commit()
        log_audit(db, "admin_scheme_delete", "scheme", scheme_id, admin_user.id)
        return {"message": "Scheme deleted", "scheme_id": scheme_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting scheme: {str(e)}")


@router.patch("/applications/{application_id}")
async def update_application_status(
    application_id: str,
    payload: AdminApplicationUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Update application status and add admin notes."""
    allowed_statuses = {"saved", "started", "submitted", "acknowledged", "rejected"}

    application = db.query(SavedApplication).filter(SavedApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if payload.status is not None and payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid application status")

    try:
        if payload.status is not None:
            application.status = payload.status

        notes = application.notes or ""
        note_chunks = []
        if payload.admin_notes:
            note_chunks.append(f"[ADMIN] {payload.admin_notes.strip()}")
        if payload.rejection_reason:
            note_chunks.append(f"[REJECTION] {payload.rejection_reason.strip()}")

        if note_chunks:
            combined = " | ".join(chunk for chunk in note_chunks if chunk)
            application.notes = f"{notes} | {combined}".strip(" |") if notes else combined

        application.updated_at = datetime.utcnow().isoformat()
        db.commit()
        db.refresh(application)

        log_audit(
            db,
            "admin_application_update",
            "application",
            application_id,
            admin_user.id,
            metadata={"status": application.status},
        )

        return {
            "id": application.id,
            "status": application.status,
            "notes": application.notes,
            "updated_at": application.updated_at,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating application: {str(e)}")


@router.get("/audit-logs")
async def get_audit_logs(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=500),
):
    """Fetch recent audit logs for admin insights."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()

    def severity_for_action(action: str) -> str:
        lowered = (action or "").lower()
        if any(word in lowered for word in ["ban", "delete", "failed", "error"]):
            return "high"
        if any(word in lowered for word in ["update", "deactivate", "reprocess"]):
            return "medium"
        return "info"

    return {
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "resource": log.resource,
                "resource_id": log.resource_id,
                "user_id": log.user_id,
                "created_at": log.created_at,
                "severity": severity_for_action(log.action),
            }
            for log in logs
        ]
    }
