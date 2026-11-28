import fs from "node:fs";
const rs = fs.readdirSync("out").map((f) => JSON.parse(fs.readFileSync("out/" + f))), ref = rs.find((r) => r.name === "English-WEB");
const kappa = (a, b) => { const n = a.length; let po = 0, a1 = 0, b1 = 0; for (let i = 0; i < n; i++) { if (a[i] === b[i]) po++; if (a[i]) a1++; if (b[i]) b1++; } po /= n; const pe = (a1 / n) * (b1 / n) + (1 - a1 / n) * (1 - b1 / n); return pe === 1 ? 0 : (po - pe) / (1 - pe); };
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const shuffle = (x) => { const a = [...x]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rows = [];
for (const r of rs.filter((x) => !x.gap).sort((a, b) => a.name.localeCompare(b.name))) {
  const row = { name: r.name, code: r.code, tok: r.tokenizer, markers: r.markers, sent: r.sentences, flagRate: r.flagRate, specific: +(r.specificRate ?? 0).toFixed(2), carriers: r.polarity.carriers, errs: r.errs, topGap: Object.entries(r.gaps).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k}:${v}`).join(" ") };
  if (!r.polarity.available) { row.neg = "ABSTAIN(no source)"; rows.push(row); continue; }
  const ids = Object.keys(r.neg).filter((i) => ref.neg[i] != null && r.neg[i] != null), a = ids.map((i) => r.neg[i]), b = ids.map((i) => ref.neg[i]), k = kappa(a, b), nulls = Array.from({ length: 1000 }, () => kappa(shuffle(a), b)).sort((x, y) => x - y), bar = nulls[949];
  Object.assign(row, { negVerses: a.filter(Boolean).length, refNeg: b.filter(Boolean).length, kappa: +k.toFixed(2), nullBar: +bar.toFixed(2), neg: r.name === "English-WEB" ? "REFERENCE" : k > bar ? "tracks" : "C1 TRIGGERED" }); rows.push(row);
}
fs.writeFileSync("summary.json", JSON.stringify(rows, null, 1));
for (const r of rows) console.log([r.name.padEnd(15), r.code, (r.tok ?? "").padEnd(7), r.markers ? "mk" : "--", String(r.sent).padStart(4), ("flag " + r.flagRate).padEnd(10), "spec " + r.specific, "| neg", String(r.negVerses ?? "-").padStart(3), "k", String(r.kappa ?? "-").padStart(5), "bar", String(r.nullBar ?? "-").padStart(5), r.neg, "|", r.topGap].join(" "));
const t = rows.filter((r) => r.neg === "tracks").length, c1 = rows.filter((r) => r.neg === "C1 TRIGGERED").length, ab = rows.filter((r) => String(r.neg).startsWith("ABSTAIN")).length; console.log({ editionsRead: rows.length, tracks: t, c1Triggered: c1, abstainNoSource: ab, gapsNoParser: rs.filter((x) => x.gap).length });
