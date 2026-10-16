#!/usr/bin/env node
/**
 * SESSION LOG — core infrastructure for all model engagements
 *
 * DESIGN:
 *   - Every interaction (user prompt, model call, evaluation, selection) is a log entry
 *   - Context folding: recent = verbatim, older = decreasing resolution
 *   - Long content (>threshold) processed as files: stored on disk, summary ingested as pointer
 *   - The log is the single source of truth for what happened
 *
 * FOLDING ALGORITHM:
 *   - Window 1 (VERBATIM): last N chars — raw entries, no compression
 *   - Window 2 (COMPRESSED): next M chars — key sentences per entry
 *   - Window 3 (POINTER): everything before — topic + timestamp only
 *
 * LONG CONTENT:
 *   - User uploads / long prompts > LONG_THRESHOLD chars
 *   - Written to /tmp/session-content-{id}.txt
 *   - Read by surf (searchable)
 *   - Summary ingested into log as pointer entry
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── CONFIG ──

const VERBATIM_BUDGET = 4000;   // chars of raw recent context
const COMPRESSED_BUDGET = 2000; // chars of compressed middle context
const LONG_THRESHOLD = 800;     // chars before content gets file-processed
const SUMMARY_BUDGET = 200;     // chars per entry summary

// ── LOG ENTRY TYPES ──

const EntryType = {
  USER_INPUT: 'user_input',           // raw user prompt
  USER_FILE: 'user_file',             // long content processed as file
  MODEL_CALL: 'model_call',           // any LLM invocation
  MODEL_RESULT: 'model_result',       // LLM output
  THOUGHT: 'thought',                 // model reasoning, byte-addressable, named giver
  SALIENCE_EVAL: 'salience_eval',     // evaluator scoring
  SECTION_WIN: 'section_win',         // best-of-N selection
  AFFORDANCE: 'affordance',           // table affordance surfacing
  CITATION: 'citation',               // citation attachment
  PLAN: 'plan',                       // next-step prediction
  EVALUATE: 'evaluate',               // provenance audit
  REVISE: 'revise',                   // structural revision
  FOLD: 'fold',                       // context compression
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
};

// ── SESSION LOG ──

class SessionLog {
  constructor(sessionId, logPath) {
    this.sessionId = sessionId;
    this.logPath = logPath || `/tmp/session-${sessionId}.jsonl`;
    this.entries = [];
    this.files = [];  // pointers to processed long content
    this.stats = { totalEntries: 0, totalChars: 0, filesCreated: 0 };
  }

  // ── INGEST ──

  ingest(type, data, opts = {}) {
    const address = this._fileSize();
    const entry = {
      id: `e${this.stats.totalEntries}`,
      session: this.sessionId,
      type,
      ts: Date.now(),
      ...data,
      address,   // byte offset of this record's first byte in the log file
    };

    // Long content processing
    if (opts.longContent) {
      const filePath = this._processLongContent(entry, opts.longContent);
      entry.content_pointer = filePath;
      entry.summary = opts.longContent.slice(0, SUMMARY_BUDGET) + '...';
      entry.original_length = opts.longContent.length;
    }

    this.entries.push(entry);
    this.stats.totalEntries++;
    this.stats.totalChars += JSON.stringify(entry).length;

    // Append to disk
    fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n');

    return entry;
  }

  // ── THOUGHT: model reasoning, recorded with its giver ──
  //
  // A thought is the model's *reasoning*, kept distinct from its *result*
  // (MODEL_RESULT). Every thought names three things an auditor of the whole
  // stack needs later:
  //   1. `app`      — which application/organ generated it
  //   2. `model`    — which model produced the reasoning
  //   3. `giver` +  — the provenance claim (app/model), plus generation
  //      `params`     parameters (temperature, num_predict, seed, …) so the
  //                   thought can be re-derived or audited.
  //
  // The base entry already carries `ts`, `session`, `type`, `id`, and a byte
  // `address` into the append-only log, so a thought is byte-addressable.

  thought({ app, model, text, prompt, round, parent, params, giver, ...extra }) {
    const body = text || '';
    return this.ingest(EntryType.THOUGHT, {
      app,
      model,
      giver: giver || `${app || '?'}/${model || '?'}`,
      text: body,
      content_sha256: crypto.createHash('sha256').update(body).digest('hex'),
      prompt: prompt ? prompt.slice(0, 200) : null,
      round: round ?? null,
      parent: parent ?? null,
      params: params ?? {},
      schema: 'thought@1',
      ...extra,
    });
  }

  // ── LONG CONTENT → FILE + POINTER ──

  _fileSize() {
    try { return fs.statSync(this.logPath).size; } catch { return 0; }
  }

  _processLongContent(entry, content) {
    const fileId = `${this.sessionId}-${entry.id}`;
    const filePath = `/tmp/session-content-${fileId}.txt`;
    fs.writeFileSync(filePath, content);
    this.files.push({ entryId: entry.id, path: filePath, length: content.length });
    this.stats.filesCreated++;
    return filePath;
  }

  // ── CONTEXT FOLDING ──

  fold() {
    const entries = this.entries;
    if (entries.length === 0) return '';

    const allText = entries.map(e => this._formatEntry(e)).join('\n');
    if (allText.length <= VERBATIM_BUDGET + COMPRESSED_BUDGET) {
      return allText; // everything fits — no folding needed
    }

    const parts = [];
    let charCount = 0;

    // Work backwards: most recent entries get full treatment
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      const formatted = this._formatEntry(entry);

      if (charCount < VERBATIM_BUDGET) {
        // Window 1: VERBATIM — raw entry
        parts.unshift({ level: 'verbatim', text: formatted });
        charCount += formatted.length;
      } else if (charCount < VERBATIM_BUDGET + COMPRESSED_BUDGET) {
        // Window 2: COMPRESSED — key sentences
        const compressed = this._compress(entry);
        parts.unshift({ level: 'compressed', text: compressed });
        charCount += compressed.length;
      } else {
        // Window 3: POINTER — topic + timestamp only
        const pointer = this._pointer(entry);
        parts.unshift({ level: 'pointer', text: pointer });
        charCount += pointer.length;
      }
    }

    return parts.map(p => p.text).join('\n');
  }

  // ── FORMATTING ──

  _formatEntry(entry) {
    const ts = new Date(entry.ts).toISOString().slice(11, 19);
    switch (entry.type) {
      case EntryType.USER_INPUT:
        return `[${ts}] USER: ${entry.content}`;
      case EntryType.USER_FILE:
        return `[${ts}] USER_FILE: ${entry.summary || '(file stored)'}`;
      case EntryType.MODEL_CALL:
        return `[${ts}] CALL ${entry.model}: ${entry.purpose || ''}\n  prompt: ${(entry.prompt_preview || '').slice(0, 200)}`;
      case EntryType.MODEL_RESULT:
        return `[${ts}] RESULT ${entry.model}: ${(entry.content || '').slice(0, 500)}`;
      case EntryType.THOUGHT:
        return `[${ts}] THOUGHT ${entry.giver} ${entry.model ? `(${entry.model})` : ''} @${entry.address || '?'}: ${(entry.text || '').slice(0, 300)}`;
      case EntryType.SALIENCE_EVAL:
        return `[${ts}] EVAL ${entry.model}: FMT=${entry.format} EVD=${entry.evidence} COV=${entry.coverage} RSN=${entry.reasoning} TOT=${entry.total} — ${entry.notes || ''}`;
      case EntryType.SECTION_WIN:
        return `[${ts}] WINNER: ${entry.model} score=${entry.score} section=${entry.section}`;
      case EntryType.AFFORDANCE:
        return `[${ts}] AFFORD ${entry.section}: ${entry.material_count} sources surfaced`;
      case EntryType.CITATION:
        return `[${ts}] CITE: ${entry.citations?.join(', ') || ''}`;
      case EntryType.PLAN:
        return `[${ts}] PLAN: ${(entry.plan || '').slice(0, 300)}`;
      case EntryType.EVALUATE:
        return `[${ts}] EVALUATE: pass=${entry.passes} — ${(entry.findings || '').slice(0, 200)}`;
      case EntryType.REVISE:
        return `[${ts}] REVISE: ${entry.failure_type} — ${(entry.plan || '').slice(0, 200)}`;
      case EntryType.FOLD:
        return `[${ts}] FOLD: ${entry.entries_before}→${entry.entries_after} entries`;
      case EntryType.SESSION_START:
        return `[${ts}] === SESSION ${entry.session} START ===`;
      case EntryType.SESSION_END:
        return `[${ts}] === SESSION ${entry.session} END ===`;
      default:
        return `[${ts}] ${entry.type}: ${JSON.stringify(entry).slice(0, 300)}`;
    }
  }

  _compress(entry) {
    const full = this._formatEntry(entry);
    // Take first sentence + type + timestamp
    const firstSentence = full.match(/^[^.!?]+[.!?]/)?.[0] || full.slice(0, 100);
    return `${entry.type}@${new Date(entry.ts).toISOString().slice(11, 19)}: ${firstSentence}`;
  }

  _pointer(entry) {
    return `${entry.type}@${new Date(entry.ts).toISOString().slice(11, 19)}: (${JSON.stringify(entry).length}ch)`;
  }

  // ── FILE SURFACING ──

  getFiles() {
    return this.files;
  }

  getFileContents(entryId) {
    const f = this.files.find(f => f.entryId === entryId);
    if (f && fs.existsSync(f.path)) return fs.readFileSync(f.path, 'utf-8');
    return null;
  }

  // ── STATS ──

  getStats() {
    return {
      ...this.stats,
      foldSize: this.fold().length,
      files: this.files.length,
    };
  }

  // ── READ FROM DISK ──

  static read(logPath) {
    if (!fs.existsSync(logPath)) return [];
    return fs.readFileSync(logPath, 'utf-8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => JSON.parse(l));
  }
}

// ── EXPORT ──

module.exports = { SessionLog, EntryType, VERBATIM_BUDGET, COMPRESSED_BUDGET, LONG_THRESHOLD };

// ── CLI DEMO ──

if (require.main === module) {
  const log = new SessionLog('demo');

  console.log('=== SESSION LOG DEMO ===\n');

  // Simulate a session
  log.ingest(EntryType.SESSION_START, { models: ['gemma2:2b', 'qwen3:30b'] });

  // Short user input
  log.ingest(EntryType.USER_INPUT, { content: 'What is the LNT model?' });

  // Long user input (simulating a pasted article)
  const longArticle = 'A'.repeat(2000) + ' This is the actual content about radiation hormesis that matters.';
  log.ingest(EntryType.USER_INPUT, { content: longArticle.slice(0, 100) + '...' }, { longContent: longArticle });

  // Model calls
  log.ingest(EntryType.MODEL_CALL, {
    model: 'gemma2:2b', purpose: 'generate_section',
    prompt_preview: 'Write section 1 about low-dose radiation...',
  });
  log.ingest(EntryType.MODEL_RESULT, {
    model: 'gemma2:2b',
    content: 'The linear no-threshold model is a widely used framework for radiation protection...',
  });

  // Salience eval
  log.ingest(EntryType.SALIENCE_EVAL, {
    model: 'qwen3:8b', format: 4, evidence: 3, coverage: 5, reasoning: 3, total: 15,
    notes: 'Good coverage but weak reasoning',
  });

  // Selection
  log.ingest(EntryType.SECTION_WIN, { model: 'gemma2:2b', score: 15, section: 'Question' });

  // A recorded thought: model reasoning, named giver, byte-addressable
  const thought = log.thought({
    app: 'write-cited-essay', model: 'gemma2:2b',
    prompt: 'Decide whether the folded evidence supports a hormesis claim...',
    round: 1, parent: 'e4',
    params: { temperature: 0.7, num_predict: 512, seed: 12345 },
    text: 'The folded evidence covers LNT and mentions hormesis only via Brenner\'s critique, so the answer should present LNT as the consensus and note hormesis as contested, not settled.',
  });
  console.log('--- RECORDED THOUGHT ---');
  console.log(`  app=${thought.app} model=${thought.model} giver=${thought.giver}`);
  console.log(`  address=${thought.address} bytes, params=${JSON.stringify(thought.params)}`);

  // Add many entries to trigger folding
  for (let i = 0; i < 20; i++) {
    log.ingest(EntryType.MODEL_CALL, {
      model: ['gemma2:2b', 'qwen3:30b', 'deepseek-r1:8b'][i % 3],
      purpose: `generate_section_${i}`,
      prompt_preview: `Writing section ${i} of the memo about radiation...`,
    });
    log.ingest(EntryType.MODEL_RESULT, {
      model: ['gemma2:2b', 'qwen3:30b', 'deepseek-r1:8b'][i % 3],
      content: `Output for section ${i}: The evidence suggests various positions on low-dose radiation safety...`,
    });
  }

  log.ingest(EntryType.SESSION_END, {});

  // Show folded context
  const folded = log.fold();
  console.log('--- FOLDED CONTEXT ---');
  console.log(folded.slice(0, 2000));
  console.log(`\n... (${folded.length} total chars)`);

  console.log('\n--- FILES CREATED ---');
  for (const f of log.getFiles()) {
    console.log(`  ${f.path} (${f.length} chars)`);
  }

  console.log('\n--- STATS ---');
  console.log(log.getStats());
}
