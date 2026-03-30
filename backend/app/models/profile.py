"""
Profile model.
"""
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Basic Info
    full_name = Column(String, nullable=True)
    dob = Column(String, nullable=True)  # YYYY-MM-DD
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)  # male, female, other
    
    # Address
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    
    # Economic
    annual_income = Column(Float, nullable=True)  # in rupees
    occupation = Column(String, nullable=True)
    social_category = Column(String, nullable=True)  # general, obc, sc, st, ews
    religion = Column(String, nullable=True)
    
    # BPL Status
    is_bpl = Column(Integer, default=0)
    
    # Farmer Info
    is_farmer = Column(Integer, default=0)
    land_holding_acres = Column(Float, nullable=True)
    
    # Woman
    is_woman_headed = Column(Integer, default=0)
    
    # Disability
    has_disability = Column(Integer, default=0)
    disability_type = Column(String, nullable=True)
    disability_pct = Column(Integer, nullable=True)
    
    # Student
    is_student = Column(Integer, default=0)
    education_level = Column(String, nullable=True)
    
    # Senior Citizen
    is_senior_citizen = Column(Integer, default=0)
    
    # Minority
    is_minority = Column(Integer, default=0)
    
    # Street Vendor
    is_street_vendor = Column(Integer, default=0)
    
    # Self Help Group
    is_self_help_group = Column(Integer, default=0)
    
    # Ration Card
    has_ration_card = Column(Integer, default=0)
    ration_card_type = Column(String, nullable=True)  # apl, bpl, antyodaya, phh
    
    # Banking
    bank_account_linked = Column(Integer, default=0)
    
    # Encrypted Aadhaar (only last 4 shown)
    aadhaar_number = Column(String, nullable=True)  # AES-256 encrypted
    aadhaar_last4 = Column(String, nullable=True)  # last 4 digits, unencrypted
    
    # Profile Completeness
    profile_complete_pct = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    user = relationship("User", back_populates="profile")

    def __repr__(self):
        return f"<Profile(user_id={self.user_id}, full_name={self.full_name}, state={self.state})>"
