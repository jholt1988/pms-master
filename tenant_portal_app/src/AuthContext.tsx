import React, { createContext, useContext, useEffect, useMemo, useState, startTransition } from 'react';
import { jwtDecode } from 'jwt-decode';

type JwtPayload = {
  sub?: number;
  username?: string;
  role?: 'TENANT' | 'PROPERTY_MANAGER' | string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

interface AuthContextValue {
  token: string | null;
  user: JwtPayload | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Check if a JWT token is expired or will expire soon
 * @param token - JWT token string
 * @returns true if token is expired or will expire within 60 seconds
 */
const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    if (!decoded.exp) return false;
    
    // Check if token expires in next 60 seconds (buffer for clock skew)
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const bufferTime = 60 * 1000; // 60 second buffer
    
    return expirationTime - currentTime < bufferTime;
  } catch {
    return true; // Treat invalid tokens as expired
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      const storedToken = localStorage.getItem('token');
      if (storedToken && !isTokenExpired(storedToken)) {
        return storedToken;
      }
      // Remove expired token
      localStorage.removeItem('token');
      return null;
    } catch {
      localStorage.removeItem('token');
      return null;
    }
  });

  const [user, setUser] = useState<JwtPayload | null>(() => {
    try {
      const storedToken = localStorage.getItem('token');
      if (storedToken && !isTokenExpired(storedToken)) {
        return jwtDecode<JwtPayload>(storedToken);
      }
      localStorage.removeItem('token');
    } catch {
      localStorage.removeItem('token');
    }
    return null;
  });

  // Handle token changes and validation
  useEffect(() => {
    if (token) {
      try {
        // Validate token is not expired
        if (isTokenExpired(token)) {
          console.warn('Token is expired, logging out');
          localStorage.removeItem('token');
          // Use startTransition to defer state updates and avoid cascading renders
          startTransition(() => {
            setToken(null);
            setUser(null);
          });
          return;
        }

        localStorage.setItem('token', token);
        const decoded = jwtDecode<JwtPayload>(token);
        // Use startTransition to defer state update and avoid cascading renders
        startTransition(() => {
          setUser(decoded);
        });
      } catch (error) {
        console.error('Failed to decode auth token', error);
        localStorage.removeItem('token');
        // Use startTransition to defer state updates and avoid cascading renders
        startTransition(() => {
          setToken(null);
          setUser(null);
        });
      }
    } else {
      localStorage.removeItem('token');
      // Use startTransition to defer state update and avoid cascading renders
      startTransition(() => {
        setUser(null);
      });
    }
  }, [token]);

  // Auto-logout when token expires
  useEffect(() => {
    if (!token) return;
    
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      if (!decoded.exp) return;
      
      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      if (timeUntilExpiry > 0) {
        const timer = setTimeout(() => {
          console.warn('Token expired, auto-logout');
          setToken(null);
        }, timeUntilExpiry);
        
        return () => clearTimeout(timer);
      } else {
        // Token already expired - use startTransition to defer state update
        startTransition(() => {
          setToken(null);
        });
      }
    } catch (error) {
      console.error('Error setting up token expiration timer', error);
    }
  }, [token]);

  const login = (newToken: string) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      login,
      logout,
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
