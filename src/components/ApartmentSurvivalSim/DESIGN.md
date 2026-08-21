# Unit 4B v2 — "Renewal Season" Design Document

Working design doc for the second major version of the Apartment Survival
Simulator. v1 shipped as a well-written choose-your-path pamphlet; v2 turns it
into a game. Every feature below traces to a specific design concern from the
v1 review. The anonymization contract, tone rules (satire targets systems,
never on-site people), and the open rent-figure question all still apply to
every piece of new content here.

---

## 0. The design pillar

**Your peace or your case.**

Every mechanic exists to ask one question eleven different ways: do you protect
your sanity, or do you build the file? You cannot do both. The renewal
negotiation is where the answer gets priced.

If a proposed feature doesn't sharpen that question, cut it.

---

## 1. The choice economy rework

> Addresses: "there are no real decisions — documenting is always correct."

Every event now offers three choices in a fixed grammar:

| Slot | Nickname | Typical cost/payoff |
|---|---|---|
| **Peace** | Let it go | +1 sanity, 0 evidence. Sometimes leaves a ticket open. |
| **Case** | Document it | −1 or −2 sanity, +2 evidence. The file grows; so does the obsession. |
| **Wildcard** | Do something | Dice roll. Variable sanity/evidence, occasionally opens or closes tickets. |

Key inversions from v1:

- **Documenting costs sanity.** Composing the email at midnight, photographing
  the sign, maintaining the spreadsheet — the file is corrosive. This is the
  thematic core and the balance fix in one move.
- **Letting go restores sanity.** It is now a real, attractive option with a
  real cost: an empty file at renewal.
- The "noise complaint" partner-victory event stays sanity-positive AND
  evidence-positive — it is deliberately the only event where you get both,
  which is why it feels like winning.

### Tuning targets

- Sanity starts at 10, caps at 12. Reaching 0 still ends the run ("broken"),
  but there's now a warning band (see §6) instead of a cliff.
- Peace-leaning run: sanity hovers 8–11 all year, evidence lands ~4–6 →
  renewal goes badly. Comfortable and expensive. That's the point.
- Case-leaning run: sanity should arrive at renewal season around 3–5 —
  *intentionally* inside the "Fraying" narration band. A perfect file and a
  frayed person is the intended negotiator arc.
- Broken should be a real risk only for greedy evidence play plus bad dice.

---

## 2. The building remembers

> Addresses: "no persistence — events are slot-machine pulls, nothing escalates."

### 2a. The Open Tickets tray (new HUD element)

Unresolved problems become **tickets** that persist across months:

```
OPEN REQUESTS: 3 · OLDEST: 87 DAYS
├─ ELEVATOR (WEST) ........ DAY 87   [NO CLOSE BUTTON]
├─ CEILING, MOISTURE ...... DAY 41
└─ GYM FLOORING ........... DAY 12
```

