// MedDetail.jsx — detail view for a specific medication.
function MedDetail({ onBack }) {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "0 20px 40px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 0 16px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            width: 40,
            height: 40,
            border: "none",
            background: "var(--surface-sunk)",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          <i className="ph-bold ph-arrow-left" style={{ fontSize: 18 }} />
        </button>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Medications</div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            background: "var(--primary-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <i
            className="ph-duotone ph-pill"
            style={{ fontSize: 34, color: "var(--primary)" }}
          />
        </div>
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 600,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Sertraline
          </h1>
          <div style={{ fontSize: 15, color: "var(--ink-3)", marginTop: 2 }}>
            10 mg · 1 tablet · daily
          </div>
        </div>
      </div>
      <div
        style={{
          background: "var(--secondary-soft)",
          borderRadius: 14,
          padding: "14px 16px",
          marginBottom: 16,
          display: "flex",
          gap: 12,
        }}
      >
        <i
          className="ph-duotone ph-info"
          style={{ fontSize: 22, color: "var(--secondary-ink)", flexShrink: 0 }}
        />
        <div
          style={{
            fontSize: 14,
            color: "var(--secondary-ink)",
            lineHeight: 1.45,
          }}
        >
          Take with or without food. Try to take at the same time each day.
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          margin: "8px 0 8px",
        }}
      >
        Schedule
      </div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 14,
          padding: "12px 16px",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <span style={{ fontSize: 15 }}>Every day</span>
          <span style={{ fontSize: 15, color: "var(--ink-3)" }}>Mon–Sun</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
          }}
        >
          <span style={{ fontSize: 15 }}>At</span>
          <span
            style={{
              fontSize: 15,
              fontFamily: '"Atkinson Hyperlegible",sans-serif',
              fontWeight: 700,
            }}
          >
            8:00 AM
          </span>
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          margin: "0 0 8px",
        }}
      >
        Refill
      </div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 14,
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 15 }}>Pills remaining</span>
          <span
            style={{
              fontFamily: '"Atkinson Hyperlegible",sans-serif',
              fontWeight: 700,
              fontSize: 17,
            }}
          >
            18{" "}
            <span
              style={{ color: "var(--ink-3)", fontWeight: 500, fontSize: 14 }}
            >
              of 30
            </span>
          </span>
        </div>
        <div
          style={{
            height: 8,
            background: "var(--surface-sunk)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "60%",
              height: "100%",
              background: "var(--primary)",
            }}
          />
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8 }}>
          About 18 days left. We'll remind you to refill at 5 days.
        </div>
      </div>
    </div>
  );
}
window.MedDetail = MedDetail;
