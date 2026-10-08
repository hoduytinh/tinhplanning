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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      const retryDelays = [0, 800, 1500, 2500];
      for (let attempt = 0; active && attempt < retryDelays.length; attempt += 1) {
        if (retryDelays[attempt] > 0) {
          await sleep(retryDelays[attempt]);
        }
        try {
          const me = await authApi.fetchMe();
          if (active) setUser(me);
          if (active) setLoading(false);
          return;
        } catch (error) {
          if (error?.status === 401 || error?.status === 403) {
            authApi.clearTokens();
            if (active) setUser(null);
            if (active) setLoading(false);
            return;
          }
          if (!error?.isTransient && attempt === retryDelays.length - 1) {
            if (active) setUser(null);
            if (active) setLoading(false);
            return;
          }
        }
      }
      if (active) setLoading(false);
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await authApi.login(username, password);
    // /auth/login trả kèm user rút gọn; lấy đầy đủ qua /auth/me.
    try {
      const me = await authApi.fetchMe();
      setUser(me);
    } catch (error) {
      if (data?.user) {
        setUser(data.user);
      } else {
        throw error;
      }
    }
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
