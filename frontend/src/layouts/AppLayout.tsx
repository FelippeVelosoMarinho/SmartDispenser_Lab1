import { useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "../components/ui/Sidebar";
import type { NavItem } from "../components/ui/Sidebar";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems: NavItem[] = [
    {
      id: "dashboard",
      label: "Painel",
      icon: "ph-duotone ph-squares-four",
      active: pathname.startsWith("/dashboard"),
      onClick: () => navigate({ to: "/dashboard" }),
    },
    {
      id: "patients",
      label: "Pacientes",
      icon: "ph-duotone ph-users",
      active: pathname.startsWith("/patients"),
      onClick: () => navigate({ to: "/patients" }),
    },
    {
      id: "dispensers",
      label: "Dispensadores",
      icon: "ph-duotone ph-device-mobile-speaker",
      active: pathname.startsWith("/dispensers"),
      onClick: () => navigate({ to: "/dispensers" }),
    },
  ];

  const sidebarHeader = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "var(--radius-sm)",
          background: "var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <i
          className="ph-duotone ph-pill"
          style={{ color: "var(--primary-on)", fontSize: "1.25rem" }}
          aria-hidden="true"
        />
      </div>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: "var(--text-base)",
          color: "var(--ink)",
          whiteSpace: "nowrap",
        }}
      >
        Pillar
      </span>
    </div>
  );

  return (
    <div
      style={{ display: "flex", height: "100vh", background: "var(--canvas)" }}
    >
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        navItems={navItems}
        header={sidebarHeader}
      />

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
