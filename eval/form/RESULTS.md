# FORM results (eval/form) — 2026-10-24T04:23:51.758Z

PREREG.md sha256: 8690bcf2ee2cc0dcf0d23d9542052e383ff02b824f65ce07ba7cf8c878504b5f

Parameters: {"k":2,"minTerm":4,"newTerms":2,"pieceShare":1,"corpusShare":0.5,"minParts":3,"minPartWords":15,"titleWords":[2,12],"shuffles":200,"order":"exhaustive","maxExhaustive":8}

## Skeleton: essay (n=15, shaped=15, segmenter=prose, segmented={"heading":15}, furniture terms=254, parts per piece median 7 IQR [6,13])

| role | recurrence (pieces / shaped) | share | words median | words IQR | rule |
|---|---|---|---|---|---|
| opens | 15 / 15 | 1 | 175 | [132,298] | >= 1 term of the first part returns in >= 2 later parts |
| develops | 8 / 15 | 0.533 | 364 | [195,528] | every middle part introduces >= 1 new term a later part returns to (middle parts with a new returning term: 95 / 104) |
| closes | 13 / 15 | 0.867 | 223 | [172,357] | the last part shares >= 1 term with the first (strict: more than the middle parts do on average) (strict: 7) |

Per piece (by, parts, opens / develops-new-per-part / closes-shared, words per part):

- WHAT-THE-FOLD-IS-BECOMING-ESSAY.md: heading, 10 parts, opens true (26 terms), develops [25,23,98,102,23,10,14,2], closes true (5 shared, strict false); words [154,134,181,560,1404,608,574,1637,697,240]
- WIKTIONARY-HOLOGRAPH-HYPERLEXICON-ESSAY.md: heading, 12 parts, opens true (8 terms), develops [20,22,54,74,63,27,33,35,1,0], closes true (4 shared, strict true); words [79,102,166,349,571,527,581,823,1215,484,168,524]
- OPENCODE-X-THE-FOLD-ESSAY.md: heading, 13 parts, opens true (4 terms), develops [21,52,68,15,41,16,7,8,4,0,2], closes false (0 shared, strict false); words [44,92,423,890,238,476,377,311,236,453,379,389,340]
- THE-FOLD-PRIOR-ART-ESSAY.md: heading, 17 parts, opens true (10 terms), develops [9,10,60,19,47,28,38,30,40,3,8,8,3,8,0], closes true (6 shared, strict true); words [93,81,130,434,336,376,408,338,351,620,196,188,173,230,245,180,618]
- penelope/gym/composed/the-weight-of-witness.md: heading, 15 parts, opens true (27 terms), develops [39,35,30,18,25,7,14,10,2,2,2,3,2], closes true (11 shared, strict true); words [338,361,338,360,364,553,340,326,475,279,258,520,439,390,373]
- penelope/gym/composed/the-mirror-ages.md: heading, 7 parts, opens true (6 terms), develops [99,50,20,3,0], closes false (0 shared, strict false); words [126,1162,816,1115,534,264,223]
- penelope/gym/composed/the-verge-of-being.md: heading, 13 parts, opens true (8 terms), develops [10,6,9,7,6,5,2,3,1,2,0], closes true (5 shared, strict true); words [157,146,157,103,91,81,90,132,129,137,109,282,215]
- penelope/gym/composed/sea-turtles-essay.md: heading, 5 parts, opens true (13 terms), develops [24,13,4], closes true (14 shared, strict true); words [179,365,265,363,185]
- penelope/gym/composed/sea-turtles-essay-gemma.md: heading, 5 parts, opens true (33 terms), develops [47,21,25], closes true (40 shared, strict true); words [325,532,486,455,770]
- penelope/gym/composed/sea-turtles-cited.md: heading, 6 parts, opens true (26 terms), develops [46,36,21,3], closes true (7 shared, strict false); words [274,396,383,411,690,159]
- penelope/gym/composed/sea-turtles-predictive.md: heading, 6 parts, opens true (37 terms), develops [98,32,15,6], closes true (7 shared, strict false); words [322,967,392,835,631,140]
- CONCEPTS-FROM-PARALLEL-STRUCTURE.md: heading, 10 parts, opens true (23 terms), develops [10,28,18,6,7,3,0,0], closes true (12 shared, strict true); words [175,104,419,253,170,339,192,68,41,204]
- HYPERLEXICON-IDENTITY-DEFINITION.md: heading, 5 parts, opens true (16 terms), develops [6,25,2], closes true (8 shared, strict false); words [519,365,526,602,228]
- fold-suite/reports/BAYESIAN-SURPRISE-BY-RUNG.md: heading, 6 parts, opens true (29 terms), develops [122,107,0,0], closes true (2 shared, strict false); words [201,891,3366,256,278,116]
- eo-teachings/research/non-western-coding-paradigms-fit.md: heading, 4 parts, opens true (8 terms), develops [39,22], closes true (8 shared, strict false); words [138,257,1183,157]

## Skeleton: readme (n=97, shaped=91, segmenter=prose, segmented={"heading":92,"recurrence":5}, furniture terms=16, parts per piece median 5 IQR [4,7])

| role | recurrence (pieces / shaped) | share | words median | words IQR | rule |
|---|---|---|---|---|---|
| opens | 73 / 91 | 0.802 | 75 | [37,117] | >= 1 term of the first part returns in >= 2 later parts |
| develops | 36 / 91 | 0.396 | 137 | [66,267] | every middle part introduces >= 1 new term a later part returns to (middle parts with a new returning term: 317 / 398) |
| closes | 65 / 91 | 0.714 | 59 | [10,155] | the last part shares >= 1 term with the first (strict: more than the middle parts do on average) (strict: 31) |

Per piece (by, parts, opens / develops-new-per-part / closes-shared, words per part):

