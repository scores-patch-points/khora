// reader-identity.js — IDENTITY FROM THE READER'S SIDE: two things are the same for a reader if meeting the second moves the reader's state the way meeting the first again would.
//
// The reading had been the evidence (corpus-identity.js: nodes per mention, three occurrences on both sides, the reader a constant stamped on the verdict). Here the reader is the
// instrument. THE STATE is an append-only log of admissions (address, relation, value) kept as a holograph of slots (kernel/bayes-surprise.js: a Dirichlet per slot, the unseen kept
// possible); MEETING a mention is scored by how far it moves that state (surprisal in bits, the repo's own measure: "it either makes what happened less surprising or more surprising,
// but it doesn't do nothing"). For a mention B and the beings A_1..A_n the reader has met:
//   bits(B as A_i)   the surprisal of B's arrangements read at A_i's address (what meeting A_i again, saying this, would cost)
//   bits(B as new)   the surprisal of B's arrangements at a fresh address (what a new thing would cost)
//   recall           the address with the least movement over what the thing IS (its arrangements that are not one-valued slots); NOISE its bits; DMD the next distinct level; the plateau
//                    [noise, dmd) read off the candidates (identity-cancel.js's rule). The one-valued slots are read AFTER the recall, at that address (what the thing SAYS).
//   same             one address alone has the least movement AND it moves less than a new thing would (B behaves as A_i met again)
//   different        every address moves at least as much as a new thing: B behaves as a new thing (said as `new`)
//   undecided        two addresses tie at the least movement (named); refused when B carries no arrangement
// A SLOT MOVED (the discrepancy finder's case): a value B carries for a one-valued relation at the recalled address that the address already holds another value of; the bits it moved
// are reported with the held and the arriving value. The caller decides what is one-valued (a given relation; here `has_*` measures and `is_a` as declared by the caller).
// THE NULL (deranged order): the same meeting against a state whose admissions had their values shuffled among addresses within each relation (the relation kept, who-holds-what destroyed);
// `same` is a FINDING only if the movement saved against the recalled address beats the (1 - 1/n) quantile of what R deranged states save (the pool's chance floor; no constant).
// Pure, deterministic (seeded), no model. The log is the state: `admissions` is never rewritten.
import { createHolograph, predict, admit as holoAdmit } from "./bayes-surprise.js";

export const READER_IDENTITY_SCHEMA = "ReaderIdentity@1";
export function createReader({ alpha = 1 } = {}) { return { schema: READER_IDENTITY_SCHEMA, alpha, admissions: [], addresses: new Set() }; }

/** admit(reader, address, arrangements) → the reader after meeting the thing at `address` saying `arrangements` ([{ rel, value }]); appended, never rewritten */
export function admit(reader, address, arrangements = [], meta = {}) {
  const next = { ...reader, admissions: [...reader.admissions, ...arrangements.map((a, i) => ({ address, rel: a.rel, value: String(a.value), at: reader.admissions.length + i, kind: "admit", ...meta }))], addresses: new Set([...reader.addresses, address]) };
  return next;
}
/** retract(reader, address, arrangements, meta) → the reader with RETRACTION events appended (the log is never rewritten; the projection drops what a later retraction names) */
export function retract(reader, address, arrangements = [], meta = {}) {
  return { ...reader, admissions: [...reader.admissions, ...arrangements.map((a, i) => ({ address, rel: a.rel, value: String(a.value), at: reader.admissions.length + i, kind: "retract", ...meta }))] };
}
/** stateAt(reader, cursor) → the reader as it stood after the admission at `cursor` (the fold at a cursor: admissions with at <= cursor, each dropped by a retraction up to that cursor) */
export function stateAt(reader, cursor = Infinity) {
  const upTo = reader.admissions.filter((a) => a.at <= cursor), live = [];
  const retracted = new Map(); for (const a of upTo) if (a.kind === "retract") { const k = `${a.address}\u0000${a.rel}\u0000${a.value}`; retracted.set(k, (retracted.get(k) ?? 0) + 1); }
  for (const a of upTo) { if (a.kind === "retract") continue; const k = `${a.address}\u0000${a.rel}\u0000${a.value}`; const n = retracted.get(k) ?? 0; if (n > 0) { retracted.set(k, n - 1); continue; } live.push(a); }
  return { ...reader, admissions: live, addresses: new Set(live.map((a) => a.address)), cursor };
}
// the holograph of a reader: one slot per (address, relation), counts over values, built from the log (the fold is the log's projection)
function holographOf(reader, admissions = reader.admissions) {
  const h = createHolograph({ alpha: reader.alpha });
  for (const a of admissions) { if (a.kind === "retract") continue; const slot = `${a.address}\u0000${a.rel}`; const m = h.slots.get(slot) ?? h.slots.set(slot, new Map()).get(slot); m.set(a.value, (m.get(a.value) ?? 0) + 1); }
  h.admitted = admissions.length; return h;
}
const bitsAt = (h, address, arrangements) => arrangements.reduce((s, a) => s + predict(h, `${address}\u0000${a.rel}`, String(a.value)).bits, 0);

