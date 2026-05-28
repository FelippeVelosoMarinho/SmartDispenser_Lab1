import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { listDispensers, getDispenserDetails, DispenserDetails } from "../lib/api";
import { TelemetryGrid } from "../components/dashboard/TelemetryGrid";
import { CompartmentsSection } from "../components/dashboard/CompartmentsSection";
import { SchedulesPanel } from "../components/dashboard/SchedulesPanel";

export function DashboardPage() {
  const [dispensers, setDispensers] = useState<any[]>([]);
  const [activeDispenser, setActiveDispenser] = useState<DispenserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleRefreshToken, setScheduleRefreshToken] = useState(0);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const dispList = await listDispensers();
      setDispensers(dispList);
      if (dispList.length > 0) {
        // Fetch details for the first dispenser
        const details = await getDispenserDetails(dispList[0].id);
        setActiveDispenser(details);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSchedulesChange = () => {
    setScheduleRefreshToken((value) => value + 1);
  };

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--ink-3)" }}>Carregando painel...</p>
      </div>
    );
  }

  // Estado A: Sem Pareamento (Empty State)
  if (dispensers.length === 0 || !activeDispenser) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8)",
          background: "radial-gradient(circle at center, rgba(16, 185, 129, 0.05) 0%, var(--canvas) 70%)",
          minHeight: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid pattern background */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: "linear-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
          zIndex: 0,
        }} />

        <div style={{
          position: "relative",
          zIndex: 1,
          background: "rgba(255, 255, 255, 0.6)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.4)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-10)",
          textAlign: "center",
          maxWidth: "480px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.05)",
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            background: "linear-gradient(135deg, var(--primary), var(--primary-soft))",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto var(--space-6)",
            animation: "pulseIcon 3s infinite",
            boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
          }}>
            <i className="ph-duotone ph-plugs-crossed" style={{ fontSize: "2.5rem", color: "var(--primary-on)" }} />
          </div>

          <h2 style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-2xl)",
            fontWeight: 700,
            color: "var(--ink)",
            marginBottom: "var(--space-3)",
          }}>
            Seu Smart Dispenser não está pareado
          </h2>
          
          <p style={{
            fontSize: "var(--text-base)",
            color: "var(--ink-2)",
            marginBottom: "var(--space-8)",
            lineHeight: 1.6,
          }}>
            Para monitorar medicamentos, controlar gavetas e receber telemetrias em tempo real, conecte o seu primeiro dispositivo físico.
          </p>

          <button
            onClick={() => navigate({ to: "/dispensers" })}
            style={{
              background: "var(--primary)",
              color: "var(--primary-on)",
              border: "none",
              borderRadius: "var(--radius-lg)",
              padding: "16px 32px",
              fontSize: "var(--text-base)",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(16, 185, 129, 0.2)",
              transition: "transform 0.2s, boxShadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 15px rgba(16, 185, 129, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 4px 6px rgba(16, 185, 129, 0.2)";
            }}
          >
            Parear Novo Dispensador
          </button>
        </div>

        <style>{`
          @keyframes pulseIcon {
            0% { transform: scale(1); box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3); }
            50% { transform: scale(1.05); box-shadow: 0 15px 35px rgba(16, 185, 129, 0.5); }
            100% { transform: scale(1); box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3); }
          }
        `}</style>
      </div>
    );
  }

  // Estado B: Painel IoT Ativo
  return (
    <div
      style={{
        flex: 1,
        padding: "var(--space-8) var(--space-7)",
        maxWidth: "1000px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div style={{ marginBottom: "var(--space-6)" }}>
        <p
          className="eyebrow"
          style={{ marginBottom: "var(--space-1)", color: "var(--ink-3)" }}
        >
          Smart-Dispenser
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
            Painel Principal
          </h1>
          {dispensers.length > 1 && (
            <select
              onChange={(e) => {
                const disp = dispensers.find(d => d.id === e.target.value);
                if (disp) getDispenserDetails(disp.id).then(setActiveDispenser);
              }}
              value={activeDispenser.id}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              {dispensers.map(d => (
                <option key={d.id} value={d.id}>Dispensador: {d.hardware_id}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <TelemetryGrid dispenser={activeDispenser} />
      <CompartmentsSection
        dispenser={activeDispenser}
        onSchedulesChange={handleSchedulesChange}
        onDispenserChange={fetchDashboardData}
      />
      <SchedulesPanel dispenser={activeDispenser} refreshToken={scheduleRefreshToken} />

    </div>
  );
}
