import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SessionProvider, RequireWorkspace } from '@/lib/session';
import { SyncProvider } from '@/lib/sync';
import Landing from '@/pages/landing';
import SignIn from '@/pages/sign-in';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/** A workspace is a person's desk, not a page they pass through: its code loads when they arrive. */
function fromModule<T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) {
  return lazy(() => load().then((m) => ({ default: m[name] as ComponentType })));
}

const patientModule = () => import('@/pages/patient');
const doctorModule = () => import('@/pages/doctor');
const adminModule = () => import('@/pages/admin');
const pharmacyModule = () => import('@/pages/pharmacy');

const PatientWorkspace = fromModule(patientModule, 'PatientWorkspace');
const PatientHome = fromModule(patientModule, 'PatientHome');
const PatientGuidance = fromModule(patientModule, 'PatientGuidance');
const PatientAppointments = fromModule(patientModule, 'PatientAppointments');
const PatientRecords = fromModule(patientModule, 'PatientRecords');
const PatientMedicines = fromModule(patientModule, 'PatientMedicines');
const PatientSchemes = fromModule(patientModule, 'PatientSchemes');
const PatientEmergency = fromModule(patientModule, 'PatientEmergency');

const DoctorWorkspace = fromModule(doctorModule, 'DoctorWorkspace');
const DoctorQueue = fromModule(doctorModule, 'DoctorQueue');
const DoctorPatients = fromModule(doctorModule, 'DoctorPatients');
const DoctorConsult = fromModule(doctorModule, 'DoctorConsult');
const DoctorPrescribe = fromModule(doctorModule, 'DoctorPrescribe');

const AdminWorkspace = fromModule(adminModule, 'AdminWorkspace');
const AdminOverview = fromModule(adminModule, 'AdminOverview');
const AdminVillages = fromModule(adminModule, 'AdminVillages');
const AdminResources = fromModule(adminModule, 'AdminResources');
const AdminReports = fromModule(adminModule, 'AdminReports');

const PharmacyWorkspace = fromModule(pharmacyModule, 'PharmacyWorkspace');
const PharmacyStock = fromModule(pharmacyModule, 'PharmacyStock');
const PharmacyLedger = fromModule(pharmacyModule, 'PharmacyLedger');
const PharmacyInsights = fromModule(pharmacyModule, 'PharmacyInsights');

function LoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-3 bg-background">
      <span className="beacon h-2.5 w-2.5 rounded-full bg-role" />
      <p className="label text-muted-foreground">Opening your workspace</p>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SessionProvider>
        <SyncProvider>
          <TooltipProvider>
            <Suspense fallback={<LoadingShell />}>
              <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<SignIn />} />

              <Route path="/patient" element={<RequireWorkspace role="patient"><PatientWorkspace /></RequireWorkspace>}>
                <Route index element={<PatientHome />} />
                <Route path="guidance" element={<PatientGuidance />} />
                <Route path="appointments" element={<PatientAppointments />} />
                <Route path="records" element={<PatientRecords />} />
                <Route path="medicines" element={<PatientMedicines />} />
                <Route path="schemes" element={<PatientSchemes />} />
                <Route path="emergency" element={<PatientEmergency />} />
              </Route>

              <Route path="/doctor" element={<RequireWorkspace role="doctor"><DoctorWorkspace /></RequireWorkspace>}>
                <Route index element={<DoctorQueue />} />
                <Route path="patients" element={<DoctorPatients />} />
                <Route path="consult" element={<DoctorConsult />} />
                <Route path="prescribe" element={<DoctorPrescribe />} />
              </Route>

              <Route path="/admin" element={<RequireWorkspace role="admin"><AdminWorkspace /></RequireWorkspace>}>
                <Route index element={<AdminOverview />} />
                <Route path="villages" element={<AdminVillages />} />
                <Route path="resources" element={<AdminResources />} />
                <Route path="reports" element={<AdminReports />} />
              </Route>

              <Route path="/pharmacy" element={<RequireWorkspace role="seller"><PharmacyWorkspace /></RequireWorkspace>}>
                <Route index element={<PharmacyStock />} />
                <Route path="ledger" element={<PharmacyLedger />} />
                <Route path="insights" element={<PharmacyInsights />} />
              </Route>

              <Route path="/auth" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
          <Toaster position="bottom-center" />
        </SyncProvider>
      </SessionProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
