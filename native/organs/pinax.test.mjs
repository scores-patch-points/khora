import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  makePinax, refetch, offsetMap, convertOffset, canonicalText, formatAddress, parseAddress, upgradeLegacy,
  makeSpan, quoteOf, archiveWitness, checkFixity, sha256Hex, SIGLA,
} from "./pinax.js";

const enc = new TextEncoder();
const NOTE = "The council cut the transit budget in March.";
const PAGE = `Intro paragraph about the city.\n\n${NOTE}\n\nClosing words of the report.`;
const html = (t) => `<html><body><p>${t.replace(/\n\n/g, "</p><p>")}</p></body></html>`;
const fetchOf = (text, extra = {}) => makePinax({ url: "https://example.test/report", retrievedAt: "2026-10-14T15:02:11Z", raw: html(text), text, extractor: { name: "test#strip", sha256: "0".repeat(64) }, ...extra });
const byteSpanOf = async (rec, words) => {
  const layer = rec.layers.text;
  const t = new TextDecoder().decode(layer);
  const u = t.indexOf(words);
  const m = offsetMap(t);
  return makeSpan(rec, "text", convertOffset(m, "u", "b", u), convertOffset(m, "u", "b", u + words.length));
};
const store = (...recs) => Object.fromEntries(recs.map((r) => [r.entry.id, r]));

test("Pinax@1: hashes, stichometry, incipit/explicit, kind null, nothing supersedes a first fetch", async () => {
  const r = await fetchOf(PAGE);
  assert.equal(r.entry.schema, "Pinax@1");
  assert.equal(r.entry.id, `px_${(await sha256Hex(html(PAGE))).slice(0, 20)}`);
  assert.equal(r.entry.text.sha256, await sha256Hex(PAGE));
  assert.equal(r.entry.stichometry.lines, 5);
  assert.equal(r.entry.stichometry.passages, 3);
  assert.equal(r.entry.incipit.start, 0);
  assert.equal(r.entry.explicit.end, r.entry.text.bytes);
  assert.equal(r.entry.kind, null);
  assert.equal(r.entry.supersedes, null);
});

test("refetch: same raw bytes mint nothing; changed bytes are a new entry that supersedes the old (nothing overwritten)", async () => {
  const a = await fetchOf(PAGE);
  const same = await refetch(a, { url: "https://example.test/report", raw: html(PAGE), text: PAGE });
  assert.equal(same.same, true);
  assert.equal(same.entry, a.entry);
  const b = await refetch(a, { url: "https://example.test/report", raw: html(PAGE + "\n\nAddendum."), text: PAGE + "\n\nAddendum." });
  assert.equal(b.same, false);
  assert.equal(b.entry.supersedes, a.entry.id);
  assert.notEqual(b.entry.id, a.entry.id);
});

