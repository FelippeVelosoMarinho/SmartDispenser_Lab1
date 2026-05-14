import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import "../components/ui/ConfirmModal.css";
import { listPatients, pairDispenser, discoverDispensers, type Patient as ApiPatient, type DiscoveredDispenser } from "../lib/api";

interface Patient {
  id: string;
  nome: string;
  idade: number;
  medicacao: string;
}

function toPatientRow(patient: ApiPatient): Patient {
  return {
    id: patient.id,
    nome: patient.name,
    idade: patient.age ?? 0,
    medicacao: patient.condition ?? "Sem condição informada",
  };
}

type SignalLevel = "excelente" | "bom" | "fraco";

function signalLevel(rssi: number): SignalLevel {
  if (rssi >= -55) return "excelente";
  if (rssi >= -70) return "bom";
  return "fraco";
}

function SignalBadge({ rssi }: { rssi: number }) {
  const level = signalLevel(rssi);
  const map: Record<
    SignalLevel,
    { label: string; icon: string; bg: string; color: string }
  > = {
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
    fraco: {
      label: "Fraco",
      icon: "ph-wifi-low",
      bg: "var(--surface-dim)",
      color: "var(--ink-3)",
    },
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
      <i
        className={`ph-duotone ${cfg.icon}`}
        aria-hidden="true"
        style={{ fontSize: "1rem" }}
      />
      {cfg.label} · {rssi} dBm
    </span>
  );
}

