# "You Are Here" — Tezcon 2026 Event Runbook

**Event:** Tezcon 2026, Hiawatha Artist Lofts — Saturday, July 11, 2026. Doors ~2pm, event 4:04pm.
**Artifact:** `you-are-here/index.html` — one file, fully offline, no network ever needed.

## Before you leave home (do all of this by July 10)

- [ ] Copy `index.html` to the iPad via AirDrop or the Files app.
- [ ] Also copy it to the **laptop** and a **USB stick** (fallback if the iPad dies).
- [ ] Open it once from the Files app **in airplane mode** and swipe all 15 panels.
- [ ] Scan the end-card QR with two phones (iOS camera + an Android if you can find one).
- [ ] In Safari: open the file → Share → **Add to Home Screen** ("You Are Here").

## iPad settings (set once, the morning of)

| Setting | Value |
|---|---|
| Settings → Display → Auto-Lock | **Never** |
| Brightness | ~80% (it's a dim room; full is glare) |
| Focus | Do Not Disturb on |
| Orientation | **Landscape, rotation locked** (Control Center) |
| Settings → Accessibility → Guided Access | **On**, set a passcode you'll remember |
| Wi-Fi / Bluetooth | Off (nothing needs them; kills notifications dead) |

## Launch sequence at the venue

1. Plug in at check-in (~2pm): basic power is provided — **bring a 10ft Lightning/USB-C cable + wall brick**. Leave it on the charger all event.
2. Launch from the **Home Screen icon** ("You Are Here"), *not* a Safari tab — the icon launch is truly full-screen with no browser chrome.
3. Triple-click the top/side button → **Guided Access → Start.** Options: **touch ON, hardware buttons OFF.**
4. Confirm: swipe works, 45-second idle returns it to the title panel on its own.

If anything ever looks wrong: triple-click → end Guided Access → relaunch from the icon → Guided Access back on. Cold relaunch lands on the title panel in under a second; the file holds no state.

## The 30-second pitch (when someone asks "what is this?")

> "It's the timeline of a novel called *The Happiness Liability*. The book is set in 2047, where authenticated human emotion is the scarcest commodity on earth — and its history starts *this year*, in 2026. This is how we get from tonight to there in twenty-one years: a pandemic nobody believes is real because video stopped being evidence, a court ruling that breaks the AI systems everyone depends on, and a law that makes selling your grief legal work. It ends where Chapter 1 begins. Swipe."

## During the event

- Photograph people interacting with it (**ask first**) — launch promo material.
- Don't hover. It's built for strangers: it resets itself, it can't be broken by tapping, and Guided Access keeps them inside it.

## Confirm-before-event items (currently provisional — 60-second fixes)

- **QR target** is `https://www.builtbyshrey.com/playground` (the Happiness Liability series page). To change: `node make-qr.mjs <new-url>` (needs the `qrcode` npm package resolvable), and update the `builtbyshrey.com` caption in `index.html` if the domain wording should change.
- **End-card status line** reads "Explore the world of the book at builtbyshrey.com." — edit the last `footnote` in the `PANELS` array to change.
- The "**Meridian is appraising at this event**" careers line is currently **omitted**. If the Meridian intake piece ends up at the booth, add to the P14 panel a `kicker: "Feeling qualified? Meridian is appraising at this event."`
