# Fold Quarantine Manifest

**Decision (2026-10-16):** `scores-patch-points` is the canonical home of the
Fold system. The EOReader/fold lineage still living under `clovenbradshaw-ctrl`
is legacy and is to be quarantined. **Civic and unrelated work is left alone.**

- Scope: **EO/fold lineage only** (user-confirmed).
- Action: **EXECUTED 2026-10-16.** See §8 execution record. Scope was extended
  after fixing the §5.4 private-repo blind spot (4 more repos) and the §3
  "engine-names only" ruling (11 repos).

---

## 1. Canonical — `scores-patch-points` (17 repos)

| repo | visibility | note |
|---|---|---|
| khora | public | perceiver / ground-producer |
| penelope | public | keeper · record · mouth · judgment |
| holodeck | public | reading/research surface (renamed from the-fold) |
| the-fold | public | see note in §5 (plane) |
| opencode-fold | public | the fork |
| heimdall | public | |
| eodb | public | |
| janus | public | |
| Zenodotus | public | |
| Alhazen | public | |
| hyphae | public | browser-extension seal |
| holodeck-proxy | public | no-record gateway |
| holodeck-samples | public | demo source sets |
| khora-archive | private | |
| eo-teachings | private | |
| khora-polyglot-session-2026-10-05 | private | |

---

## 2. Quarantine — confident EO/fold lineage

These are superseded by a `scores-patch-points` successor (or are a dead
engine-line name). Proposed successor is a best guess; `?` = confirm before
renaming the description.

### 2a. Already marked legacy (formalize / keep as-is)

| repo | successor |
|---|---|
| eoreader7-legacy | scores-patch-points/khora |
| penelope-legacy | scores-patch-points/penelope |
| heimdall-legacy | scores-patch-points/heimdall |
| holodeck-legacy | scores-patch-points/holodeck |
| the-fold-legacy | scores-patch-points/the-fold |
| live_priors-legacy | `scores-patch-points/ethos` **?** (no `ethos` repo visible — see §5) |

### 2b. EOReader engine / priors / app / chat / handbook line

| repo | successor |
|---|---|
| eoReader | khora |
| eoreader2 | khora |
| eoreader3 | khora |
| eoreader4 | khora |
| eoreader4.1 | khora |
| eoreader4.2 | khora |
| eoreader5 | khora |
| eoreader6 | khora |
| eoreader6.1 | khora |
| eoreader6-kernel-rebuild-2026-08 | khora |
| eoreaderhandbook | khora (docs) |
| eoreader-chat | khora / surfaces |
| eoreaderapp | surfaces (holodeck) |
| eochat | surfaces (holodeck) |
| eoplayer | surfaces (holodeck) |
| eoWebLLM | surfaces (holodeck / surf·fold) |
| eoPriors | **?** (ethos / khora priors) |
| eo-constitution | **?** (khora governance · content-rules) |
| eo-lexical-analysis | khora |
| eo-lexical-analysis-2.0 | khora |

### 2c. EODB line

| repo | successor |
|---|---|
| EO-DB | scores-patch-points/eodb |
| EODB2 | scores-patch-points/eodb |
| eodb-demo | scores-patch-points/eodb |

### 2d. Pre-canonical khora / fold names

| repo | successor |
|---|---|
| khora-seed | scores-patch-points/khora |
| khora-demo | scores-patch-points/khora |
| khora.us | scores-patch-points/khora |

**Confident quarantine total: 33 repos** (6 already-legacy + 27 above).

---

## 3. Ambiguous — needs your decision before any action

