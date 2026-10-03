"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Eye, Filter, History, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Card } from "@/app/dashboard/student/report/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/app/dashboard/student/report/components/ui/dialog";
import { Textarea } from "@/app/dashboard/student/report/components/ui/textarea";
import { Label } from "@/app/dashboard/student/report/components/ui/label";
import { toast } from "sonner";
import {
    type ApprovalHistoryEntry,
    type FacultyApprovalAction,
    type FacultyApprovalRow,
    type FacultyApprovalVisibility,
    normalizeFacultyApprovalsResponse,
} from "@/utils/facultyApprovals";
import { formatDisplayId } from "@/utils/displayIds";
import { getStoredCurrentUserEmail } from "@/utils/currentUser";
import { readDashboardNavRoleFromStorage } from "@/utils/dashboardNavRole";
import { FacultyOpportunityDetailBody } from "@/components/faculty/FacultyOpportunityDetailBody";
import OpportunityApprovalCard, { buildOpportunityApprovalModel } from "@/components/ciel/community-service/OpportunityApprovalCard";
import { ApprovalFollowUpActions, ContactStudentActions } from "@/components/ciel/community-service/ApprovalFollowUpActions";
import { CommunityCrumb, HubBackButton, HubTabs } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";

/** Faculty is reviewing a student-created opportunity here, so — unlike the Create Opportunity
 * tab's "my own opportunity" pipeline — the Faculty line itself is shown as a real, live stage. */
function approvalHistoryLabel(entry: ApprovalHistoryEntry): string {
    const line = entry.line === "admin" ? "CIEL PK" : entry.line === "partner" ? "Partner / NGO" : "Faculty";
    const action =
        entry.action === "approved" ? "approved" : entry.action === "rejected" ? "rejected" : "requested revision on";
    return `${line} ${action}`;
}

function ApprovalVisibilityBadges({ visibility }: { visibility?: FacultyApprovalVisibility }) {
    if (!visibility) return null;
    const listed = (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-900">
            Listed on submission
        </Badge>
    );
    const uni = (
        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-xs font-medium text-indigo-900">
            University scope
        </Badge>
    );
    if (visibility === "both") {
        return (
            <span className="flex flex-wrap items-center gap-1.5">
                {listed}
                {uni}
            </span>
        );
    }
    if (visibility === "named_supervisor") return listed;
    return uni;
}

function overlayAfterFacultyApprove(
    row: FacultyApprovalRow,
    data: Record<string, unknown> | undefined,
    action: FacultyApprovalAction,
): FacultyApprovalRow {
    const roleRaw = String(data?.currently_with_role ?? "").toLowerCase();
    const currentlyWithRole =
        roleRaw === "partner" || roleRaw === "admin" || roleRaw === "faculty"
            ? roleRaw
            : action === "partner_ack" || row.requiresPartnerApproval !== true
              ? "admin"
              : "partner";
    const currentlyWith =
        typeof data?.currently_with === "string" && data.currently_with.trim()
            ? data.currently_with
            : currentlyWithRole === "partner"
              ? "Partner / NGO"
              : currentlyWithRole === "faculty"
                ? "Faculty"
                : "CIEL PK";
    const nextStep =
        typeof data?.next_step === "string" && data.next_step.trim()
            ? data.next_step
            : currentlyWithRole === "partner"
              ? "Partner / NGO acknowledgement"
              : "CIEL PK final approval";
    const publicCode =
        typeof data?.public_code === "string" && data.public_code.trim()
            ? data.public_code
            : row.publicCode;
    const workflowStage =
        typeof data?.workflow_stage === "string" && data.workflow_stage.trim()
            ? data.workflow_stage
            : currentlyWithRole === "partner"
              ? "pending_partner"
              : "pending_admin";
    return {
        ...row,
        currentlyWithRole,
        currentlyWith,
        nextStep,
        publicCode,
        workflowStage,
        linkedDraft: false,
    };
}

