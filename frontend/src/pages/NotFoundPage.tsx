import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-4)",
        padding: "var(--space-8)",
        textAlign: "center",
      }}
    >
      <i
        className="ph-duotone ph-compass"
        style={{ fontSize: "3rem", color: "var(--ink-3)" }}
        aria-hidden="true"
      />
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-2xl)",
          fontWeight: 700,
          color: "var(--ink)",
          margin: 0,
        }}
      >
        Página não encontrada
      </h1>
      <p style={{ color: "var(--ink-3)", margin: 0 }}>
        O endereço acessado não existe ou foi movido.
      </p>
      <Link
        to="/dashboard"
        style={{
          color: "var(--primary)",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Voltar ao painel
      </Link>
    </div>
  );
}