- Alhazen/README.md: heading, 4 parts, opens true (6 terms), develops [6,1], closes true (4 shared, strict false); words [75,70,126,58]
- EO-terminal/README.md: heading, 9 parts, opens true (14 terms), develops [58,16,9,12,3,2,2], closes true (8 shared, strict true); words [84,282,142,211,292,91,99,94,94]
- EO-terminal/grounding/datasets/README.md: heading, 4 parts, opens true (1 terms), develops [1,0], closes true (5 shared, strict true); words [53,123,88,22]
- EO-terminal/grounding/prior-art/README.md: recurrence, 3 parts, opens false (0 terms), develops [4], closes true (6 shared, strict true); words [32,41,292]
- Zenodotus/09-source-code/BurntSushi_ripgrep/README.md: heading, 14 parts, opens true (20 terms), develops [11,42,37,11,8,1,4,16,0,0,0,0], closes true (2 shared, strict false); words [87,30,701,353,177,158,65,31,771,324,28,39,28,26]
- Zenodotus/09-source-code/README.md: recurrence, 2 parts, 2 part(s): no shape to read; words [40,399]
- Zenodotus/09-source-code/apache_spark/README.md: heading, 11 parts, opens true (9 terms), develops [5,0,11,8,0,2,2,1,0], closes true (2 shared, strict false); words [89,24,390,61,31,32,110,41,71,18,18]
- Zenodotus/09-source-code/astral-sh_ruff/README.md: heading, 7 parts, opens true (23 terms), develops [1,1,14,3,1], closes true (93 shared, strict true); words [526,19,20,308,30,19,915]
- Zenodotus/09-source-code/aws_s2n-tls/README.md: heading, 3 parts, opens false (0 terms), develops [3], closes true (17 shared, strict true); words [83,16,1217]
- Zenodotus/09-source-code/clovenbradshaw_bare-metal-eo-matrix-app/README.md: heading, 12 parts, opens true (31 terms), develops [11,26,25,4,17,17,3,2,0,0], closes true (8 shared, strict false); words [188,92,259,224,67,278,508,176,171,67,35,59]
- Zenodotus/09-source-code/denoland_deno/README.md: heading, 5 parts, opens true (6 terms), develops [8,2,0], closes true (9 shared, strict true); words [60,92,72,50,43]
- Zenodotus/09-source-code/ggerganov_llama.cpp/README.md: heading, 7 parts, opens true (8 terms), develops [2,16,2,0,0], closes true (4 shared, strict false); words [36,107,145,118,38,49,67]
- Zenodotus/09-source-code/microsoft_TypeScript/README.md: heading, 4 parts, opens true (2 terms), develops [0,1], closes true (3 shared, strict false); words [77,21,176,24]
- Zenodotus/09-source-code/rails_rails/README.md: heading, 8 parts, opens true (6 terms), develops [12,14,2,0,4,0], closes false (0 shared, strict false); words [46,86,64,81,125,110,72,9]
- Zenodotus/09-source-code/sharkdp_bat/README.md: heading, 8 parts, opens true (76 terms), develops [68,49,17,0,2,0], closes true (25 shared, strict false); words [804,830,912,787,228,581,16,155]
- Zenodotus/09-source-code/signalapp_libsignal/README.md: heading, 4 parts, opens true (8 terms), develops [33,1], closes true (7 shared, strict false); words [305,970,145,147]
- Zenodotus/09-source-code/sqlite_sqlite/README.md: heading, 11 parts, opens true (17 terms), develops [34,7,6,24,43,7,43,4,1], closes true (1 shared, strict false); words [75,149,70,60,189,351,231,960,642,157,40]
- Zenodotus/09-source-code/tiangolo_fastapi/README.md: heading, 13 parts, opens true (32 terms), develops [20,17,1,1,7,0,8,34,14,1,0], closes true (1 shared, strict false); words [221,174,184,34,23,45,19,56,354,954,37,234,11]
- Zenodotus/11-multi-language/parallel-classics/README.md: heading, 4 parts, opens true (1 terms), develops [0,1], closes true (6 shared, strict true); words [122,104,44,39]
- Zenodotus/19-organic-community/README.md: recurrence, 2 parts, 2 part(s): no shape to read; words [63,358]
- Zenodotus/20-first-person-voices/README.md: heading, 4 parts, opens true (7 terms), develops [32,4], closes true (13 shared, strict true); words [91,636,266,104]
- Zenodotus/README.md: heading, 3 parts, opens false (0 terms), develops [0], closes true (38 shared, strict true); words [1568,18,400]
- Zenodotus/derived-priors/README.md: heading, 7 parts, opens true (14 terms), develops [30,31,11,3,2], closes true (6 shared, strict false); words [110,164,680,267,173,119,123]
- Zenodotus/derived-priors/alias-priors/README.md: heading, 5 parts, opens true (2 terms), develops [14,16,2], closes true (1 shared, strict false); words [35,172,243,67,100]
- Zenodotus/derived-priors/concern-priors/README.md: heading, 8 parts, opens true (6 terms), develops [14,13,17,18,1,1], closes true (3 shared, strict true); words [43,93,99,146,205,31,120,37]
- Zenodotus/derived-priors/display-priors/README.md: heading, 4 parts, opens false (0 terms), develops [16,0], closes false (0 shared, strict false); words [47,228,38,45]
- Zenodotus/derived-priors/identity-priors/README.md: heading, 5 parts, opens true (18 terms), develops [8,4,0], closes true (10 shared, strict false); words [113,122,317,55,65]
- Zenodotus/derived-priors/socrates-priors/README.md: heading, 6 parts, opens true (2 terms), develops [31,3,0,1], closes false (0 shared, strict false); words [81,123,162,140,56,34]
- Zenodotus/derived-priors/typography-priors/README.md: heading, 5 parts, opens true (6 terms), develops [26,9,0], closes true (4 shared, strict false); words [56,312,135,151,60]
- Zenodotus/derived-priors/vision-priors/README.md: heading, 5 parts, opens true (5 terms), develops [2,1,0], closes true (1 shared, strict false); words [123,73,64,50,5]
- Zenodotus/pointers/README.md: heading, 5 parts, opens true (7 terms), develops [11,1,2], closes true (9 shared, strict true); words [107,149,54,55,221]
- Zenodotus/scripts/udhr-core/README.md: heading, 4 parts, opens true (23 terms), develops [74,7], closes true (39 shared, strict true); words [184,794,114,2414]
- ai-guard/README.md: heading, 8 parts, opens true (4 terms), develops [37,1,1,2,0,0], closes true (1 shared, strict false); words [71,606,54,31,20,67,37,35]
- data/unimorph/afb/README.md: heading, 4 parts, opens true (3 terms), develops [6,0], closes false (0 shared, strict false); words [48,288,121,9]
- data/unimorph/ail/README.md: heading, 4 parts, opens true (3 terms), develops [14,0], closes false (0 shared, strict false); words [24,19,263,8]
- data/unimorph/ame/README.md: heading, 3 parts, opens false (0 terms), develops [0], closes false (0 shared, strict false); words [25,266,9]
- data/unimorph/amh/README.md: heading, 4 parts, opens true (2 terms), develops [17,1], closes true (3 shared, strict true); words [31,457,257,440]
- data/unimorph/ara/README.md: heading, 5 parts, opens true (4 terms), develops [14,0,0], closes false (0 shared, strict false); words [76,409,87,362,9]
- data/unimorph/arz/README.md: heading, 4 parts, opens true (3 terms), develops [6,0], closes false (0 shared, strict false); words [50,274,119,9]
- data/unimorph/aym/README.md: heading, 3 parts, opens false (0 terms), develops [0], closes false (0 shared, strict false); words [23,1417,9]
- data/unimorph/bra/README.md: heading, 3 parts, opens false (0 terms), develops [0], closes false (0 shared, strict false); words [1979,49,9]
- data/unimorph/ckb/README.md: heading, 7 parts, opens true (7 terms), develops [9,0,3,0,0], closes false (0 shared, strict false); words [84,186,158,20,134,312,8]
- data/unimorph/ckt/README.md: heading, 4 parts, opens true (1 terms), develops [13,0], closes false (0 shared, strict false); words [38,16,268,8]
- data/unimorph/cni/README.md: heading, 4 parts, opens true (3 terms), develops [6,0], closes false (0 shared, strict false); words [23,15,284,9]
- data/unimorph/evn/README.md: heading, 3 parts, opens false (0 terms), develops [0], closes false (0 shared, strict false); words [29,318,8]
- data/unimorph/gup/README.md: heading, 3 parts, opens false (0 terms), develops [0], closes false (0 shared, strict false); words [21,453,9]
- data/unimorph/heb/README.md: heading, 2 parts, 2 part(s): no shape to read; words [48,252]
- data/unimorph/hsb/README.md: heading, 2 parts, 2 part(s): no shape to read; words [75,301]
- data/unimorph/ind/README.md: heading, 4 parts, opens false (0 terms), develops [0,0], closes false (0 shared, strict false); words [22,210,252,9]
- data/unimorph/kod/README.md: heading, 3 parts, opens false (0 terms), develops [0], closes false (0 shared, strict false); words [96,258,9]
- data/unimorph/mag/README.md: heading, 4 parts, opens false (0 terms), develops [0,0], closes false (0 shared, strict false); words [15,66,1136,9]
- data/unimorph/see/README.md: heading, 4 parts, opens false (0 terms), develops [5,0], closes false (0 shared, strict false); words [23,25,252,9]
- data/unimorph/shp/README.md: heading, 4 parts, opens false (0 terms), develops [12,0], closes false (0 shared, strict false); words [20,20,265,9]
- data/unimorph/sjo/README.md: heading, 4 parts, opens false (0 terms), develops [15,0], closes false (0 shared, strict false); words [34,19,301,8]
- data/unimorph/syc/README.md: heading, 4 parts, opens true (1 terms), develops [1,2], closes false (0 shared, strict false); words [15,94,27,252]
- data/unimorph/ud-compatibility/README.md: heading, 3 parts, opens false (0 terms), develops [10], closes true (24 shared, strict true); words [204,48,229]
- data/unimorph/umLabeller/README.md: heading, 5 parts, opens true (4 terms), develops [1,1,0], closes true (4 shared, strict true); words [148,59,34,15,35]
- data/unimorph/vro/README.md: heading, 4 parts, opens false (0 terms), develops [15,0], closes false (0 shared, strict false); words [27,19,310,8]
- data/unimorph/wiktionary-tools/README.md: heading, 4 parts, opens true (3 terms), develops [7,13], closes true (3 shared, strict true); words [21,16,178,437]
- eodb/README.md: heading, 11 parts, opens true (25 terms), develops [11,23,22,3,14,6,2,0,1], closes true (10 shared, strict false); words [188,92,259,273,67,278,176,171,67,35,83]
- fold-door-cf/README.md: heading, 7 parts, opens true (7 terms), develops [24,24,9,14,10], closes true (3 shared, strict false); words [47,105,78,103,78,247,255]
- fold-door-cf/build/README.md: heading, 16 parts, opens true (16 terms), develops [75,49,88,31,20,8,17,0,24,85,2,1,1,0], closes true (6 shared, strict true); words [71,337,199,530,302,123,34,95,31,127,4553,312,126,153,39,278]
- fold-door-cf/build/claude-code/README.md: heading, 4 parts, opens true (1 terms), develops [16,0], closes false (0 shared, strict false); words [25,161,101,29]
- fold-extract/holodeck/README.md: heading, 22 parts, opens true (44 terms), develops [25,32,86,45,22,25,15,12,10,9,15,3,2,3,12,11,7,1,0,0], closes true (11 shared, strict true); words [165,133,156,603,216,225,227,262,99,167,254,360,154,39,194,91,408,579,201,68,46,198]
- fold-extract/holodeck/extension/README.md: heading, 5 parts, opens true (8 terms), develops [4,3,1], closes true (9 shared, strict true); words [159,64,101,92,73]
- fold-suite/cron/README.md: heading, 6 parts, opens true (10 terms), develops [19,1,1,3], closes true (12 shared, strict true); words [88,291,54,36,65,114]
- foldcode-next/README.md: heading, 6 parts, opens true (6 terms), develops [11,7,3,0], closes true (4 shared, strict false); words [43,90,55,65,94,39]
- foldcode/README.md: heading, 4 parts, opens false (0 terms), develops [7,2], closes true (4 shared, strict true); words [120,144,59,184]
- foldcode/github/README.md: heading, 5 parts, opens true (5 terms), develops [15,15,1], closes true (4 shared, strict true); words [26,177,153,18,229]
- foldcode/packages/ai/README.md: heading, 21 parts, opens true (154 terms), develops [31,24,64,30,30,7,27,74,29,23,3,8,26,11,4,1,0,0,3], closes true (4 shared, strict false); words [619,175,213,448,419,395,230,450,1481,691,593,470,275,388,1255,336,578,122,41,37,25]
- foldcode/packages/app/README.md: heading, 4 parts, opens true (1 terms), develops [9,26], closes true (3 shared, strict false); words [50,71,231,511]
- foldcode/packages/codemode/README.md: heading, 7 parts, opens true (13 terms), develops [21,15,24,6,0], closes true (5 shared, strict false); words [114,99,94,469,240,70,110]
- foldcode/packages/desktop/README.md: heading, 2 parts, 2 part(s): no shape to read; words [224,431]
- foldcode/packages/gui-extensions/README.md: heading, 11 parts, opens true (44 terms), develops [63,138,33,22,20,13,12,2,10], closes true (40 shared, strict true); words [174,290,1072,347,580,302,423,653,200,201,1823]
- foldcode/packages/http-recorder/README.md: heading, 12 parts, opens true (12 terms), develops [12,31,26,28,2,5,1,0,0,0], closes false (0 shared, strict false); words [57,55,168,134,385,38,180,115,36,42,113,1]
- foldcode/packages/httpapi-codegen/README.md: recurrence, 4 parts, opens true (5 terms), develops [5,19], closes true (10 shared, strict true); words [19,33,116,412]
- foldcode/packages/plugin-browser/README.md: heading, 6 parts, opens true (16 terms), develops [28,2,18,5], closes true (13 shared, strict true); words [91,121,33,213,309,155]
- foldcode/packages/sdk/README.md: heading, 4 parts, opens true (11 terms), develops [30,2], closes true (7 shared, strict false); words [124,495,126,185]
- foldcode/services/files/README.md: heading, 6 parts, opens true (6 terms), develops [17,23,4,1], closes true (3 shared, strict false); words [75,124,156,233,114,55]
- foldcode/services/update/README.md: heading, 6 parts, opens true (13 terms), develops [20,29,10,0], closes true (9 shared, strict true); words [40,63,224,284,155,125]
- heimdall/README.md: heading, 15 parts, opens true (51 terms), develops [107,26,19,19,6,1,6,0,3,2,3,2,0], closes true (6 shared, strict false); words [202,1230,285,148,319,151,58,332,90,98,119,60,373,41,47]
- holodeck-samples/README.md: recurrence, 1 parts, 1 part(s): no shape to read; words [448]
- holodeck/tools/cf-captions/README.md: heading, 5 parts, opens true (3 terms), develops [6,7,0], closes true (3 shared, strict false); words [65,69,49,121,41]
- hyphae/README.md: heading, 13 parts, opens true (15 terms), develops [6,10,26,28,8,6,0,0,0,2,0], closes false (0 shared, strict false); words [158,46,102,157,280,113,82,94,56,64,102,20,3]
- hyphae/extension/README.md: heading, 8 parts, opens true (13 terms), develops [16,1,7,8,2,1], closes true (7 shared, strict true); words [103,132,31,84,159,75,78,68]
- hyphae/platform/README.md: heading, 4 parts, opens true (5 terms), develops [8,4], closes true (6 shared, strict true); words [102,62,264,110]
- identity-src/README.md: heading, 6 parts, opens true (8 terms), develops [6,10,0,1], closes true (6 shared, strict true); words [36,117,73,17,91,82]
- khora-polyglot-session-2026-10-05/README.md: heading, 7 parts, opens true (11 terms), develops [11,24,7,1,0], closes true (2 shared, strict false); words [100,62,288,177,101,63,49]
- mnemosyne-charters/README.md: heading, 4 parts, opens true (8 terms), develops [9,8], closes true (6 shared, strict false); words [371,96,885,61]
- mnemosyne/README.md: heading, 4 parts, opens true (8 terms), develops [8,7], closes true (6 shared, strict false); words [371,96,771,61]
- penelope.pre-vault-20261020-133905/README.md: heading, 7 parts, opens true (10 terms), develops [61,28,10,2,1], closes true (4 shared, strict false); words [71,236,2745,379,56,235,117]
- scores-patch-points/README.md: heading, 11 parts, opens true (21 terms), develops [46,65,40,19,28,10,0,1,0], closes true (17 shared, strict true); words [101,293,224,320,222,701,149,72,247,154,217]
- the-fold-numeral/README.md: heading, 13 parts, opens true (19 terms), develops [49,71,14,27,10,11,2,2,4,1,0], closes true (2 shared, strict false); words [83,194,599,139,372,158,278,220,116,87,410,82,50]
- the-fold-numeral/eval/README.md: heading, 6 parts, opens true (6 terms), develops [40,11,4,3], closes true (4 shared, strict false); words [31,202,104,142,207,152]
- the-fold-numeral/experiments/mind-wandering/README.md: heading, 6 parts, opens true (9 terms), develops [38,15,2,0], closes true (4 shared, strict false); words [67,312,279,116,38,198]
- the-fold-numeral/experiments/specimen-assembly/README.md: heading, 6 parts, opens true (5 terms), develops [34,23,22,3], closes true (2 shared, strict false); words [57,158,163,240,670,82]
- udhr-core/README.md: heading, 4 parts, opens true (12 terms), develops [86,7], closes true (22 shared, strict true); words [97,794,114,2414]

