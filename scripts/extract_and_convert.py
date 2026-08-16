#!/usr/bin/env python3
"""Extract words from document content and convert to JSON"""
import json

# Wordle-Ta list (valid guesses) - from your document
ta_content = """aahed
aalii
aargh
aarti
abaca
abaci
abacs
abaft
abaka
abamp
aband
abash
abask
abaya
abbas
abbed
abbes
abcee
abeam
abear
abele
abers
abets
abies
abler
ables
ablet
ablow
abmho
abohm
aboil
aboma
aboon
abord
abore
abram
abray
abrim
abrin
abris
absey
absit
abuna
abune
abuts
abuzz
abyes
abysm
acais
acari
accas
accoy
acerb
acers
aceta
achar
ached
aches
achoo
acids
acidy
acing
acini
ackee
acker
acmes
acmic
acned
acnes
acock
acold
acred
acres
acros
acted
actin
acton
acyls"""

# Wordle-La list (target answers) - from your document  
la_content = """aback
abase
abate
abbey
abbot
abhor
abide
abled
abode
abort
about
above
abuse
abyss
acorn
acrid
actor
acute
adage
adapt
adept
admin
admit
adobe
adopt
adore
adorn
adult
affix
afire
afoot
afoul
after
again
agape
agate
agent
agile
aging
aglow
agony
agora
agree
ahead
aider
aisle
alarm
album
alert
algae
alibi
alien
align
alike
alive"""

print("Extracting words...")
ta_words = [w.strip().upper() for w in ta_content.strip().split('\n') if w.strip()]
la_words = [w.strip().upper() for w in la_content.strip().split('\n') if w.strip()]

print(f"Sample words extracted: {len(ta_words)} from Ta, {len(la_words)} from La")
print(f"First Ta words: {ta_words[:5]}")
print(f"First La words: {la_words[:5]}")

# Save to JSON
with open('data/wordle-valid.json', 'w', encoding='utf-8') as f:
    json.dump(ta_words, f)

with open('data/wordle-targets.json', 'w', encoding='utf-8') as f:
    json.dump(la_words, f)

with open('data/spelling-bee-words.json', 'w', encoding='utf-8') as f:
    json.dump(ta_words, f)

print(f"\n✓ Created JSON files")
print(f"  wordle-valid.json: {len(ta_words)} words")
print(f"  wordle-targets.json: {len(la_words)} words")
print(f"  spelling-bee-words.json: {len(ta_words)} words")
