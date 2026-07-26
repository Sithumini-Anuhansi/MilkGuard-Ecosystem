#include <Wire.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <time.h>

// WiFi credentials
#define WIFI_SSID "HONOR X6a"
#define WIFI_PASSWORD "123456789"

// Firebase credentials
#define API_KEY "AIzaSyBncEI1ToSsh8_ER2D-GC7Fiard_mE7vBw"
#define DATABASE_URL "https://milkguard-system-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define USER_EMAIL "anuhansisithumini@gmail.com"
#define USER_PASSWORD "12345678"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// LCD
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Sensor pins
#define PH_PIN 34
#define MQ135_PIN 35
#define TEMP_PIN 15

// Temperature sensor
OneWire oneWire(TEMP_PIN);
DallasTemperature sensors(&oneWire);

// Variables
float voltage = 0.0;
float pHValue = 0.0;
int gasValue = 0;
float tempC = 0;

// Averaging variables
float pHSum = 0;
float gasSum = 0;
float tempSum = 0;
int validReadings = 0;

// Time tracking for Firebase
unsigned long sendDataPrevMillis = 0;

// NTP Server for time syncing
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 19800;
const int daylightOffset_sec = 0;

/* WIFI FUNCTIONS */
void connectWiFi() {
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
    if (millis() - start > 15000) {
      Serial.println("\nWi-Fi connection failed!");
      return;
    }
  }
  Serial.println("\nWi-Fi connected!");
  Serial.print("IP: "); Serial.println(WiFi.localIP());
}

/* TIME SYNC */
void syncTime() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.print("Waiting for time sync");
  int retries = 0;
  while (time(nullptr) < 1600000000 && retries < 20) {
    Serial.print(".");
    delay(500);
    retries++;
  }
  if (retries < 20) Serial.println(" Time synced!");
  else Serial.println(" Time sync failed, using system millis()");
}

/* FIREBASE UPLOAD */
void uploadFirebase(float avgPH, float avgGas, float avgTemp, String status, FirebaseJsonArray &currentReadings) {
  if (status == "") status = "Unknown"; // Ensure status is never empty

  if (!Firebase.ready()) {
    Serial.println("Firebase not ready! Skipping upload.");
    return;
  }

  // Upload average values
  if (Firebase.RTDB.setFloat(&fbdo, "MilkGuard/pH", avgPH)) Serial.println("pH uploaded");
  else Serial.println("pH upload failed: " + fbdo.errorReason());

  if (Firebase.RTDB.setFloat(&fbdo, "MilkGuard/gas", avgGas)) Serial.println("Gas uploaded");
  else Serial.println("Gas upload failed: " + fbdo.errorReason());

  if (Firebase.RTDB.setFloat(&fbdo, "MilkGuard/temp", avgTemp)) Serial.println("Temp uploaded");
  else Serial.println("Temp upload failed: " + fbdo.errorReason());

  if (Firebase.RTDB.setString(&fbdo, "MilkGuard/status", status)) Serial.println("Status uploaded");
  else Serial.println("Status upload failed: " + fbdo.errorReason());

  // Wrap array in FirebaseJson
  FirebaseJson jsonWrapper;
  jsonWrapper.clear();
  jsonWrapper.set("readings", currentReadings);

  if (Firebase.RTDB.setJSON(&fbdo, "MilkGuard/currentTest", &jsonWrapper))
    Serial.println("Current test uploaded");
  else
    Serial.println("Current test upload failed: " + fbdo.errorReason());

  // Store historical record
  FirebaseJson historyJson;
  historyJson.clear();
  historyJson.set("pH", avgPH);
  historyJson.set("gas", avgGas);
  historyJson.set("temp", avgTemp);
  historyJson.set("status", status);
  historyJson.set("time", millis());

  if (Firebase.RTDB.pushJSON(&fbdo, "MilkGuard/history", &historyJson))
    Serial.println("History pushed to Firebase");
  else
    Serial.println("History push failed: " + fbdo.errorReason());
}

