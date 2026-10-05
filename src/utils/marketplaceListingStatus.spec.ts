import assert from "node:assert/strict";
import test from "node:test";
import {
    classifyMarketplaceStatus,
    formatMarketplaceDateRange,
    marketplaceDurationDays,
    marketplaceTimingLabel,
} from "./marketplaceListingStatus";

const now = new Date("2026-10-05T12:00:00");

test("expired wins for admin expiry and past end dates", () => {
    assert.equal(classifyMarketplaceStatus({ adminExpired: true, start_date: "2026-10-01", end_date: "2026-10-31" }, now), "expired");
    assert.equal(
        classifyMarketplaceStatus({ applyBlockedReason: "opportunity_expired", end_date: "2026-10-31" }, now),
        "expired",
    );
    assert.equal(classifyMarketplaceStatus({ start_date: "2026-09-01", end_date: "2026-10-01" }, now), "expired");
});

test("upcoming when start date is still in the future", () => {
    assert.equal(classifyMarketplaceStatus({ start_date: "2026-10-11", end_date: "2026-10-31" }, now), "upcoming");
    assert.equal(marketplaceTimingLabel({ start_date: "2026-10-11", end_date: "2026-10-31" }, now), "Starts in 6 Days");
});

test("closing soon when 0–5 days remain after start", () => {
    assert.equal(classifyMarketplaceStatus({ start_date: "2026-09-20", end_date: "2026-10-08" }, now), "closing");
    assert.equal(classifyMarketplaceStatus({ start_date: "2026-09-20", end_date: "2026-10-05" }, now), "closing");
    assert.equal(marketplaceTimingLabel({ start_date: "2026-09-20", end_date: "2026-10-08" }, now), "3 Days Left");
});

test("live when already started and more than 5 days remain", () => {
    assert.equal(classifyMarketplaceStatus({ start_date: "2026-09-20", end_date: "2026-10-31" }, now), "live");
    assert.equal(classifyMarketplaceStatus({ start_date: null, end_date: null }, now), "live");
});

test("formats date range and duration from ISO days", () => {
    assert.equal(formatMarketplaceDateRange("2026-09-20", "2026-10-31"), "20 Sep 2026 – 31 Oct 2026");
    assert.equal(marketplaceDurationDays("2026-10-01", "2026-10-03"), 3);
    assert.equal(formatMarketplaceDateRange(null, null), null);
});