- Each open ticket drains **−1 sanity per month** (total drain capped at −3).
- Tickets close by: a successful Wildcard roll, a chain event resolving, or —
  rarely — the building fixing something (a 10% monthly roll per ticket,
  because sometimes maintenance just *shows up*, and it's unsettling).
- **The elevator ticket has no close button.** It renders without one. It is
  the only ticket styled that way. Players will notice, and it is the truest
  joke in the game.
- Day counters tick in real months (30/31 days) because specificity is the
  house style.

### 2b. Event chains

Three multi-month arcs replace pure random draws (full spine in §7):

- **The Elevator Saga** — outage → parts delay → brief triumphant return
  (+2 sanity, the false-hope beat) → fails again, worse. Never fully resolves.
- **The Water Cycle** — ceiling drip → (if unresolved) mold bloom in Act II →
  (if still unresolved) a "wellness inspection" that blames your humidifier.
  Documented at every stage, it compounds into the **Hydrology File**, the
  strongest procedural exhibit in the game.
- **The Robot Arc** — three scheduled appearances; the secret-ending path (§8).

### 2c. Visible dice

Nothing in a building like this is certain, so Wildcard outcomes (and some
Case outcomes) roll visibly, in mono, after the choice:

```
MAINTENANCE ARRIVAL ROLL: 38/100 — NO-SHOW.
YOUR REQUEST HAS BEEN MARKED "RESOLVED."
```

Showing the roll is funnier than hiding it and makes bad outcomes feel like
the building's fault, not the game's. Never roll on the Peace option — peace
is guaranteed; that's what you're buying.

---

## 3. Toasts become a game

> Addresses: "the signature element is decorative."

The Parcel Pending toasts stay on their 7-second cadence, but become
**clickable**, and roughly **1 in 8 is real**:

| Toast type | Frequency | Click result | Ignore result |
|---|---|---|---|
| Junk | ~7 of 8 | Dismissed with one line of flavor | Nothing |
| Real package | occasional | +1 sanity ("a small, genuine joy") | Next month: "returned to sender" flavor event |
| Evidence drop | rare | +2 evidence (e.g. a comparable unit listed cheaper on the building's own site) | Gone forever |
| **The renewal offer** | once, month 9, scripted | Opens renewal season properly | It arrives "EXPIRED" in month 10 — and the boss fight opens one rung worse |

Rules:

- Real toasts are visually **identical** to junk. The tell is only in the
  text, which forces actually reading them. (Accessibility: real toasts carry
  distinct `aria-label`s so screen-reader players get an honest game, not a
  vision test.)
- Consequences for missing a real toast are gentle-comedic, never brutal —
  this is satire of notification fatigue, and the mechanic *is* the fatigue.
- The line pool grows from 10 to **36+, in three escalation tiers** that track
  the acts: chipper (months 1–4), passive-aggressive (5–8), unhinged (9–12:
  "Parcel Pending: We know you're home.").
- Hard mode doubles the spawn rate (§8).

---

## 4. The renewal boss fight

> Addresses: "eleven months of buildup, three clicks of payoff."

Renewal becomes a three-phase fight where the file you built all year is the
weapon, and *which parts of it you lead with* is the strategy.

### Phase 1 — The opening

Consultant #1, $2,930 + $20 technology fee, "current market conditions."
Fold / fight / walk, as in v1.

### Phase 2 — The exhibit fight (new)

Evidence is no longer a bare number. Documenting specific arcs earns **named
exhibits**, each with a power rating and a type:

| Exhibit | Earned by | Type | Power |
|---|---|---|---|
| The Elevator Log | documenting 2+ elevator beats | Procedural | ★★★★ |
| The Hydrology File | full Water Cycle documentation | Procedural | ★★★★★ |
| Office Hours, A Triptych | documenting the office event | Absurd | ★★★ |
| The Robot Footage | filming the doormat incident | Absurd | ★★★ |
| Communications Volume Chart | the Parcel Pending filter event | Procedural | ★★ |
| The Citation | month 10, letting the partner respond | Legal | ★★★★★ |
| Comparable Units, Annotated | the neighbor alliance beat (§7) | Legal | ★★★★ |

You **choose three exhibits to lead with**. The consultants have
personalities that gate what lands:

- **Consultant #1** is procedural: numbers-based exhibits hit at full power;
  absurd exhibits are met with "I'm not sure I follow" (half power).
- **Consultant #2** is off-script, tired, and it is December: **absurd and
  legal exhibits land at full power** — the robot footage genuinely gets to
  them — while procedural exhibits get "I'll have to check with the team."

So the optimal play depends on reading which consultant you're in front of,
and the funniest evidence is sometimes the strongest. Effective power total
sets the final rent tier (replacing the raw evidence-count gate):

- 12+ effective power → $2,820 (negotiator)
- 7–11 → $2,850 (survivor)
- under 7 → $2,900 (survivor, expensive)

Generic evidence (from events without named exhibits) still contributes as
+1 power per 2 points, so no documentation is wasted.

### Phase 3 — The 24-hour offer (new)

The final offer arrives Dec 24, 4:52 PM, valid 24 hours — and now there is a
**real 90-second countdown on screen**, in a diegetic e-signature frame.
Options:

- **Sign** — locks the negotiated tier.
- **Counter once more** — one last visible roll, weighted by unused exhibit
  power. Success: −$30 further. Failure: the clock keeps running and the
  consultant goes quiet.
- **Walk away** — always available. ("Escaped.")
- **Let the clock hit zero** — the offer expires, you land on month-to-month
  at +$300: the new **"Month-to-Month" ending** (§8). Freedom, at the
  price the building sets for freedom.

Accessibility valve, built into the joke: a **"Request an extension"** button
pauses the timer indefinitely with the line *"Your extension request has been
received. The clock has stopped. Nobody will ever respond to this request."*
Anyone who needs unlimited time has it; the fiction holds.

---

## 5. Sanity as an experienced state

> Addresses: "sanity is a number in the HUD, not a feeling in the game."

Three narration bands. The *writing and UI* change, so the player feels the
state without reading the meter:

| Band | Sanity | What changes |
|---|---|---|
| **Composed** | 8–12 | v1 voice. Clean portal. Proper capitalization. |
| **Fraying** | 4–7 | Eyebrows grow longer and slightly paranoid ("FACILITY NOTICE · THE FOURTEENTH ONE"). One choice per event turns unhinged. Portal copy develops small typos — the *building's* copy, not yours; the machine is fraying with you. |
| **The Documentation Zone** | 1–3 | HUD label becomes "DAY 3xx OF ELEVATED LIVING." Timestamps appear on everything. Unhinged choices sharpen: huge evidence, real backfire risk ("Reply All. To the building. At 3:07 AM."). A persistent thin red rule under the header. |

- Entering the Documentation Zone triggers a one-time interstitial (the
  partner texts: *"you ok? you cc'd me on an email to a robot"*) — the
  warning band that replaces v1's sanity cliff.
- Band thresholds are evaluated at month start, so the tone shifts on chapter
  boundaries, not mid-scene.

---

## 6. The plot spine — twelve months, three acts

> Addresses: "no pacing arc; the emotional high point lands at random; only
> 11 of 12 events used."

All 12 event slots are now used. Pinned beats are fixed; the rest draw from
the deck (which the chains partially script). Structure:

### Act I — Onboarding (months 1–3)
*The building is charming. The cracks are decorative.*

- **Month 1 (pinned): "Welcome Home."** Move-in day tutorial. Signs lease
  00000-X-4B-1, places the doormat (Chekhov's doormat — the robot arc needs
  it), meets the AI resident assistant, gets the first Parcel Pending email
  before getting the keys. Teaches the Peace/Case/Wildcard grammar at low
  stakes.
- Months 2–3: deck draws, gentle. The first elevator outage opens the
  unclosable ticket. First Water Cycle beat (the drip).
- **Act punctuation:** partner text interstitial after month 3 — warm,
  funny, establishes the relationship as the game's anchor.

### Act II — Accumulation (months 4–8)
*The tray fills. The chains compound. The toasts get weird.*

- Deck draws plus scheduled chain escalations: elevator false-hope beat
  (the +2 sanity triumph, then the relapse), mold bloom if the drip went
  unresolved, gym re-flooring #2.
- **Robot appearances #1 and #2** land in this act (befriend/document/comply
  each time).
- **Month 6 (conditional pin): "The Intervention."** If sanity ≤ 3, the
  partner interstitial becomes an intervention about the spreadsheet. A real
  dilemma: *promise to let it go* (+2 sanity, Case options locked next month)
  or *defend the file* (+1 evidence, the thread goes quiet for a while).
  The game's central question, made personal.
- **Month 8 (pinned): "The Other Spreadsheet."** The dog owner from the
  elevator — antagonist all year — catches you photographing the outage
  notice and, instead of complaining, shows you *their* renewal fight, and
  their numbers. Grants **Comparable Units, Annotated** (Legal ★★★★).
  The satire's rule made flesh: the enemy was never a neighbor.

### Act III — Renewal Season (months 9–11)
*The building wants an answer. The file is as big as it will ever be.*

- **Month 9 (pinned): the offer arrives as a toast** — between two locker
  surveys, visually identical to junk. The whole game's thesis in one
  interaction. Miss it and month 10 opens with "YOUR OFFER HAS EXPIRED,"
  starting the boss fight a rung worse.
- **Month 10 (pinned): "The Citation."** The noise complaint and the
  partner's statute-quoting victory — moved from random draw to the fixed
  emotional crest, right before the fight. Grants **The Citation**
  (Legal ★★★★★) only if you let the partner respond.
- **Month 11: the robot's third appearance** — secret ending window (§8).
- **Month 12: the boss fight** (§4).

---

## 7. Endings, replay, and spread

> Addresses: "no reason to play twice; endings evaporate when the tab closes."

### The endings board — seven, tracked

| # | Ending | How |
|---|---|---|
| 1 | **Broken** | Sanity hits 0 (now with the §5 warning ramp) |
| 2 | **Capitulated** | Sign the opening $2,930 |
| 3 | **Survivor** | Negotiated $2,850/$2,900 |
| 4 | **Negotiator** | $2,820 via the exhibit fight |
| 5 | **Escaped** | Walk away, any phase |
| 6 | **Month-to-Month** *(new)* | Let the 24-hour clock expire |
| 7 | **The Custodian** *(secret, new)* | Befriend the robot all three times → month 11, 3 AM, it leads you through the service corridor — past a storage room containing *all* the "Back at 1" signs — to the office, where it lets you read your own file. The building never quite bothers you again. Tender, not wacky. The most responsive entity in the org chart finally responds. |

- **Pyrrhic variant:** Negotiator with sanity ≤ 2 gets alternate ending copy —
  you win the negotiation and give notice anyway. The file cost what it cost.
  (Variant text, not an eighth slot.)
- **Title screen tracker:** "ENDINGS DOCUMENTED: 3/7" with empty file-folder
  slots for the missing ones. Now that the game lives on the site rather than
  in a Claude Artifact, `localStorage` is permitted and powers the tracker
  (guarded in try/catch; the game runs fine without it).

### The share card

End screen renders the run as a one-page lease-document parody:

```
FINAL STATEMENT OF ACCOUNT · UNIT 4B
Months survived 12/12 · Exhibits filed 9 · Sanity remaining 3/12
Rent negotiated: $2,930 → $2,820 (+$20 technology fee, non-negotiable)
INCIDENT LOG: [one line per month, the choice you made]
ENDING: THE NEGOTIATOR
```

- PNG download via `html2canvas` (already a repo dependency) plus a
  copy-to-clipboard plain-text version formatted for Threads.
- The incident log doubles as the run's memory — the game keeps a file on
  *you*, which is the correct final joke.

### Hard mode: "Month-to-Month Mode"

Title-screen toggle. +$300/month premium framed as freedom; you can walk away
after *any* month (walking becomes a live per-month decision, not an
endgame one); toast spawn rate doubles; ticket sanity drain uncapped. For
people whose buildings prepared them for this.

---

## 8. The Bulletin — random weirdness, documented

> Addresses: the texture gap — a bad building isn't only incidents, it's a
> constant low hum of inexplicable notices. All items below are anonymized
> from the owner's real archive; that's the qualification for entry. The rule
> for this pool: **no punchlines added.** The notices are funny because they
> are real; editorializing would break the deadpan.

### The mechanic

Between some months (roughly 60% of transitions, weighted toward Acts II–III),
a **COMMUNITY NOTICE** screen appears: one notice, styled as the building's
email blasts, with a single button. No choices, no stat changes, ~8 seconds.
It is a palate cleanser and a tone instrument, not a decision point.

- The acknowledge button rotates: "Noted." / "Understood." / "Thank you for
  keeping me informed." / "I have read this notice in its entirety."
- A run sees 6–7 notices from a pool of 18+, so no two runs read alike.
- One notice per run is a **setup** for a later event or exhibit (see the
  helpful-citizen event below) — the player can't tell which, which is the
  point: you read all of it because any of it might matter. Just like home.

### The notice pool (drafted, anonymized)

1. **Small white dog.** "If you see a small white dog roaming the hallways of
   the west building by itself, please bring it to the office." No further
   context. No follow-up notice, ever.
2. **Prowler alert.** A warning about car prowlers that includes a full
   license plate, a vehicle description, and the instruction to call 911 —
   sent to every resident, forever findable in every inbox.
3. **The retroactive closure.** "Please note the office will be closed
   Tuesday, March 16th." Sent the evening of the 16th. The 16th was a Monday.
4. **Tomorrow, last year.** "Annual elevator testing will begin tomorrow,
   4/15/2025." Sent April 14 of the following year.
5. **Seasonal inversion.** "We are aware the heat is currently on in the
   hallways of floors 5 and 6." It is May. "Our team is actively working to
   resolve this."
6. **Sustainability update.** The food compost bins are being removed "to
   improve cleanliness and odor control."
7. **The code.** "The access code for the dog run has been changed. Please
   contact the office for the new code." (Cross-reference: any office-closure
   notice.)
