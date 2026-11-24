# Reading baseline changes (append-only; written by record.mjs)

## 2026-11-17: baseline recorded: English pronoun binding measured on 125 GUM documents (0.689 precision, 49.5% of answerable); the error diagnosis (69% of the wrong bindings are non-persons: the non-personal ruling is absent on this machine); per-language registers, autonym registry and the typed gaps pronoun_presence_no_register / _unmeasured / _no_nonpersonal_ruling
files changed since the last record: native/the-fold/read-process.mjs, native/the-fold/read-core.mjs, native/the-fold/language-grammar.js, native/the-fold/language-names.js, native/adapters/text/pronouns.js, native/adapters/text/pronoun-registers.js, native/adapters/text/pronoun-presence-chosen.js, native/adapters/text/clause-attach.js, native/adapters/text/non-personal.js

## 2026-11-17: added the non-personal-ruling gap to the canonical read; language names registry; status docs
files changed since the last record: (none)

## 2026-11-17: the generated language names data is now guarded too
files changed since the last record: native/the-fold/language-names.data.js

## 2026-11-18: the canonical English read applies the measured name ruling (name-prior.js, from UD English GUM train): precision 0.874 -> 0.911 at unchanged coverage on 66 unseen GUM documents (PREREG-ROUND14, NOVELS-RESULTS-ROUND14); read-core gains the namePersonhood hook, read-process passes it for English only
files changed since the last record: native/the-fold/read-process.mjs, native/the-fold/read-core.mjs, native/adapters/text/name-prior.js, native/adapters/text/name-prior/eng.json

## 2026-11-18: docs only: status note
files changed since the last record: (none)

## 2026-11-18: Greek and Sanskrit read their clauses through the case-marked (Chomsky) seam: 0 clauses became 64 (grc sample) and 48 (san sample) with null subjects recorded; the pronoun rung takes an optional roles input (case-read subject, co-argument rule), default off by the preregistered rule (PREREG-ROUND19, NOVELS-RESULTS-ROUND19); greek.mjs moved to adapters/text/greek-seam.js; frame-san.json ships in native/priors-shipped; grc and san registers carry their evaluation
files changed since the last record: native/the-fold/read-process.mjs, native/the-fold/read-core.mjs, native/adapters/text/pronouns.js, native/adapters/text/pronoun-registers.js, native/adapters/text/case-marked-clauses.js, native/adapters/text/greek-seam.js, native/the-fold/prior-source.mjs, native/adapters/text/pronoun-registers/grc.json, native/adapters/text/pronoun-registers/san.json, native/priors-shipped/frame-san.json

## 2026-11-18: docs only: the Greek register's share table moved out of the registers directory (the guard reads every json there as a register)
files changed since the last record: (none)

## 2026-11-18: docs and result files only
files changed since the last record: (none)

## 2026-11-18: one priors-home rule (prior-source.mjs: KHORA_PRIORS_DIR, janus beside the workspace, ~/Documents/janus/priors, vendored); pronoun-registers reads the same door; overcomeable non-personal ruling is the default in the read (pp.nonPersonalSoft ?? true); rung options priorGender, genderModel (surprise-weighted gender, experimental, off) and roles
files changed since the last record: native/the-fold/read-core.mjs, native/adapters/text/pronouns.js, native/adapters/text/pronoun-registers.js, native/the-fold/prior-source.mjs

## 2026-11-18: per-language competency profile on the entry (language-competency.js); English evaluation recorded with the soft ruling
files changed since the last record: native/the-fold/read-core.mjs, native/adapters/text/pronouns.js

## 2026-11-18: language-competency.js is reading-critical
files changed since the last record: native/adapters/text/language-competency.js

