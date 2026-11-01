import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Ambulance,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  FileDown,
  FileText,
  HeartPulse,
  Landmark,
  Phone,
  Pill,
  Search,
  Sparkles,
  Stethoscope,
  Upload,
} from 'lucide-react';
import { Chip, Counter, EmptyState, Initials, Meter, Panel, Reveal, Stat } from '@/components/ui-kit';
import { SyncLedger } from '@/components/sync-ledger';
import { PageHead, Workspace, type WorkspaceNavItem } from '@/components/workspace';
import { useSession } from '@/lib/session';
import { useSync } from '@/lib/sync';
import { analyzeSymptoms, cn, governmentSchemes, translations, type SymptomGuidance } from '@/lib/utils';
import {
  cancelAppointment,
  createAppointment,
  describeApiError,
  getCareProviders,
  getMyAppointments,
  getMyPatientRecords,
  getPharmacyCatalog,
  type AppointmentRecord,
  type CareProvider,
  type PharmacyMedicine,
} from '@/lib/api';

/* ------------------------------------------------------------------ data */

type HealthRecords = Awaited<ReturnType<typeof getMyPatientRecords>>;

interface PatientData {
  providers: CareProvider[];
  appointments: AppointmentRecord[];
  medicines: PharmacyMedicine[];
  records: HealthRecords;
  loading: boolean;
  reload: () => void;
  book: (doctorId: string, scheduledAt: string) => Promise<boolean>;
  withdraw: (id: string) => Promise<void>;
}

const PatientContext = createContext<PatientData | null>(null);
const emptyRecords: HealthRecords = { patientId: '', encounters: [], prescriptions: [], vaccinations: [] };

