"""
Scheme model.
"""
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid


class Scheme(Base):
    __tablename__ = "schemes"
    __table_args__ = (
        Index('idx_scheme_state_active', 'state', 'is_active'),
        Index('idx_scheme_sector', 'sector'),
        Index('idx_scheme_type', 'scheme_type'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scheme_code = Column(String, unique=True, nullable=False, index=True)
    
    # Multilingual Names
    name_en = Column(String, nullable=False)
    name_hi = Column(String, nullable=True)
    name_te = Column(String, nullable=True)
    name_ta = Column(String, nullable=True)
    name_mr = Column(String, nullable=True)
    name_bn = Column(String, nullable=True)
    name_kn = Column(String, nullable=True)
    
    # Multilingual Descriptions
    description_en = Column(Text, nullable=True)
    description_hi = Column(Text, nullable=True)
    
    # Organization
    ministry = Column(String, nullable=True)
    department = Column(String, nullable=True)
    
    # Classification
    sector = Column(String, nullable=True)  # Agriculture, Education, Health, etc.
    sub_sector = Column(String, nullable=True)
    scheme_type = Column(String, nullable=True)  # Grant, Loan, Insurance, etc.
    state = Column(String, nullable=True)  # Central, Telangana, AP, etc.
    
    # Benefits
    benefit_type = Column(String, nullable=True)  # Cash, In-kind, Service, etc.
    benefit_amount = Column(Float, nullable=True)  # in rupees
    benefit_frequency = Column(String, nullable=True)  # One-time, Annual, Monthly, etc.
    benefit_details = Column(Text, nullable=True)
    
    # Rules & Requirements
    eligibility_rules = Column(Text, nullable=True)  # JSON string
    required_documents = Column(Text, nullable=True)  # JSON string
    application_steps = Column(Text, nullable=True)  # JSON string
    
    # Application
    application_mode = Column(String, nullable=True)  # Online, Offline, Both
    official_portal_url = Column(String, nullable=True)
    application_deadline = Column(String, nullable=True)
    
    # Dates
    scheme_start_date = Column(String, nullable=True)
    scheme_end_date = Column(String, nullable=True)
    
    # Details
    target_beneficiaries = Column(String, nullable=True)
    
    # Status
    is_active = Column(Integer, default=1)
    is_verified = Column(Integer, default=0)
    
    # Source Tracking
    source_url = Column(String, nullable=True)
    source_name = Column(String, nullable=True)
    scrape_hash = Column(String, nullable=True, index=True)
    last_synced_at = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    eligibility_results = relationship("EligibilityResult", back_populates="scheme", cascade="all, delete-orphan")
    applications = relationship("SavedApplication", back_populates="scheme", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Scheme(id={self.id}, name_en={self.name_en}, state={self.state})>"
