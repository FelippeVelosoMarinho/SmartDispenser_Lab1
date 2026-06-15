import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { listDispensers, getDispenserDetails } from "../lib/api";
import type { DispenserDetails } from "../lib/api";
import { TelemetryGrid } from "../components/dashboard/TelemetryGrid";
import { NextDispenseCountdown } from "../components/dashboard/NextDispenseCountdown";
import { CompartmentsSection } from "../components/dashboard/CompartmentsSection";
import {
  PeriodScheduleSection,
  useHardwareStatus,
} from "../components/dashboard/PeriodScheduleSection";
import { APP_NAME } from "../lib/brand";
import { HelpModal } from "../components/dashboard/HelpModal";

export function DashboardPage() {
  const [dispensers, setDispensers] = useState<any[]>([]);
  const [activeDispenser, setActiveDispenser] = useState<DispenserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const dispList = await listDispensers();
      setDispensers(dispList);
      if (dispList.length > 0) {
        // Prefer an online dispenser; fall back to first in list
        const preferred = dispList.find(d => d.is_online) ?? dispList[0];
        const details = await getDispenserDetails(preferred.id);
        setActiveDispenser(details);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Silent refresh: re-fetches dispenser details without triggering the loading screen.
  // Used by the slot modal so it can update quantities without unmounting itself.
  const silentRefresh = async () => {
    try {
      const dispList = await listDispensers();
      setDispensers(dispList);
      if (dispList.length > 0) {
        setActiveDispenser(prev => {
          const target = (prev && dispList.some(d => d.id === prev.id))
            ? prev
            : (dispList.find(d => d.is_online) ?? dispList[0]);
          getDispenserDetails(target.id).then(setActiveDispenser).catch(() => {});
          return prev;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Poll quiet updates in the background every 5 seconds
    const interval = setInterval(() => {
      listDispensers().then(async (dispList) => {
        setDispensers(dispList);
        if (dispList.length > 0) {
          // Keep the currently active dispenser if it's still in the list;
          // otherwise prefer an online one so we don't flip to a stale offline ESP.
          setActiveDispenser(prev => {
            const keepCurrent = prev && dispList.some(d => d.id === prev.id);
            if (keepCurrent) {
              // Refresh details for the same dispenser in the background
              getDispenserDetails(prev.id)
                .then(details => setActiveDispenser(details))
                .catch(() => {});
              return prev;
            }
            const preferred = dispList.find(d => d.is_online) ?? dispList[0];
            getDispenserDetails(preferred.id)
              .then(details => setActiveDispenser(details))
              .catch(() => {});
            return prev;
          });
        }
      }).catch(err => console.error("Telemetry polling error:", err));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const hwStatus = useHardwareStatus(
    activeDispenser?.hardware_id ?? "",
    activeDispenser?.is_online ?? false,
    activeDispenser?.ip_address,
  );

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
            Painel Principal
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              title="Ajuda — como usar o dispensador"
              style={{
                width: 36, height: 36,
                borderRadius: "50%",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--ink-3)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem",
              }}
            >
              <i className="ph-duotone ph-question" />
            </button>
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
      </div>

      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      <NextDispenseCountdown
        hardwareId={activeDispenser.hardware_id}
        isOnline={activeDispenser.is_online}
        awaitingConfirm={hwStatus?.awaiting_confirm ?? false}
      />
      <TelemetryGrid dispenser={activeDispenser} />
      <PeriodScheduleSection dispenser={activeDispenser} />
      <CompartmentsSection
        dispenser={activeDispenser}
        onDispenserChange={silentRefresh}
      />

    </div>
  );
}
