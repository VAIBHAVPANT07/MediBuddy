import 'dotenv/config';
import express, { type Request, type RequestHandler, type Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from './db.js';
import { login, logout, refresh, register, requestEmailOtp, requireAuth, requireRole, type AuthenticatedRequest, verifyEmailOtp } from './auth.js';

const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
const host = '0.0.0.0';
const webOrigin = process.env.WEB_ORIGIN;
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '32kb', strict: true }));
app.use((request, response, next) => {
  if (webOrigin) {
    response.setHeader('Access-Control-Allow-Origin', webOrigin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Vary', 'Origin');
  }
  if (request.method === 'OPTIONS') return response.sendStatus(204);
  return next();
});
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));
const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};
const appointmentRequestSchema = z.object({
  doctorId: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }).refine((value) => new Date(value).getTime() > Date.now(), 'Appointment time must be in the future.'),
  reason: z.string().trim().max(1000).optional(),
});
const appointmentTimeSchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }).refine((value) => new Date(value).getTime() > Date.now(), 'Appointment time must be in the future.'),
});

app.get('/api/doctors', requireAuth, requireRole('patient'), asyncRoute(async (_request, response) => {
  const { rows } = await pool.query(`SELECT d.id,
    COALESCE(NULLIF(trim(concat_ws(' ', d.given_name, d.family_name)), ''), 'Doctor · ' || right(u.id::text, 4)) AS name,
    COALESCE(d.specialty, 'General medicine') AS specialty
    FROM doctors d JOIN users u ON u.id=d.user_id JOIN user_roles ur ON ur.user_id=u.id
    JOIN roles r ON r.id=ur.role_id AND r.name='doctor'
    WHERE (u.is_active=true OR d.data_source='synthea-1k-sample') ORDER BY name LIMIT 100`);
  return response.json({ doctors: rows });
}));

app.get('/api/admin/analytics', requireAuth, requireRole('admin'), asyncRoute(async (_request, response) => {
  const [patients, encounters, conditions, villages] = await Promise.all([
    pool.query(`SELECT count(*)::int AS count FROM patients WHERE data_source='synthea-1k-sample'`),
    pool.query(`SELECT count(*)::int AS count FROM encounters WHERE data_source='synthea-1k-sample' AND occurred_at::date=CURRENT_DATE`),
    pool.query(`SELECT condition_name AS name,sum(case_count)::int AS count FROM village_condition_analytics
      WHERE data_source='synthea-1k-sample' GROUP BY condition_name ORDER BY count DESC LIMIT 5`),
    pool.query(`SELECT p.village AS name,p.district,count(*)::int AS patients,
      (SELECT count(*)::int FROM encounters e WHERE e.data_source='synthea-1k-sample' AND e.patient_id IN
       (SELECT p2.id FROM patients p2 WHERE p2.village=p.village AND p2.district=p.district)) AS visits
      FROM patients p WHERE p.data_source='synthea-1k-sample' GROUP BY p.village,p.district ORDER BY patients DESC`),
  ]);
  return response.json({ totalPatients: patients.rows[0].count, encountersToday: encounters.rows[0].count,
    topConditions: conditions.rows, villages: villages.rows });
}));

app.get('/api/patients/mine', requireAuth, requireRole('doctor'), asyncRoute(async (request, response) => {
  const actor=(request as AuthenticatedRequest).user!;
  const { rows }=await pool.query(`SELECT DISTINCT p.id AS "patientId",concat_ws(' ',p.given_name,p.family_name) AS name,
    p.birth_date AS "birthDate",p.village,p.district,max(e.occurred_at) AS "lastVisit"
    FROM doctors d LEFT JOIN appointments a ON a.doctor_id=d.id LEFT JOIN patients p ON p.id=a.patient_id
    LEFT JOIN encounters e ON e.patient_id=p.id AND e.doctor_id=d.id WHERE d.user_id=$1 OR p.data_source='synthea-1k-sample'
    GROUP BY p.id ORDER BY max(e.occurred_at) DESC NULLS LAST LIMIT 100`,[actor.id]);
  return response.json({ patients: rows });
}));

