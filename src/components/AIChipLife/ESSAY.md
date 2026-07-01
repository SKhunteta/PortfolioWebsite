# The Most Concentrated Supply Chain in Industrial History Runs Through My Backyard

*A companion essay to the interactive piece [The Life of an AI Chip](https://builtbyshrey.com/ai-chip). Prose version for cross-posting (LinkedIn, Substack); the interactive carries the full sources and confidence ratings.*

---

I live in Washington State, downstream of the Columbia River dams. The same hydropower that waters the apple orchards near Quincy also feeds a cluster of windowless buildings where racks of AI accelerators draw roughly 120 kilowatts each, about the continuous load of a hundred homes per rack. I wanted to understand how a chip gets to one of those buildings. So I traced one, and then I built an interactive essay about what I found, because the structure of the answer turned out to be stranger than any of the individual facts.

Here is the structure: it is a supply chain where, at four separate links, there is exactly one supplier on Earth.

**Link one: the machine.** To print a leading-edge chip you need extreme ultraviolet lithography, a machine that focuses 13.5-nanometer light by bouncing it off mirrors in a vacuum, after vaporizing tin droplets with a laser fifty thousand times a second. One company sells it: ASML, in Veldhoven, the Netherlands. Nikon built the previous generation of lithography and never shipped a production EUV scanner. Canon went a different direction entirely. In all of 2025, ASML shipped about 48 EUV systems, out of 327 lithography systems total, at roughly $235 million for a Low-NA machine and around $380 million for the new High-NA generation. The entire leading edge of computing passes through one company's order book, four dozen machines a year at a time.

**Link two: the optics inside the machine.** ASML does not make its own mirrors. They come from a single supplier, Carl Zeiss SMT in Oberkochen, Germany, polished to a smoothness where, scaled to the size of a country, the largest bump would stand under a millimeter. The analyst Dylan Patel of SemiAnalysis estimates that Zeiss employs fewer than a thousand people who do this work, and Zeiss is the only company that does it. The monopoly has a monopoly inside it.

**Link three: the fab.** You will read that TSMC makes "90% of the world's advanced chips." I deliberately do not use that figure; it is contested, and the rebuttals (Intel and Samsung also run advanced nodes; the number depends entirely on where you draw the "advanced" line) are fair. The defensible claim is narrower and, I think, more alarming: every current merchant flagship AI accelerator — NVIDIA's Blackwell class, AMD's Instinct line, and most of the hyperscalers' custom silicon — is fabricated by one company, TSMC, much of it within a few miles of itself in Hsinchu, Taiwan, on an island in a strait that other countries' navies practice crossing. TSMC's own quarterly numbers show how far this has gone: by early 2026, technologies at 7 nanometers and below made up 74% of its wafer revenue.

**Link four: the glue.** For two years, 2023 and 2024, the binding constraint on AI compute was not transistors and not memory. It was CoWoS, TSMC's advanced packaging process that bonds the logic die and its memory stacks onto a silicon interposer. TSMC told investors its CoWoS capacity would roughly double in 2024 and double again in 2025, from around 35–40 thousand wafers a month to about 75 thousand, and that demand would still outrun it. The bottleneck was the glue, not the genius.

Between the third and fourth links there is one stretch where the road widens: high-bandwidth memory, where three suppliers compete (SK hynix, Samsung, Micron). After four sole-source links, an oligopoly of three feels like abundance. It is not abundance. It is the widest the road ever gets. South Korea alone accounted for 45% of ASML's system sales in a recent quarter, which tells you the links are not independent: the memory oligopoly queues for the same scanner monopoly as everyone else.

In the interactive version, you "build" this chip by making choices, and the mechanic is the argument: at every chokepoint, only one button is live. Nikon and Canon are rendered as tombstones. Samsung Foundry and SMIC are grayed out with one-line epitaphs. You select ASML because there is no one else to select. By the sixth scene the piece admits what you have noticed: the single button was never a flaw in the game. It was the supply chain.

A chain with one supplier at four of its links does not have a weakest point. It has four of them. An export ruling in The Hague stops every scanner at the loading dock; a blockade of one strait idles the only fab that says yes; a fire in one packaging line resurrects the bottleneck of 2023 overnight. None of these requires imagination. Each has a near miss already on record. And the chain's terminus is a field in eastern Washington, where the chip finally meets the oldest infrastructure in the story, dams poured in the 1930s and 40s, and starts drawing its hundred homes' worth of power.

A note on method, because the AI discourse is drowning in unsourced numbers: every figure in the interactive traces to a fact entry with a source, a confidence rating (verified, order of magnitude, analyst estimate, or needs verification), the date it was last confirmed, and a re-verification cadence. The rendering code accepts a sourced fact object only, never a raw number, so an unsourced figure structurally cannot appear on the page. Where a popular figure is contested, like the 90% claim, the piece says so instead of repeating it. The source code is public.

Trace the thread yourself, and see how far off your guesses land: **[builtbyshrey.com/ai-chip](https://builtbyshrey.com/ai-chip)**.

— Shreyans Khunteta
