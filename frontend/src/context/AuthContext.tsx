import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { fetchMe } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Hardcoded bypass for authentication
  const [user, setUser] = useState<User | null>({ id: 1, username: 'admin', email: 'admin@example.com' });
  const [token, setToken] = useState<string | null>('dummy_token');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // No-op for loadUser since we are bypassing auth
    setLoading(false);
  }, [token]);

  const login = (newToken: string) => {
    setToken(newToken);
  };

  const logout = () => {
    // No-op
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
