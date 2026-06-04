// Phone.jsx — a lightweight, Pillar-themed phone frame.
// Not iOS-specific; matches our calm aesthetic (no chrome-heavy status bar).
function Phone({ children, width = 390, height = 810 }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 44,
        overflow: "hidden",
        position: "relative",
        background: "var(--canvas)",
        boxShadow:
          "0 30px 60px rgba(15,27,45,0.18), 0 0 0 10px #0F1B2D, 0 0 0 11px #2C3A56",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 110,
          height: 28,
          borderRadius: 20,
          background: "#0F1B2D",
          zIndex: 30,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          zIndex: 20,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "0 28px 6px",
          fontFamily: '"Atkinson Hyperlegible",sans-serif',
          fontWeight: 700,
          fontSize: 14,
          color: "var(--ink)",
        }}
      >
        <span>9:41</span>
        <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <i className="ph-fill ph-wifi-high" style={{ fontSize: 14 }} />
          <i className="ph-fill ph-wifi-high" style={{ fontSize: 16 }} />
        </span>
      </div>
      <div
        style={{
          height: "100%",
          paddingTop: 48,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 30,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: 128,
            height: 5,
            borderRadius: 99,
            background: "rgba(15,27,45,0.4)",
          }}
        />
      </div>
    </div>
  );
}
window.Phone = Phone;
