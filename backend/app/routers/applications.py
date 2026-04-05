"""
Applications router.
Save, track, and manage scheme applications.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import json

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.application import SavedApplication
from app.models.scheme import Scheme
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationListResponse,
    ApplicationStatsResponse,
)

router = APIRouter(tags=["applications"])


def _to_application_response(application: SavedApplication, scheme: Scheme | None) -> ApplicationResponse:
    return ApplicationResponse(
        id=application.id,
        user_id=application.user_id,
        scheme_id=application.scheme_id,
        status=application.status,
        notes=application.notes,
        prefilled_data=application.prefilled_data,
        acknowledgement_no=application.acknowledgement_no,
        saved_at=application.saved_at,
        updated_at=application.updated_at,
        submission_date=application.submission_date,
        scheme_name=scheme.name_en if scheme else None,
        scheme_ministry=scheme.ministry if scheme else None,
        scheme_benefit_amount=scheme.benefit_amount if scheme else None,
    )


@router.post("/save-scheme", response_model=ApplicationResponse)
async def save_application(
    req: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save a application for a scheme.
    """
    # Check if scheme exists
    scheme = db.query(Scheme).filter(Scheme.id == req.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
    # Check if already saved
    existing = db.query(SavedApplication).filter(
        SavedApplication.user_id == current_user.id,
        SavedApplication.scheme_id == req.scheme_id,
    ).first()
    
    if existing:
        return ApplicationResponse(
            id=existing.id,
            user_id=existing.user_id,
            scheme_id=existing.scheme_id,
            status=existing.status,
            notes=existing.notes,
            prefilled_data=existing.prefilled_data,
            acknowledgement_no=existing.acknowledgement_no,
            saved_at=existing.saved_at,
            updated_at=existing.updated_at,
            submission_date=existing.submission_date,
            scheme_name=scheme.name_en,
            scheme_ministry=scheme.ministry,
            scheme_benefit_amount=scheme.benefit_amount,
        )
    
    # Create new application
    application = SavedApplication(
        user_id=current_user.id,
        scheme_id=req.scheme_id,
        status="saved",
        notes=req.notes,
        prefilled_data=json.dumps(req.prefilled_data) if req.prefilled_data is not None else None,
    )

    try:
        db.add(application)
        db.commit()
        db.refresh(application)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save application")

    return _to_application_response(application, scheme)


@router.get("", response_model=ApplicationListResponse)
async def get_applications(
    status: str = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all saved applications for current user.
    """
    query = db.query(SavedApplication).filter(
        SavedApplication.user_id == current_user.id
    )
    
    if status:
        query = query.filter(SavedApplication.status == status)
    
    total = query.count()
    applications = query.order_by(SavedApplication.saved_at.desc()).offset(offset).limit(limit).all()

    result = []
    for app in applications:
        scheme = db.query(Scheme).filter(Scheme.id == app.scheme_id).first()
        result.append(_to_application_response(app, scheme))
    
    return ApplicationListResponse(total=total, applications=result)


@router.get("/stats/summary", response_model=ApplicationStatsResponse)
async def get_application_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get application statistics for current user.
    """
    query = db.query(SavedApplication).filter(SavedApplication.user_id == current_user.id)

    stats = {
        "total_saved": query.filter(SavedApplication.status == "saved").count(),
        "total_started": query.filter(SavedApplication.status == "started").count(),
        "total_submitted": query.filter(SavedApplication.status == "submitted").count(),
        "total_acknowledged": query.filter(SavedApplication.status == "acknowledged").count(),
        "total_rejected": query.filter(SavedApplication.status == "rejected").count(),
    }

    # Calculate total benefit value of submitted applications
    submitted_apps = query.filter(SavedApplication.status == "submitted").all()
    total_benefit = 0
    for app in submitted_apps:
        scheme = db.query(Scheme).filter(Scheme.id == app.scheme_id).first()
        if scheme and scheme.benefit_amount:
            total_benefit += scheme.benefit_amount

    stats["total_benefit_value"] = total_benefit

    return stats


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get specific application details.
    """
    application = db.query(SavedApplication).filter(
        SavedApplication.id == application_id,
        SavedApplication.user_id == current_user.id,
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    scheme = db.query(Scheme).filter(Scheme.id == application.scheme_id).first()
    
    return _to_application_response(application, scheme)


@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: str,
    req: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update application status and details.
    """
    application = db.query(SavedApplication).filter(
        SavedApplication.id == application_id,
        SavedApplication.user_id == current_user.id,
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if req.status:
        application.status = req.status
    if req.notes is not None:
        application.notes = req.notes
    if req.prefilled_data is not None:
        application.prefilled_data = json.dumps(req.prefilled_data)
    if req.acknowledgement_no is not None:
        application.acknowledgement_no = req.acknowledgement_no

    try:
        db.commit()
        db.refresh(application)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update application")
    
    scheme = db.query(Scheme).filter(Scheme.id == application.scheme_id).first()
    
    return _to_application_response(application, scheme)


@router.delete("/{application_id}")
async def delete_application(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove a saved application.
    """
    application = db.query(SavedApplication).filter(
        SavedApplication.id == application_id,
        SavedApplication.user_id == current_user.id,
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    try:
        db.delete(application)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete application")
    
    return {"detail": "Application deleted successfully"}
