"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import type { ActiveProject } from "@/app/dashboard/student/types";
import { MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";
import {
    isCommunityReportOnLiveDeck,
    isCommunityReportRejected,
    isReviewDraftStatus,
    normalizeReviewStatus,
} from "@/utils/reviewQueue";

const HUB = "/dashboard/student/paths/community-service";
const GUIDE = `${HUB}?view=guide`;
const WALL = "/dashboard/student/impact?area=Community%20Service";

/** Mirrors backend LINE_STATUS (opportunity-workflow.service.ts) — includes the values a line takes
 * when that stage doesn't apply (private-candidate has no faculty line; no partner named, etc.). */
type ApprovalLineStatus =
    | "pending"
    | "approved"
    | "rejected"
    | "revision_requested"
    | "skipped"
    | "not_applicable"
    | "not_required"
    | null
    | undefined;
type WsFilter = "all" | "opportunity" | "report" | "review" | "revision" | "closed";
type NodeState = "complete" | "current" | "locked" | "rejected";

type OpportunityRow = {
    id: string;
    title: string;
    status?: string;
    workflow_stage?: string | null;
    faculty_approval_status?: ApprovalLineStatus;
    partner_approval_status?: ApprovalLineStatus;
    admin_approval_status?: ApprovalLineStatus;
    requires_partner_approval?: boolean;
    created_at?: string;
    faculty_contact_name?: string | null;
    faculty_contact_email?: string | null;
    partner_contact_name?: string | null;
    partner_contact_email?: string | null;
};

type ReportRow = {
    id: string;
    project_id?: string | null;
    opportunity_id?: string | null;
    project_title?: string;
    organization_name?: string;
    status?: string;
    faculty_status?: string;
    admin_status?: string;
    faculty_name?: string | null;
    faculty_email?: string | null;
};

type JourneyNode = { title: string; detail: string; state: NodeState };

type WorkCard = {
    id: string;
    filter: Exclude<WsFilter, "all">;
    stageLabel: string;
    title: string;
    meta: string;
    journeyHead?: string;
    journeySub?: string;
    nodes?: JourneyNode[];
    note?: { kind: "notify" | "success" | "comment"; title?: string; body: string };
    pills?: { label: string; kind: "ok" | "wait" | "rev" }[];
    sideTitle: string;
    sideDetail: string;
    actions: { label: string; href: string; style: "primary" | "soft" | "blue" | "purple" | "red" }[];
};

const FILTERS: { key: WsFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "opportunity", label: "Opportunity Approval" },
    { key: "report", label: "Reports in Progress" },
    { key: "review", label: "Faculty Review" },
    { key: "revision", label: "Revision Required" },
    { key: "closed", label: "Approved / Rejected" },
];

