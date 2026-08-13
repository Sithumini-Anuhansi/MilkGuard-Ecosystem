/* MilkGuard Ecosystem - MilkGuard Device */

#include <Wire.h>
#include <WiFi.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Firebase_ESP_Client.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Preferences.h>
#include <time.h>
#include "secrets.h"
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

/* Firebase Objects */
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

/* LCD */
LiquidCrystal_I2C lcd(0x27, 16, 2);

/* RFID */
#define SS_PIN 5
#define RST_PIN 27
MFRC522 mfrc522(SS_PIN, RST_PIN);

/* Sensor Pins */
#define PH_PIN    34
#define MQ135_PIN 35
#define TEMP_PIN  15

/* Temperature Sensor */
OneWire oneWire(TEMP_PIN);
DallasTemperature sensors(&oneWire);

/* NVS for daily testId counter */
Preferences prefs;

/* Sensor Variables */
float voltage = 0.0;
float pHValue = 0.0;
int gasValue = 0;
float tempC = 0.0;

/* Averaging Variables */
float pHSum = 0;
float gasSum = 0;
float tempSum = 0;
int validReadings = 0;

/* Collector Variables */
String collectorId = "";
String collectorName = "";
String rfidUID = "";
float milkQuantity = 0.0;

/* Device Information */
String deviceId = "ESP32-001";

/* NTP Server */
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 19800;
const int daylightOffset_sec = 0;

/* WiFi Connection */
void connectWiFi()
{
    Serial.println("Connecting to WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long start = millis();

    while (WiFi.status() != WL_CONNECTED)
    {
        Serial.print(".");
        delay(300);

        if (millis() - start > 15000)
        {
            Serial.println("\nWiFi Connection Failed");
            return;
        }
    }

    Serial.println("\nWiFi Connected");
    Serial.print("IP Address : ");
    Serial.println(WiFi.localIP());
}

/* Time Synchronization */
void syncTime()
{
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    Serial.print("Synchronizing Time");

    int retries = 0;

    while (time(nullptr) < 1600000000 && retries < 20)
    {
        Serial.print(".");
        delay(500);
        retries++;
    }

    Serial.println(" Done");
}

/* Format RFID UID as XX:XX:XX:XX */
String formatRfidUID(byte* uid, byte size)
{
    String result = "";

    for (byte i = 0; i < size; i++)
    {
        if (i > 0)
            result += ":";

        if (uid[i] < 0x10)
            result += "0";

        result += String(uid[i], HEX);
    }

    result.toUpperCase();
    return result;
}

/* ISO 8601 local timestamp */
String getIsoTimestamp()
{
    time_t now = time(nullptr);
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);

    char buf[25];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
    return String(buf);
}

/* Generate unique test ID: MG-YYYYMMDD-NNNN */
String generateTestId()
{
    time_t now = time(nullptr);
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);

    char dateBuf[9];
    strftime(dateBuf, sizeof(dateBuf), "%Y%m%d", &timeinfo);

    prefs.begin("milkguard", false);
    String lastDate = prefs.getString("lastDate", "");
    int counter = prefs.getInt("testCounter", 0);

    if (lastDate != String(dateBuf))
    {
        counter = 0;
        lastDate = String(dateBuf);
    }

    counter++;
    prefs.putString("lastDate", lastDate);
    prefs.putInt("testCounter", counter);
    prefs.end();

    char idBuf[32];
    snprintf(idBuf, sizeof(idBuf), "MG-%s-%04d", dateBuf, counter);
    return String(idBuf);
}

/* Extract stringValue from a Firestore document fields object */
bool getFirestoreString(FirebaseJson &fields, const char *key, String &out)
{
    FirebaseJsonData fieldData;

    if (!fields.get(fieldData, key))
        return false;

    FirebaseJson valueJson;
    if (!fieldData.getJSON(valueJson))
        return false;

    FirebaseJsonData stringData;
    if (!valueJson.get(stringData, "stringValue"))
        return false;

    out = stringData.stringValue.c_str();
    return out.length() > 0;
}

/* Normalize UID for comparison (uppercase, colon-separated) */
String normalizeUid(const String &uid)
{
    String hex = uid;
    hex.replace(":", "");
    hex.toUpperCase();

    String result = "";
    for (unsigned int i = 0; i < hex.length(); i += 2)
    {
        if (i > 0)
            result += ":";
        result += hex.substring(i, i + 2);
    }
    return result;
}

/* Parse collector fields from a Firestore document fields object */
bool parseCollectorFields(FirebaseJson &fields, String &outId, String &outName, String &status)
{
    if (!getFirestoreString(fields, "collectorId", outId))
        return false;

    getFirestoreString(fields, "name", outName);
    getFirestoreString(fields, "status", status);
    return true;
}

