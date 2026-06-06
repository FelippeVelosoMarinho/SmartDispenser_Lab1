#!/usr/bin/env bash
# E2E — horários por período (manhã/tarde/noite) + start-cycle integrado
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE="${1:-${SCRIPT_DIR}/../test-fixtures/e2e-periods.json}"

if [[ ! -f "$FIXTURE" ]]; then
  echo "Fixture não encontrado: $FIXTURE"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq é necessário. Instale com: sudo apt install jq"
  exit 1
fi

BACKEND="$(jq -r '.backend_url' "$FIXTURE")"
USER="$(jq -r '.credentials.username' "$FIXTURE")"
PASS="$(jq -r '.credentials.password' "$FIXTURE")"
MAC="$(jq -r '.dispenser_mac' "$FIXTURE")"
PATIENT_ID="$(jq -r '.patient_id' "$FIXTURE")"
MORNING="$(jq -r '.period_times.morning' "$FIXTURE")"
AFTERNOON="$(jq -r '.period_times.afternoon' "$FIXTURE")"
NIGHT="$(jq -r '.period_times.night' "$FIXTURE")"
AUTO_START="$(jq -r '.auto_start_cycle' "$FIXTURE")"
TIMEOUT="$(jq -r '.monitor_timeout_seconds // 600' "$FIXTURE")"
EXPECTED="$(jq -r '.expected_dispenses // 3' "$FIXTURE")"

# Offsets relativos opcionais: "+2 min" em vez de HH:MM fixo
resolve_time() {
  local raw="$1"
  if [[ "$raw" =~ ^\+([0-9]+)[[:space:]]*min ]]; then
    local mins="${BASH_REMATCH[1]}"
    date -d "+${mins} minutes" '+%H:%M' 2>/dev/null || date -v+"${mins}M" '+%H:%M'
  else
    echo "$raw"
  fi
}

MORNING="$(resolve_time "$MORNING")"
AFTERNOON="$(resolve_time "$AFTERNOON")"
NIGHT="$(resolve_time "$NIGHT")"

echo "=== E2E períodos — SmartDispenser ==="
echo "Backend:  $BACKEND"
echo "MAC:      $MAC"
echo "Horários: $MORNING / $AFTERNOON / $NIGHT"
echo

echo "1. Login…"
LOGIN_RESP=$(curl -s -w "\nHTTP:%{http_code}" -X POST "${BACKEND}/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${USER}&password=${PASS}")
HTTP=$(echo "$LOGIN_RESP" | grep HTTP | cut -d: -f2)
BODY=$(echo "$LOGIN_RESP" | sed '/HTTP/d')
if [[ "$HTTP" != "200" ]]; then
  echo "Falha no login — HTTP $HTTP"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  exit 1
fi
TOKEN=$(echo "$BODY" | jq -r '.access_token')
echo "   OK — token obtido"

AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

if [[ "$AUTO_START" == "true" ]]; then
  echo
  echo "2. Iniciar ciclo (calibrate automático)…"
  CYCLE_RESP=$(curl -s -w "\nHTTP:%{http_code}" -X POST \
    "${BACKEND}/api/dispensers/${MAC}/start-cycle" "${AUTH[@]}")
  HTTP=$(echo "$CYCLE_RESP" | grep HTTP | cut -d: -f2)
  BODY=$(echo "$CYCLE_RESP" | sed '/HTTP/d')
  if [[ "$HTTP" != "200" ]]; then
    echo "   FALHOU — HTTP $HTTP"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
  fi
  echo "$BODY" | jq .
  echo "   OK — roleta calibrada"
else
  echo
  echo "2. start-cycle ignorado (auto_start_cycle=false)"
fi

echo
echo "3. Salvar horários por período…"
SCHEDULE_PAYLOAD=$(jq -n \
  --arg pid "$PATIENT_ID" \
  --arg m "$MORNING" \
  --arg a "$AFTERNOON" \
  --arg n "$NIGHT" \
  '{patient_id: $pid, morning_time: $m, afternoon_time: $a, night_time: $n, is_active: true}')

PUT_RESP=$(curl -s -w "\nHTTP:%{http_code}" -X PUT \
  "${BACKEND}/api/dispensers/${MAC}/period-schedule" \
  "${AUTH[@]}" -d "$SCHEDULE_PAYLOAD")
HTTP=$(echo "$PUT_RESP" | grep HTTP | cut -d: -f2)
BODY=$(echo "$PUT_RESP" | sed '/HTTP/d')
if [[ "$HTTP" != "200" ]]; then
  echo "   FALHOU — HTTP $HTTP"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  exit 1
fi
echo "$BODY" | jq .
echo "   OK — horários salvos"

echo
echo "4. Status da roleta (hardware-status)…"
HW_RESP=$(curl -s -w "\nHTTP:%{http_code}" \
  "${BACKEND}/api/dispensers/${MAC}/hardware-status" \
  -H "Authorization: Bearer ${TOKEN}")
HTTP=$(echo "$HW_RESP" | grep HTTP | cut -d: -f2)
BODY=$(echo "$HW_RESP" | sed '/HTTP/d')
if [[ "$HTTP" == "200" ]]; then
  echo "$BODY" | jq .
else
  echo "   Aviso — hardware-status HTTP $HTTP (ESP pode estar offline)"
fi

echo
echo "5. Monitorando logs de dispensação (timeout ${TIMEOUT}s, meta: ${EXPECTED} dispenses)…"
echo "   Dica: docker compose logs -f backend | grep Scheduler"
echo

START=$(date +%s)
while true; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START))
  if [[ "$ELAPSED" -ge "$TIMEOUT" ]]; then
    echo "Timeout atingido após ${TIMEOUT}s"
    exit 1
  fi

  LOGS=$(curl -s "${BACKEND}/api/logs/dispensation" -H "Authorization: Bearer ${TOKEN}")
  COUNT=$(echo "$LOGS" | jq '[.[] | select(.success == true)] | length' 2>/dev/null || echo "0")
  echo "   [${ELAPSED}s] dispenses bem-sucedidos: ${COUNT}/${EXPECTED}"

  if [[ "$COUNT" -ge "$EXPECTED" ]]; then
    echo
    echo "=== E2E concluído — ${COUNT} dispensação(ões) registrada(s) ==="
    echo "$LOGS" | jq '[.[] | select(.success == true)] | .[-3:]'
    exit 0
  fi

  sleep 10
done
