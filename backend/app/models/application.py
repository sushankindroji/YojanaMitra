"""
Application model.
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid


class SavedApplication(Base):
    __tablename__ = "saved_applications"
    __table_args__ = (
        UniqueConstraint('user_id', 'scheme_id', name='unique_user_scheme_application'),
        Index('idx_application_user', 'user_id'),
        Index('idx_application_scheme', 'scheme_id'),
        Index('idx_application_status', 'status'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    scheme_id = Column(String, ForeignKey("schemes.id"), nullable=False)
    
    # Status
    status = Column(String, default="saved")  # saved, started, submitted, acknowledged, rejected
    
    # Pre-filled Data
    prefilled_data = Column(Text, nullable=True)  # JSON string
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Acknowledgement
    acknowledgement_no = Column(String, nullable=True)
    
    # Timestamps
    saved_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    submission_date = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="applications")
    scheme = relationship("Scheme", back_populates="applications")

    def __repr__(self):
        return f"<SavedApplication(user_id={self.user_id}, scheme_id={self.scheme_id}, status={self.status})>"
