interface ConnectionBadgeProps {
  backendReachable: boolean;
  hardwareReachable: boolean;
}

export function ConnectionBadge({
  backendReachable,
  hardwareReachable,
}: ConnectionBadgeProps) {
  return (
    <div className="connection-badges">
      <div
        className={`badge ${backendReachable ? "connected" : "disconnected"}`}
      >
        <span className="badge-dot" />
        <span>Backend</span>
      </div>
      <div
        className={`badge ${hardwareReachable ? "connected" : "disconnected"}`}
      >
        <span className="badge-dot" />
        <span>ESP32</span>
      </div>
    </div>
  );
}
