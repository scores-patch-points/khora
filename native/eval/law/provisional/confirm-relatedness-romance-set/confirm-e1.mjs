// confirm-relatedness-romance-set/confirm-e1.mjs — registered EXPLORATORY analysis E1 (see confirm.mjs header): annotation-family (UD "GSD" team) versus Romance genealogy.
// For targets that are themselves UD-GSD treebanks (fra, por, and the cross-treebank spaGSD) compare three donor pools on FRESH train windows (form P, FIRST-BOTH):
//   r = Romance donors that are NOT GSD (cat, spa = AnCora; ita = ISDT; ron = RRT; glg = CTG); g = non-Romance GSD donors (cmn rus deu ind jpn kor); o = non-Romance non-GSD donors.
// genealogy-beyond-team = AUC(r) - AUC(o) ; team = AUC(g) - AUC(o). K=3 donors x 100 pairs, 20 draws, same probe as the rule.
import fs from "node:fs";
import path from "node:path";
import { round, mean } from "../family-vs-relatedness/lib.mjs";
import { genus } from "../family-vs-relatedness/groups.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";
import { loadFresh, CROSS, HERE } from "./lib-fresh.mjs";
import { loadRoster, transferPool, eligibleTarget, frozenCheck, fileHash } from "./confirm-lib.mjs";

const GSD = ["cmn", "rus", "deu", "ind", "jpn", "kor"], ROM_NONGSD = ["cat", "spa", "ita", "ron", "glg"];
export function runE1(set, headerSha) {
  const t0 = Date.now(), id = `E1-${set}`, roster = loadRoster(set, "FIRST"), out = { cell: id, set, headerSha256: headerSha, scoperHashes: frozenCheck(), confirmLibSha256: fileHash(HERE, "confirm-lib.mjs"), confirmE1Sha256: fileHash(HERE, "confirm-e1.mjs"), targets: {} };
  const nonRomanceOther = STEMS.filter((s) => genus(s) !== "Romance" && !GSD.includes(s));
  for (const [key, lang] of [["fra", "fra"], ["por", "por"], ["spaGSD", "spa"]]) {
    const L = key === "spaGSD" ? loadFresh(set, "spaGSD", "FIRST") : roster[key]; if (!eligibleTarget(L)) { out.targets[key] = { thin: L ? L.pairs : 0 }; continue; }
    const langs = { ...roster, [lang]: L }, rec = { pairs: L.pairs };
    for (const [name, pool] of [["r", ROM_NONGSD], ["g", GSD], ["o", nonRomanceOther]]) { const x = transferPool(lang, langs, L, "BOTH", id, "plain", 20, pool.filter((s) => s !== lang), name); rec[name] = x; }
    rec.genealogyBeyondTeam = rec.r && rec.o ? round(rec.r.mean - rec.o.mean) : null; rec.team = rec.g && rec.o ? round(rec.g.mean - rec.o.mean) : null;
    out.targets[key] = rec; console.error(`${id} ${key}: r ${rec.r?.mean} g ${rec.g?.mean} o ${rec.o?.mean} genealogy ${rec.genealogyBeyondTeam} team ${rec.team}`);
  }
  const v = (k) => Object.values(out.targets).filter((r) => r[k] != null).map((r) => r[k]);
  out.means = { genealogyBeyondTeam: v("genealogyBeyondTeam").length ? round(mean(v("genealogyBeyondTeam"))) : null, team: v("team").length ? round(mean(v("team"))) : null, n: v("team").length };
  out.seconds = round((Date.now() - t0) / 1000, 1);
  fs.writeFileSync(path.join(HERE, "results", `cell-${id}.json`), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ cell: id, means: out.means, targets: Object.fromEntries(Object.entries(out.targets).map(([k, r]) => [k, { r: r.r?.mean, g: r.g?.mean, o: r.o?.mean }])) }));
}
