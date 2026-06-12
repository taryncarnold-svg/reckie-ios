# DESIGN.md — Reckie

The visual system, locked through mockup iteration. Pair with `PRODUCT.md` (architecture & behavior).

**v2 addendum:** Section 9 locks decisions from the first on-device review (March 2026).
Where §9 conflicts with earlier sections, **§9 wins.**

Six approved mockups in `/design-mockups/` are the **literal visual targets** — match them, don't reinterpret:

| Mockup | What it locks |
|--------|----------------|
| `reckie-onboarding-v6.html` | The entrance (show-don't-tell cards, phone-first auth) |
| `reckie-editorial-refined.html` | Action hierarchy on a reckie (Save-primary) |
| `reckie-shapes-and-grid.html` | Detail screen (media) + catalogue horizontal grid |
| `reckie-top3-in-section.html` | Top 3 nested in a category section (use **left/rows** treatment) |
| `reckie-circle-browse.html` | Circle Browse lens with category pills |
| `reckie-circle-classic-hero.html` | Circle classic hero (3+ overlap showstopper) |

When prose here and a mockup ever disagree, **the mockup wins.** Build to the pixels.

---

## 0. The one-line philosophy

Clean and modern first; personality in small, deliberate doses. The reference is editorial print
(NYT, Kinfolk) meeting Airbnb/Letterboxd — white, spacious, photo-forward, with calm serif titles
and warm accents used sparingly. **Two earlier failures to never repeat:** (1) drenching everything
in cream + serif (reads "toy"), and (2) flat wireframe with a serif font dropped on top (reads
"unfinished database"). The fix for both is the same: real hierarchy, big confident imagery, one
clear focal point and action per screen, accents as punctuation.

---

## 1. Color

```
--white:        #FFFFFF   base field
--paper:        #FBFAF8   barely-warm off-white — app background, surfaces
--paper-2:      #FFFDF8   warmer tint — "yours"/highlighted cards
--line:         #ECEAE5   warm hairline
--line-2:       #EBE7DE   card border
--ink:          #16140F   warm near-black — never #000
--ink-2:        #6B6660   warm taupe — secondary text — NEVER cold #888
--ink-3:        #9C968D   faint — captions, meta

--oxblood:      #8B3A2F   PRIMARY accent — wordmark dot, Reckie-it, save chips, key moments
--oxblood-soft: #FBF0EE   tinted bg for save buttons / co-sign stamp
--oxblood-line: #F0D9D5

--marigold:      #D99A2B   HIGHLIGHT — Top-3 rank numbers, "yours" labels, rare special beats
--marigold-deep: #B97D15   Top-3 label, rank accent (#C9A24B for row numbers in mockup)
```

Muted category tints (cover gradients when no art; all same low saturation):
```
eat #C46B4A   drink #6E8499   do #6E8E78   watch #5B5470   read #B8985E   play #6E9079   shop #9A7B8E
```

**Anti-AI rules (enforce):** warm cream base never blue-white; ink warm near-black never #000;
secondary text warm taupe never cold #888 (biggest tell); accent appears 1-2x per screen, never
evenly spread; category tints all muted to the same low saturation.

---

## 2. Type

**Inter** = workhorse, everything (UI, body, labels, buttons, meta).
**Fraunces** = rare accent, weight **500, no italic** (black/italic reads theatrical — banned).
Use Fraunces ONLY on: the wordmark, screen/item titles, person names, city names. ~<=6 serif
moments per screen. Everything else Inter.

Scale:
```
display   30-34  Fraunces 500   item title (detail), onboarding headline
title     16-24  Fraunces 500/600  card titles, city names, section heads where serif
body      15-17  Inter 400      notes (a reckie note is Inter, ~16.5, NOT an italic pull-quote)
label     13-14  Inter 600      buttons, tabs, pills
eyebrow   10-11  Inter 700      uppercase, letter-spacing 0.06-0.09em, category/"reckied by" tags
meta      11-12  Inter 400/500  --ink-3 captions
```

Sentence case everywhere. The reckie note reads like a text from a friend — plain Inter, warm,
direct — never a precious serif callout.

---

## 3. Image shapes (IMPORTANT — driven by category)

Art must never be cropped wrong. The image container's aspect ratio is set by category, and art
fits within its native shape:
```
watch / read        2:3  tall poster / book cover
listen (album/pod)  1:1  square
play (games)        1:1  (boxart varies; default square)
eat / drink / do    4:3  landscape photo
shop (products)     1:1  square
```
In grids: horizontal scroll rows, each row using its category's ratio (see grid mockup).
On the **detail screen (media — watch/read/listen/play):** the hero keeps the item's native shape — e.g. a 2:3 poster sits centered at ~210px wide on a **blurred, darkened, scaled-up copy of its own art** as the backdrop, so tall art never leaves dead space.

On the **detail screen (places — eat/drink/do):** use a **full-width 4:3 hero** (~screen width minus margins). Do not use the centered poster + blur treatment — wide place photos look broken when squeezed into a small floating tile.

Content rises in a `paper` sheet with a 24px top radius over the bottom of the backdrop.

---

## 4. Shape, spacing, texture

- radii: cards 16, tiles 10-13, buttons 14, pills 30 (full), detail sheet 24 (top corners)
- borders: `0.5px solid --line` warm hairlines; prefer over shadows
- shadows: minimal; soft only on the FAB and floating sheets
- spacing: generous but not loose — onboarding tightened so inputs aren't bottom-exiled
- texture: a barely-there grain allowed on ONE warm surface max per screen; never app-wide
- photography fills cover/poster slots; gradients are placeholders only

---

## 5. Core components

### Wordmark
`Reckie.` — Fraunces 600, the period in oxblood.

### Bottom tab bar
White, blurred, 0.5px top border. **Home . Circle . + . Saved . Search.** Center + is the oxblood
FAB (only element with a soft shadow), slightly raised. Map is NOT here — it lives inside Places.

### The reckie detail (the heart — match `reckie-shapes-and-grid.html` left)
- native-shape hero on blurred self-backdrop (see section 3)
- category chip on the art (e.g. "Show"); back + more as floating circular buttons
- title Fraunces 500, centered; meta line in --ink-3, centered
- metadata **tags** pulled from the source API (e.g. "Drama . Small-town . Sports . Tearjerker";
  for places "Italian . Date night . Reservations") as --paper pills
- byline: avatar + "Reckied by / Name", with co-sign faces ("also reckied by") to the right.
  **No date.** The note is plain Inter, reads like a text.
- "Mia & Brett also reckied this" co-sign line
- **Actions, in this hierarchy:** **Save for later = primary** (big dark `--ink` button). Beneath,
  a row of two: the **smart auto-CTA** (Watch/Reserve/View — see section 6) and **Reckie it** (oxblood-
  tinted). Save is loudest because in-the-moment you usually can't act yet — you save for when you
  can. Reckie-it is present but never pushy.

### Catalogue grid (match `reckie-shapes-and-grid.html` right)
Horizontal-scroll rows per category, each in its native ratio (section 3). Section label = Inter 700
uppercase + faint count. Item title Fraunces (places/serif-worthy) or Inter 600 (small tiles),
attributor in --ink-3.

### Onboarding (match `reckie-onboarding-v6.html`)
Show-don't-tell. Wordmark, Fraunces headline ("Your favorite people's favorite stuff."), Inter
subline ("Keep, organize, and share everything you and your people swear by."). Then **live example
reckie cards**: the top card is the user-perspective "Your reckie" (warm `--paper-2` tint, marigold
label, dark check "Yours" marker — reads already-kept), the others are "Dad's reckie / Cam's reckie"
with oxblood **Save** buttons (teaches the collect gesture pre-signup). Vary categories across cards
to show range + shapes. Auth: **phone-first** with an Email toggle, country-code field, dark primary
"Get started", reassurance line. Spacing tight enough that the input sits comfortably, not exiled.

### Co-sign / vouch stamp (signature delight — use sparingly)
Soft `--oxblood-soft` block, overlapping avatar faces, short line ("3 in your circle reckied X").
The one flourish on Home/profile; don't repeat the treatment elsewhere. UI copy uses **vouch**;
DB table remains `cosigns`.

### Profile
Photo, name (Fraunces), @handle, one-line taste bio. **Hero number = vouches earned** (larger);
reckies count secondary. **No full-width ranked blocks at the top** — Top 3 lives inside each
category section (§9.1). Catalogue shelves follow. Saved is its own tab.

### Top 3 in-section (see §9.1 — do not build standalone Top 8 billboards)
Compact ranked rows inside the category, not a marigold card at the top of the profile.

---

## 6. The smart auto-CTA

The action button auto-detects the right action from the item's metadata (JustWatch/TMDB for
watch -> "Watch on Hulu" etc.; Resy/Google for places -> "Book on Resy"/"Open in Maps"; store for
books -> "View on Goodreads"). Never hardcode one service. This button silently carries the affiliate
link (see PRODUCT.md section 10) — invisible to the user.

