# Sistema de Registro

## 1. Descripción Técnica

Este proyecto implementa un sistema embebido de registro de pesajes basado en **ESP32**, con almacenamiento persistente local y una aplicación Android que consume los datos mediante comunicación HTTP en red privada.

El sistema opera completamente **offline**, sin servidores externos y sin dependencia de internet.

La arquitectura está compuesta por:

- Firmware en ESP32 (modo Access Point)
- Almacenamiento persistente interno (SPIFFS)
- API HTTP local (`/data`)
- Aplicación Android (Capacitor) que consume datos vía LAN

---

## 2. Arquitectura del Sistema

### 2.1 Hardware

- ESP32 (modo AP)
- RTC DS3231 (timestamp en tiempo real)
- Pantalla LCD I2C 20x4
- Teclado matricial 4x4
- LED indicador de estado

### 2.2 Firmware

El firmware está desarrollado en entorno Arduino para ESP32 e implementa:

- Modo WiFi Access Point
- IP estática: `192.168.4.1`
- Servidor HTTP embebido (puerto 80)
- Endpoint REST:
  - `GET /data`
- Soporte CORS habilitado
- Persistencia en memoria flash usando SPIFFS
- Almacenamiento en formato JSON

Los registros se almacenan en:
