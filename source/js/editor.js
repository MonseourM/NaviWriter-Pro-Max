// js/editor.js
// NaviWriter editor helpers
// Temporary v1 editor surface using contenteditable.
// Later, this can be swapped for Tiptap without rewriting storage/app logic.
let useTiptap = false;
let editorEl = null;
let titleEl = null;
let saveStatusEl = null;
let wordCountEl = null;
let charCountEl = null;
let selectedImageEl = null;
let imageResizePanel = null;

/**
 * Initialize editor DOM references.
 */
function initEditorElements() {
  editorEl = document.getElementById('editor');
  titleEl = document.getElementById('docTitle');
  saveStatusEl = document.getElementById('saveStatus');
  wordCountEl = document.getElementById('wordCount');
  charCountEl = document.getElementById('charCount');

  if (!editorEl) {
    console.warn('NaviEditor: #editor not found.');
  }

  if (!titleEl) {
    console.warn('NaviEditor: #docTitle not found.');
  }
}

/**
 * Get current editor HTML.
 */
function getEditorHtml() {
  if (useTiptap && window.NaviTiptap) {
    return NaviTiptap.getHtml();
  }

  if (!editorEl) return '';
  return editorEl.innerHTML || '';
}

/**
 * Set editor HTML.
 */
function setEditorHtml(html = '') {
  const safeHtml = html && String(html).trim()
    ? html
    : '<p></p>';

  if (useTiptap && window.NaviTiptap) {
    NaviTiptap.setHtml(safeHtml);
    updateCounts();
    return;
  }

  if (!editorEl) return;

  editorEl.innerHTML = safeHtml;
  updateCounts();
}

/**
 * Get editor plain text.
 */
function getEditorText() {
  if (useTiptap && window.NaviTiptap) {
    return NaviTiptap.getText();
  }

  if (!editorEl) return '';
  return editorEl.innerText || '';
}

/**
 * Get and normalize current document title.
 */
function getEditorTitle() {
  if (!titleEl) return 'Untitled Document';

  const title = titleEl.value.trim();
  return title || 'Untitled Document';
}

/**
 * Set document title field.
 */
function setEditorTitle(title = 'Untitled Document') {
  if (!titleEl) return;
  titleEl.value = title || 'Untitled Document';
}

/**
 * Convert editor state into a document patch object.
 */
function getEditorSnapshot() {
  const text = getEditorText();

  return {
    title: getEditorTitle(),
    content: getEditorHtml(),
    plainText: text,
    wordCount: countWords(text),
    charCount: countCharacters(text)
  };
}

/**
 * Load a document object into editor UI.
 */
function loadDocumentIntoEditor(document) {
  if (!document) {
    setEditorTitle('Untitled Document');
    setEditorHtml('<p></p>');
    setSaveStatus('Ready');
    return;
  }

  setEditorTitle(document.title || 'Untitled Document');
  setEditorHtml(document.content || '<p></p>');
  setSaveStatus('Saved');
  updateCounts();
}

/**
 * Count words in text.
 */
function countWords(text = '') {
  const clean = String(text)
    .trim()
    .replace(/\s+/g, ' ');

  if (!clean) return 0;

  return clean.split(' ').filter(Boolean).length;
}

/**
 * Count characters in text.
 */
function countCharacters(text = '') {
  return String(text || '').length;
}

/**
 * Update visible word and character counts.
 */
function updateCounts() {
  const text = getEditorText();
  const words = countWords(text);
  const chars = countCharacters(text);

  if (wordCountEl) {
    wordCountEl.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
  }

  if (charCountEl) {
    charCountEl.textContent = `${chars} ${chars === 1 ? 'character' : 'characters'}`;
  }

  return {
    words,
    chars
  };
}

/**
 * Set save status text.
 */
function setSaveStatus(status = 'Saved') {
  if (!saveStatusEl) return;

  saveStatusEl.textContent = status;

  saveStatusEl.classList.remove(
    'status-saved',
    'status-saving',
    'status-unsaved',
    'status-error'
  );

  const normalized = String(status).toLowerCase();

  if (normalized.includes('saving')) {
    saveStatusEl.classList.add('status-saving');
  } else if (normalized.includes('unsaved')) {
    saveStatusEl.classList.add('status-unsaved');
  } else if (normalized.includes('error')) {
    saveStatusEl.classList.add('status-error');
  } else {
    saveStatusEl.classList.add('status-saved');
  }
}

