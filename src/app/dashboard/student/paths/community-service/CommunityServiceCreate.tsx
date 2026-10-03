"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { fetchStudentOpportunityMine, peekStudentOpportunityMine } from "@/utils/student-community-cache";
import { toast } from "sonner";
import {
    CommunityCrumb,
    EmptyPanel,
    HubTabs,
} from "@/components/ciel/community-service/CommunityServiceHubChrome";
import DraftsLandingView from "@/app/dashboard/student/create-opportunity/DraftsLandingView";
import { ApprovalChain, buildOpportunityApprovalModel } from "@/components/ciel/community-service/OpportunityApprovalCard";
import { formatSentWaiting, whatsappHrefFromE164 } from "@/utils/reminderLinks";
import {
    canEditReturnedOpportunity,
    isOpportunityPermanentlyRejected,
    isStudentOpportunityLiveForReporting,
} from "@/utils/opportunityWorkflow";
import { canStudentShowStartReportCta } from "@/utils/studentJoinApplication";
import {
    buildStudentReportsCheckMap,
    pickReportStatusFromCheckRow,
    resolveStudentBrowseReportCta,
} from "@/utils/studentBrowseReportCta";
import { readStoredCurrentUser } from "@/utils/currentUser";

const HUB = "/dashboard/student/paths/community-service";
const CREATE_FORM = "/dashboard/student/create-opportunity?new=1";
const WORKSPACE_READY = `${HUB}?view=workspace&filter=ready`;

export const CREATE_TABS = [
    { id: "all", label: "All" },
    { id: "drafts", label: "Drafts" },
    { id: "review", label: "Under Review" },
    { id: "action", label: "Action Required" },
    { id: "closed", label: "Rejected / Closed" },
    { id: "history", label: "Published / Live" },
] as const;

export type CreateTab = (typeof CREATE_TABS)[number]["id"];
type StatusTab = Exclude<CreateTab, "all">;

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

type MineRow = {
    id: string;
    title: string;
    status?: string;
    workflow_stage?: string | null;
    faculty_approval_status?: ApprovalLineStatus;
    partner_approval_status?: ApprovalLineStatus;
    admin_approval_status?: ApprovalLineStatus;
    requires_partner_approval?: boolean;
    created_at?: string;
    updated_at?: string;
    faculty_contact_name?: string | null;
    faculty_contact_email?: string | null;
    faculty_contact_phone?: string | null;
    partner_contact_name?: string | null;
    partner_contact_email?: string | null;
    partner_contact_phone?: string | null;
    admin_approved?: boolean;
    report_status?: string | null;
    rejection_reason?: string | null;
    public_code?: string | null;
    currently_with?: string | null;
    currently_with_role?: string | null;
    next_step?: string | null;
    waiting_since?: string | null;
    approval_route?: {
        faculty?: string;
        partner?: string;
        admin?: string;
        student?: string;
    };
};

function isCreateTab(value: string | null): value is CreateTab {
    return CREATE_TABS.some((tab) => tab.id === value);
}

/** Approved / Live tab = truly live for reporting only (same gate as Team/Live node unlock). */
function opportunityFullyApproved(op: MineRow): boolean {
    return isStudentOpportunityLiveForReporting(op as unknown as Record<string, unknown>);
}

function lineDone(status: ApprovalLineStatus): boolean {
    return (
        status === "approved" ||
        status === "skipped" ||
        status === "not_applicable" ||
        status === "not_required"
    );
}

function lineBlocked(status: ApprovalLineStatus): boolean {
    return status === "rejected" || status === "revision_requested";
}

