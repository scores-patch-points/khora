// conductor/conductor.js — the resumable investigation (the first useful
// experiment).
//
// The architecture, made executable:
//
//   1. Admit a purpose — who requested it, its scope, its evidence, what
//      completion would mean.
//   2. Khora reads the encounter — the tool output and documents enter the
//      reading pipeline (byte addressing + recurrence relations).
//   3. Janus relates the accounts — what follows, what conflicts, which
//      obligations remain unresolved.
//   4. Construct the next transition — reading, computing, editing, inviting
//      input and leaving alone have distinct semantics.
//   5. OpenCode executes that exact operation — the tool registry is the
//      realization point; the derived transition is bound and performed for
//      real.
//   6. Read what actually happened — pathos changes subsequent conduct when a
//      consequence or response changes the situation.
//   7. Penelope retains the trace — the FoldTrace@1 is retained durably, and
//      interrupt/resume reconciles receipt without duplicate effects.
//
// The whole loop is resumable: the trace is append-only and hash-chained, and
// every step is recorded on it, so an interrupted run resumes from the last
// completed step rather than re-executing.

import { createTools } from "./tools.js";
import { createTrace, replay, restart, verifyTrace } from "../integration/index.js";
import { createPathosLoop, isRefusal, isCorrection } from "../pathos/index.js";
import { createRecursiveReader } from "../kernel/reading.js";
import { composedRelations } from "../adapters/text/gfp-relations-composed.js";
import { classifyWord, dominantClass } from "../adapters/text/wordclass.js";
import { findNeedles } from "../kernel/kleene-up.js";
import { createDurableRetention } from "../../../penelope/organs/integration/retention-durable.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const CONDUCTOR_SCHEMA = "FoldConductor@1";
export const CONDUCTOR_VERSION = 1;

/**
 * createConductor({ workspace, tools, storeFile, reader }) — a resumable
 * investigation. `workspace` is the real directory tools act on; `storeFile`
 * is where the FoldTrace@1 is retained durably (penelope). `tools` may be
 * injected (tests supply a fake registry); the default is the real registry.
 */
