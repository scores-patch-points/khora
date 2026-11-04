## Verdict counts per configuration

| config | class | n | same | different | unsupported | refused | unmapped |
|---|---|---|---|---|---|---|---|
| A1 | pos | 64 | 0 | 21 | 0 | 0 | 43 |
| A1 | neg | 132 | 3 | 41 | 0 | 0 | 88 |
| A1on | pos | 64 | 0 | 21 | 0 | 0 | 43 |
| A1on | neg | 132 | 3 | 41 | 0 | 0 | 88 |
| A2 | pos | 64 | 0 | 64 | 0 | 0 | 0 |
| A2 | neg | 132 | 3 | 129 | 0 | 0 | 0 |
| B1 | pos | 64 | 0 | 21 | 0 | 0 | 43 |
| B1 | neg | 132 | 0 | 44 | 0 | 0 | 88 |

B1 (bipartite, fold dmd) at the level of U, before Δ: pos {"unmapped":43,"different":21} ; neg {"unmapped":88,"different":44}

## Baselines

| rule | class | same | different | unseen/gap | correct |
|---|---|---|---|---|---|
| string | pos | 47 | 17 | 0 | 47/64 = 73.4% [0.615–0.827] |
| string | neg | 46 | 86 | 0 | 86/132 = 65.2% [0.567–0.727] |
| castOn | pos | 40 | 9 | 15 | 40/64 = 62.5% [0.503–0.733] |
| castOn | neg | 7 | 108 | 17 | 108/132 = 81.8% [0.744–0.875] |
| castOff | pos | 9 | 19 | 36 | 9/64 = 14.1% [0.076–0.246] |
| castOff | neg | 4 | 55 | 73 | 55/132 = 41.7% [0.336–0.502] |

## Macro correct (mean of the two classes; gaps count as incorrect)

A1 15.5% · A1on 15.5% · A2 48.9% · string 69.3% · castOn 72.2% · castOff 27.9%

## Primary (A1: reads off, M1, default fold stop, earned tolerance): bars

| bar | value | pass |
|---|---|---|
| B1 negatives called same ≤ 10% | 3/132 = 2.3% [0.008–0.065] | true |
| B2 positives called different ≤ 10% | 21/64 = 32.8% [0.226–0.45] | false |
| B3 correct ≥ 80% in each class | pos 0/64 = 0.0% [0–0.057]; neg 41/132 = 31.1% [0.238–0.394] | false |
| B4 shuffle breaks it (J real -0.023 > max shuffled 0.039; mean shuffled 0.004 ≤ 0.10) | | false |
| B5 within the containment-true stratum (pos 47, neg 46) J -0.022 ≥ 0.5 and > max shuffled 0.043 | | false |

**Overall: PARTIAL**

U-only (Uclose) discrimination J_U real 0.003; shuffled max 0.072, mean 0.013.

## Formula components on A1 (mapped pairs only)

| class | mapped | Uclose | distinct | aligned | all three |
|---|---|---|---|---|---|
| pos | 21 | 7/21 = 33.3% [0.172–0.546] | 0/21 = 0.0% [0–0.155] | 21/21 = 100.0% [0.845–1] | 0/21 = 0.0% [0–0.155] |
| neg | 44 | 14/44 = 31.8% [0.2–0.466] | 7/44 = 15.9% [0.079–0.294] | 43/44 = 97.7% [0.882–0.996] | 3/44 = 6.8% [0.023–0.182] |

## Verdict by size of the graph around the pair (min over the two names of edges within two hops; A1)

| size | class | n | same | different | unmapped | Uclose |
|---|---|---|---|---|---|---|
| 0 | pos | 43 | 0 | 0 | 43 | 0 |
| 0 | neg | 88 | 0 | 0 | 88 | 0 |
| 1-9 | pos | 5 | 0 | 5 | 0 | 0 |
| 1-9 | neg | 23 | 1 | 22 | 0 | 1 |
| 10-49 | pos | 13 | 0 | 13 | 0 | 6 |
| 10-49 | neg | 18 | 1 | 17 | 0 | 12 |
| >=50 | pos | 3 | 0 | 3 | 0 | 1 |
| >=50 | neg | 3 | 1 | 2 | 0 | 1 |

