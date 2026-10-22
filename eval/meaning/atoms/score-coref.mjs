// coref.mjs — each gold mention against the system's: the same mention (by its text, in order; a dropped subject by its verb), resolved to an
// entity whose name is the gold entity's (same normalized name, one containing the other, or the same last word)
import fs from "node:fs";
const gold = JSON.parse(fs.readFileSync("/private/tmp/claude-501/khora-wt/eval/meaning/atoms/gold.json", "utf8"));
const sys = JSON.parse(fs.readFileSync("/private/tmp/claude-501/khora-wt/eval/meaning/atoms/run13/system.json", "utf8"));
const S = JSON.parse(fs.readFileSync("/private/tmp/claude-501/khora-wt/eval/meaning/atoms/sentences.json", "utf8"));
const norm = (s) => String(s ?? "").normalize("NFC").toLowerCase().replace(/^(the|el|la|los|las|le|les|l'|l’|der|die|das|den|dem)\s+/u, "").replace(/[“”"'’(),.]/g, "").trim();
const sameName = (a, b) => { a = norm(a); b = norm(b); if (!a || !b) return false; if (a === b || a.includes(b) || b.includes(a)) return true; const la = a.split(/\s+/).at(-1), lb = b.split(/\s+/).at(-1); return la.length > 2 && la === lb; };
const titleOf = new Map(S.map((s) => [s.sid, s.title]));
const res = { C1: { n: 0, ok: 0 }, C2: { n: 0, ok: 0 } }, byHow = {}, misses = [];
for (const g of gold.sentences) {
  const s = sys.sentences.find((x) => x.sid === g.sid), ents = gold.entities[titleOf.get(g.sid)] ?? [];
  const gname = (id) => ents.find((e) => e.id === id)?.name ?? id;
  const used = new Set();
  for (const m of g.mentions ?? []) {
    const bar = /^(pronoun|dropped|description)$/.test(m.how) ? "C1" : /^(name|alias)$/.test(m.how) ? "C2" : null;
    if (!bar) continue;
    res[bar].n++; (byHow[m.how] ??= { n: 0, ok: 0, found: 0 }).n++;
    // the system's mention: the same words (or, for a dropped subject, a dropped mention at the same verb); else one whose words contain them
    let cand = (s?.mentions ?? []).map((x, i) => [x, i]).filter(([x, i]) => !used.has(i) && (m.how === "dropped" ? x.how === "dropped" && (!m.at || norm(x.at) === norm(m.at) || norm(m.at).includes(norm(x.at)) || norm(x.at).includes(norm(m.at))) : norm(x.text) === norm(m.text)));
    if (!cand.length && m.how !== "dropped") cand = (s?.mentions ?? []).map((x, i) => [x, i]).filter(([x, i]) => !used.has(i) && x.text && (norm(x.text).includes(norm(m.text)) || norm(m.text).includes(norm(x.text))));
    const hit = cand[0]; if (hit) used.add(hit[1]);
    const ok = !!hit && sameName(hit[0].entityName, gname(m.entity));
    if (hit) byHow[m.how].found++;
    if (ok) { res[bar].ok++; byHow[m.how].ok++; } else misses.push(`${g.sid} [${m.how}] "${m.text || "∅ at " + m.at}" gold=${gname(m.entity)} sys=${hit ? hit[0].entityName + " (" + hit[0].how + ")" : "no such mention"}`);
  }
}
console.log(JSON.stringify({ C1: `${res.C1.ok}/${res.C1.n} = ${(100 * res.C1.ok / res.C1.n).toFixed(1)}%`, C2: `${res.C2.ok}/${res.C2.n} = ${(100 * res.C2.ok / res.C2.n).toFixed(1)}%`, byHow }));
fs.writeFileSync("/private/tmp/claude-501/khora-wt/eval/meaning/atoms/run13/coref-misses.txt", misses.join("\n"));
console.log(misses.length, "misses; first 40:\n " + misses.slice(0, 40).join("\n "));
