import dotenv from 'dotenv';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse';
import type { PoolClient } from 'pg';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: resolve(repositoryRoot, '.env') });
const { pool } = await import('./db.js');

const DATA_SOURCE = 'synthea-1k-sample';
const BATCH_SIZE = 250;
const seed = process.env.SYNTHEA_SEED ?? '2025';
const sourceDirectory = resolve(repositoryRoot, process.env.SYNTHEA_DIR ?? 'csv');
const villageConfiguration = process.env.SYNTHEA_VILLAGES ?? '';

interface Village { village: string; district: string }
interface SourceRow { [column: string]: string }
interface FileCounts { read: number; imported: number; skipped: number; failed: number; reasons: Record<string, number> }
interface ImportReport { source: string; seed: string; villages: Village[]; files: Record<string, FileCounts> }
type DbRow = Record<string, unknown>;

const report: ImportReport = { source: DATA_SOURCE, seed, villages: [], files: {} };
let activeFile = 'initialization';
function counts(file: string): FileCounts { return report.files[file] ??= { read: 0, imported: 0, skipped: 0, failed: 0, reasons: {} }; }
function reason(file: string, kind: 'skipped' | 'failed', label: string, amount = 1) {
  const stats = counts(file);
  stats[kind] += amount;
  stats.reasons[label] = (stats.reasons[label] ?? 0) + amount;
}
function imported(file: string, amount: number) { counts(file).imported += amount; }
function nonempty(value: string | undefined) { return value?.trim() || null; }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'record'; }
function stableId(prefix: string, parts: Array<string | null | undefined>) {
  const input = parts.map((part) => part?.trim() ?? '').join('\u001f');
  return `${prefix}-${createHash('sha256').update(input).digest('hex')}`;
}
function timestamp(value: string | undefined): Date | null | undefined {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
function validDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function deterministicVillage(sourceId: string, villages: Village[]) {
  const digest = createHash('sha256').update(`${seed}:${sourceId}`).digest();
  return villages[digest.readUInt32BE(0) % villages.length];
}
function loadVillages() {
  const villages = villageConfiguration.split(';').map((item) => {
    const [village, district] = item.split('|').map((part) => part?.trim());
    return village && district ? { village, district } : null;
  }).filter((value): value is Village => value !== null);
  if (villages.length === 0) throw new Error('Set SYNTHEA_VILLAGES as village|district;village|district before importing.');
  if (new Set(villages.map((item) => `${item.village}\u001f${item.district}`)).size !== villages.length) {
    throw new Error('SYNTHEA_VILLAGES contains duplicate village/district pairs.');
  }
  report.villages = villages;
  return villages;
}

async function* readCsv(file: string, requiredHeaders: string[]): AsyncGenerator<SourceRow> {
  activeFile = file;
  const path = resolve(sourceDirectory, file);
  const parser = createReadStream(path).pipe(parse({ bom: true, skip_empty_lines: true, relax_column_count: false, trim: false }));
  let headers: string[] | null = null;
  for await (const value of parser) {
    const cells = value as string[];
    if (headers === null) {
      headers = cells.map((cell) => cell.trim());
      if (new Set(headers).size !== headers.length) throw new Error(`${file} has duplicate CSV headers.`);
      const missing = requiredHeaders.filter((header) => !headers!.includes(header));
      if (missing.length) throw new Error(`${file} is missing expected headers: ${missing.join(', ')}`);
      console.log(JSON.stringify({ event: 'synthea_headers_verified', file, headers }));
      continue;
    }
    counts(file).read += 1;
    const row: SourceRow = {};
    for (let index = 0; index < headers.length; index += 1) row[headers[index]] = (cells[index] ?? '').trim();
    yield row;
  }
  if (headers === null) throw new Error(`${file} is empty; expected a header row.`);
}

function quoteIdentifier(value: string) { return `"${value.replaceAll('"', '""')}"`; }

async function upsertRows(
  client: PoolClient,
  table: string,
  columns: string[],
  rows: DbRow[],
  updateColumns: string[],
  conflictColumns = ['data_source', 'source_id'],
) {
  const returned: Array<{ id: string; source_id: string | null }> = [];
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const chunk = rows.slice(offset, offset + BATCH_SIZE);
    const values: unknown[] = [];
    const tuples = chunk.map((row) => `(${columns.map((column) => {
      values.push(row[column]);
      return `$${values.length}`;
    }).join(',')})`);
    const updates = updateColumns.map((column) => `${quoteIdentifier(column)}=EXCLUDED.${quoteIdentifier(column)}`).join(',');
    const sql = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(',')}) VALUES ${tuples.join(',')}
      ON CONFLICT (${conflictColumns.map(quoteIdentifier).join(',')}) DO UPDATE SET ${updates}
      RETURNING id,source_id`;
    let result;
    try { result = await client.query<{ id: string; source_id: string | null }>(sql, values); }
    catch (error) { reason(activeFile,'failed','database_batch_failure',chunk.length); throw error; }
    returned.push(...result.rows);
  }
  return returned;
}

async function attachImportedRoles(client: PoolClient, userIds: string[], roleId: number, role: 'patient' | 'doctor', sourceIds: Map<string, string>) {
  const roleRows = userIds.map((userId) => ({
    user_id: userId,
    role_id: roleId,
    data_source: DATA_SOURCE,
    source_id: `${role}-role:${sourceIds.get(userId)}`,
  }));
  for (let offset = 0; offset < roleRows.length; offset += BATCH_SIZE) {
    const chunk = roleRows.slice(offset, offset + BATCH_SIZE);
    const values: unknown[] = [];
    const tuples = chunk.map((row) => `(${[row.user_id,row.role_id,row.data_source,row.source_id].map((value) => { values.push(value); return `$${values.length}`; }).join(',')})`);
    await client.query(`INSERT INTO user_roles(user_id,role_id,data_source,source_id) VALUES ${tuples.join(',')}
      ON CONFLICT(user_id,role_id) DO UPDATE SET data_source=EXCLUDED.data_source,source_id=EXCLUDED.source_id`, values);
  }
}

async function importOrganizations(client: PoolClient, villages: Village[]) {
  const records: DbRow[] = [];
  for await (const row of readCsv('organizations.csv', ['Id','NAME','ADDRESS','CITY','STATE','ZIP','LAT','LON','PHONE','REVENUE','UTILIZATION'])) {
    const id = nonempty(row.Id);
    const name = nonempty(row.NAME);
    if (!id || !name) { reason('organizations.csv','failed','missing_id_or_name'); continue; }
    const location = deterministicVillage(id, villages);
    records.push({ source_id: id, data_source: DATA_SOURCE, name, organization_type: 'health_center', village: location.village, district: location.district, state: 'Uttarakhand' });
  }
  const saved = await upsertRows(client, 'organizations', ['source_id','data_source','name','organization_type','village','district','state'], records, ['name','organization_type','village','district','state']);
  imported('organizations.csv', saved.length);
  return new Map(saved.map((item) => [item.source_id!, item.id]));
}

async function importPeople(client: PoolClient, villages: Village[], organizationIds: Map<string,string>, roleIds: Map<string,number>) {
  const patients = new Map<string,{id:string; village:string; district:string}>();
  const patientRows: DbRow[] = [];
  const patientUsers: DbRow[] = [];
  const patientSourceByUser = new Map<string,string>();
  for await (const row of readCsv('patients.csv', ['Id','BIRTHDATE','FIRST','LAST','GENDER'])) {
    const sourceId = nonempty(row.Id);
    if (!sourceId) { reason('patients.csv','failed','missing_id'); continue; }
    const birthDate = nonempty(row.BIRTHDATE);
    if (birthDate && !validDateOnly(birthDate)) { reason('patients.csv','failed','invalid_birthdate'); continue; }
    const location = deterministicVillage(sourceId, villages);
    const userSourceId = `patient:${sourceId}`;
    const userEmail = `synthea-patient-${slug(sourceId)}@example.invalid`;
    patientUsers.push({ source_id: userSourceId, data_source: DATA_SOURCE, email: userEmail, is_active: false });
    patientRows.push({ source_id: sourceId, data_source: DATA_SOURCE, given_name: nonempty(row.FIRST), family_name: nonempty(row.LAST), birth_date: birthDate, sex: nonempty(row.GENDER), village: location.village, district: location.district });
  }
  const savedUsers = await upsertRows(client, 'users', ['source_id','data_source','email','is_active'], patientUsers, ['email','is_active']);
  for (const row of savedUsers) patientSourceByUser.set(row.id, row.source_id!.slice('patient:'.length));
  await attachImportedRoles(client, savedUsers.map((row) => row.id), roleIds.get('patient')!, 'patient', patientSourceByUser);
  const patientUserIds = new Map(savedUsers.map((user) => [user.source_id!,user.id]));
  const patientProfiles: DbRow[] = patientRows.map((row) => ({ ...row, user_id: patientUserIds.get(`patient:${row.source_id}`)! }));
  const savedPatients = await upsertRows(client, 'patients', ['user_id','given_name','family_name','birth_date','sex','village','district','source_id','data_source'], patientProfiles, ['given_name','family_name','birth_date','sex','village','district']);
  for (const patient of savedPatients) {
    const sourceId = patient.source_id!;
    const profile = patientProfiles.find((row) => row.source_id === sourceId)!;
    patients.set(sourceId, { id: patient.id, village: String(profile.village), district: String(profile.district) });
  }
  imported('patients.csv', savedPatients.length);

  const providerRows: DbRow[] = [];
  const providerUsers: DbRow[] = [];
  const providerUserSource = new Map<string,string>();
  for await (const row of readCsv('providers.csv', ['Id','ORGANIZATION','NAME','SPECIALITY'])) {
    const sourceId = nonempty(row.Id);
    const name = nonempty(row.NAME);
    if (!sourceId || !name) { reason('providers.csv','failed','missing_id_or_name'); continue; }
    providerUsers.push({ source_id: `provider:${sourceId}`, data_source: DATA_SOURCE, email: `synthea-doctor-${slug(sourceId)}@example.invalid`, is_active: false });
    providerRows.push({ source_id: sourceId, data_source: DATA_SOURCE, display_name: name, specialty: nonempty(row.SPECIALITY), organization_source_id: nonempty(row.ORGANIZATION) });
  }
  const savedProviderUsers = await upsertRows(client, 'users', ['source_id','data_source','email','is_active'], providerUsers, ['email','is_active']);
  for (const row of savedProviderUsers) providerUserSource.set(row.id, row.source_id!.slice('provider:'.length));
  await attachImportedRoles(client, savedProviderUsers.map((row) => row.id), roleIds.get('doctor')!, 'doctor', providerUserSource);
  const providerUserIds = new Map(savedProviderUsers.map((user) => [user.source_id!,user.id]));
  const doctorProfiles = providerRows.map((row) => ({
    source_id: row.source_id,
    data_source: DATA_SOURCE,
    user_id: providerUserIds.get(`provider:${row.source_id}`)!,
    organization_id: row.organization_source_id ? organizationIds.get(String(row.organization_source_id)) ?? null : null,
    given_name: 'Dr.',
    family_name: row.display_name,
    specialty: row.specialty,
  }));
  const savedDoctors = await upsertRows(client, 'doctors', ['user_id','organization_id','given_name','family_name','specialty','source_id','data_source'], doctorProfiles, ['organization_id','given_name','family_name','specialty']);
  const doctors = new Map(savedDoctors.map((row) => [row.source_id!, row.id]));
  imported('providers.csv', savedDoctors.length);
  return { patients, doctors };
}

interface EncounterReference { id: string; patientId: string; doctorId: string | null; organizationId: string | null; occurredAt: Date }
async function importEncounters(client: PoolClient, patients: Map<string,{id:string;village:string;district:string}>, doctors: Map<string,string>, organizations: Map<string,string>) {
  const encounters = new Map<string,string>();
  const providerForEncounter = new Map<string,string|null>();
  const organizationForEncounter = new Map<string,string|null>();
  const pending: Array<{ sourceId:string; patientId:string; doctorId:string|null; organizationId:string|null; at:Date; description:string|null }> = [];
  const flush = async () => {
    if (!pending.length) return;
    const appointmentRows = pending.map((row) => ({ source_id: row.sourceId, data_source: DATA_SOURCE, patient_id: row.patientId, doctor_id: row.doctorId, organization_id: row.organizationId, scheduled_at: row.at, status: 'completed', reason: row.description }));
    const appointmentIds = await upsertRows(client, 'appointments', ['source_id','data_source','patient_id','doctor_id','organization_id','scheduled_at','status','reason'], appointmentRows, ['patient_id','doctor_id','organization_id','scheduled_at','status','reason']);
    const encounterRows = pending.map((row) => ({ source_id: row.sourceId, data_source: DATA_SOURCE, patient_id: row.patientId, doctor_id: row.doctorId, appointment_id: appointmentIds.find((appointment) => appointment.source_id === row.sourceId)!.id, organization_id: row.organizationId, occurred_at: row.at, summary: row.description }));
    const savedEncounters = await upsertRows(client, 'encounters', ['source_id','data_source','patient_id','doctor_id','appointment_id','organization_id','occurred_at','summary'], encounterRows, ['patient_id','doctor_id','appointment_id','organization_id','occurred_at','summary']);
    for (const encounter of savedEncounters) encounters.set(encounter.source_id!, encounter.id);
    imported('encounters.csv', savedEncounters.length);
    pending.length = 0;
  };
  for await (const row of readCsv('encounters.csv', ['Id','START','PATIENT','ORGANIZATION','PROVIDER','DESCRIPTION'])) {
    const id = nonempty(row.Id);
    const patient = row.PATIENT ? patients.get(row.PATIENT) : undefined;
    const at = timestamp(row.START);
    if (!id || !row.PATIENT || !row.START || at === undefined) { reason('encounters.csv','failed','missing_or_invalid_identity_or_start'); continue; }
    if (!patient) { reason('encounters.csv','skipped','missing_patient_reference'); continue; }
    const doctorId = row.PROVIDER ? doctors.get(row.PROVIDER) ?? null : null;
    const organizationId = row.ORGANIZATION ? organizations.get(row.ORGANIZATION) ?? null : null;
    pending.push({ sourceId:id, patientId:patient.id, doctorId, organizationId, at:at!, description:nonempty(row.DESCRIPTION) });
    providerForEncounter.set(id, doctorId);
    organizationForEncounter.set(id, organizationId);
    if (pending.length >= BATCH_SIZE) await flush();
  }
  await flush();
  return { encounters, providerForEncounter, organizationForEncounter };
}

async function importMedications(client: PoolClient, patients: Map<string,{id:string;village:string;district:string}>, encounters: Map<string,string>, encounterDoctors: Map<string,string|null>) {
  const pending: DbRow[] = [];
  const duplicateCounts = new Map<string,number>();
  const flush = async () => {
    if (!pending.length) return;
    const saved = await upsertRows(client,'prescriptions', ['patient_id','doctor_id','encounter_id','instructions','issued_at','medication_code','medication_name','started_at','ended_at','dispenses','source_id','data_source'], pending, ['patient_id','doctor_id','encounter_id','instructions','issued_at','medication_code','medication_name','started_at','ended_at','dispenses']);
    imported('medications.csv', saved.length);
    pending.length = 0;
  };
  for await (const row of readCsv('medications.csv', ['START','STOP','PATIENT','ENCOUNTER','CODE','DESCRIPTION','DISPENSES'])) {
    const patient = row.PATIENT ? patients.get(row.PATIENT) : undefined;
    const encounterId = row.ENCOUNTER ? encounters.get(row.ENCOUNTER) : undefined;
    if (!patient) { reason('medications.csv','skipped','missing_patient_reference'); continue; }
    if (!encounterId) { reason('medications.csv','skipped','missing_encounter_reference'); continue; }
    const startedAt = timestamp(row.START);
    const endedAt = timestamp(row.STOP);
    const dispenses = nonempty(row.DISPENSES);
    if (!row.START || startedAt === undefined || endedAt === undefined || (dispenses && !Number.isFinite(Number(dispenses)))) { reason('medications.csv','failed','invalid_date_or_dispenses'); continue; }
    const identity = [row.PATIENT,row.ENCOUNTER,row.CODE,row.START,row.STOP,row.DESCRIPTION,row.PAYER].join('\u001f');
    const occurrence = (duplicateCounts.get(identity) ?? 0) + 1;
    duplicateCounts.set(identity,occurrence);
    pending.push({ patient_id:patient.id, doctor_id:encounterDoctors.get(row.ENCOUNTER) ?? null, encounter_id:encounterId, instructions:nonempty(row.DESCRIPTION), issued_at:startedAt!, medication_code:nonempty(row.CODE), medication_name:nonempty(row.DESCRIPTION), started_at:startedAt!, ended_at:endedAt, dispenses:dispenses ? Number(dispenses) : null, source_id:stableId('medication',[row.PATIENT,row.ENCOUNTER,row.CODE,row.START,row.STOP,row.DESCRIPTION,row.PAYER,String(occurrence)]), data_source:DATA_SOURCE });
    if (pending.length >= BATCH_SIZE) await flush();
  }
  await flush();
}

async function importVaccinations(client: PoolClient, patients: Map<string,{id:string;village:string;district:string}>, encounters: Map<string,string>, organizationsByEncounter: Map<string,string|null>) {
  const pending: DbRow[] = [];
  const duplicateCounts = new Map<string,number>();
  const flush = async () => {
    if (!pending.length) return;
    const saved = await upsertRows(client,'vaccinations',['patient_id','organization_id','vaccine_code','vaccine_name','administered_at','source_id','data_source'],pending,['organization_id','vaccine_code','vaccine_name','administered_at']);
    imported('immunizations.csv',saved.length);
    pending.length = 0;
  };
  for await (const row of readCsv('immunizations.csv',['DATE','PATIENT','ENCOUNTER','CODE','DESCRIPTION'])) {
    const patient = row.PATIENT ? patients.get(row.PATIENT) : undefined;
    const date = timestamp(row.DATE);
    if (!patient) { reason('immunizations.csv','skipped','missing_patient_reference'); continue; }
    if (!row.DATE || date === undefined) { reason('immunizations.csv','failed','missing_or_invalid_date'); continue; }
    const identity = [row.PATIENT,row.ENCOUNTER,row.CODE,row.DATE,row.DESCRIPTION].join('\u001f');
    const occurrence = (duplicateCounts.get(identity) ?? 0) + 1;
    duplicateCounts.set(identity,occurrence);
    pending.push({ patient_id:patient.id, organization_id:row.ENCOUNTER ? organizationsByEncounter.get(row.ENCOUNTER) ?? null : null, vaccine_code:nonempty(row.CODE), vaccine_name:nonempty(row.DESCRIPTION), administered_at:date, source_id:stableId('immunization',[row.PATIENT,row.ENCOUNTER,row.CODE,row.DATE,row.DESCRIPTION,String(occurrence)]), data_source:DATA_SOURCE });
    if (pending.length >= BATCH_SIZE) await flush();
  }
  await flush();
}

async function importConditionAggregates(client: PoolClient, patients: Map<string,{id:string;village:string;district:string}>) {
  const groups = new Map<string,{ village:string;district:string;code:string;name:string;period:Date;people:Set<string>;sourceRows:number }>();
  for await (const row of readCsv('conditions.csv',['START','PATIENT','CODE','DESCRIPTION'])) {
    const patient = row.PATIENT ? patients.get(row.PATIENT) : undefined;
    if (!patient) { reason('conditions.csv','skipped','missing_patient_reference'); continue; }
    const date = timestamp(row.START);
    if (!row.START || date === undefined || !nonempty(row.CODE) || !nonempty(row.DESCRIPTION)) { reason('conditions.csv','failed','invalid_date_or_condition'); continue; }
    const period = new Date(Date.UTC(date!.getUTCFullYear(),date!.getUTCMonth(),1));
    const code = row.CODE.trim();
    const name = row.DESCRIPTION.trim();
    const key = [patient.village,patient.district,code,period.toISOString().slice(0,10)].join('\u001f');
    const group = groups.get(key) ?? { village:patient.village,district:patient.district,code,name,period,people:new Set<string>(),sourceRows:0 };
    group.people.add(row.PATIENT);
    group.sourceRows += 1;
    groups.set(key,group);
  }
  const eligible = [...groups.entries()].filter(([,group]) => group.people.size >= 5);
  for (const [,group] of groups) if (group.people.size < 5) reason('conditions.csv','skipped','suppressed_group_under_5',group.sourceRows);
  const rows = eligible.map(([key,group]) => ({ source_id:stableId('condition-group',[key]), data_source:DATA_SOURCE, village:group.village, district:group.district, condition_code:group.code, condition_name:group.name, period_start:group.period, case_count:group.people.size }));
  // Conflicts on the aggregate's own natural key, not on source_id: that id is a hash of the
  // village name, so renaming a community in SYNTHEA_VILLAGES updates the row instead of
  // colliding with it.
  const saved = await upsertRows(client,'village_condition_analytics',['source_id','data_source','village','district','condition_code','condition_name','period_start','case_count'],rows,['source_id','condition_name','case_count'],['data_source','village','district','condition_code','period_start']);
  imported('conditions.csv',eligible.reduce((total,[,group]) => total + group.sourceRows,0));
  counts('conditions.csv').reasons['aggregated_groups'] = saved.length;
  counts('conditions.csv').reasons['suppressed_groups'] = groups.size - eligible.length;
}

async function main() {
  const villages = loadVillages();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roleResult = await client.query<{id:number;name:string}>('SELECT id,name FROM roles WHERE name IN ($1,$2)', ['patient','doctor']);
    const roleIds = new Map(roleResult.rows.map((row) => [row.name, Number(row.id)]));
    if (!roleIds.has('patient') || !roleIds.has('doctor')) throw new Error('Run the database migrations before importing Synthea.');
    const organizations = await importOrganizations(client,villages);
    const {patients,doctors} = await importPeople(client,villages,organizations,roleIds);
    const {encounters,providerForEncounter,organizationForEncounter} = await importEncounters(client,patients,doctors,organizations);
    await importMedications(client,patients,encounters,providerForEncounter);
    await importVaccinations(client,patients,encounters,organizationForEncounter);
    await importConditionAggregates(client,patients);
    await client.query('COMMIT');
    console.log(JSON.stringify({ event:'synthea_import_complete', ...report },null,2));
  } catch (error) {
    await client.query('ROLLBACK');
    for (const fileCounts of Object.values(report.files)) {
      const rolledBackRows = Math.max(0, fileCounts.read - fileCounts.skipped - fileCounts.failed);
      fileCounts.failed += rolledBackRows;
      if (rolledBackRows) fileCounts.reasons['transaction_rolled_back'] = rolledBackRows;
      fileCounts.imported = 0;
    }
    console.error(JSON.stringify({ event:'synthea_import_failed', message:error instanceof Error ? error.message : 'Unknown import failure', ...report },null,2));
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

await main();
