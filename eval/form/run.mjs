// eval/form/run.mjs — the mechanical parts of eval/form/PREREG.md: the skeletons (essay, README, table), three real slot trees with facet titles
// against skeleton titles side by side, the cadence null, the mechanical checks. Writes CORPUS.md and RESULTS.md. Refuses to run if PREREG.md
// changed after it was frozen. No model, no fetch: the trees are rebuilt from the gather cache's pages (read-only) through opencode-stitch.mjs.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { skeletonFrom, outlineFrom, slotsFrom, cadenceOf, shuffledCadence, isFacetJoin, PARAMS } from "../../opencode-form.mjs";
import { defaultOutline } from "../../opencode-longform.mjs";
import { stitch } from "../../opencode-stitch.mjs";
import { essays, readmes, tables, corpusNote } from "./corpus.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const prereg = fs.readFileSync(path.join(HERE, "PREREG.md"));
const frozen = fs.readFileSync(path.join(HERE, "PREREG.sha"), "utf8").trim();
if (sha(prereg) !== frozen) throw new Error("PREREG.md changed after freezing");
const prereg2 = fs.readFileSync(path.join(HERE, "PREREG-2.md"));
const frozen2 = fs.readFileSync(path.join(HERE, "PREREG-2.sha"), "utf8").trim();
if (sha(prereg2) !== frozen2) throw new Error("PREREG-2.md changed after freezing");
// the first run's sections (skeletons, the three seen trees) are kept on the first frame's measure so their numbers stay what RESULTS.md recorded
const BODY = { ...PARAMS, cadence: "body" };

const out = [];
const say = (...xs) => { for (const line of xs.length ? xs : [""]) { console.log(line); out.push(line); } };

// ── 1. the corpora and the skeletons ───────────────────────────────────────────────────────────────────────────────────────────────────────
const E = essays(), R = readmes(), T = tables();
fs.writeFileSync(path.join(HERE, "CORPUS.md"), corpusNote({ essays: E, readmes: R, tables: T }));
say(`# FORM results (eval/form) — ${new Date().toISOString()}`, "");
say(`PREREG.md sha256: ${frozen}`, ""); say(`PREREG-2.md sha256: ${frozen2}`, "");
say(`Parameters: ${JSON.stringify(PARAMS)}`, "");
const skeletons = {};
for (const [kind, pieces] of [["essay", E], ["readme", R], ["table", T]]) {
  const sk = skeletonFrom({ pieces, kind });
  skeletons[kind] = sk;
  say(`## Skeleton: ${kind} (n=${sk.n}, shaped=${sk.shaped}, segmenter=${sk.segmenter}, segmented=${JSON.stringify(sk.segmented)}, furniture terms=${sk.furniture}, parts per piece median ${sk.partsPerPiece.median} IQR [${sk.partsPerPiece.iqr}])`, "");
  say("| role | recurrence (pieces / shaped) | share | words median | words IQR | rule |"); say("|---|---|---|---|---|---|");
  for (const p of sk.parts) say(`| ${p.role} | ${p.recurrence.pieces} / ${p.recurrence.of} | ${p.recurrence.share} | ${p.words.median} | [${p.words.iqr}] | ${p.recurrence.rule}${p.role === "develops" ? ` (middle parts with a new returning term: ${p.recurrence.middlePartsWithNew} / ${p.recurrence.middleParts})` : p.role === "closes" ? ` (strict: ${p.recurrence.strict})` : ""} |`);
  say("");
  say("Per piece (by, parts, opens / develops-new-per-part / closes-shared, words per part):", "");
  for (const r of sk.pieces) say(`- ${r.name}: ${r.by}, ${r.parts} parts${r.shape ? `, opens ${r.shape.opens.holds} (${r.shape.opens.terms} terms), develops [${r.shape.develops.newPerPart}], closes ${r.shape.closes.holds} (${r.shape.closes.shared} shared, strict ${r.shape.closes.strict})` : `, ${r.note}`}; words [${r.words}]`);
  say("");
}
const essaySk = skeletons.essay;

