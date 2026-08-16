#!/usr/bin/env python3
"""
Filter words.txt to keep only words with 4 or more letters for Spelling Bee game.
Output: word-lists/spelling-bee-words.json
"""
import json

def filter_spelling_bee_words(input_file, output_file, min_length=4):
    """
    Filter words to keep only those with minimum length.
    
    Args:
        input_file: Path to input word list (one word per line)
        output_file: Path to output JSON file
        min_length: Minimum word length to keep (default: 4)
    """
    filtered_words = []
    
    print(f"Reading words from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            word = line.strip().upper()
            if len(word) >= min_length and word.isalpha():
                filtered_words.append(word)
    
    # Sort words alphabetically
    filtered_words.sort()
    
    print(f"Filtered {len(filtered_words)} words (4+ letters)")
    
    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(filtered_words, f, indent=2)
    
    print(f"Saved to {output_file}")
    
    # Show some stats
    length_counts = {}
    for word in filtered_words:
        length = len(word)
        length_counts[length] = length_counts.get(length, 0) + 1
    
    print("\nWord length distribution:")
    for length in sorted(length_counts.keys())[:10]:  # Show first 10 lengths
        print(f"  {length} letters: {length_counts[length]} words")
    if len(length_counts) > 10:
        print(f"  ... and {len(length_counts) - 10} more lengths")

if __name__ == "__main__":
    import os
    
    # Get the script directory and move to project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    input_file = os.path.join(project_root, "word-lists", "words.txt")
    output_file = os.path.join(project_root, "word-lists", "spelling-bee-words.json")
    
    filter_spelling_bee_words(input_file, output_file)
    print("\n✅ Spelling Bee word list created successfully!")
