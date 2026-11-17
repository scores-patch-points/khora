// derive-register.mjs <out.json> [--exclude BOOK,BOOK] — the Ancient Greek third-person register (PronounPrior@1), measured from PROIEL (train+dev+test) and Perseus. The filter is in PREREG-GRC.md:
//   a form is a member iff (1) most of its tokens are UPOS PRON, (2) most of its PRON tokens are third-person personal (PROIEL Person=3 + PronType=Prs; Perseus tokens by their lemma's PROIEL majority), (3) among those, Sing > Plur.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const DATA = process.env.GRC_DATA ?? "/Users/mlacy/Documents/khora-cast/khora/identity/pronouns-multilingual/data";
const out = process.argv[2]; const ex = new Set((process.argv.includes("--exclude") ? process.argv[process.argv.indexOf("--exclude") + 1] : "").split(",").filter(Boolean));
const nf = (s) => s.normalize("NFC").toLowerCase();
function* tokens(file, isProiel) {
  let skip = false, code = null;
  for (const ln of fs.readFileSync(file, "utf8").split("\n")) {
    if (ln.startsWith("# sent_id")) { skip = false; code = null; continue; }
    if (!ln || ln[0] === "#") continue;
    const c = ln.split("\t"); if (c.length < 10 || /[-.]/.test(c[0])) continue;
    if (isProiel) { const m = /Ref=([A-Z0-9]+)_/.exec(c[9]); if (m) { code = m[1]; } if (code && ex.has(code)) continue; }
    yield { form: nf(c[1]), lemma: c[2], upos: c[3], feats: c[5] === "_" ? {} : Object.fromEntries(c[5].split("|").map((x) => x.split("="))) };
  }
}
const files = (d, pat) => fs.readdirSync(path.join(DATA, d)).filter((f) => f.endsWith(".conllu") && pat.test(f)).map((f) => path.join(DATA, d, f));
const proiel = files("grc-proiel", /./), perseus = files("grc-perseus", /./);
// pass 1: third-person lemmas by PROIEL's own features (majority of the lemma's PRON tokens)
const lem = new Map(); let nTok = 0;
for (const f of proiel) for (const t of tokens(f, true)) { nTok++; if (t.upos !== "PRON") continue; const r = lem.get(t.lemma) ?? lem.set(t.lemma, { pron: 0, p3: 0 }).get(t.lemma); r.pron++; if (t.feats.Person === "3" && t.feats.PronType === "Prs") r.p3++; }
const L3 = new Set([...lem].filter(([, r]) => r.p3 * 2 > r.pron).map(([l]) => l));
// pass 2: per form
const F = new Map(); const rec = (f) => F.get(f) ?? F.set(f, { total: 0, pron: 0, p3: 0, gender: {}, number: {}, src: { proiel: 0, perseus: 0 } }).get(f);
for (const [files_, isP, name] of [[proiel, true, "proiel"], [perseus, false, "perseus"]]) for (const f of files_) for (const t of tokens(f, isP)) {
  const r = rec(t.form); r.total++; if (t.upos !== "PRON") continue; r.pron++;
  const third = isP ? (t.feats.Person === "3" && t.feats.PronType === "Prs") : L3.has(t.lemma);
  if (!third) continue; r.p3++; r.src[name]++;
  r.gender[t.feats.Gender ?? "_"] = (r.gender[t.feats.Gender ?? "_"] ?? 0) + 1; r.number[t.feats.Number ?? "_"] = (r.number[t.feats.Number ?? "_"] ?? 0) + 1;
}
const forms = {}, side = {}, excluded = [];
for (const [f, r] of [...F].sort((a, b) => b[1].p3 - a[1].p3)) {
  if (!r.p3 && !r.pron) continue;
  const pronShare = r.pron / r.total, p3Share = r.pron ? r.p3 / r.pron : 0, sing = r.number.Sing ?? 0, plur = r.number.Plur ?? 0;
  const gs = Object.entries(r.gender).filter(([k]) => k === "Masc" || k === "Fem" || k === "Neut"); const majorGender = gs.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null; // D1: the binder binds a named being; a form that is mostly neuter is a thing, not a he or she
  const member = pronShare > 0.5 && p3Share > 0.5 && sing > plur && (majorGender === "Masc" || majorGender === "Fem");
  side[f] = { total: r.total, pron: r.pron, p3: r.p3, pronShare: +pronShare.toFixed(3), p3Share: +p3Share.toFixed(3), sing, plur, majorGender, member };
  if (member) forms[f] = { gender: r.gender, number: r.number }; else if (r.p3 > 0) excluded.push(f);
}
const reg = { schema: "PronounPrior@1", language: "grc", provenance: {
  source: "Universal Dependencies Ancient_Greek-PROIEL (CC BY-NC-SA 3.0) and Ancient_Greek-Perseus (CC BY-NC-SA 2.5): train+dev+test of both" + (ex.size ? `, MINUS the PROIEL sentences of the NT books ${[...ex].join(" ")} (hold-out register)` : ""),
  built_by: "identity/pronouns-multilingual/grc/derive-register.mjs", tokens_read_proiel: nTok,
  filter: "a form is a member iff, over both treebanks, (1) most of its tokens are UPOS PRON, (2) most of its PRON tokens are third-person personal (PROIEL: Person=3 and PronType=Prs; Perseus has no Person feature, so by the PROIEL majority of the token's lemma), (3) among those third-person tokens Sing outnumbers Plur. Article (UPOS DET) and relative/demonstrative uses make a form like ὁ or τὸν mostly non-PRON, so it is out.",
  third_person_lemmas: [...L3].sort(), forms_in_register: Object.keys(forms).length, forms_third_person_excluded: excluded.length,
  note: "gender and number counts are from the form's third-person personal PRON tokens; normalizePronounClass decides clean (singular-only, one gender, 2+ observations) or soft from them. per-form shares: the sidecar *.shares.json" }, forms };
fs.writeFileSync(out, JSON.stringify(reg)); fs.writeFileSync(out.replace(/\.json$/, ".shares.json"), JSON.stringify(side));
console.log(out, "members", Object.keys(forms).length, "excluded 3rd-person forms", excluded.length, "L3", [...L3].join(" "));
