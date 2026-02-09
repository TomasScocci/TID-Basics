
const DB_NAME = 'TID_Assets_DB';
const STORE_NAME = 'models';
const KEY_MASTER = 'master_glb';
const KEY_CURRENT = 'current_glb';
const DB_VERSION = 1;

/**
 * Opens (or creates) the IndexedDB database.
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * GENERIC: Save a Blob with a specific key
 */
const saveBlob = async (key: string, file: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(file, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * GENERIC: Get a Blob by key
 */
const getBlob = async (key: string): Promise<Blob | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result ? (request.result as Blob) : null);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * GENERIC: Delete by key
 */
const deleteBlob = async (key: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- MASTER TEMPLATE (AI PIPELINE) ---
export const saveMasterModel = (file: Blob) => saveBlob(KEY_MASTER, file);
export const getMasterModel = () => getBlob(KEY_MASTER);
export const clearMasterModel = () => deleteBlob(KEY_MASTER);

// --- CURRENT ACTIVE MODEL (DISPLAY) ---
export const saveCurrentModel = (file: Blob) => saveBlob(KEY_CURRENT, file);
export const getCurrentModel = () => getBlob(KEY_CURRENT);
export const clearCurrentModel = () => deleteBlob(KEY_CURRENT);
