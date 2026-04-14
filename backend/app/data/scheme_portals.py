"""Portal mappings and helpers for scheme application guidance and backfill."""

from __future__ import annotations

from typing import Any


DEFAULT_PORTAL_URL = "https://www.myscheme.gov.in"
DEFAULT_HELPLINE = "1800-11-0001"
DEFAULT_HELPLINE_HOURS = "Monday-Friday 9AM-6PM"


SCHEME_PORTALS = {
    # Agriculture
    "PM-KISAN": "https://pmkisan.gov.in",
    "PMFBY": "https://pmfby.gov.in",
    "KCC": "https://www.nabard.org/kcc",
    "PKVY": "https://pgsindia-ncof.gov.in",
    "PMKSY": "https://pmksy.gov.in",
    "ENAM": "https://enam.gov.in",
    "RKVY": "https://rkvy.nic.in",
    # Housing
    "PMAY-G": "https://pmayg.nic.in",
    "PMAY-U": "https://pmaymis.gov.in",
    # Finance/Banking
    "PMJDY": "https://pmjdy.gov.in",
    "PMSBY": "https://jansuraksha.gov.in",
    "PMJJBY": "https://jansuraksha.gov.in",
    "APY": "https://npscra.nsdl.co.in",
    "MUDRA": "https://www.mudra.org.in",
    "PMEGP": "https://www.kviconline.gov.in",
    "PMMY": "https://www.mudra.org.in",
    # Education/Scholarship
    "NSP": "https://scholarships.gov.in",
    "NMMS": "https://scholarships.gov.in",
    "PM-YASASVI": "https://yet.nta.ac.in",
    "PMSSS": "https://www.aicte-india.org",
    # Health
    "PMJAY": "https://pmjay.gov.in",
    "PMSBY_HEALTH": "https://nhm.gov.in",
    "JSSK": "https://nhm.gov.in",
    "PMSMA": "https://pmsma.nhp.gov.in",
    "RBSK": "https://rbsk.gov.in",
    # Women & Child
    "PMMVY": "https://pmmvy.wcd.gov.in",
    "BBBP": "https://wcd.nic.in",
    "WCD_SCHEME": "https://wcd.nic.in",
    # Rural Development
    "MGNREGS": "https://nrega.nic.in",
    "PMGSY": "https://pmgsy.nic.in",
    "PMGDISHA": "https://www.pmgdisha.in",
    "DAY-NRLM": "https://aajeevika.gov.in",
    "SVAMITVA": "https://svamitva.nic.in",
    # Skill/Employment
    "PMKVY": "https://www.pmkvyofficial.org",
    "DDUGKY": "https://ddugky.gov.in",
    "NAPS": "https://www.apprenticeship.gov.in",
    # Social Security
    "NSAP": "https://nsap.nic.in",
    "IGNOAPS": "https://nsap.nic.in",
    "IGNWPS": "https://nsap.nic.in",
    "IGNDPS": "https://nsap.nic.in",
    # SC/ST
    "POST_MATRIC_SC": "https://scholarships.gov.in",
    "PRE_MATRIC_SC": "https://scholarships.gov.in",
    "SCA_SCSP": "https://socialjustice.gov.in",
}


