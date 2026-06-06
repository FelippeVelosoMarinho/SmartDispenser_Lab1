#!/usr/bin/env bash
# Fase 4 — teste manual da sequência de dispensação posições 1→2→3
set -euo pipefail

IP="${1:-}"
SILENT="${2:-true}"

if [[ -z "$IP" ]]; then
  echo "Uso: $0 <IP_ESP> [silent_mode=true|false]"
  echo "Exemplo: $0 192.168.1.50 true"
  exit 1
fi

BASE="http://${IP}"
TIMEOUT=5

get_slot() {
  curl -sf --connect-timeout "$TIMEOUT" "${BASE}/status" | grep -o '"current_slot":[0-9]*' | cut -d: -f2
}

get_awaiting() {
  curl -sf --connect-timeout "$TIMEOUT" "${BASE}/status" | grep -o '"awaiting_confirm":[a-z]*' | cut -d: -f2
}

dispense() {
  local period="$1"
  local expected="$2"
  curl -sf --connect-timeout "$TIMEOUT" -X POST "${BASE}/dispense" \
    -H "Content-Type: application/json" \
    -d "{\"period\":\"${period}\",\"silent_mode\":${SILENT},\"expected_slot\":${expected}}"
}

echo "=== Fase 4 — Sequência manual em ${BASE} ==="
echo "Modo silencioso: ${SILENT}"
echo

echo "Passo 1: Calibrar (slot 0)"
curl -sf --connect-timeout "$TIMEOUT" -X POST "${BASE}/calibrate" | { command -v jq >/dev/null && jq . || cat; }
SLOT=$(get_slot)
[[ "$SLOT" == "0" ]] && echo "   OK  current_slot=0" || { echo "   FALHOU  current_slot=${SLOT}"; exit 1; }
echo

echo "Passo 2: Dispensar posição 1 (morning)"
dispense morning 1 | { command -v jq >/dev/null && jq . || cat; }
SLOT=$(get_slot)
AWAIT=$(get_awaiting)
[[ "$SLOT" == "1" ]] && echo "   OK  current_slot=1" || { echo "   FALHOU  current_slot=${SLOT}"; exit 1; }
[[ "$AWAIT" == "true" ]] && echo "   OK  awaiting_confirm=true" || echo "   AVISO  awaiting_confirm=${AWAIT}"
echo

echo "Passo 3: Confirmar"
curl -sf --connect-timeout "$TIMEOUT" -X POST "${BASE}/confirm" | { command -v jq >/dev/null && jq . || cat; }
AWAIT=$(get_awaiting)
[[ "$AWAIT" == "false" ]] && echo "   OK  awaiting_confirm=false" || echo "   AVISO  awaiting_confirm=${AWAIT}"
echo

echo "Passo 4: Dispensar posição 2 (afternoon)"
dispense afternoon 2 | { command -v jq >/dev/null && jq . || cat; }
SLOT=$(get_slot)
[[ "$SLOT" == "2" ]] && echo "   OK  current_slot=2" || { echo "   FALHOU  current_slot=${SLOT}"; exit 1; }
echo

echo "Passo 5: Teste de proteção — dispense posição 3 com slot 2 (deve passar)"
dispense night 3 | { command -v jq >/dev/null && jq . || cat; }
SLOT=$(get_slot)
[[ "$SLOT" == "3" ]] && echo "   OK  current_slot=3" || { echo "   FALHOU  current_slot=${SLOT}"; exit 1; }
echo

echo "Passo 6: Teste mismatch — calibrar e tentar posição 3 direto (esperado 409)"
curl -sf --connect-timeout "$TIMEOUT" -X POST "${BASE}/calibrate" >/dev/null
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$TIMEOUT" -X POST "${BASE}/dispense" \
  -H "Content-Type: application/json" \
  -d "{\"period\":\"night\",\"silent_mode\":${SILENT},\"expected_slot\":3}")
[[ "$HTTP" == "409" ]] && echo "   OK  HTTP 409 slot_mismatch" || echo "   FALHOU  HTTP ${HTTP} (esperado 409)"
echo

echo "=== Fase 4 concluída ==="
echo "Observe fisicamente: servo, LEDs (GPIO 3/4/5), buzzer/vibração e botão confirmar (GPIO 0)."
