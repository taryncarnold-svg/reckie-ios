# PRODUCT.md — Reckie

The source of truth for what Reckie is, how it behaves, and what we build first.
Pair this with `DESIGN.md` (the visual system). When the two are silent on a detail,
favor the simplest thing that serves **the flywheel** described below.

---

## 1. What Reckie is

A private recommendation app for the people you actually trust. Not a feed of strangers,
not an algorithm, not a review site. You keep the things you swear by — restaurants, bars,
things to do, films, shows, books, games, products — and you pass them to your circle. They
pass them on too, and you get to see how far your taste travels.

**One-line:** the things your people swear by, kept in one place.

**What it is NOT** (hold this line — every dead competitor blurred these):
- not a public social feed
- not an open-comment platform
- not a star-rating/review site
- not a personal-brand tool (public profiles come later, as a *layer*, not the core)
- not an influencer product (influencers will *use* it; it isn't *for* them)

---

## 2. The flywheel (the most important section)

Most recommendation apps die because they're a place to *store* things with no reason to
return. Reckie is built around a loop that creates return visits and reproduces recommendations:

```
   see a reckie  →  save it (want to try)  →  [you go / watch / read]
        ↑                                              ↓
   status: your                               mark "tried it"
   taste traveled                             (+ optional private note = your log)
        ↑                                              ↓
   originator gets  ←  lineage extends  ←  reckie it (pass it on)
   the payoff           +1 co-sign           = co-signs the original
```

Every arrow is either a **return trigger** or a **content-creation moment**. The app should
always be nudging the user one step further around this loop. If a feature doesn't feed the
flywheel, it's probably not v1.

The four psychological drivers we are deliberately engineering for:
1. **"I told you about it first."** Vindication/status when your taste is proven right. This is
   the strongest driver in the app. Lineage + the payoff moment serve it.
2. **"Here's my two cents."** People love to chime in. Co-signs with a one-line take serve it,
   safely (no open comments).
3. **"Rank my favorites."** Ranking is identity and is compulsive. Optional Top 8 serves it.
4. **"Remember my life."** People want a log of what they did and felt. The private log
   (byproduct of "tried it") serves it.

---

## 3. Core objects & data model

Supabase/Postgres. This shares the **same backend as the web app** — do not create parallel
auth or duplicate tables. Extend the existing schema. Names below are the intent; reconcile
with existing tables in the repo and migrate carefully.

### profiles
- `id` (uuid, pk, → auth.users)
- `name` (text)
- `handle` (text, unique)
- `avatar_url` (text) — **profiles have photos. This matters; people follow people.**
- `bio` (text, short — "your taste in one line", e.g. "lapsed vegetarian, will drive 2hrs for pasta")
- `avatar_color` (text, fallback when no photo)
- `is_public` (bool, default false) — for the future public-profile layer
- `created_at`

### reckies
The central object. A reckie is an **endorsement** of a thing by a person.
- `id` (uuid, pk)
- `user_id` (→ profiles) — who reckied it
- `title` (text)
- `category` (enum: eat, drink, do, watch, read, play, **shop**) — note: `shop` (products) added for monetization
- `city` (text, nullable — required for eat/drink/do)
- `note` (text — the person's take. THIS IS THE PRODUCT. reads like a text to a friend, not a review)
- `tags` (text[])
- `external_id` (text, nullable — TMDB id, Google Place id, etc. for metadata + dedupe)
- `source_reckie_id` (uuid, nullable, → reckies.id) — **LINEAGE. self-reference. the reckie this one came from.**
- `canonical_id` (uuid, nullable) — groups all reckies of the same real-world thing (all "Sushi Park" reckies share one canonical thing, so co-signs and overlap can aggregate)
- `created_at`

`source_reckie_id` and `canonical_id` are the two most important columns in the schema.
They are cheap to add now and very expensive to retrofit. Add them in the first migration
even before the UI fully uses them. Lineage and overlap are dead without them.

### cosigns
When you back someone's reckie (or reckie the same thing yourself), it's a co-sign.
- `reckie_id` (→ the reckie being co-signed) OR `canonical_id` (the real-world thing)
- `user_id` (→ profiles, the co-signer)
- `note` (text, nullable — your optional one-line take)
- `created_at`
- pk (canonical_id, user_id) — one co-sign per person per thing

**Co-sign count (scoped to a user's reckies) is the hero number on a profile.** It is the
thing people chase. It must only count co-signs from real connections — never gameable by
public randoms.

### saves
"Want to try." Visible to your circle (social, not private).
- `user_id` (→ profiles)
- `reckie_id` or `canonical_id`
- `created_at`
- pk (user_id, canonical_id)

### tried
The "tried it" state — the heart of the loop. Also the seed of the private life-log.
- `user_id` (→ profiles)
- `canonical_id` (the thing they tried)
- `private_note` (text, nullable — **private**, the start of the life-log)
- `loved` (bool, nullable — quiet positive signal; NO public downvote)
- `tried_at`
- pk (user_id, canonical_id)

v1 keeps this lightweight: tried + optional private note + optional "loved". The richer
life-log (who-with, when, feeling) layers on later — same table, more columns.

### top_lists  (the optional Top 8)
- `id`, `user_id`, `category`, `title` (e.g. "Top 8 Must-Watch")
- ordered list of `reckie_id`s (join table `top_list_items` with `position`)
- optional; only offered once a user has 8+ in a category

### circles / circle_members
As they exist today. A reckie's visibility is scoped to the user's circle(s).

---

## 4. Navigation

Bottom tab bar, five slots:

**Home · Circle · ＋ · Saved · Search**

- **Map is NOT a tab.** It's a view toggle *inside* Places. A nav slot is the most expensive
  real estate in the app and most users won't be in places-mode most of the time.
- **＋** is the add/reckie action (center, accented).
- **Saved** earns a slot because the tried-it loop runs through it.

---

## 5. The screens

### Home (hybrid — pulse + catalogue)
The return-driver. Two zones, top to bottom:

**The pulse** (top): a quiet, high-signal strip of recent circle activity. Capped (≈3–6 items),
calm, never an infinite feed. **Only reckies and co-signs hit the pulse — never saves or browses.**
Examples: "Camden reckied a place in LA," "3 of your circle reckied The Bear this week,"
"Your Sushi Park reckie was co-signed by Steve." The "your taste traveled" payoffs surface here.

**Your catalogue** (below): essentially the Me page — profile header, then your reckies organized
into Places (city cards), then Watch/Read/Play/Shop. Self-expression lives here, one scroll down.

### Profile / Me
Order matters — lead with identity and proof, not vanity stats:
1. **photo**, name, **handle**, **one-line taste bio**
2. **hero number: co-signs** (how many people backed your reckies) — the thing you chase.
   Other counts (reckies, cities) are secondary, smaller.
3. **Top 8** (if they have one) — the signature shareable artifact, shown prominently
4. then the catalogue (Places, Watch, etc.)
5. sub-tabs: **My reckies · Saved**

### The reckie object (detail) — a co-signable stack
This is the most important screen to get right. A reckie is a **collectible co-sign object**:
- the thing (title, category, city, hero image/metadata)
- **the note** — reads like a text from a friend, NOT an italic pull-quote. Direct, warm, short.
- **who reckied it** — one clean line, name + small avatar. **No date** (date doesn't matter).
- **lineage** — subtle: "originally Camden's find" when `source_reckie_id` exists
- **the co-sign stack** — "also reckied by ◐◐◐" with faces; tap to expand each person's one-line take
- **external score** (Yelp/RT/etc.) as a small trust signal, secondary to the circle's takes
- **actions**: the loop controls — **Save**, **I tried this**, **Reckie it** (pass on / co-sign),
  plus the action-link (Reserve / Watch / Buy) which carries the affiliate link silently
- tags

### Add / Reckie flow (＋)
1. pick category (eat/drink/do/watch/read/play/shop)
2. find the thing (search metadata API; dedupe to a canonical thing)
3. write your take (the note — encourage real, specific, friend-to-friend voice)
4. if it's something you got from someone in-app, lineage auto-captures via `source_reckie_id`
5. publish to circle

### Saved
"Want to try," visible to circle. Filterable by **city** and **category** (so "Saved in NYC"
is genuinely useful when you travel). Each saved item has a quick **"I tried this"** action —
this is where the loop's return-trigger lives (manual in v1, no nudges yet).

### Circle
List of people in your circle: photo, name, bio, co-sign count. Tap → their profile.
Adding people: contacts + friends-of-friends later; keep simple for v1.

### Map
A view inside Places. Pins for location reckies, tap → the reckie object.

---

## 6. The co-sign / "chime in" rules (protect the warm vibe)

- **No open comments. Ever.** This is a hard product line, not a v1 shortcut.
- You "chime in" by **co-signing** — adding your name (and an optional one-line take) to a thing
  that's already been reckied.
- A co-signed thing accumulates a **stack** of trusted names + takes. That stack is the social
  proof and the beauty of the object.
- All chiming-in is therefore additive and positive. No threads, no replies, no negativity,
  no moderation burden.
- Private dissent is allowed and invisible: you can mark "tried it" + not love it, with a private
  note. Nothing public. No downvote exists.

---

## 7. Lineage & the payoff (the signature mechanic)

- Every reckie passed on in-app records `source_reckie_id`. The chain is queryable.
- Display lineage subtly on the object ("originally Camden's find," "via Steve").
- **The payoff moment is essential, not decorative.** When a thing a user originated accumulates
  co-signs/reckies down the chain, *tell them*: "Remember Sushi Park? 23 people have reckied it
  because of you." Surface this in the pulse and as a notification. This is the most shareable,
  most ego-satisfying moment in the app — it's "I told you so" as a receipt. Build it.
- This is why **co-signs are the hero metric** — they measure exactly this: how far your taste traveled.

---

## 8. Top 8 (optional ranked lists)

- Offered once a user has **8+ reckies in a category**.
- Drag-to-rank, tactile, a little addictive (the compulsive return loop Beli proved out).
- Category-scoped: "Top 8 Restaurants," "Top 5 Must-Watch."
- **Optional** — never forced; forcing it kills it.
- A user's Top 8 is their most shareable artifact — leads the profile, goes in bios, is the
  natural unit a public/influencer profile is built around later.

---

## 9. The private life-log (lightweight in v1)

- v1: "tried it" + optional **private** note + optional "loved." That's it.
- This quietly accrues a personal history (raises switching cost, brings people back via nostalgia).
- Later: who-you-were-with, date, feeling, rewatch/reread tracking — same `tried` table, more columns.
- **Keep the private log private and low-stakes.** Its magic is that it's yours and unperformed.
  Do not leak it into public performance pressure.

---

## 10. Monetization (schema-ready now, UI later)

Do not build the monetization UI in v1, but the data model must not preclude it:
- **Silent affiliate** on all action links (Reserve/Watch/Buy). User never thinks about it;
  Reckie takes the cut. The `shop` category + `external_id` exist partly for this.
- **Originator kickback** on product (`shop`) reckies: when a reckie drives a purchase down the
  lineage chain, the *originator* shares the affiliate cut. This is why lineage is also an
  economic graph, not just a status one. It makes good taste pay — pulling tastemakers in
  *without* building influencer features.
- **Public profiles** (`is_public`) as the future acquisition + influencer layer: a tastemaker's
  ranked Top 8 with action links *is* their monetizable asset and a better link-in-bio than a
  Google doc. Same feature = acquisition engine + revenue.
- **Hard lines:** no subscriptions, no paywalling friends' recs, no ads. The trust is the product;
  anything that corrupts the signal (reckie-to-earn over reckie-because-true) is forbidden. The
  incentive must reward *being right and trusted*, never *posting volume*.

---

## 11. Cold start (existential — design for it)

An empty Reckie is useless. The first session must end with the app already feeling full.
- Onboarding should painlessly extract **5–10 reckies in the first ~3 minutes**: "what are your
  three go-to restaurants?", "pick shows you'd make anyone watch," fast and fun, not a chore.
- Seed the circle: contacts match, invite flow.
- The tried-it→reckie loop then compounds content over time, but day one can't be empty.

---

## 12. v1 build scope (what "go big" means, bounded)

**In v1:**
- new schema (incl. `source_reckie_id`, `canonical_id`, cosigns, saves, tried)
- hybrid Home (pulse + catalogue)
- fixed Profile (photo, bio, co-sign hero number)
- the co-signable reckie object (stack, lineage display, loop actions)
- add/reckie flow with lineage capture
- Saved (circle-visible, filterable, "I tried this" action)
- Circle list
- the lineage payoff moment (at least in the pulse + a notification)
- optional Top 8
- Map as a view inside Places

**Deferred (schema-ready, not built):**
- monetization UI (affiliate, kickbacks, public profiles)
- smart "did you make it?" nudges (v1 is manual "tried it")
- rich life-log (who-with/feeling)
- friends-of-friends discovery, public profile pages

---

## 13. Build order (within the one pass)

To avoid staring at a broken half-app: build in this sequence, verifying each on device before
the next.
1. schema + migrations (reconcile with existing web tables; add lineage/cosign/saves/tried)
2. data layer + types + auth wiring (shared Supabase backend)
3. the reckie object (detail) — the heart; everything links to it
4. add/reckie flow (so real data can be created)
5. Profile / Me (with co-sign number, Top 8 slot)
6. Home (pulse + catalogue)
7. Saved + tried-it action
8. Circle
9. Map view inside Places
10. lineage payoff (pulse item + notification)

Each step: build, run on device via Expo Go, confirm it feels right, then proceed.
