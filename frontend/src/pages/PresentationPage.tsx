import { useState, useEffect } from "react";
import {
  listDispensationLogs,
  getDispenserDetails,
  listDispensers,
  resetCalibrationDemo,
  type Dispenser,
  type DispensationLog,
  type DispenserDetails,
} from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "../components/ui/Table";
import { APP_NAME } from "../lib/brand";
import { CompartmentsSection } from "../components/dashboard/CompartmentsSection";
import { TelemetryGrid } from "../components/dashboard/TelemetryGrid";
import { CalibrationDemoSection } from "../components/dashboard/CalibrationDemoSection";

const HARDWARE_ID = "C0:CD:D6:CE:4A:AC";

function lastSyncMs(dispenser: Dispenser): number {
  if (!dispenser.last_sync) return 0;
  const parsed = new Date(dispenser.last_sync).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function selectPresentationDispenser(dispensers: Dispenser[]): Dispenser | undefined {
  const preferred = dispensers.find((d) => d.hardware_id === HARDWARE_ID);
  if (preferred?.is_online && preferred.ip_address) return preferred;

  const live = dispensers
    .filter((d) => d.is_online && d.ip_address)
    .sort((a, b) => lastSyncMs(b) - lastSyncMs(a))[0];

  return live ?? preferred ?? dispensers[0];
}

function formatTimestamp(ts: string): string {
  const utc = ts.endsWith("Z") || ts.includes("+") ? ts : ts + "Z";
  const d = new Date(utc);
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

function resolveStatus(log: DispensationLog): "tomou" | "nao_tomou" | "erro" {
  if (log.success) return "tomou";
  if (log.status === "missed") return "nao_tomou";
  return "erro";
}

function AdherenceBadge({ status }: { status: "tomou" | "nao_tomou" | "erro" }) {
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

export function PresentationPage() {
  const [dispenser, setDispenser] = useState<DispenserDetails | null>(null);
  const [logs, setLogs] = useState<DispensationLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  async function fetchData() {
    try {
      const all = await listDispensers();
      const target = selectPresentationDispenser(all);
      if (target) {
        const details = await getDispenserDetails(target.id);
        setDispenser(details);
        
        const dispensationLogs = await listDispensationLogs(target.hardware_id);
        setLogs(dispensationLogs.slice(0, 10));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchData();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleReset() {
    if (!dispenser) return;
    if (confirm("Tem certeza que deseja resetar os dados da demonstração? Isso apagará o histórico atual.")) {
      setLoadingData(true);
      try {
        await resetCalibrationDemo(dispenser.hardware_id);
        await fetchData();
      } catch (err) {
        console.error(err);
        alert("Falha ao resetar demo.");
      } finally {
        setLoadingData(false);
      }
    }
  }

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
      <div style={{ marginBottom: "var(--space-6)" }}>
        <p className="eyebrow" style={{ marginBottom: "var(--space-1)", color: "var(--ink-3)" }}>
          {APP_NAME}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-3xl)",
              fontWeight: 700,
              color: "var(--ink)",
              lineHeight: "var(--leading-heading)",
              margin: 0,
            }}
          >
            Apresentação ao Vivo
          </h1>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleReset} style={{
                background: "var(--danger-soft, rgba(220,38,38,0.1))", border: "none",
                borderRadius: "var(--radius-md)", padding: "8px 16px", color: "var(--danger-ink, #b91c1c)", fontSize: "var(--text-sm)",
                cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6
              }}>
              <i className="ph-duotone ph-trash" /> Resetar Demo
            </button>
            <button onClick={fetchData} style={{
                background: "var(--primary-soft)", border: "none",
                borderRadius: "var(--radius-md)", padding: "8px 16px", color: "var(--primary-ink)", fontSize: "var(--text-sm)",
                cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6
              }}>
              <i className="ph-duotone ph-arrows-clockwise" /> Atualizar
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        
        {dispenser && (
          <TelemetryGrid dispenser={dispenser} />
        )}

        {dispenser && (
          <CalibrationDemoSection dispenser={dispenser} />
        )}

        {dispenser && (
          <CompartmentsSection
            dispenser={dispenser}
            onDispenserChange={fetchData}
          />
        )}

        <Card>
          <CardHeader title="Histórico de Dispensações (Tempo Real)" />
          <CardContent style={{ padding: 0 }}>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Status</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {loadingData && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--ink-3)" }}>
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--ink-3)" }}>
                      Nenhuma dispensação registrada ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const status = resolveStatus(log);
                    const patientName = dispenser?.patient_name || log.patient_id || "—";
                    const medName = log.medication_name || "—";

                    return (
                      <TableRow key={log.id}>
                        <TableCell style={{ whiteSpace: "nowrap" }}>{formatTimestamp(log.timestamp)}</TableCell>
                        <TableCell>{patientName}</TableCell>
                        <TableCell>{medName}</TableCell>
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
        </Card>

      </div>
    </div>
  );
}