## 2026-11-18: Greek binds dropped (null) subjects by default (PREREG-ROUND21 / NOVELS-RESULTS-ROUND21: 0.551 precision at 43.3% coverage on 809 answerable gold dropped subjects, above the shuffled null; overt bindings unchanged); the competency profile states it
files changed since the last record: native/the-fold/read-process.mjs, native/the-fold/read-core.mjs, native/adapters/text/pronouns.js, native/adapters/text/case-marked-clauses.js, native/adapters/text/language-competency.js

## 2026-11-18: the user's 94% competency bar is declared in the competency profile (accuracy = precision x coverage on gold; gold-free cannot count); no language meets it
files changed since the last record: native/adapters/text/language-competency.js

## 2026-11-18: French binds on measured evidence: register from UD French-GSD, evaluation on CorefUD French-Democrat (0.547 precision at 36.8% coverage, 20% resolved correctly); Greek's bar measure pools overt and dropped subjects
files changed since the last record: native/adapters/text/language-competency.js

## 2026-11-18: tier pronouns: a measured register with an unvalidated clause reader (French)
files changed since the last record: native/adapters/text/language-competency.js

## 2026-11-18: pronoun-registers.js loads node:fs/os/path/url only under Node (as prior-source.mjs does), so the page's import graph reaches no node: specifier statically: this was the one failing test that kept CI red from 2026-11-04 (reading-pipeline.test.js, 'nothing in its import graph imports node: statically'). Behaviour under Node is unchanged; in a page registerFor returns null (the typed gap pronoun_presence_no_register). No metric changed.
files changed since the last record: native/adapters/text/pronoun-registers.js
## 2026-11-18: ONE DOOR: canonicalReaderOptions/canonicalDeclension/noteMissingRuling/assertPrimed factored out of readToWeft (same behaviour); reading.js::readDocument now reads with the same canonical options (it skipped pronoun, name and case-marked options before); an unprimed read throws under Node (allowDegraded opts out); native/reading.js and the door allowlist are reading-critical; native/tests/one-door.test.mjs holds the two doors equal. No metric changed: readToWeft output is identical.
files changed since the last record: native/reading.js, native/tests/door-allowlist.json, native/the-fold/read-process.mjs

## 2026-11-18: merge of the one-door and CI changes: baseline re-recorded over both (read-process.mjs, reading.js, pronoun-registers.js, door allowlist); no metric moved
files changed since the last record: (none)

## 2026-11-18: khora works only through pharos: pharos-gate.mjs and holon.json are reading-critical; readToWeft and reading.js::readDocument run pharos' gate, write one entry per read into pharos, and refuse a read that left an available capacity unused (allowDegraded marks it). No metric moved.
files changed since the last record: native/reading.js, native/the-fold/pharos-gate.mjs, holon.json, native/the-fold/read-process.mjs
## 2026-11-18: English answers every pronoun it finds (pronounsGuess, PRONOUN_GUESS_DIALS chosen on development data, confirmed on fresh LitBank fiction 0.518 -> 0.661 resolved correctly and GUM U 0.576 -> 0.730); the confident bindings are unchanged; the competency profile measures English by it (pooled 0.700)
files changed since the last record: native/the-fold/read-process.mjs, native/the-fold/read-core.mjs, native/adapters/text/pronoun-presence-chosen.js, native/adapters/text/language-competency.js

## 2026-11-18: docs: pooled English resolved 0.699
files changed since the last record: (none)

## 2026-11-18: round 24: competency measured by the official CorefUD scorer (the giver)
files changed since the last record: native/adapters/text/language-competency.js

## 2026-11-18: round 26: diagrammer giver constants in the competency profile
files changed since the last record: native/adapters/text/language-competency.js

## 2026-11-18: scholia moved to its own repo
files changed since the last record: (none)

## 2026-11-19: round 30: the referent rule in the competency profile
files changed since the last record: native/adapters/text/language-competency.js

## 2026-11-19: merge of rounds 24-30 over the pharos gate and the one-door refactor
files changed since the last record: native/the-fold/read-process.mjs, native/the-fold/read-core.mjs, native/adapters/text/pronoun-presence-chosen.js, native/adapters/text/language-competency.js

