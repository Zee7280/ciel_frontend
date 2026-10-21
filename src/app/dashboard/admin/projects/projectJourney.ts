/**
 * Pure model for the admin Project Tracker (no React, no app imports) so the A→Z journey and the
 * support guidance can be unit-tested with `node --test` against real API payload shapes.
 */

export type StepState = "done" | "current" | "waiting" | "blocked" | "skipped";

/** Who has to act next on a step — tells support staff whom to contact. */
export type StepOwner = "student" | "faculty" | "partner" | "admin" | null;

export type ReportStage = "verified" | "review" | "draft" | "rejected" | "none";

export type AttendanceSessionPreview = {
    id: string;
    dateOfEngagement: string;
    startTime: string;
    endTime: string;
    sessionHours: number;
    activityType: string;
    organizationName: string;
    description: string;
    entryStatus: string;
    approvalStatus: string | null;
    assignedApproverType: string | null;
    evidenceUploaded: boolean;
    needsReview: boolean;
};

export type ApplicationRosterRow = {
    id: string;
    studentUserId: string | null;
    studentName: string;
    studentEmail: string;
    internalStatus: string;
    joinStageDisplay: string;
    participationType: string;
    teamMembers: Array<{ name?: string; email?: string }>;
    createdAt: string | null;
    participationId: string | null;
    enrollmentWarning: string | null;
    attendanceSessionsTotal: number | null;
    attendanceSessionsPendingReview: number | null;
    attendanceApproverType: string | null;
    /** Newest-first session rows for this seat (team lead seat on roster row). */
    attendanceSessionsPreview: AttendanceSessionPreview[];
    impactReportId: string | null;
    impactReportSummary: string | null;
    impactReportPartnerStatus: string | null;
    impactReportAdminStatus: string | null;
    impactReportFacultyStatus: string | null;
    impactReportRawStatus: string | null;
};

export type TrackerOpportunitySnapshot = {
    organizationName: string | null;
    executingOrganizationName: string | null;
    executingOrganizationEmail: string | null;
    partnerOrganizationName: string | null;
    partnerOrganizationEmail: string | null;
    partnerContactPerson: string | null;
    facultySupervisorName: string | null;
    facultySupervisorEmail: string | null;
    attendanceRoutingOverride: "auto" | "partner" | "faculty";
    pipeline: Record<string, number>;
    pipelineTotal: number;
    timeline: Record<string, unknown> | null;
    mode: string | null;
};

export type RosterStats = {
    enrolledSeats: number;
    sessions: number;
    pendingSessions: number;
    reports: Record<ReportStage, number>;
};

export type JourneyInput = {
    opportunityId: string;
    raw: Record<string, unknown>;
    volunteers: number;
    volunteersRequired: number | null;
    remainingSeats: number | null;
    /** Hours students have logged so far (verified or not). */
    hours: number;
    /** Hours confirmed on locked flash cards; backend `remaining_hours` is target minus this. */
    verifiedHours: number;
    remainingHours: number | null;
    snapshot: TrackerOpportunitySnapshot | null;
    stats: RosterStats;
};

export type JourneyStepModel = {
    key: "submitted" | "faculty" | "partner" | "ciel" | "applications" | "enrollment" | "attendance" | "reports" | "closed";
    title: string;
    state: StepState;
    headline: string;
    owner: StepOwner;
    /** What support should tell the person who must act. Empty when nothing is needed. */
    guide: string;
};

export type StudentGuide = { owner: StepOwner; text: string };

/** Paths students / reviewers open — relative, the caller prefixes the site origin. */
export const STUDENT_PATHS = {
    fixOpportunity: (id: string) =>
        `/dashboard/student/paths/community-service?view=create&filter=review&opportunity=${encodeURIComponent(id)}`,
    listing: (id: string) => `/dashboard/student/browse/${encodeURIComponent(id)}`,
    logHours: "/dashboard/student/paths/community-service?tab=log-hours",
    report: (id: string) => `/dashboard/student/report?projectId=${encodeURIComponent(id)}`,
    facultyApprovals: (id: string) => `/dashboard/faculty/approvals?opportunity=${encodeURIComponent(id)}&tab=pending`,
    partnerVerify: (id: string) => `/dashboard/partner/verify?opportunity=${encodeURIComponent(id)}&tab=pending`,
};

