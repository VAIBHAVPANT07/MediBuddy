import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export const roleColors = {
  patient: '152 58% 30%',
  doctor: '226 70% 52%',
  admin: '18 82% 50%',
  seller: '258 60% 58%',
} as const;

export type Role = keyof typeof roleColors;

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-display text-2xl leading-none tracking-tight', className)}>
      <span className="relative grid h-7 w-7 place-items-center rounded-full bg-current">
        <span className="absolute h-3 w-0.5 bg-background" />
        <span className="absolute h-0.5 w-3 bg-background" />
      </span>
      MediBuddy
    </span>
  );
}

interface NavItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface PortalShellProps {
  role: Role;
  portalName: string;
  title: ReactNode;
  subtitle?: ReactNode;
  user: string;
  nav: NavItem[];
  defaultValue: string;
  onLogout: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export function PortalShell({ role, portalName, title, subtitle, user, nav, defaultValue, onLogout, headerExtra, children }: PortalShellProps) {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Tabs
      defaultValue={defaultValue}
      orientation="vertical"
      style={{ '--role': roleColors[role] } as CSSProperties}
      className="min-h-screen bg-background lg:grid lg:grid-cols-[272px_1fr]"
    >
      <aside className="grain sticky top-0 z-30 bg-ink text-[hsl(42_30%_94%)] lg:h-screen">
        <div className="flex h-full flex-col gap-4 p-4 lg:gap-10 lg:p-6">
          <div className="flex items-center justify-between">
            <Logo />
            <button onClick={onLogout} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden lg:block">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">Workspace</p>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3">
              <span className="h-2.5 w-2.5 rounded-full bg-role shadow-[0_0_0_4px_hsl(var(--role)/0.25)]" />
              <span className="text-sm font-medium">{portalName}</span>
            </div>
          </div>

          <TabsList className="-mx-1 flex h-auto justify-start gap-1 overflow-x-auto bg-transparent p-1 text-white/60 lg:mx-0 lg:flex-col lg:items-stretch lg:overflow-visible lg:p-0">
            {nav.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="group shrink-0 justify-start gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors hover:bg-white/[0.06] hover:text-white data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-none"
              >
                <Icon className="h-[18px] w-[18px] opacity-70 group-data-[state=active]:text-role group-data-[state=active]:opacity-100" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-auto hidden rounded-2xl border border-white/10 p-4 lg:block">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-role font-display text-lg text-white">{user.slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Signed in</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 py-2 text-sm text-white/70 transition hover:bg-white hover:text-ink"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 pb-16 pt-8 sm:px-8 lg:px-12 lg:pt-12">
        <header className="rise mb-10 flex flex-col gap-6 border-b pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-role" />
              {portalName} — {today}
            </p>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">{title}</h1>
            {subtitle && <p className="mt-4 max-w-xl text-muted-foreground">{subtitle}</p>}
          </div>
          {headerExtra && <div className="flex items-center gap-3">{headerExtra}</div>}
        </header>
        <div className="rise [animation-delay:120ms]">{children}</div>
      </main>
    </Tabs>
  );
}

interface PanelProps {
  title?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, eyebrow, action, className, children }: PanelProps) {
  return (
    <section className={cn('rounded-[28px] border bg-card p-6 md:p-8', className)}>
      {(title || eyebrow || action) && (
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
            {title && <h2 className="font-display text-3xl leading-none tracking-tight">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  accent?: boolean;
}

export function Stat({ label, value, hint, icon: Icon, accent }: StatProps) {
  return (
    <div
      className={cn(
        'flex min-h-[168px] flex-col justify-between rounded-[28px] border p-6 transition-transform hover:-translate-y-0.5',
        accent ? 'grain border-transparent bg-role text-white' : 'bg-card'
      )}
    >
      <div className="flex items-start justify-between">
        <p className={cn('eyebrow', accent && 'text-white/70')}>{label}</p>
        <span className={cn('grid h-9 w-9 place-items-center rounded-full', accent ? 'bg-white/15' : 'bg-role/10 text-role')}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div>
        <p className="font-display text-5xl leading-none tracking-tight">{value}</p>
        {hint && <p className={cn('mt-2 text-sm', accent ? 'text-white/75' : 'text-muted-foreground')}>{hint}</p>}
      </div>
    </div>
  );
}

export function Meter({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className="h-full rounded-full bg-role transition-[width] duration-700" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

export function Pill({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'role'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-muted text-foreground/70',
    good: 'bg-emerald-600/10 text-emerald-700',
    warn: 'bg-amber-500/15 text-amber-700',
    bad: 'bg-red-600/10 text-red-700',
    role: 'bg-role/10 text-role',
  };
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider', tones[tone])}>{children}</span>;
}

export function Initials({ name }: { name: string }) {
  const letters = name.replace('Dr. ', '').split(' ').map((w) => w[0]).join('').slice(0, 2);
  return <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-role/10 font-display text-lg text-role">{letters}</span>;
}
