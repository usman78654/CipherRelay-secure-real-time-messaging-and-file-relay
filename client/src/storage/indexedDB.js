/**
 * IndexedDB wrapper for securely storing private/public keys.
 * Only structure provided. Implement your own IndexedDB logic.
 */

const DB_NAME = "secureChatDB";
const STORE = "keys";

// Open DB
export const openDB = () => {
  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
  });
};

// Save keys
export const saveKeys = async (id, publicKey, privateKey) => {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  await new Promise((resolve, reject) => {
    const req = tx.objectStore(STORE).put({ id, publicKey, privateKey });
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
};

export const deleteKeys = async (id) => {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
};

// Load keys
export const loadKeys = async (id) => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);

    req.onsuccess = () => resolve(req.result);
  });
};
