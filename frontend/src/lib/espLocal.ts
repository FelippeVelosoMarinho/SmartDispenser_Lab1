import type { HardwareStatus, StartCycleResult } from "./api";

const ESP_TIMEOUT_MS = 8000;

function lanUnreachableError(): Error {
  return new Error(
    "Não foi possível contactar o dispensador na rede local. Conecte-se ao mesmo Wi-Fi do ESP32.",
  );
}

function mapEspStatus(data: Record<string, unknown>): HardwareStatus {
  return {
    current_slot: Number(data.current_slot ?? 0),
    total_slots: Number(data.total_slots ?? 21),
    awaiting_confirm: data.awaiting_confirm === true || data.awaiting_confirm === "true",
    last_confirmed_slot: Number(data.last_confirmed_slot ?? -1),
    wifi_rssi: typeof data.wifi_rssi === "number" ? data.wifi_rssi : undefined,
    hardware_id: typeof data.hardware_id === "string" ? data.hardware_id : undefined,
    uptime_s: typeof data.uptime_s === "number" ? data.uptime_s : undefined,
  };
}

async function espFetch(ip: string, path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ESP_TIMEOUT_MS);
  try {
    return await fetch(`http://${ip}${path}`, {
      ...init,
      signal: controller.signal,
      mode: "cors",
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "Tempo esgotado — verifique se está na mesma rede Wi-Fi do dispensador.",
      );
    }
    throw lanUnreachableError();
  } finally {
    clearTimeout(timer);
  }
}

export async function getHardwareStatusLocal(ip: string): Promise<HardwareStatus> {
  const res = await espFetch(ip, "/status");
  if (!res.ok) {
    throw new Error("Não foi possível ler o status do hardware.");
  }
  const data = (await res.json()) as Record<string, unknown>;
  return mapEspStatus(data);
}

export async function startDispenserCycleLocal(
  ip: string,
  hardwareId: string,
): Promise<StartCycleResult> {
  const statusRes = await espFetch(ip, "/status");
  if (!statusRes.ok) {
    throw new Error("Não foi possível ler o status do hardware.");
  }
  const status = (await statusRes.json()) as Record<string, unknown>;
  if (status.awaiting_confirm === true || status.awaiting_confirm === "true") {
    await espFetch(ip, "/confirm", { method: "POST" });
  }

  const calRes = await espFetch(ip, "/calibrate", { method: "POST" });
  if (!calRes.ok) {
    throw new Error("Falha ao calibrar o dispensador.");
  }

  let currentSlot = 0;
  const afterRes = await espFetch(ip, "/status");
  if (afterRes.ok) {
    const after = (await afterRes.json()) as Record<string, unknown>;
    currentSlot = Number(after.current_slot ?? 0);
  }

  return {
    success: true,
    message: "Ciclo iniciado — roleta calibrada na posição inicial.",
    current_slot: currentSlot,
    hardware_id: hardwareId,
  };
}
