"""OCR service with document-specific extraction for Indian certificates."""
from __future__ import annotations

import io
import re
from datetime import datetime
from typing import Dict, List, Tuple

try:
    import pytesseract
    from PIL import Image, ImageFilter, ImageOps

    TESSERACT_AVAILABLE = True
except Exception:
    TESSERACT_AVAILABLE = False

try:
    import pdfplumber

    PDFPLUMBER_AVAILABLE = True
except Exception:
    PDFPLUMBER_AVAILABLE = False

from app.config import settings


INDIAN_STATES = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Delhi",
]


DOC_TYPE_ALIASES = {
    "aadhaar": "aadhaar",
    "aadhar": "aadhaar",
    "aadhaar_card": "aadhaar",
    "pan": "pan_card",
    "pan_card": "pan_card",
    "voter": "voter_id",
    "voter_id": "voter_id",
    "passport": "passport",
    "income": "income_certificate",
    "income_certificate": "income_certificate",
    "bpl": "ration_card",
    "ration": "ration_card",
    "ration_card": "ration_card",
    "bank_passbook": "bank_passbook",
    "passbook": "bank_passbook",
    "tenth": "tenth_marksheet",
    "10th": "tenth_marksheet",
    "10th_marksheet": "tenth_marksheet",
    "twelfth": "twelfth_marksheet",
    "12th": "twelfth_marksheet",
    "12th_marksheet": "twelfth_marksheet",
    "degree": "degree_certificate",
    "degree_certificate": "degree_certificate",
    "kcc": "kisan_credit_card",
    "kisan_credit_card": "kisan_credit_card",
    "land": "land_records",
    "land_records": "land_records",
    "patta": "land_records",
    "pm_kisan": "pm_kisan_registration",
    "pm_kisan_registration": "pm_kisan_registration",
    "disability": "disability_certificate",
    "disability_certificate": "disability_certificate",
    "caste": "caste_certificate",
    "caste_certificate": "caste_certificate",
    "minority": "minority_certificate",
    "minority_certificate": "minority_certificate",
    "soil": "soil_health_card",
    "soil_health_card": "soil_health_card",
    "crop_insurance": "crop_insurance_policy",
    "crop_insurance_policy": "crop_insurance_policy",
    "senior_citizen": "senior_citizen_card",
    "senior_citizen_card": "senior_citizen_card",
}


