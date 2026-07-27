// naviwriter/js/export.js
// js/export.js
// NaviWriter import/export helpers

const NAVIDOC_VERSION = 1;

/**
 * Make a safe filename.
 */
function safeFileName(name = 'Untitled Document') {
  return String(name || 'Untitled Document')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90) || 'Untitled Document';
}

/**
 * Download a blob as a file.
 */
function downloadBlob(blob, filename) {
  const a = document.createElement('a');

  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();

  URL.revokeObjectURL(a.href);
}

/**
 * Create a stable NaviDoc export payload.
 */
function createNaviDocPayload(document) {
  const now = Date.now();

  return {
    app: 'NaviWriter',
    type: 'navidoc',
    version: NAVIDOC_VERSION,
    exportedAt: now,

    document: {
      id: document.id || '',
      title: document.title || 'Untitled Document',
      content: document.content || '<p></p>',
      plainText: document.plainText || '',
      createdAt: document.createdAt || now,
      updatedAt: document.updatedAt || now,
      wordCount: document.wordCount || 0,
      charCount: document.charCount || 0,
      tags: Array.isArray(document.tags) ? document.tags : [],
      folder: document.folder || ''
    }
  };
}

/**
 * Export as .navidoc JSON file.
 */
function exportNaviDoc(document) {
  if (!document) return;

  const payload = createNaviDocPayload(document);

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    {
      type: 'application/json'
    }
  );

  const filename = `${safeFileName(document.title)}.navidoc`;

  downloadBlob(blob, filename);
}

/**
 * Export current document as standalone HTML.
 */
