import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'); dotenv.config({path:resolve(root,'.env')});
const {pool}=await import('./db.js');
async function main(){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const doctor=await client.query(`SELECT u.id,d.id AS doctor_id FROM users u JOIN doctors d ON d.user_id=u.id WHERE u.data_source='synthea-1k-sample' ORDER BY d.source_id LIMIT 1`);
  const patient=await client.query(`SELECT p.id FROM patients p WHERE p.data_source='synthea-1k-sample' ORDER BY p.source_id LIMIT 1`);
  if(!doctor.rows[0]||!patient.rows[0])throw new Error('Synthea data must be imported before seeding demo workflows.');
  const sellerUser=await client.query(`INSERT INTO users(email,is_active) VALUES('demo-pharmacy@example.invalid',true) ON CONFLICT(email) DO UPDATE SET is_active=true RETURNING id`);
  await client.query(`INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='seller' ON CONFLICT DO NOTHING`,[sellerUser.rows[0].id]);
  const seller=await client.query(`INSERT INTO medicine_sellers(user_id,display_name) VALUES($1,'Demo Community Pharmacy') ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`,[sellerUser.rows[0].id]);
  const medicine=await client.query(`INSERT INTO medicines(seller_id,name,category,unit_price,data_source,source_id) VALUES($1,'Paracetamol 500mg','Pain relief',10,'demo','paracetamol-500') ON CONFLICT(data_source,source_id) DO UPDATE SET name=EXCLUDED.name RETURNING id`,[seller.rows[0].id]);
  await client.query(`INSERT INTO stock_entries(medicine_id,quantity_delta,idempotency_key,data_source) VALUES($1,150,'00000000-0000-4000-8000-000000000001','demo') ON CONFLICT(idempotency_key) DO NOTHING`,[medicine.rows[0].id]);
  const appointment=await client.query(`INSERT INTO appointments(patient_id,doctor_id,scheduled_at,status,reason,data_source,source_id) VALUES($1,$2,now()+interval '1 day','requested','Demo consultation','demo','demo-appointment-1') ON CONFLICT(data_source,source_id) DO UPDATE SET status=EXCLUDED.status RETURNING id`,[patient.rows[0].id,doctor.rows[0].doctor_id]);
  await client.query(`INSERT INTO prescriptions(patient_id,doctor_id,encounter_id,instructions,issued_at,medication_code,medication_name,started_at,data_source,source_id) VALUES($1,$2,NULL,'Demo sample only. Not medical advice.',now(),'DEMO','Demo prescription (sample)',now(),'demo','demo-prescription-1') ON CONFLICT(data_source,source_id) DO NOTHING`,[patient.rows[0].id,doctor.rows[0].doctor_id]);
  await client.query('COMMIT');console.log(JSON.stringify({event:'demo_seed_complete',sampleAppointment:appointment.rows[0].id}));
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release();await pool.end()}
}
main().catch(error=>{console.error('Demo seed failed:',error instanceof Error?error.message:error);process.exitCode=1});
