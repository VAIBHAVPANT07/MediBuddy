import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Logo } from '@/components/ui-kit';
import { SyncRail } from '@/components/sync-ledger';
import { useSession, type Role } from '@/lib/session';
import { cn } from '@/lib/utils';

/** Warm, low-chroma accents: a different desk in the same building, not a different product. */
export const roleAccent: Record<Role, string> = {
  patient: '100 22% 23%',
  doctor: '40 55% 26%',
  admin: '16 55% 29%',
  seller: '172 24% 26%',
};

export interface WorkspaceNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface WorkspaceProps {
  role: Role;
  workspaceName: string;
  nav: WorkspaceNavItem[];
  /** Short line under the workspace name, different for each portal. */
  brief: string;
}

export function Workspace({ role, workspaceName, nav, brief }: WorkspaceProps) {
  const { phone, signOut } = useSession();
  const location = useLocation();
  const reduced = useReducedMotion();

  // Every route change starts at the top of the column, and the new panel settles in rather
  // than cutting.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, [location.pathname, reduced]);

  const masked = phone ? `+91 ${phone.slice(-10, -7)} ${phone.slice(-7, -4)} ${phone.slice(-4)}` : 'Demo account';

  return (
    <div className="min-h-screen bg-background" style={{ '--role': roleAccent[role] } as CSSProperties}>
      <a href="#workspace-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-primary-foreground">
        Skip to workspace
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden h-5 w-px bg-line sm:block" />
            <span className="hidden text-[13px] text-muted-foreground sm:block">{workspaceName}</span>
          </div>
          <div className="flex items-center gap-2">
            <SyncRail />
            <div className="hidden items-center gap-2.5 rounded-lg border px-3 py-2 md:flex">
              <span className="h-2 w-2 rounded-full bg-role" />
              <span className="font-mono text-[12px]">{masked}</span>
            </div>
            <button
              onClick={() => void signOut()}
              aria-label="Log out of GramHealth"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition hover:border-alert/50 hover:bg-alert/10 hover:text-alert"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[236px_1fr] lg:py-10">
        <nav aria-label={`${workspaceName} sections`} className="min-w-0 lg:sticky lg:top-[73px] lg:self-start">
          <p className="label mb-3 hidden lg:block">{brief}</p>
          <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:px-0 lg:pb-0">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <li key={to} className="shrink-0 lg:shrink">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium whitespace-nowrap transition',
                      isActive ? 'bg-role text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-role')} />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main id="workspace-main" className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.26, ease: [0.16, 0.84, 0.28, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/** Standard page opener inside a workspace: one h1, one line of context, then the panels. */
export function PageHead({ title, lede, actions }: { title: ReactNode; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] leading-[1.06] tracking-[-0.015em] sm:text-[42px]">{title}</h1>
        {lede && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
