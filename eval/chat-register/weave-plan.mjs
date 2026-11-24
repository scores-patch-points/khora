// Writes the shared board's assignments to the pharos log (writer "chat-register"), one entry per mechanic, re-weavable (same addr = an update).
//   node eval/chat-register/weave-plan.mjs
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const pharosHome = process.env.PHAROS_HOME ? path.resolve(process.env.PHAROS_HOME) : path.resolve(ROOT, "..", "pharos");
const P = await import(pathToFileURL(path.join(pharosHome, "lib", "pharos.mjs")).href);
const dir = process.env.CHAT_PHAROS_DIR || path.join(os.homedir(), ".pharos", "fold-demo");
const h = P.open("fold-demo", { dir, writer: "chat-register" });
try { P.weave(h, { cell: "DEF·Figure", kind: "kind", addr: "kind:assignment", body: { name: "assignment", cell: "INS·Figure" } }); } catch { /* already declared */ }
const S = { chat: "local_31e0dbf4-d208-4690-8130-b04b85a285f2", parsing: "local_ea6998ef-947a-4458-9345-5f158bede9e5", fork2: "local_170307ca-9bbd-4cde-bafc-59e9549ee60c", gram: "local_e8be3ba8-0768-44fe-b29d-3d7c67d1f47d" };
const rows = [
  [1, "social acts that are not facts", "chat", "started"], [2, "participant questions are not researched", "chat", "open"], [3, "names without capitals", "parsing", "waiting on the owner's go-ahead"], [4, "register normalisation induced from the data", "parsing", "waiting on the owner's go-ahead"],
  [5, "language and code-switching as a typed gap", "parsing+chat", "waiting on the owner's go-ahead"], [6, "turn assembly", "chat", "open"], [7, "a question pairs with the addressee's next turn", "chat", "open"], [8, "negation as a sign, and corrections", "chat (29bb87 declined; polarity per clause)", "open"],
  [9, "affect marks as stance", "chat (29bb87 declined)", "open"], [10, "addressing", "chat", "open"],
];
const batch = rows.map(([n, what, owner, status]) => ({ cell: "INS·Figure", kind: "assignment", addr: `assignment:chat-mechanic:${n}`, body: { n, mechanic: what, owner, status, board: "eval/chat-register/PLAN.md", measure: "eval/chat-register/mechanics.mjs and invariance.mjs (EXPLORATORY)", sessions: S, date: "2026-11-23" } }));
P.weaveMany(h, batch);
console.log(`woven ${batch.length} assignments into ${dir} (writer chat-register)`);
