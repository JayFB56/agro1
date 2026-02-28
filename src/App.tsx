import "./App.css";

import { useEffect, useState } from "react";
import RegistroTable, { Registro } from "./components/RegistroTable";
// import SyncControl from "./components/SyncControl";
import EspConnector from "./core/espConnector";
import DataService from "./core/dataService";
import NetworkStatus from "./core/networkStatus";

const DEFAULT_DATA_HOST = "http://192.168.4.1";

const App = () => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dataHost, setDataHost] = useState(() => {
    return localStorage.getItem("esp32_data_host") || DEFAULT_DATA_HOST;
  });
  const [online, setOnline] = useState<boolean>(EspConnector.isConnected());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [espConnected, setEspConnected] = useState<boolean>(EspConnector.isConnected());

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
    // Estado de conexión ESP
    const unsubEsp = EspConnector.subscribe((v) => {
      setEspConnected(v);
      setOnline(v); // Si está conectado a Balanza, online=true
    });
    return () => { mounted = false; unsubEsp(); };
  }, []);

  // Nueva función usando DataService
  const descargarRegistros = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const result = await DataService.fetchData(dataHost);
      setRegistros(result.all);
      setPendingCount(result.pendingCount);
      setMessage(result.added > 0 ? `Se añadieron ${result.added} registros nuevos.` : "No hay registros nuevos.");
    } catch (err: any) {
      setMessage(`Error: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Conexión a Balanza
  const handleConnectBalanza = async () => {
    setMessage(null);
    setLoading(true);
    try {
      // Simulación: en móvil real, aquí se usaría la API nativa para conectarse a la red WiFi "Balanza" con contraseña "12345678"
      const ok = await EspConnector.connectToBalanza({ ssid: "Balanza", password: "12345678" });
      if (ok) {
        setMessage("Conectado a Balanza");
        setOnline(true);
      } else {
        setMessage("No se pudo conectar a Balanza");
        setOnline(false);
      }
    } catch (err: any) {
      setMessage(`Error: ${err?.message || err}`);
      setOnline(false);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="app-shell p-4">
      <h1 className="text-2xl font-extrabold mb-6 tracking-tight text-gray-800">LecheFácil — Registros</h1>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Ícono de conexión al ESP32 */}
          <span
            className={`transition-opacity duration-300 ${espConnected ? 'opacity-100' : 'opacity-0'} text-green-600`}
            title={espConnected ? "Conectado a Balanza" : "No conectado a Balanza"}
            style={{ fontSize: 28 }}
            aria-label="Conexión a Balanza"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>
          </span>
          <button
            className="btn-primary px-3 py-1 rounded font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
            onClick={handleConnectBalanza}
            disabled={loading || espConnected}
            style={{ minWidth: 160 }}
          >
            {espConnected ? "Conectado" : loading ? "Conectando..." : "Conectar a Balanza"}
          </button>
        </div>
        <div className="flex flex-col sm:items-end gap-1">
          <div className="text-base font-medium text-gray-700">
            Estado de red: <span className={`font-bold ${online ? 'text-green-700' : 'text-red-600'}`}>{online ? "Online" : "Offline"}</span>
          </div>
          <div className="text-base font-medium text-gray-700">
            Pendientes: <span className="font-bold text-blue-700">{pendingCount}</span>
          </div>
        </div>
      </div>

      {message && <div className="mb-4 text-base text-gray-800 font-medium">{message}</div>}

      <div className="mb-6 flex items-center gap-4">
        <button
          className="download-btn px-3 py-1 rounded font-semibold"
          onClick={descargarRegistros}
          disabled={loading}
          title="Iniciar descarga de la balanza"
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