export function lower(v: unknown): string {
    return String(v ?? "")
        .trim()
        .toLowerCase();
}

export function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function pickString(raw: Record<string, unknown>, keys: string[], fallback = ""): string {
    for (const key of keys) {
        const value = raw[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return fallback;
}

function pickInt(raw: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
        const v = raw[key];
        if (v === null || v === undefined || v === "") continue;
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

function pickBoolLoose(raw: Record<string, unknown>, keys: string[]): boolean {
    for (const key of keys) {
        const v = raw[key];
        if (typeof v === "boolean") return v;
        if (v === 1 || v === "1") return true;
    }
    return false;
}

export function fmtDate(v: unknown): string | null {
    if (typeof v !== "string" || !v.trim()) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtHours(n: number): string {
    return String(Math.round(n * 100) / 100);
}

export function plural(n: number, word: string): string {
    return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function reportStage(a: Pick<ApplicationRosterRow, "impactReportRawStatus">): ReportStage {
    const s = lower(a.impactReportRawStatus);
    if (!s) return "none";
    if (s === "verified" || s === "paid" || s === "closed") return "verified";
    if (s === "rejected") return "rejected";
    if (s === "draft" || s === "revision") return "draft";
    return "review";
}

export function mapAttendanceSessionPreview(raw: Record<string, unknown>): AttendanceSessionPreview | null {
    const id = pickString(raw, ["id"]);
    if (!id) return null;
    const sessionHours = pickInt(raw, ["session_hours", "sessionHours"]) ?? 0;
    return {
        id,
        dateOfEngagement: pickString(raw, ["date_of_engagement", "dateOfEngagement"], "—"),
        startTime: pickString(raw, ["start_time", "startTime"], "—"),
        endTime: pickString(raw, ["end_time", "endTime"], "—"),
        sessionHours,
        activityType: pickString(raw, ["activity_type", "activityType"], "—"),
        organizationName: pickString(raw, ["organization_name", "organizationName"], "—"),
        description: pickString(raw, ["description"], ""),
        entryStatus: pickString(raw, ["entry_status", "entryStatus"], "—"),
        approvalStatus: pickString(raw, ["approval_status", "approvalStatus"]) || null,
        assignedApproverType: pickString(raw, ["assigned_approver_type", "assignedApproverType"]) || null,
        evidenceUploaded: pickBoolLoose(raw, ["evidence_uploaded", "evidenceUploaded"]),
        needsReview: pickBoolLoose(raw, ["needs_review", "needsReview"]),
    };
}

/** `summary.applications_roster` from GET admin/opportunities/:id/teams. */
export function extractApplicationsRoster(summaryRaw: Record<string, unknown> | null): ApplicationRosterRow[] {
    const list = summaryRaw?.applications_roster ?? summaryRaw?.applicationsRoster;
    if (!Array.isArray(list)) return [];
    const out: ApplicationRosterRow[] = [];
    for (const item of list) {
        const raw = asRecord(item);
        if (!raw) continue;
        const id = pickString(raw, ["id", "application_id", "applicationId"]);
        if (!id) continue;
        const teamRaw = raw.team_members ?? raw.teamMembers;
        const teamMembers = Array.isArray(teamRaw)
            ? teamRaw.map((m) => {
                  const r = asRecord(m) ?? {};
                  return {
                      name: typeof r.name === "string" ? r.name : undefined,
                      email: typeof r.email === "string" ? r.email : undefined,
                  };
              })
            : [];
        const internalStatus = pickString(raw, ["internal_status", "internalStatus"], "unknown");
        const et = asRecord(raw.enrollment_tracking ?? raw.enrollmentTracking);
        const previewRaw = et?.attendance_sessions_preview ?? et?.attendanceSessionsPreview;
        const attendanceSessionsPreview = Array.isArray(previewRaw)
            ? previewRaw
                  .map((x) => {
                      const r = asRecord(x);
                      return r ? mapAttendanceSessionPreview(r) : null;
                  })
                  .filter((x): x is AttendanceSessionPreview => x !== null)
            : [];
        const etStr = (keys: string[]) => (et ? pickString(et, keys) || null : null);
        out.push({
            id,
            studentUserId: pickString(raw, ["student_user_id", "studentUserId"]) || null,
            studentName: pickString(raw, ["student_name", "studentName"], "—"),
            studentEmail: pickString(raw, ["student_email", "studentEmail"]),
            internalStatus,
            joinStageDisplay:
                pickString(raw, ["join_stage_display", "joinStageDisplay"]) ||
                (internalStatus === "approved" ? "Approved — enrollment" : "Awaiting approvals"),
            participationType: pickString(raw, ["participation_type", "participationType"], "individual"),
            teamMembers,
            createdAt: pickString(raw, ["created_at", "createdAt"]) || null,
            participationId: etStr(["participation_id", "participationId"]),
            enrollmentWarning: etStr(["enrollment_warning", "enrollmentWarning"]),
            attendanceSessionsTotal: et ? pickInt(et, ["attendance_sessions_total", "attendanceSessionsTotal"]) : null,
            attendanceSessionsPendingReview: et
                ? pickInt(et, ["attendance_sessions_pending_review", "attendanceSessionsPendingReview"])
                : null,
            attendanceApproverType: etStr(["attendance_approver_type", "attendanceApproverType"]),
            attendanceSessionsPreview,
            impactReportId: etStr(["impact_report_id", "impactReportId"]),
            impactReportSummary: etStr(["impact_report_summary", "impactReportSummary"]),
            impactReportPartnerStatus: etStr(["impact_report_partner_status", "impactReportPartnerStatus"]),
            impactReportAdminStatus: etStr(["impact_report_admin_status", "impactReportAdminStatus"]),
            impactReportFacultyStatus: etStr(["impact_report_faculty_status", "impactReportFacultyStatus"]),
            impactReportRawStatus: etStr(["impact_report_status", "impactReportStatus"]),
        });
    }
    return out;
}

/** Opportunity-level block of GET admin/opportunities/:id/teams `summary`. */
export function extractTrackerSnapshot(summaryRaw: Record<string, unknown> | null): TrackerOpportunitySnapshot {
    const pipeline: Record<string, number> = {
        pending_faculty: 0,
        pending_partner: 0,
        pending_admin: 0,
        approved: 0,
        faculty_rejected: 0,
        partner_rejected: 0,
        admin_rejected: 0,
    };
    const block = asRecord(summaryRaw?.applications_by_internal_status ?? summaryRaw?.applicationsByInternalStatus);
    if (block) {
        for (const k of Object.keys(pipeline)) {
            const n = Number(block[k]);
            pipeline[k] = Number.isFinite(n) ? n : 0;
        }
    }
    const totalParsed = Number(
        summaryRaw?.applications_pipeline_total_non_withdrawn ?? summaryRaw?.applicationsPipelineTotalNonWithdrawn,
    );
    const pipelineTotal = Number.isFinite(totalParsed) ? totalParsed : Object.values(pipeline).reduce((a, b) => a + b, 0);

    const o = asRecord(summaryRaw?.opportunity) ?? {};
    const rawOverride = pickString(o, ["attendance_routing_override", "attendanceRoutingOverride"]);
    const str = (keys: string[]) => pickString(o, keys) || null;

    return {
        organizationName: str(["organization_name", "organizationName"]),
        executingOrganizationName: str(["executing_organization_name", "executingOrganizationName"]),
        executingOrganizationEmail: str(["executing_organization_email", "executingOrganizationEmail"]),
        partnerOrganizationName: str(["partner_organization_name", "partnerOrganizationName"]),
        partnerOrganizationEmail: str(["partner_organization_email", "partnerOrganizationEmail"]),
        partnerContactPerson: str(["partner_contact_person", "partnerContactPerson"]),
        facultySupervisorName: str(["faculty_supervisor_name", "facultySupervisorName"]),
        facultySupervisorEmail: str(["faculty_supervisor_email", "facultySupervisorEmail"]),
        attendanceRoutingOverride: rawOverride === "partner" || rawOverride === "faculty" ? rawOverride : "auto",
        pipeline,
        pipelineTotal,
        timeline: asRecord(o.timeline),
        mode: str(["mode"]),
    };
}

/** Seat-level rollups across enrolled applications (team rows count once, via the lead's seat). */
export function computeRosterStats(roster: ApplicationRosterRow[]): RosterStats {
    const reports: Record<ReportStage, number> = { verified: 0, review: 0, draft: 0, rejected: 0, none: 0 };
    let enrolledSeats = 0;
    let sessions = 0;
    let pendingSessions = 0;
    for (const a of roster) {
        if (a.internalStatus !== "approved") continue;
        enrolledSeats += 1;
        sessions += a.attendanceSessionsTotal ?? 0;
        pendingSessions += a.attendanceSessionsPendingReview ?? 0;
        reports[reportStage(a)] += 1;
    }
    return { enrolledSeats, sessions, pendingSessions, reports };
}

export function buildJourney(input: JourneyInput, origin = ""): JourneyStepModel[] {
    const { raw, snapshot, stats, opportunityId: id } = input;
    const status = lower(raw.status);
    const stage = lower(raw.workflow_stage);
    const role = lower(raw.currently_with_role);
    const checklist = asRecord(raw.approval_checklist);
    const facStatus = lower(raw.faculty_approval_status);
    const partStatus = lower(raw.partner_approval_status);
    const admStatus = lower(raw.admin_approval_status);
    const isDraft = status === "draft";
    const isRejected = status === "rejected" || stage === "rejected";
    const isRevision = status === "revision" || stage === "revision";
    const adminApproved = raw.admin_approved === true || checklist?.admin === true;
    const partnerRequired = checklist
        ? checklist.partner_required === true
        : Boolean(partStatus) && partStatus !== "not_applicable";
    const closedOrDone = status === "closed" || status === "completed";
    const waitingSince = fmtDate(raw.waiting_since);
    const since = waitingSince ? ` since ${waitingSince}` : "";
    const link = (path: string) => `${origin}${path}`;

    const creator = asRecord(raw.creator) ?? {};
    const creatorName = pickString(creator, ["name"], "the creator");
    const createdAt = fmtDate(raw.created_at ?? raw.createdAt);

    // A — submission
    const submitted: JourneyStepModel = {
        key: "submitted",
        title: "Submitted",
        state: isDraft || isRevision ? "current" : "done",
        owner: isDraft || isRevision ? "student" : null,
        headline: isDraft
            ? "Draft — creator has not submitted yet"
            : isRevision
              ? "Revision requested — waiting for creator to resubmit"
              : `Submitted by ${creatorName}${createdAt ? ` on ${createdAt}` : ""}`,
        guide: isDraft
            ? `Your opportunity is still a draft. Open it, complete every step and press Submit: ${link(STUDENT_PATHS.fixOpportunity(id))}`
            : isRevision
              ? `Your opportunity was sent back for changes. Open it, click Edit, fix the points in the feedback and resubmit: ${link(STUDENT_PATHS.fixOpportunity(id))}`
              : "",
    };

    // B — faculty
    const facultyName = snapshot?.facultySupervisorName || "";
    const facultyEmail = snapshot?.facultySupervisorEmail || "";
    const facultySkipped = facStatus === "not_applicable" || facStatus === "not_required";
    const facultyDone = checklist?.faculty === true || adminApproved;
    const facultyWaiting = role === "faculty" || stage === "pending_faculty";
    const faculty: JourneyStepModel = {
        key: "faculty",
        title: "Faculty approval",
        state: facultySkipped
            ? "skipped"
            : facStatus === "rejected"
              ? "blocked"
              : facultyDone
                ? "done"
                : facultyWaiting
                  ? "current"
                  : "waiting",
        owner: facultyWaiting && !facultyDone && !facultySkipped ? "faculty" : facStatus === "rejected" ? "student" : null,
        headline: facultySkipped
            ? "Not required for this project"
            : facStatus === "rejected"
              ? "Faculty rejected the listing"
              : facultyDone
                ? "Faculty approved"
                : facultyWaiting
                  ? `Waiting on faculty${since}`
                  : "Pending",
        guide:
            facStatus === "rejected"
                ? "Your faculty supervisor did not approve this opportunity. Please speak to them about the reason before creating a corrected one."
                : facultyWaiting && !facultyDone && !facultySkipped
                  ? facultyEmail
                      ? `Your opportunity is waiting for your faculty supervisor${facultyName ? ` (${facultyName})` : ""} to approve. Please ask them to sign in to CIEL with ${facultyEmail} and approve it here: ${link(STUDENT_PATHS.facultyApprovals(id))}`
                      : "No faculty supervisor email is on file, so nobody can approve this step. Please send us your supervisor's official university email so we can add it."
                  : "",
    };

    // C — partner / execution org
    const partnerName =
        snapshot?.executingOrganizationName || snapshot?.partnerOrganizationName || snapshot?.organizationName || "";
    const partnerEmail = snapshot?.executingOrganizationEmail || snapshot?.partnerOrganizationEmail || "";
    const partnerDone = checklist?.partner === true || adminApproved;
    const partnerWaiting = role === "partner" || stage === "pending_partner" || status === "pending_execution";
    const partner: JourneyStepModel = {
        key: "partner",
        title: "Partner approval",
        state: !partnerRequired
            ? "skipped"
            : partStatus === "rejected"
              ? "blocked"
              : partnerDone
                ? "done"
                : partnerWaiting
                  ? "current"
                  : "waiting",
        owner: partnerRequired && partnerWaiting && !partnerDone ? "partner" : partStatus === "rejected" ? "student" : null,
        headline: !partnerRequired
            ? "No partner sign-off needed"
            : partStatus === "rejected"
              ? "Partner rejected the listing"
              : partnerDone
                ? "Partner confirmed"
                : partnerWaiting
                  ? `Waiting on partner${since}`
                  : "Pending",
        guide:
            partStatus === "rejected"
                ? "The partner organisation did not confirm this opportunity. Please check with them, then edit the opportunity with the correct partner and resubmit."
                : partnerRequired && partnerWaiting && !partnerDone
                  ? partnerEmail
                      ? `Your opportunity is waiting for the partner organisation${partnerName ? ` (${partnerName})` : ""} to confirm. Please ask them to sign in or register on CIEL using ${partnerEmail} (the same email you entered) and approve it here: ${link(STUDENT_PATHS.partnerVerify(id))}`
                      : `Your activity needs a partner organisation but none has been added. Please click Edit, add the organisation where you will do the activity, and resubmit: ${link(STUDENT_PATHS.fixOpportunity(id))}`
                  : "",
    };

    // D — CIEL approval & listing
    const cielWaiting = role === "admin" || stage === "pending_admin";
    const ciel: JourneyStepModel = {
        key: "ciel",
        title: "CIEL approval · live",
        state: adminApproved ? "done" : isRejected ? "blocked" : cielWaiting ? "current" : "waiting",
        owner: !adminApproved && !isRejected && cielWaiting ? "admin" : null,
        headline: adminApproved
            ? "Approved by CIEL and published"
            : isRejected
              ? admStatus === "rejected" || (facStatus !== "rejected" && partStatus !== "rejected")
                  ? "Rejected — no further approval"
                  : "Stopped — rejected at an earlier step"
              : cielWaiting
                ? "Waiting on CIEL final approval"
                : "After faculty and partner sign-off",
        guide: cielWaiting && !adminApproved && !isRejected
            ? "All sign-offs are in. Your opportunity is in CIEL's final review — no action is needed from you."
            : "",
    };

    // E — applications
    const p = snapshot?.pipeline ?? {};
    const pendingFacultyJoin = p.pending_faculty ?? 0;
    const pendingPartnerJoin = p.pending_partner ?? 0;
    const pendingAdminJoin = p.pending_admin ?? 0;
    const pendingJoin = pendingFacultyJoin + pendingPartnerJoin + pendingAdminJoin;
    const totalApps = snapshot?.pipelineTotal ?? 0;
    const applicationsOpen = raw.applications_open !== false;
    // Private team (backend team_mode): nobody applies — the creator adds members from the report.
    const privateTeam = raw.team_mode === "private_team";
    const applications: JourneyStepModel =
        privateTeam && totalApps === 0
            ? {
                  key: "applications",
                  title: "Applications",
                  state: "skipped",
                  owner: null,
                  headline: "Private team — nobody applies; the creator adds members in the report",
                  guide: "",
              }
            : {
                  key: "applications",
                  title: "Applications",
                  state: totalApps === 0 ? (adminApproved && !closedOrDone ? "current" : "waiting") : pendingJoin > 0 ? "current" : "done",
                  owner:
                      pendingAdminJoin + pendingPartnerJoin > 0
                          ? "admin"
                          : pendingFacultyJoin > 0
                            ? "faculty"
                            : totalApps === 0 && adminApproved && applicationsOpen && !closedOrDone
                              ? "student"
                              : null,
                  headline:
                      totalApps === 0
                          ? adminApproved
                              ? applicationsOpen
                                  ? "Open — no applications yet"
                                  : "No applications — applications are closed"
                              : "Opens once the listing is live"
                          : pendingJoin > 0
                            ? `${pendingJoin} waiting for a decision · ${totalApps} total`
                            : `${plural(totalApps, "application")} processed`,
                  guide:
                      totalApps === 0 && adminApproved && applicationsOpen && !closedOrDone
                          ? `The opportunity is live. Students can apply from this page: ${link(STUDENT_PATHS.listing(id))}`
                          : pendingFacultyJoin > 0
                            ? "Some join requests are waiting for faculty approval. Please ask the faculty supervisor to approve them from their CIEL dashboard."
                            : "",
              };

    // F — enrollment
    const capacity = input.volunteersRequired;
    const seatsFull =
        (input.remainingSeats != null && input.remainingSeats <= 0 && capacity != null) ||
        (capacity != null && input.volunteers >= capacity);
    const privateTeamToStart = privateTeam && adminApproved && !closedOrDone && input.volunteers === 0;
    const enrollment: JourneyStepModel = {
        key: "enrollment",
        title: "Enrollment",
        state:
            input.volunteers === 0
                ? totalApps > 0 || privateTeamToStart
                    ? "current"
                    : "waiting"
                : seatsFull || closedOrDone
                  ? "done"
                  : "current",
        owner: privateTeamToStart ? "student" : null,
        headline:
            input.volunteers === 0
                ? privateTeamToStart
                    ? "Private team is live — the creator has not started the report yet"
                    : "No one enrolled yet"
                : capacity != null
                  ? `${input.volunteers} / ${capacity} volunteers${seatsFull ? " · full" : input.remainingSeats != null ? ` · ${input.remainingSeats} open` : ""}`
                  : `${plural(input.volunteers, "volunteer")} enrolled`,
        guide: privateTeamToStart
            ? `Your private team is approved. Start your report and add your members in Section 1 (no one applies to a private team): ${link(STUDENT_PATHS.report(id))}`
            : "",
    };

    // G — attendance & hours
    const committed = input.remainingHours != null ? input.verifiedHours + input.remainingHours : null;
    const hoursComplete = committed != null && committed > 0 && input.remainingHours === 0;
    const attendance: JourneyStepModel = {
        key: "attendance",
        title: "Attendance & hours",
        state:
            stats.enrolledSeats === 0
                ? "waiting"
                : stats.pendingSessions > 0
                  ? "current"
                  : hoursComplete
                    ? "done"
                    : "current",
        owner: stats.enrolledSeats === 0 ? null : stats.pendingSessions > 0 ? "admin" : hoursComplete ? null : "student",
        headline:
            stats.enrolledSeats === 0
                ? "Starts once students enroll"
                : stats.pendingSessions > 0
                  ? `${plural(stats.pendingSessions, "session")} waiting for review`
                  : stats.sessions === 0
                    ? "Enrolled — no sessions logged yet"
                    : `${fmtHours(input.hours)}${committed != null ? ` of ${fmtHours(committed)}` : ""} hours logged`,
        guide:
            stats.enrolledSeats > 0 && !hoursComplete
                ? `Please log every session you work: date, start and end time, what you did, and a photo as evidence. Log hours here: ${link(STUDENT_PATHS.logHours)}`
                : "",
    };

    // H — impact reports
    const r = stats.reports;
    const seats = stats.enrolledSeats;
    const allVerified = seats > 0 && r.verified === seats;
    const reports: JourneyStepModel = {
        key: "reports",
        title: "Impact reports",
        state: seats === 0 ? "waiting" : allVerified ? "done" : seats - r.none > 0 || stats.sessions > 0 ? "current" : "waiting",
        owner: seats === 0 || allVerified ? null : r.review > 0 ? "admin" : "student",
        headline: seats === 0 ? "Due after the activity" : allVerified ? `All ${plural(seats, "report")} verified` : `${r.verified} of ${seats} verified`,
        guide:
            seats > 0 && !allVerified
                ? `After your activity, submit your impact report (with attendance and evidence) before the reporting window closes: ${link(STUDENT_PATHS.report(id))}`
                : "",
    };

    // I — close-out
    const closeout: JourneyStepModel = {
        key: "closed",
        title: "Completed",
        state: closedOrDone ? "done" : allVerified ? "current" : "waiting",
        owner: !closedOrDone && allVerified ? "admin" : null,
        headline: closedOrDone
            ? status === "completed"
                ? "Project completed"
                : "Project closed"
            : allVerified
              ? "Ready to close — every report is verified"
              : "Closes after reports are verified",
        guide: "",
    };

    return [submitted, faculty, partner, ciel, applications, enrollment, attendance, reports, closeout];
}

/** The first step that needs attention (stopped wins over in-progress), or null when all is done. */
export function focusStepIndex(steps: JourneyStepModel[]): number {
    const blocked = steps.findIndex((s) => s.state === "blocked");
    if (blocked >= 0) return blocked;
    return steps.findIndex((s) => s.state === "current");
}

/** Per-student "what should this person do next" line for support staff. */
export function studentGuide(a: ApplicationRosterRow, opportunityId: string, origin = ""): StudentGuide {
    const link = (path: string) => `${origin}${path}`;
    const s = a.internalStatus;
    if (s === "pending_faculty")
        return { owner: "faculty", text: "Your join request is waiting for your faculty supervisor to approve it on CIEL." };
    if (s === "pending_partner" || s === "pending_admin")
        return { owner: "admin", text: "Your join request is with CIEL for approval. No action is needed from you." };
    if (s.endsWith("_rejected"))
        return { owner: null, text: "Your join request was not approved. You can apply to another open opportunity." };
    if (s !== "approved") return { owner: null, text: "" };
    if (a.enrollmentWarning)
        return { owner: "admin", text: "Your seat is being fixed by CIEL. Please wait before logging hours." };
    const pending = a.attendanceSessionsPendingReview ?? 0;
    const total = a.attendanceSessionsTotal ?? 0;
    const report = reportStage(a);
    if (report === "verified") return { owner: null, text: "Your impact report is verified. Nothing else is needed." };
    if (report === "review")
        return { owner: "admin", text: "Your impact report is submitted and under review. No action is needed from you." };
    if (report === "rejected" || report === "draft")
        return {
            owner: "student",
            text: `Your impact report needs changes. Open it, update the parts mentioned in the feedback and submit again: ${link(STUDENT_PATHS.report(opportunityId))}`,
        };
    if (pending > 0)
        return { owner: "admin", text: `${plural(pending, "logged session")} are waiting for review. No action is needed from you right now.` };
    if (total === 0)
        return {
            owner: "student",
            text: `You are enrolled. Please log each session you work (date, time, activity, evidence) here: ${link(STUDENT_PATHS.logHours)}`,
        };
    return {
        owner: "student",
        text: `Keep logging your sessions. When the activity is finished, submit your impact report here: ${link(STUDENT_PATHS.report(opportunityId))}`,
    };
}

/** wa.me number from a stored phone (Pakistan numbers default to +92). */
export function whatsappNumber(rawPhone: unknown): string {
    const phone = String(rawPhone ?? "").trim();
    const digits = phone.replace(/\D/g, "");
    if (!digits) return "";
    return phone.startsWith("+") ? digits : digits.length >= 10 ? `92${digits.slice(-10)}` : digits;
}
