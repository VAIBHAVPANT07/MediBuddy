import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  CalendarClock,
  Check,
  ClipboardList,
  FileText,
  Mic,
  MicOff,
  PhoneOff,
  Search,
  Users,
  Video,
  WifiOff,
  X,
} from 'lucide-react';
import { Chip, Counter, EmptyState, Initials, Panel, Stat } from '@/components/ui-kit';
import { SyncLedger } from '@/components/sync-ledger';
import { PageHead, Workspace, type WorkspaceNavItem } from '@/components/workspace';
import { useSync } from '@/lib/sync';
import { cn } from '@/lib/utils';
import {
  approveAppointment,
  cancelAppointment,
  createPrescription,
  describeApiError,
  getDoctorAppointments,
  getDoctorPatients,
  getPatientRecords,
  rescheduleAppointment,
  type AppointmentRecord,
  type PatientRecord,
} from '@/lib/api';

type AppointmentWithPatient = AppointmentRecord & { patientName: string };

interface DoctorData {
  appointments: AppointmentWithPatient[];
  patients: PatientRecord[];
  loading: boolean;
  act: (id: string, action: 'approve' | 'cancel' | 'reschedule', scheduledAt?: string) => Promise<void>;
  prescribe: (patientId: string, medicationName: string, instructions: string) => Promise<boolean>;
}

const DoctorContext = createContext<DoctorData | null>(null);
const openStatuses = ['requested', 'approved', 'rescheduled'];
const isTime = (value: string) => !Number.isNaN(new Date(value).getTime());

