import React, { useEffect } from "react";
import { cn } from "../../lib/utils";
import "./Sidebar.css";

export interface NavItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Phosphor icon class (e.g., "ph-duotone ph-house") */
  icon: string;
  /** Whether this item is currently active */
  active?: boolean;
  /** Optional badge/counter */
  badge?: string | number;
  /** Click handler */
  onClick?: () => void;
}

export interface SidebarProps {
  /** Whether the sidebar is open (expanded) */
  isOpen: boolean;
  /** Toggle sidebar open/close */
  onToggle?: () => void;
  /** Navigation items */
  navItems: NavItem[];
  /** Header content (logo, title) */
  header?: React.ReactNode;
  /** Footer content (user profile, settings) */
  footer?: React.ReactNode;
  /** Additional className */
  className?: string;
}

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ isOpen, onToggle, navItems, header, footer, className }, ref) => {
    // Push a history entry when the sidebar opens on mobile so the back button closes it
    useEffect(() => {
      if (!onToggle) return;

      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      if (!isMobile) return;

      if (isOpen) {
        history.pushState({ sidebarOpen: true }, "");
      }

      const handlePopState = (e: PopStateEvent) => {
        if (!e.state?.sidebarOpen && isOpen) {
          onToggle();
        }
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }, [isOpen, onToggle]);

    return (
      <>
        {/* Mobile hamburger — only visible when sidebar is closed on mobile */}
        {onToggle && !isOpen && (
          <button
            className="pillar-sidebar__mobile-open"
            onClick={onToggle}
            aria-label="Abrir menu"
            aria-expanded={false}
          >
            <i className="ph-duotone ph-list" />
          </button>
        )}

        {/* Mobile backdrop */}
        {isOpen && onToggle && (
          <div
            className="pillar-sidebar__backdrop"
            onClick={onToggle}
            aria-hidden="true"
          />
        )}

        <aside
          ref={ref}
          className={cn(
            "pillar-sidebar",
            isOpen && "pillar-sidebar--open",
            className,
          )}
        >
          {/* Header */}
          {header && (
            <div className="pillar-sidebar__header">
              {header}
              {onToggle && (
                <button
                  className="pillar-sidebar__toggle"
                  onClick={onToggle}
                  aria-label={isOpen ? "Fechar menu" : "Expandir menu"}
                  aria-expanded={isOpen}
                >
                  <i
                    className={cn(
                      "ph-duotone",
                      isOpen ? "ph-caret-left" : "ph-caret-right",
                    )}
                  />
                </button>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="pillar-sidebar__nav" aria-label="Main navigation">
            <ul className="pillar-sidebar__nav-list">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    className={cn(
                      "pillar-sidebar__nav-item",
                      item.active && "pillar-sidebar__nav-item--active",
                    )}
                    onClick={item.onClick}
                    aria-current={item.active ? "page" : undefined}
                  >
                    <i className={cn("pillar-sidebar__nav-icon", item.icon)} />
                    <span className="pillar-sidebar__nav-label">
                      {item.label}
                    </span>
                    {item.badge !== undefined && (
                      <span className="pillar-sidebar__nav-badge">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          {footer && <div className="pillar-sidebar__footer">{footer}</div>}
        </aside>
      </>
    );
  },
);

Sidebar.displayName = "Sidebar";