## Per article (reads off)

| article | nodes | edges | max degree | hub share | pairs | unmapped (M1) | earned tolerance | fold null |
|---|---|---|---|---|---|---|---|---|
| v1__wiki-Apollo_13 | 250 | 339 | 62 | 0.25 | 3 | 3 | 0.098 | 0.500 |
| v1__wiki-Boeing_747 | 275 | 275 | 36 | 0.13 | 15 | 15 | 0.500 | 0.500 |
| v1__wiki-Burj_Khalifa | 140 | 139 | 23 | 0.16 | 1 | 0 | 0.200 | 0.333 |
| v1__wiki-Channel_Tunnel | 312 | 422 | 42 | 0.13 | 1 | 1 | 0.250 | 0.500 |
| v1__wiki-Notre-Dame_de_Paris | 242 | 263 | 34 | 0.14 | 5 | 4 | 0.500 | 0.500 |
| v1__wiki-Sagrada_Fam_lia | 182 | 184 | 19 | 0.10 | 2 | 0 | 0.500 | 0.500 |
| v1__wiki-St__Peter_s_Basilica | 354 | 431 | 33 | 0.09 | 14 | 13 | 0.500 | 0.500 |
| v1__wiki-Titanic | 372 | 414 | 57 | 0.15 | 12 | 0 | 0.051 | 0.333 |
| v1__wiki-Trans-Alaska_Pipeline_System | 247 | 230 | 25 | 0.10 | 26 | 23 | 0.250 | 0.333 |
| v1__wiki-U_S__Route_66 | 151 | 153 | 15 | 0.10 | 11 | 11 | 0.467 | 0.333 |
| v2__wiki-Gotthard_Base_Tunnel | 195 | 222 | 13 | 0.07 | 7 | 6 | 0.500 | 0.500 |
| v2__wiki-Millau_Viaduct | 108 | 93 | 12 | 0.11 | 1 | 0 | 0.500 | 0.333 |
| v2__wiki-Petronas_Towers | 66 | 54 | 4 | 0.06 | 6 | 5 | 0.500 | 0.500 |
| v2__wiki-Saturn_V | 142 | 152 | 12 | 0.08 | 6 | 4 | 0.500 | 0.333 |
| v2__wiki-Space_Needle | 159 | 151 | 21 | 0.13 | 1 | 0 | 0.500 | 0.333 |
| v2__wiki-Sputnik_1 | 203 | 212 | 42 | 0.21 | 4 | 2 | 0.077 | 0.333 |
| v2__wiki-Three_Gorges_Dam | 131 | 123 | 12 | 0.09 | 4 | 0 | 0.500 | 0.500 |
| v2__wiki-Tokyo_Skytree | 52 | 40 | 8 | 0.15 | 1 | 0 | 0.417 | 0.333 |
| v2__wiki-Tower_of_London | 268 | 324 | 62 | 0.23 | 1 | 1 | 0.031 | 0.333 |
| v2__wiki-_resund_Bridge | 176 | 193 | 21 | 0.12 | 6 | 5 | 0.500 | 0.500 |
| v3__wiki-Alhambra | 309 | 365 | 51 | 0.17 | 4 | 2 | 0.500 | 0.500 |
| v3__wiki-Angkor_Wat | 179 | 186 | 31 | 0.17 | 3 | 0 | 0.060 | 0.333 |
| v3__wiki-Brandenburg_Gate | 167 | 160 | 22 | 0.13 | 7 | 1 | 0.500 | 0.500 |
| v3__wiki-Chrysler_Building | 248 | 279 | 41 | 0.17 | 9 | 6 | 0.049 | 0.333 |
| v3__wiki-Great_Pyramid_of_Giza | 230 | 277 | 34 | 0.15 | 10 | 9 | 0.500 | 0.500 |
| v3__wiki-Neuschwanstein_Castle | 178 | 181 | 11 | 0.06 | 11 | 6 | 0.500 | 0.500 |
| v3__wiki-Parthenon | 222 | 227 | 36 | 0.16 | 19 | 10 | 0.093 | 0.333 |
| v3__wiki-Tacoma_Narrows_Bridge__1940_ | 129 | 103 | 5 | 0.04 | 6 | 4 | 0.500 | 0.333 |

