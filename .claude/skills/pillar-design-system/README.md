# Pillar Design System

**Pillar** is an open-source medication dispenser built for people with multiple kinds of neurodivergency and disabilities. This design system defines the visual, verbal, and interaction foundations for every Pillar surface — the companion apps, the caregiver view, the marketing site, the documentation site, and the clinician dashboard.

> The hardware device itself is intentionally excluded from these UI kits — its firmware UI lives in the device repo. Everything here is for web and mobile surfaces.

---

## What Pillar is

Pillar is a physical medication dispenser paired with software. It helps people **remember, take, and log** their medications without shame, stress, or cognitive overload. It's open source, privately hostable, and built from the ground up for:

- Cognitive-load-sensitive users (ADHD, autism, memory conditions)
- Dyslexia and reading difficulty
- Color blindness and low-vision users
- Motor differences, tremor, and limited dexterity
- Caregivers, family, and clinicians supporting the above

## Products / surfaces covered by this system

| Surface | Audience | UI kit |
|---|---|---|
| Companion app | Patient / self-managing user | `ui_kits/companion-app/` |
| Caregiver app | Family member or nurse | `ui_kits/caregiver-app/` |
| Marketing site | First-time visitors, open-source discovery | `ui_kits/marketing-site/` |
| Docs site | Setup / hardware / developer guides | `ui_kits/docs-site/` |
| Clinician dashboard | Admin / prescribing clinician | `ui_kits/clinician-dashboard/` |

## Sources

This project was created as a **net-new open-source brand** — no prior codebase, Figma, or assets were provided. Every token, component, and word below was authored for the Pillar brand from the stated values: *accessible, calm, professional, warm*.

If you have a live codebase or Figma file to pull from, attach it with the Import menu and I'll reconcile this system against the real source of truth.

---

## Content fundamentals

The Pillar voice is **calm, plainspoken, warm, and competent** — like a good nurse, a good librarian, or a steady friend. Never cheerful-for-cheerful's-sake, never clinical-cold, never clever at the user's expense. No forced enthusiasm.

### Principles

1. **Say the thing.** Plain language over medical jargon. "Missed dose" not "Non-adherence event."
2. **Never alarm.** A missed pill is not a crisis; the copy reflects that. "We'll pick it up tomorrow" > "⚠ DOSE MISSED!"
3. **You, not the user.** Direct second-person. "Your morning pills" not "The user's 8am regimen."
4. **Short sentences.** Target 12–18 words. Break at natural pauses. Use bullets for lists of ≥3.
5. **No emoji in-product.** Emoji are culturally loaded and screen-reader-verbose. We use iconography (Phosphor, duotone) instead. *Exception:* marketing/community material may use one or two sparingly.
6. **Sentence case everywhere.** Buttons, headers, menu items. No TITLE CASE. No ALL CAPS except the `.eyebrow` class, which uses tracking to soften it.
7. **Numbers are always numerals.** "8 pills" not "eight pills." Always use tabular figures for dosages and times.
8. **Times are explicit.** "8:00 AM" not "morning." "In 2 hours" and "at 10:00 AM" together, not either alone.

### Tone examples

| ❌ Don't | ✅ Do |
|---|---|
| "Oops! You missed a dose! 😬" | "That's okay. Your 8:00 AM dose is still waiting." |
| "ADHERENCE ALERT" | "One dose missed yesterday" |
| "Synchronize your device" | "Connect Pillar" |
| "Authenticate" | "Sign in" |
| "Emergency contact notification sent" | "We let Maya know." |
| "Great job!!! 🎉" | "Nice. That's 7 days in a row." |

### Reading level

Body copy targets a **7th-grade reading level** (Flesch-Kincaid). Short words where possible. Medical terms are linked to plain-language explainers.

### Numbers, times, units

- Times use AM/PM with a space: `8:00 AM`, `10:30 PM`.
- Dosages always include units: `10 mg`, `1 tablet`, `2 puffs`.
- Durations prefer single units: "2 hours" not "2h 0m"; "45 minutes" not "0h 45m".
- Use non-breaking spaces between numbers and units (`&nbsp;`).

