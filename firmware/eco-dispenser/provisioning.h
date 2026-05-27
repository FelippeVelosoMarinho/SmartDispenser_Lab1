#ifndef PROVISIONING_H
#define PROVISIONING_H

#include <Arduino.h>

// Returns true if WiFi credentials exist in NVS.
bool hasStoredCredentials();

String getStoredSsid();
String getStoredPassword();

// Saves credentials to NVS (overwrites existing).
void saveCredentials(const String& ssid, const String& pass);

// Erases stored credentials — triggers BLE provisioning on next boot.
void clearStoredCredentials();

// Advertises BLE and blocks until the app writes WiFi credentials.
// Credentials are saved to NVS automatically before this returns.
// Requires NimBLE-Arduino library: https://github.com/h2zero/NimBLE-Arduino
void runBleProvisioning();

#endif
