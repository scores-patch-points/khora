# CORPUS CONTAMINATION — filename ↔ content mismatch audit (Dewey, 2026-10-07)

Auditor: **Dewey** (an ant in the Fold reading pipeline).
Scope: the authored / multi-language corpus at `/Users/mlacy/Documents/3.0/ethos/`
(`01-literature-books/`, `11-multi-language/`, `15-western-canon/`,
`20-first-person-voices/`, `14-holy-texts/`).
Deliverables: this report and the machine-readable reconciliation
`corpus-truth.json` (schema `CorpusTruth@1`) in this same directory.

Anything in this file that was already known to the corpus is cross-cited
(`corpus/POLICIES.md` LP1 corollary; live-priors
`digested/CORPUS-INTEGRITY-FINDING.md`; `khora/native/eval/weft/author-geo.json`
notes). This pass re-reads the current `ethos` checkout on its own terms —
older findings were NOT copied; each mismatch below was re-verified against the
bytes as they exist today.

---

## Summary

| item | count |
|---|---|
| files audited (text reading + header extraction, or script-profile scan) | 832 |
| **confirmed mismatches** | **23** |
| — in `01-literature-books/gutenberg/` | 3 |
| — in `11-multi-language/gutenberg-non-en/` | 20 |
| holy-texts / canon / originals / translations found contaminated | 0 |

Every one of the 23 is asserted with a verbatim snippet from the file's own
first lines or its own declared title/author header. None of the 23 should be
read as the book its filename names. The matching machine record lives in
`corpus-truth.json`; this is the human-readable ledger.

---

## Method

1. **Inventory.** All `.txt`/`.tsv` files under the five scope roots
   (`find`+`os.walk`) — 1,071 candidates in total across the five directories.
2. **Declared-header extraction** for every file (Python): Project Gutenberg
   `Title:`/`Author:`/`The Project Gutenberg eBook of …` block where present;
   YAML front-matter `title`/`author`/`source` where present; otherwise the
   first ~40 lines.
3. **Filename↔header comparison.** A file is cleared when its own declared
   header agrees with what its filename claims. Files with neither header are
   cleared only on distinctive-content evidence (2–3 proper nouns / phrases
   unique to the claimed work greped across the whole file, or opening-line
   inspection).
4. **Script-profile scan of `14-holy-texts/` (501 files):** counted
   Hebrew / Greek / Arabic / Devanagari / CJK / Latin codepoints per file and
   compared against the subdirectory's expected script (WLC/Talmud/Sefaria →
   Hebrew; SBLGNT/Nestle → Greek; Quran/Tanzil → Arabic; upanishads/Gita/Yoga →
   romanized; pali-suttas/suttacentral → romanized Latin). One flag raised:
   `nestle1904/parsing.txt`, which is the parsing-tags *guide* (Latin, 250
   lines) — its name matches its content; not contamination.
5. **Conservative rule.** `mismatch: true` is set only where a verbatim snippet
   from the file itself contradicts the filename. Borderline cases (e.g.
   `pg32063` Einstein → a relativity-papers *collection that includes* the
   claimed 1905 paper) are recorded with `mismatch: false` and a note.
6. **Dataset subdirectories** (`dialects-pidgins-creoles/`, `concepticon/`)
   carry dataset-internal IDs rather than title claims; they were spot-checked
   (Krio survey, eWAVE Tok Pisin, CORAAL excerpt, Mauritian mc160, cbk-eng
   sample — all faithful to their names) and the examined samples are included
   in the truth table. No book-text contamination pattern applies to them.

---

## The 23 mismatches

