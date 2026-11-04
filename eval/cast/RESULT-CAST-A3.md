# RESULT-CAST-A3 — exam v2, scored once by the parent session

**Miss of the target.** `castIdentity: true` at code `69ebed4` scored **49 of 61 clean (LAYER3 0.8033)** against the bar of every entity. Nothing was re-run. The parent scored a `git archive` snapshot of `69ebed4`; the exam was not seen by me before this result and is now spent (development material for A4).

| run | clean | LAYER3 | whole | unique carrier | no merge | span exact |
|---|---|---|---|---|---|---|
| `castIdentity: true` (`A3-ON.json`, sha256 `7aedab17…`) | 49 / 61 | 0.8033 | 0.885 | 0.885 | 0.902 | 0.869 |
| option off, same snapshot (`A3-OFF.json`) | 9 / 61 | 0.1475 | 0.754 | 0.557 | 0.656 | 0.311 |
| khora main snapshot (`A3-BASE-MAIN.json`) | 9 / 61 | 0.1475 | 0.754 | 0.557 | 0.656 | 0.311 |
| K1 control (`A3-K1.json`) | 0 / 61 | 0 | | | | |

Option off equals main byte for byte (sha256 `fd6bc7a7…`): R1 holds on a third unseen set. Inventory sha256 `fa28fb85…`. A2 scored 21 of 50 (0.42); A3 49 of 61 (0.80).

## The 12 unclean entities, published

(m = gold mentions; main = mentions covered by the best being.)

- Øresund Bridge: "Copenhagen" and "Copenhagen Airport" (m12, m6) both carried by one being "Copenhagen Airport" (merge).
- Millau Viaduct: "Millau Viaduct" (m5) and "Millau" (m18) both carried by "Millau Viaduct"; "Millau" has 2 carriers, exact 0.83.
- Petronas Towers: "Petronas Towers" (m10, 2 carriers, exact 0.8) and "Petronas" (m3) merged.
- Saturn V: "Saturn V" (m50, 5 carriers, exact 0.90); "F-1" (m15, 2 carriers) and "J-2" (m17, 2 carriers), the modifier "Rocketdyne" cut at the hyphen.
- Sputnik 1: "Sputnik 1" (m37, 2 carriers, exact 0.73); "Soviet Union" (m18, 2 carriers, exact 0.56, carried partly by "USSR Academy").
- Tower of London: "Edward I" (m16, exact 0.81): the sentence-final full stop kept.
