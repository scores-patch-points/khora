import fs from "node:fs";
// eval/meaning/run.mjs — claim vs source sentence by MEANING (grammar adapter → EOT claims → language-blind matcher + janus) against the
// wording judge (the vendored Fold falsifier). Sets: The Fold's C3 battery (dev; set FOLD_C3_DIR, default ../the-fold/eval/ants/c3), and
// this folder's held-out, other-language and fresh sets (see PREREG.md for which were seen when). The "oracle" arm reads claims a frontier
// model wrote for the same sentences (oracle-claims.json): a ceiling for the EOT layer, not a product path.
//   node eval/meaning/run.mjs          (V=1 for per-pair verdicts)
import path from "node:path";
import { fileURLToPath } from "node:url";
import { claimsOf, claimsOfK, claimsOfGated, READER } from "../../native/adapters/text/grammar-en.js";
import { verdict } from "../../native/kernel/eot-claim-match.js";
import { janusContradictions } from "../../native/organs/eot-janus.js";
import { makeRelationDefs, loadVerbIndexFile } from "../../native/organs/relation-defs.js";
// relation identity nominated by Wiktionary definitions, read from a cache of REST payloads (FOLD_WIKT_CACHE: <dir>/<word>.json); a word not in
// the cache nominates nothing. FOLD_WIKT_INDEX (a VerbIndex@1 file built from a local Wiktionary by cli/wikt-verbs.mjs) is read instead when set
const WIKT = process.env.FOLD_WIKT_CACHE, WIKT_INDEX = process.env.FOLD_WIKT_INDEX;
const DEFS = WIKT_INDEX ? makeRelationDefs(await loadVerbIndexFile(WIKT_INDEX)) : WIKT ? makeRelationDefs((w) => { try { return JSON.parse(fs.readFileSync(path.join(WIKT, `${w}.json`), "utf8")); } catch { return null; } }) : null;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const F = await import("../../vendor/the-fold/fold-chat-falsify-answer.js");
const lexical = (claim, sentence) => { const r = F.falsifyAnswer([claim], [{ name: "https://src.example/p", text: sentence }]); const c = (r.claims ?? r)[0] ?? {}; const v = c.verdict ?? c.standing; return /corroborated|held/.test(v) ? "E" : /contested/.test(v) ? "C" : "U"; };
// the grammar per pair: English text → the English adapter; any other language → the frontier adapter's claims (frontier-claims.json), else a typed gap
let FR = {}; try { FR = JSON.parse(fs.readFileSync(path.join(HERE, "oracle-claims.json"), "utf8")); } catch {}
const normEnd = (e) => (e && typeof e === "object" ? { text: String(e.text ?? ""), head: String(e.head ?? "").toLowerCase(), names: (e.names ?? []).map((x) => String(x).toLowerCase()), keys: (e.keys ?? []).map((x) => String(x).toLowerCase()), figs: (e.figs ?? []).filter((f) => f && Number.isFinite(+f.base)).map((f) => ({ measure: String(f.measure), base: +f.base, approx: !!f.approx })), quant: e.quant ?? null, agent: normEnd(e.agent) } : null);
// a proposition stands only on words the sentence holds: its span must be inside the text, and each end's text must be in the sentence
const verifySpans = (text, claims) => (claims ?? []).filter((c) => (!c.span || (c.span[0] >= 0 && c.span[1] <= text.length && c.span[1] > c.span[0]))).map((c) => ({ ...c, rel: String(c.rel ?? "").toLowerCase(), ARG0: normEnd(c.ARG0), ARG1: normEnd(c.ARG1), OBL: (c.OBL ?? []).map(normEnd).filter(Boolean), polarity: c.polarity === "-" ? "-" : "+", asserted: c.asserted !== false })).filter((c) => [c.ARG0, c.ARG1, ...c.OBL].filter(Boolean).every((e) => !e.text || text.includes(e.text) || text.replace(/\s+/g, " ").includes(e.text)));
const arms = {
  "grammar-en": (t, lang) => (lang === "en" ? claimsOf(t) : null),
  ...(DEFS ? { "grammar-defs": (t, lang) => (lang === "en" ? claimsOf(t) : null) } : {}),
  // layer 4's gate revising through layer 2's runner-up readings, on both sides
  "grammar-gated": (t, lang) => (lang === "en" ? claimsOfGated(t) : null),
  // the source read under its 3 best parses (the claim under its best): a source states what any close reading of it states
  "grammar-k3": (t, lang, side) => (lang === "en" ? (side === "source" ? claimsOfK(t, 3) : claimsOf(t)) : null),
  oracle: (t) => (FR[t] ? verifySpans(t, FR[t]) : null),
};
const C3 = process.env.FOLD_C3_DIR ?? path.join(HERE, "../../../the-fold/eval/ants/c3");
const sets = { main: path.join(C3, "battery.json"), cf: path.join(C3, "battery-cf.json"), heldout: path.join(HERE, "heldout.json"), other: path.join(HERE, "heldout-other.json"), fresh: path.join(HERE, "fresh.json"), relations: path.join(HERE, "relations.json") };
// MEANING_EXTRA=name=file.json[,name=file.json] adds sets (another session's pairs, say) to this run
for (const kv of (process.env.MEANING_EXTRA ?? "").split(",").filter(Boolean)) { const [k, f] = kv.split("="); sets[k] = f; }
if (process.env.MEANING_ONLY) for (const k of Object.keys(sets)) if (!process.env.MEANING_ONLY.split(",").includes(k)) delete sets[k];
console.log(`reader: ${READER}`);
const out = {};
for (const [name, f] of Object.entries(sets)) {
  if (!fs.existsSync(f)) continue;
  const pairs = JSON.parse(fs.readFileSync(f, "utf8")).pairs;
  const nE = pairs.filter((p) => p.label === "E").length, nNot = pairs.length - nE, nC = pairs.filter((p) => p.label === "C").length;
  console.log(`\n== ${name} (${pairs.length} pairs: ${nE} E, ${nC} C)`);
  const all = { ...Object.fromEntries(Object.keys(arms).map((a) => [a, null])), wording: null };
  for (const arm of Object.keys(all)) {
    let acc = 0, fa = 0, fr = 0, cc = 0, gap = 0; const rows = [];
    // janus over every pair this arm can read, in one call (one ground per pair)
    const jset = arm === "wording" ? new Set() : janusContradictions(pairs.map((p) => ({ id: String(p.id), C: arms[arm](p.claim, p.lang ?? "en", "claim") ?? [], S: arms[arm](p.sentence, p.lang ?? "en", "source") ?? [] })).filter((x) => x.C.length && x.S.length));
    for (const p of pairs) {
      const lang = p.lang ?? "en";
      let v;
      if (arm === "wording") v = lexical(p.claim, p.sentence);
      else { const A = arms[arm](p.claim, lang, "claim"), B = arms[arm](p.sentence, lang, "source"); let why = null; if (!A || !B) { v = "G"; gap++; } else { const r = verdict(A, B, arm === "grammar-defs" ? { relations: DEFS } : {}); v = r.v; why = r.why; if (v !== "C" && jset.has(String(p.id))) { v = "C"; why = "janus"; } }
        // MEANING_DUMP=<file.jsonl>: every pair's verdict, basis and claims, per arm, for the failure breakdown
        if (process.env.MEANING_DUMP) fs.appendFileSync(process.env.MEANING_DUMP, JSON.stringify({ set: name, arm, id: p.id, label: p.label, type: p.type ?? p.why ?? null, v, why, claim: p.claim, sentence: p.sentence, C: A, S: B }) + "\n"); }
      const said = v === "E";
      if ((p.label === "E") === said) acc++; if (said && p.label !== "E") fa++; if (!said && p.label === "E") fr++; if (p.label === "C" && v === "C") cc++;
      rows.push(`${p.id}:${p.label}${v}`);
    }
    console.log(`  ${arm.padEnd(10)} accuracy ${(100 * acc / pairs.length).toFixed(1)}%  false-accept ${(100 * fa / nNot).toFixed(1)}%  false-reject ${(100 * fr / nE).toFixed(1)}%  contradictions ${cc}/${nC}  no-grammar ${gap}`);
    if (process.env.V) console.log("    ", rows.join(" "));
  }
}
