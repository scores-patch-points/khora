#!/usr/bin/env node
// eval/ocr-reread/build-pairs.mjs <dir of PDFs> <out.json> [--dpi 80,65] [--pages 6]
// REAL OCR ERRORS WITH A REAL ANSWER KEY: a born-digital PDF's text layer is what the page says; the same page rendered to a grey image at a low resolution and read by tesseract is an unreliable OCR of it.
// Nothing is synthesised: the errors are the engine's own. Output (not committed: it is third parties' text): [{ doc, page, dpi, gold, ocr }].
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { execFileSync } from "node:child_process";
const [dir, out] = process.argv.slice(2), arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; }, DPIS = arg("dpi", "80,65").split(",").map(Number), PAGES = Number(arg("pages", 6));
const run = (cmd, args) => execFileSync(cmd, args, { maxBuffer: 64e6, stdio: ["ignore", "pipe", "ignore"] }).toString("utf8"), rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".pdf")).sort()) {
  const pdf = path.join(dir, f), n = Number(run("pdfinfo", [pdf]).split("\n").find((l) => l.startsWith("Pages"))?.split(":")[1] ?? 0);
  // pages spread across the document, not the first few
  const pick = Array.from({ length: Math.min(PAGES, n) }, (_, i) => 1 + Math.floor((i * n) / Math.min(PAGES, n)));
  for (const p of pick) { const gold = run("pdftotext", ["-f", String(p), "-l", String(p), pdf, "-"]);
    for (const dpi of DPIS) { const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ocrp-")), base = path.join(tmp, "p"); run("pdftoppm", ["-r", String(dpi), "-gray", "-png", "-f", String(p), "-l", String(p), "-singlefile", pdf, base]);
      const ocr = run("tesseract", [`${base}.png`, "stdout", "-l", "eng"]); rows.push({ doc: f, page: p, dpi, gold, ocr }); fs.rmSync(tmp, { recursive: true }); } }
  console.log(f, pick.length, "pages");
}
fs.writeFileSync(out, JSON.stringify(rows)); console.log(rows.length, "page readings ->", out);
