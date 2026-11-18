// gender-calibration.mjs — PREREG-ROUND20 NOTE 4. Measures, on the GUM TRAIN slices E, C, D, F (never U): r = how often the Wikidata given-name snapshot's gender agrees with the gender the text uses (the gold entity's pronoun gender);
// q = how often a being's clause-local gender evidence (the rung's own rule) agrees with the gold entity gender. Output: /tmp/gum-data/gender-calibration.json
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL, fileURLToPath } from 'node:url';
const KH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); const imp = (p) => import(pathToFileURL(path.join(KH, p)).href);
const { parseGum, slicesOf } = await imp('eval/referents/pronoun-golden.mjs'); const { setsOf } = await imp('eval/referents/cast-initial.mjs'); const { resolvePronounsByPresence } = await imp('native/adapters/text/pronouns.js');
const { snapshotGiverFrom, genderPriorFromGiver } = await imp('native/adapters/text/wikidata-name-giver.js'); const { PRONOUN_PRESENCE_DEFAULT: D } = await imp('native/adapters/text/pronoun-presence-chosen.js');
const giver = snapshotGiverFrom(path.join(KH, 'identity/givers/wikidata-given-names-en.json'));
const tr = parseGum('/tmp/gum-data/en_gum-ud-train.conllu'); const S = slicesOf(tr); const sets = setsOf(tr); const inE = new Set(sets.E.map((d) => d.id));
const slices = { E: sets.E, C: S.C, D: S.D, F: S.aside.filter((d) => !inE.has(d.id)) }; const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c) > 0;
const R = { beings: 0, withGold: 0, giverAnswered: 0, agree: 0, byGiver: { m: [0, 0], f: [0, 0] } }, Q = { beingsWithEvidence: 0, agree: 0, byGender: { m: [0, 0], f: [0, 0] }, singleClauseBeings: 0, singleClauseAgree: 0 };
for (const [name, docs] of Object.entries(slices)) for (const doc of docs) {
  const cf = `/tmp/gum-data/cache/${name}-${doc.id}.json`; if (!fs.existsSync(cf)) continue; const w = JSON.parse(fs.readFileSync(cf, 'utf8')); const text = doc.sents.map((s) => s.text).join(' ');
  const offs = []; let o = 0; for (const s of doc.sents) { offs.push(o); o += s.text.length + 1; }
  const ms = []; doc.sents.forEach((s, si) => s.mentions.forEach((m) => ms.push({ ent: m.ent, a: offs[si] + m.c0, b: offs[si] + m.c1, feats: m.goldHead.feats ?? '', upos: m.goldHead.upos })));
  const entG = new Map(); for (const m of ms) if (m.upos === 'PRON' && /Person=3/.test(m.feats) && /Number=Sing/.test(m.feats) && /PronType=Prs/.test(m.feats)) { const g = /Gender=Masc/.test(m.feats) ? 'm' : /Gender=Fem/.test(m.feats) ? 'f' : null; if (!g) continue; const c = entG.get(m.ent) ?? { m: 0, f: 0 }; c[g]++; entG.set(m.ent, c); }
  const goldOf = (ref, spans) => { const gs = new Set(); for (const [x, y] of spans) for (const m of ms) if (overlap(x, y, m.a, m.b)) { const c = entG.get(m.ent); if (c && c.m !== c.f) gs.add(c.m > c.f ? 'm' : 'f'); } return gs.size === 1 ? [...gs][0] : null; };
  const pg = genderPriorFromGiver({ text, cast: w.cast, giver }); const mentions = (w.cast ?? []).flatMap((c) => c.mentionSpans.map(([x, y]) => ({ ref: c.ref, start: x, end: y }))).sort((x, y) => x.start - y.start);
  const ev = resolvePronounsByPresence(w.sentences, mentions, { ...D }).genderEvidence ?? {};
  for (const c of w.cast ?? []) { R.beings++; const g = goldOf(c.ref, c.mentionSpans); if (!g) continue; R.withGold++; const p = pg.get(c.ref); if (p) { R.giverAnswered++; const ok = p === g; if (ok) R.agree++; R.byGiver[p][ok ? 0 : 1]++; }
    const e = ev[c.ref]; if (e && (e.m > 0) !== (e.f > 0)) { const eg = e.m > 0 ? 'm' : 'f'; Q.beingsWithEvidence++; const ok = eg === g; if (ok) Q.agree++; Q.byGender[eg][ok ? 0 : 1]++; if (e.m + e.f === 1) { Q.singleClauseBeings++; if (ok) Q.singleClauseAgree++; } } }
}
const r = R.agree / R.giverAnswered, q = Q.agree / Q.beingsWithEvidence; const lo = (x) => Math.log(x / (1 - x));
const out = { R, Q, r, q, R_nats: lo(r), E_nats: lo(q), qSingleClause: Q.singleClauseAgree / Math.max(1, Q.singleClauseBeings) }; fs.writeFileSync('/tmp/gum-data/gender-calibration.json', JSON.stringify(out, null, 1));
console.log('beings', R.beings, 'with a gold gender', R.withGold, '| giver answered', R.giverAnswered, `(${(100 * R.giverAnswered / R.withGold).toFixed(0)}% of gendered beings)`, 'agrees', R.agree, '=> r', r.toFixed(3), 'R nats', lo(r).toFixed(2), JSON.stringify(R.byGiver));
console.log('beings with clause-local evidence (single gender) and a gold gender', Q.beingsWithEvidence, 'agree', Q.agree, '=> q', q.toFixed(3), 'E nats', lo(q).toFixed(2), JSON.stringify(Q.byGender), '| one-clause evidence only:', Q.singleClauseBeings, 'agree', Q.singleClauseAgree);
