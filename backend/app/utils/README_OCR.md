# OCR Processor Documentation

Complete OCR pipeline for document intelligence in the YojanaMitra welfare scheme system.

## Overview

The `ocr_processor.py` module provides a complete pipeline for extracting structured data from Indian government documents using OCR (Optical Character Recognition).

## Dependencies

```bash
pip install pytesseract opencv-python pillow numpy
```

### Tesseract Installation

**Windows:**
```bash
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
# Install to: C:\Program Files\Tesseract-OCR\
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-hin
```

**macOS:**
```bash
brew install tesseract tesseract-lang
```

## Configuration

Set in `.env`:
```env
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe  # Windows
TESSERACT_PATH=/usr/bin/tesseract  # Linux/Mac
TESSERACT_LANGS=eng+hin
```

## Functions

### `preprocess_image(image_bytes: bytes) -> np.ndarray`

Preprocesses image for optimal OCR results.

**Steps:**
1. Open with PIL, convert to RGB
2. Convert to cv2 format (numpy array)
3. Apply grayscale conversion
4. Apply median blur (kernel size 3) to reduce noise
5. Apply OTSU threshold for binarization

**Returns:** Preprocessed numpy array ready for OCR.

---

### `detect_document_type(text: str) -> str`

Detects document type from OCR text using regex patterns.

**Supported Types:**
- `aadhaar`: 12-digit number OR "uidai" OR "aadhaar"
- `pan`: Pattern `[A-Z]{5}[0-9]{4}[A-Z]` OR "permanent account"
- `income_cert`: "income certificate" OR "annual income" + "tehsildar"
- `caste_cert`: "caste certificate" OR "scheduled caste" OR "OBC"
- `ration_card`: "ration card" OR "NFSA" OR "BPL"
- `unknown`: None matched

**Returns:** Document type string.

---

### `extract_fields(text: str, doc_type: str) -> dict`

Extracts structured fields from OCR text based on document type.

**Common Fields (all documents):**
- `name`: After "NAME:" or "नाम:" (3-50 chars)
- `dob`: DD/MM/YYYY format
- `gender`: Male/Female/पुरुष/महिला

**Aadhaar Specific:**
- `aadhaar_number`: 4-space-4-space-4 digit pattern
- `address`: After "ADDRESS:" until PIN code

**Income Certificate Specific:**
- `income_amount`: ₹ or Rs followed by digits with commas
- `financial_year`: YYYY-YYYY pattern
- `issuing_authority`: After "Issued by:"

**Caste Certificate Specific:**
- `caste_category`: SC/ST/OBC/General
- `certificate_number`: Alphanumeric after "Cert No:"

**Ration Card Specific:**
- `ration_card_number`: After "Card No:"
- `card_type`: BPL/APL/AAY/Antyodaya

**Returns:** Dict with extracted fields (None if not found).

---

### `calculate_confidence(extracted: dict, doc_type: str) -> float`

Calculates confidence score based on extracted fields.

**Formula:** `(non-None fields / total expected fields) * 100`

**Expected Fields by Type:**
- Aadhaar: 5 fields (name, dob, gender, aadhaar_number, address)
- PAN: 3 fields (name, dob, pan_number)
- Income Cert: 4 fields (name, income_amount, financial_year, issuing_authority)
- Caste Cert: 3 fields (name, caste_category, certificate_number)
- Ration Card: 3 fields (name, ration_card_number, card_type)
- Unknown: 3 fields (name, dob, gender)

**Returns:** Confidence score (0-100).

---

### `process_document(image_bytes: bytes) -> dict`

Full OCR pipeline: preprocess → OCR → detect → extract → score.

**Pipeline Steps:**
1. Preprocess image
2. Run Tesseract OCR
3. Detect document type
4. Extract fields based on type
5. Calculate confidence score
6. Build auto_fill dict for profile

