import { Preferences } from "@capacitor/preferences";
import { StoredRegistro, Registro, StorageStatus, WriteResult } from "../types";
import { getAllRecords, addRecords } from "../../utils/db";

const INDEX_KEY = "registros:index";
const ITEM_KEY_PREFIX = "registros:";

// --- MEJORA 1: Wrapper unificado para Preferences ---
// Esto evita repetir try/catch en cada función y maneja la disponibilidad del plugin.
const SafeStorage = {
  async get(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (e) {
      // Si falla Capacitor, se intenta fallback
      return fallbackGet(key);
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch (e) {
      await fallbackSet(key, value);
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (e) {
      console.warn("Storage remove failed (no-op in fallback)", e);
    }
  }
};

// --- Lógica de Fallback ---
async function fallbackGet(key: string): Promise<string | null> {
  try {
    const all = await getAllRecords();
    if (!all || all.length === 0) return null;
    
    // Extraemos el UID si la key tiene prefijo
    const uidKey = key.startsWith(ITEM_KEY_PREFIX) ? key.slice(ITEM_KEY_PREFIX.length) : null;
    
    // Si buscamos el INDEX_KEY, no lo encontraremos en registros individuales de DB habituales
    if (key === INDEX_KEY) return null; 
    
    if (!uidKey) return null;
    const found = all.find((r: any) => (r.uid === uidKey) || (String(r.id) === uidKey));
    return found ? JSON.stringify(found) : null;
  } catch (err) {
    return null;
  }
}

async function fallbackSet(key: string, value: string): Promise<void> {
  try {
    const uidKey = key.startsWith(ITEM_KEY_PREFIX) ? key.slice(ITEM_KEY_PREFIX.length) : null;
    // Solo guardamos si es un registro, no el índice (el índice no suele guardarse en fallback DB relacional)
    if (uidKey) {
      const obj = JSON.parse(value);
      await addRecords([obj]);
    }
  } catch (err) {
    console.error("Fallback set failed", err);
    throw err;
  }
}

// --- Utilidades ---

function makeUid(r: Partial<Registro>): string {
  // Asegurar que siempre devuelve string y manejar nulos con seguridad
  if (r.id) return String(r.id);
  return `${r.codigo || "NC"}|${r.fecha || "NF"}|${r.hora || "NH"}`;
}

async function readIndex(): Promise<Record<string, { status: StorageStatus; createdAt: string }>> {
  const raw = await SafeStorage.get(INDEX_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Index corrupted, reseting", e);
    return {};
  }
}

async function writeIndex(index: Record<string, { status: StorageStatus; createdAt: string }>) {
  await SafeStorage.set(INDEX_KEY, JSON.stringify(index));
}

// --- Funciones Exportadas ---

export async function write(records: Registro[] | Registro): Promise<WriteResult> {
  const recs = Array.isArray(records) ? records : [records];
  const index = await readIndex();
  
  let added = 0;
  const ids: string[] = [];
  let skipped = 0;
  let indexDirty = false; 

  const now = new Date().toISOString();

  // Procesamos en serie para asegurar integridad del objeto index local
  for (const r of recs) {
    const uid = makeUid(r);

    if (index[uid]) {
      skipped++;
      continue; 
    }

    const item: StoredRegistro = {
      id: String(r.id ?? uid),
      codigo: r.codigo,
      peso: Number(r.peso) || 0,
      fecha: r.fecha,
      hora: r.hora,
      turno: r.turno ?? "",
      raw: r.raw ?? JSON.stringify(r),
      uid,
      status: "pending",
      createdAt: now,
    };

    try {
      await SafeStorage.set(ITEM_KEY_PREFIX + uid, JSON.stringify(item));
      
      // Actualizamos el índice en memoria
      index[uid] = { status: item.status, createdAt: now };
      ids.push(uid);
      added++;
      indexDirty = true;
    } catch (e) {
      console.error(`Failed to write item ${uid}`, e);
    }
  }

  // Solo escribimos el índice si hubo cambios 
  if (indexDirty) {
    try {
      await writeIndex(index);
    } catch (e) {
      console.error("Failed to update index", e);
    }
  }

  return { added, skipped, ids };
}

export async function getAll(): Promise<StoredRegistro[]> {
  const index = await readIndex();
  const keys = Object.keys(index);
  
  // Promise.all para concurrencia masiva
  // En lugar de esperar uno por uno, lanzamos todas las peticiones a la vez
  const promises = keys.map(async (k) => {
    const raw = await SafeStorage.get(ITEM_KEY_PREFIX + k);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredRegistro;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(promises);
  // Filtramos los nulos
  return results.filter((r): r is StoredRegistro => r !== null);
}

export async function readPending(): Promise<StoredRegistro[]> {
  const index = await readIndex();
  // Filtramos keys primero
  const pendingKeys = Object.entries(index)
    .filter(([, v]) => v.status === "pending")
    .map(([k]) => k);

  // Promise.all aquí también
  const promises = pendingKeys.map(async (uid) => {
    const raw = await SafeStorage.get(ITEM_KEY_PREFIX + uid);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredRegistro;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((r): r is StoredRegistro => r !== null);
}

export async function updateStatus(uid: string, status: StorageStatus): Promise<void> {
  const raw = await SafeStorage.get(ITEM_KEY_PREFIX + uid);
  if (!raw) throw new Error("NotFound");
  
  try {
    const item = JSON.parse(raw) as StoredRegistro;
    
    // Optimización, si el estado es el mismo, no hacemos nada
    if (item.status === status) return;

    item.status = status;
    
    // Ejecutamos en paralelo la escritura del item y la lectura del índice
    // para ganar tiempo, aunque el índice depende de la lectura previa.
    await SafeStorage.set(ITEM_KEY_PREFIX + uid, JSON.stringify(item));
    
    const index = await readIndex();
    if (index[uid]) {
      index[uid].status = status;
      await writeIndex(index);
    }
  } catch (e) {
    console.error("updateStatus failed", uid, e);
    throw e;
  }
}

export async function remove(uid: string): Promise<void> {
  await SafeStorage.remove(ITEM_KEY_PREFIX + uid);
  
  // Leemos índice, borramos entrada y guardamos
  const index = await readIndex();
  if (index[uid]) {
    delete index[uid];
    await writeIndex(index);
  }
}

export default {
  write,
  getAll,
  readPending,
  updateStatus,
  remove,
};