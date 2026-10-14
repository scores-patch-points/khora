// organs/mouth-repair.js — THE LAST LEVEL: the mouth repairs grammar, and only grammar. User direction, 2026-10-14: "the final level we
// can add is a LLM that fixes grammar with its additions snipped and added to the EOT and folded into the final output."
//
//   repairSentence(sentence, { draw, source, model, mouth }) → { ok, sentence, additions, removals, refused }
//
// THE MOUTH IS JUST THE MOUTH (house rule): it is handed one already-lawful, byte-addressed sentence and asked to fix its grammar. What
// comes back is never trusted as a whole; it is DIFFED against what was sent, word by word (longest common subsequence):
//   KEPT runs      map back onto the original segments, so every copied byte keeps its address;
//   ADDED runs     become segments of kind "model" — typed self:model with the mouth's identity (organs/output-holograph.js, Koestler:
//                  every sentence is a pointer, a byte address or a marked self:model) — and are recorded as EOT additions;
//   REMOVED words  of a source segment are refused: the mouth may not delete what the record copied.
// An addition may carry only grammar: a word that is a CONTENT word (UD NOUN PROPN NUM VERB ADJ ADV) and is not already in the source
// clause is a fabrication and refuses the repair. Then the repaired sentence must still pass every law (prose-laws.js), still read back
// to the same claim, and still keep logos order — else the unrepaired sentence stands, and the refusal is on the record.
import { parseText } from "../adapters/text/english-parser.js";
import { sentence as makeSentence, lintSentence } from "./prose-laws.js";

const CONTENT = new Set(["NOUN", "PROPN", "NUM", "VERB", "ADJ", "ADV"]);
const wordsOf = (t) => [...String(t).matchAll(/[\p{L}\p{N}](?:[\p{L}\p{N}'’-]|\.(?=[\p{L}\p{N}]))*|[^\s\p{L}\p{N}]/gu)].map((m) => m[0]);

/** Word-level LCS alignment: [{ op: "keep"|"add"|"del", w }]. */
export function alignWords(a, b) {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i].toLowerCase() === b[j].toLowerCase() ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i].toLowerCase() === b[j].toLowerCase()) { out.push({ op: "keep", w: b[j], i, j }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ op: "del", w: a[i], i }); i++; }
    else { out.push({ op: "add", w: b[j], j }); j++; }
  }
  while (i < n) out.push({ op: "del", w: a[i], i: i++ });
  while (j < m) out.push({ op: "add", w: b[j], j: j++ });
  return out;
}

const PROMPT = (text) => `Fix any grammar error in this sentence. Keep every word and keep the meaning. Reply with the sentence only.\n\n${text}`;

/**
 * draw(prompt) → string. Injected: tests pass a stand-in; a live run passes a function that posts to khora's mouth channel
 * (kernel/mouth.js MOUTH_URL, through Heimdall). `source` is the source clause's text (the vocabulary an addition may draw on).
 */
