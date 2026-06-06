/** Alert when period schedules exist only as server defaults (not persisted). */
export function UnsavedScheduleBanner() {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        gap: "var(--space-3)",
        alignItems: "flex-start",
        padding: "var(--space-4)",
        marginBottom: "var(--space-4)",
        borderRadius: "var(--radius-md)",
        border: "2px solid var(--warning)",
        background: "var(--warning-soft, rgba(245, 158, 11, 0.12))",
        textAlign: "left",
      }}
    >
      <i
        className="ph-duotone ph-warning-circle"
        aria-hidden
        style={{ fontSize: "1.5rem", color: "var(--warning)", flexShrink: 0, marginTop: 2 }}
      />
      <div>
        <p
          style={{
            margin: "0 0 var(--space-1)",
            fontWeight: 700,
            fontSize: "var(--text-sm)",
            color: "var(--warning-ink, var(--ink))",
          }}
        >
          Horários não salvos — dispensação automática desativada
        </p>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--ink-2)", lineHeight: 1.5 }}>
          O contador abaixo usa horários padrão do servidor apenas como prévia. O scheduler{" "}
          <strong>não dispara</strong> o servo até você clicar em{" "}
          <strong>&quot;Salvar horários&quot;</strong> na seção Horários de dispensação.
        </p>
      </div>
    </div>
  );
}
