import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "../components/ui/Input";

const meta = {
  title: "Components/Input",
  component: Input,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter medication name",
  },
};

export const WithLabel: Story = {
  args: {
    label: "Medication name",
    placeholder: "e.g., Metformin",
  },
};

export const WithHelperText: Story = {
  args: {
    label: "Dosage",
    placeholder: "500",
    helperText: "Enter the dosage in milligrams",
  },
};

export const WithIcon: Story = {
  args: {
    label: "Medication name",
    icon: "ph-duotone ph-pill",
    placeholder: "e.g., Sertraline",
  },
};

export const Error: Story = {
  args: {
    label: "Medication name",
    error: "This field is required",
    value: "",
  },
};

export const ErrorWithIcon: Story = {
  args: {
    label: "Dosage amount",
    icon: "ph-duotone ph-pill",
    error: "Please enter a valid dosage",
    value: "abc",
  },
};

export const Disabled: Story = {
  args: {
    label: "Medication name",
    value: "Metformin",
    disabled: true,
  },
};

export const NumberInput: Story = {
  args: {
    label: "Dosage (mg)",
    type: "number",
    placeholder: "500",
    icon: "ph-duotone ph-hash",
  },
};

export const EmailInput: Story = {
  args: {
    label: "Email address",
    type: "email",
    placeholder: "your@email.com",
    icon: "ph-duotone ph-envelope",
  },
};
