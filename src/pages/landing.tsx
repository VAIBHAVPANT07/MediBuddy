import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, Landmark, Pill, Radio, ShieldCheck, Sparkles, Stethoscope, Store, Users, WifiOff } from 'lucide-react';
import { Chip, Counter, Logo, Reveal, SectionTitle } from '@/components/ui-kit';
import { Ridgeline } from '@/components/ridgeline';
import { SyncLedger } from '@/components/sync-ledger';
import { useSession, type Role } from '@/lib/session';
import { useSync } from '@/lib/sync';
import { VILLAGES, cn } from '@/lib/utils';
import { getApiHealth, type ApiHealth } from '@/lib/api';

const doors: { role: Role; to: string; title: string; line: string; points: string[]; icon: typeof Users }[] = [
  {
    role: 'patient',
    to: '/login?role=patient',
    title: 'Patient',
    line: 'Find out what to do, book it, and keep the record.',
    points: ['Symptom guidance that never guesses a diagnosis', 'Appointment requests the doctor confirms', 'Visits, prescriptions and vaccinations in one timeline'],
    icon: Users,
  },
  {
    role: 'doctor',
    to: '/login?role=doctor',
    title: 'Doctor',
    line: 'Run the queue, read the history, sign the prescription.',
    points: ['Requests in the order patients made them', 'Every record read is written to the audit log', 'Prescriptions land on the patient timeline'],
    icon: Stethoscope,
  },
  {
    role: 'seller',
    to: '/login?role=seller',
    title: 'Pharmacy',
    line: 'Publish what is actually on the shelf.',
    points: ['Stock depth and reorder thresholds', 'Category value from your own entries', 'The same numbers patients search against'],
    icon: Store,
  },
  {
    role: 'admin',
    to: '/login?role=admin',
    title: 'District',
    line: 'See the load, never the person.',
    points: ['Aggregated condition groups by community', 'Groups under five people are suppressed', 'Server and connectivity status in one place'],
    icon: Landmark,
  },
];

const truthTable: { term: string; tone: 'good' | 'warn'; body: string }[] = [
  { term: 'Real in this build', tone: 'good', body: 'Accounts, sessions and roles. Appointments with a confirm, move and cancel path. Prescription writes onto a patient record. Pharmacy stock that patients search. An audit row for every record read or written, inside the same database transaction.' },
  { term: 'Synthetic', tone: 'warn', body: 'The people. Records come from a Synthea sample remapped onto five Uttarakhand community names. It exercises the code and proves the counts add up. It is not evidence about any real disease burden.' },
  { term: 'Guidance, not diagnosis', tone: 'good', body: 'The symptom screen sorts a description into urgency and a next step. It never prescribes, never names a dose, and always offers 112 and 108.' },
  { term: 'Not connected', tone: 'warn', body: 'Ambulance dispatch, a live video provider, the on-device store that survives a real shutdown, file storage for reports, and the pharmacy dispensing queue. Each of these says so where it would otherwise appear.' },
];