/* SETUP */
void setup() {
  Serial.begin(115200);
  delay(1000);

  // Initialize LCD Display
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // Initialize temperature sensor
  sensors.begin();

  // Connect Wi-Fi and sync time
  connectWiFi();
  syncTime();

  // Display startup message
  lcd.setCursor(0, 0);
  lcd.print("Milk Test System");

  // Firebase configuration
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Firebase.reconnectNetwork(true); // Auto reconnect if disconnected
  fbdo.setResponseSize(2048); // Response Size
  config.timeout.serverResponse = 10000;

  Serial.println("Initializing Firebase...");
  Firebase.begin(&config, &auth);
  Firebase.setDoubleDigits(5); // 5 decimal places for float uploads

  // Wait until Firebase is ready (timeout 10 sec)
  unsigned long startFirebase = millis();
  while (!Firebase.ready()) {
    Serial.print("Waiting for Firebase...");
    delay(500);
    if (millis() - startFirebase > 10000) {
      Serial.println("\nFirebase init timed out! Will continue anyway.");
      break;
    }
  }

  if (Firebase.ready()) Serial.println("Firebase ready!");
  Serial.println("Setup finished");
}

/* MAIN LOOP */
void loop() {
  Serial.println("Starting milk test...");

  // Display testing message on LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Testing Milk...");
  lcd.setCursor(0, 1);
  lcd.print("Please Wait");

  // Reset sum and count for averaging
  pHSum = 0;
  gasSum = 0;
  tempSum = 0;
  validReadings = 0;

  // Prepare array to store current test readings
  FirebaseJsonArray currentReadings;
  currentReadings.clear();

  // Take 10 sensor readings (20 seconds)
  for (int i = 0; i < 10; i++) {

    /* pH SENSOR READING */
    int adcValue = analogRead(PH_PIN);
    voltage = adcValue * (3.3 / 4095.0);
    pHValue = 7 + ((2.5 - voltage) / 0.18);

    /* GAS SENSOR READING */
    gasValue = analogRead(MQ135_PIN);

    /* TEMPERATURE SENSOR READING */
    sensors.requestTemperatures();
    tempC = sensors.getTempCByIndex(0);

    // If temperature reading is valid
    if (tempC != DEVICE_DISCONNECTED_C) {
      // Prepare JSON for this reading
      FirebaseJson reading;
      reading.clear();
      reading.set("pH", pHValue);
      reading.set("gas", gasValue);
      reading.set("temp", tempC);
      reading.set("index", i + 1);

      // Add to current readings array
      currentReadings.add(reading);

      // Print reading to Serial
      Serial.print("Reading "); Serial.println(i + 1);
      Serial.print("pH: "); Serial.print(pHValue);
      Serial.print(" Gas: "); Serial.print(gasValue);
      Serial.print(" Temp: "); Serial.println(tempC);

      // Ignore first 3 readings for averaging
      if (i >= 3) {
        pHSum += pHValue;
        gasSum += gasValue;
        tempSum += tempC;
        validReadings++;
      }

    } else {
      Serial.println("DS18B20 disconnected or reading error!");
    }

    delay(2000); // 2 second interval between readings
  }

  // Calculate average values
  float avgPH = validReadings > 0 ? pHSum / validReadings : 0;
  float avgGas = validReadings > 0 ? gasSum / validReadings : 0;
  float avgTemp = validReadings > 0 ? tempSum / validReadings : 0;

  // Milk status thresholds
  String status = "";
  if (avgGas < 520 && avgPH >= 6.6 && avgPH <= 6.9) status = "Fresh";
  else if (avgGas >= 520 && avgGas <= 780) status = "Warning";
  else if (avgGas > 780) status = "Spoiled";
  else status = "Unknown";

  // Print final output on serial monitor
  Serial.println("-----------");
  Serial.print("Avg pH: "); Serial.println(avgPH);
  Serial.print("Avg Gas: "); Serial.println(avgGas);
  Serial.print("Avg Temp: "); Serial.println(avgTemp);
  Serial.print("Status: "); Serial.println(status);
  Serial.println("-----------");

  // Update LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("pH:");
  lcd.print(avgPH, 1);
  lcd.print(" G:");
  lcd.print(avgGas, 0);
  lcd.setCursor(0, 1);
  lcd.print("T:");
  lcd.print(avgTemp, 0);
  lcd.print(" ");
  lcd.print(status);

  // Upload data to Firebase every 5 seconds
  if (Firebase.ready() && (millis() - sendDataPrevMillis > 5000 || sendDataPrevMillis == 0)) {
    sendDataPrevMillis = millis();
    uploadFirebase(avgPH, avgGas, avgTemp, status, currentReadings);
  }

  delay(8000); // Wait 8 seconds before next test
}