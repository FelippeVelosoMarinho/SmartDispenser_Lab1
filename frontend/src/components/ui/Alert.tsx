import React from "react";
import { cn } from "../../lib/utils";
import "./Alert.css";

export type AlertVariant = "success" | "warning" | "danger" | "info";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Semantic variant of the alert */
  variant: AlertVariant;
  /** Title text (bold, prominent) */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional action button/link */
  action?: React.ReactNode;
  /** Show dismiss button */
  onDismiss?: () => void;
  /** Custom icon (Phosphor class) - overrides default variant icon */
  icon?: string;
}

/**
 * Alert component for inline messaging following Pillar Design System principles
 *
 * - Each variant includes icon + color + label (never color alone)
 * - Soft background colors from design tokens
 * - Optional action button or dismiss
 * - Phosphor duotone icons
 *
 * @example
 * <Alert
 *   variant="warning"
 *   title="Dose due soon"
 *   description="Your 8:00 AM dose is in 25 minutes"
 *   action={<Button variant="link">View details</Button>}
 * />
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      variant,
      title,
      description,
      action,
      onDismiss,
      icon,
      className,
      ...props
    },
    ref,
  ) => {
    const defaultIcons: Record<AlertVariant, string> = {
      success: "ph-duotone ph-check-circle",
      warning: "ph-duotone ph-warning",
      danger: "ph-duotone ph-warning-octagon",
      info: "ph-duotone ph-info",
    };

    const iconClass = icon || defaultIcons[variant];

    return (
      <div
        ref={ref}
        className={cn("pillar-alert", `pillar-alert--${variant}`, className)}
        role="alert"
        {...props}
      >
        <i className={cn("pillar-alert__icon", iconClass)} />
        <div className="pillar-alert__content">
          <div className="pillar-alert__title">{title}</div>
          {description && (
            <div className="pillar-alert__description">{description}</div>
          )}
          {action && <div className="pillar-alert__action">{action}</div>}
        </div>
        {onDismiss && (
          <button
            className="pillar-alert__dismiss"
            onClick={onDismiss}
            aria-label="Dismiss alert"
          >
            <i className="ph-duotone ph-x" />
          </button>
        )}
      </div>
    );
  },
);

Alert.displayName = "Alert";
