import type { DispenserDetails } from "../../lib/api";

interface TelemetryGridProps {
  dispenser: DispenserDetails;
}

export function TelemetryGrid({ dispenser }: TelemetryGridProps) {
  const isOnline = dispenser.is_online;
  const hasCriticalStock = dispenser.critical_stock;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "var(--space-4)",
      marginBottom: "var(--space-6)",
    }}>
      {/* Conectividade */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
          <i className="ph-duotone ph-wifi-high" style={{ fontSize: "1.5rem", color: isOnline ? "var(--success, #10b981)" : "var(--danger, #ef4444)" }} />
          <span style={titleStyle}>Status</span>
        </div>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 8px",
          borderRadius: "999px",
          background: isOnline ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
          color: isOnline ? "var(--success, #10b981)" : "var(--danger, #ef4444)",
          fontWeight: 600,
          fontSize: "var(--text-sm)",
        }}>
          <span style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "currentColor",
            animation: isOnline ? "pulse 2s infinite" : "none",
          }} />
          {isOnline ? "Conectado" : "Indisponível"}
        </div>
      </div>

      {/* IP */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
          <i className="ph-duotone ph-plugs"
             style={{
               fontSize: "1.5rem",
               color: "var(--primary)"
             }} />
          <span style={titleStyle}>Endereço IP</span>
        </div>
        <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--ink)" }}>
          {dispenser.ip_address || (isOnline ? "Aguardando heartbeat..." : "Sem endereço IP")}
        </div>
      </div>

      {/* Estoque Crítico */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
          <i className="ph-duotone ph-pill" style={{ fontSize: "1.5rem", color: hasCriticalStock ? "var(--danger, #ef4444)" : "var(--primary)" }} />
          <span style={titleStyle}>Estoque de Pílulas</span>
        </div>
        <div style={{
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          color: hasCriticalStock ? "var(--danger, #ef4444)" : "var(--ink-2)",
        }}>
          {hasCriticalStock ? "Atenção: Nível Crítico" : "Níveis Normais"}
        </div>
      </div>

      {/* Telemetria */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
          <i className="ph-duotone ph-clock-counter-clockwise" style={{ fontSize: "1.5rem", color: "var(--primary)" }} />
          <span style={titleStyle}>Último Sincronismo</span>
        </div>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--ink-2)" }}>
          {dispenser.last_sync ? new Date(dispenser.last_sync).toLocaleString() : "Nunca sincronizado"}
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  color: "var(--ink-2)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
