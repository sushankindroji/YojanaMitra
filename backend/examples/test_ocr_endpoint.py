"""Example script to test the OCR extraction endpoint."""
import requests
import sys
import os

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
# Replace with your actual token after logging in
AUTH_TOKEN = "your-jwt-token-here"


def test_extract_endpoint(image_path: str, save_to_db: bool = False):
    """
    Test the /documents/extract endpoint.
    
    Args:
        image_path: Path to image file to process.
        save_to_db: Whether to save to database (requires auth).
    """
    url = f"{API_BASE_URL}/documents/extract"
    
    headers = {}
    if AUTH_TOKEN != "your-jwt-token-here":
        headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
    
    if not os.path.exists(image_path):
        print(f"Error: File not found: {image_path}")
        return
    
    print(f"Processing: {image_path}")
    print(f"Save to DB: {save_to_db}")
    print("-" * 60)
    
    with open(image_path, "rb") as f:
        files = {"file": f}
        data = {"save_to_db": str(save_to_db).lower()}
        
        try:
            response = requests.post(url, headers=headers, files=files, data=data)
            response.raise_for_status()
            
            result = response.json()
            
            print(f"✓ Document Type: {result['document_type']}")
            print(f"✓ Confidence Score: {result['confidence_score']}%")
            print(f"✓ Saved to DB: {result.get('saved', False)}")
            
            if result.get('doc_id'):
                print(f"✓ Document ID: {result['doc_id']}")
            
            print("\nExtracted Fields:")
            for key, value in result['extracted_fields'].items():
                if value:
                    print(f"  - {key}: {value}")
            
            print("\nAuto-fill Data:")
            for key, value in result['auto_fill'].items():
                if value is not None:
                    print(f"  - {key}: {value}")
            
            if result.get('confidence_score', 0) < 60:
                print("\n⚠ Warning: Low confidence score. Manual review recommended.")
            
            print("\n" + "=" * 60)
            print("✓ Extraction completed successfully!")
            print("=" * 60)
            
        except requests.exceptions.HTTPError as e:
            print(f"✗ HTTP Error: {e}")
            print(f"Response: {e.response.text}")
        except Exception as e:
            print(f"✗ Error: {e}")


def create_sample_aadhaar_text_image():
    """Create a sample text-based Aadhaar image for testing."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # Create white background
        img = Image.new('RGB', (800, 500), color='white')
        draw = ImageDraw.Draw(img)
        
        # Add text (simulating Aadhaar card)
        text_lines = [
            "GOVERNMENT OF INDIA",
            "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
            "",
            "NAME: Rajesh Kumar",
            "DOB: 15/08/1985",
            "Gender: Male",
            "",
            "1234 5678 9012",
            "",
            "ADDRESS: 123 Main Street",
            "Delhi, PIN: 110001",
        ]
        
        y = 50
        for line in text_lines:
            draw.text((50, y), line, fill='black')
            y += 35
        
        # Save
        output_path = "sample_aadhaar.jpg"
        img.save(output_path)
        print(f"✓ Created sample image: {output_path}")
        return output_path
        
    except ImportError:
        print("PIL not available. Please provide a real document image.")
        return None


if __name__ == "__main__":
    print("=" * 60)
    print("OCR Extraction Endpoint Test")
    print("=" * 60)
    print()
    
    # Check if image path provided
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        save_to_db = len(sys.argv) > 2 and sys.argv[2].lower() == "true"
    else:
        print("Usage: python test_ocr_endpoint.py <image_path> [save_to_db]")
        print("\nExample:")
        print("  python test_ocr_endpoint.py aadhaar.jpg")
        print("  python test_ocr_endpoint.py income_cert.jpg true")
        print()
        
        # Try to create sample image
        print("No image provided. Creating sample image...")
        image_path = create_sample_aadhaar_text_image()
        if not image_path:
            sys.exit(1)
        save_to_db = False
    
    # Run test
    test_extract_endpoint(image_path, save_to_db)
