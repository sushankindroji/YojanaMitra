#!/usr/bin/env python3
import json

def fix_json_file(filepath):
    """Fix JSON file by finding valid JSON and truncating invalid parts"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Try to find the last valid JSON closing
    # Start from the end and work backwards
    for i in range(len(content)-1, 0, -1):
        test_content = content[:i]
        if test_content.rstrip().endswith('}'):
            try:
                json.loads(test_content)
                # Found valid JSON
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(test_content)
                return True
            except:
                continue
    return False

files = [
    'e:\\\\sushank-projects\\\\YojanaMitra\\\\frontend\\\\src\\\\locales\\\\ta\\\\translation.json',
    'e:\\\\sushank-projects\\\\YojanaMitra\\\\frontend\\\\src\\\\locales\\\\te\\\\translation.json'
]

for fpath in files:
    if fix_json_file(fpath):
        print(f'Fixed {fpath}')
    else:
        print(f'Could not fix {fpath}')
