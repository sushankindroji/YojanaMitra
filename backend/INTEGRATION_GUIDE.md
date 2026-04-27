# Integration Guide: Explainability System

## Quick Start

### 1. Install Dependencies

```bash
pip install pytesseract opencv-python pillow numpy
```

### 2. Install Tesseract OCR

**Ubuntu/Debian:**
```bash
sudo apt-get install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

**Windows:**
Download from: https://github.com/UB-Mannheim/tesseract/wiki

### 3. Configure .env

```env
# Tesseract path
TESSERACT_CMD=/usr/bin/tesseract

# Or on Windows:
# TESSERACT_CMD=C:\\Program Files\\Tesseract-OCR\\tesseract.exe
```

### 4. Start Backend

```bash
cd backend
python -m uvicorn app.main:app --reload
```

---

## API Usage Examples

### Example 1: Extract Document Fields

```bash
curl -X POST "http://localhost:8000/api/v1/documents/extract" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@aadhaar.jpg"
```

**Response:**
```json
{
  "document_type": "aadhaar",
  "extracted_fields": {
    "name": "John Doe",
    "dob": "15/06/1988",
    "gender": "Male",
    "aadhaar_number": "123456789012",
    "address": "123 Main St, City"
  },
  "confidence_score": 92.5,
  "raw_text": "...",
  "auto_fill": {
    "name": "John Doe",
    "age": 35,
    "gender": "Male",
    "annual_income": null,
    "caste": null,
    "bpl": false,
    "aadhaar_number": "123456789012"
  },
  "saved_document_id": "uuid-here"
}
```

### Example 2: Full Analysis Pipeline

```bash
curl -X POST "http://localhost:8000/api/v1/agents/analyze" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "full_name=John Doe" \
  -F "age=35" \
  -F "state=Telangana" \
  -F "annual_income=500000" \
  -F "is_farmer=1" \
  -F "land_area_acres=2.5" \
  -F "documents=@aadhaar.jpg" \
  -F "documents=@income_cert.jpg"
```

**Response:**
```json
{
  "pipeline": "full",
  "profile_validation": {
    "completeness_score": 0.95,
    "missing_fields": [],
    "age_group": "adult",
    "income_category": "middle",
    "land_category": "small"
  },
  "documents_processed": 2,
  "ocr_results": [
    {
      "document_type": "aadhaar",
      "extracted_fields": {...},
      "confidence_score": 92.5,
      "raw_text": "..."
    },
    {
      "document_type": "income_cert",
      "extracted_fields": {...},
      "confidence_score": 85.0,
      "raw_text": "..."
    }
  ],
  "merged_profile": {...},
  "scheme_discovery": {
    "total_schemes_checked": 150,
    "eligible_count": 12,
    "partial_count": 8,
    "not_eligible_count": 130
  },
  "top_eligible_schemes": [
    {
      "scheme_id": "pm-kisan",
      "scheme_name": "PM-KISAN Yojana",
      "priority": "high",
      "explanation": "You qualify for PM-KISAN Yojana based on 5 matching criteria.",
      "reasoning_chain": [
        "Step 1: Age check → Your age 35 meets the minimum requirement of 18 ✓",
        "Step 2: Farmer check → You are a farmer ✓",
        "Step 3: Land check → Your land 2.5 acres meets minimum 0.5 ✓",
        "Step 4: State check → Telangana is eligible ✓",
        "Step 5: Income check → Your income is within limit ✓"
      ],
      "improvement_suggestion": "",
      "priority_explanation": "This scheme is HIGH priority for you because it provides ₹6000 benefit and you meet 5/5 eligibility criteria.",
      "confidence_score": 100,
      "eligible": true
    }
  ]
}
```

### Example 3: Quick Analysis (No OCR)

```bash
curl -X POST "http://localhost:8000/api/v1/agents/quick" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "age": 35,
    "state": "Telangana",
    "annual_income": 500000,
    "is_farmer": 1,
    "land_area_acres": 2.5
  }'
```

**Response:** Same as full pipeline but without OCR results (faster)

---

## Python Integration

### Use OCR Processor Directly

```python
from app.utils.ocr_processor import process_document

# Read image
with open("aadhaar.jpg", "rb") as f:
    image_bytes = f.read()

# Process
result = process_document(image_bytes, tesseract_cmd="/usr/bin/tesseract")

# Access results
print(f"Document Type: {result['document_type']}")
print(f"Confidence: {result['confidence_score']}")
print(f"Name: {result['auto_fill']['name']}")
print(f"Age: {result['auto_fill']['age']}")
```

### Use Explainability Engine Directly

```python
from app.engine.explainer import ExplainabilityEngine
from app.services.eligibility_engine import check_eligibility

# Profile and rules
profile = {
    "age": 35,
    "annual_income": 500000,
    "state": "Telangana",
    "is_farmer": True,
    "land_area_acres": 2.5,
}

rules = {
    "age_min": 18,
    "age_max": 60,
    "income_max": 1000000,
    "is_farmer": True,
    "land_area_min": 0.5,
    "state": "Telangana",
}

# Get eligibility
engine_result = check_eligibility(profile, rules)

# Generate explanation
explainer = ExplainabilityEngine()
explanation = explainer.generate_explanation(
    scheme_name="PM-KISAN Yojana",
    profile=profile,
    engine_result=engine_result,
    language="hi",  # Hindi
    benefit_amount=6000.0,
)

# Print results
print(explanation["verdict"])
print("\n".join(explanation["reasoning_chain"]))
print(explanation["improvement_suggestion"])
print(explanation["priority_explanation"])
```

### Batch Processing Multiple Documents

```python
from app.utils.ocr_processor import process_document
import os

documents_dir = "documents/"
results = []

for filename in os.listdir(documents_dir):
    if filename.endswith((".jpg", ".png")):
        filepath = os.path.join(documents_dir, filename)
        
        with open(filepath, "rb") as f:
            result = process_document(f.read())
            results.append({
                "filename": filename,
                "type": result["document_type"],
                "confidence": result["confidence_score"],
                "fields": result["extracted_fields"],
            })

# Print summary
for r in results:
    print(f"{r['filename']}: {r['type']} ({r['confidence']}%)")
```

---

## Frontend Integration

### React Component Example

```jsx
import React, { useState } from 'react';

function DocumentExtractor() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    setLoading(true);
    try {
      const response = await fetch('/api/v1/documents/extract', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} accept="image/*" />
      
      {loading && <p>Processing...</p>}
      
      {result && (
        <div>
          <h3>Document Type: {result.document_type}</h3>
          <p>Confidence: {result.confidence_score}%</p>
          
          <h4>Extracted Fields:</h4>
          <ul>
            {Object.entries(result.extracted_fields).map(([key, value]) => (
              <li key={key}>{key}: {value}</li>
            ))}
          </ul>
          
          <h4>Auto-Fill Suggestions:</h4>
          <pre>{JSON.stringify(result.auto_fill, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default DocumentExtractor;
```

---

## Database Schema

### Documents Table

```sql
CREATE TABLE documents (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  document_type VARCHAR,
  extracted_fields JSONB,
  confidence_score FLOAT,
  raw_text TEXT,
  file_name VARCHAR,
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(document_type);
```

---

## Troubleshooting

### Issue: Tesseract not found

**Solution:**
```bash
# Check installation
which tesseract

# Update .env with correct path
TESSERACT_CMD=/path/to/tesseract
```

### Issue: Low OCR confidence

**Solutions:**
1. Improve image quality (better lighting, focus)
2. Ensure document is fully visible
3. Try different image formats (PNG vs JPEG)
4. Check document type detection

### Issue: Slow OCR processing

**Solutions:**
1. Reduce image resolution before processing
2. Use quick pipeline (no OCR) when possible
3. Implement caching for repeated documents
4. Consider async processing for batch jobs

### Issue: Explanation not in expected language

**Solution:**
```python
# Ensure language code is valid
valid_languages = ["en", "hi", "te", "ta", "kn", "mr", "bn"]
language = "hi" if language in valid_languages else "en"
```

---

## Performance Optimization

### Caching

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_process_document(image_hash: str):
    # Cache OCR results by image hash
    pass
```

### Async Processing

```python
from fastapi import BackgroundTasks

@app.post("/documents/extract-async")
async def extract_async(
    file: UploadFile,
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(process_document, file)
    return {"status": "processing"}
```

### Batch Processing

```python
from concurrent.futures import ThreadPoolExecutor

def process_batch(documents: List[bytes]):
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(process_document, documents))
    return results
```

---

## Monitoring & Logging

### Add Logging

```python
import logging

logger = logging.getLogger(__name__)

def process_document(image_bytes):
    logger.info(f"Processing document: {len(image_bytes)} bytes")
    try:
        result = process_document(image_bytes)
        logger.info(f"Success: {result['document_type']} ({result['confidence_score']}%)")
        return result
    except Exception as e:
        logger.error(f"Failed: {str(e)}")
        raise
```

### Metrics

```python
from prometheus_client import Counter, Histogram

ocr_processed = Counter('ocr_documents_processed', 'Total documents processed')
ocr_confidence = Histogram('ocr_confidence_score', 'OCR confidence scores')

def process_document(image_bytes):
    result = process_document(image_bytes)
    ocr_processed.inc()
    ocr_confidence.observe(result['confidence_score'])
    return result
```

---

## Testing Checklist

- [ ] OCR pipeline processes all document types
- [ ] Confidence scores are accurate
- [ ] Extracted fields are correct
- [ ] Explanations generated in all languages
- [ ] API endpoints return correct responses
- [ ] Database saves documents correctly
- [ ] Performance meets requirements (<5s for OCR)
- [ ] Error handling works properly
- [ ] Multilingual text displays correctly

---

## Deployment

### Docker

```dockerfile
FROM python:3.10

RUN apt-get update && apt-get install -y tesseract-ocr

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

```env
# Production
TESSERACT_CMD=/usr/bin/tesseract
OCR_ENABLED=true
EXPLAINABILITY_LANGUAGE=en
DATABASE_URL=postgresql://user:pass@host/db
SECRET_KEY=your-secret-key
```

---

## Support & Documentation

- **Technical Guide**: `EXPLAINABILITY_GUIDE.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Test Suite**: `test_explainability.py`
- **API Docs**: `http://localhost:8000/docs` (Swagger UI)

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure Tesseract
3. ✅ Set up .env
4. ✅ Start backend
5. ✅ Test endpoints
6. ✅ Integrate with frontend
7. ✅ Deploy to production

---

## Questions?

Refer to the comprehensive documentation in:
- `EXPLAINABILITY_GUIDE.md` - Complete technical reference
- `IMPLEMENTATION_SUMMARY.md` - Architecture and design
- Code comments - Inline documentation
