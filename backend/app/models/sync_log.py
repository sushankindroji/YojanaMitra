"""
Scheme Sync Log model.
"""
from sqlalchemy import Column, String, Integer, Text, Index
from datetime import datetime
from app.database import Base
import uuid


class SchemeSyncLog(Base):
    __tablename__ = "scheme_sync_logs"
    __table_args__ = (
        Index('idx_sync_created', 'created_at'),
        Index('idx_sync_status', 'status'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Sync Info
    sync_type = Column(String, nullable=False)  # nightly, manual, initial
    source = Column(String, nullable=False)  # myscheme, scholarships, etc.
    
    # Results
    schemes_added = Column(Integer, default=0)
    schemes_updated = Column(Integer, default=0)
    schemes_removed = Column(Integer, default=0)
    
    # Errors (JSON)
    errors = Column(Text, nullable=True)
    
    # Timestamps
    started_at = Column(String, nullable=True)
    completed_at = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, running, completed, failed
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    def __repr__(self):
        return f"<SchemeSyncLog(source={self.source}, status={self.status}, created_at={self.created_at})>"
