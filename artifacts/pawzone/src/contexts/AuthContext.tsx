import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export interface UserInfo {
  id: number;
  role: "buyer" | "seller" | "transporter" | "admin";
  name: string;
  email: string;
  phone?: string;
  sellerId?: string;
  sellerScore?: number;
  status: string;
  city?: string;
  address?: string;
  pincode?: string;
  state?: string;
  platformSharePercent?: number;
}

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Register global token getter
let _token: string | null = localStorage.getItem("pawzone_token");
setAuthTokenGetter(() => _token);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("pawzone_token"));
  const [user, setUser] = useState<UserInfo | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  const refresh = async () => {
    try { await refetch(); } catch { /* noop */ }
  };

  useEffect(() => {
    if (data) {
      setUser(data as UserInfo);
    } else if (error) {
      logout();
    }
  }, [data, error]);

  const login = (newToken: string, newUser: UserInfo) => {
    localStorage.setItem("pawzone_token", newToken);
    _token = newToken;
    setToken(newToken);
    setUser(newUser);

    if (newUser.role === "buyer") setLocation("/buyer");
    else if (newUser.role === "seller") setLocation("/seller");
    else if (newUser.role === "transporter") setLocation("/transporter");
    else if (newUser.role === "admin") setLocation("/admin");
  };

  const logout = () => {
    localStorage.removeItem("pawzone_token");
    _token = null;
    setToken(null);
    setUser(null);
    queryClient.clear();
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
