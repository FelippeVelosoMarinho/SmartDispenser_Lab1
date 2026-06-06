import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";
import "../ui/ConfirmModal.css";
import { resetDispenserWifi, type Dispenser } from "../../lib/api";

interface DispenserWifiResetPanelProps {
  dispensers: Dispenser[];
  onResetComplete: (hardwareId: string) => void;
}

export function DispenserWifiResetPanel({
  dispensers,
  onResetComplete,
}: DispenserWifiResetPanelProps) {
  const navigate = useNavigate();
  const [target, setTarget] = useState<Dispenser | null>(null);
  const [resetting, setResetting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidates = dispensers.filter((d) => d.is_online && d.ip_address);

  async function handleConfirmReset() {
    if (!target?.ip_address) return;
    setResetting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await resetDispenserWifi(target.hardware_id, target.ip_address);
      onResetComplete(target.hardware_id);
      setTarget(null);
      setSuccessMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao resetar Wi-Fi do ESP");
    } finally {
      setResetting(false);
    }
  }

  return (
    <section
      aria-labelledby="wifi-reset-panel-heading"
      style={{
        marginBottom: "var(--space-6)",
        padding: "var(--space-5) var(--space-6)",
        borderRadius: "var(--radius-lg)",
        border: "2px solid rgba(239, 68, 68, 0.35)",
        background:
          "linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, var(--surface) 60%)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-md)",
            background: "rgba(239, 68, 68, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <i
            className="ph-duotone ph-wifi-slash"
            aria-hidden
            style={{ fontSize: "1.75rem", color: "var(--danger, #ef4444)" }}
          />
        </div>

        <div style={{ flex: 1, minWidth: "220px" }}>
          <h2
            id="wifi-reset-panel-heading"
            style={{
              margin: "0 0 var(--space-2)",
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              color: "var(--ink)",
            }}
          >
            Resetar Wi-Fi e reconectar
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "var(--ink-2)",
              lineHeight: 1.6,
              maxWidth: "52rem",
            }}
          >
            Apaga as credenciais Wi-Fi no ESP e reinicia em modo <strong>Bluetooth</strong>.
            O aparelho ficará <strong>desconectado</strong> até você parear de novo. Use na
            mesma rede Wi-Fi do dispensador (ou o reset pode falhar).
          </p>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          style={{
            marginTop: "var(--space-4)",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-md)",
            background: "var(--success-soft, rgba(16, 185, 129, 0.1))",
            border: "1px solid rgba(16, 185, 129, 0.35)",
          }}
        >
          <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--ink)" }}>
            {successMessage}
          </p>
          <Button
            leftIcon="ph-duotone ph-bluetooth"
            onClick={() => navigate({ to: "/dispensers/pair" })}
          >
            Ir para pareamento Bluetooth
          </Button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          style={{
            marginTop: "var(--space-4)",
            fontSize: "var(--text-sm)",
            color: "var(--danger, #ef4444)",
          }}
        >
          {error}
        </p>
      )}

      {candidates.length === 0 ? (
        <p
          style={{
            marginTop: "var(--space-4)",
            fontSize: "var(--text-sm)",
            color: "var(--ink-3)",
          }}
        >
          Nenhum dispensador online com IP conhecido no momento.
        </p>
      ) : (
        <ul
          style={{
            margin: "var(--space-4) 0 0",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {candidates.map((dispenser) => (
            <li
              key={dispenser.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-4)",
                flexWrap: "wrap",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--canvas)",
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: "var(--ink)", fontSize: "var(--text-sm)" }}>
                  {dispenser.hardware_id}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>
                  IP {dispenser.ip_address}
                  {dispenser.patient_name ? ` · ${dispenser.patient_name}` : ""}
                </p>
              </div>
              <Button
                variant="danger"
                size="small"
                leftIcon="ph-duotone ph-wifi-slash"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setTarget(dispenser);
                }}
              >
                Resetar Wi-Fi deste ESP
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={target != null}
        title="Resetar Wi-Fi do dispensador?"
        description={
          target
            ? `O ESP ${target.hardware_id} (${target.ip_address}) apagará o Wi-Fi e reiniciará em modo Bluetooth. Você precisará parear novamente.`
            : undefined
        }
        confirmLabel="Resetar Wi-Fi"
        cancelLabel="Cancelar"
        loading={resetting}
        onConfirm={() => void handleConfirmReset()}
        onCancel={() => {
          if (!resetting) setTarget(null);
        }}
      />
    </section>
  );
}
