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
    address_line = Column(String, nullable=True)
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
    aadhaar_verified = Column(Integer, default=0)
    aadhaar_last4 = Column(String, nullable=True)  # last 4 digits, unencrypted

    # Document-derived identity fields
    pan_number = Column(String, nullable=True)
    voter_id_number = Column(String, nullable=True)
    passport_number = Column(String, nullable=True)

    # Income and family
    bpl_status = Column(Integer, default=0)
    ration_card_number = Column(String, nullable=True)
    ration_card_category = Column(String, nullable=True)  # apl, bpl, aay
    family_size = Column(Integer, nullable=True)
    is_household_head = Column(Integer, default=0)

    # Banking
    has_bank_account = Column(Integer, default=0)
    bank_name = Column(String, nullable=True)
    account_number_masked = Column(String, nullable=True)
    ifsc = Column(String, nullable=True)

    # Land and agriculture
    land_area_acres = Column(Float, nullable=True)
    land_survey_number = Column(String, nullable=True)
    land_type = Column(String, nullable=True)
    kcc_holder = Column(Integer, default=0)
    kcc_number = Column(String, nullable=True)
    kcc_credit_limit = Column(Float, nullable=True)
    crop_insurance = Column(Integer, default=0)
    crop_insurance_policy_number = Column(String, nullable=True)
    crop_insurance_sum_insured = Column(Float, nullable=True)
    insured_crops = Column(String, nullable=True)
    pm_kisan_registered = Column(Integer, default=0)
    pm_kisan_farmer_id = Column(String, nullable=True)
    soil_type = Column(String, nullable=True)

    # Social and special category
    disability_percentage = Column(Integer, nullable=True)
    disability_issuing_authority = Column(String, nullable=True)
    caste_category = Column(String, nullable=True)  # sc, st, obc, general, ews
    sub_caste = Column(String, nullable=True)
    caste_certificate_number = Column(String, nullable=True)
    caste_issuing_authority = Column(String, nullable=True)
    minority_status = Column(Integer, default=0)

    # Education
    education_percentage = Column(Float, nullable=True)
    education_board = Column(String, nullable=True)
    education_year = Column(Integer, nullable=True)
    degree_name = Column(String, nullable=True)
    institution_name = Column(String, nullable=True)

    # Quick-question fields
    mobile_number = Column(String, nullable=True)
    is_woman_headed_household = Column(Integer, default=0)

    # Onboarding state
    onboarding_complete = Column(Integer, default=0)
    onboarding_step = Column(Integer, default=1)
    
    # Profile Completeness
    profile_complete_pct = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    user = relationship("User", back_populates="profile")

    def __repr__(self):
        return f"<Profile(user_id={self.user_id}, full_name={self.full_name}, state={self.state})>"
