import assert from "node:assert/strict";
import { calculateEngagementMetrics, personDailyHoursOverCap } from "./engagementMetrics";

const teamRoster = [
    "lead:aaa",
    "member:0:800ef6b2-f361-4672-8138-6a9bc4f6425d",
];

const sameDayTeam = personDailyHoursOverCap(
    [
        { date: "2026-09-24", hours: 9, participantId: "lead:aaa", id: "1" },
        {
            date: "2026-09-24",
            hours: 9,
            participantId: "member:0:800ef6b2-f361-4672-8138-6a9bc4f6425d",
            id: "2",
        },
    ],
    teamRoster,
);
assert.deepEqual(sameDayTeam, [], "team members on the same day must not trip the 9h cap");

const onePersonOver = personDailyHoursOverCap(
    [
        { date: "2026-09-24", hours: 6, participantId: "lead:aaa", id: "1" },
        { date: "2026-09-24", hours: 4, participantId: "lead:aaa", id: "2" },
    ],
    teamRoster,
);
assert.equal(onePersonOver.length, 1);
assert.equal(onePersonOver[0].date, "2026-09-24");
assert.equal(onePersonOver[0].hrs, 10);

const metrics = calculateEngagementMetrics(
    [
        { date: "2026-09-24", hours: 9, participantId: "lead:aaa", id: "1" },
        {
            date: "2026-09-24",
            hours: 9,
            participantId: "member:0:800ef6b2-f361-4672-8138-6a9bc4f6425d",
            id: "2",
        },
    ],
    16,
    2,
    undefined,
    teamRoster,
    { includeUnreviewed: true },
);
assert.equal(
    (metrics.redFlags || []).some((f) => /Unrealistic daily output/i.test(f)),
    false,
    "engagement metrics must not flag a same-day team total",
);

console.log("engagementMetrics.spec.ts ok");
