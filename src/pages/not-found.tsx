import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Compass } from 'lucide-react';
import { Logo } from '@/components/ui-kit';
import { useSession } from '@/lib/session';

const doors = [
  { to: '/', label: 'The story', hint: 'Why this platform exists' },
  { to: '/login', label: 'Sign in', hint: 'Patient, doctor, pharmacy, district' },
];

export default function NotFound() {
  const reduced = useReducedMotion();
  const { status, role } = useSession();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" aria-label="GramHealth home">
          <Logo />
        </Link>
        {status === 'authenticated' && (
          <Link to={role === 'patient' ? '/patient' : role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/pharmacy'} className="text-[14px] font-medium text-role hover:underline">
            My workspace
          </Link>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="label mb-6">Off the map</p>
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 0.84, 0.28, 1] }}
          className="display text-[110px] leading-[0.82] tracking-[-0.05em] text-ink sm:text-[160px]"
        >
          404
        </motion.p>
        <h1 className="display mt-8 max-w-xl text-[30px] leading-[1.1] tracking-[-0.03em] sm:text-[38px]">
          There is no path here. <span className="text-muted-foreground">The record you wanted may be in a different workspace.</span>
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
          Links inside a workspace are scoped to your role, so an address that worked for a doctor will not resolve for
          a patient. Start from one of these instead.
        </p>

        <ul className="mt-10 max-w-xl divide-y border-y">
          {doors.map(({ to, label, hint }) => (
            <li key={to}>
              <Link to={to} className="group flex items-center gap-4 py-4 transition hover:text-role">
                <Compass className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-role" />
                <span className="text-[15px] font-medium">{label}</span>
                <span className="hidden text-[13px] text-muted-foreground sm:inline">{hint}</span>
                <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:text-role" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
