// naviwriter/js/storage.js
// js/storage.js
// NaviWriter IndexedDB storage layer

const NAVI_DB_NAME = 'NaviWriterDB';
const NAVI_DB_VERSION = 2;
const STORE_DOCUMENTS = 'documents';
const STORE_SETTINGS = 'settings';
const STORE_SNAPSHOTS = 'snapshots';

let naviDb = null;

/**
 * Open or create the NaviWriter IndexedDB database.
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (naviDb) {
      resolve(naviDb);
      return;
    }

    const request = indexedDB.open(NAVI_DB_NAME, NAVI_DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      naviDb = request.result;
      resolve(naviDb);
    };

    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
  const snapshotStore = db.createObjectStore(STORE_SNAPSHOTS, {
    keyPath: 'id'
  });

  snapshotStore.createIndex('documentId', 'documentId', {
    unique: false
  });

  snapshotStore.createIndex('createdAt', 'createdAt', {
    unique: false
  });
}

      if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
        const documentStore = db.createObjectStore(STORE_DOCUMENTS, {
          keyPath: 'id'
        });

        documentStore.createIndex('title', 'title', {
          unique: false
        });

        documentStore.createIndex('updatedAt', 'updatedAt', {
          unique: false
        });

        documentStore.createIndex('createdAt', 'createdAt', {
          unique: false
        });
      }

      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, {
          keyPath: 'key'
        });
      }
    };
  });
}

/**
 * Generate a safe unique document ID.
 */
function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Create a new blank document object.
 */
function createBlankDocument(title = 'Untitled Document') {
  const now = Date.now();

  return {
  id: createId(),
  title,
  content: '<p></p>',
  plainText: '',
  createdAt: now,
  updatedAt: now,
  wordCount: 0,
  charCount: 0,
  tags: [],
  folder: '',
    status: 'Drafting',
pov: '',
location: '',
timeline: '',
characters: '',
summary: '',
  parentId: null,
  docType: 'standard',
  order: now
};
}

/**
 * Save a full document object into IndexedDB.
 */
async function saveDocument(document) {
  const db = await openDatabase();

  const updatedDocument = {
    ...document,
    updatedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORE_DOCUMENTS);

    const request = store.put(updatedDocument);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(updatedDocument);
    };
  });
}

/**
 * Create and save a new document.
 */
async function createDocument(title = 'Untitled Document') {
  const document = createBlankDocument(title);
  return await saveDocument(document);
}

/**
 * Get one document by ID.
 */
async function getDocument(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORE_DOCUMENTS);

    const request = store.get(id);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
}

/**
 * Get all documents, newest edited first.
 */
async function getAllDocuments() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORE_DOCUMENTS);

    const request = store.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const documents = request.result || [];

      documents.sort((a, b) => {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });

      resolve(documents);
    };
  });
}

/**
 * Delete one document by ID.
 */
async function deleteDocument(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORE_DOCUMENTS);

    const request = store.delete(id);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(true);
    };
  });
}

/**
 * Rename one document.
 */
async function renameDocument(id, newTitle) {
  const document = await getDocument(id);

  if (!document) {
    throw new Error('Document not found.');
  }

  const renamedDocument = {
    ...document,
    title: newTitle.trim() || 'Untitled Document',
    updatedAt: Date.now()
  };

  return await saveDocument(renamedDocument);
}

/**
 * Duplicate a document.
 */
async function duplicateDocument(id) {
  const original = await getDocument(id);

  if (!original) {
    throw new Error('Document not found.');
  }

  const now = Date.now();

  const duplicate = {
    ...original,
    id: createId(),
    title: `${original.title || 'Untitled Document'} Copy`,
    createdAt: now,
    updatedAt: now
  };

  return await saveDocument(duplicate);
}

/**
 * Search documents by title or plain text.
 */
async function searchDocuments(query) {
  const documents = await getAllDocuments();
  const q = String(query || '').trim().toLowerCase();

  if (!q) {
    return documents;
  }

  return documents.filter(document => {
    return [
      document.title,
      document.plainText,
      document.folder,
      ...(document.tags || [])
    ]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(q));
  });
}

/**
 * Save a setting.
 */
async function saveSetting(key, value) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);

    const request = store.put({
      key,
      value,
      updatedAt: Date.now()
    });

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(value);
    };
  });
}

/**
 * Load a setting.
 */
async function getSetting(key, fallback = null) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const store = tx.objectStore(STORE_SETTINGS);

    const request = store.get(key);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      if (!request.result) {
        resolve(fallback);
        return;
      }

      resolve(request.result.value);
    };
  });
}

