#ifndef JSON_UTILS_H
#define JSON_UTILS_H

#include <Arduino.h>

// Extrai valor escalar de um campo JSON simples (string, número, bool).
static inline String extractJsonField(const String& body, const String& key) {
  int keyPos = body.indexOf("\"" + key + "\"");
  if (keyPos == -1) return "";

  int colonPos = body.indexOf(":", keyPos);
  if (colonPos == -1) return "";

  int valStart = colonPos + 1;
  while (valStart < (int)body.length() && body[valStart] == ' ') valStart++;

  bool inString = (body[valStart] == '"');
  if (inString) valStart++;

  String val = "";
  for (int i = valStart; i < (int)body.length(); i++) {
    char c = body[i];
    if (inString && c == '"') break;
    if (!inString && (c == ',' || c == '}' || c == ' ')) break;
    val += c;
  }
  return val;
}

#endif
