// gum-name-veto.mjs <dev|test|C|D|E|F> [--prior file] [--permute seed] — PREREG-ROUND14.md. Per answerable he/she pronoun: S0 (canonical default), S6 (S0 + the name-personhood ruling), outcome right/wrong/none. Output /tmp/gum-data/nv-<tag>.json
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL, fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const KH = path.resolve(HERE, '..', '..'); const imp = (p) => import(pathToFileURL(path.join(KH, p)).href);
const { parseGum, slicesOf } = await imp('eval/referents/pronoun-golden.mjs'); const { setsOf } = await imp('eval/referents/cast-initial.mjs'); const { readToWeft } = await imp('native/the-fold/read-process.mjs'); const { resolvePronounsByPresence } = await imp('native/adapters/text/pronouns.js');
const { loadNamePrior, nonPersonalFromNames } = await imp('native/adapters/text/name-prior.js'); const { PRONOUN_PRESENCE_DEFAULT: D } = await imp('native/adapters/text/pronoun-presence-chosen.js');
const split = process.argv[2]; const a = process.argv.slice(3); const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
let prior = loadNamePrior(opt('--prior') ?? undefined); const tag = opt('--tag') ?? split;
if (opt('--permute')) { let s = +opt('--permute') >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); const ks = Object.keys(prior.words); const vs = ks.map((k) => prior.words[k]); for (let i = vs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [vs[i], vs[j]] = [vs[j], vs[i]]; } prior = { ...prior, words: Object.fromEntries(ks.map((k, i) => [k, vs[i]])) }; }
const TRAIN = ['E', 'C', 'D', 'F', 'U'].includes(split); let all;
if (split === 'U') { const ids = new Set(fs.readFileSync('/tmp/gum-data/u-ids.txt', 'utf8').split(/\s+/).filter(Boolean)); all = parseGum('/tmp/gum-data/en_gum-ud-train.conllu').filter((d) => ids.has(d.id)); } else if (TRAIN) { const tr = parseGum('/tmp/gum-data/en_gum-ud-train.conllu'); const S = slicesOf(tr); const sets = setsOf(tr); const inE = new Set(sets.E.map((d) => d.id)); all = { E: sets.E, C: S.C, D: S.D, F: S.aside.filter((d) => !inE.has(d.id)) }[split]; } else all = parseGum({ dev: '/tmp/gum-data/en_gum-ud-dev.conllu', test: '/tmp/gum-data/en_gum-ud-test.conllu' }[split]).filter((d) => d.sents.length >= 20);
const overlap = (x, y, c, d) => Math.min(y, d) - Math.max(x, c) > 0; const rows = []; let mismatch = 0;
for (const doc of all.sort((x, y) => (x.id < y.id ? -1 : 1))) {
  const cf = `/tmp/gum-data/cache/${split}-${doc.id}.json`; const text = doc.sents.map((s) => s.text).join(' '); let w; if (fs.existsSync(cf)) w = JSON.parse(fs.readFileSync(cf, 'utf8')); else { w = readToWeft(text, { address: 'gum:' + doc.id, language: 'eng' }); if (w.error || w.skipped) continue; w = { sentences: w.sentences, cast: w.cast, clauses: w.clauses, pronounsPresence: w.pronounsPresence }; fs.writeFileSync(cf, JSON.stringify(w)); }
  const offs = []; let o = 0; for (const s of doc.sents) { offs.push(o); o += s.text.length + 1; }
  const ms = []; doc.sents.forEach((s, si) => s.mentions.forEach((m) => ms.push({ ent: m.ent, a: offs[si] + m.c0, b: offs[si] + m.c1, feats: m.goldHead.feats ?? '', upos: m.goldHead.upos })));
  const castSpans = []; for (const c of w.cast ?? []) for (const [x, y] of c.mentionSpans ?? []) castSpans.push({ a: x, b: y, ref: c.ref }); const castEnts = new Map(); for (const c of castSpans) for (const m of ms) if (overlap(c.a, c.b, m.a, m.b)) (castEnts.get(c.ref) ?? castEnts.set(c.ref, new Set()).get(c.ref)).add(m.ent);
  const named = new Set(); for (const m of ms) if (m.upos === 'PROPN' && castSpans.some((c) => overlap(c.a, c.b, m.a, m.b))) named.add(m.ent);
  const ans = ms.filter((m) => m.upos === 'PRON' && /Person=3/.test(m.feats) && /Number=Sing/.test(m.feats) && /PronType=Prs/.test(m.feats) && /Gender=(Masc|Fem)/.test(m.feats) && named.has(m.ent));
  const mentions = castSpans.map((c) => ({ ref: c.ref, start: c.a, end: c.b })).sort((x, y) => x.start - y.start);
  const items = (bs) => bs.map((b) => ({ at: [b.pos ?? b.offset ?? b.at?.[0], b.end ?? b.at?.[1] ?? (b.offset + b.pronoun.length)], ref: b.ref ?? b.referentId }));
  const s0c = (w.pronounsPresence ?? []).map((p) => ({ at: p.at, ref: p.ref })); const s0r = items(resolvePronounsByPresence(w.sentences, mentions, { ...D }).bindings);
  const np = nonPersonalFromNames({ text, cast: w.cast, prior }); const s6 = items(resolvePronounsByPresence(w.sentences, mentions, { ...D, nonPersonal: [...np] }).bindings);
  const out = (bs, m) => { const b = bs.find((p) => overlap(p.at[0], p.at[1], m.a, m.b)); return !b ? 'none' : castEnts.get(b.ref)?.has(m.ent) ? 'right' : 'wrong'; };
  for (const m of ans) { const x0 = out(s0c, m), x0r = out(s0r, m); if (x0 !== x0r) mismatch++; rows.push({ doc: doc.id, s0: x0, s6: out(s6, m), s0rerun: x0r }); }
  rows.push({ doc: doc.id, docMarker: true, answerable: ans.length, nonPersonal: np.size, beings: (w.cast ?? []).length });
}
fs.writeFileSync(`/tmp/gum-data/nv-${tag}.json`, JSON.stringify({ split, tag, rows, mismatchS0vsRerun: mismatch }));
const r = rows.filter((x) => !x.docMarker); const c = (k, v) => r.filter((x) => x[k] === v).length; console.log(tag, 'pronouns', r.length, 'S0', c('s0', 'right'), c('s0', 'wrong'), 'S6', c('s6', 'right'), c('s6', 'wrong'), 'S0 rerun mismatches', mismatch);
