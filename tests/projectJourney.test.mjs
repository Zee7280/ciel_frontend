// Run: npm test  (node --test, Node >= 22.6 strips the TS types from projectJourney.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    buildJourney,
    computeRosterStats,
    extractApplicationsRoster,
    extractTrackerSnapshot,
    focusStepIndex,
    reportStage,
    studentGuide,
    whatsappNumber,
} from "../src/app/dashboard/admin/projects/projectJourney.ts";

const OPP = "aaaaaaaa-bbbb-cccc-dddd-eeeeffff0001";

/** Shape of GET admin/opportunities/:id/teams `summary` (opportunity-applications.service.ts). */
const teamsSummary = (overrides = {}) => ({
    applications_by_internal_status: {
        pending_faculty: 0,
        pending_partner: 0,
        pending_admin: 0,
        approved: 1,
        faculty_rejected: 0,
        partner_rejected: 0,
        admin_rejected: 0,
    },
    applications_pipeline_total_non_withdrawn: 1,
    opportunity: {
        title: "Women Empowerment",
        status: "active",
        mode: "onsite",
        timeline: { start_date: "2026-09-01", end_date: "2026-09-30", expected_hours: 16, volunteers_required: 4 },
        organization_name: "Bargad Society of Human Resources",
        partner_organization_name: "Bargad Society of Human Resources",
        partner_organization_email: "info@bargad.org",
        faculty_supervisor_name: "Dr Hina",
        faculty_supervisor_email: "hina@bnu.edu.pk",
        attendance_routing_override: "auto",
    },
    applications_roster: [
        {
            id: "app-1",
            student_name: "Fatima",
            student_email: "F2025-1124@bnu.edu.pk",
            student_user_id: "stu-1",
            internal_status: "approved",
            join_stage_display: "Approved — enrollment complete",
            participation_type: "individual",
            team_members: [],
            created_at: "2026-09-02T08:00:00.000Z",
            enrollment_tracking: {
                participation_id: "part-1",
                attendance_sessions_total: 4,
                attendance_sessions_pending_review: 0,
                attendance_sessions_preview: [
                    {
                        id: "log-1",
                        date_of_engagement: "2026-09-05",
                        start_time: "09:00",
                        end_time: "13:00",
                        session_hours: "4.00",
                        activity_type: "Workshop",
                        organization_name: "Bargad",
                        description: "Session one",
                        entry_status: "verified",
                        approval_status: "approved",
                        assigned_approver_type: "partner",
                        evidence_uploaded: true,
                        needs_review: false,
                    },
                ],
                attendance_approver_type: "partner",
                impact_report_started: true,
                impact_report_id: "rep-1",
                impact_report_status: "submitted",
                impact_report_summary: "Submitted · admin approval pending",
                impact_report_partner_status: "approved",
                impact_report_admin_status: "pending",
                impact_report_faculty_status: "pending",
            },
        },
    ],
    ...overrides,
});

/** Shape of one GET admin/projects row (admin.service.ts getProjects). */
const listRow = (overrides = {}) => ({
    id: OPP,
    status: "active",
    workflow_stage: "live",
    faculty_approval_status: "approved",
    partner_approval_status: "approved",
    admin_approval_status: "approved",
    admin_approved: true,
    admin_expired: true,
    applications_open: false,
    apply_blocked_reason: "opportunity_expired",
    currently_with: "Published",
    currently_with_role: "none",
    approval_checklist: { student: true, faculty: true, partner: true, partner_required: true, admin: true },
    created_at: "2026-08-20T10:00:00.000Z",
    creator: { name: "Fatima", email: "F2025-1124@bnu.edu.pk", phone: "0300-1234567" },
    ...overrides,
});

