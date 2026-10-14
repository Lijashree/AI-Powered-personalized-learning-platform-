import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "../lib/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("studymind_token");

    if (!token) {
      setUser(false);
      return;
    }

    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (err) {
      localStorage.removeItem("studymind_token");
      setUser(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("studymind_token", data.token);
      setUser(data.user);

      return {
        ok: true,
      };
    } catch (err) {
      return {
        ok: false,
        error: formatApiError(err),
      };
    }
  };

  const signup = async (name, email, password) => {
    try {
      const { data } = await api.post("/auth/signup", {
        name,
        email,
        password,
      });

      localStorage.setItem("studymind_token", data.token);
      setUser(data.user);

      return {
        ok: true,
      };
    } catch (err) {
      return {
        ok: false,
        error: formatApiError(err),
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("studymind_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}