MINISTRY_PORTALS = {
    "Ministry of Agriculture and Farmers Welfare": "https://agricoop.nic.in",
    "Ministry of Rural Development": "https://rural.nic.in",
    "Ministry of Women and Child Development": "https://wcd.nic.in",
    "Ministry of Education": "https://education.gov.in",
    "Ministry of Health and Family Welfare": "https://mohfw.gov.in",
    "Ministry of Housing and Urban Affairs": "https://mohua.gov.in",
    "Ministry of Labour and Employment": "https://labour.gov.in",
    "Ministry of Social Justice and Empowerment": "https://socialjustice.gov.in",
    "Ministry of Tribal Affairs": "https://tribal.nic.in",
    "Ministry of Minority Affairs": "https://minorityaffairs.gov.in",
    "Ministry of Skill Development and Entrepreneurship": "https://www.msde.gov.in",
    "Ministry of Micro Small and Medium Enterprises": "https://msme.gov.in",
    "Ministry of Finance": "https://finmin.nic.in",
    "Ministry of Fisheries": "https://dof.gov.in",
    "Ministry of Power": "https://powermin.gov.in",
    "Ministry of Petroleum": "https://petroleum.nic.in",
    "Assam Government": "https://assam.gov.in",
    "Maharashtra Government": "https://www.maharashtra.gov.in",
    "Tamil Nadu Government": "https://www.tn.gov.in",
    "Telangana Government": "https://www.telangana.gov.in",
    "Karnataka Government": "https://www.karnataka.gov.in",
    "West Bengal Government": "https://wb.gov.in",
    "Uttar Pradesh Government": "https://up.gov.in",
    "Rajasthan Government": "https://www.rajasthan.gov.in",
    "Gujarat Government": "https://gujaratindia.gov.in",
    "Kerala Government": "https://kerala.gov.in",
    "Madhya Pradesh Government": "https://mp.gov.in",
    "Bihar Government": "https://state.bihar.gov.in",
    "Odisha Government": "https://odisha.gov.in",
    "Punjab Government": "https://punjab.gov.in",
    "Haryana Government": "https://haryana.gov.in",
    "Jharkhand Government": "https://jharkhand.gov.in",
    "Chhattisgarh Government": "https://www.cgstate.gov.in",
    "Himachal Pradesh Government": "https://himachal.nic.in",
    "Uttarakhand Government": "https://uk.gov.in",
    "Goa Government": "https://www.goa.gov.in",
    "DEFAULT": DEFAULT_PORTAL_URL,
}


HELPLINES = {
    "Ministry of Agriculture": "1800-180-1551",
    "Ministry of Rural Development": "1800-11-6446",
    "Ministry of Health": "1800-180-1104",
    "Ministry of Education": "1800-11-8004",
    "Ministry of Women and Child Development": "1800-11-6100",
    "Ministry of Labour": "1800-11-6670",
    "Ministry of Social Justice": "1800-11-5588",
    "Ministry of Tribal Affairs": "1800-11-3377",
    "Ministry of Housing": "1800-11-3377",
    "Ministry of Skill Development": "1800-123-9626",
    "Ministry of MSME": "1800-180-6763",
    "Ministry of Finance / PMJDY": "1800-11-0001",
    "PMKISAN": "155261",
    "PMJAY": "14555",
    "MGNREGS": "1800-11-0707",
    "NSAP": "1800-11-3377",
    "DEFAULT": DEFAULT_HELPLINE,
}


SECTOR_DOCUMENTS = {
    "Agriculture": [
        "Aadhaar card",
        "Land ownership documents / Khasra-Khatauni",
        "Bank passbook",
        "Mobile number linked to Aadhaar",
    ],
    "Education": [
        "Aadhaar card",
        "Income certificate",
        "Caste certificate (if applicable)",
        "Previous year marksheet",
        "Bank passbook",
        "School/College admission proof",
    ],
    "Health": [
        "Aadhaar card",
        "Ration card / BPL card",
        "Income certificate",
        "Age proof",
    ],
    "Housing": [
        "Aadhaar card",
        "Income certificate",
        "Land ownership proof",
        "BPL card",
        "Bank passbook",
        "Photograph",
    ],
    "Social Security / Pension": [
        "Aadhaar card",
        "Age proof (birth certificate / Aadhaar)",
        "Bank passbook",
        "Income certificate",
        "BPL card (if applicable)",
    ],
    "Women and Child": [
        "Aadhaar card",
        "Pregnancy registration proof",
        "Bank passbook",
        "Income certificate",
    ],
    "SC/ST Welfare": [
        "Aadhaar card",
        "Caste certificate",
        "Income certificate",
        "Bank passbook",
        "Previous year marksheet (for scholarships)",
    ],
    "Skill Development": [
        "Aadhaar card",
        "Age proof",
        "Educational qualification certificate",
        "Photograph",
    ],
    "Employment": [
        "Aadhaar card",
        "Income certificate",
        "Bank passbook",
        "Photograph",
        "Employment registration number (if applicable)",
    ],
    "Finance": ["Aadhaar card", "PAN card", "Bank passbook", "Income proof"],
    "Rural Development": ["Aadhaar card", "Job card (MGNREGS)", "Bank passbook", "BPL / Ration card"],
    "DEFAULT": ["Aadhaar card", "Income certificate", "Bank passbook", "Passport-size photograph"],
}


