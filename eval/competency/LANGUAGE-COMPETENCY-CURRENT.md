# Language competency, current (what the canonical read can do, per language)

*Generated 2026-11-18 by `node eval/competency/readiness-board.mjs` from the priors the door serves and the shipped registers. Deterministic. A tier is a statement about pieces on disk and recorded evaluation, not a score.*

A language is COMPETENT when at least 94% of the answerable third-person pronouns of held-out gold coreference are resolved correctly (the bar is the user's, declared 2026-11-18).

**225 languages with a part-of-speech prior:** lexical 221 · reading+pronouns 3 · pronouns 1

## Reading, with pronouns (a register with its recorded evaluation), against the bar

| language | clause reader | precision | coverage | resolved correctly (precision x coverage) | the 94% bar | gold | next |
|---|---|---|---|---|---|---|---|
| `eng` | positional (English parser) | 0.915 | 0.636 | 0.699 | short by 0.241 | yes | 70% of answerable pronouns resolved correctly against the 94% bar |
| `fra` | positional (unvalidated for this language) | 0.547 | 0.368 | 0.201 | short by 0.739 | yes | morphology-fra.json (verbs match exactly without it); a clause reader validated for this language (the positional one is English-shaped) |
| `grc` | case-marked (the Chomsky seam: case and pro-drop) | 0.53 | 0.573 | 0.277 | short by 0.663 | yes | pos-grc-unimorph.json is on disk and the read does not load it; 28% of answerable pronouns resolved correctly against the 94% bar |
| `san` | case-marked (the Chomsky seam: case and pro-drop) | 0.878 | 0.154 | 0.135 | short by 0.805 | no (gold-free) | pos-san-unimorph.json is on disk and the read does not load it; gold coreference for san (the recorded precision is gold-free) |

## Lexical only (a POS prior and nothing the canonical read validates)

`aar` `abk` `ace` `ady` `afr` `aii` `ajg` `aka` `als` `alt` `ame` `ami` `arb` `arn` `ast` `auv` `bam` `ban` `bcl` `bel` `ben` `bho` `bis` `bos` `bre` `buc` `bug` `bul` `cat` `ceb` `ces` `cha` `chk` `chr` `chv` `cjk` `cjs` `ckb` `cmn` `cni` `cnr` `cos` `crh` `crs` `cym` `dan` `deu` `div` `dyu` `ell` `emk` `eml` `en` `epo` `est` `eus` `eve` `evn` `ewe` `fao` `fas` `fij` `fin` `fkv` `flm` `fri` `fur` `gaa` `gag` `gla` `gld` `gle` `glg` `glv` `gsw1` `gug` `guj` `hat` `hau` `haw` `heb` `hil` `hin` `hna` `hrv` `hsb` `hun` `hye` `ido` `ilo` `ina` `ind` `isl` `ita` `jav` `jpn` `kaa` `kal` `kan` `kat` `kaz` `kbd` `kea` `khk` `kir` `kjh` `kmb` `kmr` `koi` `kor` `krl` `lad` `lat` `lav` `lin` `lit` `lld` `lnc` `lot` `ltz` `lug` `lus` `lzh` `mad` `mag` `mah` `mai` `mal` `mar` `min` `mkd` `mlt` `mnw` `mxi` `mya` `nav` `nba` `nbl` `nds` `nep` `nio` `niv` `nld` `nno` `nob` `nya` `ote` `pam` `pan` `pap` `pcd` `pcm` `pes` `pis` `pnb` `pol` `pon` `por` `pov` `prv` `quc` `quy` `quz` `qvm` `qxu` `rmy` `roh` `ron` `rus` `sah` `sco` `shn` `shp` `sin` `skr` `slk` `slr` `slv` `sme` `smo` `sna` `som` `sot` `spa` `src` `srp` `sun` `swb` `swe` `swh` `tam` `tat` `tel` `tet` `tgk` `tgl` `tha` `tly` `tna` `ton` `tsn` `tuk` `tur` `tzc` `uig` `ukr` `ura` `urd` `vec` `vep` `vie` `vmw` `wln` `wol` `wuu` `xho` `yor` `yrk` `yue` `zdj` `zul`

## Pieces on disk, not used by the read

- `fas`: pos-fas-unimorph.json is on disk and the read does not load it
- `grc`: pos-grc-unimorph.json is on disk and the read does not load it
- `jpn`: pos-jpn-unimorph.json is on disk and the read does not load it
- `san`: pos-san-unimorph.json is on disk and the read does not load it

## Never measured here

Mandarin pronouns, Latin, Devanagari-script reading, and per-language gold accuracy for languages that have only coverage numbers (see identity/novels/NOVELS-RESULTS-ROUND20.md and the research notes).
