// POST-HOC DIAGNOSTIC (read only; changes no rule and no result). Imports verdicts() from g2-score.mjs unchanged.
import fs from "node:fs";
process.argv[2] = "--none";
const { verdicts } = await import("./g2-score.mjs?diag").catch(() => ({}));
