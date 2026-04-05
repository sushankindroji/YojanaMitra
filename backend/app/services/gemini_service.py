"""
OCR and extraction service using Gemini Vision + spaCy.
"""
import json
import re
from datetime import datetime
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

    FALLBACK_MODELS = [
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro",
    ]

    def __init__(self):
        self.model_name = getattr(settings, "GEMINI_MODEL", None) or "gemini-2.0-flash"
        self.model = None

        if GENAI_AVAILABLE and settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(self.model_name)

    def _model_candidates(self) -> list:
        candidates = [self.model_name] + self.FALLBACK_MODELS
        return list(dict.fromkeys([model for model in candidates if model]))

    def _generate_with_fallback(self, payload):
        """Generate content and retry with fallback models if a model is unavailable."""
        last_error = "Gemini request failed"

        for candidate in self._model_candidates():
            try:
                model = self.model if self.model and candidate == self.model_name else genai.GenerativeModel(candidate)
                response = model.generate_content(payload)
                self.model = model
                self.model_name = candidate
                return response, ""
            except Exception as e:
                err = str(e)
                last_error = err
                lowered = err.lower()

                if "not found" in lowered or "404" in lowered or "not supported" in lowered:
                    continue

                return None, err

        return None, last_error

    @staticmethod
    def _extract_json_payload(text: str) -> dict:
        """Extract and parse a JSON object from Gemini response text."""
        if not text:
            return {}

        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.removeprefix("```")
            if cleaned.lstrip().startswith("json"):
                cleaned = cleaned.lstrip()[4:]
            cleaned = cleaned.split("```", 1)[0].strip()

        # First attempt: parse cleaned text directly
        try:
            parsed = json.loads(cleaned)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            pass

        # Fallback: parse first JSON object in response
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return {}

        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}

    @staticmethod
    def _detect_mime_type(image_bytes: bytes) -> str:
        """Best-effort mime type detection for uploaded document bytes."""
        if not image_bytes:
            return "image/jpeg"

        if image_bytes.startswith(b"%PDF"):
            return "application/pdf"
        if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if image_bytes.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
            return "image/webp"

        return "image/jpeg"

    async def extract_from_image(self, image_bytes: bytes, prompt: str) -> dict:
        """Extract structured data from document image using Gemini."""
        if not self.model:
            return {"error": "Gemini model is not configured"}

        try:
            mime_type = self._detect_mime_type(image_bytes)
            response, error = self._generate_with_fallback([
                {"mime_type": mime_type, "data": image_bytes},
                prompt,
            ])
            if not response:
                return {"error": error or "Gemini image extraction failed"}

            extracted = self._extract_json_payload(getattr(response, "text", ""))
            if not extracted:
                return {"error": "Gemini returned invalid JSON payload"}

            return extracted
        except Exception as e:
            return {"error": str(e)}

    async def extract_text_from_image(self, image_bytes: bytes, prompt: str = "") -> dict:
        """Extract raw OCR text from document image using Gemini."""
        if not self.model:
            return {"error": "Gemini model is not configured"}

        default_prompt = (
            "Extract all visible text from this document exactly as shown. "
            "Preserve line breaks. Return plain text only, no markdown fences."
        )

        try:
            mime_type = self._detect_mime_type(image_bytes)
            response, error = self._generate_with_fallback([
                {"mime_type": mime_type, "data": image_bytes},
                prompt or default_prompt,
            ])
            if not response:
                return {"error": error or "Gemini OCR text extraction failed"}

            text = (getattr(response, "text", "") or "").strip()
            if not text:
                return {"error": "Gemini returned empty OCR text"}

            if text.startswith("```"):
                text = text.removeprefix("```")
                if text.lstrip().lower().startswith("text"):
                    text = text.lstrip()[4:]
                text = text.split("```", 1)[0].strip()

            return {"text": text}
        except Exception as e:
            return {"error": str(e)}

    async def generate_text(self, prompt: str) -> str:
        """Generate text using Gemini."""
        if not self.model:
            return ""

        try:
            response, error = self._generate_with_fallback(prompt)
            if not response:
                return f"Error: {error or 'Gemini generation failed'}"
            return response.text
        except Exception as e:
            return f"Error: {str(e)}"


