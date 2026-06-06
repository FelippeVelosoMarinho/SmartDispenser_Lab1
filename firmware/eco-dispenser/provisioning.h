#ifndef PROVISIONING_H
#define PROVISIONING_H

#include <Arduino.h>

// MAC estável do hardware (Wi-Fi STA / eFuse). Use em BLE, heartbeat e /status.
String getHardwareId();

// Returns true if WiFi credentials exist in NVS.
bool hasStoredCredentials();

String getStoredSsid();
String getStoredPassword();
String getStoredBackendUrl();

// Saves credentials to NVS (overwrites existing).
void saveCredentials(const String& ssid, const String& pass, const String& burl = "");

// Erases stored credentials — triggers BLE provisioning on next boot.
void clearStoredCredentials();

// Disconnects Wi-Fi, clears NVS credentials, and restarts (BLE provisioning on next boot).
void performWifiFactoryReset();

// Agenda reset após enviar resposta HTTP (chamar processPendingWifiFactoryReset no loop).
void scheduleWifiFactoryReset(unsigned long delayMs);

void processPendingWifiFactoryReset();

// Tracks consecutive WiFi connection failures across reboots.
int  getWifiFailureCount();
int  incrementWifiFailureCount();
void resetWifiFailureCount();

// Advertises BLE and blocks until the app writes WiFi credentials.
// Credentials are saved to NVS automatically before this returns.
// Requires NimBLE-Arduino library: https://github.com/h2zero/NimBLE-Arduino
void runBleProvisioning();

#endif
