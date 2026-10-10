// results/confirm-order.entSlope/posthoc.mjs — POST-HOC diagnostics run AFTER the pre-registered verdict (report.json) was known. Nothing here is pre-registered and nothing here changes the verdict.
//   P1 ent-en-waikna: its two halves have opposite signs (z -6 / +3): leave-one-document-out value of entSlope inside each half (observed value only, no null draws), which documents carry the sign.
//   P2 ent-en-dolls-house: the one REFUTED sibling: leave-one-document-out the same way (is the + sign carried by a few documents?).
//   P3 the atlas drama pockets versus the refuted sibling: unit length, tokens and status, copied from results/atlas (is 'drama' in the atlas a verse-drama class?).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { halves } from "../../lib/pocket.mjs";
import * as ORDER from "../../laws/order.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const sib = JSON.parse(fs.readFileSync(path.join(HERE, "confirm.mjs"), "utf8").match(/export const PREREG = (\{[\s\S]*?\n\});\n\/\/ ===== END/)[1]).siblings;
const out = {};
for (const id of ["ent-en-waikna", "ent-en-dolls-house"]) {
  const sp = sib.find((s) => s.id === id), p = (await (await import(pathToFileURL(path.join(ROOT, sp.loader)).href)).load([id])).find((x) => x.id === id), H = halves(p);
  out[id] = {};
  for (const which of ["discover", "confirm"]) {
    const v = H[which], docs = [...new Set(v.docOf)], full = ORDER.compute(v).entSlope, loo = [];
    for (const d of docs) { const keep = v.units.map((u, k) => (v.docOf[k] === d ? null : u)).filter(Boolean); loo.push({ doc: d, units: v.docOf.filter((x) => x === d).length, vWithout: ORDER.compute({ ...v, units: keep }).entSlope }); }
    const vs = loo.map((x) => x.vWithout);
    out[id][which] = { docs: docs.length, vFull: full, looMin: Math.min(...vs), looMax: Math.max(...vs), docsWhoseRemovalFlipsSign: loo.filter((x) => Math.sign(x.vWithout) !== Math.sign(full)).map((x) => x.doc), loo: loo.map((x) => ({ doc: x.doc, v: +x.vWithout.toFixed(5) })) };
  }
}
const dir = path.join(ROOT, "results/atlas"), drama = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); if (d.meta?.register !== "drama" || d.skipped) continue;
  const a = d.halves.discover["order.entSlope"], b = d.halves.confirm["order.entSlope"];
  drama.push({ id: d.meta.id, language: d.meta.language, tokens: d.meta.tokens, meanUnitLength: +(d.meta.tokens / d.meta.units).toFixed(1), zDiscover: +a.z.toFixed(1), zConfirm: +b.z.toFixed(1), vMean: +((a.v + b.v) / 2).toFixed(4), unitDef: String(d.meta.extra?.unitDef ?? "").slice(0, 120) });
}
out.atlasDrama = drama;
fs.writeFileSync(path.join(HERE, "posthoc.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ waikna: { discover: { ...out["ent-en-waikna"].discover, loo: undefined }, confirm: { ...out["ent-en-waikna"].confirm, loo: undefined } }, dolls: { discover: { ...out["ent-en-dolls-house"].discover, loo: undefined }, confirm: { ...out["ent-en-dolls-house"].confirm, loo: undefined } }, atlasDrama: drama }, null, 1));