STEPS_BY_MODE = {
    "online": [
        "Visit the official portal (link given below)",
        "Click 'New Registration' or 'Apply Now'",
        "Enter your mobile number linked to Aadhaar - you will get an OTP",
        "Fill in your personal and family details",
        "Upload the required documents (list given below)",
        "Submit the form and save your Application Reference Number",
        "You can track your application status using this reference number",
    ],
    "csc": [
        "Go to your nearest CSC / Jan Seva Kendra",
        "Carry all original documents and one set of photocopies",
        "The operator will fill the online form on your behalf",
        "Pay the small service charge (usually Rs 30 to Rs 50)",
        "Collect the printed acknowledgement slip with your application number",
        "Your application will be processed within the stated time period",
    ],
    "bank": [
        "Visit your nearest nationalized bank (SBI, Bank of Baroda, Canara Bank, etc.)",
        "Ask the bank staff for the application form for this scheme",
        "Fill the form and attach all required documents",
        "Submit at the bank counter and collect the receipt",
        "The bank will verify and process your application",
    ],
    "gram_panchayat": [
        "Visit your local Gram Panchayat office or Ward Office",
        "Ask the Gram Sevak / Panchayat Secretary for this scheme's form",
        "Fill the form with help from the staff if needed",
        "Attach all required documents",
        "Submit and collect the acknowledgement",
        "Your application will be forwarded to the District office for approval",
    ],
    "department": [
        "Visit the concerned government department office in your district",
        "Carry all original documents and photocopies",
        "Collect and fill the application form",
        "Submit to the counter and get an acknowledgement",
        "Your application will be reviewed by the concerned officer",
    ],
    "DEFAULT": [
        "Visit your nearest CSC / Jan Seva Kendra",
        "Carry Aadhaar card and required documents",
        "The operator will help you apply",
        "Collect your acknowledgement receipt",
    ],
}


FAQS_BY_SECTOR = {
    "Agriculture": [
        {
            "q": "How will I receive the money?",
            "a": "The benefit amount is sent directly to your Aadhaar-linked bank account through DBT (Direct Benefit Transfer). Make sure your bank account is linked to Aadhaar.",
        },
        {
            "q": "Do I need to renew every year?",
            "a": "Most agriculture schemes require annual renewal or re-verification. You will receive an SMS on your Aadhaar-linked mobile when renewal is due.",
        },
        {
            "q": "What if my application is rejected?",
            "a": "You will be informed of the reason via SMS. You can re-apply after correcting the issue or appeal at your nearest agriculture department office.",
        },
    ],
    "Education": [
        {
            "q": "When will the scholarship amount be credited?",
            "a": "Scholarship amounts are usually credited within 3 months of submitting a verified application. Check status on the National Scholarship Portal.",
        },
        {
            "q": "Can I apply if I failed last year?",
            "a": "Most scholarships require you to have passed the previous year's exam. Check the specific eligibility criteria for this scheme.",
        },
        {
            "q": "Is there an income limit?",
            "a": "Most education scholarships have an annual family income limit. Check the eligibility criteria tab for the specific limit for this scheme.",
        },
    ],
    "Health": [
        {
            "q": "Which hospitals are covered?",
            "a": "Government hospitals and empanelled private hospitals. Search empanelled hospitals at pmjay.gov.in or your state health authority website.",
        },
        {
            "q": "Do I need to pay anything?",
            "a": "Most health scheme benefits are cashless at empanelled hospitals. You may need to show your Aadhaar and scheme card at the hospital.",
        },
        {
            "q": "How do I get my health card?",
            "a": "Visit your nearest CSC / Jan Seva Kendra with your Aadhaar and ration card. The operator will issue your health card on the spot.",
        },
    ],
    "DEFAULT": [
        {
            "q": "How long does it take to get the benefit?",
            "a": "Processing time varies. Most schemes take 15 to 30 working days after submitting a complete application. You will receive an SMS update.",
        },
        {
            "q": "Where can I get help with my application?",
            "a": "Visit your nearest CSC / Jan Seva Kendra. The operator will help you apply for free or for a small fee.",
        },
        {
            "q": "What if I don't have all the documents?",
            "a": "You can still apply with available documents and submit remaining documents later. Contact your nearest district office or CSC for guidance.",
        },
    ],
}


