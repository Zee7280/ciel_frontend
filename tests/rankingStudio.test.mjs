// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    buildProjectStandings,
    FALLBACK_GROUPS,
    FALLBACK_LENSES,
    groupTitle,
    prettyFilterValue,
    standingLabel,
} from "../src/components/ciel/community-service/national-ranking/studio-types.ts";

const pkg = (id, over = {}) => ({
    id,
    title: id,
    university: "BNU",
    department: "SMS",
    sdg: "SDG 4",
    date: "2026-03-01",
    cii: 80,
    ready: true,
    evaluated: true,
    reason: "",
    ...over,
});

const result = (over = {}) => ({
    lens: "excellence",
    groupBy: "project",
    filters: {},
    weights: null,
    rubricVersion: "NPE-1.2",
    name: "Overall",
    signature: "x",
    rows: [],
    eligibleIds: [],
    heldIds: [],
    unreadIds: [],
    heldReasons: [],
    thinGroups: [],
    populationCount: 0,
    ...over,
});

test("project rankings: ranked, eligible without a value, unread, held and outside the filters", () => {
    const packages = [pkg("a"), pkg("b"), pkg("c", { evaluated: false }), pkg("d", { ready: false }), pkg("e")];
    const r = result({
        rows: [{ rank: 1, id: "a", label: "a", projectCount: 1, projectIds: ["a"], metric: 80, cii: 80 }],
        eligibleIds: ["a", "b", "c"],
        heldIds: ["d"],
        unreadIds: ["c"],
    });
    const s = buildProjectStandings(r, packages, false);
    assert.equal(standingLabel(s.get("a")), "Ranked #1");
    assert.equal(standingLabel(s.get("b")), "Eligible — no value for this measure");
    assert.equal(standingLabel(s.get("c")), "Eligible — awaiting AI read");
    assert.equal(standingLabel(s.get("d")), "Held — verification required");
    assert.equal(standingLabel(s.get("e")), "Outside current filters");
});

test("group rankings never give a member project the group's rank as its own", () => {
    const packages = [pkg("a"), pkg("b")];
    const r = result({
        groupBy: "university",
        rows: [{ rank: 2, id: "BNU", label: "BNU", projectCount: 2, projectIds: ["a", "b"], metric: 70, cii: 80 }],
        eligibleIds: ["a", "b"],
    });
    const s = buildProjectStandings(r, packages, false);
    assert.deepEqual(s.get("a"), { kind: "in_group", rank: 2, group: "BNU" });
    assert.equal(standingLabel(s.get("b")), "In #2 group (BNU)");
});

test("a stale preview shows no ranks and no 'outside filters'", () => {
    const packages = [pkg("a"), pkg("x", { ready: false })];
    const r = result({
        rows: [{ rank: 1, id: "a", label: "a", projectCount: 1, projectIds: ["a"], metric: 80, cii: 80 }],
        eligibleIds: [],
    });
    const s = buildProjectStandings(r, packages, true);
    assert.equal(s.get("a").kind, "eligible");
    assert.equal(s.get("x").kind, "held");
});

test("filter chips format dates and team sizes for people", () => {
    assert.equal(prettyFilterValue("month", "3"), "March");
    assert.equal(prettyFilterValue("teamSize", "11-999"), "11+ students");
    assert.equal(prettyFilterValue("teamSize", "1-3"), "1–3 students");
    assert.match(prettyFilterValue("dateFrom", "2026-01-03"), /3 Jan 2026/);
    assert.equal(prettyFilterValue("city", "Lahore"), "Lahore");
});

test("fallback Rank-by and Compare lists are complete before the server answers", () => {
    assert.equal(FALLBACK_LENSES.length, 14);
    assert.deepEqual(
        FALLBACK_GROUPS.map((g) => g.key),
        ["project", "university", "department", "instructor", "sdg", "skill", "partner", "city"],
    );
    assert.equal(groupTitle("sdg", "SDGs"), "Primary SDGs");
    assert.equal(groupTitle("partner", "Partners"), "Partner organizations");
    assert.equal(groupTitle("city", "Cities"), "Cities");
});
