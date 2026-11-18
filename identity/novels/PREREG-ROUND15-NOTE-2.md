# PREREG-ROUND15 NOTE 2 — context is a measured window, and the string alone is only the baseline (registered before any embedding result)

The user's two corrections, taken as the registration:
1. A string alone means nothing; it means something only ablated in context. So ES is reported as the ablation baseline and is NOT a candidate.
2. "Context is the biggest window where ablating it provides no DMD": the window is measured by the kernel's own organ, `kernel/activation.js::dmdWindow` (the shallowest depth at which dropping everything beyond it changes no conclusion), not fixed.

## Window arms
EWr for radius r in {0, 1, 2, 4, 8} sentences (the candidates are declared, as dmdWindow requires; powers of two, not tuned). The window vector = L2-normalised sum of the embedding of the sentence with the mention marked ([ ] as in EC) and the embeddings of the plain neighbouring sentences within r on each side. Each radius has its own centroid pair (person / not-person), built from the same GUM train mentions with the same windows. EW0 is EC.
Per being: derive(r) = the sign of the mean over its mentions of cos(person) - cos(not-person) at radius r. `dmdWindow(radii, derive)` with restrict = the radius gives the being's WINDOW: the shallowest radius whose conclusion equals the conclusion at the largest radius (8). The ruling S7W = the conclusion at that window (by construction equal to the conclusion at r = 8; the window is the measurement, and it tells how much context each being needed). A being whose conclusion is still moving at the widest candidates carries the gap `reach_exceeds_candidates` and is not ruled.
Reported: the distribution of windows; precision of the fixed-radius arms EW0..EW8 and of ER (role), ES (string), EA (the mean of ES, ER, EC); the radius at which the precision curve stops moving.
Primary candidate: S7W (and S8W = S7W union the round-14 word table). H1-H6 and A1/A2 of PREREG-ROUND15 and NOTE-1 apply to S7W; A1 now reads: S7W or ER beats ES on U (95% interval above zero for at least one).
