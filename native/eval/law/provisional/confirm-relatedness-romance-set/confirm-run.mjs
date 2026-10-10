// confirm-relatedness-romance-set/confirm-run.mjs — runs ONE registered cell (see confirm.mjs header). Imported by confirm.mjs; its sha256 is written into every result.
import fs from "node:fs";
import path from "node:path";
import { round, mean } from "../family-vs-relatedness/lib.mjs";
import { setsFor, groupTable, cvAuc } from "../family-vs-relatedness/analysis.mjs";
import { loadFresh, CROSS, HERE } from "./lib-fresh.mjs";
import { PRIMARY, ROMANCE7, CROSS_KEYS, parseCell, donorBase, transferA, verdictOf, eligibleTarget, frozenCheck, fileHash } from "./confirm-lib.mjs";

export function runCell(id, headerSha) {
  const c = parseCell(id), t0 = Date.now(), froz = frozenCheck(), cross = c.form.startsWith("X"), keys = cross ? CROSS_KEYS : ROMANCE7;
  const base = donorBase(c), baseShuf = donorBase(c, true);
  const out = { cell: id, ...c, headerSha256: headerSha, scoperHashes: froz, libFreshSha256: fileHash(HERE, "lib-fresh.mjs"), confirmLibSha256: fileHash(HERE, "confirm-lib.mjs"), confirmRunSha256: fileHash(HERE, "confirm-run.mjs"),
    donorLanguages: Object.keys(base).filter((s) => base[s].pairs >= 100).length, targets: {}, thin: [] };
  const R = {}, EX = {};
  for (const key of keys) {
    const lang = cross ? CROSS[key].lang : key, L = loadFresh(c.set, key, c.stratum), Ls = loadFresh(c.set, key, c.stratum, true);
    if (!eligibleTarget(L)) { out.thin.push({ key, pairs: L ? L.pairs : 0 }); console.error(`${id} ${key}: thin (${L ? L.pairs : 0} pairs)`); continue; }
    const langs = { ...base, [lang]: L }, res = setsFor(lang, langs, c.arm, id, Ls ? { [lang]: Ls } : null);
    const rec = { key, lang, pairs: L.pairs, shufPairs: Ls ? Ls.pairs : null, sets: res };
    rec.sham = transferA(lang, langs, L, c.arm, id, "sham");
    rec.shufDonor = transferA(lang, { ...baseShuf, [lang]: L }, L, c.arm, id, "plain");
    if (!cross && (lang === "cat" || lang === "spa")) { const nt = setsFor(lang, langs, c.arm, `${id}-noTwin`, null, true); rec.noTwin = { a: nt.a, e: nt.e }; }
    rec.own = { cv: round(cvAuc(L, c.arm)), cvPosition: round(cvAuc(L, "POSITION")) };
    out.targets[key] = rec; R[lang] = res; EX[lang] = { sham: rec.sham, shufDonor: rec.shufDonor };
    console.error(`${id} ${key}: pairs ${L.pairs} a ${res.a?.mean} e ${res.e?.mean} pos ${res.a?.pos} shuf ${res.a?.shuf} sham ${rec.sham} shufDonor ${rec.shufDonor} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  const pick = (scope) => Object.fromEntries(scope.filter((t) => R[t]).map((t) => [t, R[t]])), gt = (scope) => groupTable(pick(scope))["genus:Romance"];
  const mex = (scope, k) => { const v = scope.filter((t) => R[t] && EX[t][k] != null).map((t) => EX[t][k]); return v.length ? round(mean(v)) : null; };
  const scopes = cross ? { primary: ["spa", "por", "glg"], all: ["spa", "por", "glg"] } : { primary: PRIMARY, all: ROMANCE7 };
  for (const [name, scope] of Object.entries(scopes)) {
    const g = gt(scope), ex = { sham: mex(scope, "sham"), shufDonor: mex(scope, "shufDonor") };
    out[name] = { scope, group: g, ex, verdict: verdictOf(g, ex) };
  }
  out.seconds = round((Date.now() - t0) / 1000, 1);
  fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
  fs.writeFileSync(path.join(HERE, "results", `cell-${id}.json`), JSON.stringify(out, null, 1));
  const g = out.primary.group;
  console.log(JSON.stringify({ cell: id, verdict: out.primary.verdict, n: g?.n, nPass: g?.nPass, same: g?.meanSame, ctrl: g?.meanCtrl, diff: g?.diffBoot, pos: g?.positionControl, shuf: g?.shuffledControl, ex: out.primary.ex, passing: g?.passing, failing: g?.failing, thin: out.thin, seconds: out.seconds }));
}
