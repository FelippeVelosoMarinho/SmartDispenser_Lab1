import type { Meta } from "@storybook/react";

const meta = {
  title: "Design System/Tokens",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;

export const Colors = () => (
  <div>
    <h2>Color System</h2>
    <p style={{ color: "var(--ink-2)", marginBottom: "24px" }}>
      Pillar's palette is built on Still Blue (primary), Sage Teal (secondary),
      and warm canvas. All color pairs meet WCAG AA contrast standards.
    </p>

    <h3>Primary — Still Blue</h3>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "32px",
      }}
    >
      <ColorSwatch name="Primary" var="--primary" />
      <ColorSwatch name="Primary Hover" var="--primary-hover" />
      <ColorSwatch name="Primary Press" var="--primary-press" />
      <ColorSwatch name="Primary Soft" var="--primary-soft" />
    </div>

    <h3>Semantic States</h3>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "32px",
      }}
    >
      <ColorSwatch name="Success" var="--success" />
      <ColorSwatch name="Warning" var="--warning" />
      <ColorSwatch name="Danger" var="--danger" />
      <ColorSwatch name="Info" var="--info" />
    </div>

    <h3>Neutrals</h3>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
      }}
    >
      <ColorSwatch name="Canvas" var="--canvas" />
      <ColorSwatch name="Surface" var="--surface" />
      <ColorSwatch name="Ink" var="--ink" textColor="white" />
      <ColorSwatch name="Ink 2" var="--ink-2" textColor="white" />
    </div>
  </div>
);

export const Typography = () => (
  <div>
    <h2>Typography</h2>
    <p style={{ color: "var(--ink-2)", marginBottom: "24px" }}>
      Base size is 17px (not 16). Lexend for UI text, Atkinson Hyperlegible for
      numerals.
    </p>

    <div style={{ marginBottom: "32px" }}>
      <h1 style={{ margin: "0 0 8px" }}>Heading 1 — 40px</h1>
      <h2 style={{ margin: "0 0 8px" }}>Heading 2 — 32px</h2>
      <h3 style={{ margin: "0 0 8px" }}>Heading 3 — 26px</h3>
      <h4 style={{ margin: "0 0 8px" }}>Heading 4 — 22px</h4>
      <p style={{ fontSize: "var(--text-base)" }}>Body Text — 17px</p>
      <p style={{ fontSize: "var(--text-sm)" }}>Small Text — 15px</p>
      <p style={{ fontSize: "var(--text-xs)" }}>Extra Small — 13px</p>
    </div>

    <div>
      <h3>Numerals (Atkinson Hyperlegible)</h3>
      <div
        style={{
          fontFamily: "var(--font-num)",
          fontVariantNumeric: "tabular-nums",
          fontSize: "32px",
        }}
      >
        8:00 AM • 500 mg • 1,234
      </div>
    </div>
  </div>
);

export const Spacing = () => (
  <div>
    <h2>Spacing Scale</h2>
    <p style={{ color: "var(--ink-2)", marginBottom: "24px" }}>
      4px base grid. Most UI snaps to 8px. Generous spacing for clarity.
    </p>
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SpacingRow name="space-1" size="4px" />
      <SpacingRow name="space-2" size="8px" />
      <SpacingRow name="space-3" size="12px" />
      <SpacingRow name="space-4" size="16px" />
      <SpacingRow name="space-5" size="20px" />
      <SpacingRow name="space-6" size="24px" />
      <SpacingRow name="space-7" size="32px" />
      <SpacingRow name="space-8" size="40px" />
    </div>
  </div>
);

export const Shadows = () => (
  <div>
    <h2>Elevation & Shadows</h2>
    <p style={{ color: "var(--ink-2)", marginBottom: "24px" }}>
      Three shadow levels, all low and soft — no harsh drops.
    </p>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "24px",
      }}
    >
      <ShadowBox level="1" description="Resting cards, inputs" />
      <ShadowBox level="2" description="Elevated surfaces, popovers" />
      <ShadowBox level="3" description="Sheets, modals" />
    </div>
  </div>
);

// Helper components
const ColorSwatch = ({
  name,
  var: cssVar,
  textColor = "var(--ink)",
}: { name: string; var: string; textColor?: string }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
    <div
      style={{
        background: `var(${cssVar})`,
        height: "80px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border-subtle)",
      }}
    />
    <div style={{ fontSize: "14px", fontWeight: 600, color: textColor }}>
      {name}
    </div>
    <div
      style={{
        fontSize: "12px",
        color: "var(--ink-3)",
        fontFamily: "monospace",
      }}
    >
      {cssVar}
    </div>
  </div>
);

const SpacingRow = ({ name, size }: { name: string; size: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
    <div style={{ width: "120px", fontSize: "14px", fontFamily: "monospace" }}>
      var(--{name})
    </div>
    <div style={{ fontSize: "14px", color: "var(--ink-3)", width: "60px" }}>
      {size}
    </div>
    <div
      style={{
        width: `var(--${name})`,
        height: "32px",
        background: "var(--primary)",
        borderRadius: "4px",
      }}
    />
  </div>
);

const ShadowBox = ({
  level,
  description,
}: { level: string; description: string }) => (
  <div
    style={{
      background: "var(--surface)",
      padding: "24px",
      borderRadius: "var(--radius)",
      boxShadow: `var(--shadow-${level})`,
      border: "1px solid var(--border-subtle)",
    }}
  >
    <div style={{ fontWeight: 600, marginBottom: "4px" }}>Shadow {level}</div>
    <div style={{ fontSize: "14px", color: "var(--ink-3)" }}>{description}</div>
  </div>
);
