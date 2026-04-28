"""Complete OCR pipeline for document intelligence.

Handles preprocessing, OCR, document type detection, and field extraction.
"""
from __future__ import annotations

import io
import re
from datetime import datetime
from typing import Any, Dict, Optional

import cv2
import numpy as np
from PIL import Image
import pytesseract


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Preprocess image for OCR:
    - Open with PIL, convert to RGB
    - Convert to cv2 format
    - Apply: grayscale → medianBlur(3) → OTSU threshold
    
    Args:
        image_bytes: Raw image bytes (JPEG/PNG)
    
    Returns:
        Processed numpy array (binary image)
    """
    # Open with PIL and convert to RGB
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    # Convert PIL to cv2 format (BGR)
    cv2_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    
    # Grayscale
    gray = cv2.cvtColor(cv2_image, cv2.COLOR_BGR2GRAY)
    
    # Median blur to reduce noise
    blurred = cv2.medianBlur(gray, 3)
    
    # OTSU threshold for binary image
    _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    return binary


def detect_document_type(text: str) -> str:
    """
    Detect document type using regex patterns.
    
    Args:
        text: OCR-extracted text
    
    Returns:
        Document type: "aadhaar", "pan", "income_cert", "caste_cert", "ration_card", "unknown"
    """
    text_lower = text.lower()
    
    # Aadhaar: 12-digit number or keywords
    if re.search(r"\b\d{4}\s?\d{4}\s?\d{4}\b", text) or "uidai" in text_lower or "aadhaar" in text_lower:
        return "aadhaar"
    
    # PAN: pattern or keyword
    if re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", text) or "permanent account" in text_lower:
        return "pan"
    
    # Income certificate
    if "income certificate" in text_lower or "annual income" in text_lower or "tehsildar" in text_lower:
        return "income_cert"
    
    # Caste certificate
    if "caste certificate" in text_lower or "scheduled caste" in text_lower or "obc" in text_lower:
        return "caste_cert"
    
    # Ration card
    if "ration card" in text_lower or "nfsa" in text_lower or "bpl" in text_lower:
        return "ration_card"
    
    return "unknown"


def extract_fields(text: str, doc_type: str) -> dict:
    """
    Extract fields using regex patterns specific to document type.
    
    Args:
        text: OCR-extracted text
        doc_type: Document type from detect_document_type()
    
    Returns:
        Dict with extracted fields (None if not found)
    """
    fields: Dict[str, Optional[Any]] = {
        "name": None,
        "dob": None,
        "gender": None,
        "aadhaar_number": None,
        "address": None,
        "income_amount": None,
        "financial_year": None,
        "issuing_authority": None,
        "caste_category": None,
        "certificate_number": None,
    }
    
    # Common fields for all documents
    # Name: capture the rest of the line after "NAME:" or "नाम:" and trim extra labels.
    name_match = re.search(r"(?:NAME|नाम)\s*:?\s*([^\r\n]+)", text, re.IGNORECASE)
    if name_match:
        raw_name = name_match.group(1).strip()
        raw_name = re.split(r"\b(?:DOB|Date of Birth|Gender)\b", raw_name, flags=re.IGNORECASE)[0].strip()
        fields["name"] = re.sub(r"\s+", " ", raw_name) if raw_name else None
    
    # DOB: DD/MM/YYYY format
    dob_match = re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b", text)
    if dob_match:
        fields["dob"] = dob_match.group(1)
    
    # Gender: Male/Female/पुरुष/महिला
    gender_match = re.search(r"\b(Male|Female|पुरुष|महिला|M|F)\b", text, re.IGNORECASE)
    if gender_match:
        gender_raw = gender_match.group(1).lower()
        if gender_raw in {"male", "m", "पुरुष"}:
            fields["gender"] = "Male"
        elif gender_raw in {"female", "f", "महिला"}:
            fields["gender"] = "Female"
    
    # Document-specific fields
    if doc_type == "aadhaar":
        # Aadhaar number: 4-space-4-space-4 digit pattern
        aadhaar_match = re.search(r"\b(\d{4}\s?\d{4}\s?\d{4})\b", text)
        if aadhaar_match:
            fields["aadhaar_number"] = re.sub(r"\s", "", aadhaar_match.group(1))
        
        # Address: after "ADDRESS:" until PIN code
        address_match = re.search(r"ADDRESS\s*:?\s*(.+?)(?:PIN|PINCODE|\d{6})", text, re.IGNORECASE | re.DOTALL)
        if address_match:
            fields["address"] = address_match.group(1).strip()[:100]
    
    elif doc_type == "income_cert":
        # Income amount: ₹ or Rs followed by digits with commas
        income_match = re.search(r"(?:₹|Rs\.?)\s*([\d,]+)", text, re.IGNORECASE)
        if income_match:
            income_str = re.sub(r"[^\d]", "", income_match.group(1))
            if income_str:
                fields["income_amount"] = income_str
        
        # Financial year: YYYY-YYYY pattern
        fy_match = re.search(r"\b(\d{4}[-/]\d{4})\b", text)
        if fy_match:
            fields["financial_year"] = fy_match.group(1)
        
        # Issuing authority: after "Issued by:"
        authority_match = re.search(r"Issued by\s*:?\s*([A-Za-z\s]+)", text, re.IGNORECASE)
        if authority_match:
            fields["issuing_authority"] = authority_match.group(1).strip()
    
    elif doc_type == "caste_cert":
        # Caste category: SC/ST/OBC/General
        caste_match = re.search(r"\b(SC|ST|OBC|General|Scheduled Caste|Scheduled Tribe|Other Backward Class)\b", text, re.IGNORECASE)
        if caste_match:
            fields["caste_category"] = caste_match.group(1).upper()
        
        # Certificate number: alphanumeric after "Cert No:"
        cert_match = re.search(r"Cert(?:ificate)?\s*No\s*:?\s*([A-Z0-9\-/]+)", text, re.IGNORECASE)
        if cert_match:
            fields["certificate_number"] = cert_match.group(1).strip()
    
    elif doc_type == "ration_card":
        # Ration card number
        ration_match = re.search(r"(?:Ration Card|RC)\s*(?:No|Number)\s*:?\s*([A-Z0-9\-/]+)", text, re.IGNORECASE)
        if ration_match:
            fields["certificate_number"] = ration_match.group(1).strip()
    
    return fields


def calculate_confidence(extracted: dict, doc_type: str) -> float:
    """
    Calculate confidence score based on extracted fields.
    
    Args:
        extracted: Dict from extract_fields()
        doc_type: Document type
    
    Returns:
        Confidence score 0-100
    """
    # Define expected fields per document type
    expected_fields = {
        "aadhaar": ["name", "dob", "gender", "aadhaar_number", "address"],
        "pan": ["name", "dob", "gender"],
        "income_cert": ["name", "dob", "income_amount", "financial_year", "issuing_authority"],
        "caste_cert": ["name", "dob", "caste_category", "certificate_number"],
        "ration_card": ["name", "dob", "certificate_number"],
        "unknown": ["name", "dob", "gender"],
    }
    
    expected = expected_fields.get(doc_type, expected_fields["unknown"])
    filled = sum(1 for field in expected if extracted.get(field) is not None)
    
    score = (filled / len(expected)) * 100 if expected else 0
    return round(score, 2)


def _calculate_age_from_dob(dob_str: Optional[str]) -> Optional[int]:
    """Calculate age from DOB string (DD/MM/YYYY or DD-MM-YYYY)."""
    if not dob_str:
        return None
    
    try:
        # Try DD/MM/YYYY format
        dob_date = datetime.strptime(dob_str.replace("-", "/"), "%d/%m/%Y")
        today = datetime.now()
        age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
        return age if age > 0 else None
    except ValueError:
        return None


def process_document(image_bytes: bytes, tesseract_cmd: Optional[str] = None) -> dict:
    """
    Full OCR pipeline: preprocess → OCR → detect → extract → score.
    
    Args:
        image_bytes: Raw image bytes
        tesseract_cmd: Path to tesseract executable (optional)
    
    Returns:
        {
            "document_type": str,
            "extracted_fields": dict,
            "confidence_score": float,
            "raw_text": str,
            "auto_fill": {
                "name": str,
                "age": int,
                "gender": str,
                "annual_income": float,
                "caste": str,
                "bpl": bool,
                "aadhaar_number": str,
            }
        }
    """
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    
    try:
        # Preprocess
        processed = preprocess_image(image_bytes)
        
        # OCR
        raw_text = pytesseract.image_to_string(processed, lang="eng")
        
        # Detect type
        doc_type = detect_document_type(raw_text)
        
        # Extract fields
        extracted = extract_fields(raw_text, doc_type)
        
        # Calculate confidence
        confidence = calculate_confidence(extracted, doc_type)
        
        # Build auto_fill
        age = _calculate_age_from_dob(extracted.get("dob"))
        income = extracted.get("income_amount")
        
        auto_fill = {
            "name": extracted.get("name"),
            "age": age,
            "gender": extracted.get("gender"),
            "annual_income": float(income) if income else None,
            "caste": extracted.get("caste_category"),
            "bpl": doc_type == "ration_card",  # Heuristic: ration card implies BPL
            "aadhaar_number": extracted.get("aadhaar_number"),
        }
        
        return {
            "document_type": doc_type,
            "extracted_fields": extracted,
            "confidence_score": confidence,
            "raw_text": raw_text,
            "auto_fill": auto_fill,
        }
    
    except Exception as exc:
        return {
            "document_type": "unknown",
            "extracted_fields": {},
            "confidence_score": 0.0,
            "raw_text": "",
            "auto_fill": {},
            "error": str(exc),
        }


# Cleanup: remove duplicate import at end
