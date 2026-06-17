import { useState, useEffect } from "react";
import {
  startCalibrationDemo,
  listDispensationLogs,
  getDispenserDetails,
  listDispensers,
  type DispensationLog,
  type DispenserDetails,
} from "../lib/api";

// ─── Constantes da demo ──────────────────────────────────────────────────────
const HARDWARE_ID = "C0:CD:D6:CE:4A:AC";

const MED_EMOJIS: Record<string, string> = {
  Amor: "❤️", Carinho: "🤗", Paciência: "🧘", Sabedoria: "🦉",
  Alegria: "😄", Saúde: "💪", Paz: "☮️", Inspiração: "✨",
  Gratidão: "🙏", Humor: "😂", Coragem: "🦁", "Coisas Boas": "🌟",
};

const MED_COLORS = [
  "#f43f5e","#f97316","#a855f7","#3b82f6",
  "#eab308","#22c55e","#06b6d4","#8b5cf6",
  "#10b981","#f59e0b","#ef4444","#6366f1",
];

function periodLabel(ts: string) {
  const h = new Date(ts).getHours();
  if (h < 12) return { label: "Manhã", icon: "🌅" };
  if (h < 18) return { label: "Tarde", icon: "☀️" };
  return { label: "Noite", icon: "🌙" };
}

function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type DemoPhase = "idle" | "loading" | "queued" | "error";

