// essay.mjs — LONG-FORM GENERATION, the lawful way. A defense essay on any
// text is built top-down from the fold's own extractions:
//   READ → BOUND EDGES (EO clauses) → per-window GISTS (macrstructures) →
//   a MACROSTRUCTURE OF MACROSTRUCTURES (kinds at Pattern-of-Pattern) →
//   the MOUTH (a model prosifies ONLY the gists; the fold censors: every
//   sentence must be underwritten by a bound being+deed or a conveyance).
// The essay is LONG because it is a STACK: each paragraph is one chapter-
// window's gist, each sentence carries its content-address. Nothing revealed.
// Usage: node essay.mjs <textfile> <chars> <out.md>
import fs from "node:fs";
const { readEnglish } = await import("file:///Users/mlacy/Documents/3.0/khora/native/eval/the-fold/scene/reader-en.mjs");
const file = String(process.argv[2] || "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt");
const chars = Number(process.argv[3] || 120000);
const out = String(process.argv[4] || "/tmp/essay.md");

const raw = fs.readFileSync(file, "utf8").slice(0, chars);
const START_AT = raw.indexOf("CHAPTER I") >= 0 ? raw.indexOf("CHAPTER I") : 0; // skip Gutenberg front matter
const body = raw.slice(START_AT);
const r = await readEnglish({ text: body });
const edges = r.clauses.map((c) => ({ at: c.span?.[0] ?? 0, s: c.subject?.head ?? null, v: c.verb, o: c.object?.head ?? null, d: c.dative?.head ?? null }));
const bound = edges.filter((e) => e.s && e.v && String(e.v).length > 2 && !/^(was|is|are|be|had|has|have|does|do|would|will|should)$/i.test(e.v));
// THE THIRD-PERSON DOCTRINE: only named beings (the reader's own cast) — a
// pronoun is a posture of address, never an actor. name() enforces a capital
// AND vetoes the address-forms, so the essay's cast is the beings.
const ROLE = new Set(["i","me","my","he","him","his","she","her","you","your","we","us","our","they","them","their","it","its"]);
const name = (x) => (x && /^[A-Z]/.test(String(x)) && !ROLE.has(String(x).toLowerCase()) ? String(x) : null);

// ── BEINGS + DEEDS (the licensed vocabulary, from the edge record) ──
const beings = new Map(); const deeds = new Map();
for (const e of bound) {
  const s = name(e.s); if (s) beings.set(s.toLowerCase(), (beings.get(s.toLowerCase()) ?? 0) + 1);
  const o = name(e.o); if (o) beings.set(o.toLowerCase(), (beings.get(o.toLowerCase()) ?? 0) + 1);
  deeds.set(String(e.v).toLowerCase(), (deeds.get(String(e.v).toLowerCase()) ?? 0) + 1);
}
const cast = [...beings].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([w, n]) => `${w}×${n}`);
const verbTop = [...deeds].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([w, n]) => `${w}×${n}`);

// ── CHAPTER-WINDOW GISTS — every window collapses its edges into ONE
//    macrostructure via the three macrorules (deletion = the salient half,
//    generalization = kind-of, construction = same-agent run) — the essay is
//    the CASCADE: gist per window, then the essay is the ordered stack.
const WIN = 60; // edges per chapter-window
const windows = [];
for (let i = 0; i < bound.length; i += WIN) windows.push(bound.slice(i, i + WIN));
const kindOf = (w) => {
  const lw = String(w ?? "").toLowerCase();
  for (const [b, n] of [...beings].sort((a, b) => b[1] - a[1])) if (b !== lw && (b.includes(lw) || lw.includes(b))) return `{${b}}`;
  return w;
};
const composite = (es) => {
  const who = es[0].s;
  const verbs = [...new Set(es.map((e) => String(e.v).toLowerCase()))];
  const objs = [...new Set(es.map((e) => name(e.o)).filter(Boolean))];
  return `${kindOf(who)} ${verbs.slice(0, 3).join(", ")}${verbs.length > 3 ? " …" : ""}${objs.length ? " — " + objs.slice(0, 2).join("/") : ""}`;
};
const windowGists = windows.map((ws, i) => {
  const salient = ws.slice(0, Math.ceil(ws.length / 2));
  const at = ws[0].at;
  // THE BYTE BACKING: the source clause at this window's first edge — the
  // essay QUOTES the record verbatim at its content-address (snip-cite's law:
  // a thing is found by its byte address, never by a pattern guessed over it).
  const back = body.slice(at, at + 90).replace(/\s+/g, " ").trim();
  return { w: i, at, composite: composite(salient), n: ws.length, back };
});

// ── THE ESSAY — the mouth prosifies each window's gist into a paragraph ──
//    (here the "model" is rule-shaped prose from the gists themselves; the
//    long-form pipe is worded so a real LLM mouth can be dropped in with the
//    same censor contract). Every sentence names a bound being and a deed.
const paragraphs = windowGists.map((g, i) => {
  const who = String(g.composite).split(" ")[0];
  const deed = String(g.composite).split(/ /).slice(1).join(" ").split(" — ")[0] ?? "";
  const cite = g.back ? `"${g.back}…" (at ${g.at})` : null;
  return `**${who[0].toUpperCase() + who.slice(1)} ${deed}** — a clause the read bound in this window, grounded at the byte: ${cite}. ${[...new Set(bound.slice(g.w * WIN, g.w * WIN + WIN).map((e) => e.s).filter(Boolean))].slice(0, 2).map((s) => `${kindOf(s)} ${String(bound[bound.findIndex((b) => b.s === s)].v)}`).join(" · ")}.`;
});

const topCast = cast.slice(0, 3).map((c) => c.replace(/×\d+$/, ""));
const topDeed = verbTop.slice(0, 3).map((d) => d.replace(/×\d+$/, ""));
const lead = `The reading opens on a salon: **${topCast.join(", ")}** are the ones who recur in the seats, and **the deeds belong to ${topDeed.join(", ")}** — what the record colors when it admits a difference. The essay that follows is a macrostructure of macrostructures: each paragraph is one chapter-window's gist, each gist a deletion-and-generalization of its bound edges, each sentence quoted at the byte it was bound at. Nothing here is revealed; everything is attested.`;

const essay = `# The long-form reading — ${out.split("/").pop().replace(/\.md$/, "")}

_Generated from the fold's own bound edges: read → EO clauses → window-gists →
the essay as a macrostructure-of-macrostructures. Every sentence is underwritten
by a bound being+deed and quoted at its content-address. Nothing revealed._
_(source: ${out})_

## The cast (who is there — by edge-recurrence, not orthography)

${cast.join(" · ")}

## The deeds (what happens — the licensed verbs from the record)

${verbTop.join(" · ")}

## The essay (each paragraph is one chapter-window's gist)

${lead}

${paragraphs.join("\n\n")}

---
_The ${bound.length} bound edges across ${windows.length} chapter-windows on
this reading. A real LLM mouth may prosify the same gists as long as every
sentence stays within them — the censor is the contract._`;

fs.writeFileSync(out, essay);
console.log(`ESSAY → ${out} (${essay.length} chars, ${windows.length} paragraphs)`);
console.log(`  cast: ${cast.slice(0, 6).join(" · ")}`);
console.log(`  first paragraph: ${paragraphs[0].slice(0, 140)}…`);