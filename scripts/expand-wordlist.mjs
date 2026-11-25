// Expand the Spelling Bee word list by merging base words with suffix/prefix expansions
// and the dwyl/english-words repository.
//
// This script reads:
// - src/assets/spelling-bee-words.json (base words)
// - C:/tmp/dwyl-words/words_alpha.txt (additional source)
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

// Load additional words from dwyl/english-words (words_alpha.txt = ~370k common English words)
const DWWL_PATH = 'C:/tmp/dwyl-words/words_alpha.txt';
const dwylWords = fs.existsSync(DWWL_PATH)
  ? fs.readFileSync(DWWL_PATH, 'utf8').split('\n').map(s => s.trim().toUpperCase()).filter(s => s.length >= 4)
  : [];

console.log('Base words:', base.size);
console.log('dwyl words (raw):', dwylWords.length);

// Use dwyl as primary source - take all valid 4-11 letter words
const dwylValid = new Set(dwylWords.filter(w => {
  if (w.length < 4 || w.length > 11) return false;
  if (!/^[A-Z]+$/.test(w)) return false;
  // Skip obvious abbreviations/short forms
  if (w.match(/^[A-Z]{1,2}$/)) return false;
  return true;
}));

console.log('dwyl filtered for game:', dwylValid.size);

// Generate suffix variations ONLY from base words that are NOT already in dwyl
// This avoids doubling up (e.g., "ACT" + "S" = "ACTS" which is already in dwyl)
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
  // Only generate for words not in dwyl (to avoid duplication and odd compounds)
  if (dwylValid.has(word)) continue;
  const variants = generateSuffixes(word);
  for (const v of variants) {
    if (!dwylValid.has(v) && !base.has(v) && v.length <= 11) {
      generated.add(v);
    }
  }
}

console.log('Generated variants (new):', generated.size);

// Merge: dwyl words + generated variants from base words
const expanded = Array.from(new Set([...dwylValid, ...generated])).sort();

fs.writeFileSync(BASE_JSON_PATH, JSON.stringify(expanded));

console.log('Total:', expanded.length);