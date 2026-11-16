// SDGs: the browse filter offers all 17 goals and matches primary OR supporting SDGs; every
// flashcard shows every SDG chosen at create (and, on report cards, the report's own mapping).
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("filter helpers: all 17 goals, and a supporting SDG matches", () => {
    const src = read("src/utils/opportunityListing.ts");
    assert.match(src, /export const ALL_SDG_FILTER_OPTIONS: string\[\] = \[\.\.\.sdgData\]/);
    assert.match(src, /\.map\(\(sdg\) => `\$\{sdg\.number\}\. \$\{sdg\.title\}`\);/);
    assert.match(src, /return sdgIds\.some\(\(id\) => findSdgById\(id as string \| number \| null \| undefined\)\?\.number === goal\);/);
});

test("both browse pages use all 17 options and the primary-or-supporting match", () => {
    for (const f of ["src/components/opportunities/ExploreOpportunitiesView.tsx", "src/app/dashboard/student/browse/page.tsx"]) {
        const src = read(f);
        assert.match(src, /const sdgOptions = ALL_SDG_FILTER_OPTIONS;/, f);
        assert.match(src, /matchesSdgFilter\(sdgFilter, /, f);
    }
});

test("cards and flashcards no longer cut SDGs short", () => {
    assert.doesNotMatch(read("src/components/opportunities/MarketplaceOpportunityCard.tsx"), /sdgs\.slice\(/);
    assert.doesNotMatch(read("src/app/dashboard/student/browse/BrowseOpportunityCard.tsx"), /sdgs\.slice\(/);
    assert.match(read("src/app/dashboard/student/report/impact-package/buildImpactPackageModel.ts"), /chips: sdgs\.map\(\(row\) => \{/);
    const flash = read("src/app/dashboard/student/create-opportunity/StudentOpportunityFlashcard.tsx");
    assert.match(flash, /supportingSdgs: \(Array\.isArray\(raw\.secondary_sdgs\) \? raw\.secondary_sdgs : \[\]\)/);
    assert.match(flash, /\{supportingSdgs\.map\(\(row\) => \(/);
    assert.match(read("src/components/ciel/community-service/CommunityFlashCard.tsx"), /const sdg = awardCardSdgLine\(card\);/);
});

test("award card SDG line lists every goal, else the primary text", () => {
    const src = read("src/utils/communityAwardModel.ts");
    assert.match(src, /if \(goals\.length\) return `SDG \$\{goals\.join\(", "\)\}`;/);
    assert.match(src, /return card\.sdg\?\.trim\(\) \|\| "—";/);
});
