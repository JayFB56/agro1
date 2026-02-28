export type NetworkListener = (online: boolean) => void;

let listeners: NetworkListener[] = [];
let pluginAvailable = false;
let pluginInitialized = false;
let pluginListenerAdded = false;
let windowListenersAdded = false;

async function tryInitPlugin() {
  if (pluginInitialized) return;
  pluginInitialized = true;
  try {
    // dynamic import so Vite doesn't fail when plugin is not installed
    const mod = await import("@capacitor/network");
    const Network = (mod as any).Network;
    if (Network && typeof Network.getStatus === "function") {
      pluginAvailable = true;
      // add plugin listener to forward events
      try {
        if (!pluginListenerAdded) {
          Network.addListener("networkStatusChange", (status: any) => {
            listeners.forEach((l) => l(Boolean(status?.connected)));
          });
          pluginListenerAdded = true;
        }
      } catch (e) {
        // ignore listener attachment errors
      }
    }
  } catch (e) {
    pluginAvailable = false;
  }
}

export async function getStatus(): Promise<boolean> {
  await tryInitPlugin();
  if (pluginAvailable) {
    try {
      const mod = await import("@capacitor/network");
      const res = await (mod as any).Network.getStatus();
      return Boolean(res?.connected);
    } catch (e) {
      // fallback to navigator
    }
  }
  return typeof navigator !== "undefined" ? navigator.onLine : false;
}

function ensureWindowListeners() {
  if (windowListenersAdded) return;
  window.addEventListener("online", () => listeners.forEach((l) => l(true)));
  window.addEventListener("offline", () => listeners.forEach((l) => l(false)));
  windowListenersAdded = true;
}

export function subscribe(cb: NetworkListener): () => void {
  listeners.push(cb);
  // init plugin in background.
  tryInitPlugin();
  // if plugin not available, ensure window events.
  ensureWindowListeners();

  // return unsubscribe.
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export default { getStatus, subscribe };
