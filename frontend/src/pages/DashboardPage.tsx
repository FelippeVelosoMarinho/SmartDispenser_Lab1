import { useLed } from "../hooks/useLed";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { StatusIndicator } from "../components/StatusIndicator";
import "../App.css";

export function DashboardPage() {
  const {
    isOn,
    isLoading,
    isToggling,
    hardwareReachable,
    backendReachable,
    latencyMs,
    error,
    toggle,
  } = useLed();

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
      <div style={{ marginBottom: "var(--space-6)" }}>
        <p
          className="eyebrow"
          style={{ marginBottom: "var(--space-1)", color: "var(--ink-3)" }}
        >
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
          Painel
        </h1>
      </div>

      <div className="bg-gradient" />
      <div className="bg-grid" />

      <ConnectionBadge
        backendReachable={backendReachable}
        hardwareReachable={hardwareReachable}
      />

      <div className="card">
        <StatusIndicator isOn={isOn} isLoading={isLoading} />

        <p className="status-label">
          {isLoading ? "Carregando..." : isOn ? "LED Ligado" : "LED Desligado"}
        </p>

        {latencyMs !== null && (
          <div className="latency">
            <span className="latency-icon">&#9889;</span>
            <span>{latencyMs.toFixed(1)} ms</span>
          </div>
        )}

        <div className="controls">
          <button
            className={`btn btn-on ${isOn ? "active" : ""}`}
            onClick={() => toggle("on")}
            disabled={isToggling || isLoading || !hardwareReachable}
          >
            {isToggling && !isOn ? <span className="btn-spinner" /> : "Ligar"}
          </button>
          <button
            className={`btn btn-off ${!isOn && !isLoading ? "active" : ""}`}
            onClick={() => toggle("off")}
            disabled={isToggling || isLoading || !hardwareReachable}
          >
            {isToggling && isOn ? <span className="btn-spinner" /> : "Desligar"}
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <i className="ph-duotone ph-warning-octagon" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>ESP32-C3 SuperMini • GPIO 8 • AsyncWebServer</p>
        <p>FastAPI Proxy • React + Vite</p>
      </footer>
    </div>
  );
}