/**
 * Run a document.execCommand command.
 * Temporary v1 behavior until Tiptap arrives.
 */
function runCommand(command, value = null) {
  if (useTiptap && window.NaviTiptap) {
    let mappedCommand = null;
    let mappedValue = value;

    if (command === 'bold') {
      mappedCommand = 'bold';
    } else if (command === 'italic') {
      mappedCommand = 'italic';
    } else if (command === 'underline') {
      mappedCommand = 'underline';
    } else if (command === 'strikeThrough') {
      mappedCommand = 'strikeThrough';
    } else if (command === 'insertUnorderedList') {
      mappedCommand = 'bulletList';
    } else if (command === 'insertOrderedList') {
      mappedCommand = 'orderedList';
    } else if (command === 'insertHorizontalRule') {
      mappedCommand = 'horizontalRule';
    } else if (command === 'foreColor') {
      mappedCommand = 'textColor';
    } else if (command === 'hiliteColor') {
      mappedCommand = 'highlightColor';
    } else if (command === 'removeFormat') {
      mappedCommand = 'removeFormat';
    } else if (command === 'undo') {
      mappedCommand = 'undo';
    } else if (command === 'redo') {
      mappedCommand = 'redo';
    } else if (command === 'fontName') {
      mappedCommand = 'fontFamily';
    } else if (command === 'fontSize') {
      mappedCommand = 'fontSize';
      } else if (command === 'inlineComment') {
  mappedCommand = 'inlineComment';
} else if (command === 'removeInlineComment') {
  mappedCommand = 'removeInlineComment';
    } else if (command === 'formatBlock') {
      const block =
        String(value || 'p')
          .replace(/[<>]/g, '')
          .toLowerCase();

      if (block === 'p' || block === 'paragraph') {
        mappedCommand = 'paragraph';
        mappedValue = null;
      } else if (block === 'blockquote') {
        mappedCommand = 'blockquote';
        mappedValue = null;
      } else if (/^h[1-6]$/.test(block)) {
        mappedCommand = 'heading';
        mappedValue = Number(block.replace('h', '')) || 1;
      }
    }

    if (mappedCommand) {
      const worked =
        NaviTiptap.run(mappedCommand, mappedValue);

      if (!worked) {
        console.warn(
          `Tiptap command failed: ${mappedCommand}`,
          mappedValue
        );
      }

      updateCounts();

      window.dispatchEvent(
        new CustomEvent('naviwriter:editor-input')
      );

      return;
    }

    console.warn(
      `Tiptap command not mapped yet: ${command}`,
      value
    );

    return;
  }

  if (!editorEl) return;

  editorEl.focus();

  try {
    document.execCommand(command, false, value);
  } catch (error) {
    console.warn(
      `NaviEditor command failed: ${command}`,
      error
    );
  }

  updateCounts();

  window.dispatchEvent(
    new CustomEvent('naviwriter:editor-input')
  );
}

/**
 * Apply heading/paragraph/blockquote style.
 */
function applyBlock(blockName = 'p') {
  const tag = String(blockName || 'p').toLowerCase();

  if (tag === 'blockquote') {
    runCommand('formatBlock', 'blockquote');
    return;
  }

  if (['p', 'h1', 'h2', 'h3'].includes(tag)) {
    runCommand('formatBlock', tag);
  }
}

/**
 * Clear formatting from selection.
 */
function clearFormatting() {
  runCommand('removeFormat');
}

/**
 * Insert horizontal rule.
 */
function insertHorizontalRule() {
  runCommand('insertHorizontalRule');
}

/**
 * Insert a basic table.
 * Simple v1 table. Real table controls can come later.
 */
function insertBasicTable(rows = 2, cols = 2) {
  const rowCount = Math.max(1, Number(rows) || 2);
  const colCount = Math.max(1, Number(cols) || 2);

  if (useTiptap && window.NaviTiptap?.run) {
    const worked = window.NaviTiptap.run('insertTable', {
      rows: rowCount,
      cols: colCount,
      withHeaderRow: true
    });

    if (!worked) {
      alert('Table tools are not available in the Tiptap editor yet.');
      return;
    }

    updateCounts();
    window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
    return;
  }

  if (!editorEl) return;

  let html = '<table><tbody>';

  for (let r = 0; r < rowCount; r++) {
    html += '<tr>';

    for (let c = 0; c < colCount; c++) {
      html += r === 0
        ? '<th><br></th>'
        : '<td><br></td>';
    }

    html += '</tr>';
  }

  html += '</tbody></table><p></p>';

  runCommand('insertHTML', html);

window.NaviTiptap?.getEditor()?.extensionManager?.extensions?.map(e => e.name);

}

