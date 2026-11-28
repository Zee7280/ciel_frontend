import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const HUBS = [
    "src/app/dashboard/partner/community-service/NgoCommunityServiceHub.tsx",
    "src/app/dashboard/partner/community-service/PartnerCommunityServiceHub.tsx",
];

test("NGO / Partner approvals: non-pending cards open the flashcard in place (no jump to Verify Work)", () => {
    for (const file of HUBS) {
        const src = read(file);
        assert.doesNotMatch(src, /View same record|"Open record"/, file);
        assert.doesNotMatch(src, /\$\{APPROVALS\}\?tab=\$\{verifyTab\}/, file);
        assert.match(src, /partnerReview\.openOpportunityDetail\(row\.id, \{\s*showActions: false,\s*approvalAction: "partner_ack",\s*\}\)/, file);
        assert.match(src, />\s*View Flashcard\s*<\/button>/, file);
    }
    const actions = read("src/components/faculty/FacultyOpportunityReviewActions.tsx");
    assert.match(actions, /: "The flashcard and full proposal of this opportunity, as it stands now\. View only\."/);
});

test("NGO / Partner projects: faculty-style linked projects with counts, team cards and no dead-end hours link", () => {
    for (const file of HUBS) {
        const src = read(file);
        assert.match(src, /<LinkedProjectsView/, file);
        assert.doesNotMatch(src, /attendance-review\?projectId/, file);
        assert.match(src, /onViewFlashcard=\{\(projectId\) =>\s*void partnerReview\.openOpportunityDetail\(projectId, \{ showActions: false, approvalAction: "partner_ack" \}\)/, file);
    }
    const view = read("src/components/ciel/community-service/LinkedProjectsView.tsx");
    assert.match(view, /\{ id: "active", label: "Active", count: active\.length \}/);
    assert.match(view, /\{ id: "verified", label: "Verified", count: verified\.length \}/);
    assert.match(view, /\{ id: "all", label: "All", count: all\.length \}/);
    assert.match(view, /mergeLinkedProjectRows\(tracking\.grouped, reportRows\)/);
    assert.doesNotMatch(view, /hoursHrefFor/);
});

test("project cards show who the Email and WhatsApp reminders reach, separately; phone stays private", () => {
    const card = read("src/components/ciel/community-service/ProjectMonitorCard.tsx");
    assert.match(card, /data-testid="monitor-remind-recipients"/);
    assert.match(card, /✉ Email:<\/span> <span className="break-all">\{remindTo\.split\(","\)\.join\(", "\)\}<\/span>/);
    assert.match(card, /💬 WhatsApp:<\/span> opens your WhatsApp with the reminder ready/);
});

test("Verify Work: the chain gets the full row (names) and the request dialog shows one readable stage", () => {
    const verify = read("src/app/dashboard/partner/verify/page.tsx");
    assert.match(verify, /\.\.\.row\.raw,\s*\.\.\.definedOnly\(\{/);
    assert.match(verify, /student_name: realName\(row\.studentName\) \|\| undefined,/);
    assert.match(verify, /<p className="text-slate-500 mt-1">\{resolveStudentOpportunityWorkflow\(detailRecord\)\.badgeLabel\}<\/p>/);
    assert.doesNotMatch(verify, /uppercase mb-2">Workflow<\/p>/);
    // A phone typed as the contact person shows as WhatsApp, not as a name.
    assert.match(verify, /<span className="text-slate-500">WhatsApp:<\/span>/);
});