8. **The missive.** An elevator status update that opens "We hope this
   missive finds you well."
9. **Sister community.** An invitation to a food-truck event at "our sister
   community," tonight only, with `??` where an emoji used to be.
10. **Host your home.** The owner company invites you to earn extra income by
    listing your apartment on Airbnb — from the same address that sends the
    towing ultimatums.
11. **Gigabit.** "1GB Internet Speeds Now Live!" — delivered mid-elevator
    outage.
12. **The rebrand.** The company announces its own new name with genuine
    excitement. The dumpsters are re-stickered within the week. The elevator
    is not repaired within the quarter.
13. **Major event awareness.** With a global sporting event approaching, the
    building announces that amenity spaces and parking "may be made available
    for reservations, including potential use by non-residents." Residents
    are encouraged to reserve their own building early.
14. **Schrödinger's utility.** "Please be advised there is a possibility of a
    temporary water interruption. The interruption may occur."
15. **Duplicate confirmation.** "Your document has been received and your
    account has been successfully updated!" — sent twice, four seconds apart,
    with different reference numbers.
16. **The survey engine.** A request to rate your recent service visit,
    delivered on Christmas morning. Subject of the visit being rated:
    "Alert Hub Offline."
17. **Precision logistics.** "You have a delivery! Tracking: 1x package in
    office."
