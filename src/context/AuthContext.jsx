/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { joinSocketPresence } from '../lib/socket';

const AuthContext = createContext();
const storageKey = 'courier_auth';

function normalizeAuth(payload) {
  if (!payload) return null;

  const profile = payload.profile || payload.user || payload.data || payload;

  if (!payload.token && !payload.user && !payload.profile && !payload.data) {
    return null;
  }

  return {
    token: payload.token,
    ...profile,
  };
}

function readStoredAuth() {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? normalizeAuth(JSON.parse(stored)) : null;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readStoredAuth());
  const [authReady, setAuthReady] = useState(false);

  const persistUser = useCallback((nextUser) => {
    setUser(nextUser);

    if (nextUser) {
      localStorage.setItem(storageKey, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, []);

  const login = useCallback((payload) => {
    const normalized = normalizeAuth(payload);
    persistUser(normalized);
    setAuthReady(true);
  }, [persistUser]);

  const logout = useCallback(() => {
    persistUser(null);
    setAuthReady(true);
  }, [persistUser]);

  const updateUser = useCallback((profile) => {
    setUser((current) => {
      const nextUser = current ? { ...current, ...profile } : null;

      if (nextUser) {
        localStorage.setItem(storageKey, JSON.stringify(nextUser));
      } else {
        localStorage.removeItem(storageKey);
      }

      return nextUser;
    });
  }, []);

  const refreshUser = useCallback(async (tokenOverride) => {
    const activeToken = tokenOverride || user?.token || readStoredAuth()?.token;
    if (!activeToken) {
      return null;
    }

    const response = await api.get('/api/auth/me', { token: activeToken });
    const nextUser = { token: activeToken, ...response.data };
    persistUser(nextUser);
    return nextUser;
  }, [persistUser, user?.token]);

  useEffect(() => {
    let active = true;
    const storedAuth = readStoredAuth();

    const bootstrap = async () => {
      if (!storedAuth?.token) {
        if (active) setAuthReady(true);
        return;
      }

      try {
        await refreshUser(storedAuth.token);
      } catch {
        persistUser(null);
      } finally {
        if (active) setAuthReady(true);
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [persistUser, refreshUser]);

  useEffect(() => {
    if (!user?.token) return;
    joinSocketPresence(user);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      updateUser,
      refreshUser,
      authReady,
      isAuthenticated: Boolean(user?.token),
    }),
    [authReady, login, logout, refreshUser, updateUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