export function PairDispenserPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(true);
  const [devices, setDevices] = useState<DiscoveredDispenser[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DiscoveredDispenser | null>(null);
  const [pairing, setPairing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPatients() {
      setPatientsLoading(true);
      setPatientsError(null);
      try {
        const data = await listPatients();
        if (!mounted) return;
        setPatients(data.map(toPatientRow));
      } catch (err) {
        if (!mounted) return;
        setPatientsError(err instanceof Error ? err.message : "Falha ao carregar pacientes");
      } finally {
        if (mounted) {
          setPatientsLoading(false);
        }
      }
    }

    void loadPatients();

    return () => {
      mounted = false;
    };
  }, []);

  const startScan = useCallback(async () => {
    if (scanIntervalRef.current !== null) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(true);
    setDevices([]);
    setScanError(null);

    try {
      // Fetch discovered dispensers from API
      const discovered = await discoverDispensers();
      
      // Simulate gradual device discovery (UX improvement)
      let i = 0;
      scanIntervalRef.current = window.setInterval(() => {
        if (i >= discovered.length) {
          if (scanIntervalRef.current !== null) {
            window.clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          setScanning(false);
          return;
        }
        
        const next = discovered[i];
        setDevices((prev) =>
          prev.some((d) => d.id === next.id) ? prev : [...prev, next],
        );
        i += 1;
      }, 600);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Falha ao descobrir dispositivos");
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    startScan();
    return () => {
      if (scanIntervalRef.current !== null) {
        window.clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [startScan]);

  const filtered = useMemo(() => {
    const valid = devices.filter((d): d is DiscoveredDispenser => Boolean(d));
    const q = search.trim().toLowerCase();
    if (!q) return valid;
    return valid.filter(
      (d) =>
        d.serial.toLowerCase().includes(q) || d.mac.toLowerCase().includes(q),
    );
  }, [devices, search]);

  async function handleConfirmPair(patient: Patient) {
    if (!selected) return;
    setPairing(true);
    try {
      await pairDispenser(selected.serial, patient.id);
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
        <p
          className="eyebrow"
          style={{ marginBottom: "var(--space-1)", color: "var(--ink-3)" }}
        >
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
        <p
          style={{
            marginTop: "var(--space-2)",
            color: "var(--ink-3)",
            fontSize: "var(--text-sm)",
          }}
        >
          Coloque o dispensador em modo de pareamento (LED azul piscando) e
          aguarde aparecer abaixo.
        </p>
      </div>

      {/* Scan controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          marginBottom: "var(--space-5)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 280px", maxWidth: "360px" }}>
          <Input
            placeholder="Filtrar por serial ou MAC"
            icon="ph-duotone ph-magnifying-glass"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filtrar dispositivos"
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          {scanning && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                color: "var(--primary)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
              }}
            >
              <i
                className="ph-duotone ph-circle-notch"
                aria-hidden="true"
                style={{
                  fontSize: "1.1rem",
                  animation: "spin 1s linear infinite",
                }}
              />
              Procurando dispositivos…
            </span>
          )}
          <Button
            variant="secondary"
            leftIcon="ph-duotone ph-arrows-clockwise"
            onClick={startScan}
            disabled={scanning}
          >
            {scanning ? "Procurando" : "Procurar novamente"}
          </Button>
        </div>
      </div>

      {/* Scan error */}
      {scanError && (
        <Card style={{ marginBottom: "var(--space-5)", borderColor: "var(--danger)" }}>
          <CardContent>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-3)",
                color: "var(--danger)",
              }}
            >
              <i
                className="ph-duotone ph-warning-octagon"
                aria-hidden="true"
                style={{ fontSize: "1.25rem", marginTop: "2px" }}
              />
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  Erro ao descobrir dispositivos
                </p>
                <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)" }}>
                  {scanError}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device list */}
      {filtered.length === 0 && !scanning ? (
        <Card>
          <CardContent>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-3)",
                color: "var(--ink-3)",
                padding: "var(--space-8) var(--space-4)",
                textAlign: "center",
              }}
            >
              <i
                className="ph-duotone ph-radio"
                style={{ fontSize: "2.5rem" }}
                aria-hidden="true"
              />
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: "var(--ink)" }}>
                  Nenhum dispositivo encontrado
                </p>
                <p
                  style={{
                    margin: "var(--space-1) 0 0",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Verifique se o dispensador está ligado e em modo de
                  pareamento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "var(--space-3)",
          }}
        >
          {filtered.map((device) => (
            <Card key={device.id}>
              <CardContent>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-4)",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--primary-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <i
                      className="ph-duotone ph-device-mobile-speaker"
                      aria-hidden="true"
                      style={{
                        fontSize: "1.5rem",
                        color: "var(--primary)",
                      }}
                    />
                  </div>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: "var(--ink)",
                          fontFamily: "var(--font-sans)",
                          fontSize: "var(--text-base)",
                        }}
                      >
                        {device.serial}
                      </span>
                      <SignalBadge rssi={device.rssi} />
                    </div>
                    <div
                      style={{
                        marginTop: "4px",
                        color: "var(--ink-3)",
                        fontSize: "var(--text-sm)",
                        display: "flex",
                        gap: "var(--space-3)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>MAC {device.mac}</span>
                      <span>Firmware {device.firmware}</span>
                    </div>
                  </div>
                  <Button
                    leftIcon="ph-duotone ph-link"
                    onClick={() => setSelected(device)}
                  >
                    Parear
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de seleção de paciente */}
      <PatientPickerModal
        open={selected !== null}
        device={selected}
        patients={patients}
        loading={pairing || patientsLoading}
        error={patientsError}
        onCancel={() => setSelected(null)}
        onConfirm={handleConfirmPair}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
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
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.medicacao.toLowerCase().includes(q),
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
            <strong style={{ color: "var(--ink)" }}>{device.serial}</strong>.
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
                      background: checked
                        ? "var(--primary-soft)"
                        : "var(--surface)",
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
                        background: checked
                          ? "var(--primary)"
                          : "var(--surface-dim)",
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
                        style={{
                          fontWeight: 600,
                          color: "var(--ink)",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        {patient.nome}
                      </div>
                      <div
                        style={{
                          color: "var(--ink-3)",
                          fontSize: "var(--text-xs)",
                        }}
                      >
                        {patient.idade} anos · {patient.medicacao}
                      </div>
                    </div>
                    {checked && (
                      <i
                        className="ph-duotone ph-check-circle"
                        aria-hidden="true"
                        style={{
                          color: "var(--primary)",
                          fontSize: "1.25rem",
                        }}
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
