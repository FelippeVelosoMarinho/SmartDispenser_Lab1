import { useState, useMemo } from "react";
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

type PatientStatus = "ativo" | "inativo";

interface Patient {
  id: string;
  nome: string;
  idade: number;
  medicacao: string;
  status: PatientStatus;
}

const MOCK_PATIENTS: Patient[] = [
  { id: "1", nome: "Ana Souza", idade: 34, medicacao: "Ritalina 10 mg", status: "ativo" },
  { id: "2", nome: "Bruno Lima", idade: 52, medicacao: "Sertralina 50 mg", status: "ativo" },
  { id: "3", nome: "Carla Mendes", idade: 28, medicacao: "Clonazepam 0,5 mg", status: "ativo" },
  { id: "4", nome: "Diego Ferreira", idade: 41, medicacao: "Melatonina 3 mg", status: "inativo" },
  { id: "5", nome: "Eduarda Costa", idade: 19, medicacao: "Venvanse 30 mg", status: "ativo" },
  { id: "6", nome: "Fábio Rocha", idade: 63, medicacao: "Atenolol 25 mg", status: "ativo" },
  { id: "7", nome: "Gabriela Nunes", idade: 45, medicacao: "Fluoxetina 20 mg", status: "inativo" },
  { id: "8", nome: "Henrique Pinto", idade: 31, medicacao: "Quetiapina 25 mg", status: "ativo" },
  { id: "9", nome: "Isabela Martins", idade: 57, medicacao: "Topiramato 50 mg", status: "ativo" },
  { id: "10", nome: "João Alves", idade: 22, medicacao: "Guanfacina 1 mg", status: "ativo" },
  { id: "11", nome: "Karina Tavares", idade: 38, medicacao: "Bupropiona 150 mg", status: "inativo" },
  { id: "12", nome: "Lucas Carvalho", idade: 47, medicacao: "Risperidona 2 mg", status: "ativo" },
];

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
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  function handleDeleteConfirm() {
    if (!patientToDelete) return;
    setPatients((prev) => prev.filter((p) => p.id !== patientToDelete.id));
    setPatientToDelete(null);
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
              {pageItems.length === 0 ? (
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
