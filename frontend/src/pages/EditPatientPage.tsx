import { useState, useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardFooter } from "../components/ui/Card";
import { useAuth } from "../auth/AuthContext";

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

export function EditPatientPage() {
  const navigate = useNavigate();
  const { patientId } = useParams({ from: "/_authenticated/patients/$patientId/edit" });
  const { token } = useAuth();

  const [form, setForm] = useState<FormState>({
    nome: "",
    idade: "",
    medicacao: "",
    status: "ativo",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadPatient() {
      try {
        const res = await fetch(`/api/patients/${patientId}`, {
          headers: {
            "Authorization": token ? `Bearer ${token}` : "",
          },
        });
        if (res.ok) {
          const p = await res.json();
          setForm({
            nome: p.name,
            idade: String(p.age || ""),
            medicacao: p.condition || "",
            status: "ativo",
          });
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadPatient();
  }, [patientId, token]);

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
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          name: form.nome,
          age: Number(form.idade),
          condition: form.medicacao,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail ?? "Erro ao atualizar paciente.");
      }

      navigate({ to: "/patients" });
    } catch (err: any) {
      alert(err.message || "Erro de conexão ao salvar alterações.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    navigate({ to: "/patients" });
  }

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          padding: "var(--space-8) var(--space-7)",
          maxWidth: "720px",
          margin: "0 auto",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
        }}
      >
        <div className="btn-spinner" style={{ borderColor: "var(--border-subtle)", borderTopColor: "var(--primary)" }} />
        <span style={{ marginLeft: "10px", color: "var(--ink-3)" }}>Carregando paciente...</span>
      </div>
    );
  }
  if (notFound) {
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
            marginBottom: "var(--space-6)",
          }}
        >
          <i className="ph-duotone ph-arrow-left" aria-hidden="true" />
          Voltar para pacientes
        </button>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-4)",
            color: "var(--ink-3)",
            paddingTop: "var(--space-10)",
          }}
        >
          <i className="ph-duotone ph-user-x" style={{ fontSize: "3rem" }} aria-hidden="true" />
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-base)" }}>
            Paciente não encontrado.
          </p>
        </div>
      </div>
    );
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
          Editar paciente
        </h1>
        <p
          style={{
            marginTop: "var(--space-2)",
            color: "var(--ink-3)",
            fontSize: "var(--text-sm)",
          }}
        >
          Atualize os dados de <strong>{form.nome}</strong> abaixo.
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
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
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
                {submitting ? "Salvando…" : "Salvar alterações"}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>

      <button
        type="button"
        onClick={() => navigate({ to: "/patients/$patientId/medications", params: { patientId } })}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginTop: "var(--space-4)",
          padding: "var(--space-4) var(--space-5)",
          borderRadius: "var(--radius)",
          border: "1.5px solid var(--primary)",
          background: "var(--primary-soft)",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.15s ease-out",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-soft)"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius)",
              background: "var(--primary)",
              color: "#fff",
              fontSize: "1.1rem",
              flexShrink: 0,
            }}
          >
            <i className="ph-duotone ph-pill" aria-hidden="true" />
          </span>
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                fontWeight: 700,
                color: "var(--primary)",
              }}
            >
              Medicamentos e posologia
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--ink-3)",
                marginTop: "2px",
              }}
            >
              Gerenciar medicamentos, dosagens e horários de administração.
            </p>
          </div>
        </div>
        <i
          className="ph-duotone ph-arrow-right"
          aria-hidden="true"
          style={{ color: "var(--primary)", fontSize: "1.1rem", flexShrink: 0 }}
        />
      </button>
    </div>
  );
}
