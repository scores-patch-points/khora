// loaders/_fm_ref_src.mjs — parsers for 05-academic-papers, 02-encyclopedic (natural documents = string[][]).
import { ETHOS, read, lsSync, stripFrontmatter, cleanMarkdown, sentencesOf, sentencesWrapped, dropConfettiLines, decodeEntities } from "./_fm_common.mjs";
const A = `${ETHOS}/05-academic-papers`, E = `${ETHOS}/02-encyclopedic`;

// ---- NASA NTRS technical reports: pdf/OCR text, hard-wrapped; era from the accession-number year prefix; cv.md and structure.json siblings are ignored ----
export const ntrsFiles = (lo, hi) => lsSync(`${A}/ntrs-white-papers`).filter((f) => /^\d{11}_.*\.txt$/.test(f) && +f.slice(0, 4) >= lo && +f.slice(0, 4) <= hi);
export function ntrsDocs(lo, hi) {
  const docs = [];
  for (const f of ntrsFiles(lo, hi)) {
    const t = dropConfettiLines(stripFrontmatter(read(`${A}/ntrs-white-papers/${f}`)));
    const u = sentencesWrapped(t); if (u.length) docs.push(u);
  }
  return docs;
}
// ---- Ashby, An Introduction to Cybernetics (pdftotext of the 1999 electronic edition): one long text, blocks cut by finalize ----
export function ashbyDocs() {
  const t = dropConfettiLines(stripFrontmatter(read(`${A}/open-access-books/ashby/ashby-1956-an-introduction-to-cybernetics.txt`)));
  return [sentencesWrapped(t)];
}
// ---- Markdown books: code fences, inline code, TeX math, d2lbook roles and image links removed ----
const bookText = (f) => cleanMarkdown(read(f).replace(/```[\s\S]*?```/g, "\n").replace(/:[a-z_]+:(?:`[^`]*`)?/g, " ").replace(/`[^`\n]*`/g, " "), { dropCode: false, dropMath: true });
export function d2lDocs() {
  const docs = [];
  for (const f of lsSync(`${A}/open-access-books/d2l`).filter((x) => x.endsWith(".txt"))) {
    const t = bookText(`${A}/open-access-books/d2l/${f}`).replace(/^Dive into Deep Learning[^\n]*\nSource:[^\n]*\nRights:[^\n]*\n/, "");
    const u = sentencesWrapped(t); if (u.length) docs.push(u);
  }
  return docs;
}
export function paipDocs() {
  const docs = [];
  for (const f of lsSync(`${A}/open-access-books/paip`).filter((x) => /^chapter-\d+\.txt$/.test(x))) {
    const t = bookText(`${A}/open-access-books/paip/${f}`).replace(/^Paradigms of Artificial[^\n]*\n[^\n]*\nSource:[^\n]*\nRights:[^\n]*\n/, "");
    const u = sentencesWrapped(t); if (u.length) docs.push(u);
  }
  return docs;
}
// ---- Wikipedia articles (wikitext residue): external-link brackets reduced to their label, leftover [[ ]] {{ }} removed; closing sections that are bibliographies/link lists cut off ----
const TAIL = new Set(["references", "external links", "further reading", "see also", "notes", "bibliography", "sources", "citations", "footnotes", "works cited"]);
export function wikiDocs() {
  const docs = [];
  for (const f of lsSync(`${E}/wikipedia`).filter((x) => x.endsWith(".txt"))) {
    const lines = read(`${E}/wikipedia/${f}`).split("\n"); let cut = lines.length;
    for (let i = Math.floor(lines.length * 0.4); i < lines.length; i++) if (TAIL.has(lines[i].trim().toLowerCase())) { cut = i; break; }
    let t = lines.slice(0, cut).join("\n");
    t = t.replace(/\[(?:https?:)?\/\/\S+\s+([^\]]*)\]/g, "$1").replace(/https?:\/\/\S+/g, " ").replace(/\[\[|\]\]|\{\{|\}\}/g, " ");
    t = decodeEntities(t).replace(/<[^>\n]{1,200}>/g, " ");
    const u = sentencesOf(t); if (u.length) docs.push(u);
  }
  return docs;
}
// ---- Encyclopaedia Britannica 1911 (Wikisource export, one line per article): navigation header up to the first &#8203; removed, entities decoded ----
export function ebDocs() {
  const docs = [];
  for (const f of lsSync(`${E}/1911-britannica`).filter((x) => x.endsWith(".txt"))) {
    let t = read(`${E}/1911-britannica/${f}`); const k = t.indexOf("&#8203;"); if (k >= 0) t = t.slice(k + 7);
    const u = sentencesWrapped(decodeEntities(t)); if (u.length) docs.push(u);
  }
  return docs;
}
