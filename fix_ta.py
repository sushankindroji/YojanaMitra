import json

for lang in ['ta']:
    filepath = f'e:\\sushank-projects\\YojanaMitra\\frontend\\src\\locales\\{lang}\\translation.json'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the last valid closing brace
    # We know "notFound" should be the last key
    pos = content.rfind('notFound')
    if pos > 0:
        # Search forward for the pattern:  "notFound": "...",  }  }
        # Find closing quote after notFound value
        search_from = pos + 10  # past "notFound"
        closing_quote = content.find('"', search_from + 15)  # find closing quote of value
        
        # Now find Two closing braces
        first_brace = content.find('}', closing_quote)
        second_brace = content.find('}', first_brace + 1) if first_brace != -1 else -1
        
        if second_brace != -1:
            # This should be the end
            valid = content[:second_brace + 1]
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(valid)
            print(f'Fixed {lang}')
        else:
            print(f'Could not find closing braces for {lang}')
