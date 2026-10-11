// fold-agent.js — the sealed agent surface: opencode's UX, one tab per
// session, over the sealed agent door's opencode session wire.
//
// UX borrowed from opencode (anomalyco/opencode, MIT — the TUI's tab strip of
// sessions, per-part tool stamps, streaming turns, and the footer meter;
// vendored locally as 3.0/opencode-fold @ 1.18.34 pinned upstream
// 907b3bc). This is an ORIGINAL client for the sealed agent door
// (khora/native/sealed-agent/server.mjs) — not a fork, and the attribution
// above is opencode's license being honored.
//
// The page is sealed by construction: it talks only to 127.0.0.1:<port> (same
// origin), the door is the only host, and everything that could leave is
// gated + audited server-side. The footer meter reports what came back from
// a turn: outcome, frontier calls (0 = served from a compiled lesson, the
// one-time teacher at work), the check line.

const $ = (sel) => document.querySelector(sel);
const TABS_KEY = "sealed-agent:tabs";

const state = {
  tabs: [], // [{ id, title }]
  activeId: null,
  running: false,
  pending: null, // { container, meta }
  meta: {},
};

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── the wire ──────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...opts,
  });
  const text = await res.text();
  let j = null;
  try { j = text ? JSON.parse(text) : null; } catch { /* non-json */ }
  if (!res.ok) throw new Error(j?.error ?? `${res.status} ${path}`);
  return j;
}

// ── sessions as tabs (opencode's tab strip) ───────────────────────────
async function newTab({ focus = true } = {}) {
  const created = await api("/session", {
    method: "POST",
    body: JSON.stringify({ title: "new session" }),
  });
  const tab = { id: created.id, title: "new session" };
  state.tabs.push(tab);
  saveTabs();
  renderTabs();
  if (focus) setActive(tab.id);
  return tab;
}

async function restoreTabs() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(TABS_KEY) ?? "[]"); } catch { /* fresh */ }
  const tabs = [];
  for (const t of saved) {
    if (typeof t?.id === "string" && t.id) tabs.push({ id: t.id, title: t.title || "session" });
  }
  if (tabs.length === 0) {
    state.tabs = [];
    await newTab({ focus: false });
    return;
  }
  state.tabs = tabs.slice(0, 12);
  setActive(tabs[0].id);
}

function saveTabs() {
  localStorage.setItem(TABS_KEY, JSON.stringify(state.tabs.map((t) => ({ id: t.id, title: t.title }))));
}

function titleOf(tab) {
  return tab.title.length > 44 ? tab.title.slice(0, 43) + "…" : tab.title;
}

function renderTabs() {
  const strip = $("#tabs");
  strip.textContent = "";
  for (const tab of state.tabs) {
    const el = document.createElement("div");
    el.className = "tab" + (tab.id === state.activeId ? " active" : "");
    el.setAttribute("role", "tab");
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = titleOf(tab);
    title.title = tab.title;
    const x = document.createElement("button");
    x.className = "x";
    x.textContent = "×";
    x.title = "close tab (⌘W)";
    x.addEventListener("click", (ev) => { ev.stopPropagation(); closeTab(tab.id); });
    el.addEventListener("click", () => setActive(tab.id));
    el.append(title, x);
    strip.appendChild(el);
  }
}

async function closeTab(id) {
  if (state.running && id === state.activeId) await tryAbort();
  state.tabs = state.tabs.filter((t) => t.id !== id);
  saveTabs();
  if (id === state.activeId) {
    const next = state.tabs.find((t) => t.id !== id) ?? state.tabs[state.tabs.length - 1];
    if (next) setActive(next.id);
    else await newTab();
  } else {
    renderTabs();
  }
}

function setActive(id) {
  if (state.running && id !== state.activeId) return; // one turn at a time
  if (state.running) return;
  state.activeId = id;
  renderTabs();
  loadHistory(id);
}

