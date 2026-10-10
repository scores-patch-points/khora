// postfp.mjs: DESCRIPTIVE sample (single rater, no verdict weight): distinct ordinary-token forms flagged at ISHARE >= 0.67 on R days >= 1500 messages (gold label N), 40 drawn by seeded shuffle. Prints form, flagged-mention count, two raw example lines.
// Rater labels are written by hand to results/postfp-labels.json AFTER reading results/postfp-items.txt (arm and day hidden: only form + example lines are shown). Run: node postfp.mjs
import fs from "node:fs";
import { loadDay, buildIx, feat, laterOccs, SETS, rngOf, shuffleIn, IRC_ROOT, toks } from "./lib.mjs";
process.env.NAME_COMPANY_PAIRBLOCK = "1";
const rows = [];
for (const key of SETS.R) { const d = loadDay(key); if (d.T.length < 1500) continue; const ix = buildIx(d.T), raw = fs.readFileSync(`${IRC_ROOT}/${key}`, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean).filter(([, , t]) => toks(t).length >= 1).map(([l]) => l), F = new Map();
  d.T.forEach((_, k) => { }); for (const o of laterOccs(d)) { if (o.cls !== "N" || feat(ix, o.k, o.w).ishare < 0.67) continue; const r = F.get(o.w) ?? F.set(o.w, { w: o.w, n: 0, ks: [] }).get(o.w); r.n++; if (r.ks.length < 2) r.ks.push(o.k); }
  for (const r of F.values()) rows.push({ key, w: r.w, n: r.n, ex: r.ks.map((k) => raw[k]?.slice(0, 110)) }); }
const items = shuffleIn(rows, rngOf("postfp")).slice(0, 40).map((r, j) => ({ id: j + 1, ...r }));
fs.writeFileSync(new URL("./results/postfp-items.json", import.meta.url), JSON.stringify(items));
console.log("distinct flagged ordinary forms (R, >=1500 msgs):", rows.length);
for (const it of items) console.log(it.id, it.w, "x" + it.n, "|", (it.ex[0] ?? "").replace(/^<[^>]+>\s*/, ""), "||", (it.ex[1] ?? "").replace(/^<[^>]+>\s*/, ""));
