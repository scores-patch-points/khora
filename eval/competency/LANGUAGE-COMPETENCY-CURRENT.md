# Language competency, current (what the canonical read can do, per language)

*Generated 2026-11-28 by `node eval/competency/readiness-board.mjs` from the priors the door serves and the shipped registers. Deterministic. A tier is a statement about pieces on disk and recorded evaluation, not a score.*

Competency is judged by a fixed external giver: the official CorefUD scorer (ufal/corefud-scorer 4fd7b0e) on the CorefUD 1.3 public dev sets, CoNLL F1 over every mention (macro-average per language). The bar (94) is the user's, declared 2026-11-18; it has not been restated for this scale.

**225 languages with a part-of-speech prior:** lexical 221 · reading+pronouns 3 · pronouns 1

## Reading, with pronouns (a register with its recorded evaluation), against the bar

| language | clause reader | precision | coverage | fixed giver (official scorer, CoNLL F1 macro over dev sets) | the 94 bar | our narrow pronoun measure | gold | next |
|---|---|---|---|---|---|---|---|---|
| `eng` | positional (English parser) | 0.915 | 0.636 | 28.2 | short by 65.8 | 0.699 | yes | 28.2 CoNLL F1 on the official scorer (the fixed giver) against the 94 bar; admit referents for: third_person_pronoun, speaker_addressee, nominal (83% of the mentions the giver counts on English-LitBank dev) |
| `fra` | positional (unvalidated for this language) | 0.547 | 0.368 | 14.4 | short by 79.6 | 0.201 | yes | morphology-fra.json (verbs match exactly without it); a clause reader validated for this language (the positional one is English-shaped) |
| `grc` | case-marked (the Chomsky seam: case and pro-drop) | 0.53 | 0.573 | 10.0 | short by 84.0 | 0.277 | yes | pos-grc-unimorph.json is on disk and the read does not load it; 10.0 CoNLL F1 on the official scorer (the fixed giver) against the 94 bar |
| `san` | case-marked (the Chomsky seam: case and pro-drop) | 0.878 | 0.154 | no score | — | 0.135 | no (gold-free) | pos-san-unimorph.json is on disk and the read does not load it; gold coreference for san (the recorded precision is gold-free) |

## Lexical only (a POS prior and nothing the canonical read validates)

`aar` `abk` `ace` `ady` `afr` `aii` `ajg` `aka` `als` `alt` `ame` `ami` `arb` `arn` `ast` `auv` `bam` `ban` `bcl` `bel` `ben` `bho` `bis` `bos` `bre` `buc` `bug` `bul` `cat` `ceb` `ces` `cha` `chk` `chr` `chv` `cjk` `cjs` `ckb` `cmn` `cni` `cnr` `cos` `crh` `crs` `cym` `dan` `deu` `div` `dyu` `ell` `emk` `eml` `en` `epo` `est` `eus` `eve` `evn` `ewe` `fao` `fas` `fij` `fin` `fkv` `flm` `fri` `fur` `gaa` `gag` `gla` `gld` `gle` `glg` `glv` `gsw1` `gug` `guj` `hat` `hau` `haw` `heb` `hil` `hin` `hna` `hrv` `hsb` `hun` `hye` `ido` `ilo` `ina` `ind` `isl` `ita` `jav` `jpn` `kaa` `kal` `kan` `kat` `kaz` `kbd` `kea` `khk` `kir` `kjh` `kmb` `kmr` `koi` `kor` `krl` `lad` `lat` `lav` `lin` `lit` `lld` `lnc` `lot` `ltz` `lug` `lus` `lzh` `mad` `mag` `mah` `mai` `mal` `mar` `min` `mkd` `mlt` `mnw` `mxi` `mya` `nav` `nba` `nbl` `nds` `nep` `nio` `niv` `nld` `nno` `nob` `nya` `ote` `pam` `pan` `pap` `pcd` `pcm` `pes` `pis` `pnb` `pol` `pon` `por` `pov` `prv` `quc` `quy` `quz` `qvm` `qxu` `rmy` `roh` `ron` `rus` `sah` `sco` `shn` `shp` `sin` `skr` `slk` `slr` `slv` `sme` `smo` `sna` `som` `sot` `spa` `src` `srp` `sun` `swb` `swe` `swh` `tam` `tat` `tel` `tet` `tgk` `tgl` `tha` `tly` `tna` `ton` `tsn` `tuk` `tur` `tzc` `uig` `ukr` `ura` `urd` `vec` `vep` `vie` `vmw` `wln` `wol` `wuu` `xho` `yor` `yrk` `yue` `zdj` `zul`

