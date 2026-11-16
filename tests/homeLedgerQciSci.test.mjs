import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../src/components/${p}`, import.meta.url), "utf8");

test("home ledger tiles say their numbers aggregate structured reports + quick community work (QCI + SCI)", () => {
    const hero = read("Hero.tsx");
    assert.match(hero, /students on verified reports \+ quick community work/);
    assert.match(hero, /sub: "verified reports \+ quick community work"/);
    assert.match(hero, /summed from reports \+ quick community work/);
    assert.doesNotMatch(hero, /students on submitted reports|logged on verified reports|beneficiaries summed from reports/);
});

test("impact calculator reads its ratios from the same QCI + SCI ledger fields", () => {
    const calc = read("ImpactCalculator.tsx");
    assert.match(calc, /structured reports \+ Quick Community Impact/);
    for (const field of ["report_verified_hours", "people_reached", "people_serving", "verified_records", "dividend_hourly_rate_pkr"]) {
        assert.match(calc, new RegExp(`stats\\?\\.${field}`));
    }
});

test("where-impact-lives counts verified records (reports + quick work), not just reports", () => {
    const where = read("WhereImpactLives.tsx");
    assert.match(where, /stats\?\.verified_records/);
    assert.match(where, />verified records</);
});