## Skeleton: table (n=85, shaped=85, segmenter=table, segmented={"table":85}, furniture terms=0, parts per piece median 9 IQR [6,12])

| role | recurrence (pieces / shaped) | share | words median | words IQR | rule |
|---|---|---|---|---|---|
| opens | 13 / 85 | 0.153 | 6 | [5,8] | >= 1 term of the first part returns in >= 2 later parts |
| develops | 4 / 85 | 0.047 | 7 | [5,14] | every middle part introduces >= 1 new term a later part returns to (middle parts with a new returning term: 394 / 1299) |
| closes | 13 / 85 | 0.153 | 11 | [8,20] | the last part shares >= 1 term with the first (strict: more than the middle parts do on average) (strict: 11) |

Per piece (by, parts, opens / develops-new-per-part / closes-shared, words per part):

- WHAT-THE-FOLD-IS-BECOMING-ESSAY.md#table1: table, 6 parts, opens false (0 terms), develops [5,1,0,0], closes false (0 shared, strict false); words [3,45,24,17,17,26]
- WHAT-THE-FOLD-IS-BECOMING-ESSAY.md#table2: table, 17 parts, opens true (1 terms), develops [12,6,5,7,6,4,1,2,6,3,3,0,0,2,0], closes true (1 shared, strict true); words [8,99,45,43,54,68,50,42,40,70,38,74,41,40,73,41,85]
- WIKTIONARY-HOLOGRAPH-HYPERLEXICON-ESSAY.md#table3: table, 28 parts, opens false (0 terms), develops [1,4,2,2,0,1,0,0,0,1,0,0,1,0,0,4,1,0,0,0,0,0,0,0,0,0], closes false (0 shared, strict false); words [11,11,15,14,13,13,14,14,17,16,11,13,18,9,10,11,20,11,19,12,24,18,17,14,20,15,20,24]
- OPENCODE-X-THE-FOLD-ESSAY.md#table4: table, 6 parts, opens true (1 terms), develops [3,0,0,0], closes false (0 shared, strict false); words [5,14,13,14,6,10]
- THE-FOLD-PRIOR-ART-ESSAY.md#table5: table, 35 parts, opens false (0 terms), develops [1,0,0,1,1,0,0,0,1,0,1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,1,0,1,0,0,0,0,0], closes false (0 shared, strict false); words [11,10,10,15,12,11,10,14,13,9,13,11,21,18,16,17,16,9,10,23,21,17,19,22,19,17,19,23,14,19,19,13,22,11,23]
- penelope/gym/composed/the-mirror-ages.md#table6: table, 17 parts, opens false (0 terms), develops [0,0,0,1,0,2,2,0,0,0,0,0,1,0,0], closes false (0 shared, strict false); words [7,12,11,9,12,13,13,9,12,11,11,9,9,13,10,14,13]
- CONCEPTS-FROM-PARALLEL-STRUCTURE.md#table7: table, 6 parts, opens false (0 terms), develops [2,1,1,0], closes false (0 shared, strict false); words [5,23,22,10,10,21]
- CONCEPTS-FROM-PARALLEL-STRUCTURE.md#table8: table, 9 parts, opens false (0 terms), develops [16,3,5,1,2,7,3], closes false (0 shared, strict false); words [1,59,59,27,49,19,40,49,52]
- CONCEPTS-FROM-PARALLEL-STRUCTURE.md#table9: table, 5 parts, opens false (0 terms), develops [1,0,0], closes false (0 shared, strict false); words [14,17,18,23,23]
- HYPERLEXICON-IDENTITY-DEFINITION.md#table10: table, 6 parts, opens false (0 terms), develops [0,1,1,1], closes false (0 shared, strict false); words [5,17,15,13,15,21]
- HYPERLEXICON-IDENTITY-DEFINITION.md#table11: table, 9 parts, opens true (2 terms), develops [3,3,0,0,1,0,0], closes true (1 shared, strict false); words [7,23,14,13,21,19,16,19,20]
- HYPERLEXICON-IDENTITY-DEFINITION.md#table12: table, 5 parts, opens false (0 terms), develops [1,3,0], closes false (0 shared, strict false); words [7,21,49,40,49]
- fold-suite/reports/BAYESIAN-SURPRISE-BY-RUNG.md#table13: table, 12 parts, opens true (3 terms), develops [19,4,6,9,1,5,3,1,0,0], closes true (2 shared, strict true); words [13,73,45,51,94,64,93,43,26,30,18,116]
- Alhazen/README.md#table14: table, 8 parts, opens false (0 terms), develops [0,1,2,1,0,2], closes false (0 shared, strict false); words [5,19,14,14,21,7,15,14]
- EO-terminal/README.md#table15: table, 7 parts, opens false (0 terms), develops [4,0,1,2,0], closes true (1 shared, strict true); words [7,10,10,14,11,12,16]
- EO-terminal/grounding/prior-art/README.md#table16: table, 12 parts, opens false (0 terms), develops [2,3,0,0,0,2,0,0,0,0], closes false (0 shared, strict false); words [6,17,18,16,16,16,12,14,11,11,11,11]
- Zenodotus/09-source-code/BurntSushi_ripgrep/README.md#table17: table, 9 parts, opens false (0 terms), develops [2,2,6,0,0,0,0], closes false (0 shared, strict false); words [8,12,11,14,12,14,15,16,10]
- Zenodotus/09-source-code/BurntSushi_ripgrep/README.md#table18: table, 5 parts, opens false (0 terms), develops [1,1,2], closes false (0 shared, strict false); words [8,9,10,12,13]
- Zenodotus/09-source-code/README.md#table19: table, 12 parts, opens false (0 terms), develops [3,1,0,0,0,2,0,0,0,0], closes false (0 shared, strict false); words [6,13,10,9,7,10,9,12,8,8,7,9]
- Zenodotus/09-source-code/apache_spark/README.md#table20: table, 64 parts, opens true (1 terms), develops [8,0,0,1,0,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,3,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0], closes true (1 shared, strict true); words [3,5,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,5,3,3,3,3,3,3,3,5,3,3,3,3,3,3,3,3,5,3,3,3,3,3,3,3,3,5,3,3,3,3,3,3,3,5,3,3]
- Zenodotus/09-source-code/aws_s2n-tls/README.md#table21: table, 9 parts, opens false (0 terms), develops [1,0,1,0,4,1,0], closes false (0 shared, strict false); words [5,4,4,5,4,4,4,4,6]
- Zenodotus/09-source-code/aws_s2n-tls/README.md#table22: table, 5 parts, opens false (0 terms), develops [1,1,0], closes false (0 shared, strict false); words [6,6,4,3,4]
- Zenodotus/09-source-code/clovenbradshaw_bare-metal-eo-matrix-app/README.md#table23: table, 10 parts, opens false (0 terms), develops [2,0,2,0,0,0,0,0], closes true (1 shared, strict true); words [7,8,8,15,13,11,11,13,12,11]
- Zenodotus/09-source-code/ggerganov_llama.cpp/README.md#table24: table, 18 parts, opens true (1 terms), develops [2,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0], closes false (0 shared, strict false); words [4,3,3,4,4,4,5,7,5,4,4,9,3,4,4,3,3,4]
- Zenodotus/09-source-code/sharkdp_bat/README.md#table25: table, 5 parts, opens false (0 terms), develops [3,1,0], closes false (0 shared, strict false); words [3,9,6,10,6]
- Zenodotus/09-source-code/sharkdp_bat/README.md#table26: table, 9 parts, opens false (0 terms), develops [1,2,2,1,3,0,0], closes false (0 shared, strict false); words [3,6,5,7,8,14,7,9,9]
- Zenodotus/11-multi-language/parallel-classics/README.md#table27: table, 8 parts, opens false (0 terms), develops [1,0,2,0,0,0], closes false (0 shared, strict false); words [5,12,11,12,11,12,14,10]
- Zenodotus/19-organic-community/README.md#table28: table, 6 parts, opens false (0 terms), develops [7,1,0,0], closes false (0 shared, strict false); words [11,33,28,21,22,18]
- Zenodotus/20-first-person-voices/README.md#table29: table, 11 parts, opens false (0 terms), develops [3,2,2,0,0,1,0,1,0], closes false (0 shared, strict false); words [9,20,22,20,18,25,15,17,15,17,21]
- Zenodotus/README.md#table30: table, 29 parts, opens false (0 terms), develops [3,1,3,5,3,2,1,0,3,1,5,5,2,0,6,1,0,3,0,0,3,6,1,1,2,1,0], closes false (0 shared, strict false); words [3,8,7,8,22,9,11,31,17,25,10,48,32,36,23,52,39,35,19,18,39,48,88,74,33,84,53,32,59]
- Zenodotus/derived-priors/README.md#table31: table, 8 parts, opens false (0 terms), develops [1,0,0,0,0,0], closes false (0 shared, strict false); words [12,9,9,9,10,12,12,18]
- Zenodotus/derived-priors/alias-priors/README.md#table32: table, 9 parts, opens false (0 terms), develops [0,0,0,0,0,0,0], closes false (0 shared, strict false); words [7,9,7,7,10,7,7,7,7]
- Zenodotus/derived-priors/concern-priors/README.md#table33: table, 5 parts, opens false (0 terms), develops [7,0,1], closes false (0 shared, strict false); words [5,16,16,33,18]
- Zenodotus/derived-priors/socrates-priors/README.md#table34: table, 9 parts, opens false (0 terms), develops [1,0,1,0,0,0,0], closes false (0 shared, strict false); words [5,33,16,17,15,16,14,18,9]
- Zenodotus/derived-priors/socrates-priors/README.md#table35: table, 11 parts, opens false (0 terms), develops [0,0,0,0,0,0,0,0,0], closes false (0 shared, strict false); words [10,10,9,9,9,9,9,9,9,9,16]
- Zenodotus/scripts/udhr-core/README.md#table36: table, 14 parts, opens false (0 terms), develops [6,6,6,7,1,3,2,14,6,7,1,0], closes false (0 shared, strict false); words [5,32,44,30,45,16,35,22,92,37,154,112,95,38]
- ai-guard/README.md#table37: table, 17 parts, opens false (0 terms), develops [11,8,5,4,5,9,1,7,2,1,3,0,1,3,4], closes false (0 shared, strict false); words [7,23,21,15,20,23,68,20,35,59,36,51,31,19,28,32,83]
- data/unimorph/aym/README.md#table38: table, 141 parts, opens false (0 terms), develops [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0], closes false (0 shared, strict false); words [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5]
- data/unimorph/aym/README.md#table39: table, 60 parts, opens false (0 terms), develops [3,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], closes false (0 shared, strict false); words [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5]
- data/unimorph/bra/README.md#table40: table, 230 parts, opens true (1 terms), develops [1,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], closes false (0 shared, strict false); words [6,2,5,6,7,7,7,7,6,5,5,5,5,6,6,7,7,6,5,5,6,5,6,5,8,8,8,5,8,8,8,8,5,7,7,7,7,7,6,5,7,7,7,7,7,5,5,7,7,7,7,6,5,5,5,7,8,8,8,8,5,7,8,8,8,8,5,5,5,8,7,8,8,8,5,6,6,5,5,5,6,6,5,6,6,5,7,8,8,8,8,5,7,8,8,8,8,5,7,8,8,8,8,5,6,5,6,5,8,8,8,8,2,5,6,6,6,6,6,6,6,5,6,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6,6,6,6,6,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,7,7,5,2,5,5,5,5,6,7,7,7,7,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5]
- data/unimorph/bra/README.md#table41: table, 5 parts, opens false (0 terms), develops [1,0,0], closes false (0 shared, strict false); words [6,5,5,5,5]
- data/unimorph/ckb/README.md#table42: table, 10 parts, opens false (0 terms), develops [2,2,1,0,1,0,0,2], closes false (0 shared, strict false); words [7,7,9,9,9,8,7,7,13,10]
- data/unimorph/ind/README.md#table43: table, 30 parts, opens false (0 terms), develops [3,1,0,2,0,0,1,0,1,0,0,1,0,1,1,0,1,0,0,2,0,0,1,0,0,0,0,1], closes false (0 shared, strict false); words [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5]
- data/unimorph/mag/README.md#table44: table, 67 parts, opens false (0 terms), develops [1,1,1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], closes false (0 shared, strict false); words [6,2,6,6,6,6,7,7,6,6,6,6,7,6,6,7,6,6,6,6,7,7,7,7,8,7,8,6,7,7,6,6,7,7,2,6,6,6,6,7,7,6,6,6,6,7,6,6,7,6,6,6,6,7,7,7,7,8,7,8,6,7,7,6,6,7,7]
- data/unimorph/mag/README.md#table45: table, 67 parts, opens false (0 terms), develops [1,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0], closes false (0 shared, strict false); words [2,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5]
- data/unimorph/mag/README.md#table46: table, 5 parts, opens false (0 terms), develops [0,0,0], closes false (0 shared, strict false); words [6,5,5,5,5]
- data/unimorph/mag/README.md#table47: table, 5 parts, opens false (0 terms), develops [0,0,0], closes false (0 shared, strict false); words [6,5,5,5,5]
- data/unimorph/umLabeller/README.md#table48: table, 7 parts, opens false (0 terms), develops [2,1,0,1,0], closes false (0 shared, strict false); words [8,6,6,6,6,7,5]
- eodb/README.md#table49: table, 10 parts, opens false (0 terms), develops [2,0,2,0,0,0,0,0], closes true (1 shared, strict true); words [7,8,8,15,13,11,11,13,12,11]
- fold-door-cf/build/README.md#table50: table, 16 parts, opens false (0 terms), develops [1,2,0,1,8,0,0,0,0,0,0,1,0,0], closes false (0 shared, strict false); words [6,12,14,14,15,69,18,16,14,46,17,12,9,12,8,15]
- fold-door-cf/build/README.md#table51: table, 7 parts, opens false (0 terms), develops [0,1,0,0,0], closes false (0 shared, strict false); words [6,11,11,9,9,13,10]
- fold-door-cf/build/README.md#table52: table, 7 parts, opens false (0 terms), develops [1,1,2,0,2], closes false (0 shared, strict false); words [6,26,31,13,15,21,13]
- fold-door-cf/build/README.md#table53: table, 9 parts, opens false (0 terms), develops [1,1,1,1,0,2,0], closes false (0 shared, strict false); words [6,11,11,9,13,13,65,23,12]
- fold-door-cf/build/README.md#table54: table, 9 parts, opens false (0 terms), develops [1,3,1,0,0,0,0], closes false (0 shared, strict false); words [6,8,34,9,12,10,10,45,13]
- fold-door-cf/build/README.md#table55: table, 58 parts, opens true (2 terms), develops [1,1,4,3,4,6,0,1,3,3,4,4,12,8,13,10,13,2,4,2,6,3,1,4,3,4,5,1,16,8,16,6,9,14,9,7,9,5,9,9,11,1,2,5,3,4,4,2,1,0,4,1,0,0,0,0], closes false (0 shared, strict false); words [6,7,7,11,11,14,19,11,9,13,12,10,11,46,34,49,63,59,12,11,13,33,19,13,20,34,26,34,41,62,66,69,45,68,84,80,103,65,92,87,301,145,37,86,72,91,40,33,38,43,33,94,105,115,74,48,129,88]
- fold-extract/holodeck/README.md#table56: table, 5 parts, opens false (0 terms), develops [0,0,0], closes false (0 shared, strict false); words [8,3,3,3,6]
- fold-suite/cron/README.md#table57: table, 6 parts, opens false (0 terms), develops [1,5,2,0], closes false (0 shared, strict false); words [3,10,7,7,7,12]
- foldcode/README.md#table58: table, 5 parts, opens false (0 terms), develops [1,0,0], closes false (0 shared, strict false); words [3,5,4,3,6]
- foldcode/packages/ai/README.md#table59: table, 7 parts, opens true (1 terms), develops [1,2,0,0,2], closes true (1 shared, strict true); words [10,5,6,7,6,9,9]
- foldcode/packages/ai/README.md#table60: table, 5 parts, opens false (0 terms), develops [4,1,0], closes false (0 shared, strict false); words [7,8,7,5,5]
- foldcode/packages/ai/README.md#table61: table, 5 parts, opens false (0 terms), develops [3,0,1], closes false (0 shared, strict false); words [4,16,14,19,13]
- foldcode/packages/ai/README.md#table62: table, 11 parts, opens false (0 terms), develops [0,0,0,0,0,1,0,0,1], closes false (0 shared, strict false); words [15,15,19,15,15,16,21,21,17,19,18]
- foldcode/packages/ai/README.md#table63: table, 6 parts, opens true (1 terms), develops [5,0,0,3], closes false (0 shared, strict false); words [4,12,12,8,11,11]
- foldcode/packages/codemode/README.md#table64: table, 12 parts, opens false (0 terms), develops [1,0,2,5,0,0,0,2,0,0], closes false (0 shared, strict false); words [3,9,9,8,10,10,8,6,16,7,10,10]
- foldcode/packages/gui-extensions/README.md#table65: table, 9 parts, opens false (0 terms), develops [1,2,1,4,2,0,0], closes false (0 shared, strict false); words [9,17,14,16,17,17,15,21,8]
- foldcode/packages/gui-extensions/README.md#table66: table, 9 parts, opens false (0 terms), develops [1,3,0,0,0,0,0], closes false (0 shared, strict false); words [5,15,7,5,13,10,9,10,9]
- foldcode/packages/gui-extensions/README.md#table67: table, 14 parts, opens false (0 terms), develops [4,2,1,1,4,2,1,1,0,2,0,0], closes false (0 shared, strict false); words [5,11,14,11,11,19,19,19,12,14,17,13,11,8]
- foldcode/packages/gui-extensions/README.md#table68: table, 11 parts, opens true (2 terms), develops [2,5,0,0,1,0,0,0,0], closes true (1 shared, strict false); words [8,14,20,13,19,12,19,15,10,8,11]
- foldcode/packages/gui-extensions/README.md#table69: table, 26 parts, opens true (2 terms), develops [2,1,1,1,0,1,1,0,2,2,0,0,0,0,1,0,0,2,0,0,0,0,0,0], closes true (1 shared, strict true); words [9,14,12,11,14,8,13,16,16,12,8,8,8,12,10,14,11,8,11,9,9,11,14,9,11,11]
- foldcode/packages/gui-extensions/README.md#table70: table, 7 parts, opens false (0 terms), develops [1,1,2,2,1], closes true (1 shared, strict true); words [9,21,14,17,25,10,20]
- foldcode/packages/gui-extensions/README.md#table71: table, 6 parts, opens false (0 terms), develops [7,3,4,4], closes false (0 shared, strict false); words [5,11,14,10,14,11]
- foldcode/packages/gui-extensions/README.md#table72: table, 7 parts, opens false (0 terms), develops [4,0,2,0,0], closes true (1 shared, strict true); words [5,25,12,18,12,16,30]
- foldcode/packages/http-recorder/README.md#table73: table, 8 parts, opens false (0 terms), develops [3,5,1,0,1,4], closes false (0 shared, strict false); words [3,11,9,9,8,11,8,11]
- heimdall/README.md#table74: table, 7 parts, opens false (0 terms), develops [1,0,2,0,0], closes false (0 shared, strict false); words [7,6,8,5,6,8,8]
- holodeck-samples/README.md#table75: table, 12 parts, opens true (1 terms), develops [4,6,0,0,0,0,1,1,0,0], closes true (1 shared, strict true); words [9,28,22,18,20,20,14,27,28,20,22,24]
- hyphae/README.md#table76: table, 8 parts, opens false (0 terms), develops [1,0,1,0,0,0], closes false (0 shared, strict false); words [3,9,16,9,8,8,9,4]
- identity-src/README.md#table77: table, 6 parts, opens false (0 terms), develops [1,0,1,0], closes false (0 shared, strict false); words [3,10,14,13,9,11]
- penelope.pre-vault-20261020-133905/README.md#table78: table, 6 parts, opens false (0 terms), develops [1,1,0,0], closes false (0 shared, strict false); words [9,22,25,22,23,19]
- scores-patch-points/README.md#table79: table, 16 parts, opens false (0 terms), develops [2,3,0,1,1,0,0,0,1,0,0,0,0,1], closes false (0 shared, strict false); words [13,13,13,16,14,18,15,13,12,11,11,12,21,13,9,10]
- scores-patch-points/README.md#table80: table, 13 parts, opens false (0 terms), develops [2,2,0,8,2,0,0,0,0,0,0], closes false (0 shared, strict false); words [4,8,6,8,7,12,7,11,37,7,8,6,5]
- the-fold-numeral/eval/README.md#table81: table, 9 parts, opens false (0 terms), develops [5,4,0,2,1,0,0], closes false (0 shared, strict false); words [3,32,31,32,15,24,13,12,21]
- the-fold-numeral/eval/README.md#table82: table, 5 parts, opens false (0 terms), develops [6,6,0], closes false (0 shared, strict false); words [3,55,48,17,20]
- the-fold-numeral/experiments/mind-wandering/README.md#table83: table, 6 parts, opens false (0 terms), develops [1,0,1,1], closes false (0 shared, strict false); words [9,12,14,15,16,13]
- the-fold-numeral/experiments/specimen-assembly/README.md#table84: table, 9 parts, opens false (0 terms), develops [3,4,3,0,0,2,0], closes false (0 shared, strict false); words [4,15,17,17,18,23,14,16,20]
- the-fold-numeral/experiments/specimen-assembly/README.md#table85: table, 9 parts, opens false (0 terms), develops [2,1,0,4,2,0,2], closes false (0 shared, strict false); words [3,17,11,9,22,20,29,15,18]

