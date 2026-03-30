import json
langs = ['en', 'hi', 'mr', 'ta', 'te', 'kn', 'bn']
for lang in langs:
    try:
        with open(f'frontend/src/locales/{lang}/translation.json', 'r', encoding='utf-8') as f:
            json.load(f)
        print(f'✓ {lang}: Valid JSON')
    except Exception as e:
        print(f'✗ {lang}: {str(e)}')
