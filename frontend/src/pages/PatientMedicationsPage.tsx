import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardFooter } from "../components/ui/Card";
import { ConfirmModal } from "../components/ui/ConfirmModal";

type Frequency = "diaria" | "semanal" | "mensal";
type TimeOfDay = "manha" | "tarde" | "noite" | "madrugada";

interface Medication {
  id: string;
  nome: string;
  dosagem: string;
  frequencia: Frequency;
  horarios: TimeOfDay[];
  observacoes: string;
}

interface MedicationFormState {
  nome: string;
  dosagem: string;
  frequencia: Frequency;
  horarios: TimeOfDay[];
  observacoes: string;
}

interface MedicationFormErrors {
  nome?: string;
  dosagem?: string;
  horarios?: string;
}

const MOCK_PATIENTS: Record<string, string> = {
  "1": "Ana Souza",
  "2": "Bruno Lima",
  "3": "Carla Mendes",
  "4": "Diego Ferreira",
  "5": "Eduarda Costa",
  "6": "Fábio Rocha",
  "7": "Gabriela Nunes",
  "8": "Henrique Pinto",
  "9": "Isabela Martins",
  "10": "João Alves",
  "11": "Karina Tavares",
  "12": "Lucas Carvalho",
};

const MOCK_MEDICATIONS: Record<string, Medication[]> = {
  "1": [
    {
      id: "m1",
      nome: "Ritalina",
      dosagem: "10 mg",
      frequencia: "diaria",
      horarios: ["manha", "tarde"],
      observacoes: "Tomar com água, antes das refeições.",
    },
  ],
  "2": [
    {
      id: "m2",
      nome: "Sertralina",
      dosagem: "50 mg",
      frequencia: "diaria",
      horarios: ["manha"],
      observacoes: "",
    },
  ],
};

const EMPTY_FORM: MedicationFormState = {
  nome: "",
  dosagem: "",
  frequencia: "diaria",
  horarios: [],
  observacoes: "",
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
};

const TIME_OPTIONS: { value: TimeOfDay; label: string; icon: string }[] = [
  { value: "manha", label: "Manhã", icon: "ph-duotone ph-sun-horizon" },
  { value: "tarde", label: "Tarde", icon: "ph-duotone ph-sun" },
  { value: "noite", label: "Noite", icon: "ph-duotone ph-moon-stars" },
  { value: "madrugada", label: "Madrugada", icon: "ph-duotone ph-moon" },
];

