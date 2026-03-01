import "./App.css";

import { useEffect, useState } from "react";
import RegistroTable, { Registro } from "./components/RegistroTable";
import DataService from "./core/dataService";

const DATA_HOST = "http://192.168.4.1";

const App = () => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { loadRecords } = await import("./utils/dataStore");
      const stored = await loadRecords();
      if (mounted) setRegistros(stored);

      const storage = (await import("./core/storage")).default;
      const all = await storage.getAll();
      const pend = all.filter((s: any) => s.status === "pending").length;
      if (mounted) setPendingCount(pend);
    })();

    return () => { mounted = false; };
  }, []);

  const descargarRegistros = async () => {
    setMessage(null);
    setLoading(true);

    try {
      const result = await DataService.fetchData(DATA_HOST);

      setRegistros(result.all);
      setPendingCount(result.pendingCount);

      setMessage(
        result.added > 0
          ? `Se añadieron ${result.added} registros nuevos.`
          : "No hay registros nuevos."
      );
    } catch (err: any) {
      setMessage(`Error al conectar con Balanza: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell p-4">
      <h1 className="text-2xl font-extrabold mb-6 tracking-tight text-gray-800">
        LecheFácil — Registros
      </h1>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-base font-medium text-gray-700">
          Pendientes:{" "}
          <span className="font-bold text-blue-700">
            {pendingCount}
          </span>
        </div>
      </div>

      {message && (
        <div className="mb-4 text-base text-gray-800 font-medium">
          {message}
        </div>
      )}

      <div className="mb-6 flex items-center gap-4">
        <button
          className="download-btn px-3 py-1 rounded font-semibold"
          onClick={descargarRegistros}
          disabled={loading}
        >
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div className="blank-surface p-4">
        <RegistroTable registros={registros} />
      </div>
    </div>
  );
};

export default App;