function exportHtml(document) {
  if (!document) return;

  const title = document.title || 'Untitled Document';
  const content = document.content || '<p></p>';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  body {
    max-width: 800px;
    margin: 48px auto;
    padding: 0 24px;
    font-family: Arial, Helvetica, sans-serif;
    line-height: 1.7;
    color: #111827;
    background: #ffffff;
  }

  h1, h2, h3 {
    line-height: 1.25;
  }

  blockquote {
    border-left: 4px solid #8b5cf6;
    padding-left: 1em;
    color: #4b5563;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    border: 1px solid #d1d5db;
    padding: 8px;
  }

  img {
    max-width: 100%;
  }
</style>
</head>
<body>
${content}
</body>
</html>`;

  const blob = new Blob([html], {
    type: 'text/html'
  });

  downloadBlob(blob, `${safeFileName(title)}.html`);
}

/**
 * Export plain text.
 */
function exportTxt(document) {
  if (!document) return;

  const title = document.title || 'Untitled Document';
  const text = document.plainText || htmlToPlainText(document.content || '');

  const blob = new Blob([text], {
    type: 'text/plain'
  });

  downloadBlob(blob, `${safeFileName(title)}.txt`);
}

function safeExportFileName(name) {
  return String(name || 'Untitled')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Untitled';
}

function downloadTextFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], {
    type
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Parse imported file text.
 * Supports:
 * - .navidoc wrapped format
 * - raw old document JSON
 * - plain text fallback
 */
function parseImportedDocument(text, fileName = 'Imported Document') {
  const fallbackTitle = fileName.replace(/\.[^.]+$/, '') || 'Imported Document';

  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  // New wrapped .navidoc format
  if (parsed && parsed.type === 'navidoc' && parsed.document) {
    return normalizeImportedDocument(parsed.document, fallbackTitle);
  }

  // Older direct document object format
  if (parsed && (parsed.content || parsed.title || parsed.plainText)) {
    return normalizeImportedDocument(parsed, fallbackTitle);
  }

  // HTML-ish import
  if (looksLikeHtml(text)) {
    return normalizeImportedDocument(
      {
        title: fallbackTitle,
        content: text,
        plainText: htmlToPlainText(text)
      },
      fallbackTitle
    );
  }

  // Plain text fallback
  return normalizeImportedDocument(
    {
      title: fallbackTitle,
      content: plainTextToHtml(text),
      plainText: text
    },
    fallbackTitle
  );
}

/**
 * Normalize an imported document into NaviWriter's document shape.
 */
function normalizeImportedDocument(input, fallbackTitle = 'Imported Document') {
  const now = Date.now();

  const title = input.title || fallbackTitle || 'Imported Document';
  const content = input.content || plainTextToHtml(input.plainText || '');

  const plainText = input.plainText || htmlToPlainText(content);

  return {
    title,
    content,
    plainText,
    createdAt: input.createdAt || now,
    updatedAt: now,
    wordCount: countWordsFromText(plainText),
    charCount: plainText.length,
    tags: Array.isArray(input.tags) ? input.tags : [],
    folder: input.folder || ''
  };
}

/**
 * Convert plain text to simple HTML paragraphs.
 */
function plainTextToHtml(text = '') {
  const clean = String(text || '');

  if (!clean.trim()) {
    return '<p></p>';
  }

  return clean
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Convert HTML to plain text using the browser.
 */
function htmlToPlainText(html = '') {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.innerText || div.textContent || '';
}

/**
 * Check if text looks like HTML.
 */
function looksLikeHtml(text = '') {
  return /<\/?[a-z][\s\S]*>/i.test(String(text || ''));
}

/**
 * Count words from plain text.
 */
function countWordsFromText(text = '') {
  const clean = String(text)
    .trim()
    .replace(/\s+/g, ' ');

  if (!clean) return 0;

  return clean.split(' ').filter(Boolean).length;
}

/**
 * Escape text for safe HTML output.
 */
function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}
function exportMarkdown(document) {
  if (!document) return;

  const title = document.title || 'Untitled Document';
  const markdown = htmlToMarkdown(document.content || '');

  const blob = new Blob([markdown], {
    type: 'text/markdown'
  });

  downloadBlob(blob, `${safeFileName(title)}.md`);
}

function htmlToMarkdown(html = '') {
  const container = document.createElement('div');
  container.innerHTML = html;

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const tag = node.tagName.toLowerCase();
    const content = Array.from(node.childNodes).map(walk).join('');

    if (tag === 'h1') return `# ${content.trim()}\n\n`;
    if (tag === 'h2') return `## ${content.trim()}\n\n`;
    if (tag === 'h3') return `### ${content.trim()}\n\n`;
    if (tag === 'p') return `${content.trim()}\n\n`;
    if (tag === 'br') return '\n';
    if (tag === 'strong' || tag === 'b') return `**${content}**`;
    if (tag === 'em' || tag === 'i') return `*${content}*`;
    if (tag === 'u') return content;
    if (tag === 's' || tag === 'strike') return `~~${content}~~`;
    if (tag === 'blockquote') return `> ${content.trim()}\n\n`;
    if (tag === 'li') return `- ${content.trim()}\n`;
    if (tag === 'ul' || tag === 'ol') return `${content}\n`;
    if (tag === 'hr') return `---\n\n`;

    if (tag === 'table') {
      return `\n\n${content.trim()}\n\n`;
    }

    if (tag === 'tr') {
      return `${Array.from(node.children).map(cell => cell.innerText.trim()).join(' | ')}\n`;
    }

    if (tag === 'td' || tag === 'th') {
      return node.innerText.trim();
    }

    if (tag === 'img') {
      return `![Image](${node.getAttribute('src') || ''})`;
    }

    if (tag === 'figcaption') {
      return `\n*${content.trim()}*\n\n`;
    }

    return content;
  }

  return Array.from(container.childNodes)
    .map(walk)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function printDocument() {
  window.print();
}

function stripHtmlToText(html = '') {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html || '';

  return wrapper.innerText || '';
}

function combineManuscriptHtml(rootDoc, docs) {
  const parts = docs.map(doc => {
    return `
      <section data-doc-id="${doc.id}" data-doc-type="${doc.docType || ''}">
        ${doc.content || '<p></p>'}
      </section>
    `;
  });

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${rootDoc.title || 'Manuscript'}</title>
        <style>
          body {
            max-width: 760px;
            margin: 40px auto;
            font-family: Georgia, "Times New Roman", serif;
            line-height: 1.7;
            padding: 0 24px;
          }

          section {
            margin-bottom: 3rem;
            page-break-after: always;
          }

          h1, h2, h3 {
            font-family: Arial, Helvetica, sans-serif;
          }
        </style>
      </head>
      <body>
        ${parts.join('\n')}
      </body>
    </html>
  `;
}

function exportManuscriptHtml(rootDoc, docs) {
  const html = combineManuscriptHtml(rootDoc, docs);

  downloadTextFile(
    `${safeExportFileName(rootDoc.title || 'Manuscript')}.html`,
    html,
    'text/html'
  );
}

function exportManuscriptTxt(rootDoc, docs) {
  const text = docs
    .map(doc => stripHtmlToText(doc.content || ''))
    .filter(Boolean)
    .join('\n\n\n');

  downloadTextFile(
    `${safeExportFileName(rootDoc.title || 'Manuscript')}.txt`,
    text,
    'text/plain'
  );
}

function exportManuscriptMarkdown(rootDoc, docs) {
  const markdown = docs
    .map(doc => {
      const title = doc.title || 'Untitled';
      const text = stripHtmlToText(doc.content || '');

      return `# ${title}\n\n${text}`;
    })
    .join('\n\n---\n\n');

  downloadTextFile(
    `${safeExportFileName(rootDoc.title || 'Manuscript')}.md`,
    markdown,
    'text/markdown'
  );
}