## Pieces on disk, not used by the read

- `fas`: pos-fas-unimorph.json is on disk and the read does not load it
- `grc`: pos-grc-unimorph.json is on disk and the read does not load it
- `jpn`: pos-jpn-unimorph.json is on disk and the read does not load it
- `san`: pos-san-unimorph.json is on disk and the read does not load it

## Never measured here

Mandarin pronouns, Latin, Devanagari-script reading, and per-language gold accuracy for languages that have only coverage numbers (see identity/novels/NOVELS-RESULTS-ROUND20.md and the research notes).


## The sentence shape layer (UD codec rows: roles by kāraka, polarity, question form)

*A second axis beside the read above. 96 languages have a UD codec in the manifest or the priors (79 committed, 17 pointed at because their treebank licence forbids redistribution; this board does not depend on any machine's codec cache). 134 languages have a POS prior and NO UD codec: the shape layer gives them a typed gap. A marker table exists for 2 (elsewhere a role carried by an adposition stays generic); a question adapter for 2. The role map is declared, not measured (no gold with roles).*

Genesis columns: eval/genesis-shape (FRESH, no role gold, 200 verses, reference English-WEB): negation is "tracks" when its per-verse kappa with the reference is above its own permuted null, "not-read" when it is not, "abstain" when the prior carries no negation source; flag = share of sentences parse-consistency flags (it over-fires on prose: see eval/genesis-shape/RESULT.md).

| language | codec | tokenizer | marker table | question adapter | POS prior | Genesis negation (kappa / null bar) | Genesis specific-role share | Genesis flag rate |
|---|---|---|---|---|---|---|---|---|
| `abk` | committed | prior | no | no | yes | not in Genesis | — | — |
| `afr` | committed | prior | no | no | yes | abstain:no-polarity-source | 0.704 | 0.784 |
| `aii` | committed | prior | no | no | yes | not in Genesis | — | — |
| `arb` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 3.0) | built with the codec | no | no | yes | not-read (0 / 0) | 0.659 | 0.497 |
| `auv` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 4.0) | built with the codec | no | no | yes | not in Genesis | — | — |
| `bam` | committed | prior | no | no | yes | not in Genesis | — | — |
| `bel` | committed | prior | no | no | yes | not in Genesis | — | — |
| `ben` | committed | prior | no | no | yes | not in Genesis | — | — |
| `bho` | committed | prior | no | no | yes | not in Genesis | — | — |
| `bre` | committed | prior | no | no | yes | not in Genesis | — | — |
| `bul` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 3.0) | built with the codec | no | no | yes | tracks (0.7 / 0.1) | 0.846 | 0.402 |
| `cat` | committed | prior | no | no | yes | not in Genesis | — | — |
| `ceb` | committed | prior | no | no | yes | tracks (0.65 / 0.11) | 0.77 | 0.973 |
| `ces` | committed | prior | no | no | yes | not-read (-0.01 / 0.13) | 0.743 | 0.639 |
| `cmn` | committed | prior | yes | no | yes | tracks (0.29 / 0.07) | 0.97 | 0.695 |
| `cym` | committed | prior | no | no | yes | not in Genesis | — | — |
| `dan` | committed | prior | no | no | yes | abstain:no-polarity-source | 0.758 | 0.41 |
| `deu` | committed | prior | no | no | yes | tracks (0.65 / 0.11) | 0.799 | 0.496 |
| `eng` | committed | absent, filled by the English adapter | yes | yes | yes | reference (1 / 0.1) | 0.97 | 0.364 |
| `epo` | committed | prior | no | no | yes | abstain:no-polarity-source | 0.825 | 0.855 |
| `est` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 4.0) | built with the codec | no | no | yes | not-read (0.13 / 0.13) | 0.863 | 0.395 |
| `eus` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 3.0) | built with the codec | no | no | yes | not in Genesis | — | — |
| `fao` | committed | prior | no | no | yes | not in Genesis | — | — |
| `fin` | committed | prior | no | no | yes | not-read (0 / 0) | 0.822 | 0.422 |
| `fra` | committed | prior | no | no | yes | tracks (0.53 / 0.1) | 0.716 | 0.633 |
| `gla` | committed | prior | no | no | yes | not in Genesis | — | — |
| `gle` | committed | prior | no | no | yes | not in Genesis | — | — |
| `glg` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 3.0) | built with the codec | no | no | yes | not in Genesis | — | — |
| `glv` | committed | prior | no | no | yes | not in Genesis | — | — |
| `gsw` | committed | prior | no | no | no | not in Genesis | — | — |
| `gug` | committed | prior | no | no | yes | not in Genesis | — | — |
| `guj` | committed | prior | no | no | yes | not in Genesis | — | — |
| `hat` | committed | prior | no | no | yes | tracks (0.51 / 0.1) | 0.797 | 0.471 |
| `hau` | committed | prior | no | no | yes | not in Genesis | — | — |
| `heb` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 4.0) | built with the codec | no | no | yes | tracks (0.7 / 0.1) | 0.749 | 0.61 |
| `hin` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 4.0) | built with the codec | no | no | yes | tracks (0.56 / 0.17) | 0.615 | 0.597 |
| `hrv` | committed | prior | no | no | yes | not in Genesis | — | — |
| `hsb` | committed | prior | no | no | yes | not in Genesis | — | — |
| `hun` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 3.0) | built with the codec | no | no | yes | tracks (0.33 / 0.09) | 0.884 | 0.644 |
| `hye` | committed | prior | no | no | yes | tracks (0.25 / 0.12) | 0.748 | 0.769 |
| `ind` | committed | prior | no | no | yes | not-read (0.09 / 0.09) | 0.826 | 0.274 |
| `isl` | committed | prior | no | no | yes | abstain:no-polarity-source | 0.704 | 0.428 |
| `ita` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 3.0) | built with the codec | no | no | yes | tracks (0.47 / 0.11) | 0.701 | 0.316 |
| `jav` | committed | prior | no | no | yes | not in Genesis | — | — |
| `jpn` | committed | prior | no | no | yes | not-read (0.13 / 0.13) | 0.58 | 0.155 |
| `kat` | committed | prior | no | no | yes | not in Genesis | — | — |
| `kaz` | committed | prior | no | no | yes | not in Genesis | — | — |
| `kir` | committed | prior | no | no | yes | not in Genesis | — | — |
| `koi` | committed | prior | no | no | yes | not in Genesis | — | — |
| `kor` | committed | prior | no | no | yes | not in Genesis | — | — |
| `krl` | committed | prior | no | no | yes | not in Genesis | — | — |
| `lat` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 3.0) | built with the codec | no | no | yes | not in Genesis | — | — |
| `lav` | committed | prior | no | no | yes | not in Genesis | — | — |
| `lij` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (C-UDA 1.0) | built with the codec | no | no | no | not in Genesis | — | — |
| `lit` | committed | prior | no | no | yes | not-read (0.13 / 0.13) | 0.783 | 0.5 |
| `ltz` | committed | prior | no | no | yes | not in Genesis | — | — |
| `mal` | committed | prior | no | no | yes | not-read (0 / 0) | 0.646 | 0.827 |
| `mar` | committed | prior | no | no | yes | abstain:no-polarity-source | 0.473 | 0.376 |
| `mkd` | committed | prior | no | no | yes | not in Genesis | — | — |
| `mlt` | committed | prior | no | no | yes | not in Genesis | — | — |
| `nds` | committed | prior | no | no | yes | not in Genesis | — | — |
| `nep` | committed | prior | no | no | yes | tracks (0.27 / 0.13) | 0.845 | 0.936 |
| `nld` | committed | prior | no | no | yes | not in Genesis | — | — |
| `pan` | committed | prior | no | no | yes | not in Genesis | — | — |
| `pbu` | committed | prior | no | no | no | not in Genesis | — | — |
| `pcm` | committed | prior | no | no | yes | not in Genesis | — | — |
| `pes` | committed | prior | no | no | yes | tracks (0.33 / 0.09) | 0.713 | 0.5 |
| `pol` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 4.0) | built with the codec | no | no | yes | tracks (0.62 / 0.16) | 0.712 | 0.427 |
| `quc` | committed | prior | no | no | yes | not in Genesis | — | — |
| `ron` | committed | prior | no | no | yes | tracks (0.72 / 0.17) | 0.716 | 0.429 |
| `rus` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 4.0) | built with the codec | no | no | yes | tracks (0.68 / 0.12) | 0.722 | 0.369 |
| `sah` | committed | prior | no | no | yes | not in Genesis | — | — |
| `san` | committed | prior | no | no | yes | not in Genesis | — | — |
| `sin` | committed | prior | no | no | yes | not in Genesis | — | — |
| `slk` | committed | prior | no | no | yes | tracks (0.23 / 0.1) | 0.757 | 0.359 |
| `slv` | committed | prior | no | no | yes | tracks (0.56 / 0.17) | 0.768 | 0.441 |
| `sms` | committed | prior | no | no | no | not in Genesis | — | — |
| `spa` | committed | prior | no | yes | yes | tracks (0.62 / 0.1) | 0.722 | 0.349 |
| `swe` | committed | prior | no | no | yes | tracks (0.64 / 0.17) | 0.711 | 0.389 |
| `tam` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 3.0) | built with the codec | no | no | yes | not in Genesis | — | — |
| `tat` | committed | prior | no | no | yes | not in Genesis | — | — |
| `tel` | committed | prior | no | no | yes | abstain:no-polarity-source | 0.917 | 0.813 |
| `tgl` | committed | prior | no | no | yes | tracks (0.42 / 0.14) | 0.588 | 0.991 |
| `tha` | committed | prior | no | no | yes | not in Genesis | — | — |
| `tsn` | committed | prior | no | no | yes | not in Genesis | — | — |
| `tur` | committed | prior | no | no | yes | tracks (0.62 / 0.13) | 0.919 | 0.476 |
| `ukr` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 4.0) | built with the codec | no | no | yes | not in Genesis | — | — |
| `urd` | pointed at: built on the machine that uses it (typed gap codec_not_vendored until then) (CC BY-NC-SA 4.0) | built with the codec | no | no | yes | not in Genesis | — | — |
| `vep` | committed | prior | no | no | yes | not in Genesis | — | — |
| `vie` | committed | prior | no | no | yes | abstain:no-polarity-source | 0.884 | 0.841 |
| `wol` | committed | prior | no | no | yes | not in Genesis | — | — |
| `wuu` | committed | prior | no | no | yes | not in Genesis | — | — |
| `ydd` | committed | prior | no | no | no | not in Genesis | — | — |
| `yor` | committed | prior | no | no | yes | not in Genesis | — | — |
| `yrk` | committed | prior | no | no | yes | not in Genesis | — | — |
| `yue` | committed | prior | no | no | yes | not in Genesis | — | — |

