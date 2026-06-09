import React from "react";
import { cn } from "../../lib/utils";
import "./Input.css";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text for the input */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text to display below input */
  helperText?: string;
  /** Icon to display (Phosphor icon class, e.g., "ph-duotone ph-envelope") */
  icon?: string;
}

/**
 * Input component following Pillar Design System principles
 *
 * - Surface-sunk background for subtle inset appearance
 * - Strong border with focus ring (double-ring, always visible)
 * - 44px minimum height for accessibility
 * - Error state with danger color + icon + message
 * - Proper label association with htmlFor
 *
 * @example
 * <Input
 *   label="Medication name"
 *   error="This field is required"
 *   icon="ph-duotone ph-pill"
 * />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, icon, className, id, disabled, ...props },
    ref,
  ) => {
    // Generate unique ID if not provided
    const inputId = id || `input-${React.useId()}`;
    const hasError = Boolean(error);

    return (
      <div className={cn("pillar-input-wrapper", className)}>
        {label && (
          <label htmlFor={inputId} className="pillar-input__label">
            {label}
          </label>
        )}
        <div className="pillar-input-container">
          {icon && (
            <i
              className={cn(
                "pillar-input__icon",
                icon,
                hasError && "pillar-input__icon--error",
              )}
            />
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "pillar-input",
              icon && "pillar-input--with-icon",
              hasError && "pillar-input--error",
            )}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            {...props}
          />
          {hasError && (
            <i className="pillar-input__error-icon ph-duotone ph-warning-octagon" />
          )}
        </div>
        {hasError && (
          <div
            id={`${inputId}-error`}
            className="pillar-input__error"
            role="alert"
          >
            <i className="ph-duotone ph-warning" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        {!hasError && helperText && (
          <div id={`${inputId}-helper`} className="pillar-input__helper">
            {helperText}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
