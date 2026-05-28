import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { registerUser } from "../lib/api";

function validateEmail(value: string) {
  if (!value) return true;
  return /^[\w.-]+@[\w.-]+\.\w+$/.test(value);
}

function validateRegistrationForm(fields: {
  username: string;
  taxId: string;
  fullName: string;
  email: string;
  password: string;
  confirm: string;
}): string | null {
  if (!fields.username.trim()) return "Nome de usuário é obrigatório.";
  if (!fields.taxId.trim()) return "CPF/CNPJ é obrigatório.";
  if (!fields.fullName.trim()) return "Nome completo é obrigatório.";
  if (!fields.password) return "Senha é obrigatória.";
  if (fields.password.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
  if (fields.email.trim() && !validateEmail(fields.email.trim())) {
    return "Formato de e-mail inválido.";
  }
  if (!fields.confirm) return "Confirme a senha para continuar.";
  if (fields.password !== fields.confirm) return "As senhas não coincidem.";
  return null;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [taxId, setTaxId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validateRegistrationForm({
      username,
      taxId,
      fullName,
      email,
      password,
      confirm,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await registerUser({ username, password, tax_id: taxId, full_name: fullName, email });
      navigate({ to: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao registrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "var(--space-8)", maxWidth: 720, margin: "0 auto" }}>
      <h1>Solicitar acesso</h1>
      <p style={{ color: "var(--ink-3)" }}>Preencha os dados para solicitar acesso.</p>
      <ul style={{ marginTop: "var(--space-2)", color: "var(--ink-3)" }}>
        <li>Obrigatórios: nome de usuário, CPF/CNPJ, nome completo e senha.</li>
        <li>Senha: pelo menos 8 caracteres.</li>
        <li>E-mail: opcional, mas se preenchido precisa ser válido.</li>
      </ul>

      <form onSubmit={handleSubmit} style={{ marginTop: "var(--space-4)" }}>
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <Input
            label="Nome de usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            helperText="Obrigatório. Será usado para entrar no sistema."
          />
          <Input
            label="CPF/CNPJ"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            required
            helperText="Obrigatório. Use apenas um identificador válido do cuidador."
          />
          <Input
            label="Nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            helperText="Obrigatório. Informe o nome completo."
          />
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            helperText="Opcional. Se informar, use um e-mail válido."
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            helperText="Obrigatória. Mínimo de 8 caracteres."
          />
          <Input
            label="Confirme a senha"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            helperText="Obrigatório. Precisa ser igual à senha."
          />
        </div>

        {error && (
          <div role="alert" style={{ marginTop: "var(--space-3)", color: "#b42318" }}>{error}</div>
        )}

        <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-3)" }}>
          <Button type="submit" loading={loading}>{loading ? "Enviando…" : "Solicitar acesso"}</Button>
          <Button type="button" variant="secondary" onClick={() => navigate({ to: "/login" })} disabled={loading}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
