// loaders/_sibling-asym-chat.mjs — SIBLING pockets (English IRC chat) for the replication of comp.asym (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// MATERIAL: documents of the ethos #ubuntu IRC logs that NO atlas pocket contains. The atlas pockets oc-irc-ubuntu-0607 and oc-irc-ubuntu-0809 are over the 300k-token cap before capping (343,760 and 343,977 tokens;
//   327 and 313 documents); the cap keeps whole documents in sha256(id:docIndex) order and DROPS the rest (284 and 272 kept). The dropped documents (43 and 41 blocks of ~100 consecutive messages) are in no atlas pocket.
//   They are rebuilt here with the atlas code itself (organic.mjs: tokWords, readSrc, listTxt, blocks, capDocs; ircDayDocs is not exported and is copied line for line) and the complement of the atlas's kept set is taken.
// HONEST LIMIT: these are new DOCUMENTS of the same channel and the same sampled days as their atlas kin (blocks of a channel-day are split between kept and dropped), not a new channel or a new community. They
//   test document-level replication in the chat register, not independence of community. The other channels (kubuntu, xubuntu, ubuntu-server, de/es/it) are fully inside atlas pockets (no cap, no dropped documents).
import { newStats, readSrc, listTxt, tokWords, blocks, capDocs } from "./organic.mjs";
import { validate } from "../lib/pocket.mjs";

function ircDayDocs(ch, file, S) {   // line for line as organic.mjs ircDayDocs (not exported there)
  const { body } = readSrc(`ubuntu-irc/${ch}/${file}`), msgs = [];
  for (const line of body.split("\n")) {
    const m = /^<([^>]*)> ?(.*)$/.exec(line); if (!m) continue;
    S.linesSeen++; if (/^[^\s:]+: /.test(m[2])) S.addresseeColon++;
    const t = tokWords(m[2], S); if (t.length) msgs.push(t); else S.emptyUnits++;
  }
  return blocks(msgs, 100).map((units, j) => ({ units, tag: `${file.slice(0, 10)}#${j}` }));
}
export const SPECS = [
  { id: "asym-oc-irc-ho-0607", atlasId: "oc-irc-ubuntu-0607", ch: "ubuntu", from: "2006-07-15", to: "2007-07-15" },
  { id: "asym-oc-irc-ho-0809", atlasId: "oc-irc-ubuntu-0809", ch: "ubuntu", from: "2008-03-15", to: "2009-03-15" },
];
function build(s) {
  const S = newStats(s.id), days = listTxt(`ubuntu-irc/${s.ch}`).filter((f) => f.slice(0, 10) >= s.from && f.slice(0, 10) <= s.to), docs = [];
  for (const f of days) docs.push(...ircDayDocs(s.ch, f, S));
  const kept = new Set(capDocs(s.atlasId, docs).tags), drop = docs.filter((d) => !kept.has(d.tag)), units = [], docOf = [];
  drop.forEach((d, i) => { for (const u of d.units) { units.push(u); docOf.push(i); } });
  const p = { id: s.id, group: "sib", register: "chat", language: "en", script: "latn", units, docOf, meta: {
    tokenisation: "word: lowercase NFC maximal runs of letters/marks/digits with inner apostrophes; every token holds a letter (pure numbers dropped); URLs dropped as chunks; no punctuation tokens (the atlas organic.mjs tokWords)",
    docDef: "~100 consecutive messages inside ONE channel-day (organic.mjs blocks); documents = the blocks the atlas cap dropped", source: `ubuntu-irc/${s.ch}/ ${s.from}..${s.to}`, sibling: true, atlasKin: s.atlasId,
    notes: `held-out documents: ${drop.length} of ${docs.length} blocks of ${s.atlasId}'s era that the atlas 300k whole-document cap dropped (kept ${kept.size}); same channel-days as the atlas kin, different blocks`, counters: S, droppedDocTags: drop.map((d) => d.tag) } };
  validate(p); return p;
}
export const IDS = SPECS.map((s) => s.id);
export async function load(onlyIds = null) { return SPECS.filter((s) => !onlyIds || onlyIds.includes(s.id)).map(build); }
