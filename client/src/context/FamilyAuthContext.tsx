import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, setToken, clearToken, hasToken, FamilyUser } from '../api/family';

interface FamilyAuthContextType {
  user: FamilyUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const FamilyAuthContext = createContext<FamilyAuthContextType>(null!);

export function FamilyAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FamilyUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasToken()) { setLoading(false); return; }
    auth.me()
      .then(d => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const data = await auth.login(username, password);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    await auth.logout().catch(() => {});
    clearToken();
    setUser(null);
  }

  async function refreshUser() {
    const data = await auth.me();
    setUser(data.user);
  }

  return (
    <FamilyAuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </FamilyAuthContext.Provider>
  );
}

export function useFamilyAuth() {
  return useContext(FamilyAuthContext);
}
