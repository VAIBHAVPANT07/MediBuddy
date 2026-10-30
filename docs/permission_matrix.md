# Phase 1 permission matrix

This matrix defines authorization boundaries for the database/API model. Phase 1 ships authentication and role middleware; clinical record endpoints are deferred to Phase 2 and must enforce these rules before they are exposed.

| Resource/action | Patient | Doctor | Medicine seller | Administrator |
| --- | --- | --- | --- | --- |
| Register self | Create own account and patient profile | No public self-assignment | No public self-assignment | No public self-assignment |
| View/update identity | Own account/profile only | Own account/profile only | Own account/profile only | Own account/profile only |
| Appointment | Request/cancel own; view own | View assigned; approve/reschedule assigned | No access | No patient-level access |
| Patient record / encounter | Own records | Only with active appointment or explicit consent | No access | No access to identifiable records |
| Prescription | Read own | Issue for an authorized patient | Read only prescriptions explicitly routed for dispensing; no clinical edits | No patient-level access |
| Vaccination | Read own | Record for an authorized patient | No access | Aggregates only |
| Medicine stock | Read availability | Read availability | Manage own seller's catalog and stock | Aggregates only |
| Triage session | Submit and read own | Read only with authorization; clinician may override | No access | Aggregates only |
| Analytics | Own history only | Authorized care context only | Own sales/stock only | Aggregated only; suppress groups smaller than 5 |
| Audit log | No direct access | No direct access | No direct access | No raw patient-level access |

## Implemented in Phase 1

- API role enum and normalized `roles` / `user_roles` assignments.
- Self-registration accepts only the `patient` role. Staff roles must be provisioned before sign-in; production email OTP cannot self-assign a staff role. Development mode permits the portal selector for local demonstrations.
- JWT role middleware checks server-side role assignments on protected operations.
- Audit log table and auth event logging. Future patient-data handlers must call the shared audit writer on every read and write.

## Not yet implemented

Clinical endpoint authorization, consent checks, row-level security, small-cell suppression queries, and staff provisioning workflows are Phase 2 work. The table above is policy, not a claim that those endpoints exist today.
