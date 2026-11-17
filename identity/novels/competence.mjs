// competence.mjs <id8>... — PREREG-ROUND8.md. Thoughts about earlier records (wormhole, rule, synapse, expressway) that would have made them less surprising; hindsight on the first two thirds, foresight on the last third;
// recorded by the system into the pharos (thought-*, thought-retract, thought-meta), then REPLAYED from the log. No model; constants declared in the prereg.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url'; import { seeded } from './attend.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const KH = process.env.KHORA_DIR ?? path.resolve(HERE, '..', '..');
const PHAROS_LIB = process.env.PHAROS_LIB ?? path.resolve(HERE, '..', '..', '..', 'pharos', 'lib', 'pharos.mjs'); process.env.PHAROS_FORMAT = 'phb';
const { gammaFor } = await import(pathToFileURL(path.join(KH, 'native/kernel/activation.js')).href); const { openDoor } = await import(pathToFileURL(path.join(KH, 'cli/pharos-door.mjs')).href);
const G4 = gammaFor(4), G32 = gammaFor(32); const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : 0; }; const unitOf = (a) => { const m = median(a); return 1.4826 * median(a.map((x) => Math.abs(x - m))); };
const man = JSON.parse(fs.readFileSync(path.join(HERE, 'books-manifest.json'), 'utf8')).filter((m) => m.ok); const L2 = Math.log2;
const DET = /^(the|this|that|these|those)\s+/i; const PRON = /\b(he|him|his|himself|she|her|hers|herself)\b/gi;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');

