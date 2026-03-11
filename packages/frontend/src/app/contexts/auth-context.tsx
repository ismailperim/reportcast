import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  creditsRemaining: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('reportcast_token');
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const userData = await api.getMe();
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        plan: userData.plan,
        creditsRemaining: userData.creditsRemaining,
      });
    } catch (error) {
      // Token might be invalid, clear it
      localStorage.removeItem('reportcast_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    localStorage.setItem('reportcast_token', response.token);
    setUser(response.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await api.register(email, password, name);
    localStorage.setItem('reportcast_token', response.token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('reportcast_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
