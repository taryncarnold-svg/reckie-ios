# DESIGN.md — Reckie

The visual system. Pair with `PRODUCT.md` (architecture & behavior). When in doubt:
**clean and modern first; warmth and personality in small, confident doses.**

The reference points are Airbnb and Letterboxd — white, spacious, photo-forward, structurally
crisp. Reckie's personality (oxblood, marigold, a serif accent, the co-sign stamp) is
**punctuation on a clean page, never the whole field.** An earlier draft drenched everything in
cream and serif and read like a toy — explicitly what we are NOT doing. Delight is concentrated
into a few signature moments; everything else stays calm and legible.

---

## 1. Principles

1. **White base, real air.** The field is white. Generous whitespace. Crisp structure.
2. **Warmth is a touch, not a coat.** A barely-warm off-white on surfaces; warmth mostly comes
   from photography and one or two accents per screen.
3. **Sans does the work; serif is a rare guest.** Clean sans for all UI. Serif (Fraunces) only on
   key display moments: wordmark, names, titles, a recommender's note.
4. **Accents are punctuation.** Oxblood and marigold appear in small deliberate places, never
   spread evenly across a screen.
5. **Delight is concentrated.** Pick the signature moments (the co-sign stamp, the lineage payoff,
   the Top 8, the onboarding panel) and make them special. Keep everything else restrained so they
   stand out.
6. **Photo-forward.** Real imagery (place photos, posters, covers) carries the warmth so the chrome
   can stay clean and white.

---

## 2. Color

```
--white:        #FFFFFF   /* the base field */
--paper:        #FBFAF8   /* barely-warm off-white — surfaces, cards, pills */
--line:         #ECEAE5   /* warm hairline border */
--line-soft:    #F3F1EC
--ink:          #1C1A17   /* warm near-black — never pure #000 */
--ink-2:        #6B6660   /* warm grey-taupe — secondary text. NEVER cold #888 */
--ink-3:        #9C968D   /* faint — captions, hints */

--oxblood:      #8B3A2F   /* PRIMARY accent — wordmark dot, FAB, key actions, avatars */
--oxblood-deep: #6E2B22
--oxblood-soft: #FBF0EE   /* tinted background for the co-sign stamp */

--marigold:      #D99A2B  /* HIGHLIGHT accent — the Wes title-card move, scores, featured */
--marigold-deep: #B97D15
--marigold-soft: #FBF3E2
```

Muted, low-saturation category tints (for cover gradients / chips — all sit at the same low
saturation, like a faded postcard):
```
eat   #C46B4A      drink #6E8499      do    #6E8E78
watch #5B5470      read  #B8985E      play  #6E9079      shop #9A7B8E
```

**Anti-AI rules (enforce these — they're why it won't look generated):**
- base is warm white/off-white, never blue-white, never pure `#FFF` on every surface
- ink is warm near-black, never `#000000`
- secondary text is warm taupe (`--ink-2`), never cold grey `#888` — this is the single biggest tell
- the accent appears once or twice per screen, never evenly distributed
- category tints are all muted to the same low saturation

---

## 3. Typography

**Sans (workhorse): Inter.** All UI — tabs, pills, stats, body, buttons, labels, metadata.
**Serif (rare accent): Fraunces.** Only: the wordmark, person names, screen/section display
titles, city names, and a recommender's note. Roughly ≤6 serif moments per screen.

Scale (sans unless marked serif):
```
display   28–34px  Fraunces 600   screen titles, person name, onboarding headline
title     20–24px  Fraunces 600   city names, reckie title on detail
section   13px     Inter 600      section headers (uppercase-ish, slight tracking)
body      15px     Inter 400      notes, descriptions, general copy
label     13px     Inter 500      pills, tabs, buttons
caption   11–12px  Inter 400/500  metadata, counts, hints (--ink-3)
note      16–17px  Fraunces 400   a recommender's take — but see card rule below
```

Sentence case everywhere. Two sans weights (400/500) plus 600 reserved for the few bold labels.

---

## 4. Shape, spacing, texture

- **Radii:** cards 16px, tiles/inputs 13–14px, pills 30px (full), buttons 13px.
- **Borders:** `0.5px solid var(--line)` — thin, warm. Prefer hairline borders over heavy shadows.
- **Shadows:** minimal. A soft shadow only on the FAB and floating sheets. No material-design float.
- **Spacing:** generous. Screen padding 20–24px. Section gaps ~18–22px. Let it breathe.
- **Texture:** a *barely-there* paper grain is allowed on **one** warm surface per screen (e.g. the
  onboarding art panel) at very low opacity. Do NOT grain the whole app — it reads as costume.
- **Photography** fills card/cover/poster slots. Gradients are placeholders only until real
  metadata images load.

---

## 5. Core components

### Wordmark
"Reckie" in Fraunces 600, with the period in oxblood: `Reckie.` The dot is the accent.

