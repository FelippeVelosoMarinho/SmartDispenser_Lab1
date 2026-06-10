#ifndef ALERTS_H
#define ALERTS_H

#include <Arduino.h>

void alertsSetup();
void triggerDispenseAlert(bool silentMode, const String& period);
void clearAlerts();
void alertsTick(unsigned long nowMs);
void volumeUp();
void volumeDown();
bool isAwaitingConfirmation();

#endif