/**
 * Insert plain text safely.
 */
function insertText(text = '') {
  runCommand('insertText', String(text));
}

/**
 * Insert HTML.
 */
function insertHtml(html = '') {
  runCommand('insertHTML', String(html));
}

/**
 * Focus editor.
 */
function focusEditor() {
  if (useTiptap && window.NaviTiptap) {
    NaviTiptap.focus();
    return;
  }

  if (editorEl) {
    editorEl.focus();
  }
}

/**
 * Toggle app focus mode.
 */
function toggleFocusMode() {
  document.body.classList.toggle('focus-mode');

  const isFocus = document.body.classList.contains('focus-mode');

  try {
    localStorage.setItem('naviwriter-focus-mode', isFocus ? 'true' : 'false');
  } catch {}

  return isFocus;
}

/**
 * Load saved focus mode preference.
 */
function loadFocusMode() {
  let enabled = false;

  try {
    enabled = localStorage.getItem('naviwriter-focus-mode') === 'true';
  } catch {
    enabled = false;
  }

  document.body.classList.toggle('focus-mode', enabled);

  return enabled;
}

let savedSelection = null;

function saveSelection() {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  if (editorEl && editorEl.contains(range.commonAncestorContainer)) {
    savedSelection = range.cloneRange();
  }
}

function restoreSelection() {
  if (!savedSelection) return;

  const selection = window.getSelection();

  if (!selection) return;

  selection.removeAllRanges();
  selection.addRange(savedSelection);
}

function getSelectedElement() {
  restoreSelection();

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) return null;

  let node = selection.anchorNode;

  if (!node) return null;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  return node;
}

function getSelectedCell() {
  const node = getSelectedElement();

  if (!node || !editorEl) return null;

  return node.closest('td, th');
}

function getSelectedRow() {
  const cell = getSelectedCell();
  return cell ? cell.closest('tr') : null;
}

function getSelectedTable() {
  const cell = getSelectedCell();
  return cell ? cell.closest('table') : null;
}

function insertTablePrompt() {
  const rows = Number(prompt('Rows?', '3'));
  const cols = Number(prompt('Columns?', '3'));

  if (!Number.isFinite(rows) || !Number.isFinite(cols)) return;
  if (rows < 1 || cols < 1) return;

  insertBasicTable(rows, cols);
}

function addTableRowBelow() {
  if (useTiptap && window.NaviTiptap?.run) {
    const worked = window.NaviTiptap.run('addRowAfter');

    if (!worked) {
      alert('Click inside a table first.');
      return;
    }

    updateCounts();
    window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
    return;
  }

  const row = getSelectedRow();

  if (!row) {
    alert('Click inside a table cell first.');
    return;
  }

  const clone = row.cloneNode(true);

  clone.querySelectorAll('td, th').forEach(cell => {
    cell.innerHTML = '<br>';
  });

  row.after(clone);

  updateCounts();
  window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
}

function deleteTableRow() {
  if (useTiptap && window.NaviTiptap?.run) {
    const worked = window.NaviTiptap.run('deleteRow');

    if (!worked) {
      alert('Click inside a table first.');
      return;
    }

    updateCounts();
    window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
    return;
  }

  const row = getSelectedRow();
  const table = getSelectedTable();

  if (!row || !table) {
    alert('Click inside a table cell first.');
    return;
  }

  const rows = table.querySelectorAll('tr');

  if (rows.length <= 1) {
    table.remove();
  } else {
    row.remove();
  }

  updateCounts();
  window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
}

function addTableColumnRight() {
  if (useTiptap && window.NaviTiptap?.run) {
    const worked = window.NaviTiptap.run('addColumnAfter');

    if (!worked) {
      alert('Click inside a table first.');
      return;
    }

    updateCounts();
    window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
    return;
  }

  const cell = getSelectedCell();
  const table = getSelectedTable();

  if (!cell || !table) {
    alert('Click inside a table cell first.');
    return;
  }

  const cellIndex = Array.from(cell.parentElement.children).indexOf(cell);

  table.querySelectorAll('tr').forEach(row => {
    const cells = Array.from(row.children);
    const referenceCell = cells[cellIndex] || cells[cells.length - 1];
    const newCell = referenceCell.cloneNode(false);

    newCell.innerHTML = '<br>';

    referenceCell.after(newCell);
  });

  updateCounts();
  window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
}

