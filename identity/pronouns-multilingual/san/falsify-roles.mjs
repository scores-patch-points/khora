// falsify.mjs — from the cached reads: re-run the pure presence rung (same inputs, same default dials) for the register variants, count found / bound / unbound by reason, and the gold-free falsifier
// (a referent bound to both genders has at least one wrong binding; lower bound = sum over referents of min over the two classes; null = the bound referents permuted over the same pronouns, 200 seeded permutations).
// Usage: node falsify.mjs <reads-dir> <out.json> <name...>
import fs from "node:fs"; import path from "node:path";
import { resolvePronounsByPresence, normalizePronounClass } from "../../../native/adapters/text/pronouns.js";
import { presenceOptionsFor, registerFor } from "../../../native/adapters/text/pronoun-registers.js";
import { finalVariants } from "../../../native/adapters/text/sanskrit-sandhi.js";
import { seeded } from "../../novels/attend.mjs";
const [DIR, OUT, ...NAMES] = process.argv.slice(2);
const base = presenceOptionsFor("san"); const reg = base.pronounClass;
const rep = JSON.parse(fs.readFileSync(new URL("./register-build-report.json", import.meta.url)));
// variants of the register
const withForms = (add) => ({ ...reg, forms: { ...reg.forms, ...add } });
const neutAdd = {}; for (const [k, v] of Object.entries(rep.dropped)) if (v.why === "neuter majority" && (v.number.Sing ?? 0) * 2 > Object.values(v.number).reduce((a, b) => a + b, 0)) { neutAdd[k] = { gender: v.gender, number: v.number }; if (/^[a-zāīūṛṝḷṃḥśṣṭḍṇñṅ]+$/.test(k)) for (const w of finalVariants(k)) if (!(w in reg.forms) && !(w in neutAdd)) neutAdd[w] = { gender: v.gender, number: v.number }; }
const noBhavat = { ...reg, forms: Object.fromEntries(Object.entries(reg.forms).filter(([k]) => !/^(bhava|भव)/.test(k))) };
const VARIANTS = { shipped: reg, "with-neuter": withForms(neutAdd), "no-bhavat": noBhavat };
const cls = {}; for (const [k, v] of Object.entries(VARIANTS)) cls[k] = normalizePronounClass(v);
const gOf = (variant, tok) => { const r = cls[variant].get(tok); return r && (r.gender === "m" || r.gender === "f" || r.gender === "n") ? r.gender : null; };
const R = seeded(2026);
const lower = (refs, gens, classes) => { const c = new Map(); refs.forEach((r, i) => { if (!c.has(r)) c.set(r, Object.fromEntries(classes.map((k) => [k, 0]))); c.get(r)[gens[i]]++; }); let nn = 0; for (const [, o] of c) { const v = Object.values(o), s = v.reduce((a, b) => a + b, 0); nn += s - Math.max(...v); } return nn; };
const perm = (refs, gens, classes, D = 200) => { let m = 0; for (let d = 0; d < D; d++) { const sh = [...refs]; for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; } m += lower(sh, gens, classes); } return m / D; };
const out = {};
for (const name of NAMES) {
  const files = fs.readdirSync(DIR).filter((f) => f.startsWith(name + "-")).sort(); const chunks = files.map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f))));
  out[name] = { chunks: chunks.length, chars: chunks.reduce((a, c) => a + c.chars, 0), sentences: chunks.reduce((a, c) => a + c.sentences.length, 0), castCapital: chunks.reduce((a, c) => a + c.castN, 0) };
  for (const [vn, v] of Object.entries(VARIANTS)) {
    const rows = []; let bound = 0, unbound = 0; const reasons = {}, forms = {}; const refsAll = [], gAll = [], gAll3 = [], chunkOf = [];
    chunks.forEach((c, ci) => {
      const r = resolvePronounsByPresence(c.sentences.map((s, i) => ({ ...s, order: i })), c.mentions, { ...base, pronounClass: v, nonPersonal: c.nonPersonal, ...(c.roles ? { roles: c.roles } : {}) });
      bound += r.bindings.length; unbound += r.unbound.length; for (const u of r.unbound) reasons[u.reason] = (reasons[u.reason] ?? 0) + 1;
      for (const b of r.bindings) { forms[b.pronoun] = (forms[b.pronoun] ?? 0) + 1; const g = gOf(vn, b.pronoun); if (g) { refsAll.push(`${ci}:${b.referentId}`); gAll.push(g); chunkOf.push(ci); } }
      rows.push({ ci, n: r.bindings.length });
    });
    const mf = gAll.map((g, i) => [g, i]).filter(([g]) => g === "m" || g === "f").map(([, i]) => i);
    const A = (idx, classes) => { const refs = idx.map((i) => refsAll[i]), gens = idx.map((i) => gAll[i]); const obs = lower(refs, gens, classes), nul = perm(refs, gens, classes); return { n: refs.length, referents: new Set(refs).size, obs: obs / Math.max(1, refs.length), nul: nul / Math.max(1, refs.length) }; };
    const f2 = A(mf, ["m", "f"]), f3 = A(gAll.map((_, i) => i), ["m", "f", "n"]);
    // bootstrap over chunks for null - observed (m/f)
    const byChunk = chunks.map((_, ci) => mf.filter((i) => chunkOf[i] === ci)); const R2 = seeded(7), ds = [];
    for (let k = 0; k < 2000; k++) { const idx = []; for (let j = 0; j < chunks.length; j++) idx.push(...byChunk[Math.floor(R2() * chunks.length)]); if (idx.length < 5) continue; const a = A(idx, ["m", "f"]); ds.push(a.nul - a.obs); }
    ds.sort((a, b) => a - b);
    out[name][vn] = { found: bound + unbound, bound, unbound, coverage: bound / Math.max(1, bound + unbound), reasons, boundForms: Object.entries(forms).sort((a, b) => b[1] - a[1]).slice(0, 10), mfBound: f2.n, mf: f2, threeClass: f3, nullMinusObsCI95: ds.length ? [ds[Math.floor(ds.length * 0.025)], ds[Math.floor(ds.length * 0.975)]] : null };
  }
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
