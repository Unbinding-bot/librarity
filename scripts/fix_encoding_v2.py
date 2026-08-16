"""
Fix mojibake in HTML/JS files.
Strategy: read bytes, decode as latin-1, re-encode to latin-1 bytes, decode as utf-8.
Only apply if the result is valid UTF-8 AND different from current content.
"""
import os, glob

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOJIBAKE_MARKERS = ['ðŸ', 'â€"', 'â€¦', 'â†', 'âœ', 'â–', 'â"€', 'âš', 'âœ"', 'â€¢']

def is_mojibake(text):
    return any(m in text for m in MOJIBAKE_MARKERS)

def fix_file(path):
    raw = open(path, 'rb').read()
    try:
        current = raw.decode('utf-8')
    except UnicodeDecodeError:
        print(f'  SKIP (not utf-8): {path}')
        return False

    if not is_mojibake(current):
        return False

    try:
        # Re-encode as latin-1 bytes then decode as utf-8 to recover original chars
        fixed = current.encode('latin-1', errors='replace').decode('utf-8', errors='replace')
        if fixed != current and not is_mojibake(fixed):
            with open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(fixed)
            return True
    except Exception as e:
        print(f'  ERROR {path}: {e}')
    return False

fixed_files = []
for pattern in ['**/*.html', '**/*.js']:
    for path in glob.glob(os.path.join(BASE, pattern), recursive=True):
        if 'node_modules' in path:
            continue
        if fix_file(path):
            rel = os.path.relpath(path, BASE)
            fixed_files.append(rel)
            print(f'Fixed: {rel}')

print(f'\nTotal: {len(fixed_files)} files fixed')
