# Explainable AI for Welfare Scheme Eligibility

## Research Contribution

This system implements **deterministic, template-based explainability** for welfare scheme eligibility decisions. This is the core contribution for IEEE research publication.

### Key Features

1. **Zero LLM Calls**: All explanations are generated using pure template logic
2. **Multilingual Support**: English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali
3. **Four Explanation Types**:
   - Verdict (one-sentence decision)
   - Reasoning Chain (step-by-step rule evaluation)
   - Improvement Suggestions (actionable next steps)
   - Priority Explanation (why this scheme matters for the user)

---

## Architecture

### 1. OCR Pipeline (`app/utils/ocr_processor.py`)

Complete document intelligence pipeline for extracting structured data from government documents.

#### Functions

**`preprocess_image(image_bytes: bytes) -> np.ndarray`**
- Opens image with PIL, converts to RGB
- Converts to cv2 format (BGR)
- Applies: grayscale → medianBlur(3) → OTSU threshold
- Returns binary image for OCR

**`detect_document_type(text: str) -> str`**
- Detects document type using regex patterns
- Supported types:
  - `aadhaar`: 12-digit pattern or "uidai"/"aadhaar" keywords
  - `pan`: [A-Z]{5}[0-9]{4}[A-Z] pattern or "permanent account"
  - `income_cert`: "income certificate" or "annual income" or "tehsildar"
  - `caste_cert`: "caste certificate" or "scheduled caste" or "OBC"
  - `ration_card`: "ration card" or "NFSA" or "BPL"
  - `unknown`: No match

**`extract_fields(text: str, doc_type: str) -> dict`**
- Extracts fields using regex patterns specific to document type
- Common fields (all documents):
  - `name`: After "NAME:" or "नाम:" (3-50 chars)
  - `dob`: DD/MM/YYYY format
  - `gender`: Male/Female/पुरुष/महिला
- Aadhaar-specific:
  - `aadhaar_number`: 4-space-4-space-4 digit pattern
  - `address`: After "ADDRESS:" until PIN code
- Income certificate-specific:
  - `income_amount`: ₹ or Rs followed by digits
  - `financial_year`: YYYY-YYYY pattern
  - `issuing_authority`: After "Issued by:"
- Caste certificate-specific:
  - `caste_category`: SC/ST/OBC/General
  - `certificate_number`: Alphanumeric after "Cert No:"

**`calculate_confidence(extracted: dict, doc_type: str) -> float`**
- Calculates confidence score (0-100)
- Score = (non-None fields / expected fields for doc type) × 100

**`process_document(image_bytes: bytes, tesseract_cmd: Optional[str]) -> dict`**
- Full pipeline: preprocess → OCR → detect → extract → score
- Returns:
  ```json
  {
    "document_type": "aadhaar",
    "extracted_fields": {...},
    "confidence_score": 85.5,
    "raw_text": "...",
    "auto_fill": {
      "name": "John Doe",
      "age": 35,
      "gender": "Male",
      "annual_income": 500000.0,
      "caste": "General",
      "bpl": false,
      "aadhaar_number": "123456789012"
    }
  }
  ```

#### Configuration

Set tesseract path in `.env`:
```
TESSERACT_CMD=/usr/bin/tesseract
```

#### Dependencies
```
pytesseract
opencv-python
pillow
numpy
```

---

### 2. Explainability Engine (`app/engine/explainer.py`)

Generates deterministic, human-readable explanations for eligibility decisions.

#### Class: `ExplainabilityEngine`

**`generate_explanation(scheme_name, profile, engine_result, language="en", benefit_amount=None) -> dict`**

Generates comprehensive explanation with 4 components:

##### 1. Verdict (One Sentence)
- **Eligible**: "You qualify for {scheme_name} based on {N} matching criteria."
- **Not Eligible**: "You do not qualify for {scheme_name} because {top_reason}."
- **Partial**: "You may qualify for {scheme_name} if {missing_condition}."

##### 2. Reasoning Chain (Ordered Steps)
Shows each rule check as a step:
```
Step 1: Age check → Your age 35 meets the minimum requirement of 18 ✓
Step 2: Income check → Your income ₹1,20,000 is within limit of ₹1,50,000 ✓
Step 3: Gender check → This scheme requires Female, you are Male ✗
```

##### 3. Improvement Suggestion
- **1 rule failed**: "You meet all other criteria. This scheme requires {field}={required}."
- **2 rules failed**: "To become eligible, you need: {condition1} AND {condition2}."
- **>2 rules failed**: "This scheme may not be suitable for your profile."

##### 4. Priority Explanation
- **HIGH** (confidence > 80%): "This scheme is HIGH priority for you because it provides ₹X benefit and you meet {N}/{total} eligibility criteria."
- **MEDIUM** (confidence > 50%): "This scheme is MEDIUM priority. You meet {N}/{total} criteria. Review the requirements to improve eligibility."
- **LOW** (confidence ≤ 50%): "This scheme is LOW priority for your profile. Consider other schemes with better alignment."

#### Supported Languages

- `en`: English
- `hi`: Hindi (हिंदी)
- `te`: Telugu (తెలుగు)
- `ta`: Tamil (தமிழ்)
- `kn`: Kannada (ಕನ್ನಡ)
- `mr`: Marathi (मराठी)
- `bn`: Bengali (বাংলা)

#### Example Usage

