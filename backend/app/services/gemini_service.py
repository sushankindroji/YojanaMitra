"""
OCR and extraction service using Gemini Vision + spaCy.
"""
import json
import re
import base64
from app.config import settings

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except:
    GENAI_AVAILABLE = False

try:
    import pytesseract
    from PIL import Image
    import io
    TESSERACT_AVAILABLE = True
except:
    TESSERACT_AVAILABLE = False


class GeminiService:
    """Gemini Vision API service."""

    def __init__(self):
        if GENAI_AVAILABLE and settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel("gemini-1.5-flash")
        else:
            self.model = None

    async def extract_from_image(self, image_bytes: bytes, prompt: str) -> dict:
        """Extract structured data from document image using Gemini."""
        if not self.model:
            return {}

        try:
            image_data = base64.b64encode(image_bytes).decode()
            response = self.model.generate_content([
                {"mime_type": "image/jpeg", "data": image_data},
                prompt,
            ])
            
            # Parse JSON from response
            text = response.text
            # Extract JSON if embedded in markdown
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            
            return json.loads(text)
        except Exception as e:
            return {"error": str(e)}

    async def generate_text(self, prompt: str) -> str:
        """Generate text using Gemini."""
        if not self.model:
            return ""

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error: {str(e)}"


class ExtractionService:
    """Field extraction using regex and pattern matching."""

    @staticmethod
    def extract_fields(text: str, doc_type: str) -> dict:
        """Extract fields from text using regex patterns."""
        fields = {}

        # Aadhaar: 12 digits
        aadhaar = re.search(r'([0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4})', text)
        if aadhaar:
            fields['aadhaar_number'] = aadhaar.group(1).replace(' ', '').replace('-', '')

        # DOB: YYYY-MM-DD or DD-MM-YYYY
        dob = re.search(r'(\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})', text)
        if dob:
            fields['dob'] = dob.group(1)

        # Pincode: 6 digits
        pincode = re.search(r'\b([0-9]{6})\b', text)
        if pincode:
            fields['pincode'] = pincode.group(1)

        # Income: amounts like "5,00,000" or "500000"
        income = re.search(r'₹?\s*([0-9]{1,2}(?:[,][0-9]{2})*(?:[.][0-9]{2})?|[0-9]+)', text)
        if income:
            fields['annual_income'] = income.group(1).replace(',', '')

        # Name (rough - first capitalized word sequence)
        # This is basic and should be verified
        name = re.search(r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', text, re.MULTILINE)
        if name:
            fields['full_name'] = name.group(1)

        return fields


# Singleton instances
gemini_service = GeminiService() if GENAI_AVAILABLE else None
extraction_service = ExtractionService()
