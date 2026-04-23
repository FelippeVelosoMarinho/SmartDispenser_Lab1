import { useLed } from "./hooks/useLed";
import { StatusIndicator } from "./components/StatusIndicator";
import { ConnectionBadge } from "./components/ConnectionBadge";
import "./App.css";

function App() {
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
    <div className="app">
      {/* Animated background */}
      <div className="bg-gradient" />
      <div className="bg-grid" />

      <main className="container">
        {/* Header */}
        <header className="header">
          <span className="header-icon">🌿</span>
          <h1 className="header-title">Eco-Dispenser</h1>
          <p className="header-subtitle">MVP — LED Control Panel</p>
        </header>

        {/* Connection Status */}
        <ConnectionBadge
          backendReachable={backendReachable}
          hardwareReachable={hardwareReachable}
        />

        {/* Main Card */}
        <div className="card">
          {/* LED Status */}
          <StatusIndicator isOn={isOn} isLoading={isLoading} />

          <p className="status-label">
            {isLoading
              ? "Carregando..."
              : isOn
                ? "LED Ligado"
                : "LED Desligado"}
          </p>

          {/* Latency */}
          {latencyMs !== null && (
            <div className="latency">
              <span className="latency-icon">⚡</span>
              <span>{latencyMs.toFixed(1)} ms</span>
            </div>
          )}

          {/* Controls */}
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
              {isToggling && isOn ? (
                <span className="btn-spinner" />
              ) : (
                "Desligar"
              )}
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="error-banner">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="footer">
          <p>ESP32-C3 SuperMini • GPIO 8 • AsyncWebServer</p>
          <p>FastAPI Proxy • React + Vite</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
