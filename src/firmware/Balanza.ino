#include <WiFi.h>
#include "esp_wifi.h"
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <RTClib.h>
#include <Keypad.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include "SPIFFS.h"

#define SDA_LCD 21
#define SCL_LCD 22
#define SDA_RTC 18
#define SCL_RTC 19
#define LED_PIN 16

// --- WIFI CONFIG ---
const char* ssid = "Balanza";
const char* password = "12345678";

IPAddress local_IP(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

// --- OBJETOS ---
LiquidCrystal_I2C lcd(0x27, 20, 4);
RTC_DS3231 rtc;
TwoWire I2C_RTC = TwoWire(1);
WebServer server(80);

// --- TECLADO ---
const byte FILAS = 4;
const byte COLUMNAS = 4;

char teclas[FILAS][COLUMNAS] = {
  { '1', '2', '3', 'A' },
  { '4', '5', '6', 'B' },
  { '7', '8', '9', 'C' },
  { '*', '0', '#', 'D' }
};

byte pinesFilas[FILAS] = { 13, 12, 14, 27 };
byte pinesColumnas[COLUMNAS] = { 26, 25, 33, 32 };

Keypad keypad = Keypad(makeKeymap(teclas), pinesFilas, pinesColumnas, FILAS, COLUMNAS);

// --- VARIABLES ---
String codigo = "";
String peso = "";
bool ingresandoPeso = false;

unsigned long lastUpdate = 0;
unsigned long idRegistro = 1;

String archivo = "/registros.json";

// --------------------------------------------------

void iniciarAPEstable() {
  WiFi.mode(WIFI_AP);
  WiFi.setSleep(false);
  WiFi.softAPConfig(local_IP, gateway, subnet);
  WiFi.softAP(ssid, password);
  esp_wifi_set_max_tx_power(78);
}

// --------------------------------------------------

void enableCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

// --------------------------------------------------

void mostrarOK() {
  lcd.clear();
  lcd.setCursor(4, 1);
  lcd.print("OK GUARDADO");
  digitalWrite(LED_PIN, HIGH);
  delay(1300);
  digitalWrite(LED_PIN, LOW);
  lcd.clear();
}

// --------------------------------------------------

void guardarEnArchivo(String nuevoRegistro) {

  File file = SPIFFS.open(archivo, FILE_READ);
  String contenido = "[]";

  if (file) {
    contenido = file.readString();
    file.close();
  }

  if (contenido == "[]" || contenido.length() <= 2) {
    contenido = "[" + nuevoRegistro + "]";
  } else {
    contenido.remove(contenido.length() - 1);
    contenido += "," + nuevoRegistro + "]";
  }

  file = SPIFFS.open(archivo, FILE_WRITE);
  file.print(contenido);
  file.close();
}

// --------------------------------------------------

void guardarRegistro(String cod, String pes) {

  DateTime now = rtc.now();

  char fecha[11];
  sprintf(fecha, "%02d/%02d/%04d",
          now.day(), now.month(), now.year());

  char hora[9];
  sprintf(hora, "%02d:%02d:%02d",
          now.hour(), now.minute(), now.second());

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

  guardarEnArchivo(salida);
}

// --------------------------------------------------

void handleData() {
  enableCORS();

  File file = SPIFFS.open(archivo, FILE_READ);

  if (!file) {
    server.send(200, "application/json", "[]");
    return;
  }

  String contenido = file.readString();
  file.close();

  server.send(200, "application/json", contenido);
}

// --------------------------------------------------

void borrarRegistros() {

  SPIFFS.remove(archivo);

  File file = SPIFFS.open(archivo, FILE_WRITE);
  file.print("[]");
  file.close();

  lcd.clear();
  lcd.setCursor(0, 1);
  lcd.print("REGISTROS BORRADOS");
  digitalWrite(LED_PIN, HIGH);
  delay(1500);
  digitalWrite(LED_PIN, LOW);
  lcd.clear();
}

// --------------------------------------------------

void setup() {

  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Wire.begin(SDA_LCD, SCL_LCD);
  I2C_RTC.begin(SDA_RTC, SCL_RTC, 100000);

  lcd.init();
  lcd.backlight();

  rtc.begin(&I2C_RTC);

  if (!SPIFFS.begin(true)) {
    Serial.println("Error SPIFFS");
  }

  if (!SPIFFS.exists(archivo)) {
    File file = SPIFFS.open(archivo, FILE_WRITE);
    file.print("[]");
    file.close();
  }

  iniciarAPEstable();

  server.on("/data", HTTP_GET, handleData);

  server.on("/data", HTTP_OPTIONS, []() {
    enableCORS();
    server.send(200);
  });

  server.begin();

  lcd.clear();
}

// --------------------------------------------------

void loop() {

  server.handleClient();

  if (millis() - lastUpdate >= 1000) {

    lastUpdate = millis();
    DateTime now = rtc.now();

    char fechaHora[21];
    sprintf(fechaHora, "%02d/%02d/%04d %02d:%02d:%02d",
            now.day(), now.month(), now.year(),
            now.hour(), now.minute(), now.second());

    lcd.setCursor(0, 0);
    lcd.print(fechaHora);
  }

  char tecla = keypad.getKey();

  if (tecla) {
    // CANCELAR CON C
    if (tecla == 'C') {
      codigo = "";
      peso = "";
      ingresandoPeso = false;

      lcd.clear();
      lcd.setCursor(5, 2);
      lcd.print("CANCELADO");
      digitalWrite(LED_PIN, HIGH);
      delay(800);
      digitalWrite(LED_PIN, LOW);
      lcd.clear();

      return;
    }
    // BORRAR TODO CON D
    if (tecla == 'D') {
      borrarRegistros();
      return;
    }

    if (!ingresandoPeso) {

      if (isdigit(tecla)) codigo += tecla;
      else if (tecla == '#') {
        if (codigo.length() > 0) codigo.remove(codigo.length() - 1);
      } else if (tecla == 'A' && codigo.length() > 0) {
        ingresandoPeso = true;
      }

    } else {

      if (isdigit(tecla)) peso += tecla;
      else if (tecla == '*' && peso.indexOf('.') == -1) peso += '.';
      else if (tecla == '#') {
        if (peso.length() > 0) peso.remove(peso.length() - 1);
      } else if (tecla == 'A' && peso.length() > 0) {

        guardarRegistro(codigo, peso);
        codigo = "";
        peso = "";
        ingresandoPeso = false;
        mostrarOK();
      }
    }

    lcd.setCursor(0, 1);
    lcd.print("Codigo: " + codigo + "      ");

    lcd.setCursor(0, 2);
    lcd.print("Peso: " + peso + "          ");

    lcd.setCursor(0, 3);
    if (!ingresandoPeso) lcd.print("Ingrese Codigo   ");
    else lcd.print("Ingrese Peso     ");
  }
}