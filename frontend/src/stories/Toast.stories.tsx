import type { Meta, StoryObj } from "@storybook/react";
import { ToastProvider, useToast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";

const ToastDemo = () => {
  const toast = useToast();

  return (
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
      <Button
        variant="primary"
        onClick={() => toast.success("Dose logged successfully")}
      >
        Success Toast
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast.warning("Your medication is due in 15 minutes")}
      >
        Warning Toast
      </Button>
      <Button
        variant="danger"
        onClick={() => toast.danger("Failed to connect to device")}
      >
        Danger Toast
      </Button>
      <Button
        variant="ghost"
        onClick={() => toast.info("Medication refill needed")}
      >
        Info Toast
      </Button>
    </div>
  );
};

const meta = {
  title: "Components/Toast",
  component: ToastDemo,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof ToastDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {};
