import json

# Fix Tamil file
ta_path = 'e:\\sushank-projects\\YojanaMitra\\frontend\\src\\locales\\ta\\translation.json'
with open(ta_path, 'r', encoding='utf-8') as f:
    content = f.read()
    
# Find the correct ending - the last valid JSON structure
pos = content.rfind('}\n}')
if pos == -1:
    pos = content.rfind('}')
    
if pos >= 0:
    # Find the second-to-last closing brace (end of messages section then main)
    parts = content[:pos+1].rsplit('}', 2)
    if len(parts) >= 2:
        fixed = parts[0] + '}\n}'
        with open(ta_path, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f'Fixed Tamil file')

# Fix Telugu file  
te_path = 'e:\\sushank-projects\\YojanaMitra\\frontend\\src\\locales\\te\\translation.json'
try:
    with open(te_path, 'r', encoding='utf-8') as f:
        json.load(f)
    print('Telugu is valid')
except json.JSONDecodeError as e:
    with open(te_path, 'r', encoding='utf-8') as f:
        content = f.read()
    # Find closing braces and truncate to valid JSON
    pos = content.find('"notFound":')
    if pos >= 0:
        end_pos = content.find('}', pos)
        fixed = content[:end_pos+1] + '\n}'
        with open(te_path, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f'Fixed Telugu file')
