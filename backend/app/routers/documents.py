"""
Documents router - upload, OCR, extraction, download.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Document
from app.services.storage_service import storage_service
from app.services.ocr_service import ocr_service
from app.schemas.document import DocumentResponse, ExtractionResult
from app.core.audit import log_audit
from datetime import datetime
import json
import uuid

router = APIRouter()

# Max 50MB per file
MAX_FILE_SIZE = 50 * 1024 * 1024


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = None,
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a document and trigger async OCR processing."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files allowed")

    # Read file
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    # Save file (encrypted)
    storage_path = await storage_service.save_file(file_bytes, file.filename, current_user.id)

    # Create document record
    doc = Document(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        doc_type=doc_type or "other",
        file_name=file.filename,
        storage_path=storage_path,
        extraction_status="pending",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Kick off OCR in background (non-blocking)
    if background_tasks:
        background_tasks.add_task(process_ocr, doc.id, file_bytes, db)

    # Log audit
    log_audit(db, "document_upload", "document", doc.id, current_user.id)

    return {
        "doc_id": doc.id,
        "status": "uploading",
        "message": "Document uploaded. Processing OCR...",
        "filename": file.filename,
    }


async def process_ocr(doc_id: str, image_bytes: bytes, db: Session):
    """Background task to process OCR."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return

    try:
        doc.extraction_status = "processing"
        db.commit()

        # Extract structured data
        result = await ocr_service.extract_structured_data(image_bytes, doc.doc_type)

        doc.extracted_data = json.dumps(result.get("data", {}))
        doc.confidence_score = result.get("confidence", 0.0)
        doc.extraction_status = "completed"
        doc.processed_at = datetime.utcnow().isoformat()

        db.commit()
    except Exception as e:
        doc.extraction_status = "failed"
        doc.error_message = str(e)
        doc.retry_count += 1
        db.commit()


@router.get("/")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all documents for current user."""
    documents = db.query(Document).filter(Document.user_id == current_user.id).all()
    return [
        DocumentResponse.from_orm(d).dict() for d in documents
    ]


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get document details."""
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentResponse.from_orm(doc).dict()


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a document."""
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file
    await storage_service.delete_file(doc.storage_path)

    # Delete record
    db.delete(doc)
    db.commit()

    log_audit(db, "document_delete", "document", doc_id, current_user.id)

    return {"message": "Document deleted"}


@router.get("/{doc_id}/download")
async def download_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download decrypted document file."""
    from fastapi.responses import FileResponse

    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_bytes = await storage_service.read_file(doc.storage_path)

    return FileResponse(
        content=file_bytes,
        media_type="application/octet-stream",
        filename=doc.file_name,
    )


@router.post("/{doc_id}/reprocess")
async def reprocess_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reprocess OCR for a document."""
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Read encrypted file
    file_bytes = await storage_service.read_file(doc.storage_path)

    # Reset status
    doc.extraction_status = "pending"
    doc.retry_count += 1
    db.commit()

    # Reprocess
    background_tasks.add_task(process_ocr, doc.id, file_bytes, db)

    return {"message": "Document reprocessing started", "retry_count": doc.retry_count}