/** Line-mask reveal: the headline is built once, and each line arrives under its own clip. */
function HeroTitle() {
  const reduced = useReducedMotion();
  const lines = ['Care that holds', 'when the signal', 'does not.'];
  return (
    <h1 className="display text-hero">
      {lines.map((line, index) => (
        <span key={line} className="block overflow-hidden">
          <motion.span
            className={cn('block', index === 2 && 'text-[hsl(43_74%_70%)]')}
            initial={reduced ? false : { y: '105%' }}
            animate={reduced ? undefined : { y: 0 }}
            transition={{ duration: 0.72, delay: 0.08 + index * 0.09, ease: [0.16, 0.84, 0.28, 1] }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

function LiveTicker() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  useEffect(() => {
    getApiHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  const cells = [
    { label: 'API', value: health ? 'reachable' : 'offline', tone: health ? 'text-synced' : 'text-queued' },
    { label: 'sample patients', value: health?.data?.patients?.toLocaleString('en-IN') ?? '—', tone: 'text-primary-foreground' },
    { label: 'appointments', value: health?.data?.appointments?.toLocaleString('en-IN') ?? '—', tone: 'text-primary-foreground' },
    { label: 'communities', value: String(VILLAGES.length), tone: 'text-primary-foreground' },
  ];

  return (
    <div className="band mt-14 overflow-hidden rounded-[var(--radius-panel)]">
      <dl className="grid gap-px bg-primary-foreground/10 sm:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.label} className="bg-ink px-5 py-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary-foreground/70">{cell.label}</dt>
            <dd className={cn('display mt-2 text-[22px] leading-none', cell.tone)}>{cell.value}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-primary-foreground/10 px-5 py-3 text-[12px] text-primary-foreground/70">
        Counts are read live from this installation’s own database and hold a synthetic sample, not Uttarakhand health data.
      </p>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { status } = useSession();
  const { online, queued } = useSync();
  const reduced = useReducedMotion();
  const storyRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: storyRef, offset: ['start end', 'end start'] });
  const beam = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  // The header sits on the dark hero and only takes on the cream ground once the page moves.
  const [lifted, setLifted] = useState(false);
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>

      <header
        className={cn(
          'sticky top-0 z-40 border-b transition-colors duration-300',
          lifted ? 'border-line bg-background/85 backdrop-blur-md' : 'border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link to="/" aria-label="GramHealth home">
            <Logo className={cn(!lifted && 'text-primary-foreground')} />
          </Link>
          <nav aria-label="Sections" className={cn('hidden items-center gap-7 text-[14px] transition-colors md:flex', lifted ? 'text-muted-foreground' : 'text-primary-foreground/65')}>
            <a href="#doors" className={cn('transition', lifted ? 'hover:text-foreground' : 'hover:text-primary-foreground')}>Workspaces</a>
            <a href="#offline" className={cn('transition', lifted ? 'hover:text-foreground' : 'hover:text-primary-foreground')}>Offline</a>
            <a href="#truth" className={cn('transition', lifted ? 'hover:text-foreground' : 'hover:text-primary-foreground')}>What is real</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to={status === 'authenticated' ? '/patient' : '/login'}
              className={cn(
                'inline-flex items-center gap-2 rounded-[var(--radius)] px-4 py-2.5 text-[14px] font-medium transition',
                lifted
                  ? 'bg-role text-primary-foreground hover:bg-role/90'
                  : 'border border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground hover:text-ink',
              )}
            >
              {status === 'authenticated' ? 'Open workspace' : 'Sign in'}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero: the claim, on the ground the product is built for. */}
        <section className="relative -mt-[68px] overflow-hidden bg-[hsl(100_24%_11%)] pt-[68px]">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(60%_80%_at_72%_18%,hsl(43_72%_58%_/_0.22),transparent_70%)]"
          />
          <Ridgeline />
          <div className="contour absolute inset-0 opacity-[0.14]" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-[1320px] gap-14 px-4 pb-24 pt-28 sm:px-6 lg:grid-cols-[1.06fr_1fr] lg:pb-28 lg:pt-36">
            <div className="flex flex-col justify-center text-primary-foreground">
              <p className="label mb-6 flex items-center gap-3 text-primary-foreground/55">
                <span className="h-px w-10 bg-[hsl(43_74%_70%)]" />
                Primary care · village Uttarakhand
              </p>
              <HeroTitle />
              <motion.p
                className="mt-8 max-w-xl text-[17px] leading-relaxed text-primary-foreground/70"
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.42 }}
              >
                GramHealth runs the village end of primary care: symptom guidance, appointments, records,
                pharmacy stock and district counts. When the signal drops, the work does not stop; it waits
                in a queue and dispatches when the link returns.
              </motion.p>
              <motion.div
                className="mt-10 flex flex-wrap gap-3"
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.52 }}
              >
                <Link to="/login?role=patient" className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[hsl(43_62%_54%)] px-6 py-3.5 text-[15px] font-medium text-ink transition hover:bg-[hsl(43_66%_62%)]">
                  Get care now <ArrowUpRight className="h-4 w-4" />
                </Link>
                <a href="#doors" className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-primary-foreground/30 px-6 py-3.5 text-[15px] font-medium transition hover:bg-primary-foreground hover:text-ink">
                  See the four workspaces
                </a>
              </motion.div>
              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px] text-primary-foreground/55">
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[hsl(43_74%_70%)]" /> Every record read is audited</span>
                <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[hsl(43_74%_70%)]" /> Guidance, never a diagnosis</span>
              </div>
            </div>

            <motion.div
              className="self-center"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <SyncLedger />
            </motion.div>
          </div>
        </section>

        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        <LiveTicker />

        {/* The frictions, stated plainly. */}
        <section className="py-20 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
            <SectionTitle
              index="What breaks first"
              title={<>A village clinic does not lose doctors. <span className="text-muted-foreground">It loses the line.</span></>}
              lede="The building stands, the medicines are in the cupboard, and the register is a paper book that only one person can read at a time."
            />
            <ul className="space-y-px overflow-hidden rounded-[var(--radius-panel)] border bg-line">
              {[
                { title: 'The record is a book', body: 'One register per sub-centre. Two villages away, the same patient is a stranger again.' },
                { title: 'Referral means a phone call', body: 'The block office is notified by voice, and the note arrives with the patient days later, if at all.' },
                { title: 'Stock is a guess', body: 'A patient travels to a pharmacy that may have run out on Tuesday and not written it down.' },
                { title: 'Reporting is re-typed', body: 'The district counts come from monthly paper returns, so by the time they arrive the moment has passed.' },
              ].map((item) => (
                <li key={item.title} className="bg-card px-6 py-5 transition hover:bg-muted/60">
                  <p className="text-[17px] font-medium">{item.title}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Four workspaces as an index list, not a card grid. */}
        <section id="doors" className="scroll-mt-24 border-t py-20 sm:py-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <SectionTitle index="Workspaces" title={<>Four doors, <span className="text-role">one record.</span></>} />
            <p className="max-w-xs text-[15px] leading-relaxed text-muted-foreground">
              Same data underneath, different rights on top. A pharmacy cannot read a clinical history; a doctor cannot open district counts.
            </p>
          </div>

          <ul className="border-t">
            {doors.map((door, index) => (
              <li key={door.role} className="border-b">
                <Link
                  to={door.to}
                  className="group relative flex items-start gap-5 py-7 transition sm:gap-8"
                  onClick={(event) => {
                    event.preventDefault();
                    navigate(door.to);
                  }}
                >
                  <span className="font-mono text-[13px] text-muted-foreground transition group-hover:text-primary-foreground/70">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                      <span className="display text-[clamp(1.9rem,4vw,2.9rem)] leading-none transition group-hover:text-primary-foreground">{door.title}</span>
                      <span className="text-[15px] text-muted-foreground transition group-hover:text-primary-foreground/75">{door.line}</span>
                    </span>
                    <span className="mt-0 grid grid-rows-[0fr] overflow-hidden transition-[grid-template-rows,margin] duration-400 ease-out group-hover:mt-5 group-hover:grid-rows-[1fr]">
                      <span className="min-h-0">
                        <span className="flex flex-wrap gap-x-6 gap-y-2">
                          {door.points.map((point) => (
                            <span key={point} className="flex items-center gap-2 text-[14px] text-primary-foreground/80">
                              <span className="h-1 w-1 rounded-full bg-primary-foreground/60" />
                              {point}
                            </span>
                          ))}
                        </span>
                      </span>
                    </span>
                  </span>
                  <door.icon className="hidden h-6 w-6 shrink-0 text-muted-foreground transition group-hover:text-primary-foreground sm:block" strokeWidth={1.4} />
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border transition group-hover:border-primary-foreground/40 group-hover:bg-primary-foreground group-hover:text-role">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                  <span className="pointer-events-none absolute inset-x-0 -inset-y-px -z-10 scale-y-[0.94] bg-role opacity-0 transition duration-400 ease-out group-hover:scale-y-100 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Offline story: a scroll-driven beam ties the three states together. */}
        <section id="offline" className="scroll-mt-24 border-t py-20 sm:py-24">
          <div ref={storyRef} className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionTitle
                index="Offline-first"
                title={<>Three states of <span className="text-role">one visit.</span></>}
                lede="The platform is honest about which part of care survives a blackout. The record does. A live video call does not, and never claims to."
              />
              <div className="mt-8 flex flex-wrap gap-2">
                <Chip tone={online ? 'good' : 'warn'}>{online ? <Radio className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />} {online ? 'linked' : 'holding locally'}</Chip>
                <Chip tone={queued > 0 ? 'warn' : 'neutral'}>{queued} queued</Chip>
              </div>
            </div>

            <ol className="relative space-y-6">
              <span aria-hidden="true" className="absolute inset-y-0 left-[19px] w-px bg-line" />
              <motion.span aria-hidden="true" className="absolute left-[17px] top-0 h-24 w-[5px] rounded-full bg-role" style={{ y: beam }} />
              {[
                { at: 'In the village', title: 'Written down once', body: 'The visit, the doses typed by the doctor and the stock count go into the local ledger with a time and an author. No server needed.', icon: Pill },
                { at: 'When a link appears', title: 'Dispatched in order', body: 'Records leave one at a time, oldest first, so the district timeline matches the order events actually happened in.', icon: Radio },
                { at: 'At the district server', title: 'Read by everyone else', body: 'The doctor sees the history, the pharmacy sees the same catalogue the patient searched, and the administrator sees counts with the small groups removed.', icon: Users },
              ].map((step) => (
                <Reveal key={step.title}>
                  <li className="relative rounded-[var(--radius-panel)] border bg-card p-6 pl-16">
                    <span className="absolute left-[7px] top-8 grid h-6 w-6 place-items-center rounded-full border-2 border-background bg-role">
                      <step.icon className="h-3 w-3 text-primary-foreground" />
                    </span>
                    <p className="label">{step.at}</p>
                    <h3 className="display mt-2 text-[24px] leading-tight">{step.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* What is real, because a health platform should say so. */}
        <section id="truth" className="scroll-mt-24 border-t py-20 sm:py-24">
          <SectionTitle index="What is real" title={<>Read this before you trust a number.</>} />
          <dl className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius-panel)] border bg-line sm:grid-cols-2">
            {truthTable.map((entry) => (
              <div key={entry.term} className="bg-card p-6">
                <dt><Chip tone={entry.tone}>{entry.term}</Chip></dt>
                <dd className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{entry.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Closing: one action, no gradient. */}
        <section className="band mb-20 overflow-hidden rounded-[var(--radius-panel)] px-6 py-14 sm:px-10 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <p className="label text-primary-foreground/70">Start where the patient starts</p>
              <h2 className="display mt-3 text-section">
                Book a consult, <span className="text-synced">then cut the network.</span>
              </h2>
              <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-primary-foreground/65">
                The demo accounts run the whole loop: request, approve, prescribe, publish stock. The sync ledger shows what happens to the record when the link goes.
              </p>
            </div>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[hsl(43_62%_54%)] px-6 py-3.5 text-[15px] font-medium text-ink transition hover:bg-[hsl(43_66%_62%)]">
              Sign in to a workspace <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-lg bg-primary-foreground/10 sm:grid-cols-3">
            {[
              ['Guidance offline', 'sorting rules ship with the app'],
              ['Records queued', 'dispatched oldest first'],
              ['District counts', 'small groups suppressed'],
            ].map(([title, body]) => (
              <div key={title} className="bg-ink px-5 py-5">
                <p className="display text-[19px]">{title}</p>
                <p className="mt-1.5 text-[13px] text-primary-foreground/55">{body}</p>
              </div>
            ))}
          </div>
        </section>
        </div>
      </main>

      <footer className="band">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-start justify-between gap-8 px-4 py-14 sm:px-6">
          <div>
            <Logo className="text-primary-foreground" />
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-primary-foreground/55">
              Offline-first primary care for village Uttarakhand. Built as an engineering prototype; not a medical device and not a substitute for a clinician.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-6 text-[14px]">
            <nav aria-label="Workspaces" className="space-y-2.5">
              <p className="label text-[hsl(43_74%_70%)]">Workspaces</p>
              {doors.map((door) => (
                <Link key={door.role} to={door.to} className="block text-primary-foreground/60 transition hover:text-primary-foreground">{door.title}</Link>
              ))}
            </nav>
            <div className="space-y-2.5">
              <p className="label text-[hsl(43_74%_70%)]">Emergency</p>
              <a href="tel:112" className="block text-primary-foreground/60 transition hover:text-primary-foreground">112 national emergency</a>
              <a href="tel:108" className="block text-primary-foreground/60 transition hover:text-primary-foreground">108 ambulance</a>
              <a href="tel:104" className="block text-primary-foreground/60 transition hover:text-primary-foreground">104 health helpline</a>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 border-t border-primary-foreground/10 px-4 py-6 text-[12px] text-primary-foreground/70 sm:px-6">
          <p>© {new Date().getFullYear()} GramHealth · repository name MediBuddy</p>
          <p className="font-mono">Sample data: Synthea 1K, remapped to five communities</p>
        </div>
      </footer>
    </div>
  );
}
