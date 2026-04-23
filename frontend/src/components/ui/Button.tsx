import React from "react";
import { cn } from "../../lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "link";
export type ButtonSize = "default" | "large" | "small";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Icon to display before the text (Phosphor icon class, e.g., "ph-duotone ph-check") */
  leftIcon?: string;
  /** Icon to display after the text (Phosphor icon class, e.g., "ph-duotone ph-arrow-right") */
  rightIcon?: string;
  /** Button children (text content) */
  children?: React.ReactNode;
}

/**
 * Button component following Pillar Design System principles
 *
 * - 44px minimum touch target (56px for large/primary mobile actions)
 * - Double-ring focus indicator (always visible)
 * - Press feedback with scale animation
 * - Supports loading state with spinner
 * - Phosphor duotone icons
 *
 * @example
 * <Button variant="primary" leftIcon="ph-duotone ph-check">
 *   Log this dose
 * </Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "default",
      loading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    // Base styles for all buttons
    const baseStyles = cn(
      "relative inline-flex items-center justify-center gap-2",
      "font-sans font-semibold text-base leading-tight text-center",
      "cursor-pointer border-none rounded-[var(--radius)] whitespace-nowrap",
      "transition-all duration-DEFAULT ease-out",
      "select-none [-webkit-tap-highlight-color:transparent]",
      "focus-visible:outline-none focus-visible:shadow-focus",
    );

    // Size variants
    const sizeStyles = {
      default: cn(
        "min-h-[44px] px-6 py-3",
        !children && "px-3", // Icon-only button
      ),
      large: cn(
        "min-h-[56px] px-7 py-4 text-md",
        !children && "px-4", // Icon-only button
      ),
      small: cn(
        "min-h-[36px] px-4 py-2 text-sm",
        !children && "px-2", // Icon-only button
      ),
    };

    // Variant styles
    const variantStyles = {
      primary: cn(
        "bg-primary text-primary-on shadow-1",
        !isDisabled && "hover:bg-primary-hover",
        !isDisabled && "active:bg-primary-press active:scale-[0.98]",
      ),
      secondary: cn(
        "bg-surface text-ink border-[1.5px] border-border shadow-1",
        !isDisabled && "hover:bg-surface-dim hover:border-border-strong",
        !isDisabled && "active:bg-surface-sunk active:scale-[0.98]",
      ),
      ghost: cn(
        "bg-transparent text-ink border-none",
        !isDisabled && "hover:bg-primary-soft hover:text-primary",
        !isDisabled && "active:scale-[0.98]",
      ),
      danger: cn(
        "bg-danger text-white shadow-1",
        !isDisabled && "hover:bg-danger-ink",
        !isDisabled && "active:scale-[0.98]",
      ),
      link: cn(
        "bg-transparent text-primary border-none px-2 py-1 min-h-0 no-underline",
        !isDisabled && "hover:text-primary-hover hover:underline",
        !isDisabled && "active:text-primary-press",
      ),
    };

    // Disabled styles
    const disabledStyles = cn(
      isDisabled && "cursor-not-allowed opacity-50",
      isDisabled &&
        variant !== "link" &&
        "bg-surface-sunk text-ink-4 border-border-subtle shadow-none",
    );

    // Loading styles
    const loadingStyles = loading && "cursor-wait";

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          disabledStyles,
          loadingStyles,
          className,
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <i className="ph-duotone ph-circle-notch text-[1.25em] flex-shrink-0 animate-spin motion-reduce:animate-none" />
        )}
        {!loading && leftIcon && (
          <i className={cn("text-[1.25em] flex-shrink-0", leftIcon)} />
        )}
        {children && <span className="whitespace-nowrap">{children}</span>}
        {!loading && rightIcon && (
          <i className={cn("text-[1.25em] flex-shrink-0", rightIcon)} />
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
