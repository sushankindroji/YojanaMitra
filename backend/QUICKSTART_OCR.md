# OCR Quick Start Guide

Get the OCR document extraction working in 5 minutes.

## Step 1: Install Tesseract

### Windows
1. Download: https://github.com/UB-Mannheim/tesseract/wiki
2. Install to: `C:\Program Files\Tesseract-OCR\`
3. Add to PATH or set in `.env`

### Linux
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-hin
```

### macOS
```bash
brew install tesseract tesseract-lang
```

## Step 2: Configure Environment

Add to `backend/.env`:
```env
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
TESSERACT_LANGS=eng+hin
```

## Step 3: Install Python Dependencies

```bash
cd backend
pip install pytesseract opencv-python pillow numpy
```

## Step 4: Test OCR Processor

```bash
python test_ocr_processor.py
```

Expected output:
```
============================================================
OCR Processor Unit Tests
============================================================
Testing document type detection...
✓ Aadhaar detection works
✓ PAN detection works
✓ Income certificate detection works
✓ Caste certificate detection works
✓ Ration card detection works
✓ Unknown document detection works

Testing field extraction...
✓ Aadhaar field extraction works
✓ Income certificate field extraction works
✓ Caste certificate field extraction works

Testing confidence calculation...
✓ Full extraction confidence: 100.0%
✓ Partial extraction confidence: 40.0%
✓ Empty extraction confidence: 0.0%

============================================================
✓ All tests passed!
============================================================
```

## Step 5: Start Backend Server

```bash
cd backend
python run.py
```

## Step 6: Test API Endpoint

### Option A: Using curl
```bash
curl -X POST "http://localhost:8000/api/v1/documents/extract" \
  -F "file=@path/to/document.jpg" \
  -F "save_to_db=false"
```

### Option B: Using Python script
```bash
cd backend/examples
python test_ocr_endpoint.py path/to/document.jpg
```

### Option C: Using Swagger UI
1. Open: http://localhost:8000/docs
2. Find: `POST /api/v1/documents/extract`
3. Click "Try it out"
4. Upload image file
5. Set `save_to_db` to `false`
6. Click "Execute"

## Expected Response

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
  "raw_text": "GOVERNMENT OF INDIA...",
  "auto_fill": {
    "name": "Rajesh Kumar",
    "age": 38,
    "gender": "male",
    "annual_income": null,
    "caste": null,
    "bpl": false,
    "aadhaar_number": "123456789012"
  },
  "saved": false
}
```

## Troubleshooting

### Error: "Tesseract not found"
**Solution**: Set `TESSERACT_PATH` in `.env` to correct location

### Error: "No module named 'pytesseract'"
**Solution**: `pip install pytesseract opencv-python pillow numpy`

### Error: "Could not decode image bytes"
**Solution**: Ensure file is valid JPEG/PNG image

### Low confidence score (<50%)
**Solutions**:
- Use higher resolution image (300+ DPI)
- Ensure good lighting and contrast
- Avoid skewed or rotated images
- Remove shadows and glare

### Hindi text not recognized
**Solution**: 
- Linux: `sudo apt-get install tesseract-ocr-hin`
- Verify: `tesseract --list-langs` shows `hin`

## Next Steps

1. **Read full docs**: `backend/app/utils/README_OCR.md`
2. **Integration guide**: `backend/OCR_IMPLEMENTATION.md`
3. **Test with real documents**: Upload Aadhaar, PAN, certificates
4. **Enable database save**: Set `save_to_db=true` (requires auth)
5. **Monitor logs**: Check `backend/logs/yojanamitra.log`

## Quick Reference

### Supported Document Types
- ✅ Aadhaar Card
- ✅ PAN Card
- ✅ Income Certificate
- ✅ Caste Certificate
- ✅ Ration Card

### API Endpoints
- `POST /api/v1/documents/extract` - Extract fields (new)
- `POST /api/v1/documents/upload` - Upload with async OCR (existing)
- `GET /api/v1/documents` - List documents
- `GET /api/v1/documents/{doc_id}` - Get document details

### Key Files
- `app/utils/ocr_processor.py` - Main OCR module
- `app/routers/documents.py` - API endpoints
- `test_ocr_processor.py` - Unit tests
- `examples/test_ocr_endpoint.py` - API test script

## Performance Tips

1. **Optimize images before upload**:
   - Convert to grayscale
   - Increase contrast
   - Remove noise

2. **Batch processing**:
   - Process multiple documents in parallel
   - Use async/await for I/O operations

3. **Caching**:
   - Cache OCR results for identical documents
   - Store preprocessed images

4. **Rate limiting**:
   - Default: 100 requests/hour
   - Adjust in `app/config.py`

## Support

- 📖 Full docs: `backend/app/utils/README_OCR.md`
- 🧪 Run tests: `python test_ocr_processor.py`
- 🔍 Check logs: `backend/logs/yojanamitra.log`
- 🌐 API docs: http://localhost:8000/docs

---

**Ready to go!** 🚀

Start extracting structured data from documents in seconds.