app.get('/api/patients/search',requireAuth,requireRole('doctor'),asyncRoute(async(request,response)=>{
  const actor=(request as AuthenticatedRequest).user!;
  const {rows}=await pool.query(`SELECT p.id AS "patientId",concat_ws(' ',p.given_name,p.family_name) AS name,p.birth_date AS "birthDate",p.village,p.district
    FROM patients p JOIN users u ON u.id=p.user_id WHERE p.data_source='synthea-1k-sample' OR p.id IN
    (SELECT a.patient_id FROM appointments a JOIN doctors d ON d.id=a.doctor_id WHERE d.user_id=$1)
    ORDER BY p.given_name LIMIT 100`,[actor.id]);
  return response.json({patients:rows});
}));

app.get('/api/patients/:id/records', requireAuth, requireRole('doctor','patient'), asyncRoute(async (request,response)=>{
  const actor=(request as AuthenticatedRequest).user!;
  const patient=await pool.query(`SELECT p.id,p.user_id FROM patients p WHERE p.id=$1`,[request.params.id]);
  if(!patient.rows[0]) return response.status(404).json({error:'patient_not_found'});
  const own=actor.role==='patient' && patient.rows[0].user_id===actor.id;
  const assigned=actor.role==='doctor' && Number((await pool.query(`SELECT 1 FROM appointments a JOIN doctors d ON d.id=a.doctor_id WHERE a.patient_id=$1 AND d.user_id=$2 LIMIT 1`,[request.params.id,actor.id])).rowCount ?? 0)>0;
  const syntheticDevAccess=process.env.NODE_ENV!=='production' && patient.rows[0].user_id!==actor.id && actor.role==='doctor' && Number((await pool.query(`SELECT 1 FROM patients WHERE id=$1 AND data_source='synthea-1k-sample'`,[request.params.id])).rowCount??0)>0;
  const consent=Number((await pool.query(`SELECT 1 FROM consent_records WHERE patient_id=$1 AND grantee_user_id=$2 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now()) LIMIT 1`,[request.params.id,actor.id])).rowCount ?? 0)>0;
  if(!own && !assigned && !consent && !syntheticDevAccess) return response.status(403).json({error:'patient_access_denied'});
  const [encounters,prescriptions,vaccinations]=await Promise.all([
    pool.query(`SELECT id,occurred_at AS "occurredAt",summary FROM encounters WHERE patient_id=$1 ORDER BY occurred_at DESC LIMIT 100`,[request.params.id]),
    pool.query(`SELECT id,issued_at AS "issuedAt",medication_code AS "medicationCode",medication_name AS "medicationName",instructions,started_at AS "startedAt",ended_at AS "endedAt",dispenses FROM prescriptions WHERE patient_id=$1 ORDER BY issued_at DESC LIMIT 100`,[request.params.id]),
    pool.query(`SELECT id,vaccine_code AS "vaccineCode",vaccine_name AS "vaccineName",administered_at AS "administeredAt" FROM vaccinations WHERE patient_id=$1 ORDER BY administered_at DESC LIMIT 100`,[request.params.id]),
  ]);
  await pool.query(`INSERT INTO audit_logs(actor_user_id,patient_id,action,resource_type,purpose) VALUES($1,$2,'read','patient_records','authorized_patient_record_view')`,[actor.id,request.params.id]);
  return response.json({encounters:encounters.rows,prescriptions:prescriptions.rows,vaccinations:vaccinations.rows});
}));