export function createConductor({ workspace, tools = null, storeFile = null, reader = null } = {}) {
  if (!workspace) throw new TypeError("createConductor requires a workspace");
  const registry = tools ?? createTools({ workspace });
  const trace = createTrace({ purpose: null, sessionId: "conductor-001" });
  let purpose = null;
  let encounters = [];
  let accounts = {};
  let needles = [];
  let claim = null;
  let rivals = [];
  let retainedStore = storeFile ? createDurableRetention({ file: storeFile }) : null;

  // ONE persistent loop: the same pathos instance carries state across step,
  // respond and complete — a correction changes the NEXT actual action of the
  // same investigation, and completion sees what the sequence actually ran.
  const live = createPathosLoop({ purpose: null, encounters, accounts, runtime: null });
  const syncLoop = () => {
    live.state.purpose = purpose;
    live.state.encounters = encounters;
    live.state.accounts = accounts instanceof Map ? accounts : new Map(Object.entries(accounts));
    return live;
  };

  const record = (fn, record) => { try { fn(record); } catch { /* never block the run on a recording issue */ } };

  return {
    schema: CONDUCTOR_SCHEMA,
    version: CONDUCTOR_VERSION,
    workspace,
    tools: registry,
    trace,
    state: live.state,

    get purpose() { return purpose; },
    get loop() { return live; },

    /**
     * 1. Admit a purpose. `who` names the requester, `scope` the admitted
     * material, `evidence` what grounds the inquiry, and `completion` what
     * would count as done.
     */
    admitPurpose({ who = "operator", scope = [], evidence = [], completion = "a verified finding", needles: nd = [], claim: cl = null, rivals: rv = [] } = {}) {
      purpose = { who, scope, evidence, completion, needles: nd, claim: cl, rivals: rv, admittedAt: Date.now() };
      needles = nd;
      claim = cl;
      rivals = rv;
      syncLoop();
      record(trace.recordEncounter.bind(trace), {
        schema: "Encounter@1", version: 1, encounter_id: "enc-purpose",
        time: new Date().toISOString(), observer: "the-fold", purpose_id: "purpose-admit",
        medium: "purpose", source_refs: [], participants: [{ kind: "observed", identity: who, evidence, scope }],
        context: "admitted purpose", observation_method: "declared", disclosure_scope: scope, operation: "selected",
      });
      return purpose;
    },

    /**
     * 2. Khora reads the encounter. `retrieve` returns [{ address, text }];
     * each is read for real through the tool registry, admitted into the
     * reading pipeline, and its byte-addressed needles + recurrence relations
     * are produced.
     */
    async read(sources) {
      const admitted = {};
      const readouts = [];
      for (const s of sources ?? []) {
        const r = registry.fetch(s.address ?? s);
        const out = r.then ? await r : r;
        const text = out?.ok ? out.result?.text ?? null : null;
        admitted[s.address ?? s] = text;
        readouts.push({ address: s.address ?? s, ok: out?.ok === true, text, reason: out?.ok ? null : (out?.reason ?? "unretrievable") });
        record(trace.recordEncounter.bind(trace), {
          schema: "Encounter@1", version: 1, encounter_id: `enc-${s.address ?? s}`,
          time: new Date().toISOString(), observer: "the-fold", purpose_id: purpose?.purpose_id ?? "purpose-admit",
          medium: "text", source_refs: [s.address ?? s],
          participants: [], context: "read admitted source", observation_method: "received",
          disclosure_scope: purpose?.scope ?? [], operation: "selected",
          ...(out?.ok ? { content: text } : {}),
        });
      }
      encounters = Object.entries(admitted).map(([address, text]) => ({
        schema: "Encounter@1", version: 1, encounter_id: `enc-${address}`,
        time: new Date().toISOString(), observer: "the-fold", purpose_id: purpose?.purpose_id ?? "purpose-admit",
        medium: "text", source_refs: [address], participants: [], context: "admitted source",
        observation_method: "received", disclosure_scope: purpose?.scope ?? [], operation: "selected",
        ...(text != null ? { content: text } : {}),
      }));
      syncLoop();
      // Reading: byte addressing (what is present in the admitted material)
      // + recurrence relations (what the material asserts).
      const needles = [];
      const relations = [];
      for (const e of encounters) {
        if (!e.content) continue;
        const found = findNeedles(e.content, (purpose?.evidence ?? []).concat(purpose?.scope ?? []), { all: true });
        needles.push({ encounter: e.encounter_id, found });
        const rel = composedRelations(e.content, { roleConfig: null, posPrior: null, classifyWord, dominantClass });
        relations.push({ encounter: e.encounter_id, address: e.source_refs[0], relations: rel.relations ?? [] });
      }
      const readRecord = { schema: "Encounter@1", version: 1, encounter_id: "enc-read", time: new Date().toISOString(), observer: "the-fold", purpose_id: purpose?.purpose_id ?? "purpose-admit", medium: "reading", source_refs: Object.keys(admitted), participants: [], context: "khora read", observation_method: "measured", disclosure_scope: purpose?.scope ?? [], operation: "selected", needles: needles.map((n) => n.found), relations };
      record(trace.recordEncounter.bind(trace), readRecord);
      return { admitted, readouts, needles, relations };
    },

    /**
     * 3. Janus relates the accounts — a bounded derivation over the readouts:
     * what follows (a supporting citation), what conflicts (contradictions),
     * and what is unresolved (a broken citation). No model, no invention: a
     * source that did not retrieve is a typed gap, never a guess.
     */
    derive(reading) {
      const findings = [];
      const sources = reading?.readouts ?? [];
      const admitted = sources.filter((s) => s.ok);
      // Which evidence needles does each admitted source actually carry? The
      // byte-addressable needles are the grounds a claim can rest on.
      const needlesOf = (address) => {
        const n = reading.needles?.find((r) => r.encounter === `enc-${address}`);
        return (n?.found?.found ?? []).filter((f) => f.present).map((f) => f.needle);
      };
      // The document is the claim's own statement, never its own evidence: it
      // carries both the claim value and the rival it names. Evidence sources
      // are everything else.
      const documentAddr = "perm:document.txt";
      const evidenceSources = admitted.filter((s) => s.address !== documentAddr);

      // Broken citation: the document NAMES a source that is not among the
      // admitted evidence — a reference the retrieval could not resolve.
      const docText = reading.admitted?.[documentAddr] ?? "";
      const referenced = [...docText.matchAll(/source-[a-z0-9]+\.txt/g)].map((m) => `perm:${m[0]}`);
      const present = new Set(admitted.map((s) => s.address));
      for (const ref of referenced) {
        if (!present.has(ref)) findings.push({ kind: "broken_citation", address: ref, reason: "referenced by the document but never retrieved", unresolved: true });
      }
      for (const s of sources) {
        if (!s.ok && !findings.some((f) => f.address === s.address)) findings.push({ kind: "broken_citation", address: s.address, reason: s.reason ?? "unretrievable", unresolved: true });
      }

      // Supporting: the evidence source carries at least one evidence needle.
      for (const s of evidenceSources) {
        const presentNeedles = needlesOf(s.address).length > 0;
        if (presentNeedles) findings.push({ kind: "supporting", address: s.address, needles: needlesOf(s.address) });
      }
      // Contradiction: the claim names a value; an evidence source carrying the
      // rival value while another carries the claim's value is a contradiction
      // — measured on the byte-addressed needles, never on differing raw text.
      if (claim) {
        const claimSources = evidenceSources.filter((s) => needlesOf(s.address).includes(claim));
        for (const rival of rivals) {
          const rivalSources = evidenceSources.filter((s) => needlesOf(s.address).includes(rival));
          if (claimSources.length > 0 && rivalSources.length > 0) {
            findings.push({
              kind: "contradiction",
              between: [claimSources[0].address, rivalSources[0].address],
              note: `source ${claimSources[0].address} carries the claim value (${claim}) while ${rivalSources[0].address} carries ${rival}`,
              claim, rival,
            });
          }
        }
      }
      return { findings, obligations: findings.filter((f) => f.unresolved).map((f) => ({ operation: "report_gap", reason: `unresolved: ${f.address}` })) };
    },

    /**
     * 4. Construct + 5. execute the next transition. The tool registry is the
     * realization point: the derived operation is performed for real in the
     * workspace. Returns { transition, executed }.
     */
    async step(transition) {
      const l = syncLoop();
      record(trace.recordTransition.bind(trace), transition);
      const executed = l.run(transition);
      for (const effect of executed?.effects ?? l.state.runtime.effects) record(trace.recordEffect.bind(trace), effect);
      return { transition, executed, effects: l.state.runtime.effects };
    },

    /**
     * 6. Pathos: read what actually happened. A correction or a refusal
     * changes the NEXT actual action; a consequence can reopen a derivation.
     */
    async respond({ type, bearer, text, correction = false, refusal = false, unexpected = [] } = {}) {
      const l = syncLoop();
      let r;
      if (type === "consequence") {
        r = l.reviseOnConsequence({ schema: "Consequence@1", version: 1, encounter_id: "enc-read", observed_changes: [text], unresolved_effects: [], unexpected_affected: unexpected });
        record(trace.recordConsequence.bind(trace), { schema: "Consequence@1", version: 1, encounter_id: "enc-read", observed_changes: [text], unresolved_effects: [], unexpected_affected: unexpected });
      } else {
        r = l.reviseOnResponse({ schema: "Response@1", version: 1, responder: bearer ?? "party", encounter_id: "enc-read", offered_response: text, actual_response: text, source_address: "perm:response", disclosure_limits: [], ...(refusal ? { refusal: true } : {}), ...(correction ? { correction: true, plan_revisions: [text] } : {}) });
        record(trace.recordResponse.bind(trace), { schema: "Response@1", version: 1, responder: bearer ?? "party", encounter_id: "enc-read", offered_response: text, actual_response: text, source_address: "perm:response", disclosure_limits: [], ...(refusal ? { refusal: true } : {}), ...(correction ? { correction: true, plan_revisions: [text] } : {}) });
      }
      if (r?.revision) record(trace.recordRevision.bind(trace), r.revision);
      return r;
    },

    /**
     * Complete the investigation with an honest completion state, and retain
     * the FoldTrace@1 durably (penelope). `completion` names the task's
     * independently specified checks.
     */
    async complete({ task_id = "investigation", checks = [] } = {}) {
      const l = syncLoop();
      const completion = l.complete({ task_id, checks });
      record(trace.recordCompletion.bind(trace), completion);
      if (retainedStore) retainedStore.retain(trace);
      return { completion, trace, verified: verifyTrace(trace).ok };
    },

    /**
     * Interrupt: retain the trace durably so the run can resume. Returns the
     * durable store's size (0 if no store file was supplied).
     */
    interrupt() {
      if (!retainedStore) return { ok: false, reason: "no durable store configured", size: 0 };
      const r = retainedStore.retain(trace);
      return { ok: r.ok, size: retainedStore.size, reason: r.reason ?? null };
    },

    /**
     * Resume: reopen the durable store, verify the chain, replay the
     * projection, and reconcile receipt — an executed effect whose
     * consequence/response was never recorded is NOT re-executed. Returns
     * { replayed, unresolvedReceipts, safeToRetry }.
     */
    async resume() {
      if (!storeFile) return { ok: false, reason: "no durable store configured" };
      const store = createDurableRetention({ file: storeFile });
      const retained = store.byId("conductor-001");
      if (!retained) return { ok: false, reason: "no retained run to resume" };
      const chain = verifyTrace(retained);
      const replayed = replay(retained);
      const restartPlan = restart(retained);
      return { ok: chain.ok, replayed, unresolvedReceipts: restartPlan.unresolvedReceipts, safeToRetry: restartPlan.safeToRetry };
    },
  };
}

export const CONDUCTOR = {
  schema: CONDUCTOR_SCHEMA,
  version: CONDUCTOR_VERSION,
  create: createConductor,
  describe: "the resumable investigation: admit purpose → khora reads → janus relates → construct → tool executes → pathos revises → penelope retains",
};