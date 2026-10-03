# NaviWriter Pro v42.0.0: Known Issues and Limitations

This file tracks confirmed limitations and practical cautions for the maintained multi-file release, with a legacy note for the discontinued Portable edition. NaviWriter Pro v42.0.0 has no known release-blocking issue at publication, but “no known blocker” is not the same as “software has achieved divine perfection.”

## High Priority

### Browser storage is not a permanent backup

NaviWriter stores active work locally in the browser. Clearing site data, changing browsers, using restrictive privacy settings, losing the device, or browser-storage corruption can affect locally stored projects.

**Mitigation:** Export project backups regularly and keep copies in more than one location. Create a backup before major imports, deletions, hierarchy changes, source replacements, or application-file updates.

### Source replacement can invalidate Reader-derived data

Reader OCR and annotations are associated with retained-source fingerprints. Replacing a retained source invalidates stale OCR. Annotations that cannot be safely reconciled may be marked unresolved instead of being silently attached to the wrong content.

**Mitigation:** Review unresolved annotations after replacing a source file. Preserve the former source and a project backup until migrated highlights and notes have been checked.

## Medium Priority

### Very large projects and retained sources may affect performance

Projects with many documents, extensive metadata, large relationship graphs, large boards, unusually long documents, many retained references, or large OCR indexes may render, search, or analyze more slowly. Global search, project-wide analysis, cross-document highlights, graphs, Outliner views, OCR, and long document lists are the most likely areas to show strain.

**Mitigation:** Keep backups, close unnecessary panels, use focused scopes where available, and avoid treating one document as an infinite database wearing a manuscript costume.

### OCR is probabilistic

Scanned PDFs and images can be processed with the local Reader OCR system, but recognition quality depends on scan quality, language, resolution, layout, and typography. Low-confidence OCR is identified separately from embedded source text, but it can still contain mistakes.

**Mitigation:** Verify OCR-derived quotations, copied text, headings, search matches, and highlights against the visible source page.

### PDF output uses browser print behavior

Print and Save as PDF output can vary by browser, operating system, print settings, selected page size, and margins. Exact pagination is not guaranteed to match a dedicated publishing application.

**Mitigation:** Review the compiled preview and print preview before saving the final PDF.

### Split Editor is intentionally lighter than the main Editor

The Split Editor is designed for reference, comparison, renaming, and lighter editing. The Split Editor does not provide every workflow or formatting control available in the main Editor.

**Mitigation:** Open the split document as the main document for substantial formatting or rewriting.

### Multi-document replacement remains restricted

Find can search the current document, descendants, root tree, or entire project. Replace All remains restricted to the current document because a project-wide mutation requires stronger transaction and recovery guarantees.

**Mitigation:** Use a broader Find scope to locate matches, then open and replace within each intended document.

## Low Priority and Maintenance Debt

### The CSS is large and override-heavy

`app.css` contains historical style layers and late-stage overrides from iterative UI work, desktop workspace arrangements, responsive redesigns, Reader integration, and compatibility fixes. The current release is styled correctly, but future contributors should expect duplication and specificity battles.

### The main application script is large

`app.js` contains many systems in one file. The application works, but feature maintenance would be easier after modularization and automated regression testing.

### Browser support is unevenly tested

Chromium-based browsers are the primary target. Other modern browsers may work, but layout details, local-file behavior, print output, OCR workers, and browser-storage behavior can differ. Archived Portable builds may have additional compatibility differences and are no longer maintained.

### Browser spellcheck and third-party writing assistants may be inconsistent
  
Native browser spellcheck may not provide underlines or suggestions inside NaviWriter’s rich-text editor. Third-party writing assistants may also work only partially. For example, Grammarly may detect and underline text and may apply a correction, while its suggestion overlay does not appear when an underlined item is hovered over or selected. Behavior may vary by browser, extension version, and operating system.  
**Status:** Accepted compatibility limitation for v42.0.0. NaviWriter does not guarantee integration with browser extensions or other injected writing-assistant interfaces.  
**Mitigation:** Use an external proofreading tool or editor when dependable spelling and grammar suggestions are required, then return the reviewed text to NaviWriter. Back up the project before replacing substantial passages.

