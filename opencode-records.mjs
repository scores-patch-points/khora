// opencode-records.mjs — the attachment read as THINGS, not pages: so a count, a maximum, a current value or a sum is computed by
// the machine and handed to the model as a settled fact with its witnesses (page addresses), never left to a model reading a few pages.
//
// Nothing here knows the document's domain. It reads the shapes the document itself repeats:
//   KIND    the capitalised head of a page ("INCIDENT REPORT IR-20011 — Valencia-Dry": kind INCIDENT REPORT, id IR-20011, subject Valencia-Dry)
//   SLOTS   "Label: value." pairs; a label becomes a slot of a kind only when at least three records of that kind carry it
//   TYPES   a slot's values typed by their own shape: date, number (+unit), or a small closed set (enum) — never by its name
//   STATEMENTS  "The <attribute> at|of|for <Name> is [now] <number> <unit>", each with its page's effective date (an amendment's header)
// Identity is exact and written: a name in the ask matches a record's subject or a slot value as written, so Valencia-Dry never
// matches Valencia-Port. Time is an axis: the current value of a statement is the latest by effective date; the chain is shown.
// What cannot be resolved is a typed gap, said plainly, never a guess.
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const ID = /\b[A-Z]{1,5}-\d+\b/;
const NAMES = /\b[A-Z][a-z]+(?:(?:-| & | )[A-Z][a-z]+)+\b|\b[A-Z][a-z]+-[A-Z]{1,3}\b|\b[A-Z][a-z]+(?:-[A-Za-z]+)+\b/g;
const lower = (s) => String(s ?? "").toLowerCase();
const words = (s) => lower(s).match(/[\p{L}\p{N}]+/gu) ?? [];
const sing = (w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

export function readRecords(doc) {
  const records = [];
  doc.pages.forEach((text, i) => {
    const page = doc.labels?.[i] ?? i + 1;
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const head = lines[0] ?? "";
    // the kind is the head's leading capitalised words, before its id and its subject ("INCIDENT REPORT" in "INCIDENT REPORT IR-20011 — Valencia-Dry")
    const bare = head.replace(/\s[—–-]\s.*$/, "").replace(new RegExp(ID.source, "g"), " ");
    const kindM = /^([A-Z][A-Z&]+(?:\s+[A-Z][A-Z&]+)*)\b/.exec(bare.trim());
    const kind = kindM ? kindM[1] : null;
    const id = (ID.exec(head) ?? [])[0] ?? null;
    const subject = (/\s[—–-]\s(.+)$/.exec(head) ?? [])[1]?.trim() ?? null;
    const effective = (/effective (\d{4}-\d{2}-\d{2})/i.exec(head) ?? [])[1] ?? null;
    const fields = {};
    for (const m of text.matchAll(/(?:^|[.\n]\s*)([A-Z][A-Za-z ]{1,28}?):\s*([^.\n;]+)/g)) {
      const label = lower(m[1]).trim();
      if (!(label in fields)) fields[label] = m[2].trim();
    }
    const statements = [];
    for (const m of text.matchAll(/\bThe ((?:current |maximum |minimum |default )*[a-z][a-z\- ]{2,40}?) (?:at|of|for) ([A-Z][\w\-&' ]*?) is (?:now )?(\d[\d,.]*)\s*([a-zA-Z%]+)?/g)) {
      statements.push({ attribute: lower(m[1]).trim(), entity: m[2].trim(), value: Number(m[3].replace(/,/g, "")), unit: m[4] ?? "", page, effective });
    }
    records.push({ page, kind, id, subject, effective, fields, statements, text });
  });
  // slots: a label carried by at least three records of the same kind
  const byKind = new Map();
  for (const r of records) if (r.kind) (byKind.get(r.kind) ?? byKind.set(r.kind, []).get(r.kind)).push(r);
  const slots = new Map();
  for (const [kind, rs] of byKind) {
    const counts = new Map();
    for (const r of rs) for (const l of Object.keys(r.fields)) counts.set(l, (counts.get(l) ?? 0) + 1);
    const kept = {};
    for (const [label, n] of counts) {
      if (n < 3) continue;
      const vals = rs.map((r) => r.fields[label]).filter((v) => v !== undefined);
      const type = vals.every((v) => /^\d{4}-\d{2}-\d{2}/.test(v)) ? "date"
        : vals.every((v) => /^-?\d[\d,.]*(\s+[a-zA-Z%]+)?$/.test(v)) ? "number"
        : new Set(vals.map(lower)).size <= 12 ? "enum" : "text";
      kept[label] = { type, values: type === "enum" ? [...new Set(vals.map(lower))] : undefined };
    }
    slots.set(kind, kept);
  }
  return { records, slots };
}

const numOf = (v) => Number(String(v).replace(/,/g, "").match(/-?\d[\d.]*/)?.[0]);
// a date interval named in the ask: "between April and June 2026", "in March 2026", "during 2026", "Q2 2026"
export const intervalOf = (ask) => {
  const a = lower(ask), year = (a.match(/\b(19|20)\d{2}\b/) ?? [])[0];
  const ms = MONTHS.map((m, i) => (new RegExp(`\\b${m}\\b`).test(a) ? i : -1)).filter((i) => i >= 0);
  const q = /\bq([1-4])\b/.exec(a);
  if (!year && !ms.length && !q) return null;
  const y = year ?? null, pad = (n) => String(n).padStart(2, "0");
  if (q) { const s = (Number(q[1]) - 1) * 3; return y && { from: `${y}-${pad(s + 1)}-01`, to: `${y}-${pad(s + 3)}-31`, said: `Q${q[1]} ${y}` }; }
  if (ms.length >= 2) return y && { from: `${y}-${pad(Math.min(...ms) + 1)}-01`, to: `${y}-${pad(Math.max(...ms) + 1)}-31`, said: `${MONTHS[Math.min(...ms)]}–${MONTHS[Math.max(...ms)]} ${y}` };
  if (ms.length === 1) return y && { from: `${y}-${pad(ms[0] + 1)}-01`, to: `${y}-${pad(ms[0] + 1)}-31`, said: `${MONTHS[ms[0]]} ${y}` };
  return { from: `${y}-01-01`, to: `${y}-12-31`, said: y };
};

/** Compute what the ask asks of the records. Returns a note of settled facts with witnesses, or a typed gap. */
export function computeNote({ doc, ask, maxWitnesses = 15 }) {
  const { records, slots } = doc.read ?? (doc.read = readRecords(doc));
  const aw = new Set(words(ask).map(sing)), a = lower(ask);
  const names = [...new Set([...(ask.match(new RegExp(ID.source, "g")) ?? []), ...(ask.match(NAMES) ?? [])])];
  const lines = [], addr = (r) => `${doc.name}#p${r.page}`;

  // 0. one hop: a record the ask names by id (MIN-3, IR-20011) lends the names written in its fields ("Owner: Hana Yilmaz"), so a
  //    question about "that person" can be followed to statements about them elsewhere in the document
  const hop = new Map();
  for (const r of records) if (r.id && names.includes(r.id))
    for (const [label, v] of Object.entries(r.fields)) for (const n of String(v).match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) ?? []) hop.set(n, `${label} of ${r.id} (${addr(r)})`);
  for (const [n, via] of hop) lines.push(`- ${via}: ${n}`);
  // 1. statements about a named thing: the current value by effective date, with the chain
  const seenKeys = new Set(), current = [];
  for (const r of records) for (const st of r.statements) {
    const direct = names.includes(st.entity);
    if (!direct && !hop.has(st.entity)) continue;
    const attr = words(st.attribute).filter((w) => !["current", "maximum", "minimum", "default"].includes(w));
    // the attribute must be asked OF this entity: its words in the same clause of the ask, just before the name (for a thing reached by
    // a hop, anywhere in the ask: the ask names it only as "that person")
    const at = ask.indexOf(st.entity), clause = !direct ? ask : at < 0 ? "" : ask.slice(0, at).split(/,|;|\band\b|\?|\./).pop();
    const near = new Set(words(clause).map(sing));
    if (!attr.length || !attr.every((w) => near.has(sing(w)))) continue;
    const key = `${st.attribute}|${st.entity}`;
    if (seenKeys.has(key)) continue; seenKeys.add(key);
    const chain = records.flatMap((x) => x.statements.filter((y) => `${y.attribute}|${y.entity}` === key)).sort((p, q) => String(p.effective ?? "").localeCompare(String(q.effective ?? "")));
    const values = [...new Map(chain.map((c) => [`${c.value}|${c.effective}`, c])).values()];
    const cur = values.at(-1);
    current.push(cur);
    lines.push(`- ${st.attribute} at ${st.entity}: CURRENT ${cur.value} ${cur.unit} (${cur.effective ? `effective ${cur.effective}` : "original"}, ${doc.name}#p${cur.page})` +
      (values.length > 1 ? `; earlier: ${values.slice(0, -1).reverse().map((c) => `${c.value} ${c.unit} (${c.effective ? `effective ${c.effective}` : "original"}, ${doc.name}#p${c.page})`).join("; ")}` : ""));
  }
  if (current.length >= 2 && /\b(sum|total|add|plus|combined)\b/.test(a)) {
    const units = new Set(current.map((c) => lower(c.unit)));
    lines.push(units.size === 1 ? `- sum of the current values above: ${current.reduce((n, c) => n + c.value, 0)} ${current[0].unit}` : `- not added: the values are in different units (${[...units].join(", ")})`);
  }

  // 2. an operation over records of a kind: count, largest, smallest
  // a superlative decides first ("which report affected the MOST customers, and how many?" asks for a maximum, not a count)
  const op = /\b(most|largest|highest|longest|biggest|greatest)\b/.test(a) ? "max" : /\b(fewest|least|smallest|lowest|shortest)\b/.test(a) ? "min" : /\bhow many\b|\bnumber of\b|\bcount\b/.test(a) ? "count" : null;
  if (op) {
    const kinds = [...slots.keys()].filter((k) => { const kw = words(k).map(sing); return kw.length && kw.every((w) => aw.has(w)); });
    const kindsAll = kinds.length ? kinds : op !== "count" ? [...slots.keys()] : [];
    for (const kind of kindsAll) {
      const sl = slots.get(kind); let rs = records.filter((r) => r.kind === kind);
      const filters = [];
      for (const n of names) { const before = rs.length; rs = rs.filter((r) => r.subject === n || r.id === n || Object.values(r.fields).includes(n)); if (rs.length !== before || true) filters.push(`${n}`); }
      for (const [label, def] of Object.entries(sl)) if (def.type === "enum") for (const v of def.values) if (aw.has(sing(v))) { rs = rs.filter((r) => lower(r.fields[label]) === v); filters.push(`${label} = ${v}`); }
      const iv = intervalOf(ask), dslot = Object.entries(sl).find(([, d]) => d.type === "date")?.[0];
      if (iv && dslot) { rs = rs.filter((r) => r.fields[dslot] >= iv.from && r.fields[dslot] <= iv.to); filters.push(`${dslot} in ${iv.said}`); }
      if (op === "count") {
        lines.push(`- count of ${kind} records where ${filters.join(", ") || "(no filter)"}: ${rs.length}` + (rs.length ? ` — ${rs.slice(0, maxWitnesses).map((r) => `${r.id ?? "?"} (${addr(r)})`).join(", ")}${rs.length > maxWitnesses ? ", …" : ""}` : ""));
      } else {
        const numSlots = Object.entries(sl).filter(([l, d]) => d.type === "number" && words(l).some((w) => aw.has(sing(w))));
        for (const [label] of numSlots) {
          const vals = rs.map((r) => ({ r, v: numOf(r.fields[label]) })).filter((x) => Number.isFinite(x.v));
          if (!vals.length) continue;
          const best = op === "max" ? Math.max(...vals.map((x) => x.v)) : Math.min(...vals.map((x) => x.v));
          const ties = vals.filter((x) => x.v === best);
          lines.push(`- ${op === "max" ? "largest" : "smallest"} ${label} among ${rs.length} ${kind} records${filters.length ? ` where ${filters.join(", ")}` : ""}: ${best} — ${ties.map((x) => `${x.r.id ?? "?"} (${addr(x.r)})`).join(", ")}${ties.length > 1 ? " (tie)" : ""}`);
        }
      }
    }
  }
  if (!lines.length) return { gap: "nothing-computed" };
  return { note: `<fold-computed source="computed by the machine from the attached document's own records and statements; each value cites its page">\n${lines.join("\n")}\n</fold-computed>`, lines: lines.length };
}