export function PatientDataProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<CareProvider[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [medicines, setMedicines] = useState<PharmacyMedicine[]>([]);
  const [records, setRecords] = useState<HealthRecords>(emptyRecords);
  const [loading, setLoading] = useState(true);
  const { enqueue } = useSync();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getCareProviders(), getMyAppointments(), getPharmacyCatalog(), getMyPatientRecords()])
      .then(([providerRows, appointmentRows, medicineRows, recordRows]) => {
        setProviders(providerRows);
        setAppointments(appointmentRows);
        setMedicines(medicineRows);
        setRecords(recordRows);
      })
      .catch((error) => toast.error('Workspace data did not load', { description: describeApiError(error) }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const book = useCallback(async (doctorId: string, scheduledAt: string) => {
    try {
      const appointment = await createAppointment({ doctorId, scheduledAt });
      setAppointments((current) => [{ ...appointment, doctorName: providers.find((p) => p.id === doctorId)?.name }, ...current]);
      enqueue('Appointment request');
      toast.success('Appointment requested', {
        description: `${providers.find((p) => p.id === doctorId)?.name ?? 'Care provider'} is waiting to confirm.`,
      });
      return true;
    } catch (error) {
      toast.error('Appointment not booked', { description: describeApiError(error) });
      return false;
    }
  }, [providers, enqueue]);

  const withdraw = useCallback(async (id: string) => {
    try {
      const updated = await cancelAppointment(id);
      setAppointments((current) => current.map((row) => (row.id === id ? { ...row, ...updated } : row)));
      toast.success('Appointment cancelled');
    } catch (error) {
      toast.error('Could not cancel', { description: describeApiError(error) });
    }
  }, []);

  const value = useMemo(
    () => ({ providers, appointments, medicines, records, loading, reload: load, book, withdraw }),
    [providers, appointments, medicines, records, loading, load, book, withdraw],
  );

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}

function usePatientData() {
  const context = useContext(PatientContext);
  if (!context) throw new Error('Patient pages need PatientDataProvider');
  return context;
}

/* ---------------------------------------------------------------- layout */

const nav: WorkspaceNavItem[] = [
  { to: '/patient', label: 'Home', icon: HeartPulse, end: true },
  { to: '/patient/guidance', label: 'Symptom guidance', icon: Sparkles },
  { to: '/patient/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/patient/records', label: 'Health records', icon: FileText },
  { to: '/patient/medicines', label: 'Medicines', icon: Pill },
  { to: '/patient/schemes', label: 'Schemes', icon: Landmark },
  { to: '/patient/emergency', label: 'Emergency', icon: Ambulance },
];

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useSession();
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg border p-1', className)} role="group" aria-label="Language">
      {(['en', 'hi'] as const).map((option) => (
        <button
          key={option}
          onClick={() => setLang(option)}
          aria-pressed={lang === option}
          className={cn('rounded-md px-2.5 py-1 text-[13px] font-medium transition', lang === option ? 'bg-role text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
        >
          {option === 'en' ? 'English' : 'हिंदी'}
        </button>
      ))}
    </div>
  );
}

export function PatientWorkspace() {
  return (
    <PatientDataProvider>
      <Workspace role="patient" workspaceName="Patient workspace" brief="Your care, in one place" nav={nav} />
    </PatientDataProvider>
  );
}

/* --------------------------------------------------------------- screens */

const activeStatuses = ['requested', 'approved', 'rescheduled'];
const isTime = (value: string) => !Number.isNaN(new Date(value).getTime());

export function PatientHome() {
  const { appointments, records, loading } = usePatientData();
  const { lang } = useSession();
  const t = translations[lang];
  const upcoming = appointments.filter((a) => activeStatuses.includes(a.status) && isTime(a.scheduledAt)).sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))[0];
  const recordCount = records.encounters.length + records.prescriptions.length + records.vaccinations.length;

  return (
    <>
      <PageHead
        title={<>Namaste. <span className="text-role">What needs attention?</span></>}
        lede={t.tagline}
        actions={<LanguageToggle />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          to="/patient/appointments"
          label="Next appointment"
          value={upcoming ? new Date(upcoming.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : loading ? '…' : 'None'}
          hint={upcoming ? `${upcoming.doctorName ?? 'Care provider'} · ${upcoming.status}` : 'Book one and it appears here'}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <Stat
          to="/patient/records"
          label="Records on file"
          value={<Counter value={recordCount} />}
          hint="Visits, prescriptions and vaccinations"
          tone="role"
          icon={<FileText className="h-4 w-4" />}
        />
        <Stat
          to="/patient/emergency"
          label="Emergency"
          value="112"
          hint="Ambulance and police, one number"
          tone="alert"
          icon={<Phone className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Reveal>
          <Panel
            eyebrow="Start here"
            title={t.aiSymptomChecker}
            action={<Chip tone="neutral">Guidance only</Chip>}
            note="This tool sorts what you feel into a next step. It is not a diagnosis and it never names a dose. A clinician decides treatment."
          >
            <Link
              to="/patient/guidance"
              className="group flex items-center gap-4 rounded-lg border p-5 transition hover:border-role/50 hover:bg-role/[0.04]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-role/10 text-role">
                <Sparkles className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Describe how you feel</span>
                <span className="block text-[13px] text-muted-foreground">Two lines are enough. Hindi works too.</span>
              </span>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-role" />
            </Link>
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <SyncLedger compact />
        </Reveal>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Recent activity" title="Last records" action={<Link to="/patient/records" className="text-[13px] font-medium text-role hover:underline">Open all</Link>}>
          {loading ? (
            <p className="py-6 text-[14px] text-muted-foreground">Loading your records…</p>
          ) : recordCount === 0 ? (
            <EmptyState title="Nothing on file yet" body="Records appear after a clinic visit is entered against your number." />
          ) : (
            <ul className="hairline-grid">
              {[...records.encounters.map((e) => ({ id: e.id, title: e.summary || 'Clinic visit', at: e.occurredAt })),
                ...records.prescriptions.map((p) => ({ id: p.id, title: p.medicationName, at: p.issuedAt })),
                ...records.vaccinations.map((v) => ({ id: v.id, title: v.vaccineName, at: v.administeredAt }))]
                .filter((row) => isTime(row.at))
                .sort((a, b) => +new Date(b.at) - +new Date(a.at))
                .slice(0, 5)
                .map((row) => (
                  <li key={row.id} className="flex items-center gap-4 py-3.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-role" />
                    <span className="min-w-0 flex-1 truncate text-[15px]">{row.title}</span>
                    <span className="font-mono text-[12px] text-muted-foreground">{new Date(row.at).toLocaleDateString('en-IN')}</span>
                  </li>
                ))}
            </ul>
          )}
        </Panel>

        <Panel eyebrow="Shortcuts" title="Jump to">
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              { to: '/patient/appointments', label: 'Book a consult', icon: CalendarDays },
              { to: '/patient/medicines', label: 'Check medicine stock', icon: Pill },
              { to: '/patient/schemes', label: 'Government schemes', icon: Landmark },
              { to: '/patient/emergency', label: 'Emergency numbers', icon: Ambulance },
            ].map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link to={to} className="flex items-center gap-3 rounded-lg border px-4 py-3.5 text-[14px] font-medium transition hover:border-role/50 hover:bg-muted/60">
                  <Icon className="h-4 w-4 text-role" />
                  {label}
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

const quickSymptoms = ['Fever since Tuesday', 'Cough, breathing feels heavy', 'Stomach pain, loose motion', 'Chest pain while resting', 'Headache since morning'];

export function PatientGuidance() {
  const { lang } = useSession();
  const t = translations[lang];
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState<SymptomGuidance | null>(null);
  const reduced = useReducedMotion();

  const run = () => {
    if (!symptoms.trim()) return;
    setResult(analyzeSymptoms(symptoms));
  };

  const tone = result?.priority === 'High' ? 'bad' : result?.priority === 'Medium' ? 'warn' : 'good';

  return (
    <>
      <PageHead
        title={t.aiSymptomChecker}
        lede="Say what you feel in plain words. GramHealth sorts it into a next step and tells you how soon to be seen."
        actions={<LanguageToggle />}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
        <Panel eyebrow="Step 1" title="How you feel">
          <Textarea
            value={symptoms}
            onChange={(event) => setSymptoms(event.target.value)}
            placeholder={t.symptoms}
            className="min-h-[168px] resize-none rounded-lg border-0 bg-muted p-4 text-[16px] focus-visible:ring-2 focus-visible:ring-role"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {quickSymptoms.map((example) => (
              <button key={example} onClick={() => setSymptoms(example)} className="rounded-md border px-3 py-1.5 text-[13px] transition hover:border-role hover:text-role">
                {example}
              </button>
            ))}
          </div>
          <Button size="lg" onClick={run} disabled={!symptoms.trim()} className="mt-6 w-full bg-role text-primary-foreground hover:bg-role/90">
            What should I do?
          </Button>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            Offline, this check still runs: the sorting rules ship with the app. Nothing you type leaves the device until you book a consult.
          </p>
        </Panel>

        {result ? (
          <motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Panel
              eyebrow="Step 2"
              title={result.readout}
              action={<Chip tone={tone}>{result.priority} priority</Chip>}
              className="border-role/30"
            >
              <p className="text-[15px] text-muted-foreground">{result.severity}</p>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="label mb-3">Next steps</p>
                  <ul className="space-y-2.5">
                    {result.nextSteps.map((step) => (
                      <li key={step} className="flex gap-2.5 text-[15px] leading-snug">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-role" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="label mb-3">At home</p>
                  <ul className="space-y-2.5">
                    {result.selfCare.map((step) => (
                      <li key={step} className="flex gap-2.5 text-[15px] leading-snug">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-line" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2 border-t pt-5">
                <Button asChild className="bg-role text-primary-foreground hover:bg-role/90">
                  <Link to="/patient/appointments">Book a consult <ArrowUpRight /></Link>
                </Button>
                {result.priority === 'High' && (
                  <Button asChild variant="outline" className="border-alert/40 text-alert hover:bg-alert/10">
                    <a href="tel:112">Call 112 now</a>
                  </Button>
                )}
              </div>
            </Panel>
          </motion.div>
        ) : (
          <EmptyState
            title="Your next step appears here"
            body="Write a sentence or pick an example. The answer is guidance about urgency and care, never a diagnosis or a dose."
            className="h-full"
          />
        )}
      </div>
    </>
  );
}

const SLOTS = ['09:00', '10:30', '12:00', '14:30', '16:00', '17:30'];

export function PatientAppointments() {
  const { providers, appointments, loading, book, withdraw } = usePatientData();
  const [doctorId, setDoctorId] = useState('');
  const [providerQuery, setProviderQuery] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

  const visibleProviders = providers.filter((provider) => `${provider.name} ${provider.specialty}`.toLowerCase().includes(providerQuery.toLowerCase()));

  const submit = async () => {
    if (!doctorId || !date || !time) return;
    setBusy(true);
    const ok = await book(doctorId, new Date(`${date}T${time}:00`).toISOString());
    setBusy(false);
    if (ok) { setDoctorId(''); setDate(''); setTime(''); }
  };

  return (
    <>
      <PageHead
        title="Appointments"
        lede="Pick a provider, a day and a slot. Requests wait for the doctor to confirm; cancellations go back the same way."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Panel eyebrow="New request" title="Book a consult">
          <p className="label mb-3">Care provider</p>
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={providerQuery} onChange={(event) => setProviderQuery(event.target.value)} placeholder="Search by name or specialty…" aria-label="Search care providers" className="h-11 rounded-lg pl-10" />
          </div>
          <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {visibleProviders.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setDoctorId(provider.id)}
                aria-pressed={doctorId === provider.id}
                className={cn('flex items-center gap-3 rounded-lg border p-3.5 text-left transition', doctorId === provider.id ? 'border-role bg-role/[0.06] ring-1 ring-role' : 'hover:bg-muted/70')}
              >
                <Initials name={provider.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{provider.name}</span>
                  <span className="block truncate text-[13px] text-muted-foreground">{provider.specialty}</span>
                </span>
              </button>
            ))}
          </div>
          {providers.length > 0 && visibleProviders.length === 0 && (
            <p className="rounded-lg border border-dashed px-4 py-5 text-center text-[14px] text-muted-foreground">No provider matches “{providerQuery}”.</p>
          )}
          {providers.length === 0 && !loading && (
            <EmptyState title="No providers listed" body="Providers appear here once a doctor account is active against the directory." />
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="label mb-2 block">Date</span>
              <Input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} className="h-11 rounded-lg" />
            </label>
            <div>
              <span className="label mb-2 block">Clinic hours</span>
              <div className="flex flex-wrap gap-1.5">
                {SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setTime(slot)}
                    aria-pressed={time === slot}
                    className={cn('rounded-md border px-3 py-2 font-mono text-[13px] transition', time === slot ? 'border-transparent bg-role text-primary-foreground' : 'hover:bg-muted')}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button size="lg" onClick={submit} disabled={!doctorId || !date || !time || busy || providers.length === 0} className="mt-7 w-full bg-role text-primary-foreground hover:bg-role/90">
            {busy ? 'Sending request…' : 'Request appointment'} <Check />
          </Button>
          <p className="mt-3 text-[12px] text-muted-foreground">Slot choice is a request, not a guarantee. The doctor confirms or moves it and you see the change here.</p>
        </Panel>

        <Panel eyebrow={`${appointments.filter((a) => activeStatuses.includes(a.status)).length} open`} title="Your requests">
          {loading ? (
            <p className="py-6 text-[14px] text-muted-foreground">Loading appointments…</p>
          ) : appointments.length === 0 ? (
            <EmptyState title="No appointments yet" body="Booked requests land here with their live status." />
          ) : (
            <ul className="hairline-grid">
              {appointments.map((appointment) => (
                <li key={appointment.id} className="flex flex-wrap items-center gap-3 py-4">
                  <div className="w-12 shrink-0 text-center">
                    <p className="display text-[20px] leading-none">{isTime(appointment.scheduledAt) ? new Date(appointment.scheduledAt).getDate() : '—'}</p>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">{isTime(appointment.scheduledAt) ? new Date(appointment.scheduledAt).toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }) : ''}</p>
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <p className="truncate text-[15px] font-medium">{appointment.doctorName ?? 'Care provider'}</p>
                    <p className="font-mono text-[12px] text-muted-foreground">
                      {isTime(appointment.scheduledAt) ? new Date(appointment.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : 'Time unavailable'}
                    </p>
                  </div>
                  <Chip tone={appointment.status === 'approved' || appointment.status === 'rescheduled' ? 'good' : appointment.status === 'cancelled' ? 'bad' : appointment.status === 'completed' ? 'neutral' : 'warn'}>
                    {appointment.status}
                  </Chip>
                  {activeStatuses.includes(appointment.status) && (
                    <Button size="sm" variant="outline" onClick={() => void withdraw(appointment.id)}>Cancel</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

export function PatientRecords() {
  const { records, loading } = usePatientData();
  const { phone } = useSession();
  const [files, setFiles] = useState<string[]>([]);

  const timeline: { id: string; kind: string; title: string; at: string; note?: string }[] = [
    ...records.encounters.map((row) => ({ id: row.id, kind: 'Visit', title: row.summary || 'Clinical encounter', at: row.occurredAt })),
    ...records.prescriptions.map((row) => ({ id: row.id, kind: 'Prescription', title: row.medicationName, at: row.issuedAt, note: row.instructions })),
    ...records.vaccinations.map((row) => ({ id: row.id, kind: 'Vaccination', title: row.vaccineName, at: row.administeredAt })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const download = () => {
    const href = URL.createObjectURL(new Blob([JSON.stringify({ phone, exportedAt: new Date().toISOString(), records }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = 'gramhealth-records.json';
    link.click();
    URL.revokeObjectURL(href);
    toast.success('Records exported', { description: 'A JSON copy for your own records.' });
  };

  return (
    <>
      <PageHead
        title="Health records"
        lede="Every visit, prescription and vaccination recorded against your number, newest first."
        actions={
          <Button variant="outline" onClick={download} disabled={timeline.length === 0}>
            <FileDown /> Export
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel eyebrow={`${timeline.length} entries`} title="Timeline">
          {loading ? (
            <p className="py-6 text-[14px] text-muted-foreground">Loading records…</p>
          ) : timeline.length === 0 ? (
            <EmptyState title="No clinical records yet" body="After a visit, the clinic enters it and the entry appears here with a date." />
          ) : (
            <ol className="relative border-l pl-7">
              {timeline.map((entry) => (
                <li key={`${entry.kind}-${entry.id}`} className="relative pb-8 last:pb-0">
                  <span className="absolute -left-[33px] top-1.5 h-2.5 w-2.5 rounded-full bg-role ring-4 ring-card" />
                  <div className="flex flex-wrap items-center gap-3">
                    <Chip tone="role">{entry.kind}</Chip>
                    <span className="font-mono text-[12px] text-muted-foreground">{isTime(entry.at) ? new Date(entry.at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Date unavailable'}</span>
                  </div>
                  <p className="mt-2 text-[17px] font-medium leading-snug">{entry.title}</p>
                  {'note' in entry && entry.note && <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{entry.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel eyebrow="Own copies" title="Report archive">
            <label className="group flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-6 py-9 text-center transition hover:border-role/60 hover:bg-role/[0.03]">
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(event) => setFiles(Array.from(event.target.files ?? []).map((file) => file.name))}
              />
              <Upload className="h-6 w-6 text-role" strokeWidth={1.5} />
              <p className="mt-4 font-medium">Add a lab report or X-ray</p>
              <p className="mt-1 text-[13px] text-muted-foreground">JPG, PNG or PDF</p>
            </label>
            {files.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {files.map((name) => (
                  <li key={name} className="flex items-center gap-2 text-[13px]">
                    <Check className="h-4 w-4 shrink-0 text-role" />
                    <span className="truncate">{name}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
              File storage is not connected in this build. Picked files stay on this device and are not uploaded or attached to your record.
            </p>
          </Panel>

          <Panel eyebrow="What is inside" title="Record counts">
            <ul className="space-y-4">
              {[
                { label: 'Visits', value: records.encounters.length, max: Math.max(records.encounters.length, records.prescriptions.length, 1) },
                { label: 'Prescriptions', value: records.prescriptions.length, max: Math.max(records.encounters.length, records.prescriptions.length, 1) },
                { label: 'Vaccinations', value: records.vaccinations.length, max: Math.max(records.encounters.length, records.prescriptions.length, 1) },
              ].map((row) => (
                <li key={row.label}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[14px]">{row.label}</span>
                    <span className="font-mono text-[15px] font-medium"><Counter value={row.value} /></span>
                  </div>
                  <Meter value={(row.value / row.max) * 100} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

export function PatientMedicines() {
  const { medicines, loading } = usePatientData();
  const [query, setQuery] = useState('');
  const results = medicines.filter((medicine) => `${medicine.name} ${medicine.category ?? ''}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <PageHead
        title="Medicine availability"
        lede="Stock entered by pharmacies in the network, priced at listed retail. Availability changes through the day."
      />

      <Panel
        eyebrow="Search"
        title="What do you need?"
        action={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Paracetamol…" className="h-11 rounded-lg pl-10" />
          </div>
        }
      >
        {loading ? (
          <p className="py-6 text-[14px] text-muted-foreground">Loading pharmacy stock…</p>
        ) : results.length === 0 ? (
          <EmptyState
            title={query ? `Nothing matches “${query}”` : 'No stock published yet'}
            body="Pharmacies publish stock from their own workspace. Ask at the counter before you travel."
          />
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {results.map((medicine) => (
              <li key={medicine.id} className="flex items-center gap-4 rounded-lg border p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-role/10 text-role">
                  <Pill className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{medicine.name}</p>
                  <p className="truncate text-[13px] text-muted-foreground">{medicine.category || 'Community pharmacy'}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[15px] font-medium">₹{medicine.price}</p>
                  <p className={cn('font-mono text-[12px]', medicine.stock < 100 ? 'text-queued' : 'text-muted-foreground')}>
                    {medicine.stock.toLocaleString('en-IN')} in stock
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-5 border-t pt-4 text-[13px] text-muted-foreground">
          Take a medicine list to the counter. Stock here is what a pharmacy typed in, and can be wrong.
        </p>
      </Panel>
    </>
  );
}

export function PatientSchemes() {
  return (
    <>
      <PageHead
        title="Government schemes"
        lede="Cover you may be able to claim, and the desk that decides. GramHealth does not assess eligibility and never promises a benefit."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {governmentSchemes.map((scheme, index) => (
          <Reveal key={scheme.name} delay={index * 0.05}>
            <Panel eyebrow={scheme.cover} title={scheme.name}>
              <p className="text-[15px] leading-relaxed">{scheme.description}</p>
              <ul className="mt-5 space-y-2">
                {scheme.benefits.map((benefit) => (
                  <li key={benefit} className="flex gap-2.5 text-[14px]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-role" />
                    {benefit}
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-lg bg-muted p-4">
                <p className="label mb-1.5">Where to ask</p>
                <p className="text-[14px] leading-relaxed">{scheme.whereToAsk}</p>
              </div>
            </Panel>
          </Reveal>
        ))}
      </div>
    </>
  );
}

const emergencyNumbers = [
  { label: 'National emergency', number: '112', note: 'One number for ambulance, police and fire.' },
  { label: 'Ambulance', number: '108', note: '108 health services in Uttarakhand.' },
  { label: 'Disaster helpline', number: '101', note: 'Landslide, flood and earthquake response.' },
  { label: 'Health helpline', number: '104', note: 'Free medical advice, daytime.' },
];

export function PatientEmergency() {
  const { phone } = useSession();
  return (
    <>
      <PageHead
        title="Emergency"
        lede="Dial from the phone. GramHealth cannot dispatch a vehicle and does not send your location anywhere."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="band rounded-[var(--radius-panel)] p-6 sm:p-8">
          <Ambulance className="h-8 w-8 text-alert" strokeWidth={1.4} />
          <p className="label mt-6 text-primary-foreground/70">Do this first</p>
          <h2 className="display mt-2 text-section">Call before you travel</h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-primary-foreground/70">
            Put the phone on speaker, keep the person sitting, and tell the operator the village and the district.
            If the network is weak, walk to higher ground and call again.
          </p>
          <div className="mt-8 grid gap-2 sm:grid-cols-2">
            {emergencyNumbers.map((entry) => (
              <a
                key={entry.number}
                href={`tel:${entry.number}`}
                className="group flex items-center justify-between gap-4 rounded-lg border border-primary-foreground/15 px-4 py-3.5 transition hover:bg-primary-foreground hover:text-ink"
              >
                <span>
                  <span className="block text-[14px] font-medium">{entry.label}</span>
                  <span className="block text-[12px] text-primary-foreground/55 group-hover:text-ink/60">{entry.note}</span>
                </span>
                <span className="font-mono text-[20px] font-medium">{entry.number}</span>
              </a>
            ))}
          </div>
          <p className="mt-7 border-t border-primary-foreground/10 pt-4 text-[12px] text-primary-foreground/65">
            Signed in as {phone ? `+91 ${phone.slice(-10)}` : 'a demo account'}. The operator asks for your name and village; the app does not pass them on.
          </p>
        </section>

        <div className="space-y-6">
          <Panel eyebrow="Transport" title="Getting to a facility">
            <EmptyState
              title="Ambulance dispatch is not connected"
              body="This build can dial the number but cannot request, track or confirm a vehicle. Ask your ANM or the village health worker to alert the block hospital."
            />
          </Panel>
          <Panel eyebrow="While you wait" title="What helps">
            <ul className="space-y-3">
              {[
                'Send someone to meet the vehicle at the village entrance.',
                'Keep the person warm and, if conscious, sipping water.',
                'Gather any medicine strips and the record export before leaving.',
                'Note the time symptoms started; the clinic will ask.',
              ].map((tip) => (
                <li key={tip} className="flex gap-3 text-[15px] leading-snug">
                  <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-role" />
                  {tip}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