export default function FacultyApprovalsPage() {
    const [tab, setTab] = useState<"pending" | "history" | "linked" | "revision">("pending");
    const [pendingProjects, setPendingProjects] = useState<FacultyApprovalRow[]>([]);
    const [historyProjects, setHistoryProjects] = useState<FacultyApprovalRow[]>([]);
    const [linkedDrafts, setLinkedDrafts] = useState<FacultyApprovalRow[]>([]);
    const [revisionProjects, setRevisionProjects] = useState<FacultyApprovalRow[]>([]);
    const [justApproved, setJustApproved] = useState<FacultyApprovalRow[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(null);
    /** When set, detail dialog shows Approve/Reject for this opportunity id (pending tab only). */
    const [detailActionId, setDetailActionId] = useState<string | null>(null);
    const [detailActionKind, setDetailActionKind] = useState<FacultyApprovalAction>("faculty_review");
    const [approveSubmittingId, setApproveSubmittingId] = useState<string | null>(null);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
    const [rejectActionKind, setRejectActionKind] = useState<FacultyApprovalAction>("faculty_review");
    const [rejectComment, setRejectComment] = useState("");
    const [rejectSubmitting, setRejectSubmitting] = useState(false);
    const [feedbackMode, setFeedbackMode] = useState<"revise" | "reject_permanent">("revise");
    const autoOpenedIdRef = useRef<string | null>(null);
    const [historyRow, setHistoryRow] = useState<FacultyApprovalRow | null>(null);

    const router = useRouter();

    useEffect(() => {
        // Email verification links and old bookmarks land here for everyone. The faculty API is
        // faculty-only (403 for CIEL PK admins), so hand admins to their own approvals queue —
        // keeping ?opportunity= / ?tab= — instead of a page of failed requests.
        if (readDashboardNavRoleFromStorage() === "admin") {
            router.replace(`/dashboard/admin/approvals${window.location.search}`);
            return;
        }
        void loadLists();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadLists = async () => {
        setIsLoading(true);
        try {
            const facultyEmail = getStoredCurrentUserEmail();
            const pendingParams = new URLSearchParams({ status: "pending" });
            const historyParams = new URLSearchParams({ status: "history" });
            const draftParams = new URLSearchParams({ status: "linked_drafts" });
            const revisionParams = new URLSearchParams({ status: "revision" });
            if (facultyEmail) {
                pendingParams.set("faculty_email", facultyEmail);
                historyParams.set("faculty_email", facultyEmail);
                draftParams.set("faculty_email", facultyEmail);
                revisionParams.set("faculty_email", facultyEmail);
            }

            const [pendingRes, historyRes, draftRes, revisionRes] = await Promise.all([
                authenticatedFetch(`/api/v1/faculty/approvals?${pendingParams.toString()}`),
                authenticatedFetch(`/api/v1/faculty/approvals?${historyParams.toString()}`),
                authenticatedFetch(`/api/v1/faculty/approvals?${draftParams.toString()}`),
                authenticatedFetch(`/api/v1/faculty/approvals?${revisionParams.toString()}`),
            ]);

            if (pendingRes?.ok) {
                const j = await pendingRes.json();
                setPendingProjects(normalizeFacultyApprovalsResponse(j));
            } else {
                toast.error("Could not load pending approvals");
            }

            if (historyRes?.ok) {
                const j = await historyRes.json();
                setHistoryProjects(normalizeFacultyApprovalsResponse(j));
            } else {
                toast.error("Could not load approval history");
            }
            if (draftRes?.ok) {
                const j = await draftRes.json();
                setLinkedDrafts(normalizeFacultyApprovalsResponse(j));
            }
            if (revisionRes?.ok) {
                const j = await revisionRes.json();
                setRevisionProjects(normalizeFacultyApprovalsResponse(j));
            }
        } catch (error) {
            console.error("Failed to fetch approvals", error);
            toast.error("Failed to load approvals");
        } finally {
            setIsLoading(false);
        }
    };

    const resolveApprovalActionForId = (opportunityId: string): FacultyApprovalAction => {
        const row = pendingProjects.find((p) => p.id === opportunityId);
        return row?.approvalAction === "partner_ack" ? "partner_ack" : "faculty_review";
    };

    const openOpportunityDetail = async (
        opportunityId: string,
        options?: { showActions?: boolean; approvalAction?: FacultyApprovalAction },
    ) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailRecord(null);
        setDetailActionId(options?.showActions ? opportunityId : null);
        setDetailActionKind(
            options?.approvalAction ??
                (options?.showActions ? resolveApprovalActionForId(opportunityId) : "faculty_review"),
        );
        try {
            const res = await authenticatedFetch(`/api/v1/opportunities/detail`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: opportunityId }),
            });
            if (!res?.ok) {
                toast.error("Could not load opportunity details");
                setDetailOpen(false);
                setDetailActionId(null);
                return;
            }
            const json = await res.json();
            const d = json?.data as Record<string, unknown> | undefined;
            if (!d) {
                toast.error("Opportunity not found");
                setDetailOpen(false);
                setDetailActionId(null);
                return;
            }
            setDetailRecord(d);
        } catch {
            toast.error("Could not load opportunity details");
            setDetailOpen(false);
            setDetailActionId(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const visibleList =
        tab === "pending"
            ? pendingProjects
            : tab === "linked"
              ? linkedDrafts
              : tab === "revision"
                ? revisionProjects
                : historyProjects;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return visibleList;
        return visibleList.filter((p) => {
            const hay = [
                p.projectTitle,
                p.studentName,
                p.studentId,
                p.studentEmail || "",
                p.publicCode || "",
                p.currentlyWith || "",
                p.opportunityStatus || "",
            ]
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }, [visibleList, search]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const currentSearch = new URLSearchParams(window.location.search);
        const nextTab = currentSearch.get("tab");
        if (nextTab === "pending" || nextTab === "history" || nextTab === "linked" || nextTab === "revision") {
            setTab(nextTab);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (isLoading) return;
        const currentSearch = new URLSearchParams(window.location.search);
        const opportunityId = currentSearch.get("opportunity") || currentSearch.get("id");
        if (!opportunityId || autoOpenedIdRef.current === opportunityId) return;

        const requestedTab = currentSearch.get("tab");
        const targetTab =
            requestedTab === "history"
                ? "history"
                : requestedTab === "linked"
                  ? "linked"
                  : requestedTab === "revision"
                    ? "revision"
                    : "pending";
        const sourceRows =
            targetTab === "history"
                ? historyProjects
                : targetTab === "linked"
                  ? linkedDrafts
                  : targetTab === "revision"
                    ? revisionProjects
                    : pendingProjects;
        if (!sourceRows.some((row) => row.id === opportunityId)) return;

        autoOpenedIdRef.current = opportunityId;
        void openOpportunityDetail(opportunityId, {
            showActions: targetTab === "pending",
            approvalAction: resolveApprovalActionForId(opportunityId),
        });
    }, [historyProjects, isLoading, linkedDrafts, pendingProjects, revisionProjects]);

    const handleApprove = async (id: string, action: FacultyApprovalAction = "faculty_review") => {
        if (approveSubmittingId === id) return;
        setApproveSubmittingId(id);
        try {
            const endpoint =
                action === "partner_ack"
                    ? `/api/v1/partner/approvals/${id}/approve`
                    : `/api/v1/faculty/approvals/${id}/approve`;
            const res = await authenticatedFetch(endpoint, {
                method: "POST",
            });
            if (res && res.ok) {
                const body = (await res.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
                const source =
                    pendingProjects.find((p) => p.id === id) ||
                    revisionProjects.find((p) => p.id === id) ||
                    historyProjects.find((p) => p.id === id);
                if (source) {
                    const overlay = overlayAfterFacultyApprove(source, body?.data, action);
                    setJustApproved((prev) => [overlay, ...prev.filter((row) => row.id !== id)]);
                }
                toast.success(action === "partner_ack" ? "Partner acknowledgement submitted" : "Project approved successfully");
                setPendingProjects((prev) => prev.filter((p) => p.id !== id));
                setDetailOpen(false);
                setDetailActionId(null);
                setDetailActionKind("faculty_review");
                void loadLists();
            } else {
                let message = "Failed to approve project";
                try {
                    const errorBody = (await res?.json()) as { message?: unknown };
                    if (typeof errorBody?.message === "string" && errorBody.message.trim()) {
                        message = errorBody.message.trim();
                    }
                } catch {
                    /* ignore */
                }
                toast.error(message);
                void loadLists();
            }
        } catch (error) {
            console.error("Failed to approve", error);
            toast.error("Error connecting to server");
        } finally {
            setApproveSubmittingId((prev) => (prev === id ? null : prev));
        }
    };

    const openRejectDialog = (
        id: string,
        action: FacultyApprovalAction = "faculty_review",
        mode: "revise" | "reject_permanent" = "revise",
    ) => {
        setRejectTargetId(id);
        setRejectActionKind(action);
        setFeedbackMode(mode);
        setRejectComment("");
        setRejectOpen(true);
    };

    const closeRejectDialog = () => {
        setRejectOpen(false);
        setRejectTargetId(null);
        setRejectActionKind("faculty_review");
        setRejectComment("");
    };

    const confirmReject = async () => {
        if (!rejectTargetId) return;
        const reason = rejectComment.trim();
        if (reason.length < 3) {
            toast.error("Please add feedback for the student (at least 3 characters).");
            return;
        }
        setRejectSubmitting(true);
        try {
            const actionPath = feedbackMode === "revise" ? "revise" : "reject";
            const reviewEndpoint =
                rejectActionKind === "partner_ack"
                    ? `/api/v1/partner/approvals/${rejectTargetId}/${actionPath}`
                    : `/api/v1/faculty/approvals/${rejectTargetId}/${actionPath}`;
            const res = await authenticatedFetch(reviewEndpoint, {
                method: "POST",
                body: JSON.stringify({ reason }),
            });
            if (res && res.ok) {
                toast.success(
                    feedbackMode === "revise"
                        ? "Revision requested. The student can edit and resubmit."
                        : "Permanently rejected. The student cannot edit this opportunity.",
                );
                setPendingProjects((prev) => prev.filter((p) => p.id !== rejectTargetId));
                setDetailOpen(false);
                setDetailActionId(null);
                setDetailRecord(null);
                closeRejectDialog();
                void loadLists();
            } else {
                toast.error("Failed to reject project");
            }
        } catch (error) {
            console.error("Failed to reject", error);
            toast.error("Error connecting to server");
        } finally {
            setRejectSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-[1240px] pb-20">
            <CommunityCrumb role="Faculty" view="Review Opportunities" />
            <div className="mt-4">
                <HubBackButton href="/dashboard/faculty/community-service" label="← Back to Community Service" />
            </div>
            <MockupSectionHead
                title="Review Opportunities"
                subtitle="Student → Faculty → Partner/NGO (if named) → CIEL PK. Every decision is versioned and audited."
            />
            <HubTabs
                tabs={[
                    { id: "pending", label: "Pending my approval", count: pendingProjects.length },
                    { id: "revision", label: "Revision with student", count: revisionProjects.length },
                    { id: "linked", label: "Linked Drafts", count: linkedDrafts.length },
                    { id: "history", label: "Decided", count: historyProjects.length },
                ]}
                active={tab}
                onChange={(id) => setTab(id as typeof tab)}
            />

            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative flex-1">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by student name, ID, or email..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="grid gap-6">
                {tab === "pending" && justApproved.length > 0
                    ? justApproved.map((project) => (
                          <Card key={`just-${project.id}`} className="overflow-hidden border-0 bg-transparent shadow-none">
                              <OpportunityApprovalCard
                                  {...buildOpportunityApprovalModel(
                                      {
                                          id: project.id,
                                          title: project.projectTitle,
                                          student_name: project.studentName,
                                          version: project.version,
                                          faculty_approval_status: project.facultyApprovalStatus,
                                          partner_approval_status: project.partnerApprovalStatus,
                                          admin_approval_status: project.adminApprovalStatus,
                                          requires_partner_approval: project.requiresPartnerApproval,
                                          created_by_role: project.createdByRole,
                                          status: project.opportunityStatus,
                                          workflow_stage: project.workflowStage,
                                          total_hours: project.totalHours,
                                          submitted_at: project.submittedDate,
                                          sdg: project.sdg,
                                          public_code: project.publicCode,
                                          currently_with: project.currentlyWith,
                                          currently_with_role: project.currentlyWithRole,
                                          next_step: project.nextStep,
                                          waiting_since: project.waitingSince,
                                          isStudentCreated: true,
                                      },
                                      project.approvalAction === "partner_ack" ? "partner" : "faculty",
                                      { mode: "decided" },
                                  )}
                                  facts={[
                                      project.sdg ? `SDG ${project.sdg}` : "",
                                      project.totalHours != null ? `${project.totalHours}h` : "",
                                      project.eisScore != null ? `EIS ${project.eisScore}` : "",
                                  ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  actions={
                                      <div className="grid w-full gap-2">
                                          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                                              Approved. Next waiter is still on this screen — Email or WhatsApp them if needed.
                                          </p>
                                          <ApprovalFollowUpActions
                                              opportunityId={project.id}
                                              currentlyWithRole={project.currentlyWithRole}
                                              currentlyWith={project.currentlyWith}
                                              title={project.projectTitle}
                                              publicCode={project.publicCode}
                                              nextStep={project.nextStep}
                                              openPath={
                                                  project.currentlyWithRole === "partner"
                                                      ? `/dashboard/partner/verify?opportunity=${encodeURIComponent(project.id)}&tab=pending`
                                                      : project.currentlyWithRole === "admin"
                                                        ? `/dashboard/admin/approvals?opportunity=${encodeURIComponent(project.id)}&tab=pending`
                                                        : undefined
                                              }
                                          />
                                      </div>
                                  }
                              />
                          </Card>
                      ))
                    : null}
                {isLoading ? (
                    <div className="text-center py-12 text-slate-500 text-sm">Loading…</div>
                ) : filtered.length === 0 && !(tab === "pending" && justApproved.length > 0) ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {tab === "pending"
                                ? "All Caught Up!"
                                : tab === "linked"
                                  ? "No linked drafts"
                                  : tab === "revision"
                                    ? "No revisions with students"
                                    : "No history yet"}
                        </h3>
                        <p className="text-slate-500">
                            {tab === "pending"
                                ? "No pending approvals at the moment."
                                : tab === "linked"
                                  ? "When a student names you on a draft, it appears here. You can view it, but you cannot approve until they submit."
                                  : tab === "revision"
                                    ? "When you or a partner send an opportunity back, it stays here until the student resubmits."
                                    : "Approved or progressed projects will appear here after you act or verify by email."}
                        </p>
                    </div>
                ) : (
                    filtered.map((project) => (
                        <Card key={project.id} className="overflow-hidden border-0 bg-transparent shadow-none">
                            <OpportunityApprovalCard
                                {...buildOpportunityApprovalModel(
                                    {
                                        id: project.id,
                                        title: project.projectTitle,
                                        student_name: project.studentName,
                                        version: project.version,
                                        faculty_approval_status: project.facultyApprovalStatus,
                                        partner_approval_status: project.partnerApprovalStatus,
                                        admin_approval_status: project.adminApprovalStatus,
                                        requires_partner_approval: project.requiresPartnerApproval,
                                        created_by_role: project.createdByRole,
                                        status: project.opportunityStatus,
                                        workflow_stage: project.workflowStage,
                                        total_hours: project.totalHours,
                                        submitted_at: project.submittedDate,
                                        sdg: project.sdg,
                                        public_code: project.publicCode,
                                        currently_with: project.currentlyWith,
                                        currently_with_role: project.currentlyWithRole,
                                        next_step: project.nextStep,
                                        waiting_since: project.waitingSince,
                                        isStudentCreated: true,
                                    },
                                    project.approvalAction === "partner_ack" ? "partner" : "faculty",
                                    {
                                        mode:
                                            tab === "history"
                                                ? "decided"
                                                : tab === "revision"
                                                  ? "revision"
                                                  : "pending",
                                    },
                                )}
                                facts={[
                                    project.sdg ? `SDG ${project.sdg}` : "",
                                    project.totalHours != null ? `${project.totalHours}h` : "",
                                    project.eisScore != null ? `EIS ${project.eisScore}` : "",
                                ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                actions={
                                    <div className="grid w-full gap-2">
                                        <ApprovalVisibilityBadges visibility={project.approvalVisibility} />
                                    {tab === "pending" ? (
                                        <>
                                            <Button
                                                className="w-full bg-green-600 hover:bg-green-700"
                                                onClick={() =>
                                                    void handleApprove(project.id, project.approvalAction ?? "faculty_review")
                                                }
                                                disabled={approveSubmittingId === project.id}
                                            >
                                                {approveSubmittingId === project.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full border-amber-300 text-amber-900 hover:bg-amber-50"
                                                onClick={() =>
                                                    openRejectDialog(
                                                        project.id,
                                                        project.approvalAction ?? "faculty_review",
                                                        "revise",
                                                    )
                                                }
                                            >
                                                <XCircle className="w-4 h-4 mr-2" /> Request revision
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                className="w-full"
                                                onClick={() =>
                                                    openRejectDialog(
                                                        project.id,
                                                        project.approvalAction ?? "faculty_review",
                                                        "reject_permanent",
                                                    )
                                                }
                                            >
                                                <XCircle className="w-4 h-4 mr-2" /> Reject permanently
                                            </Button>
                                        </>
                                    ) : null}
                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        onClick={() =>
                                            void openOpportunityDetail(project.id, {
                                                showActions: tab === "pending",
                                                approvalAction: project.approvalAction,
                                            })
                                        }
                                    >
                                        <Eye className="w-4 h-4 mr-2" /> {tab === "pending" ? "Review full details" : "Opportunity details"}
                                    </Button>
                                    {tab === "linked" || tab === "revision" ? (
                                        <ContactStudentActions
                                            studentEmail={project.studentEmail}
                                            title={project.projectTitle}
                                            publicCode={project.publicCode}
                                        />
                                    ) : null}
                                    {tab !== "pending" && tab !== "revision" && !project.linkedDraft ? (
                                        <ApprovalFollowUpActions
                                            opportunityId={project.id}
                                            currentlyWithRole={project.currentlyWithRole}
                                            currentlyWith={project.currentlyWith}
                                            title={project.projectTitle}
                                            publicCode={project.publicCode}
                                            nextStep={project.nextStep}
                                            openPath={
                                                project.currentlyWithRole === "partner"
                                                    ? `/dashboard/partner/verify?opportunity=${encodeURIComponent(project.id)}&tab=pending`
                                                    : project.currentlyWithRole === "admin"
                                                      ? `/dashboard/admin/approvals?opportunity=${encodeURIComponent(project.id)}&tab=pending`
                                                      : undefined
                                            }
                                        />
                                    ) : null}
                                    {project.approvalHistory && project.approvalHistory.length > 0 ? (
                                        <Button variant="ghost" className="w-full" onClick={() => setHistoryRow(project)}>
                                            <History className="w-4 h-4 mr-2" /> History
                                        </Button>
                                    ) : null}
                                    </div>
                                }
                            />
                        </Card>
                    ))
                )}
            </div>

            <Dialog
                open={detailOpen}
                onOpenChange={(open) => {
                    setDetailOpen(open);
                    if (!open) {
                        setDetailRecord(null);
                        setDetailActionId(null);
                        setDetailActionKind("faculty_review");
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Student opportunity</DialogTitle>
                        <DialogDescription>
                            Student profile, partner context (if any), and full proposal. Confirm academic fit, feasibility,
                            and student capability before you approve or reject with written feedback.
                        </DialogDescription>
                    </DialogHeader>
                    {detailLoading ? (
                        <div className="flex justify-center py-12 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : detailRecord ? (
                        <>
                            <FacultyOpportunityDetailBody d={detailRecord} />
                            {detailActionId ? (
                                <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-200">
                                    <Button
                                        variant="outline"
                                        className="border-amber-300 text-amber-900 hover:bg-amber-50"
                                        onClick={() =>
                                            detailActionId &&
                                            openRejectDialog(detailActionId, detailActionKind, "revise")
                                        }
                                    >
                                        <XCircle className="w-4 h-4 mr-2" /> Request revision
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() =>
                                            detailActionId &&
                                            openRejectDialog(detailActionId, detailActionKind, "reject_permanent")
                                        }
                                    >
                                        <XCircle className="w-4 h-4 mr-2" /> Reject permanently
                                    </Button>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() =>
                                            detailActionId && void handleApprove(detailActionId, detailActionKind)
                                        }
                                        disabled={approveSubmittingId === detailActionId}
                                    >
                                        {approveSubmittingId === detailActionId ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : null}
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog open={rejectOpen} onOpenChange={(open) => !open && !rejectSubmitting && closeRejectDialog()}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {feedbackMode === "revise" ? "Request revision" : "Reject permanently"}
                        </DialogTitle>
                        <DialogDescription>
                            {feedbackMode === "revise"
                                ? "The student can edit and resubmit. Your comments explain what to change."
                                : "This closes the opportunity. The student cannot edit or resubmit."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="faculty-reject-comment">Comments for the student</Label>
                        <Textarea
                            id="faculty-reject-comment"
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder="e.g. Scope is too broad for one semester; tighten objectives and resubmit."
                            className="min-h-[120px]"
                            disabled={rejectSubmitting}
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={closeRejectDialog} disabled={rejectSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant={feedbackMode === "revise" ? "default" : "destructive"}
                            className={feedbackMode === "revise" ? "bg-amber-600 hover:bg-amber-700" : undefined}
                            onClick={() => void confirmReject()}
                            disabled={rejectSubmitting}
                        >
                            {rejectSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />{" "}
                                    {feedbackMode === "revise" ? "Send revision request" : "Confirm permanent reject"}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!historyRow} onOpenChange={(open) => !open && setHistoryRow(null)}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Version & approval history</DialogTitle>
                        <DialogDescription>
                            {historyRow?.projectTitle} — actor, action, timestamp and version. Nothing is overwritten silently.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        {(historyRow?.approvalHistory ?? [])
                            .slice()
                            .reverse()
                            .map((entry, i) => (
                                <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                                    <p className="font-semibold text-slate-800">
                                        {approvalHistoryLabel(entry)}
                                        <span className="ml-2 text-xs font-normal text-slate-400">Opp v{entry.version}</span>
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {entry.actorName || "—"} · {new Date(entry.at).toLocaleString()}
                                    </p>
                                    {entry.reason ? <p className="mt-1 text-xs text-slate-600">&ldquo;{entry.reason}&rdquo;</p> : null}
                                </div>
                            ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
