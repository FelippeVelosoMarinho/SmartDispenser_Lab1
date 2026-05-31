import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import "../components/ui/ConfirmModal.css";
import { listPatients, pairDispenser, type Patient as ApiPatient } from "../lib/api";

interface DiscoveredDispenser {
  id: string;
  ip: string;
  serial: string;
  mac: string;
  rssi: number;
  firmware: string;
}

interface Patient {
  id: string;
  nome: string;
  idade: number;
  medicacao: string;
}

// Shape of GET /status on the ESP32
interface EspStatus {
  current_slot: number;
  total_slots: number;
  awaiting_confirm: boolean;
  last_confirmed_slot: number;
  wifi_rssi: number;
  uptime_s: number;
}

const PROBE_TIMEOUT_MS = 1200;
const MAX_CONCURRENT = 30;

async function probeIp(ip: string): Promise<DiscoveredDispenser | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(`http://${ip}/status`, {
      signal: controller.signal,
      mode: "cors",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data: EspStatus = await res.json();
    // Verify it looks like our firmware
    if (typeof data.wifi_rssi !== "number" || typeof data.current_slot !== "number") return null;
    return {
      id: ip,
      ip,
      serial: `ESP-C3-${ip.split(".").pop()?.padStart(3, "0") ?? ip}`,
      mac: "—",
      rssi: data.wifi_rssi,
      firmware: "—",
    };
  } catch {
    return null;
  }
}

// Detect local subnet via WebRTC (best-effort, falls back to 192.168.1.x)
async function detectSubnet(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      pc.createOffer().then((offer) => pc.setLocalDescription(offer));
      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          pc.close();
          resolve("192.168.1");
          return;
        }
        const m = e.candidate.candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}/);
        if (m) {
          pc.close();
          resolve(m[1]);
        }
      };
      setTimeout(() => {
        pc.close();
        resolve("192.168.1");
      }, 2000);
    } catch {
      resolve("192.168.1");
    }
  });
}

async function scanSubnet(
  subnet: string,
  onFound: (d: DiscoveredDispenser) => void,
  signal: AbortSignal,
): Promise<void> {
  const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);

  // Process in batches to cap concurrency
  for (let i = 0; i < ips.length; i += MAX_CONCURRENT) {
    if (signal.aborted) break;
    const batch = ips.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.all(batch.map((ip) => probeIp(ip)));
    for (const r of results) {
      if (r) onFound(r);
    }
  }
}

function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  useEffect(() => {
    listPatients().then((data) => {
      setPatients(data.map((p) => ({
        id: p.id,
        nome: p.name,
        idade: p.age ?? 0,
        medicacao: p.condition ?? "Sem condição",
      })));
    }).catch(console.error);
  }, []);
  return patients;
}

type SignalLevel = "excelente" | "bom" | "fraco";

function signalLevel(rssi: number): SignalLevel {
  if (rssi >= -55) return "excelente";
  if (rssi >= -70) return "bom";
  return "fraco";
}

function SignalBadge({ rssi }: { rssi: number }) {
  const level = signalLevel(rssi);
  const map: Record<SignalLevel, { label: string; icon: string; bg: string; color: string }> = {
    excelente: {
      label: "Excelente",
      icon: "ph-wifi-high",
      bg: "var(--success-soft)",
      color: "var(--success-ink)",
    },
    bom: {
      label: "Bom",
      icon: "ph-wifi-medium",
      bg: "var(--primary-soft)",
      color: "var(--primary)",
    },
    fraco: { label: "Fraco", icon: "ph-wifi-low", bg: "var(--surface-dim)", color: "var(--ink-3)" },
  };
  const cfg = map[level];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.8125rem",
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: "9999px",
        background: cfg.bg,
        color: cfg.color,
      }}
      aria-label={`Sinal ${cfg.label} (${rssi} dBm)`}
    >
      <i className={`ph-duotone ${cfg.icon}`} aria-hidden="true" style={{ fontSize: "1rem" }} />
      {cfg.label} · {rssi} dBm
    </span>
  );
}

