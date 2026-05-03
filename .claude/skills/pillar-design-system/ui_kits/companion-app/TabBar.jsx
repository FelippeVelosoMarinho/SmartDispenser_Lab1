// TabBar.jsx — bottom navigation for the companion app
function TabBar({ active = "today", onChange }) {
  const tabs = [
    { id: "today", label: "Today", icon: "ph-house" },
    { id: "meds", label: "Meds", icon: "ph-pill" },
    { id: "people", label: "People", icon: "ph-heart-straight" },
    { id: "settings", label: "Settings", icon: "ph-gear-six" },
  ];
  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 22,
        zIndex: 25,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(16px) saturate(180%)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 22,
        padding: "8px 8px",
        display: "flex",
        boxShadow: "var(--shadow-2)",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange && onChange(t.id)}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            padding: "8px 4px",
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            cursor: "pointer",
            color: active === t.id ? "var(--primary)" : "var(--ink-3)",
          }}
        >
          <i
            className={`${active === t.id ? "ph-duotone" : "ph"} ${t.icon}`}
            style={{ fontSize: 22 }}
          />
          <span
            style={{ fontSize: 11, fontWeight: active === t.id ? 600 : 500 }}
          >
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}
window.TabBar = TabBar;
