import { Plugins } from '@capacitor/core';
const { WifiConnector, Permissions } = (Plugins as any);

const REQUIRED_PERMISSIONS = [
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.CHANGE_WIFI_STATE',
  'android.permission.ACCESS_NETWORK_STATE',
];

async function requestPermissionsIfNeeded() {
  try {
    if (!Permissions || !Permissions.request) return { granted: true };
    // Try generic location permission request via Capacitor Permissions plugin
    const p = await Permissions.request({ name: 'location' } as any);
    return p;
  } catch (e) {
    return { granted: false, error: e };
  }
}

export async function connectToBalanza(opts?: { ssid?: string; password?: string }) {
  const ssid = opts?.ssid || 'Balanza';
  const password = opts?.password || '12345678';
  // Try request permissions first
  const perm = await requestPermissionsIfNeeded();
  if (perm && (perm.granted === false || perm.location === 'prompt')) {
    throw new Error('Permissions required');
  }
  if (!WifiConnector || !WifiConnector.connectToBalanza) {
    throw new Error('WifiConnector native plugin not available');
  }
  return WifiConnector.connectToBalanza({ ssid, password });
}

export async function disconnect() {
  if (!WifiConnector || !WifiConnector.disconnect) return { disconnected: true };
  return WifiConnector.disconnect();
}

export default { connectToBalanza, disconnect };
