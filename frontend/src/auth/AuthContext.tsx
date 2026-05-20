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
<<<<<<< HEAD
  user: { username: string; full_name: string | null; email: string | null } | null;
  accessToken: string | null;
=======
  user: { username: string; email?: string; full_name?: string } | null;
  token: string | null;
>>>>>>> origin/main
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
<<<<<<< HEAD
  return { isAuthenticated: false, user: null, accessToken: null };
=======
  return { isAuthenticated: false, user: null, token: null };
>>>>>>> origin/main
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadSession);

<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
    setAuth(state);
    console.info("[auth] login completed", { username: user.username });
  }, []);

  const logout = useCallback(() => {
<<<<<<< HEAD
    console.info("[auth] logout");
    setAuthSession(null);
    setAuth({ isAuthenticated: false, user: null, accessToken: null });
=======
    sessionStorage.removeItem(SESSION_KEY);
    setAuth({ isAuthenticated: false, user: null, token: null });
>>>>>>> origin/main
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
