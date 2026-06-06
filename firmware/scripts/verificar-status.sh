#!/usr/bin/env bash
# Fase 0 — verificação rápida de boot e API HTTP do ESP32
set -euo pipefail

IP="${1:-}"
if [[ -z "$IP" ]]; then
  echo "Uso: $0 <IP_ESP>"
  echo "Exemplo: $0 192.168.1.50"
  exit 1
fi

BASE="http://${IP}"
echo "=== Verificação ESP32 em ${BASE} ==="
echo

echo "1. GET /status"
if ! STATUS=$(curl -sf --connect-timeout 5 "${BASE}/status"); then
  echo "   FALHOU — ESP inacessível em ${BASE}"
  echo "   Verifique: ESP ligado, mesma rede Wi-Fi, IP correto (Serial Monitor 115200)"
  exit 1
fi

if command -v jq >/dev/null 2>&1; then
  echo "$STATUS" | jq .
else
  echo "$STATUS"
fi
echo

echo "2. Campos esperados"
for field in current_slot total_slots hardware_id wifi_rssi awaiting_confirm; do
  if echo "$STATUS" | grep -q "\"${field}\""; then
    echo "   OK  ${field}"
  else
    echo "   FALTA  ${field}"
  fi
done
echo

echo "3. GET / (página de diagnóstico)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${BASE}/")
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "   OK  HTTP ${HTTP_CODE}"
else
  echo "   FALHOU  HTTP ${HTTP_CODE}"
  exit 1
fi

echo
echo "=== Fase 0 concluída com sucesso ==="