| path (what the filename claims) | actual content | evidence (verbatim) |
|---|---|---|
| `01-literature-books/gutenberg/pg10671_The_Iliad__Greek_.txt` — **Homer, *Iliad*, Greek** | Erasmus Darwin, *The Botanic Garden, Part II* (English poem) | `[Illustration: FLORA at Play with CUPID.] THE / BOTANIC GARDEN. / PART II. / CONTAINING / THE LOVES OF THE PLANTS.` (0 hits for Achilles / wrath / Iliad) |
| `01-literature-books/gutenberg/pg59129_Leviathan_by_Hobbes.txt` — **Hobbes, *Leviathan*** | E. M. Leonard, *The Early History of English Poor Relief* (Cambridge: C. J. Clay) | `THE EARLY HISTORY / OF / ENGLISH POOR RELIEF` — `London: C. J. CLAY AND SONS, CAMBRIDGE UNIVERSITY PRESS WAREHOUSE` (0 hits for Hobbes / Leviathan) |
| `01-literature-books/gutenberg/pg135_Les_Mis_rables__French_.txt` — **Hugo, *Les Misérables*, French** | correct book, but **English** translation (Hapgood) — language claim wrong | `LES MISÉRABLES / By Victor Hugo / Translated by Isabel F. Hapgood` |
| `11-multi-language/gutenberg-non-en/de/pg2148_Die_Leiden_des_jungen_Werther__Goethe_.txt` — **Goethe, *Werther*, German** | Edgar Allan Poe, *Works, Vol. II* (English) | `The Works of Edgar Allan Poe / by Edgar Allan Poe / The Raven Edition / VOLUME II.` |
| `11-multi-language/gutenberg-non-en/de/pg42671_Also_sprach_Zarathustra__Nietzsche_.txt` — **Nietzsche, *Zarathustra*, German** | Jane Austen, *Pride and Prejudice* (English) | `PRIDE AND PREJUDICE:` |
| `11-multi-language/gutenberg-non-en/de/pg67098_Die_Verwandlung__Kafka_.txt` — **Kafka, *Die Verwandlung*, German** | A. A. Milne, *Winnie-the-Pooh* (English; own PG header) | `Title: Winnie-the-Pooh / Author: A. A. Milne` |
| `11-multi-language/gutenberg-non-en/en/pg160_Crime_and_Punishment__Dostoyevsky_.txt` — **Dostoevsky, *Crime and Punishment*** | Kate Chopin, *The Awakening and Selected Short Stories* | `The Awakening / and Selected Short Stories / by Kate Chopin` |
| `11-multi-language/gutenberg-non-en/en/pg2500_The_Brothers_Karamazov.txt` — **Dostoevsky, *The Brothers Karamazov*** | Hermann Hesse, *Siddhartha* | `Siddhartha / An Indian Tale` |
| `11-multi-language/gutenberg-non-en/en/pg2542_War_and_Peace.txt` — **Tolstoy, *War and Peace*** | Henrik Ibsen, *A Doll's House* | `A Doll's House / by Henrik Ibsen` |
| `11-multi-language/gutenberg-non-en/es/pg14200_La_Divina_Comedia__Dante_.txt` — **Dante, *Divina Comedia*, Spanish** | Émile Zola, *Abbé Mouret's Transgression* (English tr.) | `ABBÉ MOURET'S TRANSGRESSION / By Émile Zola` |
| `11-multi-language/gutenberg-non-en/es/pg74987_La_Metamorfosis__Kafka_.txt` — **Kafka, *La Metamorfosis*, Spanish** | *Waikna; or, Adventures on the Mosquito Shore*, by "Saml. A. Bard" (prob. E. G. Squier) | `[Illustration: WAIKNA; / Adventures / on the / MOSQUITO SHORE. / by / Saml. A. Bard.` |
| `11-multi-language/gutenberg-non-en/fi/pg49010_Runeberg_runoelmat__Finnish_.txt` — **Runeberg's poems, Finnish** | J. H. Stickney, *Æsop's Fables: A Version for Young Readers* (English) | `Æsop's Fables / A Version for Young Readers / by J. H. Stickney` |
| `11-multi-language/gutenberg-non-en/fi/pg76749_Sota_satulavy___Finnish_.txt` — **a Finnish war novel** | *Evolution Made Plain*, John Mason (Haldeman-Julius Pocket Series, English) | `POCKET SERIES NO. 467 … Evolution Made Plain / John Mason / HALDEMAN-JULIUS COMPANY` |
| `11-multi-language/gutenberg-non-en/fr/pg15807_Nana.txt` — **Zola, *Nana*, French** | Henry White Warren, *Among the Forces* (English) | `AMONG THE FORCES … by HENRY WHITE WARREN, LL.D.` |
| `11-multi-language/gutenberg-non-en/fr/pg17489_Madame_Bovary.txt` — **Flaubert, *Madame Bovary*, French** | Victor Hugo, *Les Misérables, Tome I — Fantine* (French; right language, wrong book) | `Victor Hugo / LES MISÉRABLES / Tome I--FANTINE / (1862)` |
| `11-multi-language/gutenberg-non-en/fr/pg42108_Le_Comte_de_Monte_Cristo.txt` — **Dumas, *Monte Cristo*, French** | The *Slang Dictionary* / a beggars' cant guide (after John Camden Hotten, English) | `[Illustration: A CADGER'S MAP OF A BEGGING DISTRICT.` / `SLANG DICTIONARY` |
| `11-multi-language/gutenberg-non-en/fr/pg7700_De_la_d_mocratie_en_Am_rique__Tocqueville_.txt` — **Tocqueville, *Democracy in America*, French** | Aristophanes, *Lysistrata* (English tr.) | `LYSISTRATA / Translated from the Greek of / ARISTOPHANES` |
| `11-multi-language/gutenberg-non-en/it/pg174_Il_ritratto_di_Dorian_Gray.txt` — **Wilde, *Dorian Gray*, Italian** | right book, but **English** text — language claim wrong | `The Picture of Dorian Gray / by Oscar Wilde` |
| `11-multi-language/gutenberg-non-en/it/pg32773_Il_Principe__Machiavelli_.txt` — **Machiavelli, *Il Principe*, Italian** | J. Ewing Ritchie, *About London* (English) | `ABOUT LONDON. … BY / J. EWING RITCHIE / Author of "Night Side of London"` |
| `11-multi-language/gutenberg-non-en/la/pg5200_Metamorphoses__Ovid__Latin_.txt` — **Ovid, *Metamorphoses*, Latin** | Franz Kafka, *The Metamorphosis* (English) | `One morning, when Gregor Samsa woke from troubled dreams, he found` |
| `11-multi-language/gutenberg-non-en/la/pg8800_De_Rerum_Natura__Lucretius_.txt` — **Lucretius, *De Rerum Natura*, Latin** | Dante, *Divine Comedy* in Cary's English verse translation | `THE DIVINE COMEDY / THE VISION of HELL, PURGATORY, AND PARADISE / BY DANTE ALIGHIERI / TRANSLATED BY THE REV. H. F. CARY` |
| `11-multi-language/gutenberg-non-en/nl/pg1232_Othello__Dutch_.txt` — **Shakespeare, *Othello*, Dutch** | Niccolò Machiavelli, *The Prince* in English (tr. W. K. Marriott) | `The Prince / by Nicolo Machiavelli / Translated by W. K. Marriott` |
| `11-multi-language/gutenberg-non-en/sv/pg43668_F_ders_brott__Swedish_.txt` — **a Swedish novel** | Robert Greene, *The Scottish History of James the Fourth* (Malone Society apparatus, English) | `THE SCOTTISH HISTORY` (opening textual-apparatus note, English) |

Note on both `pg135` and `it/pg174`: these are the *right book, wrong
language* — wrong claim but a defensible read if you want the book in English.
Everything else in the table is a wholly different work.

### Same directory, verified CORRECT (not part of the 23)

`gutenberg-non-en` German Nietzsche set is real and in German as named:
`de/pg60360_Der-Wille-zur-Macht`, `pg7202_Ecce-Homo`, `pg7203_Gotzen-Dammerung`,
`pg7204_Jenseits-von-Gut-und-Bose`, `pg7206_Die-Geburt-der-Tragodie`,
`pg7207_Menschliches-Allzumenschliches`, and
`ja/aozora789_Wagahaiwa_Nekodearu__Natsume_Soseki_.txt`
(吾輩は猫である, genuine Japanese). These seven are NOT among the mismatches —
the old live-priors "all 20 of 20" claim described its own (older) copy; the
current `ethos` copy has been partially corrected and must be judged on its own
bytes.

`01-literature-books/gutenberg/pg32063_On_the_Electrodynamics…Einstein_.txt` is
a borderline near-miss: it holds *The Principle of Relativity* (Saha & Bose
trans.), a collection that **includes** Einstein's 1905 "On the Electrodynamics
of Moving Bodies" (23 hits "Moving Bodies", 17 "electrodynamics"). Recorded
mismatch=false with the note; read as "relativity papers collection", not "one
paper".

---

## Immediate need: the real Iliad and the real Odyssey

The user wants to read the **Iliad**, then the **Odyssey**. Determined by
content (not filenames), across the whole `/Users/mlacy/Documents/3.0/`
workspace:

- **ILIAD — exists, Ancient Greek only.** No English Iliad translation exists
  anywhere in the workspace (searches for Pope/Chapman/Butler/Lattimore opening
  lines, "wrath of Achilles", "Briseis"/"Chryseis" → only incidental mentions).
  - `/Users/mlacy/Documents/3.0/ethos/11-multi-language/greek-originals/homer-iliad.txt`
    (16,327 lines; Greek Wikisource polytonic). Its own front matter declares
    `title: Ὅμηρος, Ἰλιάς` and the text opens *Μῆνιν ἄειδε, θεά, Πηληϊάδεω
    Ἀχιλῆος* — the genuine opening of the Iliad.
- **ODYSSEY — exists, Greek AND English.**
  - Greek: `/Users/mlacy/Documents/3.0/ethos/11-multi-language/greek-originals/homer-odyssey.txt`
    (12,453 lines; opens *Ἄνδρα μοι ἔννεπε, Μοῦσα, πολύτροπον* — the genuine
    opening).
  - English (Samuel Butler, PG #1727): the primary copy is
    `/Users/mlacy/Documents/3.0/eo-teachings/sources/butler-odyssey-gutenberg1727.txt`
    (own PG block: `Title: The Odyssey / Author: Homer / Translator: Samuel
    Butler`). Duplicate copies (content identical) sit under
    `commoncite/eoreader7{,/scripts/adversarial/fixtures}` and
    `eoWebLLM/eoreader6`, `eoreader6.1-RETIRED`, `eoreader7-*` "odyssey-greek.txt"
    / "odyssey-full.txt" fixtures — note those *_fixture files are misnamed
    "greek" while holding the English text_.
- The misleading *Iliad*-named file
  `ethos/01-literature-books/gutenberg/pg10671_The_Iliad__Greek_.txt` actually
  contains Erasmus Darwin's *Botanic Garden* — do not read it as Homer.

**Plain answer:** If you can read Ancient (polytonic) Greek, both epics are
real and ready (`greek-originals/homer-iliad.txt`, then `homer-odyssey.txt`).
If you need English: the **Odyssey** is available at
`eo-teachings/sources/butler-odyssey-gutenberg1727.txt`, but **no English
Iliad** exists in the workspace — only the Greek.

---

## Cross-checks and provenance

- `khora/native/eval/weft/author-geo.json` (AuthorGeo@1) independently encodes
  the same mismatch set — including the `pg59129` Leviathan→Poor-Relief and the
  `pg135` language findings this pass re-verified independently. Its notes
  agree with this ledger on every file the two cover.
- Prior findings (`corpus/POLICIES.md`; live-priors
  `digested/CORPUS-INTEGRITY-FINDING.md`) describe the *same defect pattern* in
  older checkouts; several files those docs flagged as wrong (`pg1661` Tom
  Sawyer, `pg768` Sherlock, `pg17270` Aeneid, `pg2636` Faust, `pg5196` Don
  Quixote, `pg2397` Leaves of Grass, `pg5827` Meditations, `pg62168` Origin of
  Species, `pg8394` Beyond Good and Evil) are **now correct** in `ethos`.
  Anything in this report supersedes those older documents for this checkout.

## What was not done

No corpus file was deleted, renamed, or rewritten (per LP1). This report and
`corpus-truth.json` are the only writes. Diagnosing *why* the fetched Gutenberg
pockets carry the wrong bytes (a fetch-id/name mapping bug) remains separate,
unopened work.