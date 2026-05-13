import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardFooter } from "../components/ui/Card";

type PatientStatus = "ativo" | "inativo";

interface FormState {
  nome: string;
  idade: string;
  medicacao: string;
  status: PatientStatus;
}

interface FormErrors {
  nome?: string;
  idade?: string;
  medicacao?: string;
}

const INITIAL_STATE: FormState = {
  nome: "",
  idade: "",
  medicacao: "",
  status: "ativo",
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
    if (!form.medicacao.trim()) {
      next.medicacao = "Informe a medicação.";
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

    setSubmitting(true);
    try {
      // TODO: integrar com backend quando o endpoint estiver disponível
      await new Promise((r) => setTimeout(r, 400));
      navigate({ to: "/patients" });
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
          Eco-Dispenser
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
                label="Medicação ativa"
                placeholder="Ex.: Ritalina 10 mg"
                icon="ph-duotone ph-pill"
                value={form.medicacao}
                onChange={(e) => updateField("medicacao", e.target.value)}
                error={errors.medicacao}
                helperText="Inclua o nome do medicamento e a dosagem."
                required
              />

              <div className="pillar-input-wrapper">
                <span className="pillar-input__label">Status</span>
                <div
                  role="radiogroup"
                  aria-label="Status do paciente"
                  style={{
                    display: "flex",
                    gap: "var(--space-3)",
                    flexWrap: "wrap",
                  }}
                >
                  {(["ativo", "inativo"] as PatientStatus[]).map((value) => {
                    const checked = form.status === value;
                    return (
                      <label
                        key={value}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "10px 16px",
                          borderRadius: "var(--radius)",
                          border: `1.5px solid ${checked ? "var(--primary)" : "var(--border)"}`,
                          background: checked
                            ? "var(--primary-soft)"
                            : "var(--surface)",
                          color: checked ? "var(--primary)" : "var(--ink)",
                          fontFamily: "var(--font-sans)",
                          fontSize: "var(--text-sm)",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease-out",
                          textTransform: "capitalize",
                        }}
                      >
                        <input
                          type="radio"
                          name="status"
                          value={value}
                          checked={checked}
                          onChange={() => updateField("status", value)}
                          style={{ position: "absolute", opacity: 0 }}
                        />
                        <i
                          className={`ph-duotone ${value === "ativo" ? "ph-check-circle" : "ph-minus-circle"}`}
                          aria-hidden="true"
                        />
                        {value}
                      </label>
                    );
                  })}
                </div>
              </div>
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
