// opencode-gather-worker.mjs — runs one gather off the door's event loop. Loading the Holodeck modules and reading pages is seconds of
// synchronous work, and the door is a single event loop that every request waits on; so the door spawns this and awaits its one message.
import { parentPort, workerData } from "node:worker_threads";
import { gatherFor } from "./opencode-gather.mjs";
try {
  // progress rides to the door as it happens (a search found, a page reading or read, the stop), so a window can say what is being read
  const result = await gatherFor(workerData.ask, { ...(workerData.opts ?? {}), emit: (ev) => { try { parentPort.postMessage({ progress: ev }); } catch { /* the door is gone */ } } });
  parentPort.postMessage({ ok: true, result });
} catch (e) {
  parentPort.postMessage({ ok: false, error: String(e?.message ?? e).slice(0, 300) });
}