const journeyFor = (rowOverrides = {}, summary = teamsSummary(), extra = {}) => {
    const roster = extractApplicationsRoster(summary);
    return buildJourney(
        {
            opportunityId: OPP,
            raw: listRow(rowOverrides),
            volunteers: 4,
            volunteersRequired: 4,
            remainingSeats: 0,
            hours: 64,
            verifiedHours: 64,
            remainingHours: 0,
            snapshot: extractTrackerSnapshot(summary),
            stats: computeRosterStats(roster),
            ...extra,
        },
        "https://ciel.example",
    );
};

const byKey = (steps) => Object.fromEntries(steps.map((s) => [s.key, s]));

test("parses the teams roster including the new report / student / participation ids", () => {
    const [a] = extractApplicationsRoster(teamsSummary());
    assert.equal(a.impactReportId, "rep-1");
    assert.equal(a.studentUserId, "stu-1");
    assert.equal(a.participationId, "part-1");
    assert.equal(a.attendanceSessionsPreview[0].sessionHours, 4);
    assert.equal(a.attendanceSessionsPreview[0].approvalStatus, "approved");
    assert.equal(a.createdAt, "2026-09-02T08:00:00.000Z");
});

test("tolerates an older backend without the new ids and malformed rows", () => {
    const summary = teamsSummary();
    delete summary.applications_roster[0].student_user_id;
    delete summary.applications_roster[0].enrollment_tracking.impact_report_id;
    summary.applications_roster.push(null, { no_id: true }, "junk");
    const roster = extractApplicationsRoster(summary);
    assert.equal(roster.length, 1);
    assert.equal(roster[0].impactReportId, null);
    assert.equal(roster[0].studentUserId, null);
    assert.deepEqual(extractApplicationsRoster(null), []);
    assert.equal(extractTrackerSnapshot(null).pipelineTotal, 0);
});

test("screenshot project: live + expired, 4/4 full, 64/64 h, report in review", () => {
    const s = byKey(journeyFor());
    assert.equal(s.submitted.state, "done");
    assert.equal(s.faculty.state, "done");
    assert.equal(s.partner.state, "done");
    assert.equal(s.ciel.state, "done");
    assert.equal(s.applications.state, "done");
    assert.equal(s.enrollment.state, "done");
    assert.equal(s.enrollment.headline, "4 / 4 volunteers · full");
    assert.equal(s.attendance.state, "done");
    assert.equal(s.reports.state, "current");
    assert.equal(s.reports.owner, "admin");
    assert.equal(s.closed.state, "waiting");
    assert.equal(focusStepIndex(journeyFor()), 7);
});

test("pending faculty: faculty step current with a guide naming the supervisor email", () => {
    const steps = journeyFor(
        {
            status: "pending_faculty",
            workflow_stage: "pending_faculty",
            admin_approved: false,
            faculty_approval_status: "pending",
            partner_approval_status: "pending",
            admin_approval_status: "pending",
            currently_with_role: "faculty",
            waiting_since: "2026-09-10T00:00:00.000Z",
            approval_checklist: { student: true, faculty: false, partner: false, partner_required: true, admin: false },
        },
        teamsSummary({ applications_roster: [], applications_pipeline_total_non_withdrawn: 0 }),
        { volunteers: 0, remainingSeats: 4, hours: 0, verifiedHours: 0, remainingHours: 64 },
    );
    const s = byKey(steps);
    assert.equal(s.faculty.state, "current");
    assert.equal(s.faculty.owner, "faculty");
    assert.match(s.faculty.headline, /since 10 Sept? 2026/);
    assert.match(s.faculty.guide, /hina@bnu\.edu\.pk/);
    assert.match(s.faculty.guide, /https:\/\/ciel\.example\/dashboard\/faculty\/approvals\?opportunity=/);
    assert.equal(s.partner.state, "waiting");
    assert.equal(s.ciel.state, "waiting");
    assert.equal(s.applications.state, "waiting");
    assert.equal(s.attendance.state, "waiting");
    assert.equal(focusStepIndex(steps), 1);
});

