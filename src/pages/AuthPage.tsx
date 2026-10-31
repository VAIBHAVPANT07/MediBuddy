import { useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { translations, saveToStorage, cn } from '@/lib/utils';
import { Logo, roleColors, type Role } from '@/components/portal';
import { requestOtp, verifyOtp } from '@/lib/api';
import { User, Stethoscope, Shield, Store, Globe, ArrowUpRight, ArrowLeft, Check, Languages, Video, Pill, Ambulance } from 'lucide-react';

interface AuthPageProps {
  onLogin: (role: string) => void;
}

const marquee = ['AI symptom checker', 'Video consultations', 'हिंदी', 'ਪੰਜਾਬੀ', 'Digital prescriptions', 'Government schemes', 'Ambulance in one tap', 'Live medicine stock', 'Village health analytics'];

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [currentLang, setCurrentLang] = useState<'en' | 'hi' | 'pa'>('en');
  const [selectedRole, setSelectedRole] = useState<Role>('patient');
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [formData, setFormData] = useState({ mobile: '', aadhar: '', otp: '', challengeId: '' });
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const t = translations[currentLang];

  const roles: { id: Role; name: string; icon: typeof User; description: string; features: string[] }[] = [
    { id: 'patient', name: t.patient, icon: User, description: 'Check symptoms, book doctors, keep every record in one place.', features: ['AI triage', 'Bookings', 'Records'] },
    { id: 'doctor', name: t.doctor, icon: Stethoscope, description: 'Run your day — queue, history, video calls and e-prescriptions.', features: ['Schedule', 'Tele-consult', 'Rx'] },
    { id: 'admin', name: t.admin, icon: Shield, description: 'See the health of every village and where resources are short.', features: ['Analytics', 'Resources', 'Reports'] },
    { id: 'seller', name: t.seller, icon: Store, description: 'Stock, expiry and sales for your pharmacy, always up to date.', features: ['Inventory', 'Ledger', 'Insights'] },
  ];
  const active = roles.find((r) => r.id === selectedRole)!;

  const openSignIn = (role: Role) => {
    setSelectedRole(role);
    setStep('login');
    setOpen(true);
  };

  const digitsOnly = (v: string) => v.replace(/\D/g, '');

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    try {
      const challenge = await requestOtp(formData.mobile, selectedRole);
      setFormData((current) => ({ ...current, challengeId: challenge.challengeId, otp: challenge.developmentOtp ?? '' }));
      setStep('otp');
      if(challenge.developmentOtp) toast('Local development code ready',{description:`Your local verification code is ${challenge.developmentOtp}.`});
      else toast.success('Verification code sent', { description: 'Enter the six-digit code to continue.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'otp_request_failed';
      toast.error('Could not send verification code', {
        description: message === 'email_delivery_unavailable'
          ? 'Verification codes are unavailable in production.'
          : message === 'otp_rate_limited'
              ? 'A code was sent recently. Wait a minute before requesting another.'
            : 'Check the phone number and try again.',
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      await verifyOtp(formData.mobile, formData.challengeId, formData.otp, selectedRole);
      saveToStorage('userRole', selectedRole);
      saveToStorage('userMobile', formData.mobile);
      saveToStorage('userAadhar', formData.aadhar);
      onLogin(selectedRole);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not sign in.';
      toast.error(message === 'invalid_otp' ? 'Incorrect code' : 'Sign-in unavailable', {
        description: message === 'invalid_otp' ? 'Check the six-digit code and try again.' : message === 'role_not_assigned' ? 'This account does not have that portal role.' : 'The code may have expired. Request a new one and try again.',
      });
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 sm:px-8">
          <Logo />
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#platform" className="hover:text-foreground">Platform</a>
            <a href="#portals" className="hover:text-foreground">Portals</a>
            <a href="#impact" className="hover:text-foreground">Impact</a>
          </div>
          <div className="flex items-center gap-2">
            <Select value={currentLang} onValueChange={(value: 'en' | 'hi' | 'pa') => setCurrentLang(value)}>
              <SelectTrigger className="h-10 w-[120px] rounded-full bg-transparent">
                <Globe className="mr-1 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी</SelectItem>
                <SelectItem value="pa">ਪੰਜਾਬੀ</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => openSignIn('patient')}>
              Sign in <ArrowUpRight />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto grid max-w-[1400px] gap-12 px-4 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
        <div className="flex flex-col justify-between">
          <div>
            <p className="eyebrow rise mb-8 flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              Rural telemedicine · Punjab, India
            </p>
            <h1 className="rise font-display text-[clamp(3.4rem,8.5vw,8.5rem)] leading-[0.88] tracking-[-0.02em] [animation-delay:80ms]">
              Care that
              <br />
              travels the <em className="text-[hsl(152_58%_30%)]">last mile.</em>
            </h1>
          </div>
          <div className="rise mt-10 max-w-lg [animation-delay:200ms]">
            <p className="flex items-start gap-2 text-lg leading-relaxed text-muted-foreground">
              {currentLang === 'en'
                ? 'One platform connecting patients, doctors, pharmacies and health officials across every village — in the language people actually speak.'
                : t.welcome}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => openSignIn('patient')}>
                Get care now <ArrowUpRight />
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent" asChild>
                <a href="#portals">Explore portals</a>
              </Button>
            </div>
          </div>
        </div>

        {/* Hero visual */}
        <div className="rise relative [animation-delay:260ms]">
          <div className="grain relative overflow-hidden rounded-[36px] bg-ink p-7 text-[hsl(42_30%_94%)] sm:p-9">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">Live · Network vitals</p>
              <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[11px]">72 BPM</span>
            </div>
            <svg viewBox="0 0 400 120" className="mt-8 h-32 w-full" fill="none">
              <path
                className="ecg"
                d="M0 70 H90 L105 70 L115 40 L128 100 L140 15 L152 92 L162 70 H230 L240 60 L250 70 H300 L312 70 L322 45 L334 95 L345 25 L356 85 L366 70 H400"
                stroke="hsl(152 60% 55%)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/10">
              {[
                ['1,250', 'Patients'],
                ['45', 'Live consults'],
                ['3', 'Villages'],
              ].map(([v, l]) => (
                <div key={l} className="bg-ink p-4">
                  <p className="font-display text-4xl">{v}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute -left-6 top-1/2 hidden w-60 -translate-y-1/2 rounded-2xl border bg-card p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] sm:block">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(226_70%_52%/0.1)] text-[hsl(226_70%_52%)]">
                <Video className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Dr. Sharma is online</p>
                <p className="text-xs text-muted-foreground">General medicine · 2 min wait</p>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-6 right-6 rounded-2xl border bg-card px-4 py-3 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]">
            <p className="flex items-center gap-2 text-sm">
              <Pill className="h-4 w-4 text-[hsl(258_60%_58%)]" />
              Paracetamol · <span className="font-medium">15,000</span> in stock
            </p>
          </div>
        </div>
      </header>

      {/* Marquee */}
      <div className="overflow-hidden border-y bg-card py-5">
        <div className="marquee flex w-max gap-12 whitespace-nowrap">
          {[...marquee, ...marquee].map((item, i) => (
            <span key={i} className="flex items-center gap-12 font-display text-3xl italic text-foreground/80">
              {item}
              <span className="h-2 w-2 rounded-full bg-foreground/30" />
            </span>
          ))}
        </div>
      </div>

      {/* Platform */}
      <section id="platform" className="mx-auto max-w-[1400px] px-4 py-24 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow mb-4">(01) Platform</p>
            <h2 className="font-display text-5xl leading-[0.95] tracking-tight md:text-6xl">
              Built for low bandwidth,
              <br />
              <em>high stakes.</em>
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[28px] border bg-border sm:grid-cols-2">
            {[
              { icon: Languages, title: 'Three languages', body: 'English, Hindi and Punjabi — switch any time, anywhere.' },
              { icon: Video, title: 'Tele-consults', body: 'Video calls tuned for 2G/3G, with notes and e-prescriptions.' },
              { icon: Ambulance, title: 'Emergency in one tap', body: 'Ambulance or rickshaw to the nearest clinic, straight from the app.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-card p-8">
                <Icon className="h-5 w-5" />
                <h3 className="mt-10 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portals */}
      <section id="portals" className="mx-auto max-w-[1400px] px-4 pb-24 sm:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-4">(02) Portals</p>
            <h2 className="font-display text-5xl leading-[0.95] tracking-tight md:text-6xl">
              Four doors. <em>One system.</em>
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">{t.selectRole}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {roles.map((role, i) => (
            <button
              key={role.id}
              onClick={() => openSignIn(role.id)}
              style={{ '--role': roleColors[role.id] } as CSSProperties}
              className="group relative flex min-h-[420px] flex-col overflow-hidden rounded-[28px] border bg-card p-7 text-left transition-all duration-500 hover:-translate-y-1 hover:border-transparent hover:bg-role hover:text-white"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-white/70">0{i + 1}</span>
                <span className="grid h-11 w-11 place-items-center rounded-full border transition-all duration-500 group-hover:rotate-45 group-hover:border-white/30 group-hover:bg-white group-hover:text-role">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <role.icon className="mt-14 h-10 w-10 text-role transition-colors group-hover:text-white" strokeWidth={1.25} />
              <h3 className="mt-auto font-display text-5xl leading-none">{role.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground transition-colors group-hover:text-white/80">{role.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {role.features.map((f) => (
                  <span key={f} className="rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors group-hover:border-white/30">
                    {f}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Impact */}
      <section id="impact" className="grain bg-ink text-[hsl(42_30%_94%)]">
        <div className="mx-auto max-w-[1400px] px-4 py-24 sm:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">(03) Impact</p>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[28px] bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['78%', 'Vaccination coverage'],
              ['< 2 min', 'Average wait for a doctor'],
              ['24/7', 'Emergency transport'],
              ['15k+', 'Units tracked per pharmacy'],
            ].map(([v, l]) => (
              <div key={l} className="bg-ink p-8">
                <p className="font-display text-6xl tracking-tight">{v}</p>
                <p className="mt-3 text-sm text-white/60">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-24 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <h2 className="font-display text-6xl leading-[0.9] tracking-tight md:text-8xl">
              Healthcare,
              <br />
              <em className="text-[hsl(152_60%_55%)]">within reach.</em>
            </h2>
            <Button size="lg" className="bg-white text-ink hover:bg-white/90" onClick={() => openSignIn('patient')}>
              Start now <ArrowUpRight />
            </Button>
          </div>
        </div>
        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-white/50 sm:px-8">
            <Logo className="text-xl text-white" />
            <p>© {new Date().getFullYear()} MediBuddy · Rural Healthcare Platform</p>
          </div>
        </footer>
      </section>

      {/* Sign in */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto border-l-0 p-0 sm:max-w-md" style={{ '--role': roleColors[selectedRole] } as CSSProperties}>
          <div className="grain bg-role p-8 pt-12 text-white">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/70">{step === 'login' ? 'Step 1 of 2' : 'Step 2 of 2'}</p>
            <SheetTitle className="mt-3 font-display text-5xl font-normal leading-none text-white">
              {step === 'login' ? t.login : t.verify}
            </SheetTitle>
            <SheetDescription className="mt-2 text-white/80">
              {step === 'login' ? `Continue to the ${active.name} portal.` : 'Enter the six-digit verification code.'}
            </SheetDescription>
          </div>

          <div className="flex flex-1 flex-col gap-6 p-8">
            {step === 'login' ? (
              <>
                <div>
                  <p className="eyebrow mb-3">{t.selectRole}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRole(r.id)}
                        style={{ '--role': roleColors[r.id] } as CSSProperties}
                        className={cn(
                          'flex items-center gap-2 rounded-2xl border p-3 text-sm font-medium transition',
                          selectedRole === r.id ? 'border-role bg-role/10 text-role' : 'hover:bg-muted'
                        )}
                      >
                        <r.icon className="h-4 w-4" />
                        {r.name}
                        {selectedRole === r.id && <Check className="ml-auto h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="eyebrow">{t.mobileNumber}</span>
                  <div className="mt-2 flex h-12 items-center rounded-2xl border bg-card px-4 focus-within:ring-2 focus-within:ring-role">
                    <span className="mr-3 border-r pr-3 font-mono text-sm text-muted-foreground">+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="98765 43210"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: digitsOnly(e.target.value) })}
                      maxLength={10}
                      className="w-full bg-transparent font-mono outline-none"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="eyebrow">{t.aadharNumber}</span>
                  <Input
                    inputMode="numeric"
                    placeholder="12-digit Aadhaar"
                    value={formData.aadhar}
                    onChange={(e) => setFormData({ ...formData, aadhar: digitsOnly(e.target.value) })}
                    maxLength={12}
                    className="mt-2 h-12 rounded-2xl font-mono focus-visible:ring-role"
                  />
                </label>

                <Button size="lg" onClick={handleSendOtp} className="mt-auto w-full bg-role hover:bg-role/90" disabled={isSendingOtp || formData.mobile.length !== 10 || formData.aadhar.length !== 12}>
                  {isSendingOtp ? 'Sending code…' : t.sendOtp} <ArrowUpRight />
                </Button>
              </>
            ) : (
              <>
                <div>
                  <p className="eyebrow mb-3">{t.otp}</p>
                  <InputOTP maxLength={6} value={formData.otp} onChange={(otp) => setFormData({ ...formData, otp })}>
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="h-12 w-11 rounded-xl border font-display text-2xl first:rounded-xl last:rounded-xl" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="mt-4 text-sm text-muted-foreground">The code expires in 10 minutes. This is a local development code.</p>
                </div>
                <div className="mt-auto flex gap-2">
                  <Button size="lg" variant="outline" onClick={() => setStep('login')}>
                    <ArrowLeft />
                  </Button>
                  <Button size="lg" onClick={handleVerifyOtp} className="flex-1 bg-role hover:bg-role/90" disabled={formData.otp.length !== 6 || !formData.challengeId}>
                    {t.verify} <Check />
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
