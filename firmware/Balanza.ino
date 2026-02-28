#include <WiFi.h>

const char* ssid = "Balanza";
const char* password = "12345678";

IPAddress local_IP(192,168,4,1);
IPAddress gateway(192,168,4,1);
IPAddress subnet(255,255,255,0);

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Disable WiFi sleep to improve stability
  WiFi.setSleep(false);

  // Configure access point with static IP
  if (!WiFi.softAP(ssid, password)) {
    Serial.println("Failed to start AP");
  }

  // Set static IP
  if (!WiFi.softAPConfig(local_IP, gateway, subnet)) {
    Serial.println("Failed to configure AP IP");
  }

  // Set channel and tx power
  wifi_promiscuous_filter_t f;
  // channel setting via WiFi.softAP is not directly exposed; use config
  // Set TX power (in dBm) if available
  #ifdef ESP32
  esp_wifi_set_max_tx_power(78); // value in quarter dBm (78 -> 19.5 dBm) if SDK supports
  #endif

  Serial.print("AP Started. SSID: ");
  Serial.print(ssid);
  Serial.print(" IP: ");
  Serial.println(WiFi.softAPIP());
}

void loop() {
  // Keep AP running; you can add status checks here
  delay(1000);
}
