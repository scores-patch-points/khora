// validate_structure.mjs — INDEPENDENT STRUCTURAL CERTIFICATION of the derived ABC gold (review finding: the admission test certified only sounding
// notes; rests, measure boundaries, onsets within a measure, ties, meter and key were the converter's own table).
//
// AUTHORITY: abcjs 6.7.1 parseOnly (an ABC parser, MIT), NOT the converter, NOT the system under test, NOT music21. For every admitted derived piece and
// every gold line it recomputes, from the ABC text alone, the table the gold claims:
//   notes and rests as (measure, onset in quarters, kind, duration in quarters) with chord multiplicity, tie starts, and the meter and key (fifths) in force at
//   the first event of each measure; then compares the multiset with the gold table (music21 of the source MusicXML) per line.
// What abcjs supplies: which characters are bars, notes, rests and chords; each element's duration (tuplets, broken rhythm, unit length applied), rest type,
// tie flags, inline [M:] [K:] changes. What this script adds is only the ABC convention that a bar line after content ends a measure and that an overlay (&)
// restarts at the start of the bar (ABC 2.1). Pitch is NOT re-derived here: it is certified by the admission test (MIDI note-ons).
// A piece is CERTIFIED iff every line agrees on every facet within 1/480 quarter. A disagreement is recorded with the facet and counts, never dropped.
import abcjs from "/private/tmp/claude-501/notation/music_abc/tools/node_modules/abcjs/index.js";
import fs from "node:fs";

const ROOT = "/private/tmp/claude-501/notation/music_abc/";
const slug = (id) => id.replace(/:/g, "__");
const TICK = 480;
const q = (x) => Math.round(x * TICK);                         // quarters -> 1/480 ticks
const frac = (s) => { const [n, d] = String(s).split("/"); return Number(n) / Number(d ?? 1); };

function meterText(m) {
  if (!m) return null;
  if (m.type === "common_time") return "4/4";
  if (m.type === "cut_time") return "2/2";
  if (m.type === "specified" && m.value?.length) { const v = m.value; if (v.length > 1 || (v[0].num ?? "").includes("+")) return "composite"; return `${parseInt(v[0].num, 10)}/${parseInt(v[0].den, 10)}`; }
  return null;
}
const fifthsOf = (key) => (key?.accidentals ? key.accidentals.filter((a) => a.acc === "sharp").length - key.accidentals.filter((a) => a.acc === "flat").length : null);