## 2026-11-19: merge: metrics from both sides; files re-recorded
files changed since the last record: (none)

## 2026-11-19: additive output only: read-core.mjs passes keepCandidates:true to the presence rung and keeps its candidate log as weft.pronounsCandidates (every candidate the rung scored per pronoun, with its activation, and what it chose). No binding changes: pronounsPresence is byte-identical before and after on 6 DEV documents (91 bindings, same refs, activations and margins). The GUM gold check (precision 0.689, coverage ~0.51) was NOT re-run; the change cannot move it because keepCandidates only records.
files changed since the last record: native/the-fold/read-core.mjs

## 2026-11-19: the held pronoun spectrum is now OPT-IN (readerOptions.pronounCandidates === true; off, the entry is byte-identical, which khora's pronoun-presence wiring tests require: they failed with an always-on field and pass with the opt-in). Same note as before otherwise: no binding changes, pronounsPresence identical on 6 DEV documents; the GUM gold check was not re-run.
files changed since the last record: native/the-fold/read-core.mjs

## 2026-11-22: wired speakers.js into the read as an opt-in (round-30 speaker/addressee kind admission); default read byte-identical
files changed since the last record: native/reading.js, native/the-fold/read-process.mjs, native/the-fold/read-core.mjs

## 2026-11-22: open the pronoun gender model from binary m/f to the open pro-form classes m/f/n/x (genderOf/evidence/priorGender); English received register is unchanged so the read is behavior-neutral
files changed since the last record: native/adapters/text/pronouns.js

## 2026-11-22: wire the gender-prior chain (corpus > wikidata > name table) as the canonical genderPrior
files changed since the last record: native/the-fold/read-process.mjs

## 2026-11-22: emit the pro-form agreement label (person/number/gender) on each pronoun binding and on the read's pronounsPresence/pronounsGuess; additive metadata, binding behavior unchanged
files changed since the last record: native/the-fold/read-core.mjs, native/adapters/text/pronouns.js

## 2026-11-23: fix reading-one.mjs isFile heuristic: a text containing / or a trailing .xyz was misdetected as a file path; now a string is a file only when it has no newline AND (exists on disk OR carries a path prefix OR a trailing extension)
files changed since the last record: (none)

## 2026-11-23: recordRead writes the full read to pharos (beings INS·Figure, kāraka edges SYN·Pattern, pronoun bindings CON·Figure) so the fold and surfaces read off the pharos, not the reader; recordRead stays sync (the pharos lib open/weave are sync)
files changed since the last record: native/the-fold/pharos-gate.mjs

## 2026-11-23: being entry addr is the raw cast ref (not ref:ref:...), so the fold connects a being to its pronoun bindings
files changed since the last record: native/the-fold/pharos-gate.mjs

## 2026-11-23: weaveFullRead also writes the gender prior (DEF·Figure) and the speaker/addressee beings (INS·Figure)
files changed since the last record: native/the-fold/pharos-gate.mjs

## 2026-11-23: weaveFullRead also writes the containment part_of edges (SYN·Pattern) from nest-from-read, so the holarchy has a layering to climb
files changed since the last record: native/the-fold/pharos-gate.mjs

## 2026-11-23: containment from the kāraka roles (kartṛ subject inside adhikaraṇa locus, both PROPN) replaces the raw-label nestFromRead
files changed since the last record: native/the-fold/pharos-gate.mjs

## 2026-11-23: English aliases for the kārakas (KARAKA_EN); containment is pure kāraka (agent in locus), no PROPN/isPlaceType filter
files changed since the last record: (none)