/* Try to extract document fields from a runQuery payload (object or array) */
bool extractRunQueryFields(FirebaseJson &response, FirebaseJson &fields)
{
    FirebaseJsonData fieldsData;

    if (response.get(fieldsData, "document/fields"))
    {
        fieldsData.getJSON(fields);
        return true;
    }

    for (size_t i = 0; i < 10; i++)
    {
        String path = "[" + String(i) + "]/document/fields";
        if (!response.get(fieldsData, path.c_str()))
            break;

        fieldsData.getJSON(fields);
        return true;
    }

    return false;
}

/* Fallback: list collectors and match rfidUID client-side (small teams) */
bool lookupCollectorByList(const String &uid, String &outId, String &outName)
{
    Serial.println("Trying listDocuments fallback...");

    if (!Firebase.Firestore.listDocuments(
            &fbdo, FIREBASE_PROJECT_ID, "" /* (default) */, "collectors",
            100 /* pageSize */, "" /* pageToken */, "" /* orderBy */, "" /* mask */,
            false /* showMissing */))
    {
        Serial.print("listDocuments failed: ");
        Serial.println(fbdo.errorReason());
        return false;
    }

    Serial.println("listDocuments response:");
    Serial.println(fbdo.payload());

    FirebaseJson response;
    response.setJsonData(fbdo.payload());

    FirebaseJsonData docsData;
    if (!response.get(docsData, "documents"))
    {
        Serial.println("No documents array in listDocuments response.");
        return false;
    }

    FirebaseJsonArray docs;
    docsData.getArray(docs);

    const String targetUid = normalizeUid(uid);

    for (size_t i = 0; i < docs.size(); i++)
    {
        FirebaseJsonData docData;
        if (!docs.get(docData, i))
            continue;

        FirebaseJson doc;
        docData.getJSON(doc);

        FirebaseJsonData fieldsData;
        if (!doc.get(fieldsData, "fields"))
            continue;

        FirebaseJson fields;
        fieldsData.getJSON(fields);

        String docRfid, docId, docName, status;
        if (!getFirestoreString(fields, "rfidUID", docRfid))
            continue;

        if (normalizeUid(docRfid) != targetUid)
            continue;

        if (!parseCollectorFields(fields, outId, outName, status))
            return false;

        if (status != "ACTIVE")
        {
            Serial.println("Collector found but not ACTIVE.");
            return false;
        }

        return true;
    }

    return false;
}

/* Look up active collector by RFID UID in Firestore (read-only) */
bool lookupCollectorByRfid(const String &uid, String &outId, String &outName)
{
    if (!Firebase.ready())
        return false;

    const String normalizedUid = normalizeUid(uid);

    Serial.print("Looking up RFID in Firestore: ");
    Serial.println(normalizedUid);

    /* Mobizt runQuery expects StructuredQuery fields at root — NOT under structuredQuery/ */
    FirebaseJson query;
    query.set("from/collectionId", "collectors");
    query.set("from/allDescendants", false);
    query.set("where/fieldFilter/field/fieldPath", "rfidUID");
    query.set("where/fieldFilter/op", "EQUAL");
    query.set("where/fieldFilter/value/stringValue", normalizedUid);

    if (Firebase.Firestore.runQuery(
            &fbdo, FIREBASE_PROJECT_ID, "" /* (default) */, "/", &query))
    {
        Serial.println("runQuery response:");
        Serial.println(fbdo.payload());

        FirebaseJson response;
        response.setJsonData(fbdo.payload());

        FirebaseJson fields;
        if (extractRunQueryFields(response, fields))
        {
            String status;
            if (parseCollectorFields(fields, outId, outName, status))
            {
                if (status != "ACTIVE")
                {
                    Serial.println("Collector found but not ACTIVE.");
                    return false;
                }

                Serial.print("Collector identified: ");
                Serial.print(outId);
                Serial.print(" - ");
                Serial.println(outName);
                return outId.length() > 0;
            }
        }
    }
    else
    {
        Serial.print("Firestore runQuery failed: ");
        Serial.println(fbdo.errorReason());
    }

    /* Fallback if runQuery returns empty or parse fails */
    if (lookupCollectorByList(normalizedUid, outId, outName))
    {
        Serial.print("Collector identified (list): ");
        Serial.print(outId);
        Serial.print(" - ");
        Serial.println(outName);
        return true;
    }

    Serial.println("No collector found for this RFID.");
    Serial.println("Check Firestore collectors.rfidUID matches exactly, e.g. D1:C3:A7:00");
    return false;
}

