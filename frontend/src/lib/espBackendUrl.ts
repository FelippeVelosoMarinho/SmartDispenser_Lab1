/**
 * URL do backend enviada ao ESP32 no pareamento BLE.
 *
 * O navegador usa https://pill.josoesantos.dev (HTTPS + Web Bluetooth).
 * O ESP pode usar o mesmo domínio (HTTPS com setInsecure no firmware) ou
 * HTTP direto na porta 8001 — configure via VITE_ESP_BACKEND_URL.
 *
 * Sem variável definida, usa window.location.origin (dev local).
 */
export function getEspBackendUrl(): string {
  const configured = import.meta.env.VITE_ESP_BACKEND_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return window.location.origin;
}
