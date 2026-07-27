/*******************************************************
 * MilkGuard Ecosystem - MilkGuard Device
 *******************************************************/

#include <Wire.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <time.h>
//#include <SPI.h>
//#include <MFRC522.h>

/* WiFi Credentials */
#define WIFI_SSID "HONOR X6a"
#define WIFI_PASSWORD "123456789"

/* Firebase Credentials */
#define API_KEY "AIzaSyBncEI1ToSsh8_ER2D-GC7Fiard_mE7vBw"
#define DATABASE_URL "https://milkguard-system-default-rtdb.asia-southeast1.firebasedatabase.app"
#define USER_EMAIL "anuhansisithumini@gmail.com"
#define USER_PASSWORD "Sithu123"

/* Firebase Objects */
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

/* LCD */
LiquidCrystal_I2C lcd(0x27, 16, 2);

/* Sensor Pins */
#define PH_PIN      34
#define MQ135_PIN   35
#define TEMP_PIN    15
//#define SS_PIN 5
//#define RST_PIN 27

//MFRC522 mfrc522(SS_PIN, RST_PIN);

/* Temperature Sensor */
OneWire oneWire(TEMP_PIN);
DallasTemperature sensors(&oneWire);

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

/* Device Variables */
unsigned long sendDataPrevMillis = 0;

/* Collector Variables - (Updated automatically after RFID implementation) */
String collectorId = "";
String collectorName = "";
String rfidUID = "";
float milkQuantity = 0.0;

/*******************************************************
 * Future Example
 *
 * collectorId = "COL001";
 * collectorName = "John Silva";
 * rfidUID = "8A3F91BC";
 * milkQuantity = 25;
 *******************************************************/

/* Device Information */
String deviceId = "ESP32-001";

//String firmwareVersion = "1.0.0";

/* NTP Server */
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 19800;
const int daylightOffset_sec = 0;

/* WiFi Connection */
void connectWiFi()
{
    Serial.println("Connecting to WiFi...");
    WiFi.begin( WIFI_SSID, WIFI_PASSWORD );
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

    Serial.println( WiFi.localIP() );
}

/* Time Synchronization */
void syncTime()
{
    configTime( gmtOffset_sec, daylightOffset_sec, ntpServer );
    Serial.print("Synchronizing Time");

    int retries = 0;

    while ( time(nullptr) < 1600000000 && retries < 20 )
    {
        Serial.print(".");
        delay(500);
        retries++;
    }

    Serial.println(" Done");
}

/* Future RFID Function */
/*
void readRFID()
{
    if(!mfrc522.PICC_IsNewCardPresent())
        return;

    if(!mfrc522.PICC_ReadCardSerial())
        return;

    rfidUID="";

    for(byte i=0;i<mfrc522.uid.size;i++)
    {
        rfidUID += String( mfrc522.uid.uidByte[i], HEX );
    }

    rfidUID.toUpperCase();

    Serial.print("RFID UID : ");
    Serial.println(rfidUID);
}
*/

/* FIREBASE UPLOAD */
void uploadFirebase(float avgPH, float avgGas, float avgTemp, String status, FirebaseJsonArray &currentReadings)
{
    if(status == "")
        status = "Unknown";

    if(!Firebase.ready())
    {
        Serial.println("Firebase not ready.");
        return;
    }

    /* Current Test */
    FirebaseJson testJson;

    /* Future RFID Information */
    testJson.set("collectorId", collectorId);
    testJson.set("collectorName", collectorName);
    testJson.set("rfidUID", rfidUID);
    testJson.set("quantity", milkQuantity);

    /* Sensor Data */
    testJson.set("pH", avgPH);
    testJson.set("gas", avgGas);
    testJson.set("temperature", avgTemp);
    testJson.set("status", status);
    testJson.set("timestamp", String(millis()));

    // Store all 10 readings
    // testJson.set("readings", currentReadings);

    if( Firebase.RTDB.setJSON( &fbdo, "liveData/currentTest", &testJson ) )
    {
        Serial.println( "Current Test Uploaded" );
    }
    else
    {
        Serial.println( "Current Test Upload Failed" );
        Serial.println( fbdo.errorReason() );
    }

    /* Current Collector */
    FirebaseJson collectorJson;

    collectorJson.set( "collectorId", collectorId );
    collectorJson.set( "name", collectorName );
    collectorJson.set( "rfidUID", rfidUID );

    if( Firebase.RTDB.setJSON( &fbdo, "liveData/currentCollector", &collectorJson ) )
    {
        Serial.println( "Collector Updated" );
    }
    else
    {
        Serial.println( "Collector Upload Failed" );
        Serial.println( fbdo.errorReason() );
    }

    /* Latest Status */
    FirebaseJson statusJson;

    statusJson.set( "status", status );

    if(status == "Fresh")
    {
        statusJson.set( "message", "Milk accepted successfully." );
    }
    else if(status == "Warning")
    {
        statusJson.set( "message", "Milk quality requires attention." );
    }
    else if(status == "Spoiled")
    {
        statusJson.set( "message", "Milk rejected due to poor quality." );
    }
    else
    {
        statusJson.set( "message", "Milk status unknown." );
    }

    statusJson.set( "time", String(millis()) );

    if( Firebase.RTDB.setJSON( &fbdo, "liveData/latestStatus", &statusJson ) )
    {
        Serial.println( "Latest Status Updated" );
    }
    else
    {
        Serial.println( "Latest Status Upload Failed" );
        Serial.println( fbdo.errorReason() );
    }

    /* Device Status */
    FirebaseJson deviceJson;

    deviceJson.set( "deviceId", deviceId );
    deviceJson.set( "online", true );
    deviceJson.set( "ipAddress", WiFi.localIP().toString() );
    deviceJson.set( "wifiStrength", WiFi.RSSI() );
    deviceJson.set( "lastSeen", millis() );
    // deviceJson.set( "firmwareVersion", "1.0.0" );

    if( Firebase.RTDB.setJSON( &fbdo, "liveData/deviceStatus", &deviceJson ) )
    {
        Serial.println( "Device Status Updated" );
    }
    else
    {
        Serial.println( "Device Status Upload Failed" );
        Serial.println( fbdo.errorReason() );
    }

    /* FUTURE ALERTS */
    /* if(status == "Spoiled")
    {
        FirebaseJson alertJson;

        alertJson.set( "title", "Spoiled Milk Detected" );
        alertJson.set( "message", "Milk from collector rejected." );
        alertJson.set( "severity", "HIGH" );
        alertJson.set( "timestamp", String(millis()) );
        Firebase.RTDB.setJSON( &fbdo, "liveData/alerts", &alertJson );
    }
    */

    /* FUTURE FIRESTORE */
}

