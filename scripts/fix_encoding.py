"""
Fix mojibake encoding in all HTML/JS files.
UTF-8 bytes that were incorrectly read as Latin-1 then re-saved.
"""
import os
import glob

BASE = os.path.join(os.path.dirname(__file__), '..')
EXTS = ['**/*.html', '**/*.js']

fixed = []
skipped = []

for pattern in EXTS:
    for path in glob.glob(os.path.join(BASE, pattern), recursive=True):
        if 'node_modules' in path:
            continue
        try:
            raw = open(path, 'rb').read()
            text = raw.decode('utf-8')

            # Detect mojibake: these sequences appear when UTF-8 multi-byte chars
            # were saved as Latin-1 and re-read as UTF-8
            mojibake_markers = [
                '\u00e2\u0080',  # em dash, ellipsis, quotes etc
                '\u00e2\u0086',  # arrows
                '\u00e2\u009c',  # checkmarks, pencil
                '\u00e2\u0094',  # box drawing
                '\u00e2\u009a',  # warning, gear
                '\u00e2\u008f',  # hourglass
                '\u00e2\u0096',  # triangles
                '\u00c3\u00af',  # start of emoji (ï¿½)
                '\u00c3\u00b0',  # ð (start of 4-byte emoji in latin-1)
            ]

            is_mojibake = any(m in text for m in mojibake_markers)

            if is_mojibake:
                # Recover: encode back to latin-1 bytes, then decode as utf-8
                try:
                    recovered = text.encode('latin-1', errors='replace').decode('utf-8', errors='replace')
                    with open(path, 'w', encoding='utf-8', newline='') as f:
                        f.write(recovered)
                    rel = os.path.relpath(path, BASE)
                    fixed.append(rel)
                    print(f'Fixed: {rel}')
                except Exception as e:
                    skipped.append(path)
                    print(f'Could not fix {path}: {e}')

        except Exception as e:
            pass

print(f'\nTotal fixed: {len(fixed)}')
print(f'Skipped: {len(skipped)}')