function escapeXml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function htmlToDocxParagraphs(html = '') {
  const container = document.createElement('div');
  container.innerHTML = html || '';

  const blocks = [];

  function textFromNode(node) {
    return node.innerText || node.textContent || '';
  }

  Array.from(container.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue.trim();

      if (text) {
        blocks.push({
          style: 'Normal',
          text
        });
      }

      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const tag = node.tagName.toLowerCase();
    const text = textFromNode(node).trim();

    if (!text && tag !== 'hr') return;

    if (tag === 'h1') {
      blocks.push({
        style: 'Heading1',
        text
      });
      return;
    }

    if (tag === 'h2') {
      blocks.push({
        style: 'Heading2',
        text
      });
      return;
    }

    if (tag === 'h3') {
      blocks.push({
        style: 'Heading3',
        text
      });
      return;
    }

    if (tag === 'blockquote') {
      blocks.push({
        style: 'Quote',
        text
      });
      return;
    }

    if (tag === 'li') {
      blocks.push({
        style: 'Normal',
        text: `• ${text}`
      });
      return;
    }

    if (tag === 'table') {
      blocks.push({
        style: 'Normal',
        text
      });
      return;
    }

    if (tag === 'img') {
      blocks.push({
        style: 'Normal',
        text: '[Image omitted in DOCX export]'
      });
      return;
    }

    if (tag === 'figure') {
      const figureText = text || '[Image omitted in DOCX export]';

      blocks.push({
        style: 'Normal',
        text: figureText
      });
      return;
    }

    blocks.push({
      style: 'Normal',
      text
    });
  });

  if (!blocks.length) {
    blocks.push({
      style: 'Normal',
      text: ''
    });
  }

  return blocks;
}

function buildDocxDocumentXml(documentTitle, html, options = {}) {
  const includeTitlePage = Boolean(options.includeTitlePage);

  const blocks = includeTitlePage
    ? [
        {
          style: 'Title',
          text: documentTitle || 'Untitled Document'
        },
        ...htmlToDocxParagraphs(html)
      ]
    : htmlToDocxParagraphs(html);

  const paragraphs = blocks.map(block => {
    const styleXml =
      block.style && block.style !== 'Normal'
        ? `<w:pPr><w:pStyle w:val="${block.style}"/></w:pPr>`
        : '';

    return `
      <w:p>
        ${styleXml}
        <w:r>
          <w:t xml:space="preserve">${escapeXml(block.text)}</w:t>
        </w:r>
      </w:p>
    `;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function buildDocxStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="36"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Quote">
    <w:name w:val="Quote"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:ind w:left="720"/></w:pPr>
    <w:rPr><w:i/></w:rPr>
  </w:style>
</w:styles>`;
}

async function exportDocx(document) {
  if (!document) return;

  if (!window.JSZip) {
    alert('DOCX export tools are not loaded.');
    return;
  }

  const zip = new JSZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`);

  zip.folder('word').file(
  'document.xml',
  buildDocxDocumentXml(
    document.title || 'Untitled Document',
    document.content || '<p></p>',
    {
      includeTitlePage: false
    }
  )
);

  zip.folder('word').file(
    'styles.xml',
    buildDocxStylesXml()
  );

  zip.folder('word').folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  downloadBlob(
    blob,
    `${safeFileName(document.title || 'Untitled Document')}.docx`
  );
}

const NAVIWRITER_BACKUP_VERSION = 1;

async function createProjectBackupPayload() {
  if (!window.NaviStorage) {
    throw new Error('NaviStorage is not available.');
  }

  const documents = await NaviStorage.getAllDocuments();

  const settings = NaviStorage.getAllSettings
    ? await NaviStorage.getAllSettings()
    : [];

  let snapshots = [];

  if (NaviStorage.getAllSnapshots) {
    try {
      snapshots = await NaviStorage.getAllSnapshots();
    } catch (error) {
      console.warn(
        'Snapshots could not be included in backup/project file.',
        error
      );

      snapshots = [];
    }
  }

  return {
    app: 'NaviWriter',
    type: 'naviwriter-project-backup',
    version: NAVIWRITER_BACKUP_VERSION,
    exportedAt: Date.now(),
    documents,
    settings,
    snapshots
  };
}

async function createProjectFilePayload() {
  const payload = await createProjectBackupPayload();

  return {
    ...payload,
    type: 'naviwriter-project-file',
    savedAt: Date.now()
  };
}

async function exportProjectBackup() {
  const payload = await createProjectBackupPayload();

  const date = new Date(payload.exportedAt)
    .toISOString()
    .slice(0, 10);

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    {
      type: 'application/json'
    }
  );

  downloadBlob(
    blob,
    `NaviWriter Backup ${date}.naviwriter-backup`
  );
}

function validateProjectBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backup file is empty or invalid.');
  }

  if (payload.app !== 'NaviWriter') {
    throw new Error('This does not look like a NaviWriter backup.');
  }

  const supportedTypes = [
  'naviwriter-project-backup',
  'naviwriter-project-file'
];

if (!supportedTypes.includes(payload.type)) {
  throw new Error('Unsupported NaviWriter project file type.');
}

  if (!Array.isArray(payload.documents)) {
    throw new Error('Backup does not contain a document list.');
  }

  return true;
}

async function importProjectBackupText(text, options = {}) {
  const payload = JSON.parse(text);

  validateProjectBackupPayload(payload);

  const replaceExisting = Boolean(options.replaceExisting);

  if (replaceExisting) {
    await NaviStorage.clearAllDocuments();
  }

  const now = Date.now();

  const importedDocuments = payload.documents.map(doc => {
    return {
      ...doc,
      id: replaceExisting
        ? doc.id
        : (crypto.randomUUID ? crypto.randomUUID() : `doc-${now}-${Math.random()}`),
      originalImportedId: replaceExisting ? undefined : doc.id,
      importedAt: now,
      updatedAt: now
    };
  });

  if (!replaceExisting) {
    const idMap = new Map();

    payload.documents.forEach((oldDoc, index) => {
      idMap.set(oldDoc.id, importedDocuments[index].id);
    });

    importedDocuments.forEach(doc => {
      if (doc.parentId && idMap.has(doc.parentId)) {
        doc.parentId = idMap.get(doc.parentId);
      }
    });
  }

  await NaviStorage.importDocuments(importedDocuments);
  
  if (Array.isArray(payload.snapshots) && NaviStorage.importSnapshots) {
  try {
    const idMap = new Map();

    payload.documents.forEach((oldDoc, index) => {
      if (importedDocuments[index]) {
        idMap.set(oldDoc.id, importedDocuments[index].id);
      }
    });

    const importedSnapshots = payload.snapshots.map(snapshot => {
      return {
        ...snapshot,
        id: replaceExisting
          ? snapshot.id
          : (crypto.randomUUID ? crypto.randomUUID() : `snapshot-${now}-${Math.random()}`),
        documentId:
          !replaceExisting && idMap.has(snapshot.documentId)
            ? idMap.get(snapshot.documentId)
            : snapshot.documentId,
        importedAt: now
      };
    });

    await NaviStorage.importSnapshots(importedSnapshots);
  } catch (error) {
    console.warn(
      'Snapshots could not be imported from project file.',
      error
    );
  }
}

  if (replaceExisting && Array.isArray(payload.settings) && NaviStorage.importSettings) {
    await NaviStorage.importSettings(payload.settings);
  }

  return {
    documents: importedDocuments,
    settings: payload.settings || []
  };
}

/**
 * Expose export API globally.
 */
window.NaviExport = {
  exportNaviDoc,
  exportHtml,
  exportTxt,
  parseImportedDocument,
  normalizeImportedDocument,
  plainTextToHtml,
  htmlToPlainText,
  safeFileName,
  exportMarkdown,
  htmlToMarkdown,
  printDocument,
  exportManuscriptHtml,
exportManuscriptTxt,
exportManuscriptMarkdown,
  exportProjectBackup,
importProjectBackupText,
exportDocx,
  createProjectBackupPayload,
createProjectFilePayload,
};