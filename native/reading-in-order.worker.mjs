// reading-in-order.worker.mjs — one reader's eyes for reading-in-order.mjs: the canonical parse (reading.js rowsOfFor: the
// language's dependency parser with its kāraka labels) of the sentences it is handed, nothing else. A sentence's tree depends
// on that sentence alone, so blocks of sentences are parsed here while the reading order is kept by the caller.
import { parentPort, workerData } from "node:worker_threads";
const { rowsOfFor } = await import(new URL("./reading.js", import.meta.url).href);
const parser = await rowsOfFor(workerData.stem);
parentPort.on("message", ({ id, texts }) => {
  const t0 = performance.now();
  const out = texts.map((t) => {
    if (parser.gap) return { gap: parser.gap };
    try { const rows = parser.rowsOf(t); return Array.isArray(rows) ? rows : null; } catch (e) { return { failed: String(e?.message ?? e).slice(0, 120) }; }
  });
  parentPort.postMessage({ id, out, ms: performance.now() - t0 });
});
parentPort.postMessage({ ready: true, by: parser.by ?? null, gap: parser.gap ?? null });
