#ifndef DISPENSE_COMMAND_H
#define DISPENSE_COMMAND_H

#include <Arduino.h>

struct DispenseResult {
  bool success;
  const char* error;
  int current_slot;
};

DispenseResult executeDispense(
  const String& period,
  bool silentMode,
  int expectedSlot,
  bool hasExpected
);

String buildDispenseResponseJson(const DispenseResult& result, int httpErrorSlot = 0);

#endif