CSC_NAMES_BY_STATE = {
    "Telangana": "Mee Seva Centre",
    "Andhra Pradesh": "Mee Seva Centre",
    "Tamil Nadu": "e-Sevai Centre",
    "Karnataka": "Nadakacheri / CSC",
    "Kerala": "Akshaya Centre",
    "Maharashtra": "Aaple Sarkar / CSC",
    "West Bengal": "Tathya Mitra Kendra",
    "Rajasthan": "e-Mitra Kiosk",
    "Madhya Pradesh": "Lok Seva Kendra / CSC",
    "Uttar Pradesh": "Jan Seva Kendra / CSC",
    "Bihar": "VASUDHA Kendra / CSC",
    "Odisha": "e-Seva Kendra",
    "Gujarat": "Jan Seva Kendra",
    "Punjab": "Sewa Kendra",
    "Haryana": "Antyodaya Saral / CSC",
    "Assam": "Arunodoi Kendra / CSC",
    "Jharkhand": "Pragya Kendra / CSC",
    "DEFAULT": "CSC / Jan Seva Kendra",
}


STATE_SERVICE_HELPLINES = {
    "Telangana": "1100 (Mee Seva support)",
    "Andhra Pradesh": "1100 (Mee Seva support)",
}


APPLICATION_MODES = {
    "online": "Apply online on the official portal using your Aadhaar-linked mobile number.",
    "csc": "Visit your nearest CSC / Jan Seva Kendra and apply with document support.",
    "bank": "Visit your nearest bank branch and apply with the required documents.",
    "department": "Apply at the district department office for this scheme.",
    "gram_panchayat": "Apply through Gram Panchayat/Ward office with document verification.",
}


def _norm(value: Any) -> str:
    return str(value or "").strip().lower()


def _clean_code(value: Any) -> str:
    return str(value or "").strip().upper()


def _coerce_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def _match_map_by_contains(value: str, mapping: dict[str, str], default_key: str | None = None) -> str | None:
    value_norm = _norm(value)
    if not value_norm:
        return None

    for key, mapped in mapping.items():
        if key == default_key:
            continue
        key_norm = _norm(key)
        if key_norm and (key_norm in value_norm or value_norm in key_norm):
            return mapped

    return None


def _infer_sector_name(scheme: Any) -> str:
    sector = str(getattr(scheme, "sector", "") or "").strip()
    haystack = " ".join(
        [
            _norm(sector),
            _norm(getattr(scheme, "sub_sector", "")),
            _norm(getattr(scheme, "name_en", "")),
            _norm(getattr(scheme, "description_en", "")),
            _norm(getattr(scheme, "ministry", "")),
        ]
    )

    if any(token in haystack for token in ["agri", "farmer", "kisan", "crop"]):
        return "Agriculture"
    if any(token in haystack for token in ["scholar", "student", "school", "education", "college"]):
        return "Education"
    if any(token in haystack for token in ["health", "hospital", "medical", "ayushman"]):
        return "Health"
    if any(token in haystack for token in ["house", "housing", "awas", "shelter"]):
        return "Housing"
    if any(token in haystack for token in ["pension", "senior", "social security"]):
        return "Social Security / Pension"
    if any(token in haystack for token in ["women", "child", "maternal", "girl"]):
        return "Women and Child"
    if any(token in haystack for token in ["sc", "st", "tribal", "social justice"]):
        return "SC/ST Welfare"
    if any(token in haystack for token in ["skill", "training", "apprentice"]):
        return "Skill Development"
    if any(token in haystack for token in ["employment", "livelihood", "job", "work"]):
        return "Employment"
    if any(token in haystack for token in ["finance", "bank", "loan", "credit", "insurance"]):
        return "Finance"
    if any(token in haystack for token in ["rural", "panchayat", "village", "nrega", "gram"]):
        return "Rural Development"

    return sector or "DEFAULT"


