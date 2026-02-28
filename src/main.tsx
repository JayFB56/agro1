import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initializeCapacitor } from "./capacitor-init";

initializeCapacitor();
createRoot(document.getElementById("root")!).render(<App />);
