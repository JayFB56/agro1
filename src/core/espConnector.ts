// src/core/espConnector.ts
// Clase para gestionar la conexión WiFi al ESP32 (red "Balanza")

import { Plugins } from '@capacitor/core';
let Wifi: any;
try {
  Wifi = require('@capgo/capacitor-wifi').Wifi;
} catch {}

class EspConnector {
  private static instance: EspConnector;
  private connected: boolean = false;
  private listeners: Array<(connected: boolean) => void> = [];

  private constructor() {}

  static getInstance() {
    if (!EspConnector.instance) {
      EspConnector.instance = new EspConnector();
    }
    return EspConnector.instance;
  }

  isConnected() {
    return this.connected;
  }

  subscribe(listener: (connected: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(connected: boolean) {
    this.listeners.forEach(l => l(connected));
  }

  async connectToBalanza({ ssid, password }: { ssid: string, password: string }) {
    if (!Wifi) {
      // Fallback simulación web/demo
      if (ssid === "Balanza" && password === "12345678") {
        return new Promise<boolean>((resolve) => {
          setTimeout(() => {
            this.connected = true;
            this.notify(true);
            resolve(true);
          }, 1000);
        });
      }
      return false;
    }
    try {
      // Escanear redes
      const scanResult = await Wifi.scan();
      const found = scanResult?.networks?.find((r: any) => r.SSID === ssid);
      if (!found) return false;
      // Conectar
      await Wifi.connect({ ssid, password });
      this.connected = true;
      this.notify(true);
      return true;
    } catch (e) {
      this.connected = false;
      this.notify(false);
      return false;
    }
  }

  disconnect() {
    this.connected = false;
    this.notify(false);
  }
}

export default EspConnector.getInstance();