def resolve_portal_url_for_scheme(scheme: Any, prefer_existing: bool = True) -> tuple[str, bool, str]:
    existing_url = str(getattr(scheme, "official_portal_url", "") or "").strip()
    if prefer_existing and existing_url:
        is_fallback = _norm(existing_url) == _norm(DEFAULT_PORTAL_URL)
        return existing_url, is_fallback, "existing"

    scheme_code = _clean_code(getattr(scheme, "scheme_code", ""))
    if scheme_code and scheme_code in SCHEME_PORTALS:
        return SCHEME_PORTALS[scheme_code], False, "scheme_code"

    name_code_match = _match_map_by_contains(
        " ".join([scheme_code, _clean_code(getattr(scheme, "name_en", ""))]),
        SCHEME_PORTALS,
    )
    if name_code_match:
        return name_code_match, False, "scheme_code_contains"

    ministry = str(getattr(scheme, "ministry", "") or "").strip()
    if ministry in MINISTRY_PORTALS:
        mapped = MINISTRY_PORTALS[ministry]
        return mapped, mapped == DEFAULT_PORTAL_URL, "ministry"

    by_ministry_contains = _match_map_by_contains(ministry, MINISTRY_PORTALS, default_key="DEFAULT")
    if by_ministry_contains:
        return by_ministry_contains, by_ministry_contains == DEFAULT_PORTAL_URL, "ministry_contains"

    state = str(getattr(scheme, "state", "") or "").strip()
    if state and _norm(state) != "central":
        key = f"{state} Government"
        if key in MINISTRY_PORTALS:
            return MINISTRY_PORTALS[key], False, "state_government"

    return MINISTRY_PORTALS["DEFAULT"], True, "default"


def get_portal_url_for_scheme(scheme: Any) -> str:
    return resolve_portal_url_for_scheme(scheme)[0]


def get_ministry_helpline(ministry: str | None, scheme_code: str | None = None) -> str:
    code = _clean_code(scheme_code)
    if code:
        for key, number in HELPLINES.items():
            if key == "DEFAULT":
                continue
            if _clean_code(key) == code or _clean_code(key) in code or code in _clean_code(key):
                return number

    ministry_name = str(ministry or "").strip()
    if ministry_name in HELPLINES:
        return HELPLINES[ministry_name]

    by_contains = _match_map_by_contains(ministry_name, HELPLINES, default_key="DEFAULT")
    if by_contains:
        return by_contains

    return HELPLINES["DEFAULT"]


def get_csc_name_by_state(state: str | None) -> str:
    state_name = str(state or "").strip()
    if not state_name:
        return CSC_NAMES_BY_STATE["DEFAULT"]

    if state_name in CSC_NAMES_BY_STATE:
        return CSC_NAMES_BY_STATE[state_name]

    lowered_map = {key.lower(): value for key, value in CSC_NAMES_BY_STATE.items() if key != "DEFAULT"}
    return lowered_map.get(state_name.lower(), CSC_NAMES_BY_STATE["DEFAULT"])


def get_state_service_helpline(state: str | None) -> str | None:
    state_name = str(state or "").strip()
    return STATE_SERVICE_HELPLINES.get(state_name)


def get_documents_for_scheme(scheme: Any) -> list[str]:
    documents = _coerce_list(getattr(scheme, "required_documents", None))
    if documents:
        return documents

    sector = _infer_sector_name(scheme)
    if sector in SECTOR_DOCUMENTS:
        return SECTOR_DOCUMENTS[sector]

    return SECTOR_DOCUMENTS["DEFAULT"]