export async function repairSentence(s, { draw, source = "", model, mouth = "mouth", recheck = null } = {}) {
  if (typeof draw !== "function") return { ok: false, sentence: s, refused: { why: "no mouth reachable: the unrepaired sentence stands" } };
  let reply;
  try { reply = String(await draw(PROMPT(s.text))).trim().split("\n")[0].trim(); } catch (err) { return { ok: false, sentence: s, refused: { why: `the mouth failed: ${err.message}` } }; }
  if (!reply || reply === s.text) return { ok: true, sentence: s, additions: [], removals: [], unchanged: true };

  // Map each original word to the segment it came from.
  const owner = [];
  s.segs.forEach((g, gi) => { for (const w of wordsOf(g.t)) owner.push({ w, gi }); });
  const orig = owner.map((o) => o.w);
  const al = alignWords(orig, wordsOf(reply));
  const removals = al.filter((x) => x.op === "del").map((x) => ({ w: x.w, seg: s.segs[owner[x.i].gi] }));
  const lostSource = removals.filter((r) => r.seg.kind === "source" && /[\p{L}\p{N}]/u.test(r.w));
  if (lostSource.length) return { ok: false, sentence: s, refused: { why: `the mouth deleted copied words: ${lostSource.map((r) => r.w).join(", ")}` } };

  // Additions: grammar only. A content word the source clause does not hold is a fabrication.
  const added = al.filter((x) => x.op === "add").map((x) => x.w);
  const srcLow = new Set(wordsOf(source).map((w) => w.toLowerCase()));
  const rows = parseText(model, reply).split("\n").filter((l) => /^\d+\t/.test(l)).map((l) => { const c = l.split("\t"); return { form: c[1], upos: c[3] }; });
  const fabricated = added.filter((w) => { const r = rows.find((x) => x.form === w); return r && CONTENT.has(r.upos) && !srcLow.has(w.toLowerCase()); });
  if (fabricated.length) return { ok: false, sentence: s, refused: { why: `the mouth added content the source does not hold: ${fabricated.join(", ")}` } };

  // Rebuild segments: kept words stay in their original segment (re-joined with the reply's own spacing); added runs become self:model.
  const segs = [];
  let cur = null;
  const flush = () => { if (cur) segs.push(cur); cur = null; };
  let pos = 0;
  for (const x of al) {
    if (x.op === "del") continue;
    const at = reply.indexOf(x.w, pos);
    const lead = at > pos ? reply.slice(pos, at) : "";
    pos = at + x.w.length;
    if (x.op === "keep") {
      const g = s.segs[owner[x.i].gi];
      if (!cur || cur.from !== owner[x.i].gi) { flush(); cur = { ...g, t: "", from: owner[x.i].gi }; if (lead) segs.push({ kind: "frame", t: lead }); cur.t += x.w; }
      else cur.t += lead + x.w;
    } else {
      if (!cur || cur.kind !== "model") { flush(); cur = { kind: "model", t: "", by: `self:${mouth}`, from: "model" }; if (lead) segs.push({ kind: "frame", t: lead }); cur.t += x.w; }
      else cur.t += lead + x.w;
    }
  }
  flush();
  if (pos < reply.length) segs.push({ kind: "frame", t: reply.slice(pos) });
  // A kept source segment whose text changed (the mouth re-spaced or re-ordered inside it) no longer matches its bytes: refuse.
  // The one change a copied segment may take is the declared typographic fold of its first letter's case (as claim-realize.js does).
  for (const g of segs) if (g.kind === "source" && g.t !== s.segs[g.from]?.t && g.t.slice(1) === s.segs[g.from]?.t.slice(1)) g.caseFolded = true;
  const drifted = segs.filter((g) => g.kind === "source" && g.t !== s.segs[g.from]?.t && !g.caseFolded);
  if (drifted.length) return { ok: false, sentence: s, refused: { why: `the mouth altered copied bytes inside a segment: “${drifted[0].t}”` } };
  const repaired = makeSentence(segs.map(({ from, ...g }) => g), s.grounds);
  if (repaired.text !== reply) return { ok: false, sentence: s, refused: { why: "the repair could not be re-assembled from its segments" } };
  const lint = lintSentence(repaired, null).filter((v) => v.law !== "PL14");
  if (lint.length) return { ok: false, sentence: s, refused: { why: `the repair breaks a law: ${lint.map((v) => v.law).join(", ")}` } };
  if (recheck) { const rc = await recheck(repaired); if (!rc.ok) return { ok: false, sentence: s, refused: { why: `the repair no longer equates to the claim: ${rc.why}` } }; }
  const additions = segs.filter((g) => g.kind === "model").map((g) => ({ text: g.t, by: g.by }));
  return { ok: true, sentence: repaired, additions, removals: removals.map((r) => r.w) };
}