## 2026-11-23: karaka-total: every parse row gets one Pāṇinian label from a closed set (total over the 37 UD v2 relations; marker child, voice, subtype, bare case as evidence) replacing two copies of a subtype-blind karakaOf wrapper in reading.js; reading-one.mjs adds entry.mereology (text-mereology.mjs: one source-addressed tree document>paragraph>sentence>phrase>token, kāraka frames, measured coverage). Measured 2026-11-23, exploratory, gate off, khora 99d1512 + this change: entry identical outside the kāraka labels on 3 Zenodotus texts x 30k chars (pronounsPresence, pronounsGuess, cast, edges, clauses unchanged; variety confidence 0.99 -> 0.80, same label); BASELINE metrics (pronoun gold) not affected, not re-run. Coverage on 5 texts x 20k chars (20,323 rows) and Douglass Narrative whole (47,555 rows): rows in tree 100%, aligned to source 100% (was 34% exact on CRLF), labelled 100% (was 27% non-null), non-ws chars read 100%; participants specific 95.8% / 95.3%. Coverage is not correctness: no kāraka gold yet.
files changed since the last record: native/reading.js, native/adapters/text/karaka-total.mjs, native/adapters/text/text-mereology.mjs

## 2026-11-23: reading in order: native/reading-in-order.mjs reads a text from its dependency trees in reading order (the reader's cut; the canonical parse per sentence on the performance cores; the whole folded as the trees arrive, text-mereology now an in-order builder). Codec made exact-faster: ud-parser feature index (template + value ids, verified tuples, nonzero weights) for parser and tagger, integer features mirroring features() template for template, compiled index cached under ~/.khora/compiled, dense rows and khora's English-parser model built only when used. Measured 2026-11-23 on War and Peace (3.29M chars, MacBook Air M3, 4 workers, mains power, exploratory): 9.1 s and 9.6 s whole book (canonical door: 1,751 s); trees identical to the string path (whole-book sha256 264f90615b09c6dc), whole identical to the committed mereology (09cc903184ba0d96: 915,802 nodes, 100,410 frames); BASELINE pronoun metrics not affected (rows unchanged), not re-run. Not yet in this read: cast, pronoun bindings, gender prior, polarity, containment, competency (typed gaps).
files changed since the last record: native/adapters/text/text-mereology.mjs, native/reading-in-order.mjs, native/reading-in-order.worker.mjs

## 2026-11-23: reading-in-order.mjs header: measured result restated (no code change)
files changed since the last record: native/reading-in-order.mjs

## 2026-11-23: proform-agreement, a new capacity written to pharos: a name's pro-form from the reflexives and possessives its own clause binds to it, read off the rows' FEATS (gender-from-corpus.js, the rows half; no pattern). Both doors carry it as entry.proforms (read-core.mjs) and the door weaves it per cast being as kind proform (pharos-gate.mjs); holon.json and capacitiesOf declare it. reading-in-order.mjs now writes its act to pharos like the door: refused up front without allowDegraded, else recorded degraded with what it leaves out (pos, morphology, punctuation, dotted, pronoun-binding, name-ruling, non-personal-ruling). Reading outputs otherwise unchanged (the parse path is untouched; fields are additive). Measured (War and Peace, in-order, exploratory, 2026-11-23, MacBook Air M3): the tally 127 ms of 9.3 s; main cast decided and right by inspection (Pierre m 245 of 278, Natasha f 164 of 188, Andrew m, Mary f, Nicholas m, Napoleon m, Countess f); Helene contested (f 6, m 1, p 0.12); 63 of 952 keys decided by the sign test at 0.05. Gold metrics not re-measured: nothing that binds pronouns changed.
files changed since the last record: native/the-fold/pharos-gate.mjs, holon.json, native/the-fold/read-core.mjs, native/reading-in-order.mjs

