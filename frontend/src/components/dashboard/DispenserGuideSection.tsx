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
        Este painel mostra o estado do dispositivo e os compartimentos. A dispensação automática segue a
        sequência física da roleta e os horários definidos para cada posição.
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
            O dispensador possui <strong>21 posições</strong> na roleta — uma semana de tratamento com até
            três doses por dia (manhã, tarde e noite).
          </p>
          <p style={{ margin: 0 }}>
            A cada horário programado, a roleta avança <strong>uma posição</strong> e libera os comprimidos
            daquela gaveta. Alertas visuais, sonoros ou por vibração permanecem ativos até {patientLabel}{" "}
            confirmar a retirada no botão do aparelho.
          </p>
        </InfoCard>

        <InfoCard icon="ph-clock" title="Quando as pílulas são dispensadas">
          <p style={{ margin: "0 0 var(--space-3)" }}>
            A dispensação ocorre <strong>automaticamente</strong> na data e hora vinculadas a cada posição
            (1 a 21), enquanto o aparelho estiver conectado à rede.
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li>Posição 1 é a primeira dose da sequência; posição 2, a segunda; e assim por diante.</li>
            <li>Cada horário deve respeitar a ordem: posições maiores vêm depois no tempo.</li>
            <li>Se houver dose pendente de confirmação, uma nova dispensação não é iniciada.</li>
          </ul>
        </InfoCard>

        <InfoCard icon="ph-bluetooth" title="Remover ou trocar de rede">
          <p style={{ margin: "0 0 var(--space-3)" }}>
            Ao remover o dispensador no menu <strong>Dispensadores</strong>, o sistema tenta apagar o Wi-Fi
            no aparelho para ele voltar ao modo Bluetooth (<code>Eco-Dispenser</code>).
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li>Se o aparelho estiver na rede, o reset é automático antes de apagar o registro.</li>
            <li>Sem rede: segure volume + e - por 5 segundos, ou use{" "}
              <code>POST http://&lt;IP&gt;/reset-wifi</code> com o dispensador ligado.</li>
          </ul>
        </InfoCard>

        <InfoCard icon="ph-gear-six" title="Como configurar">
          <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li style={{ marginBottom: "var(--space-2)" }}>
              <strong>Parear o aparelho</strong> na rede Wi-Fi e vinculá-lo a {patientLabel}.
            </li>
            <li style={{ marginBottom: "var(--space-2)" }}>
              <strong>Reabastecer em ordem</strong>: coloque os medicamentos da posição 1 à 21, na sequência
              em que serão tomados.
            </li>
            <li style={{ marginBottom: "var(--space-2)" }}>
              <strong>Cadastrar medicamentos</strong> no mapa de compartimentos acima (clique em cada posição).
            </li>
            <li style={{ marginBottom: "var(--space-2)" }}>
              <strong>Calibrar a roleta</strong> após cada reabastecimento completo (zera no início da sequência).
            </li>
            <li>
              <strong>Definir horários</strong> de cada posição no sistema — a equipe de cuidado associa data,
              hora e número da posição para o servidor disparar no momento certo.
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
          <GuideStep number={1} title="Reabastecimento semanal">
            Preencha as posições 1 a 21 na ordem dos dias e períodos (manhã, tarde, noite). Use o mapa
            circular para registrar o que há em cada compartimento.
          </GuideStep>
          <GuideStep number={2} title="Calibração">
            Após fechar o dispensador, execute a calibração para que a roleta comece na posição inicial.
          </GuideStep>
          <GuideStep number={3} title="Horário programado">
            No momento configurado, o servidor aciona o aparelho: a roleta avança, os LEDs indicam o período
            (sol / sol com nuvem / lua) e o alerta chama a atenção de {patientLabel}.
          </GuideStep>
          <GuideStep number={4} title="Confirmação">
            {patientLabel} retira os comprimidos e pressiona o botão de confirmação. O sistema registra a
            adesão para acompanhamento no painel.
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
