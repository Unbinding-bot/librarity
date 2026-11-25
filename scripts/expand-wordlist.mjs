// Expand the Spelling Bee word list by merging base words with suffix/prefix expansions
// and the harshnative/words-dataset repository.
//
// This script reads:
// - src/assets/spelling-bee-words.json (base words)
// - C:/tmp/words-dataset/wordsFreq.csv (additional source - 494,877 valid words)
//
// And writes:
// - src/assets/spelling-bee-words.json (expanded, deduplicated)

import fs from 'node:fs';
import path from 'node:path';

const BASE_PATH = process.cwd();
const BASE_JSON_PATH = path.join(BASE_PATH, 'src', 'assets', 'spelling-bee-words.json');

// Load base words
const raw = JSON.parse(fs.readFileSync(BASE_JSON_PATH, 'utf8')).map(String).map(s => s.toUpperCase());
const base = new Set(raw);

// Load additional words from harshnative/words-dataset (wordsFreq.csv = 494,877 valid 4-11 letter words)
const DWWL_PATH = 'C:/tmp/words-dataset/wordsFreq.csv';
const dwylWords = fs.existsSync(DWWL_PATH)
  ? fs.readFileSync(DWWL_PATH, 'utf8').split('\n').slice(1).filter(l => l.trim()).map(l => {
      const parts = l.split(',');
      return parts[1] ? parts[1].toUpperCase() : '';
    }).filter(w => w.length >= 4)
  : [];

console.log('Base words:', base.size);
console.log('words-dataset raw:', dwylWords.length);

// Use words-dataset as primary source - take all valid 4-11 letter words
const dwylValid = new Set(dwylWords.filter(w => {
  if (w.length < 4 || w.length > 11) return false;
  if (!/^[A-Z]+$/.test(w)) return false;
  // Skip obvious abbreviations/short forms
  if (w.match(/^[A-Z]{1,2}$/)) return false;
  return true;
}));

console.log('words-dataset filtered for game:', dwylValid.size);

// Generate suffix variations ONLY from base words that are NOT already in words-dataset
// This avoids doubling up (e.g., "ACT" + "S" = "ACTS" which is already in dataset)
const generateSuffixes = (word) => {
  const variants = new Set();
  // Skip words that already end with likely suffixes (avoid over-compounding)
  if (word.endsWith('S') || word.endsWith('ES') || word.endsWith('ED') || word.endsWith('ING') ||
      word.endsWith('LY') || word.endsWith('ER') || word.endsWith('EST') || word.endsWith('TION')) {
    return variants;
  }

  // Plural: add S or ES
  if (word.endsWith('S') || word.endsWith('X') || word.endsWith('Z') || word.endsWith('CH') || word.endsWith('SH')) {
    variants.add(word + 'ES');
  } else {
    variants.add(word + 'S');
  }

  // Past tense
  if (!word.endsWith('ED') && !word.endsWith('D')) {
    variants.add(word.endsWith('E') ? word + 'D' : word + 'ED');
  }

  // Present participle
  if (!word.endsWith('ING')) {
    variants.add(word + 'ING');
  }

  // Comparative / superlative
  if (!word.endsWith('ER') && !word.endsWith('EST')) {
    variants.add(word + 'ER');
    variants.add(word + 'EST');
  }

  // Adverb
  if (!word.endsWith('LY')) {
    variants.add(word + 'LY');
  }

  return variants;
};

const generated = new Set();
for (const word of base) {
  // Only generate for words not in words-dataset (to avoid duplication and odd compounds)
  if (dwylValid.has(word)) continue;
  const variants = generateSuffixes(word);
  for (const v of variants) {
    if (!dwylValid.has(v) && !base.has(v) && v.length <= 11) {
      generated.add(v);
    }
  }
}

console.log('Generated variants (new):', generated.size);

// Merge: words-dataset + generated variants from base words
const expanded = Array.from(new Set([...dwylValid, ...generated])).sort();

fs.writeFileSync(BASE_JSON_PATH, JSON.stringify(expanded));

console.log('Total:', expanded.length);