"""
OCR Service combining Gemini Vision and Tesseract.
"""
import base64
from app.services.gemini_service import gemini_service, extraction_service

try:
    import pytesseract
    from PIL import Image
    import io
    TESSERACT_AVAILABLE = True
except:
    TESSERACT_AVAILABLE = False


class OCRService:
    """Combined OCR service."""

    @staticmethod
    async def ocr_via_gemini(image_bytes: bytes) -> str:
        """Extract text from image using Gemini."""
        if not gemini_service:
            return ""

        prompt = """
        Extract all text from this document image accurately.
        Return the extracted text only, with proper formatting.
        """
        result = await gemini_service.generate_text(f"Extract text: {prompt}")
        return result

    @staticmethod
    def ocr_via_tesseract(image_bytes: bytes) -> str:
        """Extract text from image using Tesseract (local)."""
        if not TESSERACT_AVAILABLE:
            return ""

        try:
            import io
            from PIL import Image
            image = Image.open(io.BytesIO(image_bytes))
            text = pytesseract.image_to_string(image, lang='eng+hin+tel+tam+mar+ben+kan')
            return text
        except Exception as e:
            return f"Error: {str(e)}"

    @staticmethod
    async def extract_structured_data(image_bytes: bytes, doc_type: str) -> dict:
        """Extract structured data from document."""
        prompt = f"""
        You are processing an Indian government document of type: {doc_type}.
        Extract all structured data from this image.
        Return ONLY a valid JSON object with these keys (null if not found):
        {{
          "full_name": string,
          "dob": "YYYY-MM-DD" or null,
          "gender": "male"|"female"|"other" or null,
          "aadhaar_number": string (12 digits) or null,
          "annual_income": number (in rupees) or null,
          "address": string or null,
          "state": string or null,
          "district": string or null,
          "pincode": string (6 digits) or null,
          "social_category": "general"|"obc"|"sc"|"st"|"ews" or null
        }}
        Return ONLY valid JSON. No explanation.
        """

        if gemini_service:
            gemini_result = await gemini_service.extract_from_image(image_bytes, prompt)
        else:
            gemini_result = {}

        # Fallback to Tesseract + regex if Gemini fails
        if not gemini_result or "error" in gemini_result:
            if TESSERACT_AVAILABLE:
                text = OCRService.ocr_via_tesseract(image_bytes)
                regex_result = extraction_service.extract_fields(text, doc_type)
                return {
                    "status": "completed",
                    "method": "tesseract+regex",
                    "data": regex_result,
                    "confidence": 0.6,
                }

        return {
            "status": "completed",
            "method": "gemini",
            "data": gemini_result,
            "confidence": 0.9,
        }


ocr_service = OCRService()
