// eval-nt.mjs <dev|test> — PREREG-GRC.md. The canonical read (readToWeft, language grc, DEFAULT presence dials) on the Greek New Testament, scored against PROIEL's antecedent-id links
// exactly as eval/referents/pronoun-golden.mjs scores English: answerable = a gold third-person singular pronoun whose entity has a proper-noun mention a cast span overlaps; RIGHT iff the bound being's cast spans
// overlap a token of that entity. Arms BASE / REG / OFF / FULL on the same texts; NULL = OFF's referents permuted across the same bound pronouns. Env KHORA_PRIORS_DIR must point at janus/priors.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const W = path.resolve(HERE, "../../..");
const { parseProiel, entitiesOf, ntBookOf, morphOf } = await import("./lib-proiel-gold.mjs"); const { DEV, TEST } = await import("./splits.mjs");
const { readToWeft } = await import(W + "/native/the-fold/read-process.mjs"); const { defaultPronounPresence } = await import(W + "/native/adapters/text/pronoun-presence-chosen.js");
const set = process.argv[2]; const codes = set === "dev" ? ["JOHN"] : set === "test" ? ["MATT", "MARK", "LUKE"] : null;   // D2 in DEVIATIONS.md: only the four Gospels carry antecedent links; by the sha256 rule JOHN is development if (!codes) throw new Error("dev or test");
const J = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8"));
const REG = { OFF: J("register-full.json"), SUBJ: J("register-full.json"), COARG: J("register-full.json") };
const DEC = { OFF: { prior: J("declension-full.json") }, SUBJ: { prior: J("declension-full.json") }, COARG: { prior: J("declension-full.json") } }; const MODE = { OFF: "off", SUBJ: "subject", COARG: "subject+coarg" };
const ARMS = ["OFF", "SUBJ", "COARG"];
const nt = parseProiel("/Users/mlacy/Documents/khora-cast/khora/identity/pronouns-multilingual/data/proiel-xml/greek-nt.xml", { bookOf: ntBookOf });
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry(20261117); const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c) > 0;
const per = []; const NF = (s) => s.normalize("NFC").toLowerCase();
for (const code of codes) {
  const bk = nt.find((b) => b.code === code); if (!bk) { per.push({ code, error: "absent" }); continue; }
  const { ent } = entitiesOf(bk); const toks = bk.tokens.filter((t) => t.form && !t.empty);
  const goldPron = toks.filter((t) => (t.pos === "Pp" || t.pos === "Pk") && t.morph?.[0] === "3" && t.morph?.[1] === "s");
  const row = { code, chars: bk.text.length, gold3sg: goldPron.length, arms: {} };
  for (const arm of ARMS) {
    const trace = []; const t0 = Date.now();
    const w = readToWeft(bk.text, { language: "grc", address: "nt:" + code, declension: DEC[arm], readerOptions: { pronounPresence: { ...defaultPronounPresence(), language: "grc", pronounClass: REG[arm], unspaced: false, trace }, caseRoles: MODE[arm] } });
    if (w.error || w.skipped) { row.arms[arm] = { skipped: w.error ?? w.skipped }; continue; }
    const castSpans = []; for (const c of w.cast ?? []) for (const [a, b] of c.mentionSpans ?? []) castSpans.push({ a, b, ref: c.ref });
    const sane = castSpans.filter((c) => c.a >= 0 && c.b <= bk.text.length).length === castSpans.length;
    const castEnts = new Map(), castNames = new Map(); const namedEnts = new Set(); const nameLemmaRefs = new Map();
    for (const c of castSpans) for (const t of toks) if (overlap(c.a, c.b, t.a, t.b)) {
      const e = ent.get(t.id); (castEnts.get(c.ref) ?? castEnts.set(c.ref, new Set()).get(c.ref)).add(e);
      if (t.pos === "Ne") { namedEnts.add(e); (castNames.get(c.ref) ?? castNames.set(c.ref, new Set()).get(c.ref)).add(e); (nameLemmaRefs.get(t.lemma) ?? nameLemmaRefs.set(t.lemma, new Set()).get(t.lemma)).add(c.ref); }
    }
    const bind = (w.pronounsPresence ?? []).map((p) => ({ at: p.at, ref: p.ref, margin: p.margin, pron: p.pronoun }));
    const goldAt = (b) => goldPron.find((g) => overlap(b.at[0], b.at[1], g.a, g.b));
    const ans = goldPron.filter((g) => namedEnts.has(ent.get(g.id)));
    const score = (bs) => { let right = 0, wrong = 0; for (const g of ans) { const b = bs.find((p) => overlap(p.at[0], p.at[1], g.a, g.b)); if (!b) continue; (castEnts.get(b.ref)?.has(ent.get(g.id)) ? right++ : wrong++); } return { right, wrong }; };
    const sc = score(bind); const D = 200; let kr = 0, kw = 0; for (let d = 0; d < D; d++) { const refs = bind.map((b) => b.ref); for (let i = refs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [refs[i], refs[j]] = [refs[j], refs[i]]; } const r = score(bind.map((b, i) => ({ at: b.at, ref: refs[i] }))); kr += r.right; kw += r.wrong; }
    const conf = []; for (const g of ans) { const b = bind.find((p) => overlap(p.at[0], p.at[1], g.a, g.b)); if (b) conf.push({ margin: b.margin, right: +(castEnts.get(b.ref)?.has(ent.get(g.id)) ?? false) }); }
    // unbound reasons over ALL gold 3sg pronouns (and over the answerable ones)
    const regForms = new Set(Object.keys(REG[arm].forms)); const reasons = { all: {}, answerable: {} };
    for (const g of goldPron) {
      let r; const b = bind.find((p) => overlap(p.at[0], p.at[1], g.a, g.b));
      if (b) r = "bound"; else { const tr = trace.find((x) => overlap(x.offset, x.offset + x.pronoun.length, g.a, g.b)); r = tr ? tr.reason : (regForms.has(NF(g.form)) ? "lost_in_form_in_register" : "not_in_register"); }
      reasons.all[r] = (reasons.all[r] ?? 0) + 1; if (namedEnts.has(ent.get(g.id))) reasons.answerable[r] = (reasons.answerable[r] ?? 0) + 1;
    }
    const onNonGold = bind.filter((b) => !goldAt(b)).length;
    // case dilution and false merges
    const covEnts = [...namedEnts]; const entRefs = new Map(); for (const [ref, es] of castNames) for (const e of es) (entRefs.get(e) ?? entRefs.set(e, new Set()).get(e)).add(ref);
    const beingsPerEnt = covEnts.length ? covEnts.reduce((s, e) => s + (entRefs.get(e)?.size ?? 0), 0) / covEnts.length : null;
    const falseMergeEnt = [...castNames.values()].filter((s) => s.size >= 2).length;
    const castLemmas = new Map(); for (const c of castSpans) for (const t of toks) if (t.pos === "Ne" && overlap(c.a, c.b, t.a, t.b)) (castLemmas.get(c.ref) ?? castLemmas.set(c.ref, new Set()).get(c.ref)).add(t.lemma);
    const falseMergeLemma = [...castLemmas.values()].filter((s) => s.size >= 2).length;
    const lemRefs = [...nameLemmaRefs.values()]; const beingsPerLemma = lemRefs.length ? lemRefs.reduce((s, r) => s + r.size, 0) / lemRefs.length : null;
    row.arms[arm] = { ms: Date.now() - t0, sane, beings: (w.cast ?? []).length, bindings: bind.length, onNonGold, answerable: ans.length, right: sc.right, wrong: sc.wrong, nullRight: kr / D, nullWrong: kw / D, conf, reasons, namedEnts: covEnts.length, beingsPerEnt, falseMergeEnt, falseMergeLemma, beingsPerLemma, mergedForms: (w.cast ?? []).filter((c) => (c.allSurfaces?.length ?? 0) > 1).length, bindingForms: Object.fromEntries(Object.entries(bind.reduce((m, b) => (m[b.pron] = (m[b.pron] ?? 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 8)) };
    console.error(code, arm, `ans ${ans.length} bound ${sc.right + sc.wrong} right ${sc.right} wrong ${sc.wrong} beings ${(w.cast ?? []).length} ${Date.now() - t0}ms`);
  }
  per.push(row);
}
fs.writeFileSync(path.join(HERE, "results", `nt-roles-${set}.json`), JSON.stringify({ set, codes, per }));
const P = (a, f) => per.filter((r) => r.arms?.[a] && !r.arms[a].skipped).reduce((s, r) => s + (f(r.arms[a])), 0);
for (const a of ARMS) { const R = P(a, (x) => x.right), Wr = P(a, (x) => x.wrong), An = P(a, (x) => x.answerable); console.log(set, a, `answerable ${An} right ${R} wrong ${Wr} precision ${(R / Math.max(1, R + Wr)).toFixed(3)} coverage ${((R + Wr) / Math.max(1, An)).toFixed(3)} bindings ${P(a, (x) => x.bindings)} onNonGold ${P(a, (x) => x.onNonGold)}`); }
console.log(set, "NULL(OFF)", `precision ${(P("OFF", (x) => x.nullRight) / Math.max(1, P("OFF", (x) => x.nullRight + x.nullWrong))).toFixed(3)}`);