function deleteTableColumn() {
  if (useTiptap && window.NaviTiptap?.run) {
    const worked = window.NaviTiptap.run('deleteColumn');

    if (!worked) {
      alert('Click inside a table first.');
      return;
    }

    updateCounts();
    window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
    return;
  }

  const cell = getSelectedCell();
  const table = getSelectedTable();

  if (!cell || !table) {
    alert('Click inside a table cell first.');
    return;
  }

  const cellIndex = Array.from(cell.parentElement.children).indexOf(cell);

  table.querySelectorAll('tr').forEach(row => {
    const cells = Array.from(row.children);

    if (cells.length <= 1) {
      row.remove();
      return;
    }

    if (cells[cellIndex]) {
      cells[cellIndex].remove();
    }
  });

  if (!table.querySelector('tr')) {
    table.remove();
  }

  updateCounts();
  window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
}

function updateTableColorControlAvailability() {
  const cellBgPicker = document.getElementById('cellBgPicker');
  const cellTextPicker = document.getElementById('cellTextPicker');

  const shouldDisable = Boolean(useTiptap);

  [cellBgPicker, cellTextPicker].forEach(control => {
    if (!control) return;

    control.disabled = shouldDisable;
    control.title = shouldDisable
      ? 'Cell colors are not supported in the Tiptap table editor yet.'
      : '';
    control.classList.toggle('disabled-control', shouldDisable);
  });
}

function setSelectedCellBackground(color) {
  if (useTiptap) {
    console.info('Cell background color is not supported in the Tiptap table editor yet.');
    return;
  }

  const cell = getSelectedCell();

  if (!cell) {
    alert('Click inside a table cell first.');
    return;
  }

  cell.style.backgroundColor = color;

  window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
}

function setSelectedCellTextColor(color) {
  if (useTiptap) {
    console.info('Cell text color is not supported in the Tiptap table editor yet.');
    return;
  }

  const cell = getSelectedCell();

  if (!cell) {
    alert('Click inside a table cell first.');
    return;
  }

  cell.style.color = color;

  window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

async function insertImageFile(file) {
  if (!file) return;

  const dataUrl = await readImageFile(file);

  const caption =
    prompt('Caption? Leave blank if undesired.', '') || '';

  if (useTiptap && window.NaviTiptap?.insertImage) {
    window.NaviTiptap.insertImage(
      dataUrl,
      caption
    );

    if (caption.trim()) {
      window.NaviTiptap.run('paragraph');
      insertText(`\n${caption}`);
    }

    updateCounts();
    window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));

    return;
  }

  const figureHtml = `
    <figure class="image-block">
      ${dataUrl}">
      ${
        caption.trim()
          ? `<figcaption>${escapeHtmlForEditor(caption)}</figcaption>`
          : ''
      }
    </figure>
    <p></p>
  `;

  insertHtml(figureHtml);
}

