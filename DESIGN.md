# DESIGN.md — Reckie

The visual system, locked through mockup iteration. Pair with `PRODUCT.md` (architecture & behavior).
Four approved mockups in `/design-mockups/` are the **literal visual targets** — match them, don't reinterpret:
- `reckie-onboarding-v6.html` — the entrance
- `reckie-editorial-refined.html` — action hierarchy on a reckie
- `reckie-shapes-and-grid.html` — the detail screen + the catalogue grid (per-category image shapes)

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

--marigold:      #D99A2B   HIGHLIGHT — "yours" labels, Top-8 numbers, rare special beats
--marigold-deep: #B97D15
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
On the **detail screen**: the hero keeps the item's native shape — e.g. a 2:3 poster sits centered
at ~210px wide on a **blurred, darkened, scaled-up copy of its own art** as the backdrop, so tall
art never leaves dead space. Content rises in a `paper` sheet with a 24px top radius over the
bottom of that backdrop.

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

### Co-sign stamp (signature delight — use sparingly)
Soft `--oxblood-soft` block, overlapping avatar faces, short line ("3 in your circle reckied X").
The one flourish on Home/profile; don't repeat the treatment elsewhere.

### Profile
Photo, name (Fraunces), @handle, one-line taste bio. **Hero number = co-signs** (larger); reckies/
cities secondary. Top 8 prominent if present. Sub-tabs (My reckies . Saved), then catalogue.

### Top 8
Clean ranked list: number (Fraunces, oxblood), thumbnail (native shape), title, drag handle.
Header like "Top 8 . Must-Watch." A considered chart, not a cluttered grid.

---

## 6. The smart auto-CTA

The action button auto-detects the right action from the item's metadata (JustWatch/TMDB for
watch -> "Watch on Hulu" etc.; Resy/Google for places -> "Book on Resy"/"Open in Maps"; store for
books -> "View on Goodreads"). Never hardcode one service. This button silently carries the affiliate
link (see PRODUCT.md section 10) — invisible to the user.

---

## 7. Motion

Calm, physical, never bouncy/cartoonish (skews young). Press: scale 0.97-0.98 + slight opacity,
~120ms. Sheets: native slide-up easing. Top-8 drag: tactile, satisfying — spend budget here.
Lineage payoff: a small earned beat (a settle, subtle marigold glow — not confetti). Haptics
(expo-haptics) on save / tried-it / reckie-it / co-sign.

---

## 8. Hard "no" list

cream/serif everywhere . pure #000 or cold #888 . the note as an italic pull-quote . dates on the
reckie byline . evenly-spread accent color . heavy/material shadows . map as a nav tab . open
comments (co-sign + one-line take only) . cropped/squished art (always native ratio) . bouncy
motion . grain on more than one surface per screen.
