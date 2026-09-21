"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import {
    CommunityCrumb,
    EmptyPanel,
    HubTabs,
    UserGuideBanner,
    ZoneRule,
} from "@/components/ciel/community-service/CommunityServiceHubChrome";
import DraftsLandingView from "@/app/dashboard/student/create-opportunity/DraftsLandingView";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";
import {
    canEditReturnedOpportunity,
    isOpportunityPermanentlyRejected,
    isStudentOpportunityLiveForReporting,
} from "@/utils/opportunityWorkflow";

const HUB = "/dashboard/student/paths/community-service";
const CREATE_FORM = "/dashboard/student/create-opportunity?new=1";
const WORKSPACE_READY = `${HUB}?view=workspace&filter=ready`;

export const CREATE_TABS = [
    { id: "drafts", label: "Drafts" },
    { id: "review", label: "Under Approval" },
    { id: "action", label: "Action Required" },
    { id: "closed", label: "Closed" },
    { id: "history", label: "Approved History" },
] as const;

export type CreateTab = (typeof CREATE_TABS)[number]["id"];

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
    partner_contact_name?: string | null;
    partner_contact_email?: string | null;
    rejection_reason?: string | null;
};

function isCreateTab(value: string | null): value is CreateTab {
    return CREATE_TABS.some((tab) => tab.id === value);
}

function opportunityFullyApproved(op: MineRow): boolean {
    return (
        isStudentOpportunityLiveForReporting(op as unknown as Record<string, unknown>) ||
        op.status === "live" ||
        op.admin_approval_status === "approved"
    );
}