export function PresentationPage() {
  const [dispenser, setDispenser] = useState<DispenserDetails | null>(null);
  const [logs, setLogs] = useState<DispensationLog[]>([]);
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("idle");
  const [demoMsg, setDemoMsg] = useState("");
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  async function fetchData() {
    try {
      const all = await listDispensers();
      const target = all.find(d => d.hardware_id === HARDWARE_ID) ?? all[0];
      if (target) {
        const details = await getDispenserDetails(target.id);
        setDispenser(details);
      }
      const dispensationLogs = await listDispensationLogs(HARDWARE_ID);
      setLogs(dispensationLogs.slice(0, 10));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleStartDemo() {
    setDemoPhase("loading");
    setDemoMsg("");
    try {
      const ip = dispenser?.ip_address ?? null;
      const res = await startCalibrationDemo(HARDWARE_ID, ip);
      setDemoMsg(res?.message ?? "Demo enfileirada com sucesso!");
      setDemoPhase("queued");
      setTimeout(fetchData, 35000); // Refresh logs após primeiro disparo
    } catch (err: any) {
      setDemoMsg(err?.message ?? "Erro ao iniciar demo");
      setDemoPhase("error");
    }
  }

  // Slots reais do dispenser
  const slots = dispenser?.drawers?.flatMap(d => d.slots) ?? [];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      color: "#fff",
      fontFamily: "var(--font-sans)",
    }}>
      {/* Starfield */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: (i % 3) + 1 + "px", height: (i % 3) + 1 + "px",
            borderRadius: "50%", background: "white",
            left: (i * 17 + 13) % 100 + "%",
            top: (i * 23 + 7) % 100 + "%",
            opacity: 0.3 + (i % 5) * 0.1,
            animation: `twinkle ${2 + (i % 4)}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(255,255,255,0.1)", borderRadius: 100,
            padding: "8px 20px", marginBottom: 20,
            border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(10px)",
          }}>
            <span>🎓</span>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#c4b5fd" }}>
              Apresentação UFMG — Lab1
            </span>
          </div>
          <h1 style={{
            fontSize: "clamp(1.8rem, 4.5vw, 2.8rem)", fontWeight: 800, margin: "0 0 14px",
            background: "linear-gradient(90deg, #a78bfa, #60a5fa, #34d399)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2,
          }}>
            Tela feita somente para a<br />apresentação uhul! 🎉
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, maxWidth: 560, margin: "0 auto" }}>
            Fluxo completo integrado — hardware, backend, notificações e frontend em tempo real.
          </p>
        </div>

        {/* ── Patient + Dispenser Card ───────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <Label color="#a78bfa" icon="👤">Paciente da Demo</Label>
          <GlassCard>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{
                width: 68, height: 68, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
              }}>🎓</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 3 }}>
                  {dispenser?.patient_name ?? "Profzinho"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14 }}>
                  Merecedor de coisas boas • Hardware: {HARDWARE_ID}
                </div>
              </div>
              <StatusBadge online={dispenser?.is_online ?? false} />
            </div>
          </GlassCard>
        </section>

        {/* ── Carrossel Real ────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <Label color="#60a5fa" icon="💊">
            Carrossel Real — {slots.length} slots
            {loadingData && <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.6 }}>carregando...</span>}
          </Label>
          <GlassCard>
            {slots.length === 0 ? (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", padding: "20px 0" }}>
                {loadingData ? "Buscando dados do dispenser..." : "Nenhum slot encontrado — rode o seed_presentation.py"}
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
                  {slots.slice(0, 12).map((slot, idx) => {
                    const meds = slot.medications ?? [];
                    const med = meds[0]?.medication;
                    const medName = med?.name ?? `Slot ${slot.slot_number}`;
                    const emoji = MED_EMOJIS[medName] ?? "💊";
                    const color = MED_COLORS[idx % MED_COLORS.length];
                    const qty = meds[0]?.quantity ?? 0;
                    const isActive = activeSlot === slot.id;
                    return (
                      <button key={slot.id} onClick={() => setActiveSlot(isActive ? null : slot.id)}
                        style={{
                          background: isActive ? `${color}33` : "rgba(255,255,255,0.06)",
                          border: `2px solid ${isActive ? color : "rgba(255,255,255,0.1)"}`,
                          borderRadius: 14, padding: "14px 6px", cursor: "pointer",
                          textAlign: "center", color: "#fff",
                          transform: isActive ? "scale(1.06)" : "scale(1)",
                          transition: "all 0.18s",
                        }}>
                        <div style={{ fontSize: 26, marginBottom: 5 }}>{emoji}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{medName}</div>
                        <div style={{
                          fontSize: 10, color, fontWeight: 700,
                          background: `${color}22`, borderRadius: 100,
                          padding: "2px 7px", display: "inline-block",
                        }}>{qty}/30</div>
                      </button>
                    );
                  })}
                </div>
                {activeSlot !== null && (() => {
                  const s = slots.find(x => x.id === activeSlot);
                  if (!s) return null;
                  const med = s.medications?.[0]?.medication;
                  const medName = med?.name ?? `Slot ${s.slot_number}`;
                  const color = MED_COLORS[slots.indexOf(s) % MED_COLORS.length];
                  return (
                    <div style={{
                      marginTop: 14, padding: "14px 18px",
                      background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 10,
                    }}>
                      <strong style={{ color }}>{MED_EMOJIS[medName] ?? "💊"} {medName}</strong>
                      <span style={{ color: "rgba(255,255,255,0.65)", marginLeft: 12, fontSize: 13 }}>
                        Slot #{s.slot_number} · {s.medications?.[0]?.quantity ?? 0} doses · {med?.dosage ?? "–"}
                      </span>
                    </div>
                  );
                })()}
              </>
            )}
          </GlassCard>
        </section>

        {/* ── Histórico Real ────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Label color="#34d399" icon="📋">Histórico Real de Dispensações</Label>
            <button onClick={fetchData} style={{
              background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)",
              borderRadius: 8, padding: "6px 14px", color: "#34d399", fontSize: 12,
              cursor: "pointer", fontWeight: 600,
            }}>↻ Atualizar</button>
          </div>
          <GlassCard>
            {logs.length === 0 ? (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", padding: "20px 0" }}>
                {loadingData ? "Buscando histórico..." : "Nenhuma dispensação registrada ainda. Inicie a demo!"}
              </div>
            ) : (
              logs.map((log, i) => {
                const p = periodLabel(log.timestamp);
                const medName = log.medication_name ?? "Medicamento";
                const emoji = MED_EMOJIS[medName] ?? "💊";
                return (
                  <div key={log.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 0",
                    borderBottom: i < logs.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                      background: "rgba(255,255,255,0.08)", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 18,
                    }}>{p.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                        {p.label} — {fmtDateTime(log.timestamp)}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                        {emoji} {medName}
                        {log.dispenser_id && ` · ${log.dispenser_id}`}
                      </div>
                    </div>
                    <div style={{
                      background: log.success ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)",
                      border: `1px solid ${log.success ? "rgba(52,211,153,0.4)" : "rgba(239,68,68,0.4)"}`,
                      borderRadius: 100, padding: "4px 12px",
                      color: log.success ? "#34d399" : "#f87171",
                      fontSize: 12, fontWeight: 600, flexShrink: 0,
                    }}>
                      {log.success ? "✓ dispensado" : "✗ falhou"}
                    </div>
                  </div>
                );
              })
            )}
          </GlassCard>
        </section>

        {/* ── Demo Física ───────────────────────────────────────── */}
        <section>
          <Label color="#f472b6" icon="🧪">Demonstração ao Vivo — Hardware Real</Label>
          <GlassCard>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🤖</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                Ciclo Completo: Manhã → Tarde → Noite
              </h3>
              <p style={{ color: "rgba(255,255,255,0.55)", maxWidth: 480, margin: "0 auto 24px", fontSize: 14, lineHeight: 1.6 }}>
                Dispara 3 liberações físicas no hardware (servo + LEDs + buzzer + vibração),
                com pausa de 30s entre cada uma. Após cada liberação, um e-mail de confirmação
                é enviado para <strong style={{ color: "#a78bfa" }}>felippe.veloso15@gmail.com</strong>.
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 24 }}>
                {["🌅 Manhã", "☀️ Tarde", "🌙 Noite"].map((p, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%",
                      background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, margin: "0 auto 6px",
                    }}>{p.split(" ")[0]}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{p.split(" ")[1]}</div>
                    {i < 2 && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>+30s</div>}
                  </div>
                ))}
              </div>

              {demoPhase === "queued" && (
                <div style={{
                  background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.35)",
                  borderRadius: 10, padding: "11px 18px", marginBottom: 16,
                  color: "#34d399", fontSize: 13,
                }}>
                  ✅ {demoMsg || "Demo enfileirada! Execute em até 30s."}
                </div>
              )}
              {demoPhase === "error" && (
                <div style={{
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: 10, padding: "11px 18px", marginBottom: 16,
                  color: "#f87171", fontSize: 13,
                }}>
                  ⚠️ {demoMsg}
                </div>
              )}

              <button
                onClick={handleStartDemo}
                disabled={demoPhase === "loading" || demoPhase === "queued"}
                style={{
                  background: demoPhase === "queued"
                    ? "rgba(52,211,153,0.2)"
                    : "linear-gradient(135deg, #a78bfa, #60a5fa)",
                  border: "none", borderRadius: 12, padding: "15px 44px",
                  fontSize: 16, fontWeight: 700, color: "#fff",
                  cursor: demoPhase === "loading" || demoPhase === "queued" ? "not-allowed" : "pointer",
                  opacity: demoPhase === "loading" || demoPhase === "queued" ? 0.7 : 1,
                  boxShadow: "0 8px 28px rgba(167,139,250,0.35)",
                  transition: "all 0.2s",
                }}>
                {demoPhase === "loading" ? "⏳ Enviando..." :
                 demoPhase === "queued" ? "✅ Demo Agendada!" :
                 "🚀 Iniciar Demo ao Vivo"}
              </button>

              {demoPhase === "queued" && (
                <button onClick={() => { setDemoPhase("idle"); setDemoMsg(""); }} style={{
                  display: "block", margin: "10px auto 0", background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                  color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "7px 18px", fontSize: 12,
                }}>Reiniciar</button>
              )}
            </div>
          </GlassCard>
        </section>
      </div>

      <style>{`@keyframes twinkle { 0%{opacity:0.3} 100%{opacity:1} }`}</style>
    </div>
  );
}

// ─── Sub-componentes locais ──────────────────────────────────────────────────
function Label({ color, icon, children }: { color: string; icon: string; children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 12, fontWeight: 600, letterSpacing: 2,
      textTransform: "uppercase", color, marginBottom: 12,
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {icon} {children}
    </h2>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 18, padding: 24, backdropFilter: "blur(12px)",
    }}>
      {children}
    </div>
  );
}

function StatusBadge({ online }: { online: boolean }) {
  return (
    <div style={{
      background: online ? "rgba(52,211,153,0.18)" : "rgba(239,68,68,0.18)",
      border: `1px solid ${online ? "rgba(52,211,153,0.4)" : "rgba(239,68,68,0.4)"}`,
      borderRadius: 100, padding: "6px 16px",
      color: online ? "#34d399" : "#f87171",
      fontSize: 13, fontWeight: 600, flexShrink: 0,
    }}>
      {online ? "🟢 Online" : "🔴 Offline"}
    </div>
  );
}
