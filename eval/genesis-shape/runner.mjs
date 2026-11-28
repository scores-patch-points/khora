import fs from "node:fs";
const K = "/home/user/khora/native/", PF = await import(K + "the-fold/pharos-reading.mjs"), { karakaRows, karakaCoverage, markerTableFor } = await import(K + "adapters/text/karaka-total.mjs"), { readPolarity, polaritySource } = await import(K + "adapters/text/negation-read.js"), { consistencyOf } = await import(K + "adapters/text/parse-consistency.mjs");
const MAP = { alb: "sqi", arm: "hye", cze: "ces", gre: "ell", rum: "ron", jap: "jpn", mao: "mri" }, name = process.argv[2], all = JSON.parse(fs.readFileSync("/tmp/claude-0/genesis-data/genesis-all.json", "utf8")), ids = Object.keys(all["English-WEB"].verses).slice(0, 200);
const L = all[name], code = MAP[L.iso] ?? L.iso, out = { name, iso: L.iso, code }, t0 = Date.now();
const g = await PF.grammarFor(code); if (g.gap) { out.gap = g.gap; fs.writeFileSync(`out/${name}.json`, JSON.stringify(out)); process.exit(0); }
out.tokenizer = g.tokenizer ? "prior" : g.adapterTokenize ? "adapter" : "absent"; out.markers = !!markerTableFor(code); const src = polaritySource(g.parser); out.polarity = { available: src.available, carriers: src.carriers };
let sentences = 0, flagged = 0, tokens = 0, errs = 0; const gaps = {}, labelled = [], neg = {};
for (const id of ids) { const text = L.verses[id]; if (!text) continue; try {
  const rows = PF.readingRows(g, text), by = new Map(); for (const r of rows) { if (!by.has(r.s)) by.set(r.s, []); by.get(r.s).push(r); } let n = false;
  for (const rs of by.values()) { sentences++; tokens += rs.length; const k = karakaRows(rs, { stem: code }); labelled.push(k); const c = consistencyOf(k, { lexicon: g.parser.lexicon }); if (!c.consistent) { flagged++; for (const x of c.gaps) gaps[x.gap] = (gaps[x.gap] ?? 0) + 1; }
    if (src.available) { const p = readPolarity(g.parser, rs); if (p.heads.size) n = true; } }
  neg[id] = src.available ? n : null; } catch (e) { errs++; out.firstError ??= String(e.message).slice(0, 120); } }
const cov = karakaCoverage(labelled); Object.assign(out, { verses: Object.keys(neg).length, sentences, tokens, errs, flagged, flagRate: sentences ? +(flagged / sentences).toFixed(3) : null, gaps, labelledRate: cov.labelledRate, specificRate: cov.specificRate, participants: cov.participants, generic: cov.generic, neg, secs: Math.round((Date.now() - t0) / 1000) });
fs.writeFileSync(`out/${name}.json`, JSON.stringify(out));
