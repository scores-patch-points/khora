// telling-organs.js — THIN ADAPTERS from the Callimachus record (pages, atoms, entities, claims) to the engine's REGISTERED cell organs,
// for the three terrains the telling once filled with declared stand-ins (Kind, Atmosphere, Paradigm). Pure. Never a second organ: every
// function here only reshapes the record into an organ's own input, calls the organ unchanged, and maps its answer back to record ids.
//
//   induceTerrain(units, { population })  → terrainInduction (SIG·Pattern `kinds`) + testKindMembers (NUL·Pattern `kindnull`) over ANY
//                                           population of units — figures for Kind, pages for Paradigm (the user's direction: "the work
//                                           we did on induction for ALL terrains"; kernel/terrain-induction.js's own header)
//   kindTerrain(record)                   → Kind: the figures, each featured by the figures it co-arrives with in one claim
//   paradigmTerrain(record)               → Paradigm: the pages, each featured by the figures it names (the same co-arrival, one grain up)
//   atmosphereTerrain(record, { textOf }) → Atmosphere: REC·Ground `regime` (source.js atmosphereBoundaries over loops/atmosphere.js)
//                                           and EVA·Ground `atmosphere` (aperture.js meter, read with meterSnapshot), pages read in
//                                           order of publication
//   testimonyOf(record)                   → EVA·Pattern `standing`: capacity-runner.js mergeTestimony over each claim's chains
//
// THE FEATURES ARE DECLARED ONCE, NOT CHOSEN BY OUTCOME. Co-arrival is the relation THE-27-CELLS.md records for SIG·Pattern's own use
// ("co-arrival features alone surfaced basin[4]") and the relation the retired stand-in measured. Other feature sets were run on
// permanent-dst and give different basins; they are recorded in docs/CALLIMACHUS.md §10 as a disclosure, never used to pick this one.
//
// THE REGIME IS RECEIVED. { window: 5, draws: 256, tolerance: 3, hop: 5 } is the ATMOSPHERE_REGIME source.js's atmosphereBoundaries
// header names for exactly this call ("Reuse packages/host/terrains.js's own ATMOSPHERE_REGIME rather than re-deriving a second set of
// numbers"), and one of the two parameter sets atmosphere.js's MIN_GROUND calibration measured. Nothing here is tuned.
import { terrainEvidence, createTerrainInductionIndex, terrainInductionCandidates, terrainInductionDiagnostics } from "../kernel/terrain-induction.js";
import { testKindMembers } from "../kernel/entity-kind-induction.js";
import { atmosphereBoundaries } from "./source.js";
import { readAtmosphere } from "../legacy-ported/packages/engine/loops/atmosphere.js";
import { causalSurprisalSeries } from "../adapters/text/material.js";
import { makeApertureMeter, meterSnapshot } from "../the-fold/aperture.js";
import { createTierStack, foldThrough } from "../legacy-ported/packages/engine/emergence/tiers.js";
import { mergeTestimony } from "./capacity-runner.js";

/** Giver: organs/source.js atmosphereBoundaries header (packages/host/terrains.js ATMOSPHERE_REGIME). */
export const ATMOSPHERE_REGIME = Object.freeze({ window: 5, draws: 256, tolerance: 3, hop: 5 });

const byteOffset = (address) => { const m = /#b(\d+)-(\d+)$/.exec(String(address ?? "")); return m ? Number(m[1]) : null; };

/**
 * THE THIRD NULL, measured on this adapter's own negative control (telling-organs.test.mjs; docs/CALLIMACHUS.md §10): on structureless
 * co-arrivals (30 figures, random partners) the inducer and testKindMembers BOTH pass a near-whole-population basin (28–29 of 30) on
 * 4 of 8 seeds — each null compares a basin with random subsets of the SAME population, and a population with no structure still has a
 * best basin. So the population itself is nulled: the feature values are shuffled across rows (each unit keeps how often it arrives,
 * each value how often it is seen; who-arrives-with-whom is destroyed), the same organ is run on each shuffle, and a kind is told only
 * when its binding energy exceeds the 95th percentile (the inducer's own quantile) of the best held binding energy across shuffles.
 * 19 draws is the fewest that resolve that quantile (1/20). The organ is unchanged; this only asks it the same question of nothing.
 */
export const POPULATION_NULL = Object.freeze({ draws: 19, quantile: 0.95 });
const seeded = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return h / 4294967296; }; };