18. **Peak season.** Parcel Pending declares a "Peak Season period" with
    $3.00/day storage fees, then sends the same notification three times in
    27 minutes.
19. **Farewell.** A staff departure announced December 31; final days in
    office January 2nd and 3rd; residents invited to "stop by to say
    goodbye." The office is closed January 1st.

### Event upgrade from the archive: "The Helpful Citizen"

The towing event gets the real story, which is better than the invented one.
The POD and the pickup truck were never yours. Revised event: a notice
threatens to tow an abandoned POD and truck blocking the garbage trucks. The
Case choice is to write in *helpfully*, with observed dates and times, as a
good citizen of the community. The response arrives the next morning:

> "Thank you for your response. We will be getting both towed."

— in precisely the tone they would use if you had confessed. The reply is
flagged by the mail system as being from **an untrusted sender** ("you have
not previously corresponded with this sender") despite two years of
correspondence, beneath a signature block longer than the message itself,
which includes a link to the company's Glassdoor page. Evidence +2: the
exhibit is the signature block.

### Renewal flavor upgrade

Consultant #1 now occasionally attributes the offer to "the rates suggested
by our pricing software," and cannot discuss the software, which is a vendor,
which cannot be emailed. This mirrors the archive's actual renewal thread and
gives the boss fight its thesis line: you are negotiating with a spreadsheet
that outranks everyone you can talk to.

---

## 9. Build order

| Phase | Scope | Why first |
|---|---|---|
| **P1** | Choice economy rework (§1) + tickets tray (§2a) + narration bands (§5) | Turns the pamphlet into a game; mostly data and copy, one new HUD element |
| **P2** | Chains + visible dice (§2b–c) + plot spine pins (§6) + partner interstitials + the Bulletin (§8) | The structure pass; needs P1's economy to tune against. The Bulletin is cheap here: one screen type plus a copy pool |
| **P3** | Toast gameplay (§3) + boss fight (§4) + endings/share/tracker/hard mode (§7) | The signature-risk items last, tuned against real runs of P1+P2 |

### Standing guardrails for every phase

- Run the anonymization grep after any copy change. The pattern list lives in
  the owner's **private** handoff notes, deliberately not in this repo —
  publishing the list would defeat it. Ask the owner for it before any copy
  session.
- Tone: deadpan corporate, documentation-flavored, never mean to on-site
  humans. The month-8 neighbor beat is the tone rule as content.
- Rent figures: still the owner's real numbers; fuzzing decision remains open
  and blocks nothing above.
- Keep: the "Elevaor" typos, the 4–8 week lead time, the Christmas Eve
  24-hour offer, the doormat-eating robot, "live remarkably™".
- Accessibility floor holds for all new UI: `aria-live` toasts, reduced
  motion respected, the countdown's extension valve (§4, Phase 3), no
  color-only state signaling in the tickets tray.
