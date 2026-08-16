#!/usr/bin/env python3
"""
Process Wordle word lists from text files to JSON format
"""
import json

# Read wordle-Ta.txt (valid guesses - comprehensive list)
print("Reading wordle-Ta list...")
with open('wordle-Ta.txt', 'r', encoding='utf-8') as f:
    ta_words = [line.strip().upper() for line in f if line.strip()]

print(f"Loaded {len(ta_words)} valid words from Ta list")

# Read wordle-La.txt (target answers - curated common words)  
print("Reading wordle-La list...")
with open('wordle-La.txt', 'r', encoding='utf-8') as f:
    la_words = [line.strip().upper() for line in f if line.strip()]

print(f"Loaded {len(la_words)} target words from La list")

# Save to JSON
print("\nSaving JSON files...")
with open('data/wordle-valid.json', 'w', encoding='utf-8') as f:
    json.dump(ta_words, f, ensure_ascii=False)

with open('data/wordle-targets.json', 'w', encoding='utf-8') as f:
    json.dump(la_words, f, ensure_ascii=False)

# Also use Ta list for spelling bee (more comprehensive)
with open('data/spelling-bee-words.json', 'w', encoding='utf-8') as f:
    json.dump(ta_words, f, ensure_ascii=False)

print(f"✓ wordle-valid.json: {len(ta_words)} words")
print(f"✓ wordle-targets.json: {len(la_words)} words")  
print(f"✓ spelling-bee-words.json: {len(ta_words)} words")
print(f"\nTotal vocabulary: {len(set(ta_words + la_words))} unique words")
print("\n✅ Conversion complete!")
