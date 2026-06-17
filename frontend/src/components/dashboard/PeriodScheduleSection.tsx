import { useCallback, useEffect, useState } from "react";
import type { DispenserDetails, HardwareStatus, PeriodSchedule } from "../../lib/api";
import {
  getHardwareStatus,
  getPeriodSchedule,
  savePeriodSchedule,
  startDispenserCycle,
  startRefillMode,
} from "../../lib/api";
import { nextPeriodLabel, toTimeInputValue } from "../../lib/periodSchedule";
import { UnsavedScheduleBanner } from "./UnsavedScheduleBanner";

interface PeriodScheduleSectionProps {
  dispenser: DispenserDetails;
}

const PERIODS = [
  {
    key: "morning" as const,
    label: "Manhã",
    icon: "ph-sun",
    color: "var(--warning)",
    bg: "color-mix(in srgb, var(--warning) 10%, transparent)",
    border: "color-mix(in srgb, var(--warning) 30%, transparent)",
  },
  {
    key: "afternoon" as const,
    label: "Tarde",
    icon: "ph-cloud-sun",
    color: "var(--accent)",
    bg: "color-mix(in srgb, var(--accent) 10%, transparent)",
    border: "color-mix(in srgb, var(--accent) 30%, transparent)",
  },
  {
    key: "night" as const,
    label: "Noite",
    icon: "ph-moon-stars",
    color: "var(--period-night)",
    bg: "color-mix(in srgb, var(--period-night) 10%, transparent)",
    border: "color-mix(in srgb, var(--period-night) 30%, transparent)",
  },
];

