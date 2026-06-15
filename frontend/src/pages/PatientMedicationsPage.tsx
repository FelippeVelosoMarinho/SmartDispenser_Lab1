import { useState, useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/ui";
import { APP_NAME } from "../lib/brand";
import "./PatientMedicationsPage.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = "morning" | "afternoon" | "night";

interface DayPeriod {
  day: number;   // 0=Monday … 6=Sunday
  period: Period;
}

interface Medication {
  id: string;
  nome: string;
  dosagem: string;
  horarios: DayPeriod[];
  observacoes: string;
  configured_slots?: number[] | null;
  warning?: string | null;
}

interface FormState {
  nome: string;
  dosagem: string;
  horarios: DayPeriod[];
  observacoes: string;
}

interface FormErrors {
  nome?: string;
  dosagem?: string;
  horarios?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = { nome: "", dosagem: "", horarios: [], observacoes: "" };

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const DAYS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const PERIODS: { key: Period; label: string; icon: string }[] = [
  { key: "morning",   label: "Manhã",  icon: "ph-sun-horizon" },
  { key: "afternoon", label: "Tarde",  icon: "ph-sun" },
  { key: "night",     label: "Noite",  icon: "ph-moon-stars" },
];

const PERIOD_OFFSET: Record<Period, number> = { morning: 0, afternoon: 1, night: 2 };

function dayPeriodToSlot(day: number, period: Period): number {
  return day * 3 + PERIOD_OFFSET[period] + 1;
}

function hasDayPeriod(horarios: DayPeriod[], day: number, period: Period): boolean {
  return horarios.some((h) => h.day === day && h.period === period);
}

function toggleDayPeriod(horarios: DayPeriod[], day: number, period: Period): DayPeriod[] {
  if (hasDayPeriod(horarios, day, period)) {
    return horarios.filter((h) => !(h.day === day && h.period === period));
  }
  return [...horarios, { day, period }];
}

// ── ScheduleGrid ──────────────────────────────────────────────────────────────

function ScheduleGrid({
  value,
  onChange,
  error,
}: {
  value: DayPeriod[];
  onChange: (v: DayPeriod[]) => void;
  error?: string;
}) {
  function toggleAll(period: Period) {
    const allSelected = DAYS.every((_, d) => hasDayPeriod(value, d, period));
    let next = value.filter((h) => h.period !== period);
    if (!allSelected) next = [...next, ...DAYS.map((_, d) => ({ day: d, period }))];
    onChange(next);
  }

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 340 }}>
          <thead>
            <tr>
              <th style={{ width: 72, padding: "var(--space-2) var(--space-3)", textAlign: "left", fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }} />
              {PERIODS.map((p) => (
                <th
                  key={p.key}
                  style={{ padding: "var(--space-2) var(--space-3)", textAlign: "center", fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", userSelect: "none" }}
                  title={`Selecionar/desmarcar toda ${p.label}`}
                  onClick={() => toggleAll(p.key)}
                >
                  <i className={`ph-duotone ${p.icon}`} style={{ marginRight: 4, fontSize: "0.9rem" }} />
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((dayLabel, d) => (
              <tr key={d} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "var(--space-2) var(--space-3)", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--ink-2)", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {dayLabel}
                </td>
                {PERIODS.map((p) => {
                  const checked = hasDayPeriod(value, d, p.key);
                  const slotNum = dayPeriodToSlot(d, p.key);
                  return (
                    <td key={p.key} style={{ padding: "var(--space-2) var(--space-3)", textAlign: "center" }}>
                      <button
                        type="button"
                        title={`Slot ${slotNum} — ${dayLabel} ${p.label}`}
                        onClick={() => onChange(toggleDayPeriod(value, d, p.key))}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "var(--radius-sm)",
                          border: checked ? "2px solid var(--primary)" : "2px solid var(--border)",
                          background: checked ? "var(--primary)" : "var(--surface)",
                          color: checked ? "var(--primary-on, #fff)" : "var(--ink-3)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "var(--text-xs)",
                          fontWeight: 700,
                          transition: "all 0.15s",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {slotNum}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-3)" }}>
        {PERIODS.map((p) => (
          <button
            type="button"
            key={p.key}
            onClick={() => toggleAll(p.key)}
            style={{ fontSize: "var(--text-xs)", padding: "2px 10px", borderRadius: 9999, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink-3)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Toda {p.label === "Manhã" ? "a manhã" : p.label === "Tarde" ? "a tarde" : "a noite"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange([])}
          style={{ fontSize: "var(--text-xs)", padding: "2px 10px", borderRadius: 9999, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink-3)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
        >
          Limpar tudo
        </button>
      </div>

      {error && (
        <p style={{ margin: "var(--space-2) 0 0", color: "var(--error, #dc2626)", fontSize: "var(--text-xs)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── MiniGrid (card display) ───────────────────────────────────────────────────

function MiniGrid({ horarios }: { horarios: DayPeriod[] }) {
  if (!horarios || horarios.length === 0) {
    return (
      <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)", fontStyle: "italic" }}>
        ⚠️ Configuração antiga — edite para atualizar
      </span>
    );
  }

  return (
    <div style={{ display: "flex", gap: 3 }}>
      {DAYS_SHORT.map((dayLabel, d) => (
        <div key={d} style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "var(--ink-3)", fontFamily: "var(--font-sans)", lineHeight: 1 }}>{dayLabel}</span>
          {PERIODS.map((p) => {
            const active = hasDayPeriod(horarios, d, p.key);
            return (
              <div
                key={p.key}
                title={active ? `${dayLabel} ${p.label} (slot ${dayPeriodToSlot(d, p.key)})` : undefined}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: active ? "var(--primary)" : "var(--surface-dim)",
                  border: active ? "none" : "1px solid var(--border)",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── MedicationCard ────────────────────────────────────────────────────────────

function MedicationCard({
  med,
  onEdit,
  onDelete,
}: {
  med: Medication;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const slots = med.horarios?.map((h) => dayPeriodToSlot(h.day, h.period)).sort((a, b) => a - b) ?? [];

  return (
    <Card>
      <CardContent>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ph-duotone ph-pill" aria-hidden="true" style={{ fontSize: "1.5rem", color: "var(--primary)" }} />
          </div>
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--text-base)", color: "var(--ink)", marginBottom: 2 }}>
              {med.nome}
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-3)", marginBottom: "var(--space-3)" }}>
              {med.dosagem}
              {med.observacoes && <span> · {med.observacoes}</span>}
            </div>
            <MiniGrid horarios={med.horarios} />
            {slots.length > 0 && (
              <div style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                Slots: {slots.join(", ")}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
            <Button variant="secondary" size="small" leftIcon="ph-duotone ph-pencil" onClick={onEdit}>
              Editar
            </Button>
            <Button variant="danger" size="small" leftIcon="ph-duotone ph-trash" onClick={onDelete}>
              Remover
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

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
  marginBottom: "var(--space-3)",
};

export function PatientMedicationsPage() {
  const navigate = useNavigate();
  const { patientId } = useParams({ from: "/_authenticated/patients/$patientId/medications" });
  const { accessToken: token } = useAuth();
  const toast = useToast();

  const [patientName, setPatientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<"not_found" | "error" | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [medications, setMedications] = useState<Medication[]>([]);

  const authHeaders = { Authorization: token ? `Bearer ${token}` : "" };

  useEffect(() => {
    async function loadData() {
      try {
        const [patientRes, medsRes] = await Promise.all([
          fetch(`/api/patients/${patientId}`, { headers: authHeaders }),
          fetch(`/api/patients/${patientId}/medications`, { headers: authHeaders }),
        ]);
        if (patientRes.ok) {
          const p = await patientRes.json();
          setPatientName(p.name);
        } else if (patientRes.status === 404) {
          setLoadError("not_found");
          return;
        } else {
          setLoadError("error");
          return;
        }
        if (medsRes.ok) {
          setMedications(await medsRes.json());
        }
      } catch {
        setLoadError("error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [patientId, token, retryCount]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return (
      <div className="med-page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <div className="btn-spinner" style={{ borderColor: "var(--border-subtle)", borderTopColor: "var(--primary)" }} />
        <span style={{ marginLeft: 10, color: "var(--ink-3)" }}>Carregando paciente...</span>
      </div>
    );
  }

  if (loadError) {
    const isNotFound = loadError === "not_found";
    return (
      <div className="med-page-container">
        <button type="button" onClick={() => navigate({ to: "/patients" })} style={backBtnStyle}>
          <i className="ph-duotone ph-arrow-left" aria-hidden="true" />
          Voltar para pacientes
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", color: "var(--ink-3)", paddingTop: "var(--space-10)" }}>
          <i className={`ph-duotone ${isNotFound ? "ph-user-x" : "ph-warning-circle"}`} style={{ fontSize: "3rem" }} aria-hidden="true" />
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-base)", margin: 0 }}>
            {isNotFound ? "Paciente não encontrado." : "Erro ao carregar o paciente."}
          </p>
          {!isNotFound && (
            <Button variant="secondary" leftIcon="ph-duotone ph-arrow-clockwise" onClick={() => { setLoadError(null); setLoading(true); setRetryCount((n) => n + 1); }}>
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
    );
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!form.nome.trim()) next.nome = "Informe o nome do medicamento.";
    if (!form.dosagem.trim()) next.dosagem = "Informe a dosagem.";
    if (form.horarios.length === 0) next.horarios = "Selecione ao menos uma combinação de dia e período.";
    return next;
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(med: Medication) {
    setEditingId(med.id);
    setForm({ nome: med.nome, dosagem: med.dosagem, horarios: med.horarios ?? [], observacoes: med.observacoes });
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
      const payload = { nome: form.nome.trim(), dosagem: form.dosagem.trim(), horarios: form.horarios, observacoes: form.observacoes.trim() };

      const res = await fetch(
        editingId
          ? `/api/patients/${patientId}/medications/${editingId}`
          : `/api/patients/${patientId}/medications`,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const saved: Medication = await res.json();

      if (editingId) {
        setMedications((prev) => prev.map((m) => (m.id === editingId ? saved : m)));
      } else {
        setMedications((prev) => [...prev, saved]);
      }

      setShowForm(false);

      if (saved.warning) {
        toast.warning(saved.warning);
      } else if (saved.configured_slots && saved.configured_slots.length > 0) {
        toast.success(`${saved.nome} configurado nos slots ${saved.configured_slots.join(", ")} — coloque o medicamento nesses compartimentos.`);
      }
    } catch {
      toast.danger("Erro ao salvar medicamento. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/medications/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Erro ao remover");
      setMedications((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success(`${deleteTarget.nome} removido e slots liberados.`);
    } catch {
      toast.danger("Erro ao remover medicamento.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="med-page-container">
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <button type="button" onClick={() => navigate({ to: "/patients/$patientId/edit", params: { patientId } })} style={backBtnStyle}>
          <i className="ph-duotone ph-arrow-left" aria-hidden="true" />
          Voltar para edição do paciente
        </button>
        <p className="eyebrow" style={{ marginBottom: "var(--space-1)", color: "var(--ink-3)" }}>{APP_NAME}</p>
        <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--ink)", lineHeight: "var(--leading-heading)", margin: 0 }}>
          Medicamentos e posologia
        </h1>
        <p style={{ marginTop: "var(--space-2)", color: "var(--ink-3)", fontSize: "var(--text-sm)" }}>
          Gerenciar medicamentos de <strong>{patientName}</strong>.
          {" "}Cada célula do calendário corresponde a um slot físico do dispensador (21 slots = 7 dias × 3 períodos).
        </p>
      </div>

      {/* Form */}
      {showForm && (
        <Card style={{ marginBottom: "var(--space-5)" }}>
          <CardContent>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-lg)", fontWeight: 600, margin: "0 0 var(--space-5)" }}>
              {editingId ? "Editar medicamento" : "Adicionar medicamento"}
            </h2>
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--ink)" }}>
                    Nome do medicamento *
                  </label>
                  <Input
                    placeholder="Ex: Ritalina"
                    value={form.nome}
                    onChange={(e) => { setForm((p) => ({ ...p, nome: e.target.value })); setErrors((p) => ({ ...p, nome: undefined })); }}
                    aria-invalid={!!errors.nome}
                  />
                  {errors.nome && <p style={{ margin: "4px 0 0", color: "var(--error, #dc2626)", fontSize: "var(--text-xs)" }}>{errors.nome}</p>}
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--ink)" }}>
                    Dosagem *
                  </label>
                  <Input
                    placeholder="Ex: 10mg"
                    value={form.dosagem}
                    onChange={(e) => { setForm((p) => ({ ...p, dosagem: e.target.value })); setErrors((p) => ({ ...p, dosagem: undefined })); }}
                    aria-invalid={!!errors.dosagem}
                  />
                  {errors.dosagem && <p style={{ margin: "4px 0 0", color: "var(--error, #dc2626)", fontSize: "var(--text-xs)" }}>{errors.dosagem}</p>}
                </div>
              </div>

              <div style={{ marginBottom: "var(--space-4)" }}>
                <label style={{ display: "block", marginBottom: "var(--space-2)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--ink)" }}>
                  Quando tomar? *
                  <span style={{ fontWeight: 400, color: "var(--ink-3)", marginLeft: "var(--space-2)" }}>
                    Clique nas células para selecionar os dias e períodos. O número mostra o slot físico correspondente.
                  </span>
                </label>
                <ScheduleGrid
                  value={form.horarios}
                  onChange={(v) => { setForm((p) => ({ ...p, horarios: v })); setErrors((p) => ({ ...p, horarios: undefined })); }}
                  error={errors.horarios}
                />
              </div>

              <div style={{ marginBottom: "var(--space-5)" }}>
                <label style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--ink)" }}>
                  Observações
                </label>
                <Input
                  placeholder="Ex: Tomar com água"
                  value={form.observacoes}
                  onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                />
              </div>

              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" loading={submitting} leftIcon={submitting ? undefined : "ph-duotone ph-floppy-disk"}>
                  {submitting ? "Salvando…" : "Salvar medicamento"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {medications.length === 0 && !showForm ? (
        <Card>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", color: "var(--ink-3)", padding: "var(--space-8) var(--space-4)", textAlign: "center" }}>
              <i className="ph-duotone ph-pill" style={{ fontSize: "2.5rem" }} aria-hidden="true" />
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: "var(--ink)" }}>Nenhum medicamento cadastrado</p>
                <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)" }}>
                  Adicione os medicamentos do paciente e escolha em quais dias e períodos devem ser dispensados.
                </p>
              </div>
              <Button leftIcon="ph-duotone ph-plus" onClick={openAdd}>Adicionar medicamento</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {medications.map((med) => (
            <MedicationCard key={med.id} med={med} onEdit={() => openEdit(med)} onDelete={() => setDeleteTarget(med)} />
          ))}
        </div>
      )}

      {!showForm && (
        <div style={{ marginTop: "var(--space-5)" }}>
          <Button leftIcon="ph-duotone ph-plus" onClick={openAdd}>Adicionar medicamento</Button>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Remover medicamento"
        description={`Tem certeza que deseja remover ${deleteTarget?.nome}? Os slots e horários configurados no dispensador também serão liberados.`}
        confirmLabel="Remover"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
