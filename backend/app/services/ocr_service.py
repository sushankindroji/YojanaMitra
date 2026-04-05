"""
OCR Service combining Gemini Vision and Tesseract.
"""
import os
import json
import re
from app.services.gemini_service import gemini_service, extraction_service
from app.config import settings

try:
    import pytesseract
    from PIL import Image
    import io
    TESSERACT_AVAILABLE = True
except:
    TESSERACT_AVAILABLE = False


class OCRService:
    """Combined OCR service."""

    DOC_TYPE_FIELD_SCHEMA = {
        "aadhaar": {
            "full_name": "string or null",
            "dob": "YYYY-MM-DD or null",
            "gender": "male|female|other or null",
            "aadhaar_number": "12-digit string or null",
            "address": "string or null",
            "state": "string or null",
            "district": "string or null",
            "pincode": "6-digit string or null",
        },
        "income": {
            "full_name": "string or null",
            "annual_income": "number in rupees or null",
            "occupation": "string or null",
            "address": "string or null",
            "state": "string or null",
            "district": "string or null",
            "pincode": "6-digit string or null",
        },
        "caste": {
            "full_name": "string or null",
            "social_category": "general|obc|sc|st|ews or null",
            "address": "string or null",
            "state": "string or null",
            "district": "string or null",
            "pincode": "6-digit string or null",
        },
        "ration": {
            "full_name": "string or null",
            "ration_card_number": "string or null",
            "ration_card_type": "apl|bpl|phh|antyodaya or null",
            "is_bpl": "1 or 0 or null",
            "has_ration_card": "1 or null",
            "address": "string or null",
            "state": "string or null",
            "district": "string or null",
            "pincode": "6-digit string or null",
        },
        "other": {
            "full_name": "string or null",
            "dob": "YYYY-MM-DD or null",
            "gender": "male|female|other or null",
            "annual_income": "number in rupees or null",
            "social_category": "general|obc|sc|st|ews or null",
            "occupation": "string or null",
            "address": "string or null",
            "state": "string or null",
            "district": "string or null",
            "pincode": "6-digit string or null",
        },
    }

    @classmethod
    def _build_extraction_prompt(cls, doc_type: str) -> str:
        schema = cls.DOC_TYPE_FIELD_SCHEMA.get(doc_type, cls.DOC_TYPE_FIELD_SCHEMA["other"])
        template_json = json.dumps({key: None for key in schema.keys()}, indent=2)
        guidance_text = "\n".join([f"- {key}: {rule}" for key, rule in schema.items()])
        return f"""
        You are processing an Indian government document of type: {doc_type}.
        Extract structured values and return ONLY valid JSON.

        Use this exact JSON shape (same keys, null when absent):
        {template_json}

        Field guidance:
        {guidance_text}

        Rules:
        - Do NOT include keys outside this schema.
        - Do NOT infer values that are not explicitly present in the document.
        - If a value is uncertain, set it to null.
        - Return ONLY valid JSON with no explanation and no markdown.
        """

    @staticmethod
    def _build_text_ocr_prompt(doc_type: str) -> str:
        return f"""
        You are processing an Indian government document of type: {doc_type}.
        Extract all visible text exactly as printed.

        Rules:
        - Preserve line breaks where possible.
        - Do not summarize or paraphrase.
        - Return plain text only (no JSON, no markdown, no commentary).
        """

    @staticmethod
    def _parse_income_value(value):
        if value is None:
            return None

        numeric_match = re.search(r"\d[\d,\s]*(?:\.\d+)?", str(value))
        if not numeric_match:
            return None

        numeric_text = numeric_match.group(0).replace(",", "").replace(" ", "")
        if not numeric_text:
            return None

        try:
            parsed = float(numeric_text)
        except Exception:
            return None

        digits_only = re.sub(r"\D", "", numeric_text)
        if len(digits_only) >= 5:
            try:
                prefix_year = int(digits_only[:4])
            except Exception:
                prefix_year = 0
            suffix = digits_only[4:]
            if 1900 <= prefix_year <= 2100 and suffix and set(suffix) == {"0"}:
                return None

        rounded = int(parsed)
        if 1900 <= parsed <= 2100 and abs(parsed - rounded) < 0.0001:
            return None
        if parsed <= 0:
            return None
        return parsed

    @staticmethod
    def _is_meaningful_value(value) -> bool:
        if value is None:
            return False

        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return False

            lowered = stripped.lower()
            if lowered in {"error", "none", "null", "n/a", "na", "unknown"}:
                return False
            if lowered.startswith("error:"):
                return False
            return True

        return True

    @classmethod
    def _normalize_full_name(cls, value) -> str:
        candidate = extraction_service._normalize_name_candidate(str(value or ""))
        return candidate or ""

    @classmethod
    def _sanitize_extracted_data(cls, extracted_data: dict, doc_type: str) -> dict:
        filtered = extraction_service.filter_fields_for_doc_type(extracted_data or {}, doc_type)
        cleaned = {}

        for key, value in filtered.items():
            if not cls._is_meaningful_value(value):
                continue

            if key == "full_name":
                normalized_name = cls._normalize_full_name(value)
                if normalized_name:
                    cleaned[key] = normalized_name
                continue

            if key == "annual_income":
                parsed_income = cls._parse_income_value(value)
                if parsed_income is not None:
                    cleaned[key] = str(int(parsed_income) if float(parsed_income).is_integer() else parsed_income)
                continue

            if key == "pincode":
                digits = "".join(ch for ch in str(value) if ch.isdigit())
                if len(digits) == 6:
                    cleaned[key] = digits
                continue

            if isinstance(value, str):
                stripped = value.strip()
                if stripped:
                    cleaned[key] = stripped
                continue

            cleaned[key] = value

        return cleaned

    @classmethod
    def _clean_regex_result(cls, regex_result: dict, doc_type: str) -> dict:
        return cls._sanitize_extracted_data(regex_result, doc_type)

    @staticmethod
    def _summarize_engine_error(error_text: str, engine_name: str) -> str:
        if not error_text:
            return ""

        lowered = error_text.lower()
        if "429" in lowered or "quota exceeded" in lowered:
            return f"{engine_name} quota exceeded"
        if "not configured" in lowered:
            return f"{engine_name} not configured"
        if "404" in lowered or "not found" in lowered:
            return f"{engine_name} model unavailable"

        first_line = error_text.strip().splitlines()[0]
        return f"{engine_name} error: {first_line[:180]}"

    @classmethod
    def _count_meaningful_fields(cls, extracted_data: dict, doc_type: str) -> int:
        schema = cls.DOC_TYPE_FIELD_SCHEMA.get(doc_type, cls.DOC_TYPE_FIELD_SCHEMA["other"])
        return sum(1 for key in schema.keys() if cls._is_meaningful_value(extracted_data.get(key)))

    @classmethod
    def _should_enrich_with_tesseract(cls, extracted_data: dict, doc_type: str) -> bool:
        if not extracted_data:
            return True

        field_count = cls._count_meaningful_fields(extracted_data, doc_type)

        if doc_type == "income":
            has_income = cls._parse_income_value(extracted_data.get("annual_income")) is not None
            return (not has_income) or field_count < 3

        if doc_type == "caste":
            has_category = cls._is_meaningful_value(extracted_data.get("social_category"))
            return (not has_category) or field_count < 2

        if doc_type == "ration":
            has_ration_core = any(
                cls._is_meaningful_value(extracted_data.get(key))
                for key in ["ration_card_number", "ration_card_type", "is_bpl", "has_ration_card"]
            )
            return (not has_ration_core) or field_count < 3

        if doc_type == "aadhaar":
            has_aadhaar_core = any(
                cls._is_meaningful_value(extracted_data.get(key))
                for key in ["aadhaar_number", "dob", "full_name"]
            )
            return (not has_aadhaar_core) or field_count < 3

        return field_count < 2

    @classmethod
    def _merge_extracted_data(cls, primary: dict, secondary: dict, doc_type: str) -> dict:
        schema = cls.DOC_TYPE_FIELD_SCHEMA.get(doc_type, cls.DOC_TYPE_FIELD_SCHEMA["other"])
        merged = {}

        for key in schema.keys():
            primary_value = (primary or {}).get(key)
            secondary_value = (secondary or {}).get(key)

            if key == "full_name":
                primary_name = cls._normalize_full_name(primary_value)
                secondary_name = cls._normalize_full_name(secondary_value)

                if secondary_name and (not primary_name or len(secondary_name) >= len(primary_name)):
                    merged[key] = secondary_name
                elif primary_name:
                    merged[key] = primary_name
                continue

            if key == "annual_income":
                primary_income = cls._parse_income_value(primary_value)
                secondary_income = cls._parse_income_value(secondary_value)
                if secondary_income is not None and (primary_income is None or secondary_income > primary_income):
                    merged[key] = str(int(secondary_income) if float(secondary_income).is_integer() else secondary_income)
                    continue

            if cls._is_meaningful_value(primary_value):
                merged[key] = primary_value
                continue

            if cls._is_meaningful_value(secondary_value):
                merged[key] = secondary_value

        return {key: value for key, value in merged.items() if cls._is_meaningful_value(value)}

    @classmethod
    def _has_minimum_doc_specific_data(cls, extracted_data: dict, doc_type: str) -> bool:
        """Require at least one doc-specific signal field to avoid irrelevant output."""
        if not extracted_data:
            return False

        if doc_type == "aadhaar":
            return any(
                cls._is_meaningful_value(extracted_data.get(key))
                for key in ["aadhaar_number", "dob", "full_name"]
            )
        if doc_type == "income":
            has_income = cls._parse_income_value(extracted_data.get("annual_income")) is not None
            has_name = cls._is_meaningful_value(extracted_data.get("full_name"))
            geo_count = sum(
                1
                for key in ["district", "state", "pincode"]
                if cls._is_meaningful_value(extracted_data.get(key))
            )
            return has_income or has_name or geo_count >= 2
        if doc_type == "caste":
            return cls._is_meaningful_value(extracted_data.get("social_category"))
        if doc_type == "ration":
            return any(
                cls._is_meaningful_value(extracted_data.get(key))
                for key in ["ration_card_number", "ration_card_type", "is_bpl", "has_ration_card"]
            )

        return bool(extracted_data)

    @staticmethod
    async def ocr_via_gemini(image_bytes: bytes) -> str:
        """Extract text from image using Gemini."""
        if not gemini_service:
            return ""

        result = await gemini_service.extract_text_from_image(image_bytes)
        if not isinstance(result, dict) or "error" in result:
            return ""
        return str(result.get("text") or "")

    @staticmethod
    def ocr_via_tesseract(image_bytes: bytes) -> str:
        """Extract text from image using Tesseract (local)."""
        if not TESSERACT_AVAILABLE:
            return ""

        try:
            import io
            from PIL import Image

            if settings.TESSERACT_PATH and os.path.exists(settings.TESSERACT_PATH):
                pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH

            image = Image.open(io.BytesIO(image_bytes))
            try:
                return pytesseract.image_to_string(image, lang='eng+hin+tel+tam+mar+ben+kan')
            except Exception:
                # Fallback to English-only when additional language data is unavailable.
                return pytesseract.image_to_string(image, lang='eng')
        except Exception as e:
            return f"Error: {str(e)}"

    @staticmethod
    async def extract_structured_data(image_bytes: bytes, doc_type: str) -> dict:
        """Extract structured data from document."""
        normalized_doc_type = extraction_service.normalize_doc_type(doc_type)
        prompt = OCRService._build_extraction_prompt(normalized_doc_type)

        if not gemini_service and not TESSERACT_AVAILABLE:
            return {
                "status": "failed",
                "method": "none",
                "data": {},
                "confidence": 0.0,
                "error": "No OCR engine is configured",
            }

        gemini_error = ""
        gemini_result = {}
        gemini_has_data = False
        gemini_text_error = ""
        gemini_regex_result = {}

        if gemini_service:
            gemini_payload = await gemini_service.extract_from_image(image_bytes, prompt)
            if isinstance(gemini_payload, dict) and "error" not in gemini_payload:
                gemini_result = OCRService._sanitize_extracted_data(gemini_payload, normalized_doc_type)
                gemini_has_data = bool(gemini_result)
            elif isinstance(gemini_payload, dict) and "error" in gemini_payload:
                gemini_error = str(gemini_payload.get("error") or "")

            should_run_gemini_regex = (
                not gemini_has_data
                or OCRService._should_enrich_with_tesseract(gemini_result, normalized_doc_type)
            )
            if should_run_gemini_regex:
                text_prompt = OCRService._build_text_ocr_prompt(normalized_doc_type)
                gemini_text_payload = await gemini_service.extract_text_from_image(image_bytes, text_prompt)
                if isinstance(gemini_text_payload, dict) and "error" not in gemini_text_payload:
                    gemini_text = str(gemini_text_payload.get("text") or "").strip()
                    if gemini_text and not gemini_text.lower().startswith("error:"):
                        regex_payload = extraction_service.extract_fields(gemini_text, normalized_doc_type)
                        gemini_regex_result = OCRService._clean_regex_result(regex_payload, normalized_doc_type)
                elif isinstance(gemini_text_payload, dict):
                    gemini_text_error = str(gemini_text_payload.get("error") or "")

        method = "gemini" if gemini_has_data else "none"
        tesseract_error = ""
        regex_result = {}

        final_data = gemini_result if gemini_has_data else {}
        if gemini_regex_result:
            final_data = OCRService._merge_extracted_data(final_data, gemini_regex_result, normalized_doc_type)
            final_data = OCRService._sanitize_extracted_data(final_data, normalized_doc_type)
            method = "gemini+regex"

        should_run_tesseract = TESSERACT_AVAILABLE and (
            not final_data
            or OCRService._should_enrich_with_tesseract(final_data, normalized_doc_type)
        )
        if should_run_tesseract:
            text = OCRService.ocr_via_tesseract(image_bytes)
            normalized_text = text.strip() if text else ""

            if normalized_text and not normalized_text.lower().startswith("error:"):
                regex_payload = extraction_service.extract_fields(normalized_text, normalized_doc_type)
                regex_result = OCRService._clean_regex_result(regex_payload, normalized_doc_type)
                if regex_result:
                    method = "gemini+regex+tesseract+regex" if final_data else "tesseract+regex"
            else:
                tesseract_error = normalized_text or "OCR extraction failed"

        if regex_result:
            final_data = OCRService._merge_extracted_data(final_data, regex_result, normalized_doc_type)
            final_data = OCRService._sanitize_extracted_data(final_data, normalized_doc_type)

        if final_data and OCRService._has_minimum_doc_specific_data(final_data, normalized_doc_type):
            if method == "gemini+regex+tesseract+regex":
                confidence = 0.84
            elif method == "gemini+regex":
                confidence = 0.8
            elif method == "gemini+tesseract+regex":
                confidence = 0.82
            elif method == "tesseract+regex":
                confidence = 0.6
            else:
                confidence = 0.9

            return {
                "status": "completed",
                "method": method,
                "data": final_data,
                "confidence": confidence,
            }

        if final_data and normalized_doc_type == "other":
            if method == "gemini+regex+tesseract+regex":
                confidence = 0.78
            elif method == "gemini+regex":
                confidence = 0.74
            elif method == "gemini+tesseract+regex":
                confidence = 0.75
            elif method == "gemini":
                confidence = 0.7
            else:
                confidence = 0.55
            return {
                "status": "completed",
                "method": method,
                "data": final_data,
                "confidence": confidence,
            }

        errors = []
        if gemini_error:
            summarized = OCRService._summarize_engine_error(gemini_error, "Gemini")
            if summarized:
                errors.append(summarized)
        if gemini_text_error:
            summarized = OCRService._summarize_engine_error(gemini_text_error, "Gemini OCR text")
            if summarized:
                errors.append(summarized)
        if tesseract_error:
            summarized = OCRService._summarize_engine_error(tesseract_error, "Tesseract")
            if summarized:
                errors.append(summarized)

        default_error = f"Could not extract required {normalized_doc_type} fields"
        if normalized_doc_type == "income":
            default_error = (
                "Could not extract sufficient income details. "
                "Please upload a clearer full income certificate showing applicant name and annual income."
            )

        error_message = default_error
        if errors:
            error_message = f"{default_error} ({'; '.join(errors)})"

        return {
            "status": "failed",
            "method": method if method != "none" else "gemini",
            "data": {},
            "confidence": 0.0,
            "error": error_message,
        }


ocr_service = OCRService()
