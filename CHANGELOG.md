# NaviWriter Changelog

> **Current distribution notice:** NaviWriter Portable is discontinued and is no longer maintained, updated, or kept in parity with NaviWriter Pro. Portable entries below document historical v42.0.0 release work only; any remaining Portable file should be treated as an archived legacy release. NaviWriter Pro is the maintained source of truth.

## NaviWriter Pro v42.0.0

**Status:** Stable, feature-frozen release

NaviWriter Pro v42.0.0 completes the retained-source Reader architecture, OCR-backed reading tools, fidelity refinements, unified writing scopes, Find / Replace controls, responsive Reader polish, and portable-build parity. This release supersedes the v40 generation as the maintained source of truth.

### Reader and Retained Sources

- Added a dedicated Reader shell for retained PDFs, images, EPUB, Markdown, code, Office-style documents, and other supported references.
- Added Reader actions for Outline, Search, Copy, Copy with Source, Highlights, and Info.
- Unified Reader and format-specific controls into one visually consistent control rail.
- Anchored Reader actions, the format badge, and Info on the left while keeping PDF navigation, zoom, fitting, rotation, and download controls on the right.
- Removed overlapping toolbar geometry and unwanted scrollbar space.
- Added multiple simultaneous floating Reader panels on desktop.
- Added draggable, independently resizable, collapsible Reader panels with remembered per-panel geometry.
- Added mobile bottom-sheet behavior with working minimize and restore controls.
- Made Reader panels close outside document-viewing contexts and refresh when the viewed source changes.
- Added responsive placement safeguards so stale panel geometry cannot strand a panel outside the viewer.

### Highlights and Reader Search

- Added persistent Reader highlights, colors, notes, copy, delete, and unresolved states.
- Added search across highlighted text and attached notes.
- Added themed highlight-note and search fields.
- Added source fingerprints and annotation recovery safeguards.
- Marked annotations unresolved when their retained source changes and cannot be safely reused.
- Added cross-document highlight and note search.
- Added Reader keyboard shortcuts for Search, Outline, Highlights, and global highlight search.

### OCR-backed Reader

- Added local OCR for scanned PDFs and images.
- Added page-by-page PDF OCR, cancellation, cached results, recognition confidence, engine metadata, and normalized word coordinates.
- Added selectable OCR text overlays where coordinate data permits.
- Added OCR-backed Reader search and visible OCR result labels.
- Added low-confidence OCR treatment rather than presenting uncertain recognition as embedded source text.
- Keyed OCR results to source fingerprints so replacing a source invalidates stale OCR safely.
- Added OCR cache and Reader search-index visibility to Diagnostics.

### Format Fidelity and Refinement

- Added Markdown Source and Rendered modes.
- Added code line numbers and source-friendly selection and copying.
- Added Copy with Source information, including source title, format, and PDF page where available.
- Refined retained media and structure handling through the Office and EPUB adapters.
- Preserved Reader-specific source handling without converting retained references into ordinary editable documents.
- Added long-document and source-change safeguards around Reader indexing, panels, OCR, and annotations.

### Find / Replace

- Added **Match case** and **Exact word** options.
- Applied the options to Find, Replace Selected, and safe current-document Replace All behavior.
- Preserved literal handling for special characters rather than treating user searches as raw regular expressions.
- Replaced option-aware matches from the end of the document backward to avoid invalidating later offsets.
- Preserved the established replacement path when both new options are disabled.

### Unified Writing Scopes

- Standardized writing-related scope selectors to:
  - Current document
  - Current document + descendants
  - Current root tree
  - Entire project
- Applied the shared scope model to Writing History, Writing Goals, Statistics, Repeated Words analysis, and Find / Replace.
- Added a shared writing-scope vocabulary module to prevent individual tools from inventing incompatible labels.
- Added correct branch and root-tree result labels, document navigation, and occurrence selection in Find.
- Kept multi-document Replace All disabled for data safety.
- Left Outliner browsing scopes independent because those scopes describe document-browser topology rather than writing-text aggregation.

### Responsive and Interface Refinement

- Preserved Desktop, Compact, Mobile, Auto, and Focus layout behavior from the v40 generation.
- Refined Compact and Mobile Reader controls and panel behavior.
- Kept Desktop workspace arrangements and persistent panel sizing.
- Continued using the page-based responsive shell for Documents, Editor, and Inspector.
- Preserved context-sensitive control visibility and responsive toolbar behavior.

### Portable Edition (Historical)

- Updated NaviWriter Portable to parity with the v42.0.0 multi-file build.
- Embedded current styles, application modules, Reader modules, PDF support, OCR assets, and Office-parser assets into the single-file distribution.
- Removed ordinary local stylesheet and script dependencies from the portable build.
- Kept NaviWriter Pro as the maintainable source project while restoring portable parity for this release.

### Stability and Validation

- Completed a final static bug pass before portable packaging.
- Validated all application and import JavaScript files with syntax checks.
- Verified balanced rule blocks across all shipped stylesheets.
- Verified that the application entry point has no duplicate HTML IDs.
- Verified that all referenced local scripts and stylesheets exist in the multi-file build.
- Verified Reader multi-panel, resize, collapse, highlight-search, Find-option, and unified-scope integration markers.
- Added `FINAL_BUG_PASS_REPORT.json` to the multi-file release.
- Verified final ZIP integrity before distribution.

### Upgrade Notes

- Replace the complete NaviWriter application folder rather than mixing scripts or styles from older releases.
- Keep a verified project backup before upgrading.
- Preserve the complete folder structure around `index.html`.
- Hard-refresh after replacing application files.
- Do not clear browser site storage unless a verified project backup exists.
- Treat the v42.0.0 multi-file build as the source of truth for future maintenance.

### Known Limitations

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for current browser-storage cautions, performance considerations, accessibility debt, retained native controls, export limitations, and the discontinued status of NaviWriter Portable.