### A POS prior and no UD codec (134)

`aar` `ace` `ady` `ajg` `aka` `als` `alt` `ame` `ami` `arn` `ast` `ban` `bcl` `bis` `bos` `buc` `bug` `cha` `chk` `chr` `chv` `cjk` `cjs` `ckb` `cni` `cnr` `cos` `crh` `crs` `div` `dyu` `ell` `emk` `eml` `en` `eve` `evn` `ewe` `fas` `fij` `fkv` `flm` `fri` `fur` `gaa` `gag` `gld` `grc` `gsw1` `haw` `hil` `hna` `ido` `ilo` `ina` `kaa` `kal` `kan` `kbd` `kea` `khk` `kjh` `kmb` `kmr` `lad` `lin` `lld` `lnc` `lot` `lug` `lus` `lzh` `mad` `mag` `mah` `mai` `min` `mnw` `mxi` `mya` `nav` `nba` `nbl` `nio` `niv` `nno` `nob` `nya` `ote` `pam` `pap` `pcd` `pis` `pnb` `pon` `por` `pov` `prv` `quy` `quz` `qvm` `qxu` `rmy` `roh` `sco` `shn` `shp` `skr` `slr` `sme` `smo` `sna` `som` `sot` `src` `srp` `sun` `swb` `swh` `tet` `tgk` `tly` `tna` `ton` `tuk` `tzc` `uig` `ura` `vec` `vmw` `wln` `xho` `zdj` `zul`