class ExtractionService:
    """Field extraction using regex and pattern matching."""

    DOC_TYPE_ALIASES = {
        "aadhaar": "aadhaar",
        "aadhar": "aadhaar",
        "aadhaar_card": "aadhaar",
        "aadhaarcard": "aadhaar",
        "income": "income",
        "income_certificate": "income",
        "income certificate": "income",
        "income_proof": "income",
        "salary": "income",
        "salary_certificate": "income",
        "caste": "caste",
        "caste_certificate": "caste",
        "caste certificate": "caste",
        "community_certificate": "caste",
        "ration": "ration",
        "ration_card": "ration",
        "ration card": "ration",
        "rationcard": "ration",
        "other": "other",
    }

    DOC_TYPE_FIELDS = {
        "aadhaar": {
            "full_name",
            "dob",
            "gender",
            "aadhaar_number",
            "address",
            "state",
            "district",
            "pincode",
        },
        "income": {
            "full_name",
            "annual_income",
            "occupation",
            "address",
            "state",
            "district",
            "pincode",
        },
        "caste": {
            "full_name",
            "social_category",
            "address",
            "state",
            "district",
            "pincode",
        },
        "ration": {
            "full_name",
            "ration_card_number",
            "ration_card_type",
            "is_bpl",
            "has_ration_card",
            "address",
            "state",
            "district",
            "pincode",
        },
        "other": {
            "full_name",
            "dob",
            "gender",
            "annual_income",
            "social_category",
            "occupation",
            "address",
            "state",
            "district",
            "pincode",
        },
    }

    INDIAN_STATES = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
        "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
        "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
        "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
        "Uttarakhand", "West Bengal", "Delhi",
    ]

    NAME_BLOCKLIST = {
        "aadhaar",
        "name",
        "government",
        "india",
        "state",
        "department",
        "food",
        "ration",
        "card",
        "holder",
        "certificate",
        "enrollment",
        "uidai",
        "number",
        "proof",
        "citizenship",
        "authentication",
        "offline",
        "xml",
        "qr",
        "code",
        "date of birth",
        "dob",
        "yob",
        "male",
        "female",
        "other",
        "issued",
        "pan",
        "error",
        "mee seva",
        "meeseva",
        "income certificate",
        "caste certificate",
        "ration card",
        "certificate no",
        "district",
        "address",
        "pincode",
        "pin code",
        "income",
        "yojanamitra",
        "easier",
        "faster",
        "upload",
        "documents",
        "dashboard",
        "review",
        "processing",
        "confirm",
        "continue",
        "complete",
        "profile",
        "schemes",
    }

    @staticmethod
    def _clean_line(line: str) -> str:
        cleaned = re.sub(r"[^A-Za-z\s]", " ", line or "")
        return re.sub(r"\s+", " ", cleaned).strip()

    @classmethod
    def normalize_doc_type(cls, doc_type: str) -> str:
        """Normalize doc type input to a canonical value used by extraction logic."""
        if not doc_type:
            return "other"

        key = doc_type.strip().lower().replace("-", " ").replace("_", " ")
        key = re.sub(r"\s+", " ", key)
        key = key.replace(" ", "_")
        return cls.DOC_TYPE_ALIASES.get(key, "other")

    @classmethod
    def filter_fields_for_doc_type(cls, fields: dict, doc_type: str) -> dict:
        """Keep only fields relevant to the provided doc type."""
        if not isinstance(fields, dict):
            return {}

        normalized_doc_type = cls.normalize_doc_type(doc_type)
        allowed = cls.DOC_TYPE_FIELDS.get(normalized_doc_type, cls.DOC_TYPE_FIELDS["other"])
        return {key: value for key, value in fields.items() if key in allowed}

    @classmethod
    def _normalize_name_candidate(cls, raw_line: str) -> str:
        if not raw_line:
            return ""

        if re.search(r"\d", raw_line):
            return ""

        cleaned = cls._clean_line(raw_line)
        cleaned = re.sub(
            r"^(name|card holder|beneficiary|head of family)\s+",
            "",
            cleaned,
            flags=re.IGNORECASE,
        ).strip()
        if not cleaned:
            return ""

        lowered = cleaned.lower()
        if any(token in lowered for token in cls.NAME_BLOCKLIST):
            return ""

        words = cleaned.split()
        if len(words) < 2 or len(words) > 6:
            return ""

        short_words = [word for word in words if len(word) < 2]
        if len(short_words) > 2:
            return ""

        return " ".join(words).title()

    @classmethod
    def _extract_name(cls, text: str) -> str:
        if not text:
            return ""

        labeled_name = re.search(
            r"(?:\bname\b)\s*[:\-]\s*([A-Za-z][A-Za-z ]{1,80})(?:\r?\n|$)",
            text,
            re.IGNORECASE,
        )
        if labeled_name:
            candidate = cls._normalize_name_candidate(labeled_name.group(1))
            if candidate:
                return candidate

        lines = [line.strip() for line in text.splitlines() if line.strip()]
        for idx, line in enumerate(lines):
            if re.search(r"\b(dob|yob|year\s*of\s*birth)\b", line, re.IGNORECASE):
                for offset in range(1, 4):
                    prev_idx = idx - offset
                    if prev_idx < 0:
                        break
                    candidate = cls._normalize_name_candidate(lines[prev_idx])
                    if candidate:
                        return candidate

        for line in lines[:12]:
            candidate = cls._normalize_name_candidate(line)
            if candidate:
                return candidate

        return ""

    @classmethod
    def _extract_labeled_name(cls, text: str) -> str:
        """Extract person name from explicit labels only (safer for certificates)."""
        if not text:
            return ""

        patterns = [
            r"(?:\bname\b|\bname\s+of\s+(?:the\s+)?(?:applicant|beneficiary|card\s*holder)\b|\bapplicant\s*name\b|\bbeneficiary\s*name\b|\bcard\s*holder\b|\bhead\s*of\s*family\b)\s*[:\-]\s*([A-Za-z][A-Za-z .]{1,100})(?:\r?\n|$)",
            r"(?:\bname\s+of\s+(?:the\s+)?(?:applicant|beneficiary|card\s*holder)\b|\bapplicant\b|\bbeneficiary\b|\bhead\s*of\s*family\b)\s+([A-Za-z][A-Za-z .]{1,100})(?:\r?\n|$)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if not match:
                continue
            candidate = cls._normalize_name_candidate(match.group(1))
            if candidate:
                return candidate

        return ""

    @staticmethod
    def _normalize_dob(value: str) -> str:
        if not value:
            return ""

        raw = value.strip()
        formats = ["%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%Y-%m-%d", "%d.%m.%Y"]
        for fmt in formats:
            try:
                return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return raw

    @classmethod
    def _extract_state(cls, text: str) -> str:
        lowered_text = (text or "").lower()
        for state in cls.INDIAN_STATES:
            if state.lower() in lowered_text:
                return state
        return ""

    @staticmethod
    def _extract_district(text: str) -> str:
        if not text:
            return ""

        patterns = [
            r"\b(?:district|dist\.?)\b\s*[:\-]?\s*([A-Za-z][A-Za-z .]{1,50})",
            r"\b([A-Za-z][A-Za-z .]{1,50})\s+(?:district|dist\.?)\b",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if not match:
                continue

            candidate = re.sub(
                r"\b(?:state|pincode|pin(?:code)?|postal\s*code)\b.*$",
                "",
                match.group(1),
                flags=re.IGNORECASE,
            )
            candidate = re.sub(r"\s+", " ", candidate).strip(" .,-")
            if not candidate:
                continue

            words = candidate.split()
            if len(words) > 4:
                candidate = " ".join(words[:4])

            if 2 <= len(candidate) <= 40:
                return candidate.title()

        return ""

    @staticmethod
    def _extract_pincode(text: str) -> str:
        labeled = re.search(
            r"\b(?:pin(?:code)?|postal\s*code)\b\s*[:\-]?\s*([0-9]{6})",
            text,
            re.IGNORECASE,
        )
        if labeled:
            return labeled.group(1)

        candidates = re.findall(r"\b([0-9]{6})\b", text)
        return candidates[-1] if candidates else ""

    @staticmethod
    def _extract_address(text: str) -> str:
        if not text:
            return ""

        lines = [
            re.sub(r"\s+", " ", line).strip()
            for line in text.splitlines()
            if line and line.strip()
        ]
        if not lines:
            return ""

        stop_labels = re.compile(
            r"\b(?:district|dist\.?|state|pin(?:code)?|postal|dob|gender|occupation|income|category|ration|aadhaar|id\s*number|certificate\s*no)\b",
            re.IGNORECASE,
        )
        address_label = re.compile(
            r"\b(?:address|residential\s+address|present\s+address|permanent\s+address)\b\s*[:\-]?\s*(.*)$",
            re.IGNORECASE,
        )

        for idx, line in enumerate(lines):
            match = address_label.search(line)
            if not match:
                continue

            parts = []
            first = match.group(1).strip(" ,.-")
            if first:
                parts.append(first)

            for offset in range(1, 4):
                next_idx = idx + offset
                if next_idx >= len(lines):
                    break

                next_line = lines[next_idx].strip(" ,.-")
                if not next_line or stop_labels.search(next_line):
                    break
                parts.append(next_line)

            candidate = ", ".join(parts)
            candidate = re.sub(r"\s+", " ", candidate).strip(" ,.-")
            if not candidate:
                continue
            if len(candidate) < 8 or len(candidate) > 200:
                continue
            return candidate

        return ""

    @staticmethod
    def _extract_social_category(text: str) -> str:
        lowered = (text or "").lower()
        if re.search(r"\bsc\b|scheduled\s+caste", lowered):
            return "sc"
        if re.search(r"\bst\b|scheduled\s+tribe", lowered):
            return "st"
        if re.search(r"\bcategory\b[^\n\r]{0,20}\b0?8[0c]\b", lowered):
            return "obc"
        if re.search(r"\bobc\b|\b0bc\b|\bo8c\b|\b[o0][b8]c\b|other\s+backward", lowered):
            return "obc"
        if re.search(r"\bews\b|economically\s+weaker", lowered):
            return "ews"
        if re.search(r"\bgeneral\b|unreserved", lowered):
            return "general"
        return ""

    @staticmethod
    def _parse_income_value(raw_value: str):
        if raw_value is None:
            return None

        raw_text = str(raw_value).strip()
        if not raw_text:
            return None

        numeric_match = re.search(r"\d[\d,\s]*(?:\.\d+)?", raw_text)
        if not numeric_match:
            return None

        numeric_text = numeric_match.group(0).replace(",", "").replace(" ", "")
        if not numeric_text:
            return None

        try:
            value = float(numeric_text)
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

        # Reject obvious year-like values (e.g., 2024, 2024.0) that leak from headers.
        rounded = int(value)
        if 1900 <= value <= 2100 and abs(value - rounded) < 0.0001:
            return None

        if value <= 0:
            return None

        # Avoid using large IDs as income values.
        if value > 100000000:
            return None

        return value

    @staticmethod
    def extract_fields(text: str, doc_type: str) -> dict:
        """Extract fields from text using regex patterns."""
        fields = {}

        if not text or text.strip().lower().startswith("error:"):
            return fields

        normalized_doc_type = ExtractionService.normalize_doc_type(doc_type)

        # Aadhaar: 12 digits
        if normalized_doc_type in {"aadhaar", "other"}:
            aadhaar = re.search(r'([0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4})', text)
            if aadhaar:
                fields['aadhaar_number'] = aadhaar.group(1).replace(' ', '').replace('-', '')

        # DOB: YYYY-MM-DD or DD-MM-YYYY
        if normalized_doc_type in {"aadhaar", "other"}:
            dob = re.search(r'(\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})', text)
            if dob:
                normalized_dob = ExtractionService._normalize_dob(dob.group(1))
                if normalized_dob:
                    fields['dob'] = normalized_dob

        # Pincode: prefer labeled values over generic six-digit matches.
        pincode = ExtractionService._extract_pincode(text)
        if pincode:
            fields['pincode'] = pincode

        # Income: amounts like "5,00,000" or "500000"
        if normalized_doc_type == "income":
            income_patterns = [
                r'(?:annual\s+(?:family\s+)?income|family\s+income|income\s+from\s+all\s+sources|total\s+income|income\s+per\s+annum)\b[^\n\r]{0,40}?((?:rs\.?|inr|₹)?\s*[0-9][0-9,\s]{2,}(?:\.\d{1,2})?)',
            ]

            for pattern in income_patterns:
                income_label = re.search(pattern, text, re.IGNORECASE)
                if not income_label:
                    continue

                parsed = ExtractionService._parse_income_value(income_label.group(1))
                if parsed is not None:
                    fields['annual_income'] = str(int(parsed) if parsed.is_integer() else parsed)
                    break

            if 'annual_income' not in fields:
                amount_candidates = re.findall(
                    r'(?:\b(?:rs\.?|inr)\b|₹)\s*([0-9][0-9,\s]{2,}(?:\.\d{1,2})?)|([0-9][0-9,\s]{3,}(?:\.\d{1,2})?)\s*/-',
                    text,
                    re.IGNORECASE,
                )
                parsed_values = []
                for pair in amount_candidates:
                    amount = pair[0] or pair[1]
                    parsed = ExtractionService._parse_income_value(amount)
                    if parsed is not None:
                        parsed_values.append(parsed)

                if parsed_values:
                    best = max(parsed_values)
                    fields['annual_income'] = str(int(best) if float(best).is_integer() else best)

        # Occupation
        if normalized_doc_type in {"income", "aadhaar", "other"}:
            occupation = re.search(
                r'\b(?:occupation|profession|employment|avocation)\b\s*[:\-]?\s*([A-Za-z .]{3,60})(?:\r?\n|$)',
                text,
                re.IGNORECASE,
            )
            if occupation:
                value = re.sub(r'\s+', ' ', occupation.group(1)).strip()
                if value:
                    fields['occupation'] = value.title()

        # Ration card metadata
        if normalized_doc_type == "ration":
            fields['has_ration_card'] = 1

            ration_number_match = re.search(
                r'(?:ration\s*card\s*(?:no|number)?|rc\s*no|card\s*number)\s*[:\-]?\s*([A-Za-z0-9\-/]{5,30})',
                text,
                re.IGNORECASE,
            )
            if ration_number_match:
                fields['ration_card_number'] = ration_number_match.group(1).strip().upper()

            ration_type_match = re.search(r'\b(apl|bpl|phh|antyodaya)\b', text, re.IGNORECASE)
            if ration_type_match:
                ration_type = ration_type_match.group(1).lower()
                fields['ration_card_type'] = ration_type
                if ration_type in {'bpl', 'phh', 'antyodaya'}:
                    fields['is_bpl'] = 1

        # Gender
        if normalized_doc_type in {"aadhaar", "other"}:
            gender = re.search(r'\b(male|female|other)\b', text, re.IGNORECASE)
            if gender:
                fields['gender'] = gender.group(1).lower()

        # Social category
        if normalized_doc_type in {"caste", "other"}:
            social_category = ExtractionService._extract_social_category(text)
            if social_category:
                fields['social_category'] = social_category

        # State and district
        address = ExtractionService._extract_address(text)
        if address:
            fields['address'] = address

        state = ExtractionService._extract_state(text)
        if state:
            fields['state'] = state

        district = ExtractionService._extract_district(text)
        if district:
            fields['district'] = district

        # Name
        if normalized_doc_type in {"income", "caste", "ration"}:
            candidate_name = ExtractionService._extract_labeled_name(text)
            if not candidate_name:
                candidate_name = ExtractionService._extract_name(text)
        else:
            candidate_name = ExtractionService._extract_name(text)
        if candidate_name:
            fields['full_name'] = candidate_name

        return ExtractionService.filter_fields_for_doc_type(fields, normalized_doc_type)


# Singleton instances
gemini_service = GeminiService() if GENAI_AVAILABLE else None
extraction_service = ExtractionService()
