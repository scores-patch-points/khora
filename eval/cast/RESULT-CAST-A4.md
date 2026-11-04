# RESULT-CAST-A4 — exam v3, scored once by the parent session

**Miss of the target.** `castIdentity: true` at code `29cfe25` scored **60 of 80 clean (LAYER3 0.75)** against the bar of 80 of 80. Nothing was re-run and the reader was not changed for this note. The parent scored a `git archive` snapshot of `29cfe25`; I had not seen the exam, which is now spent (development material). The parent states the exam was harder than the last (more siblings, more bare names beside longer ones), so 0.75 is not directly comparable with A3's 0.80.

| run | clean | LAYER3 | whole | unique carrier | no merge | span exact |
|---|---|---|---|---|---|---|
| `castIdentity: true` (`A4-ON.json`, sha256 `edc1865f…`) | 60 / 80 | 0.75 | 0.963 | 0.938 | 0.888 | 0.838 |
| option off, same snapshot (`A4-OFF.json`, `79a2ecf1…`) | 13 / 80 | 0.1625 | 0.988 | 0.675 | 0.65 | 0.30 |
| khora main snapshot (`A4-BASE-MAIN.json`) | 13 / 80 | 0.1625 | same | same | same | same |
| K1 control (`A4-K1.json`) | 1 / 80 | 0.0125 | | | | |

Option off equals main byte for byte: R1 holds on a fourth unseen set. Inventory sha256 `75b5cd11…`. Typed gaps in the ON run: `cast_identity_short_form_open`, `cast_identity_tie`.

## A labelling error, recorded as the parent found it

After scoring, the parent found that the inventory lists "The Alhambra", "The Brandenburg Gate", "The Chrysler Building", "The Great Pyramid", "The Parthenon" and "The Throne Hall" as forms, so the gold spans include the article and a reader that leaves the article out is scored inexact. That accounts for at least six of the span-only failures below (Alhambra, Brandenburg Gate, Chrysler Building, Great Pyramid, Parthenon, Throne Hall). "Schloss Neuschwanstein" is probably also a form the inventory did not list. The parent publishes the score as scored (0.75) and a by-meaning reading beside it; I do not adjust it.

## The 20 unclean entities, published

(m = gold mentions; main = mentions covered by the best being.)

- **A bare name merged with a longer name that begins with it (7):** Angkor (m29) and Angkor Wat (m63) carried by one being "Angkor Wat"; Linderhof (m3) and Linderhof Palace (m3) by "Linderhof Palace"; Tacoma (m6), Tacoma Narrows (m4) and Tacoma Narrows Bridge (m9) by "Tacoma Narrows Bridge". The A4 typed gap covers a one-word name beside that name plus one common noun, not a proper-name container such as "Angkor Wat" or "Tacoma Narrows".
- **Possessive siblings (4 entity-failures, 2 entities per article of the pair):** "King's Chamber" (m18, 2 carriers, exact 0) and "Queen's Chamber" (m10, 2 carriers, exact 0) come out as beings "King Chamber" and "Queen Chamber" and merge.
- **A digit-leading name:** "40 Wall Street" (m8, exact 0) carried by "Wall Street".
- **Chrysler Corporation** (m10, 2 carriers, exact 0.70) carried by "Chrysler Building Corporation".
- **Span-only:** Alhambra (exact 0.92), Brandenburg Gate (0.78), Chrysler Building (0.76), Great Pyramid (0.83, main "Great Pyramid of Giza"), Parthenon (0.91), Throne Hall (0.63), Acropolis (0.92, main "Athenian Acropolis"), Neuschwanstein Castle (0.80, 2 carriers, main "Schloss Neuschwanstein"); Granada (m25, 2 carriers, exact 0.88).

By cause: reader defect for the merged bare names (7), the possessive collision (the two Chambers), the digit-leading name and Chrysler Corporation; a labelling error (the parent's) for six of the span-only fails; "Athenian Acropolis", "Great Pyramid of Giza" and "Schloss Neuschwanstein" are a modifier or a longer form attached to the name, open.
