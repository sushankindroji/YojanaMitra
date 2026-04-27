"""Quick test for OCR processor functionality."""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.utils.ocr_processor import (
    detect_document_type,
    extract_fields,
    calculate_confidence,
)


def test_detect_document_type():
    """Test document type detection."""
    print("Testing document type detection...")
    
    # Test Aadhaar
    aadhaar_text = "UIDAI Government of India 1234 5678 9012"
    assert detect_document_type(aadhaar_text) == "aadhaar"
    print("✓ Aadhaar detection works")
    
    # Test PAN
    pan_text = "Permanent Account Number ABCDE1234F Income Tax Department"
    assert detect_document_type(pan_text) == "pan"
    print("✓ PAN detection works")
    
    # Test Income Certificate
    income_text = "Income Certificate issued by Tehsildar Annual Income Rs. 50000"
    assert detect_document_type(income_text) == "income_cert"
    print("✓ Income certificate detection works")
    
    # Test Caste Certificate
    caste_text = "Caste Certificate Scheduled Caste Government of India"
    assert detect_document_type(caste_text) == "caste_cert"
    print("✓ Caste certificate detection works")
    
    # Test Ration Card
    ration_text = "Ration Card NFSA BPL Card Number 12345"
    assert detect_document_type(ration_text) == "ration_card"
    print("✓ Ration card detection works")
    
    # Test Unknown
    unknown_text = "Some random document text"
    assert detect_document_type(unknown_text) == "unknown"
    print("✓ Unknown document detection works")


def test_extract_fields():
    """Test field extraction."""
    print("\nTesting field extraction...")
    
    # Test Aadhaar extraction
    aadhaar_text = """
    NAME: Rajesh Kumar
    DOB: 15/08/1985
    Gender: Male
    1234 5678 9012
    ADDRESS: 123 Main Street, Delhi PIN: 110001
    """
    fields = extract_fields(aadhaar_text, "aadhaar")
    assert fields["name"] == "Rajesh Kumar"
    assert fields["dob"] == "15/08/1985"
    assert fields["gender"] == "Male"
    assert fields["aadhaar_number"] == "123456789012"
    print("✓ Aadhaar field extraction works")
    
    # Test Income Certificate extraction
    income_text = """
    NAME: Priya Sharma
    Annual Income: Rs. 2,50,000
    Financial Year: 2023-2024
    Issued by: District Collector
    """
    fields = extract_fields(income_text, "income_cert")
    assert fields["name"] == "Priya Sharma"
    assert fields["income_amount"] == "250000"
    assert fields["financial_year"] == "2023-2024"
    assert fields["issuing_authority"] == "District Collector"
    print("✓ Income certificate field extraction works")
    
    # Test Caste Certificate extraction
    caste_text = """
    NAME: Amit Singh
    Caste Category: SC
    Cert No: SC/2023/12345
    """
    fields = extract_fields(caste_text, "caste_cert")
    assert fields["name"] == "Amit Singh"
    assert fields["caste_category"] == "SC"
    assert fields["certificate_number"] == "SC/2023/12345"
    print("✓ Caste certificate field extraction works")


def test_calculate_confidence():
    """Test confidence calculation."""
    print("\nTesting confidence calculation...")
    
    # Full extraction
    full_fields = {
        "name": "Test Name",
        "dob": "01/01/1990",
        "gender": "Male",
        "aadhaar_number": "123456789012",
        "address": "Test Address"
    }
    confidence = calculate_confidence(full_fields, "aadhaar")
    assert confidence == 100.0
    print(f"✓ Full extraction confidence: {confidence}%")
    
    # Partial extraction
    partial_fields = {
        "name": "Test Name",
        "dob": None,
        "gender": "Male",
        "aadhaar_number": None,
        "address": None
    }
    confidence = calculate_confidence(partial_fields, "aadhaar")
    assert confidence == 40.0  # 2 out of 5 fields
    print(f"✓ Partial extraction confidence: {confidence}%")
    
    # Empty extraction
    empty_fields = {}
    confidence = calculate_confidence(empty_fields, "aadhaar")
    assert confidence == 0.0
    print(f"✓ Empty extraction confidence: {confidence}%")


if __name__ == "__main__":
    print("=" * 60)
    print("OCR Processor Unit Tests")
    print("=" * 60)
    
    try:
        test_detect_document_type()
        test_extract_fields()
        test_calculate_confidence()
        
        print("\n" + "=" * 60)
        print("✓ All tests passed!")
        print("=" * 60)
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
