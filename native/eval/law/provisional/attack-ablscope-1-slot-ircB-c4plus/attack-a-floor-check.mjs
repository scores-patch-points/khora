// attack-a-floor-check.mjs -- DESCRIPTIVE CHECK (no test, no threshold) that the reader's floors (figure length >= 3, in-window recurrence >= 2) cannot separate names from controls in the confirmer's design: minimum character length and local count among the eligible B c4+ rows by class.
import fs from "node:fs"; import path from "node:path";
import { HERE, loadTokens, ST4, round } from "./lib-a.mjs";
const { tokens } = loadTokens(), ENG = ["E_CORE", "E_SRV", "E_REUSE"], rows = tokens.filter((t) => ENG.includes(t.arm) && t.cond === "real" && t.grp === "B" && ST4.includes(t.stratum));
const f = (y) => { const r = rows.filter((t) => t.y === y && t.kind === "pair"), nat = rows.filter((t) => t.y === 0 && t.kind === "nat"), src = y ? r : [...r, ...nat]; return { n: src.length, minLen: Math.min(...src.map((t) => t.len)), minC: Math.min(...src.map((t) => t.c)), shareLen3: round(src.filter((t) => t.len === 3).length / src.length), shareLenLe4: round(src.filter((t) => t.len <= 4).length / src.length) }; };
const out = { names: f(1), unlabelled: f(0), readerFloors: { figureLength: 3, minRecurrenceInWindow: 2 } }; out.floorsSatisfiedByAll = out.names.minLen >= 3 && out.unlabelled.minLen >= 3 && out.names.minC >= 4 && out.unlabelled.minC >= 4;
fs.writeFileSync(path.join(HERE, "results", "attack-a-floor-check.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