/* SETUP */
void setup()
{

    /* Serial Monitor */
    Serial.begin(115200);

    delay(1000);

    Serial.println();
    Serial.println("====================================");
    Serial.println("      MilkGuard Ecosystem");
    Serial.println("      Device Firmware V2.0");
    Serial.println("====================================");
    Serial.println();

    /* Initialize LCD */
    Wire.begin(21, 22);
    lcd.init();
    lcd.backlight();
    lcd.clear();

    lcd.setCursor(0,0);
    lcd.print("MilkGuard");

    lcd.setCursor(0,1);
    lcd.print("Initializing");

    /* Initialize Temperature Sensor */
    sensors.begin();

    // Prime DS18B20 to avoid first invalid reading
    sensors.requestTemperatures();

    delay(1000);

    /* Future RFID Initialization */
    /*
    SPI.begin();
    mfrc522.PCD_Init();
    Serial.println("RFID Reader Ready");
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("RFID Ready");
    delay(1000);
    */

    /* Connect WiFi */
    connectWiFi();

    if(WiFi.status() != WL_CONNECTED)
    {
        lcd.clear();
        lcd.setCursor(0,0);
        lcd.print("WiFi Failed");
        Serial.println("Unable to connect to WiFi.");
        return;
    }

    /* Synchronize Time */
    syncTime();

    /* LCD Ready Message */
    lcd.clear();

    lcd.setCursor(0,0);
    lcd.print("WiFi Connected");

    lcd.setCursor(0,1);
    lcd.print("Connecting DB");

    /* Firebase Configuration */
    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;
    auth.user.email = USER_EMAIL;
    auth.user.password = USER_PASSWORD;
    Firebase.reconnectNetwork(true);
    fbdo.setResponseSize(4096);
    config.timeout.serverResponse = 10000;

    Firebase.begin( &config, &auth );
    Firebase.setDoubleDigits(5);

    Serial.println();
    Serial.println("Initializing Firebase...");

    /* Wait for Firebase */
    unsigned long startFirebase = millis();

    while(!Firebase.ready())
    {
        Serial.print(".");
        delay(500);

        if(millis()-startFirebase > 15000)
        {
            Serial.println();
            Serial.println("Firebase Initialization Timeout");
            Serial.println( fbdo.errorReason() );
            break;
        }
    }

    Serial.println();

    if(Firebase.ready())
    {
        Serial.println("Firebase Ready");
        lcd.clear();

        lcd.setCursor(0,0);
        lcd.print("Firebase Ready");

        lcd.setCursor(0,1);
        lcd.print("System Online");
    }
    else
    {
        Serial.println("Firebase NOT Ready");
        lcd.clear();

        lcd.setCursor(0,0);
        lcd.print("Firebase Error");

        lcd.setCursor(0,1);
        lcd.print("Offline Mode");
    }

    delay(2000);

    /* Initial Live Data */
    if(Firebase.ready())
    {
        FirebaseJson deviceJson;

        deviceJson.set( "deviceId", deviceId );
        deviceJson.set( "online", true );
        deviceJson.set( "ipAddress", WiFi.localIP().toString() );
        deviceJson.set( "wifiStrength", WiFi.RSSI() );
        deviceJson.set( "lastSeen", millis() );
        Firebase.RTDB.setJSON( &fbdo, "liveData/deviceStatus", &deviceJson );
    }

    /* Ready Screen */
    lcd.clear();

    lcd.setCursor(0,0);
    lcd.print("MilkGuard");

    lcd.setCursor(0,1);
    lcd.print("Ready");

    Serial.println();
    Serial.println("====================================");
    Serial.println("Setup Completed Successfully");
    Serial.println("MilkGuard Ready");
    Serial.println("====================================");
    Serial.println();
}