export function PatientMedicationsPage() {
  const navigate = useNavigate();
  const { patientId } = useParams({ from: "/_authenticated/patients/$patientId/medications" });

  const patientName = MOCK_PATIENTS[patientId];
  const [medications, setMedications] = useState<Medication[]>(
    MOCK_MEDICATIONS[patientId] ?? []
  );

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MedicationFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<MedicationFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!patientName) {
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
          onClick={() => navigate({ to: "/patients" })}
          style={backBtnStyle}
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

  function validate(): MedicationFormErrors {
    const next: MedicationFormErrors = {};
    if (!form.nome.trim()) next.nome = "Informe o nome do medicamento.";
    if (!form.dosagem.trim()) next.dosagem = "Informe a dosagem.";
    if (form.horarios.length === 0) next.horarios = "Selecione ao menos um horário.";
    return next;
  }

  function updateField<K extends keyof MedicationFormState>(key: K, value: MedicationFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof MedicationFormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function toggleHorario(h: TimeOfDay) {
    const next = form.horarios.includes(h)
      ? form.horarios.filter((x) => x !== h)
      : [...form.horarios, h];
    updateField("horarios", next);
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(med: Medication) {
    setEditingId(med.id);
    setForm({
      nome: med.nome,
      dosagem: med.dosagem,
      frequencia: med.frequencia,
      horarios: med.horarios,
      observacoes: med.observacoes,
    });
    setErrors({});
    setShowForm(true);
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
      if (editingId) {
        setMedications((prev) =>
          prev.map((m) =>
            m.id === editingId ? { ...m, ...form } : m
          )
        );
      } else {
        const newMed: Medication = {
          id: `m${Date.now()}`,
          ...form,
        };
        setMedications((prev) => [...prev, newMed]);
      }
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // TODO: integrar com backend quando o endpoint estiver disponível
      await new Promise((r) => setTimeout(r, 400));
      setMedications((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "var(--space-8) var(--space-7)",
        maxWidth: "800px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div style={{ marginBottom: "var(--space-6)" }}>
        <button
          type="button"
          onClick={() => navigate({ to: "/patients/$patientId/edit", params: { patientId } })}
          style={backBtnStyle}
        >
          <i className="ph-duotone ph-arrow-left" aria-hidden="true" />
          Voltar para edição do paciente
        </button>
        <p className="eyebrow" style={{ marginBottom: "var(--space-1)", color: "var(--ink-3)" }}>
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
          Medicamentos e posologia
        </h1>
        <p style={{ marginTop: "var(--space-2)", color: "var(--ink-3)", fontSize: "var(--text-sm)" }}>
          Gerenciar medicamentos de <strong>{patientName}</strong>.
        </p>
      </div>

      {/* Medication list */}
      {medications.length === 0 && !showForm ? (
        <Card>
          <CardContent>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-4)",
                padding: "var(--space-8) 0",
                color: "var(--ink-3)",
              }}
            >
              <i className="ph-duotone ph-pill" style={{ fontSize: "3rem" }} aria-hidden="true" />
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-base)", margin: 0 }}>
                Nenhum medicamento cadastrado.
              </p>
              <Button leftIcon="ph-duotone ph-plus" onClick={openAdd}>
                Adicionar medicamento
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            {medications.map((med) => (
              <MedicationCard
                key={med.id}
                medication={med}
                onEdit={() => openEdit(med)}
                onDelete={() => setDeleteTarget(med)}
              />
            ))}
          </div>

          {!showForm && (
            <Button variant="secondary" leftIcon="ph-duotone ph-plus" onClick={openAdd}>
              Adicionar medicamento
            </Button>
          )}
        </>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div style={{ marginTop: "var(--space-5)" }}>
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--ink)",
              margin: "0 0 var(--space-4) 0",
            }}
          >
            {editingId ? "Editar medicamento" : "Novo medicamento"}
          </h2>
          <Card>
            <form onSubmit={handleSubmit} noValidate>
              <CardContent>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                    <Input
                      label="Nome do medicamento"
                      placeholder="Ex.: Ritalina"
                      icon="ph-duotone ph-pill"
                      value={form.nome}
                      onChange={(e) => updateField("nome", e.target.value)}
                      error={errors.nome}
                      required
                    />
                    <Input
                      label="Dosagem"
                      placeholder="Ex.: 10 mg"
                      icon="ph-duotone ph-scales"
                      value={form.dosagem}
                      onChange={(e) => updateField("dosagem", e.target.value)}
                      error={errors.dosagem}
                      required
                    />
                  </div>

                  <div className="pillar-input-wrapper">
                    <span className="pillar-input__label">Frequência</span>
                    <div role="radiogroup" aria-label="Frequência da medicação" style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                      {(["diaria", "semanal", "mensal"] as Frequency[]).map((f) => {
                        const checked = form.frequencia === f;
                        return (
                          <label key={f} style={radioLabelStyle(checked)}>
                            <input
                              type="radio"
                              name="frequencia"
                              value={f}
                              checked={checked}
                              onChange={() => updateField("frequencia", f)}
                              style={{ position: "absolute", opacity: 0 }}
                            />
                            {FREQUENCY_LABELS[f]}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pillar-input-wrapper">
                    <span className="pillar-input__label">
                      Horários de administração
                      {errors.horarios && (
                        <span style={{ color: "var(--error)", fontSize: "var(--text-xs)", marginLeft: "var(--space-2)" }}>
                          {errors.horarios}
                        </span>
                      )}
                    </span>
                    <div
                      role="group"
                      aria-label="Horários de administração"
                      style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}
                    >
                      {TIME_OPTIONS.map(({ value, label, icon }) => {
                        const checked = form.horarios.includes(value);
                        return (
                          <label key={value} style={checkLabelStyle(checked, !!errors.horarios)}>
                            <input
                              type="checkbox"
                              value={value}
                              checked={checked}
                              onChange={() => toggleHorario(value)}
                              style={{ position: "absolute", opacity: 0 }}
                            />
                            <i className={icon} aria-hidden="true" />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <Input
                    label="Observações"
                    placeholder="Ex.: Tomar com água, antes das refeições."
                    icon="ph-duotone ph-note"
                    value={form.observacoes}
                    onChange={(e) => updateField("observacoes", e.target.value)}
                    helperText="Campo opcional."
                  />
                </div>
              </CardContent>

              <CardFooter align="right">
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowForm(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    loading={submitting}
                    leftIcon={submitting ? undefined : "ph-duotone ph-check"}
                  >
                    {submitting ? "Salvando…" : editingId ? "Salvar alterações" : "Adicionar"}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Remover medicamento"
        description={
          deleteTarget
            ? `Tem certeza que deseja remover ${deleteTarget.nome} ${deleteTarget.dosagem} da lista de medicamentos?`
            : ""
        }
        confirmLabel="Remover"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

function MedicationCard({
  medication,
  onEdit,
  onDelete,
}: {
  medication: Medication;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardContent>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-4)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
              <i className="ph-duotone ph-pill" style={{ fontSize: "1.25rem", color: "var(--primary)", flexShrink: 0 }} aria-hidden="true" />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-base)",
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {medication.nome}
              </span>
              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: "999px",
                  background: "var(--primary-soft)",
                  color: "var(--primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                }}
              >
                {medication.dosagem}
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginLeft: "calc(1.25rem + var(--space-3))" }}>
              <MetaItem icon="ph-duotone ph-clock-clockwise" label={FREQUENCY_LABELS[medication.frequencia]} />
              <MetaItem
                icon="ph-duotone ph-sun"
                label={medication.horarios
                  .map((h) => TIME_OPTIONS.find((t) => t.value === h)?.label ?? h)
                  .join(", ")}
              />
              {medication.observacoes && (
                <MetaItem icon="ph-duotone ph-note" label={medication.observacoes} />
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Editar ${medication.nome}`}
              style={iconBtnStyle}
            >
              <i className="ph-duotone ph-pencil-simple" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Remover ${medication.nome}`}
              style={{ ...iconBtnStyle, color: "var(--error)" }}
            >
              <i className="ph-duotone ph-trash" aria-hidden="true" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaItem({ icon, label }: { icon: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        color: "var(--ink-3)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
      }}
    >
      <i className={icon} aria-hidden="true" />
      {label}
    </span>
  );
}

const backBtnStyle: React.CSSProperties = {
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
};

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  borderRadius: "var(--radius)",
  border: "1.5px solid var(--border)",
  background: "transparent",
  color: "var(--ink-3)",
  cursor: "pointer",
  fontSize: "1rem",
  transition: "all 0.15s ease-out",
};

function radioLabelStyle(checked: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "10px 16px",
    borderRadius: "var(--radius)",
    border: `1.5px solid ${checked ? "var(--primary)" : "var(--border)"}`,
    background: checked ? "var(--primary-soft)" : "var(--surface)",
    color: checked ? "var(--primary)" : "var(--ink)",
    fontFamily: "var(--font-sans)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease-out",
  };
}

function checkLabelStyle(checked: boolean, hasError: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "10px 16px",
    borderRadius: "var(--radius)",
    border: `1.5px solid ${hasError && !checked ? "var(--error)" : checked ? "var(--primary)" : "var(--border)"}`,
    background: checked ? "var(--primary-soft)" : "var(--surface)",
    color: checked ? "var(--primary)" : "var(--ink)",
    fontFamily: "var(--font-sans)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease-out",
  };
}