function mapMineRow(r: Record<string, unknown>): MineRow {
    return {
        id: String(r.id),
        title: String(r.title ?? "Untitled opportunity"),
        status: typeof r.status === "string" ? r.status : undefined,
        workflow_stage: (r.workflow_stage as string | null) ?? null,
        faculty_approval_status: r.faculty_approval_status as ApprovalLineStatus,
        partner_approval_status: r.partner_approval_status as ApprovalLineStatus,
        admin_approval_status: r.admin_approval_status as ApprovalLineStatus,
        requires_partner_approval: Boolean(r.requires_partner_approval),
        created_at: typeof r.created_at === "string" ? r.created_at : undefined,
        updated_at: typeof r.updated_at === "string" ? r.updated_at : undefined,
        faculty_contact_name: (r.faculty_contact_name as string | null) ?? null,
        faculty_contact_email: (r.faculty_contact_email as string | null) ?? null,
        faculty_contact_phone: (r.faculty_contact_phone as string | null) ?? null,
        partner_contact_name: (r.partner_contact_name as string | null) ?? null,
        partner_contact_email: (r.partner_contact_email as string | null) ?? null,
        partner_contact_phone: (r.partner_contact_phone as string | null) ?? null,
        admin_approved: r.admin_approved === true,
        rejection_reason: (r.rejection_reason as string | null) ?? null,
        public_code: typeof r.public_code === "string" ? r.public_code : null,
        currently_with: typeof r.currently_with === "string" ? r.currently_with : null,
        currently_with_role: typeof r.currently_with_role === "string" ? r.currently_with_role : null,
        next_step: typeof r.next_step === "string" ? r.next_step : null,
        waiting_since: typeof r.waiting_since === "string" ? r.waiting_since : null,
        approval_route:
            r.approval_route && typeof r.approval_route === "object" && !Array.isArray(r.approval_route)
                ? (r.approval_route as MineRow["approval_route"])
                : undefined,
        report_status: typeof r.report_status === "string" ? r.report_status : null,
    };
}

export function createTabOf(op: MineRow): StatusTab {
    if (op.status === "draft") return "drafts";
    if (canEditReturnedOpportunity(op as unknown as Record<string, unknown>)) return "action";
    if (isOpportunityPermanentlyRejected(op as unknown as Record<string, unknown>)) return "closed";
    if (opportunityFullyApproved(op)) return "history";
    const role = String(op.currently_with_role || "").toLowerCase();
    if (
        (role === "none" || role === "") &&
        (op.admin_approved || lineDone(op.admin_approval_status)) &&
        lineDone(op.faculty_approval_status) &&
        (!op.requires_partner_approval || lineDone(op.partner_approval_status))
    ) {
        return "history";
    }
    return "review";
}

function pendingReviewerRole(op: MineRow): "faculty" | "partner" | "admin" | "none" {
    const role = String(op.currently_with_role || "").toLowerCase();
    if (role === "faculty" || role === "partner" || role === "admin") return role;
    if (role === "none" || role === "student") return "none";
    if (!lineDone(op.faculty_approval_status) && !lineBlocked(op.faculty_approval_status)) return "faculty";
    if (op.requires_partner_approval && !lineDone(op.partner_approval_status) && !lineBlocked(op.partner_approval_status)) {
        return "partner";
    }
    if (!lineDone(op.admin_approval_status) && !lineBlocked(op.admin_approval_status) && !op.admin_approved) {
        return "admin";
    }
    return "none";
}

function currentReviewer(op: MineRow): string {
    const role = pendingReviewerRole(op);
    if (role === "faculty") return op.faculty_contact_name?.trim() || "Faculty";
    if (role === "partner") return op.partner_contact_name?.trim() || "Partner / NGO";
    if (role === "admin") return "CIEL PK";
    return op.currently_with?.trim() || "CIEL PK";
}

/** Which stage is currently pending, for the "Pending X" badge on Under Review cards. */
function pendingStageLabel(op: MineRow): string {
    const role = pendingReviewerRole(op);
    if (role === "faculty") return "Pending Faculty";
    if (role === "partner") return "Pending Partner";
    if (role === "admin") return "Pending CIEL PK";
    return "Approved";
}

