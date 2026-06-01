import type { Meta, StoryObj } from "@storybook/react";
import { Sidebar } from "../components/ui/Sidebar";
import type { NavItem } from "../components/ui/Sidebar";
import { PillHubLogo } from "../components/brand/PillHubLogo";
import { useState } from "react";

const SidebarDemo = ({ initialOpen = true }: { initialOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [activeId, setActiveId] = useState("home");

  const navItems: NavItem[] = [
    {
      id: "home",
      label: "Home",
      icon: "ph-duotone ph-house",
      active: activeId === "home",
      onClick: () => setActiveId("home"),
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: "ph-duotone ph-calendar",
      active: activeId === "schedule",
      onClick: () => setActiveId("schedule"),
      badge: 3,
    },
    {
      id: "medications",
      label: "Medications",
      icon: "ph-duotone ph-pill",
      active: activeId === "medications",
      onClick: () => setActiveId("medications"),
    },
    {
      id: "caregivers",
      label: "Caregivers",
      icon: "ph-duotone ph-users",
      active: activeId === "caregivers",
      onClick: () => setActiveId("caregivers"),
    },
    {
      id: "settings",
      label: "Settings",
      icon: "ph-duotone ph-gear-six",
      active: activeId === "settings",
      onClick: () => setActiveId("settings"),
    },
  ];

  return (
    <div style={{ display: "flex", height: "600px" }}>
      <Sidebar
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        navItems={navItems}
        header={<PillHubLogo size="md" showWordmark={isOpen} />}
      />
      <div style={{ flex: 1, padding: "24px", background: "var(--canvas)" }}>
        <h2>Content Area</h2>
        <p>The sidebar can be toggled using the button in the header.</p>
      </div>
    </div>
  );
};

const meta = {
  title: "Components/Sidebar",
  component: SidebarDemo,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof SidebarDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {
  args: {
    initialOpen: true,
  },
};

export const Collapsed: Story = {
  args: {
    initialOpen: false,
  },
};
