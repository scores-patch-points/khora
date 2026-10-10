// agenda-shape.mjs — Organ 5: an agenda is an ordered action list.
//
// A fanout (detail-fetch) returns a meeting's items in fetch order; the
// agenda's order is the item's OWN declared sequence, never the fetch's
// arrival order. Each item shapes to {num, title, matter, type, action} with
// per-item gaps — a missing title or matter is a named gap on THAT item,
// never a dropped row. The action is the item's own declared action name
// (null until the body acts — the agenda is honest about what has not yet
// happened). Pure. No model. No DOM.
export const AGENDA_SHAPE_SCHEMA = "AgendaShape@1";

const LEGISTAR = {
  seqOf: (i) => i.EventItemAgendaSequence,
  numOf: (i) => i.EventItemAgendaNumber,
  titleOf: (i) => i.EventItemTitle ?? i.EventItemMatterTitle ?? null,
  matterOf: (i) => i.EventItemMatterFile ?? null,
  typeOf: (i) => i.EventItemMatterType ?? null,
  actionOf: (i) => i.EventItemActionName ?? null,
  noteOf: (i) => i.EventItemAgendaNote ?? null,
};

// Rows in the item's own declared order (sequence ascending; a null
// sequence sorts last, and is named in the item's gap, never guessed).
export function shapeItems(items, fields = LEGISTAR) {
  const shaped = (items ?? []).map((item, idx) => {
    const seq = fields.seqOf(item);
    const title = fields.titleOf(item);
    const row = {
      seq, idx,
      num: fields.numOf(item),
      title,
      matter: fields.matterOf(item),
      type: fields.typeOf(item),
      action: fields.actionOf(item),
      note: fields.noteOf(item),
      gap: seq == null || !title ? `item ${idx}: ${!title ? "no title" : ""} ${seq == null ? "no sequence" : ""}`.trim() : null,
    };
    return row;
  });
  const rows = [...shaped].sort((a, b) => {
    if (a.seq == null) return 1;
    if (b.seq == null) return -1;
    return a.seq - b.seq;
  });
  const gaps = rows.filter((r) => r.gap).map((r) => r.idx);
  return { rows, gaps };
}

export function selftest() {
  const t = (name, cond) => { if (!cond) { console.error("FAIL", name); process.exitCode = 1; } else console.log("ok", name); };
  const mk = (i) => ({ EventItemAgendaSequence: i, EventItemAgendaNumber: String.fromCharCode(64 + i) + ".", EventItemTitle: "Item " + i, EventItemMatterFile: "26-" + i, EventItemMatterType: "Resolution", EventItemActionName: null });
  const items = [mk(3), { ...mk(1), EventItemTitle: null }, mk(2)];
  const { rows, gaps } = shapeItems(items);
  t("ordered by own sequence, null-title item gapped", rows.length === 3 && rows[0].seq === 1 && rows[0].gap && gaps.length === 1 && rows[2].seq === 3);
  const past = shapeItems([{ ...mk(1), EventItemActionName: "Passed" }]);
  t("declared action rides through", past.rows[0].action === "Passed");
  const empty = shapeItems([]);
  t("empty agenda is empty, no throw", empty.rows.length === 0 && empty.gaps.length === 0);
  const nullSeq = shapeItems([{ ...mk(1) }, { ...mk(2), EventItemAgendaSequence: null }]);
  t("null sequence sorts last and is gapped", nullSeq.rows[1].seq === null && nullSeq.gaps.length === 1);
}