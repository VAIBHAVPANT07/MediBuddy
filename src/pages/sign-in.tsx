import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, KeyRound, Landmark, ShieldCheck, Stethoscope, Store, Users } from 'lucide-react';
import { Logo } from '@/components/ui-kit';
import { Ridgeline } from '@/components/ridgeline';
import { useSession, workspacePath, type Role } from '@/lib/session';
import { describeApiError, requestOtp, verifyOtp } from '@/lib/api';
import { cn } from '@/lib/utils';

const roles: { role: Role; label: string; icon: typeof Users; headline: string; lede: string }[] = [
  { role: 'patient', label: 'Patient', icon: Users, headline: 'Your record, in your pocket.', lede: 'Guidance, appointments and the history that follows you between clinics.' },
  { role: 'doctor', label: 'Doctor', icon: Stethoscope, headline: 'The queue, in order.', lede: 'Requests arrive in the sequence patients made them. Every read is logged.' },
  { role: 'seller', label: 'Pharmacy', icon: Store, headline: 'What is on the shelf.', lede: 'Publish stock patients can actually rely on, with the timestamp it was true.' },
  { role: 'admin', label: 'District', icon: Landmark, headline: 'The load, not the person.', lede: 'Aggregated indicators only. Groups under five people are never shown.' },
];

/** The API answers with codes, not sentences. Name the ones that change what a person does next. */
function describeAuthError(error: unknown) {
  const message = describeApiError(error);
  if (message === 'phone_not_allowed') {
    return 'This number is not on the demo allow-list for this installation. Ask the administrator to add it to allowedLoginPhones in backend/src/auth.ts, then restart the API.';
  }
  if (message === 'otp_rate_limited') return 'Too many codes requested for this number. Wait a minute and try again.';
  if (message === 'auth_rate_limited') return 'Too many sign-in attempts from this device. Wait a few minutes and try again.';
  if (message === 'otp_expired_or_invalid') return 'That challenge has expired. Request a new code.';
  if (message === 'invalid_otp') return 'That code does not match. Check the six digits and try again.';
  if (message === 'invalid_request') return 'Enter a ten-digit mobile number and choose the role you are signing in as.';
  return message;
}

