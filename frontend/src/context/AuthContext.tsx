import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { api } from "../api/client";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  created_at?: string;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    vehicle_type: string;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "chargeflow_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);

      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get<AuthUser>("/api/users/me");

        if (!cancelled) {
          setUser(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (
            axios.isAxiosError(err) &&
            err.response?.status === 401
          ) {
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{
      token: string;
      user: AuthUser;
    }>("/api/auth/login", {
      email,
      password,
    });

    setToken(data.token);
    setUser(data.user);
  }, []);

  const signup = useCallback(
    async (payload: {
      name: string;
      email: string;
      phone: string;
      password: string;
      vehicle_type: string;
    }) => {
      const { data } = await api.post<{
        token: string;
        user: AuthUser;
      }>("/api/auth/signup", payload);

      setToken(data.token);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      signup,
      logout,
    }),
    [token, user, loading, login, signup, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}
