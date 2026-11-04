# RESULT-CAST-A2 — held-out exam v1.1, scored once by the parent session

**Miss of the target.** `castIdentity: true` at code `dad781f` scored **21 of 50 clean (LAYER3 0.42)** against the bar of 50 of 50. Nothing was re-run. The held-out exam was scored by the parent session on a `git archive` snapshot of `dad781f`; I never saw its texts or inventory until this result, and it is now spent (development material for A3).

| run | clean | LAYER3 | whole | unique carrier | no merge | span exact |
|---|---|---|---|---|---|---|
| `castIdentity: true` (`A2-ON.json`) | 21 / 50 | 0.42 | 0.64 | 0.70 | 0.80 | 0.48 |
| option off, same snapshot (`A2-OFF.json`) | 6 / 50 | 0.12 | 0.78 | 0.46 | 0.66 | 0.24 |
| khora main snapshot (`A2-BASE-MAIN.json`) | 6 / 50 | 0.12 | 0.78 | 0.46 | 0.66 | 0.24 |
| K1 control (`A2-K1.json`) | 1 / 50 | 0.02 | 0.04 | 0.04 | 0.18 | 0.02 |

The option-off run and the main run are byte-identical (same sha256, `bee89f2f…`), which is R1 on a second, unseen set. Result hashes (parent's `RELEASE-A2.hashes`): inventory `b5fa3ee1…`, `score-cast.mjs` `db15e251…`, `A2-ON.json` `1fddd6ad…`, `A2-K1.json` `47cf07f3…`.

The dev-to-held-out gap was 58 of 58 (and 20 of 21 on six untuned articles) against 21 of 50: the A2 rules were fitted to a small set and a few labels were generous to them. The six-article check I called the only unfitted measure also overstated generalisation, as I said it might.

## The 29 unclean entities (A2-ON), published

(m = gold mentions; main = mentions covered by the best being; w/u/nm = whole / unique carrier / no merge; ex = exact-span share; [ ] = main being.)

Apollo 13: "Apollo 13" nm0 (merged with Apollo 11, Apollo 12); "Apollo 11" nm0, ex0; "Apollo 12" nm0, ex0 (all three carried by the being "Apollo 13"); "Mission Control" 2 carriers.
Boeing 747: "Boeing 747" main 6 of 111, ex 0.05, merged with "747-8"; "747-400" no being (car0); "747-8" carried by "Boeing 747".
Channel Tunnel: "Channel Tunnel" 2 carriers.
Notre-Dame de Paris: "Notre-Dame de Paris" 5 carriers [Notre-Dame]; "Viollet-le-Duc" 2 carriers, held by "Eugène Viollet-le-Duc"; "Emmanuel Macron" ex 0.917 [President Emmanuel Macron].
St. Peter's Basilica: "St. Peter's Basilica", "Old St. Peter's Basilica", "St. Peter's Square" all carried by one being "St Peter", ex 0; "Michelangelo" main 2 of 43 [Michelangelo's Pietà]; "Bramante" main 2 of 26 [Donato Bramante].
Titanic: "Titanic" 2 carriers [RMS Titanic Inc]; "White Star Line" 2 carriers; "Harland and Wolff" 2 carriers, ex 0 [Edward James Harland]; "Carpathia" 2 carriers [Carpathia Harold Cottam].
Trans-Alaska Pipeline System: the name carried as "Trans Alaska Pipeline System" (hyphen lost), ex 0.6, 2 carriers; "Alyeska" 2 carriers; "Valdez" no being; "Valdez Marine Terminal" ex 0.75.
U.S. Route 66: "U.S. Route 66" main 27 of 69 [US 66], ex 0.39; "Interstate 40" ex 0 [United States Highway System]; "US 60" no being; "Chicago" and "Los Angeles" merged into one another (nm0), 2 carriers each.

Cleaned by the pass (6 to 21), not listed: 15 entities that the base left unclean.
