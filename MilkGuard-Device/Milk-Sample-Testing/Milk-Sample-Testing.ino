#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

// Define sensor pins
#define PH_PIN 34          // ESP32 ADC pin for pH sensor
#define MQ135_PIN 35       // ESP32 ADC pin for MQ-135 sensor
#define TEMP_PIN 15         // DS18B20 data pin connected to GPIO15

// DS18B20 setup
OneWire oneWire(TEMP_PIN);
DallasTemperature sensors(&oneWire);

float voltage = 0.0;
float pHValue = 0.0;
int gasValue = 0;
float tempC = 0;

void setup() {
  Serial.begin(115200);
  delay(2000);

  // Initialize I2C with custom pins
  Wire.begin(21,22);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // Start sensors
  sensors.begin();

  lcd.setCursor(0,0);
  lcd.print("Milk Test System");
}

void loop() {

  // pH sensor reading
  int adcValue = analogRead(PH_PIN);
  voltage = adcValue * (3.3 / 4095.0);
  pHValue = 7 + ((2.5 - voltage) / 0.18);

  // MQ-135 sensor reading
  gasValue = analogRead(MQ135_PIN);

  // Temperature reading
  sensors.requestTemperatures();
  tempC = sensors.getTempCByIndex(0);

  // Serial Monitor Output
  Serial.print("volt: "); Serial.print(voltage,2);
  Serial.print(" | pH: "); Serial.print(pHValue,2);
  Serial.print(" | Gas: "); Serial.print(gasValue);
  Serial.print(" | Temp: "); Serial.print(tempC);
  Serial.println(" C");

  // LCD Display
  lcd.clear();

  lcd.setCursor(0,0);
  lcd.print("pH:");
  lcd.print(pHValue,1);
  lcd.print("Temp:");
  lcd.print(tempC,1);

  lcd.setCursor(0,1);
  lcd.print("Gas:");
  lcd.print(gasValue);

  delay(2000);
}