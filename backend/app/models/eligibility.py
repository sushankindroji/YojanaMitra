"""
Eligibility Result model.
"""
from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid


class EligibilityResult(Base):
    __tablename__ = "eligibility_results"
    __table_args__ = (
        UniqueConstraint('user_id', 'scheme_id', name='unique_user_scheme_eligibility'),
        Index('idx_eligibility_user_scheme', 'user_id', 'scheme_id', unique=True),
        Index('idx_eligibility_user_id', 'user_id'),
        Index('idx_eligibility_user', 'user_id'),
        Index('idx_eligibility_scheme', 'scheme_id'),
        Index('idx_eligibility_status', 'is_eligible'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    scheme_id = Column(String, ForeignKey("schemes.id"), nullable=False)
    
    # Eligibility Status
    is_eligible = Column(Integer, default=0)  # 0/1
    is_partially_eligible = Column(Integer, default=0)  # 0/1
    eligibility_score = Column(Float, nullable=True)  # 0-100
    mandatory_pass = Column(Integer, default=0)  # 0/1 – all mandatory conditions passed
    
    # Detailed Condition Results
    condition_results = Column(Text, nullable=True)  # JSON string with per-condition details
    
    # Explanations
    explanation_en = Column(Text, nullable=True)  # English explanation
    explanation_hi = Column(Text, nullable=True)  # Hindi explanation
    explanation_user_lang = Column(Text, nullable=True)  # User's preferred language
    
    # Missing Data
    missing_docs = Column(Text, nullable=True)  # JSON array of missing document types
    missing_conditions = Column(Text, nullable=True)  # JSON array of failed conditions
    
    # Metadata
    probability_pct = Column(Float, nullable=True)  # Estimated approval probability
    similar_users_pct = Column(Float, nullable=True)  # % of similar users approved
    estimated_days = Column(Integer, nullable=True)  # Processing time estimate
    
    # Timestamp
    computed_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    user = relationship("User", back_populates="eligibility_results")
    scheme = relationship("Scheme", back_populates="eligibility_results")

    def __repr__(self):
        return f"<EligibilityResult(user_id={self.user_id}, scheme_id={self.scheme_id}, eligible={bool(self.is_eligible)})>"
