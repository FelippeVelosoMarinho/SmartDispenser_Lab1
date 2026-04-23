// Today.jsx — primary home for the companion app.
function Today({ onLog, onOpen }) {
  const greeting = "Good morning, Alex";
  const doses = [
    {
      id: 1,
      name: "Metformin",
      dose: "500 mg",
      time: "7:00 AM",
      state: "taken",
      note: "Taken at 7:04 AM",
    },
    {
      id: 2,
      name: "Sertraline",
      dose: "10 mg",
      time: "8:00 AM",
      state: "due",
      note: "in 25 minutes",
    },
    {
      id: 3,
      name: "Vitamin D",
      dose: "1000 IU",
      time: "2:00 PM",
      state: "upcoming",
      note: "Upcoming",
    },
    {
      id: 4,
      name: "Lisinopril",
      dose: "20 mg",
      time: "6:00 PM",
      state: "upcoming",
      note: "Upcoming",
    },
  ];
  const next = doses.find((d) => d.state === "due");
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "8px 20px 120px" }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          marginBottom: 6,
        }}
      >
        Wednesday · April 21
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 600,
          margin: "0 0 20px",
          letterSpacing: "-0.01em",
        }}
      >
        {greeting}
      </h1>

      {next && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 20,
            padding: 20,
            boxShadow: "var(--shadow-2)",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "var(--primary)",
              marginBottom: 10,
            }}
          >
            Up next
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "var(--primary-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className="ph-duotone ph-pill"
                style={{ fontSize: 30, color: "var(--primary)" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 19, fontWeight: 600 }}>
                {next.name} · {next.dose}
              </div>
              <div
                style={{ fontSize: 14, color: "var(--ink-3)", marginTop: 2 }}
              >
                1 tablet · chamber A
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: '"Atkinson Hyperlegible",sans-serif',
                fontWeight: 700,
                fontSize: 32,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {next.time}
            </div>
            <div style={{ fontSize: 14, color: "var(--ink-3)" }}>
              {next.note}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onLog}
              style={{
                flex: 1,
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
              <i className="ph-duotone ph-check" style={{ marginRight: 8 }} />
              Log this dose
            </button>
            <button
              style={{
                height: 52,
                padding: "0 18px",
                background: "var(--surface)",
                border: "1.5px solid var(--border)",
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              <i className="ph-duotone ph-clock" />
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          marginBottom: 10,
        }}
      >
        Today · 1 of 4 taken
      </div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 18,
          overflow: "hidden",
        }}
      >
        {doses.map((d, i) => (
          <div
            key={d.id}
            onClick={onOpen}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderBottom:
                i < doses.length - 1
                  ? "1px solid var(--border-subtle)"
                  : "none",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background:
                  d.state === "taken"
                    ? "var(--success)"
                    : d.state === "due"
                      ? "var(--primary)"
                      : "var(--border)",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontFamily: '"Atkinson Hyperlegible",sans-serif',
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                fontSize: 14,
                width: 64,
                flexShrink: 0,
              }}
            >
              {d.time}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}
              >
                {d.name}{" "}
                <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>
                  · {d.dose}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color:
                    d.state === "taken" ? "var(--success-ink)" : "var(--ink-3)",
                  marginTop: 2,
                }}
              >
                {d.note}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
window.Today = Today;
