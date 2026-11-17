# LEARNED-RULES RESULTS (LEARN-PREREG.md, stamped 2026-11-17T06:22:59Z, sha256 63aa534d…; learn-rules.py 9db28127…)

3,349 people (P31 includes Q5) from the omnilingual sample; 236 properties held by >= 30 of them. Rules were learned
from people only; Wikidata's stated constraints were used only to score. Register: `learned-register.json`.

| hypothesis | result | verdict |
|---|---|---|
| L1 AUC of S vs stated (80 non-identifier properties: 15 one-valued, 65 plural) | 0.905 | holds (>= 0.80) |
| L2 AUC(S) > AUC(single share) | 0.905 > 0.883 | holds (a small gain) |
| L3 dispute share among multi-valued members, one-valued vs plural | 82.9% (328 members) vs 7.0% (6,665); diff 0.760, 95% [0.715, 0.802] | holds |
| K1 shuffled-label AUC, 95th percentile | 0.629 | passed |
| K2 values dealt at random across members | close-year disputes fell 142 -> 73; AUC(S) 0.886 | reported |
| external identifiers (156: 140 one-valued, 16 plural) | AUC 0.680 | weak; not barred |

## Readings
- Every stated one-valued property scores S 0.96–1.00. Learned ambiguity rates (epsilon): date of birth 3.1%, date of
  death 1.3%, place of birth 2.0%, place of death 2.1%, father/mother 0%.
- The high-S "plural" properties are rules the population keeps but Wikidata does not state: sex or gender, instance of,
  start/end of work period, native language. Candidates for the register, each with its interval; not errors of the
  learner by any measure here, and not checked further.
- Genuine plurality scores low: occupation 0.45, field of work 0.41, art name 0.47, courtesy name 0.54.
- K2 says most of the AUC comes from how many values members hold (kept under random dealing); the dispute reading's
  strength is L3: when several values appear, whether they look like a dispute nearly separates rule from plurality.
- Confound carried from ERRATUM-2: the sample is text-sorted id prefixes per language.
