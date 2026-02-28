import React, { useState } from "react";
import storage from "../core/storage";
import * as sync from "../core/sync";
import { StoredRegistro } from "../core/types";

const SyncControl: React.FC<{ pending: number; onSynced?: (n: number) => void }> = ({ pending, onSynced }) => {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    const remote = localStorage.getItem("remote_sync_url");
    if (!remote) {
      alert("No hay servidor remoto configurado. Guarda la URL en localStorage con la clave 'remote_sync_url'.");
      return;
    }
    setLoading(true);
    try {
      const sendOne = async (r: StoredRegistro) => {
        try {
          const res = await fetch(remote, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: r.raw || JSON.stringify(r),
          });
          if (res.ok) return { success: true };
          if (res.status >= 500) return { success: false, retryable: true, message: `HTTP ${res.status}` };
          return { success: false, retryable: false, message: `HTTP ${res.status}` };
        } catch (e) {
          return { success: false, retryable: true, message: String(e) };
        }
      };

      const result = await sync.syncPending(sendOne, 2);
      if (onSynced) onSynced(result.sent);
      // update pending count in storage
      const all = await storage.getAll();
      // no direct prop update here; parent will refresh on next network event or action
      alert(`Sync terminado. Enviados: ${result.sent} / ${result.total}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button className="download-btn px-3 py-1 rounded font-semibold" disabled={loading || pending === 0} onClick={handle}>
        {loading ? "Sincronizando..." : `Sincronizar (${pending})`}
      </button>
    </div>
  );
};

export default SyncControl;
