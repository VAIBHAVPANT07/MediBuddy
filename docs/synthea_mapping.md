# Synthea CSV header review and imported mappings

Headers below were verified by the importer from files currently present under `csv/`. The seven supported files were imported transactionally into the local development database; rerunning uses stable source IDs and upserts.

## Confirmed source headers

| File | Header |
| --- | --- |
| `patients.csv` | `Id,BIRTHDATE,DEATHDATE,SSN,DRIVERS,PASSPORT,PREFIX,FIRST,LAST,SUFFIX,MAIDEN,MARITAL,RACE,ETHNICITY,GENDER,BIRTHPLACE,ADDRESS,CITY,STATE,COUNTY,ZIP,LAT,LON,HEALTHCARE_EXPENSES,HEALTHCARE_COVERAGE` |
| `providers.csv` | `Id,ORGANIZATION,NAME,GENDER,SPECIALITY,ADDRESS,CITY,STATE,ZIP,LAT,LON,UTILIZATION` |
| `organizations.csv` | `Id,NAME,ADDRESS,CITY,STATE,ZIP,LAT,LON,PHONE,REVENUE,UTILIZATION` |
| `encounters.csv` | `Id,START,STOP,PATIENT,ORGANIZATION,PROVIDER,PAYER,ENCOUNTERCLASS,CODE,DESCRIPTION,BASE_ENCOUNTER_COST,TOTAL_CLAIM_COST,PAYER_COVERAGE,REASONCODE,REASONDESCRIPTION` |
| `medications.csv` | `START,STOP,PATIENT,PAYER,ENCOUNTER,CODE,DESCRIPTION,BASE_COST,PAYER_COVERAGE,DISPENSES,TOTALCOST,REASONCODE,REASONDESCRIPTION` |
| `immunizations.csv` | `DATE,PATIENT,ENCOUNTER,CODE,DESCRIPTION,BASE_COST` |
| `conditions.csv` | `START,STOP,PATIENT,ENCOUNTER,CODE,DESCRIPTION` |
| `observations.csv` | `DATE,PATIENT,ENCOUNTER,CATEGORY,CODE,DESCRIPTION,VALUE,UNITS,TYPE` |
| `procedures.csv` | `START,STOP,PATIENT,ENCOUNTER,CODE,DESCRIPTION,BASE_COST,REASONCODE,REASONDESCRIPTION` |
| `allergies.csv` | `START,STOP,PATIENT,ENCOUNTER,CODE,SYSTEM,DESCRIPTION,TYPE,CATEGORY,REACTION1,DESCRIPTION1,SEVERITY1,REACTION2,DESCRIPTION2,SEVERITY2` |
| `careplans.csv` | `Id,START,STOP,PATIENT,ENCOUNTER,CODE,DESCRIPTION,REASONCODE,REASONDESCRIPTION` |

## Implemented column mapping

| Source | Column(s) | Destination / transformation |
| --- | --- | --- |
| patients | `Id` | Stable `source_id` on patient and linked user; `data_source='synthea-1k-sample'`; use as idempotency key |
| patients | `FIRST`, `LAST` | `patients.given_name`, `patients.family_name` |
| patients | `BIRTHDATE` | `patients.birth_date` |
| patients | `GENDER` | `patients.sex` (retain source value; do not infer another definition) |
| patients | US address fields (`ADDRESS`, `CITY`, `STATE`, `COUNTY`, `ZIP`, `LAT`, `LON`) | Do not import. Assign a configured synthetic Uttarakhand village/district deterministically from `Id` and a documented fixed seed |
| patients | `SSN`, `DRIVERS`, `PASSPORT` and unused demographics | Do not import; synthetic records do not need these identifiers |
| providers | `Id`, `NAME`, `SPECIALITY`, `ORGANIZATION` | `doctors.source_id`, display name stored in doctor family name field (source supplies one `NAME` field), `doctors.specialty`, and organization relationship via provider `ORGANIZATION` = `organizations.Id` |
| organizations | `Id`, `NAME` | `organizations.source_id`, `organizations.name` |
| organizations | US address/location fields | Do not import; remap deterministically to the same configured synthetic village/district set |
| encounters | `Id`, `PATIENT`, `PROVIDER`, `ORGANIZATION`, `START`, `DESCRIPTION` | `encounters.source_id`, patient/provider/organization links, `occurred_at=START`, and summary from `DESCRIPTION` |
| encounters | `Id`, `START`, `PATIENT`, `PROVIDER`, `ORGANIZATION`, `DESCRIPTION` | Historical completed `appointments` row, because this file represents performed encounters and supplies no separate appointment-request table. Marking status completed is an explicit transformation, not a source column |
| medications | (`PATIENT`,`ENCOUNTER`,`CODE`,`START`,`STOP`) | Deterministic SHA-256 key from patient, encounter, code, dates, description, payer, and duplicate occurrence (the CSV has no row `Id`); map `CODE`, `DESCRIPTION`, `START`, `STOP`, `DISPENSES` to prescription medication fields |
| immunizations | (`PATIENT`,`ENCOUNTER`,`CODE`,`DATE`) | Deterministic SHA-256 key from patient, encounter, code, date, description, and duplicate occurrence; map `PATIENT`, `CODE`, `DESCRIPTION`, and `DATE` to vaccination fields |
| conditions | `PATIENT`, `CODE`, `DESCRIPTION`, `START` | Join patient to its synthetic village, group by village + condition code/description + month; store only groups of at least 5 in `village_condition_analytics`. Never expose patient-level conditions to administrators |
| observations | `DATE`,`PATIENT`,`ENCOUNTER`,`CATEGORY`,`CODE`,`DESCRIPTION`,`VALUE`,`UNITS`,`TYPE` | Optional vitals/lab extension; not imported in Phase 1 because there is no observations table/API yet |
| procedures, allergies, careplans | headers above | Not imported in Phase 1; preserve as deferred source files rather than forcing them into unrelated tables |

## Import safety and unresolved details

- The `users` table requires a phone or email. Imported patient/doctor rows need reserved, non-deliverable `.invalid` email identities based on source IDs; never fabricate real phone numbers or enable imported accounts for login.
- Validate every referenced source ID before writing. Missing patient/provider/organization references are skipped and counted rather than silently remapped.
- Fixed-seed village assignment uses a stable hash of source ID and configured village list. Current seed is `2025`; the sample village names are placeholders and can be changed with `SYNTHEA_VILLAGES`.
- Use upserts on `(data_source, source_id)` for idempotency. Medication and immunization composite source IDs must be deterministic and collision-checked.
- Conditions under five records in a group are suppressed and counted as skipped. This threshold applies before administrator-facing data is stored.
- CSV headers were validated at import. Source medication rows are represented as prescription history for engineering workflows; they are not a clinical recommendation.

## Import result and rerun

Local import completed with zero failed rows: organizations 1,127; patients 1,163; providers 5,056; encounters and completed appointments 61,459; medication rows 56,430; immunizations 17,009. The conditions file contained 38,094 rows: 9,962 represented across 1,377 village/code/month aggregates, while 28,132 source rows belonging to groups with fewer than five distinct patients were suppressed. The 1,377 aggregates were each checked against the minimum group size.

Imported users have reserved `.invalid` email identities and are inactive. US addresses and direct identifiers are discarded; location is deterministically assigned to one of the configured synthetic Uttarakhand sample villages. Observations, procedures, allergies, and care plans are header-reviewed but not imported because matching storage/API workflows are not implemented.

From the repository root, build then run migrations and import with the root `.env` loaded by the importer:
