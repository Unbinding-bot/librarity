#!/usr/bin/env python3
"""
Copy the spelling-bee-words.json from word-lists/ to data/ folder.
"""
import json
import os
import shutil

def update_spelling_bee_json():
    """Copy Spelling Bee word list to data folder."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Input file
    input_file = os.path.join(project_root, "word-lists", "spelling-bee-words.json")
    
    # Output file
    output_file = os.path.join(project_root, "data", "spelling-bee-words.json")
    
    print("Updating Spelling Bee word list...")
    print(f"Source: {input_file}")
    print(f"Destination: {output_file}")
    
    # Copy file
    shutil.copy2(input_file, output_file)
    
    # Verify and show stats
    with open(output_file, 'r', encoding='utf-8') as f:
        words = json.load(f)
    
    print(f"\n✅ Spelling Bee word list updated!")
    print(f"   Total words: {len(words)}")
    
    # Show length distribution
    length_counts = {}
    for word in words:
        length = len(word)
        length_counts[length] = length_counts.get(length, 0) + 1
    
    print("\n   Word length distribution:")
    for length in sorted(length_counts.keys())[:10]:
        print(f"     {length} letters: {length_counts[length]} words")
    if len(length_counts) > 10:
        print(f"     ... and {len(length_counts) - 10} more lengths")

if __name__ == "__main__":
    update_spelling_bee_json()
