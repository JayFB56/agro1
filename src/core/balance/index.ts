

const TRY_PATHS = [
  "/data"
];

export type DownloadResult = {
  ok: boolean;
  text?: string;
  url?: string;
  status?: number;
  errorType?: "network" | "cors" | "invalid" | "http" | "other";
  error?: any;
};

/* ===========================
   Helper: Timeout Wrapper
   =========================== */
function promiseTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(v => {
      clearTimeout(t);
      resolve(v);
    }).catch(e => {
      clearTimeout(t);
      reject(e);
    });
  });
}

/* ===========================
   1. Native HTTP (Capacitor)
   Intento prioritario para Móvil (evita CORS)
   =========================== */
async function nativeHttpGet(
  url: string,
  timeoutMs: number
): Promise<{ ok: boolean; text?: string; status?: number }> {

  const { CapacitorHttp } = await import("@capacitor/core");

  const options = {
    url,
    method: 'GET',
    connectTimeout: 15000,
    readTimeout: 15000,
    headers: {
      'Accept': 'text/plain, application/json', 
    },
  };

  const res = await CapacitorHttp.request(options);

  const data = res.data;
  const text = typeof data === "object" ? JSON.stringify(data) : String(data ?? "");

  return {
    ok: res.status >= 200 && res.status < 300,
    text: text.trim(),
    status: res.status
  };
}

/* ===========================
   2. Web Fetch (Fallback)
   =========================== */
async function fetchGet(
  url: string,
  timeoutMs: number
): Promise<{ ok: boolean; text?: string; status?: number }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await res.text();

    return {
      ok: res.ok,
      text,
      status: res.status
    };
  } finally {
    clearTimeout(id);
  }
}

/* ===========================
   Lógica Principal de Descarga
   =========================== */
export async function downloadFromHost(
  host: string,
  timeoutMs = 10000
): Promise<DownloadResult> {
  let lastErr: any = null;
  const baseUrl = host.replace(/\/+$/, "");

  for (const path of TRY_PATHS) {
    const url = baseUrl + path;

    // --- PASO 1: Intentar HTTP Nativo (Sin preguntar plataforma) ---
    try {
      const res = await nativeHttpGet(url, timeoutMs);
      if (res.ok && res.text && res.text.trim().length > 0) {
        return { ok: true, text: res.text, url, status: res.status };
      }

    } catch (e) {

    }

    // --- PASO 2: Fallback Web Fetch ---
    try {
      const res = await fetchGet(url, timeoutMs);
      if (res.ok && res.text && res.text.trim().length > 0) {
        return { ok: true, text: res.text, url, status: res.status };
      }

      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
      }
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();

      if (/timeout|network|failed to fetch/i.test(msg)) {
        lastErr = { type: "network", error: e };
      } else if (/cors|access-control/i.test(msg)) {
        lastErr = { type: "cors", error: e };
      } else {
        lastErr = { type: "other", error: e };
      }
    }
  }

  const finalErr = lastErr?.error || lastErr;
  const finalType = lastErr?.type || "other";

  return { ok: false, errorType: finalType, error: finalErr };
}

export async function confirmHost(host: string, timeoutMs = 5000): Promise<boolean> {
  const res = await downloadFromHost(host, timeoutMs);
  return res.ok;
}