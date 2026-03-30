"""
Document model.
"""
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Document Info
    doc_type = Column(String, nullable=False)  # aadhaar, income, caste, ration, other
    file_name = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)  # path in uploads/ folder
    is_encrypted = Column(Integer, default=1)
    
    # Extraction
    extraction_status = Column(String, default="pending")  # pending, processing, completed, failed
    extracted_data = Column(String, nullable=True)  # JSON string
    confidence_score = Column(Float, nullable=True)  # 0-100
    
    # Retry
    retry_count = Column(Integer, default=0)
    error_message = Column(String, nullable=True)
    
    # Timestamps
    uploaded_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    processed_at = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="documents")

    def __repr__(self):
        return f"<Document(id={self.id}, doc_type={self.doc_type}, user_id={self.user_id})>"
