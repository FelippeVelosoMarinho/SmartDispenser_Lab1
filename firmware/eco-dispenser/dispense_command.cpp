#include "dispense_command.h"
#include "config.h"
#include "carousel.h"
#include "alerts.h"

static String normalizePeriod(const String& period) {
  if (period == "morning" || period == "afternoon" || period == "night") {
    return period;
  }
  return "morning";
}

DispenseResult executeDispense(
  const String& period,
  bool silentMode,
  int expectedSlot,
  bool hasExpected
) {
  DispenseResult result = {false, nullptr, getCurrentSlot()};

  if (isAwaitingConfirmation()) {
    result.error = "awaiting_confirm";
    return result;
  }

  String normalized = normalizePeriod(period);

  if (hasExpected) {
    if (expectedSlot < 0 || expectedSlot >= TOTAL_SLOTS) {
      result.error = "invalid_expected_slot";
      return result;
    }
    int requiredBefore = (expectedSlot - 1 + TOTAL_SLOTS) % TOTAL_SLOTS;
    if (getCurrentSlot() != requiredBefore) {
      result.error = "slot_mismatch";
      return result;
    }
  }

  advanceCarousel();
  triggerDispenseAlert(silentMode, normalized);
  result.success = true;
  result.error = nullptr;
  result.current_slot = getCurrentSlot();
  return result;
}

String buildDispenseResponseJson(const DispenseResult& result, int httpErrorSlot) {
  if (result.success) {
    return "{\"success\":true,\"current_slot\":" + String(result.current_slot) + "}";
  }
  String resp = "{\"success\":false,\"error\":\"" + String(result.error ? result.error : "unknown") + "\"";
  resp += ",\"current_slot\":" + String(result.current_slot);
  if (httpErrorSlot > 0 && String(result.error) == "slot_mismatch") {
    resp += ",\"expected_slot\":" + String(httpErrorSlot);
  }
  resp += "}";
  return resp;
}
