"""Eligibility router with multi-agent pipeline and backward-compatible endpoints."""

from typing import Any, Dict, List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.agents.agent_orchestrator import get_cached_pipeline_result, run_full_eligibility_pipeline
from app.agents.job_store import create_job, get_job, update_job
from app.rate_limiter import limiter, get_rate_limit
from app.database import SessionLocal
from app.dependencies import get_admin_user, get_current_user, get_db, get_optional_user
from app.models import User


router = APIRouter(prefix="/eligibility", tags=["eligibility"])


async def _run_pipeline_job(job_id: str, user_id: str) -> None:
    db = SessionLocal()
    try:
        def progress_callback(progress_pct: int, stage: str) -> None:
            update_job(job_id, status="running", progress_pct=progress_pct, stage=stage)

        await run_full_eligibility_pipeline(user_id=user_id, db=db, progress_callback=progress_callback)
        update_job(job_id, status="complete", progress_pct=100, stage="complete")
    except Exception as exc:
        db.rollback()
        update_job(job_id, status="failed", error=str(exc), stage="failed")
    finally:
        db.close()


async def _ensure_pipeline_result(user_id: str, db: Session, force: bool = False) -> Dict[str, Any]:
    cached = get_cached_pipeline_result(user_id)
    if cached and not force:
        return cached
    return await run_full_eligibility_pipeline(user_id=user_id, db=db)


def _filter_results(
    results: List[Dict[str, Any]],
    min_score: float = 0.0,
    sector: str | None = None,
    state: str | None = None,
) -> List[Dict[str, Any]]:
    filtered = [r for r in results if float(r.get("match_score", 0) or 0) >= float(min_score)]

    if sector:
        sector_norm = sector.strip().lower()
        filtered = [r for r in filtered if sector_norm in str(r.get("sector") or "").lower()]

    if state:
        state_norm = state.strip().lower()
        filtered = [
            r for r in filtered
            if state_norm in {str(r.get("state") or "").lower(), "central"}
        ]

    filtered.sort(key=lambda item: float(item.get("match_score", 0) or 0), reverse=True)
    return filtered


def _to_compat_result(result: Dict[str, Any]) -> Dict[str, Any]:
    payload = dict(result)
    match_score = float(payload.get("match_score", 0) or 0)
    payload.setdefault("eligibility_score", match_score)
    payload.setdefault("eligibility_percentage", round(match_score * 100, 2))
    payload.setdefault("scheme_id", payload.get("scheme_id") or payload.get("id"))
    return payload


@router.post("/run")
@limiter.limit(get_rate_limit("eligibility_run"))
async def run_eligibility_job(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    job_id = create_job(current_user.id, stage="pipeline_start")
    background_tasks.add_task(_run_pipeline_job, job_id, current_user.id)
    return {"job_id": job_id, "status": "running"}


@router.get("/status/{job_id}")
async def eligibility_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    job = get_job(job_id)
    if not job or job.get("user_id") != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "status": job.get("status", "running"),
        "progress_pct": int(job.get("progress_pct", 0) or 0),
        "stage": job.get("stage"),
        "error": job.get("error"),
    }


@router.get("/results")
async def get_last_results(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = await _ensure_pipeline_result(current_user.id, db)
    return {
        "validation": payload.get("validation", {}),
        "ranked_results": payload.get("ranked_results", {}),
        "computed_at": payload.get("computed_at"),
    }


@router.get("/dashboard")
async def get_dashboard_payload(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = await _ensure_pipeline_result(current_user.id, db)
    return payload.get("dashboard", {})


@router.get("/top/{n}")
async def get_top_n(
    n: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if n < 1 or n > 100:
        raise HTTPException(status_code=400, detail="n must be between 1 and 100")

    payload = await _ensure_pipeline_result(current_user.id, db)
    top_items = payload.get("ranked_results", {}).get("top_10", [])
    if n > len(top_items):
        top_items = payload.get("ranked_results", {}).get("top_50", [])
    return [_to_compat_result(item) for item in top_items[:n]]


@router.get("/scheme/{scheme_code}")
async def get_single_scheme_result(
    scheme_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = await _ensure_pipeline_result(current_user.id, db)

    raw_results = payload.get("raw_results", [])
    for result in raw_results:
        if str(result.get("scheme_code")) == scheme_code:
            return result

    ranked = payload.get("ranked_results", {})
    for bucket in ["top_50", "fully_eligible", "highly_eligible", "partially_eligible", "one_step_away"]:
        for item in ranked.get(bucket, []):
            if str(item.get("scheme_code")) == scheme_code:
                return item

    raise HTTPException(status_code=404, detail="Scheme not found in latest eligibility results")


# ---------------------------------------------------------------------------
# Backward-compatible endpoints currently used by existing frontend
# ---------------------------------------------------------------------------

@router.post("/check")
async def check_all_schemes(
    request: Dict[str, Any] | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    refresh = bool(request.get("refresh", False)) if isinstance(request, dict) else False
    payload = await _ensure_pipeline_result(current_user.id, db, force=refresh)

    raw_results = payload.get("raw_results", [])
    eligible_only = [item for item in raw_results if item.get("is_eligible")]

    eligible_only.sort(key=lambda item: float(item.get("match_score", 0) or 0), reverse=True)

    return {
        "total_schemes": len(raw_results),
        "eligible_count": len(eligible_only),
        "schemes": [_to_compat_result(item) for item in eligible_only[:100]],
    }


@router.get("/schemes")
async def get_eligible_schemes(
    limit: int = Query(50, ge=1, le=500),
    sector: str | None = Query(None),
    state: str | None = Query(None),
    min_score: float = Query(0.3, ge=0.0, le=1.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = await _ensure_pipeline_result(current_user.id, db)
    raw_results = payload.get("raw_results", [])

    filtered = _filter_results(raw_results, min_score=min_score, sector=sector, state=state)

    return {
        "total_schemes": len(raw_results),
        "eligible_count": len([item for item in raw_results if item.get("is_eligible")]),
        "schemes": [_to_compat_result(item) for item in filtered[:limit]],
    }


@router.get("/top")
async def get_top_schemes(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = await _ensure_pipeline_result(current_user.id, db)
    ranked = payload.get("ranked_results", {})
    top = ranked.get("top_10", [])
    if limit > len(top):
        top = ranked.get("top_50", [])
    return [_to_compat_result(item) for item in top[:limit]]


@router.get("/summary")
async def get_eligibility_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = await _ensure_pipeline_result(current_user.id, db)
    ranked = payload.get("ranked_results", {})
    raw = payload.get("raw_results", [])

    return {
        "total_schemes_checked": len(raw),
        "eligible_schemes": len(ranked.get("fully_eligible", [])),
        "partially_eligible": len(ranked.get("partially_eligible", [])),
        "not_eligible": len([item for item in raw if not item.get("is_eligible") and not item.get("is_partially_eligible")]),
        "average_eligibility_score": round(
            sum(float(item.get("match_score", 0) or 0) for item in raw) / max(len(raw), 1),
            4,
        ),
        "top_sectors": ranked.get("sectors_matched", []),
    }


@router.post("/recalculate")
async def recalculate_eligibility(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = await _ensure_pipeline_result(current_user.id, db, force=True)
    raw = payload.get("raw_results", [])

    return {
        "status": "success",
        "schemes_checked": len(raw),
        "eligible_schemes": len([item for item in raw if item.get("is_eligible")]),
        "results_saved": len(raw),
    }
