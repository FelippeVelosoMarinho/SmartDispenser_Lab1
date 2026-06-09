import { useEffect, useState } from "react";

const themes = [
  { id: "light", label: "Padrão (Claro)" },
  { id: "dark", label: "Modo Escuro" },
  { id: "protanopia", label: "Protanopia" },
  { id: "deuteranopia", label: "Deuteranopia" },
  { id: "tritanopia", label: "Tritanopia" },
  { id: "high-contrast", label: "Alto Contraste" },
];

export function ThemeSwitcher() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("app-theme") || "light";
  });

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
      <i className="ph-duotone ph-palette" style={{ fontSize: "1.25rem", color: "var(--ink-3)" }} aria-hidden="true" />
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        title="Alterar Tema de Acessibilidade"
        aria-label="Alterar Tema de Acessibilidade"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--ink)",
          borderRadius: "var(--radius-sm)",
          padding: "6px",
          fontSize: "var(--text-xs)",
          cursor: "pointer",
          flex: 1,
          width: "100%",
        }}
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
