"""In-memory job store for async eligibility runs."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional


JOB_STORE: Dict[str, Dict[str, Any]] = {}
LATEST_JOB_BY_USER: Dict[str, str] = {}


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def create_job(user_id: str, stage: str = "queued") -> str:
    job_id = str(uuid.uuid4())
    JOB_STORE[job_id] = {
        "job_id": job_id,
        "user_id": user_id,
        "status": "running",
        "progress_pct": 0,
        "stage": stage,
        "error": None,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    LATEST_JOB_BY_USER[user_id] = job_id
    return job_id


def update_job(job_id: str, **updates: Any) -> None:
    job = JOB_STORE.get(job_id)
    if not job:
        return
    job.update(updates)
    job["updated_at"] = _now_iso()


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    return JOB_STORE.get(job_id)


def get_latest_job(user_id: str) -> Optional[Dict[str, Any]]:
    job_id = LATEST_JOB_BY_USER.get(user_id)
    if not job_id:
        return None
    return JOB_STORE.get(job_id)
