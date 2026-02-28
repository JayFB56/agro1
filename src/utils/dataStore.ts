import { Registro } from "../components/RegistroTable";
import storage from "../core/storage";

// load all registros from persistent storage (source of truth)
export async function loadRecords(): Promise<Registro[]> {
  try {
    const all = await storage.getAll();
    // map StoredRegistro -> Registro
    return all.map((s: any) => ({
      id: s.id,
      codigo: s.codigo,
      peso: s.peso,
      fecha: s.fecha,
      hora: s.hora,
      turno: s.turno,
      raw: s.raw,
    } as Registro));
  } catch (e) {
    console.error("Error loading registros desde storage:", e);
    return [];
  }
}

// saveRecords kept for backward compatibility (writes via storage)
export async function saveRecords(records: Registro[]) {
  try {
    await storage.write(records);
  } catch (e) {
    console.error("Error saving registros:", e);
  }
}

function normalizeLine(line: string) {
  return line.trim();
}

// Accepts JSON, JSONL (newline-delimited JSON), or an object { last_id, records: [...]. }
export async function addNewRecords(text: string): Promise<number> {
  if (!text) return 0;
  // strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  // quick reject if HTML returned
  if (/<<?html|<head|<body/i.test(text)) {
    console.error("addNewRecords: contenido parece HTML, no JSON");
    return 0;
  }

  let incoming: any[] = [];
  // Try parse as single JSON value
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      // flatten one level if response is like [[...]]
      if (parsed.length === 1 && Array.isArray(parsed[0])) incoming = parsed[0];
      else incoming = parsed;
    } else if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.records)) incoming = parsed.records;
      else if (parsed.record) incoming = [parsed.record];
      else incoming = [parsed];
    }
  } catch (e) {
    // not a single JSON value, try JSONL (line per JSON)
    const lines = text.split(/\r?\n/).map(normalizeLine).filter((l) => l.length > 0);
    for (const ln of lines) {
      try {
        const p = JSON.parse(ln);
        incoming.push(p);
      } catch (err) {
        console.warn("addNewRecords: línea no JSON válida, omitiendo", ln);
      }
    }
  }

  if (incoming.length === 0) return 0;

  console.info(`addNewRecords: parsed incoming length=${incoming.length}`);

  // map incoming to Registro[] and deduplicate by uid (codigo|fecha|hora)
  const mapped: Registro[] = incoming.map((item: any) => {
    const uid = item.id ?? `${item.code ?? item.codigo ?? ""}|${item.date ?? item.fecha ?? ""}|${item.time ?? item.hora ?? ""}`;
    return {
      id: String(item.id ?? uid),
      codigo: item.code ?? item.codigo ?? "",
      peso: Number(item.weight ?? item.peso ?? 0) || 0,
      fecha: item.date ?? item.fecha ?? "",
      hora: item.time ?? item.hora ?? "",
      turno: item.turno ?? "",
      raw: JSON.stringify(item),
    } as Registro;
  });

  try {
    // Persist via core storage (idempotent, native storage on device)
    const res = await storage.write(mapped as any);
    return res.added;
  } catch (e) {
    console.error("Error guardando registros en storage:", e);
    return 0;
  }
}
