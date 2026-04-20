import "./StatusIndicator.css";

interface StatusIndicatorProps {
  isOn: boolean;
  isLoading: boolean;
}

export function StatusIndicator({ isOn, isLoading }: StatusIndicatorProps) {
  return (
    <div className="status-indicator-wrapper">
      <div
        className={`status-indicator ${isOn ? "on" : "off"} ${isLoading ? "loading" : ""}`}
      >
        <div className="indicator-inner">
          {isLoading ? (
            <div className="spinner" />
          ) : (
            <span className="indicator-icon">{isOn ? "💡" : "🔌"}</span>
          )}
        </div>
      </div>
      <div className={`pulse-ring ${isOn ? "active" : ""}`} />
    </div>
  );
}