## Three real trees: facet titles against skeleton titles

Pages: from the gather cache at /Users/mlacy/.local/share/foldcode/gather-cache (read-only), the 8 pages whose title names the topic and whose text names it >= 20 times. Tree: opencode-stitch.mjs stitch() (voidHunt + fillSlots, zero model calls). F = defaultOutline(topic, slot labels) from opencode-longform.mjs; S = outlineFrom on the same tree with the essay skeleton; reader words = the ask's.

### elephants (job longform-elephants-6345f6e9; 8 cached pages)

- https://en.wikipedia.org/wiki/War_elephant (184 mentions, 24000 chars)
- https://www.bbcearth.com/factfiles/animals/mammals/elephant (154 mentions, 24000 chars)
- https://en.wikipedia.org/wiki/Elephant_cognition (145 mentions, 24000 chars)
- https://www.thewildlifediaries.com/types-of-elephants-in-the-wild/ (131 mentions, 15601 chars)
- https://elephantconservation.org/about-elephants/ (129 mentions, 23042 chars)
- https://en.wikipedia.org/wiki/African_elephant (126 mentions, 24000 chars)
- https://en.wikipedia.org/wiki/Elephant (117 mentions, 24000 chars)
- https://en.wikipedia.org/wiki/Indian_elephant (108 mentions, 24000 chars)