function formatWhen(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const ROAD: { n: string; title: string; sub: string; optional?: boolean; finish?: boolean }[] = [
    { n: "1", title: "Draft", sub: "Save before submitting" },
    { n: "2", title: "Faculty", sub: "if required" },
    { n: "3", title: "Partner / NGO", sub: "if selected", optional: true },
    { n: "4", title: "CIEL PK", sub: "Final review" },
    { n: "5", title: "Published / Live", sub: "Based on visibility", finish: true },
];

const EMPTY: Record<CreateTab, { title: string; text: string }> = {
    all: {
        title: "No opportunities yet",
        text: "Use the button above to start tracking a proposal from draft to publication.",
    },
    drafts: {
        title: "No drafts",
        text: "Saved drafts will appear here before you submit for review.",
    },
    review: {
        title: "Nothing under review",
        text: "No opportunity is waiting for Faculty, Partner, or CIEL PK right now.",
    },
    action: {
        title: "No changes requested",
        text: "You have no revision requests at the moment.",
    },
    closed: {
        title: "No rejected or closed opportunities",
        text: "Rejected or closed proposals will appear here.",
    },
    history: {
        title: "Nothing published yet",
        text: "Approved opportunities appear here after CIEL PK publishes them.",
    },
};

export default function CommunityServiceCreate() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const filterParam = searchParams.get("filter");
    const focusId = searchParams.get("opportunity");
    const cachedMine = peekStudentOpportunityMine();
    const [rows, setRows] = useState<MineRow[]>(() => (cachedMine ?? []).map(mapMineRow));
    const [loading, setLoading] = useState(!cachedMine);
    const [showDraftExistsModal, setShowDraftExistsModal] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const list = await fetchStudentOpportunityMine();
                if (cancelled) return;
                setRows(list.map(mapMineRow));
                setLoading(false);

                const studentId = String(readStoredCurrentUser()?.id || "").trim();
                if (!studentId) return;
                const reportsRes = await authenticatedFetch(
                    `/api/v1/students/reports/check?studentId=${encodeURIComponent(studentId)}`,
                    {},
                    { redirectToLogin: false },
                );
                if (cancelled || !reportsRes?.ok) return;
                const reportsJson = (await reportsRes.json()) as { success?: boolean; data?: unknown };
                if (!reportsJson.success || !Array.isArray(reportsJson.data)) return;
                const reportMap = buildStudentReportsCheckMap(reportsJson.data);
                setRows((prev) =>
                    prev.map((row) => ({
                        ...row,
                        report_status: pickReportStatusFromCheckRow(reportMap.get(row.id)) || row.report_status || null,
                    })),
                );
            } catch {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const submitted = useMemo(() => rows.filter((row) => row.status !== "draft"), [rows]);
    const counts = useMemo(() => {
        const next: Record<CreateTab, number> = {
            all: rows.length,
            drafts: 0,
            review: 0,
            action: 0,
            closed: 0,
            history: 0,
        };
        for (const row of rows) next[createTabOf(row)] += 1;
        return next;
    }, [rows]);

    const tab: CreateTab = isCreateTab(filterParam)
        ? filterParam
        : counts.action
          ? "action"
          : counts.review
            ? "review"
            : "all";

    const setTab = (next: string) => {
        const qs = new URLSearchParams();
        qs.set("view", "create");
        qs.set("filter", next);
        // Drop focused opportunity when switching tabs so the list for the new tab is clear.
        router.replace(`${HUB}?${qs.toString()}`, { scroll: false });
    };

    const list = tab === "all" ? submitted : submitted.filter((row) => createTabOf(row) === tab);

    useEffect(() => {
        if (!focusId || loading) return;
        const el = document.getElementById(`cs-opp-${focusId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [focusId, loading, tab]);

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <CommunityCrumb role="Student" view="My Opportunities" />
            <div className="mb-2 mt-4 sm:mt-[23px]">
                <Link href={HUB} className="inline-flex border-0 bg-transparent text-xs font-black text-[#087c75] hover:underline">
                    ← Back to Community Service
                </Link>
            </div>
            <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                    <h1 className="m-0 text-[26px] font-bold tracking-tight text-[#16313d] sm:text-[32px]">My Opportunities</h1>
                    <p className="mt-1.5 max-w-[640px] text-[13px] leading-relaxed text-[#70808a]">
                        Track your opportunities from draft to publication.
                        <br className="hidden sm:block" />
                        View approval progress and respond to reviewer feedback.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        const hasDraft = rows.some((r) => r.status === "draft");
                        if (hasDraft) setShowDraftExistsModal(true);
                        else router.push(CREATE_FORM);
                    }}
                    className="w-full shrink-0 rounded-xl bg-[#174b43] px-[15px] py-[11px] text-center text-[11px] font-[950] text-white sm:w-auto"
                >
                    + Create Opportunity
                </button>
            </div>

            {showDraftExistsModal ? (() => {
                const mostRecentDraft = [...rows]
                    .filter((r) => r.status === "draft")
                    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())[0];
                return (
                    <div
                        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowDraftExistsModal(false)}
                    >
                        <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.07em] text-[#b34c4c]">Draft already exists</p>
                            <h3 className="mt-1.5 text-[16px] font-bold text-[#16313d]">
                                Continue your existing Community Service opportunity?
                            </h3>
                            {mostRecentDraft ? (
                                <p className="mt-2 text-[12px] text-[#3c5968]">
                                    “{mostRecentDraft.title || "Untitled opportunity"}” is still saved as a draft.
                                </p>
                            ) : null}
                            <p className="mt-3 text-[11px] leading-relaxed text-[#70808a]">
                                You can continue that draft, or start a brand-new opportunity if this is genuinely a different proposal.
                            </p>
                            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowDraftExistsModal(false)}
                                    className="rounded-[10px] border border-[#dde5ea] px-3 py-2 text-[10px] font-black text-[#3c5968]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.push(CREATE_FORM)}
                                    className="rounded-[10px] border border-[#dde5ea] bg-[#edf3f6] px-3 py-2 text-[10px] font-black text-[#3c5968]"
                                >
                                    Create Different Opportunity
                                </button>
                                {mostRecentDraft ? (
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/dashboard/student/create-opportunity?edit=${encodeURIComponent(mostRecentDraft.id)}&draft=1`)}
                                        className="rounded-[10px] bg-[#174b43] px-3 py-2 text-[10px] font-black text-white"
                                    >
                                        Continue Existing
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                );
            })() : null}

            <div className="mt-1 rounded-[16px] border border-[#dce6ea] bg-white p-4">
                <p className="mb-3 text-[13px] font-semibold text-[#16313d]">Approval flow</p>
                <div className="-mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
                    {ROAD.map((step, i) => (
                        <span key={step.n} className="flex shrink-0 items-center gap-2">
                            <span
                                className={
                                    "whitespace-nowrap rounded-xl border px-3 py-2 " +
                                    (i === 0
                                        ? "border-[#cfeadf] bg-[#eff9f5]"
                                        : step.finish
                                          ? "border-[#dce6ea] bg-[#f7fafb]"
                                          : step.optional
                                            ? "border-dashed border-[#dce6ea] bg-white"
                                            : "border-[#dde5ea] bg-white")
                                }
                            >
                                <span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-[#16313d] text-[9px] font-black text-white">
                                    {step.n}
                                </span>
                                <b className="text-[11px] text-[#16313d]">{step.title}</b>
                                <small className="ml-1.5 hidden text-[10px] text-[#70808a] sm:inline">{step.sub}</small>
                            </span>
                            {i < ROAD.length - 1 ? <span className="font-black text-[#a8b6bb]">→</span> : null}
                        </span>
                    ))}
                </div>
                <p className="mt-3 text-[11px] italic text-[#70808a]">
                    Any reviewer may request changes or reject an opportunity during review.
                </p>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                {[
                    [String(counts.all), "Total Opportunities"],
                    [String(counts.review), "Under Review"],
                    [String(counts.action), "Action Required"],
                    [String(counts.history), "Published / Live"],
                ].map(([value, label]) => (
                    <div key={label} className="rounded-[14px] border border-[#dde5ea] bg-white p-3">
                        <strong className="block text-lg text-[#16313d]">{value}</strong>
                        <span className="mt-0.5 block text-[10px] font-semibold text-[#70808a]">{label}</span>
                    </div>
                ))}
            </div>

            <div className="mt-4">
                <HubTabs
                    tabs={CREATE_TABS.map((item) => ({ id: item.id, label: item.label, count: counts[item.id] }))}
                    active={tab}
                    onChange={setTab}
                />
            </div>

            {tab === "drafts" ? (
                <DraftsLandingView embedded hideIntro />
            ) : loading ? (
                <p className="mt-6 text-center text-sm text-[#7a919a]">Loading proposals…</p>
            ) : tab === "all" && rows.length === 0 ? (
                <EmptyPanel title={EMPTY.all.title} text={EMPTY.all.text} />
            ) : tab === "all" ? (
                <div className="grid gap-3.5">
                    {counts.drafts > 0 ? <DraftsLandingView embedded hideIntro /> : null}
                    {list.map((op) => (
                        <ProposalCard key={op.id} op={op} tab={createTabOf(op)} highlighted={focusId === op.id} />
                    ))}
                </div>
            ) : list.length === 0 ? (
                <EmptyPanel
                    title={EMPTY[tab].title}
                    text={EMPTY[tab].text}
                    mark={tab === "action" ? "ok" : undefined}
                />
            ) : (
                <div className="grid gap-3.5">
                    {list.map((op) => (
                        <ProposalCard key={op.id} op={op} tab={tab} highlighted={focusId === op.id} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ProposalCard({ op, tab, highlighted }: { op: MineRow; tab: StatusTab; highlighted?: boolean }) {
    const reviewerRole = pendingReviewerRole(op);
    const who = currentReviewer(op);
    const [sendingEmail, setSendingEmail] = useState(false);
    const editHref = `/dashboard/student/create-opportunity?edit=${encodeURIComponent(op.id)}`;
    const viewHref = `/dashboard/student/browse/${encodeURIComponent(op.id)}`;
    const publicCode = op.public_code || "";
    const openPath =
        reviewerRole === "partner"
            ? op.approval_route?.partner
            : reviewerRole === "admin"
              ? op.approval_route?.admin
              : op.approval_route?.faculty;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const openUrl = openPath ? `${origin}${openPath}` : "";
    const remindSubject = publicCode
        ? `CIEL PK Community Service Approval · ${publicCode}`
        : `CIEL PK reminder — ${op.title}`;
    const remindBody = [
        "CIEL PK · Approval Reminder",
        `Opportunity: ${op.title}`,
        publicCode ? `ID: ${publicCode}` : "",
        `Current Status: ${op.currently_with || who}`,
        op.next_step ? `Next: ${op.next_step}` : "",
        "",
        "Please review the opportunity when convenient.",
        openUrl ? `Open Approval: ${openUrl}` : "",
    ]
        .filter((line) => line !== "")
        .join("\n");
    const canRemindReviewer =
        tab === "review" && (reviewerRole === "faculty" || reviewerRole === "partner" || reviewerRole === "admin");
    const reviewerPhone =
        reviewerRole === "faculty"
            ? op.faculty_contact_phone
            : reviewerRole === "partner"
              ? op.partner_contact_phone
              : null;
    const whatsappHref = canRemindReviewer ? whatsappHrefFromE164(reviewerPhone, remindBody) : null;
    const sentWaiting = formatSentWaiting(op.waiting_since);
    const oppRecord: Record<string, unknown> = {
        ...op,
        is_student_created: true,
        isStudentCreated: true,
        is_student_owner: true,
        isStudentOwner: true,
        admin_approved: op.admin_approved === true,
        status: op.status,
        faculty_approval_status: op.faculty_approval_status,
        partner_approval_status: op.partner_approval_status,
        admin_approval_status: op.admin_approval_status,
        requires_partner_approval: op.requires_partner_approval,
        workflow_stage: op.workflow_stage,
    };
    const reportCta = canStudentShowStartReportCta(oppRecord, { isStudentOwner: true })
        ? resolveStudentBrowseReportCta(op.id, op.report_status || undefined)
        : null;

    const sendReviewerEmail = async () => {
        if (sendingEmail || !canRemindReviewer) return;
        setSendingEmail(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/student/opportunity/${encodeURIComponent(op.id)}/remind-reviewer`,
                { method: "POST" },
            );
            const body = (await res?.json().catch(() => null)) as Record<string, unknown> | null;
            const raw = body?.message ?? body?.error;
            const message = Array.isArray(raw)
                ? raw.filter(Boolean).join(" ")
                : typeof raw === "string"
                  ? raw
                  : "";
            if (!res?.ok || body?.success === false) {
                toast.error(
                    message ||
                        "Email nahi gayi — mail server ne reject kiya. Thori dair baad dubara try karein.",
                );
                return;
            }
            const sentTo =
                (typeof body?.sent_to === "string" && body.sent_to) ||
                (typeof body?.partner_email === "string" && body.partner_email) ||
                "";
            toast.success(
                message ||
                    (sentTo
                        ? `Verification email sent to ${sentTo}. Inbox + Spam check karein.`
                        : `Verification email sent to ${who}. Inbox + Spam check karein.`),
            );
        } catch {
            toast.error("Could not send the email. Network/API check karein.");
        } finally {
            setSendingEmail(false);
        }
    };

    const chain = buildOpportunityApprovalModel(
        { ...op, isStudentCreated: true, student_name: "You" },
        "student",
        { mode: tab === "history" ? "decided" : tab === "closed" ? "decided" : tab === "action" ? "revision" : "pending" },
    );

    let statusTitle = pendingStageLabel(op);
    let statusText =
        reviewerRole === "admin"
            ? "Waiting for final platform approval"
            : reviewerRole === "none"
              ? "No reviewer is waiting on a decision right now."
              : `Waiting for ${who}`;
    // Student-facing "next action" must describe who is blocking NOW — not the step after them.
    let nextTitle =
        tab === "review"
            ? reviewerRole === "admin"
                ? "Waiting for CIEL PK"
                : reviewerRole === "none"
                  ? "No action required from you"
                  : `Waiting for ${who} to approve`
            : "No action required from you";
    let nextText =
        tab === "review"
            ? reviewerRole === "admin"
                ? `Use Email CIEL PK to resend the final verification reminder. Also check Spam/Junk on the CIEL inbox.`
                : reviewerRole === "none"
                  ? "This proposal is no longer waiting on a reviewer reminder."
                  : `Use Email ${who} to resend their verification link. Also ask them to check Spam/Junk.`
            : "This opportunity stays here until the current reviewer decides. You will be notified.";
    let tone: "ok" | "wait" | "rev" = reviewerRole === "none" && tab === "review" ? "ok" : "wait";

    if (tab === "action") {
        statusTitle = "Revision Required";
        statusText = "A reviewer asked for changes. Update the proposal and resubmit.";
        nextTitle = "Edit only what needs attention";
        nextText = "Open the form, apply the comments, and resubmit. It will not move forward until you do.";
        tone = "rev";
    } else if (tab === "closed") {
        statusTitle = "Rejected — Closed";
        statusText = "This opportunity was not approved.";
        nextTitle = "No further workflow";
        nextText = "The closed record remains available for transparency and audit history.";
        tone = "rev";
    } else if (tab === "history") {
        statusTitle = "Approved ✓";
        statusText = "Opportunity approval is complete.";
        nextTitle = "Moved to My Reports";
        nextText = "Start Report is waiting there. This card stays here as history only.";
        tone = "ok";
    }

    return (
        <article
            id={`cs-opp-${op.id}`}
            className={
                "grid grid-cols-1 gap-4 rounded-[17px] border bg-white p-4 lg:grid-cols-[minmax(0,1fr)_280px] " +
                (highlighted ? "border-[#0e7d74] shadow-[0_0_0_3px_rgba(14,125,116,0.15)]" : "border-[#dde5ea]")
            }
        >
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <h4 className="m-0 text-[15px] font-semibold text-[#16313d]">{op.title}</h4>
                    {op.public_code ? (
                        <span className="rounded-lg bg-[#eef3f5] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#3f5661]">{op.public_code}</span>
                    ) : null}
                    <span className="rounded-[18px] bg-[#edf4fb] px-2 py-0.5 text-[9.5px] font-black text-[#376d9f]">Created by You</span>
                    <span
                        className={
                            "rounded-[18px] px-2 py-0.5 text-[9.5px] font-black " +
                            (tone === "ok"
                                ? "bg-[#e8f5ef] text-[#1d765d]"
                                : tone === "rev"
                                  ? "bg-[#fdeeee] text-[#b34c4c]"
                                  : "bg-[#fff3dc] text-[#a66d11]")
                        }
                    >
                        {statusTitle}
                    </span>
                </div>
                <p className="mt-1 text-[10.5px] text-[#70808a]">Last opportunity activity {formatWhen(op.updated_at || op.created_at) || "—"}</p>
                <div className="mt-3 rounded-[13px] border border-[#e8edef] bg-[#fafbfb] p-3">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.04em] text-[#4d6069]">
                        <span>Approval chain</span>
                        <span className="rounded-lg bg-[#f1eef8] px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-[#6b2bd9]">{chain.versionLabel}</span>
                    </div>
                    <ApprovalChain steps={chain.steps} badWord={tab === "closed" ? "Rejected" : "Revision"} />
                </div>
                {(tab === "action" || tab === "closed") && op.rejection_reason ? (
                    <div className="mt-3 rounded-[13px] border border-[#f3d4d4] bg-[#fdeeee] p-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.06em] text-[#b34c4c]">
                            {tab === "action" ? "Reviewer comment" : "Rejection reason"}
                        </p>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-[#7d3838]">{op.rejection_reason}</p>
                        {who ? <p className="mt-1 text-[10px] text-[#a15b5b]">— {who}</p> : null}
                    </div>
                ) : null}
                {tab === "history" ? (
                    <div className="mt-3 flex items-start gap-2.5 rounded-[13px] border border-[#cfeadf] bg-[#eff9f5] p-3 text-[11px] text-[#1c765d]">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1c765d] text-[12px] font-black text-white">✓</span>
                        <div>
                            <b className="block">Approved and handed off</b>
                            <span>This record is no longer an active opportunity proposal. It now lives in My Reports for service + reporting.</span>
                        </div>
                    </div>
                ) : null}
            </div>
            <div className="space-y-2">
                <div className="rounded-[13px] border border-[#dde5ea] bg-[#fbfcfd] px-3 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.06em] text-[#70808a]">Status · Opportunity</p>
                    <b className="mt-0.5 block text-[12.5px] text-[#16313d]">{op.currently_with ? `Currently with: ${op.currently_with}` : statusTitle}</b>
                    <small className="mt-0.5 block text-[10.5px] text-[#6b7c86]">
                        {statusText}
                        {sentWaiting ? ` · ${sentWaiting}` : ""}
                    </small>
                </div>
                <div className="rounded-[13px] border border-[#efddb7] bg-[#fff8e9] px-3 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.06em] text-[#9d6810]">Next action</p>
                    <b className="mt-0.5 block text-[12.5px] text-[#16313d]">{nextTitle}</b>
                    <small className="mt-0.5 block text-[10.5px] text-[#6b7c86]">{nextText}</small>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {tab === "action" ? (
                        <Link href={editHref} className="rounded-[9px] bg-[#174b43] px-2.5 py-2 text-[10px] font-black text-white">
                            Review Comments & Edit
                        </Link>
                    ) : null}
                    {tab === "history" && !reportCta ? (
                        <Link href={WORKSPACE_READY} className="rounded-[9px] bg-[#174b43] px-2.5 py-2 text-[10px] font-black text-white">
                            Open My Reports
                        </Link>
                    ) : null}
                    <Link href={viewHref} className="rounded-[9px] bg-[#edf2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]">
                        {tab === "review" ? "View Submitted Flashcard" : "View Flashcard"}
                    </Link>
                    {canRemindReviewer ? (
                        <button
                            type="button"
                            disabled={sendingEmail}
                            onClick={() => void sendReviewerEmail()}
                            className="rounded-[9px] bg-[#edf4fb] px-2.5 py-2 text-[10px] font-black text-[#376d9f] disabled:opacity-60"
                        >
                            {sendingEmail ? "Sending…" : `Email ${who}`}
                        </button>
                    ) : null}
                    {canRemindReviewer ? (
                        whatsappHref ? (
                            <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-[9px] bg-[#e8f8ee] px-2.5 py-2 text-[10px] font-black text-[#1f7a46]"
                            >
                                WhatsApp {who}
                            </a>
                        ) : (
                            <button
                                type="button"
                                disabled
                                title="No WhatsApp number saved for this reviewer"
                                className="cursor-not-allowed rounded-[9px] bg-[#edf2f3] px-2.5 py-2 text-[10px] font-black text-[#8a9aa3] opacity-70"
                            >
                                WhatsApp {who}
                            </button>
                        )
                    ) : null}
                    {reportCta ? (
                        <Link
                            href={reportCta.href}
                            className="rounded-[9px] bg-[#174b43] px-2.5 py-2 text-[10px] font-black text-white"
                        >
                            {reportCta.label}
                        </Link>
                    ) : null}
                </div>
            </div>
        </article>
    );
}
