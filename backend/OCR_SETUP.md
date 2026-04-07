# OCR Setup and Verification

This project uses a local OCR pipeline with fallback-aware extraction.

## Root Cause Summary (Previous OCR Instability)

1. Single OCR pass often failed on noisy/scanned images.
2. Image preprocessing was too basic for skewed and low-contrast documents.
3. Language/config fallback was limited, causing poor Hindi/English mixed text extraction.
4. Extraction failures returned empty payloads without enough manual review metadata.

## What Is Implemented

1. OpenCV preprocessing (denoise, adaptive threshold, deskew) with Pillow fallback.
2. Multi-pass OCR across language/config candidates.
3. Per-document language preference map.
4. Generic fallback extraction when strict document extractors fail.
5. Manual review metadata in OCR result:
   - `requires_manual_review`
   - `missing_required_fields`
   - `low_confidence_fields`
   - `fallback_used`

## Dependencies

Install backend dependencies:

```powershell
cd backend
pip install -r requirements.txt
```

`requirements.txt` includes:
- `pytesseract`
- `Pillow`
- `pdfplumber`
- `opencv-python-headless`

## Tesseract Installation

### Windows

1. Install Tesseract OCR (UB Mannheim build is commonly used).
2. Ensure executable path exists (default):
   - `C:\Program Files\Tesseract-OCR\tesseract.exe`
3. Install language data files you need (`eng`, `hin`, etc.).

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-eng tesseract-ocr-hin
```

## Environment Variables

Set in `backend/.env`:

```env
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
TESSERACT_LANGS=eng+hin
OCR_CONFIDENCE_THRESHOLD=0.6
```

## Quick Verification

Run this command from `backend` to verify OCR service loads and returns structured output fields:

```powershell
python -c "from app.services.ocr_service import ocr_service; print('OCR_READY', ocr_service.tesseract_available, ocr_service.cv_available)"
```

Expected output shape:

```text
OCR_READY True True
```

To verify extraction end-to-end, upload one sample document via API/UI and confirm response includes:

- `status: completed`
- `data` (non-empty)
- `confidence_scores`
- `requires_manual_review` (boolean)
- `missing_required_fields` (array)

## Troubleshooting

1. `tesseract is not installed or it's not in your PATH`
   - Set `TESSERACT_PATH` correctly in `.env`.
2. `Failed loading language 'hin'`
   - Install `hin.traineddata` and keep `TESSERACT_LANGS=eng+hin`.
3. Very low confidence on clear images
   - Re-check scan quality, rotation, and contrast.
   - Confirm OpenCV dependency is installed and imported.
