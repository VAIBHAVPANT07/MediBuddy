# GramHealth — design system

Working notes for the interface. Every screen should obey this file. If a screen disagrees with
it, the screen is wrong.

## Brief

- **Subject:** GramHealth, an offline-first primary-care platform for villages in Uttarakhand,
  India. Four workspaces: patient, doctor, pharmacy, district administrator.
- **Audience:** a villager with one bar of signal; a doctor running forty consults a day; a
  pharmacy owner restocking from a paper ledger; a medical officer answering for a district.
- **Job of the site:** let a person who is not technical, not English-first and possibly
  offline get care, and let the three professional roles act on it without hunting for a button.
- **Assets:** live Postgres API (Synthea sample patients mapped to five Uttarakhand communities).
- **Language:** English interface, Hindi available for the patient path.
- **Constraints:** the platform ships no clinical decision. The symptom checker is guidance.
  Live video consults need a connection; only the records work offline.

## Concept card

```
Idea:        The network is the patient's vital sign. GramHealth is measured by what it does
             when the signal drops, so the interface treats connectivity as clinical data.
Metaphor:    A district dispatch desk. Records are consignments that travel from a village to
             the district server and get stamped when they arrive.
Signature:   The Sync Ledger — one live panel, on the landing page and in every workspace, that
             counts queued-versus-synced records and lets you cut the network to watch the queue
             fill and then dispatch. Driven by a single connection variable.
Emotion:     Calm authority. Nothing is decorative; everything is a status you can act on.
Motion verb: "Dispatch." Elements settle into place and get stamped, the way mail is sorted —
             short moves, one confirmation pulse, no floating fades.
Screenshot:  The dark landing ledger: five village nodes lit, a queue draining upward into the
             district node, a monospace counter ticking from 14 queued to 0 queued / 14 synced.
```

## Art direction

### Palette

Named by role. No pure black or white except inside the dark ground.

| Token     | Value     | Use                                              |
|-----------|-----------|--------------------------------------------------|
| ground    | `#F1F2EF` | page background, chalk-cool, never cream         |
| paper     | `#FFFFFF` | cards, table rows                                |
| ink       | `#0F1714` | text, dark chrome                                |
| pine      | `#145C46` | primary action, patient role                     |
| mint      | `#5FD3A0` | synced/online state on dark ground only          |
| saffron   | `#D98B14` | queued/offline state, doctor's waiting room      |
| vermilion | `#BE3A1E` | emergency, cancelled, low stock                  |
| slate     | `#31537F` | doctor role                                      |
| umber     | `#8A4B1E` | administrator role                               |
| teal      | `#2F6B67` | pharmacy role                                    |
| muted     | `#63716A` | secondary copy                                   |
| line      | `#DCE0DA` | hairlines, dividers                              |

Role accents are deep, low-chroma and sit in the same family as `pine`, so a workspace change
reads as "different desk, same building".

### Type

- **Display:** Bricolage Grotesque, 600–800, tight tracking at every size. Headlines are set
  as statements, sentence case, no italics.
- **Text and UI:** Satoshi, 400/500/700. Body 16px minimum, 17px for the patient path.
- **Data:** Satoshi Mono for counts, ids, timestamps, statuses and the ledger. Tabular figures
  are mandatory — a health number that jitters in width is a bug.
- Fluid scale: 12 / 14 / 16 / 20 / 26 / 34 / clamp for display, no more than seven steps.

### Shape and rhythm

- One radius rule: 14px on controls, 20px on panels. Nothing pill-shaped except status chips.
- Hairline dividers instead of shadows; elevation only on dialogs and the ledger card.
- Sections alternate a full-bleed dark band and a chalk band. No two adjacent sections share a
  layout family.
- A 12-column grid at 1320px max, 24px gutter, and a sticky 236px left rail in the workspaces that
  collapses to a horizontal scroll strip below `lg`.

### What this design refuses

No cream-and-serif editorial, no purple-blue gradient, no three equal feature cards, no eyebrow
label above every heading, no decorative 01/02/03 numbering, no scroll-jacking, no hidden
cursor, no fake dashboards. Where a feed is not connected, the panel says so in plain words.

## Concept driver

One variable, `connection` (`online` | `offline`) plus `queued` / `synced` counts, lives in
`SyncProvider` and reaches: the landing hero map, the ledger, the workspace status rail, the
chip in every portal header and the footer strip. Nothing else is allowed to animate on its own
idea of connectivity.

## Honest-data rules

1. The symptom checker never says diagnosis, and always offers 108 and 112.
2. Video consults are labelled as needing a connection; the offline story is records only.
3. Synthetic data is labelled synthetic wherever a count appears.
4. Sales ledger, ambulance dispatch and staffing feeds are sample or not connected, and are
   drawn as such rather than as live numbers.

## Assumptions to replace

- Product name taken from the project brief ("GramHealth"); the repository is MediBuddy.
- Patient identity in the demo is the signed-in phone number, not a verified health id.
- The five demo communities (Massoori, Gairsain, Mana, Devprayag, Jharigaon) come from
  `SYNTHEA_VILLAGES`; change them in `.env` and re-import, and mirror the list in `VILLAGES`
  in `src/lib/utils.ts`, which drives the sync ledger labels.
- Queue and dispatch in the Sync Ledger is a client-side simulation, labelled as such. The
  record-level offline queue is not yet implemented server-side.
