#!/usr/bin/env python3
"""
Convert Wordle text files to JSON arrays for the game.
Reads from word-lists/ folder and outputs to data/ folder.
"""
import json
import os

def convert_wordle_lists():
    """Convert Wordle word lists from TXT to JSON."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Input files (official Wordle lists)
    input_dir = os.path.join(project_root, "word-lists")
    la_file = os.path.join(input_dir, "wordle-La.txt")  # Answers
    ta_file = os.path.join(input_dir, "wordle-Ta.txt")  # Valid guesses
    
    # Output files (JSON for game)
    output_dir = os.path.join(project_root, "data")
    targets_output = os.path.join(output_dir, "wordle-targets.json")
    valid_output = os.path.join(output_dir, "wordle-valid.json")
    
    print("Converting Wordle word lists...")
    
    # Convert La (answers/targets)
    print(f"\nReading answers from {la_file}...")
    with open(la_file, 'r', encoding='utf-8') as f:
        answers = [line.strip().upper() for line in f if line.strip()]
    
    print(f"Found {len(answers)} target words")
    
    # Save targets
    with open(targets_output, 'w', encoding='utf-8') as f:
        json.dump(answers, f, indent=2)
    print(f"Saved to {targets_output}")
    
    # Convert Ta (valid guesses) - includes all answers plus additional valid words
    print(f"\nReading valid guesses from {ta_file}...")
    with open(ta_file, 'r', encoding='utf-8') as f:
        valid_guesses = [line.strip().upper() for line in f if line.strip()]
    
    print(f"Found {len(valid_guesses)} valid guess words")
    
    # Combine: all answers + all valid guesses (remove duplicates)
    all_valid = list(set(answers + valid_guesses))
    all_valid.sort()
    
    print(f"Total unique valid words: {len(all_valid)}")
    
    # Save valid words
    with open(valid_output, 'w', encoding='utf-8') as f:
        json.dump(all_valid, f, indent=2)
    print(f"Saved to {valid_output}")
    
    print("\n✅ Wordle word lists updated successfully!")
    print(f"   - Targets (answers): {len(answers)} words")
    print(f"   - Valid (all guesses): {len(all_valid)} words")

if __name__ == "__main__":
    convert_wordle_lists()
