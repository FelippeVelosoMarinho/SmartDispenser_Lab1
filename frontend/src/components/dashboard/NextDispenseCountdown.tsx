import { useEffect, useMemo, useState } from "react";
import { getPeriodSchedule, type PeriodSchedule } from "../../lib/api";
import { computeNextDispense, formatCountdown } from "../../lib/periodSchedule";

interface NextDispenseCountdownProps {
  hardwareId: string;
  isOnline: boolean;
  awaitingConfirm?: boolean;
}

const FALLBACK_SCHEDULE: PeriodSchedule = {
  dispenser_id: "",
  patient_id: "",
  morning_time: "08:00",
  afternoon_time: "14:00",
  night_time: "20:00",
  is_active: true,
  source: "defaults",
};

export function NextDispenseCountdown({
  hardwareId,
  isOnline,
  awaitingConfirm = false,
}: NextDispenseCountdownProps) {
  const [schedule, setSchedule] = useState<PeriodSchedule | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getPeriodSchedule(hardwareId)
        .then((ps) => {
          if (!cancelled) setSchedule(ps);
        })
        .catch(() => {
          if (!cancelled) setSchedule(FALLBACK_SCHEDULE);
        });
    };
    load();
    const refreshId = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(refreshId);
    };
  }, [hardwareId]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const effectiveSchedule = schedule ?? FALLBACK_SCHEDULE;
  const nextDispense = useMemo(
    () => computeNextDispense(effectiveSchedule, now),
    [effectiveSchedule, now],
  );

  if (!nextDispense) return null;

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`Próxima dispensação em ${formatCountdown(nextDispense.secondsRemaining)}`}
      style={{
        marginBottom: "var(--space-6)",
        padding: "var(--space-5) var(--space-6)",
        borderRadius: "var(--radius-lg)",
        border: `2px solid ${isOnline ? "var(--primary)" : "var(--border)"}`,
        background: isOnline
          ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, var(--surface) 55%)"
          : "var(--surface)",
        textAlign: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-2)",
        }}
      >
        <i
          className="ph-duotone ph-timer"
          style={{ fontSize: "1.25rem", color: "var(--primary)" }}
          aria-hidden
        />
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          Próxima dispensação
        </span>
      </div>

      <p
        style={{
          margin: "0 0 var(--space-2)",
          fontSize: "clamp(2.5rem, 8vw, 3.5rem)",
          fontWeight: 800,
          color: isOnline ? "var(--primary)" : "var(--ink-3)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {formatCountdown(nextDispense.secondsRemaining)}
      </p>

      <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600, color: "var(--ink)" }}>
        {nextDispense.periodLabel} às {nextDispense.timeLabel}
      </p>

      {effectiveSchedule.source === "defaults" && (
        <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>
          Horários padrão — salve em &quot;Horários de dispensação&quot; para confirmar.
        </p>
      )}

      <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>
        O servo pode ativar até ~30 s após o horário (heartbeat do ESP).
      </p>

      {!isOnline && (
        <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-sm)", color: "var(--warning)" }}>
          Dispensador offline — o contador mostra o horário previsto; a ativação ocorre quando o ESP reconectar.
        </p>
      )}

      {awaitingConfirm && isOnline && (
        <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-sm)", color: "var(--warning)" }}>
          Confirmação pendente — o próximo horário pode ser adiado até o paciente confirmar.
        </p>
      )}
    </div>
  );
}
