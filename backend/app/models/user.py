"""
User model.
"""
from sqlalchemy import Column, String, Integer, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index('idx_users_email', 'email', unique=True),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=True)
    preferred_lang = Column(String, default="en")
    role = Column(String, default="user")  # user, admin, official
    is_admin = Column(Integer, default=0)
    is_verified = Column(Integer, default=0)  # 0/1 for boolean
    is_active = Column(Integer, default=1)
    onboarding_incomplete = Column(Integer, default=1)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    last_login = Column(String, nullable=True)

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    eligibility_results = relationship("EligibilityResult", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("SavedApplication", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, phone={self.phone})>"
