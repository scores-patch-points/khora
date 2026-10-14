// scene/export-turns.mjs — WHO SPEAKS: TAG-BASED TURN ATTRIBUTION FOR THE REPUBLIC, IN TIERS, WITH A POSITIVE CONTROL.  (2026-10-14)
//
//   node eval/the-fold/scene/export-turns.mjs [--out republic-turns.jsonl] [--frames republic-speaker-frames.v2.jsonl]
//
// Jowett's dialogue has no quotation marks and not every turn is tagged. A sentence is attributed ONLY from a tag in it, in tiers
// that say how far the attribution reaches:
//   1  NAMED   a speech verb with one of the dialogue's listed persons ("said Glaucon", "Thrasymachus replied") — the text says it.
//   2  NARRATOR the first person ("I said", "I asked") — the file's own cast list says "Socrates, who is the narrator".
//   3  INFERRED a pronoun tag ("he said", "said he") resolved to the LAST NAMED interlocutor (tier 1, non-narrator) before it —
//              an inference, run only after its positive control below.
//   —  UNTAGGED no tag in the sentence: speaker null. Nothing is carried over, nothing is guessed.
// A speech verb followed by "that" is a REPORT (the frames' business), not a turn tag, and neither attributes nor updates state.
//
// POSITIVE CONTROL (pre-registered): take every tier-1 turn by a non-narrator, hide its name, and ask the tier-3 resolver (the last
// named interlocutor before it, computed without that sentence) for it. Tier 3 is trusted only if its accuracy beats both baselines:
// the majority speaker and the cast-marginal chance. If it does not, tier-3 rows are emitted with trusted:false.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(HERE, opt("--out", "republic-turns.jsonl")), FRAMES = path.resolve(HERE, opt("--frames", "republic-speaker-frames.v2.jsonl"));
const EN = "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const buf = fs.readFileSync(EN), str = buf.toString("utf8");
const pm = /_PERSONS OF THE DIALOGUE\._[\s\S]{0,420}?_And others/.exec(str)?.[0] ?? "";
const CAST = [...new Set([...pm.matchAll(/\b([A-Z][a-z]{3,})\b/g)].map((m) => m[1]).filter((w) => !["PERSONS", "DIALOGUE", "narrator", "others", "mute", "auditors", "Persons", "Dialogue", "Socrates"].includes(w) || w === "Socrates"))];
const NARRATOR = "Socrates"; const NAMES = CAST.filter((n) => n !== NARRATOR);
const V = "said|replied|answered|rejoined|added|asked|exclaimed|continued|interposed|interrupted|remarked|observed|cried|assented|agreed|retorted|returned|responded|began|inquired|suggested|resumed|insisted|echoed|laughed|smiled|went on|broke in|repeated|whispered|persisted|objected|protested|affirmed|admitted|confessed|conceded|declared|demanded|urged|pursued";
const NAME = `(${CAST.join("|")})`;
const RES = [
  { tier: 1, re: new RegExp(`\\b(?:${V})\\s+${NAME}\\b(?!\\s+that\\b)`), who: (m) => m[1] },
  { tier: 1, re: new RegExp(`\\b${NAME}\\s+(?:${V})\\b(?!\\s+that\\b)`), who: (m) => m[1] },
  { tier: 2, re: new RegExp(`\\bI\\s+(?:${V})\\b(?!\\s+that\\b)`), who: () => NARRATOR },
  { tier: 3, re: new RegExp(`\\b(?:he|she|they)\\s+(?:${V})\\b(?!\\s+that\\b)|\\b(?:${V})\\s+(?:he|she|they)\\b(?!\\s+that\\b)`, "i"), who: () => null },
];
// the dialogue region and its Stephanus marks
const start = str.indexOf("I went down yesterday to the Piraeus");
const marks = []; { const re = /\*(\d{3})([A-Ea-e])?\*/g; re.lastIndex = start; let m, last = 326; while ((m = re.exec(str)) !== null) { const p = Number(m[1]); if (p >= last && p <= 621) { marks.push({ sec: `${p}${(m[2] ?? "A").toUpperCase()}`, at: Buffer.byteLength(str.slice(0, m.index), "utf8") }); last = p; } } }
const stephanusAt = (b) => { let lo = 0, hi = marks.length - 1, r = null; while (lo <= hi) { const mid = (lo + hi) >> 1; if (marks[mid].at <= b) { r = marks[mid].sec; lo = mid + 1; } else hi = mid - 1; } return r; };
const body = str.slice(start);
const sents = []; { let pos = 0, b = Buffer.byteLength(str.slice(0, start), "utf8"); for (const m of body.matchAll(/[^.!?]+[.!?]+["']?/g)) { b += Buffer.byteLength(body.slice(pos, m.index), "utf8"); const bl = Buffer.byteLength(m[0], "utf8"); sents.push({ text: m[0], b0: b, b1: b + bl }); b += bl; pos = m.index + m[0].length; } }
// resolve each sentence's own tag (tier + who or null for pronoun)
const tagOf = (text) => { for (const r of RES) { const m = r.re.exec(text); if (m) return { tier: r.tier, who: r.who(m), tag: m[0], idx: m.index }; } return null; };
const raw = sents.map((s) => ({ ...s, tag: tagOf(s.text) }));
// tier-3 resolver: the last named interlocutor (tier 1, non-narrator) strictly before index i
const lastNamedBefore = (i) => { for (let j = i - 1; j >= 0 && j > i - 400; j--) { const t = raw[j].tag; if (t && t.tier === 1 && t.who !== NARRATOR) return t.who; } return null; };
// ── the positive control ──────────────────────────────────────────────────────────────────────────────────────────────────────
const named = raw.map((s, i) => ({ s, i })).filter((x) => x.s.tag?.tier === 1 && x.s.tag.who !== NARRATOR);
let ok = 0, answered = 0; const cnt = new Map();
for (const { s, i } of named) { const p = lastNamedBefore(i); if (p) { answered += 1; if (p === s.tag.who) ok += 1; } cnt.set(s.tag.who, (cnt.get(s.tag.who) ?? 0) + 1); }
const total = named.length; const majority = Math.max(0, ...cnt.values()) / (total || 1); const chance = [...cnt.values()].reduce((a, c) => a + (c / total) ** 2, 0);
const acc = answered ? ok / answered : 0; const trusted = acc > Math.max(majority, chance);
console.log(`persons: ${CAST.join(", ")} · narrator: ${NARRATOR}`);
console.log(`tier-1 named turns by a non-narrator: ${total} · resolver answered ${answered} · correct ${ok} (${(100 * acc).toFixed(1)}%) · majority-speaker baseline ${(100 * majority).toFixed(1)}% · cast-marginal chance ${(100 * chance).toFixed(1)}% → tier 3 ${trusted ? "TRUSTED (beats both)" : "NOT trusted"}`);
// ── emit ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const rows = raw.map((s, i) => {
  const t = s.tag; let speaker = null, tier = null;
  if (t) { tier = t.tier; speaker = t.tier === 3 ? lastNamedBefore(i) : t.who; if (t.tier === 3 && !speaker) tier = null; }
  return { seq: i, stephanus: stephanusAt(s.b0), byteStart: s.b0, byteEnd: s.b1, sha256: sha(buf.subarray(s.b0, s.b1)), speaker, tier, tag: t?.tag ?? null, trusted: tier === 3 ? trusted : tier != null ? true : null };
});
fs.writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
// ── the per-unit record the whom/ledger session asked for (republic-turns.v2.jsonl) ───────────────────────────────────────────────
// UNIT = one sentence: Jowett marks no turn boundaries and untagged sentences are not attributed, so a "turn" here is the sentence,
// and a consumer groups sentences itself. `resolved` is true ONLY when a tag in the sentence names a listed person. First person
// ("I said") is kept as its own typed speaker and is NOT merged with Socrates; the cast list's statement that Socrates narrates is
// carried as `narratorByCast`. A pronoun tag carries its candidate and the failed control, never a resolution.
const framesV2 = fs.existsSync(FRAMES) ? fs.readFileSync(FRAMES, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const withSpan = framesV2.filter((f) => f.content?.span).sort((a, b) => a.content.span.byteStart - b.content.span.byteStart);
const unitFrames = (b0, b1) => withSpan.filter((f) => f.content.span.byteStart >= b0 && f.content.span.byteEnd <= b1).map((f) => f.id);
const v2 = raw.map((s, i) => {
  const r = rows[i]; const t = s.tag; let speaker = null, speakerSurface = null, resolved = false, reason = "no tag", tagSpan = null, candidate = null, basis = null;
  if (t) {
    const b0 = s.b0 + Buffer.byteLength(s.text.slice(0, t.idx), "utf8"); tagSpan = { byteStart: b0, byteEnd: b0 + Buffer.byteLength(t.tag, "utf8"), text: t.tag };
    if (t.tier === 1 && t.who !== NARRATOR) { speaker = t.who; speakerSurface = t.who; resolved = true; reason = null; basis = "a speech tag names a listed person"; }
    else if (t.tier === 1) { speaker = null; speakerSurface = t.who; resolved = false; reason = "tag names the narrator in the third person; not treated as a turn"; }
    else if (t.tier === 2) { speaker = null; speakerSurface = "I"; resolved = false; reason = "first-person tag: the cast list says Socrates narrates; kept as its own speaker, not merged"; }
    else { speaker = null; speakerSurface = "he/she/they"; resolved = false; reason = `pronoun-only tag; last named interlocutor ${lastNamedBefore(i) ?? "none"} is a candidate, not a resolution (control: ${(100 * acc).toFixed(1)}% vs ${(100 * majority).toFixed(1)}% majority baseline)`; candidate = lastNamedBefore(i); }
  }
  return { turn: i, unit: "sentence", stephanus: r.stephanus, byteStart: r.byteStart, byteEnd: r.byteEnd, sha256: r.sha256, speaker, speakerSurface, resolved, reason, basis, candidate, tagSpan, narratorByCast: NARRATOR, frameIds: unitFrames(r.byteStart, r.byteEnd) };
});
fs.writeFileSync(path.resolve(HERE, "republic-turns.v2.jsonl"), v2.map((x) => JSON.stringify(x)).join("\n") + "\n");
const rsum = v2.reduce((m, x) => ((m[x.resolved ? "resolved" : x.reason.split(":")[0].split(";")[0]] = (m[x.resolved ? "resolved" : x.reason.split(":")[0].split(";")[0]] ?? 0) + 1), m), {});
fs.writeFileSync(path.resolve(HERE, "republic-turns.v2.summary.json"), JSON.stringify({ at: new Date().toISOString(), units: v2.length, resolved: v2.filter((x) => x.resolved).length, byReason: rsum, control: { named: total, answered, correct: ok, accuracy: acc, majorityBaseline: majority, chance, pronounTierTrusted: trusted }, framesWithSpan: withSpan.length, framesContained: new Set(v2.flatMap((x) => x.frameIds)).size, persons: CAST, narratorByCast: NARRATOR }, null, 2) + "\n");
console.log(`v2 per-unit records → republic-turns.v2.jsonl: ${v2.length} units · resolved ${v2.filter((x) => x.resolved).length} · frames contained in a unit ${new Set(v2.flatMap((x) => x.frameIds)).size} of ${withSpan.length} with a span`);
console.log(`unresolved by reason: ${JSON.stringify(rsum)}`);

const byTier = rows.reduce((m, r) => ((m[r.tier ?? "none"] = (m[r.tier ?? "none"] ?? 0) + 1), m), {});
const inBook1 = rows.filter((r) => r.stephanus && Number(r.stephanus.slice(0, 3)) >= 331 && Number(r.stephanus.slice(0, 3)) <= 354);
const b1 = inBook1.reduce((m, r) => ((m[r.tier ?? "none"] = (m[r.tier ?? "none"] ?? 0) + 1), m), {});
console.log(`sentences ${rows.length} → ${OUT}\nattribution by tier: ${JSON.stringify(byTier)} · in 331–354 (${inBook1.length}): ${JSON.stringify(b1)}`);
const bySpeaker = rows.filter((r) => r.speaker).reduce((m, r) => ((m[r.speaker] = (m[r.speaker] ?? 0) + 1), m), {});
console.log(`speakers: ${JSON.stringify(bySpeaker)}`);
// ── join to the frames: which frames' sentences have a turn speaker ─────────────────────────────────────────────────────────────
if (fs.existsSync(FRAMES)) {
  const f = fs.readFileSync(FRAMES, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const turnAt = (byte) => { let lo = 0, hi = rows.length - 1, r = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (rows[mid].byteStart <= byte) { r = mid; lo = mid + 1; } else hi = mid - 1; } return r >= 0 && byte < rows[r].byteEnd ? rows[r] : null; };
  const out = f.map((x) => { const t = turnAt(Number(x.at.split("#")[1])); return { ...x, turn: t ? { seq: t.seq, speaker: t.speaker, tier: t.tier, trusted: t.trusted, tag: t.tag } : null }; });
  fs.writeFileSync(path.resolve(HERE, "republic-speaker-frames.v3.jsonl"), out.map((x) => JSON.stringify(x)).join("\n") + "\n");
  const cop = out.filter((x) => x.copular && x.stephanus && Number(x.stephanus.slice(0, 3)) >= 331 && Number(x.stephanus.slice(0, 3)) <= 354);
  const withSp = cop.filter((x) => x.turn?.speaker && x.turn.trusted);
  console.log(`frames ${out.length} → republic-speaker-frames.v3.jsonl · copular content clauses in 331–354: ${cop.length}, with a trusted turn speaker: ${withSp.length} (${JSON.stringify(withSp.reduce((m, x) => ((m[x.turn.speaker] = (m[x.turn.speaker] ?? 0) + 1), m), {}))})`);
}
