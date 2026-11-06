export interface StoredPdfFile {
  id: string;
  name: string;
  size: number;
  addedAt: number;
  data: ArrayBuffer;
}

const DB_NAME = 'HendeseNegarOfflineDB';
const DB_VERSION = 1;
const STORE_PDFS = 'pdfs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PDFS)) {
        db.createObjectStore(STORE_PDFS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalPdfToIndexedDB(file: File): Promise<StoredPdfFile> {
  const buffer = await file.arrayBuffer();
  const entry: StoredPdfFile = {
    id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    size: file.size,
    addedAt: Date.now(),
    data: buffer,
  };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PDFS, 'readwrite');
    tx.objectStore(STORE_PDFS).put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

export async function listStoredPdfs(): Promise<Omit<StoredPdfFile, 'data'>[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PDFS, 'readonly');
      const req = tx.objectStore(STORE_PDFS).getAll();
      req.onsuccess = () => {
        const list = (req.result as StoredPdfFile[]).map(({ id, name, size, addedAt }) => ({
          id,
          name,
          size,
          addedAt,
        }));
        resolve(list.sort((a, b) => b.addedAt - a.addedAt));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function getStoredPdfById(id: string): Promise<StoredPdfFile | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PDFS, 'readonly');
      const req = tx.objectStore(STORE_PDFS).get(id);
      req.onsuccess = () => resolve((req.result as StoredPdfFile) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteStoredPdfById(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PDFS, 'readwrite');
      tx.objectStore(STORE_PDFS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}
