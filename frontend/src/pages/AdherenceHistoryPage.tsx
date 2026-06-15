import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardFooter } from "../components/ui/Card";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "../components/ui/Table";
import { Pagination } from "../components/ui/Pagination";
import {
  listDispensationLogs,
  listPatients,
  type DispensationLog,
  type Patient,
} from "../lib/api";
import { APP_NAME } from "../lib/brand";

const PAGE_SIZE = 10;

type AdherenceStatus = "tomou" | "nao_tomou" | "erro";

function resolveStatus(log: DispensationLog): AdherenceStatus {
  if (log.success) return "tomou";
  if (log.status === "missed") return "nao_tomou";
  return "erro";
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} às ${time}`;
}

function AdherenceBadge({ status }: { status: AdherenceStatus }) {
  const config = {
    tomou: {
      bg: "var(--success-soft)",
      color: "var(--success-ink)",
      icon: "ph-check-circle",
      label: "Tomou",
    },
    nao_tomou: {
      bg: "var(--danger-soft, rgba(220,38,38,0.08))",
      color: "var(--danger-ink, #991b1b)",
      icon: "ph-x-circle",
      label: "Não tomou",
    },
    erro: {
      bg: "var(--warning-soft, rgba(234,179,8,0.1))",
      color: "var(--warning-ink, #854d0e)",
      icon: "ph-warning-circle",
      label: "Erro",
    },
  }[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.8125rem",
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: "9999px",
        background: config.bg,
        color: config.color,
      }}
    >
      <i
        className={`ph-duotone ${config.icon}`}
        aria-hidden="true"
        style={{ fontSize: "1rem" }}
      />
      {config.label}
    </span>
  );
}

export function AdherenceHistoryPage() {
  const [logs, setLogs] = useState<DispensationLog[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadPatients() {
      try {
        const data = await listPatients();
        if (mounted) setPatients(data);
      } catch {
        // Non-critical: dropdown will be empty
      }
    }
    void loadPatients();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadLogs() {
      setLoading(true);
      setError(null);
      try {
        const data = await listDispensationLogs(selectedPatientId || undefined);
        if (mounted) setLogs(data);
      } catch (err) {
        if (mounted)
          setError(
            err instanceof Error ? err.message : "Falha ao carregar histórico",
          );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadLogs();
    return () => {
      mounted = false;
    };
  }, [selectedPatientId]);

  function handlePatientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedPatientId(e.target.value);
    setCurrentPage(1);
  }

  const patientMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of patients) m[p.id] = p.name;
    return m;
  }, [patients]);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageItems = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div
      style={{
        flex: 1,
        padding: "var(--space-8) var(--space-7)",
        maxWidth: "1080px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
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
          Histórico de Adesão
        </h1>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: "var(--space-5)", maxWidth: "320px" }}>
        <label
          htmlFor="patient-filter"
          style={{
            display: "block",
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--ink-2)",
            marginBottom: "var(--space-2)",
          }}
        >
          Filtrar por paciente
        </label>
        <select
          id="patient-filter"
          value={selectedPatientId}
          onChange={handlePatientChange}
          style={{
            width: "100%",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius)",
            border: "1.5px solid var(--border)",
            background: "var(--surface)",
            color: "var(--ink)",
            fontSize: "0.9375rem",
            cursor: "pointer",
          }}
        >
          <option value="">Todos os pacientes</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "var(--space-5)",
            padding: "var(--space-4)",
            borderRadius: "var(--radius)",
            background: "var(--danger-soft, rgba(220,38,38,0.08))",
            color: "var(--danger-ink, #991b1b)",
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Table card */}
      <Card>
        <CardContent style={{ padding: 0 }}>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Medicamento</TableHead>
                <TableHead>Dispensador</TableHead>
                <TableHead>Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    style={{ textAlign: "center", padding: "var(--space-10)" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        color: "var(--ink-3)",
                      }}
                    >
                      <i
                        className="ph-duotone ph-spinner"
                        style={{ fontSize: "2rem" }}
                        aria-hidden="true"
                      />
                      <span>Carregando histórico…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : pageItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "var(--space-10)",
                      color: "var(--ink-3)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "var(--space-3)",
                      }}
                    >
                      <i
                        className="ph-duotone ph-calendar-blank"
                        style={{ fontSize: "2.5rem" }}
                        aria-hidden="true"
                      />
                      <span>Nenhum registro encontrado</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((log) => {
                  const status = resolveStatus(log);
                  const patientName =
                    patientMap[log.patient_id] || log.patient_id || "—";
                  const medicationLabel = log.medication_name || "—";
                  const dispenserLabel = log.dispenser_id
                    ? log.dispenser_id.slice(0, 8) + "…"
                    : "—";

                  return (
                    <TableRow key={log.id}>
                      <TableCell style={{ whiteSpace: "nowrap" }}>
                        {log.timestamp ? formatTimestamp(log.timestamp) : "—"}
                      </TableCell>
                      <TableCell>{patientName}</TableCell>
                      <TableCell>{medicationLabel}</TableCell>
                      <TableCell>
                        <span
                          style={{
                            fontFamily: "var(--font-mono, monospace)",
                            fontSize: "0.8125rem",
                            color: "var(--ink-2)",
                          }}
                        >
                          {dispenserLabel}
                        </span>
                      </TableCell>
                      <TableCell>
                        <AdherenceBadge status={status} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        {!loading && logs.length > 0 && (
          <CardFooter align="center">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </CardFooter>
        )}
      </Card>

      {!loading && logs.length > 0 && (
        <p
          style={{
            marginTop: "var(--space-3)",
            fontSize: "0.8125rem",
            color: "var(--ink-3)",
            textAlign: "center",
          }}
        >
          {logs.length} registro{logs.length !== 1 ? "s" : ""} no total
        </p>
      )}
    </div>
  );
}
