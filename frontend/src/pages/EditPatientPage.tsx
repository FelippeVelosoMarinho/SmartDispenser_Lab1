import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardFooter } from "../components/ui/Card";
import { getPatient, updatePatient } from "../lib/api";

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

export function EditPatientPage() {
  const navigate = useNavigate();
  const { patientId } = useParams({ from: "/_authenticated/patients/$patientId/edit" });


  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPatient() {
      setLoading(true);
      setLoadError(null);
      setNotFound(false);

      try {
        const patient = await getPatient(patientId);
        if (!mounted) return;
        setForm({
          nome: patient.name,
          idade: patient.age?.toString() ?? "",
          condition: patient.condition ?? "",
        });
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Falha ao carregar paciente";
        setLoadError(message);
        setNotFound(message.toLowerCase().includes("not found"));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPatient();

    return () => {
      mounted = false;
    };
  }, [patientId]);

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
      await updatePatient(patientId, {
        name: form.nome.trim(),
        age: idadeNum,
        condition: form.condition.trim(),
      });
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
        <p style={{ color: "var(--ink-3)" }}>Carregando paciente…</p>
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
          Smart-Dispenser
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

        {loadError && (
          <div
            style={{
              marginBottom: "var(--space-5)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius)",
              background: "var(--danger-soft, rgba(220, 38, 38, 0.08))",
              color: "var(--danger-ink, #991b1b)",
            }}
            role="alert"
          >
            {loadError}
          </div>
        )}

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