Recorded headings of the job's longform.md (the facet titles the piece actually got): "Introduction", "Asia and bulls", "Adult and trunks", "Asia", "Conclusion"

Tree: 1223 sentences from 8 pages; 6 level-1 slots, 3 level-1 gaps; 16 typed gaps in all.

| # | F (facet, defaultOutline) | S (skeleton, outlineFrom; run 1 order) | role | words | slot | facts | title by |
|---|---|---|---|---|---|---|---|
| 1 | Introduction | Even modest projects can transform outcomes for entire species | opens | 175 | s1 (species · forest) | 12 | clause: all top terms |
| 2 | Species and forest | War elephants played a critical role in several key battles in antiquity | develops | 528 | sg2 (battle) | 18 | clause: all top terms |
| 3 | Animals and terrestrial | Its trunk tip has two finger-like projections | develops | 364 | s6 (trunk · finger-like) | 12 | clause: all top terms |
| 4 | Years and calves | Elephants are able to spend substantial time working on problems | develops | 195 | s5 (time · numbers) | 4 | clause: seed term |
| 5 | Groups and family | Which are replaced by tusks when calves are about one year old | develops | 364 | s3 (years · calves) | 12 | clause: all top terms |
| 6 | Time and numbers | Traveling in family groups that | develops | 364 | s4 (groups · family) | 12 | clause: all top terms |
| 7 | Trunk and finger-like | Hannibal led an army of war elephants across the Alps | develops | 528 | sg1 (army) | 22 | clause: all top terms |
| 8 | Conclusion | Not much is known about African pygmy elephants | develops | 528 | sg3 (pygmy) | 18 | clause: all top terms |
| 9 |  | Elephants are the largest living terrestrial animals | closes | 223 | s2 (animals · terrestrial) | 12 | clause: all top terms |

