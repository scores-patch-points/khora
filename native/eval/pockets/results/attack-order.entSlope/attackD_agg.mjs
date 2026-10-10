// attackD_agg.mjs -- aggregate D_raw_*.jsonl and add the atlas planted pockets (pl-*) measured the same way.  node attackD_agg.mjs -> D_summary.json
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { HERE, halves, f, TABLE } from "./lib.mjs";
import { measure } from "./lib2.mjs";
const rows = []; for (const fn of fs.readdirSync(HERE).filter((x) => /^D_raw_\d+\.jsonl$/.test(x))) for (const l of fs.readFileSync(path.join(HERE, fn), "utf8").split("\n").filter(Boolean)) rows.push(JSON.parse(l));
rows.sort((a, b) => (a.kind + a.V + a.alpha0 < b.kind + b.V + b.alpha0 ? -1 : 1));
const out = { worlds: [], lawFree: {}, gradient: {}, atlasPlanted: [] };
const cellV = (c) => (c.discover?.v != null && c.confirm?.v != null ? (c.discover.v + c.confirm.v) / 2 : null), cellS = (c) => (c.discover?.sigma != null && c.confirm?.sigma != null ? (c.discover.sigma + c.confirm.sigma) / 2 : null);
for (const r of rows) out.worlds.push({ id: r.id, kind: r.kind, V: r.V, alpha0: r.alpha0, delta: r.delta, tokens: r.tokens, cells: r.cells.map((c) => ({ N: c.N, status: c.status ?? c.skipped, v: cellV(c), sigma: cellS(c), shift: c.discover?.shift != null ? (c.discover.shift + c.confirm.shift) / 2 : null, zD: c.discover?.z ?? null, zC: c.confirm?.z ?? null })) });
const cells = (kind) => out.worlds.filter((w) => w.kind === kind).flatMap((w) => w.cells.filter((c) => c.v != null).map((c) => ({ ...c, id: w.id, V: w.V, alpha0: w.alpha0 })));
const w0 = cells("W0"), w1 = cells("W1");
const byDelta = {}; for (const dl of [0.05, 0.1, 0.3]) { const x = out.worlds.filter((w) => w.kind === "W1" && w.delta === dl).flatMap((w) => w.cells.filter((c) => c.v != null).map((c) => ({ ...c, V: w.V, alpha0: w.alpha0 }))); byDelta[dl] = { nCells: x.length, Pplus: x.filter((c) => c.status === "P+").length, Pminus: x.filter((c) => c.status === "P-").length, other: x.filter((c) => !["P+", "P-"].includes(c.status)).length, signVequalsSignSigma: x.filter((c) => Math.sign(c.v) === Math.sign(c.sigma)).length, vRange: [Math.min(...x.map((c) => c.v)), Math.max(...x.map((c) => c.v))], shiftRange: [Math.min(...x.map((c) => c.shift)), Math.max(...x.map((c) => c.shift))], inAtlasRange: x.filter((c) => c.v >= -0.168 && c.v <= 0.266).length, bothSignsPresentInAtlasRange: { plus: x.filter((c) => c.status === "P+" && c.v <= 0.266).length, minus: x.filter((c) => c.status === "P-" && c.v >= -0.168).length } }; }
out.gradientByDelta = byDelta;
out.lawFree = { nCells: w0.length, present: w0.filter((c) => c.status === "P+" || c.status === "P-").length, absent: w0.filter((c) => c.status === "A").length, ambiguous: w0.filter((c) => c.status === "M").length, maxAbsV: Math.max(...w0.map((c) => Math.abs(c.v))), maxAbsZ: Math.max(...w0.flatMap((c) => [Math.abs(c.zD), Math.abs(c.zC)])) };
out.gradient = { nCells: w1.length, Pplus: w1.filter((c) => c.status === "P+").length, Pminus: w1.filter((c) => c.status === "P-").length, other: w1.filter((c) => !["P+", "P-"].includes(c.status)).length, signOfVEqualsSignOfSigma: w1.filter((c) => Math.sign(c.v) === Math.sign(c.sigma)).length, minV: Math.min(...w1.map((c) => c.v)), maxV: Math.max(...w1.map((c) => c.v)), shiftRange: [Math.min(...w1.map((c) => c.shift)), Math.max(...w1.map((c) => c.shift))] };
// atlas planted pockets measured with the same sigma/shift code
const T = TABLE(); const m = await import(pathToFileURL(path.join(HERE, "../../loaders/planted.mjs")).href), ps = await m.load(null);
for (const p of ps) { const H = halves(p), a = measure(H.discover), c = measure(H.confirm), t = T.rows.find((r) => r.id === p.id); out.atlasPlanted.push({ id: p.id, atlasStatus: t.status, atlasV: t.v["order.entSlope"], zs: t.zs["order.entSlope"], sigma: a && c ? (a.sigma + c.sigma) / 2 : null, shift: a && c ? (a.shift + c.shift) / 2 : null }); }
fs.writeFileSync(path.join(HERE, "D_summary.json"), JSON.stringify(out, null, 1));
console.log("LAW-FREE W0:", JSON.stringify(out.lawFree)); console.log("GRADIENT W1:", JSON.stringify(out.gradient)); for (const [d, x] of Object.entries(byDelta)) console.log("  delta", d, JSON.stringify(x));
for (const k of ["W1", "W2", "W3"]) { console.log("--", k); for (const w of out.worlds.filter((w) => w.kind === k)) console.log(`  V=${String(w.V).padEnd(5)} a0=${w.alpha0} dl=${w.delta} ` + w.cells.map((c) => `${String(c.N).padStart(5)}:${(c.status ?? "").padEnd(2)} v=${f(c.v, 4)} sg=${f(c.sigma, 2)}`).join(" | ")); }
console.log("atlas planted:", out.atlasPlanted.map((x) => `${x.id} ${x.atlasStatus} v=${f(x.atlasV, 4)} sigma=${f(x.sigma, 3)} shift=${f(x.shift, 3)}`).join("\n  "));
