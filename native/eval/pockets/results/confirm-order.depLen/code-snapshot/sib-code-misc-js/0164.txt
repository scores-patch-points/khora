// organs/generation/provenance.mjs — compact, foldable provenance ledger.
//
// Provenance is itself an EOT-shaped artifact. A source is stored once under a
// stable foreign key. Events point to it and to an optional parent/event, with
// byte anchors when material exists. "ibid" means "same source/anchor as the
// referenced event"; it is represented as lineage, never duplicated payload.
//
// The ledger deliberately records transformations (read, ground, prior,
// arrange, draw, hunt, fold, verify, repair, materialize), not just citations.

import { createHash } from "node:crypto";

export function stableProvenanceId(value, prefix = "src") {
  return `${prefix}_${createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 20)}`;
}

export class ProvenanceLedger {
  constructor({ artifact = "unknown", encoding = "utf8", position = null } = {}) {
    this.position = position == null ? null : structuredClone(position);
    this.artifact = artifact;
    this.encoding = encoding;
    this.sources = new Map();
    this.events = [];
    this.byKey = new Map();
  }

  source({ kind, locator, anchor = null, meta = null }) {
    const source_id = stableProvenanceId({ kind, locator }, "src");
    if (!this.sources.has(source_id)) {
      this.sources.set(source_id, {
        source_id, kind, locator,
        ...(anchor ? { anchor } : {}),
        ...(meta ? { meta } : {}),
      });
    }
    return source_id;
  }

  event({ stage, source_id = null, parent = null, unit = null, range = null, transform = null, detail = null, ibid = null, position = this.position }) {
    const key = JSON.stringify({ stage, source_id, parent, unit, range, transform, ibid, detail, position });
    const existing = this.byKey.get(key);
    if (existing) return existing;

    const id = stableProvenanceId({ n: this.events.length, stage, source_id, parent, unit, range, transform, ibid, detail, position }, "evt");
    const row = {
      event_id: id,
      stage,
      position: position == null ? null : structuredClone(position),
      ...(source_id ? { source_id } : {}),
      ...(parent ? { parent } : {}),
      ...(unit ? { unit } : {}),
      ...(range ? { range } : {}),
      ...(transform ? { transform } : {}),
      ...(ibid ? { ibid } : {}),
      ...(detail ? { detail } : {}),
    };
    this.events.push(row);
    this.byKey.set(key, id);
    return id;
  }

  ibid(event_id, detail = null) {
    return this.event({ stage: "ibid", ibid: event_id, detail });
  }

  eot({ root = null, artifact = this.artifact } = {}) {
    return {
      schema: "Provenance@2",
      artifact,
      position: this.position == null ? null : structuredClone(this.position),
      addressSpace: { artifact: "folded-bytes", unit: "byte", encoding: this.encoding },
      sources: structuredClone([...this.sources.values()]),
      events: structuredClone(this.events),
      ...(root ? { root } : {}),
    };
  }
}

export function foldProvenance(parent, { transform = "re-admit", detail = null, position = parent.position ?? null } = {}) {
  const ledger = new ProvenanceLedger({ artifact: parent.artifact, encoding: parent.addressSpace?.encoding ?? "utf8", position });
  for (const source of parent.sources ?? []) ledger.sources.set(source.source_id, structuredClone(source));
  for (const event of parent.events ?? []) {
    ledger.events.push(structuredClone(event));
    ledger.byKey.set(JSON.stringify({ stage: event.stage, source_id: event.source_id ?? null, parent: event.parent ?? null, unit: event.unit ?? null, range: event.range ?? null, transform: event.transform ?? null, ibid: event.ibid ?? null, detail: event.detail ?? null, position: event.position ?? null }), event.event_id);
  }
  const parentRoot = parent.root ?? (parent.events?.length ? parent.events[parent.events.length - 1].event_id : null);
  if (parentRoot) ledger.ibid(parentRoot, { transform, ...(detail ? { detail } : {}) });
  return ledger;
}

export function byteRange(start, end) {
  return { unit: "byte", start, end };
}