function inducedKinds(units, population) {
  const entries = units.map((u, i) => terrainEvidence({ id: `${population}:${i}`, entityRef: u.unit, featureKey: u.feature, featureValue: u.value, sequencePosition: u.seq, witness: u.witness ?? null }));
  const index = createTerrainInductionIndex(entries);
  return { index, candidates: terrainInductionCandidates(index), diagnostics: terrainInductionDiagnostics(index).populationKinds };
}

/**
 * induceTerrain(units, { population }) — units: [{ unit, feature, value, seq, witness }], one row per observed feature. The organ's
 * own index is built from them (terrainEvidence), its population candidates read (terrainInductionCandidates: each basin with its own
 * random-subset binding-energy null), and every candidate is then challenged as a DECLARED membership through testKindMembers, whose null
 * draws differently by construction. A kind HOLDS only when both doors pass. A fallback nomination (no basin cleared) never holds.
 */
export function induceTerrain(units, { population, nullDraws = POPULATION_NULL.draws } = {}) {
  const { index, candidates, diagnostics } = inducedKinds(units, population);
  // The population null: the same organ over shuffled feature values; the best binding energy any held basin reaches in each draw.
  const rnd = seeded(population);
  const best = [];
  for (let d = 0; d < nullDraws; d++) {
    const vals = units.map((u) => u.value);
    for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
    const sh = inducedKinds(units.map((u, i) => ({ ...u, value: vals[i] })).filter((u) => u.value !== u.unit), `${population}:null:${d}`);
    best.push(Math.max(0, ...sh.candidates.filter((c) => c.field?.stable && !c.fallbackNomination).map((c) => c.field.bindingEnergy)));
  }
  best.sort((a, b) => a - b);
  const bar = best.length ? best[Math.floor(POPULATION_NULL.quantile * (best.length - 1))] : 0;
  const kinds = candidates.map((c) => {
    const challenge = testKindMembers(index.entityFeatures, c.memberRefs, { population });
    const induced = { stable: c.field?.stable === true, p: c.cohesionNull?.pValue ?? null, fallback: c.fallbackNomination === true };
    const challenged = challenge.refused ? { refused: challenge.refused.type } : { cleared: challenge.cleared, p: challenge.bindingNull.pValue };
    return {
      id: c.kindKey,
      members: [...c.memberRefs],
      // The organ's own distinguishing parameters, as { feature, value }: what the members share most.
      shares: c.distinguishingParameters.map((p) => ({ feature: p.featureKey, value: p.featureValue })),
      induced,
      challenged,
      population_null: { energy: c.field?.bindingEnergy ?? null, bar, exceeded: (c.field?.bindingEnergy ?? -Infinity) > bar },
      holds: induced.stable && !induced.fallback && challenged.cleared === true && (c.field?.bindingEnergy ?? -Infinity) > bar,
    };
  });
  return { population, units: index.entityFeatures.size, diagnostics, population_null: { draws: nullDraws, quantile: POPULATION_NULL.quantile, bar, best }, kinds, held: kinds.filter((k) => k.holds) };
}

/** Kind: figures, featured by the figures they co-arrive with in one claim. Sequence = the atom's place in the record. */
export function kindTerrain(record) {
  const known = new Set(record.entities.map((e) => e.id));
  const units = [];
  record.atoms.forEach((a, seq) => {
    const es = [...new Set(a.entities ?? [])].filter((e) => known.has(e));
    for (const e of es) for (const o of es) if (o !== e) units.push({ unit: e, feature: "with", value: o, seq, witness: a.span });
  });
  return induceTerrain(units, { population: "callimachus:figures" });
}

/** Paradigm: pages, featured by the figures they name — the same co-arrival relation, read one grain up (a page is the unit). */
export function paradigmTerrain(record) {
  const known = new Set(record.entities.map((e) => e.id));
  const units = [];
  record.atoms.forEach((a, seq) => { for (const e of new Set(a.entities ?? [])) if (known.has(e)) units.push({ unit: a.pinax, feature: "names", value: e, seq, witness: a.span }); });
  return induceTerrain(units, { population: "callimachus:pages" });
}

/** Pages in reading order for the Atmosphere: by declared publication date; undated pages last, in record order (disclosed). */
export function publicationOrder(record) {
  return record.sources.map((s, i) => ({ s, i })).sort((x, y) => (!x.s.declared?.published) - (!y.s.declared?.published) || String(x.s.declared?.published ?? "").localeCompare(String(y.s.declared?.published ?? "")) || x.i - y.i).map((x) => x.s);
}

