import type { ReactNode } from "react";
import type { DispenserDetails } from "../../lib/api";

interface DispenserGuideSectionProps {
  dispenser: DispenserDetails;
}

interface GuideStepProps {
  number: number;
  title: string;
  children: ReactNode;
}

function GuideStep({ number, title, children }: GuideStepProps) {
  return (
    <li style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start" }}>
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: "var(--primary)",
          color: "var(--primary-on)",
          fontSize: "var(--text-sm)",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {number}
      </span>
      <div>
        <strong style={{ display: "block", color: "var(--ink)", marginBottom: "4px" }}>{title}</strong>
        <div style={{ color: "var(--ink-2)", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>{children}</div>
      </div>
    </li>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
        <i className={`ph-duotone ${icon}`} style={{ fontSize: "1.5rem", color: "var(--primary)" }} aria-hidden />
        <h3
          style={{
            margin: 0,
            fontSize: "var(--text-base)",
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          {title}
        </h3>
      </div>
      <div style={{ color: "var(--ink-2)", fontSize: "var(--text-sm)", lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

export function DispenserGuideSection({ dispenser }: DispenserGuideSectionProps) {
  const patientLabel = dispenser.patient_name || "o paciente";

  return (
    <section style={{ marginBottom: "var(--space-8)" }} aria-labelledby="dispenser-guide-heading">
      <h2
        id="dispenser-guide-heading"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xl)",
          fontWeight: 700,
          color: "var(--ink)",
          margin: "0 0 var(--space-2)",
        }}
      >
        Como usar o dispensador
      </h2>
      <p style={{ margin: "0 0 var(--space-5)", color: "var(--ink-2)", fontSize: "var(--text-sm)", maxWidth: "640px" }}>
        Três horários por dia (manhã, tarde, noite) avançam a roleta uma posição por vez. Configure os horários
        acima e use <strong>Iniciar ciclo</strong> após reabastecer — a calibração é automática.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-5)",
        }}
      >
        <InfoCard icon="ph-pill" title="Como funciona">
          <p style={{ margin: "0 0 var(--space-3)" }}>
            O dispensador possui <strong>21 compartimentos</strong> na roleta (7 dias × 3 períodos).
          </p>
          <p style={{ margin: 0 }}>
            A cada horário (manhã → tarde → noite), a roleta avança <strong>uma posição</strong>. O LED indica
            o período e o alerta permanece até {patientLabel} confirmar no botão do aparelho.
          </p>
        </InfoCard>

        <InfoCard icon="ph-clock" title="Horários configuráveis">
          <p style={{ margin: "0 0 var(--space-3)" }}>
            Defina três horários no painel: <strong>manhã</strong>, <strong>tarde</strong> e <strong>noite</strong>.
            Para testes, use horários próximos (ex.: 21:00, 21:01, 21:02).
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li>O servidor dispara a dispensação automaticamente nos horários salvos.</li>
            <li>Se houver dose pendente de confirmação, a próxima não inicia.</li>
            <li>A sequência física segue: compartimento 1, 2, 3… até 21.</li>
          </ul>
        </InfoCard>

        <InfoCard icon="ph-bluetooth" title="Remover ou trocar de rede">
          <p style={{ margin: "0 0 var(--space-3)" }}>
            Ao remover o dispensador no menu <strong>Dispensadores</strong>, o sistema tenta apagar o Wi-Fi
            no aparelho para ele voltar ao modo Bluetooth (<code>Eco-Dispenser</code>).
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li>Se o aparelho estiver na rede, o reset é automático antes de apagar o registro.</li>
            <li>Sem rede: segure volume + e - por 5 segundos no aparelho.</li>
          </ul>
        </InfoCard>

        <InfoCard icon="ph-gear-six" title="Como configurar">
          <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li style={{ marginBottom: "var(--space-2)" }}>
              <strong>Parear</strong> o aparelho e vinculá-lo a {patientLabel}.
            </li>
            <li style={{ marginBottom: "var(--space-2)" }}>
              <strong>Reabastecer</strong> compartimentos 1→21 e cadastrar medicamentos no mapa.
            </li>
            <li style={{ marginBottom: "var(--space-2)" }}>
              <strong>Iniciar ciclo</strong> — calibra a roleta automaticamente (posição inicial).
            </li>
            <li>
              <strong>Salvar horários</strong> de manhã, tarde e noite.
            </li>
          </ol>
        </InfoCard>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-5)",
        }}
      >
        <h3
          style={{
            margin: "0 0 var(--space-4)",
            fontSize: "var(--text-base)",
            fontWeight: 700,
            color: "var(--ink)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <i className="ph-duotone ph-list-checks" style={{ color: "var(--primary)" }} aria-hidden />
          Fluxo resumido
        </h3>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <GuideStep number={1} title="Reabastecimento">
            Preencha compartimentos 1–21 e registre medicamentos no mapa circular.
          </GuideStep>
          <GuideStep number={2} title="Iniciar ciclo">
            Clique em <strong>Concluir reabastecimento e iniciar ciclo</strong> — calibração automática.
          </GuideStep>
          <GuideStep number={3} title="Horários">
            Salve manhã, tarde e noite. O servidor aciona o ESP nos horários configurados.
          </GuideStep>
          <GuideStep number={4} title="Confirmação">
            {patientLabel} retira os comprimidos e pressiona o botão de confirmação no aparelho.
          </GuideStep>
        </ol>
      </div>

      <p
        style={{
          marginTop: "var(--space-4)",
          fontSize: "var(--text-xs)",
          color: "var(--ink-3)",
        }}
      >
        Dispositivo: {dispenser.hardware_id}
        {dispenser.is_online ? " · conectado" : " · aguardando conexão"}
      </p>
    </section>
  );
}
