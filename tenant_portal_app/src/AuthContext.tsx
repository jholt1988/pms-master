import React, { createContext, useContext, useEffect, useMemo, useState, startTransition } from 'react';
import { jwtDecode } from 'jwt-decode';

type JwtPayload = {
  sub?: number;
  username?: string;
  role?: 'TENANT' | 'PM' | 'PROPERTY_MANAGER' | 'OWNER' | 'ADMIN' | 'OPERATOR' | string;
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

const storage = {
  getItem(key: string): string | null {
    try {
      const getter = globalThis?.localStorage?.getItem;
      return typeof getter === 'function' ? getter.call(globalThis.localStorage, key) : null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      const setter = globalThis?.localStorage?.setItem;
      if (typeof setter === 'function') setter.call(globalThis.localStorage, key, value);
    } catch {
      // no-op for non-browser/test environments
    }
  },
  removeItem(key: string): void {
    try {
      const remover = globalThis?.localStorage?.removeItem;
      if (typeof remover === 'function') remover.call(globalThis.localStorage, key);
    } catch {
      // no-op for non-browser/test environments
    }
  },
};

/**
 * Check if a JWT token is expired or will expire soon
 * @param token - JWT token string
 * @returns true if token is expired or will expire within 60 seconds
 */
const normalizeRole = (role: unknown): JwtPayload['role'] => {
  if (role === 'PM') return 'PROPERTY_MANAGER';
  return typeof role === 'string' ? role : undefined;
};

const decodeToken = (token: string): JwtPayload => {
  const decoded = jwtDecode<JwtPayload>(token);
  return {
    ...decoded,
    role: normalizeRole(decoded.role),
  };
};

const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
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
      const storedToken = storage.getItem('token');
      if (storedToken && !isTokenExpired(storedToken)) {
        return storedToken;
      }
      // Remove expired token
      storage.removeItem('token');
      return null;
    } catch {
      storage.removeItem('token');
      return null;
    }
  });

  const [user, setUser] = useState<JwtPayload | null>(() => {
    try {
      const storedToken = storage.getItem('token');
      if (storedToken && !isTokenExpired(storedToken)) {
        return decodeToken(storedToken);
      }
      storage.removeItem('token');
    } catch {
      storage.removeItem('token');
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
          storage.removeItem('token');
          // Use startTransition to defer state updates and avoid cascading renders
          startTransition(() => {
            setToken(null);
            setUser(null);
          });
          return;
        }

        storage.setItem('token', token);
        const decoded = decodeToken(token);
        // Use startTransition to defer state update and avoid cascading renders
        startTransition(() => {
          setUser(decoded);
        });
      } catch (error) {
        console.error('Failed to decode auth token', error);
        storage.removeItem('token');
        // Use startTransition to defer state updates and avoid cascading renders
        startTransition(() => {
          setToken(null);
          setUser(null);
        });
      }
    } else {
      storage.removeItem('token');
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
      const decoded = decodeToken(token);
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
