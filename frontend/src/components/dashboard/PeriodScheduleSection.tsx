import { useCallback, useEffect, useState } from "react";
import type { DispenserDetails, HardwareStatus, PeriodSchedule } from "../../lib/api";
import {
  getHardwareStatus,
  getPeriodSchedule,
  savePeriodSchedule,
  startDispenserCycle,
} from "../../lib/api";
import { nextPeriodLabel, toTimeInputValue } from "../../lib/periodSchedule";
import { UnsavedScheduleBanner } from "./UnsavedScheduleBanner";

interface PeriodScheduleSectionProps {
  dispenser: DispenserDetails;
}

export function PeriodScheduleSection({ dispenser }: PeriodScheduleSectionProps) {
  const [morning, setMorning] = useState("21:00");
  const [afternoon, setAfternoon] = useState("21:01");
  const [night, setNight] = useState("21:02");
  const [hwStatus, setHwStatus] = useState<HardwareStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduleMeta, setScheduleMeta] = useState<PeriodSchedule | null>(null);
  const [now, setNow] = useState(() => new Date());

  const hardwareId = dispenser.hardware_id;
  const patientId = dispenser.patient_id;

  const refreshHardware = useCallback(async () => {
    if (!dispenser.is_online) {
      setHwStatus(null);
      return;
    }
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
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar horários");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hardwareId]);

  useEffect(() => {
    refreshHardware();
    const id = setInterval(refreshHardware, 5000);
    return () => clearInterval(id);
  }, [refreshHardware]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      setError("Dispensador sem paciente vinculado.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await savePeriodSchedule(hardwareId, {
        patient_id: patientId,
        morning_time: morning,
        afternoon_time: afternoon,
        night_time: night,
        is_active: true,
      });
      setScheduleMeta(saved);
      setMessage("Horários salvos. O servidor disparará a dispensação nos horários configurados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleStartCycle() {
    setStarting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await startDispenserCycle(hardwareId, dispenser.ip_address);
      setMessage(result.message);
      await refreshHardware();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao iniciar ciclo");
    } finally {
      setStarting(false);
    }
  }

  const nextCompartment =
    hwStatus != null ? Math.min(hwStatus.current_slot + 1, hwStatus.total_slots) : null;

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
      <h2
        id="period-schedule-heading"
        style={{
          margin: "0 0 var(--space-2)",
          fontSize: "var(--text-xl)",
          fontWeight: 700,
          color: "var(--ink)",
        }}
      >
        Horários de dispensação (manhã / tarde / noite)
      </h2>
      <p style={{ margin: "0 0 var(--space-4)", color: "var(--ink-2)", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
        Cada horário avança a roleta uma posição na sequência. Após reabastecer os compartimentos 1–21,
        use <strong>Iniciar ciclo</strong> para calibrar automaticamente.
      </p>

      {scheduleMeta?.source === "defaults" && !loading && <UnsavedScheduleBanner />}

      {hwStatus && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "var(--space-3)",
            marginBottom: "var(--space-4)",
            padding: "var(--space-3)",
            background: "var(--canvas)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>Roleta</span>
            <p style={{ margin: 0, fontWeight: 600, color: "var(--ink)" }}>
              Posição {hwStatus.current_slot}/{hwStatus.total_slots}
            </p>
          </div>
          <div>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>Próximo compartimento</span>
            <p style={{ margin: 0, fontWeight: 600, color: "var(--ink)" }}>
              {nextCompartment ?? "—"}
            </p>
          </div>
          <div>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>Próximo período</span>
            <p style={{ margin: 0, fontWeight: 600, color: "var(--ink)" }}>
              {nextPeriodLabel(scheduleMeta, now)}
            </p>
          </div>
          <div>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>Confirmação pendente</span>
            <p style={{ margin: 0, fontWeight: 600, color: hwStatus.awaiting_confirm ? "var(--warning)" : "var(--ink)" }}>
              {hwStatus.awaiting_confirm ? "Sim" : "Não"}
            </p>
          </div>
        </div>
      )}

      {!dispenser.is_online && (
        <p style={{ color: "var(--warning)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
          Dispensador offline — telemetria da roleta indisponível.
        </p>
      )}

      <button
        type="button"
        onClick={handleStartCycle}
        disabled={starting || !dispenser.is_online}
        style={{
          marginBottom: "var(--space-4)",
          background: "var(--primary)",
          color: "var(--primary-on)",
          border: "none",
          borderRadius: "var(--radius-md)",
          padding: "12px 20px",
          fontWeight: 600,
          cursor: dispenser.is_online && !starting ? "pointer" : "not-allowed",
          opacity: dispenser.is_online ? 1 : 0.6,
        }}
      >
        {starting ? "Calibrando…" : "Concluir reabastecimento e iniciar ciclo"}
      </button>

      {loading ? (
        <p style={{ color: "var(--ink-3)" }}>Carregando horários…</p>
      ) : (
        <form onSubmit={handleSave}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "var(--space-4)",
              marginBottom: "var(--space-4)",
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "var(--text-sm)" }}>
              Manhã
              <input type="time" value={morning} onChange={(e) => setMorning(e.target.value)} required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "var(--text-sm)" }}>
              Tarde
              <input type="time" value={afternoon} onChange={(e) => setAfternoon(e.target.value)} required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "var(--text-sm)" }}>
              Noite
              <input type="time" value={night} onChange={(e) => setNight(e.target.value)} required />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving || !patientId}
            style={{
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "10px 18px",
              fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? "Salvando…" : "Salvar horários"}
          </button>
        </form>
      )}

      {scheduleMeta?.source === "database" && !loading && (
        <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--success-ink, var(--primary))" }}>
          Horários salvos — o servidor disparará a dispensação automaticamente nos horários configurados.
        </p>
      )}

      {message && (
        <p style={{ marginTop: "var(--space-3)", color: "var(--primary)", fontSize: "var(--text-sm)" }}>{message}</p>
      )}
      {error && (
        <p style={{ marginTop: "var(--space-3)", color: "var(--danger)", fontSize: "var(--text-sm)" }}>{error}</p>
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
    if (!isOnline) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    const load = () =>
      getHardwareStatus(hardwareId, ipAddress)
        .then((s) => {
          if (!cancelled) setStatus(s);
        })
        .catch(() => {
          if (!cancelled) setStatus(null);
        });
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [hardwareId, isOnline, ipAddress]);

  return status;
}
