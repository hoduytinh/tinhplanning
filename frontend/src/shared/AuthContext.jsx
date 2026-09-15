import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as authApi from "../modules/auth/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Nạp thông tin user hiện tại khi có access token lúc khởi động.
  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!authApi.getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.fetchMe();
        if (active) setUser(me);
      } catch {
        authApi.clearTokens();
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await authApi.login(username, password);
    // /auth/login trả kèm user rút gọn; lấy đầy đủ qua /auth/me.
    const me = await authApi.fetchMe();
    setUser(me);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authApi.fetchMe();
    setUser(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, setUser, refreshUser }),
    [user, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
