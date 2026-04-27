"""DocumentIntelligenceAgent: OCR-based document field extraction.

Uses cv2 + pytesseract for preprocessing and extraction.
LLM fallback only when confidence < 0.5.
"""
from __future__ import annotations

import re
from typing import Any, Dict, Optional


# Regex patterns for Indian document fields
_PATTERNS = {
    "aadhaar": re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b"),
    "pan": re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b"),
    "dob": re.compile(
        r"\b(?:DOB|Date of Birth|D\.O\.B)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b",
        re.IGNORECASE,
    ),
    "dob_plain": re.compile(r"\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b"),
    "income": re.compile(
        r"(?:Annual Income|Income)[:\s]*(?:Rs\.?|INR)?\s*([\d,]+)",
        re.IGNORECASE,
    ),
    "name": re.compile(
        r"(?:Name|Full Name)[:\s]+([A-Z][a-zA-Z\s]{2,40})",
        re.IGNORECASE,
    ),
    "gender": re.compile(r"\b(Male|Female|Other|MALE|FEMALE)\b"),
    "caste": re.compile(
        r"\b(SC|ST|OBC|General|EWS|Scheduled Caste|Scheduled Tribe|Other Backward Class)\b",
        re.IGNORECASE,
    ),
}

_DOC_TYPE_KEYWORDS = {
    "aadhaar": ["aadhaar", "aadhar", "uid", "unique identification", "uidai"],
    "pan": ["permanent account number", "income tax", "pan card"],
    "voter_id": ["election commission", "voter", "epic", "electors photo"],
    "passport": ["passport", "republic of india", "ministry of external affairs"],
    "income_certificate": ["income certificate", "annual income", "tehsildar", "revenue"],
    "caste_certificate": ["caste certificate", "social category", "sc/st", "obc certificate"],
    "ration_card": ["ration card", "fair price shop", "food security"],
}


def _detect_doc_type(text: str) -> str:
    lower = text.lower()
    for doc_type, keywords in _DOC_TYPE_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return doc_type
    return "unknown"


def _extract_fields(text: str) -> Dict[str, Optional[str]]:
    fields: Dict[str, Optional[str]] = {
        "name": None,
        "aadhaar": None,
        "dob": None,
        "income": None,
        "caste": None,
        "gender": None,
        "pan": None,
    }

    m = _PATTERNS["name"].search(text)
    if m:
        fields["name"] = m.group(1).strip()

    m = _PATTERNS["aadhaar"].search(text)
    if m:
        fields["aadhaar"] = re.sub(r"\s", "", m.group())

    m = _PATTERNS["pan"].search(text)
    if m:
        fields["pan"] = m.group()

    m = _PATTERNS["dob"].search(text)
    if m:
        fields["dob"] = m.group(1)
    else:
        m = _PATTERNS["dob_plain"].search(text)
        if m:
            fields["dob"] = m.group(1)

    m = _PATTERNS["income"].search(text)
    if m:
        fields["income"] = m.group(1).replace(",", "")

    m = _PATTERNS["gender"].search(text)
    if m:
        fields["gender"] = m.group(1).lower()

    m = _PATTERNS["caste"].search(text)
    if m:
        fields["caste"] = m.group(1).upper()

    return fields


def _compute_confidence(fields: Dict[str, Optional[str]]) -> float:
    filled = sum(1 for v in fields.values() if v is not None)
    return round(filled / len(fields), 4)


def _preprocess_image(image_bytes: bytes):
    """Grayscale → denoise → threshold using cv2."""
    import cv2
    import numpy as np

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image bytes")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh


def _run_ocr(processed_image) -> str:
    import pytesseract

    config = "--oem 3 --psm 6"
    return pytesseract.image_to_string(processed_image, config=config, lang="eng")


def _llm_fallback(image_bytes: bytes, partial_fields: Dict[str, Any]) -> Dict[str, Any]:
    """
    LLM fallback when confidence < 0.5.
    Attempts to fill missing fields using an LLM vision call if available.
    Returns partial_fields unchanged if LLM is unavailable.
    """
    try:
        import base64
        import os
        import httpx

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return partial_fields

        b64 = base64.b64encode(image_bytes).decode()
        missing = [k for k, v in partial_fields.items() if v is None]
        prompt = (
            f"This is an Indian government document image. "
            f"Extract these fields if visible: {', '.join(missing)}. "
            "Reply with a JSON object only, using null for missing fields."
        )

        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                        ],
                    }
                ],
                "max_tokens": 300,
            },
            timeout=15,
        )

        import json
        content = response.json()["choices"][0]["message"]["content"]
        # Strip markdown code fences if present
        content = re.sub(r"```(?:json)?", "", content).strip().rstrip("```").strip()
        llm_fields = json.loads(content)

        for k, v in llm_fields.items():
            if k in partial_fields and partial_fields[k] is None and v:
                partial_fields[k] = str(v)

    except Exception:
        pass  # LLM fallback is best-effort

    return partial_fields


class DocumentIntelligenceAgent:
    """Extracts structured fields from document images using OCR."""

    def run(self, image_bytes: bytes) -> dict:
        """
        Args:
            image_bytes: Raw image bytes (JPEG/PNG).

        Returns:
            {
                doc_type: str,
                fields: {name, aadhaar, dob, income, caste, gender, pan},
                raw_text: str,
                confidence_score: float (0-1),
                llm_used: bool,
            }
        """
        try:
            processed = _preprocess_image(image_bytes)
            raw_text = _run_ocr(processed)
        except Exception as exc:
            return {
                "doc_type": "unknown",
                "fields": {},
                "raw_text": "",
                "confidence_score": 0.0,
                "llm_used": False,
                "error": str(exc),
            }

        doc_type = _detect_doc_type(raw_text)
        fields = _extract_fields(raw_text)
        confidence_score = _compute_confidence(fields)

        llm_used = False
        if confidence_score < 0.5:
            fields = _llm_fallback(image_bytes, fields)
            confidence_score = _compute_confidence(fields)
            llm_used = True

        return {
            "doc_type": doc_type,
            "fields": fields,
            "raw_text": raw_text,
            "confidence_score": confidence_score,
            "llm_used": llm_used,
        }