function escapeHtmlForEditor(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function setupImageResizeTools() {
  if (!editorEl) return;

  if (!imageResizePanel) {
    imageResizePanel = document.createElement('div');
    imageResizePanel.id = 'imageResizePanel';
    imageResizePanel.className = 'image-resize-panel hidden';

    imageResizePanel.innerHTML = `
      <span class="image-resize-label">Image</span>
      <button data-image-width="25%">25%</button>
      <button data-image-width="50%">50%</button>
      <button data-image-width="75%">75%</button>
      <button data-image-width="100%">100%</button>
      <button data-image-width="">Auto</button>
    `;

    document.body.appendChild(imageResizePanel);

    imageResizePanel.addEventListener('click', event => {
      const button = event.target.closest('[data-image-width]');

      if (!button) return;

      event.preventDefault();

      applySelectedImageWidth(
        button.dataset.imageWidth || null
      );
    });
  }

  editorEl.addEventListener('click', event => {
    const image = event.target.closest('img');

    if (image && editorEl.contains(image)) {
      selectImageForResize(image);
      return;
    }

    if (
      imageResizePanel &&
      !event.target.closest('#imageResizePanel')
    ) {
      hideImageResizePanel();
    }
  });

  window.addEventListener('resize', () => {
    if (selectedImageEl) {
      positionImageResizePanel(selectedImageEl);
    }
  });
}

function selectImageForResize(image) {
  if (!image) return;

  if (selectedImageEl) {
    selectedImageEl.classList.remove('selected-editor-image');
  }

  selectedImageEl = image;
  selectedImageEl.classList.add('selected-editor-image');

  positionImageResizePanel(image);
}

function positionImageResizePanel(image) {
  if (!imageResizePanel || !image) return;

  // Show invisibly first so we can measure the real width.
  imageResizePanel.classList.remove('hidden');
  imageResizePanel.style.visibility = 'hidden';
  imageResizePanel.style.left = '0px';
  imageResizePanel.style.top = '0px';

  const rect = image.getBoundingClientRect();
  const panelRect = imageResizePanel.getBoundingClientRect();

  const panelWidth = panelRect.width;
  const panelHeight = panelRect.height;

  let left =
    rect.left + rect.width / 2 - panelWidth / 2;

  let top =
    rect.top - panelHeight - 10;

  left = Math.max(
    8,
    Math.min(window.innerWidth - panelWidth - 8, left)
  );

  if (top < 8) {
    top = rect.bottom + 10;
  }

  top = Math.max(
    8,
    Math.min(window.innerHeight - panelHeight - 8, top)
  );

  imageResizePanel.style.left = `${left}px`;
  imageResizePanel.style.top = `${top}px`;
  imageResizePanel.style.visibility = 'visible';
}

function hideImageResizePanel() {
  if (selectedImageEl) {
    selectedImageEl.classList.remove('selected-editor-image');
  }

  selectedImageEl = null;

  if (imageResizePanel) {
    imageResizePanel.classList.add('hidden');
  }
}

function applySelectedImageWidth(width) {
  if (!selectedImageEl) return;

  const src = selectedImageEl.getAttribute('src');

  if (width) {
    selectedImageEl.setAttribute('data-width', width);
    selectedImageEl.style.width = width;
    selectedImageEl.style.maxWidth = '100%';
    selectedImageEl.style.height = 'auto';
  } else {
    selectedImageEl.removeAttribute('data-width');
    selectedImageEl.removeAttribute('width');
    selectedImageEl.style.width = '';
    selectedImageEl.style.maxWidth = '100%';
    selectedImageEl.style.height = 'auto';
  }

  if (
    useTiptap &&
    window.NaviTiptap?.updateImageWidthBySrc &&
    src
  ) {
    window.NaviTiptap.updateImageWidthBySrc(
      src,
      width
    );
  }

  updateCounts();
  window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));

  positionImageResizePanel(selectedImageEl);
}


/**
 * Setup toolbar controls.
 */
