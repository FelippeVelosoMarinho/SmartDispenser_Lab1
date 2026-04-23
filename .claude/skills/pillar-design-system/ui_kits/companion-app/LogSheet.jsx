// LogSheet.jsx — bottom sheet confirming a dose was taken.
function LogSheet({ onDismiss }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onDismiss}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,27,45,0.4)",
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "relative",
          background: "var(--surface)",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: "14px 24px 40px",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: "var(--border)",
            margin: "0 auto 20px",
          }}
        />
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: "var(--success-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <i
            className="ph-duotone ph-check-circle"
            style={{ fontSize: 52, color: "var(--success-ink)" }}
          />
        </div>
        <h2
          style={{
            textAlign: "center",
            fontSize: 24,
            fontWeight: 600,
            margin: "0 0 6px",
          }}
        >
          Logged at 8:02 AM
        </h2>
        <p
          style={{
            textAlign: "center",
            fontSize: 16,
            color: "var(--ink-3)",
            margin: "0 0 20px",
            maxWidth: 280,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Sertraline 10 mg. Nice — that's 7 days in a row.
        </p>
        <button
          onClick={onDismiss}
          style={{
            width: "100%",
            height: 52,
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Back to today
        </button>
        <button
          style={{
            width: "100%",
            height: 44,
            background: "transparent",
            border: "none",
            color: "var(--primary)",
            fontSize: 15,
            fontWeight: 500,
            marginTop: 6,
            cursor: "pointer",
          }}
        >
          Add a note
        </button>
      </div>
    </div>
  );
}
window.LogSheet = LogSheet;