async function loadHistory(id) {
  const thread = $("#thread");
  thread.textContent = "";
  const testCmd = localStorage.getItem(`sealed-agent:test:${id}`) ?? "";
  $("#testCommand").value = testCmd;
  try {
    const { messages } = await api(`/session/${encodeURIComponent(id)}/message`);
    for (const m of messages ?? []) {
      if (m?.role === "user") renderUser(m.parts);
      else if (m?.role === "assistant") {
        const box = await renderAssistant();
        renderParts(box, m.parts ?? []);
      }
    }
  } catch (e) {
    showNote(thread, `history unavailable: ${e.message}`);
  }
  thread.scrollTop = thread.scrollHeight;
}

// ── rendering ─────────────────────────────────────────────────────────
function renderUser(parts) {
  const text = (parts ?? []).filter((p) => p?.type === "text").map((p) => p.text).join("\n") || "(empty)";
  const turn = document.createElement("div");
  turn.className = "turn user";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  const salt = document.createElement("div");
  salt.className = "salt";
  salt.textContent = "you";
  turn.append(bubble, salt);
  $("#thread").appendChild(turn);
  return turn;
}

async function renderAssistant() {
  const turn = document.createElement("div");
  turn.className = "turn assistant";
  const who = document.createElement("div");
  who.className = "who";
  who.textContent = "agent";
  turn.append(who);
  $("#thread").appendChild(turn);
  return turn;
}

function renderParts(turn, parts) {
  let body = turn.querySelector(".answer");
  for (const p of parts ?? []) {
    if (p?.type === "text") {
      if (!body) {
        body = document.createElement("div");
        body.className = "answer";
        turn.appendChild(body);
      }
      const el = document.createElement("span");
      el.textContent = p.text;
      body.appendChild(el);
    } else if (p?.type === "tool" && (p.tool === "lesson" || p.tool === "check" || /^[a-z]+$/.test(p.tool))) {
      turn.appendChild(stampEl(p));
    } else if (p?.type === "tool") {
      turn.appendChild(stampEl(p));
    }
  }
  const thread = $("#thread");
  thread.scrollTop = thread.scrollHeight;
}

function stampEl(part) {
  const s = document.createElement("div");
  s.className = "stamp " + (part.state?.status ?? "done");
  const dot = document.createElement("span");
  dot.className = "dot";
  const tool = document.createElement("span");
  tool.className = "tool";
  tool.textContent = part.tool;
  const title = document.createElement("span");
  title.className = "detail";
  title.textContent = part.state?.title ?? "";
  const expand = document.createElement("span");
  expand.className = "expand";
  expand.textContent = part.state?.input ? "▸" : "";
  s.append(dot, tool, title, expand);
  if (part.state?.input) {
    const body = document.createElement("div");
    body.className = "body";
    body.textContent = part.state.input;
    s.appendChild(body);
    s.addEventListener("click", () => s.classList.toggle("open"));
  }
  return s;
}

function showNote(thread, text) {
  const d = document.createElement("div");
  d.className = "turn note";
  d.textContent = text;
  thread.appendChild(d);
  thread.scrollTop = thread.scrollHeight;
}

function cursorEl() {
  const c = document.createElement("span");
  c.className = "cursor";
  return c;
}

// ── one turn ──────────────────────────────────────────────────────────
async function send() {
  const ask = $("#ask").value.trim();
  if (!ask || state.running) return;
  const tab = state.tabs.find((t) => t.id === state.activeId);
  const testCommand = $("#testCommand").value.trim();
  localStorage.setItem(`sealed-agent:test:${tab.id}`, testCommand);

  if (tab.title === "new session") {
    tab.title = ask.length > 44 ? ask.slice(0, 43) + "…" : ask;
    saveTabs();
    renderTabs();
  }

  $("#ask").value = "";
  state.running = true;
  $("#sendBtn").hidden = true;
  $("#stopBtn").hidden = false;
  setMetaMeter({ state: "running…" });

  renderUser([{ type: "text", text: ask }]);
  const box = await renderAssistant();
  const live = document.createElement("div");
  live.className = "answer";
  box.appendChild(live);
  live.appendChild(cursorEl());
  $("#thread").scrollTop = $("#thread").scrollHeight;
  state.pending = { live };

  try {
    const j = await api(`/session/${encodeURIComponent(tab.id)}/message`, {
      method: "POST",
      body: JSON.stringify({ parts: [{ type: "text", text: ask }], testCommand }),
    });
    live.remove();
    renderParts(box, j.parts ?? []);
    state.meta = j.meta ?? {};
    setMetaMeter({ outcome: j.meta?.outcome, servedBy: j.meta?.servedBy, frontierCalls: j.meta?.frontierCalls });
  } catch (e) {
    live.remove();
    if (e.message === "cancelled") {
      showNote($("#thread"), "⏹ stopped");
      setMetaMeter({ outcome: "cancelled" });
    } else {
      showNote($("#thread"), `error: ${e.message}`);
      setMetaMeter({ outcome: "error", note: e.message });
    }
  } finally {
    state.running = false;
    state.pending = null;
    $("#stopBtn").hidden = true;
    $("#sendBtn").hidden = false;
    $("#thread").scrollTop = $("#thread").scrollHeight;
  }
}