**Returns:**
```python
{
    "document_type": str,
    "extracted_fields": dict,
    "confidence_score": float,
    "raw_text": str,
    "auto_fill": {
        "name": str,
        "age": int,  # calculated from DOB
        "gender": str,
        "annual_income": float,
        "caste": str,
        "bpl": bool,
        "aadhaar_number": str
    }
}
```

## FastAPI Endpoint

### `POST /api/v1/documents/extract`

Extracts structured fields from document image using OCR.

**Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/documents/extract" \
  -H "Authorization: Bearer <token>" \
  -F "file=@aadhaar.jpg" \
  -F "save_to_db=true"
```

**Parameters:**
- `file`: Image file upload (JPEG/PNG) - **Required**
- `save_to_db`: Whether to save document to database (default: true)

**Response:**
```json
{
  "document_type": "aadhaar",
  "extracted_fields": {
    "name": "Rajesh Kumar",
    "dob": "15/08/1985",
    "gender": "Male",
    "aadhaar_number": "123456789012",
    "address": "123 Main Street, Delhi"
  },
  "confidence_score": 100.0,
  "raw_text": "...",
  "auto_fill": {
    "name": "Rajesh Kumar",
    "age": 38,
    "gender": "male",
    "annual_income": null,
    "caste": null,
    "bpl": false,
    "aadhaar_number": "123456789012"
  },
  "doc_id": "uuid-here",
  "saved": true
}
```

**Features:**
- Validates file upload (max 10MB)
- Runs complete OCR pipeline
- Optionally saves to `documents` table
- Auto-fills user profile with extracted data
- Returns extraction results immediately

## Usage Examples

### Python Usage

```python
from app.utils.ocr_processor import process_document

# Read image file
with open("aadhaar.jpg", "rb") as f:
    image_bytes = f.read()

# Process document
result = process_document(image_bytes)

print(f"Document Type: {result['document_type']}")
print(f"Confidence: {result['confidence_score']}%")
print(f"Extracted Fields: {result['extracted_fields']}")
print(f"Auto-fill Data: {result['auto_fill']}")
```

### API Usage

```python
import requests

url = "http://localhost:8000/api/v1/documents/extract"
headers = {"Authorization": "Bearer YOUR_TOKEN"}

with open("income_certificate.jpg", "rb") as f:
    files = {"file": f}
    data = {"save_to_db": "true"}
    response = requests.post(url, headers=headers, files=files, data=data)

result = response.json()
print(f"Extracted income: {result['auto_fill']['annual_income']}")
```

## Testing

Run unit tests:
```bash
cd backend
python test_ocr_processor.py
```

## Error Handling

The processor handles errors gracefully:

```python
result = process_document(image_bytes)

if "error" in result:
    print(f"OCR failed: {result['error']}")
    print(f"Confidence: {result['confidence_score']}")  # Will be 0.0
else:
    print(f"Success! Confidence: {result['confidence_score']}%")
```

## Performance

- **Average processing time:** 1-3 seconds per document
- **Supported formats:** JPEG, PNG
- **Max file size:** 10MB (configurable)
- **Languages:** English + Hindi (configurable via `TESSERACT_LANGS`)

## Accuracy Tips

For best OCR results:
1. Use high-resolution images (300+ DPI)
2. Ensure good lighting and contrast
3. Avoid skewed or rotated images
4. Use clear, unfolded documents
5. Remove shadows and glare

## Database Integration

When `save_to_db=true`, the endpoint:
1. Encrypts and stores the image file
2. Creates a `Document` record with extracted data
3. Auto-fills the user's `Profile` with missing fields
4. Updates profile completeness score
5. Clears cached eligibility results

## Security

- Files are encrypted at rest using AES-256
- PII is sanitized before storage
- Rate limiting applied (100 requests/hour)
- User authentication required for saving
- Audit logs created for all extractions

## Future Enhancements

- [ ] Multi-page document support
- [ ] Batch processing endpoint
- [ ] LLM fallback for low-confidence extractions
- [ ] Support for more document types (passport, voter ID, etc.)
- [ ] Regional language support (Tamil, Telugu, Bengali, etc.)
- [ ] Document verification against government APIs
