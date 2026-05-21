import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface AuthState {
  isAuthenticated: boolean;
  user: { username: string; email?: string; full_name?: string } | null;
  token: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "pillar_auth";

function loadSession(): AuthState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as AuthState;
  } catch {
    // ignore parse errors
  }
  return { isAuthenticated: false, user: null, token: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadSession);

  const login = useCallback(async (emailOrUsername: string, password: string) => {
    // Make real backend API call
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: emailOrUsername,
        password: password,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail ?? "Incorrect username or password");
    }

    const tokenData = await res.json();
    const token = tokenData.access_token;

    // Fetch user profile info
    const profileRes = await fetch("/api/auth/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    let userDetails = {
      username: emailOrUsername,
      full_name: emailOrUsername,
      email: emailOrUsername.includes("@") ? emailOrUsername : "",
    };

    if (profileRes.ok) {
      const profileData = await profileRes.ok ? await profileRes.json() : null;
      if (profileData) {
        userDetails = {
          username: profileData.username,
          full_name: profileData.full_name || profileData.username,
          email: profileData.email || "",
        };
      }
    }

    const state: AuthState = {
      isAuthenticated: true,
      user: userDetails,
      token: token,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    setAuth(state);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuth({ isAuthenticated: false, user: null, token: null });
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