### Accessibility can be improved

The application includes labels, buttons, keyboard shortcuts, responsive navigation, and Reader controls, but it has not undergone a comprehensive accessibility audit. Keyboard flow, screen-reader announcements, contrast across every custom theme, floating-panel alternatives, and complex graph or board interactions remain candidates for review.

### Discontinued Portable edition

NaviWriter Portable v42.0.0 is discontinued and is no longer maintained, updated, or kept in parity with NaviWriter Pro. Its single-file package embeds application code and large parser, PDF, and OCR assets, so it may start more slowly, use more memory, or encounter browser and worker limitations that are not present in the maintained multi-file build.

**Mitigation:** Use NaviWriter Pro. Treat any remaining Portable download as an archived legacy release only, and migrate important projects through verified backups before relying on the maintained build.

## Accepted Native Browser UI

Some workflows still use browser-provided prompts or platform-native controls. These may include numeric entry for selected table operations, dropdowns, date inputs, color inputs, file selection, and print or Save as PDF interfaces. Their appearance can vary by browser and operating system.

**Status:** Accepted minor UI debt for v42.0.0. Native controls remain because the current workflows function and the remaining visual differences are not release blockers.

**Mitigation:** Use a supported Chromium-based browser. If a native prompt causes a reproducible usability, accessibility, or data-safety problem, report that specific workflow for a focused maintenance fix.

## Modal Action Sizing

Focused confirmation dialogs use larger action buttons than ordinary Inspector controls. The larger sizing emphasizes the small set of available decisions, especially destructive actions such as Delete.

**Status:** Intentional interface hierarchy, not a known defect.

## Feature Limitations

- EPUB export is not included.
- There is no hosted sync service or server backend.
- There is no active multi-user collaboration.
- OCR language coverage depends on the recognition data bundled with the release.
- Multi-document Replace All is intentionally disabled.
- Workspace Arrangement and Panel Sizes apply only to Desktop mode. Compact and Mobile use dedicated responsive shells.
- Some prompts and form controls retain browser-native presentation and may vary by device or browser.
- Remaining native-dialog and control styling is accepted minor UI debt for v42.0.0.

## Portable Edition Status

NaviWriter Portable v42.0.0 is discontinued. It is no longer supported, maintained, updated, or kept in parity with NaviWriter Pro. If the Portable file remains available, it is provided only as an archived legacy release and may lack current fixes, features, compatibility updates, and documentation changes.

NaviWriter Pro is the maintained source of truth. Future fixes and development should target the verified multi-file source rather than the discontinued Portable build.

## Resolved During the v42.0.0 Cycle

The following areas received substantial repair or completion before release:

- Retained-source Reader architecture
- Reader and PDF toolbar overlap and alignment
- Draggable, resizable, collapsible, and multi-panel Reader windows
- Mobile Reader bottom-sheet restore behavior
- Persistent highlights, notes, unresolved states, and highlight search
- Local OCR for scanned PDFs and images
- OCR confidence, coordinates, fingerprinting, caching, and invalidation
- Markdown Source and Rendered modes
- Code line numbers and Copy with Source
- Find / Replace Match Case and Exact Word options
- Unified current, descendants, root-tree, and project writing scopes
- Correct branch and root-tree Find navigation
- Portable parity packaging
- Final JavaScript, stylesheet, HTML-reference, and archive-integrity checks

## Reporting a New Issue

When reporting a bug, include the browser, operating system, selected interface layout, workspace arrangement if using Desktop, exact steps, expected behavior, actual behavior, whether the issue occurs in NaviWriter Pro or in an archived Portable build, and whether the problem persists after a hard refresh. Export a project backup before testing destructive reproduction steps.
