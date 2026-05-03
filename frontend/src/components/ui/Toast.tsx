import React, { createContext, useContext, useState, useCallback } from "react";
import { cn } from "../../lib/utils";
import "./Toast.css";

export type ToastVariant = "success" | "warning" | "danger" | "info";

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (variant: ToastVariant, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access toast functions
 * @example
 * const toast = useToast();
 * toast.success("Dose logged successfully");
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return {
    success: (message: string, duration?: number) =>
      context.addToast("success", message, duration),
    warning: (message: string, duration?: number) =>
      context.addToast("warning", message, duration),
    danger: (message: string, duration?: number) =>
      context.addToast("danger", message, duration),
    info: (message: string, duration?: number) =>
      context.addToast("info", message, duration),
  };
}

/**
 * Toast provider component - wrap your app with this
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (variant: ToastVariant, message: string, duration: number = 5000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, variant, message, duration };

      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * Toast container that renders all active toasts
 */
function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: Toast[];
  onClose: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="pillar-toast-container">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </div>
  );
}

/**
 * Individual toast item with icon and close button
 */
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons: Record<ToastVariant, string> = {
    success: "ph-duotone ph-check-circle",
    warning: "ph-duotone ph-warning",
    danger: "ph-duotone ph-warning-octagon",
    info: "ph-duotone ph-info",
  };

  return (
    <div
      className={cn("pillar-toast", `pillar-toast--${toast.variant}`)}
      role="alert"
    >
      <i className={cn("pillar-toast__icon", icons[toast.variant])} />
      <div className="pillar-toast__message">{toast.message}</div>
      <button
        className="pillar-toast__close"
        onClick={onClose}
        aria-label="Close notification"
      >
        <i className="ph-duotone ph-x" />
      </button>
    </div>
  );
}
