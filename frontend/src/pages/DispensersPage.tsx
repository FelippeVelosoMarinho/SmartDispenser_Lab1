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

type DispenserStatus = "conectado" | "desconectado";

interface Dispenser {
  id: string;
  serial: string;
  localizacao: string;
  status: DispenserStatus;
  pacienteId: string | null;
  pacienteNome: string | null;
  ultimoContato: string;
}

const MOCK_DISPENSERS: Dispenser[] = [
  {
    id: "1",
    serial: "ESP-C3-001",
    localizacao: "Quarto 101",
    status: "conectado",
    pacienteId: "3",
    pacienteNome: "Carla Mendes",
    ultimoContato: "há 2 min",
  },
  {
    id: "2",
    serial: "ESP-C3-002",
    localizacao: "Quarto 205",
    status: "conectado",
    pacienteId: "1",
    pacienteNome: "Ana Souza",
    ultimoContato: "há 5 min",
  },
  {
    id: "3",
    serial: "ESP-C3-003",
    localizacao: "Sala de Estar",
    status: "desconectado",
    pacienteId: "4",
    pacienteNome: "Diego Ferreira",
    ultimoContato: "há 3 h",
  },
  {
    id: "4",
    serial: "ESP-C3-004",
    localizacao: "Quarto 312",
    status: "conectado",
    pacienteId: "8",
    pacienteNome: "Henrique Pinto",
    ultimoContato: "há 1 min",
  },
  {
    id: "5",
    serial: "ESP-C3-005",
    localizacao: "Enfermaria A",
    status: "conectado",
    pacienteId: "5",
    pacienteNome: "Eduarda Costa",
    ultimoContato: "há 8 min",
  },
  {
    id: "6",
    serial: "ESP-C3-006",
    localizacao: "Quarto 408",
    status: "desconectado",
    pacienteId: null,
    pacienteNome: null,
    ultimoContato: "há 1 dia",
  },
  {
    id: "7",
    serial: "ESP-C3-007",
    localizacao: "Enfermaria B",
    status: "conectado",
    pacienteId: "12",
    pacienteNome: "Lucas Carvalho",
    ultimoContato: "há 4 min",
  },
  {
    id: "8",
    serial: "ESP-C3-008",
    localizacao: "Quarto 502",
    status: "conectado",
    pacienteId: "9",
    pacienteNome: "Isabela Martins",
    ultimoContato: "há 12 min",
  },
  {
    id: "9",
    serial: "ESP-C3-009",
    localizacao: "Recepção",
    status: "desconectado",
    pacienteId: null,
    pacienteNome: null,
    ultimoContato: "há 2 dias",
  },
  {
    id: "10",
    serial: "ESP-C3-010",
    localizacao: "Quarto 110",
    status: "conectado",
    pacienteId: "2",
    pacienteNome: "Bruno Lima",
    ultimoContato: "há 7 min",
  },
];

const PAGE_SIZE = 8;

function StatusBadge({ status }: { status: DispenserStatus }) {
  const isConectado = status === "conectado";
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
        background: isConectado ? "var(--success-soft)" : "var(--surface-dim)",
        color: isConectado ? "var(--success-ink)" : "var(--ink-3)",
      }}
      aria-label={isConectado ? "Conectado" : "Desconectado"}
    >
      <i
        className={`ph-duotone ${isConectado ? "ph-wifi-high" : "ph-wifi-slash"}`}
        aria-hidden="true"
        style={{ fontSize: "1rem" }}
      />
      {isConectado ? "Conectado" : "Desconectado"}
    </span>
  );
}

function PacienteCell({
  pacienteId,
  pacienteNome,
}: {
  pacienteId: string | null;
  pacienteNome: string | null;
}) {
  if (!pacienteNome) {
    return (
      <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
        Não vinculado
      </span>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span style={{ fontWeight: 600, color: "var(--ink)" }}>
        {pacienteNome}
      </span>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>
        ID #{pacienteId}
      </span>
    </div>
  );
}

export function DispensersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dispensers, setDispensers] = useState<Dispenser[]>(MOCK_DISPENSERS);
  const [dispenserToDelete, setDispenserToDelete] = useState<Dispenser | null>(
    null,
  );

  function handleDeleteConfirm() {
    if (!dispenserToDelete) return;
    setDispensers((prev) => prev.filter((d) => d.id !== dispenserToDelete.id));
    setDispenserToDelete(null);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dispensers;
    return dispensers.filter(
      (d) =>
        d.serial.toLowerCase().includes(q) ||
        d.localizacao.toLowerCase().includes(q) ||
        (d.pacienteNome?.toLowerCase().includes(q) ?? false),
    );
  }, [search, dispensers]);

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
            Dispensadores
          </h1>
        </div>
        <Button
          leftIcon="ph-duotone ph-plus"
          onClick={() => navigate({ to: "/dispensers/pair" })}
        >
          Parear dispensador
        </Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "var(--space-5)", maxWidth: "360px" }}>
        <Input
          placeholder="Buscar por serial, local ou paciente"
          icon="ph-duotone ph-magnifying-glass"
          value={search}
          onChange={handleSearch}
          aria-label="Buscar dispensadores"
        />
      </div>

      {/* Table card */}
      <Card>
        <CardContent style={{ padding: 0 }}>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Serial</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Paciente vinculado</TableHead>
                <TableHead>Último contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="right">Ações</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
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
                        className="ph-duotone ph-device-mobile-speaker"
                        style={{ fontSize: "2.5rem" }}
                        aria-hidden="true"
                      />
                      <span>Nenhum dispensador encontrado.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((dispenser) => (
                  <TableRow key={dispenser.id}>
                    <TableCell>
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {dispenser.serial}
                      </span>
                    </TableCell>
                    <TableCell>{dispenser.localizacao}</TableCell>
                    <TableCell>
                      <PacienteCell
                        pacienteId={dispenser.pacienteId}
                        pacienteNome={dispenser.pacienteNome}
                      />
                    </TableCell>
                    <TableCell style={{ color: "var(--ink-3)" }}>
                      {dispenser.ultimoContato}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={dispenser.status} />
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
                          aria-label={`Editar ${dispenser.serial}`}
                        />
                        <Button
                          variant="ghost"
                          size="small"
                          leftIcon="ph-duotone ph-trash"
                          aria-label={`Remover ${dispenser.serial}`}
                          onClick={() => setDispenserToDelete(dispenser)}
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
          ? "1 dispensador"
          : `${filtered.length} dispensadores`}
        {search && " encontrados"}
      </p>

      <ConfirmModal
        open={dispenserToDelete !== null}
        title="Remover dispensador"
        description={
          dispenserToDelete
            ? `Tem certeza que deseja remover "${dispenserToDelete.serial}"? Esta ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDispenserToDelete(null)}
      />
    </div>
  );
}
