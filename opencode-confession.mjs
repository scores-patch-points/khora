// opencode-confession.mjs — THE CONFESSION (penelope layer 9, Figure): the one paragraph of a piece that is never the model's.
//
// A piece ends by saying what it is made of: how many sentences face a source, how many are the model's own and marked, how many
// were contradicted, how many gaps no page filled, how many times a model was called. None of that is written; it is computed from
// the residue ledger (opencode-residue.mjs: RESIDUE events for drawn answers, longform-section events for graded sections,
// stitch-tree events for the slots and gaps) and rendered mechanically, with the addresses of the ledger rows it was computed from.
// The law it keeps: the confession equals the ledger byte for byte, on every run — a test, never a review. A model may not touch it;
// a piece whose confession a model wrote has no confession.
//
//   node opencode-confession.mjs <task>        print the paragraph for one task (a session or a longform job)
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as EOT from "./opencode-eot.mjs";
import { residueLedger, longformLedger } from "./opencode-residue.mjs";

export const CONFESSION_SCHEMA = "Confession@1";

const n = (x) => Number(x) || 0;
const plural = (k, one, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** The gaps and the slot count from the stitched layer's tree, when the task has one. */
function treeFacts(task) {
  let events = [];
  try { events = EOT.read(task)?.events ?? []; } catch { events = []; }
  const t = events.filter((e) => e?.detail?.kind === "stitch-tree" || e?.detail?.op === "STITCH").at(-1);
  if (!t) return { slots: null, gaps: null, treeId: null };
  const d = t.detail;
  const gaps = Array.isArray(d.gaps) ? d.gaps.length : n(d.gapCount ?? d.gaps);
  // slots = every node of the tree below the root (children and the gaps hung on them), or an explicit list when the event carries one
  const walk = (node) => (node && typeof node === "object" ? 1 + [...(node.children ?? []), ...(node.gaps ?? [])].reduce((a, c) => a + walk(c), 0) : 0);
  const slots = Array.isArray(d.slots) ? d.slots.length : d.tree && typeof d.tree === "object" ? Math.max(0, walk(d.tree) - 1) : n(d.slotCount ?? d.slots);
  return { slots: slots || null, gaps: Number.isFinite(gaps) ? gaps : null, treeId: t.event_id ?? null };
}

/** The numbers, from the ledger alone. `kind` says which ledger the task has. */
export function confessionFacts({ task } = {}) {
  const isJob = String(task ?? "").startsWith("longform-");
  const l = isJob ? longformLedger({ task }) : residueLedger({ task });
  const tree = treeFacts(task);
  const rows = (l.runs ?? []).map((r) => r.id ?? null).filter(Boolean);
  return {
    schema: CONFESSION_SCHEMA,
    task,
    kind: isJob ? "piece" : "answers",
    sentences: n(l.total?.sentences),
    facing: n(l.total?.facing),
    marked: n(l.total?.marked),
    contradicted: n(l.total?.contradicted),
    unclassed: n(l.unclassed),
    answers: n(l.answers),
    // a stitched section cost no model call; every drawn section or admitted gap cost one
    calls: isJob ? (l.runs ?? []).filter((r) => !r.stitched).length : n(l.answers),
    freeform: isJob ? (l.runs ?? []).some((r) => r.freeform) : false,
    slots: tree.slots,
    gaps: tree.gaps,
    addresses: { rows, tree: tree.treeId },
  };
}

/** The paragraph. Pure function of the facts; the same facts always render the same bytes. */
export function renderConfession(f) {
  const parts = [];
  if (!f.sentences) parts.push("Nothing of this piece is on the record yet.");
  else {
    parts.push(`${plural(f.facing, "sentence")} of ${f.sentences} face${f.facing === 1 ? "s" : ""} a source at an address`);
    parts.push(`${f.marked} ${f.marked === 1 ? "is" : "are"} the model's own, marked`);
    if (f.contradicted) parts.push(`${f.contradicted} ${f.contradicted === 1 ? "is" : "are"} contradicted by a source`);
    if (f.unclassed) parts.push(`${f.unclassed} unclassed`);
  }
  if (f.slots != null) parts.push(`${plural(f.slots, "slot")} were hunted, ${f.gaps ?? 0} ${f.gaps === 1 ? "is" : "are"} a gap no page filled`);
  if (f.kind === "piece") parts.push(`the model was ${f.freeform ? "given the facts and not judged" : `called ${plural(f.calls, "time")}, last`}`);
  else if (f.answers) parts.push(`over ${plural(f.answers, "answer")}`);
  const share = f.sentences ? Math.round((f.marked / f.sentences) * 100) : null;
  const head = share == null ? "" : ` The model's share is ${share}%.`;
  const addr = f.addresses.rows.length ? ` [ledger ${f.addresses.rows.slice(0, 6).join(" ")}${f.addresses.rows.length > 6 ? ` +${f.addresses.rows.length - 6}` : ""}${f.addresses.tree ? ` tree ${f.addresses.tree}` : ""}]` : "";
  const body = parts.join("; ");
  return `What this is made of: ${body}${/[.!?]$/.test(body) ? "" : "."}${head}${addr}`;
}

export const confessionOf = ({ task } = {}) => renderConfession(confessionFacts({ task }));

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const task = process.argv[2];
  if (!task) { console.error("usage: node opencode-confession.mjs <task>"); process.exit(2); }
  console.log(confessionOf({ task }));
}