/**
 * Delete a setting.
 */
async function deleteSetting(key) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);

    const request = store.delete(key);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(true);
    };
  });
}

/**
 * Clear all documents.
 * Not used by default, but useful later for app reset tools.
 */
async function clearAllDocuments() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORE_DOCUMENTS);

    const request = store.clear();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(true);
    };
  });
}

/**
 * Clear everything in the database.
 */
async function clearDatabase() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_DOCUMENTS, STORE_SETTINGS], 'readwrite');

    const documents = tx.objectStore(STORE_DOCUMENTS);
    const settings = tx.objectStore(STORE_SETTINGS);

    documents.clear();
    settings.clear();

    tx.onerror = () => {
      reject(tx.error);
    };

    tx.oncomplete = () => {
      resolve(true);
    };
  });
}

async function createSnapshot(document, name = '') {
  if (!document || !document.id) {
    throw new Error('Cannot snapshot missing document.');
  }

  const db = await openDatabase();
  const now = Date.now();

  const snapshot = {
    id: createId(),
    documentId: document.id,
    name: name || `Snapshot ${new Date(now).toLocaleString()}`,
    createdAt: now,

    title: document.title || 'Untitled Document',
    content: document.content || '<p></p>',
    plainText: document.plainText || '',
    wordCount: document.wordCount || 0,
    charCount: document.charCount || 0,
    board: document.board || null,

    docType: document.docType || 'standard',
    folder: document.folder || '',
    tags: Array.isArray(document.tags) ? document.tags : []
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    const store = tx.objectStore(STORE_SNAPSHOTS);
    const request = store.put(snapshot);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(snapshot);
    };
  });
}

async function getSnapshot(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
    const store = tx.objectStore(STORE_SNAPSHOTS);
    const request = store.get(id);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
}

async function getDocumentSnapshots(documentId) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
    const store = tx.objectStore(STORE_SNAPSHOTS);
    const index = store.index('documentId');
    const request = index.getAll(documentId);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const snapshots = request.result || [];

      snapshots.sort((a, b) => {
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

      resolve(snapshots);
    };
  });
}

async function deleteSnapshot(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    const store = tx.objectStore(STORE_SNAPSHOTS);
    const request = store.delete(id);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(true);
    };
  });
}

async function deleteSnapshotsForDocument(documentId) {
  const snapshots = await getDocumentSnapshots(documentId);

  for (const snapshot of snapshots) {
    await deleteSnapshot(snapshot.id);
  }

  return true;
}

async function getAllSettings() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const store = tx.objectStore(STORE_SETTINGS);
    const request = store.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result || []);
    };
  });
}

async function importDocuments(documents = []) {
  if (!Array.isArray(documents)) {
    throw new Error('Backup documents must be an array.');
  }

  const saved = [];

  for (const document of documents) {
    if (!document || !document.id) continue;

    saved.push(await saveDocument(document));
  }

  return saved;
}

async function importSettings(settings = []) {
  if (!Array.isArray(settings)) {
    return [];
  }

  const saved = [];

  for (const item of settings) {
    if (!item || !item.key) continue;

    await saveSetting(item.key, item.value);
    saved.push(item.key);
  }

  return saved;
}

async function getAllSnapshots() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
    const store = tx.objectStore(STORE_SNAPSHOTS);
    const request = store.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result || []);
    };
  });
}

async function importSnapshots(snapshots = []) {
  if (!Array.isArray(snapshots)) {
    return [];
  }

  const db = await openDatabase();
  const saved = [];

  for (const snapshot of snapshots) {
    if (!snapshot || !snapshot.id || !snapshot.documentId) continue;

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const request = store.put(snapshot);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        saved.push(snapshot);
        resolve(snapshot);
      };
    });
  }

  return saved;
}

/**
 * Expose storage API globally.
 * This keeps the app simple without bundlers/modules.
 */
window.NaviStorage = {
  openDatabase,
  createDocument,
  createBlankDocument,
  saveDocument,
  getDocument,
  getAllDocuments,
  deleteDocument,
  renameDocument,
  duplicateDocument,
  searchDocuments,
  saveSetting,
  getSetting,
  deleteSetting,
  clearAllDocuments,
  clearDatabase,
  createSnapshot,
getSnapshot,
getDocumentSnapshots,
deleteSnapshot,
deleteSnapshotsForDocument,
  getAllSettings,
importDocuments,
importSettings,
  getAllSnapshots,
importSnapshots
};