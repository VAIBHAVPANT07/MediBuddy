# Phase 1 data model

```mermaid
erDiagram
  USERS ||--o{ USER_ROLES : assigned
  ROLES ||--o{ USER_ROLES : grants
  USERS ||--o| PATIENTS : profile
  USERS ||--o| DOCTORS : profile
  USERS ||--o| MEDICINE_SELLERS : profile
  ORGANIZATIONS ||--o{ DOCTORS : employs
  ORGANIZATIONS ||--o{ MEDICINE_SELLERS : hosts
  PATIENTS ||--o{ APPOINTMENTS : requests
  DOCTORS ||--o{ APPOINTMENTS : attends
  ORGANIZATIONS ||--o{ APPOINTMENTS : hosts
  APPOINTMENTS ||--o| ENCOUNTERS : results_in
  PATIENTS ||--o{ ENCOUNTERS : has
  DOCTORS ||--o{ ENCOUNTERS : records
  ENCOUNTERS ||--o{ PRESCRIPTIONS : supports
  PATIENTS ||--o{ PRESCRIPTIONS : receives
  DOCTORS ||--o{ PRESCRIPTIONS : issues
  MEDICINE_SELLERS ||--o{ PRESCRIPTIONS : dispenses
  PATIENTS ||--o{ VACCINATIONS : receives
  MEDICINE_SELLERS ||--o{ MEDICINES : stocks
  MEDICINES ||--o{ STOCK_ENTRIES : tracks
  PATIENTS ||--o{ CONSENT_RECORDS : grants
  USERS ||--o{ CONSENT_RECORDS : receives
  USERS ||--o{ AUDIT_LOGS : acts
  PATIENTS ||--o{ AUDIT_LOGS : concerns
  USERS ||--o{ SYNC_QUEUE : owns
  PATIENTS ||--o{ TRIAGE_SESSIONS : submits
  TRIAGE_RULES ||--o{ TRIAGE_SESSIONS : evaluates
  MODEL_VERSIONS ||--o{ TRIAGE_SESSIONS : records
```

Synthea mapping remains pending until the actual CSV headers are supplied and inspected. The intended entities are listed in `README.md`; no columns are assumed in this phase.
