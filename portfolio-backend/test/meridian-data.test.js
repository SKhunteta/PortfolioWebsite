/** Meridian mock-data engine — determinism & pricing invariants. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VERTICALS,
  KWH_RATE,
  seeded,
  priceFor,
  change24h,
  marketCycle,
  notice,
} from "../services/meridian/data.js";

test("seeded() is deterministic and in [0,1)", () => {
  assert.equal(seeded(42), seeded(42));
  for (const n of [0, 1, 100, 12345, 987654]) {
    const s = seeded(n);
    assert.ok(s >= 0 && s < 1, `seeded(${n})=${s} out of range`);
  }
});

test("priceFor() agrees on immediate consecutive calls (same-instant determinism)", () => {
  for (const v of Object.keys(VERTICALS)) {
    assert.equal(priceFor(v, 3), priceFor(v, 3));
  }
});

test("depression anchored near $6,500 (within +/-15%)", () => {
  const p = priceFor("depression");
  assert.ok(p > 6500 * 0.85 && p < 6500 * 1.15, `depression=${p}`);
});

test("day-over-day variation exists", () => {
  const today = priceFor("depression", 0);
  const yesterday = priceFor("depression", 1);
  assert.notEqual(today, yesterday);
});

test("hope trends upward over a 90-day span", () => {
  const early = priceFor("hope", 90);
  const late = priceFor("hope", 0);
  // Trend term dominates the bounded daily/drift noise across 90 days.
  assert.ok(late > early, `hope late=${late} should exceed early=${early}`);
});

test("kWh conversion is usd / 41.7", () => {
  assert.equal(KWH_RATE, 41.7);
  const usd = priceFor("grief");
  assert.equal(+(usd / KWH_RATE).toFixed(3), +(usd / 41.7).toFixed(3));
});

test("MDI ~= 100 within the volatility band", () => {
  const mdi = +(100 * (priceFor("depression") / VERTICALS.depression.base)).toFixed(2);
  assert.ok(mdi > 90 && mdi < 110, `MDI=${mdi}`);
});

test("change24h() returns a finite percentage", () => {
  const c = change24h("anger");
  assert.ok(Number.isFinite(c));
});

test("marketCycle() and notice() are well-formed", () => {
  assert.match(marketCycle(), /^2047-MC-\d{4}$/);
  assert.equal(typeof notice(), "string");
  assert.ok(notice().length > 0);
});
