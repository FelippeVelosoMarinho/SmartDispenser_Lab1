import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PillHubLogo } from "../components/brand/PillHubLogo";
import { APP_NAME, APP_TAGLINE } from "../lib/brand";
import { resetPassword } from "../lib/api";
import "./ResetPasswordPage.css";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/reset-password" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(!token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token ?? "", password);
      setDone(true);
    } catch {
      setInvalid(true);
    } finally {
      setLoading(false);
    }
  };

  const renderBody = () => {
    if (done) {
      return (
        <div className="reset-success">
          <i className="ph-duotone ph-check-circle reset-success__icon" aria-hidden="true" />
          <h3 className="reset-success__title">Senha redefinida!</h3>
          <p className="reset-success__text">
            Sua senha foi atualizada com sucesso. Faça login com a nova senha.
          </p>
          <Button
            size="large"
            leftIcon="ph-duotone ph-sign-in"
            onClick={() => navigate({ to: "/login" })}
            style={{ width: "100%" }}
          >
            Ir para o login
          </Button>
        </div>
      );
    }

    if (invalid) {
      return (
        <div className="reset-invalid">
          <i className="ph-duotone ph-warning-octagon reset-invalid__icon" aria-hidden="true" />
          <h3 className="reset-invalid__title">Link inválido ou expirado</h3>
          <p className="reset-invalid__text">
            Este link de redefinição não é válido ou já expirou. Solicite um novo link.
          </p>
          <Button
            size="large"
            leftIcon="ph-duotone ph-arrow-left"
            onClick={() => navigate({ to: "/forgot-password" })}
            style={{ width: "100%" }}
          >
            Solicitar novo link
          </Button>
        </div>
      );
    }

    return (
      <form className="reset-form" onSubmit={handleSubmit} noValidate>
        <div className="reset-password-field">
          <Input
            label="Nova senha"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            icon="ph-duotone ph-lock"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="reset-password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            <i
              className={`ph-duotone ${showPassword ? "ph-eye-slash" : "ph-eye"}`}
              aria-hidden="true"
            />
          </button>
        </div>

        <Input
          label="Confirmar nova senha"
          type={showPassword ? "text" : "password"}
          name="confirm-password"
          autoComplete="new-password"
          placeholder="Repita a nova senha"
          icon="ph-duotone ph-lock-key"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        {error && (
          <div className="reset-error" role="alert">
            <i className="ph-duotone ph-warning-octagon" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          size="large"
          loading={loading}
          leftIcon={loading ? undefined : "ph-duotone ph-lock-key-open"}
          className="reset-submit"
        >
          {loading ? "Salvando…" : "Redefinir senha"}
        </Button>
      </form>
    );
  };

  return (
    <div className="reset-page">
      <div className="reset-bg-grain" aria-hidden="true" />

      <main className="reset-container">
        <div className="reset-card" role="main">
          <div className="reset-brand">
            <PillHubLogo size="lg" showWordmark />
            <p className="reset-brand__tagline">{APP_TAGLINE}</p>
          </div>

          {!done && !invalid && (
            <div className="reset-heading">
              <h2 className="reset-heading__title">Criar nova senha</h2>
              <p className="reset-heading__subtitle">
                Escolha uma senha segura para a sua conta.
              </p>
            </div>
          )}

          {renderBody()}
        </div>

        <footer className="reset-footer">
          <p>{APP_NAME} • ESP32-C3 • Open source</p>
        </footer>
      </main>
    </div>
  );
}