---

## 7. Motion

Calm, physical, never bouncy/cartoonish (skews young). Press: scale 0.97-0.98 + slight opacity,
~120ms. Sheets: native slide-up easing. Top-3 rank editor: tactile tap-to-rank — spend budget here.
Lineage payoff: a small earned beat (a settle, subtle marigold glow — not confetti). Haptics
(expo-haptics) on save / tried-it / reckie-it / vouch.

---

## 8. Hard "no" list

cream/serif everywhere . pure #000 or cold #888 . the note as an italic pull-quote . dates on the
reckie byline . evenly-spread accent color . heavy/material shadows . map as a nav tab . open
comments (vouch + one-line take only) . cropped/squished art (always native ratio) . bouncy
motion . grain on more than one surface per screen . full-width Top 8/Top N billboard blocks at
the top of profile (Top 3 in-section only).

---

## 9. v2 components (added after first build review — March 2026)

New visual targets in `design-mockups/` (full index at top of this file):

### 9.0 Home layout (profile-first)
Open on **your profile + catalogue**. Pulse is a capped strip (~3 items) at the **bottom** of Home
scroll with "See all → Circle" — never a wall of activity before your name. Vouch stamp (oxblood-soft)
near the profile header when circle overlap exists.

### 9.1 Top 3 in-section feature (match `reckie-top3-in-section.html`, left/rows treatment)
Under a category header, when the category has 3+ reckies: a small label "★ [Name]'s Top 3" with a
"See all >" link on the right, then **three compact rows**: marigold rank number (1/2/3, Fraunces),
small native-shape thumbnail, title in Fraunces 600, tiny --ink-3 meta, hairline dividers between.
Light — no heavy filled card. Below the three rows, the category's remaining items flow in the
normal horizontal scroll grid. Never render full-width "ranked" billboard blocks at the top of the
profile (removed).