export function PairDispenserPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"select" | "local" | "ble">("select");

  return (
    <div
      style={{
        flex: 1,
        padding: "var(--space-8) var(--space-7)",
        maxWidth: "960px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <button
          type="button"
          onClick={() => {
            if (mode !== "select") setMode("select");
            else navigate({ to: "/dispensers" });
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            background: "transparent",
            border: "none",
            padding: "var(--space-1) 0",
            color: "var(--ink-3)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            marginBottom: "var(--space-3)",
          }}
        >
          <i className="ph-duotone ph-arrow-left" aria-hidden="true" />
          {mode !== "select" ? "Voltar para opções" : "Voltar para dispensadores"}
        </button>
        <p className="eyebrow" style={{ marginBottom: "var(--space-1)", color: "var(--ink-3)" }}>
          Eco-Dispenser
        </p>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-2xl)",
            fontWeight: 700,
            color: "var(--ink)",
            lineHeight: "var(--leading-heading)",
            margin: 0,
          }}
        >
          Parear novo dispensador
        </h1>
        {mode === "select" && (
          <p style={{ marginTop: "var(--space-2)", color: "var(--ink-3)", fontSize: "var(--text-sm)" }}>
            Escolha como deseja conectar o novo dispensador à plataforma.
          </p>
        )}
      </div>

      {mode === "select" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
          <Card 
            style={{ cursor: "pointer", transition: "transform 0.2s", border: "2px solid var(--primary)" }} 
            onClick={() => setMode("ble")}
          >
            <CardContent style={{ padding: "var(--space-6)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{ background: "var(--primary-soft)", color: "var(--primary)", width: 64, height: 64, borderRadius: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ph-duotone ph-bluetooth" style={{ fontSize: "2rem" }} />
              </div>
              <div>
                <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-lg)" }}>Conexão Bluetooth</h3>
                <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "var(--text-sm)" }}>Recomendado. Configure o Wi-Fi do dispensador diretamente pelo seu dispositivo (requer Bluetooth ativado).</p>
              </div>
              <Button style={{ width: "100%" }} leftIcon="ph-duotone ph-bluetooth">Usar Bluetooth</Button>
            </CardContent>
          </Card>

          <Card 
            style={{ cursor: "pointer", transition: "transform 0.2s" }} 
            onClick={() => setMode("local")}
          >
            <CardContent style={{ padding: "var(--space-6)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{ background: "var(--surface-dim)", color: "var(--ink-2)", width: 64, height: 64, borderRadius: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ph-duotone ph-wifi-high" style={{ fontSize: "2rem" }} />
              </div>
              <div>
                <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-lg)" }}>Conexão Wi-Fi Local</h3>
                <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "var(--text-sm)" }}>Legado. Escaneia a rede local atual em busca de dispensadores que já estão na mesma rede.</p>
              </div>
              <Button variant="secondary" style={{ width: "100%" }} leftIcon="ph-duotone ph-wifi-high">Usar Rede Local</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {mode === "local" && <LocalPairingView />}
      {mode === "ble" && <BluetoothPairingWizard />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function LocalPairingView() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [subnet, setSubnet] = useState<string | null>(null);
  const [devices, setDevices] = useState<DiscoveredDispenser[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DiscoveredDispenser | null>(null);
  const [pairing, setPairing] = useState(false);
  const [manualIp, setManualIp] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualChecking, setManualChecking] = useState(false);
  const scanAbortRef = useRef<AbortController | null>(null);
  const patientsList = usePatients();

  const startScan = useCallback(async () => {
    if (scanAbortRef.current) {
      scanAbortRef.current.abort();
    }
    const controller = new AbortController();
    scanAbortRef.current = controller;

    setScanning(true);
    setDevices([]);

    const detectedSubnet = await detectSubnet();
    setSubnet(detectedSubnet);

    await scanSubnet(
      detectedSubnet,
      (device) => {
        setDevices((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device]));
      },
      controller.signal,
    );

    if (!controller.signal.aborted) {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    startScan();
    return () => {
      scanAbortRef.current?.abort();
    };
  }, [startScan]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        d.serial.toLowerCase().includes(q) || d.ip.includes(q) || d.mac.toLowerCase().includes(q),
    );
  }, [devices, search]);

  async function handleManualProbe() {
    const ip = manualIp.trim();
    if (!ip) return;
    setManualError(null);
    setManualChecking(true);
    try {
      const result = await probeIp(ip);
      if (result) {
        setDevices((prev) => (prev.some((d) => d.id === result.id) ? prev : [...prev, result]));
        setManualIp("");
      } else {
        setManualError("Nenhum dispensador encontrado neste endereço IP.");
      }
    } finally {
      setManualChecking(false);
    }
  }

  async function handleConfirmPair(_patient: Patient) {
    if (!selected) return;
    setPairing(true);
    try {
      // TODO: registrar pareamento no backend com selected.ip e _patient.id
      await new Promise((r) => setTimeout(r, 600));
      navigate({ to: "/dispensers" });
    } finally {
      setPairing(false);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "var(--space-8) var(--space-7)",
        maxWidth: "960px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <button
          type="button"
          onClick={() => navigate({ to: "/dispensers" })}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            background: "transparent",
            border: "none",
            padding: "var(--space-1) 0",
            color: "var(--ink-3)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            marginBottom: "var(--space-3)",
          }}
        >
          <i className="ph-duotone ph-arrow-left" aria-hidden="true" />
          Voltar para dispensadores
        </button>
        <p className="eyebrow" style={{ marginBottom: "var(--space-1)", color: "var(--ink-3)" }}>
          Smart-Dispenser
        </p>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-2xl)",
            fontWeight: 700,
            color: "var(--ink)",
            lineHeight: "var(--leading-heading)",
            margin: 0,
          }}
        >
          Parear novo dispensador
        </h1>
        <p
          style={{ marginTop: "var(--space-2)", color: "var(--ink-3)", fontSize: "var(--text-sm)" }}
        >
          Certifique-se de que o dispensador está ligado e conectado à mesma rede Wi-Fi que este
          dispositivo.
          {subnet && (
            <span style={{ marginLeft: "var(--space-2)", color: "var(--ink-2)" }}>
              Rede detectada:{" "}
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                {subnet}.0/24
              </code>
            </span>
          )}
        </p>
      </div>

      {/* Scan controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", maxWidth: "360px" }}>
          <Input
            placeholder="Filtrar por serial, IP ou MAC"
            icon="ph-duotone ph-magnifying-glass"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filtrar dispositivos"
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {scanning && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", color: "var(--primary)", fontSize: "var(--text-sm)", fontWeight: 600 }}>
              <i className="ph-duotone ph-circle-notch" aria-hidden="true" style={{ fontSize: "1.1rem", animation: "spin 1s linear infinite" }} />
              Procurando dispositivos…
            </span>
          )}
          <Button variant="secondary" leftIcon="ph-duotone ph-arrows-clockwise" onClick={startScan} disabled={scanning}>
            {scanning ? "Procurando" : "Procurar novamente"}
          </Button>
        </div>
      </div>

      {/* Manual IP entry */}
      <Card style={{ marginBottom: "var(--space-5)" }}>
        <CardContent>
          <p style={{ margin: "0 0 var(--space-3)", fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--ink)" }}>
            <i className="ph-duotone ph-plugs" aria-hidden="true" style={{ marginRight: "var(--space-2)" }} />
            Adicionar por IP manual
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 220px" }}>
              <Input
                placeholder="ex: 192.168.1.45"
                value={manualIp}
                onChange={(e) => { setManualIp(e.target.value); setManualError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleManualProbe()}
                aria-label="Endereço IP do dispensador"
              />
              {manualError && (
                <p style={{ margin: "var(--space-2) 0 0", color: "var(--error)", fontSize: "var(--text-xs)" }}>
                  {manualError}
                </p>
              )}
            </div>
            <Button variant="secondary" leftIcon="ph-duotone ph-magnifying-glass" onClick={handleManualProbe} loading={manualChecking} disabled={!manualIp.trim() || manualChecking}>
              Verificar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Device list */}
      {filtered.length === 0 && !scanning ? (
        <Card>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", color: "var(--ink-3)", padding: "var(--space-8) var(--space-4)", textAlign: "center" }}>
              <i className="ph-duotone ph-radio" style={{ fontSize: "2.5rem" }} aria-hidden="true" />
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: "var(--ink)" }}>Nenhum dispositivo encontrado</p>
                <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)" }}>
                  Verifique se o dispensador está ligado e conectado à mesma rede Wi-Fi. Use o campo acima para adicionar um IP manualmente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {filtered.map((device) => (
            <Card key={device.id}>
              <CardContent>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "var(--radius-sm)", background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="ph-duotone ph-device-mobile-speaker" aria-hidden="true" style={{ fontSize: "1.5rem", color: "var(--primary)" }} />
                  </div>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-sans)", fontSize: "var(--text-base)" }}>
                        {device.serial}
                      </span>
                      <SignalBadge rssi={device.rssi} />
                    </div>
                    <div style={{ marginTop: "4px", color: "var(--ink-3)", fontSize: "var(--text-sm)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                      <span><i className="ph-duotone ph-globe" aria-hidden="true" style={{ marginRight: "4px" }} />{device.ip}</span>
                      {device.mac !== "—" && <span>MAC {device.mac}</span>}
                      {device.firmware !== "—" && <span>Firmware {device.firmware}</span>}
                    </div>
                  </div>
                  <Button leftIcon="ph-duotone ph-link" onClick={() => setSelected(device)}>
                    Parear
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PatientPickerModal
        open={selected !== null}
        device={selected}
        patients={patientsList}
        loading={pairing}
        error={null}
        onCancel={() => setSelected(null)}
        onConfirm={handleConfirmPair}
      />
    </div>
  );
}

function BluetoothPairingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"scan" | "wifi" | "sync" | "done">("scan");
  const [bleScanning, setBleScanning] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  // removed syncing state to fix unused variable warning
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [concluding, setConcluding] = useState(false);
  const patientsList = usePatients();

  // Web Bluetooth Refs
  const wifiCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);

  const BLE_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const BLE_STATUS_CHAR_UUID = "8d268d37-2cd9-4c2f-b4de-c8f2d573d8df";
  const BLE_WIFI_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  async function handleBleScan() {
    if (!navigator.bluetooth) {
      alert("Seu navegador não suporta Web Bluetooth. Utilize o Chrome/Edge ou a conexão local legada.");
      return;
    }

    setBleScanning(true);
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUID] }],
        optionalServices: [BLE_SERVICE_UUID] // Depending on the filter, this might be redundant but safe
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error("Falha ao conectar ao GATT Server.");
      serverRef.current = server;

      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      
      // Get the write characteristic for later
      const wifiCharacteristic = await service.getCharacteristic(BLE_WIFI_CHAR_UUID);
      wifiCharRef.current = wifiCharacteristic;

      // Try reading the hardware ID
      try {
        const statusChar = await service.getCharacteristic(BLE_STATUS_CHAR_UUID);
        const value = await statusChar.readValue();
        const decoder = new TextDecoder("utf-8");
        const jsonStr = decoder.decode(value);
        const data = JSON.parse(jsonStr);
        if (data.hw_id) {
          setDeviceId(data.hw_id);
        } else {
          setDeviceId(device.name || "Dispensador Desconhecido");
        }
      } catch (err) {
        // Fallback se não conseguir ler
        setDeviceId(device.name || "Dispensador Desconhecido");
      }

      setStep("wifi");
    } catch (e) {
      console.error(e);
      alert("Falha ao conectar via Bluetooth: " + (e as Error).message);
    } finally {
      setBleScanning(false);
    }
  }

  async function handleSubmitWifi() {
    if (!ssid || !wifiCharRef.current) return;
    // setSyncing(true);
    setStep("sync");
    
    try {
      const payload = JSON.stringify({ ssid, pass: password });
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      
      // Escreve as credenciais no ESP32
      await wifiCharRef.current.writeValue(data);
      
      // Desconecta e aguarda sucesso (na prática a API receberia um webhook ou polling)
      serverRef.current?.disconnect();

      // Simulando tempo para o ESP32 conectar ao Wi-Fi e mandar requisição para API
      await new Promise(r => setTimeout(r, 3000));
      setStep("done");
    } catch (e) {
      console.error(e);
      alert("Falha ao enviar dados de Wi-Fi: " + (e as Error).message);
      setStep("wifi"); // fallback
    } finally {
      // setSyncing(false);
    }
  }

  return (
    <Card>
      <CardContent style={{ padding: "var(--space-8)", maxWidth: "500px", margin: "0 auto" }}>
        
        {step === "scan" && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)" }}>
            <div style={{ background: "var(--primary-soft)", color: "var(--primary)", width: 80, height: 80, borderRadius: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ph-duotone ph-bluetooth" style={{ fontSize: "2.5rem" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 var(--space-2)" }}>Encontrar dispensador</h2>
              <p style={{ color: "var(--ink-3)", margin: 0, fontSize: "var(--text-sm)" }}>
                Ligue o dispensador. Ele entrará em modo de pareamento automaticamente.
              </p>
            </div>
            <Button onClick={handleBleScan} loading={bleScanning} leftIcon={bleScanning ? undefined : "ph-duotone ph-magnifying-glass"}>
              Buscar via Bluetooth
            </Button>
          </div>
        )}

        {step === "wifi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <div style={{ background: "var(--success-soft)", color: "var(--success-ink)", width: 40, height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ph-duotone ph-check" style={{ fontSize: "1.2rem" }} />
              </div>
              <div>
                <h2 style={{ fontSize: "var(--text-base)", margin: 0 }}>Conectado ao dispensador</h2>
                <p style={{ color: "var(--ink-3)", margin: 0, fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)" }}>
                  {deviceId}
                </p>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "var(--space-2) 0" }} />

            <div>
              <h3 style={{ fontSize: "var(--text-lg)", margin: "0 0 var(--space-2)" }}>Configurar Wi-Fi</h3>
              <p style={{ color: "var(--ink-3)", margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)" }}>
                Informe a rede Wi-Fi que o dispensador utilizará para se comunicar com a plataforma.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div>
                <label style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)", fontWeight: 600 }}>Nome da Rede (SSID)</label>
                <Input value={ssid} onChange={e => setSsid(e.target.value)} placeholder="Ex: Minha Casa" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)", fontWeight: 600 }}>Senha do Wi-Fi</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha da rede" />
              </div>
            </div>

            <Button style={{ marginTop: "var(--space-2)" }} disabled={!ssid} onClick={handleSubmitWifi}>
              Enviar para o Dispensador
            </Button>
          </div>
        )}

        {step === "sync" && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-6) 0" }}>
            <i className="ph-duotone ph-circle-notch" style={{ fontSize: "3rem", color: "var(--primary)", animation: "spin 1s linear infinite" }} />
            <div>
              <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 var(--space-2)" }}>Sincronizando...</h2>
              <p style={{ color: "var(--ink-3)", margin: 0, fontSize: "var(--text-sm)" }}>
                O dispensador está tentando se conectar à rede <strong>{ssid}</strong>.
              </p>
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)" }}>
            <div style={{ background: "var(--success-soft)", color: "var(--success-ink)", width: 80, height: 80, borderRadius: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ph-duotone ph-check-circle" style={{ fontSize: "3rem" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 var(--space-2)" }}>Conectado à Internet!</h2>
              <p style={{ color: "var(--ink-3)", margin: 0, fontSize: "var(--text-sm)" }}>
                O dispensador foi configurado com sucesso e está online.
              </p>
            </div>
            
            <div style={{ marginTop: "var(--space-2)", width: "100%", padding: "var(--space-4)", background: "var(--surface-dim)", borderRadius: "var(--radius)", textAlign: "left" }}>
              <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", fontWeight: 600 }}>Paciente vinculado:</p>
              {selectedPatient ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{selectedPatient.nome}</span>
                  <Button variant="ghost" size="small" onClick={() => setPickerOpen(true)}>Alterar</Button>
                </div>
              ) : (
                <Button variant="secondary" style={{ width: "100%" }} onClick={() => setPickerOpen(true)}>
                  Vincular Paciente (Opcional)
                </Button>
              )}
            </div>

            <Button 
              style={{ width: "100%", marginTop: "var(--space-2)" }} 
              loading={concluding}
              onClick={async () => {
                setConcluding(true);
                if (selectedPatient && deviceId) {
                  try {
                    await pairDispenser(deviceId, selectedPatient.id);
                  } catch (e) {
                    console.error("Falha ao parear no backend:", e);
                  }
                }
                setConcluding(false);
                navigate({ to: "/dispensers" });
              }}
            >
              Concluir
            </Button>
          </div>
        )}

      </CardContent>

      <PatientPickerModal
        open={pickerOpen}
        device={deviceId ? { id: deviceId, ip: "BLE", serial: deviceId, mac: "", rssi: 0, firmware: "" } : null}
        patients={patientsList}
        loading={false}
        error={null}
        onCancel={() => setPickerOpen(false)}
        onConfirm={(p) => {
          setSelectedPatient(p);
          setPickerOpen(false);
        }}
      />
    </Card>
  );
}