## 2026-11-23: The cast in the ordered read, off the trees (referents-in-order.mjs, no pattern): a name is a PROPN with its flat/compound PROPN parts; in reading order each mention joins the one being it can be (same form; a shorter form held whole; a longer form holding one of its names whole), else opens a new one; names side by side are split; a contested link never widens a being. Ground before the fold (possibility, context-free): a title is a POS-prior common noun or a word the reader writes lower case as a common noun 2+ times in the text. Each being carries every written form and the pro-forms its own clauses bind; its pro-form decided per being. Woven to pharos per being (kind referent). gender-from-corpus.js and referents-in-order.mjs join READING_FILES. Measured (War and Peace, exploratory, 2026-11-23, M3 Air, machine loaded): 1,832 beings from 23,714 name mentions, 2,263 links contested (9.5%); the fold 0.3-0.6 s; main cast one being each by inspection (Pierre 1,963, Prince Andrew 1,655, Natasha 1,209, Nicholas 647, Napoleon 621, Mary 186, Prince Vasili 215), with known errors: surnames shared in a family link to the last-read member (Rostov, Bolkonski), patronymic-only forms unlinked. Trees unchanged. Gold metrics not re-measured: no gold cast scored.
files changed since the last record: native/the-fold/pharos-gate.mjs, native/reading-in-order.mjs, native/adapters/text/referents-in-order.mjs, native/adapters/text/gender-from-corpus.js

## 2026-11-23: referents-in-order: a pro-form bound in a name's own clause (reflexive, possessive) points at that name's referent in mentionOf, so every form of the node, pronouns included, resolves to it. Additive; nothing else changed.
files changed since the last record: native/adapters/text/referents-in-order.mjs

## 2026-11-23: referents-in-order: a short form goes without doubt to the ONE being already called by exactly that name in an uncontested link (calledBy), else the last read, contested; each referent lists the names it is known by. War and Peace (exploratory, 2026-11-23, M3 Air, same parse): contested links 2,263 -> 440 of 23,714 name mentions (1.9%); Princess Mary 186 -> 635 mentions (bare Mary 496 no longer handed to Mary Ivanovna, Mary Abramovna, Mary Viktorovna by recency); Prince Andrew 1,765; the fold 480 ms.
files changed since the last record: native/adapters/text/referents-in-order.mjs
## 2026-11-23: kāraka edges carry the ARG as a referent (a token inside a cast mention is its being), not a lemma string
files changed since the last record: native/the-fold/pharos-gate.mjs

## 2026-11-23: the case marker disambiguates the locus: 'to' is a recipient (sampradāna), 'from' a source (apādāna)
files changed since the last record: native/the-fold/pharos-gate.mjs

## 2026-11-23: re-attach a recipient/source to the verb (climb one head past a noun the parser hung it on)
files changed since the last record: native/the-fold/pharos-gate.mjs

## 2026-11-23: Merge origin/main (9522e00 kāraka edges carry the ARG as a referent; 4476101 the case marker disambiguates the locus, 'to' a recipient, 'from' a source; c061faf re-attach the recipient/source to the verb) into karaka-total. Only the baseline files conflicted (both sides re-recorded); metrics were identical on both sides. The merged reading is re-hashed here; the gate below must pass on the merged tree.
files changed since the last record: native/the-fold/pharos-gate.mjs

## 2026-11-23: referents-in-order, second pass (in reading order, on the same trees): noun phrases are referents (an indefinite opens one; a definite or bare description returns to the last with the same head and number within the horizon; a possessed one is keyed by its possessor's referent); third-person pronouns no clause binds go to the most recent present being whose pro-form so far agrees (evidence leaning the other way excludes; never a co-argument; no evidence: he/she only a name, it a singular noun phrase, they a plural one), contested when not decided; identity ACROSS referents is a typed edge, never a merge (apposition, title, predicate, shared-name, same-head, possessor) and mergeBy(cast, types) is one perspective's collapse. Horizon = 90th percentile of the gaps between a name's consecutive mentions (declared HORIZON_PCT). War and Peace (exploratory, 2026-11-23, M3 Air, saved parse): participants in the six kāraka roles that are a referent 9.7% -> 70.0% (108,204 of 154,587: names 100%, nouns 100%, he/she/it/they 95.4%, I/you/we 0%); 38,507 pronouns bound across clauses, 64.6% contested; 41,663 noun-phrase referents; horizon 706 sentences; the fold 2.8 s. NOT measured against gold yet: precision of the pronoun bindings and noun-phrase chains is unknown until the CorefUD scorer runs (LitBank, GUM); known wrong title edges (the little princess - Mary, the countess - Bezukhova) stay edges, not merges. Not canonical: the door's cast is unchanged.
files changed since the last record: native/adapters/text/referents-in-order.mjs

