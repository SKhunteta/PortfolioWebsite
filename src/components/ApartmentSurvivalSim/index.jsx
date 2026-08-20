import React, { useState, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Unit 4B — Apartment Survival Simulator
//
// A satirical single-file survival game about life in a corporate-managed
// "luxury" apartment building, styled as an aggressively cheerful resident
// portal gone wrong. Every event is fictionalized from the kind of thing
// that definitely happens somewhere, to someone, repeatedly.
//
// Phases: title → play ⇄ result (11 months) → renewal → end
// Stats:  sanity (start 10, cap 12, ≤0 = "broken"), evidence (gates the
//         renewal outcome), cash (tracked, deliberately understated).
// ---------------------------------------------------------------------------

// Design tokens
const C = {
  paper: "#EDEFF1",
  ink: "#14202B",
  blue: "#1F4E6B",
  blueDark: "#143548",
  caution: "#F5C518",
  gold: "#D9A404",
  bad: "#B3402E",
  good: "#2E7D5B",
  muted: "#5A6B7A",
};

const DISPLAY = '"Archivo Black", "Arial Black", system-ui, sans-serif';
const BODY = '"Public Sans", "Helvetica Neue", Arial, sans-serif';
const MONO = '"IBM Plex Mono", "Courier New", monospace';

const SANITY_START = 10;
const SANITY_CAP = 12;
const MONTHS = 11;

// ---------------------------------------------------------------------------
// Events — 12 defined, 11 drawn per run from a shuffled deck.
// Each choice: { label, sanity, cash, evidence, result }
// ---------------------------------------------------------------------------
const EVENTS = [
  {
    id: "elevator",
    eyebrow: "FACILITY NOTICE · REF #E-014",
    title: "W Elevaor Down",
    body:
      "A sign appears in the lobby: “W Elevaor Down. Parts have been ordered. Estimated lead time: 4–8 weeks.” This is, by your records, outage number fourteen. You live near the top of the building. The sign does not apologize, and neither does the elevator.",
    choices: [
      {
        label: "Take the stairs. Again.",
        sanity: -1,
        evidence: 0,
        cash: 0,
        result:
          "You climb. Somewhere around the fifth floor you begin narrating your own life in the third person. Week six of the 4–8 week lead time is later declared “on schedule.”",
      },
      {
        label: "Email management a numbered list of all fourteen outages, with dates.",
        sanity: -1,
        evidence: 2,
        cash: 0,
        result:
          "You receive an automated reply thanking you for your valuable feedback. Your spreadsheet, however, now has four columns and a frozen header row. It is the most reliable thing in the building.",
      },
      {
        label: "Ask the AI resident assistant for a repair timeline.",
        sanity: -2,
        evidence: 1,
        cash: 0,
        result:
          "The AI resident assistant thanks you for reaching out and offers you a tour of the building you already live in. You screenshot the exchange. Exhibit accepted.",
      },
    ],
  },
  {
    id: "urine",
    eyebrow: "COMMUNITY STANDARDS",
    title: "The Golden Hour",
    body:
      "The east elevator smells the way it has smelled, on and off, for years: like a kennel at closing time. A neighbor's dog regards you without shame from the corner it has claimed. So does the owner.",
    choices: [
      {
        label: "Say nothing. Breathe through your mouth. Press your floor.",
        sanity: -1,
        evidence: 0,
        cash: 0,
        result:
          "You ride in silence. The dog exits at the lobby with the confidence of a shareholder. You have now held your breath in this elevator a cumulative total of, conservatively, one hour of your life.",
      },
      {
        label: "File a report with timestamped photos.",
        sanity: 0,
        evidence: 2,
        cash: 0,
        result:
          "You attach the photos. The word “documented” does most of the emotional labor. Management responds with a building-wide reminder that pets are a cherished part of our community.",
      },
      {
        label: "Raise it with the owner. Politely.",
        sanity: -2,
        evidence: 1,
        cash: 0,
        result:
          "The owner explains that the dog is “basically self-cleaning.” You do not have a follow-up question. You do have a new tab in the spreadsheet.",
      },
    ],
  },
  {
    id: "gym",
    eyebrow: "AMENITY UPDATE",
    title: "Aquatic Fitness Center",
    body:
      "The gym has flooded. The flooring — installed after the previous flood — is being removed and replaced with newer flooring, which will also flood. A notice describes this as an “exciting refresh of your wellness space.”",
    choices: [
      {
        label: "Work out around the standing water.",
        sanity: -1,
        evidence: 0,
        cash: 0,
        result:
          "You add “light wading” to your training program. The treadmill nearest the wall makes a sound you decide not to investigate.",
      },
      {
        label: "Photograph the flood for the archive.",
        sanity: 0,
        evidence: 2,
        cash: 0,
        result:
          "Wide shot, detail shot, one with your shoe for scale. Future historians of this building will lack for nothing. The refresh is later extended by an unspecified number of weeks.",
      },
      {
        label: "Ask when the wellness space will be well.",
        sanity: -1,
        evidence: 1,
        cash: 0,
        result:
          "You are told the team is “targeting soon.” You write down the date on which you were told this, which turns out to be the useful part.",
      },
    ],
  },
  {
    id: "assistant",
    eyebrow: "RESIDENT SERVICES",
    title: "Say “Representative”",
    body:
      "You need to reach the leasing office. The office phone number now routes to an AI resident assistant. The AI resident assistant does not have a phone number for the leasing office either. It is, however, delighted to help.",
    choices: [
      {
        label: "Type “human” seventeen times.",
        sanity: -1,
        evidence: 0,
        cash: 0,
        result:
          "The assistant senses frustration and offers a curated list of nearby brunch options. You were asking about a lease document. The brunch list is, in fairness, solid.",
      },
      {
        label: "Ask it a question so simple it loops.",
        sanity: -1,
        evidence: 2,
        cash: 0,
        result:
          "You ask how to contact the office. It recommends contacting the assistant. You screenshot the conversation in which the assistant refers you to the assistant. This one goes in the highlights folder.",
      },
      {
        label: "Walk down to the office in person.",
        sanity: -2,
        evidence: 0,
        cash: 0,
        result:
          "The office is dark. A sign says “Back in 15 minutes.” You wait forty. Nothing about the sign changes except your relationship to it.",
      },
    ],
  },
  {
    id: "towing",
    eyebrow: "PARKING & LOGISTICS",
    title: "Courtesy Notice",
    body:
      "Your moving container sits in the loading zone, with the written permission you obtained two weeks in advance. A notice taped to it announces it will be towed within 24 hours, “as a courtesy.” It is unclear to whom.",
    choices: [
      {
        label: "Forward the written approval. Subject line: “Re: your courtesy.”",
        sanity: -1,
        evidence: 2,
        cash: 0,
        result:
          "You attach the original email, the confirmation of the original email, and a photo of the notice. The tow is quietly cancelled. Nobody says the word “sorry,” but the container remains, which is the regional dialect for it.",
      },
      {
        label: "Unload everything tonight, just in case.",
        sanity: -2,
        evidence: 0,
        cash: -200,
        result:
          "You pay two movers a rush rate to empty the container by midnight. Your back files its own maintenance request. Response window: 4–8 weeks.",
      },
      {
        label: "Call the tow company directly.",
        sanity: -1,
        evidence: 1,
        cash: 0,
        result:
          "The tow company has never heard of your building, your container, or the concept of a courtesy. You log the call anyway. Time, date, name of the person who was baffled.",
      },
    ],
  },
  {
    id: "noshow",
    eyebrow: "MAINTENANCE · PRIORITY: EMERGENCY",
    title: "The Four-Hour Window",
    body:
      "Water is coming through the ceiling in a way ceilings are not meant to participate in. Your emergency request is confirmed with a response window of “within 4 hours.” Hour five arrives unaccompanied.",
    choices: [
      {
        label: "Wait politely with towels.",
        sanity: -2,
        evidence: 0,
        cash: 0,
        result:
          "You deploy the good towels, then the medium towels, then the towels of last resort. At hour seven the drip stops on its own, which the portal will later record as “resolved.”",
      },
      {
        label: "Re-file the request, noting the missed window to the minute.",
        sanity: -1,
        evidence: 2,
        cash: 0,
        result:
          "“Emergency window missed by 3 hours, 47 minutes” is the kind of sentence that writes itself into a renewal negotiation. Someone arrives the next day and describes the ceiling as “moody.”",
      },
      {
        label: "Engineer a bucket solution you now consider furniture.",
        sanity: -1,
        evidence: 1,
        cash: 0,
        result:
          "The bucket has a name now. You photograph the installation for the file, partly as documentation, partly out of pride.",
      },
    ],
  },
  {
    id: "insurance",
    eyebrow: "COMPLIANCE · ACTION REQUIRED",
    title: "Annual Insurance Fire Drill",
    body:
      "An email announces that your renters insurance is not on file and threatens a non-compliance fee. Your renters insurance is on file. You have the confirmation. You also have the confirmation of the confirmation, from the last time this happened.",
    choices: [
      {
        label: "Re-upload the policy. Third time this lease.",
        sanity: -1,
        evidence: 0,
        cash: 0,
        result:
          "The portal accepts the document with the serene confidence of a system that will lose it again by spring. You receive two confirmation emails, forty minutes apart, with different reference numbers.",
      },
      {
        label: "Reply attaching both prior confirmations, with dates.",
        sanity: 0,
        evidence: 2,
        cash: 0,
        result:
          "“Please see attached: your own records” is a genre you are getting good at. The thread goes quiet in the specific way threads go quiet when someone has checked and you were right.",
      },
      {
        label: "Ignore it. Surely the system knows.",
        sanity: -2,
        evidence: 0,
        cash: -25,
        result:
          "The system did not know. A $25 “administrative convenience fee” appears, is disputed, and is reversed three statements later without comment. Net cost: $25 of your finite time on earth.",
      },
    ],
  },
  {
    id: "alarm",
    eyebrow: "LIFE SAFETY SYSTEM",
    title: "3:07 AM",
    body:
      "The fire alarm goes off at 3:07 AM. There is no fire. There is never a fire. The alarm, which does not know this, commits fully. So does the strobe light, which has been waiting all year for this.",
    choices: [
      {
        label: "Evacuate fully, cat carrier and all.",
        sanity: -2,
        evidence: 1,
        cash: 0,
        result:
          "You stand in the street with two hundred neighbors in blankets. The cat files a formal objection from inside the carrier. At 3:41 AM the all-clear is issued for an emergency that never existed.",
      },
      {
        label: "Wait it out in the stairwell wearing a blanket as a cape.",
        sanity: -1,
        evidence: 0,
        cash: 0,
        result:
          "You make stairwell small-talk with a neighbor you've lived beside for two years and never met. The alarm stops mid-sentence, as if embarrassed.",
      },
      {
        label: "Sleep through it out of spite.",
        sanity: -1,
        evidence: 0,
        cash: 0,
        result:
          "You do not actually sleep. Nobody sleeps through the strobe. But you remain horizontal on principle, and principles are what you have left at 3:07 AM.",
      },
    ],
  },
  {
    id: "parcel",
    eyebrow: "PACKAGE MANAGEMENT",
    title: "Parcel Pending: 47 Unread",
    body:
      "Parcel Pending has emailed you 47 times this quarter. One of these emails concerns an actual package. Which one is a mystery the locker system guards jealously.",
    choices: [
      {
        label: "Open all 47 to find the real one.",
        sanity: -1,
        evidence: 0,
        cash: 0,
        result:
          "Email 31. It was email 31. The package is a phone case you no longer remember ordering, for a phone you no longer own.",
      },
      {
        label: "Build an inbox filter and log the monthly volume.",
        sanity: 0,
        evidence: 2,
        cash: 0,
        result:
          "The filter is named “LOCKER (DO NOT ENGAGE).” The volume chart goes into the file, because at this point the file has a communications section.",
      },
      {
        label: "Let the package achieve permanent residency in the locker.",
        sanity: 0,
        evidence: 0,
        cash: 0,
        result:
          "The locker begins sending reminders with escalating emotional stakes. By week two the package has, psychologically, a better lease than you do.",
      },
    ],
  },
  {
    id: "robot",
    eyebrow: "INNOVATION IN COMMUNITY LIVING",
    title: "Autonomous Hallway Hygiene Unit",
    body:
      "A memo introduces the building's new hallway cleaning robot. A second memo, hours later, announces that doormats are no longer permitted in the hallways, as the robot eats them.",
    choices: [
      {
        label: "Surrender the doormat.",
        sanity: -1,
        evidence: 0,
        cash: 0,
        result:
          "The doormat — a housewarming gift — is brought inside like a recalled ambassador. The hallway is now cleaner and meaner.",
      },
      {
        label: "Document the robot consuming a neighbor's doormat.",
        sanity: 0,
        evidence: 2,
        cash: 0,
        result:
          "The footage is grainy but unambiguous: the unit ingests a coir mat labeled “WELCOME” with the slow certainty of a tide. You file it under “policy origins, verified.”",
      },
      {
        label: "Befriend the robot.",
        sanity: 1,
        evidence: 0,
        cash: 0,
        result:
          "It bumps gently against your door and hums. You name it. It is, to date, the most responsive entity in the building's org chart.",
      },
    ],
  },
  {
    id: "office",
    eyebrow: "LEASING OFFICE",
    title: "Office Hours Roulette",
    body:
      "The leasing office hours are posted as 9–6. It is 2 PM on a Tuesday and the office is dark. A handwritten sign says “Back at 1.” The sign does not specify which day.",
    choices: [
      {
        label: "Wait. Someone must come back eventually.",
        sanity: -2,
        evidence: 0,
        cash: 0,
        result:
          "You wait long enough to watch two other residents arrive, read the sign, perform the same small sigh, and leave. It's like a museum piece about yourself.",
      },
      {
        label: "Photograph the sign with your phone clock visible.",
        sanity: 0,
        evidence: 2,
        cash: 0,
        result:
          "“Back at 1,” photographed at 2:14 PM, 3:37 PM, and 4:52 PM across three visits. As a triptych, it says more about modern property management than any review could.",
      },
      {
        label: "Ask the AI resident assistant where the humans went.",
        sanity: -1,
        evidence: 0,
        cash: 0,
        result:
          "The assistant assures you the office is open 9–6 and offers to schedule a tour. You are beginning to suspect the assistant has never been inside the building.",
      },
    ],
  },
  {
    id: "noise",
    eyebrow: "LEASE VIOLATION NOTICE",
    title: "The Citation",
    body:
      "A neighbor files a noise complaint against you for “walking.” Management forwards a warning citing a lease section it declines to quote. Your partner — two time zones away, unbothered, fully caffeinated — reads the actual lease and the actual state landlord-tenant law.",
    choices: [
      {
        label: "Apologize for walking.",
        sanity: -2,
        evidence: 0,
        cash: 0,
        result:
          "You spend a week moving through your own home like a jewel thief. The complaint stands. Your calves, at least, have never looked better.",
      },
      {
        label: "Let your partner respond: statute, lease clause, and a request for the complaint in writing.",
        sanity: 2,
        evidence: 2,
        cash: 0,
        result:
          "The reply cites the exact lease section, the relevant state statute, and requests the original complaint in writing per policy. Management never responds — which, in this building, is what victory sounds like. You consider framing the email.",
      },
      {
        label: "Buy slippers.",
        sanity: -1,
        evidence: 0,
        cash: 0,
        result:
          "The slippers are excellent. The precedent is terrible. Somewhere a lease-enforcement dashboard marks the matter “resolved through resident coaching.”",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Renewal — 2 scripted consultant rounds, then an evidence-gated final offer.
// ---------------------------------------------------------------------------
const RENT_BASE = 2720;
const RENT_OPENING = 2930;
const TECH_FEE = 20;

const RENEWAL_ROUNDS = [
  {
    eyebrow: "RENEWAL DESK · CENTRALIZED SERVICES CONSULTANT #1",
    title: "Your Exciting Renewal Opportunity",
    body:
      `Ninety days before your lease ends, an email arrives from no-reply@resident-alerts.example. Your renewal offer is $${RENT_OPENING.toLocaleString()}/month — up from $${RENT_BASE.toLocaleString()} — plus a new $${TECH_FEE} “technology fee” for the portal that loses your insurance documents. The consultant notes this offer “reflects current market conditions,” and that they are unable to discuss which market, or which conditions.`,
    fold: `Accept $${RENT_OPENING.toLocaleString()} + fees. Resistance is exhausting.`,
    press: "Counter in writing, citing your documentation.",
    pressResult:
      "You reply with a market comparison, your on-time payment history, and a politely devastating attachment titled “Service Interruptions, YTD.” Ten days pass. Your case is transferred.",
  },
  {
    eyebrow: "RENEWAL DESK · CENTRALIZED SERVICES CONSULTANT #2",
    title: "Your Case Has Been Transferred",
    body:
      "Consultant #2 introduces themselves by asking for information you already provided to Consultant #1, who no longer appears to exist. Meanwhile, the DocuSign for the original offer quietly expires. Nobody mentions this. The average response time to your last three emails is 72 hours.",
    fold: `Give up. Sign at $${RENT_OPENING.toLocaleString()} before it gets worse.`,
    press: "Hold firm. Re-attach the spreadsheet. All tabs.",
    pressResult:
      "You resend everything with a summary table on top, because you have learned that nobody scrolls. Then, at 4:52 PM on December 24, a new offer arrives. It is valid for 24 hours.",
  },
];

const finalOffer = (evidence) => {
  if (evidence >= 12) return { rent: 2820, ending: "negotiator" };
  if (evidence >= 7) return { rent: 2850, ending: "survivor" };
  return { rent: 2900, ending: "survivor" };
};

// ---------------------------------------------------------------------------
// Endings
// ---------------------------------------------------------------------------
const ENDINGS = {
  broken: {
    label: "LEASE STATUS: BROKEN",
    tone: C.bad,
    title: "You Moved Out Mid-Lease.",
    body:
      "Somewhere between the stairs, the strobe light, and the locker emails, the math stopped working. You paid the lease-break fee and it felt like a bargain. Two weeks later, the building sends a survey about your move-out experience. Then a second, identical survey, in case the first one was lost.",
  },
  capitulated: {
    label: "LEASE STATUS: RENEWED (UNCONDITIONALLY)",
    tone: C.gold,
    title: "You Signed the First Offer.",
    body: `$${RENT_OPENING.toLocaleString()}/month, plus the $${TECH_FEE} technology fee, plus the quiet knowledge that the spreadsheet died for nothing. The confirmation email arrives twice, with different reference numbers. Honestly? Peace has a price, and you know exactly what it is, because it's itemized.`,
  },
  survivor: {
    label: "LEASE STATUS: RENEWED (NEGOTIATED)",
    tone: C.blue,
    title: "You Made It. On Your Terms. Mostly.",
    body:
      "You held out through two consultants, one expired DocuSign, and a holiday-adjacent deadline, and the number came down. Not as far as the file deserved — but the file was seen, and in this building, being seen is the premium amenity.",
  },
  negotiator: {
    label: "LEASE STATUS: RENEWED (EXPERTLY)",
    tone: C.good,
    title: "The Spreadsheet Was Mightier.",
    body:
      "Fourteen elevator outages, timestamped. One robot, filmed. One 24-hour offer, answered inside the window with a counteroffer and receipts. They came down $110 from the opening number, which annualizes to real money, and — more importantly — they know you keep records now. The file rests. The file never sleeps.",
  },
  escaped: {
    label: "LEASE STATUS: NOT RENEWED",
    tone: C.good,
    title: "You Walked.",
    body:
      "You gave notice, in writing, with your customary attachment. The new place has one elevator, which works, and a landlord who answers email like it's a normal thing to do — because it is. Some nights you still hear a phantom locker notification. It fades.",
  },
};

// ---------------------------------------------------------------------------
// Parcel Pending toast engine
// ---------------------------------------------------------------------------
const PARCEL_LINES = [
  "Parcel Pending: You have a package! (You do not have a package.)",
  "Parcel Pending: Reminder — your package is still waiting. It misses you.",
  "Parcel Pending: Locker 114 has been reassigned for your convenience.",
  "Parcel Pending: A package for a former resident is now, spiritually, your problem.",
  "Parcel Pending: This is your final reminder. (It is not.)",
  "Parcel Pending: Your access code has changed for security reasons. So has the reason.",
  "Parcel Pending: Survey — how would you rate your locker experience today?",
  "Parcel Pending: We noticed you picked up your package. Tell us everything.",
  "Parcel Pending: One (1) new notification about notifications.",
  "Parcel Pending: Your package has been delivered to a locker in a building that may be yours.",
];

const TOAST_INTERVAL_MS = 7000;
const TOAST_LIFETIME_MS = 4200;
const TOAST_MAX = 3;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const clampSanity = (n) => Math.min(SANITY_CAP, n);

// ---------------------------------------------------------------------------
// Presentational bits
// ---------------------------------------------------------------------------
const CautionTape = () => (
  <div
    aria-hidden="true"
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: 14,
      zIndex: 40,
      background: `repeating-linear-gradient(45deg, ${C.caution} 0 16px, ${C.ink} 16px 32px)`,
    }}
  />
);

const Eyebrow = ({ children, color = C.muted }) => (
  <p
    style={{
      fontFamily: MONO,
      fontSize: 11,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color,
      margin: "0 0 10px",
    }}
  >
    {children}
  </p>
);

const BigButton = ({ children, onClick, variant = "primary", sub }) => {
  const primary = variant === "primary";
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        border: `3px solid ${C.ink}`,
        background: primary ? C.blue : "#FFFFFF",
        color: primary ? "#FFFFFF" : C.ink,
        fontFamily: BODY,
        fontSize: 15,
        fontWeight: 600,
        lineHeight: 1.4,
        padding: "14px 16px",
        marginBottom: 12,
        boxShadow: primary ? `6px 6px 0 ${C.ink}` : `4px 4px 0 ${C.ink}`,
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "translate(3px, 3px)";
        e.currentTarget.style.boxShadow = `2px 2px 0 ${C.ink}`;
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = primary
          ? `6px 6px 0 ${C.ink}`
          : `4px 4px 0 ${C.ink}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = primary
          ? `6px 6px 0 ${C.ink}`
          : `4px 4px 0 ${C.ink}`;
      }}
    >
      {children}
      {sub && (
        <span
          style={{
            display: "block",
            fontFamily: MONO,
            fontSize: 11,
            fontWeight: 400,
            opacity: 0.75,
            marginTop: 4,
          }}
        >
          {sub}
        </span>
      )}
    </button>
  );
};

const Card = ({ children }) => (
  <div
    style={{
      background: "#FFFFFF",
      border: `3px solid ${C.ink}`,
      boxShadow: `8px 8px 0 rgba(20,32,43,0.18)`,
      padding: "clamp(20px, 5vw, 32px)",
      marginBottom: 24,
    }}
  >
    {children}
  </div>
);

const SanityMeter = ({ sanity }) => (
  <div
    role="img"
    aria-label={`Sanity: ${Math.max(0, sanity)} of ${SANITY_CAP}`}
    style={{ display: "flex", gap: 3, alignItems: "center" }}
  >
    {Array.from({ length: SANITY_CAP }, (_, i) => (
      <span
        key={i}
        style={{
          width: 10,
          height: 14,
          border: `2px solid ${C.ink}`,
          background:
            i < sanity ? (sanity <= 3 ? C.bad : sanity <= 6 ? C.caution : C.good) : "transparent",
        }}
      />
    ))}
  </div>
);

const Hud = ({ month, sanity, evidence, phaseLabel }) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "10px 20px",
      alignItems: "center",
      justifyContent: "space-between",
      border: `3px solid ${C.ink}`,
      background: C.ink,
      color: C.paper,
      padding: "10px 14px",
      marginBottom: 24,
      fontFamily: MONO,
      fontSize: 12,
    }}
  >
    <span style={{ letterSpacing: "0.1em" }}>{phaseLabel ?? `LEASE MONTH ${String(month + 1).padStart(2, "0")}/${MONTHS}`}</span>
    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      SANITY <SanityMeter sanity={sanity} />
    </span>
    <span>
      EXHIBITS: <strong style={{ color: C.caution }}>{evidence}</strong>
    </span>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ApartmentSurvivalSim() {
  const [phase, setPhase] = useState("title"); // title | play | result | renewal | end
  const [deck, setDeck] = useState(() => shuffle(EVENTS));
  const [month, setMonth] = useState(0);
  const [sanity, setSanity] = useState(SANITY_START);
  const [cash, setCash] = useState(0);
  const [evidence, setEvidence] = useState(0);
  const [lastChoice, setLastChoice] = useState(null);
  const [renewalStep, setRenewalStep] = useState(0); // 0,1 = consultant rounds; 2 = final offer
  const [ending, setEnding] = useState(null);
  const [finalRent, setFinalRent] = useState(null);

  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);
  const parcelIdx = useRef(Math.floor(Math.random() * PARCEL_LINES.length));

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Unit 4B — Apartment Survival Simulator";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  // Parcel Pending toast spam — active during play/result/renewal only.
  const toastsActive = phase === "play" || phase === "result" || phase === "renewal";
  useEffect(() => {
    if (!toastsActive) {
      setToasts([]);
      return undefined;
    }
    const interval = setInterval(() => {
      parcelIdx.current = (parcelIdx.current + 1) % PARCEL_LINES.length;
      const id = ++toastId.current;
      setToasts((prev) =>
        [...prev, { id, text: PARCEL_LINES[parcelIdx.current] }].slice(-TOAST_MAX)
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_LIFETIME_MS);
    }, TOAST_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [toastsActive]);

  const startRun = () => {
    setDeck(shuffle(EVENTS));
    setMonth(0);
    setSanity(SANITY_START);
    setCash(0);
    setEvidence(0);
    setLastChoice(null);
    setRenewalStep(0);
    setEnding(null);
    setFinalRent(null);
    setPhase("play");
  };

  const currentEvent = deck[month % deck.length];

  const pick = (choice) => {
    const nextSanity = clampSanity(sanity + choice.sanity);
    setSanity(nextSanity);
    setCash(cash + (choice.cash || 0));
    setEvidence(evidence + (choice.evidence || 0));
    setLastChoice(choice);
    if (nextSanity <= 0) {
      setEnding("broken");
      setPhase("end");
    } else {
      setPhase("result");
    }
  };

  const nextMonth = () => {
    if (month + 1 >= MONTHS) {
      setPhase("renewal");
    } else {
      setMonth(month + 1);
      setPhase("play");
    }
  };

  const fold = () => {
    setFinalRent(RENT_OPENING);
    setEnding("capitulated");
    setPhase("end");
  };

  const walk = () => {
    setEnding("escaped");
    setPhase("end");
  };

  const press = () => setRenewalStep(renewalStep + 1);

  const signFinal = () => {
    const offer = finalOffer(evidence);
    setFinalRent(offer.rent);
    setEnding(offer.ending);
    setPhase("end");
  };

  const offer = finalOffer(evidence);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.paper,
        color: C.ink,
        fontFamily: BODY,
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Public+Sans:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;600&display=swap');

        @keyframes asimSlideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .asim-toast {
          animation: asimSlideIn 300ms ease-out;
        }
        .asim-toasts {
          position: fixed;
          right: 16px;
          bottom: 16px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: min(320px, calc(100vw - 32px));
        }
        /* On small screens, stack toasts at the top so they never cover CTAs. */
        @media (max-width: 480px) {
          .asim-toasts {
            bottom: auto;
            top: 22px;
            right: 8px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .asim-toast { animation: none; }
        }
        .asim-hazard-bg {
          background-image: repeating-linear-gradient(
            45deg,
            rgba(20, 32, 43, 0.025) 0 24px,
            transparent 24px 48px
          );
        }
      `}</style>

      <CautionTape />

      {/* Parcel Pending toasts */}
      <div className="asim-toasts" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="asim-toast"
            style={{
              background: "#FFFFFF",
              border: `2px solid ${C.ink}`,
              borderLeft: `8px solid ${C.gold}`,
              boxShadow: `4px 4px 0 rgba(20,32,43,0.25)`,
              padding: "10px 12px",
              fontFamily: MONO,
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            {t.text}
          </div>
        ))}
      </div>

      <main
        className="asim-hazard-bg"
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "48px clamp(16px, 4vw, 24px) 64px",
        }}
      >
        {/* ------------------------------------------------- TITLE ------- */}
        {phase === "title" && (
          <div>
            <div
              style={{
                display: "inline-block",
                transform: "rotate(-3deg)",
                background: C.caution,
                border: `3px solid ${C.ink}`,
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                padding: "6px 10px",
                marginBottom: 24,
              }}
            >
              {/* Intentional typo. It's canon. */}
              NOW LEASING · ELEVAOR ACCESS SOLD SEPARATELY
            </div>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontSize: "clamp(34px, 9vw, 56px)",
                lineHeight: 1.02,
                margin: "0 0 8px",
                textTransform: "uppercase",
              }}
            >
              Apartment
              <br />
              Survival
              <br />
              Simulator
            </h1>
            <p
              style={{
                fontFamily: MONO,
                fontSize: 13,
                color: C.blue,
                letterSpacing: "0.08em",
                margin: "0 0 24px",
              }}
            >
              UNIT 4B · LEASE 00000-X-4B-1 · A RESIDENT EXPERIENCE
            </p>
            <Card>
              <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.65 }}>
                Welcome home to elevated living, managed with care by whatever
                the company is named this quarter. You will face eleven months
                of documented incidents, one renewal negotiation, and
                approximately fifty Parcel Pending notifications.
              </p>
              <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.65 }}>
                Guard your <strong>sanity</strong>. Collect{" "}
                <strong>exhibits</strong> — timestamps, screenshots,
                spreadsheets. When the renewal desk calls, the file is all that
                stands between you and “current market conditions.”
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: MONO,
                  fontSize: 12,
                  color: C.muted,
                }}
              >
                Base rent: ${RENT_BASE.toLocaleString()}/mo. Amenities: subject
                to availability. Availability: subject to amenities.
              </p>
            </Card>
            <BigButton onClick={startRun} sub="(negotiated offers are good for 24 hours)">
              SIGN THE LEASE →
            </BigButton>
          </div>
        )}

        {/* ------------------------------------------------- PLAY -------- */}
        {phase === "play" && currentEvent && (
          <div>
            <Hud month={month} sanity={sanity} evidence={evidence} />
            <Card>
              <Eyebrow color={C.blue}>{currentEvent.eyebrow}</Eyebrow>
              <h2
                style={{
                  fontFamily: DISPLAY,
                  fontSize: "clamp(22px, 6vw, 32px)",
                  lineHeight: 1.1,
                  margin: "0 0 14px",
                }}
              >
                {currentEvent.title}
              </h2>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65 }}>
                {currentEvent.body}
              </p>
            </Card>
            <div>
              {currentEvent.choices.map((choice, i) => (
                <BigButton
                  key={i}
                  variant={i === 0 ? "primary" : "secondary"}
                  onClick={() => pick(choice)}
                >
                  {choice.label}
                </BigButton>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------- RESULT ------ */}
        {phase === "result" && lastChoice && (
          <div>
            <Hud month={month} sanity={sanity} evidence={evidence} />
            <Card>
              <Eyebrow color={C.gold}>INCIDENT OUTCOME · FILED</Eyebrow>
              <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.65 }}>
                {lastChoice.result}
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: MONO,
                  fontSize: 12,
                  color: C.muted,
                }}
              >
                {lastChoice.sanity !== 0 && (
                  <span style={{ color: lastChoice.sanity > 0 ? C.good : C.bad }}>
                    SANITY {lastChoice.sanity > 0 ? "+" : ""}
                    {lastChoice.sanity}
                  </span>
                )}
                {lastChoice.sanity !== 0 && (lastChoice.evidence || 0) !== 0 && " · "}
                {(lastChoice.evidence || 0) !== 0 && (
                  <span style={{ color: C.blue }}>
                    EXHIBITS +{lastChoice.evidence}
                  </span>
                )}
                {lastChoice.sanity === 0 && (lastChoice.evidence || 0) === 0 &&
                  "NO MEASURABLE CHANGE. THE BUILDING PERSISTS."}
              </p>
            </Card>
            <BigButton onClick={nextMonth}>
              {month + 1 >= MONTHS ? "PROCEED TO RENEWAL SEASON →" : "NEXT MONTH →"}
            </BigButton>
          </div>
        )}

        {/* ------------------------------------------------- RENEWAL ----- */}
        {phase === "renewal" && renewalStep < RENEWAL_ROUNDS.length && (
          <div>
            <Hud
              month={month}
              sanity={sanity}
              evidence={evidence}
              phaseLabel="RENEWAL SEASON"
            />
            <Card>
              <Eyebrow color={C.bad}>{RENEWAL_ROUNDS[renewalStep].eyebrow}</Eyebrow>
              <h2
                style={{
                  fontFamily: DISPLAY,
                  fontSize: "clamp(22px, 6vw, 32px)",
                  lineHeight: 1.1,
                  margin: "0 0 14px",
                }}
              >
                {RENEWAL_ROUNDS[renewalStep].title}
              </h2>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65 }}>
                {renewalStep > 0 && (
                  <span style={{ display: "block", marginBottom: 12, color: C.muted }}>
                    {RENEWAL_ROUNDS[renewalStep - 1].pressResult}
                  </span>
                )}
                {RENEWAL_ROUNDS[renewalStep].body}
              </p>
            </Card>
            <BigButton onClick={press}>
              {RENEWAL_ROUNDS[renewalStep].press}
            </BigButton>
            <BigButton variant="secondary" onClick={fold}>
              {RENEWAL_ROUNDS[renewalStep].fold}
            </BigButton>
            <BigButton variant="secondary" onClick={walk} sub="Give notice. Leave it all behind.">
              Walk away.
            </BigButton>
          </div>
        )}

        {phase === "renewal" && renewalStep >= RENEWAL_ROUNDS.length && (
          <div>
            <Hud
              month={month}
              sanity={sanity}
              evidence={evidence}
              phaseLabel="RENEWAL SEASON · FINAL OFFER"
            />
            <Card>
              <Eyebrow color={C.bad}>
                RENEWAL DESK · DEC 24 · 4:52 PM · VALID 24 HOURS
              </Eyebrow>
              <h2
                style={{
                  fontFamily: DISPLAY,
                  fontSize: "clamp(22px, 6vw, 32px)",
                  lineHeight: 1.1,
                  margin: "0 0 14px",
                }}
              >
                The Final Offer
              </h2>
              <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.65 }}>
                <span style={{ display: "block", marginBottom: 12, color: C.muted }}>
                  {RENEWAL_ROUNDS[RENEWAL_ROUNDS.length - 1].pressResult}
                </span>
                The new number is{" "}
                <strong>${offer.rent.toLocaleString()}/month</strong>, plus the
                ${TECH_FEE} technology fee, which survives all negotiations the
                way roaches survive everything. The offer is valid for 24
                hours. The average response time to your own messages remains
                72.
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: MONO,
                  fontSize: 12,
                  color: C.muted,
                }}
              >
                YOUR FILE: {evidence} EXHIBITS.{" "}
                {evidence >= 12
                  ? "THE RENEWAL DESK HAS READ THE ATTACHMENT. ALL OF IT."
                  : evidence >= 7
                  ? "THE RENEWAL DESK HAS SKIMMED THE ATTACHMENT."
                  : "THE RENEWAL DESK IS NOT AWARE YOU KEEP RECORDS."}
              </p>
            </Card>
            <BigButton onClick={signFinal} sub="Lock it in before the window closes.">
              Sign at ${offer.rent.toLocaleString()}/month →
            </BigButton>
            <BigButton variant="secondary" onClick={walk} sub="Give notice. Leave it all behind.">
              Walk away.
            </BigButton>
          </div>
        )}

        {/* ------------------------------------------------- END --------- */}
        {phase === "end" && ending && (
          <div>
            <div
              style={{
                display: "inline-block",
                transform: "rotate(-2deg)",
                background: ENDINGS[ending].tone,
                color: ending === "capitulated" ? C.ink : "#FFFFFF",
                border: `3px solid ${C.ink}`,
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                padding: "6px 10px",
                marginBottom: 24,
              }}
            >
              {ENDINGS[ending].label}
            </div>
            <h2
              style={{
                fontFamily: DISPLAY,
                fontSize: "clamp(28px, 7vw, 42px)",
                lineHeight: 1.05,
                margin: "0 0 20px",
              }}
            >
              {ENDINGS[ending].title}
            </h2>
            <Card>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65 }}>
                {ENDINGS[ending].body}
              </p>
            </Card>
            <Card>
              <Eyebrow>FINAL STATEMENT OF ACCOUNT</Eyebrow>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 13,
                  lineHeight: 2,
                }}
              >
                <div>
                  MONTHS SURVIVED:{" "}
                  <strong>
                    {ending === "broken" ? month + 1 : MONTHS}/{MONTHS}
                  </strong>
                </div>
                <div>
                  SANITY REMAINING: <strong>{Math.max(0, sanity)}/{SANITY_CAP}</strong>
                </div>
                <div>
                  EXHIBITS FILED: <strong>{evidence}</strong>
                </div>
                {finalRent && (
                  <div>
                    NEW RENT:{" "}
                    <strong>
                      ${finalRent.toLocaleString()}/MO + ${TECH_FEE} TECHNOLOGY FEE
                    </strong>
                  </div>
                )}
                {cash !== 0 && (
                  <div>
                    INCIDENTAL EXPENSES: <strong>${Math.abs(cash)}</strong>
                  </div>
                )}
              </div>
            </Card>
            <BigButton onClick={startRun}>RENEW THE EXPERIENCE →</BigButton>
            <p
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: C.muted,
                textAlign: "center",
                marginTop: 24,
              }}
            >
              <a
                href="/playground"
                style={{ color: C.muted, textDecoration: "underline" }}
              >
                ← back to the playground
              </a>
            </p>
          </div>
        )}

        <footer
          style={{
            marginTop: 48,
            paddingTop: 16,
            borderTop: `2px solid rgba(20,32,43,0.15)`,
            fontFamily: MONO,
            fontSize: 11,
            color: C.muted,
            textAlign: "center",
          }}
        >
          live remarkably™ · a work of satire · any resemblance to your
          building is statistically inevitable
        </footer>
      </main>
    </div>
  );
}
