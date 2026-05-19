import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
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
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { useAuth } from "../auth/AuthContext";

type PatientStatus = "ativo" | "inativo";

interface Patient {
  id: string;
  nome: string;
  idade: number;
  medicacao: string;
  status: PatientStatus;
}

const PAGE_SIZE = 8;

function StatusBadge({ status }: { status: PatientStatus }) {
  const isAtivo = status === "ativo";
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
        background: isAtivo ? "var(--success-soft)" : "var(--surface-dim)",
        color: isAtivo ? "var(--success-ink)" : "var(--ink-3)",
      }}
      aria-label={isAtivo ? "Ativo" : "Inativo"}
    >
      <i
        className={`ph-duotone ${isAtivo ? "ph-check-circle" : "ph-minus-circle"}`}
        aria-hidden="true"
        style={{ fontSize: "1rem" }}
      />
      {isAtivo ? "Ativo" : "Inativo"}
    </span>
  );
}

export function PatientsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await fetch("/api/patients", {
          headers: {
            "Authorization": token ? `Bearer ${token}` : "",
          },
        });
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((p: any) => ({
            id: p.id,
            nome: p.name,
            idade: p.age || 0,
            medicacao: p.condition || "",
            status: "ativo" as PatientStatus,
          }));
          setPatients(mapped);
        }
      } catch (err) {
        console.error("Erro ao carregar pacientes:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, [token]);

  async function handleDeleteConfirm() {
    if (!patientToDelete) return;
    try {
      const res = await fetch(`/api/patients/${patientToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
        },
      });
      if (res.ok) {
        setPatients((prev) => prev.filter((p) => p.id !== patientToDelete.id));
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail ?? "Erro ao deletar paciente do servidor.");
      }
    } catch (err: any) {
      alert(err.message || "Erro de conexão ao deletar o paciente.");
    } finally {
      setPatientToDelete(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.medicacao.toLowerCase().includes(q),
    );
  }, [search, patients]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setCurrentPage(1);
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "var(--space-8) var(--space-7)",
        maxWidth: "960px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-6)",
          gap: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        <div>
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
            Pacientes
          </h1>
        </div>
        <Button
          leftIcon="ph-duotone ph-plus"
          onClick={() => navigate({ to: "/patients/new" })}
        >
          Novo paciente
        </Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "var(--space-5)", maxWidth: "360px" }}>
        <Input
          placeholder="Buscar por nome ou medicação"
          icon="ph-duotone ph-magnifying-glass"
          value={search}
          onChange={handleSearch}
          aria-label="Buscar pacientes"
        />
      </div>

      {/* Table card */}
      <Card>
        <CardContent style={{ padding: 0 }}>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Nome</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Medicacao ativa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="right">Acoes</TableHead>
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
                      <div className="btn-spinner" style={{ borderColor: "var(--border-subtle)", borderTopColor: "var(--primary)" }} />
                      <span>Carregando pacientes...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : pageItems.length === 0 ? (
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
                        className="ph-duotone ph-users"
                        style={{ fontSize: "2.5rem" }}
                        aria-hidden="true"
                      />
                      <span>Nenhum paciente encontrado.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {patient.nome}
                      </span>
                    </TableCell>
                    <TableCell>{patient.idade} anos</TableCell>
                    <TableCell>{patient.medicacao}</TableCell>
                    <TableCell>
                      <StatusBadge status={patient.status} />
                    </TableCell>
                    <TableCell align="right">
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "var(--space-1)",
                        }}
                      >
                        <Button
                          variant="ghost"
                          size="small"
                          leftIcon="ph-duotone ph-pencil-simple"
                          aria-label={`Editar ${patient.nome}`}
                          onClick={() =>
                            navigate({ to: "/patients/$patientId/edit", params: { patientId: patient.id } })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="small"
                          leftIcon="ph-duotone ph-trash"
                          aria-label={`Remover ${patient.nome}`}
                          onClick={() => setPatientToDelete(patient)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {totalPages > 1 && (
          <CardFooter align="center">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </CardFooter>
        )}
      </Card>

      {/* Count */}
      <p
        style={{
          marginTop: "var(--space-3)",
          fontSize: "var(--text-sm)",
          color: "var(--ink-3)",
        }}
      >
        {filtered.length === 1
          ? "1 paciente"
          : `${filtered.length} pacientes`}
        {search && " encontrados"}
      </p>

      <ConfirmModal
        open={patientToDelete !== null}
        title="Apagar paciente"
        description={
          patientToDelete
            ? `Tem certeza que deseja apagar "${patientToDelete.nome}"? Esta ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPatientToDelete(null)}
      />
    </div>
  );
}
