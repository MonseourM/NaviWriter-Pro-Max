# NaviWriter — Known Issues

A running list of known bugs, quirks, and cleanup items in
`NaviWriter-Portable-V2.html`. None of these prevent the app from running —
it parses cleanly and works — but they're good candidates for contributors.

> **Scope:** This is a single-file HTML app (~48,000 lines, ~1 MB). All issues
> below were found by static review, not runtime testing, so line numbers are
> approximate and refer to the combined inline scripts.

---

## 🟠 High priority

### 1. "Portable" build still depends on the internet
Despite the `-Portable` name, several **core features load from CDNs** at
runtime and will not work fully offline (e.g. on a locked-down school/work
network):

| Feature | Dependency | Source |
|---|---|---|
| Rich-text editor | Tiptap 3.27.3 (12+ modules) | `https://esm.sh/@tiptap/*` |
| `.docx` import | mammoth.js 1.6.0 | `cdnjs.cloudflare.com` |
| `.zip` handling | JSZip 3.10.1 | `cdnjs.cloudflare.com` |

**Symptoms when offline / CDN blocked:**
- The Tiptap rich editor **silently falls back to plain `contenteditable`**
  (you lose the richer editing features but the app keeps working).
- `.docx` and `.zip` import features fail.

**Suggested fix:** Vendor these libraries inline (or bundle them into the
single file) so the app is genuinely offline-first and matches the "Portable"
name.

---

## 🟡 Medium priority (dead / conflicting code)

### 2. Duplicate `cleanupChapterText` — conflicting signatures
Two definitions exist in the same script scope:
- `function cleanupChapterText(text)` (≈ line 17059)
- `function cleanupChapterText(text, chapterNumber, tocTitle)` (≈ line 18821)

The **3-argument version loads last and silently overrides** the 1-argument
one, and it's the only version actually called. The 1-arg version is dead code.

**Risk:** A future contributor might call it expecting the simpler 1-arg
behavior and silently get the 3-arg version instead.

**Suggested fix:** Delete the unused 1-arg definition, or rename one.

### 3. Duplicate `safeFileName` — different behavior
Two definitions across separate script blocks:
- One truncates filenames to **90 characters** (≈ line 668)
- One truncates to **80 characters** (≈ line 8822)

The **80-char version loads last and wins** everywhere; the 90-char one is dead.

**Risk:** Conflicting intent — someone "fixing" filename length might edit the
dead copy and see no effect.

**Suggested fix:** Keep one, delete the other.

---

## 🟢 Low priority (harmless cleanup)

### 4. Duplicate `escapeHtml` (functionally identical)
Two copies in different script blocks. Both escape the same five characters
(`& < > ' "`), just written differently (regex-replace vs. chained
`.replace()`). Last one wins; the other is pure redundancy.

**Suggested fix:** Consolidate to a single shared helper.

### 5. A few unguarded internal `JSON.parse` calls
Most `JSON.parse` calls that touch **user-supplied files** are correctly
wrapped in `try/catch` by their callers (e.g. project backup import). However,
a few internal calls that parse the app's **own stored data** assume the data
is always valid:
- `JSON.parse(raw)` when reading some settings/state (≈ lines 4364, 11253, 11402)

**Risk:** Only an issue if localStorage/IndexedDB data is corrupted by an
external tool — under normal use this won't fire.

**Suggested fix:** Wrap in `try/catch` and fall back to defaults.

---

## ✅ Things that are actually solid (not bugs)
For balance — these were checked and are **fine**:

- **No syntax errors** — all 9 script blocks parse cleanly.
- **Documents persist in IndexedDB**, not localStorage — no storage-quota
  crashes even with large manuscripts.
- **No swallowed errors** — zero empty `catch {}` blocks.
- **No `for (var …)` closure-capture bugs.**
- **Drag handlers clean up their own listeners** (`pointermove`/`pointerup`
  are removed on release) — no listener leak.
- **Render functions clear the DOM before re-binding listeners** — no
  listener pile-up on re-render.
- **Backup import is wrapped in `try/catch`** with error logging.

---

## Quick triage summary

| # | Issue | Severity | Type | Breaks app? |
|---|---|---|---|---|
| 1 | CDN dependencies (not truly offline) | High | Design | Partial (offline only) |
| 2 | Duplicate `cleanupChapterText` | Medium | Dead code | No |
| 3 | Duplicate `safeFileName` (80 vs 90) | Medium | Dead code | No |
| 4 | Duplicate `escapeHtml` | Low | Redundancy | No |
| 5 | Unguarded internal `JSON.parse` | Low | Robustness | No (edge case) |

*Overall: for a 48k-line single-file app, this is in very good shape. The only
substantive item is #1 (offline/CDN). The rest are tidy-up.*