interface PatientPickerModalProps {
  open: boolean;
  device: DiscoveredDispenser | null;
  patients: Patient[];
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (patient: Patient) => void;
}

function PatientPickerModal({
  open,
  device,
  patients,
  loading,
  error,
  onCancel,
  onConfirm,
}: PatientPickerModalProps) {
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setPickedId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.medicacao.toLowerCase().includes(q),
    );
  }, [patients, query]);

  if (!open || !device) return null;

  const picked = patients.find((p) => p.id === pickedId) ?? null;

  return createPortal(
    <div
      className="pillar-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pair-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="pillar-modal" style={{ maxWidth: "520px", width: "100%" }}>
        <div className="pillar-modal__icon">
          <i className="ph-duotone ph-link" aria-hidden="true" />
        </div>

        <div className="pillar-modal__body" style={{ width: "100%" }}>
          <h2 className="pillar-modal__title" id="pair-modal-title">
            Vincular paciente
          </h2>
          <p className="pillar-modal__description">
            Escolha o paciente que vai usar o dispensador{" "}
            <strong style={{ color: "var(--ink)" }}>{device.serial}</strong>{" "}
            <span
              style={{
                color: "var(--ink-3)",
                fontSize: "var(--text-xs)",
                fontFamily: "var(--font-mono)",
              }}
            >
              ({device.ip})
            </span>
            .
          </p>

          <div style={{ marginTop: "var(--space-4)" }}>
            <Input
              placeholder="Buscar paciente"
              icon="ph-duotone ph-magnifying-glass"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar paciente"
            />
          </div>

          <div
            role="radiogroup"
            aria-label="Pacientes disponíveis"
            style={{
              marginTop: "var(--space-4)",
              maxHeight: "260px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              paddingRight: "4px",
            }}
          >
            {error && (
              <div
                style={{
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius)",
                  background: "var(--danger-soft, rgba(220, 38, 38, 0.08))",
                  color: "var(--danger-ink, #991b1b)",
                }}
                role="alert"
              >
                {error}
              </div>
            )}
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "var(--space-6)",
                  textAlign: "center",
                  color: "var(--ink-3)",
                  fontSize: "var(--text-sm)",
                }}
              >
                Nenhum paciente encontrado.
              </div>
            ) : (
              filtered.map((patient) => {
                const checked = pickedId === patient.id;
                return (
                  <label
                    key={patient.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      padding: "var(--space-3) var(--space-4)",
                      borderRadius: "var(--radius)",
                      border: `1.5px solid ${checked ? "var(--primary)" : "var(--border)"}`,
                      background: checked ? "var(--primary-soft)" : "var(--surface)",
                      cursor: "pointer",
                      transition: "all 0.15s ease-out",
                    }}
                  >
                    <input
                      type="radio"
                      name="patient"
                      value={patient.id}
                      checked={checked}
                      onChange={() => setPickedId(patient.id)}
                      style={{ position: "absolute", opacity: 0 }}
                    />
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "9999px",
                        background: checked ? "var(--primary)" : "var(--surface-dim)",
                        color: checked ? "var(--primary-on)" : "var(--ink-3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <i
                        className="ph-duotone ph-user"
                        aria-hidden="true"
                        style={{ fontSize: "1.1rem" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ fontWeight: 600, color: "var(--ink)", fontSize: "var(--text-sm)" }}
                      >
                        {patient.nome}
                      </div>
                      <div style={{ color: "var(--ink-3)", fontSize: "var(--text-xs)" }}>
                        {patient.idade} anos · {patient.medicacao}
                      </div>
                    </div>
                    {checked && (
                      <i
                        className="ph-duotone ph-check-circle"
                        aria-hidden="true"
                        style={{ color: "var(--primary)", fontSize: "1.25rem" }}
                      />
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="pillar-modal__actions">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={() => picked && onConfirm(picked)}
            disabled={!picked}
            loading={loading}
            leftIcon={loading ? undefined : "ph-duotone ph-link"}
          >
            {loading ? "Pareando…" : "Confirmar pareamento"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
