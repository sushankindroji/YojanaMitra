"""
Audit Log model.
"""
from sqlalchemy import Column, String, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid


class AuditLog(Base):
    __tablename__ = "audit_logs"

    __table_args__ = (
        Index('idx_audit_user', 'user_id'),
        Index('idx_audit_action', 'action'),
        Index('idx_audit_created', 'created_at'),
    )

    # Primary Key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # User Reference
    user_id = Column(String, ForeignKey("users.id"), nullable=True)

    # Action Info
    action = Column(String, nullable=False)  # login, upload, etc.
    resource = Column(String, nullable=True)
    resource_id = Column(String, nullable=True)

    # Request Info
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # ✅ FIXED: renamed Python attribute, kept DB column name same
    meta_data = Column("metadata", Text, nullable=True)

    # Timestamp
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return (
            f"<AuditLog(action={self.action}, "
            f"resource={self.resource}, "
            f"created_at={self.created_at})>"
        )