/** abcjs table of ONE staff: [{m, on, kind, dur, n, tie}] and per-measure {meter, fifths}. */
function abcTable(tune, si) {
  // concatenate the staff's voice arrays over the lines
  const voices = [];
  const stateAtLine = [];
  for (const line of tune.lines) {
    if (!line.staff || !line.staff[si]) continue;
    const st = line.staff[si];
    st.voices.forEach((v, vi) => { (voices[vi] ??= []).push({ line: stateAtLine.length, els: v }); });
    stateAtLine.push({ meter: st.meter, key: st.key });
  }
  if (!voices.length) return null;
  // main voice: bars and measure indices, meter/key state
  let meter = null, fifths = null;
  const events = [], measureMeta = new Map();
  const barPos = [];                                      // startChar of every measure-ending bar of the main voice, in order
  let m = 0, has = false, clock = 0;
  const main = voices[0];
  let tm = 1, tleft = 0;                                  // abcjs keeps a tuplet as startTriplet / tripletMultiplier ... endTriplet on the elements
  const trip = (el) => { if (el.startTriplet) { tm = el.tripletMultiplier ?? 1; tleft = 1; } const f = tleft ? tm : 1; if (el.endTriplet) { tleft = 0; tm = 1; } return f; };
  const applyState = (st) => { if (st?.meter) meter = meterText(st.meter); if (st?.key) fifths = fifthsOf(st.key); };
  for (const seg of main) {
    applyState(stateAtLine[seg.line]);
    for (const el of seg.els) {
      if (el.el_type === "meter") { meter = meterText(el) ?? meter; continue; }
      if (el.el_type === "key") { fifths = fifthsOf(el) ?? fifths; continue; }
      if (el.el_type === "bar") { if (has) { barPos.push(el.startChar); m++; has = false; clock = 0; } continue; }
      if (el.el_type !== "note") continue;
      const isRest = !!el.rest, rtype = el.rest?.type;
      has = true;
      if (!measureMeta.has(m)) measureMeta.set(m, { meter, fifths });
      const dur = el.duration * 4 * trip(el);
      if (isRest && (rtype === "rest" || rtype === "whole" || rtype === "multimeasure")) events.push({ m, on: clock, kind: "rest", dur, n: 1, tie: 0 });
      else if (!isRest && el.pitches) events.push({ m, on: clock, kind: "note", dur, n: el.pitches.length, tie: el.pitches.filter((p) => p.startTie).length });
      clock += dur;
    }
  }
  // overlay voices: real content = pitched notes and visible rests; measure index from the main bars; onset from the array's own clock (reset at its bars)
  const mOf = (pos) => { let k = 0; while (k < barPos.length && barPos[k] < pos) k++; return k; };
  for (let vi = 1; vi < voices.length; vi++) {
    let c = 0; tm = 1; tleft = 0;
    for (const seg of voices[vi]) for (const el of seg.els) {
      if (el.el_type === "bar") { c = 0; continue; }
      if (el.el_type !== "note") continue;
      const dur = el.duration * 4 * trip(el);
      const real = el.pitches || (el.rest && (el.rest.type === "rest" || el.rest.type === "whole"));
      if (real && el.startChar != null) {
        const mm = mOf(el.startChar);
        if (el.pitches) events.push({ m: mm, on: c, kind: "note", dur, n: el.pitches.length, tie: el.pitches.filter((p) => p.startTie).length, overlay: true });
        else events.push({ m: mm, on: c, kind: "rest", dur, n: 1, tie: 0, overlay: true });
      }
      c += dur;
    }
  }
  return { events, measureMeta, nMeasures: has ? m + 1 : m };
}

function goldTable(line) {
  const ev = [], meta = new Map();
  for (const ms of line.measures) {
    if (ms.ev.length) meta.set(ms.i, { meter: ms.meter, fifths: ms.fifths });
    for (const e of ms.ev) ev.push({ m: ms.i, on: frac(e.on) , kind: e.k === "n" ? "note" : "rest", dur: frac(e.dur), tie: e.tie === "start" || e.tie === "continue" ? 1 : 0 });
  }
  return { ev, meta, nMeasures: line.measures.filter((x) => x.ev.length).length };
}

function multiset(items, keyFn, mult = (x) => 1) { const mm = new Map(); for (const x of items) mm.set(keyFn(x), (mm.get(keyFn(x)) ?? 0) + mult(x)); return mm; }
function diff(a, b, keep = 0) {
  let only_a = 0, only_b = 0; const ex = [];
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys) { const x = a.get(k) ?? 0, y = b.get(k) ?? 0; if (x > y) { only_a += x - y; if (ex.length < keep) ex.push("gold_only " + k); } else if (y > x) { only_b += y - x; if (ex.length < keep) ex.push("abc_only " + k); } }
  return { gold_only: only_a, abc_only: only_b, ...(keep ? { examples: ex } : {}) };
}

