import assert from "node:assert/strict";
import {
    isTeamMemberAttendanceOnlyMode,
    pickPreferredEngagementSeat,
} from "./teamReportSubmitAccess";

const projectId = "proj-1";
const preferred = pickPreferredEngagementSeat(
    [
        { id: "ind", projectId, participationMode: "individual" },
        {
            id: "team-member",
            projectId,
            participationMode: "team",
            isTeamLead: false,
        },
        {
            id: "team-lead",
            projectId,
            participationMode: "team",
            isTeamLead: true,
        },
    ],
    projectId,
);
assert.equal(preferred?.id, "team-lead");

assert.equal(
    isTeamMemberAttendanceOnlyMode(
        { section1: { participation_type: "individual" } } as any,
        "me@test.edu",
        false,
    ),
    false,
    "individual reports must not enter attendance-only mode",
);

assert.equal(
    isTeamMemberAttendanceOnlyMode(
        {
            section1: {
                participation_type: "team",
                team_lead: { email: "lead@test.edu" },
            },
        } as any,
        "member@test.edu",
        false,
    ),
    true,
    "non-lead teammates stay in attendance-only mode",
);

console.log("teamReportSubmitAccess.spec.ts ok");