## 2026-11-23: weaveReferents: every field written explicitly (pharos refuses an undefined value: a noun-phrase referent has no 'contested', which failed the War and Peace read at the weave); weaves every name, every description the text returns to (mentions > 1), and the identity edges except same-head (kind 'identity'). Test native/tests/weave-referents.test.mjs weaves a fixture cast into the test pharos. Reading unchanged.
files changed since the last record: native/the-fold/pharos-gate.mjs, native/reading-in-order.mjs

## 2026-11-23: weaveReferents writes its batch in ONE pharos weaveMany call (one P.weave per entry took about 8 minutes for War and Peace's ~20,000 entries). Same entries.
files changed since the last record: native/the-fold/pharos-gate.mjs

## 2026-11-23: referents-in-order, pronoun salience for short texts: the subject is touched last, so it is the most salient name of its sentence; an optional genderOf(words) (the given-name table, name-gender/eng.json, an overcomeable prior that never counts as sure) is the first lean of a name with no pronoun evidence of its own; a pronoun bound with no evidence is recorded as an ASSUMPTION about that being (assumed), so a she taken to be Mina keeps a later he from being Mina. Needed by the chat (native/chat/thread.mjs): 'Mina gave Jonathan a book. She lives in the village.' then 'Who is she?' answered Jonathan before, Mina now (native/chat/thread.test.mjs asserts it). War and Peace, exploratory, 2026-11-23, saved parse, genderOf off: participants that are a referent 70.0% (108,204 of 154,587, unchanged), pronouns bound across clauses 38,507 (unchanged), contested 64.6% -> 64.3%: neutral on the book. No gold scored; not canonical.
files changed since the last record: native/adapters/text/referents-in-order.mjs

## 2026-11-24: chat reader mechanics 3 and 5 (branch reader-chat-register on c7e956b): native/adapters/text/recase.mjs + priors-shipped/truecase-eng.json (lowercase names: EWT dev/test recall 0.32/0.30 precision 0.75/0.71, invariance of proper nouns under lowercasing 29.5% -> 45.5%, EXPLORATORY) and native/adapters/text/language-gate.mjs + reading.js readerFor / rowsOfFor (per-message language, typed gaps no_codec and no_language, never English by default; codecs loaded from the priors home). Gate on UD PUD short sentences: right 76.0% (raw identifier 87.6%), wrong 0.7% (raw 1.0%); real SMS confident non-English labels 6% -> 0.56%. Details: eval/chat-register/RESULTS-READER.md. The English read of an already-capitalised message is unchanged.
files changed since the last record: native/reading.js, native/adapters/text/recase.mjs, native/adapters/text/language-gate.mjs, native/priors-shipped/truecase-eng.json

## 2026-11-24: language-gate.mjs: unknown words capitalised in mid-sentence are names, set aside by the English witness (a peer found 'Madame Defarge wrote a letter.' unread). Gold re-run: UD PUD short wrong 4 -> 5 of 603, VAL short 14 -> 15 of 1227, VAL any 10 -> 12 of 1400; real SMS English-via-words 13.0% -> 13.4%. EXPLORATORY; eval/chat-register/RESULTS-READER.md.
files changed since the last record: native/adapters/text/language-gate.mjs