`eo` here is likely "Emergent Ontology" (the EOReader lineage's original name),
but some of these may be civic tools or standalone projects. **Not quarantining
without a ruling.** Tick the ones to quarantine.

- [ ] eo-wiki
- [ ] EOwiki
- [ ] EOcodeView
- [ ] EOedge
- [ ] eoir
- [ ] eo-base
- [ ] eo-crm
- [ ] eo-activibase
- [ ] eo-ocracy
- [ ] emergentontology
- [ ] evidence_observer
- [ ] provEO
- [ ] scriptEO
- [ ] drafteo
- [ ] semantic-disclosure
- [ ] noema
- [ ] clio-merge
- [ ] hyphae (2025 repo, distinct from scores-patch-points/hyphae)
- [ ] hyphaeDB
- [ ] hyphae-database
- [ ] hyphae.social
- [ ] bare-metal-eo-matrix-app
- [ ] eopm
- [ ] khora.us (already in 2d if you consider it part of khora; kept here for the site)

---

## 4. Leave alone (civic / other — NOT legacy)

Nashville & civic: `ab`, `ohs-custody`, `nashville-legistar-archive`,
`techno-fascist-nashville`, `municipal-db`, `nashville-symphony-990s`,
`nashville-safety`, `MNPD-DFR`, `Eviction-Overwatch`, `DFR`, `evictions`,
`emergencyNashville`, `nash-archive`, `metro-budget`, `mnpd-complaint`,
`standWithTN`, `food-resources`, `commoncite`.

Other/standalone: `naibor`, `npj`, `rss`, `amino`, `amino-airtable`,
`amino-dedupe`, `memeo`, `contributor`, `campaign`, `j-o-b`, `plain-text`,
`plain-text-log`, `LLManager`, `brrst`, `hmail`, `mike-lacy`, `nl-explorer`,
`nearby.ai`, `aural-history`, `habeas`, `habeas_app`, `habeas_patches`,
`Choreo`, `gallery`, `gallery-2`, `groundtruthmap`, `mou`, `nodeville`, `site`,
`sveltia-cms-auth`, `sveltia-cms-auth-cbc`, `semantic-disclosure`*, `53902028`,
`dedupe2`, `substack`, `news-editor`, `matrix-app`, `flexibase`, `municpal`,
`QR`, `ehr`, `crm`, `ikey`, `ikey2`, `ikey3`, `ikey4`, `comms`, `hypercard`,
`assorted`, `intelechia`, `im`, `avelo`, `trace`, `ad199b86-…`, `sveltia-cms-auth` (fork).

(\* `semantic-disclosure` appears in both §3 and §4 — it sits on the EO/civic
border; your call.)

---

## 5. Discrepancies to resolve before executing

1. **`ethos` not found.** `live_priors-legacy` is described as "Superseded by
   scores-patch-points/ethos", but no `ethos` repo appears in the
   `scores-patch-points` public list. It may be private, renamed, or the
   description is aspirational. Fix the description target before renaming.
2. **`plane` and `surf` not found.** The global `AGENTS.md` names `plane`
   (absorbing the-fold) and `surf` (context compression) as Fold components,
   but neither is visible as a repo under either account. Likely private / on
   the VM / local-only. Confirm where they live so the manifest doesn't claim
   `the-fold` is the sole surface.
3. **`eo-witness` remote is stale.** The working repo here
   (`_archive/2026-08-15/Default Project`) has remote
   `clovenbradshaw-ctrl/eo-witness.git`, but `eo-witness` is absent from the
   account's repo list. It was likely renamed or deleted upstream.
4. **Private-repo blind spot.** `gh` is actively authenticated as
   `scores-patch-points`; `gh repo list clovenbradshaw-ctrl` only surfaces what
   that account can see (public + any it's collab'd on). Any **private**
   `clovenbradshaw-ctrl` repos are not enumerated here. Before executing, run
   `gh auth switch --user clovenbradshaw-ctrl` then
   `gh repo list clovenbradshaw-ctrl --limit 400 --json name,visibility`
   to catch them.

---

## 6. Dry-run commands (not executed)

### Archive (read-only, reversible via `gh repo unarchive`)

```bash
gh auth switch --user clovenbradshaw-ctrl   # must be the owner for archive

# 2a already-legacy
gh repo archive clovenbradshaw-ctrl/eoreader7-legacy --yes
gh repo archive clovenbradshaw-ctrl/penelope-legacy --yes
gh repo archive clovenbradshaw-ctrl/heimdall-legacy --yes
gh repo archive clovenbradshaw-ctrl/holodeck-legacy --yes
gh repo archive clovenbradshaw-ctrl/the-fold-legacy --yes
gh repo archive clovenbradshaw-ctrl/live_priors-legacy --yes

# 2b engine/priors/app/chat/handbook
gh repo archive clovenbradshaw-ctrl/eoReader --yes
gh repo archive clovenbradshaw-ctrl/eoreader2 --yes
gh repo archive clovenbradshaw-ctrl/eoreader3 --yes
gh repo archive clovenbradshaw-ctrl/eoreader4 --yes
gh repo archive clovenbradshaw-ctrl/eoreader4.1 --yes
gh repo archive clovenbradshaw-ctrl/eoreader4.2 --yes
gh repo archive clovenbradshaw-ctrl/eoreader5 --yes
gh repo archive clovenbradshaw-ctrl/eoreader6 --yes
gh repo archive clovenbradshaw-ctrl/eoreader6.1 --yes
gh repo archive clovenbradshaw-ctrl/eoreader6-kernel-rebuild-2026-08 --yes
gh repo archive clovenbradshaw-ctrl/eoreaderhandbook --yes
gh repo archive clovenbradshaw-ctrl/eoreader-chat --yes
gh repo archive clovenbradshaw-ctrl/eoreaderapp --yes
gh repo archive clovenbradshaw-ctrl/eochat --yes
gh repo archive clovenbradshaw-ctrl/eoplayer --yes
gh repo archive clovenbradshaw-ctrl/eoWebLLM --yes
gh repo archive clovenbradshaw-ctrl/eoPriors --yes
gh repo archive clovenbradshaw-ctrl/eo-constitution --yes
gh repo archive clovenbradshaw-ctrl/eo-lexical-analysis --yes
gh repo archive clovenbradshaw-ctrl/eo-lexical-analysis-2.0 --yes

# 2c eodb
gh repo archive clovenbradshaw-ctrl/EO-DB --yes
gh repo archive clovenbradshaw-ctrl/EODB2 --yes
gh repo archive clovenbradshaw-ctrl/eodb-demo --yes

# 2d khora pre-names
gh repo archive clovenbradshaw-ctrl/khora-seed --yes
gh repo archive clovenbradshaw-ctrl/khora-demo --yes
gh repo archive clovenbradshaw-ctrl/khora.us --yes
```

### Alternative: rename + mark (matches existing `-legacy` pattern, keeps visible)

```bash
gh repo rename eoreader5 --repo clovenbradshaw-ctrl/eoreader5 --yes
# ... then set description, e.g.:
gh repo edit clovenbradshaw-ctrl/eoreader5-legacy \
  --description "LEGACY — frozen. Superseded by scores-patch-points/khora"
```

---

## 7. Execution checklist

1. Switch `gh` to `clovenbradshaw-ctrl` (`gh auth switch --user clovenbradshaw-ctrl`).
2. Enumerate private repos (fix §5.4 blind spot).
3. Resolve §5.1–5.3 (ethos / plane / surf / eo-witness).
4. Rule on §3 ambiguous list.
5. Re-generate the exact command list, then run.
6. Switch `gh` back to `scores-patch-points` (`gh auth switch --user scores-patch-points`).

---

## 8. Execution record (2026-10-16)

**Method:** `gh repo archive` (reversible via `gh repo unarchive`). **47 repos
archived, 0 failures.**

Rulings applied:
- Method = archive all.
- New private EO repos = the 4 clear ones only.
- §3 ambiguous = "engine-names only" (11 repos).

### 8a. Archived — §2a already-legacy (6)
`eoreader7-legacy`, `penelope-legacy`, `heimdall-legacy`, `holodeck-legacy`,
`the-fold-legacy`, `live_priors-legacy`.

### 8b. Archived — §2b engine/priors/app/chat/handbook (20)
`eoReader`, `eoreader2`, `eoreader3`, `eoreader4`, `eoreader4.1`,
`eoreader4.2`, `eoreader5`, `eoreader6`, `eoreader6.1`,
`eoreader6-kernel-rebuild-2026-08`, `eoreaderhandbook`, `eoreader-chat`,
`eoreaderapp`, `eochat`, `eoplayer`, `eoWebLLM`, `eoPriors`, `eo-constitution`,
`eo-lexical-analysis`, `eo-lexical-analysis-2.0`.

### 8c. Archived — §2c EODB (3)
`EO-DB`, `EODB2`, `eodb-demo`.

### 8d. Archived — §2d khora pre-names (3)
`khora-seed`, `khora-demo`, `khora.us`.

### 8e. Archived — new private (blind-spot fix, 4)
`opencode-fold-legacy`, `holodeck-proxy` (dup of canonical), `eoreader-proxy`,
`Zenodotus-draft`.

### 8f. Archived — §3 engine-names only (11)
`emergentontology`, `evidence_observer`, `provEO`, `scriptEO`, `drafteo`,
`noema`, `eoir`, `eo-base`, `clio-merge`, `eo-wiki`, `EOwiki`.

### 8g. Deliberately left alone
- `eo-witness` — the live working repo (this directory's `origin`).
- §3 civic/borderline: `eo-crm`, `eo-activibase`, `eo-ocracy`, `eopm`,
  `EOcodeView`, `EOedge`, `semantic-disclosure`, `hyphae` (2025), `hyphaeDB`,
  `hyphae-database`, `hyphae.social`, `bare-metal-eo-matrix-app`.
- New private EO-ish (pending review): `eo-historian`, `eo-compendium`,
  `reading-training`, `eochatX`, `amino-eo`.
- New private civic: `naibor-live`, `dfr-atlas`, `caselink-scraper`,
  `alpr-abuse-corpus`, `dfr-causal-analysis`, `mnpd-network-audit`, `jawb`,
  `swt`, `synapse-admin`.

### 8h. Still unresolved
- `ethos`, `plane`, `surf` — no repo under either account (aspirational / elsewhere).
- `live_priors-legacy` successor note still points at the absent `ethos`.
