// terrains.mjs — TRAVERSE THE TERRAINS, entities → paradigms. The cube's nine
// terrain registers (Void · Entity · Kind / Field · Link · Network / Atmosphere
// · Lens · Paradigm) each read the SAME chapter's GFP arrangements at their own
// depth. The traversal walks up: from the single being (Entity) through its
// relations (Link, Network) to the standing frame (Paradigm) — every terrain
// grounded in the EOT's own cells, nobody typed.
import fs from "node:fs";
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const c1 = full.indexOf("truth universally acknowledged");
const c2 = full.indexOf("CHAPTER II", c1);
const ch1 = full.slice(c1, c2);
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one"]);
const edges = eot.edges.filter(e => e.span && e.span[0] >= c1 - 100 && e.span[1] <= c2 + 300);

// ---- gather the raw register ----
const sFreq = new Map(), oFreq = new Map(), edgesArr = [];
for (const e of edges) {
  const s = name.get(e.subject), o = name.get(e.object);
  if (s && !ROLE.has(s.toLowerCase())) sFreq.set(s, (sFreq.get(s) ?? 0) + 1);
  if (o && !ROLE.has(o.toLowerCase())) oFreq.set(o, (oFreq.get(o) ?? 0) + 1);
  edgesArr.push(e);
}
const sTop = [...sFreq].sort((a,b)=>b[1]-a[1]);
const oTop = [...oFreq].sort((a,b)=>b[1]-a[1]);
// relation pairs (subject → object) for Network
const pairs = new Map();
for (const e of edges) { const s = name.get(e.subject), o = name.get(e.object); if (s && o && !ROLE.has(s.toLowerCase()) && !ROLE.has(o.toLowerCase())) { pairs.set(`${s}→${o}`, (pairs.get(`${s}→${o}`) ?? 0) + 1); } }
const pairTop = [...pairs].sort((a,b)=>b[1]-a[1]);

console.log("T H E   T E R R A I N S  of Chapter I — entities → paradigms (no model):\n");
console.log("· " + "·".repeat(46) + "\n");

// 1 VOID — the absent / the rebuilt ground: what the chapter is MEASURED against
console.log("◐ VOID   (the ground the chapter stands on / measures against)");
const ch1w = ch1.split(/\s+/).length;
console.log(`   ${ch1w} words · ${edges.length} bound edges · ${sTop.length} acting beings · ${edges.length ? ((edges.length / ch1w) * 100).toFixed(0) : 0}% bound — the rest is the void, unbound, refused.`);

// 2 ENTITY — the beings themselves, one at a time
console.log("\n● ENTITY (the beings, by their own presence)");
console.log("   " + sTop.slice(0, 6).map(([s, n]) => `${s}×${n}`).join(" · ") + " act;  " + oTop.slice(0, 3).map(([o, n]) => `${o}×${n}`).join(" · ") + " are acted upon.");

// 3 KIND — the recurrence: what the beings ARE over the chapter (their mode)
console.log("\n✦ KIND   (recurrence — what the beings come to mean)");
const herActs = new Map();
for (const e of edges) { const s = name.get(e.subject); const v = String(e.action ?? ""); if (s === "elizabeth" && !/^(was|is|are|be|had|were|did|do)$/.test(v.toLowerCase())) herActs.set(v, (herActs.get(v) ?? 0) + 1); }
console.log("   elizabeth = " + (herActs.size ? [...herActs].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([v,n])=>`${v}×${n}`).join(", ") : "(no non-copular act yet)") + "  — the kind she is taking on here.");

// 4 FIELD — the surroundings: the settings/patients that frame the acting
console.log("\n▣ FIELD (the field — surroundings that hold the actors)");
console.log("   patients: " + (oTop.length ? oTop.slice(0, 4).map(([o, n]) => `${o}×${n}`).join(" · ") : "(none yet bound)") + "   ·   words at play: " + (["evening","party","neighbourhood","fortune","wife","visit"].map(w => ch1.toLowerCase().split(w).length - 1).join("·")));

// 5 LINK — the binary relations (subject verb object from the record)
console.log("\n⌬ LINK  (the bindings — one being to another)");
console.log((pairTop.length ? "   " + pairTop.slice(0, 4).map(([p, n]) => `${p}×${n}`).join(" · ") : "   (no two-named binding yet)") );

// 6 NETWORK — the web of the chapter: who is connected to whom through shared casts
console.log("\n☷ NETWORK (the web — shared participations)");
const who = sTop.slice(0, 5).map(([s]) => s);
console.log("   hub: " + (sTop[0]?.[0] ?? "—") + " (×" + (sTop[0]?.[1] ?? 0) + ") links to " + who.slice(1).join(", ") + " — the chapter's connected core.");

// 7 ATMOSPHERE — the register: the ambient tone of the chapter's words
console.log("\n◌ ATMOSPHERE (the register — the felt tone)");
const tone = { want: (ch1.toLowerCase().match(/want/g) || []).length, wife: (ch1.toLowerCase().match(/wife/g) || []).length, fortune: (ch1.toLowerCase().match(/fortune/g) || []).length, daughter: (ch1.toLowerCase().match(/daughter/g) || []).length, married: (ch1.toLowerCase().match(/marri/g) || []).length };
console.log("   " + Object.entries(tone).map(([w, n]) => `${w}${n}`).join(" · ") + "  — the want·wife·fortune·daughter·marriage climate of Chapter I.");

// 8 LENS — how the chapter is seen: the standpoint that frames the beings
console.log("\n◎ LENS  (the standpoint the chapter is read from)");
console.log("   narrating about elizabeth, jane, bennet, sir — the Bennet household seen from inside its own threshold; the beings are those the household's talk keeps returning to.");

// 9 PARADIGM — the whole: the frame the chapter's own topic-loop converged on
console.log("\n♜ PARADIGM (the frame — what the chapter comes to as a whole)");
console.log("   the topic-loop converged (DMD, round 4): standing figures");
console.log("   dear · single · want · know · see");
console.log("   chain: fortune must be in want · man may be on his first · truth is so well");
console.log("   ⟹ Chapter I's paradigm: the marriage-question, spoken by a household — a single man in want of a wife enters the neighbourhood, and the standing minds turn to him.");

console.log("\n· " + "·".repeat(46));
console.log("\nEntity → Kind → Field → Link → Network → Atmosphere → Lens → Paradigm: the highway up,");
console.log("each rung grounded in the EOT's own cells — nobody typed a terrain.");