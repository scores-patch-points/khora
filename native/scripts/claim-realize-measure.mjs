#!/usr/bin/env node
// claim-realize-measure.mjs — how many witnessed claims of a pinned record get a lawful, read-back, net-new no-model paraphrase.
//
//   node native/scripts/claim-realize-measure.mjs --out DIR [--json FILE] [--show N]
//
// Replays the record from DIR/layers exactly as callimachus-run.mjs --replay does (every page must reproduce its pinned sha256, or the
// run stops), then sends EVERY atom that carries a relations.js witness through realizeClaim, one call per (sentence, predicate,
// subject) position. Reports: positions, paraphrased (at least one alternative passed every gate), and a count per refusal reason.
// A refusal reason is the first failing gate, in the order realizeClaim applies them; quoted words are stripped so reasons pool.
// No model. No fetching.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { makePinax, makeSpan, quoteOf, parseAddress } from "../organs/pinax.js";
import { realizeClaim } from "../organs/claim-realize.js";
import { loadModel } from "../adapters/text/english-parser.js";
import en from "../adapters/text/telling-grammar.en.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const out = resolve(opt("--out") ?? "callimachus-out");
const show = Number(opt("--show") ?? 0);

const EXTRACTOR = { name: "web.js#extractReadable", sha256: createHash("sha256").update(readFileSync(join(here, "../organs/web.js"))).digest("hex") };
const prior = JSON.parse(readFileSync(join(out, "record.json"), "utf8"));
const store = {};
for (const s of prior.sources) {
  const raw = readFileSync(join(out, "layers", `${s.id}.raw`));
  const text = readFileSync(join(out, "layers", `${s.id}.txt`), "utf8");
  const rec = await makePinax({ url: s.url, finalUrl: s.final_url, retrievedAt: s.retrieved_at, fetch: s.fetch, raw: new Uint8Array(raw), text, extractor: EXTRACTOR });
  if (rec.entry.id !== s.id || rec.entry.text.sha256 !== s.text.sha256) { console.error(`replay: ${s.id} does not reproduce from its layers`); process.exit(3); }
  store[rec.entry.id] = rec;
}
const slice = async (address) => {
  const p = parseAddress(address);
  const rec = store[p?.pinax];
  if (!rec) return null;
  const sp = await makeSpan(rec, p.layer, p.start, p.end);
  if (sp.ok === false) return null;
  const q = await quoteOf(sp, rec);
  return q.ok ? q.text : null;
};

const reason = (why) => String(why).replace(/“[^”]*”/g, "“…”").replace(/\b(aux|cop|nsubj|obj|obl|nmod|conj|parataxis|advcl|ccomp|xcomp|acl|amod|compound|appos|dep|root|csubj|advmod|nummod|flat|det|case|mark|cc|punct)(:\w+)\b/g, "$1");
const firstFail = (a) => a.lint.length ? `laws: ${a.lint[0].law ?? a.lint[0].id ?? JSON.stringify(a.lint[0]).slice(0, 40)}`
  : !a.verified ? "bytes do not re-verify"
  : !a.equate.ok ? `reverse equate: ${reason(a.equate.why)}`
  : !a.carries.ok ? "anchors dropped"
  : !(a.disclosure?.ok ?? true) ? `omission refused: ${a.disclosure.refused[0]?.why?.replace(/\(.*\)/, "(…)") ?? "content words dropped silently"}`
  : !a.logos.ok ? `logos: ${a.logos.violations[0].kind}`
  : !a.novelty.netNew ? "not net new" : "?";

const model = loadModel(JSON.parse(readFileSync(join(here, "../priors/parser-eng-ewt.json"), "utf8")));
// ROLES: every subject the relation reader found for each predicate lemma (EWT lexicon), across the record (claim-realize.js roleLaw).
const roles = new Map();
for (const a of prior.atoms) {
  if (!a.relation?.pred || !a.relation.subj_surface) continue;
  const subj = await slice(a.relation.subj_surface);
  if (!subj) continue;
  const f = a.relation.pred.toLowerCase();
  const k = String(model.lexicon.form[`${f}|VERB`] ?? model.lexicon.form[`${f}|AUX`] ?? f).split("\t")[0];
  (roles.get(k) ?? roles.set(k, new Set()).get(k)).add(subj.toLowerCase());
}
const seen = new Set();
const rows = [];
for (const a of prior.atoms) {
  if (!a.relation?.pred) continue;
  const key = `${a.span}|${a.relation.pred}|${a.relation.subj_surface}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const text = await slice(a.span);
  if (text == null) continue;
  const witness = { pred: a.relation.pred, subj: a.relation.subj_surface ? await slice(a.relation.subj_surface) : null };
  const r = await realizeClaim({ claim: { text, address: a.span }, witness, roles }, { slice, grammar: en, model });
  const why = r.ok ? "paraphrased"
    : r.refusals?.length && !r.alternatives.length ? reason(r.refusals[0].why)
    : r.alternatives.length ? `all alternatives failed: ${firstFail(r.alternatives[0])}`
    : "no alternation applies";
  rows.push({ atom: a.id, referent: !!a.relation.subj, text, witness, why, ok: r.ok, best: r.alternatives.find((x) => x.ok)?.text ?? null, omitted: r.alternatives.find((x) => x.ok)?.omitted?.map((u) => `${u.kind}: ${u.text}`) ?? null, via: r.clause ? `${r.clause.kind} clause, ${r.clause.parsed}${r.clause.fronted.length ? ", fronted adjunct re-joined" : ""}` : null });
}
const tally = (xs) => Object.entries(xs.reduce((m, x) => ((m[x.why] = (m[x.why] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
const report = (label, xs) => {
  console.log(`\n## ${label}: ${xs.filter((x) => x.ok).length} paraphrased of ${xs.length} witnessed positions`);
  for (const [w, n] of tally(xs)) console.log(`${String(n).padStart(4)}  ${w}`);
};
report("every witnessed position", rows);
report("subject is an admitted referent", rows.filter((x) => x.referent));
if (show) for (const x of rows.filter((x) => x.ok).slice(0, show)) console.log(`\n- ${x.text}\n  → ${x.best}${x.omitted ? `  [omitted: ${x.omitted.join(" · ")}]` : ""}${x.via ? `  (${x.via})` : ""}`);
if (opt("--json")) writeFileSync(opt("--json"), JSON.stringify(rows, null, 1));
