"""Portal mappings and helpers for scheme application guidance."""

from __future__ import annotations

from typing import Any

MINISTRY_PORTALS = {
    "Ministry of Agriculture": "https://pmkisan.gov.in",
    "Ministry of Rural Development": "https://pmgsy.nic.in",
    "Ministry of Women and Child Development": "https://wcd.nic.in",
    "Ministry of Education": "https://scholarships.gov.in",
    "Ministry of Health": "https://nhm.gov.in",
    "Ministry of Housing": "https://pmaymis.gov.in",
    "Ministry of Labour": "https://esic.gov.in",
    "Ministry of Social Justice": "https://socialjustice.gov.in",
    "Ministry of Tribal Affairs": "https://tribal.nic.in",
    "Ministry of Minority Affairs": "https://minorityaffairs.gov.in",
    "Ministry of Skill Development": "https://www.skillindia.gov.in",
    "Ministry of MSME": "https://msme.gov.in",
    "Ministry of Finance": "https://financialservices.gov.in",
    "Ministry of Food and Public Distribution": "https://dfpd.gov.in",
    "Ministry of Consumer Affairs": "https://consumeraffairs.nic.in",
    "Ministry of Fisheries": "https://dof.gov.in",
    "Ministry of Animal Husbandry": "https://dahd.nic.in",
    "Ministry of Textiles": "https://texmin.nic.in",
    "Ministry of Youth Affairs": "https://yas.nic.in",
    "Ministry of New and Renewable Energy": "https://mnre.gov.in",
    "Ministry of Electronics and IT": "https://www.meity.gov.in",
}

SCHEME_SPECIFIC_URLS = {
    "PM-KISAN": "https://pmkisan.gov.in",
    "PMAY-G": "https://pmayg.nic.in",
    "PMAY-U": "https://pmaymis.gov.in",
    "PMJDY": "https://pmjdy.gov.in",
    "PMSBY": "https://jansuraksha.gov.in",
    "PMJJBY": "https://jansuraksha.gov.in",
    "APY": "https://npscra.nsdl.co.in",
    "MUDRA": "https://www.mudra.org.in",
    "PMEGP": "https://www.kviconline.gov.in",
    "NSP": "https://scholarships.gov.in",
    "PMMVY": "https://wcd.nic.in",
    "JSSK": "https://nhm.gov.in",
    "NHM": "https://nhm.gov.in",
    "AB-PMJAY": "https://beneficiary.nha.gov.in",
    "AYUSHMAN": "https://beneficiary.nha.gov.in",
    "MGNREGA": "https://nrega.nic.in",
    "DAY-NULM": "https://nulm.gov.in",
    "DAY-NRLM": "https://aajeevika.gov.in",
    "PMGSY": "https://pmgsy.nic.in",
    "DDU-GKY": "https://ddugky.gov.in",
    "PMFBY": "https://pmfby.gov.in",
    "KCC": "https://www.myscheme.gov.in",
    "SOIL-HEALTH-CARD": "https://soilhealth.dac.gov.in",
    "E-SHRAM": "https://eshram.gov.in",
    "ESIC": "https://esic.gov.in",
    "EPFO": "https://www.epfindia.gov.in",
    "ATAL-TINKERING-LAB": "https://aim.gov.in",
    "SWAYAM": "https://swayam.gov.in",
    "NCS": "https://www.ncs.gov.in",
    "STAND-UP-INDIA": "https://www.standupmitra.in",
    "STARTUP-INDIA": "https://www.startupindia.gov.in",
    "CGTMSE": "https://www.cgtmse.in",
    "UJJWALA": "https://www.pmuy.gov.in",
    "SAUBHAGYA": "https://powermin.gov.in",
    "FASAL-BIMA": "https://pmfby.gov.in",
    "JAN-AUSHADHI": "https://janaushadhi.gov.in",
    "SAMARTH": "https://samarth.ac.in",
    "NCS-SKILL": "https://www.ncs.gov.in",
    "NABARD-WDF": "https://www.nabard.org",
    "PM-SVANIDHI": "https://pmsvanidhi.mohua.gov.in",
    "PM-VISHWAKARMA": "https://pmvishwakarma.gov.in",
    "PM-KUSUM": "https://mnre.gov.in",
    "FAME-II": "https://fame2.heavyindustries.gov.in",
    "UDYAM": "https://udyamregistration.gov.in",
    "GEM": "https://gem.gov.in",
    "ONE-NATION-ONE-RATION": "https://nfsa.gov.in",
    "NATIONAL-FOOD-SECURITY": "https://nfsa.gov.in",
    "SUKANYA-SAMRIDDHI": "https://www.indiapost.gov.in",
    "BALIKA-SAMRIDHI": "https://wcd.nic.in",
    "BETI-BACHAO": "https://wcd.nic.in",
    "MATRU-VANDANA": "https://wcd.nic.in",
    "ICDS": "https://wcd.nic.in",
    "POSHAN-ABHIYAN": "https://poshanabhiyaan.gov.in",
    "NLM": "https://dahd.nic.in",
    "BLUE-REVOLUTION": "https://dof.gov.in",
    "FISHERIES-INFRA": "https://dof.gov.in",
    "PMMSY": "https://dof.gov.in",
    "TRIFED": "https://trifed.tribal.gov.in",
    "VAN-DHAN": "https://trifed.tribal.gov.in",
    "PRE-MATRIC-SCHOLARSHIP": "https://scholarships.gov.in",
    "POST-MATRIC-SCHOLARSHIP": "https://scholarships.gov.in",
    "TOP-CLASS-EDUCATION": "https://scholarships.gov.in",
    "NATIONAL-APPRENTICESHIP": "https://www.apprenticeshipindia.gov.in",
    "SKILL-INDIA": "https://www.skillindia.gov.in",
    "PMKVY": "https://www.skillindia.gov.in",
    "NULM": "https://nulm.gov.in",
    "NRLM": "https://aajeevika.gov.in",
    "AWAS-PLUS": "https://pmayg.nic.in",
    "PMAY": "https://pmaymis.gov.in",
    "AMRUT": "https://amrut.gov.in",
    "SVAMITVA": "https://svamitva.nic.in",
    "NCSM": "https://www.ncsm.gov.in",
    "CSC": "https://www.csc.gov.in",
    "DBT": "https://dbtbharat.gov.in",
    "UMANG": "https://web.umang.gov.in",
    "DIGILOCKER": "https://www.digilocker.gov.in",
}

