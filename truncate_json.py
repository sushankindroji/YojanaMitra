#!/usr/bin/env python3
import os

def truncate_to_valid_json(filepath):
    """Truncate file to the last valid JSON closing brackets"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the position of '}\n}' at the end
    # Or at minimum, find the last two closing braces
    
    # Find all positions of closing braces
    positions = []
    for i, char in enumerate(content):
        if char == '}':
            positions.append(i)
    
    if len(positions) >= 2:
        # Keep only up to the last two closing braces
        last_brace = positions[-1]
        second_last = positions[-2]
        
        # Truncate to second-last brace
        truncated = content[:second_last+1].rstrip() + '\\n}'
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(truncated)
        
        return True
    return False

paths = [
    'e:\\\\sushank-projects\\\\YojanaMitra\\\\frontend\\\\src\\\\locales\\\\ta\\\\translation.json',
    'e:\\\\sushank-projects\\\\Yojanit\\\\frontend\\\\src\\\\locales\\\\te\\\\translation.json'
]

for path in paths:
    if os.path.exists(path):
        if truncate_to_valid_json(path):
            print(f'Fixed: {path}')
        else:
            print(f'Could not fix: {path}')
    else:
        print(f'File not found: {path}')
