import { useCallback, useEffect, useRef, useState } from "react";
import type { DispenserDetails, DemoStatus } from "../../lib/api";
import {
  startCalibrationDemo,
  getCalibrationDemoStatus,
  stopCalibrationDemo,
} from "../../lib/api";

interface CalibrationDemoSectionProps {
  dispenser: DispenserDetails;
}

const PHASES = [
  {
    key: "morning",
    label: "Manhã",
    icon: "ph-sun",
    color: "var(--warning)",
    bg: "color-mix(in srgb, var(--warning) 10%, transparent)",
    border: "color-mix(in srgb, var(--warning) 30%, transparent)",
    activeBg: "color-mix(in srgb, var(--warning) 18%, transparent)",
    activeBorder: "color-mix(in srgb, var(--warning) 60%, transparent)",
  },
  {
    key: "afternoon",
    label: "Tarde",
    icon: "ph-cloud-sun",
    color: "var(--accent)",
    bg: "color-mix(in srgb, var(--accent) 10%, transparent)",
    border: "color-mix(in srgb, var(--accent) 30%, transparent)",
    activeBg: "color-mix(in srgb, var(--accent) 18%, transparent)",
    activeBorder: "color-mix(in srgb, var(--accent) 60%, transparent)",
  },
  {
    key: "night",
    label: "Noite",
    icon: "ph-moon-stars",
    color: "var(--period-night)",
    bg: "color-mix(in srgb, var(--period-night) 10%, transparent)",
    border: "color-mix(in srgb, var(--period-night) 30%, transparent)",
    activeBg: "color-mix(in srgb, var(--period-night) 18%, transparent)",
    activeBorder: "color-mix(in srgb, var(--period-night) 60%, transparent)",
  },
];

type DemoState = "idle" | "starting" | "running" | "done" | "error";

function phaseToIndex(phase: string): number {
  if (phase === "morning") return 0;
  if (phase === "afternoon") return 1;
  if (phase === "night") return 2;
  return -1;
}

function statusMessage(step: number, phase: string): string {
  if (phase === "starting") return "Iniciando demo...";
  if (step === 1 && phase === "morning") return "Etapa 1 de 3 — Dispensando manhã…";
  if (step === 2 && phase === "afternoon") return "Etapa 2 de 3 — Dispensando tarde…";
  if (step === 3 && phase === "night") return "Etapa 3 de 3 — Dispensando noite…";
  return "Executando demo…";
}