app.get('/api/patients/records/mine',requireAuth,requireRole('patient'),asyncRoute(async(request,response)=>{
  const actor=(request as AuthenticatedRequest).user!;const patient=await pool.query(`SELECT id FROM patients WHERE user_id=$1`,[actor.id]);
  if(!patient.rows[0])return response.status(404).json({error:'patient_profile_required'});
  const id=patient.rows[0].id;
  const [encounters,prescriptions,vaccinations]=await Promise.all([
    pool.query(`SELECT id,occurred_at AS "occurredAt",summary FROM encounters WHERE patient_id=$1 ORDER BY occurred_at DESC LIMIT 100`,[id]),
    pool.query(`SELECT id,issued_at AS "issuedAt",medication_code AS "medicationCode",medication_name AS "medicationName",instructions,started_at AS "startedAt",ended_at AS "endedAt",dispenses FROM prescriptions WHERE patient_id=$1 ORDER BY issued_at DESC LIMIT 100`,[id]),
    pool.query(`SELECT id,vaccine_code AS "vaccineCode",vaccine_name AS "vaccineName",administered_at AS "administeredAt" FROM vaccinations WHERE patient_id=$1 ORDER BY administered_at DESC LIMIT 100`,[id]),
  ]);
  await pool.query(`INSERT INTO audit_logs(actor_user_id,patient_id,action,resource_type,purpose) VALUES($1,$2,'read','patient_records','patient_self_record_view')`,[actor.id,id]);
  return response.json({patientId:id,encounters:encounters.rows,prescriptions:prescriptions.rows,vaccinations:vaccinations.rows});
}));

app.get('/api/pharmacy/inventory',requireAuth,requireRole('seller'),asyncRoute(async(request,response)=>{
  const actor=(request as AuthenticatedRequest).user!;
  const {rows}=await pool.query(`SELECT m.id,m.name,m.category,m.unit_price AS price,coalesce(sum(s.quantity_delta),0)::int AS stock
    FROM medicine_sellers seller JOIN medicines m ON m.seller_id=seller.id LEFT JOIN stock_entries s ON s.medicine_id=m.id
    WHERE seller.user_id=$1 GROUP BY m.id ORDER BY m.name`,[actor.id]);
  return response.json({medicines:rows});
}));

app.get('/api/pharmacy/catalog',requireAuth,requireRole('patient'),asyncRoute(async(_request,response)=>{
  const {rows}=await pool.query(`SELECT m.id,m.name,m.category,m.unit_price AS price,coalesce(sum(s.quantity_delta),0)::int AS stock
    FROM medicines m LEFT JOIN stock_entries s ON s.medicine_id=m.id GROUP BY m.id ORDER BY m.name LIMIT 200`);
  return response.json({medicines:rows});
}));

