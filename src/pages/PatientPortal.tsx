import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { translations, analyzeSymptoms, governmentSchemes, getFromStorage, cn } from '@/lib/utils';
import { PortalShell, Panel, Pill, Initials } from '@/components/portal';
import { cancelAppointment as cancelAppointmentRequest, createAppointment, getCareProviders, getMyAppointments, getMyPatientRecords, getPharmacyCatalog, type AppointmentRecord, type CareProvider, type PharmacyMedicine } from '@/lib/api';
import {
  Sparkles,
  Calendar,
  FileText,
  Pill as PillIcon,
  Phone,
  Ambulance,
  Car,
  Upload,
  Download,
  Landmark,
  Siren,
  Search,
  ArrowUpRight,
  Check,
} from 'lucide-react';

interface PatientPortalProps {
  onLogout: () => void;
}

interface SymptomAnalysis {
  condition: string;
  severity: string;
  recommendations: string[];
  homeRemedies: string[];
  urgency: string;
}

const slots = ['09:00 AM', '10:00 AM', '02:00 PM', '04:00 PM'];
const quickSymptoms = ['Fever', 'Cough', 'Headache', 'Stomach pain', 'Chest pain'];

const urgencyTone = { High: 'bad', Medium: 'warn', Low: 'good' } as const;

