// html-snip.mjs — Organ 6: the HTML structural snip.
//
// The HTML analogue of GL-EN-09's brace walk (keep the WHOLE unit to its
// matching close, string/comment-aware) applied to markup: a fragment is found
// at its byte address and kept balanced — open tag through its matching close,
// void and self-closing elements open no depth, raw-text elements (script,
// style) are never parsed for tags. Reuse the bytes that already exist; never
// regenerate what the markup already says (mouth-last at the markup layer:
// the field holds the page, the box cuts it — no draw).
//
// Pure. No model. No DOM. Dependency-free.
export const HTML_SNIP_SCHEMA = "HtmlSnip@1";

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW_TEXT = new Set(["script", "style", "textarea", "title", "pre", "code"]);

// Tokenize tags, comments, doctype and text with byte offsets. A `RAW_TEXT`
// element's content is scanned only for its own closing tag (script bodies
// carry `<`, strings and `</` that are not markup).
export function tokens(html) {
  const out = [];
  const src = String(html ?? "");
  let i = 0;
  const n = src.length;
  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt < 0) { if (i < n) out.push({ type: "text", raw: src.slice(i), start: i, end: n }); break; }
    if (lt > i) out.push({ type: "text", raw: src.slice(i, lt), start: i, end: lt });
    // comment
    if (src.startsWith("<!--", lt)) {
      const close = src.indexOf("-->", lt + 4);
      const end = close < 0 ? n : close + 3;
      out.push({ type: "comment", raw: src.slice(lt, end), start: lt, end });
      i = end; continue;
    }
    // doctype / declaration
    if (src.startsWith("<!", lt)) {
      const gt = src.indexOf(">", lt);
      const end = gt < 0 ? n : gt + 1;
      out.push({ type: "decl", raw: src.slice(lt, end), start: lt, end });
      i = end; continue;
    }
    // CDATA
    if (src.startsWith("<![CDATA[", lt)) {
      const close = src.indexOf("]]>", lt + 9);
      const end = close < 0 ? n : close + 3;
      out.push({ type: "cdata", raw: src.slice(lt, end), start: lt, end });
      i = end; continue;
    }
    // a tag
    const gt = src.indexOf(">", lt);
    const end = gt < 0 ? n : gt + 1;
    const raw = src.slice(lt, end);
    const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>$/.exec(raw);
    if (m) {
      const closing = !!m[1], name = m[2].toLowerCase(), selfClose = !!m[4];
      out.push({ type: "tag", name, closing, selfClose, raw, start: lt, end, attrs: m[3] });
    } else {
      out.push({ type: "text", raw, start: lt, end });
    }
    // raw-text element: skip its content to its own closing tag
    if (m && !m[1] && RAW_TEXT.has(m[2].toLowerCase())) {
      const closer = src.toLowerCase().indexOf(`</${m[2].toLowerCase()}`, end);
      const segEnd = closer < 0 ? n : closer;
      if (segEnd > end) out.push({ type: "rawtext", name: m[2].toLowerCase(), raw: src.slice(end, segEnd), start: end, end: segEnd });
      i = segEnd; continue;
    }
    i = end;
  }
  return out;
}

// The element open-tag index for a selector: an element whose id matches
// `#x`, whose class contains `.x`, whose tag is `name`, or a raw byte offset
// `at`. Returns the token index of the OPEN tag or -1.
export function findOpen(toks, { name, id, cls, at } = {}) {
  for (let k = 0; k < toks.length; k += 1) {
    const t = toks[k];
    if (t.type !== "tag" || t.closing) continue;
    if (at != null && t.start !== at) continue;
    if (name && t.name !== String(name).toLowerCase()) continue;
    if (id && !new RegExp(`\\bid=["']${String(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(t.attrs)) continue;
    if (cls && !new RegExp(`\\bclass=["'][^"']*\\b${String(cls).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t.attrs)) continue;
    return k;
  }
  return -1;
}

// The balanced fragment from an open-tag token to its matching close,
// inclusive. Void and self-closing tags open no depth; raw-text elements are
// one unit (their content is not depth). Returns the byte span.
export function span(toks, openIndex) {
  let depth = 0;
  for (let k = openIndex; k < toks.length; k += 1) {
    const t = toks[k];
    if (t.type === "tag") {
      if (t.closing) {
        depth -= 1;
        if (depth === 0) return { start: toks[openIndex].start, end: t.end, ok: true };
      } else if (VOID.has(t.name) || t.selfClose) {
        if (depth === 0) return { start: toks[openIndex].start, end: t.end, ok: true }; // a void/self-closed root is its own fragment
      } else {
        depth += 1;
      }
    }
  }
  return { start: toks[openIndex].start, end: null, ok: false, gap: "unclosed element — no matching close" };
}

export function snip(html, { name, id, cls, at } = {}) {
  const toks = tokens(html);
  const idx = findOpen(toks, { name, id, cls, at });
  if (idx < 0) return { ok: false, gap: "no element matched the selector", toks };
  const s = span(toks, idx);
  if (!s.ok) return { ok: false, gap: s.gap, toks };
  return { ok: true, fragment: html.slice(s.start, s.end), start: s.start, end: s.end, bytes: s.end - s.start, name: toks[idx].name, toks };
}

export function selftest() {
  const t = (n, c) => { if (!c) { console.error("FAIL", n); process.exitCode = 1; } else console.log("ok", n); };
  const html = `<div id="a"><p>hi <b>there</b></p><br><img src="x.png"></div><div id="b">two</div>`;
  const a = snip(html, { id: "a" });
  t("balanced div kept whole", a.ok && a.fragment === `<div id="a"><p>hi <b>there</b></p><br><img src="x.png"></div>`);
  t("address is the byte span", a.ok && a.end - a.start === a.fragment.length && a.start === 0);
  const b = snip(html, { id: "b" });
  t("second element snipped at its own address", b.ok && b.fragment === `<div id="b">two</div>` && b.start >= a.end && b.end - b.start === b.fragment.length);
  const img = snip(html, { name: "img" });
  t("void element is its own fragment", img.ok && img.fragment === `<img src="x.png">`);
  const script = `<script>if (a < b && c > "</div>") { x = 1; }</script><p>after</p>`;
  const sc = snip(script, { name: "script" });
  t("raw-text script not parsed for tags", sc.ok && sc.fragment.startsWith("<script>") && sc.fragment.endsWith("</script>"));
  const p = snip(script, { name: "p" });
  t("element after raw-text is found", p.ok && p.fragment === "<p>after</p>");
  const unclosed = snip(`<div><p>never closed`, { name: "div" });
  t("unclosed is a named gap", !unclosed.ok && /unclosed/.test(unclosed.gap));
  const none = snip(`<p>only</p>`, { name: "section" });
  t("no match is a named gap", !none.ok);
}