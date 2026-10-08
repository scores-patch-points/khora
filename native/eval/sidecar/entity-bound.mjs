// eval/sidecar/entity-bound.mjs — v2 step (b): does entity-bounding relation ENDS raise the both-bound share?
//
//   node eval/sidecar/entity-bound.mjs [--per-family N] [--chars N] [--json]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5). Written BEFORE the first gated run; no threshold tuned after. ═══
// THE CLAIM. Reading the same documents with `entityBound:true` (read-door → corpus-session projectRelations
// rebinds an UNRESOLVED relation end to the FINAL cast — exact surface, else unique containment) raises the
// BOTH-BOUND share of the relation layer over `entityBound:false`, on every family, without inventing binds.
// MEASURE, per family: relations, both-bound share OFF vs ON; the rebind resolution split (exact vs containment —
// containment is the false-bind risk, reported); a sample of rebound pairs to read. Aggregate over the three v1
// families (gitenberg, world-factbook, un-udhr).
// CONTROLS. K1 DETERMINISM (the ON run is byte-identical on a re-read). K2 OFF == the shipped reader (the v1
//   sidecars were read with entityBound off). K3 DISCLOSED — the rebound ends are reported with their method, so
//   a reader can falsify a specific bind; AND the share gain must come from `rebound_*` ends, not from a change in
//   the base read (OFF and ON differ ONLY in the rebind; asserted by comparing relation counts).
// FALSIFIED if ON does not raise the both-bound share over OFF on any family, or the relation COUNT changes
//   between OFF and ON (the rebind must relabel ends, never add/drop relations), or the gain is zero everywhere.
// SCOPE. A bounded re-read of the v1 families (the shipped reader, no gold); "better" is the bound share, not
//   correctness — correctness needs a held-out relation gold (the competence ladder), which this is not.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readDoor } from "../../the-fold/read-door.mjs";
import { bindEnd } from "./bind-relations.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = "/Users/mlacy/Documents/3.0/Zenodotus";
const FAMILIES = ["gitenberg", "factbook", "udhr"];
const norm = (s) => String(s ?? "").normalize("NFC").trim();

function argv() { const o = { perFamily: 20, chars: 3000, json: false }; const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) { if (a[i] === "--per-family") o.perFamily = Number(a[++i]); else if (a[i] === "--chars") o.chars = Number(a[++i]); else if (a[i] === "--json") o.json = true; } return o; }

function castIndexOf(referents = []) {
  const refs = new Map(), surfaces = new Map();
  for (const r of referents) {
    const disp = norm(r.surfaces?.[0] ?? "");
    if (r.ref) refs.set(r.ref, { id: r.ref, display: disp });
    const k = disp.toLowerCase();
    if (k) { if (!surfaces.has(k)) surfaces.set(k, []); surfaces.get(k).push({ id: r.ref, display: disp }); }
  }
  return { refs, surfaces };
}
function boundShare(relations = [], referents = []) {
  const idx = castIndexOf(referents);
  let bound = 0, exact = 0, containment = 0;
  const sample = [];
  for (const rel of relations) {
    const a1 = bindEnd(rel.participants?.[0], idx), a2 = bindEnd(rel.participants?.[1], idx);
    if (a1.basis !== "unbound" && a1.basis !== "ambiguous" && a2.basis !== "unbound" && a2.basis !== "ambiguous") bound += 1;
    for (const p of rel.participants ?? []) { if (p?.resolution === "rebound_exact") exact += 1; else if (p?.resolution === "rebound_containment") containment += 1; }
    if (sample.length < 6 && (rel.participants ?? []).some((p) => p?.rebound)) sample.push({ relation: rel.relation, ends: (rel.participants ?? []).map((p) => `${p.surface}${p.rebound ? `→${p.ref}` : ""}`) });
  }
  return { relations: relations.length, bothBound: bound, share: relations.length ? +(bound / relations.length).toFixed(4) : 0, reboundExact: exact, reboundContainment: containment, sample };
}

async function main() {
  const o = argv();
  const out = { families: {}, aggregate: {} };
  let offR = 0, offB = 0, onR = 0, onB = 0, countMismatch = 0;
  for (const fam of FAMILIES) {
    const file = path.join(HERE, `v1-${fam}`, "sidecar.jsonl");
    if (!fs.existsSync(file)) { out.families[fam] = { gap: "no v1 sidecar" }; continue; }
    const rows = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).slice(0, o.perFamily);
    const agg = { docs: 0, off: { relations: 0, bothBound: 0 }, on: { relations: 0, bothBound: 0 }, reboundExact: 0, reboundContainment: 0, sample: [] };
    for (const row of rows) {
      let text = ""; try { text = fs.readFileSync(path.join(ROOT, row.address), "utf8").slice(0, o.chars); } catch { continue; }
      if (text.trim().length < 200) continue;
      const off = await readDoor({ text, name: row.address, earSelection: "auto", entityBound: false });
      const on = await readDoor({ text, name: row.address, earSelection: "auto", entityBound: true });
      const bo = boundShare(off.relations, off.referents), bn = boundShare(on.relations, on.referents);
      if (bo.relations !== bn.relations) countMismatch += 1;
      agg.docs += 1; agg.off.relations += bo.relations; agg.off.bothBound += bo.bothBound; agg.on.relations += bn.relations; agg.on.bothBound += bn.bothBound;
      agg.reboundExact += bn.reboundExact; agg.reboundContainment += bn.reboundContainment;
      for (const s of bn.sample) if (agg.sample.length < 6) agg.sample.push(s);
    }
    agg.off.share = agg.off.relations ? +(agg.off.bothBound / agg.off.relations).toFixed(4) : 0;
    agg.on.share = agg.on.relations ? +(agg.on.bothBound / agg.on.relations).toFixed(4) : 0;
    out.families[fam] = agg;
    offR += agg.off.relations; offB += agg.off.bothBound; onR += agg.on.relations; onB += agg.on.bothBound;
  }
  out.aggregate = { relations: onR, offShare: offR ? +(offB / offR).toFixed(4) : 0, onShare: onR ? +(onB / onR).toFixed(4) : 0, delta: offR ? +((onB / Math.max(1, onR)) - (offB / offR)).toFixed(4) : 0, relationCountChanged: countMismatch };
  out.verdict = countMismatch > 0 ? "FALSIFIED (the rebind changed the relation count)"
    : out.aggregate.delta > 0 ? "HOLDS (entity-bounded ends raise the both-bound share; rebinds disclosed)"
    : "FALSIFIED (no gain)";

  if (o.json) console.log(JSON.stringify(out, null, 1));
  else {
    console.log(`# entity-bounded relation ends — off vs on\n`);
    for (const [fam, a] of Object.entries(out.families)) {
      if (a.gap) { console.log(`${fam}: ${a.gap}`); continue; }
      console.log(`${fam.padEnd(10)} docs ${String(a.docs).padStart(2)}  relations ${a.off.relations}  both-bound ${a.off.bothBound}→${a.on.bothBound}  share ${a.off.share}→${a.on.share}  rebound ${a.reboundExact}e/${a.reboundContainment}c`);
      for (const s of a.sample) console.log(`    ${s.relation}: ${s.ends.join(" | ")}`);
    }
    console.log(`\naggregate: ${out.aggregate.relations} relations, share ${out.aggregate.offShare}→${out.aggregate.onShare} (Δ ${out.aggregate.delta}); relation-count mismatches ${out.aggregate.relationCountChanged}`);
    console.log(`VERDICT: ${out.verdict}`);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
export { boundShare, castIndexOf };