export default function PatientPortal({ onLogout }: PatientPortalProps) {
  const [currentLang, setCurrentLang] = useState<'en' | 'hi' | 'pa'>('en');
  const [symptoms, setSymptoms] = useState('');
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [doctors, setDoctors] = useState<CareProvider[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [medicines,setMedicines]=useState<PharmacyMedicine[]>([]);
  const [healthRecords,setHealthRecords]=useState<{patientId?:string;encounters:Array<{id:string;occurredAt:string;summary:string}>;prescriptions:Array<{id:string;issuedAt:string;medicationName:string;instructions:string}>;vaccinations:Array<{id:string;vaccineName:string;administeredAt:string}>}>({encounters:[],prescriptions:[],vaccinations:[]});
  const [medicineQuery, setMedicineQuery] = useState('');
  const [uploads, setUploads] = useState<string[]>([]);

  const t = translations[currentLang];
  const userMobile = (getFromStorage('userMobile') as string) || '9876543210';

  useEffect(() => {
    let active = true;
    Promise.all([getCareProviders(), getMyAppointments(),getPharmacyCatalog(),getMyPatientRecords()])
      .then(([providerRows, appointmentRows,medicineRows,records]) => {
        if (!active) return;
        setDoctors(providerRows);
        setAppointments(appointmentRows);
        setMedicines(medicineRows);
        setHealthRecords(records);
      })
      .catch(() => toast.error('Appointments are unavailable', { description: 'Check your connection and try again.' }))
      .finally(() => { if (active) setAppointmentsLoading(false); });
    return () => { active = false; };
  }, []);

  const handleSymptomAnalysis = () => {
    if (symptoms.trim()) {
      const result = analyzeSymptoms(symptoms);
      setAnalysis(result);
    }
  };

  const bookAppointment = async () => {
    if (selectedDoctor && appointmentDate && appointmentTime) {
      const [clock, period] = appointmentTime.split(' ');
      const [hourText, minute] = clock.split(':');
      const hour = (Number(hourText) % 12) + (period === 'PM' ? 12 : 0);
      const localDateTime = `${appointmentDate}T${String(hour).padStart(2, '0')}:${minute}:00`;
      try {
        const appointment = await createAppointment({ doctorId: selectedDoctor, scheduledAt: new Date(localDateTime).toISOString() });
        setAppointments((current) => [{ ...appointment, doctorName: doctors.find((doctor) => doctor.id === selectedDoctor)?.name }, ...current]);
        toast.success('Appointment requested', { description: `${doctors.find((doctor) => doctor.id === selectedDoctor)?.name} · ${appointmentDate} at ${appointmentTime}` });
        setSelectedDoctor('');
        setAppointmentDate('');
        setAppointmentTime('');
      } catch {
        toast.error('Could not request appointment', { description: 'Choose a future time and try again.' });
      }
    }
  };

  const cancelAppointment = async (id: string) => {
    try {
      const updated = await cancelAppointmentRequest(id);
      setAppointments((current) => current.map((appointment) => appointment.id === id ? { ...appointment, ...updated } : appointment));
      toast.success('Appointment cancelled');
    } catch {
      toast.error('Could not cancel appointment', { description: 'Refresh the page and check the appointment status.' });
    }
  };

  const callEmergency = (service: string) => {
    toast(`Connecting to ${service}…`, { description: 'Your location is being shared with the nearest unit.' });
  };

  const downloadHealthRecord = () => {
    const healthData = {
      patientId: userMobile,
      records: healthRecords,
    };

    const dataStr = JSON.stringify(healthData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'health-records.json';
    link.click();

  };

  const filteredMedicines = medicines.filter((m) => m.name.toLowerCase().includes(medicineQuery.toLowerCase()));

  return (
    <PortalShell
      role="patient"
      portalName="Patient portal"
      title={
        <>
          Namaste, <em>let’s check in.</em>
        </>
      }
      subtitle={`Patient #${userMobile} · Your health, appointments and records in one place.`}
      user={`Patient ${userMobile.slice(-4)}`}
      defaultValue="symptoms"
      onLogout={onLogout}
      nav={[
        { value: 'symptoms', label: 'Symptom checker', icon: Sparkles },
        { value: 'appointments', label: 'Appointments', icon: Calendar },
        { value: 'records', label: 'Health records', icon: FileText },
        { value: 'medicines', label: 'Medicines', icon: PillIcon },
        { value: 'schemes', label: 'Gov schemes', icon: Landmark },
        { value: 'emergency', label: 'Emergency', icon: Siren },
      ]}
      headerExtra={
        <Select value={currentLang} onValueChange={(value: 'en' | 'hi' | 'pa') => setCurrentLang(value)}>
          <SelectTrigger className="h-10 w-32 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="hi">हिंदी</SelectItem>
            <SelectItem value="pa">ਪੰਜਾਬੀ</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {/* AI Symptom Checker */}
      <TabsContent value="symptoms" className="mt-0">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <Panel
            eyebrow="Symptom guidance · Demo"
            title={t.aiSymptomChecker}
          >
            <div className="relative">
              <Textarea
                placeholder={t.symptoms}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="min-h-[180px] resize-none rounded-2xl border-0 bg-muted/60 p-5 pr-16 text-lg focus-visible:ring-role"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {quickSymptoms.map((s) => (
                <button key={s} onClick={() => setSymptoms(s)} className="rounded-full border px-3.5 py-1.5 text-sm transition hover:border-role hover:text-role">
                  {s}
                </button>
              ))}
            </div>
            <Button size="lg" onClick={handleSymptomAnalysis} disabled={!symptoms.trim()} className="mt-8 bg-role hover:bg-role/90">
              Analyse symptoms <ArrowUpRight />
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">Guidance only — not a diagnosis. For emergencies, call 108.</p>
          </Panel>

          {analysis ? (
            <Panel
              className="grain border-transparent bg-ink text-[hsl(42_30%_94%)]"
              eyebrow={<span className="text-white/50">Result</span>}
              title={analysis.condition}
              action={<Pill tone={urgencyTone[analysis.urgency as keyof typeof urgencyTone] ?? 'neutral'}>{analysis.urgency} priority</Pill>}
            >
              <p className="text-white/60">Severity: {analysis.severity}</p>
              {[
                ['Recommendations', analysis.recommendations],
                ['Home remedies', analysis.homeRemedies],
              ].map(([label, items]) => (
                <div key={label as string} className="mt-8">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">{label as string}</p>
                  </div>
                  <ul className="divide-y divide-white/10 border-y border-white/10">
                    {(items as string[]).map((item, i) => (
                      <li key={i} className="flex gap-4 py-3 text-[15px]">
                        <span className="font-mono text-xs text-white/40">0{i + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </Panel>
          ) : (
            <div className="grid place-items-center rounded-[28px] border border-dashed p-10 text-center">
              <div>
                <Sparkles className="mx-auto h-8 w-8 text-role" strokeWidth={1.25} />
                <p className="mt-4 font-display text-3xl">Your analysis appears here</p>
                <p className="mt-2 text-sm text-muted-foreground">Describe how you feel, or tap the mic to speak.</p>
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Appointments */}
      <TabsContent value="appointments" className="mt-0">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Panel eyebrow="New booking" title={t.bookAppointment}>
            <p className="eyebrow mb-3">Doctor</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {doctors.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDoctor(d.id)}
                  className={cn('flex flex-col gap-4 rounded-2xl border p-4 text-left transition', selectedDoctor === d.id ? 'border-role bg-role/5 ring-1 ring-role' : 'hover:bg-muted/60')}
                >
                  <Initials name={d.name} />
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.specialty}</p>
                  </div>
                </button>
              ))}
            </div>
            {doctors.length === 0 && <p className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">No doctors are available yet. Doctors must sign in to join this appointment directory.</p>}

            <p className="eyebrow mb-3 mt-8">Date</p>
            <Input type="date" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)} value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="h-12 rounded-2xl" />

            <p className="eyebrow mb-3 mt-8">Time</p>
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => setAppointmentTime(s)}
                  className={cn('rounded-full border px-4 py-2 font-mono text-sm transition', appointmentTime === s ? 'border-transparent bg-role text-white' : 'hover:bg-muted')}
                >
                  {s}
                </button>
              ))}
            </div>

            <Button size="lg" onClick={bookAppointment} disabled={!selectedDoctor || !appointmentDate || !appointmentTime || doctors.length === 0} className="mt-8 w-full bg-role hover:bg-role/90">
              Request appointment <Check />
            </Button>
          </Panel>

          <Panel eyebrow={`${appointments.filter((appointment) => ['requested','approved','rescheduled'].includes(appointment.status)).length} scheduled`} title="Your appointments">
            <div className="divide-y">
              {appointmentsLoading ? <p className="py-8 text-sm text-muted-foreground">Loading appointments…</p> : appointments.length === 0 ? <p className="py-8 text-sm text-muted-foreground">No appointments yet. Your requests will appear here.</p> : appointments.map((apt) => {
                const date = new Date(apt.scheduledAt);
                const active = ['requested', 'approved', 'rescheduled'].includes(apt.status);
                return <div key={apt.id} className="flex flex-wrap items-center gap-4 py-4">
                  <div className="w-14 text-center">
                    <p className="font-display text-3xl leading-none">{date.getDate() || '—'}</p>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">{date.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })}</p>
                  </div>
                  <div className="min-w-[120px] flex-1">
                    <p className="font-medium">{apt.doctorName}</p>
                    <p className="text-sm text-muted-foreground">{date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</p>
                  </div>
                  <Pill tone={apt.status === 'approved' || apt.status === 'rescheduled' ? 'good' : apt.status === 'cancelled' ? 'bad' : 'warn'}>{apt.status}</Pill>
                  {active && <Button size="sm" variant="outline" onClick={() => cancelAppointment(apt.id)}>Cancel</Button>}
                </div>;
              })}
            </div>
          </Panel>
        </div>
      </TabsContent>

      {/* Health Records */}
      <TabsContent value="records" className="mt-0">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Panel
            eyebrow="Timeline"
            title="Digital health records"
            action={
              <Button variant="outline" onClick={downloadHealthRecord}>
                <Download /> Download
              </Button>
            }
          >
            <ol className="relative border-l pl-8">
              {[
                ...healthRecords.encounters.map((r)=>({id:r.id,title:r.summary||'Clinical encounter',date:r.occurredAt,body:'Encounter record'})),
                ...healthRecords.prescriptions.map((r)=>({id:r.id,title:r.medicationName||'Prescription',date:r.issuedAt,body:r.instructions})),
                ...healthRecords.vaccinations.map((r)=>({id:r.id,title:r.vaccineName||'Vaccination',date:r.administeredAt,body:'Vaccination record'})),
              ].map((r) => (
                <li key={r.id} className="relative pb-10 last:pb-0">
                  <span className="absolute -left-[37px] top-1 h-3 w-3 rounded-full bg-role ring-4 ring-card" />
                  <p className="eyebrow">{r.date ? new Date(r.date).toLocaleDateString('en-IN') : 'Date unavailable'}</p>
                  <p className="mt-2 text-lg font-medium">{r.title}</p>
                  <p className="mt-1 text-muted-foreground">{r.body}</p>
                </li>
              ))}
              {healthRecords.encounters.length+healthRecords.prescriptions.length+healthRecords.vaccinations.length===0&&<p className="py-8 text-sm text-muted-foreground">No clinical records are available yet.</p>}
            </ol>
          </Panel>

          <label className="group flex cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed p-10 text-center transition hover:border-role hover:bg-role/5">
            <input type="file" multiple className="sr-only" onChange={(e) => setUploads(Array.from(e.target.files ?? []).map((f) => f.name))} />
            <span className="grid h-14 w-14 place-items-center rounded-full bg-role/10 text-role transition group-hover:scale-110">
              <Upload className="h-5 w-5" />
            </span>
            <p className="mt-5 font-display text-3xl">Upload reports</p>
            <p className="mt-2 text-sm text-muted-foreground">Lab reports, X-rays or prescriptions</p>
            {uploads.length > 0 && (
              <ul className="mt-6 space-y-1 text-sm">
                {uploads.map((u) => (
                  <li key={u} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-role" /> {u}
                  </li>
                ))}
              </ul>
            )}
          </label>
        </div>
      </TabsContent>

      {/* Medicine Availability */}
      <TabsContent value="medicines" className="mt-0">
        <Panel eyebrow="Nearby pharmacies" title={t.medicineAvailability}>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search medicine…" value={medicineQuery} onChange={(e) => setMedicineQuery(e.target.value)} className="h-12 rounded-full pl-11" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {filteredMedicines.map((med) => (
              <div key={med.id} className="flex items-center gap-4 rounded-2xl border p-5">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-role/10 text-role">
                  <PillIcon className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="font-medium">{med.name}</p>
                  <p className="text-sm text-muted-foreground">{med.category || 'Community pharmacy'}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl leading-none">₹{med.price}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{med.stock} in stock</p>
                </div>
              </div>
            ))}
            {filteredMedicines.length === 0 && <p className="text-muted-foreground">No pharmacy stock is available for “{medicineQuery}”.</p>}
          </div>
        </Panel>
      </TabsContent>

      {/* Government Schemes */}
      <TabsContent value="schemes" className="mt-0">
        <div className="grid gap-6 lg:grid-cols-2">
          {governmentSchemes.map((scheme, index) => (
            <Panel
              key={index}
              eyebrow={`Scheme 0${index + 1}`}
              title={scheme.name}
            >
              <p className="text-lg leading-snug">{scheme.description}</p>
              <dl className="mt-6 divide-y border-y text-sm">
                <div className="grid grid-cols-[110px_1fr] gap-4 py-4">
                  <dt className="eyebrow pt-0.5">Eligibility</dt>
                  <dd>{scheme.eligibility}</dd>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-4 py-4">
                  <dt className="eyebrow pt-0.5">How to apply</dt>
                  <dd>{scheme.applicationProcess}</dd>
                </div>
              </dl>
              <div className="mt-6 flex flex-wrap gap-2">
                {scheme.benefits.map((b) => (
                  <Pill key={b} tone="role">
                    {b}
                  </Pill>
                ))}
              </div>
              <Button
                className="mt-8 w-full"
                onClick={() => toast.success('You may be eligible', { description: `Carry your Aadhaar to the nearest CSC to enrol in ${scheme.name}.` })}
              >
                Check eligibility <ArrowUpRight />
              </Button>
            </Panel>
          ))}
        </div>
      </TabsContent>

      {/* Emergency Services */}
      <TabsContent value="emergency" className="mt-0">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="grain relative overflow-hidden rounded-[28px] bg-red-600 p-8 text-white md:p-10">
            <Ambulance className="h-10 w-10" strokeWidth={1.25} />
            <p className="mt-16 font-mono text-[11px] uppercase tracking-[0.18em] text-white/70">24/7 · Emergency</p>
            <h2 className="mt-2 font-display text-6xl leading-none md:text-7xl">Call an ambulance</h2>
            <p className="mt-4 max-w-sm text-white/80">Call emergency services directly. This app does not share your location.</p>
            <Button size="lg" asChild className="mt-10 bg-white text-red-600 hover:bg-white/90">
              <a href="tel:108" onClick={() => callEmergency('Ambulance')}>
                <Phone /> Call 108
              </a>
            </Button>
          </div>

          <Panel eyebrow="Transport directory" title="Local transport">
            <Car className="h-10 w-10 text-role" strokeWidth={1.25} />
            <p className="mt-6 text-muted-foreground">Local transport booking is not connected in this demo. Ask a nearby health worker for help.</p>
          </Panel>
        </div>
      </TabsContent>
    </PortalShell>
  );
}
