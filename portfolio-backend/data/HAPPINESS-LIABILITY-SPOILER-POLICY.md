# The Happiness Liability — Spoiler Policy (maintainer doc)

This file is for maintainers only. It is never loaded by code, never indexed
into Qdrant, and must never be embedded into any prompt or served response.
It exists so that anyone editing `happiness-liability-canon.json` — or any
system prompt in `routes/` — knows exactly where the line is.

## The invariant

**No spoiler ever appears in indexed data, prompt text, or model output.**

The repository is public, so nothing committed here is secret. But the base
models powering the MCP tools and the site experiments have no knowledge of
this unpublished novel — the only way they can leak plot is if we hand it to
them. Spoiler enforcement is therefore data hygiene: keep post-opening plot
out of the canon file, out of `portfolio.json`, out of every system prompt,
and out of everything under `public/`, and the tools cannot reveal what they
were never told.

## What is allowed in canon / prompts / public data

- **Everything on the public "You Are Here" timeline** (`you-are-here/index.html`
  PANELS array). It is the published world bible: the 2026→2047 history,
  the Great Copyright Purge, the EMOTE Act, Meridian's founding, PROVIDER
  2032-NW-0017, the contract through 2055, $6,500/unit, 4,112 good mornings,
  the empathy grid, the US/China authentic-vs-synthetic fork, the crows,
  the 2027 Mariners season and the father's photograph.
- **World logic from anywhere in the manuscript**, provided it describes how
  the world works rather than what happens in the story (laws, markets,
  institutions, technology, economics, history).
- **Chapter 1 setup**: Eli's circumstances, Harold, Miranda's public persona
  and history, JANET, and the birthday decision to go outside (the timeline
  itself ends on "one baseload plant is about to deviate").
- **The JANET demo framing** ("previous user's contract was terminated") —
  already public — as long as it is never connected to plot events.

## Hard exclusions — never in canon, prompts, or public data

Do not name, describe, allude to, or leave inferable:

- Zara (any detail: name, occupation, background, the meeting, the relationship)
- The bird sanctuary
- David Chang
- The quitting decision and everything that follows from it
- The brownout as a plot event (the world-rule that deviations cascade is fine)
- Act titles and chapter titles beyond Chapter 1 (the table of contents is
  unpublished; canon says only "four acts plus an epilogue")
- The epilogue and the ending
- Any plot event from Chapters 2 onward, even those inside Act One

When in doubt, omit. A thinner world bible is always acceptable; a leaked
plot point is not.

## Boundary notes

- "World + Act One" was the agreed scope, but the hard-exclusion list above
  is stricter and wins: Zara appears in Act One (Chapter 2 onward) and is
  still excluded. In practice the canon draws story *events* only from
  Chapter 1; Chapters 2–5 contributed world *mechanics* (the consent bloc,
  the EU/Nordic implementations, Hartley Industries, classroom AIs,
  gig-seller texture, Mercer Island as seen from outside).
- Classroom emotion-recognition AI is described generically in canon.
  The named instance in the manuscript belongs to an excluded character's
  storyline; the generic technology is world logic.
- No verbatim manuscript prose in the canon file or prompts. Short phrases
  already published on the timeline ("the Saudi Arabia of feeling") are fine.

## Checking

Run the guard before deploying canon or prompt changes:

```
node portfolio-backend/scripts/check-canon-spoilers.js
```

It greps the canon file, `data/portfolio.json`, all `routes/*.js`, and
`public/` for the excluded terms and exits nonzero on any hit.
