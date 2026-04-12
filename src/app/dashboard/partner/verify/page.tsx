"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, CheckCircle, Eye, Filter, Loader2, User, XCircle } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
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
import { Label } from "@/app/dashboard/student/report/components/ui/label";
import { Textarea } from "@/app/dashboard/student/report/components/ui/textarea";
import {
    extractFacultyApprovalsArray,
    normalizeFacultyApprovalsResponse,
    type FacultyApprovalRow,
} from "@/utils/facultyApprovals";
import { formatDisplayId } from "@/utils/displayIds";
import { getStoredCurrentUserId } from "@/utils/currentUser";
import { resolveStudentOpportunityWorkflow, type OpportunityWorkflowStage } from "@/utils/opportunityWorkflow";

type PartnerApprovalRow = FacultyApprovalRow & {
    workflowStageKey: OpportunityWorkflowStage;
    workflowLabel: string;
    queueMessage: string;
    partnerDecision: string;
};

function lower(value: unknown): string {
    if (value == null) return "";
    return String(value).trim().toLowerCase();
}

function pickStr(record: Record<string, unknown> | null, ...keys: string[]): string {
    if (!record) return "";
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function pickObj(record: Record<string, unknown> | null, ...keys: string[]): Record<string, unknown> | null {
    if (!record) return null;
    for (const key of keys) {
        const value = record[key];
        if (value && typeof value === "object") return value as Record<string, unknown>;
    }
    return null;
}

function isOwnedByCurrentPartner(record: Record<string, unknown>, currentUserId: string) {
    if (lower(record.created_by_role ?? record.creator_role) === "partner") return true;
    const creatorId = record.creatorId ?? record.creator_id ?? record.created_by ?? record.owner_id;
    return Boolean(currentUserId && creatorId != null && String(creatorId).trim() === currentUserId);
}

function hasPartnerSignal(record: Record<string, unknown>) {
    const supervision =
        record.supervision && typeof record.supervision === "object"
            ? (record.supervision as Record<string, unknown>)
            : null;

    return (
        record.requires_partner_approval === true ||
        Boolean(lower(record.partner_approval_status ?? record.partner_status)) ||
        lower(record.workflow_stage ?? record.approval_stage).includes("partner") ||
        Boolean(record.external_partner_collaboration && typeof record.external_partner_collaboration === "object") ||
        Boolean(record.partner_organization && typeof record.partner_organization === "object") ||
        Boolean(
            pickStr(
                supervision,
                "partner_org_name",
                "external_partner_org_name",
                "partner_email",
                "external_partner_email",
            ),
        )
    );
}

function isPendingPartnerDecision(row: PartnerApprovalRow) {
    return row.workflowStageKey === "pending_partner" || ["pending", "awaiting", "required"].includes(row.partnerDecision);
}

function mapPartnerApprovalRows(payload: unknown, currentUserId: string): PartnerApprovalRow[] {
    const rawRows = extractFacultyApprovalsArray(payload).filter(
        (item): item is Record<string, unknown> => Boolean(item && typeof item === "object"),
    );
    const rawMap = new Map<string, Record<string, unknown>>();

    for (const row of rawRows) {
        const id = pickStr(row, "id", "opportunity_id", "project_id", "opportunityId");
        if (id) rawMap.set(id, row);
    }

    return normalizeFacultyApprovalsResponse(payload)
        .map((row) => {
            const raw = rawMap.get(row.id) || {};
            const workflow = resolveStudentOpportunityWorkflow(raw);
            return {
                ...row,
                workflowStageKey: workflow.stage,
                workflowLabel: workflow.badgeLabel,
                queueMessage: workflow.queueMessage,
                partnerDecision: lower(raw.partner_approval_status ?? raw.partner_status),
            };
        })
        .filter((row) => {
            const raw = rawMap.get(row.id) || {};
            return !isOwnedByCurrentPartner(raw, currentUserId) && hasPartnerSignal(raw);
        });
}

function detailPartnerBlock(detail: Record<string, unknown>) {
    const supervision = pickObj(detail, "supervision");
    const ext = pickObj(detail, "external_partner_collaboration");
    const root = pickObj(detail, "partner_organization");
    const executing = pickObj(detail, "executing_context", "executingContext");
    const executingPartner = pickObj(executing, "partner");

    return {
        organization:
            pickStr(supervision, "partner_org_name", "external_partner_org_name", "partnerOrgName", "externalPartnerOrgName") ||
            pickStr(ext, "organization_name", "organizationName") ||
            pickStr(executingPartner, "organization_name", "organizationName") ||
            pickStr(root, "organization_name", "organizationName", "name"),
        contact:
            pickStr(supervision, "partner_contact_person", "external_partner_contact_person", "partnerContactPerson", "externalPartnerContactPerson") ||
            pickStr(ext, "contact_person", "contactPerson") ||
            pickStr(executingPartner, "contact_person", "contactPerson") ||
            pickStr(root, "contact_person", "contactPerson"),
        email:
            pickStr(supervision, "partner_email", "external_partner_email", "partnerEmail", "externalPartnerEmail") ||
            pickStr(ext, "official_email", "officialEmail", "email") ||
            pickStr(executingPartner, "official_email", "officialEmail", "email") ||
            pickStr(root, "official_email", "officialEmail", "email"),
    };
}

function detailStudentBlock(detail: Record<string, unknown>) {
    const user = pickObj(detail, "user");
    const student = pickObj(detail, "student");
    const creator = pickObj(detail, "creator");
    const profile = pickObj(detail, "student_profile", "creator_profile");

    return {
        name:
            pickStr(creator, "name", "full_name", "fullName") ||
            pickStr(detail, "creator_name", "student_name", "submitted_by_name", "owner_name", "creatorName", "studentName", "submittedByName", "ownerName") ||
            pickStr(student, "name", "full_name", "fullName") ||
            pickStr(user, "name", "fullName") ||
            pickStr(profile, "name", "full_name"),
        email:
            pickStr(creator, "email") ||
            pickStr(detail, "creator_email", "student_email", "submitted_by_email", "owner_email", "creatorEmail", "studentEmail", "submittedByEmail", "ownerEmail") ||
            pickStr(student, "email") ||
            pickStr(user, "email") ||
            pickStr(profile, "email"),
    };
}

function normalizeStrArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

export default function VerifyWorkPage() {
    const [tab, setTab] = useState<"pending" | "history">("pending");
    const [rows, setRows] = useState<PartnerApprovalRow[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(null);
    const [detailSourceRow, setDetailSourceRow] = useState<PartnerApprovalRow | null>(null);
    const [detailActionId, setDetailActionId] = useState<string | null>(null);
    const [approveSubmittingId, setApproveSubmittingId] = useState<string | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
    const [rejectComment, setRejectComment] = useState("");
    const [rejectSubmitting, setRejectSubmitting] = useState(false);
    const autoOpenedIdRef = useRef<string | null>(null);

    useEffect(() => {
        void loadQueue();
    }, []);

    const loadQueue = async () => {
        setIsLoading(true);
        try {
            const res = await authenticatedFetch("/api/v1/opportunities?partner_id=me");
            if (!res?.ok) {
                toast.error("Could not load partner approval requests");
                setRows([]);
                return;
            }

            const json = await res.json();
            setRows(mapPartnerApprovalRows(json, getStoredCurrentUserId()));
        } catch (error) {
            console.error("Failed to load partner approval queue", error);
            toast.error("Could not load partner approval requests");
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    const openDetails = async (id: string, options?: { showActions?: boolean; sourceRow?: PartnerApprovalRow }) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailRecord(null);
        setDetailSourceRow(options?.sourceRow ?? (rows.find((row) => row.id === id) || null));
        setDetailActionId(options?.showActions ? id : null);
        try {
            const res = await authenticatedFetch("/api/v1/opportunities/detail", {
                method: "POST",
                body: JSON.stringify({ id }),
            });

            if (!res?.ok) {
                toast.error("Could not load opportunity details");
                setDetailOpen(false);
                setDetailActionId(null);
                setDetailSourceRow(null);
                return;
            }

            const json = await res.json();
            setDetailRecord((json?.data as Record<string, unknown>) || null);
        } catch (error) {
            console.error("Failed to load opportunity detail", error);
            toast.error("Could not load opportunity details");
            setDetailOpen(false);
            setDetailActionId(null);
            setDetailSourceRow(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (approveSubmittingId === id) return;
        setApproveSubmittingId(id);
        try {
            const res = await authenticatedFetch(`/api/v1/partner/approvals/${id}/approve`, {
                method: "POST",
            });
            if (res?.ok) {
                toast.success("Partner approval submitted");
                setRows((prev) =>
                    prev.map((row) =>
                        row.id === id
                            ? {
                                  ...row,
                                  partnerDecision: "approved",
                                  workflowStageKey: "pending_admin",
                                  workflowLabel: "Pending Admin Approval (Final)",
                                  queueMessage: "Partner approval is complete. This request is now waiting for CIEL Admin.",
                              }
                            : row,
                    ),
                );
                setDetailOpen(false);
                setDetailActionId(null);
                setDetailRecord(null);
                setDetailSourceRow(null);
                void loadQueue();
            } else {
                let message = "Failed to submit partner approval";
                try {
                    const payload = (await res?.json?.()) as Record<string, unknown> | null;
                    const nested = pickObj(payload, "data");
                    message =
                        pickStr(payload, "message", "error", "detail") ||
                        pickStr(nested, "message", "error", "detail") ||
                        message;
                } catch {
                    // Keep default message when server body is not JSON.
                }
                toast.error(message);
            }
        } catch (error) {
            console.error("Failed to approve partner request", error);
            toast.error("Error connecting to server");
        } finally {
            setApproveSubmittingId((prev) => (prev === id ? null : prev));
        }
    };

    const openRejectDialog = (id: string) => {
        setRejectTargetId(id);
        setRejectComment("");
        setRejectOpen(true);
    };

    const closeRejectDialog = () => {
        setRejectOpen(false);
        setRejectTargetId(null);
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
            const res = await authenticatedFetch(`/api/v1/partner/approvals/${rejectTargetId}/reject`, {
                method: "POST",
                body: JSON.stringify({ reason }),
            });
            if (res?.ok) {
                toast.success("Partner rejection submitted");
                setDetailOpen(false);
                setDetailActionId(null);
                setDetailRecord(null);
                setDetailSourceRow(null);
                closeRejectDialog();
                void loadQueue();
            } else {
                toast.error("Failed to reject request");
            }
        } catch (error) {
            console.error("Failed to reject partner request", error);
            toast.error("Error connecting to server");
        } finally {
            setRejectSubmitting(false);
        }
    };

    const filtered = useMemo(() => {
        const visible = tab === "pending" ? rows.filter(isPendingPartnerDecision) : rows.filter((row) => !isPendingPartnerDecision(row));
        const q = search.trim().toLowerCase();
        if (!q) return visible;

        return visible.filter((row) =>
            [
                row.projectTitle,
                row.studentName,
                row.studentId,
                row.studentEmail || "",
                row.workflowLabel,
                row.queueMessage,
            ]
                .join(" ")
                .toLowerCase()
                .includes(q),
        );
    }, [rows, search, tab]);

    const partnerBlock = detailRecord ? detailPartnerBlock(detailRecord) : null;
    const studentBlock = detailRecord ? detailStudentBlock(detailRecord) : null;
    const detailCreatorId = detailRecord
        ? pickStr(detailRecord, "creatorId", "creator_id", "student_id", "studentId", "created_by")
        : "";

    useEffect(() => {
        if (typeof window === "undefined") return;
        const currentSearch = new URLSearchParams(window.location.search);
        const nextTab = currentSearch.get("tab");
        if (nextTab === "pending" || nextTab === "history") {
            setTab(nextTab);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (isLoading) return;
        const currentSearch = new URLSearchParams(window.location.search);
        const opportunityId = currentSearch.get("opportunity") || currentSearch.get("id");
        if (!opportunityId || autoOpenedIdRef.current === opportunityId) return;

        const targetTab = currentSearch.get("tab") === "history" ? "history" : "pending";
        const sourceRows = targetTab === "history" ? rows.filter((row) => !isPendingPartnerDecision(row)) : rows.filter(isPendingPartnerDecision);
        if (!sourceRows.some((row) => row.id === opportunityId)) return;

        autoOpenedIdRef.current = opportunityId;
        void openDetails(opportunityId, { showActions: targetTab === "pending" });
    }, [isLoading, rows]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 pb-20">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Partner Opportunity Approvals</h1>
                <p className="text-slate-500">
                    Yahan woh opportunities aati hain jinhon ne create karte waqt aapki NGO ko partner ke taur par add kiya ho.
                </p>
                <p className="text-slate-500 text-sm mt-2">
                    Ye report verification nahi hai. Ye partner approval queue hai, faculty approvals ke flow ki tarah.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button variant={tab === "pending" ? "default" : "outline"} size="sm" className="h-9" onClick={() => setTab("pending")}>
                    Pending Requests
                </Button>
                <Button variant={tab === "history" ? "default" : "outline"} size="sm" className="h-9" onClick={() => setTab("history")}>
                    Approval History
                </Button>
            </div>

            <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by student name, ID, email, or project title..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="grid gap-6">
                {isLoading ? (
                    <div className="text-center py-12 text-slate-500 text-sm">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {tab === "pending" ? "No pending partner approvals" : "No partner approval history yet"}
                        </h3>
                        <p className="text-slate-500">
                            {tab === "pending"
                                ? "Jab kisi opportunity mein aapki NGO partner ke taur par add hogi aur aapka step aayega, woh yahan nazar aayegi."
                                : "Past partner-linked workflow items yahan appear hongi."}
                        </p>
                    </div>
                ) : (
                    filtered.map((row) => (
                        <Card key={row.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                <div className="p-6 flex-1 space-y-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <h3 className="font-bold text-lg text-slate-900">{row.projectTitle}</h3>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        tab === "pending"
                                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                                            : "bg-slate-100 text-slate-700 border-slate-200"
                                                    }
                                                >
                                                    {tab === "pending" ? "Pending partner review" : row.workflowLabel}
                                                </Badge>
                                            </div>
                                            <p className="text-slate-500 text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                                <span className="inline-flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5" />
                                                    <strong className="text-slate-700">{row.studentName}</strong> ({formatDisplayId(row.studentId, "STU")})
                                                </span>
                                                {row.studentEmail ? <span className="text-slate-600">· {row.studentEmail}</span> : null}
                                                <span>Submitted {row.submittedDate}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Workflow Stage</p>
                                            <p className="font-medium text-slate-800 text-sm">{row.workflowLabel}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Impact Hours</p>
                                            <p className="font-bold text-blue-600 text-lg">{row.totalHours ?? "—"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Primary SDG</p>
                                            <p className="font-medium text-slate-800 text-sm">{row.sdg || "—"}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Briefcase className="w-4 h-4 text-blue-600" />
                                            <p className="text-xs font-bold text-slate-500 uppercase">Queue Note</p>
                                        </div>
                                        <p className="text-sm text-slate-700">{row.queueMessage}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border-l border-slate-100 p-6 flex flex-row md:flex-col justify-center gap-3 w-full md:w-56">
                                    {tab === "pending" ? (
                                        <>
                                            <Button
                                                className="w-full bg-green-600 hover:bg-green-700"
                                                onClick={() => void handleApprove(row.id)}
                                                disabled={approveSubmittingId === row.id}
                                            >
                                                {approveSubmittingId === row.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                                    </>
                                                )}
                                            </Button>
                                            <Button variant="destructive" className="w-full" onClick={() => openRejectDialog(row.id)}>
                                                <XCircle className="w-4 h-4 mr-2" /> Reject
                                            </Button>
                                        </>
                                    ) : null}
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => void openDetails(row.id, { showActions: tab === "pending", sourceRow: row })}
                                    >
                                        <Eye className="w-4 h-4 mr-2" /> Review details
                                    </Button>
                                </div>
                            </div>
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
                        setDetailSourceRow(null);
                    }
                }}
            >
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Partner approval request</DialogTitle>
                        <DialogDescription>
                            Review the student-submitted partner-linked opportunity before you approve it or return it with
                            comments.
                        </DialogDescription>
                    </DialogHeader>
                    {detailLoading ? (
                        <div className="flex justify-center py-12 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : detailRecord ? (
                        <div className="space-y-6 text-sm">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">{pickStr(detailRecord, "title") || "Student opportunity"}</h3>
                                <p className="text-slate-500 mt-1">
                                    {pickStr(detailRecord, "workflow_stage", "approval_stage").replace(/_/g, " ") || "Pending approval"}
                                </p>
                            </div>

                            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                                <p className="text-xs font-bold text-blue-800 uppercase mb-2">Student / creator</p>
                                <ul className="space-y-1 text-slate-800">
                                    <li>
                                        <span className="text-slate-500">Name:</span>{" "}
                                        {studentBlock?.name ||
                                            detailSourceRow?.studentName ||
                                            (detailCreatorId ? formatDisplayId(detailCreatorId, "STU") : "—")}
                                    </li>
                                    <li><span className="text-slate-500">Email:</span> {studentBlock?.email || detailSourceRow?.studentEmail || "—"}</li>
                                </ul>
                            </div>

                            {partnerBlock ? (
                                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                                    <p className="text-xs font-bold text-amber-900 uppercase mb-2">Partner block</p>
                                    <ul className="space-y-1 text-slate-800">
                                        <li><span className="text-slate-500">Organization:</span> {partnerBlock.organization || "—"}</li>
                                        <li><span className="text-slate-500">Contact person:</span> {partnerBlock.contact || "—"}</li>
                                        <li><span className="text-slate-500">Email:</span> {partnerBlock.email || "—"}</li>
                                    </ul>
                                </div>
                            ) : null}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-slate-200 p-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Status</p>
                                    <p className="text-slate-800">{pickStr(detailRecord, "status").replace(/_/g, " ") || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 p-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Workflow</p>
                                    <p className="text-slate-800">{pickStr(detailRecord, "workflow_stage", "approval_stage").replace(/_/g, " ") || "—"}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-xl border border-slate-200 p-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Mode</p>
                                    <p className="text-slate-800">{pickStr(detailRecord, "mode") || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 p-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Visibility</p>
                                    <p className="text-slate-800">{pickStr(detailRecord, "visibility") || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 p-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Types</p>
                                    <p className="text-slate-800">{normalizeStrArray(detailRecord.types).join(", ") || "—"}</p>
                                </div>
                            </div>

                            {(() => {
                                const timeline = pickObj(detailRecord, "timeline");
                                if (!timeline) return null;
                                return (
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Timeline</p>
                                        <ul className="space-y-1 text-slate-800">
                                            <li><span className="text-slate-500">Type:</span> {pickStr(timeline, "type") || "—"}</li>
                                            <li><span className="text-slate-500">Dates:</span> {[pickStr(timeline, "start_date"), pickStr(timeline, "end_date")].filter(Boolean).join(" to ") || "—"}</li>
                                            <li><span className="text-slate-500">Expected hours:</span> {String(timeline.expected_hours ?? detailRecord.requiredHours ?? "—")}</li>
                                            <li><span className="text-slate-500">Volunteers:</span> {String(timeline.volunteers_required ?? "—")}</li>
                                        </ul>
                                    </div>
                                );
                            })()}

                            {(() => {
                                const objectives = pickObj(detailRecord, "objectives");
                                if (!objectives) return null;
                                return (
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Objectives</p>
                                        <p className="text-slate-800 whitespace-pre-wrap">{pickStr(objectives, "description") || "—"}</p>
                                        <p className="text-slate-700 mt-2">
                                            <span className="text-slate-500">Beneficiaries:</span>{" "}
                                            {String(objectives.beneficiaries_count ?? "—")}
                                            {normalizeStrArray(objectives.beneficiaries_type).length
                                                ? ` (${normalizeStrArray(objectives.beneficiaries_type).join(", ")})`
                                                : ""}
                                        </p>
                                    </div>
                                );
                            })()}

                            {(() => {
                                const activity = pickObj(detailRecord, "activity_details", "activityDetails");
                                if (!activity) return null;
                                return (
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Activity details</p>
                                        <p className="text-slate-800 whitespace-pre-wrap">
                                            {pickStr(activity, "student_responsibilities", "studentResponsibilities") || "—"}
                                        </p>
                                        <p className="text-slate-700 mt-2">
                                            <span className="text-slate-500">Skills:</span>{" "}
                                            {normalizeStrArray(activity.skills_gained ?? activity.skillsGained).join(", ") || "—"}
                                        </p>
                                    </div>
                                );
                            })()}

                            {(() => {
                                const sdgInfo = pickObj(detailRecord, "sdg_info");
                                const verification = normalizeStrArray(detailRecord.verification_method);
                                if (!sdgInfo && verification.length === 0) return null;
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="rounded-xl border border-slate-200 p-4">
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">SDG linkage</p>
                                            <p className="text-slate-800">
                                                SDG: {String(sdgInfo?.sdg_id ?? detailRecord.sdg ?? "—")} | Target: {String(sdgInfo?.target_id ?? "—")}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 p-4">
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Verification method</p>
                                            <p className="text-slate-800">{verification.join(", ") || "—"}</p>
                                        </div>
                                    </div>
                                );
                            })()}
                            {detailActionId ? (
                                <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-200">
                                    <Button variant="destructive" onClick={() => detailActionId && openRejectDialog(detailActionId)}>
                                        <XCircle className="w-4 h-4 mr-2" /> Reject
                                    </Button>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => void handleApprove(detailActionId)}
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
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
            <Dialog open={rejectOpen} onOpenChange={(open) => !open && !rejectSubmitting && closeRejectDialog()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject with feedback</DialogTitle>
                        <DialogDescription>
                            Explain what the student should fix before this opportunity can proceed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="partner-reject-comment">Comments for the student</Label>
                        <Textarea
                            id="partner-reject-comment"
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder="e.g. Please confirm the execution scope and partner responsibilities before resubmitting."
                            className="min-h-[120px]"
                            disabled={rejectSubmitting}
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={closeRejectDialog} disabled={rejectSubmitting}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => void confirmReject()} disabled={rejectSubmitting}>
                            {rejectSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" /> Submit rejection
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
