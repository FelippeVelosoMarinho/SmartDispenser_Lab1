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

import {
  ApiError,
  deleteDispenser as deleteDispenserApi,
  forgetDispenserWifi,
  getDispenserDeletionStatus,
  listDispensers,
  resetDispenserConfiguration,
  type Dispenser as ApiDispenser,
  type DispenserDeletionStatus,
} from "../lib/api";
import { DispenserWifiResetPanel } from "../components/dispensers/DispenserWifiResetPanel";
import { APP_NAME } from "../lib/brand";
import "../App.css";

type DispenserStatus = "conectado" | "desconectado";

interface Dispenser {
  id: string;
  serial: string;
  status: DispenserStatus;
  pacienteId: string | null;
  pacienteNome: string | null;
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
  const [apiDispensers, setApiDispensers] = useState<ApiDispenser[]>([]);
  const dispensers = useMemo(() => apiDispensers.map(toDispenserRow), [apiDispensers]);
  const [dispenserToDelete, setDispenserToDelete] = useState<Dispenser | null>(
    null,
  );
  const [deleteWifiFailed, setDeleteWifiFailed] = useState(false);
  const [deletionStatus, setDeletionStatus] =
    useState<DispenserDeletionStatus | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDispensers(quiet = false) {
      if (!quiet) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await listDispensers();
        if (!mounted) return;
        setApiDispensers(data);
      } catch (err) {
        if (!mounted) return;
        if (!quiet) {
          setError(err instanceof Error ? err.message : "Falha ao carregar dispensadores");
        }
      } finally {
        if (mounted && !quiet) {
          setLoading(false);
        }
      }
    }

    void loadDispensers();

    // Poll quiet updates in the background every 5 seconds
    const interval = setInterval(() => {
      void loadDispensers(true);
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!dispenserToDelete) {
      setDeletionStatus(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const status = await getDispenserDeletionStatus(dispenserToDelete.serial);
        if (!cancelled) setDeletionStatus(status);
      } catch {
        if (!cancelled) setDeletionStatus(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispenserToDelete]);

  async function handlePrepareRemoval() {
    if (!dispenserToDelete) return;
    setDeleteBusy(true);
    setError(null);
    try {
      await resetDispenserConfiguration(dispenserToDelete.serial);
      const status = await getDispenserDeletionStatus(dispenserToDelete.serial);
      setDeletionStatus(status);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Falha ao preparar dispensador para remoção",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  async function performDeleteFromServer() {
    if (!dispenserToDelete) return;
    await deleteDispenserApi(dispenserToDelete.serial);
    setApiDispensers((prev) => prev.filter((d) => d.id !== dispenserToDelete.id));
    setDispenserToDelete(null);
    setDeletionStatus(null);
    setDeleteWifiFailed(false);
  }

  async function handleDeleteConfirm() {
    if (!dispenserToDelete) return;
    setDeleteBusy(true);
    setError(null);
    try {
      if (deleteWifiFailed) {
        await performDeleteFromServer();
        return;
      }

      try {
        await forgetDispenserWifi(dispenserToDelete.serial);
      } catch {
        setDeleteWifiFailed(true);
        return;
      }

      await performDeleteFromServer();
    } catch (err) {
      if (err instanceof ApiError && err.code === "DISPENSER_HAS_CONFIGURATION") {
        setDeletionStatus({
          can_delete: false,
          blockers: {
            medications_in_slots: err.blockers?.medications_in_slots ?? 0,
            schedules: err.blockers?.schedules ?? 0,
          },
          message: err.message,
          steps: err.steps,
        });
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Falha ao remover dispensador",
        );
      }
    } finally {
      setDeleteBusy(false);
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

  function handleWifiResetComplete(hardwareId: string) {
    setApiDispensers((prev) =>
      prev.map((d) =>
        d.hardware_id === hardwareId
          ? { ...d, is_online: false, ip_address: null }
          : d,
      ),
    );
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

      <DispenserWifiResetPanel
        dispensers={apiDispensers}
        onResetComplete={handleWifiResetComplete}
      />

      {/* Table card */}
      <Card>
        <CardContent style={{ padding: 0 }}>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Serial</TableHead>
                <TableHead>Paciente vinculado</TableHead>
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
                          onClick={() => {
                            setDeleteWifiFailed(false);
                            setDispenserToDelete(dispenser);
                          }}
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
        title={deleteWifiFailed ? "Dispensador não respondeu" : "Remover dispensador"}
        description={
          dispenserToDelete
            ? deleteWifiFailed
              ? `Não foi possível apagar o Wi-Fi em "${dispenserToDelete.serial}" (desligado ou fora da rede). Você pode remover só do sistema e configurar o aparelho depois em modo Bluetooth.`
              : deletionStatus?.can_delete === false
                ? deletionStatus.message
                : `Tem certeza que deseja remover "${dispenserToDelete.serial}"? O Wi-Fi será apagado no aparelho (se estiver na rede) e o registro será removido. Esta ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel={deleteWifiFailed ? "Remover só do sistema" : "Remover"}
        cancelLabel="Cancelar"
        loading={deleteBusy}
        confirmDisabled={deletionStatus?.can_delete === false && !deleteWifiFailed}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => {
          setDispenserToDelete(null);
          setDeletionStatus(null);
          setDeleteWifiFailed(false);
        }}
      >
        {deleteWifiFailed && (
          <div style={{ marginTop: "var(--space-4)", textAlign: "left" }}>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-2)" }}>
              Para parear de novo
            </p>
            <ol
              style={{
                margin: 0,
                paddingLeft: "var(--space-5)",
                fontSize: "var(--text-sm)",
                color: "var(--ink-2)",
                lineHeight: 1.5,
              }}
            >
              <li style={{ marginBottom: "var(--space-2)" }}>
                Ligue o dispensador na mesma rede e execute:{" "}
                <code style={{ fontSize: "var(--text-xs)" }}>curl -X POST http://&lt;IP&gt;/reset-wifi</code>
              </li>
              <li style={{ marginBottom: "var(--space-2)" }}>
                Ou segure os botões de volume + e - juntos por 5 segundos até reiniciar.
              </li>
              <li>Depois use Parear dispensador com Bluetooth no menu.</li>
            </ol>
          </div>
        )}
        {deletionStatus && !deletionStatus.can_delete && !deleteWifiFailed && (
          <div style={{ marginTop: "var(--space-4)", textAlign: "left" }}>
            <p
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--ink)",
                marginBottom: "var(--space-2)",
              }}
            >
              O que fazer antes de remover
            </p>
            <ol
              style={{
                margin: "0 0 var(--space-4)",
                paddingLeft: "var(--space-5)",
                fontSize: "var(--text-sm)",
                color: "var(--ink-2)",
                lineHeight: 1.5,
              }}
            >
              {deletionStatus.steps.map((step) => (
                <li key={step} style={{ marginBottom: "var(--space-2)" }}>
                  {step}
                </li>
              ))}
            </ol>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate({ to: "/dashboard" })}
                disabled={deleteBusy}
              >
                Abrir painel do dispensador
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handlePrepareRemoval()}
                loading={deleteBusy}
                leftIcon="ph-duotone ph-broom"
              >
                Preparar para remoção
              </Button>
            </div>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