Order: s1 → sg2 → s6 → s5 → s3 → s4 → sg1 → sg3 → s2; opener recurs in 8 / 8 other slots; closer shares 147 terms with the opener; median facts 12.

Cadence: chosen order mean step 0.4903 (steps sg2:0.774, s6:0.735, s5:0.503, s3:0.469, s4:0.431, sg1:0.365, sg3:0.225, s2:0.42); shuffled mean 0.5235 over 200 orders (max 0.5995); B2 FAILS on this tree.

REC run 2 (post hoc, dev): exhaustive middle order s1 → sg3 → s5 → sg1 → sg2 → s4 → s3 → s6 → s2, mean step 0.5132 against the full shuffle null 0.5235 (not above) and the ends-held null 0.4928 (above).

Post-hoc diagnostic (not a bar): with the opener and closer held, shuffling only the middle gives mean step 0.4928; the chosen middle order is not above it.

### lighthouses (job longform-lighthouses-ae26d638; 8 cached pages)

- https://en.wikipedia.org/wiki/Lighthouse (121 mentions, 24000 chars)
- https://en.wikipedia.org/wiki/Lighthouse_keeper (118 mentions, 15495 chars)
- https://studyguides.com/study-methods/study-guide/cmkwca0e1juhx01d5yi5oni8a (110 mentions, 23944 chars)
- https://mapscaping.com/us-lighthouses-map/ (109 mentions, 6749 chars)
- https://en.wikipedia.org/wiki/Chennai_Lighthouse (109 mentions, 21644 chars)
- https://en.wikipedia.org/wiki/History_of_lighthouses (100 mentions, 20260 chars)
- https://en.wikipedia.org/wiki/List_of_lighthouses_in_Canada (99 mentions, 7024 chars)
- https://studyguides.com/study-methods/overview/cmkwca0e1juhx01d5yi5oni8a (85 mentions, 14745 chars)

