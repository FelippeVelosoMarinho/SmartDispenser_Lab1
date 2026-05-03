import type { Meta, StoryObj } from "@storybook/react";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";

const meta = {
  title: "Components/Alert",
  component: Alert,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    variant: "success",
    title: "Dose logged successfully",
    description: "Your 8:00 AM dose of Metformin has been recorded.",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    title: "Dose due soon",
    description: "Your morning medication is due in 15 minutes.",
  },
};

export const Danger: Story = {
  args: {
    variant: "danger",
    title: "Missed dose",
    description: "You missed your 8:00 AM dose of Sertraline.",
  },
};

export const Info: Story = {
  args: {
    variant: "info",
    title: "Medication refill needed",
    description: "You have 3 days of Metformin remaining.",
  },
};

export const WithAction: Story = {
  args: {
    variant: "warning",
    title: "Dose due soon",
    description: "Your morning medication is due in 15 minutes.",
    action: <Button variant="link">View details</Button>,
  },
};

export const WithDismiss: Story = {
  args: {
    variant: "info",
    title: "Welcome back",
    description: "You're back on track after missing yesterday's dose.",
    onDismiss: () => alert("Alert dismissed"),
  },
};
