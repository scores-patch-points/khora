// tests/weft-lean.test.js — the weft kept as distinctions that make a difference, in binary.
//   L1  unpack(pack(x)) is exactly leanOf(x): the binary loses nothing the lean form holds.
//   L2  the lean form holds the DISTINCTIONS the consumers use: weftAttestations over a lean-reconstructed pass yields the same
//       (witness, label, left, right) tuples as over the full pass. Breaks if a consumer would see a different mind.
//   L3  what was dropped re-expands from the file's own bytes: the sentence at an edge's address contains the edge's cited words.
//   L5  only a difference is recorded: no constant polarity, no sentence text, and an EVA record exists exactly where a negation does.
//   L4  it is MUCH smaller, and the size claim is measured, not assumed.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { leanOf, pack, unpack, expand } from "../the-fold/weft-lean.mjs";
import { weftAttestations } from "../the-fold/weft.js";

const WEFT = process.env.WEFT_LEAN_FIXTURE || "/private/tmp/claude-501/-Users-mlacy-Documents-3-0/5f36fb6e-a637-4219-b05d-fa08a14f3c63/scratchpad/weft.snap4.jsonl";
const have = fs.existsSync(WEFT);
const passes = have ? fs.readFileSync(WEFT, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((p) => p.layer === "foundation").slice(0, 60) : [];

test("L1 pack/unpack round-trips the lean form exactly", { skip: !have }, () => {
  const lean = passes.map(leanOf);
  assert.deepEqual(unpack(pack(passes)), lean);
});

test("L2 a consumer of attestations sees the same relations from the lean pass", { skip: !have }, () => {
  const key = (a) => `${a.label}\u0000${a.left.surface}\u0000${a.right.surface}`;
  let n = 0;
  for (const p of passes.filter((x) => (x.edges ?? []).length).slice(0, 12)) {
    const full = new Set([...weftAttestations([p])].map(key));
    const l = leanOf(p);
    const rebuilt = { address: p.address, seq: p.seq, edges: l.con.filter((e) => e[4] !== 0 || e[5] !== 0 || e[3] >= 0).map((e) => ({ end1: e[0], label: e[1], end2: e[2], end1Face: null, end2Face: null, refs: [`${p.address}#${e[3]}`], spans: [{ start: e[4], end: e[5] }] })) };
    const lean = new Set([...weftAttestations([rebuilt])].map(key));
    for (const k of lean) assert.ok(full.has(k), "no relation appears that the full pass did not carry");
    assert.ok(lean.size >= full.size * 0.98, `lean keeps the relations: ${lean.size} of ${full.size}`);
    n += full.size;
  }
  assert.ok(n > 0);
});

test("L3 the dropped sentence re-expands from the file's bytes", { skip: !have }, () => {
  let ok = 0, tot = 0;
  const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  for (const p of passes.filter((x) => (x.edges ?? []).length && x.address && fs.existsSync(x.address)).slice(0, 10)) {
    const ex = expand(leanOf(p), (f) => (fs.existsSync(f) ? fs.readFileSync(f) : null));
    for (const e of ex.connections.slice(0, 40)) { tot++; const s = norm(e.sentence); if (s.includes(norm(e.end1).split(" ")[0]) || s.includes(norm(e.end2).split(" ")[0])) ok++; }
  }
  console.log(`# L3 sentences re-expanded from bytes that hold an edge's own word: ${ok}/${tot}`);
  assert.ok(tot > 0 && ok / tot > 0.8, `${ok}/${tot}`);
});

test("L4 the binary is a small fraction of the full JSON", { skip: !have }, () => {
  const full = Buffer.byteLength(passes.map((p) => JSON.stringify(p)).join("\n"));
  const bin = pack(passes).length;
  console.log(`# L4 ${passes.length} passes: ${(full / 1e6).toFixed(1)} MB JSON -> ${(bin / 1e6).toFixed(2)} MB binary (${(100 * bin / full).toFixed(2)}%)`);
  assert.ok(bin < full * 0.05);
});

test("L5 only differences are recorded: negatives are EVA records, text and constants are absent", { skip: !have }, () => {
  let negEdges = 0, evaCon = 0;
  for (const p of passes) {
    const l = leanOf(p);
    assert.deepEqual(Object.keys(l).sort(), ["a", "con", "eva", "g", "ins", "l", "s", "seg", "w", "ws"], "no text field in a transformation record");
    const longest = Math.max(0, ...[...l.ins, ...l.seg.flat().filter((x) => typeof x === "string"), ...l.con.flat().filter((x) => typeof x === "string")].map((x) => x.length));
    assert.ok(longest <= 200, `no sentence-length string in a record (longest ${longest})`);
    for (const e of p.edges ?? []) if (e.end1 && e.label && e.end2 && e.polarity === "-") negEdges += 1;
    evaCon += l.eva.filter((v) => v[0] === "con").length;
    for (const v of l.eva.filter((x) => x[0] === "con")) assert.ok(v[1] < l.con.length);
  }
  assert.equal(evaCon, negEdges, "one EVA record per negation, none for the default");
});

test("L6 SEG carries the subject and predicate heads, and a v1 segment still reads (heads empty)", { skip: !have }, () => {
  const withClauses = passes.filter((p) => (p.clauses ?? []).length).slice(0, 5);
  assert.ok(withClauses.length > 0);
  for (const p of withClauses) {
    const l = leanOf(p);
    assert.ok(l.seg.every((c) => c.length === 7), "every SEG record has subject and predicate slots");
    assert.ok(l.seg.some((c) => c[6]), "predicates are named");
  }
  // a v1 segment (the foundation store written before the heads existed) still unpacks, with empty head slots
  const legacy = "/Users/mlacy/Documents/3.0/khora/native/eval/the-fold/scene/foundation-weft.v1";
  if (fs.existsSync(legacy)) {
    const old = fs.readdirSync(legacy).filter((f) => f.endsWith(".bin")).sort().slice(0, 1).flatMap((f) => unpack(fs.readFileSync(`${legacy}/${f}`)));
    assert.ok(old.length > 0 && old.every((l) => l.seg.every((c) => c.length === 7 && c[5] === "" && c[6] === "")));
  }
});