---

## Visual foundations

### Color philosophy

Pillar's palette is built on **Still Blue** (primary), **Sage Teal** (secondary, the "well" state), and a warm canvas that avoids the sterile white of most medical software. Every semantic color (success, warning, danger) is paired with an **icon and a label** — we never signal by color alone.

- Canvas is warm off-white (`#F7F9FB`) — never pure white. Pure white is fatiguing and increases glare sensitivity.
- Primary is saturated enough to feel confident (6.5:1 on canvas) but not aggressive.
- The palette reads calm on cool monitors and phone screens alike.

Full tokens in `colors_and_type.css`.

### Typography

- **Lexend** for all UI and reading text. Lexend is specifically tuned for reading proficiency and tested with dyslexic readers.
- **Atkinson Hyperlegible** for all numerals — dosages, times, counts. Atkinson was designed by the Braille Institute for low-vision legibility; its disambiguated glyphs (0/O, 1/l/I) matter for medication data.
- **JetBrains Mono** for code only (docs, dev portal).

Base size is **17px** (not 16). Line-height is `1.55` for body, `1.35` for headings. Max measure for body copy is `68ch`.

### Backgrounds

- **Primary:** flat warm canvas with a near-invisible paper grain (SVG noise, ~3% opacity).
- **Marketing site only:** geometric grid accent — a hairline dot grid at very low contrast, a visual nod to the physical grid of pill chambers.
- No gradients in product UI. Marketing site may use one subtle tonal gradient (primary → primary-soft, vertical, 5% delta) as an atmospheric backdrop, never behind text.
- Never full-bleed photographic backgrounds in product. Photos are confined to bounded containers with rounded corners.

### Spacing & layout

- 4px base grid. Most UI snaps to 8px.
- **Density: spacious.** Cards are airy. Forms have `var(--space-6)` (24px) vertical rhythm between fields. Never try to "fit more in" — the audience benefits from breathing room.
- **Touch targets:** 44px minimum. Primary actions on mobile are 56px. The dispenser device itself uses 64px+ (handled in device firmware, not here).
- Grid: 12 columns on desktop with 24px gutters. Content max-width `1120px` for marketing, `960px` for app views.

### Corner radius

Base **14px**. Cards use 14–20px. Pills and chips use full radius. Sharp corners are reserved for dividers and data tables.

### Shadows & elevation

Three shadow levels, all **low and soft** — no harsh drop shadows. See `colors_and_type.css` for exact values.

- `--shadow-1`: resting cards, inputs.
- `--shadow-2`: elevated surfaces (popovers, raised CTAs).
- `--shadow-3`: sheets, modals.

We prefer **elevation via spacing + border** over heavy shadow. A card on canvas may just have `--border-subtle` and `--shadow-1`.

### Borders

- `--border-subtle` (`#E3E9EE`) — default card and divider.
- `--border` (`#CBD5DF`) — inputs, interactive containers.
- `--border-focus` — always visible on focus, never suppressed. Double-ring focus (white inner + primary outer) to show on any background.

### Motion

**Expressive but calm.** Motion confirms physical events (a pill logged, a door opening) with clear feedback but never feels bouncy or playful in-product. Marketing can be a hair more expressive.

- Durations: fast `120ms`, base `200ms`, slow `320ms`, slower `480ms`.
- Easings: `--ease-out` for entrances, `--ease-in` for exits, `--ease-spring` for confirmation moments (pill taken, door closed) — a subtle overshoot.
- **`prefers-reduced-motion`** collapses all durations to `0ms` at the CSS-variable level. Nothing animates for users who opt out.

### Hover, press, focus

- **Hover** on interactive elements: +5% darken on surface or a `--primary-soft` wash for ghost buttons. Never underline-on-hover for primary buttons; underlines reserved for links.
- **Press:** scale `0.98` with `--ease-spring`, return on release. Color shifts to `--primary-press`.
- **Focus:** always uses `--focus-ring`. Never remove focus.
- **Disabled:** `--ink-4` foreground, `--surface-sunk` background, no cursor pointer. Aria-disabled over HTML-disabled where possible so screen readers still read the label.