class OCRService:
    """Local OCR + regex extraction service."""

    def __init__(self):
        self.tesseract_available = TESSERACT_AVAILABLE
        self.pdf_available = PDFPLUMBER_AVAILABLE

    @staticmethod
    def normalize_doc_type(doc_type: str) -> str:
        key = (doc_type or "").strip().lower().replace("-", "_").replace(" ", "_")
        return DOC_TYPE_ALIASES.get(key, key or "other")

    @staticmethod
    def _to_iso_date(raw: str) -> str:
        value = (raw or "").strip()
        if not value:
            return ""

        formats = [
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%d.%m.%Y",
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%d %m %Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return ""

    @staticmethod
    def _calculate_age(iso_dob: str) -> int | None:
        if not iso_dob:
            return None
        try:
            dob = datetime.strptime(iso_dob, "%Y-%m-%d")
        except ValueError:
            return None

        today = datetime.utcnow()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age if 0 <= age <= 120 else None

    @staticmethod
    def _extract_state(text: str) -> Tuple[str, float]:
        lowered = (text or "").lower()
        for state in INDIAN_STATES:
            if state.lower() in lowered:
                return state, 0.9
        return "", 0.0

    @staticmethod
    def _extract_pincode(text: str) -> Tuple[str, float]:
        labeled = re.search(r"(?:pin|pincode|postal\s*code)\s*[:\-]?\s*([0-9]{6})", text, re.IGNORECASE)
        if labeled:
            return labeled.group(1), 0.95

        generic = re.findall(r"\b([0-9]{6})\b", text)
        if generic:
            return generic[-1], 0.75
        return "", 0.0

    @staticmethod
    def _extract_name(text: str) -> Tuple[str, float]:
        patterns = [
            r"(?:name|name of (?:applicant|cardholder|holder|beneficiary))\s*[:\-]\s*([A-Za-z][A-Za-z .]{2,80})",
            r"(?:applicant)\s*[:\-]\s*([A-Za-z][A-Za-z .]{2,80})",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = re.sub(r"\s+", " ", match.group(1)).strip(" .")
                if 2 <= len(name.split()) <= 6:
                    return name.title(), 0.88

        for line in [ln.strip() for ln in (text or "").splitlines() if ln.strip()][:10]:
            if re.search(r"\d", line):
                continue
            cleaned = re.sub(r"[^A-Za-z ]", " ", line)
            cleaned = re.sub(r"\s+", " ", cleaned).strip()
            if 2 <= len(cleaned.split()) <= 5 and len(cleaned) <= 60:
                blocked = {"government", "india", "certificate", "aadhaar", "ration", "income"}
                if any(token in cleaned.lower() for token in blocked):
                    continue
                return cleaned.title(), 0.62

        return "", 0.0

    @staticmethod
    def _extract_district(text: str) -> Tuple[str, float]:
        match = re.search(r"(?:district|dist\.?)[\s:\-]+([A-Za-z][A-Za-z .]{2,40})", text, re.IGNORECASE)
        if match:
            district = re.sub(r"\s+", " ", match.group(1)).strip(" .")
            return district.title(), 0.85
        return "", 0.0

    @staticmethod
    def _extract_address(text: str) -> Tuple[str, float]:
        lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
        for idx, line in enumerate(lines):
            match = re.search(r"(?:address|addr)\s*[:\-]?\s*(.*)", line, re.IGNORECASE)
            if not match:
                continue

            parts = [match.group(1).strip(" ,.-")] if match.group(1).strip() else []
            for nxt in range(idx + 1, min(idx + 4, len(lines))):
                fragment = lines[nxt].strip(" ,.-")
                if re.search(r"(district|state|pin|dob|gender|certificate|income)", fragment, re.IGNORECASE):
                    break
                parts.append(fragment)

            candidate = ", ".join([p for p in parts if p])
            if len(candidate) >= 8:
                return candidate, 0.8
        return "", 0.0

    @staticmethod
    def _extract_ifsc(text: str) -> Tuple[str, float]:
        match = re.search(r"\b([A-Z]{4}0[A-Z0-9]{6})\b", text, re.IGNORECASE)
        if not match:
            return "", 0.0
        return match.group(1).upper(), 0.95

    @staticmethod
    def _extract_amount(text: str, labels: List[str] | None = None) -> Tuple[str, float]:
        labels = labels or []
        for label in labels:
            pattern = rf"(?:{label})[^0-9\n\r]{{0,24}}([0-9][0-9, ]{{2,}}(?:\.\d{{1,2}})?)"
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount = re.sub(r"[^0-9.]", "", match.group(1))
                if amount:
                    return amount, 0.92

        generic = re.search(r"(?:inr|rs\.?|₹)\s*([0-9][0-9, ]{2,}(?:\.\d{1,2})?)", text, re.IGNORECASE)
        if generic:
            amount = re.sub(r"[^0-9.]", "", generic.group(1))
            if amount:
                return amount, 0.72
        return "", 0.0

    def _ocr_text_from_pdf(self, file_bytes: bytes) -> str:
        if not self.pdf_available:
            return ""
        pages: List[str] = []
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    if page_text.strip():
                        pages.append(page_text)
        except Exception:
            return ""
        return "\n".join(pages).strip()

    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        image = image.convert("L")
        image = ImageOps.autocontrast(image)
        image = image.filter(ImageFilter.MedianFilter(size=3))
        return image

    def _ocr_text_from_image(self, file_bytes: bytes) -> str:
        if not self.tesseract_available:
            return ""

        try:
            if settings.TESSERACT_PATH:
                pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH

            image = Image.open(io.BytesIO(file_bytes))
            image = self._preprocess_image(image)

            try:
                return pytesseract.image_to_string(image, lang="eng+hin").strip()
            except Exception:
                return pytesseract.image_to_string(image, lang="eng").strip()
        except Exception:
            return ""

    def extract_text(self, file_bytes: bytes) -> str:
        if file_bytes.startswith(b"%PDF"):
            text = self._ocr_text_from_pdf(file_bytes)
            if text:
                return text

        return self._ocr_text_from_image(file_bytes)

    @staticmethod
    def _filter_output(data: Dict[str, object], confidence: Dict[str, float]) -> Tuple[Dict[str, object], Dict[str, float]]:
        cleaned_data: Dict[str, object] = {}
        cleaned_confidence: Dict[str, float] = {}

        for key, value in (data or {}).items():
            if value is None:
                continue
            if isinstance(value, str) and not value.strip():
                continue
            cleaned_data[key] = value
            cleaned_confidence[key] = round(float(confidence.get(key, 0.5)), 2)

        return cleaned_data, cleaned_confidence

    def _extract_aadhaar_from_text(self, text: str) -> Tuple[Dict[str, object], Dict[str, float]]:
        data: Dict[str, object] = {}
        conf: Dict[str, float] = {}

        name, name_conf = self._extract_name(text)
        if name:
            data["full_name"] = name
            conf["full_name"] = name_conf

        dob_match = re.search(r"(?:dob|date\s*of\s*birth|yob)\s*[:\-]?\s*([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4}|[0-9]{4})", text, re.IGNORECASE)
        if dob_match:
            raw_dob = dob_match.group(1)
            if re.fullmatch(r"[0-9]{4}", raw_dob):
                data["dob"] = f"{raw_dob}-01-01"
                conf["dob"] = 0.58
            else:
                iso_dob = self._to_iso_date(raw_dob)
                if iso_dob:
                    data["dob"] = iso_dob
                    conf["dob"] = 0.9

        if data.get("dob"):
            age = self._calculate_age(str(data["dob"]))
            if age is not None:
                data["age"] = age
                conf["age"] = 0.88

        gender_match = re.search(r"\b(male|female|other|transgender)\b", text, re.IGNORECASE)
        if gender_match:
            normalized = gender_match.group(1).lower()
            if normalized == "transgender":
                normalized = "other"
            data["gender"] = normalized
            conf["gender"] = 0.93

        aadhaar_match = re.search(r"\b([0-9]{4}\s?[0-9]{4}\s?[0-9]{4})\b", text)
        if aadhaar_match:
            data["aadhaar_number"] = re.sub(r"\s+", "", aadhaar_match.group(1))
            conf["aadhaar_number"] = 0.96

        address, address_conf = self._extract_address(text)
        if address:
            data["address"] = address
            conf["address"] = address_conf

        district, district_conf = self._extract_district(text)
        if district:
            data["district"] = district
            conf["district"] = district_conf

        state, state_conf = self._extract_state(text)
        if state:
            data["state"] = state
            conf["state"] = state_conf

        pincode, pin_conf = self._extract_pincode(text)
        if pincode:
            data["pincode"] = pincode
            conf["pincode"] = pin_conf

        return self._filter_output(data, conf)

    def extract_aadhaar(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        return self._extract_aadhaar_from_text(self.extract_text(file_bytes))

    def extract_pan_card(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {}
        conf: Dict[str, float] = {}

        pan_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", text, re.IGNORECASE)
        if pan_match:
            data["pan_number"] = pan_match.group(1).upper()
            conf["pan_number"] = 0.97

        name, name_conf = self._extract_name(text)
        if name:
            data["full_name"] = name
            conf["full_name"] = name_conf

        return self._filter_output(data, conf)

    def extract_voter_id(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {}
        conf: Dict[str, float] = {}

        voter_match = re.search(r"\b([A-Z]{3}[0-9]{7})\b", text, re.IGNORECASE)
        if voter_match:
            data["voter_id_number"] = voter_match.group(1).upper()
            conf["voter_id_number"] = 0.92

        address, address_conf = self._extract_address(text)
        if address:
            data["address"] = address
            conf["address"] = address_conf

        state, state_conf = self._extract_state(text)
        if state:
            data["state"] = state
            conf["state"] = state_conf

        district, district_conf = self._extract_district(text)
        if district:
            data["district"] = district
            conf["district"] = district_conf

        return self._filter_output(data, conf)

    def extract_passport(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {}
        conf: Dict[str, float] = {}

        passport_match = re.search(r"\b([A-PR-WYa-pr-wy][0-9]{7})\b", text)
        if passport_match:
            data["passport_number"] = passport_match.group(1).upper()
            conf["passport_number"] = 0.95

        if re.search(r"\bindian\b", text, re.IGNORECASE):
            data["nationality"] = "Indian"
            conf["nationality"] = 0.85

        return self._filter_output(data, conf)

    def extract_income_certificate(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {}
        conf: Dict[str, float] = {}

        annual_income, income_conf = self._extract_amount(
            text,
            labels=["annual\\s+income", "family\\s+income", "income\\s+per\\s+annum", "total\\s+income"],
        )
        if annual_income:
            data["annual_income"] = annual_income
            conf["annual_income"] = income_conf

        authority = re.search(
            r"(?:issuing\s+authority|issued\s+by|tahsildar|tehsildar|revenue\s+officer)\s*[:\-]?\s*([A-Za-z ,.-]{3,80})",
            text,
            re.IGNORECASE,
        )
        if authority:
            data["issuing_authority"] = authority.group(1).strip(" .,")
            conf["issuing_authority"] = 0.78

        name, name_conf = self._extract_name(text)
        if name:
            data["full_name"] = name
            conf["full_name"] = name_conf

        return self._filter_output(data, conf)

    def extract_ration_card(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {"has_ration_card": 1}
        conf: Dict[str, float] = {"has_ration_card": 0.95}

        number_match = re.search(
            r"(?:ration\s*card\s*(?:no|number)?|card\s*no)\s*[:\-]?\s*([A-Z0-9\-/]{6,30})",
            text,
            re.IGNORECASE,
        )
        if number_match:
            data["ration_card_number"] = number_match.group(1).upper()
            conf["ration_card_number"] = 0.9

        category_match = re.search(r"\b(APL|BPL|AAY|PHH|ANTYODAYA)\b", text, re.IGNORECASE)
        if category_match:
            category = category_match.group(1).upper()
            if category == "ANTYODAYA":
                category = "AAY"
            data["ration_card_category"] = category
            conf["ration_card_category"] = 0.92

            if category in {"BPL", "AAY", "PHH"}:
                data["bpl_status"] = 1
                conf["bpl_status"] = 0.9
            else:
                data["bpl_status"] = 0
                conf["bpl_status"] = 0.8

        family_size_match = re.search(r"(?:family\s*(?:size|members?)|total\s*members?)\s*[:\-]?\s*([0-9]{1,2})", text, re.IGNORECASE)
        if family_size_match:
            data["family_size"] = int(family_size_match.group(1))
            conf["family_size"] = 0.82

        return self._filter_output(data, conf)

    def extract_bank_passbook(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {}
        conf: Dict[str, float] = {}

        bank_name_match = re.search(r"(?:bank\s*name|branch)\s*[:\-]?\s*([A-Za-z .,&-]{3,80})", text, re.IGNORECASE)
        if bank_name_match:
            data["bank_name"] = bank_name_match.group(1).strip(" .,")
            conf["bank_name"] = 0.76

        account_match = re.search(r"(?:account\s*(?:number|no)?)\s*[:\-]?\s*([0-9]{9,18})", text, re.IGNORECASE)
        if account_match:
            account_number = account_match.group(1)
            data["account_number_masked"] = f"XXXXXX{account_number[-4:]}"
            conf["account_number_masked"] = 0.92

        ifsc, ifsc_conf = self._extract_ifsc(text)
        if ifsc:
            data["ifsc"] = ifsc
            conf["ifsc"] = ifsc_conf

        data["has_bank_account"] = 1
        conf["has_bank_account"] = 0.9

        return self._filter_output(data, conf)

    def _extract_education_common(self, text: str) -> Tuple[Dict[str, object], Dict[str, float]]:
        data: Dict[str, object] = {}
        conf: Dict[str, float] = {}

        board_match = re.search(r"(?:board|university)\s*[:\-]?\s*([A-Za-z .,&-]{3,80})", text, re.IGNORECASE)
        if board_match:
            data["education_board"] = board_match.group(1).strip(" .,")
            conf["education_board"] = 0.8

        year_match = re.search(r"\b(19[5-9][0-9]|20[0-4][0-9])\b", text)
        if year_match:
            data["education_year"] = int(year_match.group(1))
            conf["education_year"] = 0.82

        percent_match = re.search(r"([0-9]{2}(?:\.[0-9]{1,2})?)\s*(?:%|percent|percentage)", text, re.IGNORECASE)
        if percent_match:
            data["education_percentage"] = float(percent_match.group(1))
            conf["education_percentage"] = 0.86

        return data, conf

    def extract_education_cert(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        return self.extract_degree_certificate(file_bytes)

    def extract_tenth_marksheet(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data, conf = self._extract_education_common(text)
        data["education_level"] = "10th"
        conf["education_level"] = 0.95
        return self._filter_output(data, conf)

    def extract_twelfth_marksheet(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data, conf = self._extract_education_common(text)
        data["education_level"] = "12th"
        conf["education_level"] = 0.95
        return self._filter_output(data, conf)

    def extract_degree_certificate(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data, conf = self._extract_education_common(text)

        degree_match = re.search(r"\b(B\.?A|B\.?Sc|B\.?Com|B\.?Tech|M\.?A|M\.?Sc|M\.?Com|M\.?Tech|Ph\.?D|Diploma|Degree)\b", text, re.IGNORECASE)
        if degree_match:
            data["degree_name"] = degree_match.group(1).replace(".", "").upper()
            conf["degree_name"] = 0.84
            data["education_level"] = "graduate"
            conf["education_level"] = 0.78

        inst_match = re.search(r"(?:college|institution|university)\s*[:\-]?\s*([A-Za-z .,&-]{4,100})", text, re.IGNORECASE)
        if inst_match:
            data["institution_name"] = inst_match.group(1).strip(" .,")
            conf["institution_name"] = 0.75

        return self._filter_output(data, conf)

    def extract_land_records(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {}
        conf: Dict[str, float] = {}

        survey_match = re.search(r"(?:survey\s*(?:no|number)|khasra\s*(?:no|number))\s*[:\-]?\s*([A-Za-z0-9\-/]{2,30})", text, re.IGNORECASE)
        if survey_match:
            data["land_survey_number"] = survey_match.group(1).upper()
            conf["land_survey_number"] = 0.88

        area_match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*(acres?|acre|hectares?|ha)\b", text, re.IGNORECASE)
        if area_match:
            area = float(area_match.group(1))
            unit = area_match.group(2).lower()
            if unit.startswith("hect") or unit == "ha":
                area = round(area * 2.471, 3)
            data["land_area_acres"] = area
            conf["land_area_acres"] = 0.88

        type_match = re.search(r"(?:land\s*type|classification)\s*[:\-]?\s*([A-Za-z ]{3,40})", text, re.IGNORECASE)
        if type_match:
            data["land_type"] = type_match.group(1).strip().title()
            conf["land_type"] = 0.7

        return self._filter_output(data, conf)

    def extract_kisan_credit_card(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {"kcc_holder": 1}
        conf: Dict[str, float] = {"kcc_holder": 0.94}

        number_match = re.search(r"(?:kcc\s*(?:no|number)?|card\s*(?:no|number)?)\s*[:\-]?\s*([A-Z0-9\-/]{6,30})", text, re.IGNORECASE)
        if number_match:
            data["kcc_number"] = number_match.group(1).upper()
            conf["kcc_number"] = 0.9

        bank_match = re.search(r"(?:bank\s*name|bank)\s*[:\-]?\s*([A-Za-z .,&-]{3,80})", text, re.IGNORECASE)
        if bank_match:
            data["bank_name"] = bank_match.group(1).strip(" .,")
            conf["bank_name"] = 0.75

        credit_limit, limit_conf = self._extract_amount(text, labels=["credit\\s+limit", "limit"])
        if credit_limit:
            data["kcc_credit_limit"] = float(credit_limit)
            conf["kcc_credit_limit"] = limit_conf

        return self._filter_output(data, conf)

    def extract_pm_kisan_registration(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {}
        conf: Dict[str, float] = {}

        if re.search(r"\b(active|registered|approved|success)\b", text, re.IGNORECASE):
            data["pm_kisan_registered"] = 1
            conf["pm_kisan_registered"] = 0.84

        farmer_id_match = re.search(r"(?:farmer\s*id|registration\s*(?:id|number)|beneficiary\s*id)\s*[:\-]?\s*([A-Z0-9\-/]{6,30})", text, re.IGNORECASE)
        if farmer_id_match:
            data["pm_kisan_farmer_id"] = farmer_id_match.group(1).upper()
            conf["pm_kisan_farmer_id"] = 0.88

        return self._filter_output(data, conf)

    def extract_disability_certificate(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {"has_disability": 1}
        conf: Dict[str, float] = {"has_disability": 0.95}

        pct_match = re.search(r"([0-9]{1,3})\s*%", text)
        if pct_match:
            pct = int(pct_match.group(1))
            if 1 <= pct <= 100:
                data["disability_percentage"] = pct
                conf["disability_percentage"] = 0.9

        type_match = re.search(r"(?:type\s*of\s*disability|disability\s*type)\s*[:\-]?\s*([A-Za-z ]{3,50})", text, re.IGNORECASE)
        if type_match:
            data["disability_type"] = type_match.group(1).strip().title()
            conf["disability_type"] = 0.78

        authority_match = re.search(r"(?:issued\s*by|issuing\s*authority)\s*[:\-]?\s*([A-Za-z .,&-]{3,80})", text, re.IGNORECASE)
        if authority_match:
            data["disability_issuing_authority"] = authority_match.group(1).strip(" .,")
            conf["disability_issuing_authority"] = 0.76

        return self._filter_output(data, conf)

    def extract_caste_certificate(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {}
        conf: Dict[str, float] = {}

        if re.search(r"\bSC\b|scheduled\s+caste", text, re.IGNORECASE):
            data["caste_category"] = "SC"
            conf["caste_category"] = 0.92
        elif re.search(r"\bST\b|scheduled\s+tribe", text, re.IGNORECASE):
            data["caste_category"] = "ST"
            conf["caste_category"] = 0.92
        elif re.search(r"\bOBC\b|other\s+backward", text, re.IGNORECASE):
            data["caste_category"] = "OBC"
            conf["caste_category"] = 0.9
        elif re.search(r"\bEWS\b|economically\s+weaker", text, re.IGNORECASE):
            data["caste_category"] = "EWS"
            conf["caste_category"] = 0.86
        elif re.search(r"\bGENERAL\b|unreserved", text, re.IGNORECASE):
            data["caste_category"] = "General"
            conf["caste_category"] = 0.84

        sub_match = re.search(r"(?:sub\s*caste|caste)\s*[:\-]?\s*([A-Za-z ]{3,60})", text, re.IGNORECASE)
        if sub_match:
            data["sub_caste"] = sub_match.group(1).strip().title()
            conf["sub_caste"] = 0.7

        cert_match = re.search(r"(?:certificate\s*(?:no|number)|cert\.?\s*no)\s*[:\-]?\s*([A-Z0-9\-/]{4,40})", text, re.IGNORECASE)
        if cert_match:
            data["caste_certificate_number"] = cert_match.group(1).upper()
            conf["caste_certificate_number"] = 0.88

        authority_match = re.search(r"(?:issuing\s*authority|issued\s*by)\s*[:\-]?\s*([A-Za-z .,&-]{3,80})", text, re.IGNORECASE)
        if authority_match:
            data["caste_issuing_authority"] = authority_match.group(1).strip(" .,")
            conf["caste_issuing_authority"] = 0.74

        return self._filter_output(data, conf)

    def extract_minority_certificate(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {"minority_status": 1}
        conf: Dict[str, float] = {"minority_status": 0.85}

        religion_match = re.search(r"(?:religion|community)\s*[:\-]?\s*([A-Za-z ]{3,40})", text, re.IGNORECASE)
        if religion_match:
            data["religion"] = religion_match.group(1).strip().title()
            conf["religion"] = 0.78

        return self._filter_output(data, conf)

    def extract_soil_health_card(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {}
        conf: Dict[str, float] = {}

        soil_match = re.search(r"(?:soil\s*type|soil)\s*[:\-]?\s*([A-Za-z ]{3,50})", text, re.IGNORECASE)
        if soil_match:
            data["soil_type"] = soil_match.group(1).strip().title()
            conf["soil_type"] = 0.8

        rec_match = re.search(r"(?:recommendation|recommended\s*crop|advice)\s*[:\-]?\s*([A-Za-z0-9 ,.-]{5,160})", text, re.IGNORECASE)
        if rec_match:
            data["soil_recommendation"] = rec_match.group(1).strip(" .,")
            conf["soil_recommendation"] = 0.7

        return self._filter_output(data, conf)

    def extract_crop_insurance_policy(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {"crop_insurance": 1}
        conf: Dict[str, float] = {"crop_insurance": 0.9}

        policy_match = re.search(r"(?:policy\s*(?:no|number))\s*[:\-]?\s*([A-Z0-9\-/]{5,40})", text, re.IGNORECASE)
        if policy_match:
            data["crop_insurance_policy_number"] = policy_match.group(1).upper()
            conf["crop_insurance_policy_number"] = 0.9

        sum_insured, sum_conf = self._extract_amount(text, labels=["sum\\s+insured", "insured\\s+amount"])
        if sum_insured:
            data["crop_insurance_sum_insured"] = float(sum_insured)
            conf["crop_insurance_sum_insured"] = sum_conf

        crops_match = re.search(r"(?:insured\s*crops?|crop\s*name)\s*[:\-]?\s*([A-Za-z, /-]{3,120})", text, re.IGNORECASE)
        if crops_match:
            data["insured_crops"] = crops_match.group(1).strip(" .,")
            conf["insured_crops"] = 0.74

        return self._filter_output(data, conf)

    def extract_senior_citizen_card(self, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float]]:
        text = self.extract_text(file_bytes)
        data: Dict[str, object] = {"is_senior_citizen": 1}
        conf: Dict[str, float] = {"is_senior_citizen": 0.9}

        dob_match = re.search(r"(?:dob|date\s*of\s*birth)\s*[:\-]?\s*([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})", text, re.IGNORECASE)
        if dob_match:
            iso_dob = self._to_iso_date(dob_match.group(1))
            if iso_dob:
                data["dob"] = iso_dob
                conf["dob"] = 0.84
                age = self._calculate_age(iso_dob)
                if age is not None:
                    data["age"] = age
                    conf["age"] = 0.84

        authority_match = re.search(r"(?:issued\s*by|issuing\s*authority)\s*[:\-]?\s*([A-Za-z .,&-]{3,80})", text, re.IGNORECASE)
        if authority_match:
            data["senior_citizen_issuing_authority"] = authority_match.group(1).strip(" .,")
            conf["senior_citizen_issuing_authority"] = 0.76

        return self._filter_output(data, conf)

    def _extract_for_doc_type(self, doc_type: str, file_bytes: bytes) -> Tuple[Dict[str, object], Dict[str, float], str]:
        normalized = self.normalize_doc_type(doc_type)

        if normalized == "aadhaar":
            data, confidence_scores = self.extract_aadhaar(file_bytes)
        elif normalized == "pan_card":
            data, confidence_scores = self.extract_pan_card(file_bytes)
        elif normalized == "voter_id":
            data, confidence_scores = self.extract_voter_id(file_bytes)
        elif normalized == "passport":
            data, confidence_scores = self.extract_passport(file_bytes)
        elif normalized == "income_certificate":
            data, confidence_scores = self.extract_income_certificate(file_bytes)
        elif normalized == "ration_card":
            data, confidence_scores = self.extract_ration_card(file_bytes)
        elif normalized == "bank_passbook":
            data, confidence_scores = self.extract_bank_passbook(file_bytes)
        elif normalized == "tenth_marksheet":
            data, confidence_scores = self.extract_tenth_marksheet(file_bytes)
        elif normalized == "twelfth_marksheet":
            data, confidence_scores = self.extract_twelfth_marksheet(file_bytes)
        elif normalized == "degree_certificate":
            data, confidence_scores = self.extract_degree_certificate(file_bytes)
        elif normalized == "kisan_credit_card":
            data, confidence_scores = self.extract_kisan_credit_card(file_bytes)
        elif normalized == "land_records":
            data, confidence_scores = self.extract_land_records(file_bytes)
        elif normalized == "pm_kisan_registration":
            data, confidence_scores = self.extract_pm_kisan_registration(file_bytes)
        elif normalized == "disability_certificate":
            data, confidence_scores = self.extract_disability_certificate(file_bytes)
        elif normalized == "caste_certificate":
            data, confidence_scores = self.extract_caste_certificate(file_bytes)
        elif normalized == "minority_certificate":
            data, confidence_scores = self.extract_minority_certificate(file_bytes)
        elif normalized == "soil_health_card":
            data, confidence_scores = self.extract_soil_health_card(file_bytes)
        elif normalized == "crop_insurance_policy":
            data, confidence_scores = self.extract_crop_insurance_policy(file_bytes)
        elif normalized == "senior_citizen_card":
            data, confidence_scores = self.extract_senior_citizen_card(file_bytes)
        else:
            text = self.extract_text(file_bytes)
            data, confidence_scores = self._extract_aadhaar_from_text(text)

        return data, confidence_scores, normalized

    def extract_document(self, file_bytes: bytes, doc_type: str) -> Dict[str, object]:
        if not self.tesseract_available and not self.pdf_available:
            return {
                "status": "failed",
                "data": {},
                "confidence_scores": {},
                "low_confidence_fields": [],
                "error": "OCR engine unavailable: install pytesseract/Pillow and pdfplumber",
                "doc_type": self.normalize_doc_type(doc_type),
            }

        data, confidence_scores, normalized = self._extract_for_doc_type(doc_type, file_bytes)
        if not data:
            return {
                "status": "failed",
                "data": {},
                "confidence_scores": {},
                "low_confidence_fields": [],
                "error": f"Could not extract required fields from {normalized}",
                "doc_type": normalized,
            }

        low_confidence = [field for field, score in confidence_scores.items() if float(score) < 0.6]
        overall_confidence = round(sum(confidence_scores.values()) / max(len(confidence_scores), 1), 2)

        return {
            "status": "completed",
            "data": data,
            "confidence_scores": confidence_scores,
            "low_confidence_fields": low_confidence,
            "overall_confidence": overall_confidence,
            "doc_type": normalized,
        }

    async def extract_structured_data(self, image_bytes: bytes, doc_type: str) -> Dict[str, object]:
        """Backward-compatible wrapper used by existing document upload router."""
        result = self.extract_document(image_bytes, doc_type)
        if result["status"] != "completed":
            return {
                "status": "failed",
                "method": "local_ocr_regex",
                "data": {},
                "confidence": 0.0,
                "error": result.get("error", "OCR extraction failed"),
            }

        return {
            "status": "completed",
            "method": "local_ocr_regex",
            "data": result["data"],
            "confidence": result.get("overall_confidence", 0.0),
            "confidence_scores": result.get("confidence_scores", {}),
            "low_confidence_fields": result.get("low_confidence_fields", []),
        }


ocr_service = OCRService()
