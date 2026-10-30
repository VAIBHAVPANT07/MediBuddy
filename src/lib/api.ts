type Role = 'patient' | 'doctor' | 'admin' | 'seller';
export interface SessionResponse { user:{id:string;phone:string|null;email:string|null;role:string};roles?:string[] }

export interface CareProvider { id: string; name: string; specialty: string }
export interface AppointmentRecord {
  id: string;
  doctorId?: string;
  doctorName?: string;
  specialty?: string;
  patientName?: string;
  scheduledAt: string;
  status: 'requested' | 'approved' | 'rescheduled' | 'cancelled' | 'completed';
  reason?: string | null;
}
export interface PatientRecord { patientId:string; name:string; birthDate?:string; village?:string; district?:string; lastVisit?:string }
export interface PharmacyMedicine { id:string; name:string; category:string|null; stock:number; price:number; expiry?:string }

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

async function apiRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }
  return (response.status === 204 ? null : response.json()) as Promise<T>;
}

export function requestEmailOtp(phone: string, email: string, role: Role) {
  const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
  return apiRequest<{challengeId:string;developmentOtp?:string;delivery?:string}>('/auth/otp/request', {
    method: 'POST', body: JSON.stringify({ phone: normalizedPhone, email, role }),
  });
}

export function verifyEmailOtp(phone: string, email: string, challengeId: string, otp: string, role: Role) {
  const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
  return apiRequest('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone: normalizedPhone, email, challengeId, otp, role }),
  });
}

export function refreshSession() {
  return apiRequest<SessionResponse>('/auth/refresh', { method: 'POST' });
}

export function logoutSession() {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export async function getCareProviders() {
  const result = await apiRequest<{ doctors: CareProvider[] }>('/doctors');
  return result.doctors;
}

export async function getMyAppointments() {
  const result = await apiRequest<{ appointments: AppointmentRecord[] }>('/appointments/mine');
  return result.appointments;
}

export async function createAppointment(input: { doctorId: string; scheduledAt: string }) {
  const result = await apiRequest<{ appointment: AppointmentRecord }>('/appointments', { method: 'POST', body: JSON.stringify(input) });
  return result.appointment;
}

export async function cancelAppointment(id: string) {
  const result = await apiRequest<{ appointment: AppointmentRecord }>(`/appointments/${id}/cancel`, { method: 'POST' });
  return result.appointment;
}

export async function getDoctorAppointments() {
  const result = await apiRequest<{ appointments: AppointmentRecord[] }>('/appointments/doctor');
  return result.appointments;
}

export async function approveAppointment(id: string, scheduledAt: string) {
  const result = await apiRequest<{ appointment: AppointmentRecord }>(`/appointments/${id}/approve`, { method: 'POST', body: JSON.stringify({ scheduledAt }) });
  return result.appointment;
}

export async function rescheduleAppointment(id: string, scheduledAt: string) {
  const result = await apiRequest<{ appointment: AppointmentRecord }>(`/appointments/${id}/reschedule`, { method: 'POST', body: JSON.stringify({ scheduledAt }) });
  return result.appointment;
}

export async function getDoctorPatients() {
  const result=await apiRequest<{patients:PatientRecord[]}>('/patients/mine'); return result.patients;
}
export async function getPatientRecords(id:string) { return apiRequest<{encounters:Array<{id:string;occurredAt:string;summary:string}>;prescriptions:Array<{id:string;issuedAt:string;medicationName:string;instructions:string}>;vaccinations:Array<{id:string;vaccineName:string;administeredAt:string}>}>(`/patients/${id}/records`); }
export async function getMyPatientRecords() { return apiRequest<{patientId:string;encounters:Array<{id:string;occurredAt:string;summary:string}>;prescriptions:Array<{id:string;issuedAt:string;medicationName:string;instructions:string}>;vaccinations:Array<{id:string;vaccineName:string;administeredAt:string}>}>('/patients/records/mine'); }
export async function createPrescription(input:{patientId:string;medicationName:string;instructions:string}) { return apiRequest('/prescriptions',{method:'POST',body:JSON.stringify(input)}); }
export async function getPharmacyInventory() { const result=await apiRequest<{medicines:PharmacyMedicine[]}>('/pharmacy/inventory'); return result.medicines; }
export async function getPharmacyCatalog() { const result=await apiRequest<{medicines:PharmacyMedicine[]}>('/pharmacy/catalog'); return result.medicines; }
export async function createPharmacyMedicine(input:{name:string;category:string;price:number;stock:number}) { const result=await apiRequest<{medicine:PharmacyMedicine}>('/pharmacy/inventory',{method:'POST',body:JSON.stringify(input)}); return result.medicine; }
export async function getAdminAnalytics() { return apiRequest<{totalPatients:number;encountersToday:number;topConditions:Array<{name:string;count:number}>;villages:Array<{name:string;district:string;patients:number;visits:number}>}>('/admin/analytics'); }