test("pending partner with no partner email tells the student to add the partner", () => {
    const summary = teamsSummary({ applications_roster: [], applications_pipeline_total_non_withdrawn: 0 });
    summary.opportunity.partner_organization_email = null;
    summary.opportunity.partner_organization_name = null;
    summary.opportunity.organization_name = null;
    const s = byKey(
        journeyFor(
            {
                status: "pending_partner",
                workflow_stage: "pending_partner",
                admin_approved: false,
                partner_approval_status: "pending",
                currently_with_role: "partner",
                approval_checklist: { student: true, faculty: true, partner: false, partner_required: true, admin: false },
            },
            summary,
            { volunteers: 0 },
        ),
    );
    assert.equal(s.faculty.state, "done");
    assert.equal(s.partner.state, "current");
    assert.match(s.partner.guide, /none has been added/);
    assert.match(s.partner.guide, /view=create&filter=review&opportunity=/);
});

test("partner not required is skipped and counts as finished", () => {
    const s = byKey(
        journeyFor({
            partner_approval_status: "not_applicable",
            approval_checklist: { student: true, faculty: true, partner: true, partner_required: false, admin: true },
        }),
    );
    assert.equal(s.partner.state, "skipped");
    assert.equal(s.partner.guide, "");
});

test("rejected listing: rejecting step is blocked and becomes the focus", () => {
    const steps = journeyFor(
        {
            status: "rejected",
            workflow_stage: "rejected",
            admin_approved: false,
            admin_approval_status: "rejected",
            approval_checklist: { student: true, faculty: true, partner: true, partner_required: true, admin: false },
        },
        teamsSummary({ applications_roster: [], applications_pipeline_total_non_withdrawn: 0 }),
        { volunteers: 0 },
    );
    const s = byKey(steps);
    assert.equal(s.ciel.state, "blocked");
    assert.equal(s.ciel.headline, "Rejected — no further approval");
    assert.equal(focusStepIndex(steps), 3);
});

test("revision and draft put the creator back on step A with a fix link", () => {
    const rev = byKey(journeyFor({ status: "revision", workflow_stage: "revision", admin_approved: false, approval_checklist: null }));
    assert.equal(rev.submitted.state, "current");
    assert.equal(rev.submitted.owner, "student");
    assert.match(rev.submitted.guide, /sent back for changes/);
    const draft = byKey(journeyFor({ status: "draft", admin_approved: false, approval_checklist: null }));
    assert.equal(draft.submitted.state, "current");
    assert.match(draft.submitted.guide, /still a draft/);
});

test("missing approval_checklist (older backend) still marks a live listing's gates done", () => {
    const s = byKey(journeyFor({ approval_checklist: undefined }));
    assert.equal(s.faculty.state, "done");
    assert.equal(s.partner.state, "done");
    assert.equal(s.ciel.state, "done");
});

test("hours target uses verified + remaining (not logged + remaining)", () => {
    const s = byKey(
        journeyFor({}, teamsSummary(), { hours: 40, verifiedHours: 10, remainingHours: 54 }),
    );
    // target = 10 + 54 = 64; logged 40 of 64
    assert.equal(s.attendance.headline, "40 of 64 hours logged");
    assert.equal(s.attendance.state, "current");
    assert.equal(s.attendance.owner, "student");
});

test("pending attendance sessions put admin on the attendance step", () => {
    const summary = teamsSummary();
    summary.applications_roster[0].enrollment_tracking.attendance_sessions_pending_review = 2;
    const s = byKey(journeyFor({}, summary));
    assert.equal(s.attendance.state, "current");
    assert.equal(s.attendance.owner, "admin");
    assert.equal(s.attendance.headline, "2 sessions waiting for review");
});

test("all reports verified → ready to close; closed status → completed", () => {
    const summary = teamsSummary();
    summary.applications_roster[0].enrollment_tracking.impact_report_status = "verified";
    const open = byKey(journeyFor({}, summary));
    assert.equal(open.reports.state, "done");
    assert.equal(open.closed.state, "current");
    assert.equal(open.closed.owner, "admin");
    const closed = journeyFor({ status: "closed" }, summary);
    assert.equal(byKey(closed).closed.state, "done");
    assert.equal(focusStepIndex(closed), -1);
});

