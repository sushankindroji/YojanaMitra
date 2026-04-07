"""Backfill missing scheme portal URLs and application modes."""

from __future__ import annotations

from sqlalchemy import func

from app.data.scheme_portals import get_portal_url_for_scheme, infer_application_mode
from app.database import SessionLocal
from app.models import Scheme


def main() -> None:
    db = SessionLocal()
    try:
        total = db.query(func.count(Scheme.id)).scalar() or 0
        url_set_before = (
            db.query(func.count(Scheme.id))
            .filter(Scheme.official_portal_url.isnot(None), func.length(func.trim(Scheme.official_portal_url)) > 0)
            .scalar()
            or 0
        )
        url_missing_before = (
            db.query(func.count(Scheme.id))
            .filter((Scheme.official_portal_url.is_(None)) | (func.length(func.trim(Scheme.official_portal_url)) == 0))
            .scalar()
            or 0
        )
        mode_set_before = (
            db.query(func.count(Scheme.id))
            .filter(Scheme.application_mode.isnot(None), func.length(func.trim(Scheme.application_mode)) > 0)
            .scalar()
            or 0
        )

        print("=== BEFORE BACKFILL ===")
        print(f"Total schemes: {total}")
        print(f"official_portal_url set: {url_set_before}")
        print(f"official_portal_url missing: {url_missing_before}")
        print(f"application_mode set: {mode_set_before}")

        schemes = db.query(Scheme).all()

        updated_url = 0
        updated_mode = 0

        for scheme in schemes:
            current_url = str(scheme.official_portal_url or "").strip()
            current_mode = str(scheme.application_mode or "").strip()

            if not current_url:
                mapped_url = get_portal_url_for_scheme(scheme)
                if mapped_url:
                    scheme.official_portal_url = mapped_url
                    updated_url += 1

            if not current_mode:
                scheme.application_mode = infer_application_mode(scheme)
                updated_mode += 1

        db.commit()

        url_set_after = (
            db.query(func.count(Scheme.id))
            .filter(Scheme.official_portal_url.isnot(None), func.length(func.trim(Scheme.official_portal_url)) > 0)
            .scalar()
            or 0
        )
        url_missing_after = (
            db.query(func.count(Scheme.id))
            .filter((Scheme.official_portal_url.is_(None)) | (func.length(func.trim(Scheme.official_portal_url)) == 0))
            .scalar()
            or 0
        )
        mode_set_after = (
            db.query(func.count(Scheme.id))
            .filter(Scheme.application_mode.isnot(None), func.length(func.trim(Scheme.application_mode)) > 0)
            .scalar()
            or 0
        )

        print("=== BACKFILL UPDATES ===")
        print(f"Rows updated with portal URLs: {updated_url}")
        print(f"Rows updated with application modes: {updated_mode}")

        print("=== AFTER BACKFILL ===")
        print(f"official_portal_url set: {url_set_after}")
        print(f"official_portal_url missing: {url_missing_after}")
        print(f"application_mode set: {mode_set_after}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
