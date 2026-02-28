import * as Capacitor from '@capacitor/core';

const CapAny = (Capacitor as any) || (window as any).Capacitor || {};
const Plugins = CapAny.Plugins || CapAny.Capacitor?.Plugins || (window as any).Capacitor?.Plugins || {};
const WifiConnector = Plugins?.WifiConnector;
const Permissions = Plugins?.Permissions;

async function requestPermissionsIfNeeded() {
  try {
    if (!Permissions) return { granted: true };
    if (typeof Permissions.request === 'function') {
      // Capacitor Permissions plugin
      const p = await Permissions.request({ name: 'location' } as any);
      return p;
    }
    return { granted: true };
  } catch (e) {
    return { granted: false, error: e };
  }
}

export async function connectToBalanza(opts?: { ssid?: string; password?: string }) {
  const ssid = opts?.ssid || 'Balanza';
  const password = opts?.password || '12345678';
  const perm = await requestPermissionsIfNeeded();
  if (perm && (perm.granted === false || perm.location === 'prompt')) {
    throw new Error('Permissions required');
  }

  if (!WifiConnector || typeof WifiConnector.connectToBalanza !== 'function') {
    throw new Error('WifiConnector native plugin not available');
  }

  return WifiConnector.connectToBalanza({ ssid, password });
}

export async function disconnect() {
  if (!WifiConnector || typeof WifiConnector.disconnect !== 'function') return { disconnected: true };
  return WifiConnector.disconnect();
}

export default { connectToBalanza, disconnect };