// A VALUE MEETS a held one within the margin the two state (EQUALITY-FALSIFIED.md: a figure's own last digit is its DMD): "measure:base" values meet when they differ by less than the
// stated resolution of either, read off the digits the value was written with when the caller supplies `res`; absent that, within 2% (the stage's own measure rule, atom-support.js
// figMeet). Measured before this: 2,440 km against 1,516 miles converted (2,439.77 km) and 79 lb against 36 kg "moved" the slot as strings. Non-numeric values meet by string.
export function valuesMeet(a, b, { res = null } = {}) {
  const pa = /^([a-z_:]+):(-?\d+(?:\.\d+)?)$/i.exec(String(a)), pb = /^([a-z_:]+):(-?\d+(?:\.\d+)?)$/i.exec(String(b));
  if (!pa || !pb) return String(a) === String(b);
  if (pa[1] !== pb[1]) return false;
  const x = Number(pa[2]), y = Number(pb[2]);
  if (res) { const ra = res(a) ?? 0, rb = res(b) ?? 0; return Math.abs(x - y) < ra + rb; }
  return Math.abs(x - y) <= 0.02 * Math.max(Math.abs(x), Math.abs(y), 1e-9);
}
/** meet(reader, arrangements, { oneValued, rewirings, seed, res }) → { verdict, recall, noise, dmd, margin, bitsNew, movements: [{ address, bits }], moved: [{ rel, held, arriving, bits }], standing, ceiling } */
export function meet(reader, arrangements = [], { oneValued = () => false, rewirings = 20, seed = 7, res = null } = {}) {
  const all = (arrangements ?? []).filter((a) => a && a.rel != null && a.value != null);
  if (!all.length) return { schema: READER_IDENTITY_SCHEMA, verdict: "refused", why: "the mention carries no arrangement: nothing can move the reader", movements: [] };
  // RECALL on what the thing IS (its arrangements that are not one-valued slots), THEN read what it SAYS (the one-valued slots) at the recalled address. Measured: with the slots in the recall,
  // a wrong value at the recalled address costs more than an empty slot would (a slot holding one value expects another less than an empty one does), so "Mercury with a wrong radius"
  // lost to "a new thing" and the discrepancy was never read. A mention that is ONLY slots is recalled on them (there is nothing else).
  const slots = all.filter((a) => oneValued(a.rel)), who = all.filter((a) => !oneValued(a.rel)), arr = who.length ? who : all;
  const addrs = [...reader.addresses]; if (!addrs.length) return { schema: READER_IDENTITY_SCHEMA, verdict: "new", why: "the reader has met nothing: everything is new", movements: [], bitsNew: bitsAt(holographOf(reader), "\u0000new", arr) };
  const h = holographOf(reader);
  const movements = addrs.map((address) => ({ address, bits: +bitsAt(h, address, arr).toFixed(6) })).sort((x, y) => x.bits - y.bits || (x.address < y.address ? -1 : 1));
  const bitsNew = +bitsAt(h, "\u0000new", arr).toFixed(6), noise = movements[0].bits, dmd = movements.find((m) => m.bits > noise + 1e-9)?.bits ?? null;
  const out = { schema: READER_IDENTITY_SCHEMA, bitsNew, noise, dmd, margin: { from: noise, to: dmd, width: dmd == null ? null : +(dmd - noise).toFixed(6) }, movements, saved: +(bitsNew - noise).toFixed(6) };
  if (noise >= bitsNew - 1e-9) return { ...out, verdict: "new", why: "no address the reader holds moves less than a new thing would: it meets this as a new thing" };
  let tied = movements.filter((m) => Math.abs(m.bits - noise) <= 1e-9).map((m) => m.address), broke = null;
  // a tie on what the thing IS is broken among the tied by what it SAYS (the slots): a slot value an address already holds is evidence of who, one it does not hold is a difference
  if (tied.length > 1 && slots.length) { const bySlots = tied.map((address) => ({ address, bits: +bitsAt(h, address, slots).toFixed(6) })).sort((x, y) => x.bits - y.bits || (x.address < y.address ? -1 : 1)); const best = bySlots[0].bits; const t2 = bySlots.filter((m) => Math.abs(m.bits - best) <= 1e-9).map((m) => m.address); if (t2.length < tied.length) { broke = { by: "slots", among: tied, bits: bySlots }; tied = t2; } }
  if (tied.length > 1) return { ...out, verdict: "undecided", tied, why: `${tied.length} addresses move the reader equally little` };
  const recall = tied[0];
  // a slot moved: a one-valued relation at the recalled address that already holds another value
  const moved = []; for (const a of slots) { const m = h.slots.get(`${recall}\u0000${a.rel}`); if (!m || !m.size || [...m.keys()].some((v) => valuesMeet(v, a.value, { res }))) continue; moved.push({ rel: a.rel, held: [...m.keys()], arriving: String(a.value), bits: +predict(h, `${recall}\u0000${a.rel}`, String(a.value)).bits.toFixed(6) }); }
  // the null: the saving (bitsNew - noise) against R states with the values shuffled among addresses within each relation
  let s = seed >>> 0; const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const savings = []; for (let k = 0; k < rewirings; k++) {
    const liveAdm = reader.admissions.filter((a) => a.kind !== "retract");
    const byRel = new Map(); for (const a of liveAdm) (byRel.get(a.rel) ?? byRel.set(a.rel, []).get(a.rel)).push(a.value);
    for (const vals of byRel.values()) for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
    const idx = new Map(); const shuffled = liveAdm.map((a) => { const i = idx.get(a.rel) ?? 0; idx.set(a.rel, i + 1); return { ...a, value: byRel.get(a.rel)[i] }; });
    const hk = holographOf(reader, shuffled); const best = Math.min(...addrs.map((address) => bitsAt(hk, address, arr))); savings.push(bitsAt(hk, "\u0000new", arr) - best);
  }
  savings.sort((x, y) => x - y); const n = Math.max(2, addrs.length), ceiling = +savings[Math.min(rewirings - 1, Math.floor(rewirings * (1 - 1 / n)))].toFixed(6);
  return { ...out, verdict: "same", recall, ...(broke ? { broke } : {}), moved, ceiling, standing: out.saved > ceiling ? "same_above_null" : "same_below_null", why: `meeting this moves the reader ${noise.toFixed(2)} bits at ${recall}, a new thing would move ${bitsNew.toFixed(2)}; the next address ${dmd == null ? "is none" : `moves ${dmd.toFixed(2)}`}` };
}

/** arrangementsOf(atoms, entityId) → [{ rel, value }]: a being's arrangements as the reader meets them (the other end's key, a figure by its base value and measure) */
export function arrangementsOf(atoms, entityId, { key = (x) => String(x?.name ?? x?.value ?? "").toLowerCase(), name = true } = {}) {
  const out = [];
  // the NAME is an arrangement the reader meets ("a name is a mouth": it nominates an address; what the thing then says of itself is what moves the slots). Its value is the last name token.
  if (name) { const n = atoms.flatMap((a) => a.args ?? []).find((x) => x.entity === entityId)?.name; const t = String(n ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2); if (t.length) out.push({ rel: "name", value: t.at(-1) }); }
  for (const a of atoms) { const args = a.args ?? [], at = args.findIndex((x) => x.entity === entityId); if (at < 0) continue; const pos = a.slots?.[at] ?? at;
    for (const [j, y] of args.entries()) { if (j === at) continue; out.push({ rel: `${a.pred}@${pos}`, value: y.measure && y.base != null ? `${y.measure}:${y.base}` : key(y) }); }
    if (args.length === 1) out.push({ rel: `${a.pred}@${pos}`, value: "" }); }
  return out;
}
