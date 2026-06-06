#!/usr/bin/env bash
# Fase 5 — helper para criar schedule de teste via API (requer token JWT)
set -euo pipefail

BACKEND="${BACKEND_URL:-http://localhost:8000}"
TOKEN="${1:-}"
PATIENT_ID="${2:-}"
DISPENSER_ID="${3:-}"
SLOT_ID="${4:-1}"
TIME="${5:-}"

if [[ -z "$TOKEN" || -z "$PATIENT_ID" || -z "$DISPENSER_ID" ]]; then
  echo "Uso: $0 <TOKEN> <PATIENT_ID> <DISPENSER_MAC> [SLOT_ID] [TIME]"
  echo ""
  echo "  TOKEN        JWT obtido em POST /api/auth/login"
  echo "  PATIENT_ID   UUID do paciente"
  echo "  DISPENSER_MAC MAC Wi-Fi do ESP (hardware_id)"
  echo "  SLOT_ID      Posição 1-21 (padrão: 1)"
  echo "  TIME         ISO ou HH:MM (padrão: daqui 2 minutos)"
  echo ""
  echo "Exemplo:"
  echo "  $0 eyJhbG... uuid-paciente AA:BB:CC:DD:EE:FF 1 14:35"
  echo ""
  echo "Variáveis: BACKEND_URL (padrão http://localhost:8000)"
  exit 1
fi

if [[ -z "$TIME" ]]; then
  TIME=$(date -d '+2 minutes' '+%Y-%m-%dT%H:%M' 2>/dev/null || date -v+2M '+%Y-%m-%dT%H:%M')
fi

PAYLOAD=$(cat <<EOF
{
  "patient_id": "${PATIENT_ID}",
  "dispenser_id": "${DISPENSER_ID}",
  "slot_id": ${SLOT_ID},
  "time": "${TIME}",
  "is_active": true
}
EOF
)

echo "=== Criar schedule (Fase 5) ==="
echo "Backend: ${BACKEND}"
echo "Posição: ${SLOT_ID} | Horário: ${TIME}"
echo

RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${BACKEND}/api/schedules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "${PAYLOAD}")

HTTP=$(echo "$RESP" | grep HTTP_CODE | cut -d: -f2)
BODY=$(echo "$RESP" | sed '/HTTP_CODE/d')

if [[ "$HTTP" == "201" ]]; then
  echo "OK — schedule criado:"
  echo "$BODY" | { command -v jq >/dev/null && jq . || cat; }
  echo
  echo "Próximos passos:"
  echo "  1. Calibrar ESP: curl -X POST http://<IP_ESP>/calibrate"
  echo "  2. Aguardar até 30s após o horário (janela ±30s)"
  echo "  3. Monitorar serial do ESP e logs: docker compose logs -f backend"
else
  echo "FALHOU — HTTP ${HTTP}"
  echo "$BODY" | { command -v jq >/dev/null && jq . || cat; }
  exit 1
fi