function formatSubmitted(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `Submitted ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
}

function opportunityFullyApproved(op: OpportunityRow): boolean {
    return op.status === "live" || op.admin_approval_status === "approved";
}

function opportunityRejected(op: OpportunityRow): boolean {
    return (
        op.status === "rejected" ||
        op.faculty_approval_status === "rejected" ||
        op.partner_approval_status === "rejected" ||
        op.admin_approval_status === "rejected"
    );
}

/** A reviewer sent the proposal back for changes (backend WORKFLOW_STAGE.REVISION /
 * LINE_STATUS.REVISION_REQUESTED). The next action is the student's, not the reviewer's —
 * without this the card rendered as "Pending Faculty approval" with a reminder button, so the
 * student sat waiting on a queue nobody was going to act on. */
function opportunityNeedsRevision(op: OpportunityRow): boolean {
    return (
        op.workflow_stage === "revision" ||
        op.status === "revision" ||
        op.faculty_approval_status === "revision_requested" ||
        op.partner_approval_status === "revision_requested" ||
        op.admin_approval_status === "revision_requested"
    );
}

function facultyNode(op: OpportunityRow): JourneyNode {
    if (op.faculty_approval_status === "rejected") return { title: "1. Faculty", detail: "Rejected", state: "rejected" };
    if (op.faculty_approval_status === "approved") return { title: "1. Faculty ✓", detail: "Approved", state: "complete" };
    if (
        op.faculty_approval_status === "not_applicable" ||
        op.faculty_approval_status === "not_required" ||
        op.faculty_approval_status === "skipped"
    ) {
        return { title: "1. Faculty ✓", detail: "Not required", state: "complete" };
    }
    return { title: "1. Faculty", detail: "Pending approval", state: "current" };
}

function partnerNode(op: OpportunityRow, faculty: JourneyNode): JourneyNode {
    if (!op.requires_partner_approval) return { title: "2. Partner ✓", detail: "Not required", state: "complete" };
    if (op.partner_approval_status === "rejected") return { title: "2. Partner", detail: "Rejected", state: "rejected" };
    if (op.partner_approval_status === "approved") return { title: "2. Partner ✓", detail: "Approved", state: "complete" };
    if (faculty.state === "complete") return { title: "2. Partner", detail: "Pending approval", state: "current" };
    return { title: "2. Partner", detail: "Waiting for Faculty", state: "locked" };
}

function cielNode(op: OpportunityRow, faculty: JourneyNode, partner: JourneyNode): JourneyNode {
    if (op.admin_approval_status === "rejected" || op.status === "rejected") {
        return { title: "3. CIEL PK", detail: "Rejected", state: "rejected" };
    }
    if (opportunityFullyApproved(op)) return { title: "3. CIEL PK ✓", detail: "Final approval", state: "complete" };
    if (faculty.state === "complete" && partner.state === "complete") {
        return { title: "3. CIEL PK", detail: "Pending final approval", state: "current" };
    }
    return {
        title: "3. CIEL PK",
        detail: partner.state === "current" ? "Waiting for Partner" : "Final review locked",
        state: "locked",
    };
}

function approvalsDone(nodes: JourneyNode[]): number {
    return nodes.filter((n) => n.state === "complete").length;
}

/** One Email + one WhatsApp action, each addressed to the actual contact when we have one on file
 * (falls back to an unaddressed mailto: / the generic WhatsApp share sheet when we don't) —
 * mirrors the named-recipient reminder pattern used in Coursework/FYP's cards. */
function buildReminderActions(
    title: string,
    role: string,
    contactName: string | null | undefined,
    contactEmail: string | null | undefined,
    style: WorkCard["actions"][number]["style"] = "blue",
): WorkCard["actions"] {
    const who = contactName?.trim() || role;
    const subject = `CIEL PK reminder — ${title}`;
    const body = `Hi ${who},\n\nA polite reminder that "${title}" is waiting for ${role} on CIEL PK.\n`;
    return [
        { label: `Email ${who}`, href: mailtoHref(contactEmail || "", subject, body), style },
        { label: `WhatsApp ${who}`, href: whatsappShareHref(`${subject}\n\n${body}`), style },
    ];
}

/** Submitting a report sets the backend status to `payment_pending` (public `pending_payment`) —
 * the reporting fee is the student's own next action, and Partner/CIEL PK verification is blocked
 * until it clears. Treating it as "Pending Faculty Approval" sent students to nag a reviewer who
 * could not move the record. Status strings mirror `utils/studentBrowseReportCta.ts`. */
const REPORT_FEE_STATUSES = new Set(["pending_payment", "payment_pending", "payment_under_review"]);

function reportAwaitingFee(row: ReportRow): boolean {
    return REPORT_FEE_STATUSES.has(normalizeReviewStatus(row.status));
}

function reportBucket(row: ReportRow): Exclude<WsFilter, "all"> {
    if (isCommunityReportRejected(row)) return "closed";
    if (isCommunityReportOnLiveDeck(row)) return "closed";
    const fac = normalizeReviewStatus(row.faculty_status);
    const st = normalizeReviewStatus(row.status);
    if (fac.includes("revision") || st.includes("revision")) return "revision";
    if (reportAwaitingFee(row)) return "report";
    if (!isReviewDraftStatus(row.status)) return "review";
    return "report";
}

function reportHref(row: Pick<ReportRow, "project_id" | "opportunity_id" | "id">): string {
    const id = row.project_id || row.opportunity_id || row.id;
    return `/dashboard/student/report?projectId=${encodeURIComponent(String(id))}`;
}

function reportPaymentHref(row: Pick<ReportRow, "project_id" | "opportunity_id" | "id">): string {
    const id = row.project_id || row.opportunity_id || row.id;
    return `/dashboard/student/payment?projectId=${encodeURIComponent(String(id))}`;
}

function actionClass(style: WorkCard["actions"][number]["style"]): string {
    switch (style) {
        case "primary":
            return "rounded-[9px] bg-[#174b43] px-2.5 py-2 text-[10px] font-black text-white";
        case "blue":
            return "rounded-[9px] bg-[#edf4fb] px-2.5 py-2 text-[10px] font-black text-[#376d9f]";
        case "purple":
            return "rounded-[9px] bg-[#f1eef8] px-2.5 py-2 text-[10px] font-black text-[#6b2bd9]";
        case "red":
            return "rounded-[9px] bg-[#fdeeee] px-2.5 py-2 text-[10px] font-black text-[#b34c4c]";
        default:
            return "rounded-[9px] bg-[#eef2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]";
    }
}

function nodeClass(state: NodeState): string {
    if (state === "complete") return "border-[#cfeadf] bg-[#eff9f5] text-[#1c765d]";
    if (state === "current") return "border-[#efddb7] bg-[#fff8e9] text-[#9d6810]";
    if (state === "rejected") return "border-[#f0c8c8] bg-[#fff5f5] text-[#b13e49]";
    return "border-[#dde5ea] bg-[#f5f7f8] text-[#98a3a8]";
}

export default function CommunityServiceWorkspace({
    projects,
    verifiedHours,
    wallCount,
    completion,
    initialFilter = "all",
}: {
    projects: ActiveProject[];
    verifiedHours: number;
    wallCount: number;
    completion: number;
    initialFilter?: WsFilter;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const filterParam = searchParams.get("filter");
    const filter: WsFilter = FILTERS.some((item) => item.key === filterParam) ? (filterParam as WsFilter) : initialFilter;
    const setFilter = (next: WsFilter) => {
        const qs = new URLSearchParams(searchParams.toString());
        qs.set("view", "workspace");
        if (next === "all") qs.delete("filter");
        else qs.set("filter", next);
        router.replace(`${HUB}?${qs.toString()}`, { scroll: false });
    };
    const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
    const [reports, setReports] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/student/opportunity/mine", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/student/reports?limit=100", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
        ]).then(([mine, reportJson]) => {
            if (cancelled) return;
            const rows = Array.isArray(mine?.data) ? (mine.data as Record<string, unknown>[]) : [];
            setOpportunities(
                rows
                    .filter((r) => r.status !== "draft")
                    .map((r) => ({
                        id: String(r.id),
                        title: String(r.title ?? "Untitled opportunity"),
                        status: typeof r.status === "string" ? r.status : undefined,
                        workflow_stage: (r.workflow_stage as string | null) ?? null,
                        faculty_approval_status: r.faculty_approval_status as ApprovalLineStatus,
                        partner_approval_status: r.partner_approval_status as ApprovalLineStatus,
                        admin_approval_status: r.admin_approval_status as ApprovalLineStatus,
                        requires_partner_approval: Boolean(r.requires_partner_approval),
                        created_at: typeof r.created_at === "string" ? r.created_at : undefined,
                        faculty_contact_name: (r.faculty_contact_name as string | null) ?? null,
                        faculty_contact_email: (r.faculty_contact_email as string | null) ?? null,
                        partner_contact_name: (r.partner_contact_name as string | null) ?? null,
                        partner_contact_email: (r.partner_contact_email as string | null) ?? null,
                    })),
            );
            setReports(Array.isArray(reportJson?.data) ? reportJson.data : []);
            setLoading(false);
        }).catch(() => {
            // A network failure must still clear the spinner — otherwise the workspace hangs
            // on "Loading workspace…" forever and reads as a broken page.
            if (!cancelled) setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const cards = useMemo(() => {
        const out: WorkCard[] = [];
        const reportByKey = new Map<string, ReportRow>();
        for (const report of reports) {
            if (report.opportunity_id) reportByKey.set(String(report.opportunity_id), report);
            if (report.project_id) reportByKey.set(String(report.project_id), report);
        }

        for (const op of opportunities) {
            const linked = reportByKey.get(op.id);
            if (linked) continue;
            if (!opportunityFullyApproved(op) && !opportunityRejected(op) && opportunityNeedsRevision(op)) {
                out.push({
                    id: `opp-${op.id}`,
                    filter: "revision",
                    stageLabel: "Stage 1 — Opportunity Approval",
                    title: op.title,
                    meta: formatSubmitted(op.created_at),
                    journeyHead: "REVISION REQUIRED",
                    journeySub: "Update the proposal and resubmit",
                    pills: [{ label: "Revision Required", kind: "rev" }],
                    note: {
                        kind: "comment",
                        body: "A reviewer asked for changes to this opportunity. Open it in Create Opportunity, update the requested details and resubmit — it will not move forward until you do.",
                    },
                    sideTitle: "Your Next Action",
                    sideDetail: "Edit the proposal and resubmit",
                    actions: [
                        {
                            label: "Edit & Resubmit",
                            href: `/dashboard/student/create-opportunity?edit=${encodeURIComponent(op.id)}`,
                            style: "primary",
                        },
                        { label: "View Opportunity", href: `/dashboard/student/browse/${encodeURIComponent(op.id)}`, style: "soft" },
                    ],
                });
                continue;
            }
            if (!opportunityFullyApproved(op) || opportunityRejected(op)) {
                const faculty = facultyNode(op);
                const partner = partnerNode(op, faculty);
                const ciel = cielNode(op, faculty, partner);
                const nodes = [faculty, partner, ciel];
                const done = approvalsDone(nodes);
                const current = nodes.find((n) => n.state === "current" || n.state === "rejected") ?? ciel;
                const who =
                    current.title.includes("Faculty")
                        ? "Faculty"
                        : current.title.includes("Partner")
                          ? "Partner"
                          : "CIEL PK";
                const remindActions: WorkCard["actions"] =
                    current.state === "current" && who !== "CIEL PK"
                        ? buildReminderActions(
                              op.title,
                              `${who} approval`,
                              who === "Partner" ? op.partner_contact_name : op.faculty_contact_name,
                              who === "Partner" ? op.partner_contact_email : op.faculty_contact_email,
                          )
                        : [
                              {
                                  label: "View Status",
                                  href: `/dashboard/student/browse/${encodeURIComponent(op.id)}`,
                                  style: "blue" as const,
                              },
                          ];
                out.push({
                    id: `opp-${op.id}`,
                    filter: "opportunity",
                    stageLabel: "Stage 1 — Opportunity Approval",
                    title: op.title,
                    meta: [formatSubmitted(op.created_at), op.requires_partner_approval ? "Partner involved" : ""]
                        .filter(Boolean)
                        .join(" · "),
                    journeyHead: "APPROVAL JOURNEY",
                    journeySub: opportunityRejected(op) ? "Rejected" : `${done} of 3 approvals complete`,
                    nodes,
                    note: {
                        kind: "notify",
                        title: "Workflow Update",
                        body:
                            faculty.state === "current"
                                ? "Submission confirmation sent. Faculty has the next action."
                                : partner.state === "current"
                                  ? "Faculty approved. Partner approval link sent automatically."
                                  : ciel.state === "current"
                                    ? "Faculty and Partner approved. Record has moved to CIEL PK for final approval."
                                    : opportunityRejected(op)
                                      ? "This opportunity was not approved. It will not move to the report stage."
                                      : "Waiting on the next approval step.",
                    },
                    sideTitle: "Current Status",
                    sideDetail:
                        current.state === "rejected"
                            ? `${who} rejected`
                            : `Pending ${who} ${who === "CIEL PK" ? "Approval" : "approval"}`,
                    actions: [
                        { label: "View Opportunity", href: `/dashboard/student/browse/${encodeURIComponent(op.id)}`, style: "soft" },
                        ...remindActions,
                    ],
                });
                continue;
            }

            out.push({
                id: `start-${op.id}`,
                filter: "report",
                stageLabel: "Stage 2 — Community Service Report",
                title: op.title,
                meta: "Opportunity fully approved",
                journeyHead: "OPPORTUNITY APPROVAL",
                journeySub: "All approvals complete ✓",
                nodes: [
                    { title: "Faculty ✓", detail: "Approved", state: "complete" },
                    {
                        title: op.requires_partner_approval ? "Partner ✓" : "Partner ✓",
                        detail: op.requires_partner_approval ? "Approved" : "Not required",
                        state: "complete",
                    },
                    { title: "CIEL PK ✓", detail: "Final approval", state: "complete" },
                ],
                note: {
                    kind: "success",
                    body: "Your opportunity is fully approved. You can now begin the Community Service Report.",
                },
                sideTitle: "Your Next Action",
                sideDetail: "Report has not been started",
                actions: [
                    { label: "Start Report", href: `/dashboard/student/report?projectId=${encodeURIComponent(op.id)}`, style: "primary" },
                    { label: "Report Guidance", href: GUIDE, style: "purple" },
                ],
            });
        }

        const seenReports = new Set<string>();
        for (const report of reports) {
            if (seenReports.has(report.id)) continue;
            seenReports.add(report.id);
            const bucket = reportBucket(report);
            const title = report.project_title || "Community service report";
            const href = reportHref(report);
            if (bucket === "report" && reportAwaitingFee(report)) {
                const underReview = normalizeReviewStatus(report.status) === "payment_under_review";
                out.push({
                    id: `rep-${report.id}`,
                    filter: "report",
                    stageLabel: "Stage 2 — Reporting Fee",
                    title,
                    meta: "Report submitted",
                    journeyHead: "REPORTING FEE",
                    journeySub: underReview ? "Payment proof under review" : "Payment required",
                    pills: [
                        { label: "Report Submitted", kind: "ok" },
                        {
                            label: underReview ? "Payment Under Review" : "Reporting Fee Due",
                            kind: underReview ? "wait" : "rev",
                        },
                    ],
                    note: {
                        kind: "notify",
                        title: "Reporting Fee",
                        body: underReview
                            ? "Your payment proof is with CIEL PK. Partner and CIEL PK verification continues once it is approved."
                            : "Your report is submitted. The reporting fee must be submitted and approved before Partner and CIEL PK can verify this report.",
                    },
                    sideTitle: underReview ? "Current Status" : "Your Next Action",
                    sideDetail: underReview ? "Payment proof under review" : "Submit the reporting fee",
                    actions: [
                        {
                            label: underReview ? "View Payment" : "Pay Reporting Fee",
                            href: reportPaymentHref(report),
                            style: underReview ? "soft" : "primary",
                        },
                        { label: "View Submitted Report", href, style: "soft" },
                    ],
                });
                continue;
            }
            if (bucket === "report") {
                out.push({
                    id: `rep-${report.id}`,
                    filter: "report",
                    stageLabel: "Stage 2 — Community Service Report",
                    title,
                    meta: report.organization_name && report.organization_name !== "N/A" ? report.organization_name : "Draft auto-saved",
                    journeyHead: "REPORT IN PROGRESS",
                    journeySub: "Draft — not submitted",
                    note: {
                        kind: "notify",
                        title: "Draft Status",
                        body: "Your unfinished report stays editable. Nothing is sent to Faculty until you press Submit Report.",
                    },
                    sideTitle: "Your Next Action",
                    sideDetail: "Continue your report",
                    actions: [
                        { label: "Continue Report", href, style: "primary" },
                        { label: "Save & Close", href: HUB, style: "soft" },
                    ],
                });
                continue;
            }
            if (bucket === "review") {
                out.push({
                    id: `rep-${report.id}`,
                    filter: "review",
                    stageLabel: "Stage 2 — Faculty Report Decision",
                    title,
                    meta: "Report submitted",
                    journeyHead: "REPORT SUBMITTED",
                    journeySub: "Faculty decision pending",
                    pills: [
                        { label: "Report Submitted", kind: "ok" },
                        { label: "Pending Faculty Approval", kind: "wait" },
                    ],
                    note: {
                        kind: "notify",
                        title: "Faculty Options",
                        body: "Faculty may Approve, Request Revision, or Reject. Your submitted version is locked while under review.",
                    },
                    sideTitle: "Current Status",
                    sideDetail: "Pending Faculty Approval",
                    actions: [
                        { label: "View Submitted Report", href, style: "soft" },
                        ...buildReminderActions(title, "faculty review", report.faculty_name, report.faculty_email),
                    ],
                });
                continue;
            }
            if (bucket === "revision") {
                out.push({
                    id: `rep-${report.id}`,
                    filter: "revision",
                    stageLabel: "Stage 2 — Faculty Report Decision",
                    title,
                    meta: "Faculty decision received",
                    journeyHead: "REVISION REQUIRED",
                    journeySub: "Edit the marked sections and resubmit",
                    pills: [{ label: "Revision Required", kind: "rev" }],
                    note: {
                        kind: "comment",
                        body: "Faculty asked for changes. Open the report to see the comments and resubmit.",
                    },
                    sideTitle: "Your Next Action",
                    sideDetail: "Edit the requested sections and resubmit",
                    actions: [
                        { label: "View All Comments", href, style: "red" },
                        { label: "Revise Report", href, style: "primary" },
                    ],
                });
                continue;
            }
            const rejected = isCommunityReportRejected(report);
            out.push({
                id: `rep-${report.id}`,
                filter: "closed",
                stageLabel: "Stage 2 — Faculty Report Decision",
                title,
                meta: "Final decision received",
                journeyHead: rejected ? "REPORT REJECTED" : "REPORT APPROVED",
                journeySub: rejected ? "Record closed" : "Verified ✓",
                pills: [{ label: rejected ? "Report Rejected" : "Report Approved", kind: rejected ? "rev" : "ok" }],
                note: rejected
                    ? {
                          kind: "comment",
                          body: "This record will not enter the verified impact portfolio.",
                      }
                    : {
                          kind: "success",
                          body: "Your verified flashcard has been generated and added to My Community Service Impact and My Impact Portfolio.",
                      },
                sideTitle: "Final Status",
                sideDetail: rejected ? "Rejected — not added to impact portfolio" : "Approved & transferred to portfolio",
                actions: rejected
                    ? [{ label: "View Faculty Decision", href, style: "soft" }]
                    : [
                          { label: "View Impact Record", href, style: "primary" },
                          { label: "My Community Impact", href: WALL, style: "soft" },
                      ],
            });
        }

        for (const project of projects) {
            if (reportByKey.has(project.id)) continue;
            if (opportunities.some((op) => op.id === project.id)) continue;
            out.push({
                id: `proj-${project.id}`,
                filter: "report",
                stageLabel: "Stage 2 — Community Service Report",
                title: project.title,
                meta: project.category ? `${project.category} · Joined engagement` : "Joined engagement",
                journeyHead: "REPORT",
                journeySub: project.report_status ? project.report_status.replace(/_/g, " ") : "Not started",
                sideTitle: "Your Next Action",
                sideDetail: project.report_status ? "Continue your report" : "Start your report",
                actions: [
                    {
                        label: project.report_status ? "Continue Report" : "Start Report",
                        href: `/dashboard/student/report?projectId=${encodeURIComponent(project.id)}`,
                        style: "primary",
                    },
                    { label: "Report Guidance", href: GUIDE, style: "purple" },
                ],
            });
        }

        return out;
    }, [opportunities, reports, projects]);

    const visible = filter === "all" ? cards : cards.filter((c) => c.filter === filter);
    const kpis = {
        opportunity: cards.filter((c) => c.filter === "opportunity").length,
        report: cards.filter((c) => c.filter === "report").length,
        review: cards.filter((c) => c.filter === "review").length,
        revision: cards.filter((c) => c.filter === "revision").length,
    };

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <MockupHero
                title="Community Service"
                subtitle="Create opportunities, save drafts, follow Faculty → Partner → CIEL PK approvals, complete your 9-section report and build a verified Community Service impact record."
                stats={[
                    { value: String(projects.length), label: "Active Records" },
                    { value: verifiedHours ? `${Math.round(verifiedHours)}h` : "0h", label: "Verified Service" },
                    { value: String(wallCount), label: "Impact Portfolio" },
                ]}
                rightStat={{ value: `${completion}%`, label: "overall current-work completion" }}
            />

            <MockupSectionHead
                title="Community Service Workspace"
                subtitle="Track sequential opportunity approvals, report completion, faculty decisions, revisions and final outcomes."
                action={
                    <Link href={HUB} className="border-0 bg-transparent text-xs font-black text-[#087c75] hover:underline">
                        ← Back to module buttons
                    </Link>
                }
            />

            <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => setFilter(item.key)}
                        className={`rounded-[18px] border px-2.5 py-[7px] text-[11px] font-[850] ${
                            filter === item.key
                                ? "border-[#153f47] bg-[#153f47] text-white"
                                : "border-[#dde5ea] bg-white text-[#5c6d76]"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                {(
                    [
                        ["opportunity", "Opportunity Approval", kpis.opportunity],
                        ["report", "Reports in Progress", kpis.report],
                        ["review", "Faculty Review", kpis.review],
                        ["revision", "Action Required", kpis.revision],
                    ] as const
                ).map(([key, label, value]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setFilter(key)}
                        className="rounded-[14px] border border-[#dde5ea] bg-white p-3 text-left"
                    >
                        <span className="block text-[9px] font-black uppercase tracking-[0.06em] text-[#70808a]">{label}</span>
                        <strong className="mt-1.5 block text-lg text-[#16313d]">{value}</strong>
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="mt-8 text-center text-sm text-[#7a919a]">Loading workspace…</p>
            ) : visible.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-[#cbe7e3] bg-[#fbfefd] px-5 py-10 text-center text-[12px] text-[#7a919a]">
                    Nothing in this filter yet. Create or join an opportunity to start tracking approvals and reports.
                </div>
            ) : (
                <div className="mt-4 grid gap-3.5">
                    {visible.map((card) => (
                        <article
                            key={card.id}
                            className="grid grid-cols-1 gap-4 rounded-[17px] border border-[#dde5ea] bg-white p-4 lg:grid-cols-[minmax(0,1fr)_300px]"
                        >
                            <div>
                                <div className="inline-flex items-center gap-1.5 text-[9px] font-[950] uppercase tracking-[0.07em] text-[#547079] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[#18a48e] before:content-['']">
                                    {card.stageLabel}
                                </div>
                                <h4 className="mt-1.5 text-[15px] font-semibold text-[#16313d]">{card.title}</h4>
                                {card.meta ? <p className="mt-0.5 text-[10.5px] text-[#70808a]">{card.meta}</p> : null}

                                {card.journeyHead || card.nodes ? (
                                    <div className="mt-3 rounded-[13px] border border-[#e8edef] bg-[#fafbfb] p-3">
                                        {card.journeyHead ? (
                                            <div className="mb-2 flex justify-between gap-2.5 text-[10.5px] font-black text-[#435660]">
                                                <span>{card.journeyHead}</span>
                                                {card.journeySub ? <span>{card.journeySub}</span> : null}
                                            </div>
                                        ) : null}
                                        {card.nodes ? (
                                            <div className="flex items-stretch gap-1.5 overflow-auto pb-0.5">
                                                {card.nodes.map((node, i) => (
                                                    <span key={node.title} className="flex items-center gap-1.5">
                                                        <span className={`min-w-[118px] rounded-xl border px-2.5 py-2 ${nodeClass(node.state)}`}>
                                                            <b className="block text-[9.5px]">{node.title}</b>
                                                            <small className="mt-0.5 block text-[8.8px] opacity-80">{node.detail}</small>
                                                        </span>
                                                        {i < card.nodes!.length - 1 ? (
                                                            <span className="shrink-0 text-xs font-black text-[#a6b2b6]">→</span>
                                                        ) : null}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                        {card.pills ? (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {card.pills.map((pill) => (
                                                    <span
                                                        key={pill.label}
                                                        className={`rounded-[18px] px-2 py-1 text-[9.5px] font-black ${
                                                            pill.kind === "ok"
                                                                ? "bg-[#e8f5ef] text-[#1d765d]"
                                                                : pill.kind === "wait"
                                                                  ? "bg-[#fff3dc] text-[#a66d11]"
                                                                  : "bg-[#fdeeee] text-[#b34c4c]"
                                                        }`}
                                                    >
                                                        {pill.label}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                {card.note ? (
                                    <div
                                        className={`mt-2.5 rounded-[11px] p-2.5 text-[10px] leading-relaxed ${
                                            card.note.kind === "success"
                                                ? "bg-[#eff9f5] text-[#246c59]"
                                                : card.note.kind === "comment"
                                                  ? "border-l-[3px] border-[#c95c5c] bg-[#fff7f7] text-[#704a4a]"
                                                  : "border border-[#dde5ea] bg-[#f6fafb] text-[#62737b]"
                                        }`}
                                    >
                                        {card.note.title ? <b className="block text-[10px] text-[#16313d]">{card.note.title}</b> : null}
                                        {card.note.kind === "notify" ? (
                                            <div className="mt-1">
                                                <span className="mr-1 rounded-xl bg-[#edf4fb] px-1.5 py-0.5 text-[9px] font-black text-[#376d9f]">
                                                    Email
                                                </span>
                                                <span className="mr-1 rounded-xl bg-[#f8f2e7] px-1.5 py-0.5 text-[9px] font-black text-[#765b25]">
                                                    WhatsApp
                                                </span>
                                            </div>
                                        ) : null}
                                        <p className="mt-1">{card.note.body}</p>
                                    </div>
                                ) : null}
                            </div>

                            <div className="lg:border-l lg:border-[#dde5ea] lg:pl-3.5">
                                <div className="rounded-xl border border-[#dde5ea] bg-[#f8fafb] p-2.5">
                                    <b className="block text-[11px] text-[#16313d]">{card.sideTitle}</b>
                                    <small className="mt-1 block text-[10px] text-[#70808a]">{card.sideDetail}</small>
                                </div>
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    {card.actions.map((action) =>
                                        action.href.startsWith("mailto:") ? (
                                            <a key={action.label} href={action.href} className={actionClass(action.style)}>
                                                {action.label}
                                            </a>
                                        ) : /^https?:\/\//.test(action.href) ? (
                                            <a
                                                key={action.label}
                                                href={action.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={actionClass(action.style)}
                                            >
                                                {action.label}
                                            </a>
                                        ) : (
                                            <Link key={action.label} href={action.href} className={actionClass(action.style)}>
                                                {action.label}
                                            </Link>
                                        ),
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