async function tryAbort() {
  const tab = state.tabs.find((t) => t.id === state.activeId);
  if (!tab || !state.running) return;
  try { await api(`/session/${encodeURIComponent(tab.id)}/abort`, { method: "POST", body: "{}" }); } catch { /* already stopped */ }
}

// ── the live feed (opencode's streaming parts) ────────────────────────
function openFeed() {
  const es = new EventSource("/event");
  es.onmessage = null;
  es.addEventListener("message.part.updated", (ev) => {
    const d = JSON.parse(ev.data);
    if (!state.pending || d.sessionID !== state.activeId) return;
    // The POST response is authoritative; live parts only show progress.
    for (const p of (Array.isArray(d?.part) ? d.part : [d?.part]).filter(Boolean)) {
      if (p.type === "text") {
        const el = document.createElement("span");
        el.textContent = p.text;
        state.pending.live.insertBefore(el, state.pending.live.querySelector(".cursor"));
      } else if (p.type === "tool") {
        state.pending.live.parentElement.appendChild(stampEl(p));
      }
    }
    $("#thread").scrollTop = $("#thread").scrollHeight;
  });
  es.addEventListener("session.idle", (ev) => {
    const d = JSON.parse(ev.data);
    if (d.sessionID === state.activeId && !state.running) setMetaMeter({ outcome: d.outcome ?? state.meta.outcome });
  });
  es.onerror = () => { /* the door restarts; EventSource reconnects on its own */ };
}

// ── the footer meter ──────────────────────────────────────────────────
function setMetaMeter({ state: st = null, outcome = null, servedBy = null, frontierCalls = null, note = null }) {
  const parts = [];
  if (outcome) parts.push(`<b>${esc(outcome)}</b>`);
  if (servedBy === "lesson") parts.push(`<b class="lesson">served from compiled lesson</b>`);
  if (frontierCalls !== null) parts.push(`frontier calls: <b>${Number(frontierCalls)}</b>`);
  if (st) parts.push(`<b>${esc(st)}</b>`);
  if (note) parts.push(esc(note));
  $("#meta").innerHTML = parts.length
    ? `<span class="meter">${parts.join(" · ")}</span>`
    : `<span class="meter">idle — every frontier call is gated and audited; lessons compile on green and replay with 0 calls</span>`;
}

// ── wiring ────────────────────────────────────────────────────────────
$("#newTab").addEventListener("click", () => newTab());
$("#sendBtn").addEventListener("click", send);
$("#stopBtn").addEventListener("click", tryAbort);
$("#ask").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter" && !ev.shiftKey) {
    ev.preventDefault();
    send();
  }
});
document.addEventListener("keydown", (ev) => {
  const mod = ev.metaKey || ev.ctrlKey;
  if (mod && ev.key.toLowerCase() === "t") { ev.preventDefault(); newTab(); }
  if (mod && ev.key.toLowerCase() === "w") { ev.preventDefault(); closeTab(state.activeId); }
  if (mod && ev.key === "Tab") {
    ev.preventDefault();
    const i = state.tabs.findIndex((t) => t.id === state.activeId);
    const next = ev.shiftKey ? (i - 1 + state.tabs.length) % state.tabs.length : (i + 1) % state.tabs.length;
    const t = state.tabs[next];
    if (t) setActive(t.id);
  }
});

(async () => {
  await restoreTabs();
  openFeed();
  setMetaMeter({});
  $("#ask").focus();
})();