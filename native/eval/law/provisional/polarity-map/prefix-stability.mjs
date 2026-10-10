// provisional/polarity-map/prefix-stability.mjs — POST-HOC measurement: is the register property rareL_edge estimable from a PREFIX of the stream (reading time)? Not part of any verdict. New file.
// For each confirmation register: rareL_edge on the first 10%, 25% and 100% of its units (rank bins recomputed on the prefix itself). Output results/prefix-stability.json.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { prep, round } from "./lib.mjs"; import * as R from "./registers.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const rl = (stream) => { const P = prep(stream); let n = 0, le = 0; for (const u of stream) u.forEach((w, i) => { if ((P.bins.get(w) ?? 11) >= 7) { n++; if (i === 0) le++; } }); return n ? le / n : null; };
const at = (stream, fr) => rl(stream.slice(0, Math.max(20, Math.floor(stream.length * fr))));
const out = {}, add = (reg, fam, streams) => { const f = (fr) => { const v = streams.map((s) => at(s, fr)).filter((x) => x != null); return v.length ? round(v.reduce((a, b) => a + b, 0) / v.length) : null; }; out[reg] = { fam, p10: f(0.1), p25: f(0.25), full: f(1), units: streams.reduce((a, s) => a + s.length, 0) }; };
for (const stem of R.allStems()) { const b = R.udBase(stem, "test"); if (b) add(`ud-${stem}`, "ud", [b.P.stream]); }
const sp = JSON.parse(fs.readFileSync(path.join(HERE, "results", "irc-split.json"), "utf8")), cand = (id) => ({ id, path: path.join(R.IRC_ROOT, id) });
for (const lg of Object.keys(sp)) add(`irc-${lg}`, "irc", [R.ircBase(`irc-${lg}-conf`, sp[lg].conf.map(cand)).P.stream]);
const G = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/";
for (const [nm, f] of [["book-tom-sawyer", "pg1661_The_Adventures_of_Tom_Sawyer.txt"], ["book-middlemarch", "pg145_Middlemarch-George-Eliot.txt"], ["book-frankenstein", "pg84_Frankenstein.txt"]]) add(nm, "book", [R.loadText(G + f).stream]);
const dir = path.join(HERE, "results", "lex-confirm"); for (const lg of ["js", "py"]) add(`code-${lg}`, "code", Array.from({ length: 12 }, (_, i) => R.codeBase(lg, i, dir).P.stream));
const cls = (v) => (v >= 0.1 ? "high" : "low"), regs = Object.keys(out), agree = (k) => regs.filter((r) => out[r][k] != null && cls(out[r][k]) === cls(out[r].full)).length;
const summary = { registers: regs.length, agreeP10: agree("p10"), agreeP25: agree("p25"), withP10: regs.filter((r) => out[r].p10 != null).length, highFull: regs.filter((r) => cls(out[r].full) === "high"), };
fs.writeFileSync(path.join(HERE, "results", "prefix-stability.json"), JSON.stringify({ summary, out }, null, 1)); console.log(JSON.stringify(summary), regs.filter((r) => cls(out[r].p25) !== cls(out[r].full)).map((r) => [r, out[r].p25, out[r].full]));
