import { useEffect } from "react";
import { createPortal } from "react-dom";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    icon: "ph-circle-half",
    title: "Visão circular (roleta)",
    content: [
      {
        color: "var(--surface-dim)",
        border: "var(--border)",
        label: "Cinza",
        desc: "Slot sem medicamento configurado. Para configurar, vá em Pacientes → Medicamentos do paciente.",
      },
      {
        color: "var(--success, #10b981)",
        border: "var(--success, #10b981)",
        label: "Verde",
        desc: "Medicamento configurado e com pílulas carregadas. Pronto para dispensar.",
      },
      {
        color: "#7fa88a",
        border: "#7fa88a",
        label: "Verde apagado",
        desc: "Slot já passou neste ciclo — a roleta avançou além desta posição. Veja o histórico para saber se foi tomado.",
      },
      {
        color: "var(--danger, #ef4444)",
        border: "var(--danger, #ef4444)",
        label: "Vermelho",
        desc: "Medicamento configurado, mas sem pílulas registradas. Clique no slot e informe quantas pílulas colocou fisicamente.",
      },
    ],
  },
  {
    icon: "ph-pill",
    title: "Adicionar medicamentos ao dispensador",
    steps: [
      "Vá em Pacientes e selecione o paciente.",
      "Clique em \"Medicamentos\" e adicione um remédio.",
      "No grid, marque os dias e períodos (manhã/tarde/noite) em que deve ser tomado.",
      "Ao salvar, o sistema configura automaticamente os slots físicos correspondentes.",
      "Os slots aparecem imediatamente na roleta (vermelhos até você carregar as pílulas).",
    ],
  },
  {
    icon: "ph-arrows-clockwise",
    title: "Ciclo e reabastecimento",
    steps: [
      "Carregue fisicamente as pílulas nos compartimentos corretos da roleta.",
      "Clique em \"Concluir reabastecimento e iniciar ciclo\" — isso calibra a roleta para a posição 1.",
      "O comando é enviado ao ESP no próximo heartbeat (~30 segundos).",
      "A partir daí, a cada horário programado (manhã/tarde/noite), a roleta avança uma posição e dispensa.",
      "Após a dispensação, o paciente pressiona o botão físico para confirmar que tomou.",
    ],
  },
  {
    icon: "ph-clock-counter-clockwise",
    title: "Histórico de adesão",
    items: [
      { icon: "ph-check-circle", color: "var(--success, #10b981)", label: "Tomou", desc: "Paciente confirmou pressionando o botão físico." },
      { icon: "ph-x-circle", color: "var(--danger, #ef4444)", label: "Não tomou", desc: "Horário passou e o paciente não confirmou." },
      { icon: "ph-warning", color: "var(--warning, #f59e0b)", label: "Erro", desc: "Falha na dispensação (mecânica ou comunicação)." },
    ],
  },
];

export function HelpModal({ open, onClose }: HelpModalProps) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100,
        padding: "var(--space-4)",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-6)",
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ph-duotone ph-question" style={{ fontSize: "1.4rem", color: "var(--primary)" }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--ink)" }}>
                Como usar o SmartDispenser
              </h2>
              <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>Guia rápido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "6px 10px", cursor: "pointer", color: "var(--ink-3)" }}
          >
            <i className="ph-duotone ph-x" />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                <i className={`ph-duotone ${section.icon}`} style={{ fontSize: "1.1rem", color: "var(--primary)" }} />
                <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700, color: "var(--ink)" }}>
                  {section.title}
                </h3>
              </div>

              {/* Color legend */}
              {"content" in section && section.content && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {section.content.map((c) => (
                    <div key={c.label} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, background: c.color, border: `2px solid ${c.border}`, flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)", lineHeight: 1.5 }}>
                        <strong style={{ color: "var(--ink)" }}>{c.label}</strong> — {c.desc}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Steps */}
              {"steps" in section && section.steps && (
                <ol style={{ margin: 0, paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {section.steps.map((step, i) => (
                    <li key={i} style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)", lineHeight: 1.5 }}>
                      {step}
                    </li>
                  ))}
                </ol>
              )}

              {/* Badge list */}
              {"items" in section && section.items && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {section.items.map((item) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <i className={`ph-duotone ${item.icon}`} style={{ fontSize: "1.1rem", color: item.color, flexShrink: 0 }} />
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)", lineHeight: 1.5 }}>
                        <strong style={{ color: "var(--ink)" }}>{item.label}</strong> — {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ height: 1, background: "var(--border)", marginTop: "var(--space-4)" }} />
            </div>
          ))}

          <button
            onClick={onClose}
            style={{
              background: "var(--primary)", color: "var(--primary-on)",
              border: "none", borderRadius: "var(--radius-md)",
              padding: "10px 20px", fontWeight: 600, fontSize: "var(--text-sm)",
              cursor: "pointer", alignSelf: "flex-end",
            }}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
