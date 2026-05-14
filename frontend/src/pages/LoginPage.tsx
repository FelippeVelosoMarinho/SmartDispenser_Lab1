import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../auth/AuthContext";
import "./LoginPage.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    console.info("[login-page] submit", { identifier });
    try {
      await login(identifier, password);
      console.info("[login-page] login success", { identifier });
      navigate({ to: redirect ?? "/dashboard" });
    } catch (err) {
      console.warn("[login-page] login failed", { identifier, error: err });
      setError("Não foi possível entrar. Verifique seu nome de usuário/e-mail e senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-grain" aria-hidden="true" />

      <main className="login-container">
        <div className="login-card" role="main">
          {/* Brand mark */}
          <div className="login-brand">
            <div className="login-brand__mark" aria-hidden="true">
              <i className="ph-duotone ph-pill" />
            </div>
            <div className="login-brand__text">
              <span className="eyebrow">Eco-Dispenser</span>
              <h1 className="login-brand__name">Pillar</h1>
            </div>
          </div>

          <div className="login-heading">
            <h2 className="login-heading__title">Entrar</h2>
            <p className="login-heading__subtitle">
              Bem-vindo de volta. Insira seus dados para continuar.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <Input
              label="Nome de usuário ou e-mail"
              type="text"
              name="username"
              autoComplete="username"
              placeholder="seu_usuario ou voce@exemplo.com"
              icon="ph-duotone ph-envelope"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <div className="login-password-field">
              <Input
                label="Senha"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                icon="ph-duotone ph-lock"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                <i
                  className={`ph-duotone ${showPassword ? "ph-eye-slash" : "ph-eye"}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="login-forgot">
              <a href="#forgot" className="login-forgot__link">
                Esqueceu a senha?
              </a>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <i className="ph-duotone ph-warning-octagon" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              size="large"
              loading={loading}
              leftIcon={loading ? undefined : "ph-duotone ph-sign-in"}
              className="login-submit"
            >
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>

          <div className="login-divider" role="separator">
            <span>or</span>
          </div>

          <p className="login-signup">
            Não tem uma conta?{" "}
              <a
                role="button"
                onClick={(e) => {
                  e.preventDefault();
                  navigate({ to: "/register" });
                }}
                className="login-signup__link"
              >
                Solicitar acesso
              </a>
          </p>
        </div>

        <footer className="login-footer">
          <p>Eco-Dispenser • ESP32-C3 • Open source</p>
        </footer>
      </main>
    </div>
  );
}
