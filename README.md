# Sistema de Registro de Pesaje con ESP32 y Aplicación Android

## 1. Descripción Técnica

Este proyecto implementa un sistema embebido de registro de pesajes basado en ESP32, con almacenamiento persistente local y una aplicación Android que consume los datos mediante comunicación HTTP en red privada. El sistema opera completamente offline, sin servidores externos y sin dependencia de internet.

La arquitectura está compuesta por firmware en ESP32 en modo Access Point, almacenamiento persistente interno (SPIFFS), una API HTTP local (`/data`) y una aplicación Android desarrollada con Capacitor que consume datos vía LAN.

---

## 2. Arquitectura del Sistema

### 2.1 Hardware

- ESP32 (modo AP)
- RTC DS3231 (timestamp en tiempo real)
- Pantalla LCD I2C 20x4
- Teclado matricial 4x4
- LED indicador de estado

### 2.2 Firmware

El firmware está desarrollado en entorno Arduino para ESP32 e implementa modo WiFi Access Point con IP estática 192.168.4.1, servidor HTTP embebido en puerto 80, endpoint REST `GET /data`, soporte CORS habilitado, persistencia en memoria flash usando SPIFFS y almacenamiento en formato JSON.

Los registros se almacenan en el archivo:

```
/registros.json
```

Formato de registro:

```json
{
  "id": 1,
  "codigo": "123",
  "peso": "45.6",
  "fecha": "01/03/2026",
  "hora": "14:22:01",
  "turno": "PM"
}
```

### 2.3 Aplicación Android

La aplicación está desarrollada con Capacitor y TypeScript utilizando la Fetch API nativa. La comunicación ocurre directamente hacia:

```
http://192.168.4.1/data
```

---

## 3. Flujo Operativo

1. El ESP32 inicia en modo Access Point con SSID configurado.
2. El usuario conecta manualmente el dispositivo Android a la red WiFi del ESP32.
3. El operador ingresa datos desde el teclado físico.
4. El firmware genera timestamp desde el RTC, construye el objeto JSON y lo almacena en SPIFFS.
5. La aplicación Android realiza una petición HTTP GET a `/data`.
6. El firmware responde con todos los registros almacenados.
7. Los registros solo pueden eliminarse físicamente presionando la tecla `D`.

---

## 4. Persistencia de Datos

Se utiliza SPIFFS (flash interna del ESP32). Los datos no se pierden al apagar el dispositivo. No existe borrado automático. La única forma de eliminar registros es mediante entrada física (`D`). No existe endpoint remoto para eliminación.

---

## 5. Permisos de la Aplicación Android

La aplicación solicita únicamente permisos relacionados con conectividad de red.

### Permisos utilizados

En AndroidManifest:

- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.ACCESS_WIFI_STATE` (si aplica)

### Justificación técnica

`INTERNET` es requerido para realizar peticiones HTTP a la red local.  
`ACCESS_NETWORK_STATE` permite detectar disponibilidad de red.  
`ACCESS_WIFI_STATE` es necesario para verificar estado de conexión WiFi.

### Permisos NO utilizados

La aplicación no utiliza ubicación (GPS), cámara, micrófono, Bluetooth, NFC, almacenamiento externo, contactos, sensores biométricos, servicios en segundo plano persistentes ni acceso a internet externo. La aplicación no transmite datos fuera de la red local.

---

## 6. Seguridad

### 6.1 Nivel de Red

El ESP32 opera como red cerrada con IP privada 192.168.4.1. No existe NAT ni exposición pública y no se abre ningún puerto externo.

### 6.2 Nivel de Aplicación

No se implementa autenticación ni cifrado TLS, ya que la comunicación es exclusivamente local. El sistema está diseñado para operar en entorno controlado.

### 6.3 Privacidad

No se envían datos a terceros, no se integran SDK de tracking y no se usan servicios de analítica.

---

## 7. Endpoint HTTP

### GET /data

Devuelve todos los registros almacenados en formato JSON:

```json
[
  { ... },
  { ... }
]
```

Características:

- Content-Type: application/json
- CORS habilitado
- Sin autenticación
- Sin paginación
- Sin filtrado

---

## 8. Gestión de Memoria

Los registros se almacenan en un único archivo JSON y se reescribe el archivo completo en cada inserción. Está limitado por el tamaño disponible de SPIFFS. No existe rotación automática ni compresión.

---

## 9. Requisitos Técnicos

### Firmware

- Arduino IDE
- Board: ESP32 Dev Module
- Librerías: WiFi, WebServer, ArduinoJson, SPIFFS, RTClib, Keypad, LiquidCrystal_I2C

### Aplicación

- Node.js 22
- Capacitor
- Android SDK
- Gradle compatible con JVM 17

---

## 10. Limitaciones

No existe sincronización en nube, respaldo automático, autenticación ni cifrado HTTPS. El tamaño de almacenamiento depende de la flash disponible. No existe control de concurrencia (se recomienda una sola conexión cliente).

---

## 11. Consideraciones Técnicas Importantes

La comunicación depende de conexión manual al WiFi del ESP32. El dispositivo Android debe permanecer conectado a la red local. No se recomienda modificar manualmente el archivo SPIFFS. El sistema está diseñado para operación offline controlada.