```python
from app.engine.explainer import ExplainabilityEngine
from app.services.eligibility_engine import check_eligibility

# Get eligibility result
engine_result = check_eligibility(profile, scheme_rules)

# Generate explanation
explainer = ExplainabilityEngine()
explanation = explainer.generate_explanation(
    scheme_name="PM-KISAN",
    profile=profile,
    engine_result=engine_result,
    language="hi",
    benefit_amount=6000.0
)

print(explanation["verdict"])
print("\n".join(explanation["reasoning_chain"]))
print(explanation["improvement_suggestion"])
print(explanation["priority_explanation"])
```

#### Return Format

```json
{
  "verdict": "आप 3 मेल खाने वाले मानदंडों के आधार पर PM-KISAN के लिए योग्य हैं।",
  "reasoning_chain": [
    "चरण 1: किसान जांच → आप किसान हैं ✓",
    "चरण 2: भूमि जांच → आपके पास 2.5 एकड़ भूमि है ✓",
    "चरण 3: आय जांच → आपकी वार्षिक आय ₹1,50,000 है ✓"
  ],
  "improvement_suggestion": "",
  "priority": "high",
  "priority_explanation": "यह योजना आपके लिए उच्च प्राथमिकता है क्योंकि यह ₹6000 लाभ प्रदान करता है और आप 3/3 पात्रता मानदंड पूरे करते हैं।",
  "language": "hi"
}
```

---

## API Endpoints

### 1. Document Extraction

**POST `/api/v1/documents/extract`**

Extract fields from uploaded document using OCR.

**Request:**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}

file: <image file>
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
  "saved_document_id": "uuid"
}
```

### 2. Full Analysis Pipeline

**POST `/api/v1/agents/analyze`**

Full pipeline: profile validation → OCR → scheme discovery → explanations.

**Request:**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}

full_name: John Doe
age: 35
state: Telangana
annual_income: 500000
documents: <file1>, <file2>
```

**Response:**
```json
{
  "pipeline": "full",
  "profile_validation": {
    "completeness_score": 0.85,
    "missing_fields": ["occupation"],
    "age_group": "adult",
    "income_category": "middle",
    "land_category": null
  },
  "documents_processed": 2,
  "ocr_results": [...],
  "merged_profile": {...},
  "scheme_discovery": {
    "total_schemes_checked": 150,
    "eligible_count": 12,
    "partial_count": 8,
    "not_eligible_count": 130
  },
  "top_eligible_schemes": [
    {
      "scheme_id": "...",
      "scheme_name": "PM-KISAN",
      "priority": "high",
      "explanation": "...",
      "improvement_tip": null,
      "confidence_score": 95,
      "eligible": true
    }
  ]
}
```

### 3. Quick Analysis

**POST `/api/v1/agents/quick`**

Quick pipeline: profile validation → scheme discovery (no OCR).

**Request:**
```json
{
  "full_name": "John Doe",
  "age": 35,
  "state": "Telangana",
  "annual_income": 500000
}
```

**Response:** Same as full pipeline but without OCR results.

---

## Research Paper Contribution

### Explainability Framework

This system demonstrates:

1. **Deterministic Reasoning**: All decisions are reproducible and auditable
2. **Transparent Logic**: Users see exactly which criteria they meet/fail
3. **Actionable Feedback**: Specific suggestions for improving eligibility
4. **Multilingual Accessibility**: Explanations in 7 Indian languages
5. **No Black Box**: Zero LLM calls, pure template-based logic

### Evaluation Metrics

- **Explanation Clarity**: Measured by user comprehension tests
- **Actionability**: Percentage of users who take suggested actions
- **Fairness**: Consistency of explanations across similar profiles
- **Accessibility**: Language coverage and readability scores

---

## Testing

### Test OCR Pipeline

```python
from app.utils.ocr_processor import process_document

with open("aadhaar.jpg", "rb") as f:
    result = process_document(f.read())
    print(f"Document Type: {result['document_type']}")
    print(f"Confidence: {result['confidence_score']}")
    print(f"Extracted: {result['extracted_fields']}")
```

### Test Explainability Engine

```python
from app.engine.explainer import ExplainabilityEngine
from app.services.eligibility_engine import check_eligibility

profile = {"age": 35, "annual_income": 500000, "state": "Telangana"}
rules = {"age_min": 18, "age_max": 60, "income_max": 1000000}

engine_result = check_eligibility(profile, rules)
explainer = ExplainabilityEngine()

for lang in ["en", "hi", "te", "ta", "kn", "mr", "bn"]:
    explanation = explainer.generate_explanation(
        "Test Scheme",
        profile,
        engine_result,
        language=lang
    )
    print(f"\n{lang.upper()}:")
    print(explanation["verdict"])
```

---

## Performance Considerations

- **OCR Processing**: ~2-5 seconds per document (depends on image quality)
- **Explanation Generation**: <100ms (pure template logic)
- **Full Pipeline**: ~5-10 seconds (OCR + eligibility checks + explanations)

---

## Future Enhancements

1. **Confidence Calibration**: Learn from user feedback to improve confidence scores
2. **Personalized Suggestions**: Tailor improvement tips based on user profile
3. **Multi-Document Fusion**: Combine data from multiple documents intelligently
4. **Handwriting Recognition**: Extend OCR to handle handwritten documents
5. **Document Verification**: Add document authenticity checks

---

## References

- Tesseract OCR: https://github.com/UB-Mannheim/tesseract/wiki
- OpenCV Documentation: https://docs.opencv.org/
- Explainable AI: https://arxiv.org/abs/1901.04592
