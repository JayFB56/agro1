// src/core/dataService.ts
// Clase para manejar la obtención de datos del ESP32
import { loadRecords, addNewRecords } from "../utils/dataStore";
import storage from "./storage";
import { downloadFromHost, confirmHost } from "./balance";

const DEFAULT_DATA_HOST = "http://192.168.4.1";

class DataService {
  async fetchData(dataHost: string = DEFAULT_DATA_HOST) {
    let lastErr: any = null;
    let text: string | null = null;
    try {
      const res = await downloadFromHost(dataHost);
      if (!res.ok) {
        lastErr = res.error || new Error("unknown");
      } else {
        text = res.text ?? null;
      }
    } catch (e) {
      lastErr = e;
    }
    if (!text) {
      throw lastErr || new Error("No se pudo obtener datos");
    }
    const added = await addNewRecords(text);
    if (added > 0) {
      await confirmHost(dataHost);
    }
    const all = await loadRecords();
    const storedAll = await storage.getAll();
    const pendingCount = storedAll.filter((s: any) => s.status === "pending").length;
    return { added, all, pendingCount };
  }
}

export default new DataService();
