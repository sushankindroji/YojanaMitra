"""Profile completeness and field-alias helpers."""
from __future__ import annotations

from typing import Any, Dict, List, Tuple


# Fields used for a user-specific completeness score.
COMPLETENESS_FIELDS: List[str] = [
    "full_name",
    "dob",
    "age",
    "gender",
    "state",
    "district",
    "pincode",
    "aadhaar_verified",
    "aadhaar_last4",
    "annual_income",
    "occupation",
    "caste_category",
    "bpl_status",
    "has_bank_account",
    "mobile_number",
    "land_area_acres",
    "education_level",
    "family_size",
    "is_household_head",
    "is_woman_headed_household",
]

FIELD_LABELS: Dict[str, str] = {
    "full_name": "Full name",
    "dob": "Date of birth",
    "age": "Age",
    "gender": "Gender",
    "state": "State",
    "district": "District",
    "pincode": "Pincode",
    "aadhaar_verified": "Aadhaar verification",
    "aadhaar_last4": "Aadhaar number",
    "annual_income": "Annual income",
    "occupation": "Occupation",
    "caste_category": "Caste category",
    "bpl_status": "BPL status",
    "has_bank_account": "Bank account",
    "mobile_number": "Mobile number",
    "land_area_acres": "Land area",
    "education_level": "Education level",
    "family_size": "Family size",
    "is_household_head": "Household head status",
    "is_woman_headed_household": "Woman-headed household status",
}

BOOL_ZERO_IS_VALID_IF_ONBOARDING_DONE = {
    "is_household_head",
    "is_woman_headed_household",
    "has_bank_account",
    "bpl_status",
}


def _is_non_empty(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (int, float)):
        return True
    return bool(value)


def sync_profile_aliases(profile: Any) -> None:
    """Keep legacy and new profile fields in sync for backward compatibility."""
    # Category aliases
    caste_category = getattr(profile, "caste_category", None)
    social_category = getattr(profile, "social_category", None)
    if caste_category:
        profile.social_category = str(caste_category).lower()
    elif social_category:
        profile.caste_category = str(social_category).upper() if len(str(social_category)) <= 4 else str(social_category)

    # BPL aliases
    bpl_status = getattr(profile, "bpl_status", None)
    is_bpl = getattr(profile, "is_bpl", None)
    if bpl_status is not None:
        profile.is_bpl = int(bpl_status or 0)
    elif is_bpl is not None:
        profile.bpl_status = int(is_bpl or 0)

    # Land aliases
    land_area = getattr(profile, "land_area_acres", None)
    land_holding = getattr(profile, "land_holding_acres", None)
    if land_area is not None:
        profile.land_holding_acres = land_area
    elif land_holding is not None:
        profile.land_area_acres = land_holding

    # Disability aliases
    disability_percentage = getattr(profile, "disability_percentage", None)
    disability_pct = getattr(profile, "disability_pct", None)
    if disability_percentage is not None:
        profile.disability_pct = disability_percentage
    elif disability_pct is not None:
        profile.disability_percentage = disability_pct

    # Banking aliases
    has_bank_account = getattr(profile, "has_bank_account", None)
    bank_account_linked = getattr(profile, "bank_account_linked", None)
    if has_bank_account is not None:
        profile.bank_account_linked = int(has_bank_account or 0)
    elif bank_account_linked is not None:
        profile.has_bank_account = int(bank_account_linked or 0)

    # Women-headed aliases
    woman_headed = getattr(profile, "is_woman_headed_household", None)
    is_woman_headed = getattr(profile, "is_woman_headed", None)
    if woman_headed is not None:
        profile.is_woman_headed = int(woman_headed or 0)
    elif is_woman_headed is not None:
        profile.is_woman_headed_household = int(is_woman_headed or 0)


def calculate_profile_completeness(profile: Any) -> Tuple[int, List[str], int, int]:
    """Return (percentage, missing_labels, filled_count, total_count)."""
    sync_profile_aliases(profile)

    total = len(COMPLETENESS_FIELDS)
    filled = 0
    missing_labels: List[str] = []

    for field_name in COMPLETENESS_FIELDS:
        value = getattr(profile, field_name, None)

        if field_name == "aadhaar_verified":
            is_filled = int(value or 0) == 1
        elif field_name in BOOL_ZERO_IS_VALID_IF_ONBOARDING_DONE:
            onboarding_step = int(getattr(profile, "onboarding_step", 1) or 1)
            is_filled = _is_non_empty(value) and (int(value or 0) == 1 or onboarding_step >= 4)
        else:
            is_filled = _is_non_empty(value)

        if is_filled:
            filled += 1
        else:
            missing_labels.append(FIELD_LABELS.get(field_name, field_name.replace("_", " ").title()))

    percentage = int((filled / total) * 100) if total else 0
    return percentage, missing_labels, filled, total


def update_profile_completeness(profile: Any) -> int:
    """Calculate and assign profile completeness percentage."""
    percentage, _, _, _ = calculate_profile_completeness(profile)
    profile.profile_complete_pct = percentage
    return percentage