export default function SignIn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { status, signIn } = useSession();

  const fromQuery = params.get('role') as Role | null;
  const [role, setRole] = useState<Role>(fromQuery && roles.some((r) => r.role === fromQuery) ? fromQuery : 'patient');
  const [phone, setPhone] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; code?: string } | null>(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const door = roles.find((r) => r.role === role)!;

  // Someone already holding a session should not have to sign in again.
  useEffect(() => {
    if (status === 'authenticated') navigate(workspacePath[role], { replace: true });
  }, [status, role, navigate]);

  useEffect(() => {
    setError(null);
    setChallenge(null);
    setOtp('');
  }, [role]);

  const sendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter the ten-digit mobile number, without the +91.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await requestOtp(digits, role);
      setChallenge({ id: result.challengeId, code: result.developmentOtp });
    } catch (caught) {
      setError(describeAuthError(caught));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!challenge || otp.length !== 6) {
      setError('Enter the six-digit code that was sent to this number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(phone.replace(/\D/g, ''), challenge.id, otp, role);
      signIn(role, phone.replace(/\D/g, ''));
      navigate(workspacePath[role], { replace: true });
    } catch (caught) {
      setError(describeAuthError(caught));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      {/* The claim, sized to the door you chose. */}
      <aside className="band relative hidden flex-col justify-between overflow-hidden bg-[hsl(100_24%_11%)] px-10 py-12 lg:flex">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[65%] bg-[radial-gradient(70%_60%_at_60%_20%,hsl(43_72%_58%_/_0.2),transparent_70%)]"
        />
        <Ridgeline />
        <div className="contour absolute inset-0 opacity-[0.14]" aria-hidden="true" />
        <Link to="/" className="relative flex items-center gap-3 text-primary-foreground transition hover:text-primary-foreground/80">
          <Logo />
        </Link>
        <div className="relative max-w-md">
          <p className="label mb-4 text-[hsl(43_74%_70%)]">{door.label} workspace</p>
          <motion.h1
            key={door.role}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 0.84, 0.28, 1] }}
            className="display text-[46px] leading-[1.05] tracking-[-0.018em] text-primary-foreground xl:text-[56px]"
          >
            {door.headline}
          </motion.h1>
          <p className="mt-5 text-[15px] leading-relaxed text-primary-foreground/65">{door.lede}</p>
        </div>
        <p className="relative flex items-start gap-2.5 text-[12.5px] leading-relaxed text-primary-foreground/70">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Sign-in is a phone number and a code. Nothing here stores a password.
        </p>
      </aside>

      <main className="flex min-h-screen flex-col px-4 py-8 sm:px-8 lg:min-h-0 lg:justify-center lg:px-14 lg:py-16">
        <div className="mb-8 flex items-center justify-between lg:hidden">
          <Link to="/" aria-label="GramHealth home">
            <Logo />
          </Link>
        </div>
        <Link to="/" className="mb-8 hidden items-center gap-2 text-[13px] text-muted-foreground transition hover:text-foreground lg:inline-flex">
          <ArrowLeft className="h-4 w-4" /> Back to the story
        </Link>

        <div className="w-full max-w-[540px]">
          <h1 className="display sr-only">Sign in to GramHealth</h1>

          <p className="label mb-3">1 · Choose your door</p>
          <div className="mb-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {roles.map(({ role: value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                aria-pressed={role === value}
                className={cn(
                  'flex flex-col items-start gap-3 rounded-[var(--radius)] border p-4 text-left transition',
                  role === value
                    ? 'band border-transparent shadow-lift'
                    : 'bg-card hover:border-role/40 hover:text-role',
                )}
              >
                <Icon className={cn('h-5 w-5', role === value ? 'text-synced' : 'text-muted-foreground')} />
                <span className="text-[14px] font-medium">{label}</span>
              </button>
            ))}
          </div>

          <p className="label mb-3">2 · Mobile number</p>
          <div className="mb-6 flex items-stretch overflow-hidden rounded-[var(--radius)] border bg-card transition focus-within:border-role focus-within:ring-2 focus-within:ring-ring/25">
            <span className="flex items-center border-r px-4 font-mono text-[14px] text-muted-foreground">+91</span>
            <input
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value.replace(/\D/g, '').slice(0, 10));
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !challenge) void sendCode();
              }}
              inputMode="numeric"
              autoComplete="tel-national"
              aria-label="Ten-digit mobile number"
              placeholder="98765 43210"
              className="min-w-0 flex-1 bg-transparent px-4 py-4 font-mono text-[17px] tracking-[0.08em] outline-none placeholder:tracking-normal placeholder:text-muted-foreground/60"
            />
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={busy || phone.length !== 10}
              className="shrink-0 bg-role px-5 text-[14px] font-medium text-primary-foreground transition hover:bg-role/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              {busy && !challenge ? 'Sending…' : challenge ? 'Resend' : 'Send code'}
            </button>
          </div>

          {challenge?.code && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="stamp mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-dashed bg-card px-4 py-3.5"
            >
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                This deployment has no SMS gateway. The API handed the code straight to the browser.
              </p>
              <span className="font-mono text-[20px] font-semibold tracking-[0.28em] text-role">{challenge.code}</span>
            </motion.div>
          )}

          {challenge && (
            <>
              <p className="label mb-3">3 · Six-digit code</p>
              <div className="mb-6 flex items-stretch overflow-hidden rounded-[var(--radius)] border bg-card transition focus-within:border-role focus-within:ring-2 focus-within:ring-ring/25">
                <KeyRound className="my-auto ml-4 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                    setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void verifyCode();
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="Six-digit verification code"
                  placeholder="••••••"
                  className="min-w-0 flex-1 bg-transparent px-4 py-4 font-mono text-[17px] tracking-[0.32em] outline-none placeholder:tracking-[0.32em] placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={() => void verifyCode()}
                  disabled={busy || otp.length !== 6}
                  className="flex shrink-0 items-center gap-2 bg-role px-5 text-[14px] font-medium text-primary-foreground transition hover:bg-role/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  {busy ? 'Checking…' : 'Enter workspace'}
                  {!busy && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="mb-6 rounded-[var(--radius)] border border-alert/30 bg-alert/8 px-4 py-3 text-[13.5px] leading-relaxed text-alert">
              {error}
            </p>
          )}

          <div className="border-t pt-6 text-[13px] leading-relaxed text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Only approved numbers can enter.</p>
            <p>
              This build keeps a demo allow-list on the server. A number outside it is refused before a code is
              generated, so a lost or borrowed phone cannot reach anyone’s record. Ask the administrator to add your
              number and restart the API.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
