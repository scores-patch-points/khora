# Addendum A to PREREG-SAN.md (written before any evaluation read; the first PREREG is unchanged and stays binding)

Written 2026-11-17, after: the finder and pro-drop numbers for H2-H4 (finder-eval-output.txt, computed on the treebanks, which share no text with the evaluation texts), a Sanskrit-specific reader change, and development reads on ONE development text, the Hitopadesa (GRETIL, CC BY-NC-SA 4.0), about 12,000 characters. Nothing was run on the evaluation texts except one discarded gold-free check (below).

## Results already in hand (kept whatever they say)
- H2 held: Vedic test split, recall 0.970 (839 of 865), precision 0.947 (839 of 886). Misses: tena (neuter-or-masculine split, excluded by rule), tasmat, etena. False positives: sa as an adverb (19), neuter uses of asya/tasmin.
- H3 half held: 0.157 of UFAL singular m/f third-person pronoun tokens sit inside a fused multiword token (predicted >= 0.10: held). 0.137 are free-standing but their form is not in the Vedic register (predicted >= 0.15: FAILED, and 5 of the 7 are bhavan, a lemma the Vedic treebank never tags PRON).
- H4 held: overt third-person pronoun subject on 0.121 of finite third-person verbs in UFAL (0.107 in Vedic test); predicted <= 0.35.
- A gold-free "fused candidate" count over the whole Panchatantra (register form + a word the POS prior attests) was written, run once, and DISCARDED: it matched sa+rva and similar and so measured nothing. The fused share is taken from the UFAL gold only (0.157).

## What changed after the PREREG (all derived or declared, none tuned on the evaluation texts)
1. Final-sound closure (native/adapters/text/sanskrit-sandhi.js): the Vedic treebank is unsandhied; running text is not (GRETIL Panchatantra: so 160 vs sah 7; taṃ 179 vs tam 96). The register and the POS prior also carry the standard final-sound variants of each attested form (m/anusvara, -ah to o/a/as/as/ar, final dental to d/c/j/l/n, i/u/r to y/v/r). Declared table, no counts fitted.
2. A cast for Latin-script lower-case Sanskrit (the capital tier names nothing): the heard-nominal tier needs a frame prior, so frame-san.json is built from the Vedic train split (identity/pronouns-multilingual/san/priors/frame-san.json; janus/priors has none); heard nominals are the beings of the presence rung (register field `beings: "heard-nominals"`); case forms of one stem are folded BEFORE the two-mention floor, with the endings the Vedic treebank attests (count >= 2, length <= 4, closed under the same final-sound variants).
3. The ASCII pipe is the danda of Latin-script Sanskrit and splits sentences in san only (GRETIL writes | and ||).
4. The presence rung reports why a found pronoun stays unbound (no_being_present, gender_veto, below_floor, margin); bindings are unchanged.

## Development reading (what I saw, so it is not a surprise later)
On the 12,000-character Hitopadesa slice: 228 sentences, 41 third-person pronoun tokens found, 3 bound, 35 below the floor of 2, 3 with no being present. The folded cast held story characters (hiranyaka, patanaka, srgala, mrga) and junk words (avasyam, bahih, narah). Dials were NOT touched.

## Evaluation (frozen)
- Texts, all unread by any fitting step: GRETIL Visnusarman Pañcatantra (Jha ed.), 10 chunks of 12,000 characters at evenly spaced offsets; GRETIL Dasakumaracarita, 6 chunks. Both CC BY-NC-SA 4.0 (research use, not redistributed, not committed). Sukasaptati dropped (its sentence stop is "/", not handled). Sanskrit Wikisource Devanagari Panchatantra (CC BY-SA): a script check on 2 chunks (what the reader does), not part of the pooled numbers. The Hitopadesa is development, excluded from the numbers.
- Dials: DEFAULT. Register: shipped san.json. Variants re-run on the same read (the pure rung on the same inputs): with-neuter (adds the neuter-majority singular forms the rule excludes, plus closure), no-bhavat (drops the bhavat forms, the honorific "you").
- The falsifier counts only bindings whose register form has ONE attested gender (m or f; for the three-class run also n). A soft form (tasya: masculine or neuter) is not counted.

## Predictions, restated or added (each can fail)
- H5 as written (>= 100 bound pronouns in a 20,000-word sample) is now expected to FAIL given the development read (3 of 41). H5': pooled coverage (bound / found) on Pañcatantra is between 0.02 and 0.25, below English (~0.50).
- H6, H7, H8, H9 unchanged. H6 is tested pooled (chunks are small; each chunk is one read with its own referents) and by text; a text counts only if it has >= 20 counted bindings, else it is reported as too few.
- H10: bhavat's removal does not change the pooled contradiction lower bound by more than 2 points (the honorific is a rare form).
- H11: the heard cast is not clean: on the evaluation chunks, more than a quarter of the cast's top-10 beings by mentions (per chunk, listed in the output) are not a character (a common noun, an adverb, a particle). I judge this by eye from the printed lists; no gold.

## Frozen
The code files that ran are listed with sha256 in FREEZE-SAN.txt, written before the evaluation reads.