/* Wait for RFID card tap; returns true when UID is captured */
bool waitForRfidCard()
{
    if (!mfrc522.PICC_IsNewCardPresent())
        return false;

    if (!mfrc522.PICC_ReadCardSerial())
        return false;

    rfidUID = normalizeUid(formatRfidUID(mfrc522.uid.uidByte, mfrc522.uid.size));

    Serial.print("RFID UID : ");
    Serial.println(rfidUID);

    return true;
}

void haltRfidCard()
{
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
}

void showLcdLine(const char *line1, const char *line2)
{
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(line1);
    lcd.setCursor(0, 1);
    lcd.print(line2);
}

void showLcdLine(const char *line1, const String &line2)
{
    showLcdLine(line1, line2.c_str());
}

void updateDeviceStatus()
{
    if (!Firebase.ready())
        return;

    FirebaseJson deviceJson;
    deviceJson.set("deviceId", deviceId);
    deviceJson.set("online", true);
    deviceJson.set("ipAddress", WiFi.localIP().toString());
    deviceJson.set("wifiStrength", WiFi.RSSI());
    deviceJson.set("lastSeen", (int)time(nullptr));

    Firebase.RTDB.setJSON(&fbdo, "liveData/deviceStatus", &deviceJson);
}

/* Build shared test payload */
void buildTestJson(FirebaseJson& testJson, const String& testId,
                   float avgPH, float avgGas, float avgTemp, const String& status)
{
    testJson.set("testId", testId);
    testJson.set("collectorId", collectorId);
    testJson.set("collectorName", collectorName);
    testJson.set("rfidUID", rfidUID);
    testJson.set("quantity", milkQuantity);
    testJson.set("pH", avgPH);
    testJson.set("gas", avgGas);
    testJson.set("temperature", avgTemp);
    testJson.set("status", status);
    testJson.set("timestamp", getIsoTimestamp());
    testJson.set("deviceId", deviceId);
}

/* Upload test result to RTDB liveData + milkTests/{testId} */
void uploadFirebase(float avgPH, float avgGas, float avgTemp, String status, const String& testId)
{
    if (status == "")
        status = "Unknown";

    if (!Firebase.ready())
    {
        Serial.println("Firebase not ready.");
        return;
    }

    FirebaseJson testJson;
    buildTestJson(testJson, testId, avgPH, avgGas, avgTemp, status);

    if (Firebase.RTDB.setJSON(&fbdo, "liveData/currentTest", &testJson))
        Serial.println("Current Test Uploaded");
    else
    {
        Serial.println("Current Test Upload Failed");
        Serial.println(fbdo.errorReason());
    }

    FirebaseJson collectorJson;
    collectorJson.set("collectorId", collectorId);
    collectorJson.set("name", collectorName);
    collectorJson.set("rfidUID", rfidUID);

    if (Firebase.RTDB.setJSON(&fbdo, "liveData/currentCollector", &collectorJson))
        Serial.println("Collector Updated");

    FirebaseJson statusJson;
    statusJson.set("status", status);

    if (status == "Fresh")
        statusJson.set("message", "Milk accepted successfully.");
    else if (status == "Warning")
        statusJson.set("message", "Milk quality requires attention.");
    else if (status == "Spoiled")
        statusJson.set("message", "Milk rejected due to poor quality.");
    else
        statusJson.set("message", "Milk status unknown.");

    statusJson.set("time", getIsoTimestamp());
    Firebase.RTDB.setJSON(&fbdo, "liveData/latestStatus", &statusJson);

    updateDeviceStatus();

    String milkTestPath = "milkTests/" + testId;
    if (Firebase.RTDB.setJSON(&fbdo, milkTestPath.c_str(), &testJson))
        Serial.println("Milk Test Record Uploaded");
    else
    {
        Serial.println("Milk Test Upload Failed");
        Serial.println(fbdo.errorReason());
    }
}

