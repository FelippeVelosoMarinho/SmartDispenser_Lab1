import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardFooter } from "../components/ui/Card";
import { createPatient } from "../lib/api";
import { APP_NAME } from "../lib/brand";

interface FormState {
  nome: string;
  idade: string;
  condition: string;
}

interface FormErrors {
  nome?: string;
  idade?: string;
  condition?: string;
}

const INITIAL_STATE: FormState = {
  nome: "",
  idade: "",
  condition: "",
};

export function AddPatientPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!form.nome.trim()) {
      next.nome = "Informe o nome do paciente.";
    }
    const idadeNum = Number(form.idade);
    if (!form.idade.trim()) {
      next.idade = "Informe a idade.";
    } else if (!Number.isInteger(idadeNum) || idadeNum <= 0 || idadeNum > 130) {
      next.idade = "Idade deve ser um número entre 1 e 130.";
    }
    if (!form.condition.trim()) {
      next.condition = "Informe a condição ou medicação.";
    }
    return next;
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const idadeNum = Number(form.idade);

    setSubmitting(true);
    try {
      await createPatient({
        name: form.nome.trim(),
        age: idadeNum,
        condition: form.condition.trim(),
      });
      navigate({ to: "/patients" });
    } catch (err: any) {
      alert(err.message || "Erro de conexão ao criar o paciente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    navigate({ to: "/patients" });
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "var(--space-8) var(--space-7)",
        maxWidth: "720px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div style={{ marginBottom: "var(--space-6)" }}>
        <button
          type="button"
          onClick={handleCancel}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            background: "transparent",
            border: "none",
            padding: "var(--space-1) 0",
            color: "var(--ink-3)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            marginBottom: "var(--space-3)",
          }}
        >
          <i className="ph-duotone ph-arrow-left" aria-hidden="true" />
          Voltar para pacientes
        </button>
        <p
          className="eyebrow"
          style={{ marginBottom: "var(--space-1)", color: "var(--ink-3)" }}
        >
          {APP_NAME}
        </p>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-2xl)",
            fontWeight: 700,
            color: "var(--ink)",
            lineHeight: "var(--leading-heading)",
            margin: 0,
          }}
        >
          Novo paciente
        </h1>
        <p
          style={{
            marginTop: "var(--space-2)",
            color: "var(--ink-3)",
            fontSize: "var(--text-sm)",
          }}
        >
          Preencha os dados abaixo para cadastrar um novo paciente.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <CardContent>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-5)",
              }}
            >
              <Input
                label="Nome completo"
                placeholder="Ex.: Ana Souza"
                icon="ph-duotone ph-user"
                value={form.nome}
                onChange={(e) => updateField("nome", e.target.value)}
                error={errors.nome}
                autoComplete="name"
                required
              />

              <Input
                label="Idade"
                type="number"
                inputMode="numeric"
                min={1}
                max={130}
                placeholder="Ex.: 34"
                icon="ph-duotone ph-cake"
                value={form.idade}
                onChange={(e) => updateField("idade", e.target.value)}
                error={errors.idade}
                required
              />

              <Input
                label="Condição / medicação"
                placeholder="Ex.: TDAH ou Ritalina 10 mg"
                icon="ph-duotone ph-pill"
                value={form.condition}
                onChange={(e) => updateField("condition", e.target.value)}
                error={errors.condition}
                helperText="Descreva a condição clínica ou a medicação principal."
                required
              />
            </div>
          </CardContent>

          <CardFooter align="right">
            <div
              style={{
                display: "flex",
                gap: "var(--space-3)",
                flexWrap: "wrap",
              }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={submitting}
                leftIcon={submitting ? undefined : "ph-duotone ph-check"}
              >
                {submitting ? "Salvando…" : "Salvar paciente"}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