app.post('/api/pharmacy/inventory',requireAuth,requireRole('seller'),asyncRoute(async(request,response)=>{
  const schema=z.object({name:z.string().trim().min(1).max(160),category:z.string().max(100).optional(),price:z.number().nonnegative(),stock:z.number().int().nonnegative()});
  const parsed=schema.safeParse(request.body); if(!parsed.success)return response.status(400).json({error:'invalid_request'});
  const actor=(request as AuthenticatedRequest).user!; const client=await pool.connect();
  try { await client.query('BEGIN'); const seller=await client.query(`SELECT id FROM medicine_sellers WHERE user_id=$1 FOR UPDATE`,[actor.id]);
    const medicine=await client.query(`INSERT INTO medicines(seller_id,name,category,unit_price) VALUES($1,$2,$3,$4) RETURNING id,name,category,unit_price AS price`,[seller.rows[0].id,parsed.data.name,parsed.data.category??null,parsed.data.price]);
    await client.query(`INSERT INTO stock_entries(medicine_id,quantity_delta,data_source) VALUES($1,$2,'local')`,[medicine.rows[0].id,parsed.data.stock]);
    await client.query('COMMIT'); return response.status(201).json({medicine:{...medicine.rows[0],stock:parsed.data.stock}});
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}));

app.post('/api/prescriptions',requireAuth,requireRole('doctor'),asyncRoute(async(request,response)=>{
  const schema=z.object({patientId:z.string().uuid(),medicationName:z.string().trim().min(1).max(200),instructions:z.string().trim().min(1).max(2000)});
  const parsed=schema.safeParse(request.body);if(!parsed.success)return response.status(400).json({error:'invalid_request'});
  const actor=(request as AuthenticatedRequest).user!;
  const {rows}=await pool.query(`INSERT INTO prescriptions(patient_id,doctor_id,medication_name,instructions,issued_at,data_source)
    SELECT p.id,d.id,$3,$4,now(),'local' FROM patients p JOIN doctors d ON d.user_id=$2
    WHERE p.id=$1 AND ((p.data_source='synthea-1k-sample' AND $5::boolean) OR EXISTS(SELECT 1 FROM appointments a WHERE a.patient_id=p.id AND a.doctor_id=d.id) OR EXISTS
    (SELECT 1 FROM consent_records c WHERE c.patient_id=p.id AND c.grantee_user_id=$2 AND c.revoked_at IS NULL AND (c.expires_at IS NULL OR c.expires_at>now())))
    RETURNING id,patient_id AS "patientId",medication_name AS "medicationName",instructions,issued_at AS "issuedAt"`,[parsed.data.patientId,actor.id,parsed.data.medicationName,parsed.data.instructions,process.env.NODE_ENV!=='production']);
  if(!rows[0])return response.status(403).json({error:'patient_access_denied'});
  return response.status(201).json({prescription:rows[0]});
}));

app.get('/api/appointments/mine', requireAuth, requireRole('patient'), asyncRoute(async (request, response) => {
  const actor = (request as AuthenticatedRequest).user!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT a.id,a.doctor_id AS "doctorId",a.scheduled_at AS "scheduledAt",a.status,a.reason,p.id AS "patientId",
      COALESCE(NULLIF(trim(concat_ws(' ',d.given_name,d.family_name)),''),'Doctor · ' || right(du.id::text,4)) AS "doctorName",
      COALESCE(d.specialty,'General medicine') AS specialty
      FROM appointments a JOIN patients p ON p.id=a.patient_id
      LEFT JOIN doctors d ON d.id=a.doctor_id LEFT JOIN users du ON du.id=d.user_id
      WHERE p.user_id=$1 ORDER BY a.scheduled_at DESC NULLS LAST`, [actor.id]);
    for (const appointment of rows) await client.query(`INSERT INTO audit_logs(actor_user_id,patient_id,action,resource_type,resource_id,purpose)
      VALUES($1,$2,'read','appointment',$3,'patient_portal_appointment_list')`, [actor.id, appointment.patientId, appointment.id]);
    await client.query('COMMIT');
    return response.json({ appointments: rows.map(({ patientId: _patientId, ...appointment }) => appointment) });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

app.post('/api/appointments', requireAuth, requireRole('patient'), asyncRoute(async (request, response) => {
  const parsed = appointmentRequestSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  const actor = (request as AuthenticatedRequest).user!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const patient = await client.query<{ id: string }>('SELECT id FROM patients WHERE user_id=$1 FOR UPDATE', [actor.id]);
    if (!patient.rows[0]) { await client.query('ROLLBACK'); return response.status(403).json({ error: 'patient_profile_required' }); }
    const doctor = await client.query(`SELECT d.id FROM doctors d JOIN users u ON u.id=d.user_id
      JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id AND r.name='doctor'
      WHERE d.id=$1 AND (u.is_active=true OR d.data_source='synthea-1k-sample')`, [parsed.data.doctorId]);
    if (!doctor.rows[0]) { await client.query('ROLLBACK'); return response.status(404).json({ error: 'doctor_not_found' }); }
    const { rows } = await client.query(`INSERT INTO appointments(patient_id,doctor_id,scheduled_at,reason,status)
      VALUES($1,$2,$3,$4,'requested') RETURNING id,doctor_id AS "doctorId",scheduled_at AS "scheduledAt",status,reason`,
    [patient.rows[0].id, doctor.rows[0].id, parsed.data.scheduledAt, parsed.data.reason ?? null]);
    await client.query(`INSERT INTO audit_logs(actor_user_id,patient_id,action,resource_type,resource_id,purpose)
      VALUES($1,$2,'create','appointment',$3,'appointment_request')`, [actor.id, patient.rows[0].id, rows[0].id]);
    await client.query('COMMIT');
    return response.status(201).json({ appointment: rows[0] });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

app.get('/api/appointments/doctor', requireAuth, requireRole('doctor'), asyncRoute(async (request, response) => {
  const actor = (request as AuthenticatedRequest).user!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const doctor = await client.query<{ id: string }>('SELECT id FROM doctors WHERE user_id=$1', [actor.id]);
    if (!doctor.rows[0]) { await client.query('ROLLBACK'); return response.status(403).json({ error: 'doctor_profile_required' }); }
    const { rows } = await client.query(`SELECT a.id,a.scheduled_at AS "scheduledAt",a.status,a.reason,
      COALESCE(NULLIF(trim(concat_ws(' ',p.given_name,p.family_name)),''),'Patient · ' || right(p.id::text,4)) AS "patientName",
      p.id AS "patientId"
      FROM appointments a JOIN patients p ON p.id=a.patient_id
      WHERE a.doctor_id=$1 ORDER BY a.scheduled_at ASC NULLS LAST`, [doctor.rows[0].id]);
    for (const appointment of rows) await client.query(`INSERT INTO audit_logs(actor_user_id,patient_id,action,resource_type,resource_id,purpose)
      VALUES($1,$2,'read','appointment',$3,'assigned_doctor_appointment_list')`, [actor.id, appointment.patientId, appointment.id]);
    await client.query('COMMIT');
    return response.json({ appointments: rows.map(({ patientId: _patientId, ...appointment }) => appointment) });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

async function updateAppointment(request: Request, response: Response, action: 'approve' | 'reschedule' | 'cancel', actingAs: 'patient' | 'doctor') {
  if (!z.string().uuid().safeParse(request.params.id).success) return response.status(400).json({ error: 'invalid_appointment_id' });
  const actor = (request as AuthenticatedRequest).user!;
  const parsedTime = action === 'reschedule' || action === 'approve' ? appointmentTimeSchema.safeParse(request.body) : null;
  if (parsedTime && !parsedTime.success) return response.status(400).json({ error: 'invalid_request', details: parsedTime.error.flatten() });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const patientRole = actingAs === 'patient';
    const query = patientRole
      ? await client.query<{ id: string; patient_id: string; doctor_id: string; status: string }>(`SELECT a.id,a.patient_id,a.doctor_id,a.status FROM appointments a JOIN patients p ON p.id=a.patient_id WHERE a.id=$1 AND p.user_id=$2 FOR UPDATE`, [request.params.id, actor.id])
      : await client.query<{ id: string; patient_id: string; doctor_id: string; status: string }>(`SELECT a.id,a.patient_id,a.doctor_id,a.status FROM appointments a JOIN doctors d ON d.id=a.doctor_id WHERE a.id=$1 AND d.user_id=$2 FOR UPDATE`, [request.params.id, actor.id]);
    const appointment = query.rows[0];
    if (!appointment) { await client.query('ROLLBACK'); return response.status(404).json({ error: 'appointment_not_found' }); }
    if (action === 'approve' && (patientRole || appointment.status !== 'requested')) { await client.query('ROLLBACK'); return response.status(409).json({ error: 'appointment_state_conflict' }); }
    if (action === 'reschedule' && (patientRole || !['requested','approved','rescheduled'].includes(appointment.status))) { await client.query('ROLLBACK'); return response.status(409).json({ error: 'appointment_state_conflict' }); }
    if (action === 'cancel' && !['requested','approved','rescheduled'].includes(appointment.status)) { await client.query('ROLLBACK'); return response.status(409).json({ error: 'appointment_state_conflict' }); }
    const status = action === 'approve' ? 'approved' : action === 'reschedule' ? 'rescheduled' : 'cancelled';
    const scheduledAt = parsedTime?.success ? parsedTime.data.scheduledAt : null;
    const { rows } = await client.query(`UPDATE appointments SET status=$2,scheduled_at=COALESCE($3::timestamptz,scheduled_at),version=version+1,updated_at=now()
      WHERE id=$1 RETURNING id,doctor_id AS "doctorId",scheduled_at AS "scheduledAt",status`, [appointment.id,status,scheduledAt]);
    await client.query(`INSERT INTO audit_logs(actor_user_id,patient_id,action,resource_type,resource_id,purpose)
      VALUES($1,$2,$3,'appointment',$4,$5)`, [actor.id, appointment.patient_id, action, appointment.id, `appointment_${action}`]);
    await client.query('COMMIT');
    return response.json({ appointment: rows[0] });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

app.post('/api/appointments/:id/approve', requireAuth, requireRole('doctor'), asyncRoute((request, response) => updateAppointment(request,response,'approve','doctor')));
app.post('/api/appointments/:id/reschedule', requireAuth, requireRole('doctor'), asyncRoute((request, response) => updateAppointment(request,response,'reschedule','doctor')));
app.post('/api/appointments/:id/cancel', requireAuth, requireRole('patient','doctor'), asyncRoute(async (request, response) => {
  const actor = (request as AuthenticatedRequest).user!;
  if (actor.role !== 'patient' && actor.role !== 'doctor') return response.status(403).json({ error: 'forbidden' });
  return updateAppointment(request, response, 'cancel', actor.role);
}));

app.get('/api/health', async (_request, response) => {
  try { await pool.query('SELECT 1'); const counts=await pool.query(`SELECT (SELECT count(*)::int FROM patients WHERE data_source='synthea-1k-sample') AS patients,(SELECT count(*)::int FROM appointments WHERE data_source='synthea-1k-sample') AS appointments`); return response.json({ status: 'ok', database: 'connected', data:counts.rows[0] }); }
  catch { return response.status(503).json({ status: 'unavailable', database: 'disconnected' }); }
});
app.post('/api/auth/register', asyncRoute(register));
app.post('/api/auth/login', asyncRoute(login));
app.post('/api/auth/otp/request', asyncRoute(requestEmailOtp));
app.post('/api/auth/otp/verify', asyncRoute(verifyEmailOtp));
app.post('/api/auth/refresh', asyncRoute(refresh));
app.post('/api/auth/logout', asyncRoute(logout));
app.get('/api/auth/me', requireAuth, asyncRoute(async (request, response, next) => {
  try {
    const user = (request as AuthenticatedRequest).user!;
    const { rows } = await pool.query(`SELECT id, phone, email, is_active, created_at FROM users WHERE id=$1`, [user.id]);
    const roles = await pool.query(`SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=$1 ORDER BY r.name`, [user.id]);
    return response.json({ user: rows[0], roles: roles.rows.map((row: { name: string }) => row.name) });
  } catch (error) { return next(error); }
}));
app.get('/api/openapi.json', (_request, response) => response.json(openApi));
app.get('/api/docs', (_request, response) => response.type('html').send(
  '<!doctype html><html><head><title>MediBuddy API docs</title></head><body style="font:16px system-ui;max-width:820px;margin:48px auto;padding:0 20px"><h1>MediBuddy API · Phase 1</h1><p>OpenAPI document: <a href="/api/openapi.json">/api/openapi.json</a></p><p>Swagger UI is not bundled; this endpoint is a small dependency-free docs landing page.</p><ul><li>GET /api/health</li><li>POST /api/auth/register</li><li>POST /api/auth/login</li><li>POST /api/auth/otp/request</li><li>POST /api/auth/otp/verify</li><li>POST /api/auth/refresh</li><li>POST /api/auth/logout</li><li>GET /api/auth/me</li></ul></body></html>',
));
app.use((_request, response) => response.status(404).json({ error: 'not_found' }));
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API error', error);
  return response.status(500).json({ error: 'internal_server_error' });
});

const openApi = {
  openapi: '3.1.0',
  info: { title: 'MediBuddy API', version: '1.0.0', description: 'Phase 1 identity and authorization API. Clinical workflows are not implemented in this phase.' },
  servers: [{ url: '/api' }],
  paths: {
    '/health': { get: { summary: 'API and database readiness', responses: { '200': { description: 'Ready' }, '503': { description: 'Database unavailable' } } } },
    '/auth/register': { post: { summary: 'Register a patient account', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['password'], properties: { phone: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 12 }, role: { const: 'patient' } } } } } }, responses: { '201': { description: 'Account created; HttpOnly session cookies set' }, '400': { description: 'Invalid input' }, '409': { description: 'Account already exists' } } } },
    '/auth/login': { post: { summary: 'Authenticate with password', responses: { '200': { description: 'Authenticated; HttpOnly session cookies set' }, '401': { description: 'Invalid credentials' } } } },
    '/auth/otp/request': { post: { summary: 'Generate a development-only verification code; phone is an unverified contact field', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['phone','email','role'], properties: { phone: { type: 'string', example: '+919876543210' }, email: { type: 'string', format: 'email' }, role: { type: 'string', enum: ['patient','doctor','admin','seller'] } } } } } }, responses: { '202': { description: 'Development code generated' }, '429': { description: 'Per-identity send limit reached' }, '503': { description: 'OTP unavailable in production' } } } },
    '/auth/otp/verify': { post: { summary: 'Verify email code and create or sign in to an account', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['phone','email','role','challengeId','otp'], properties: { phone: { type: 'string' }, email: { type: 'string', format: 'email' }, role: { type: 'string', enum: ['patient','doctor','admin','seller'] }, challengeId: { type: 'string', format: 'uuid' }, otp: { type: 'string', pattern: '^\\d{6}$' } } } } } }, responses: { '200': { description: 'Authenticated; HttpOnly session cookies set' }, '401': { description: 'Invalid code' }, '403': { description: 'Requested role is not assigned' } } } },
    '/auth/refresh': { post: { summary: 'Rotate refresh token and issue a new access token', responses: { '200': { description: 'Session refreshed' }, '401': { description: 'Refresh rejected' } } } },
    '/auth/logout': { post: { summary: 'Revoke refresh token and clear session cookies', responses: { '204': { description: 'Logged out' } } } },
    '/auth/me': { get: { summary: 'Return current account and assigned roles', responses: { '200': { description: 'Account details' }, '401': { description: 'Authentication required' } } } },
    '/doctors': { get: { summary: 'List active doctors for appointment requests (patient only)', responses: { '200': { description: 'Doctor directory' }, '403': { description: 'Forbidden' } } } },
    '/appointments': { post: { summary: 'Request an appointment with a doctor (patient only)', responses: { '201': { description: 'Appointment requested' }, '400': { description: 'Invalid request' }, '404': { description: 'Doctor not found' } } } },
    '/appointments/mine': { get: { summary: 'List the current patient’s appointments', responses: { '200': { description: 'Patient appointment list' } } } },
    '/appointments/doctor': { get: { summary: 'List appointments assigned to the current doctor', responses: { '200': { description: 'Doctor appointment queue' } } } },
    '/appointments/{id}/approve': { post: { summary: 'Approve an assigned appointment (doctor only)', responses: { '200': { description: 'Appointment approved' }, '409': { description: 'Appointment is not awaiting approval' } } } },
    '/appointments/{id}/reschedule': { post: { summary: 'Reschedule an assigned appointment (doctor only)', responses: { '200': { description: 'Appointment rescheduled' }, '409': { description: 'Appointment state conflict' } } } },
    '/appointments/{id}/cancel': { post: { summary: 'Cancel an appointment owned by the patient or assigned to the doctor', responses: { '200': { description: 'Appointment cancelled' }, '404': { description: 'Appointment not found in current user scope' }, '409': { description: 'Appointment cannot be cancelled in its current state' } } } },
  },
};

const server = app.listen(port, host, () => console.log(`MediBuddy API listening on http://${host}:${port}`));
async function shutdown() { server.close(); await pool.end(); process.exit(0); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
