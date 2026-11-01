import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ brand */

export function Logo({ as = 'span', className, mark = true }: { as?: 'span' | 'div'; className?: string; mark?: boolean }) {
  const content = (
    <>
      {mark && (
        <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0" aria-hidden="true">
          <path d="M2 14.5 7.4 7l4.3 5.4L16 8l6 6.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M12 17v5M9.5 19.5h5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity=".55" />
        </svg>
      )}
      <span className="display text-[20px] leading-none tracking-[-0.01em]">GramHealth</span>
    </>
  );
  const Wrapper = as === 'div' ? 'div' : 'span';
  return <Wrapper className={cn('inline-flex items-center gap-2.5', className)}>{content}</Wrapper>;
}

/* ----------------------------------------------------------------- motion */

/** Arrival, not decoration: content settles into its final place once, then stays put. */
export function Reveal({ children, delay = 0, y = 10, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay, ease: [0.16, 0.84, 0.28, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Counts move in tabular figures so a ticking ledger never reflows the page. */
export function Counter({ value, prefix = '', suffix = '', className }: { value: number; prefix?: string; suffix?: string; className?: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reduced) { setShown(value); from.current = value; return; }
    const origin = from.current;
    const delta = value - origin;
    if (delta === 0) { setShown(value); return; }
    const start = performance.now();
    let frame = 0;
    const settle = () => { from.current = value; setShown(value); };
    const tick = (now: number) => {
      const t = Math.min((now - start) / 520, 1);
      if (t >= 1) { settle(); return; }
      setShown(Math.round(origin + delta * (1 - Math.pow(1 - t, 3))));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // An occluded tab gets no animation frames at all, and a ledger stuck on an old number is
    // a wrong number. A timer still runs there, so the count is guaranteed to land on the truth.
    const timer = setTimeout(settle, 620);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [value, reduced]);

  return (
    <span className={cn('font-mono tabular-nums', className)} data-numeric="tabular">
      {prefix}{shown.toLocaleString('en-IN')}{suffix}
    </span>
  );
}

/* ---------------------------------------------------------------- surface */

export function Panel({
  title,
  eyebrow,
  action,
  note,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  note?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('panel p-5 sm:p-6', className)}>
      {(title || eyebrow || action) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <p className="label mb-1.5">{eyebrow}</p>}
            {title && <h2 className="display text-[22px] leading-tight sm:text-[26px]">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
      {note && <p className="mt-5 border-t pt-4 text-[13px] leading-relaxed text-muted-foreground">{note}</p>}
    </section>
  );
}

/** A headline plus its subhead, used once per section and never repeated inside a card. */
export function SectionTitle({ index, title, lede, className }: { index?: string; title: ReactNode; lede?: ReactNode; className?: string }) {
  return (
    <div className={cn('max-w-3xl', className)}>
      {index && <p className="label mb-3">{index}</p>}
      <h2 className="display text-section">{title}</h2>
      {lede && <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">{lede}</p>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  to,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'role' | 'queued' | 'synced' | 'alert';
  to?: string;
  icon?: ReactNode;
}) {
  const tones = {
    default: 'bg-card',
    role: 'bg-role text-primary-foreground',
    queued: 'bg-queued/10',
    synced: 'bg-synced/15',
    alert: 'bg-alert/10',
  };
  const inner = (
    <div className={cn('flex h-full flex-col justify-between gap-6 rounded-lg border p-5 text-left transition', tones[tone], tone === 'default' && 'bg-card', to && 'hover:border-role/40')}>
      <div className="flex items-start justify-between gap-3">
        <p className={cn('label', tone === 'role' && 'text-primary-foreground/80')}>{label}</p>
        {icon && <span className={cn('shrink-0', tone === 'role' ? 'text-primary-foreground/90' : 'text-role')}>{icon}</span>}
      </div>
      <div>
        <p className={cn('display text-[34px] leading-none tracking-[-0.01em]', tone === 'role' && 'text-primary-foreground')} data-numeric="tabular">{value}</p>
        {hint && <p className={cn('mt-2 text-[13px] leading-snug', tone === 'role' ? 'text-primary-foreground/85' : 'text-muted-foreground')}>{hint}</p>}
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block h-full">
      {inner}
    </Link>
  ) : (
    <div className="h-full">{inner}</div>
  );
}

const chipTones = {
  neutral: 'bg-muted text-muted-foreground',
  good: 'bg-synced/20 text-[hsl(96_40%_22%)]',
  warn: 'bg-queued/20 text-[hsl(32_78%_27%)]',
  bad: 'bg-alert/15 text-alert',
  role: 'bg-role/10 text-role',
  dark: 'bg-primary-foreground/10 text-primary-foreground/80',
};

export function Chip({ tone = 'neutral', children, className }: { tone?: keyof typeof chipTones; children: ReactNode; className?: string }) {
  return <span className={cn('chip', chipTones[tone], className)}>{children}</span>;
}

/** Single-line meter. Used for stock depth and coverage, never for decoration. */
export function Meter({ value, tone = 'role', className }: { value: number; tone?: 'role' | 'queued' | 'alert' | 'synced'; className?: string }) {
  const fills = { role: 'bg-role', queued: 'bg-queued', alert: 'bg-alert', synced: 'bg-synced' };
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fills[tone])} style={{ width: `${Math.max(2, Math.min(value, 100))}%` }} />
    </div>
  );
}

export function Initials({ name, className }: { name: string; className?: string }) {
  const letters = name.replace('Dr. ', '').split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-role/10 font-mono text-[13px] font-medium text-role', className)}>
      {letters}
    </span>
  );
}

/** A row label/value pair, the shape used by every table on the site. */
export function Row({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b py-3.5 last:border-0', className)}>
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-[15px] font-medium">{children}</span>
    </div>
  );
}

export function EmptyState({ title, body, action, className }: { title: string; body: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-dashed px-6 py-10 text-center', className)}>
      <p className="display text-[19px]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Where a panel would show a number the platform does not actually collect. */
export function NotConnected({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/70 p-5">
      <p className="label mb-2 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        Not connected
      </p>
      <p className="text-[14px] leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