def _localize_csc_step(step: str, local_csc_name: str) -> str:
    if not step:
        return step

    if "CSC" not in step and "Mee Seva" not in step and "Jan Seva" not in step:
        return step

    normalized = step
    alias_names = {value for key, value in CSC_NAMES_BY_STATE.items() if key != "DEFAULT"}
    for alias in alias_names:
        if not alias:
            continue
        if alias == local_csc_name or alias in local_csc_name or local_csc_name in alias:
            continue
        normalized = normalized.replace(alias, local_csc_name)

    result = (
        normalized.replace(
            "CSC (Common Service Centre) / Mee Seva / Jan Seva Kendra",
            local_csc_name,
        )
        .replace(
            "CSC / Mee Seva / Jan Seva Kendra",
            local_csc_name,
        )
        .replace("CSC (Common Service Centre)", local_csc_name)
        .replace("Mee Seva", local_csc_name)
        .replace("Jan Seva Kendra / CSC", local_csc_name)
        .replace(" (also called CSC / Common Service Centre)", "")
        .replace(" (also called CSC)", "")
    )

    if "nearest CSC /" not in result:
        result = result.replace("nearest CSC", f"nearest {local_csc_name}")

    result = result.replace(f"{local_csc_name} / {local_csc_name}", local_csc_name)
    return result


def get_steps_for_mode(mode: str, local_csc_name: str) -> list[str]:
    selected_mode = _norm(mode)
    base_steps = STEPS_BY_MODE.get(selected_mode, STEPS_BY_MODE["DEFAULT"])
    return [_localize_csc_step(str(step), local_csc_name) for step in base_steps]


def infer_application_mode(scheme: Any) -> str:
    existing = _norm(getattr(scheme, "application_mode", ""))
    if existing in APPLICATION_MODES:
        return existing

    bank_applicable = bool(getattr(scheme, "bank_applicable", False))
    gram_panchayat_applicable = bool(getattr(scheme, "gram_panchayat_applicable", False))
    csc_applicable = bool(getattr(scheme, "csc_applicable", False))

    if bank_applicable:
        return "bank"
    if gram_panchayat_applicable:
        return "gram_panchayat"
    if csc_applicable:
        return "csc"

    haystack = " ".join(
        [
            _norm(getattr(scheme, "name_en", "")),
            _norm(getattr(scheme, "description_en", "")),
            _norm(getattr(scheme, "ministry", "")),
            _norm(getattr(scheme, "sector", "")),
            _norm(getattr(scheme, "scheme_type", "")),
        ]
    )

    if any(token in haystack for token in ["bank", "loan", "credit", "insurance premium"]):
        return "bank"
    if any(token in haystack for token in ["panchayat", "ward", "gram"]):
        return "gram_panchayat"
    if any(token in haystack for token in ["department", "collector", "tehsildar", "district office"]):
        return "department"
    if any(token in haystack for token in ["offline", "csc", "common service center", "mee seva", "jan seva"]):
        return "csc"

    return "online"


def get_steps_for_scheme(scheme: Any, local_csc_name: str) -> list[str]:
    stored_steps = _coerce_list(getattr(scheme, "application_steps", None))
    if stored_steps:
        return [_localize_csc_step(step, local_csc_name) for step in stored_steps]

    mode = infer_application_mode(scheme)
    return get_steps_for_mode(mode, local_csc_name)


def get_faqs_for_scheme(scheme: Any) -> list[dict[str, str]]:
    stored_faq = getattr(scheme, "faq", None)
    if isinstance(stored_faq, list) and stored_faq:
        normalized: list[dict[str, str]] = []
        for row in stored_faq[:3]:
            if not isinstance(row, dict):
                continue
            question = str(row.get("q") or row.get("question") or "").strip()
            answer = str(row.get("a") or row.get("answer") or "").strip()
            if question and answer:
                normalized.append({"q": question, "a": answer})
        if normalized:
            return normalized

    sector = _infer_sector_name(scheme)
    return FAQS_BY_SECTOR.get(sector, FAQS_BY_SECTOR["DEFAULT"])


def get_default_processing_time() -> str:
    return "15-30 working days"


def get_default_validity() -> str:
    return "As per scheme guidelines"
