import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync('./src/assets/spelling-bee-words.json', 'utf8')).map(String).map(s => s.toUpperCase());
const base = new Set(raw);
const add = new Set();

const isCleanBase = (w) => {
  // Must be 4-11 chars (valid word lengths)
  if (w.length < 4 || w.length > 11) return false;
  // Skip if ends with a suffix we'd add (avoids compounding)
  if (w.endsWith('s') || w.endsWith('es') || w.endsWith('ed') || w.endsWith('ing') || w.endsWith('ly') || w.endsWith('er') || w.endsWith('est')) {
    return false;
  }
  return true;
};

for (const word of base) {
  if (!isCleanBase(word)) continue;

  // Plural: add S or ES
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') || word.endsWith('ch') || word.endsWith('sh')) {
    add.add(word + 'ES');
  } else {
    add.add(word + 'S');
  }

  // Past tense
  if (!word.endsWith('ed') && !word.endsWith('d')) {
    add.add(word.endsWith('e') ? word + 'D' : word + 'ED');
  }

  // Present participle
  if (!word.endsWith('ing')) {
    add.add(word + 'ING');
  }

  // Comparative / superlative
  if (!word.endsWith('er') && !word.endsWith('est')) {
    add.add(word + 'ER');
    add.add(word + 'EST');
  }

  // Adverb
  if (!word.endsWith('ly')) {
    add.add(word + 'LY');
  }
}

for (const w of add) {
  if (base.has(w) || w.length < 4 || w.length > 12) add.delete(w);
}

const expanded = Array.from(new Set([...base, ...add])).sort();
fs.writeFileSync('./src/assets/spelling-bee-words.json', JSON.stringify(expanded));
console.log('Original:', base.size);
console.log('Added:', add.size);
console.log('Total:', expanded.length);