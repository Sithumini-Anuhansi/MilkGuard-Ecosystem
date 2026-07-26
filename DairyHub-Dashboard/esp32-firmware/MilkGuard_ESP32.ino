/*
  MilkGuard ESP32 Firmware
  -------------------------
  Phase 13: Final ESP32 integration.

  Flow:
    Scan RFID -> Identify collector -> Read sensors -> Calculate quality
    -> Upload to Firebase Realtime Database -> Dashboard updates live

  Hardware:
    - ESP32 dev board
    - MFRC522 RFID reader (SPI)
    - Analog pH sensor module
    - MQ-135 (or similar) gas sensor module
    - DS18B20 or analog temperature sensor

  Libraries required (Arduino Library Manager):
    - MFRC522              (RFID reading)
    - Firebase ESP Client  by Mobizt  (Realtime Database upload)
    - ArduinoJson

  IMPORTANT: fill in WIFI_SSID / WIFI_PASSWORD / Firebase credentials below,
  and adjust sensor pins/calibration to match your actual wiring.
*/

#include <WiFi.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// ---------- WiFi ----------
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ---------- Firebase ----------
#define API_KEY       "YOUR_FIREBASE_WEB_API_KEY"
#define DATABASE_URL  "https://milkguard-system-default-rtdb.asia-southeast1.firebasedatabase.app"
#define USER_EMAIL    "device@milkguard.com"   // a dedicated Firebase Auth user for the device
#define USER_PASSWORD "YOUR_DEVICE_ACCOUNT_PASSWORD"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ---------- RFID (MFRC522) ----------
#define RFID_SS_PIN   5
#define RFID_RST_PIN  22
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);

// ---------- Sensors ----------
#define PH_SENSOR_PIN   34   // analog pin
#define GAS_SENSOR_PIN  35   // analog pin (MQ-135 style)
#define TEMP_SENSOR_PIN 32   // analog pin (or swap for a OneWire DS18B20)

// ---------- Quality thresholds (mirrors the web dashboard's gauge logic) ----------
const float PH_MIN_FRESH = 6.4;
const float PH_MAX_FRESH = 6.8;
const int   GAS_WARNING  = 300;
const int   GAS_SPOILED  = 500;
const float TEMP_WARNING = 25.0;
const float TEMP_SPOILED = 30.0;

unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL_MS = 15000; // 15s

// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);

  SPI.begin();
  rfid.PCD_Init();

  connectWiFi();
  connectFirebase();

  sendDeviceStatus(true);
}

// ---------------------------------------------------------------------------
void loop() {
  // Heartbeat so the dashboard can detect an offline device
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
    sendDeviceStatus(true);
    lastHeartbeat = millis();
  }

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(200);
    return;
  }

  String rfidUID = getUIDString();
  Serial.println("Card detected: " + rfidUID);

  CollectorInfo collector = lookupCollector(rfidUID);

  float pH = readPH();
  int gas = readGas();
  float temperature = readTemperature();
  String status = classifyQuality(pH, gas, temperature);

  uploadReading(collector, rfidUID, pH, gas, temperature, status);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  delay(1500); // debounce before next scan
}

// ---------------------------------------------------------------------------
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());
}

void connectFirebase() {
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

// ---------------------------------------------------------------------------
String getUIDString() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

struct CollectorInfo {
  String id;
  String name;
  bool found;
};

// Looks up the scanned card against a lightweight mirror at /collectors/{rfidUID}
// (kept in sync with the Firestore `collectors` collection by the web app / a
// small Cloud Function — out of scope for this sketch, but this path read is cheap
// and works offline-tolerant on the ESP32 side).
CollectorInfo lookupCollector(const String &rfidUID) {
  CollectorInfo info = { "", "Unknown Collector", false };

  String path = "/collectorsByRfid/" + rfidUID;

  if (Firebase.RTDB.getJSON(&fbdo, path)) {
    FirebaseJson *json = fbdo.jsonObjectPtr();
    FirebaseJsonData result;

    if (json->get(result, "id")) info.id = result.stringValue;
    if (json->get(result, "name")) info.name = result.stringValue;
    info.found = info.id.length() > 0;
  } else {
    Serial.println("Collector lookup failed: " + fbdo.errorReason());
  }

  return info;
}

// ---------------------------------------------------------------------------
float readPH() {
  int raw = analogRead(PH_SENSOR_PIN);
  // TODO: replace with your sensor's actual calibration curve
  float voltage = raw * (3.3 / 4095.0);
  float ph = 3.5 * voltage; // placeholder linear approximation
  return round(ph * 100) / 100.0;
}

int readGas() {
  return analogRead(GAS_SENSOR_PIN); // raw ppm-ish reading; calibrate per sensor datasheet
}

float readTemperature() {
  int raw = analogRead(TEMP_SENSOR_PIN);
  float voltage = raw * (3.3 / 4095.0);
  float celsius = voltage * 100.0; // placeholder for e.g. an LM35-style sensor
  return round(celsius * 10) / 10.0;
}

String classifyQuality(float pH, int gas, float temperature) {
  bool phOk = (pH >= PH_MIN_FRESH && pH <= PH_MAX_FRESH);

  if (gas >= GAS_SPOILED || temperature >= TEMP_SPOILED || !phOk) {
    // Distinguish a hard "Spoiled" from a milder "Warning"
    if (gas >= GAS_SPOILED || temperature >= TEMP_SPOILED) return "Spoiled";
    return "Warning";
  }

  if (gas >= GAS_WARNING || temperature >= TEMP_WARNING) return "Warning";

  return "Fresh";
}

// ---------------------------------------------------------------------------
void uploadReading(const CollectorInfo &collector, const String &rfidUID,
                    float pH, int gas, float temperature, const String &status) {
  FirebaseJson json;

  json.set("collectorId", collector.id);
  json.set("collectorName", collector.name);
  json.set("rfidUID", rfidUID);
  json.set("quantity", 0); // wire up a flow/load sensor here if available
  json.set("pH", pH);
  json.set("gas", gas);
  json.set("temperature", temperature);
  json.set("status", status);
  json.set("timestamp", (int)(millis() / 1000));

  if (Firebase.RTDB.setJSON(&fbdo, "/liveData/currentTest", &json)) {
    Serial.println("Reading uploaded: " + status);
  } else {
    Serial.println("Upload failed: " + fbdo.errorReason());
  }
}

void sendDeviceStatus(bool online) {
  FirebaseJson json;
  json.set("online", online);
  json.set("lastUpdate", (int)(millis() / 1000));

  if (!Firebase.RTDB.setJSON(&fbdo, "/liveData/deviceStatus", &json)) {
    Serial.println("Device status update failed: " + fbdo.errorReason());
  }
}
