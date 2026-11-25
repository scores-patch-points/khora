# CORRECTIONS

## 2026-11-24 — the study's operator names map to the current cube differently from what I wrote

**Wrong:** `PREREG-ABLATION-SNIFFER.md` (the Design section, "Gold") and a code comment in `ablation-eval.mjs` (line 18, `const OPS`) say the study's names map as "DES = DEF, ALT = SIG, SUP = EVA in the current cube".

**Right** (from `eo-lexical-analysis/output/phasepost_centroids_meta.json`, each operator's position × triad, matched against `native/kernel/cube.js`):
| the study's name | position × triad | current cube |
|---|---|---|
| NUL, SEG, CON, INS, SYN, REC | as named | the same |
| **ALT** | Differentiate × Interpretation | **DEF** |
| **DES** | Relate × Existence | **SIG** |
| SUP | Relate × Interpretation | EVA |
Only DES and ALT were swapped; SUP was right.

**What it changes:** nothing that was measured. The classes are labels, so no balanced accuracy, null, bootstrap or verdict in any of the four tests depends on which current name a label carries. It changes how a class is read: "ALT" in the data is DEF and "DES" is SIG. The frozen files (`PREREG-ABLATION-SNIFFER.md`, `ablation-eval.mjs`) are left as frozen, since editing them would break their freeze hashes; this note is their correction. The wired priors (`WIRED.md`) carry the right mapping in their metadata, derived by `wire-unit-priors.mjs` from the study's metadata and the kernel, not typed.