test("join applications waiting: applications step current, admin owns admin/partner queue", () => {
    const summary = teamsSummary();
    summary.applications_by_internal_status.pending_admin = 2;
    summary.applications_pipeline_total_non_withdrawn = 3;
    const s = byKey(journeyFor({}, summary));
    assert.equal(s.applications.state, "current");
    assert.equal(s.applications.owner, "admin");
    assert.equal(s.applications.headline, "2 waiting for a decision · 3 total");
});

test("private team: applications skipped, creator told to start the report", () => {
    const empty = teamsSummary({
        applications_roster: [],
        applications_pipeline_total_non_withdrawn: 0,
        applications_by_internal_status: {},
    });
    const steps = journeyFor(
        { team_mode: "private_team", admin_expired: false, applications_open: false, apply_blocked_reason: "private_team" },
        empty,
        { volunteers: 0, remainingSeats: 8, volunteersRequired: 8, hours: 0, verifiedHours: 0, remainingHours: 128 },
    );
    const s = byKey(steps);
    assert.equal(s.applications.state, "skipped");
    assert.match(s.applications.headline, /Private team — nobody applies/);
    assert.equal(s.enrollment.state, "current");
    assert.equal(s.enrollment.owner, "student");
    assert.match(s.enrollment.guide, /Start your report and add your members/);
    assert.match(s.enrollment.guide, /report\?projectId=/);
    assert.equal(focusStepIndex(steps), 5);
});

test("open builder listing keeps the normal applications step", () => {
    const s = byKey(journeyFor({ team_mode: "open" }));
    assert.equal(s.applications.state, "done");
    assert.equal(s.enrollment.owner, null);
});

test("reportStage maps every backend status", () => {
    const st = (v) => reportStage({ impactReportRawStatus: v });
    assert.equal(st(null), "none");
    assert.equal(st("draft"), "draft");
    assert.equal(st("revision"), "draft");
    assert.equal(st("submitted"), "review");
    assert.equal(st("payment_under_review"), "review");
    assert.equal(st("verified"), "verified");
    assert.equal(st("paid"), "verified");
    assert.equal(st("closed"), "verified");
    assert.equal(st("rejected"), "rejected");
});

test("studentGuide gives the next action for each student situation", () => {
    const [base] = extractApplicationsRoster(teamsSummary());
    const g = (patch) => studentGuide({ ...base, ...patch }, OPP, "https://ciel.example");
    assert.equal(g({ internalStatus: "pending_faculty" }).owner, "faculty");
    assert.equal(g({ internalStatus: "pending_admin" }).owner, "admin");
    assert.match(g({ internalStatus: "admin_rejected" }).text, /not approved/);
    assert.equal(g({ impactReportRawStatus: "submitted" }).owner, "admin");
    assert.match(g({ impactReportRawStatus: "revision" }).text, /report\?projectId=/);
    assert.equal(g({ impactReportRawStatus: "verified" }).owner, null);
    assert.match(
        g({ impactReportRawStatus: null, attendanceSessionsTotal: 0, attendanceSessionsPendingReview: 0 }).text,
        /tab=log-hours/,
    );
    assert.equal(g({ impactReportRawStatus: null, attendanceSessionsPendingReview: 3 }).owner, "admin");
    assert.equal(g({ enrollmentWarning: "seat not matched" }).owner, "admin");
});

test("whatsappNumber normalises Pakistani numbers", () => {
    assert.equal(whatsappNumber("0300-1234567"), "923001234567");
    assert.equal(whatsappNumber("+92 300 1234567"), "923001234567");
    assert.equal(whatsappNumber(""), "");
    assert.equal(whatsappNumber(null), "");
});