// ── 2. three real slot trees from the gather cache's pages ──────────────────────────────────────────────────────────────────────────────────
const CACHE = process.env.FOLD_GATHER_CACHE ?? path.join(os.homedir(), ".local/share/foldcode/gather-cache");
const JOBS = { elephants: "longform-elephants-6345f6e9", lighthouses: "longform-lighthouses-ae26d638", honeybees: "longform-honeybees-c4677148" };
const MATCH = { elephants: /elephants?/gi, lighthouses: /lighthouses?/gi, honeybees: /honey ?bees?/gi };
const MIN_MENTIONS = 20, PAGES = 8; // a cached page is the topic's when its title names the topic and its text names it at least MIN_MENTIONS times; the PAGES most-mentioning are read
const cachedPages = (topic) => {
  const rows = [];
  for (const f of fs.readdirSync(CACHE)) {
    if (!f.startsWith("p-")) continue;
    let v; try { v = JSON.parse(fs.readFileSync(path.join(CACHE, f), "utf8")).v; } catch { continue; }
    if (!v?.ok || !v.text || !v.url) continue;
    if (!MATCH[topic].test(String(v.title ?? ""))) { MATCH[topic].lastIndex = 0; continue; }
    MATCH[topic].lastIndex = 0;
    const n = (v.text.match(MATCH[topic]) ?? []).length;
    if (n >= MIN_MENTIONS) rows.push({ name: v.url, url: v.url, text: v.text, n });
  }
  return rows.sort((a, b) => b.n - a.n).slice(0, PAGES);
};
const jobHeadings = (job) => { try { return (fs.readFileSync(path.join(os.homedir(), ".fold/worknotes", job, "longform.md"), "utf8").match(/^## .+$/gm) ?? []).map((h) => h.slice(3)); } catch { return []; } };

say("## Three real trees: facet titles against skeleton titles (first frame; cadence on the body, as first recorded)", "");
say(`Pages: from the gather cache at ${CACHE} (read-only), the ${PAGES} pages whose title names the topic and whose text names it >= ${MIN_MENTIONS} times. Tree: opencode-stitch.mjs stitch() (voidHunt + fillSlots, zero model calls). F = defaultOutline(topic, slot labels) from opencode-longform.mjs; S = outlineFrom on the same tree with the essay skeleton; reader words = the ask's.`, "");
const checks = { facetJoin: 0, titles: 0, dropped: 0, outsideIqr: 0, cadence: [] };
for (const [topic, job] of Object.entries(JOBS)) {
  const pages = cachedPages(topic);
  say(`### ${topic} (job ${job}; ${pages.length} cached pages)`, "");
  for (const p of pages) say(`- ${p.url} (${p.n} mentions, ${p.text.length} chars)`);
  say("");
  const recorded = jobHeadings(job);
  say(`Recorded headings of the job's longform.md (the facet titles the piece actually got): ${recorded.map((h) => `"${h}"`).join(", ")}`, "");
  if (!pages.length) { say("No cached pages: tree not built.", ""); continue; }
  const r = stitch({ passages: pages, topic });
  const slots = slotsFrom(r.tree);
  say(`Tree: ${r.index.sentences.length} sentences from ${r.index.sources.length} pages; ${r.tree.root.children.length} level-1 slots, ${r.tree.root.gaps.length} level-1 gaps; ${r.gaps.length} typed gaps in all.`, "");
  const F = defaultOutline(topic, slots.map((s) => s.label));
  // run 1 = the pre-registered frame (greedy middle order; B2 is judged on it); run 2 = the REC frame (exhaustive middle order), post hoc, reported as dev
  const S = outlineFrom({ tree: r.tree, skeleton: essaySk, kind: "essay", topic, reader: { words: `write an essay about ${topic}`.split(" ") }, params: { ...BODY, order: "greedy" } });
  const S2 = outlineFrom({ tree: r.tree, skeleton: essaySk, kind: "essay", topic, reader: { words: `write an essay about ${topic}`.split(" ") }, params: { ...BODY, order: "exhaustive" } });
  say("| # | F (facet, defaultOutline) | S (skeleton, outlineFrom; run 1 order) | role | words | slot | facts | title by |"); say("|---|---|---|---|---|---|---|---|");
  const n = Math.max(F.length, S.outline.length);
  for (let i = 0; i < n; i++) { const f = F[i], s = S.outline[i]; say(`| ${i + 1} | ${f ? f.title : ""} | ${s ? s.title : ""} | ${s?.role ?? ""} | ${s?.words ?? ""} | ${s ? `${s.slot} (${s.label})` : ""} | ${s?.facts ?? ""} | ${s?.by ?? ""} |`); }
  say("");
  if (S.appendix.length) say(`Appendix (kept, fits no part): ${S.appendix.map((a) => `${a.slot} "${a.title}" — ${a.why}`).join("; ")}`, "");
  say(`Order: ${S.order.join(" → ")}; opener recurs in ${S.measures.opener.recursIn} / ${S.measures.opener.of} other slots; closer shares ${S.measures.closer?.sharedWithOpener ?? "-"} terms with the opener; median facts ${S.measures.medianFacts}.`, "");
  // the cadence null
  const live = slots.filter((s) => !S.appendix.some((a) => a.slot === s.id));
  const order = S.order.map((id) => live.findIndex((s) => s.id === id));
  const chosen = cadenceOf(live, order, { measure: "body" });
  const nul = shuffledCadence(live, order, { trials: PARAMS.shuffles, seed: 1, measure: "body" });
  checks.cadence.push({ topic, chosen: chosen.mean, shuffled: nul.mean, max: nul.max, holds: chosen.mean > nul.mean });
  say(`Cadence: chosen order mean step ${chosen.mean} (steps ${chosen.steps.map((s) => `${s.slot}:${s.step}`).join(", ")}); shuffled mean ${nul.mean} over ${nul.trials} orders (max ${nul.max}); B2 ${chosen.mean > nul.mean ? "HOLDS" : "FAILS"} on this tree.`, "");
  // POST-HOC DIAGNOSTIC, written after B2 was seen to fail on two trees (not a bar; the bar above stands as failed): the same null with the opener
  // and the closer held in place, so only the middle order is shuffled. It separates the cadence claim (greedy middle order) from the ends rule
  // (opener by recurrence, closer by return), which fixes the broadest slot first and so lowers every later step.
  const fixedEnds = (() => { const mid = order.slice(1, order.length - 1); const rnd = (() => { let x = 11; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; })(); const means = []; for (let t = 0; t < PARAMS.shuffles; t++) { const m = mid.slice(); for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; } means.push(cadenceOf(live, [order[0], ...m, order[order.length - 1]], { measure: "body" }).mean); } return means.length ? Number((means.reduce((a, b) => a + b, 0) / means.length).toFixed(4)) : null; })();
  checks.fixedEnds = [...(checks.fixedEnds ?? []), { topic, chosen: chosen.mean, shuffled: fixedEnds, holds: chosen.mean > fixedEnds }];
  const order2 = S2.order.map((id) => live.findIndex((s) => s.id === id));
  const chosen2 = cadenceOf(live, order2, { measure: "body" });
  checks.rec = [...(checks.rec ?? []), { topic, chosen: chosen2.mean, shuffled: nul.mean, fixedEnds, holds: chosen2.mean > nul.mean, orderBy: S2.measures.orderBy }];
  say(`REC run 2 (post hoc, dev): ${S2.measures.orderBy} middle order ${S2.order.join(" → ")}, mean step ${chosen2.mean} against the full shuffle null ${nul.mean} (${chosen2.mean > nul.mean ? "above" : "not above"}) and the ends-held null ${fixedEnds} (${chosen2.mean > fixedEnds ? "above" : "not above"}).`, "");
  say(`Post-hoc diagnostic (not a bar): with the opener and closer held, shuffling only the middle gives mean step ${fixedEnds}; the chosen middle order is ${chosen.mean > fixedEnds ? "above" : "not above"} it.`, "");
  // the mechanical checks
  for (const s of [...S.outline, ...S.appendix]) { checks.titles++; if (isFacetJoin(s.title)) checks.facetJoin++; }
  if (S.outline.length + S.appendix.length !== slots.length) checks.dropped += slots.length - S.outline.length - S.appendix.length;
  for (const s of S.outline) { const part = essaySk.parts.find((p) => p.role === s.role); if (s.words < part.words.iqr[0] || s.words > part.words.iqr[1]) checks.outsideIqr++; }
}

say("## Mechanical checks", "");
say(`- Facet-join titles among skeleton titles: ${checks.facetJoin} / ${checks.titles}.`);
say(`- Slots dropped (outline + appendix vs tree): ${checks.dropped}.`);
say(`- Sections with words outside the essay skeleton's IQR for their role: ${checks.outsideIqr}.`);
say(`- Cadence null B2: ${checks.cadence.every((c) => c.holds) && checks.cadence.length ? "HOLDS on every tree" : "FAILS"} — ${checks.cadence.map((c) => `${c.topic} ${c.chosen} vs ${c.shuffled}`).join("; ")}.`);
say(`- Post-hoc diagnostic (ends held, middle shuffled; written after B2 was seen): ${(checks.fixedEnds ?? []).map((c) => `${c.topic} ${c.chosen} vs ${c.shuffled} (${c.holds ? "above" : "not above"})`).join("; ")}.`);
say(`- REC run 2 (exhaustive middle order; the frame after B2 failed; dev, not pre-registered): ${(checks.rec ?? []).map((c) => `${c.topic} ${c.chosen} vs full shuffle ${c.shuffled} (${c.holds ? "above" : "not above"})`).join("; ")}. The REC's own bar is to be pre-registered and read on asks not seen here.`);

// ── 3. PREREG-2 (REC frame): three UNSEEN trees, the step measured on what a section will say ───────────────────────────────────────────────
say("## PREREG-2: three unseen trees, the step measured on what a section will say (fills + question terms)", "");
say(`Frame: eval/form/PREREG-2.md (sha256 ${frozen2}). Step on \`say\` = question terms + the stitched fills' stems; opener, closer, isolation unchanged (body); middle order ${PARAMS.order} on the say measure. Null: ${PARAMS.shuffles} full shuffles (seed 1). BAR B3: chosen > shuffled on every tree. Beside it (not a bar): the same tree on the old body measure, the order the old frame would choose, against ${PARAMS.shuffles} full shuffles on body; and the ends-held null on say. Page rule as above (title names the topic, text names it >= ${MIN_MENTIONS} times, top ${PAGES} by mentions); homonym pages are not removed by hand.`, "");
const UNSEEN = { dolphins: { job: "longform-dolphins-*", re: /dolphins?/gi, ask: "write an essay about dolphins" }, beans: { job: "longform-beans-*", re: /\bbeans?\b/gi, ask: "write an essay about beans" }, jaguar: { job: "essay-jaguar-bda71b3a", re: /jaguars?/gi, ask: "write an essay about jaguar" } };
const unseenChecks = { b3: [], old: [], endsHeld: [], facetJoin: 0, titles: 0, dropped: 0 };
const endsHeldNull = (live, order, measure) => { const mid = order.slice(1, order.length - 1); const rnd = (() => { let x = 11; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; })(); const means = []; for (let t = 0; t < PARAMS.shuffles; t++) { const m = mid.slice(); for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; } means.push(cadenceOf(live, [order[0], ...m, order[order.length - 1]], { measure }).mean); } return means.length ? Number((means.reduce((a, b) => a + b, 0) / means.length).toFixed(4)) : null; };
for (const [topic, u] of Object.entries(UNSEEN)) {
  MATCH[topic] = u.re;
  const pages = cachedPages(topic);
  say(`### ${topic} (ask "${u.ask}"; job ${u.job}; ${pages.length} cached pages)`, "");
  for (const p of pages) say(`- ${p.url} (${p.n} mentions, ${p.text.length} chars)`);
  say("");
  if (!pages.length) { say("No cached pages: tree not built.", ""); unseenChecks.b3.push({ topic, holds: false, chosen: null, shuffled: null }); continue; }
  const r = stitch({ passages: pages, topic });
  const slots = slotsFrom(r.tree);
  say(`Tree: ${r.index.sentences.length} sentences from ${r.index.sources.length} pages; ${r.tree.root.children.length} level-1 slots, ${r.tree.root.gaps.length} level-1 gaps; ${r.gaps.length} typed gaps in all. Per slot (body stems / say stems / fills): ${slots.map((s) => `${s.id} ${s.body.size}/${s.say.size}/${s.facts}`).join(", ")}.`, "");
  const reader = { words: u.ask.split(" ") };
  const S = outlineFrom({ tree: r.tree, skeleton: essaySk, kind: "essay", topic, reader, params: PARAMS });
  const F = defaultOutline(topic, slots.map((s) => s.label));
  say("| # | F (facet, defaultOutline) | S (skeleton, outlineFrom; say order) | role | words | slot | facts | title by |"); say("|---|---|---|---|---|---|---|---|");
  const n = Math.max(F.length, S.outline.length);
  for (let i = 0; i < n; i++) { const f = F[i], s = S.outline[i]; say(`| ${i + 1} | ${f ? f.title : ""} | ${s ? s.title : ""} | ${s?.role ?? ""} | ${s?.words ?? ""} | ${s ? `${s.slot} (${s.label})` : ""} | ${s?.facts ?? ""} | ${s?.by ?? ""} |`); }
  say("");
  if (S.appendix.length) say(`Appendix (kept, fits no part): ${S.appendix.map((a) => `${a.slot} "${a.title}" — ${a.why}`).join("; ")}`, "");
  say(`Order (${S.measures.orderBy}, on ${S.measures.cadenceOn}): ${S.order.join(" → ")}; opener recurs in ${S.measures.opener.recursIn} / ${S.measures.opener.of} other slots; closer shares ${S.measures.closer?.sharedWithOpener ?? "-"} terms with the opener; median facts ${S.measures.medianFacts}.`, "");
  const live = slots.filter((s) => !S.appendix.some((a) => a.slot === s.id));
  const order = S.order.map((id) => live.findIndex((s) => s.id === id));
  const chosen = cadenceOf(live, order, { measure: "say" });
  const nul = shuffledCadence(live, order, { trials: PARAMS.shuffles, seed: 1, measure: "say" });
  const held = endsHeldNull(live, order, "say");
  unseenChecks.b3.push({ topic, chosen: chosen.mean, shuffled: nul.mean, max: nul.max, holds: chosen.mean > nul.mean });
  unseenChecks.endsHeld.push({ topic, chosen: chosen.mean, shuffled: held, holds: chosen.mean > held });
  say(`Cadence on SAY (the bar): chosen order mean step ${chosen.mean} (steps ${chosen.steps.map((s) => `${s.slot}:${s.step} (${s.new}/${s.size})`).join(", ")}); ${nul.trials} full shuffles mean ${nul.mean} (max ${nul.max}); B3 ${chosen.mean > nul.mean ? "HOLDS" : "FAILS"} on this tree. Ends-held null (diagnostic) ${held}: chosen ${chosen.mean > held ? "above" : "not above"}.`, "");
  // the old measure on the same tree: the order the old frame would choose, against its own null
  const So = outlineFrom({ tree: r.tree, skeleton: essaySk, kind: "essay", topic, reader, params: BODY });
  const liveO = slots.filter((s) => !So.appendix.some((a) => a.slot === s.id));
  const orderO = So.order.map((id) => liveO.findIndex((s) => s.id === id));
  const chosenO = cadenceOf(liveO, orderO, { measure: "body" });
  const nulO = shuffledCadence(liveO, orderO, { trials: PARAMS.shuffles, seed: 1, measure: "body" });
  const sayOrderOnBody = cadenceOf(live, order, { measure: "body" });
  unseenChecks.old.push({ topic, chosen: chosenO.mean, shuffled: nulO.mean, holds: chosenO.mean > nulO.mean });
  say(`Cadence on BODY (diagnostic, the first frame): the body-chosen order ${So.order.join(" → ")} mean step ${chosenO.mean} (steps ${chosenO.steps.map((s) => `${s.slot}:${s.step}`).join(", ")}); ${nulO.trials} full shuffles on body mean ${nulO.mean} (max ${nulO.max}); ${chosenO.mean > nulO.mean ? "above" : "not above"}. The say-chosen order read on body: ${sayOrderOnBody.mean}.`, "");
  for (const s of [...S.outline, ...S.appendix]) { unseenChecks.titles++; if (isFacetJoin(s.title)) unseenChecks.facetJoin++; }
  if (S.outline.length + S.appendix.length !== slots.length) unseenChecks.dropped += slots.length - S.outline.length - S.appendix.length;
}
say("### PREREG-2 checks", "");
say(`- BAR B3 (say measure, chosen > ${PARAMS.shuffles} full shuffles, every unseen tree): ${unseenChecks.b3.length === 3 && unseenChecks.b3.every((c) => c.holds) ? "HOLDS on every tree" : "FAILS"} — ${unseenChecks.b3.map((c) => `${c.topic} ${c.chosen} vs ${c.shuffled} (${c.holds ? "above" : "not above"})`).join("; ")}.`);
say(`- Old body measure on the same trees (diagnostic, not a bar): ${unseenChecks.old.map((c) => `${c.topic} ${c.chosen} vs ${c.shuffled} (${c.holds ? "above" : "not above"})`).join("; ")}.`);
say(`- Ends-held null on say (diagnostic): ${unseenChecks.endsHeld.map((c) => `${c.topic} ${c.chosen} vs ${c.shuffled} (${c.holds ? "above" : "not above"})`).join("; ")}.`);
say(`- Facet-join titles among skeleton titles on the unseen trees: ${unseenChecks.facetJoin} / ${unseenChecks.titles}; slots dropped: ${unseenChecks.dropped}.`);
say("");
say("", "## Pending", "", "- B1, the blind pair test (human judgement on the ten pre-registered asks): NOT run here. The F/S title sets above are the material for five of the ten asks (elephants, lighthouses, honeybees; dolphins, beans) plus jaguar, which is not among the ten; sea turtles, coral reefs, the printing press, volcanoes and the Nile have no gather yet.", "");
fs.writeFileSync(path.join(HERE, "RESULTS.md"), out.join("\n") + "\n");
console.log(`\nwrote ${path.join(HERE, "RESULTS.md")} and CORPUS.md`);
