"""
Scheme model.
"""
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Index, Boolean, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, synonym
from datetime import datetime
from app.database import Base
import uuid


JSON_FIELD = JSON().with_variant(JSONB(astext_type=Text()), "postgresql")


class Scheme(Base):
    __tablename__ = "schemes"
    __table_args__ = (
        Index('idx_scheme_state_active', 'state', 'is_active'),
        Index('idx_scheme_sector', 'sector'),
        Index('idx_scheme_type', 'scheme_type'),
        Index('idx_schemes_active_sector', 'is_active', 'sector'),
        Index('idx_schemes_active_state', 'is_active', 'state'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scheme_code = Column(String, unique=True, nullable=False, index=True)
    
    # Multilingual Names
    name_en = Column(String, nullable=False)
    name = synonym("name_en")
    name_hi = Column(String, nullable=True)
    name_te = Column(String, nullable=True)
    name_ta = Column(String, nullable=True)
    name_mr = Column(String, nullable=True)
    name_bn = Column(String, nullable=True)
    name_kn = Column(String, nullable=True)
    
    # Multilingual Descriptions
    description_en = Column(Text, nullable=True)
    description = synonym("description_en")
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
    required_documents = Column(JSON_FIELD, nullable=True)
    application_steps = Column(JSON_FIELD, nullable=True)
    
    # Application
    application_mode = Column(String, nullable=True)  # Online, Offline, Both
    official_portal_url = Column(String, nullable=True)
    state_portal_url = Column(String(500), nullable=True)
    myscheme_fallback = Column(Boolean, default=False)
    application_deadline = Column(String, nullable=True)
    
    # Dates
    scheme_start_date = Column(String, nullable=True)
    scheme_end_date = Column(String, nullable=True)
    
    # Details
    full_description = Column(Text, nullable=True)
    benefits_description = Column(Text, nullable=True)
    target_beneficiaries = Column(Text, nullable=True)
    helpline_number = Column(String(30), nullable=True)
    helpline_hours = Column(String(100), nullable=True)
    alternate_helpline = Column(String(30), nullable=True)
    csc_applicable = Column(Boolean, default=True)
    bank_applicable = Column(Boolean, default=False)
    gram_panchayat_applicable = Column(Boolean, default=False)
    processing_time = Column(String(100), nullable=True)
    validity_period = Column(String(100), nullable=True)
    scheme_tags = Column(JSON_FIELD, nullable=True)
    faq = Column(JSON_FIELD, nullable=True)
    last_date = Column(String(100), nullable=True)
    language_notes = Column(Text, nullable=True)
    
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
