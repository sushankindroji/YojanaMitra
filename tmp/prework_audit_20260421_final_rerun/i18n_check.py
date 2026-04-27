import json
import os

def get_keys(obj, prefix=''):
    keys = set()
    for k, v in obj.items():
        if isinstance(v, dict):
            keys.update(get_keys(v, prefix + k + '.'))
        else:
            keys.add(prefix + k)
    return keys

hi_path = 'frontend/public/locales/hi/common.json'
en_path = 'frontend/public/locales/en/common.json'

if os.path.exists(hi_path) and os.path.exists(en_path):
    with open(hi_path, 'r', encoding='utf-8') as f: hi = json.load(f)
    with open(en_path, 'r', encoding='utf-8') as f: en = json.load(f)
    
    hi_keys = get_keys(hi)
    en_keys = get_keys(en)
    
    missing_in_hi = en_keys - hi_keys
    missing_in_en = hi_keys - en_keys
    
    if missing_in_hi: print(f"Missing in HI: {missing_in_hi}")
    if missing_in_en: print(f"Missing in EN: {missing_in_en}")
    if not missing_in_hi and not missing_in_en: print("i18n keys match.")
else:
    print("i18n files not found.")