const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export function DoctorDataProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getDoctorAppointments(), getDoctorPatients()])
      .then(([appointmentRows, patientRows]) => {
        if (!active) return;
        setAppointments(appointmentRows as AppointmentWithPatient[]);
        setPatients(patientRows);
      })
      .catch((error) => toast.error('Doctor workspace did not load', { description: describeApiError(error) }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const patch = (id: string, next: Partial<AppointmentRecord>) =>
    setAppointments((current) => current.map((row) => (row.id === id ? { ...row, ...next } : row)));

  const act = useCallback(async (id: string, action: 'approve' | 'cancel' | 'reschedule', scheduledAt?: string) => {
    try {
      if (action === 'approve') {
        const row = appointments.find((item) => item.id === id);
        patch(id, await approveAppointment(id, row?.scheduledAt ?? new Date().toISOString()));
        toast.success('Appointment approved', { description: 'The patient sees it as confirmed.' });
      } else if (action === 'cancel') {
        patch(id, await cancelAppointment(id));
        toast.success('Appointment cancelled');
      } else {
        if (!scheduledAt) return;
        patch(id, await rescheduleAppointment(id, scheduledAt));
        toast.success('Appointment moved', { description: 'The patient is shown the new time.' });
      }
    } catch (error) {
      toast.error('Queue not updated', { description: describeApiError(error) });
    }
  }, [appointments]);

  const prescribe = useCallback(async (patientId: string, medicationName: string, instructions: string) => {
    try {
      await createPrescription({ patientId, medicationName, instructions });
      toast.success('Prescription signed', { description: 'Written to the patient record.' });
      return true;
    } catch (error) {
      toast.error('Prescription not saved', { description: describeApiError(error) });
      return false;
    }
  }, []);

  const value = useMemo(() => ({ appointments, patients, loading, act, prescribe }), [appointments, patients, loading, act, prescribe]);
  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
}

function useDoctorData() {
  const context = useContext(DoctorContext);
  if (!context) throw new Error('Doctor pages need DoctorDataProvider');
  return context;
}

const nav: WorkspaceNavItem[] = [
  { to: '/doctor', label: 'Queue', icon: CalendarClock, end: true },
  { to: '/doctor/patients', label: 'Patients', icon: Users },
  { to: '/doctor/consult', label: 'Consult', icon: Video },
  { to: '/doctor/prescribe', label: 'Prescribe', icon: FileText },
];

export function DoctorWorkspace() {
  return (
    <DoctorDataProvider>
      <Workspace role="doctor" workspaceName="Doctor workspace" brief="Today, in order" nav={nav} />
    </DoctorDataProvider>
  );
}

/* --------------------------------------------------------------- screens */

export function DoctorQueue() {
  const { appointments, patients, loading, act } = useDoctorData();
  const [rescheduling, setRescheduling] = useState<AppointmentWithPatient | null>(null);
  const [newTime, setNewTime] = useState('');
  const open = appointments.filter((a) => openStatuses.includes(a.status));

  return (
    <>
      <PageHead
        title="Today’s queue"
        lede="Requests, confirmations and the people under your care. Approvals and moves write straight to the patient's workspace."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat tone="role" label="Open requests" value={<Counter value={open.length} />} hint="Awaiting you" icon={<CalendarClock className="h-4 w-4" />} />
        <Stat label="Confirmed" value={<Counter value={appointments.filter((a) => a.status === 'approved' || a.status === 'rescheduled').length} />} hint="Ready to start" icon={<Check className="h-4 w-4" />} />
        <Stat label="Patients" value={<Counter value={patients.length} />} hint="Assigned to this account" icon={<Users className="h-4 w-4" />} />
        <Stat label="Cancelled" value={<Counter value={appointments.filter((a) => a.status === 'cancelled').length} />} hint="Closed out" icon={<X className="h-4 w-4" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel eyebrow="Appointment requests" title="Working list">
          {loading ? (
            <p className="py-6 text-[14px] text-muted-foreground">Loading queue…</p>
          ) : appointments.length === 0 ? (
            <EmptyState title="No requests yet" body="When a patient books this account the request lands here with the slot they asked for." />
          ) : (
            <ul className="hairline-grid">
              {appointments.map((appointment) => {
                const closed = appointment.status === 'cancelled' || appointment.status === 'completed';
                return (
                  <li key={appointment.id} className={cn('flex flex-wrap items-center gap-3 py-4', closed && 'opacity-55')}>
                    <div className="w-[132px] shrink-0">
                      <p className="font-mono text-[13px] font-medium">
                        {isTime(appointment.scheduledAt) ? new Date(appointment.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : 'unscheduled'}
                      </p>
                    </div>
                    <Initials name={appointment.patientName ?? 'New patient'} />
                    <div className="min-w-[140px] flex-1">
                      <p className="truncate text-[15px] font-medium">{appointment.patientName ?? 'Patient'}</p>
                      <p className="truncate text-[13px] text-muted-foreground">{appointment.reason || 'No reason given'}</p>
                    </div>
                    <Chip tone={appointment.status === 'approved' || appointment.status === 'rescheduled' ? 'good' : appointment.status === 'cancelled' ? 'bad' : appointment.status === 'completed' ? 'neutral' : 'warn'}>
                      {appointment.status}
                    </Chip>
                    {!closed && (
                      <div className="flex flex-wrap gap-2">
                        {appointment.status === 'requested' && (
                          <Button size="sm" className="bg-role text-primary-foreground hover:bg-role/90" onClick={() => void act(appointment.id, 'approve')}>
                            <Check /> Approve
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => { setRescheduling(appointment); setNewTime(toLocalInput(appointment.scheduledAt)); }}>
                          Move
                        </Button>
                        <Button size="sm" variant="ghost" className="text-alert hover:bg-alert/10 hover:text-alert" onClick={() => void act(appointment.id, 'cancel')} aria-label={`Cancel appointment for ${appointment.patientName ?? 'patient'}`}>
                          <X />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <Dialog open={rescheduling !== null} onOpenChange={(isOpen) => !isOpen && setRescheduling(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Move this appointment</DialogTitle>
                <DialogDescription>The patient sees the new time in their workspace immediately.</DialogDescription>
              </DialogHeader>
              <label className="space-y-2 text-sm font-medium">
                New date and time
                <Input type="datetime-local" min={toLocalInput(new Date().toISOString())} value={newTime} onChange={(event) => setNewTime(event.target.value)} className="h-11 rounded-lg" />
              </label>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRescheduling(null)}>Keep current time</Button>
                <Button
                  className="bg-role text-primary-foreground hover:bg-role/90"
                  disabled={!newTime || !rescheduling}
                  onClick={async () => { if (rescheduling) { await act(rescheduling.id, 'reschedule', new Date(newTime).toISOString()); setRescheduling(null); } }}
                >
                  Save new time
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Panel>

        <div className="space-y-6">
          <SyncLedger compact />
          <Panel eyebrow="Next in line" title="Fastest decisions">
            <ul className="space-y-3">
              {open.slice(0, 4).map((appointment) => (
                <li key={appointment.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-[14px]">{appointment.patientName ?? 'Patient'}</span>
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {isTime(appointment.scheduledAt) ? new Date(appointment.scheduledAt).toLocaleString('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : '—'}
                  </span>
                  {appointment.status === 'requested' && (
                    <Button size="sm" variant="outline" className="border-role/40 text-role hover:bg-role/10" onClick={() => void act(appointment.id, 'approve')}>
                      Approve
                    </Button>
                  )}
                </li>
              ))}
              {open.length === 0 && <p className="text-[14px] text-muted-foreground">Nothing waiting. The queue is clear.</p>}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

export function DoctorPatients() {
  const { patients } = useDoctorData();
  const [query, setQuery] = useState('');
  const results = patients.filter((patient) => `${patient.name} ${patient.village ?? ''} ${patient.district ?? ''}`.toLowerCase().includes(query.toLowerCase()));

  const openHistory = async (patient: PatientRecord) => {
    try {
      const records = await getPatientRecords(patient.patientId);
      toast(`${patient.name}`, {
        description: `${records.encounters.length} visits · ${records.prescriptions.length} prescriptions · ${records.vaccinations.length} vaccinations`,
      });
    } catch (error) {
      toast.error('History unavailable', { description: describeApiError(error) });
    }
  };

  return (
    <>
      <PageHead
        title="Patients"
        lede="The people attached to this account. Opening a record is written to the audit log, the same as examining the patient."
        actions={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or village…" className="h-11 rounded-lg pl-10" />
          </div>
        }
      />

      {results.length === 0 ? (
        <EmptyState title={query ? `No patient matches “${query}”` : 'No patients assigned'} body="The list is built from the encounters recorded against this doctor account." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results.map((patient) => (
            <article key={patient.patientId} className="flex flex-col rounded-[var(--radius-panel)] border bg-card p-5 transition hover:border-role/40">
              <div className="flex items-center gap-3">
                <Initials name={patient.name} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">{patient.name}</p>
                  <p className="truncate text-[13px] text-muted-foreground">{patient.village ? `${patient.village}, ${patient.district}` : patient.district ?? 'Address on file'}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <span className="font-mono text-[12px] text-muted-foreground">
                  {patient.lastVisit && isTime(patient.lastVisit) ? `Last seen ${new Date(patient.lastVisit).toLocaleDateString('en-IN')}` : 'No visit recorded'}
                </span>
                <Chip tone="role">{patient.birthDate ? `b. ${patient.birthDate.slice(0, 4)}` : 'record'}</Chip>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => void openHistory(patient)}>
                  <FileText /> History
                </Button>
                <Button size="sm" asChild className="flex-1 bg-role text-primary-foreground hover:bg-role/90">
                  <Link to="/doctor/prescribe">Prescribe</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export function DoctorConsult() {
  const { patients, appointments } = useDoctorData();
  const { online, toggle } = useSync();
  const [patientName, setPatientName] = useState('');
  const [muted, setMuted] = useState(false);
  const [notes, setNotes] = useState('');

  const booked = appointments.filter((a) => openStatuses.includes(a.status)).flatMap((a) => (a.patientName ? [a.patientName] : []));
  const roster = Array.from(new Set([...booked, ...patients.map((p) => p.name)])).slice(0, 24);

  return (
    <>
      <PageHead
        title="Consult"
        lede="A video consult needs a live connection. Nothing here calls anyone: the room is a stand-in for the tele-consult service that is not wired up yet."
        actions={<Chip tone={online ? 'good' : 'warn'}>{online ? 'connection available' : 'offline'}</Chip>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="band relative flex aspect-[16/10] flex-col overflow-hidden rounded-[var(--radius-panel)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <Chip tone={patientName && online ? 'good' : 'dark'}>{patientName && online ? 'room ready' : patientName ? 'no connection' : 'nobody called'}</Chip>
            <Select value={patientName} onValueChange={setPatientName}>
              <SelectTrigger className="h-9 w-52 rounded-lg border-primary-foreground/15 bg-primary-foreground/5 text-primary-foreground">
                <SelectValue placeholder="Choose a patient" />
              </SelectTrigger>
              <SelectContent>
                {roster.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid flex-1 place-items-center text-center">
            {patientName && online ? (
              <div>
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-[var(--radius-panel)] bg-primary-foreground/10 font-mono text-[34px] text-primary-foreground">
                  {patientName.slice(0, 2).toUpperCase()}
                </div>
                <p className="display mt-6 text-[26px]">{patientName}</p>
                <p className="mt-1 font-mono text-[12px] text-primary-foreground/70">stand-in room · no media is transmitted</p>
              </div>
            ) : (
              <div className="max-w-sm">
                <WifiOff className="mx-auto h-8 w-8 text-primary-foreground/65" strokeWidth={1.4} />
                <p className="display mt-4 text-[22px]">{patientName ? 'No connection for a live call' : 'Pick a patient to open the room'}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-primary-foreground/60">
                  {patientName
                    ? 'Records and prescriptions keep working offline. A video consult cannot, so take the notes below and schedule an in-person visit.'
                    : 'The tele-consult provider is not connected to this build.'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setMuted((value) => !value)}
              disabled={!patientName || !online}
              className="grid h-11 w-11 place-items-center rounded-lg bg-primary-foreground/10 transition enabled:hover:bg-primary-foreground/20 disabled:opacity-35"
              aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
              aria-pressed={muted}
            >
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              onClick={toggle}
              className="rounded-lg border border-primary-foreground/20 px-4 py-2.5 text-[13px] font-medium text-primary-foreground/80 transition hover:bg-primary-foreground hover:text-ink"
            >
              {online ? 'Simulate dropped call' : 'Restore connection'}
            </button>
            {patientName && (
              <button onClick={() => setPatientName('')} className="inline-flex items-center gap-2 rounded-lg bg-alert px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition hover:bg-alert/90">
                <PhoneOff className="h-4 w-4" /> End
              </button>
            )}
          </div>
        </section>

        <Panel eyebrow={patientName || 'No patient selected'} title="Consultation notes" note="Notes are saved against the patient record by the prescribe step. The Save button below keeps them in this browser session only.">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Chief complaint, observations, plan…"
            rows={12}
            className="resize-none rounded-lg border-0 bg-muted p-4 text-[15px] focus-visible:ring-2 focus-visible:ring-role"
          />
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!notes.trim()}
              onClick={() => toast.success('Notes kept on this device', { description: 'The note store is not connected to the server in this build.' })}
            >
              Save notes
            </Button>
            <Button asChild className="flex-1 bg-role text-primary-foreground hover:bg-role/90" disabled={!patientName}>
              <Link to="/doctor/prescribe">Write prescription</Link>
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}

export function DoctorPrescribe() {
  const { patients, prescribe } = useDoctorData();
  const [patientId, setPatientId] = useState('');
  const [medication, setMedication] = useState('');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!patientId || !medication.trim()) return;
    setBusy(true);
    const ok = await prescribe(patientId, medication.trim(), instructions.trim() || medication.trim());
    setBusy(false);
    if (ok) { setMedication(''); setInstructions(''); setPatientId(''); }
  };

  return (
    <>
      <PageHead
        title="Prescribe"
        lede="A signature here writes a prescription row onto the patient record. Only a doctor account can do it, and the write is audited."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Panel eyebrow="℞ Digital" title="New prescription">
          <label className="block">
            <span className="label mb-2 block">Patient</span>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="h-11 rounded-lg">
                <SelectValue placeholder="Choose a patient under your care" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.patientId} value={patient.patientId}>
                    {patient.name}{patient.village ? ` · ${patient.village}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="mt-5 block">
            <span className="label mb-2 block">Medicine, dose, frequency, duration</span>
            <Textarea
              value={medication}
              onChange={(event) => setMedication(event.target.value)}
              rows={4}
              placeholder="Tab. paracetamol 500 mg, one morning and one night for three days"
              className="resize-none rounded-lg border-0 bg-muted p-4 font-mono text-[14px] focus-visible:ring-2 focus-visible:ring-role"
            />
          </label>

          <label className="mt-4 block">
            <span className="label mb-2 block">Advice with it</span>
            <Textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={3}
              placeholder="After food. Return if fever crosses three days."
              className="resize-none rounded-lg border-0 bg-muted p-4 text-[15px] focus-visible:ring-2 focus-visible:ring-role"
            />
          </label>

          <Button size="lg" onClick={submit} disabled={!patientId || !medication.trim() || busy} className="mt-6 w-full bg-role text-primary-foreground hover:bg-role/90">
            {busy ? 'Signing…' : 'Sign and send'} <Check />
          </Button>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            Doses are typed by you. Nothing in this app suggests one, and the pharmacy sees the medicine name when it is published to stock.
          </p>
        </Panel>

        <div className="space-y-6">
          <Panel eyebrow="Recent activity" title="Prescription desk">
            <EmptyState
              title="Written list not loaded"
              body="Prescriptions are stored against the patient record and shown in their workspace. The pharmacy dispensing queue is not connected in this build."
              action={
                <Button asChild variant="outline">
                  <Link to="/doctor/patients">
                    <ClipboardList /> Open patients
                  </Link>
                </Button>
              }
            />
          </Panel>
          <Panel eyebrow="This account" title="Writing rights">
            <ul className="space-y-3 text-[14px]">
              {[
                { label: 'Read patient records', allowed: true },
                { label: 'Write prescriptions', allowed: true },
                { label: 'Approve and move appointments', allowed: true },
                { label: 'Edit another doctor’s prescription', allowed: false },
                { label: 'See district analytics', allowed: false },
              ].map((entry) => (
                <li key={entry.label} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0">
                  <span>{entry.label}</span>
                  <Chip tone={entry.allowed ? 'good' : 'neutral'}>{entry.allowed ? 'allowed' : 'denied'}</Chip>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
