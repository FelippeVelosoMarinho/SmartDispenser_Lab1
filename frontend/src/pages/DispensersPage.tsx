import { useEffect, useMemo, useState } from "react";
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
import { ConnectionBadge } from "../components/ConnectionBadge";
import { StatusIndicator } from "../components/StatusIndicator";
import { useLed } from "../hooks/useLed";
import {
  deleteDispenser as deleteDispenserApi,
  listDispensers,
  type Dispenser as ApiDispenser,
} from "../lib/api";
import "../App.css";

type DispenserStatus = "conectado" | "desconectado";

interface Dispenser {
  id: string;
  serial: string;
  status: DispenserStatus;
  pacienteId: string | null;
  pacienteNome: string | null;
  batteryLevel: number;
  criticalStock: boolean;
  ultimoContato: string;
}

const PAGE_SIZE = 8;

function formatLastSync(lastSync: string | null) {
  if (!lastSync) return "Sem sincronização";

  const date = new Date(lastSync);
  if (Number.isNaN(date.getTime())) return lastSync;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "há poucos segundos";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays} dia${diffDays !== 1 ? "s" : ""}`;
}

function toDispenserRow(dispenser: ApiDispenser): Dispenser {
  return {
    id: dispenser.id,
    serial: dispenser.hardware_id,
    status: dispenser.is_online ? "conectado" : "desconectado",
    pacienteId: dispenser.patient_id,
    pacienteNome: dispenser.patient_name,
    batteryLevel: dispenser.battery_level,
    criticalStock: dispenser.critical_stock,
    ultimoContato: formatLastSync(dispenser.last_sync),
  };
}

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
  criticalStock,
}: {
  pacienteId: string | null;
  pacienteNome: string | null;
  criticalStock: boolean;
}) {
  if (!pacienteNome) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
          Não vinculado
        </span>
        {criticalStock && (
          <span style={{ fontSize: "var(--text-xs)", color: "#b42318", fontWeight: 600 }}>
            Estoque crítico
          </span>
        )}
      </div>
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
  const [dispensers, setDispensers] = useState<Dispenser[]>([]);
  const [dispenserToDelete, setDispenserToDelete] = useState<Dispenser | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    isOn,
    isLoading,
    isToggling,
    hardwareReachable,
    backendReachable,
    latencyMs,
    error: ledError,
    toggle,
  } = useLed();

  useEffect(() => {
    let mounted = true;

    async function loadDispensers() {
      setLoading(true);
      setError(null);
      try {
        const data = await listDispensers();
        if (!mounted) return;
        setDispensers(data.map(toDispenserRow));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar dispensadores");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadDispensers();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleDeleteConfirm() {
    if (!dispenserToDelete) return;
    try {
      await deleteDispenserApi(dispenserToDelete.serial);
      setDispensers((prev) => prev.filter((d) => d.id !== dispenserToDelete.id));
      setDispenserToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover dispensador");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dispensers;
    return dispensers.filter(
      (d) =>
        d.serial.toLowerCase().includes(q) ||
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

      <div className="bg-gradient" />
      <div className="bg-grid" />

      <ConnectionBadge
        backendReachable={backendReachable}
        hardwareReachable={hardwareReachable}
      />

      <div className="card" style={{ marginBottom: "var(--space-5)" }}>
        <StatusIndicator isOn={isOn} isLoading={isLoading} />

        <p className="status-label">
          {isLoading ? "Carregando..." : isOn ? "LED Ligado" : "LED Desligado"}
        </p>

        {latencyMs !== null && (
          <div className="latency">
            <span className="latency-icon">&#9889;</span>
            <span>{latencyMs.toFixed(1)} ms</span>
          </div>
        )}

        <div className="controls">
          <button
            className={`btn btn-on ${isOn ? "active" : ""}`}
            onClick={() => toggle("on")}
            disabled={isToggling || isLoading || !hardwareReachable}
          >
            {isToggling && !isOn ? <span className="btn-spinner" /> : "Ligar"}
          </button>
          <button
            className={`btn btn-off ${!isOn && !isLoading ? "active" : ""}`}
            onClick={() => toggle("off")}
            disabled={isToggling || isLoading || !hardwareReachable}
          >
            {isToggling && isOn ? <span className="btn-spinner" /> : "Desligar"}
          </button>
        </div>

        {ledError && (
          <div className="error-banner">
            <i className="ph-duotone ph-warning-octagon" aria-hidden="true" />
            <span>{ledError}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ marginBottom: "var(--space-5)", maxWidth: "360px" }}>
        <Input
          placeholder="Buscar por serial ou paciente"
          icon="ph-duotone ph-magnifying-glass"
          value={search}
          onChange={handleSearch}
          aria-label="Buscar dispensadores"
        />
      </div>

      {error && (
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
          {error}
        </div>
      )}

      {/* Table card */}
      <Card>
        <CardContent style={{ padding: 0 }}>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Serial</TableHead>
                <TableHead>Paciente vinculado</TableHead>
                <TableHead>Bateria</TableHead>
                <TableHead>Último contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="right">Ações</TableHead>
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
                      <i className="ph-duotone ph-spinner" aria-hidden="true" />
                      <span>Carregando dispensadores…</span>
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
                    <TableCell>
                      <PacienteCell
                        pacienteId={dispenser.pacienteId}
                        pacienteNome={dispenser.pacienteNome}
                        criticalStock={dispenser.criticalStock}
                      />
                    </TableCell>
                    <TableCell>{dispenser.batteryLevel.toFixed(1)}%</TableCell>
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
                          onClick={() => navigate({ to: "/dispensers/pair" })}
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
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDispenserToDelete(null)}
      />
    </div>
  );
}