export function CalibrationDemoSection({ dispenser }: CalibrationDemoSectionProps) {
  const [demoState, setDemoState] = useState<DemoState>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("idle");
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStepRef = useRef(0);

  const ip = dispenser.ip_address;
  const isOnline = dispenser.is_online && !!ip;

  const clearTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  const startPolling = useCallback(() => {
    if (!ip) return;

    pollRef.current = setInterval(async () => {
      try {
        const status: DemoStatus = await getCalibrationDemoStatus(dispenser.hardware_id, ip);

        if (status.step !== lastStepRef.current) {
          lastStepRef.current = status.step;
          setCountdown(30);
        }

        setCurrentStep(status.step);
        setCurrentPhase(status.phase);

        if (!status.running && status.step === 0 && currentStep > 0) {
          // Demo finished
          setDemoState("done");
          clearTimers();
          setTimeout(() => {
            setDemoState("idle");
            setCurrentStep(0);
            setCurrentPhase("idle");
          }, 5000);
        } else if (!status.running && status.step === 0 && currentStep === 0) {
          // Not started yet or already reset
        }
      } catch {
        // Polling errors are not fatal; ESP might be busy
      }
    }, 2000);
  }, [ip, clearTimers, currentStep]);

  // Countdown ticker
  useEffect(() => {
    if (demoState !== "running" && demoState !== "starting") return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [demoState]);

  async function handleStart() {
    if (!ip) return;
    setDemoState("starting");
    setError(null);
    setCurrentStep(0);
    setCurrentPhase("starting");
    lastStepRef.current = 0;
    setCountdown(0);

    try {
      await startCalibrationDemo(dispenser.hardware_id, ip);
      setDemoState("running");
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao iniciar demo");
      setDemoState("error");
    }
  }

  async function handleStop() {
    if (!ip) return;
    try {
      await stopCalibrationDemo(dispenser.hardware_id, ip);
    } catch {
      // Ignore stop errors
    }
    clearTimers();
    setDemoState("idle");
    setCurrentStep(0);
    setCurrentPhase("idle");
    setCountdown(0);
  }

  const isActive = demoState === "running" || demoState === "starting";
  const isDone = demoState === "done";

  function getCardState(index: number) {
    const activeIdx = phaseToIndex(currentPhase);

    if (isDone) return "done";
    if (!isActive) return "idle";
    if (index < currentStep) return "done";
    if (index === activeIdx) return "active";
    if (index === currentStep) return "next";
    return "waiting";
  }

  return (
    <section
      style={{
        marginBottom: "var(--space-8)",
        background: "var(--surface)",
        border: `1.5px solid ${isActive ? "color-mix(in srgb, var(--info) 40%, transparent)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        transition: "border-color 0.3s",
      }}
      aria-labelledby="demo-heading"
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          flexWrap: "wrap",
          marginBottom: "var(--space-4)",
        }}
      >
        <div>
          <h2
            id="demo-heading"
            style={{
              margin: "0 0 var(--space-1)",
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <i
              className="ph-duotone ph-flask"
              style={{
                fontSize: "1.3rem",
                color: "var(--info)",
              }}
            />
            Demo de Calibração
          </h2>
          <p
            style={{
              margin: 0,
              color: "var(--ink-3)",
              fontSize: "var(--text-sm)",
            }}
          >
            Teste rápido de todos os equipamentos — 3 dispensas sequenciais
            com 30s de intervalo.
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
          {isActive ? (
            <button
              type="button"
              onClick={() => void handleStop()}
              style={{
                background: "transparent",
                color: "var(--danger)",
                border: "1.5px solid color-mix(in srgb, var(--danger) 40%, transparent)",
                borderRadius: "var(--radius-md)",
                padding: "10px 18px",
                fontWeight: 600,
                fontSize: "var(--text-sm)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <i className="ph-duotone ph-stop-circle" />
              Parar Demo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={!isOnline || isDone}
              onMouseEnter={() => setHoveredBtn(true)}
              onMouseLeave={() => setHoveredBtn(false)}
              style={{
                background: isOnline
                  ? hoveredBtn
                    ? "var(--primary-hover)"
                    : "var(--primary)"
                  : "var(--surface-dim)",
                color: isOnline ? "var(--primary-on)" : "var(--ink-3)",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "10px 18px",
                fontWeight: 600,
                fontSize: "var(--text-sm)",
                cursor: isOnline && !isDone ? "pointer" : "not-allowed",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "background 0.15s, transform 0.1s",
                transform: hoveredBtn && isOnline ? "translateY(-1px)" : "none",
              }}
            >
              <i className="ph-duotone ph-play-circle" />
              Iniciar Demo
            </button>
          )}
        </div>
      </div>

      {/* Offline warning */}
      {!isOnline && !isActive && (
        <p
          style={{
            color: "var(--warning)",
            fontSize: "var(--text-sm)",
            margin: "0 0 var(--space-3)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <i className="ph-duotone ph-wifi-slash" style={{ fontSize: "1rem" }} />
          Dispensador offline — conecte à rede para executar a demo.
        </p>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            marginBottom: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius)",
            background: "var(--danger-soft)",
            color: "var(--danger-ink)",
            fontSize: "var(--text-sm)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
          role="alert"
        >
          <i className="ph-duotone ph-warning-octagon" />
          {error}
        </div>
      )}

      {/* Phase Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-3)",
          marginBottom: isActive || isDone ? "var(--space-4)" : 0,
        }}
      >
        {PHASES.map((phase, index) => {
          const cardState = getCardState(index);
          const isCardActive = cardState === "active";
          const isCardDone = cardState === "done";
          const isWaiting = cardState === "waiting" || cardState === "idle";

          return (
            <div
              key={phase.key}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-2)",
                background: isCardActive
                  ? phase.activeBg
                  : isCardDone
                    ? "color-mix(in srgb, var(--success) 10%, transparent)"
                    : phase.bg,
                border: `1.5px solid ${
                  isCardActive
                    ? phase.activeBorder
                    : isCardDone
                      ? "color-mix(in srgb, var(--success) 40%, transparent)"
                      : phase.border
                }`,
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-4)",
                opacity: isWaiting && isActive ? 0.5 : 1,
                transition: "all 0.4s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Pulse animation overlay for active card */}
              {isCardActive && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: "var(--radius-lg)",
                    animation: "demoCardPulse 2s infinite",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Icon */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isCardDone
                    ? "color-mix(in srgb, var(--success) 15%, transparent)"
                    : isCardActive
                      ? `color-mix(in srgb, ${phase.color} 20%, transparent)`
                      : "transparent",
                  transition: "background 0.3s",
                }}
              >
                {isCardDone ? (
                  <i
                    className="ph-duotone ph-check-circle"
                    style={{
                      fontSize: "1.5rem",
                      color: "var(--success)",
                    }}
                  />
                ) : (
                  <i
                    className={`ph-duotone ${phase.icon}`}
                    style={{
                      fontSize: "1.5rem",
                      color: isCardActive ? phase.color : "var(--ink-3)",
                      transition: "color 0.3s",
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  color: isCardDone
                    ? "var(--success)"
                    : isCardActive
                      ? phase.color
                      : "var(--ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  transition: "color 0.3s",
                }}
              >
                {phase.label}
              </span>

              {/* Status indicator */}
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: isCardDone
                    ? "var(--success-ink)"
                    : isCardActive
                      ? phase.color
                      : "var(--ink-4)",
                  fontWeight: 500,
                }}
              >
                {isCardDone
                  ? "✓ Concluído"
                  : isCardActive
                    ? "▶ Ativo"
                    : cardState === "next"
                      ? countdown > 0
                        ? `Em ${countdown}s`
                        : "Próximo"
                      : isActive
                        ? "Aguardando"
                        : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar + status message */}
      {(isActive || isDone) && (
        <div>
          {/* Progress bar */}
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: "var(--surface-dim)",
              overflow: "hidden",
              marginBottom: "var(--space-2)",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 3,
                background: isDone
                  ? "var(--success)"
                  : "linear-gradient(90deg, var(--primary), var(--info))",
                width: isDone
                  ? "100%"
                  : `${(currentStep / 3) * 100}%`,
                transition: "width 0.6s ease",
              }}
            />
          </div>

          {/* Status text */}
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: isDone ? "var(--success)" : "var(--ink-2)",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            {isDone ? (
              <>
                <i className="ph-duotone ph-check-circle" />
                Demo concluída com sucesso! Todos os equipamentos foram testados.
              </>
            ) : demoState === "starting" ? (
              <>
                <i
                  className="ph-duotone ph-spinner"
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Iniciando demo de calibração…
              </>
            ) : (
              <>
                <i
                  className="ph-duotone ph-gear"
                  style={{ animation: "spin 2s linear infinite" }}
                />
                {statusMessage(currentStep, currentPhase)}
                {countdown > 0 && currentStep < 3 && (
                  <span style={{ color: "var(--ink-3)", marginLeft: "var(--space-1)" }}>
                    · Próxima em {countdown}s
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      )}

      {/* Inline keyframe animations */}
      <style>{`
        @keyframes demoCardPulse {
          0% { box-shadow: inset 0 0 0 0 rgba(59, 130, 246, 0.1); }
          50% { box-shadow: inset 0 0 20px 0 rgba(59, 130, 246, 0.08); }
          100% { box-shadow: inset 0 0 0 0 rgba(59, 130, 246, 0.1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