/* SETUP */
void setup()
{
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("====================================");
    Serial.println("      MilkGuard Ecosystem");
    Serial.println("====================================");

    Wire.begin(21, 22);
    lcd.init();
    lcd.backlight();
    showLcdLine("MilkGuard", "Initializing");

    sensors.begin();
    sensors.requestTemperatures();
    delay(1000);

    SPI.begin();
    mfrc522.PCD_Init();
    Serial.println("RFID Reader Ready");

    connectWiFi();

    if (WiFi.status() != WL_CONNECTED)
    {
        showLcdLine("WiFi Failed", "Check Network");
        return;
    }

    syncTime();
    showLcdLine("WiFi Connected", "Connecting DB");

    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;
    auth.user.email = USER_EMAIL;
    auth.user.password = USER_PASSWORD;
    config.token_status_callback = tokenStatusCallback;
    Firebase.reconnectNetwork(true);
    fbdo.setResponseSize(8192);
    config.timeout.serverResponse = 10000;

    Firebase.begin(&config, &auth);
    Firebase.setDoubleDigits(5);

    Serial.println("Initializing Firebase...");
    unsigned long startFirebase = millis();

    while (!Firebase.ready())
    {
        Serial.print(".");
        delay(500);

        if (millis() - startFirebase > 15000)
        {
            Serial.println("\nFirebase Initialization Timeout");
            Serial.println(fbdo.errorReason());
            break;
        }
    }

    if (Firebase.ready())
    {
        Serial.println("Firebase Ready");
        showLcdLine("Firebase Ready", "System Online");
        updateDeviceStatus();
    }
    else
    {
        showLcdLine("Firebase Error", "Offline Mode");
    }

    delay(2000);
    showLcdLine("MilkGuard Ready", "Tap RFID Card");
    Serial.println("Setup Completed — waiting for RFID");
}

/* MAIN LOOP — WAIT_RFID → LOOKUP → TEST → UPLOAD → WAIT_RFID */
void loop()
{
    static bool waitingDisplayed = false;
    static unsigned long lastHeartbeat = 0;
    const unsigned long HEARTBEAT_MS = 20000;

    if (Firebase.ready() && millis() - lastHeartbeat >= HEARTBEAT_MS)
    {
        updateDeviceStatus();
        lastHeartbeat = millis();
    }

    if (!waitingDisplayed)
    {
        showLcdLine("Tap RFID Card", "To Begin");
        waitingDisplayed = true;
    }

    if (!waitForRfidCard())
    {
        delay(200);
        return;
    }

    waitingDisplayed = false;
    showLcdLine("RFID Detected", "Checking...");

    collectorId = "";
    collectorName = "";

    if (!lookupCollectorByRfid(rfidUID, collectorId, collectorName))
    {
        showLcdLine("Unknown Card", "Please Register");
        Serial.println("Unregistered RFID — milk test blocked.");
        delay(3000);
        haltRfidCard();
        return;
    }

    String shortName = collectorName.substring(0, 16);
    showLcdLine("Collector:", shortName);
    delay(1500);
    showLcdLine("Testing Milk", "Please Wait");

    pHSum = 0;
    gasSum = 0;
    tempSum = 0;
    validReadings = 0;

    for (int i = 0; i < 10; i++)
    {
        int adcValue = analogRead(PH_PIN);
        voltage = adcValue * (3.3 / 4095.0);
        pHValue = 7 + ((2.5 - voltage) / 0.18);

        gasValue = analogRead(MQ135_PIN);

        sensors.requestTemperatures();
        tempC = sensors.getTempCByIndex(0);

        if (tempC != DEVICE_DISCONNECTED_C)
        {
            Serial.print("Reading ");
            Serial.println(i + 1);

            if (i >= 3)
            {
                pHSum += pHValue;
                gasSum += gasValue;
                tempSum += tempC;
                validReadings++;
            }
        }
        else
        {
            Serial.println("Temperature sensor error");
        }

        delay(2000);
    }

    float avgPH = validReadings > 0 ? pHSum / validReadings : 0;
    float avgGas = validReadings > 0 ? gasSum / validReadings : 0;
    float avgTemp = validReadings > 0 ? tempSum / validReadings : 0;

    String status;
    if (avgGas < 520 && avgPH >= 6.6 && avgPH <= 6.9)
        status = "Fresh";
    else if (avgGas >= 520 && avgGas <= 780)
        status = "Warning";
    else if (avgGas > 780)
        status = "Spoiled";
    else
        status = "Unknown";

    Serial.print("Status: ");
    Serial.println(status);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("pH:");
    lcd.print(avgPH, 1);
    lcd.print(" Gas:");
    lcd.print(avgGas, 0);
    lcd.setCursor(0, 1);
    lcd.print("Temp:");
    lcd.print(avgTemp, 1);
    lcd.print(" ");
    lcd.print(status);

    String testId = generateTestId();
    Serial.print("Test ID: ");
    Serial.println(testId);

    if (Firebase.ready())
        uploadFirebase(avgPH, avgGas, avgTemp, status, testId);

    delay(8000);
    haltRfidCard();

    collectorId = "";
    collectorName = "";
    rfidUID = "";
    waitingDisplayed = false;

    showLcdLine("MilkGuard Ready", "Tap RFID Card");
}