function certifyPiece(id) {
  const g = JSON.parse(fs.readFileSync(`${ROOT}gold/event/${slug(id)}.json`, "utf8"));
  const txt = fs.readFileSync(`${ROOT}derived/${slug(id)}.abc`, "utf8");
  let tune;
  try { tune = abcjs.parseOnly(txt)[0]; } catch (e) { return { certified: false, why: "abcjs_error:" + String(e.message).slice(0, 60) }; }
  const nStaff = Math.max(0, ...tune.lines.filter((l) => l.staff).map((l) => l.staff.length));
  if (nStaff !== g.parts.length) return { certified: false, why: `staff_count_differs(abc ${nStaff}, gold ${g.parts.length})`, lines: [] };
  const lines = []; let all = true;
  g.parts.forEach((part, k) => {
    const A = abcTable(tune, k), G = goldTable(part);
    if (!A) { lines.push({ ok: false, why: "no_staff" }); all = false; return; }
    const keySlot = (x) => `${x.m}|${q(x.on)}|${x.kind}|${q(x.dur)}`;
    const gs = multiset(G.ev, keySlot), as = multiset(A.events, keySlot, (x) => x.n);
    const restG = multiset(G.ev.filter((x) => x.kind === "rest"), keySlot), restA = multiset(A.events.filter((x) => x.kind === "rest"), keySlot, (x) => x.n);
    const noteG = multiset(G.ev.filter((x) => x.kind === "note"), keySlot), noteA = multiset(A.events.filter((x) => x.kind === "note"), keySlot, (x) => x.n);
    const tieG = multiset(G.ev.filter((x) => x.tie), (x) => `${x.m}|${q(x.on)}`), tieA = multiset(A.events.filter((x) => x.tie), (x) => `${x.m}|${q(x.on)}`, (x) => x.tie);
    const dSlots = diff(gs, as, 4), dRest = diff(restG, restA, 4), dNote = diff(noteG, noteA, 4), dTie = diff(tieG, tieA, 4);
    // meter and key at each measure that has events in the gold
    let meterBad = 0, keyBad = 0, nMeas = 0;
    for (const [mi, gm] of G.meta) {
      nMeas++;
      const am = A.measureMeta.get(mi);
      if (!am || am.meter !== gm.meter) meterBad++;
      if (!am || am.fifths !== gm.fifths) keyBad++;
    }
    const mA = new Set(A.events.map((x) => x.m)), mG = new Set(G.ev.map((x) => x.m));
    const measuresOk = mA.size === mG.size && [...mG].every((x) => mA.has(x));
    const facets = { measures: measuresOk, rests: dRest.gold_only + dRest.abc_only === 0, notes: dNote.gold_only + dNote.abc_only === 0, ties: dTie.gold_only + dTie.abc_only === 0, meter: meterBad === 0, key: keyBad === 0 };
    const ok = Object.values(facets).every(Boolean) && dSlots.gold_only + dSlots.abc_only === 0;
    if (!ok) all = false;
    lines.push({ ok, facets, n_gold: G.ev.length, n_abc: A.events.reduce((a, x) => a + x.n, 0), measures: { abc_with_events: mA.size, gold_with_events: mG.size }, slot_diff: dSlots, rest_diff: dRest, note_diff: dNote, tie_diff: dTie, meter_bad: meterBad, key_bad: keyBad, n_meas: nMeas });
  });
  return { certified: all, why: all ? "ok" : "structure_disagrees_with_gold", lines };
}

const val = JSON.parse(fs.readFileSync(`${ROOT}derived/validation.json`, "utf8"));
const out = {}, summary = { pieces: 0, certified: 0, by_source: {}, facets_failed: {} };
for (const [id, v] of Object.entries(val)) {
  if (!v.admitted) continue;
  const r = certifyPiece(id);
  out[id] = r; summary.pieces++;
  const src = id.split(":")[0]; summary.by_source[src] ??= { pieces: 0, certified: 0 }; summary.by_source[src].pieces++;
  if (r.certified) { summary.certified++; summary.by_source[src].certified++; }
  else for (const ln of r.lines ?? []) if (!ln.ok && ln.facets) for (const [f, ok] of Object.entries(ln.facets)) if (!ok) summary.facets_failed[f] = (summary.facets_failed[f] ?? 0) + 1;
}
out.__summary = summary;
fs.writeFileSync(`${ROOT}derived/structure.json`, JSON.stringify(out));
console.log(JSON.stringify(summary, null, 1));