function setupToolbar() {
  const toolbar = document.getElementById('toolbar');

  if (!toolbar) return;

  toolbar.addEventListener('click', event => {
    const button = event.target.closest('button');

    if (!button) return;

    const command = button.dataset.command;
    const value = button.dataset.value;

    if (command) {
      runCommand(command, value || null);
    }
  });

  const paragraphSelect = document.getElementById('paragraphSelect');

  if (paragraphSelect) {
    paragraphSelect.onchange = event => {
      applyBlock(event.target.value);
      paragraphSelect.value = 'p';
    };
  }

  const fontSelect = document.getElementById('fontSelect');

  if (fontSelect) {
    fontSelect.onchange = event => {
      const fontName = event.target.value;

      if (fontName) {
        runCommand('fontName', fontName);
      }
    };
  }

  const fontSizeSelect = document.getElementById('fontSizeSelect');

  if (fontSizeSelect) {
    fontSizeSelect.onchange = event => {
      const size = event.target.value;

      if (size) {
        runCommand('fontSize', size);
      }

      fontSizeSelect.value = '';
    };
  }

  const textColorPicker = document.getElementById('textColorPicker');

  if (textColorPicker) {
    textColorPicker.oninput = event => {
      runCommand('foreColor', event.target.value);
    };
  }

  const highlightColorPicker = document.getElementById('highlightColorPicker');

  if (highlightColorPicker) {
    highlightColorPicker.oninput = event => {
      runCommand('hiliteColor', event.target.value);
    };
  }

  const quoteBtn = document.getElementById('quoteBtn');

  if (quoteBtn) {
    quoteBtn.onclick = () => {
      applyBlock('blockquote');
    };
  }

  const hrBtn = document.getElementById('hrBtn');

  if (hrBtn) {
    hrBtn.onclick = () => {
      insertHorizontalRule();
    };
  }

  const clearFormatBtn = document.getElementById('clearFormatBtn');

  if (clearFormatBtn) {
    clearFormatBtn.onclick = () => {
      clearFormatting();
    };
  }
  const insertTableBtn = document.getElementById('insertTableBtn');

  if (insertTableBtn) {
    insertTableBtn.onclick = () => {
      insertTablePrompt();
    };
  }

  const addRowBtn = document.getElementById('addRowBtn');

  if (addRowBtn) {
    addRowBtn.onclick = () => {
      addTableRowBelow();
    };
  }

  const deleteRowBtn = document.getElementById('deleteRowBtn');

  if (deleteRowBtn) {
    deleteRowBtn.onclick = () => {
      deleteTableRow();
    };
  }

  const addColBtn = document.getElementById('addColBtn');

  if (addColBtn) {
    addColBtn.onclick = () => {
      addTableColumnRight();
    };
  }

  const deleteColBtn = document.getElementById('deleteColBtn');

  if (deleteColBtn) {
    deleteColBtn.onclick = () => {
      deleteTableColumn();
    };
  }

  const cellBgPicker = document.getElementById('cellBgPicker');

  if (cellBgPicker) {
    cellBgPicker.oninput = event => {
      setSelectedCellBackground(event.target.value);
    };
  }

  const cellTextPicker = document.getElementById('cellTextPicker');

  if (cellTextPicker) {
    cellTextPicker.oninput = event => {
      setSelectedCellTextColor(event.target.value);
    };
  }

  const insertImageBtn = document.getElementById('insertImageBtn');
  const imageInput = document.getElementById('imageInput');

  if (insertImageBtn && imageInput) {
    insertImageBtn.onclick = () => {
      imageInput.click();
    };

    imageInput.onchange = async event => {
      const file = event.target.files?.[0];

      if (file) {
        await insertImageFile(file);
      }

      event.target.value = '';
    };
  }
}

/**
 * Setup keyboard shortcuts directly on editor.
 */
function setupEditorShortcuts() {
  if (!editorEl) return;

  editorEl.addEventListener('keydown', event => {
    const mod = event.ctrlKey || event.metaKey;

    if (!mod) return;

    const key = event.key.toLowerCase();

    if (key === 'b') {
      event.preventDefault();
      runCommand('bold');
    }

    if (key === 'i') {
      event.preventDefault();
      runCommand('italic');
    }

    if (key === 'u') {
      event.preventDefault();
      runCommand('underline');
    }

    if (key === 's') {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent('naviwriter:manual-save'));
    }

    if (event.shiftKey && key === 'x') {
      event.preventDefault();
      runCommand('strikeThrough');
    }

    if (event.altKey && key === '1') {
      event.preventDefault();
      applyBlock('h1');
    }

    if (event.altKey && key === '2') {
      event.preventDefault();
      applyBlock('h2');
    }

    if (event.altKey && key === '3') {
      event.preventDefault();
      applyBlock('h3');
    }

    if (event.altKey && key === '0') {
      event.preventDefault();
      applyBlock('p');
    }
  });
}

/**
 * Setup editor input listeners.
 */
function setupEditorInput(onChange) {
  if (!editorEl) return;

  editorEl.addEventListener('keyup', saveSelection);
editorEl.addEventListener('mouseup', saveSelection);
editorEl.addEventListener('focus', saveSelection);

  editorEl.addEventListener('input', () => {
    updateCounts();
    setSaveStatus('Unsaved');

    if (typeof onChange === 'function') {
      onChange();
    }

    window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
  });

  if (titleEl) {
    titleEl.addEventListener('input', () => {
      setSaveStatus('Unsaved');

      if (typeof onChange === 'function') {
        onChange();
      }

      window.dispatchEvent(new CustomEvent('naviwriter:title-input'));
    });
  }
}

/**
 * Initialize editor layer.
 */