APPLICATION_MODES = {
    "online": "Apply directly on the official portal using Aadhaar-linked login",
    "csc": "Visit your nearest Common Service Centre (CSC) with required documents",
    "bank": "Apply at any nationalized bank branch with your documents",
    "department": "Visit the concerned government department office",
    "gram_panchayat": "Apply through your local Gram Panchayat / Ward Office",
}

DEFAULT_PORTAL_URL = "https://www.myscheme.gov.in"

MINISTRY_HELPLINES = {
    "Ministry of Agriculture": "1800-180-1551",
    "Ministry of Rural Development": "1800-111-555",
    "Ministry of Women and Child Development": "181",
    "Ministry of Education": "1800-11-8000",
    "Ministry of Health": "1075",
    "Ministry of Labour": "155368",
    "Ministry of Social Justice": "1800-121-5555",
    "Ministry of Finance": "1800-111-000",
}


def _norm(value: Any) -> str:
    return str(value or "").strip().lower()


def get_portal_url_for_scheme(scheme: Any) -> str | None:
    scheme_code = str(getattr(scheme, "scheme_code", "") or "").strip().upper()
    if scheme_code and scheme_code in SCHEME_SPECIFIC_URLS:
        return SCHEME_SPECIFIC_URLS[scheme_code]

    ministry = str(getattr(scheme, "ministry", "") or "").strip()
    if ministry and ministry in MINISTRY_PORTALS:
        return MINISTRY_PORTALS[ministry]

    haystack = " ".join(
        [
            _norm(getattr(scheme, "name_en", "")),
            _norm(getattr(scheme, "description_en", "")),
            _norm(getattr(scheme, "sector", "")),
        ]
    )

    if any(token in haystack for token in ["scholarship", "student", "education"]):
        return "https://scholarships.gov.in"
    if any(token in haystack for token in ["farmer", "agri", "crop", "kisan"]):
        return "https://pmkisan.gov.in"
    if any(token in haystack for token in ["housing", "home", "awas", "pmay"]):
        return "https://pmaymis.gov.in"
    if any(token in haystack for token in ["health", "hospital", "insurance", "ayushman"]):
        return "https://nhm.gov.in"
    if any(token in haystack for token in ["women", "child", "maternity"]):
        return "https://wcd.nic.in"
    if any(token in haystack for token in ["skill", "employment", "livelihood"]):
        return "https://www.skillindia.gov.in"
    if any(token in haystack for token in ["bank", "loan", "finance", "credit"]):
        return "https://financialservices.gov.in"

    return DEFAULT_PORTAL_URL


def infer_application_mode(scheme: Any) -> str:
    existing = _norm(getattr(scheme, "application_mode", ""))
    if existing in APPLICATION_MODES:
        return existing

    haystack = " ".join(
        [
            _norm(getattr(scheme, "name_en", "")),
            _norm(getattr(scheme, "description_en", "")),
            _norm(getattr(scheme, "ministry", "")),
            _norm(getattr(scheme, "sector", "")),
        ]
    )

    if any(token in haystack for token in ["bank", "loan", "credit", "insurance premium"]):
        return "bank"
    if any(token in haystack for token in ["panchayat", "ward", "rural office", "gram"]):
        return "gram_panchayat"
    if any(token in haystack for token in ["certificate", "department", "collector", "tehsildar"]):
        return "department"
    if any(token in haystack for token in ["offline", "csc", "common service center"]):
        return "csc"

    return "online"


def get_ministry_helpline(ministry: str | None) -> str:
    name = str(ministry or "").strip()
    return MINISTRY_HELPLINES.get(name, "1800-11-0001")
