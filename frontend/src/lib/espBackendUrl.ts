/**
 * URL do backend enviada ao ESP32 no pareamento BLE.
 *
 * O navegador pode usar ngrok (HTTPS) para Web Bluetooth; o ESP deve falar
 * direto com a API (HTTP, porta 8001), pois TLS/ngrok no firmware é frágil.
 *
 * Defina VITE_ESP_BACKEND_URL no deploy (ex.: http://2.24.216.183:8001).
 * Sem essa variável, usa window.location.origin (OK em dev local).
 */
export function getEspBackendUrl(): string {
  const configured = import.meta.env.VITE_ESP_BACKEND_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return window.location.origin;
}
