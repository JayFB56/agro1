// src/core/networkStatus.ts
// Clase para gestionar el estado de red en tiempo real
import * as network from "./network";

class NetworkStatus {
  private listeners: Array<(online: boolean) => void> = [];
  private online: boolean = false;
  private initialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.initialized) return;
    this.initialized = true;
    this.online = await network.getStatus();
    network.subscribe((v) => {
      this.online = v;
      this.listeners.forEach((l) => l(v));
    });
  }

  isOnline() {
    return this.online;
  }

  subscribe(listener: (online: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export default new NetworkStatus();
