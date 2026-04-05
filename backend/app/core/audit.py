"""
Audit logging utilities.
"""
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import AuditLog


def log_audit(
    db: Session,
    action: str,
    resource: str = None,
    resource_id: str = None,
    user_id: str = None,
    ip_address: str = None,
    user_agent: str = None,
    metadata: dict = None,
):
    """
    Log an audit event.
    """
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        meta_data=json.dumps(metadata or {}),
        created_at=datetime.utcnow().isoformat(),
    )
    db.add(log)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return log
