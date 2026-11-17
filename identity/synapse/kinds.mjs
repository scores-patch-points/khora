// kinds.mjs: relation profiles of cast referents from weft clauses + kernel characteristicSetKinds (read-only import). No LLM.
import fs from "fs"; import path from "path";
const K = (process.env.KHORA_DIR || new URL("../..", import.meta.url).pathname) + "/native/kernel/kind-functional-induction.js";
const { characteristicSetKinds } = await import(K);
const W = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../novels/weft"), OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "kinds");
for (const f of fs.readdirSync(W).filter((x) => x.endsWith(".weft.json")).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(W, f))); const spans = [];
  d.cast.forEach((c, i) => { for (const [s, e] of c.mentionSpans) spans.push([s, e, i]); }); spans.sort((a, b) => a[0] - b[0]);
  const who = (a) => { if (!a || a.start == null) return null; const r = []; for (const [s, e, i] of spans) { if (s >= a.end) break; if (e > a.start && s < a.end) r.push(i); } return r; };
  const prof = new Map();
  const put = (i, sig) => { if (!prof.has(i)) prof.set(i, new Set()); prof.get(i).add(sig); };
  for (const c of d.clauses) { const lem = c.predicate?.lemma; if (!lem) continue; for (const i of who(c.subject) ?? []) put(i, "subj:" + lem); for (const i of who(c.object) ?? []) put(i, "obj:" + lem); }
  const features = new Map([...prof].map(([i, s]) => ["c" + i, new Map([...s].map((g) => [g, { featureKey: g, featureValue: true, evidenceIds: new Set(["e"]), firstAt: 0, lastAt: 0 }]))]));
  let kinds = [], diag = null, err = null;
  try { const r = characteristicSetKinds(features, { draws: 50, alpha: 0.05, seed: 1 }); kinds = r.candidates.map((k) => ({ kindKey: k.kindKey, memberRefs: k.memberRefs, support: k.support, sig: k.structuralSignatures })); diag = r.diagnostics; } catch (e) { err = String(e).slice(0, 200); }
  fs.writeFileSync(path.join(OUT, f.slice(0, 8) + ".json"), JSON.stringify({ profiles: Object.fromEntries([...prof].map(([i, s]) => [i, [...s]])), kinds, err }));
  console.log(f.slice(0, 8), "profiled", prof.size, "of", d.cast.length, "kinds", kinds.length, err ?? "");
}
