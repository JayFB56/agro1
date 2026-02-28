import storage from "../storage";
import { StoredRegistro } from "../types";

export type SendResult = {
  success: boolean;
  retryable?: boolean;
  message?: string;
};

// Controlado y simple: intenta enviar todos los pendientes
export async function syncPending(sendOne: (r: StoredRegistro) => Promise<SendResult>, concurrency = 2) {
  const pending = await storage.readPending();
  if (!pending || pending.length === 0) return { total: 0, sent: 0 };

  let sent = 0;
  let total = pending.length;

  // simple concurrency
  const queue = pending.slice();

  const workers = new Array(concurrency).fill(null).map(async () => {
    while (queue.length > 0) {
      const r = queue.shift();
      if (!r) break;
      try {
        // don't process if status changed
        if (r.status !== "pending") continue;
        const res = await sendOne(r);
        if (res.success) {
          await storage.updateStatus(r.uid, "synced");
          sent++;
        } else if (res.retryable) {
          await storage.updateStatus(r.uid, "failed");
          // failed but retryable: leave as failed for future retries; could implement backoff metadata later
        } else {
          await storage.updateStatus(r.uid, "failed");
        }
      } catch (e) {
        console.warn("syncPending: sendOne threw", e);
        try {
          await storage.updateStatus(r.uid, "failed");
        } catch (_) {}
      }
    }
  });

  await Promise.all(workers);
  return { total, sent };
}

export default { syncPending };