async function initEditor(options = {}) {
  initEditorElements();

  const hasTiptap =
    window.NaviTiptapReady &&
    await window.NaviTiptapReady &&
    window.NaviTiptap;

  if (hasTiptap && editorEl) {
    useTiptap = true;

    window.NaviTiptap.initTiptapEditor({
      element: editorEl,
      content: editorEl.innerHTML || '<p></p>',
      onChange(html, text) {
        updateCounts();
        setSaveStatus('Unsaved');

        if (typeof options.onChange === 'function') {
          options.onChange();
        }

        window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
      }
    });

    setupToolbar();
    
updateTableColorControlAvailability();
    setupEditorShortcuts();
    setupEditorInput(options.onChange);
    setupImageResizeTools();
    loadFocusMode();
    updateCounts();

    const engineStatus = document.getElementById('engineStatus');

if (engineStatus) {
  engineStatus.textContent = 'Engine: Tiptap';
  engineStatus.classList.remove('engine-fallback', 'engine-error');
  engineStatus.classList.add('engine-tiptap');
}

    console.log('NaviWriter: Tiptap engine active.');
    return;
  }

  useTiptap = false;

  setupToolbar();
  
updateTableColorControlAvailability();
  setupEditorShortcuts();
  setupEditorInput(options.onChange);
  setupImageResizeTools();
  loadFocusMode();
  updateCounts();

  const engineStatus = document.getElementById('engineStatus');

if (engineStatus) {
  engineStatus.textContent = 'Engine: fallback editor';
  engineStatus.classList.remove('engine-tiptap', 'engine-error');
  engineStatus.classList.add('engine-fallback');
}

  console.log('NaviWriter: contenteditable fallback active.');
}
function getEditorStats() {
  const text = getEditorText();
  const words = countWords(text);
  const chars = countCharacters(text);

  const paragraphs = editorEl
    ? editorEl.querySelectorAll('p, div, li, blockquote').length
    : 0;

  const headings = editorEl
    ? editorEl.querySelectorAll('h1, h2, h3').length
    : 0;

  const readingMinutes = Math.max(1, Math.ceil(words / 225));

  return {
    words,
    chars,
    paragraphs,
    headings,
    readingMinutes
  };
}

function buildOutline() {
  if (!editorEl) return [];

  const headings = Array.from(editorEl.querySelectorAll('h1, h2, h3'));

  return headings.map((heading, index) => {
    if (!heading.id) {
      heading.id = `heading-${Date.now()}-${index}`;
    }

    return {
      id: heading.id,
      text: heading.innerText.trim() || 'Untitled heading',
      level: heading.tagName.toLowerCase()
    };
  });
}

function scrollToHeading(id) {
  const heading = document.getElementById(id);

  if (!heading) return;

  heading.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
}

function replaceAllInEditor(query, replacement) {
  const needle = String(query || '');

  if (!needle) {
    return 0;
  }

  const html = getEditorHtml();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const regex = new RegExp(escaped, 'gi');

  let count = 0;

  const walker = document.createTreeWalker(
    wrapper,
    NodeFilter.SHOW_TEXT,
    null
  );

  const nodes = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  nodes.forEach(node => {
    const original = node.nodeValue || '';

    const next = original.replace(regex, match => {
      count++;
      return replacement || '';
    });

    node.nodeValue = next;
  });

  if (count > 0) {
    setEditorHtml(wrapper.innerHTML);
    updateCounts();
    window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
  }

  return count;
}

function findNextText(query) {
  if (!query || !editorEl) return false;

  editorEl.focus();

  try {
    return window.find(query, false, false, true, false, false, false);
  } catch {
    return false;
  }
}

function replaceCurrentSelection(query, replacement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) return false;

  const selectedText = selection.toString();

  if (!selectedText) return false;

  if (query && selectedText.toLowerCase() !== String(query).toLowerCase()) {
    return false;
  }

  document.execCommand('insertText', false, replacement || '');

  updateCounts();
  window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));

  return true;
}

function replaceAllText(query, replacement) {
  if (!query || !editorEl) return 0;

  const target = String(query);
  const replaceWith = String(replacement || '');

  let count = 0;

  const walker = document.createTreeWalker(
    editorEl,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach(node => {
    const original = node.nodeValue;

    if (!original || !original.includes(target)) return;

    const next = original.split(target).join(replaceWith);

    if (next !== original) {
      count += original.split(target).length - 1;
      node.nodeValue = next;
    }
  });

  if (count > 0) {
    updateCounts();
    window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
  }

  return count;
}
function getFrequentWords(limit = 12) {
  const text = getEditorText().toLowerCase();

  const stopWords = new Set([
    'the','and','but','for','are','was','were','with','that','this','from',
    'you','your','her','his','they','them','she','him','had','has','have',
    'not','all','out','who','what','when','where','why','how','into','over',
    'there','their','then','than','too','very','just','like','said','says',
    'can','could','would','should','will','shall','did','does','done','been',
    'being','about','after','before','because','through'
  ]);

  const words = text
    .replace(/[^a-z0-9'\s-]/gi, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length > 2 && !stopWords.has(word));

  const map = new Map();

  words.forEach(word => {
    map.set(word, (map.get(word) || 0) + 1);
  });

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, count]) => ({ text, count }));
}

