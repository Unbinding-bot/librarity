# Wordle Word Lists

## Files

### wordle-Ta.txt
- **Purpose**: Valid guesses (comprehensive dictionary)
- **Source**: Official Wordle acceptable words list
- **Count**: ~12,972 words
- **Usage**: All words that Wordle will accept as valid guesses

### wordle-La.txt  
- **Purpose**: Target answers (curated common words)
- **Source**: Official Wordle answer list
- **Count**: ~2,309 words
- **Usage**: Words that Wordle will actually use as daily answers

## JSON Conversion

The text files need to be converted to JSON format:

```bash
# Using Python script
python process_wordle_lists.py

# Or manually convert:
# 1. Read wordle-Ta.txt line by line
# 2. Convert each word to UPPERCASE
# 3. Save as JSON array to data/wordle-valid.json

# Same for wordle-La.txt → data/wordle-targets.json
```

## Usage in Games

- **Wordle**: Uses wordle-valid.json for guess validation, wordle-targets.json for daily puzzles
- **Spelling Bee**: Uses wordle-valid.json for comprehensive dictionary
- **Word Ladder**: Uses wordle-valid.json for valid words

## Note

These are the OFFICIAL Wordle word lists, so they're the gold standard! Much better than the 5,757-word list I initially downloaded.

Total unique vocabulary: ~13,000+ five-letter words! 🎉