### Transparency & blur

- Sparingly. Used for sheet backdrops (`rgba(15,27,45, 0.4)` with 8px blur) and for the bottom nav's frosted surface on scroll.
- Never behind live text. Never for decoration.

### Imagery

When photographs are used (marketing only), they are:
- Warm-toned, shot with soft natural light.
- Depict real hands, real people, real environments — never stock-photo "happy pill-taker" tropes.
- Include adaptive aids, wheelchairs, and mobility devices in the frame when relevant, not as inspiration porn.
- No grain, no duotone filters. Clean, unmanipulated.

### Iconography

**Phosphor Icons** (duotone weight) is our primary icon system. Phosphor offers friendly rounded geometry with strong recognizability at small sizes and includes a duotone variant that matches the soft-paper aesthetic without being childish.

- **Duotone fill** is the default. The two-tone treatment creates gentle depth without visual noise.
- Stroke icons (Phosphor "regular") for dense UIs (clinician dashboard data tables).
- 24px default size; 20px in dense contexts; 32–40px for primary actions.
- Icons are **always labeled** — either visible text or aria-label. Never icon-only buttons without an accessible name.
- Icons reinforce semantic color. A danger state gets `PhWarningOctagon` + red + "Missed". Color, shape, and word — three cues, never one.

See `ICONOGRAPHY.md` (below in this README) for the full icon map.

---

## Iconography

Phosphor Icons are loaded from CDN:

```html
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1"></script>
<!-- duotone is the default weight for Pillar -->
<i class="ph-duotone ph-pill"></i>
```

### Canonical icon map

| Concept | Icon |
|---|---|
| Medication / pill | `ph-pill` |
| Schedule / time | `ph-clock` |
| Taken / done | `ph-check-circle` |
| Missed / overdue | `ph-warning-octagon` |
| Due soon | `ph-bell-ringing` |
| Skipped | `ph-skip-forward` |
| Caregiver / person | `ph-user-circle` |
| Settings | `ph-gear-six` |
| Dispenser device | `ph-device-mobile-speaker` (stand-in) |
| Refill | `ph-arrows-clockwise` |
| Notes / journal | `ph-notebook` |
| Help / docs | `ph-lifebuoy` |

Emoji: **not used in-product.** A single 💊 may appear in community-facing communications sparingly.

---

## File index

```
/
├── README.md                  ← you are here
├── SKILL.md                   ← makes this folder work as a Claude Skill
├── colors_and_type.css        ← all design tokens + semantic element styles
├── fonts/                     ← Lexend, Atkinson Hyperlegible, JetBrains Mono
├── assets/                    ← logo lockups, marks, brand illustrations
├── preview/                   ← design-system-tab cards
├── ui_kits/
│   ├── companion-app/         ← patient-facing mobile app
│   ├── caregiver-app/         ← caregiver mobile app
│   ├── marketing-site/        ← opensource project landing
│   ├── docs-site/             ← setup and developer docs
│   └── clinician-dashboard/   ← clinician/admin web
└── slides/                    ← pitch/readme/open-source deck template
```

Each `ui_kits/<product>/` contains a `README.md`, an `index.html` click-through, and per-component `.jsx` files.

---

## Caveats

- **No existing brand was provided**, so every choice here was authored from your values brief. Review the name "Pillar," the color direction, and the logo mark — any of these are easy to swap.
- **Font substitution flag:** Lexend and Atkinson Hyperlegible were pulled from Google Fonts (subsetted Latin only). If you have licensed weights or a different preferred face, drop them in `fonts/` and update the `@font-face` declarations.
- The **Pillar logo mark** is original and uses a 7-chamber grid metaphor; if you'd like a different metaphor (bottle, sunrise, something abstract), that's a quick swap.
- **Phosphor Icons** is linked from CDN rather than vendored. If offline use matters, we can copy the icon font locally.
- Component coverage in each UI kit is intentionally **focused**, not exhaustive. Easy to extend once we decide which flows matter most.

