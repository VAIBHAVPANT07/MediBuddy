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
Screenshot:  The olive hero at dusk: three ridges cut out against a low gold sun, the headline set
             in Playfair across three masked lines, and the Sync Ledger raised as a panel beside it
             with a monospace counter ticking from 14 queued to 0 queued / 14 synced.
```

## Art direction

The ground is a parchment page and the chrome is the dark of a deodar ridge at dusk. Everything
warm: no pure black, no pure white, no cool grey.

### Palette

Named by role.

| Token     | Value     | Use                                              |
|-----------|-----------|--------------------------------------------------|
| ground    | `#F7F2E9` | page background, warm parchment                  |
| paper     | `#FDFBF7` | cards, table rows                                |
| ink       | `#292F1E` | dark bands, headlines on light                   |
| walnut    | `#392C0E` | body text                                        |
| dusk      | `#1A2315` | hero ground, one step below `ink`                |
| olive     | `#32412A` | primary action                                   |
| gold      | `#D2A941` | filled call to action on dark ground             |
| gilt      | `#EBCB7A` | the accent line of a headline, on dark ground    |
| brass     | `#775F22` | default role accent, links, active states        |
| sage      | `#51733B` | synced/online state on light ground              |
| amber     | `#BF7618` | queued/offline state on light ground             |
| rust      | `#A33E1F` | emergency, cancelled, low stock                  |
| muted     | `#6C5C42` | secondary copy, 4.5:1 on parchment               |
| line      | `#DFD6C3` | hairlines, dividers                              |

Signal colours are re-declared inside `.band` (`--queued`, `--synced`, `--alert`) so a status word
keeps its meaning and its contrast on either ground.

Role accents stay in the warm family — olive for the patient, dark brass for the doctor, rust for
the district, pine for the pharmacy — so a workspace change reads as "different desk, same
building". They are all held at or below 29% lightness: a role surface is filled with the accent
and labelled in cream, and a mid-tone fill eats the contrast of secondary copy. On `bg-role` the
label, hint and icon sit at 80/85/90% cream, never lower.

| Role accent | Value       |
|-------------|-------------|
| patient     | `#36482E`   |
| doctor      | `#674E1E`   |
| admin       | `#733721`   |
| pharmacy    | `#32524E`   |

### Type

- **Display:** Playfair Display, 400–700, tracking −0.012 to −0.02em. Headlines are set as
  statements, sentence case, and they break by sense, never by width.
- **Text and UI:** Satoshi, 400/500/700. Body 16px minimum, 17px for the patient path.
- **Data:** JetBrains Mono for counts, ids, timestamps, statuses and the ledger. Tabular figures
  are mandatory — a health number that jitters in width is a bug.
- Fluid scale: 12 / 14 / 16 / 20 / 26 / 34 / clamp for display, no more than seven steps.

### Shape and rhythm

- One radius rule: 8px on controls, 12px on panels. Nothing pill-shaped except status dots and meters.
- Hairline dividers instead of shadows; elevation only on dialogs and the ledger card.
- Sections alternate a full-bleed dark band and a parchment band. No two adjacent sections share a
  layout family.
- The hero is the one full-bleed moment: dusk ground, drawn ridgelines, a low gold sun, and the
  ledger as a raised panel. It is never repeated below the fold.
- A 12-column grid at 1320px max, 24px gutter, and a sticky 236px left rail in the workspaces that
  collapses to a horizontal scroll strip below `lg`.

### What this design refuses

No stock photography, no gradient-painted headline text, no glassmorphism, no purple-blue, no three
equal feature cards, no decorative 01/02/03 numbering without a list to number, no scroll-jacking,
no hidden cursor, no fake dashboards. The valley is drawn in SVG rather than photographed: about
2 KB, no request, and no invented image of a real place. Where a feed is not connected, the panel
says so in plain words.

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