## Every failure of A1 (positive not called same; negative called same)

| class | article | a | b | A1 | A2 | B1 U-level | string | cast on | size |
|---|---|---|---|---|---|---|---|---|---|
| pos | v1__wiki-Boeing_747 | Boeing 747 | 747 | unmapped | different | unmapped | same | same | 0 |
| pos | v1__wiki-Boeing_747 | Boeing 747-400 | 747-400 | unmapped | different | unmapped | same | unseen | 0 |
| pos | v1__wiki-Boeing_747 | Boeing 747-8 | 747-8 | unmapped | different | unmapped | same | same | 0 |
| pos | v1__wiki-Burj_Khalifa | Emaar Properties | Emaar | different (U 1, Δ 0, λ 1) | different | different | same | different | 24 |
| pos | v1__wiki-Notre-Dame_de_Paris | Cathédrale Notre-Dame de Paris | Notre-Dame de Paris | unmapped | different | unmapped | same | unseen | 0 |
| pos | v1__wiki-Notre-Dame_de_Paris | Cathédrale Notre-Dame de Paris | Notre-Dame | unmapped | different | unmapped | same | unseen | 0 |
| pos | v1__wiki-Notre-Dame_de_Paris | Notre-Dame de Paris | Notre-Dame | unmapped | different | unmapped | same | same | 0 |
| pos | v1__wiki-Notre-Dame_de_Paris | Eugène Viollet-le-Duc | Viollet-le-Duc | unmapped | different | unmapped | same | same | 0 |
| pos | v1__wiki-Notre-Dame_de_Paris | Emmanuel Macron | Macron | different (U 0, Δ 0, λ 1) | different | different | same | same | 21 |
| pos | v1__wiki-Sagrada_Fam_lia | Antoni Gaudí | Gaudí | different (U 0, Δ 0, λ 1) | different | different | same | same | 10 |
| pos | v1__wiki-St__Peter_s_Basilica | St. Peter's Basilica | St. Peter's | unmapped | different | unmapped | same | same | 0 |
| pos | v1__wiki-St__Peter_s_Basilica | Old St. Peter's Basilica | Old St. Peter's | unmapped | different | unmapped | same | same | 0 |
| pos | v1__wiki-St__Peter_s_Basilica | Gian Lorenzo Bernini | Lorenzo Bernini | unmapped | different | unmapped | same | unseen | 0 |
| pos | v1__wiki-St__Peter_s_Basilica | Gian Lorenzo Bernini | Bernini | different (U 1, Δ 0, λ 1) | different | different | same | same | 70 |
| pos | v1__wiki-St__Peter_s_Basilica | Lorenzo Bernini | Bernini | unmapped | different | unmapped | same | unseen | 0 |
| pos | v1__wiki-St__Peter_s_Basilica | Donato Bramante | Bramante | unmapped | different | unmapped | same | same | 0 |
| pos | v1__wiki-Titanic | RMS Titanic | Titanic | different (U 0, Δ 0, λ 1) | different | different | same | same | 19 |
| pos | v1__wiki-Titanic | RMS Olympic | Olympic | different (U 1, Δ 0, λ 1) | different | different | same | same | 12 |
| pos | v1__wiki-Titanic | White Star Line | White Star | different (U 0, Δ 0, λ 1) | different | different | same | same | 9 |
| pos | v1__wiki-Titanic | RMS Carpathia | Carpathia | different (U 1, Δ 0, λ 1) | different | different | same | different | 22 |
| pos | v1__wiki-Trans-Alaska_Pipeline_System | Trans-Alaska Pipeline System | Trans-Alaska Pipeline | unmapped | different | unmapped | same | same | 0 |
| pos | v1__wiki-Trans-Alaska_Pipeline_System | Trans-Alaska Pipeline System | TAPS | unmapped | different | unmapped | different | same | 0 |
| pos | v1__wiki-Trans-Alaska_Pipeline_System | Trans-Alaska Pipeline | TAPS | unmapped | different | unmapped | different | same | 0 |
| pos | v1__wiki-Trans-Alaska_Pipeline_System | Alyeska Pipeline Service Company | Alyeska Pipeline Service | unmapped | different | unmapped | same | same | 0 |
| pos | v1__wiki-Trans-Alaska_Pipeline_System | Alyeska Pipeline Service Company | Alyeska Pipeline | different (U 0, Δ 0, λ 1) | different | different | same | same | 5 |
| pos | v1__wiki-Trans-Alaska_Pipeline_System | Alyeska Pipeline Service Company | Alyeska | different (U 0, Δ 0, λ 1) | different | different | same | different | 5 |
| pos | v1__wiki-Trans-Alaska_Pipeline_System | Alyeska Pipeline Service | Alyeska Pipeline | unmapped | different | unmapped | same | same | 0 |
| pos | v1__wiki-Trans-Alaska_Pipeline_System | Alyeska Pipeline Service | Alyeska | unmapped | different | unmapped | same | different | 0 |
| pos | v1__wiki-Trans-Alaska_Pipeline_System | Alyeska Pipeline | Alyeska | different (U 1, Δ 0, λ 1) | different | different | same | different | 10 |
| pos | v1__wiki-Trans-Alaska_Pipeline_System | Valdez Marine Terminal | Valdez Terminal | unmapped | different | unmapped | different | unseen | 0 |
| pos | v1__wiki-U_S__Route_66 | U.S. Route 66 | U.S. Highway 66 | unmapped | different | unmapped | different | same | 0 |
| pos | v1__wiki-U_S__Route_66 | U.S. Route 66 | US 66 | unmapped | different | unmapped | different | same | 0 |
| pos | v1__wiki-U_S__Route_66 | U.S. Route 66 | Route 66 | unmapped | different | unmapped | same | same | 0 |
| pos | v1__wiki-U_S__Route_66 | U.S. Highway 66 | US 66 | unmapped | different | unmapped | different | same | 0 |
| pos | v1__wiki-U_S__Route_66 | U.S. Highway 66 | Route 66 | unmapped | different | unmapped | different | same | 0 |
| pos | v1__wiki-U_S__Route_66 | US 66 | Route 66 | unmapped | different | unmapped | different | same | 0 |
| pos | v2__wiki-Gotthard_Base_Tunnel | Gotthard Base Tunnel | GBT | different (U 0, Δ 0, λ 1) | different | different | different | same | 8 |
| pos | v2__wiki-Petronas_Towers | Petronas Twin Towers | Menara Berkembar Petronas | unmapped | different | unmapped | different | unseen | 0 |
| pos | v2__wiki-Petronas_Towers | Petronas Twin Towers | Petronas Towers | unmapped | different | unmapped | different | unseen | 0 |
| pos | v2__wiki-Petronas_Towers | Menara Berkembar Petronas | Petronas Towers | unmapped | different | unmapped | different | different | 0 |
| pos | v2__wiki-Saturn_V | Rocketdyne F-1 | F-1 | unmapped | different | unmapped | same | same | 0 |
| pos | v2__wiki-Saturn_V | Rocketdyne J-2 | J-2 | unmapped | different | unmapped | same | same | 0 |
| pos | v2__wiki-Saturn_V | Marshall Space Flight Center | MSFC | different (U 1, Δ 0, λ 1) | different | different | different | same | 26 |
| pos | v2__wiki-Sputnik_1 | Sputnik 1 | PS-1 | unmapped | different | unmapped | different | different | 0 |
| pos | v2__wiki-Sputnik_1 | Sergei Korolev | Korolev | different (U 0, Δ 0, λ 1) | different | different | same | same | 11 |
| pos | v2__wiki-Sputnik_1 | Soviet Union | USSR | different (U 0, Δ 0, λ 1) | different | different | different | different | 54 |
| pos | v2__wiki-Three_Gorges_Dam | Yangtze River | Yangtze | different (U 0, Δ 0, λ 1) | different | different | same | same | 6 |
| pos | v3__wiki-Alhambra | The Alhambra | Alhambra | unmapped | different | unmapped | same | unseen | 0 |
| neg | v3__wiki-Angkor_Wat | Angkor Wat | Angkor | same (U 1, Δ 1, λ 1) | same | different | same | same | 98 |
| neg | v3__wiki-Angkor_Wat | Angkor Wat | Angkor Thom | same (U 1, Δ 1, λ 1) | same | different | different | different | 10 |
| pos | v3__wiki-Brandenburg_Gate | The Brandenburg Gate | Brandenburg Gate | unmapped | different | unmapped | same | unseen | 0 |
| pos | v3__wiki-Chrysler_Building | The Chrysler Building | Chrysler Building | unmapped | different | unmapped | same | unseen | 0 |
| pos | v3__wiki-Chrysler_Building | William Van Alen | Van Alen | different (U 0, Δ 0, λ 1) | different | different | same | same | 65 |
| pos | v3__wiki-Great_Pyramid_of_Giza | Great Pyramid of Giza | The Great Pyramid | unmapped | different | unmapped | different | unseen | 0 |
| pos | v3__wiki-Great_Pyramid_of_Giza | Great Pyramid of Giza | Great Pyramid | unmapped | different | unmapped | same | same | 0 |
| pos | v3__wiki-Great_Pyramid_of_Giza | The Great Pyramid | Great Pyramid | unmapped | different | unmapped | same | unseen | 0 |
| pos | v3__wiki-Neuschwanstein_Castle | Neuschwanstein Castle | Neuschwanstein | different (U 0, Δ 0, λ 1) | different | different | same | different | 19 |
| pos | v3__wiki-Neuschwanstein_Castle | King Ludwig II | Ludwig II | unmapped | different | unmapped | same | same | 0 |
| pos | v3__wiki-Neuschwanstein_Castle | King Ludwig II | King Ludwig | unmapped | different | unmapped | same | same | 0 |
| pos | v3__wiki-Neuschwanstein_Castle | King Ludwig II | Ludwig | unmapped | different | unmapped | same | same | 0 |
| pos | v3__wiki-Neuschwanstein_Castle | Ludwig II | King Ludwig | unmapped | different | unmapped | different | same | 0 |
| pos | v3__wiki-Neuschwanstein_Castle | Ludwig II | Ludwig | unmapped | different | unmapped | same | same | 0 |
| pos | v3__wiki-Neuschwanstein_Castle | King Ludwig | Ludwig | different (U 1, Δ 0, λ 1) | different | different | same | same | 37 |
| pos | v3__wiki-Neuschwanstein_Castle | The Throne Hall | Throne Hall | unmapped | different | unmapped | same | unseen | 0 |
| neg | v3__wiki-Neuschwanstein_Castle | Neuschwanstein Castle | Hohenschwangau Castle | same (U 1, Δ 1, λ 1) | different | different | different | different | 9 |
| pos | v3__wiki-Parthenon | The Parthenon | Parthenon | different (U 0, Δ 0, λ 1) | different | different | same | unseen | 35 |
| pos | v3__wiki-Parthenon | Francesco Morosini | Morosini | different (U 0, Δ 0, λ 1) | different | different | same | same | 21 |

Pairs containing the alphabetically first node (kind-average artifact): 1.
