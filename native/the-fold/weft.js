// the-fold/weft.js — THE WEFT: the reading log. The append-only record of reading PASSES (one per document
// read), each pass ADDRESSED (SidecarRead@2: a byte anchor per mention, a byteOffset per relation), from
// which the holograph — the cloth — is projected at a cursor and re-expanded by address.
//
// THE NAME (native/docs/THE-SPINE.md): the warp is the received structure (priors, grammar, schema); the
// WEFT is the log (the readings, appended pass by pass); the cloth is the holograph; the loom is generation
// (penelope). "His scars are her weft." The thread this system grew from began here: read a thing, keep the
// log — and the log is what the holograph is projected from.
//
// THREE PROPERTIES, the holograph's (THE-HOLOGRAPH.md §1), made real over the weft:
//   · every part points at the whole — each holon carries a permanent address (`<source>#<byteOffset>`);
//   · abstraction compresses — a holon stands in for its material, re-expandable by address;
//   · the consumer never gets the addresses — `mouthFacing` strikes them (the shadow).
//
// PURE. No I/O, no model. `appendPass` is IMMUTABLE (a new weft; P1). `clothAt` folds at a cursor (P3).
// `reopen` takes a byte address and a bytes-lookup the CALLER injects — this module never reads a file.
const freeze = Object.freeze;

export const WEFT_ENTRY_SCHEMA = "WeftEntry@1";
export const WEFT_SCHEMA = "Weft@1";

/** An empty weft — a frozen list of passes. Never mutated. */
export const emptyWeft = () => Object.freeze([]);

/** Append a reading pass (immutable; P1). Returns a NEW weft. A pass is a SidecarRead@2-shaped reading. */
export function appendPass(weft, pass) {
  if (pass == null || typeof pass !== "object") throw new TypeError("weft: a pass must be an object");
  const address = pass.address ?? pass.source ?? null;
  if (!address) throw new TypeError("weft: a pass must carry an address");
  const seq = weft.length;
  return Object.freeze([...weft, Object.freeze({ schema: WEFT_ENTRY_SCHEMA, seq, ...pass, address })]);
}

/** The permanent address of a byte position in a source: `<source>#<byteOffset>` (the format the record renders). */
export const holonAddress = (source, byteOffset) => (Number.isFinite(byteOffset) ? `${source}#${byteOffset}` : null);

/** Fold the weft at a cursor (P3) into the CLOTH: the holograph's holons, each carrying its address.
 *  referents dedup by `ref` across passes (a being seen in many reads is one holon with many addresses);
 *  relations dedup by (relation + participant surfaces). asOf is a pass-index cursor (default: the end). */
export function clothAt(weft, { asOf = Infinity } = {}) {
  const referents = new Map();
  const relations = new Map();
  let passes = 0;
  for (const pass of weft) {
    if (pass.seq > asOf) break;
    passes += 1;
    for (const c of pass.cast ?? []) {
      const ref = c.ref ?? c.surface;
      if (!ref || !c.surface) continue;
      if (!referents.has(ref)) referents.set(ref, { ref, surfaces: new Set(), mentionsAt: [], address: null });
      const r = referents.get(ref);
      r.surfaces.add(c.surface);
      for (const at of c.mentionsAt ?? []) { r.mentionsAt.push(at); if (!r.address) r.address = holonAddress(pass.address, at); }
      if (!r.address) r.address = holonAddress(pass.address, 0);
    }
    for (const rel of pass.relations ?? []) {
      const parts = (rel.participants ?? []).map((p) => p?.surface).filter(Boolean);
      if (parts.length < 2) continue;
      const key = `${rel.relation}|${parts.join("|")}`;
      if (relations.has(key)) continue;
      const at = rel.scope?.byteOffset;
      relations.set(key, { relation: rel.relation, participants: parts, address: holonAddress(pass.address, at), standing: (rel.participants ?? []).every((p) => p?.standing === "referent") ? "referent" : "mixed" });
    }
  }
  return freeze({
    schema: "Cloth@1",
    at: asOf === Infinity ? "end" : asOf,
    passes,
    referents: freeze([...referents.values()].map((r) => freeze({ ref: r.ref, surfaces: freeze([...r.surfaces]), mentionsAt: freeze([...r.mentionsAt]), address: r.address }))),
    relations: freeze([...relations.values()].map(freeze)),
  });
}

/** Re-expand a holon address to the verbatim bytes at it. `read(source)` returns the source's bytes (string
 *  or Buffer) — INJECTED; this module never touches disk. Returns { address, at, text } or a typed gap. */
export function reopen(address, { read = null, span = 160 } = {}) {
  if (typeof address !== "string" || !address.includes("#")) return { gap: "not_an_address", address: address ?? null };
  const i = address.lastIndexOf("#");
  const source = address.slice(0, i); const at = Number(address.slice(i + 1));
  if (!Number.isFinite(at)) return { gap: "address_has_no_offset", address, source };
  if (typeof read !== "function") return { gap: "no_reader_injected", address, source, at };
  const raw = read(source);
  if (raw == null) return { gap: "source_unreadable", address, source, at };
  const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), "utf8");
  if (at < 0 || at > buf.length) return { gap: "address_out_of_range", address, source, at, bytes: buf.length };
  return { address, source, at, text: buf.slice(at, Math.min(buf.length, at + span)).toString("utf8") };
}

/** The SHADOW of the cloth: every address struck, so it can be handed to a mouth (THE-HOLOGRAPH.md §1, prop 3;
 *  firewall.js::mouthFacing is the same rule for prompt text). Names survive; addresses do not. */
export function mouthFacing(cloth) {
  return freeze({
    schema: "ClothShadow@1",
    referents: freeze(cloth.referents.map((r) => freeze({ ref: r.ref, surfaces: r.surfaces }))),
    relations: freeze(cloth.relations.map((r) => freeze({ relation: r.relation, participants: r.participants, standing: r.standing }))),
  });
}

export const WEFT = Object.freeze({ schema: WEFT_SCHEMA, note: "the reading log; the holograph is its cloth, projected at a cursor and re-expanded by address (THE-SPINE.md, THE-HOLOGRAPH.md)" });
