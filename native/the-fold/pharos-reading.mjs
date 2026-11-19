// the-fold/pharos-reading.mjs: THE READING, WRITTEN INTO THE PHAROS (khora's half of the same-versus-other pipeline). Khora already records every read as an ACT (pharos-gate.mjs recordRead: sha, capacities,
// counts). This writes what the reading SAID about the text, as the entries the other repos read by kind, so no repo has to import khora to use a reading:
//   text          INS·Ground   addr text:<sha16(text)>     body { text, language }
//   text-reading  INS·Figure   addr reading:<sha16(text)>  body { rows }   of [the text entry]    rows = the reader's dependency rows { s, id, form, lemma, upos, feats, head, deprel }, s = the sentence
//   text-referents INS·Figure addr referents:<sha16(text)> body { referents: [{ ref, face, spans: [[at, end], ...] }] }  (only with { referents: true }: the canonical door's own cast, pronouns bound by presence)
// The rows come from the UD parser prior the reader's own clause layer is built on (adapters/text/ud-parser.js, the prior read through the prior door), with the reader's one sentence cut and tokenizer.
// It is a DERIVED write of the reading, not a second reading of meaning: no claims, no referents are decided here (khora reads; janus links; penelope judges). It is called with a text the canonical
// door (readToWeft) has read; a language with no parser prior is a typed gap, never another language's parse. Idempotent: an entry already at the address with the same body is not written again.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { loadModel, analyse, readJsonMaybeGz } from "../adapters/text/ud-parser.js";
import { sentences, tokenize } from "../adapters/text/ud-tokenizer.js";
import { priorsHome } from "./prior-source.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const sha16 = (s) => crypto.createHash("sha256").update(String(s), "utf8").digest("hex").slice(0, 16);
const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}` : JSON.stringify(v));   // pharos stores bodies with sorted keys
export const TEXT_KIND = "text", READING_KIND = "text-reading", REFERENTS_KIND = "text-referents";
const MODELS = new Map();
/** the parser (and tokenizer) prior for a language, from the prior door's home; a typed gap when absent */
export async function grammarFor(code = "eng") {
  if (MODELS.has(code)) return MODELS.get(code);
  const dir = priorsHome().dir, files = dir && fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const pf = files.find((f) => f.startsWith(`ud-parser-${code}-`) && f.endsWith(".json.gz")), tf = files.find((f) => f === `ud-tokenizer-${code}.json.gz`);
  const g = !pf ? { code, gap: "no_parser_prior", why: `no ud-parser-${code}-*.json.gz in ${dir ?? "the prior home"}` } : { code, parser: loadModel(await readJsonMaybeGz(path.join(dir, pf))), tokenizer: tf ? await readJsonMaybeGz(path.join(dir, tf)) : null, prior: pf };
  MODELS.set(code, g); return g;
}
/** readingRows(g, text) -> rows with the sentence index: { s, id, form, lemma, upos, feats, head, deprel } (head 0 is the root) */
export function readingRows(g, text) {
  const rows = []; let s = 0, cur = 0;
  for (const sent of sentences(text, "und", g.tokenizer)) {
    const forms = tokenize(sent, g.tokenizer); if (!forms.length) continue;
    const base = text.indexOf(sent, cur), b0 = base < 0 ? null : base; if (b0 != null) cur = b0 + sent.length;
    let c = 0;                                                         // each token's UTF-16 offsets in the text (null if the tokenizer changed the form and it cannot be found)
    const at = forms.map((f) => { const i = b0 == null ? -1 : sent.indexOf(f, c); if (i < 0) return null; c = i + f.length; return [b0 + i, b0 + c]; });
    for (const r of analyse(g.parser, forms)) rows.push({ s, id: r.id, form: r.form, lemma: r.lemma, upos: r.upos, feats: r.feats ?? "", head: r.head < 0 ? 0 : r.head, deprel: r.deprel, ...(at[r.id - 1] ? { at: at[r.id - 1][0], end: at[r.id - 1][1] } : {}) });
    s++;
  }
  return rows;
}
// where pharos is: PHAROS_HOME, else a checkout beside this repo, else <repo>/pharos, else ~/Documents/pharos (the same places the gate looks)
const pharosLib = () => [process.env.PHAROS_HOME, path.join(ROOT, "..", "pharos"), path.join(ROOT, "pharos"), path.join(os.homedir(), "Documents", "pharos")].filter(Boolean).map((p) => path.join(path.resolve(p), "lib", "pharos.mjs")).find((f) => fs.existsSync(f));
/**
 * writeReading(text, { language, log, dir, writer }) -> { text: id, reading: id, written: [kinds], skipped: [kinds] } or { gap, why }
 * log / dir name the pharos log (PHAROS_LOG, PHAROS as the other doors); the writer is "khora".
 */
export async function writeReading(text, { language = "eng", log = process.env.PHAROS_LOG ?? "fold", dir = process.env.PHAROS ?? null, writer = "khora", referents = false, readWeft = null } = {}) {
  const lib = pharosLib(); if (!lib) return { gap: "no_pharos", why: "pharos was not found (set PHAROS_HOME); khora writes readings only into the pharos" };
  const g = await grammarFor(language); if (g.gap) return g;
  const P = await import(pathToFileURL(lib).href), h = P.open(log, { writer, ...(dir ? { dir } : {}) });
  const declare = (kind, cell, why) => { if (!(P.fold(h, { kind: "kind" }).entries ?? []).some((e) => e.body?.name === kind)) P.weave(h, { cell: "DEF·Figure", kind: "kind", addr: `kind:${kind}`, body: { name: kind, cell, why } }); };
  declare(TEXT_KIND, "INS·Ground", "a text, whole, as read"); declare(READING_KIND, "INS·Figure", "the reader's dependency rows for a text: sentence, token, lemma, part of speech, features, head, relation");
  const addrT = `text:${sha16(text)}`, addrR = `reading:${sha16(text)}`, rows = readingRows(g, text), out = { written: [], skipped: [], rows: rows.length };
  const put = (kind, cell, addr, body, of = []) => { const have = (P.fold(h, { kind, addr }).entries ?? []).find((e) => canon(e.body) === canon(body)); if (have) { out.skipped.push(kind); return have; } const e = P.weave(h, { cell, kind, addr, body, of }); out.written.push(kind); return e; };
  const t = put(TEXT_KIND, "INS·Ground", addrT, { text, language }), r = put(READING_KIND, "INS·Figure", addrR, { rows }, [t.id]);
  const res = { ...out, text: t.id, reading: r.id, addr: { text: addrT, reading: addrR }, parser: g.prior };
  if (referents) {                                                    // the canonical door's own cast: who each mention is, pronouns bound by presence. `readWeft` is the door (readToWeft), injected; it is asked for the held spectrum (readerOptions.pronounCandidates).
    if (typeof readWeft !== "function") return { ...res, gap: "no_door", why: "referents need the canonical door: pass readWeft (the-fold/read-process.mjs readToWeft)" };
    const w = readWeft(text, { language, readerOptions: { pronounCandidates: true } }), pron = new Map();      // the weft's own cast (ref, surface, mentionSpans) and its pronoun bindings by presence (pronoun, at, ref)
    for (const x of w.pronounsPresence ?? []) if (x.ref && Array.isArray(x.at)) { if (!pron.has(x.ref)) pron.set(x.ref, []); pron.get(x.ref).push([x.at[0], x.at[1]]); }
    const list = (w.cast ?? []).map((c) => ({ ref: c.ref, face: c.surface, spans: (c.mentionSpans ?? []).map(([a, b]) => [a, b]), pronouns: pron.get(c.ref) ?? [] })).filter((c) => c.spans.length || c.pronouns.length);
    declare(REFERENTS_KIND, "INS·Figure", "the reader's referents for a text: each with its face and the spans of every mention, pronouns bound by presence");
    // THE HELD SPECTRUM: each pronoun the rung considered, with EVERY candidate it scored (the rung's own activations, before any choice) and what it chose (or null). Written as evidence, never collapsed here: committing is not khora's act.
    const faceOf = new Map((w.cast ?? []).map((c) => [c.ref, c.surface])), held = (w.pronounsCandidates ?? []).map((c) => ({ pronoun: c.pronoun, at: [c.at[0], c.at[1]], cands: c.cands.map((x) => [x.ref, x.activation]), bound: c.bound ?? null }));
    const f = put(REFERENTS_KIND, "INS·Figure", `referents:${sha16(text)}`, { referents: list, held, faces: Object.fromEntries(faceOf) }, [t.id]); res.referents = f.id; res.addr.referents = `referents:${sha16(text)}`;
  }
  return res;
}