### 9.2 Circle Browse lens (match reckie-circle-browse)
Circle tab header, then a two-option lens toggle **[Browse] [People]** (Browse = on by default:
dark pill). Below it, horizontally-scrolling **category pills** (All / Watch / Listen / Read /
Places / Play) — active pill is oxblood. Content rows below: native-shape thumbnail, Fraunces
title, who-vouched line in --ink-3, and a "N vouches" chip (oxblood on --oxblood-soft) on the right
for multi-vouch items. Most-vouched sorts to top.

### 9.3 Circle classic hero (match reckie-circle-classic-hero)
The overlap showstopper, at the top of Browse when 3+ people reckied a thing:
- layered card edges peeking behind (two offset --paper rectangles) = "stacked reckies"
- the card: 18px radius, **glowing gold border** (`box-shadow: 0 0 0 1.5px #E7C77E` + soft amber
  drop shadow), full-bleed image with a bottom-up dark gradient
- marigold **seal** top-left: "★ Loved by N of your circle" (amber pill, small shadow)
- category chip top-right (glassy)
- title Fraunces 600 ~26px white; a pulled italic "why" quote (one of the takes); then a row of
  big white-ringed avatar faces + "Cam, Mia, Brett & Jannah swear by this" (names bold, --marigold
  tint on the highlight)
- This is the ONE place the app goes big and celebratory. It earns it — strongest signal in the app.
- Rows for 2-vouch items just get the small "N vouches" chip; reserve the hero for 3+.

### 9.4 Vouches (UI copy)
"Co-signs" → **vouches** in all user-facing copy. Profile hero: "vouches earned." The save/vouch
chip uses --oxblood on --oxblood-soft. Technical/DB name stays `cosigns`.

### 9.5 Place detail hero
Full-width 4:3 landscape image for eat/drink/do detail sheets. See §3 and PRODUCT.md §14.6.