function loadBook(id) {
  const m = man.find((x) => x.document_id.startsWith(id)); const T = fs.readFileSync(path.join(HERE, m.file), 'utf8'); const W = JSON.parse(fs.readFileSync(path.join(HERE, 'weft', id + '.weft.json'), 'utf8')); const TR = JSON.parse(fs.readFileSync(path.join(HERE, 'tracked', id + '.json'), 'utf8'));
  const S = W.sentences, N = S.length, off = S.map((s) => s.offset); const sentOf = (p) => { let a = 0, b = N - 1; while (a < b) { const k = (a + b + 1) >> 1; if (off[k] <= p) a = k; else b = k - 1; } return a; };
  const mentions = []; for (const c of W.cast ?? []) for (const sp of c.mentionSpans ?? []) mentions.push({ ref: c.ref, start: sp[0], end: sp[1] }); mentions.sort((a, b) => a.start - b.start);
  const overlaps = (a, b) => mentions.some((x) => x.start < b && a < x.end);
  // descriptions (as wormhole.mjs)
  const occ = []; (W.clauses ?? []).forEach((c, ci) => { for (const [role, a] of [['subj', c.subject], ['obj', c.object]]) { if (!a) continue; const t = T.slice(a.start, a.end); const dm = t.match(DET); if (!dm || overlaps(a.start, a.end)) continue; let rest = t.slice(dm[0].length).replace(/\s+/g, ' ').trim().split(/\s+of\s+/i)[0]; const ws = rest.match(/[\p{L}'-]+/gu); if (!ws) continue; const head = ws[ws.length - 1].toLowerCase(); if (head.length < 3) continue; occ.push({ pos: a.start, sent: c.sentence ?? sentOf(a.start), head, bound: null, cands: [] }); } });
  // causal presence binding of the descriptions (the tracker's dials)
  const evs = new Map(); const push = (s, e) => { if (!evs.has(s)) evs.set(s, []); evs.get(s).push(e); }; for (const mm of mentions) push(sentOf(mm.start), { k: 'm', pos: mm.start, ref: mm.ref }); for (const b of TR.bindings) push(sentOf(b.offset), { k: 'm2', pos: b.offset, ref: b.ref }); for (const o of occ) push(o.sent, { k: 'd', pos: o.pos, o });
  const st = new Map(); const pres = (r, t) => { const c = st.get(r); return c ? c.v * G4 ** (t - c.t) : 0; }; const fire = (r, t, w) => st.set(r, { v: pres(r, t) + w, t });
  for (let t = 0; t < N; t++) { const ev = (evs.get(t) ?? []).sort((a, b) => a.pos - b.pos); let first = true; for (const e of ev) { if (e.k === 'm') { fire(e.ref, t, first ? 2 : 1); first = false; } else if (e.k === 'm2') fire(e.ref, t, 1); else { const cs = []; for (const [r] of st) { const p = pres(r, t); if (p > 0) cs.push([r, p]); } cs.sort((a, b) => b[1] - a[1]); e.o.cands = cs.map((x) => x[0]); if (!cs.length) continue; const top = cs[0][1], second = cs[1]?.[1] ?? 0; if (top >= 2 && (top - second) / top >= 0.3) e.o.bound = cs[0][0]; } } }
  // the event stream
  const bAt = new Map(TR.bindings.map((b) => [b.offset, b.ref])); const events = [];
  for (const mm of mentions) events.push({ pos: mm.start, end: mm.end, kind: 'N', ref: mm.ref });
  const seenP = new Set(); for (let i = 0; i < N; i++) { PRON.lastIndex = 0; for (let m; (m = PRON.exec(S[i].text));) { const p = S[i].offset + m.index; seenP.add(p); events.push({ pos: p, end: p + m[0].length, kind: 'P', pron: m[0].toLowerCase(), bound: bAt.get(p) ?? null }); } } for (const [p, r] of bAt) if (!seenP.has(p)) events.push({ pos: p, end: p + 3, kind: 'P', pron: '?', bound: r });
  for (const o of occ) events.push({ pos: o.pos, end: o.pos + o.head.length, kind: 'D', head: o.head, bound: o.bound, cands: o.cands });
  events.sort((a, b) => a.pos - b.pos); events.forEach((e) => { e.t = sentOf(e.pos); });
  return { id, m, T, W, S, N, events, occ, sentOf, sha: sha(Buffer.from(T)), bytes: Buffer.byteLength(T) };
}
const byteAt = (T, i) => Buffer.byteLength(T.slice(0, i), 'utf8');

// ---- the reader: prequential surprise of each event under a set of thoughts ----
function run(events, th) {
  const worm = th.worm ?? new Map(), pairs = th.pairs ?? [], rule = !!th.rule; const n = new Map(); let Ntot = 0, births = 0; const p4 = new Map(), p32 = new Map(); const bits = new Float64Array(events.length);
  const pres = (mp, g, x, t) => { const c = mp.get(x); return c ? c.v * g ** (t - c.t) : 0; }; const fire = (mp, g, x, t) => mp.set(x, { v: pres(mp, g, x, t) + 1, t });
  const bySrc = new Map(); for (const p of pairs) { if (!bySrc.has(p.i)) bySrc.set(p.i, []); bySrc.get(p.i).push(p); }
  for (let k = 0; k < events.length; k++) { const e = events[k], t = e.t; let s; if (e.kind === 'N') s = e.ref; else if (e.kind === 'P') s = rule && e.bound ? e.bound : 'p:' + e.pron; else s = worm.has(e.head) ? worm.get(e.head) : 'd:' + e.head;
    // expectation: presence (window 4) plus the activation each thought transfers
    const extra = new Map(); for (const [i, ps] of bySrc) for (const p of ps) { const pi = p.win === 32 ? pres(p32, G32, i, t) : pres(p4, G4, i, t); if (pi > 1e-6) extra.set(p.j, (extra.get(p.j) ?? 0) + p.w * pi); }
    let Zp = 0; const live = []; for (const [x, c] of p4) { const v = c.v * G4 ** (t - c.t); if (v > 1e-3) { live.push(x); Zp += v; } else if (v < 1e-6) p4.delete(x); } for (const [j, v] of extra) { Zp += v; if (!p4.has(j) || (p4.get(j).v * G4 ** (t - p4.get(j).t)) <= 1e-3) { /* j counted once through extra */ } }
    const piNew = (births + 1) / (Ntot + 2); const seen = (n.get(s) ?? 0) > 0; let P;
    if (!seen) P = piNew; else { const freq = n.get(s) / Ntot; const pr = pres(p4, G4, s, t), pe = pres(p4, G4, s, t) > 1e-3 ? pr : 0; const presPart = s.startsWith('ref:') ? (pe + (extra.get(s) ?? 0)) / (Zp || 1) : 0; P = (1 - piNew) * (Zp > 0 ? 0.5 * presPart + 0.5 * freq : freq); }
    bits[k] = -L2(Math.max(P, 1e-12)); if (!seen) births++; n.set(s, (n.get(s) ?? 0) + 1); Ntot++; if (s.startsWith('ref:')) { fire(p4, G4, s, t); fire(p32, G32, s, t); } }
  return bits;
}
const sumRange = (bits, events, lo, hi) => { let a = 0; for (let k = 0; k < events.length; k++) if (events[k].t > lo && events[k].t <= hi) a += bits[k]; return a; };

function propose(B, t0) {
  const { events, occ, N } = B; const nRef = new Set(events.filter((e) => e.kind === 'N').map((e) => e.ref)).size; const heads = new Set(occ.map((o) => o.head)); const R = seeded(2026);
  // wormholes: identity test on occurrences up to t0 (round 6)
  const byHead = new Map(); for (const o of occ.filter((o) => o.sent <= t0)) { if (!byHead.has(o.head)) byHead.set(o.head, []); byHead.get(o.head).push(o); } const tested = [...byHead].filter(([, os]) => os.filter((o) => o.bound).length >= 3); const thr = Math.sqrt(2 * Math.log(Math.max(2, tested.length))); const links = [];
  for (const [h, os] of tested) { const bd = os.filter((o) => o.bound); const cnt = new Map(); for (const o of bd) cnt.set(o.bound, (cnt.get(o.bound) ?? 0) + 1); const [rs, top] = [...cnt].sort((a, b) => b[1] - a[1])[0]; const s = top / bd.length; const nulls = []; for (let d = 0; d < 200; d++) { const c2 = new Map(); for (const o of bd) { const r = o.cands[Math.floor(R() * o.cands.length)]; c2.set(r, (c2.get(r) ?? 0) + 1); } nulls.push(Math.max(...c2.values()) / bd.length); } const mu = nulls.reduce((a, b) => a + b, 0) / nulls.length, sd = Math.max(Math.sqrt(nulls.reduce((a, b) => a + (b - mu) ** 2, 0) / nulls.length), 1 / bd.length); if ((s - mu) / sd >= thr) links.push({ kind: 'wormhole', head: h, ref: rs, cost: L2(Math.max(2, heads.size)) + L2(Math.max(2, nRef)) }); }
  // synapse/expressway candidates: co-presence credit in the training part
  const win = 2; const inWin = []; for (let t = 0; t <= t0; t++) inWin.push(new Set()); for (const e of events) if (e.kind === 'N' && e.t <= t0) for (let d = 0; d <= win; d++) if (e.t + d <= t0) inWin[e.t + d].add(e.ref);
  const ni = new Map(), nij = new Map(); for (const s of inWin) { const a = [...s]; for (const x of a) ni.set(x, (ni.get(x) ?? 0) + 1); for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { const k = a[i] < a[j] ? a[i] + '|' + a[j] : a[j] + '|' + a[i]; nij.set(k, (nij.get(k) ?? 0) + 1); } }
  const cand = []; for (const [k, c] of nij) { if (c < 3) continue; const [x, y] = k.split('|'); cand.push({ x, y, c, credit: c - ni.get(x) * ni.get(y) / (t0 + 1) }); } let pairsC = [];
  if (cand.length >= 3) { const cr = cand.map((p) => p.credit); const thrC = median(cr) + unitOf(cr); pairsC = cand.filter((p) => p.credit > thrC).sort((a, b) => b.credit - a.credit).slice(0, 60); }
  const dir = []; for (const p of pairsC) { dir.push({ i: p.x, j: p.y, w: Math.min(1, p.c / ni.get(p.x)) }); dir.push({ i: p.y, j: p.x, w: Math.min(1, p.c / ni.get(p.y)) }); }
  return { links, dir, pairCost: 2 * L2(Math.max(2, nRef)), tested: tested.length };
}

function competence(B) {
  const { events, N } = B; const t0 = Math.floor(N * 2 / 3) - 1; const base = run(events, {}); const hs = (b) => sumRange(b, events, -1, t0), fs = (b) => sumRange(b, events, t0, N); const baseH = hs(base), baseF = fs(base);
  const P = propose(B, t0); const evalTh = (th) => { const b = run(events, th); return { h: baseH - hs(b), f: baseF - fs(b) }; };
  const out = { id: B.id, N, events: events.length, t0, baseHindBits: baseH, baseForeBits: baseF, thoughts: [], gaps: [] };
  // rule (level 2: generates many links)
  const RULE_COST = L2(8 * 3 * 2 * 6 * 6); { const r = evalTh({ rule: true }); const net = r.h - RULE_COST; out.thoughts.push({ kind: 'rule', name: 'pronoun-presence', hind: r.h, cost: RULE_COST, net, fore: r.f, admitted: net > 0 }); }
  // wormholes
  const W = P.links.map((l) => { const r = evalTh({ worm: new Map([[l.head, l.ref]]) }); return { ...l, hind: r.h, net: r.h - l.cost, fore: r.f }; }); if (W.length) { const nets = W.map((x) => x.net); const thr = W.length >= 3 ? median(nets) + unitOf(nets) : 0; if (W.length < 3) out.gaps.push({ kind: 'wormhole', reason: 'fewer_than_3_candidates', n: W.length }); for (const x of W) out.thoughts.push({ kind: 'wormhole', head: x.head, ref: x.ref, hind: x.hind, cost: x.cost, net: x.net, fore: x.fore, admitted: x.net > thr }); }
  // synapses / expressways
  const D = P.dir.map((p) => { const a = evalTh({ pairs: [{ ...p, win: 4 }] }), b = evalTh({ pairs: [{ ...p, win: 32 }] }); return { ...p, h4: a.h, f4: a.f, h32: b.h, f32: b.f }; });
  if (D.length >= 3) { const diff = D.map((x) => x.h32 - x.h4); const tE = median(diff) + unitOf(diff); const typed = D.map((x) => { const exp = (x.h32 - x.h4) > tE; return { ...x, ptype: exp ? 'expressway' : 'synapse', win: exp ? 32 : 4, hind: exp ? x.h32 : x.h4, fore: exp ? x.f32 : x.f4 }; }); for (const ptype of ['synapse', 'expressway']) { const grp = typed.filter((x) => x.ptype === ptype); if (!grp.length) continue; const nets = grp.map((x) => x.hind - P.pairCost); const thr = grp.length >= 3 ? median(nets) + unitOf(nets) : 0; if (grp.length < 3) out.gaps.push({ kind: ptype, reason: 'fewer_than_3_candidates', n: grp.length }); grp.forEach((x, k) => out.thoughts.push({ kind: ptype, i: x.i, j: x.j, w: x.w, win: x.win, hind: x.hind, cost: P.pairCost, net: nets[k], fore: x.fore, admitted: nets[k] > thr })); } } else out.gaps.push({ kind: 'pair', reason: 'fewer_than_3_candidates', n: D.length });
  // joint set
  const adm = out.thoughts.filter((x) => x.admitted); const toTh = (list) => ({ rule: list.some((x) => x.kind === 'rule'), worm: new Map(list.filter((x) => x.kind === 'wormhole').map((x) => [x.head, x.ref])), pairs: list.filter((x) => x.kind === 'synapse' || x.kind === 'expressway').map((x) => ({ i: x.i, j: x.j, w: x.w, win: x.win })) });
  const jb = run(events, toTh(adm)); out.jointHind = baseH - hs(jb); out.jointFore = baseF - fs(jb); out.competence = out.jointFore / baseF; out.joint = toTh(adm); out.admittedN = adm.length;
  // null: same number and kind, random referents (rule excluded: a single thought has no null)
  const refs = [...new Set(events.filter((e) => e.kind === 'N').map((e) => e.ref))]; const heads = [...new Set(B.occ.map((o) => o.head))]; const R = seeded(8); const nul = []; const admW = adm.filter((x) => x.kind === 'wormhole'), admP = adm.filter((x) => x.kind === 'synapse' || x.kind === 'expressway');
  const realNR = (() => { const b = run(events, { worm: toTh(adm).worm, pairs: toTh(adm).pairs }); return baseF - fs(b); })();
  for (let d = 0; d < 20; d++) { const worm = new Map(); for (const x of admW) { if (heads.length && refs.length) worm.set(heads[Math.floor(R() * heads.length)], refs[Math.floor(R() * refs.length)]); } const pairs = admP.map((x) => ({ i: refs[Math.floor(R() * refs.length)], j: refs[Math.floor(R() * refs.length)], w: x.w, win: x.win })); const b = run(events, { worm, pairs }); nul.push(baseF - fs(b)); }
  out.realNoRuleFore = realNR; out.nullFore = nul.reduce((a, b) => a + b, 0) / (nul.length || 1);
  return out;
}

// ---- the pharos: record the thoughts, retract the ones that did not pay, record a meta-thought per kind, then REPLAY from the log ----
async function record(B, res) {
  const LOG = path.join(HERE, 'logs8', B.id); fs.rmSync(LOG, { recursive: true, force: true }); fs.mkdirSync(LOG, { recursive: true }); const pointer = path.join(LOG, 'pharos.json');
  fs.writeFileSync(pointer, JSON.stringify({ v: 1, kind: 'pharos-pointer', lib: PHAROS_LIB, sha256: sha(fs.readFileSync(PHAROS_LIB)) }, null, 2) + '\n');
  const door0 = await openDoor({ pointer, log: B.id, dir: LOG, writer: 'competence' }); if (!door0.on) throw new Error('door off: ' + door0.why); const door = { ...door0, weave: (x) => { const e = door0.weave(x); if (!e) throw new Error('pharos refused a write: ' + door0.counts.lastReason); return e; } };
  for (const k of ['thought-wormhole', 'thought-rule', 'thought-synapse', 'thought-expressway']) door.declare(k, 'REC·Pattern', 'a thought the system wrote about its own earlier records, citing the places it is about (PREREG-ROUND8)'); door.declare('thought-retract', 'REC·Pattern', 'a later entry saying a thought did not pay on later events; the thought stays in the log'); door.declare('thought-meta', 'REC·Pattern', 'a thought about the thoughts of one kind: how many paid, citing them');
  const cite = (x) => { const places = x.kind === 'wormhole' ? B.occ.filter((o) => o.head === x.head).slice(0, 8).map((o) => [o.pos, o.pos + o.head.length]) : x.kind === 'rule' ? B.events.filter((e) => e.kind === 'P' && e.bound).slice(0, 8).map((e) => [e.pos, e.end]) : B.events.filter((e) => e.kind === 'N' && (e.ref === x.i || e.ref === x.j)).slice(0, 8).map((e) => [e.pos, e.end]); return places.map(([a, b]) => ({ source: B.sha, at: [byteAt(B.T, a), byteAt(B.T, b)] })); };
  const ids = new Map(); const adm = res.thoughts.filter((x) => x.admitted);
  adm.forEach((x, k) => { const body = { ...x, cites: cite(x), foresightPending: false }; delete body.admitted; const e = door.weave({ cell: 'REC·Pattern', kind: 'thought-' + x.kind, addr: `thought:${B.id}:${k}`, body }); ids.set(k, e?.id); x._id = e?.id; });
  adm.forEach((x, k) => { if (x.fore < 0 && ids.get(k)) door.weave({ cell: 'REC·Pattern', kind: 'thought-retract', addr: `retract:${B.id}:${k}`, body: { reason: 'foresight saving below 0 on the last third', fore: x.fore }, of: [ids.get(k)] }); });
  for (const kind of ['wormhole', 'rule', 'synapse', 'expressway']) { const g = adm.filter((x) => x.kind === kind); if (!g.length) continue; door.weave({ cell: 'REC·Pattern', kind: 'thought-meta', addr: `meta:${B.id}:${kind}`, body: { kind, n: g.length, paid: g.filter((x) => x.fore > 0).length, precision: g.filter((x) => x.fore > 0).length / g.length, meanFore: g.reduce((a, x) => a + x.fore, 0) / g.length }, of: g.map((x) => x._id).filter(Boolean) }); }
  // replay: rebuild the thought set from the log alone and recompute the last-third bits
  const get = (k) => door.fold({ kind: k }) ?? []; const ent = [...get('thought-wormhole'), ...get('thought-rule'), ...get('thought-synapse'), ...get('thought-expressway')]; const b = ent.map((e) => e.body);
  const th = { rule: b.some((x) => x.kind === 'rule'), worm: new Map(b.filter((x) => x.kind === 'wormhole').map((x) => [x.head, x.ref])), pairs: b.filter((x) => x.kind === 'synapse' || x.kind === 'expressway').map((x) => ({ i: x.i, j: x.j, w: x.w, win: x.win })) };
  const bits = run(B.events, th); const foreReplay = res.baseForeBits - sumRange(bits, B.events, res.t0, B.N); const retr = get('thought-retract').length, neg = adm.filter((x) => x.fore < 0).length;
  return { replayMatch: Math.abs(foreReplay - res.jointFore) < 1e-9, foreReplay, retractions: retr, negativeForesight: neg, entries: door.counts.woven, metas: get('thought-meta').length };
}

const rows = [];
for (const id of process.argv.slice(2)) {
  const B = loadBook(id); const res = competence(B); const rec = await record(B, res); const adm = res.thoughts.filter((x) => x.admitted);
  const by = (k) => adm.filter((x) => x.kind === k); const f = (k) => by(k).reduce((a, x) => a + x.fore, 0);
  console.log(id, `events ${res.events} | admitted ${adm.length} (rule ${by('rule').length}, worm ${by('wormhole').length}, syn ${by('synapse').length}, exp ${by('expressway').length}) | hindsight ${res.jointHind.toFixed(1)} bits, foresight ${res.jointFore.toFixed(1)} of ${res.baseForeBits.toFixed(0)} (competence ${(100 * res.competence).toFixed(2)}%) | null ${res.nullFore.toFixed(1)} vs real(no rule) ${res.realNoRuleFore.toFixed(1)} | replay ${rec.replayMatch ? 'EXACT' : 'MISMATCH'} retractions ${rec.retractions}/${rec.negativeForesight}`);
  rows.push({ ...res, thoughts: res.thoughts, rec, joint: undefined });
}
fs.writeFileSync(path.join(HERE, process.env.OUT ?? 'competence-rows.json'), JSON.stringify(rows));
