import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFromStorage, saveToStorage, type Lang } from '@/lib/utils';
import { logoutSession, refreshSession, type SessionResponse } from '@/lib/api';

export type Role = 'patient' | 'doctor' | 'admin' | 'seller';

export const workspacePath: Record<Role, string> = {
  patient: '/patient',
  doctor: '/doctor',
  admin: '/admin',
  seller: '/pharmacy',
};

interface SessionContextValue {
  status: 'booting' | 'anonymous' | 'authenticated';
  role: Role | null;
  phone: string | null;
  roles: string[];
  /** Only the patient path is translated; clinical text stays in the language it was written in. */
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Called by the sign-in route once the API has issued a session. */
  signIn: (role: Role, phone: string) => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionContextValue['status']>('booting');
  const [role, setRole] = useState<Role | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [lang, setLangState] = useState<Lang>(() => (getFromStorage('lang') as Lang) || 'en');

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((session: SessionResponse) => {
        if (!active) return;
        const stored = getFromStorage('userRole') as Role | null;
        const next = stored && session.roles?.includes(stored) ? stored : (session.roles?.[0] as Role | undefined);
        setPhone(session.user.phone ?? session.user.email ?? null);
        setRoles(session.roles ?? []);
        if (next) {
          setRole(next);
          saveToStorage('userRole', next);
          setStatus('authenticated');
        } else {
          setStatus('anonymous');
        }
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('userRole');
        setStatus('anonymous');
      });
    return () => { active = false; };
  }, []);

  const signIn = useCallback((nextRole: Role, nextPhone: string) => {
    saveToStorage('userRole', nextRole);
    setRole(nextRole);
    setPhone(nextPhone);
    setRoles([nextRole]);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    await logoutSession().catch(() => undefined);
    localStorage.removeItem('userRole');
    setRole(null);
    setPhone(null);
    setRoles([]);
    setStatus('anonymous');
  }, []);

  const setLang = useCallback((next: Lang) => {
    saveToStorage('lang', next);
    setLangState(next);
  }, []);

  const value = useMemo(() => ({ status, role, phone, roles, lang, setLang, signIn, signOut }), [status, role, phone, roles, lang, setLang, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}

/** Sends an unauthenticated visitor to the sign-in route, remembering where they were headed. */
export function RequireWorkspace({ role, children }: { role: Role; children: ReactNode }) {
  const { status, role: current } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'anonymous') navigate('/login', { replace: true });
    if (status === 'authenticated' && current && current !== role) navigate(workspacePath[current], { replace: true });
  }, [status, current, role, navigate]);

  if (status !== 'authenticated' || current !== role) return null;
  return <>{children}</>;
}