export function createTabOf(op: MineRow): CreateTab {
    if (op.status === "draft") return "drafts";
    if (canEditReturnedOpportunity(op as unknown as Record<string, unknown>)) return "action";
    if (isOpportunityPermanentlyRejected(op as unknown as Record<string, unknown>)) return "closed";
    if (opportunityFullyApproved(op)) return "history";
    return "review";
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

function currentReviewer(op: MineRow): string {
    if (!lineDone(op.faculty_approval_status) && op.faculty_approval_status !== "rejected") {
        return op.faculty_contact_name?.trim() || "Faculty";
    }
    if (op.requires_partner_approval && !lineDone(op.partner_approval_status) && op.partner_approval_status !== "rejected") {
        return op.partner_contact_name?.trim() || "Partner / NGO";
    }
    return "CIEL PK";
}

/** Which stage is currently pending, for the "Pending X" badge/status title on Under Approval cards. */
function pendingStageLabel(op: MineRow): string {
    if (!lineDone(op.faculty_approval_status) && !lineBlocked(op.faculty_approval_status)) {
        return "Pending Faculty";
    }
    if (op.requires_partner_approval && !lineDone(op.partner_approval_status) && !lineBlocked(op.partner_approval_status)) {
        return "Pending Partner";
    }
    return "Pending CIEL PK";
}

type PipelineStepState = "done" | "cur" | "bad" | "locked";

/** Faculty → Partner/NGO (only if required) → CIEL PK → Decision, each colored by its own approval line. */
function approvalPipelineSteps(op: MineRow): { label: string; state: PipelineStepState }[] {
    const lines: { label: string; status: ApprovalLineStatus }[] = [
        { label: "Faculty", status: op.faculty_approval_status },
        ...(op.requires_partner_approval ? [{ label: "Partner / NGO", status: op.partner_approval_status }] : []),
        { label: "CIEL PK", status: op.admin_approval_status },
    ];

    let blocked = false;
    let curAssigned = false;
    const steps = lines.map(({ label, status }) => {
        if (lineBlocked(status)) {
            blocked = true;
            return { label, state: "bad" as PipelineStepState };
        }
        if (blocked) return { label, state: "locked" as PipelineStepState };
        if (lineDone(status)) return { label, state: "done" as PipelineStepState };
        if (!curAssigned) {
            curAssigned = true;
            return { label, state: "cur" as PipelineStepState };
        }
        return { label, state: "locked" as PipelineStepState };
    });

    const decisionState: PipelineStepState = isOpportunityPermanentlyRejected(op as unknown as Record<string, unknown>)
        ? "bad"
        : opportunityFullyApproved(op)
          ? "done"
          : "locked";
    steps.push({ label: "Decision", state: decisionState });
    return steps;
}

function PipelineMini({ op }: { op: MineRow }) {
    const steps = approvalPipelineSteps(op);
    return (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {steps.map((step, i) => (
                <span key={step.label} className="flex items-center gap-1.5">
                    <span
                        className={
                            "rounded-[9px] border px-2 py-1 text-[9.5px] font-black " +
                            (step.state === "done"
                                ? "border-[#cfeadf] bg-[#eff9f5] text-[#1c765d]"
                                : step.state === "cur"
                                  ? "border-[#efddb7] bg-[#fff8e9] text-[#9d6810]"
                                  : step.state === "bad"
                                    ? "border-[#f3d4d4] bg-[#fdeeee] text-[#b34c4c]"
                                    : "border-[#e4e9eb] bg-[#f7fafb] text-[#96a3a9]")
                        }
                    >
                        {step.label}
                        {step.state === "locked" ? " · Locked" : null}
                    </span>
                    {i < steps.length - 1 ? <span className="text-[10px] font-black text-[#a8b6bb]">→</span> : null}
                </span>
            ))}
        </div>
    );
}

function formatWhen(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const ROAD: { n: string; title: string; sub: string; optional?: boolean; finish?: boolean }[] = [
    { n: "1", title: "Draft", sub: "You build + save" },
    { n: "2", title: "Faculty", sub: "Mandatory review" },
    { n: "3", title: "Partner / NGO", sub: "Only if linked", optional: true },
    { n: "4", title: "CIEL PK", sub: "Final review" },
    { n: "5", title: "Decision", sub: "Approved / Revise / Reject", finish: true },
];

const EMPTY: Record<CreateTab, string> = {
    drafts: "Create a new opportunity or save a form to see it here.",
    review: "No opportunity is waiting for approval right now.",
    action: "No reviewer has requested changes.",
    closed: "No rejected opportunities.",
    history: "Approved proposals appear here as history; active work is in Workspace.",
};

export default function CommunityServiceCreate() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const filterParam = searchParams.get("filter");
    const [rows, setRows] = useState<MineRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDraftExistsModal, setShowDraftExistsModal] = useState(false);
    const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        authenticatedFetch("/api/v1/student/opportunity/mine", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((json) => {
                if (cancelled) return;
                const list = Array.isArray(json?.data) ? (json.data as Record<string, unknown>[]) : [];
                setRows(
                    list.map((r) => ({
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
                        partner_contact_name: (r.partner_contact_name as string | null) ?? null,
                        partner_contact_email: (r.partner_contact_email as string | null) ?? null,
                        rejection_reason: (r.rejection_reason as string | null) ?? null,
                    })),
                );
                setLoading(false);
            })
            .catch(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const submitted = useMemo(() => rows.filter((row) => row.status !== "draft"), [rows]);
    const counts = useMemo(() => {
        const next: Record<CreateTab, number> = { drafts: 0, review: 0, action: 0, closed: 0, history: 0 };
        for (const row of rows) next[createTabOf(row)] += 1;
        return next;
    }, [rows]);

    const tab: CreateTab = isCreateTab(filterParam)
        ? filterParam
        : counts.action
          ? "action"
          : counts.review
            ? "review"
            : counts.drafts
              ? "drafts"
              : "history";

    const setTab = (next: string) => {
        const qs = new URLSearchParams(searchParams.toString());
        qs.set("view", "create");
        qs.set("filter", next);
        router.replace(`${HUB}?${qs.toString()}`, { scroll: false });
    };

    const list = submitted.filter((row) => createTabOf(row) === tab);
    const activeN = counts.drafts + counts.review + counts.action;

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <CommunityCrumb role="Student" view="Create Opportunity" />
            <MockupSectionHead
                title="Create Opportunity"
                subtitle="Everything about a student-created opportunity stays here until CIEL PK gives the final decision. Approval completes the proposal journey; approved work then moves to Workspace."
                action={
                    <Link href={HUB} className="border-0 bg-transparent text-xs font-black text-[#087c75] hover:underline">
                        ← Back to module buttons
                    </Link>
                }
            />
            <UserGuideBanner
                desc="Create and manage your own student-proposed opportunity until the final opportunity decision."
                items={[
                    ["Create New Opportunity", "Open the Community Service Opportunity Form and begin a new proposal."],
                    ["Drafts", "Saved proposals you have not submitted yet; continue editing from here."],
                    ["Under Approval", "Submitted proposals moving through Faculty → Partner/NGO if linked → CIEL PK."],
                    ["Action Required", "Revision requests returned to you with reviewer comments and the next edit required."],
                    ["Closed", "Rejected or archived proposals kept for transparency and audit history."],
                    ["Approved History", "Final-approved proposals. The active project has moved to Workspace → Ready to Start."],
                ]}
                rule="Proposal status stays here; report status never replaces it."
            />

            <div className="flex flex-col items-start justify-between gap-4 rounded-[20px] border border-[#dce6ea] bg-white px-5 py-5 sm:flex-row sm:items-center">
                <div>
                    <p className="text-[9.5px] font-black uppercase tracking-[0.08em] text-[#0e7d74]">Your proposal journey</p>
                    <h3 className="mt-1 text-[20px] font-semibold text-[#16313d]">Create it here. Track it here. Fix it here.</h3>
                    <p className="mt-1 max-w-[800px] text-[12px] leading-relaxed text-[#70808a]">
                        The proposal does not enter Community Service Workspace until final approval. Every reviewer, decision, version and next action remains visible here.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        const hasDraft = rows.some((r) => r.status === "draft");
                        if (hasDraft) setShowDraftExistsModal(true);
                        else router.push(CREATE_FORM);
                    }}
                    className="shrink-0 rounded-xl bg-[#174b43] px-[15px] py-[11px] text-[11px] font-[950] text-white"
                >
                    + Create New Opportunity
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

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {ROAD.map((step, i) => (
                    <span key={step.n} className="flex items-center gap-2">
                        <span
                            className={
                                "rounded-xl border px-3 py-2 " +
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
                            <small className="ml-1.5 text-[10px] text-[#70808a]">{step.sub}</small>
                        </span>
                        {i < ROAD.length - 1 ? <span className="font-black text-[#a8b6bb]">→</span> : null}
                    </span>
                ))}
            </div>

            <div className="mt-3.5">
                <ZoneRule title="Simple rule:">
                    Draft, approval, revision and rejection stay under <strong>Create Opportunity</strong>. When final approval is achieved, the operational project appears in{" "}
                    <strong>Community Service Workspace → Ready to Start</strong>. Approved History remains here only as a transparent audit trail.
                </ZoneRule>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                {[
                    [String(activeN), "Active proposal records"],
                    [String(counts.review), "Waiting on reviewer"],
                    [String(counts.action), "Need your action"],
                    [String(counts.history), "Approved → Workspace"],
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
            ) : list.length === 0 ? (
                <EmptyPanel title="Nothing here" text={EMPTY[tab]} />
            ) : (
                <div className="grid gap-3.5">
                    {list.map((op) => (
                        <ProposalCard key={op.id} op={op} tab={tab} onOpenHistory={() => setHistoryOpenId(op.id)} />
                    ))}
                </div>
            )}

            {historyOpenId
                ? (() => {
                      const op = rows.find((r) => r.id === historyOpenId);
                      if (!op) return null;
                      const lines: { label: string; status: ApprovalLineStatus; contact?: string | null }[] = [
                          { label: "Faculty", status: op.faculty_approval_status, contact: op.faculty_contact_name },
                          ...(op.requires_partner_approval
                              ? [{ label: "Partner / NGO", status: op.partner_approval_status, contact: op.partner_contact_name }]
                              : []),
                          { label: "CIEL PK", status: op.admin_approval_status, contact: null },
                      ];
                      const lineStatusLabel = (status: ApprovalLineStatus): string => {
                          if (status === "approved") return "Approved";
                          if (status === "rejected") return "Rejected";
                          if (status === "revision_requested") return "Revision requested";
                          if (status === "not_applicable" || status === "not_required" || status === "skipped") return "Not required";
                          return "Pending";
                      };
                      return (
                          <div
                              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
                              onClick={(e) => e.target === e.currentTarget && setHistoryOpenId(null)}
                          >
                              <div className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl">
                                  <div className="flex items-start justify-between gap-3">
                                      <h3 className="m-0 text-[16px] font-bold text-[#16313d]">Approval history</h3>
                                      <button
                                          type="button"
                                          onClick={() => setHistoryOpenId(null)}
                                          className="shrink-0 rounded-full border border-[#dde5ea] px-2.5 py-1 text-[11px] font-bold text-[#3c5968]"
                                      >
                                          ✕
                                      </button>
                                  </div>
                                  <p className="mt-1 text-[11px] text-[#70808a]">{op.title}</p>
                                  <div className="mt-4 space-y-2">
                                      {lines.map((line) => (
                                          <div
                                              key={line.label}
                                              className="flex items-center justify-between gap-3 rounded-[12px] border border-[#dde5ea] bg-[#fbfcfd] px-3 py-2.5"
                                          >
                                              <div>
                                                  <b className="block text-[11.5px] text-[#16313d]">{line.label}</b>
                                                  {line.contact ? <span className="text-[10px] text-[#70808a]">{line.contact}</span> : null}
                                              </div>
                                              <span
                                                  className={
                                                      "rounded-[18px] px-2 py-0.5 text-[9.5px] font-black " +
                                                      (line.status === "approved"
                                                          ? "bg-[#e8f5ef] text-[#1d765d]"
                                                          : line.status === "rejected" || line.status === "revision_requested"
                                                            ? "bg-[#fdeeee] text-[#b34c4c]"
                                                            : lineDone(line.status)
                                                              ? "bg-[#edf2f3] text-[#5a6b73]"
                                                              : "bg-[#fff3dc] text-[#a66d11]")
                                                  }
                                              >
                                                  {lineStatusLabel(line.status)}
                                              </span>
                                          </div>
                                      ))}
                                  </div>
                                  {op.rejection_reason ? (
                                      <div className="mt-3 rounded-[12px] border border-[#f3d4d4] bg-[#fdeeee] p-3">
                                          <p className="text-[9px] font-black uppercase tracking-[0.06em] text-[#b34c4c]">Latest reviewer comment</p>
                                          <p className="mt-1 text-[11px] leading-relaxed text-[#7d3838]">{op.rejection_reason}</p>
                                      </div>
                                  ) : null}
                                  <div className="mt-5 flex justify-end">
                                      <button
                                          type="button"
                                          onClick={() => setHistoryOpenId(null)}
                                          className="rounded-[10px] border border-[#dde5ea] px-3 py-2 text-[10px] font-black text-[#3c5968]"
                                      >
                                          Close
                                      </button>
                                  </div>
                              </div>
                          </div>
                      );
                  })()
                : null}
        </div>
    );
}