function adjustTime(current: string, deltaMinutes: number): string {
  const [h, m] = current.split(":").map(Number);
  const total = ((h * 60 + m + deltaMinutes) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function PeriodScheduleSection({ dispenser }: PeriodScheduleSectionProps) {
  const [morning, setMorning] = useState("08:00");
  const [afternoon, setAfternoon] = useState("14:00");
  const [night, setNight] = useState("21:00");
  const [silentMode, setSilentMode] = useState(false);
  const [hwStatus, setHwStatus] = useState<HardwareStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startingRefill, setStartingRefill] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleMeta, setScheduleMeta] = useState<PeriodSchedule | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const hardwareId = dispenser.hardware_id;
  const patientId = dispenser.patient_id;

  const values: Record<"morning" | "afternoon" | "night", string> = { morning, afternoon, night };
  const setters: Record<"morning" | "afternoon" | "night", (v: string) => void> = {
    morning: setMorning,
    afternoon: setAfternoon,
    night: setNight,
  };

  const refreshHardware = useCallback(async () => {
    if (!dispenser.is_online) { setHwStatus(null); return; }
    try {
      const status = await getHardwareStatus(hardwareId, dispenser.ip_address);
      setHwStatus(status);
    } catch {
      setHwStatus(null);
    }
  }, [hardwareId, dispenser.is_online, dispenser.ip_address]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const ps = await getPeriodSchedule(hardwareId);
        if (cancelled) return;
        setScheduleMeta(ps);
        setMorning(toTimeInputValue(ps.morning_time));
        setAfternoon(toTimeInputValue(ps.afternoon_time));
        setNight(toTimeInputValue(ps.night_time));
        setSilentMode(ps.silent_mode ?? false);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar horários");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hardwareId]);

  useEffect(() => {
    refreshHardware();
    const id = setInterval(refreshHardware, 3000);
    return () => clearInterval(id);
  }, [refreshHardware]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) { setError("Dispensador sem paciente vinculado."); return; }
    setSaving(true);
    setError(null);
    try {
      const saved = await savePeriodSchedule(hardwareId, {
        patient_id: patientId,
        morning_time: morning,
        afternoon_time: afternoon,
        night_time: night,
        is_active: true,
        silent_mode: silentMode,
      });
      setScheduleMeta(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleStartRefill() {
    setStartingRefill(true);
    setError(null);
    try {
      await startRefillMode(hardwareId);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao ativar modo reabastecimento");
      setStartingRefill(false);
    }
  }

  async function handleStartCycle() {
    setStarting(true);
    setError(null);
    try {
      await startDispenserCycle(hardwareId, dispenser.ip_address);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao iniciar ciclo");
      setStarting(false);
    }
  }

  return (
    <section
      style={{
        marginBottom: "var(--space-8)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
      }}
      aria-labelledby="period-schedule-heading"
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
        <div>
          <h2
            id="period-schedule-heading"
            style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--ink)" }}
          >
            Horários de dispensação
          </h2>
          <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "var(--text-sm)" }}>
            A roleta avança uma posição a cada período.
            {hwStatus && (
              <span style={{ marginLeft: 8, color: "var(--ink-2)" }}>
                Posição atual: <strong>{Math.min(hwStatus.current_slot + 1, hwStatus.total_slots)}</strong>
                {" · "}Próximo: <strong style={{ color: "var(--primary)" }}>{nextPeriodLabel(scheduleMeta, now)}</strong>
                {hwStatus.awaiting_confirm && (
                  <span style={{ marginLeft: 8, color: "var(--warning)", fontWeight: 600 }}>· Aguardando confirmação</span>
                )}
              </span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", flexShrink: 0 }}>
          {!dispenser.is_refilling && (
            <button
              type="button"
              onClick={handleStartRefill}
              disabled={startingRefill || !dispenser.is_online}
              style={{
                background: "transparent",
                color: dispenser.is_online ? "var(--warning)" : "var(--ink-3)",
                border: `1.5px solid ${dispenser.is_online ? "color-mix(in srgb, var(--warning) 40%, transparent)" : "var(--border)"}`,
                borderRadius: "var(--radius-md)",
                padding: "10px 18px",
                fontWeight: 600,
                fontSize: "var(--text-sm)",
                cursor: dispenser.is_online && !startingRefill ? "pointer" : "not-allowed",
                whiteSpace: "nowrap",
              }}
            >
              <i className="ph-duotone ph-package" style={{ marginRight: 6 }} />
              {startingRefill ? "Ativando…" : "Iniciar reabastecimento"}
            </button>
          )}
          <button
            type="button"
            onClick={handleStartCycle}
            disabled={starting || !dispenser.is_online}
            style={{
              background: dispenser.is_online ? (dispenser.is_refilling ? "var(--warning)" : "var(--primary)") : "var(--surface-dim)",
              color: dispenser.is_online ? (dispenser.is_refilling ? "white" : "var(--primary-on)") : "var(--ink-3)",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              cursor: dispenser.is_online && !starting ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
            }}
          >
            <i className="ph-duotone ph-play-circle" style={{ marginRight: 6 }} />
            {starting ? "Calibrando…" : "Concluir reabastecimento e iniciar ciclo"}
          </button>
        </div>
      </div>

      {dispenser.is_refilling && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            background: "color-mix(in srgb, var(--warning) 12%, transparent)",
            border: "1.5px solid color-mix(in srgb, var(--warning) 35%, transparent)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-4)",
            color: "var(--warning)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
          }}
        >
          <i className="ph-duotone ph-warning" style={{ fontSize: "1.25rem", flexShrink: 0 }} />
          <span>
            <strong>Modo reabastecimento ativo.</strong>{" "}
            Dispensações bloqueadas — reabastece a roleta e clique em{" "}
            <strong>Concluir reabastecimento e iniciar ciclo</strong> para retomar.
          </span>
        </div>
      )}

      {scheduleMeta?.source === "defaults" && !loading && <UnsavedScheduleBanner />}

      {!dispenser.is_online && (
        <p style={{ color: "var(--warning)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)", margin: "0 0 var(--space-3)" }}>
          <i className="ph-duotone ph-warning" style={{ marginRight: 4 }} />
          Dispensador offline — horários serão enviados quando reconectar.
        </p>
      )}

      {/* Period cards */}
      {loading ? (
        <p style={{ color: "var(--ink-3)" }}>Carregando horários…</p>
      ) : (
        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            {PERIODS.map((p) => (
              <div
                key={p.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                  background: p.bg,
                  border: `1.5px solid ${p.border}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-4)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <i
                    className={`ph-duotone ${p.icon}`}
                    style={{ fontSize: "1.25rem", color: p.color }}
                  />
                  <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {p.label}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <button
                    type="button"
                    onClick={() => setters[p.key](adjustTime(values[p.key], -15))}
                    onMouseEnter={() => setHoveredBtn(`${p.key}-minus`)}
                    onMouseLeave={() => setHoveredBtn(null)}
                    title="-15 min"
                    style={{
                      flexShrink: 0,
                      width: 28, height: 28,
                      borderRadius: "50%",
                      border: `1.5px solid ${p.border}`,
                      background: hoveredBtn === `${p.key}-minus` ? p.bg : "transparent",
                      color: p.color,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      appearance: "none",
                      outline: "none",
                      padding: 0,
                      transition: "background 0.15s",
                    }}
                  >
                    −
                  </button>
                  <input
                    type="time"
                    value={values[p.key]}
                    onChange={(e) => setters[p.key](e.target.value)}
                    required
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-2xl)",
                      fontWeight: 700,
                      color: p.color,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      boxShadow: "none",
                      cursor: "pointer",
                      padding: 0,
                      minWidth: 0,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setters[p.key](adjustTime(values[p.key], 15))}
                    onMouseEnter={() => setHoveredBtn(`${p.key}-plus`)}
                    onMouseLeave={() => setHoveredBtn(null)}
                    title="+15 min"
                    style={{
                      flexShrink: 0,
                      width: 28, height: 28,
                      borderRadius: "50%",
                      border: `1.5px solid ${p.border}`,
                      background: hoveredBtn === `${p.key}-plus` ? p.bg : "transparent",
                      color: p.color,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      appearance: "none",
                      outline: "none",
                      padding: 0,
                      transition: "background 0.15s",
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Silent mode + save */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
                userSelect: "none",
                color: "var(--ink-2)",
              }}
            >
              <input
                type="checkbox"
                checked={silentMode}
                onChange={(e) => setSilentMode(e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--primary)" }}
              />
              <i className="ph-duotone ph-speaker-x" style={{ fontSize: "1rem" }} />
              Modo silencioso
            </label>

            <button
              type="submit"
              disabled={saving || !patientId}
              style={{
                background: "var(--primary)",
                color: "var(--primary-on)",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "10px 20px",
                fontWeight: 600,
                fontSize: "var(--text-sm)",
                cursor: saving ? "wait" : "pointer",
                opacity: !patientId ? 0.5 : 1,
              }}
            >
              <i className="ph-duotone ph-floppy-disk" style={{ marginRight: 6 }} />
              {saving ? "Salvando…" : "Salvar horários"}
            </button>

            {scheduleMeta?.source === "database" && !saving && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--primary)", display: "flex", alignItems: "center", gap: 4 }}>
                <i className="ph-duotone ph-check-circle" />
                Horários salvos
              </span>
            )}
          </div>

          {error && (
            <p style={{ marginTop: "var(--space-3)", color: "var(--danger)", fontSize: "var(--text-sm)" }}>{error}</p>
          )}
        </form>
      )}
    </section>
  );
}

export function useHardwareStatus(
  hardwareId: string,
  isOnline: boolean,
  ipAddress?: string | null,
) {
  const [status, setStatus] = useState<HardwareStatus | null>(null);

  useEffect(() => {
    if (!isOnline) { setStatus(null); return; }
    let cancelled = false;
    const load = () =>
      getHardwareStatus(hardwareId, ipAddress)
        .then((s) => { if (!cancelled) setStatus(s); })
        .catch(() => { if (!cancelled) setStatus(null); });
    load();
    const id = setInterval(load, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [hardwareId, isOnline, ipAddress]);

  return status;
}