/**
 * Atmosphere. `textOf(pageId)` → the page's pinned text (string). Without it the terrain is a typed gap, never a guess.
 *   regime  REC·Ground — the pages' texts, joined in publication order, handed whole to atmosphereBoundaries; its regions (or its typed
 *           decline, null) mapped back to pages and to every atom's own byte position.
 *   meter   EVA·Ground — one arrival per page through the aperture meter; each page's placement against the ground the pages before it
 *           built: "above" (beyond every continuation of that ground), "below" (steadier than every continuation), placed, or unmeasured.
 */
export function atmosphereTerrain(record, { textOf = null } = {}) {
  if (typeof textOf !== "function") return { gap: "no_text", detail: { supplied: false } };
  const order = publicationOrder(record);
  const texts = order.map((s) => textOf(s.id));
  if (texts.some((t) => typeof t !== "string")) return { gap: "no_text", detail: { unresolved: order.filter((s) => typeof textOf(s.id) !== "string").map((s) => s.id) } };
  const startOf = new Map();
  let body = "";
  for (const [i, s] of order.entries()) { startOf.set(s.id, body.length); body += `${texts[i]}\n\n`; }
  const pageAt = (x) => { let k = order[0]; for (const s of order) if (startOf.get(s.id) <= x) k = s; return k; };

  const found = atmosphereBoundaries("callimachus:record", body, 0, { causalSurprisalSeries, readAtmosphere, regime: ATMOSPHERE_REGIME });
  const regions = (found ?? []).map((g, i) => {
    const first = pageAt(g.start);
    const pages = order.filter((s) => startOf.get(s.id) < g.end && startOf.get(s.id) + textOf(s.id).length > g.start).map((s) => s.id);
    return { id: `atm_${i}`, start: g.start, end: g.end, first: first.id, at_page_start: g.start <= startOf.get(first.id) + 2, pages };
  });
  const enc = new TextEncoder(), dec = new TextDecoder();
  const bytesOf = new Map(order.map((s, i) => [s.id, enc.encode(texts[i])]));
  for (const a of record.atoms) {
    const b = byteOffset(a.span);
    if (b == null || !startOf.has(a.pinax) || !regions.length) { a.ground_id = null; continue; }
    const at = startOf.get(a.pinax) + dec.decode(bytesOf.get(a.pinax).subarray(0, b)).length;
    a.ground_id = regions.find((g) => g.start <= at && at < g.end)?.id ?? null;
  }

  const meter = makeApertureMeter({ createTierStack, foldThrough });
  const m = meter.create();
  const placements = order.map((s, i) => { const o = meter.observe(m, { turn: i, role: "page", text: texts[i] }); return { page: s.id, censored: o.censored, rank: o.rank, gap: o.gap }; });
  return {
    order: order.map((s) => s.id),
    regime: found == null ? { declined: true, by: "atmosphereBoundaries" } : { regions, rezeros: Math.max(0, regions.length - 1) },
    meter: { placements, snapshot: meterSnapshot(m) },
  };
}

/**
 * EVA·Pattern: each claim's standing ACROSS witnesses, by mergeTestimony. One reading per independent chain of the claim ("holds", read =
 * its atoms' spans); one per chain of a rival claim on another page with the opposite polarity ("refused"). Rivals that differ in object
 * but share polarity do not refuse this claim and are not readings of it.
 */
export function testimonyOf(record) {
  const atomById = new Map(record.atoms.map((a) => [a.id, a]));
  const byKey = new Map(record.claims.map((c) => [c.key, c]));
  const chains = (c) => { const m = new Map(); for (const id of c.atoms) { const a = atomById.get(id); const k = a.chain ?? a.id; (m.get(k) ?? m.set(k, []).get(k)).push(a); } return [...m.values()]; };
  const out = new Map();
  for (const c of record.claims) {
    const [, , pol] = c.key.split("|");
    const mine = new Set(c.atoms.map((id) => atomById.get(id).pinax));
    const readings = chains(c).map((as) => ({ verdict: "holds", read: as.map((a) => a.span), witness: as[0].pinax }));
    for (const k of c.rivals ?? []) {
      const o = byKey.get(k);
      const opol = k.split("|")[2];
      if (!o || pol === "unknown" || opol === "unknown" || opol === pol) continue;
      for (const as of chains(o).map((xs) => xs.filter((a) => !mine.has(a.pinax))).filter((xs) => xs.length)) readings.push({ verdict: "refused", read: as.map((a) => a.span), witness: as[0].pinax });
    }
    const t = mergeTestimony(readings);
    out.set(c.key, { case: t.case, verdict: t.verdict, standing: t.standing, holds: t.holds.length, refused: t.refused.length });
  }
  return out;
}