function ProposalCard({ op, tab, onOpenHistory }: { op: MineRow; tab: CreateTab; onOpenHistory: () => void }) {
    const who = currentReviewer(op);
    const editHref = `/dashboard/student/create-opportunity?edit=${encodeURIComponent(op.id)}`;
    const viewHref = `/dashboard/student/browse/${encodeURIComponent(op.id)}`;
    const remindSubject = `CIEL PK reminder — ${op.title}`;
    const remindBody = `Hi ${who},\n\nA polite reminder that "${op.title}" is waiting for review on CIEL PK.\n`;

    let statusTitle = pendingStageLabel(op);
    let statusText = who === "CIEL PK" ? "Waiting for final platform approval" : `Waiting for ${who}`;
    let nextTitle = "No action required from you";
    let nextText = "This opportunity stays here until the current reviewer decides. You will be notified.";
    let tone: "ok" | "wait" | "rev" = "wait";

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
        nextTitle = "Moved to Community Service Workspace";
        nextText = "Start Report is waiting there. This card stays here as history only.";
        tone = "ok";
    }

    return (
        <article className="grid grid-cols-1 gap-4 rounded-[17px] border border-[#dde5ea] bg-white p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <h4 className="m-0 text-[15px] font-semibold text-[#16313d]">{op.title}</h4>
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
                {tab === "review" || tab === "history" ? <PipelineMini op={op} /> : null}
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
                            <span>This record is no longer an active opportunity proposal. It now lives in Community Service Workspace for service + reporting.</span>
                        </div>
                    </div>
                ) : null}
            </div>
            <div className="space-y-2">
                <div className="rounded-[13px] border border-[#dde5ea] bg-[#fbfcfd] px-3 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.06em] text-[#70808a]">Status · Opportunity</p>
                    <b className="mt-0.5 block text-[12.5px] text-[#16313d]">{statusTitle}</b>
                    <small className="mt-0.5 block text-[10.5px] text-[#6b7c86]">{statusText}</small>
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
                    {tab === "history" ? (
                        <Link href={WORKSPACE_READY} className="rounded-[9px] bg-[#174b43] px-2.5 py-2 text-[10px] font-black text-white">
                            Open Workspace
                        </Link>
                    ) : null}
                    <Link href={viewHref} className="rounded-[9px] bg-[#edf2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]">
                        {tab === "review" ? "View Submitted Flashcard" : "View Flashcard"}
                    </Link>
                    <button
                        type="button"
                        onClick={onOpenHistory}
                        className="rounded-[9px] bg-[#edf2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]"
                    >
                        {tab === "action" ? "History" : tab === "closed" ? "View History" : "Approval History"}
                    </button>
                    {tab === "review" ? (
                        <>
                            <a href={mailtoHref(op.faculty_contact_email || op.partner_contact_email || "", remindSubject, remindBody)} className="rounded-[9px] bg-[#edf4fb] px-2.5 py-2 text-[10px] font-black text-[#376d9f]">
                                Email {who}
                            </a>
                            <a href={whatsappShareHref(`${remindSubject}\n\n${remindBody}`)} className="rounded-[9px] bg-[#edf4fb] px-2.5 py-2 text-[10px] font-black text-[#376d9f]">
                                WhatsApp {who}
                            </a>
                        </>
                    ) : null}
                </div>
            </div>
        </article>
    );
}
