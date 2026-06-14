import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PillHubLogo } from "../components/brand/PillHubLogo";
import { APP_NAME, APP_TAGLINE } from "../lib/brand";
import { forgotPassword } from "../lib/api";
import "./ForgotPasswordPage.css";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError("Não foi possível enviar o e-mail. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-bg-grain" aria-hidden="true" />

      <main className="forgot-container">
        <div className="forgot-card" role="main">
          <div className="forgot-brand">
            <PillHubLogo size="lg" showWordmark />
            <p className="forgot-brand__tagline">{APP_TAGLINE}</p>
          </div>

          <div className="forgot-heading">
            <h2 className="forgot-heading__title">Esqueceu a senha?</h2>
            <p className="forgot-heading__subtitle">
              Insira seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          {sent ? (
            <div className="forgot-success" role="alert">
              <i className="ph-duotone ph-check-circle" aria-hidden="true" />
              <span>
                Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em breve.
              </span>
            </div>
          ) : (
            <form className="forgot-form" onSubmit={handleSubmit} noValidate>
              <Input
                label="E-mail"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                icon="ph-duotone ph-envelope"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && (
                <div className="forgot-error" role="alert">
                  <i className="ph-duotone ph-warning-octagon" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                size="large"
                loading={loading}
                leftIcon={loading ? undefined : "ph-duotone ph-paper-plane-tilt"}
                className="forgot-submit"
              >
                {loading ? "Enviando…" : "Enviar link de redefinição"}
              </Button>
            </form>
          )}

          <p className="forgot-back">
            Lembrou a senha?{" "}
            <a
              role="button"
              className="forgot-back__link"
              onClick={(e) => {
                e.preventDefault();
                navigate({ to: "/login" });
              }}
            >
              Voltar ao login
            </a>
          </p>
        </div>

        <footer className="forgot-footer">
          <p>{APP_NAME} • ESP32-C3 • Open source</p>
        </footer>
      </main>
    </div>
  );
}
