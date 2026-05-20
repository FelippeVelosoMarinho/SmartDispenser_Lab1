import { useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "../components/ui/Sidebar";
import type { NavItem } from "../components/ui/Sidebar";
import { useAuth } from "../auth/AuthContext";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();

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

  const sidebarFooter = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: sidebarOpen ? "space-between" : "center",
        gap: "var(--space-2)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "var(--primary-soft)",
            color: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            flexShrink: 0,
          }}
        >
          {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : (user?.username ? user.username.substring(0, 2).toUpperCase() : "U")}
        </div>
        {sidebarOpen && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: "var(--text-sm)",
                color: "var(--ink)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.full_name || user?.username || "Cuidador"}
            </span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--ink-3)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.email || "Online"}
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          sessionStorage.clear();
          localStorage.clear();
          logout();
          navigate({ to: "/login" });
        }}
        title="Sair"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--danger, #ef4444)",
          cursor: "pointer",
          padding: "var(--space-2)",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <i className="ph-duotone ph-sign-out" style={{ fontSize: "1.25rem" }} />
      </button>
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
        footer={sidebarFooter}
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