Recorded headings of the job's longform.md (the facet titles the piece actually got): "Introduction", "History and lighthouse", "Light and lamps", "Alexandria and lighthouse", "Lighthouse", "Landmarks", "Coast and england", "Conclusion"

Tree: 904 sentences from 8 pages; 6 level-1 slots, 3 level-1 gaps; 17 typed gaps in all.

| # | F (facet, defaultOutline) | S (skeleton, outlineFrom; run 1 order) | role | words | slot | facts | title by |
|---|---|---|---|---|---|---|---|
| 1 | Introduction | 29 NRHP lighthouses along the Atlantic and Gulf coasts | opens | 175 | s1 (coast · light) | 12 | clause: all top terms |
| 2 | Coast and light | The Tower of Hercules in Spain | develops | 364 | s3 (tower · hercules) | 12 | clause: all top terms |
| 3 | Light and tower | How are lighthouses classified by construction material | develops | 364 | s5 (construction · material) | 12 | clause: all top terms |
| 4 | Tower and hercules | Signals were exchanged with the lighthouse by merchants on the ship | develops | 195 | s6 (signals · ships) | 6 | clause: all top terms |
| 5 | Structure and wooden | The first attempt was an octagonal wooden structure | develops | 364 | s4 (structure · wooden) | 12 | clause: all top terms |
| 6 | Construction and material | The lighthouses at Chennai and Mamallapuram use dischargeable lamps | develops | 516 | sg2 (chennai) | 17 | clause: all top terms |
| 7 | Signals and ships | When Madras was an open seashore | develops | 528 | sg1 (madras) | 19 | clause: all top terms |
| 8 | Conclusion | Now housing the Fort Museum | develops | 334 | sg3 (fort) | 11 | clause: all top terms |
| 9 |  | An advisor to the United Kingdom's lighthouse authority | closes | 223 | s2 (light · tower) | 12 | clause: all top terms |

