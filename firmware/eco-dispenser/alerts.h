#ifndef ALERTS_H
#define ALERTS_H

#include <Arduino.h>

void alertsSetup();
void triggerDispenseAlert(bool silentMode, const String& period);
void clearAlerts();
void alertsTick(unsigned long nowMs);
bool isAwaitingConfirmation();
void setRefillMode(bool enabled);
bool isRefillMode();

#endif