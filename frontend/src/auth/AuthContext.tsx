import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import {
  getProfile,
  getStoredAuthSession,
  loginWithPassword,
  setAuthSession,
} from "../lib/api";

interface AuthState {
  isAuthenticated: boolean;
  user: { username: string; full_name: string | null; email: string | null } | null;
  accessToken: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): AuthState {
  try {
    const stored = getStoredAuthSession();
    if (stored) {
      return {
        isAuthenticated: true,
        user: stored.user,
        accessToken: stored.accessToken,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { isAuthenticated: false, user: null, accessToken: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadSession);

  const login = useCallback(async (username: string, password: string) => {
    console.info("[auth] login started", { username });
    const accessToken = await loginWithPassword(username, password);
    console.info("[auth] token received", { username });
    setAuthSession({ accessToken, user: null });

    const user = await getProfile();
    console.info("[auth] profile loaded", { username: user.username });
    const state: AuthState = {
      isAuthenticated: true,
      user,
      accessToken,
    };
    setAuthSession({ accessToken, user });
    setAuth(state);
    console.info("[auth] login completed", { username: user.username });
  }, []);

  const logout = useCallback(() => {
    console.info("[auth] logout");
    setAuthSession(null);
    setAuth({ isAuthenticated: false, user: null, accessToken: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
