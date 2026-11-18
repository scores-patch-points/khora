// eval-nt-prodrop.mjs <dev|test> — PREREG-ROUND21.md. Binding the dropped subject (PROIEL empty P tokens, relation sub, finite 3sg head verb) on the shipped FULL arm: OFF (overt only) vs ON (+ null subjects); control NULLFIRST.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const W = path.resolve(HERE, "../../..");
const { parseProiel, entitiesOf, ntBookOf } = await import("./lib-proiel-gold.mjs"); const { readToWeft } = await import(W + "/native/the-fold/read-process.mjs"); const { defaultPronounPresence } = await import(W + "/native/adapters/text/pronoun-presence-chosen.js");
const set = process.argv[2]; const codes = set === "dev" ? ["JOHN"] : ["MATT", "MARK", "LUKE"]; const J = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8")); const REG = J("register-full.json"), DEC = { prior: J("declension-full.json") };
const nt = parseProiel("/Users/mlacy/Documents/khora-cast/khora/identity/pronouns-multilingual/data/proiel-xml/greek-nt.xml", { bookOf: ntBookOf }); const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c) > 0; let seed = 21; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const out = { set, per: [] };
for (const code of codes) {
  const bk = nt.find((b) => b.code === code); const { ent } = entitiesOf(bk); const byId = new Map(bk.tokens.map((t) => [t.id, t]));
  const gold = bk.tokens.filter((t) => t.empty === "P" && t.rel === "sub" && t.ante && t.head).map((t) => ({ t, v: byId.get(t.head) })).filter((x) => x.v && x.v.morph && x.v.morph[0] === "3" && x.v.morph[1] === "s" && /[ismo]/.test(x.v.morph[3] ?? "") && x.v.b > x.v.a);
  const overtGold = bk.tokens.filter((t) => t.form && !t.empty && (t.pos === "Pp" || t.pos === "Pk") && t.morph?.[0] === "3" && t.morph?.[1] === "s");
  const row = { code, goldNull: gold.length, goldOvert: overtGold.length, arms: {} };
  for (const arm of ["OFF", "ON", "NULLFIRST"]) {
    const ro = { pronounPresence: { ...defaultPronounPresence(), language: "grc", pronounClass: REG, unspaced: false }, ...(arm !== "OFF" ? { caseProDrop: "on" } : {}) };
    if (arm === "NULLFIRST") ro.pronounPresence = { ...ro.pronounPresence, nullFirst: true };
    const w = readToWeft(bk.text, { language: "grc", address: "nt:" + code, declension: DEC, readerOptions: ro });
    const castSpans = []; for (const c of w.cast ?? []) for (const [a, b] of c.mentionSpans ?? []) castSpans.push({ a, b, ref: c.ref }); const castEnts = new Map(), named = new Set();
    for (const c of castSpans) for (const t of bk.tokens) if (t.form && overlap(c.a, c.b, t.a, t.b)) { const e = ent.get(t.id); (castEnts.get(c.ref) ?? castEnts.set(c.ref, new Set()).get(c.ref)).add(e); if (t.pos === "Ne") named.add(e); }
    const ans = gold.filter((g) => named.has(ent.get(g.t.id))); const pd = (w.proDrop ?? []); let right = 0, wrong = 0, none = 0; const preds = [];
    for (const g of ans) { const b = pd.find((p) => overlap(p.at[0], p.at[1], g.v.a, g.v.b)); if (!b) { none++; continue; } const ok = castEnts.get(b.ref)?.has(ent.get(g.t.id)); ok ? right++ : wrong++; preds.push(b.ref); }
    let kr = 0, kw = 0; const D = 200; for (let d = 0; d < D; d++) { const refs = [...preds]; for (let i = refs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [refs[i], refs[j]] = [refs[j], refs[i]]; } let q = 0; for (const g of ans) { const b = pd.find((p) => overlap(p.at[0], p.at[1], g.v.a, g.v.b)); if (!b) continue; const r = refs[q++]; castEnts.get(r)?.has(ent.get(g.t.id)) ? kr++ : kw++; } }
    const overtBound = (w.pronounsPresence ?? []).map((p) => p.at[0] + ":" + p.ref).join(","); row.arms[arm] = { answerableNull: ans.length, right, wrong, none, nullRight: kr / D, nullWrong: kw / D, clauses: (w.clauses ?? []).length, proDropEvents: pd.length, overtBound: (w.pronounsPresence ?? []).length, overtSig: overtBound.length };
    console.error(code, arm, `null-subject gold ${gold.length}, answerable ${ans.length}, bound right ${right} wrong ${wrong} (events ${pd.length})`);
  }
  out.per.push(row);
}
fs.writeFileSync(path.join(HERE, "results", `nt-prodrop-${set}.json`), JSON.stringify(out));
for (const arm of ["ON", "NULLFIRST"]) { const R = out.per.reduce((a, r) => a + r.arms[arm].right, 0), Wr = out.per.reduce((a, r) => a + r.arms[arm].wrong, 0), A = out.per.reduce((a, r) => a + r.arms[arm].answerableNull, 0), kr = out.per.reduce((a, r) => a + r.arms[arm].nullRight, 0), kw = out.per.reduce((a, r) => a + r.arms[arm].nullWrong, 0); console.log(set, arm, `dropped-subject answerable ${A} bound ${R + Wr} right ${R} wrong ${Wr} precision ${(R / Math.max(1, R + Wr)).toFixed(3)} coverage ${((R + Wr) / Math.max(1, A)).toFixed(3)} | null precision ${(kr / Math.max(1, kr + kw)).toFixed(3)}`); }
console.log(set, "overt bindings identical OFF vs ON:", out.per.every((r) => r.arms.OFF.overtSig === r.arms.ON.overtSig && r.arms.OFF.overtBound === r.arms.ON.overtBound), "| gold null-subject / overt 3sg:", out.per.map((r) => `${r.code} ${r.goldNull}/${r.goldOvert}`).join("  "));