function getFrequentPhrases(size = 3, limit = 12) {
  const text = getEditorText().toLowerCase();

  const words = text
    .replace(/[^a-z0-9'\s-]/gi, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length > 2);

  const map = new Map();

  for (let i = 0; i <= words.length - size; i++) {
    const phrase = words.slice(i, i + size).join(' ');

    if (!phrase.trim()) continue;

    map.set(phrase, (map.get(phrase) || 0) + 1);
  }

  return Array.from(map.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, count]) => ({ text, count }));
}

function getHeadingWordCounts() {
  if (!editorEl) return [];

  const blocks = Array.from(editorEl.children);
  const sections = [];
  let current = null;

  blocks.forEach(block => {
    const tag = block.tagName?.toLowerCase();

    if (['h1', 'h2', 'h3'].includes(tag)) {
      current = {
        id: block.id || '',
        title: block.innerText.trim() || 'Untitled heading',
        level: tag,
        words: 0
      };

      if (!block.id) {
        block.id = `heading-${Date.now()}-${sections.length}`;
        current.id = block.id;
      }

      sections.push(current);
      return;
    }

    if (current) {
      current.words += countWords(block.innerText || '');
    }
  });

  return sections;
}

function getEndnoteCount() {
  if (!editorEl) return 0;
  return editorEl.querySelectorAll('.endnotes li').length;
}

function insertEndnote() {
  if (!editorEl) return;

  const noteText = prompt('Endnote text:');

  if (!noteText) return;

  let endnotes = editorEl.querySelector('.endnotes');

  if (!endnotes) {
    editorEl.insertAdjacentHTML(
      'beforeend',
      '<section class="endnotes"><h2>Endnotes</h2><ol></ol></section>'
    );

    endnotes = editorEl.querySelector('.endnotes');
  }

  const list = endnotes.querySelector('ol');
  const number = list.children.length + 1;

  runCommand('insertHTML', `<sup class="endnote-ref">[${number}]</sup>`);

  const item = document.createElement('li');
  item.textContent = noteText;
  list.appendChild(item);

  updateCounts();
  window.dispatchEvent(new CustomEvent('naviwriter:editor-input'));
}

function splitByHeadings() {
  if (!editorEl) return [];

  const blocks = Array.from(editorEl.children);
  const docs = [];
  let current = null;

  blocks.forEach(block => {
    const tag = block.tagName?.toLowerCase();

    if (tag === 'h1' || tag === 'h2') {
      if (current) {
        docs.push(current);
      }

      current = {
        title: block.innerText.trim() || 'Split Document',
        content: block.outerHTML
      };

      return;
    }

    if (current) {
      current.content += block.outerHTML;
    }
  });

  if (current) {
    docs.push(current);
  }

  return docs;
}

/**
 * Expose API globally.
 */
window.NaviEditor = {
  initEditor,
  initEditorElements,

  getEditorHtml,
  setEditorHtml,
  getEditorText,

  getEditorTitle,
  setEditorTitle,
  getEditorSnapshot,
  loadDocumentIntoEditor,

  countWords,
  countCharacters,
  updateCounts,
  getEditorStats,
  buildOutline,
  scrollToHeading,
  findNextText,
  replaceCurrentSelection,
  replaceAllText,
  replaceAllInEditor,

  setSaveStatus,

  runCommand,
  applyBlock,
  clearFormatting,
  insertHorizontalRule,

  insertBasicTable,
  insertTablePrompt,
  addTableRowBelow,
  deleteTableRow,
  addTableColumnRight,
  deleteTableColumn,
  setSelectedCellBackground,
  setSelectedCellTextColor,
  insertImageFile,

  insertText,
  insertHtml,

  focusEditor,
  toggleFocusMode,
  loadFocusMode,

  getFrequentWords,
  getFrequentPhrases,
  getHeadingWordCounts,
  insertEndnote,
  splitByHeadings,
};

