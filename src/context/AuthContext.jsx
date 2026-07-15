import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem('panjuintext_admin');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('panjuintext_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => setAdmin(res.data.data))
      .catch(() => {
        localStorage.removeItem('panjuintext_token');
        localStorage.removeItem('panjuintext_admin');
        setAdmin(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    const { token, admin: adminData } = res.data.data;
    localStorage.setItem('panjuintext_token', token);
    localStorage.setItem('panjuintext_admin', JSON.stringify(adminData));
    setAdmin(adminData);
    return adminData;
  };

  const logout = () => {
    localStorage.removeItem('panjuintext_token');
    localStorage.removeItem('panjuintext_admin');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