### Bottom tab bar
White, blurred, `0.5px` top border. Five slots: Home · Circle · ＋ · Saved · Search.
Center ＋ is an oxblood circular FAB (the one place with a soft shadow), slightly raised.
Inactive icons `--ink-3`, active `--ink`. Tiny labels (10px).

### City card (Places)
Photo-forward, clean. Image top (real city/place photo) with a small white count chip
(Fraunces) in the corner; below, city name in Fraunces 600 + a thin caption of categories
("Eat · Drink · Do"). 2-up grid.

### Poster tile (Watch/Read/Play)
Letterboxd-style. 2:3 poster image, subtle bottom gradient, title in small bold sans over it.
3-up grid. Photo carries it; chrome stays minimal.

### The reckie object / detail (get this right)
The most important screen. A clean white page:
- hero image (place photo / poster) with a small white category+city chip
- **title** in Fraunces 600
- a short location/context line in `--ink-2`
- **who reckied it: ONE clean line** — small avatar + name. **No date.** If others co-signed,
  show "also reckied by ◐◐◐" with faces right here.
- **the note reads like a text from a friend** — NOT a precious italic pull-quote. Warm, direct,
  `--ink`, normal weight, comfortable size. It's a message, not a magazine callout.
- **lineage** (subtle, if present): "originally Camden's find" in `--ink-3`
- **co-sign stack:** expandable — each co-signer's face + their one-line take
- external score (Yelp/RT) as a small chip in `--marigold-soft`, secondary
- tags as `--paper` pills
- **loop actions:** Save · I tried this · Reckie it; plus the silent affiliate action-link
  (Reserve/Watch/Buy) as the primary oxblood button

> Correction from the mockup: the old card set the note as a big italic serif quote and gave
> "reckied by Camden · 5 days ago" too much weight. Fix: drop the date, shrink attribution to one
> clean line, add co-sign faces, and make the note feel like a friend's text, not editorial copy.

### Co-sign stamp (signature delight moment)
The one flourish on Home/profile. Soft oxblood-tinted (`--oxblood-soft`) rounded block,
overlapping circular avatars (Fraunces initials or photos), short line:
"**3 in your circle** reckied The Bear." Warm, social-proof, restrained. This is *the* delight
beat — keep it special by not repeating the treatment elsewhere.

### The pulse (Home top)
A calm, capped strip of recent circle reckies/co-signs and lineage payoffs. Each item: small
avatar/photo, a one-line plain-language event ("Camden reckied a place in LA"), tap-through.
High signal, never an infinite feed. Lineage payoff items ("23 people reckied this because of
you") can get a subtle marigold accent — they're the special ones.

### Profile header
Photo (circle), name (Fraunces), @handle, one-line taste bio (`--ink-2`). **Hero number =
co-signs**, shown larger; reckies/cities secondary and smaller. Top 8 (if any) shown prominently
below. Then sub-tabs (My reckies · Saved) and the catalogue.

### Top 8
A clean ranked list: number (Fraunces, oxblood), thumbnail, title. Drag handle for reordering.
Header like "Top 8 · Must-Watch." Feels like a considered chart, not a cluttered grid.

### Onboarding entrance
Mostly white/clean. ONE warm signature panel: an oxblood art block (with the allowed subtle
grain) carrying the wordmark and a marigold accent. Below it on white: a marigold eyebrow
("A catalogue of good taste"), a Fraunces headline, a plain-sans subline, a dark primary button.
This is the single most "designed" screen — earns it because it's the first impression.

### Buttons
- primary action: solid, `--ink` or `--oxblood` depending on context, white text, 13px radius
- the affiliate/primary action on a reckie: oxblood
- ghost/secondary: white, `0.5px --line` border, `--ink` text
- pills (filters/tags): `--paper` bg, `0.5px --line`; active = `--ink` bg, white text

---

## 6. Motion

Calm and physical, never bouncy or playful-cartoonish (that skews young).
- press states: subtle scale (0.97–0.98) + slight opacity, quick (~120ms)
- sheet transitions: smooth slide-up, iOS-native easing
- the **Top 8 drag-to-rank** should feel tactile and satisfying — this is a place to spend motion budget
- the **lineage payoff** moment deserves a small, earned celebratory beat (restrained — a settle,
  a subtle marigold glow, not confetti)
- haptics on key taps (save, tried-it, reckie-it, co-sign) via expo-haptics

---

## 7. What to avoid (hard "no" list)

- cream/serif everywhere (the toy-story failure mode)
- pure `#000` ink or cold `#888` grey secondary text
- the recommender's note styled as a precious italic pull-quote
- dates on the reckie attribution line
- evenly-distributed accent color — keep it to 1–2 accent hits per screen
- heavy shadows / material-design float
- map as a nav tab
- open comment threads (co-sign + one-line take only)
- bouncy/cartoonish motion
- grain on more than one surface per screen
