import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";

const meta = {
  title: "Components/Card",
  component: Card,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: null },
  render: () => (
    <Card style={{ maxWidth: "400px" }}>
      <CardContent>
        <p>This is a basic card with just content.</p>
      </CardContent>
    </Card>
  ),
};

export const WithHeader: Story = {
  args: { children: null },
  render: () => (
    <Card style={{ maxWidth: "400px" }}>
      <CardHeader title="Medication Details" />
      <CardContent>
        <p>Metformin helps control blood sugar levels.</p>
      </CardContent>
    </Card>
  ),
};

export const WithHeaderAndFooter: Story = {
  args: { children: null },
  render: () => (
    <Card style={{ maxWidth: "400px" }}>
      <CardHeader eyebrow="Morning dose" title="Metformin · 500 mg" />
      <CardContent>
        <p>Take 1 tablet with breakfast at 8:00 AM</p>
      </CardContent>
      <CardFooter>
        <Button variant="primary">Log this dose</Button>
      </CardFooter>
    </Card>
  ),
};

export const Elevated: Story = {
  args: { children: null },
  render: () => (
    <Card variant="elevated" style={{ maxWidth: "400px" }}>
      <CardHeader eyebrow="Up next" title="Your morning medication" />
      <CardContent>
        <p>Due in 25 minutes</p>
      </CardContent>
    </Card>
  ),
};

export const Interactive: Story = {
  args: { children: null },
  render: () => (
    <Card
      variant="interactive"
      tabIndex={0}
      style={{ maxWidth: "400px" }}
      onClick={() => alert("Card clicked")}
    >
      <CardHeader title="Sertraline · 10 mg" />
      <CardContent>
        <p>View medication details and history</p>
      </CardContent>
    </Card>
  ),
};

export const MedicationCard: Story = {
  args: { children: null },
  render: () => (
    <Card style={{ maxWidth: "420px" }}>
      <CardHeader eyebrow="Up next" title="Metformin · 500 mg" />
      <CardContent>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <div
            style={{
              fontFamily: '"Atkinson Hyperlegible", sans-serif',
              fontWeight: 700,
              fontSize: "32px",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            8:00 AM
          </div>
          <div style={{ fontSize: "14px", color: "var(--ink-3)" }}>
            in 25 minutes
          </div>
        </div>
        <p style={{ marginTop: "16px", marginBottom: 0 }}>
          Take 1 tablet · Chamber A
        </p>
      </CardContent>
      <CardFooter>
        <Button
          variant="primary"
          leftIcon="ph-duotone ph-check"
          style={{ flex: 1 }}
        >
          Log this dose
        </Button>
        <Button variant="secondary" leftIcon="ph-duotone ph-clock">
          Snooze
        </Button>
      </CardFooter>
    </Card>
  ),
};
