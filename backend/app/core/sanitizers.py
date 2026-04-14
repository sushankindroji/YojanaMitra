"""Response sanitizers for sensitive model fields."""


def sanitize_user(user) -> dict:
    """Return safe user payload without credentials or token-like fields."""
    is_admin = bool(getattr(user, "is_admin", False)) or str(getattr(user, "role", "")).lower() == "admin"
    return {
        "id": str(getattr(user, "id", "")),
        "email": getattr(user, "email", None),
        "name": getattr(user, "name", None),
        "role": getattr(user, "role", "user"),
        "is_admin": is_admin,
        "created_at": getattr(user, "created_at", None),
    }


def sanitize_profile(profile) -> dict:
    """Mask sensitive profile identity fields before returning API responses."""
    data = {k: v for k, v in vars(profile).items() if not k.startswith("_")}

    aadhaar_number = str(data.get("aadhaar_number") or "").strip()
    if aadhaar_number:
        suffix = aadhaar_number[-4:] if len(aadhaar_number) >= 4 else aadhaar_number
        data["aadhaar_last4"] = suffix
        data["aadhaar_number"] = None

    pan_number = str(data.get("pan_number") or "").strip()
    if pan_number:
        masked = f"{pan_number[:2]}***{pan_number[-4:]}" if len(pan_number) >= 6 else "***"
        data["pan_number"] = masked

    ration_card_number = str(data.get("ration_card_number") or "").strip()
    if ration_card_number:
        data["ration_card_number"] = f"XXXXXX{ration_card_number[-4:]}"

    account_masked = str(data.get("account_number_masked") or "").strip()
    if account_masked and not account_masked.startswith("XXXX"):
        digits = "".join(ch for ch in account_masked if ch.isdigit())
        if len(digits) >= 4:
            data["account_number_masked"] = f"XXXXXX{digits[-4:]}"

    return data