/* MAIN LOOP */
void loop()
{
    Serial.println();
    Serial.println("==============================");
    Serial.println("Starting Milk Test");
    Serial.println("==============================");

    /* FUTURE RFID SCANNING - (before milk testing)*/
    /* if(!mfrc522.PICC_IsNewCardPresent())
    {
        Serial.println("Waiting for RFID...");
        return;
    }

    if(!mfrc522.PICC_ReadCardSerial())
    {
        return;
    }

    rfidUID = "";

    for(byte i=0;i<mfrc522.uid.size;i++)
    {
        rfidUID += String( mfrc522.uid.uidByte[i], HEX );
    }

    rfidUID.toUpperCase();

    Serial.print("RFID UID : ");
    Serial.println(rfidUID);
     */

    /* LCD TEST SCREEN */
    lcd.clear();

    lcd.setCursor(0,0);
    lcd.print("Testing Milk");

    lcd.setCursor(0,1);
    lcd.print("Please Wait");

    /* Reset Variables */
    pHSum = 0;
    gasSum = 0;
    tempSum = 0;
    validReadings = 0;

    FirebaseJsonArray currentReadings;
    currentReadings.clear();

    /* Collect 10 Sensor Readings */
    for(int i=0;i<10;i++)
    {
        /* pH SENSOR */
        int adcValue =
        analogRead(PH_PIN);

        voltage = adcValue * (3.3 / 4095.0);
        pHValue = 7 + ((2.5-voltage)/0.18);

        /* MQ135 GAS SENSOR */
        gasValue =
        analogRead(MQ135_PIN);

        /* TEMPERATURE SENSOR */
        sensors.requestTemperatures();
        tempC = sensors.getTempCByIndex(0);

        if(tempC != DEVICE_DISCONNECTED_C)
        {
            FirebaseJson reading;
            
            reading.set( "pH", pHValue );
            reading.set( "gas", gasValue );
            reading.set( "temperature", tempC );
            reading.set( "index", i+1 );
            currentReadings.add( reading );

            Serial.print( "Reading " );
            Serial.println( i+1 );
            Serial.print( "pH : " );
            Serial.println( pHValue );
            Serial.print( "Gas : " );
            Serial.println( gasValue );
            Serial.print( "Temperature : " );
            Serial.println( tempC );

            /* Ignore first 3 readings for sensor stabilization */
            if(i>=3)
            {
                pHSum += pHValue;
                gasSum += gasValue;
                tempSum += tempC;
                validReadings++;
            }
        }
        else
        {
            Serial.println( "Temperature sensor error" );
        }
        delay(2000);
    }

    /* Calculate Average Values */
    float avgPH = validReadings > 0 ? pHSum / validReadings : 0;
    float avgGas = validReadings > 0 ? gasSum / validReadings : 0;
    float avgTemp = validReadings > 0 ? tempSum / validReadings : 0;

    /* Milk Quality Decision */
    String status;

    if( avgGas < 520 && avgPH >=6.6 && avgPH <=6.9 )
    {
        status="Fresh";
    }
    else if( avgGas >=520 && avgGas <=780 )
    {
        status="Warning";
    }
    else if( avgGas >780 )
    {
        status="Spoiled";
    }
    else
    {
        status="Unknown";
    }

    /* Serial Output */
    Serial.println();
    Serial.println("-----------------------");
    
    Serial.print( "Average pH : " );
    Serial.println( avgPH );

    Serial.print( "Average Gas : " );
    Serial.println( avgGas );

    Serial.print( "Average Temp : ");
    Serial.println( avgTemp );

    Serial.print( "Status : " );
    Serial.println( status );
    Serial.println( "-----------------------" );

    /* LCD OUTPUT */
    lcd.clear();
    lcd.setCursor(0,0);

    lcd.print("pH:");
    lcd.print( avgPH, 1 );

    lcd.print(" Gas:");
    lcd.print( avgGas, 0 );
    
    lcd.setCursor(0,1);
    lcd.print("Temp:");
    lcd.print( avgTemp, 1 );
    
    lcd.print(" ");
    lcd.print( status );

    /* Firebase Upload */
    if(Firebase.ready())
    {
        uploadFirebase( avgPH, avgGas,  avgTemp, status, currentReadings );
    }

    /* FUTURE FIRESTORE HISTORY */

    /* WAIT BEFORE NEXT TEST */
    delay(8000);
}