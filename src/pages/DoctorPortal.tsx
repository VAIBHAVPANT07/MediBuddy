import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getFromStorage, cn } from '@/lib/utils';
import { PortalShell, Panel, Stat, Pill, Initials } from '@/components/portal';
import { approveAppointment, cancelAppointment, getDoctorAppointments, getDoctorPatients, getPatientRecords, createPrescription as createPrescriptionRequest, rescheduleAppointment, type AppointmentRecord, type PatientRecord } from '@/lib/api';
import { Calendar, FileText, Video, Users, Check, X, Download, Search, Mic, MicOff, PhoneOff, ClipboardList, Clock, Activity } from 'lucide-react';

interface DoctorPortalProps {
  onLogout: () => void;
}

interface DoctorAppointment extends AppointmentRecord {
  patientName: string;
}

const dateTimeLocalValue = (isoDate: string) => {
  const local = new Date(isoDate);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
};

export default function DoctorPortal({ onLogout }: DoctorPortalProps) {
  const [selectedPatient, setSelectedPatient] = useState('');
  const [prescription, setPrescription] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [patientQuery, setPatientQuery] = useState('');
  const [inCall, setInCall] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState('');
  const [doctorPatients,setDoctorPatients]=useState<PatientRecord[]>([]);

  const userMobile = (getFromStorage('userMobile') as string) || '9876543210';

  useEffect(() => {
    let active = true;
    Promise.all([getDoctorAppointments(),getDoctorPatients()])
      .then(([rows,patients]) => { if (active) { setAppointments(rows as DoctorAppointment[]); setDoctorPatients(patients); } })
      .catch(() => toast.error('Could not load appointments', { description: 'Check your connection and try again.' }))
      .finally(() => { if (active) setAppointmentsLoading(false); });
    return () => { active = false; };
  }, []);

  const setStatus = async (appointment: DoctorAppointment, status: 'approved' | 'cancelled') => {
    try {
      const updated = status === 'approved'
        ? await approveAppointment(appointment.id, appointment.scheduledAt)
        : await cancelAppointment(appointment.id);
      setAppointments((list) => list.map((row) => row.id === appointment.id ? { ...row, ...updated } : row));
      toast.success(status === 'approved' ? 'Appointment approved' : 'Appointment cancelled');
    } catch {
      toast.error('Appointment could not be updated', { description: 'Refresh the queue and try again.' });
    }
  };

  const saveReschedule = async (appointment: DoctorAppointment) => {
    if (!rescheduleAt) return;
    try {
      const updated = await rescheduleAppointment(appointment.id, new Date(rescheduleAt).toISOString());
      setAppointments((list) => list.map((row) => row.id === appointment.id ? { ...row, ...updated } : row));
      setReschedulingId(null);
      toast.success('Appointment rescheduled');
    } catch {
      toast.error('Could not reschedule appointment', { description: 'Choose a future time and try again.' });
    }
  };

  const savePrescription = async () => {
    if (selectedPatient && prescription) {
      try {
        await createPrescriptionRequest({patientId:selectedPatient,medicationName:prescription,instructions:consultationNotes || prescription});
        toast.success('Prescription saved to patient record'); setPrescription(''); setConsultationNotes(''); setSelectedPatient('');
      } catch { toast.error('Prescription could not be saved',{description:'Select a patient assigned to your account.'}); }
    }
  };

  const startVideoCall = (patientName: string) => {
    setInCall(patientName);
    toast(`Connecting to ${patientName}…`, { description: 'Low-bandwidth mode enabled.' });
  };

  const patients = doctorPatients.filter((p) => `${p.name} ${p.village ?? ''}`.toLowerCase().includes(patientQuery.toLowerCase()));
  const patientName = (id: string) => doctorPatients.find((p) => p.patientId === id)?.name ?? id;

  return (
    <PortalShell
      role="doctor"
      portalName="Doctor portal"
      title={
        <>
          Good morning, <em>Doctor.</em>
        </>
      }
      subtitle={`Dr. ${userMobile} · You have ${appointments.filter((a) => a.status !== 'cancelled').length} appointments in your queue.`}
      user={`Dr. ${userMobile.slice(-4)}`}
      defaultValue="appointments"
      onLogout={onLogout}
      nav={[
        { value: 'appointments', label: 'Today', icon: Calendar },
        { value: 'patients', label: 'Patients', icon: Users },
        { value: 'consultations', label: 'Consultations', icon: Video },
        { value: 'prescriptions', label: 'Prescriptions', icon: FileText },
      ]}
    >
      {/* Appointments */}
      <TabsContent value="appointments" className="mt-0 space-y-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat accent label="Today" value={appointments.length} hint="Appointments" icon={Calendar} />
          <Stat label="Approved" value={appointments.filter((a) => a.status === 'approved').length} hint="Ready to start" icon={Check} />
          <Stat label="Patients" value={doctorPatients.length} hint="Under your care" icon={Users} />
          <Stat label="Avg. consult" value="12m" hint="This week" icon={Clock} />
        </div>

        <Panel eyebrow="Queue" title="Today’s appointments">
          <div className="divide-y">
              {appointmentsLoading ? <p className="py-8 text-sm text-muted-foreground">Loading appointment queue…</p> : appointments.length === 0 ? <p className="py-8 text-sm text-muted-foreground">No appointment requests have been assigned to you yet.</p> : appointments.map((apt) => (
              <div key={apt.id} className={cn('flex flex-wrap items-center gap-4 py-5', apt.status === 'cancelled' && 'opacity-50')}>
                <p className="w-36 font-mono text-xs">{new Date(apt.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</p>
                <Initials name={apt.patientName} />
                <div className="min-w-[140px] flex-1">
                  <p className="font-medium">{apt.patientName}</p>
                  <p className="text-sm text-muted-foreground">{apt.reason || 'Appointment request'}</p>
                </div>
                <Pill tone={apt.status === 'approved' || apt.status === 'rescheduled' ? 'good' : apt.status === 'cancelled' ? 'bad' : 'warn'}>{apt.status}</Pill>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-role hover:bg-role/90" onClick={() => startVideoCall(apt.patientName)} disabled={apt.status === 'cancelled' || apt.status === 'completed'}>
                    <Video /> Start call
                  </Button>
                  {apt.status === 'requested' && <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setStatus(apt, 'approved')} aria-label="Approve appointment"><Check /></Button>}
                  {apt.status !== 'cancelled' && apt.status !== 'completed' && <>
                    <Dialog open={reschedulingId === apt.id} onOpenChange={(isOpen) => { setReschedulingId(isOpen ? apt.id : null); if (isOpen) setRescheduleAt(dateTimeLocalValue(apt.scheduledAt)); }}>
                      <DialogTrigger asChild><Button size="sm" variant="outline">Reschedule</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Reschedule appointment</DialogTitle><DialogDescription>Choose a new appointment time. The patient will see the updated schedule.</DialogDescription></DialogHeader>
                        <label className="space-y-2 text-sm font-medium">New date and time<Input type="datetime-local" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} value={rescheduleAt} onChange={(event) => setRescheduleAt(event.target.value)} className="h-12 rounded-xl" /></label>
                        <DialogFooter><Button variant="outline" onClick={() => setReschedulingId(null)}>Keep current time</Button><Button className="bg-role hover:bg-role/90" onClick={() => saveReschedule(apt)} disabled={!rescheduleAt}>Save new time</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setStatus(apt, 'cancelled')} aria-label="Cancel appointment"><X /></Button>
                  </>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </TabsContent>

      {/* Patients */}
      <TabsContent value="patients" className="mt-0">
        <Panel eyebrow="Medical history" title="Patient records">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or condition…" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} className="h-12 rounded-full pl-11" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {patients.map((patient) => (
              <div key={patient.patientId} className="flex flex-col rounded-2xl border p-6 transition hover:border-role/40">
                <div className="flex items-center gap-3">
                  <Initials name={patient.name} />
                  <div>
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-sm text-muted-foreground">{patient.village ? `${patient.village}, ${patient.district}` : 'Assigned patient'}</p>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm">
                  <Pill tone="role">
                    <Activity className="h-3 w-3" /> Patient record
                  </Pill>
                  <span className="font-mono text-xs text-muted-foreground">{patient.lastVisit ? `Last · ${new Date(patient.lastVisit).toLocaleDateString('en-IN')}` : 'No visit yet'}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={async()=>{try{const records=await getPatientRecords(patient.patientId);toast(`Record loaded`,{description:`${records.encounters.length} visits · ${records.prescriptions.length} prescriptions · ${records.vaccinations.length} vaccinations`})}catch{toast.error('Patient history unavailable')}}}>
                    <FileText /> History
                  </Button>
                  <Button size="sm" className="flex-1 bg-role hover:bg-role/90" onClick={() => startVideoCall(patient.name)}>
                    <Video /> Consult
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </TabsContent>

      {/* Consultations */}
      <TabsContent value="consultations" className="mt-0">
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="grain relative flex aspect-video min-h-[360px] flex-col overflow-hidden rounded-[28px] bg-ink p-6 text-white">
            <div className="flex items-center justify-between">
              <Pill tone={inCall ? 'good' : 'neutral'}>{inCall ? '● Live' : 'Idle'}</Pill>
              <Select value={inCall ?? ''} onValueChange={setInCall}>
                <SelectTrigger className="h-9 w-48 rounded-full border-white/15 bg-white/5 text-white">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {doctorPatients.map((p) => (
                    <SelectItem key={p.patientId} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid flex-1 place-items-center text-center">
              {inCall ? (
                <div>
                  <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-role font-display text-5xl shadow-[0_0_0_12px_hsl(var(--role)/0.2),0_0_0_28px_hsl(var(--role)/0.1)]">
                    {inCall[0]}
                  </div>
                  <p className="mt-8 font-display text-4xl">{inCall}</p>
                  <p className="mt-1 font-mono text-xs text-white/50">Connected · 360p · 128 kbps</p>
                </div>
              ) : (
                <div>
                  <Video className="mx-auto h-10 w-10 text-white/40" strokeWidth={1.25} />
                  <p className="mt-4 text-white/60">Select a patient to start a consultation</p>
                </div>
              )}
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setMuted(!muted)} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Toggle mute">
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              {inCall ? (
                <button onClick={() => setInCall(null)} className="flex h-12 items-center gap-2 rounded-full bg-red-600 px-6 text-sm font-medium hover:bg-red-700">
                  <PhoneOff className="h-4 w-4" /> End call
                </button>
              ) : (
                <button disabled className="flex h-12 items-center gap-2 rounded-full bg-white/10 px-6 text-sm text-white/40">
                  <Video className="h-4 w-4" /> Waiting
                </button>
              )}
            </div>
          </div>

          <Panel eyebrow={inCall ?? 'No active patient'} title="Consultation notes">
            <Textarea
              placeholder="Chief complaint, observations, plan…"
              value={consultationNotes}
              onChange={(e) => setConsultationNotes(e.target.value)}
              rows={10}
              className="resize-none rounded-2xl border-0 bg-muted/60 p-5 focus-visible:ring-role"
            />
            <Button className="mt-4 w-full" onClick={() => toast.success('Notes saved')} disabled={!consultationNotes.trim()}>
              Save notes
            </Button>
          </Panel>
        </div>
      </TabsContent>

      {/* Prescriptions */}
      <TabsContent value="prescriptions" className="mt-0">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Panel eyebrow="℞ Digital" title="Create prescription">
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {doctorPatients.map((patient) => (
                  <SelectItem key={patient.patientId} value={patient.patientId}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Medicine, dosage, frequency, duration…"
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              rows={6}
              className="mt-4 resize-none rounded-2xl border-0 bg-muted/60 p-5 font-mono text-sm focus-visible:ring-role"
            />
            <Textarea
              placeholder="Additional notes…"
              value={consultationNotes}
              onChange={(e) => setConsultationNotes(e.target.value)}
              rows={3}
              className="mt-4 resize-none rounded-2xl border-0 bg-muted/60 p-5 focus-visible:ring-role"
            />
            <Button size="lg" onClick={savePrescription} disabled={!selectedPatient || !prescription} className="mt-6 w-full bg-role hover:bg-role/90">
              Sign & send prescription
            </Button>
          </Panel>

          <Panel eyebrow="History" title="Recent prescriptions">
            <div className="space-y-3">
              {appointments.filter((item)=>item.status!=='cancelled').slice(0,8).map((item, i) => (
                <div key={i} className="rounded-2xl border p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <ClipboardList className="h-4 w-4 text-role" />
                      <p className="font-medium">{item.patientName}</p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{new Date(item.scheduledAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="mt-3 font-mono text-sm text-muted-foreground">{item.reason || 'Appointment record'}</p>
                  <Button size="sm" variant="ghost" className="-ml-3 mt-2">
                    <Download /> Download PDF
                  </Button>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </TabsContent>
    </PortalShell>
  );
}
