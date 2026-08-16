import os, glob

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
markers = ['\u00c3\u00b0\u00c5\u00b8', '\u00c3\u00b0\u00e2\u0080', 'ðŸ', 'â€"', 'â†', 'âœ', 'â–']

for pattern in ['**/*.html', '**/*.js']:
    for path in glob.glob(os.path.join(BASE, pattern), recursive=True):
        if 'node_modules' in path:
            continue
        try:
            text = open(path, encoding='utf-8').read()
            if any(m in text for m in markers):
                rel = os.path.relpath(path, BASE)
                count = sum(text.count(m) for m in markers)
                print(f'BROKEN ({count}): {rel}')
        except Exception as e:
            pass
