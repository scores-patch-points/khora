// native/eval/lavar/greek.mjs — the Greek seam moved to adapters/text/greek-seam.js (the canonical read imports it from there); this file re-exports it so the eval scripts and tests that name the old path keep working.
export * from "../../adapters/text/greek-seam.js";
