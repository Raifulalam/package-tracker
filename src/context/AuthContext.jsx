/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext();

function normalizeAuth(payload) {
  if (!payload) return null;

  const profile = payload.profile || payload.user || payload;

  if (!payload.token && !payload.user && !payload.profile) {
    return null;
  }

  return {
    token: payload.token,
    ...profile,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('courier_auth');
    return stored ? normalizeAuth(JSON.parse(stored)) : null;
  });

  const login = (payload) => {
    const normalized = normalizeAuth(payload);
    setUser(normalized);
    localStorage.setItem('courier_auth', JSON.stringify(normalized));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('courier_auth');
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAuthenticated: Boolean(user?.token),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
