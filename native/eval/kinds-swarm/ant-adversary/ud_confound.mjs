// ant-adversary / ud_confound.mjs — CONFOUND ATTACK on ant-kinds-ud's records (read-only use of their sig/<stem>.rec.json): PROPN/NOUN vs frequency-matched controls.
// Question: does the signature (sig+atm) beat position/length/mention-count covariates, and does it survive a position-matched subset? (their matching: frequency bin only)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cvScores, aucOf } from "../../law/name-war-and-peace.mjs";
import { readConlluStream, rngFor, seedFor } from "../../law/impact.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), SIG = path.join(HERE, "..", "ant-kinds-ud", "sig");
const round = (x, d = 3) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const ib = (i) => (i <= 2 ? i : i <= 4 ? 3 : i <= 8 ? 4 : 5);
const out = { languages: {} };
for (const f of fs.readdirSync(SIG).filter((x) => x.endsWith(".rec.json")).sort()) {
  const stem = f.replace(".rec.json", ""), d = JSON.parse(fs.readFileSync(path.join(SIG, f), "utf8"));
  const dev = `/private/tmp/claude-501/ud-eval/${stem}/dev.conllu`; if (!fs.existsSync(dev)) continue;
  const { sents } = readConlluStream(dev), byK = new Map(d.records.map((r) => [r.k, r]));
  const N = sents.length;
  const feat = (r) => { const len = sents[r.s].length; return { sig: [...r.sig, ...r.atm], conf: [Math.log(r.nw), r.i, len > 1 ? r.i / (len - 1) : 0, Math.log(len), r.i === 0 ? 1 : 0, Math.log1p(r.s)], init: r.i === 0 ? 1 : 0, ibk: ib(r.i), len, nw: r.nw }; };
  const res = {};
  for (const cls of ["PROPN", "NOUN"]) {
    const pairs = d.pairs.filter((p) => p.cls === cls && byK.has(p.pos) && byK.has(p.ctl)); if (pairs.length < 30) continue;
    const rows = []; pairs.forEach((p, pi) => { for (const [key, y] of [[p.pos, 1], [p.ctl, 0]]) { const r = byK.get(key); rows.push({ y, pair: pi, block: Math.min(9, Math.floor((r.s / N) * 10)), ...feat(r) }); } });
    const run = (rs, tag) => {
      if (rs.length < 40) return null;
      const y = rs.map((r) => r.y), blk = rs.map((r) => r.block), s = {};
      s.SIG = cvScores(rs.map((r) => r.sig), y, blk); s.CONF = cvScores(rs.map((r) => r.conf), y, blk); s.SIGCONF = cvScores(rs.map((r) => [...r.conf, ...r.sig]), y, blk);
      return { n: rs.length / 2, SIG: round(aucOf(s.SIG, y)), CONF: round(aucOf(s.CONF, y)), SIGCONF: round(aucOf(s.SIGCONF, y)), inc: round(aucOf(s.SIGCONF, y) - aucOf(s.CONF, y)), initPos: round(mean(rs.filter((r) => r.y === 1).map((r) => r.init))), initNeg: round(mean(rs.filter((r) => r.y === 0).map((r) => r.init))), lenPos: round(mean(rs.filter((r) => r.y === 1).map((r) => r.len)), 1), lenNeg: round(mean(rs.filter((r) => r.y === 0).map((r) => r.len)), 1) };
    };
    const byPair = new Map(); rows.forEach((r) => (byPair.get(r.pair) ?? byPair.set(r.pair, []).get(r.pair)).push(r));
    const matched = [...byPair.values()].filter((p) => p[0].init === p[1].init && p[0].ibk === p[1].ibk).flat();
    res[cls] = { all: run(rows), posMatched: run(matched) };
  }
  out.languages[stem] = res; console.error(stem, JSON.stringify(res.PROPN?.all));
}
// aggregate over languages
const agg = {};
for (const cls of ["PROPN", "NOUN"]) for (const sub of ["all", "posMatched"]) {
  const L = Object.values(out.languages).map((l) => l[cls]?.[sub]).filter(Boolean); if (!L.length) continue;
  const m = (k) => round(mean(L.map((x) => x[k])));
  const rnd = rngFor(seedFor("adv-udconf", cls, sub)), bs = []; for (let b = 0; b < 2000; b++) { let t = 0; for (let j = 0; j < L.length; j++) t += L[Math.floor(rnd() * L.length)].inc; bs.push(t / L.length); } bs.sort((a, b) => a - b);
  agg[`${cls}:${sub}`] = { languages: L.length, SIG: m("SIG"), CONF: m("CONF"), SIGCONF: m("SIGCONF"), incMean: m("inc"), incCI: [round(bs[50]), round(bs[1949])], nSigBeatsConf: L.filter((x) => x.SIG > x.CONF).length, incPositive: L.filter((x) => x.inc > 0).length, initPos: m("initPos"), initNeg: m("initNeg"), lenPos: m("lenPos"), lenNeg: m("lenNeg") };
}
out.aggregate = agg; fs.mkdirSync(path.join(HERE, "results"), { recursive: true }); fs.writeFileSync(path.join(HERE, "results", "ud_confound.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(agg, null, 1));
