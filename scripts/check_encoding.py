files = ['leaderboard.html', 'js/admin/admin-panel.js']
markers = ['\u00e2\u0080', '\u00e2\u0086', '\u00e2\u009c', '\u00e2\u0094', '\u00c3\u00b0']
for f in files:
    text = open(f, encoding='utf-8').read()
    bad = any(m in text for m in markers)
    print(f + ': ' + ('MOJIBAKE' if bad else 'CLEAN'))
