import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../components/ui/Button";

/**
 * Button component for actions and navigation.
 *
 * Follows Pillar Design System principles:
 * - 44px minimum touch target (56px for large)
 * - Double-ring focus indicator (always visible)
 * - Press feedback with scale animation
 * - Color + icon + label for accessibility
 */
const meta = {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "danger", "link"],
      description: "Visual variant of the button",
    },
    size: {
      control: "select",
      options: ["small", "default", "large"],
      description: "Size of the button",
    },
    loading: {
      control: "boolean",
      description: "Show loading spinner",
    },
    disabled: {
      control: "boolean",
      description: "Disable the button",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Primary buttons are for the main action on a screen.
 * They use Still Blue and have the highest visual prominence.
 */
export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Log this dose",
  },
};

/**
 * Secondary buttons are for less important actions.
 * They have a surface background with a strong border.
 */
export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "View details",
  },
};

/**
 * Ghost buttons are subtle and blend with the background.
 * Use for tertiary actions or in dense interfaces.
 */
export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Skip dose",
  },
};

/**
 * Danger buttons are for destructive actions.
 * Always pair with a confirmation dialog.
 */
export const Danger: Story = {
  args: {
    variant: "danger",
    children: "Delete medication",
  },
};

/**
 * Link buttons look like text links.
 * Use for navigation or less prominent actions.
 */
export const Link: Story = {
  args: {
    variant: "link",
    children: "Learn more",
  },
};

/**
 * Large size (56px) for primary mobile actions
 */
export const Large: Story = {
  args: {
    variant: "primary",
    size: "large",
    children: "Take medication",
  },
};

/**
 * Small size for compact layouts
 */
export const Small: Story = {
  args: {
    variant: "secondary",
    size: "small",
    children: "Edit",
  },
};

/**
 * Buttons with Phosphor duotone icons (left position)
 */
export const WithLeftIcon: Story = {
  args: {
    variant: "primary",
    leftIcon: "ph-duotone ph-check",
    children: "Mark as taken",
  },
};

/**
 * Buttons with Phosphor duotone icons (right position)
 */
export const WithRightIcon: Story = {
  args: {
    variant: "secondary",
    rightIcon: "ph-duotone ph-arrow-right",
    children: "Next",
  },
};

/**
 * Icon-only buttons (no text)
 * Note: Always include aria-label for accessibility
 */
export const IconOnly: Story = {
  args: {
    variant: "ghost",
    leftIcon: "ph-duotone ph-gear-six",
    "aria-label": "Settings",
  },
};

/**
 * Loading state shows a spinner and disables interaction
 */
export const Loading: Story = {
  args: {
    variant: "primary",
    loading: true,
    children: "Logging dose...",
  },
};

/**
 * Disabled state with reduced opacity
 */
export const Disabled: Story = {
  args: {
    variant: "primary",
    disabled: true,
    children: "Unavailable",
  },
};

/**
 * All variants side by side
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-3 flex-wrap">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

/**
 * Example: Medication logging action
 */
export const MedicationAction: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="primary" size="large" leftIcon="ph-duotone ph-check">
        Log this dose
      </Button>
      <Button variant="secondary" size="large" leftIcon="ph-duotone ph-clock">
        Snooze
      </Button>
    </div>
  ),
};