test("versioned address round-trips; a legacy address parses as legacy and says so", async () => {
  const a = await fetchOf(PAGE);
  const s = await byteSpanOf(a, NOTE);
  assert.match(s.address, /^px_[0-9a-f]{20}\/text@[0-9a-f]{12}#b\d+-\d+$/);
  const p = parseAddress(s.address);
  assert.deepEqual([p.legacy, p.pinax, p.layer, p.start, p.end], [false, a.entry.id, "text", s.start, s.end]);
  assert.equal(parseAddress("report#10-20").legacy, true);
  assert.equal(parseAddress("nonsense").gap.type, "address_malformed");
});

test("intact: unchanged source, the span verifies (⊙)", async () => {
  const a = await fetchOf(PAGE);
  const s = await byteSpanOf(a, NOTE);
  const again = await fetchOf(PAGE);
  const v = await checkFixity(s, { store: store(a), current: again });
  assert.equal(v.verdict, "intact");
  assert.equal(v.sigil, SIGLA.intact);
});

test("flipped byte INSIDE the span: altered (✕), never intact", async () => {
  const a = await fetchOf(PAGE);
  const s = await byteSpanOf(a, NOTE);
  const flipped = PAGE.replace("transit", "trbnsit");
  const b = await fetchOf(flipped);
  const v = await checkFixity(s, { store: store(a, b), current: b });
  assert.equal(v.verdict, "altered");
  assert.equal(v.sigil, SIGLA.altered);
  assert.equal(v.at, null);
});

test("flipped byte OUTSIDE the span: revised (↻), old and new addresses both carried", async () => {
  const a = await fetchOf(PAGE);
  const s = await byteSpanOf(a, NOTE);
  const b = await fetchOf(PAGE.replace("Closing", "Clozing"));
  const v = await checkFixity(s, { store: store(a, b), current: b });
  assert.equal(v.verdict, "revised");
  assert.equal(v.was, s.address);
  assert.notEqual(v.at, s.address);
  assert.equal((await quoteOf(v.span, b)).text, NOTE);
});

test("revised, re-anchored: words survive at a new offset in the new version", async () => {
  const a = await fetchOf(PAGE);
  const s = await byteSpanOf(a, NOTE);
  const b = await fetchOf(`A new opening paragraph was inserted.\n\n${PAGE}`);
  const v = await checkFixity(s, { store: store(a, b), current: b });
  assert.equal(v.verdict, "revised");
  assert.equal(v.span_axis, "shifted");
  assert.equal((await quoteOf(v.span, b)).text, NOTE);
});

test("moved (⇢): words gone from this source, present in another", async () => {
  const a = await fetchOf(PAGE);
  const s = await byteSpanOf(a, NOTE);
  const b = await fetchOf("The report was withdrawn and replaced with a notice.");
  const other = await makePinax({ url: "https://mirror.test/x", raw: `mirror: ${NOTE}`, text: `mirror: ${NOTE}` });
  const v = await checkFixity(s, { store: store(a, b), current: b, others: [other] });
  assert.equal(v.verdict, "moved");
  assert.equal(v.sigil, SIGLA.moved);
  assert.equal(v.span.pinax, other.entry.id);
});

test("same hash, wrong offset: address_error, a Callimachus defect", async () => {
  const a = await fetchOf(PAGE);
  const s = await byteSpanOf(a, NOTE);
  const v = await checkFixity({ ...s, start: s.start + 1, end: s.end + 1 }, { store: store(a), current: a });
  assert.equal(v.verdict, "address_error");
  assert.equal(v.defect, "callimachus");
});

test("unreachable: unchecked (?), never a refutation", async () => {
  const a = await fetchOf(PAGE);
  const s = await byteSpanOf(a, NOTE);
  const v = await checkFixity(s, { store: store(a), current: null });
  assert.equal(v.verdict, "unchecked");
  assert.equal(v.sigil, SIGLA.unchecked);
});

test("archive witness: live page altered, archive matches → shown via archive (◫)", async () => {
  const a = await fetchOf(PAGE);
  const s = await byteSpanOf(a, NOTE);
  const snap = await makePinax({ url: "https://web.archive.org/web/2026/https://example.test/report", raw: `<archive wrapper>${html(PAGE)}`, text: PAGE });
  assert.equal(archiveWitness(a, snap), "matches");
  assert.equal(archiveWitness(a, null), "not_archived");
  assert.equal(archiveWitness(a, await fetchOf("other")), "differs");
  const b = await fetchOf("The report now says something else entirely, nothing cited survives.");
  const v = await checkFixity(s, { store: store(a, b), current: b, archive: snap });
  assert.equal(v.verdict, "altered");
  assert.equal(v.via_archive, true);
  assert.equal(v.sigil, SIGLA.via_archive);
});

test("astral offsets: emoji and Linear B before the span; bytes, code points and UTF-16 resolve to the same bytes", async () => {
  const text = `Prefix 🏛️ 𐀀𐀁𐀂 ἀρχή then ${NOTE} end`;
  const m = offsetMap(text);
  const u = text.indexOf(NOTE);
  const cp = [...text.slice(0, u)].length;
  const b = enc.encode(text.slice(0, u)).length;
  assert.equal(convertOffset(m, "u", "b", u), b);
  assert.equal(convertOffset(m, "cp", "b", cp), b);
  assert.equal(convertOffset(m, "b", "u", b), u);
  assert.equal(convertOffset(m, "b", "cp", b), cp);
  assert.notEqual(u, b); // the trap is real: UTF-16 and byte offsets disagree here
  const inside = enc.encode("Prefix ").length + 1; // the second byte of 🏛
  assert.equal(convertOffset(m, "b", "u", inside), null);
  const r = await makePinax({ url: "x", raw: text, text });
  const s = await makeSpan(r, "text", b, b + enc.encode(NOTE).length);
  assert.equal((await quoteOf(s, r)).text, NOTE);
  assert.equal((await makeSpan(r, "text", inside, b)).gap.type, "span_splits_codepoint");
});

test("legacy upgrade: a UTF-16 address on the text layer becomes the exact byte address", async () => {
  const text = `Ἐν ἀρχῇ 𐀀 ${NOTE}`;
  const r = await makePinax({ url: "x", raw: text, text });
  const u = text.indexOf(NOTE);
  const up = await upgradeLegacy(`x#${u}-${u + NOTE.length}`, r, { legacyText: text });
  assert.equal(up.ok, true);
  assert.equal(up.was, `x#${u}-${u + NOTE.length}`);
  assert.equal((await quoteOf(up.span, r)).text, NOTE);
  assert.equal((await upgradeLegacy("x#0-5", r, { legacyText: "a different string" })).gap.type, "legacy_text_not_layer");
});

test("polytonic NFC trap: precomposed vs combining — raw hashes differ, text hashes equal, verdict re_encoded (≈)", async () => {
  const pre = "ἀρχὴ τῆς ἱστορίης ἀπόδεξις ἥδε.";
  const comb = pre.normalize("NFD");
  assert.notEqual(pre, comb);
  const a = await makePinax({ url: "g", raw: pre, text: pre });
  const b = await makePinax({ url: "g", raw: comb, text: comb });
  assert.notEqual(a.entry.raw.sha256, b.entry.raw.sha256);
  assert.equal(a.entry.text.sha256, b.entry.text.sha256);
  const s = await makeSpan(a, "text", 0, a.layers.text.length);
  const v = await checkFixity(s, { store: store(a, b), current: b });
  assert.equal(v.verdict, "re_encoded");
  assert.equal(v.sigil, SIGLA.re_encoded);
  assert.equal(canonicalText("a\r\nb\rc"), "a\nb\nc");
});

test("quote is copied (L4): a supplied string is ignored; the layer is sliced", async () => {
  const a = await fetchOf(PAGE);
  const s = await byteSpanOf(a, NOTE);
  const q = await quoteOf(s, a, { supplied: "The council saved the transit budget." });
  assert.equal(q.text, NOTE);
  assert.equal(q.supplied_ignored, true);
  assert.equal(q.supplied_differs, true);
});

test("lossy extractor: the ⌁ sigil rides beside the verdict", async () => {
  const a = await fetchOf(PAGE, { extractor: { name: "pdf#text", sha256: "1".repeat(64), lossy: true } });
  const s = await byteSpanOf(a, NOTE);
  const v = await checkFixity(s, { store: store(a), current: a });
  assert.equal(v.sigil, SIGLA.intact + SIGLA.lossy);
});

test("unplugged (L1): pinax.js's static import closure reaches no model door", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /\/v1\/chat|\/api\/(generate|chat)\b/, `${file} names a model endpoint`);
    for (const [, spec] of src.matchAll(/^\s*import\s[^"']*["']([^"']+)["']/gm)) {
      assert.doesNotMatch(spec, /heimdall|ollama|anthropic|openai|model-client|mouth/i, `${file} imports ${spec}`);
      if (spec.startsWith(".")) walk(resolve(dirname(file), spec));
    }
  };
  walk(resolve(here, "pinax.js"));
  assert.ok(seen.size >= 3, "positive control: the walk reached pinax.js, span-drift.js and record-log.js");
});

test("unplugged (L1), runtime: a model client that throws is never reached", async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("model door reached"); };
  try {
    const a = await fetchOf(PAGE);
    const s = await byteSpanOf(a, NOTE);
    const b = await fetchOf(PAGE.replace("Closing", "Clozing"));
    assert.equal((await checkFixity(s, { store: store(a, b), current: b })).verdict, "revised");
  } finally { globalThis.fetch = saved; }
});
