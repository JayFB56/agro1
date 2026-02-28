// CODIGO.ino
// Firmware ESP32: punto de acceso estable "Balanza"

#include <WiFi.h>
#ifdef ESP32
#include "esp_wifi.h"
#endif

const char* ssid = "Balanza";
const char* password = "12345678";

IPAddress local_IP(192,168,4,1);
IPAddress gateway(192,168,4,1);
IPAddress subnet(255,255,255,0);

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Desactivar sleep para mejorar estabilidad
  WiFi.setSleep(false);

  // Intentar configurar IP estática antes de iniciar AP
  if (!WiFi.softAPConfig(local_IP, gateway, subnet)) {
    Serial.println("softAPConfig falló o se llamó antes de softAP; intentando después");
  }

  // Iniciar AP
  bool ok = WiFi.softAP(ssid, password, 6, false);
  if (!ok) {
    Serial.println("Fallo al iniciar AP");
  }

  // Reintentar configurar IP estática (seguro hacerlo después)
  if (!WiFi.softAPConfig(local_IP, gateway, subnet)) {
    Serial.println("softAPConfig final falló");
  }

  // Intento de ajustar TX power si la plataforma lo permite
  #ifdef ESP32
  // El valor es en dBm*4 en algunas SDK; 78 ~ 19.5 dBm. Ajusta según necesidad.
  esp_err_t e = esp_wifi_set_max_tx_power(78);
  if (e != ESP_OK) {
    Serial.printf("No se pudo ajustar TX power: %d\n", e);
  }
  #endif

  Serial.print("AP iniciada. SSID: ");
  Serial.print(ssid);
  Serial.print(" IP: ");
  Serial.println(WiFi.softAPIP());
}

void loop() {
  // Mantener AP; comprobar clientes conectados opcionalmente
  delay(1000);
}
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <RTClib.h>
#include <Keypad.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

#define SDA_LCD 21
#define SCL_LCD 22

#define SDA_RTC 18
#define SCL_RTC 19

#define LED_PIN 23

LiquidCrystal_I2C lcd(0x27, 20, 4);
RTC_DS3231 rtc;
TwoWire I2C_RTC = TwoWire(1);

WebServer server(80);

const char* ssid = "Balanza";
const char* password = "12345678";

const byte FILAS = 4;
const byte COLUMNAS = 4;

char teclas[FILAS][COLUMNAS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};

byte pinesFilas[FILAS] = {13, 12, 14, 27};
byte pinesColumnas[COLUMNAS] = {26, 25, 33, 32};

Keypad keypad = Keypad(makeKeymap(teclas), pinesFilas, pinesColumnas, FILAS, COLUMNAS);

String codigo = "";
String peso = "";

bool ingresandoPeso = false;

unsigned long lastUpdate = 0;
unsigned long idRegistro = 1;

String registrosJSON = "[";

void mostrarOK() {

  lcd.clear();
  lcd.setCursor(2,1);
  lcd.print("OK GUARDADO");
  digitalWrite(LED_PIN, HIGH);
  delay(1300);
  digitalWrite(LED_PIN, LOW);
  lcd.clear();
}

void guardarRegistro(String cod, String pes) {

  DateTime now = rtc.now();

  char fecha[11];
  sprintf(fecha, "%02d/%02d/%04d",
          now.day(),
          now.month(),
          now.year());

  char hora[9];
  sprintf(hora, "%02d:%02d:%02d",
          now.hour(),
          now.minute(),
          now.second());

  String turno = (now.hour() >= 12) ? "PM" : "AM";

  StaticJsonDocument<256> doc;

  doc["id"] = idRegistro++;
  doc["codigo"] = cod;
  doc["peso"] = pes;
  doc["fecha"] = fecha;
  doc["hora"] = hora;
  doc["turno"] = turno;

  String salida;
  serializeJson(doc, salida);

  if (registrosJSON.length() > 1) registrosJSON += ",";
  registrosJSON += salida;
}

void handleRoot() {
  String salidaFinal = registrosJSON + "]";
  server.send(200, "application/json", salidaFinal);
}

void setup() {

  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Wire.begin(SDA_LCD, SCL_LCD);
  Wire.setClock(100000);
  Wire.setTimeOut(50);

  I2C_RTC.begin(SDA_RTC, SCL_RTC, 100000);
  I2C_RTC.setTimeOut(50);

  lcd.init();
  lcd.backlight();

  rtc.begin(&I2C_RTC);

  WiFi.softAP(ssid, password);
  server.on("/data", handleRoot);
  server.begin();

  lcd.clear();
}

void loop() {

  server.handleClient();

  if (millis() - lastUpdate >= 1000) {

    lastUpdate = millis();

    DateTime now = rtc.now();

    char fechaHora[21];

    sprintf(fechaHora, "%02d/%02d/%04d %02d:%02d:%02d",
            now.day(),
            now.month(),
            now.year(),
            now.hour(),
            now.minute(),
            now.second());

    lcd.setCursor(0, 0);
    lcd.print(fechaHora);
  }

  char tecla = keypad.getKey();

  if (tecla) {

    if (!ingresandoPeso) {

      if (tecla >= '0' && tecla <= '9') {
        codigo += tecla;
      }
      else if (tecla == '#') {
        if (codigo.length() > 0) codigo.remove(codigo.length() - 1);
      }
      else if (tecla == 'A' && codigo.length() > 0) {
        ingresandoPeso = true;
      }

    } else {

      if (tecla >= '0' && tecla <= '9') {
        peso += tecla;
      }
      else if (tecla == '*') {
        if (peso.indexOf('.') == -1) peso += '.';
      }
      else if (tecla == '#') {
        if (peso.length() > 0) peso.remove(peso.length() - 1);
      }
      else if (tecla == 'A' && peso.length() > 0) {

        guardarRegistro(codigo, peso);

        codigo = "";
        peso = "";
        ingresandoPeso = false;

        mostrarOK();
      }
    }

    lcd.setCursor(0,1);
    lcd.print("Codigo: ");
    lcd.print(codigo);
    lcd.print("        ");

    lcd.setCursor(0,2);
    lcd.print("Peso: ");
    lcd.print(peso);
    lcd.print("           ");

    lcd.setCursor(0,3);
    if (!ingresandoPeso) lcd.print("Ingrese Codigo   ");
    else lcd.print("Ingrese Peso     ");
  }
}