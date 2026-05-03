import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = "/api";
const POLL_INTERVAL = 2000; // ms

interface UseLedReturn {
  isOn: boolean;
  isLoading: boolean;
  isToggling: boolean;
  hardwareReachable: boolean;
  backendReachable: boolean;
  latencyMs: number | null;
  error: string | null;
  toggle: (state: "on" | "off") => Promise<void>;
}

export function useLed(): UseLedReturn {
  const [isOn, setIsOn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [hardwareReachable, setHardwareReachable] = useState(false);
  const [backendReachable, setBackendReachable] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/led/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setIsOn(data.led);
      setHardwareReachable(data.hardware_reachable);
      setLatencyMs(data.latency_ms);
      setBackendReachable(true);
      setError(null);
    } catch (err) {
      setBackendReachable(false);
      setHardwareReachable(false);
      setError(
        err instanceof Error ? err.message : "Failed to fetch LED status",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggle = useCallback(async (state: "on" | "off") => {
    setIsToggling(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/led/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setIsOn(data.led);
      setLatencyMs(data.latency_ms);
      setHardwareReachable(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle LED");
    } finally {
      setIsToggling(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    intervalRef.current = window.setInterval(fetchStatus, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStatus]);

  return {
    isOn,
    isLoading,
    isToggling,
    hardwareReachable,
    backendReachable,
    latencyMs,
    error,
    toggle,
  };
}