Order: s1 → s3 → s5 → s6 → s4 → sg2 → sg1 → sg3 → s2; opener recurs in 7 / 8 other slots; closer shares 165 terms with the opener; median facts 12.

Cadence: chosen order mean step 0.5297 (steps s3:0.804, s5:0.611, s6:0.574, s4:0.532, sg2:0.472, sg1:0.391, sg3:0.291, s2:0.563); shuffled mean 0.5025 over 200 orders (max 0.6472); B2 HOLDS on this tree.

REC run 2 (post hoc, dev): exhaustive middle order s1 → sg3 → s6 → sg2 → sg1 → s5 → s4 → s3 → s2, mean step 0.5917 against the full shuffle null 0.5025 (above) and the ends-held null 0.5514 (above).

Post-hoc diagnostic (not a bar): with the opener and closer held, shuffling only the middle gives mean step 0.5514; the chosen middle order is not above it.

### honeybees (job longform-honeybees-c4677148; 8 cached pages)

- https://en.wikipedia.org/wiki/Honey_bee (98 mentions, 24000 chars)
- https://revolutionarywarjournal.com/honey-bees-in-early-america-white-mans-flies-fact-and-fiction/ (65 mentions, 23953 chars)
- https://beetlesbug.com/types-of-honey-bees/ (62 mentions, 20249 chars)
- https://www.newworldencyclopedia.org/entry/Honeybee (58 mentions, 23824 chars)
- https://www.wildlifenomads.com/blog/facts-honeybee/ (56 mentions, 18457 chars)
- https://animalcorner.org/animals/honey-bee/ (50 mentions, 15836 chars)
- https://insectsadv.com/common-types-of-honeybees/ (44 mentions, 24000 chars)
- https://en.wikipedia.org/wiki/Western_honey_bee (43 mentions, 24000 chars)

Recorded headings of the job's longform.md (the facet titles the piece actually got): "Introduction", "Bees and honey", "Honey and cape", "Asia and africa", "Colony and queen", "Conclusion"

Tree: 1382 sentences from 8 pages; 6 level-1 slots, 3 level-1 gaps; 18 typed gaps in all.

| # | F (facet, defaultOutline) | S (skeleton, outlineFrom; run 1 order) | role | words | slot | facts | title by |
|---|---|---|---|---|---|---|---|
| 1 | Introduction | When honey bees are present as an invasive species in an area | opens | 175 | s1 (bees · honey) | 12 | clause: all top terms |
| 2 | Bees and honey | In all other Apis species | develops | 364 | s4 (species · apis) | 12 | clause: all top terms |
| 3 | Honey and species | If workers sense that an old queen is weakening | develops | 364 | s3 (queen · workers) | 12 | clause: all top terms |
| 4 | Queen and workers | Workers guard the entrance of the hive | develops | 364 | s5 (hive · workers) | 12 | clause: all top terms |
| 5 | Species and apis | Workers will live for 2 to 4 weeks in the summer | develops | 364 | s6 (workers · weeks) | 12 | clause: all top terms |
| 6 | Hive and workers | The lifecycle includes egg | develops | 394 | sg1 (lifecycle) | 13 | clause: all top terms |
| 7 | Workers and weeks | Pushing northward into New England | develops | 212 | sg3 (england) | 7 | clause: all top terms |
| 8 | Conclusion | Worker policing is an example of forced altruism | develops | 243 | sg2 (policing) | 8 | clause: all top terms |
| 9 |  | Like all honey bee species | closes | 223 | s2 (honey · species) | 12 | clause: all top terms |

Order: s1 → s4 → s3 → s5 → s6 → sg1 → sg3 → sg2 → s2; opener recurs in 8 / 8 other slots; closer shares 516 terms with the opener; median facts 12.

Cadence: chosen order mean step 0.2261 (steps s4:0.401, s3:0.359, s5:0.291, s6:0.218, sg1:0.1, sg3:0.067, sg2:0.013, s2:0.36); shuffled mean 0.3805 over 200 orders (max 0.6043); B2 FAILS on this tree.

REC run 2 (post hoc, dev): exhaustive middle order s1 → sg1 → sg2 → sg3 → s6 → s5 → s3 → s4 → s2, mean step 0.2802 against the full shuffle null 0.3805 (not above) and the ends-held null 0.2501 (above).

Post-hoc diagnostic (not a bar): with the opener and closer held, shuffling only the middle gives mean step 0.2501; the chosen middle order is not above it.

## Mechanical checks

- Facet-join titles among skeleton titles: 0 / 27.
- Slots dropped (outline + appendix vs tree): 0.
- Sections with words outside the essay skeleton's IQR for their role: 0.
- Cadence null B2: FAILS — elephants 0.4903 vs 0.5235; lighthouses 0.5297 vs 0.5025; honeybees 0.2261 vs 0.3805.
- Post-hoc diagnostic (ends held, middle shuffled; written after B2 was seen): elephants 0.4903 vs 0.4928 (not above); lighthouses 0.5297 vs 0.5514 (not above); honeybees 0.2261 vs 0.2501 (not above).
- REC run 2 (exhaustive middle order; the frame after B2 failed; dev, not pre-registered): elephants 0.5132 vs full shuffle 0.5235 (not above); lighthouses 0.5917 vs full shuffle 0.5025 (above); honeybees 0.2802 vs full shuffle 0.3805 (not above). The REC's own bar is to be pre-registered and read on asks not seen here.

## Pending

- B1, the blind pair test (human judgement on the ten pre-registered asks): NOT run here. The three F/S title sets above are the material for three of the ten asks; the other seven asks have no gather yet.

