import { Registro } from "../components/RegistroTable";

const DB_NAME = "lechefacil-db";
const STORE_NAME = "registros";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "uid" });
        store.createIndex("by_fecha", "fecha", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllRecords(): Promise<Registro[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as Registro[]);
    req.onerror = () => reject(req.error);
  });
}

export async function addRecords(records: Registro[]): Promise<number> {
  if (!records || records.length === 0) return 0;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    let added = 0;
    tx.oncomplete = () => resolve(added);
    tx.onerror = () => reject(tx.error);
    for (const r of records) {
      try {
        const uid = r.id ?? `${r.codigo}|${r.fecha}|${r.hora}`;
        const item = { ...r, uid };
        // check if exists
        const g = store.get(uid);
        g.onsuccess = () => {
          if (!g.result) {
            const req = store.put(item as any);
            req.onsuccess = () => { added++; };
            req.onerror = (e) => {
              console.warn("addRecords: put failed for", uid, e);
            };
          } else {
            // already exists --> skip
          }
        };
        g.onerror = (e) => {
          // on get error, attempt put as fallback
          const req = store.put(item as any);
          req.onsuccess = () => { added++; };
          req.onerror = (err) => console.warn("addRecords: put fallback failed", uid, err);
        };
      } catch (e) {
        console.warn("addRecords: unexpected error for record", r, e);
      }
    }
  });
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
