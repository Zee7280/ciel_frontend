"use client";

import { useState, useEffect, useMemo } from "react";
import {
    CheckCircle,
    XCircle,
    FileText,
    UserPlus,
    ArrowRight,
    Building2,
    TrendingUp,
    Users,
    Search,
    MessageSquare,
    Eye,
    Loader2,
    CalendarClock,
} from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { authenticatedFetch } from "@/utils/api";
import { formatDisplayId } from "@/utils/displayIds";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AttendancePendingQueuePanel from "@/components/engagement/AttendancePendingQueuePanel";

function pickDetailStr(o: Record<string, unknown> | null | undefined, ...keys: string[]): string {
    if (!o) return "";
    for (const k of keys) {
        const v = o[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function pickDetailDate(o: Record<string, unknown> | null | undefined, ...keys: string[]): string {
    if (!o) return "";
    for (const k of keys) {
        const v = o[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function formatDateTime(value: string | null | undefined): string {
    if (!value) return "N/A";
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    return new Date(parsed).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function normalizeApprovalState(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Pending list API: only block approve when the backend explicitly sets false. */
function readAdminCanApprove(row: Record<string, unknown> | null | undefined): boolean {
    if (!row) return true;
    const v = row.admin_can_approve ?? row.adminCanApprove;
    return v !== false;
}

function readFlowStatus(row: Record<string, unknown> | null | undefined): string {
    if (!row) return "";
    const raw = row.flow_status ?? row.flowStatus;
    if (typeof raw !== "string") return "";
    const t = raw.trim();
    if (!t) return "";
    return t.replace(/_/g, " ");
}

function approvalPillClass(status: string): string {
    if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "rejected" || status === "returned") return "border-rose-200 bg-rose-50 text-rose-700";
    if (status === "pending" || status === "awaiting") return "border-amber-200 bg-amber-50 text-amber-700";
    if (status === "not_applicable") return "border-slate-200 bg-slate-50 text-slate-500";
    return "border-slate-200 bg-slate-50 text-slate-600";
}

function approvalLabel(status: string): string {
    if (status === "not_applicable") return "Not required";
    if (!status) return "Unknown";
    return status.replace(/_/g, " ");
}

function stakeholderRows(d: Record<string, unknown>): {
    student: { name: string; email: string; id: string; university: string; department: string; phone: string };
    facultyEmail: string;
    facultyName: string;
    partnerOrg: string;
    partnerPerson: string;
    partnerEmail: string;
} {
    const user = d.user && typeof d.user === "object" ? (d.user as Record<string, unknown>) : null;
    const student = d.student && typeof d.student === "object" ? (d.student as Record<string, unknown>) : null;
    const creator = d.creator && typeof d.creator === "object" ? (d.creator as Record<string, unknown>) : null;
    const profile =
        d.student_profile && typeof d.student_profile === "object"
            ? (d.student_profile as Record<string, unknown>)
            : d.creator_profile && typeof d.creator_profile === "object"
              ? (d.creator_profile as Record<string, unknown>)
              : null;

    const studentName =
        pickDetailStr(creator, "name", "full_name", "fullName") ||
        pickDetailStr(d, "creator_name", "student_name", "submitted_by_name", "owner_name") ||
        pickDetailStr(student, "name", "full_name", "fullName") ||
        pickDetailStr(user, "name", "fullName") ||
        pickDetailStr(profile, "name", "full_name");
    const studentEmail =
        pickDetailStr(creator, "email") ||
        pickDetailStr(d, "creator_email", "student_email", "submitted_by_email", "owner_email") ||
        pickDetailStr(student, "email") ||
        pickDetailStr(user, "email") ||
        pickDetailStr(profile, "email");
    const studentId =
        pickDetailStr(creator, "id", "user_id") ||
        pickDetailStr(d, "creator_id", "student_id", "student_user_id", "created_by", "owner_id") ||
        pickDetailStr(student, "id", "user_id") ||
        pickDetailStr(user, "id") ||
        pickDetailStr(profile, "id", "user_id");
    const university =
        pickDetailStr(creator, "university", "institution") ||
        pickDetailStr(d, "creator_university", "student_university") ||
        pickDetailStr(student, "university", "institution") ||
        pickDetailStr(profile, "university", "institution");
    const department =
        pickDetailStr(creator, "department") ||
        pickDetailStr(d, "creator_department", "student_department") ||
        pickDetailStr(student, "department") ||
        pickDetailStr(profile, "department");
    const phone =
        (typeof d.student_contact === "string" && d.student_contact.trim()) ||
        pickDetailStr(creator, "phone", "contact", "mobile") ||
        pickDetailStr(student, "phone", "contact", "mobile") ||
        pickDetailStr(user, "phone", "contact", "mobile") ||
        pickDetailStr(profile, "phone", "contact", "mobile");

    const sup = d.supervision && typeof d.supervision === "object" ? (d.supervision as Record<string, unknown>) : null;
    const ext =
        d.external_partner_collaboration && typeof d.external_partner_collaboration === "object"
            ? (d.external_partner_collaboration as Record<string, unknown>)
            : null;
    const ex =
        d.executing_context && typeof d.executing_context === "object"
            ? (d.executing_context as Record<string, unknown>)
            : d.executingContext && typeof d.executingContext === "object"
              ? (d.executingContext as Record<string, unknown>)
              : null;
    const exP = ex?.partner && typeof ex.partner === "object" ? (ex.partner as Record<string, unknown>) : null;
    const po =
        d.partner_organization && typeof d.partner_organization === "object"
            ? (d.partner_organization as Record<string, unknown>)
            : null;

    const facultyEmail = pickDetailStr(sup, "contact", "official_email", "faculty_email");
    const facultyName = pickDetailStr(sup, "supervisor_name", "supervisorName");
    const partnerOrg =
        pickDetailStr(sup, "partner_org_name", "external_partner_org_name") ||
        pickDetailStr(ext, "organization_name") ||
        pickDetailStr(exP, "organization_name") ||
        pickDetailStr(po, "organization_name", "name");
    const partnerPerson =
        pickDetailStr(sup, "partner_contact_person", "external_partner_contact_person") ||
        pickDetailStr(ext, "contact_person") ||
        pickDetailStr(exP, "contact_person") ||
        pickDetailStr(po, "contact_person");
    const partnerEmail =
        pickDetailStr(sup, "partner_email", "external_partner_email") ||
        pickDetailStr(ext, "official_email") ||
        pickDetailStr(exP, "official_email") ||
        pickDetailStr(po, "official_email", "email");

    return {
        student: {
            name: studentName,
            email: studentEmail,
            id: studentId,
            university,
            department,
            phone,
        },
        facultyEmail,
        facultyName,
        partnerOrg,
        partnerPerson,
        partnerEmail,
    };
}

function isStudentCreatedOpportunity(v: Record<string, unknown>): boolean {
    const raw = v.is_student_created ?? v.isStudentCreated;
    return raw === true || String(raw).toLowerCase() === "true";
}

function facultyApprovalPipelineApplies(v: Record<string, unknown>): boolean {
    if (isStudentCreatedOpportunity(v)) return true;
    if (typeof v.faculty_verification_token === "string" && v.faculty_verification_token.trim()) return true;
    if (typeof v.liaisonToken === "string" && v.liaisonToken.trim()) return true;
    return false;
}

/** Same shape as admin projects list API for attendance project picker. */
function extractProjectsListForPicker(body: unknown): Record<string, unknown>[] {
    if (Array.isArray(body)) return body as Record<string, unknown>[];
    if (body && typeof body === "object") {
        const o = body as Record<string, unknown>;
        if (o.success === false && !Array.isArray(o.data)) return [];
        for (const k of ["data", "projects", "opportunities", "items", "results", "rows"] as const) {
            const v = o[k];
            if (Array.isArray(v)) return v as Record<string, unknown>[];
        }
    }
    return [];
}

function mapPickerProject(raw: Record<string, unknown>): { id: string; title: string } | null {
    const id = String(raw.id ?? raw.opportunity_id ?? "").trim();
    if (!id) return null;
    const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Untitled";
    return { id, title };
}

export default function AdminApprovalsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"registrations" | "projects" | "attendance">("registrations");
    const [attendanceProjectId, setAttendanceProjectId] = useState("");
    const [attendanceProjectOptions, setAttendanceProjectOptions] = useState<{ id: string; title: string }[]>([]);
    const [attendanceProjectsLoading, setAttendanceProjectsLoading] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [didBootstrapCounts, setDidBootstrapCounts] = useState(false);
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Modal States
    const [selectedOpportunity, setSelectedOpportunity] = useState<any | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [opportunityDetail, setOpportunityDetail] = useState<Record<string, unknown> | null>(null);
    const [opportunityDetailLoading, setOpportunityDetailLoading] = useState(false);

    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectType, setRejectType] = useState<'opportunity' | 'user'>('opportunity');
    const [rejectReason, setRejectReason] = useState("");
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [approveSubmittingKey, setApproveSubmittingKey] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setIsLoading(true);
            await Promise.all([
                fetchPendingUsers({ withLoading: false }),
                fetchPendingOpportunities({ withLoading: false }),
            ]);
            if (!cancelled) {
                setDidBootstrapCounts(true);
                setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!didBootstrapCounts) return;
        if (activeTab === 'projects') {
            fetchPendingOpportunities();
        } else if (activeTab === 'registrations') {
            fetchPendingUsers();
        }
    }, [activeTab, didBootstrapCounts]);

    useEffect(() => {
        if (activeTab !== "attendance") return;
        let cancelled = false;
        (async () => {
            setAttendanceProjectsLoading(true);
            try {
                const res = await authenticatedFetch(`/api/v1/admin/projects`);
                if (!res?.ok) {
                    if (!cancelled) {
                        toast.error("Could not load projects for attendance.");
                        setAttendanceProjectOptions([]);
                    }
                    return;
                }
                const data = await res.json();
                const list = extractProjectsListForPicker(data);
                const mapped = list
                    .map(mapPickerProject)
                    .filter((p): p is { id: string; title: string } => p != null);
                if (!cancelled) setAttendanceProjectOptions(mapped);
            } catch {
                if (!cancelled) {
                    toast.error("Could not load projects for attendance.");
                    setAttendanceProjectOptions([]);
                }
            } finally {
                if (!cancelled) setAttendanceProjectsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [activeTab]);

    const attendanceSelectValue = attendanceProjectOptions.some((p) => p.id === attendanceProjectId)
        ? attendanceProjectId
        : "";

    const fetchPendingOpportunities = async (options?: { withLoading?: boolean }) => {
        if (options?.withLoading !== false) setIsLoading(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/opportunities/pending`);
            if (res && res.ok) {
                const data = await res.json();
                const raw =
                    (Array.isArray(data.data) && data.data) ||
                    (Array.isArray(data.opportunities) && data.opportunities) ||
                    (Array.isArray(data.items) && data.items) ||
                    (Array.isArray(data) ? data : []);
                if (data.success !== false && Array.isArray(raw)) {
                    setOpportunities(raw);
                } else {
                    setOpportunities([]);
                }
            } else if (res && !res.ok) {
                try {
                    const err = await res.json();
                    console.error("Pending opportunities:", err?.message || res.status);
                } catch {
                    /* ignore */
                }
            }
        } catch (error) {
            console.error("Failed to fetch opportunities", error);
        } finally {
            if (options?.withLoading !== false) setIsLoading(false);
        }
    };

    const fetchPendingUsers = async (options?: { withLoading?: boolean }) => {
        if (options?.withLoading !== false) setIsLoading(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/users/pending`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setPendingUsers(data.data || []);
                }
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            if (options?.withLoading !== false) setIsLoading(false);
        }
    };

    const handleApprove = async (id: string, type: 'opportunity' | 'user' = 'opportunity') => {
        const submittingKey = `${type}:${id}`;
        if (approveSubmittingKey === submittingKey) return;
        if (type === "opportunity") {
            const row = opportunities.find((o) => String(o?.id) === String(id)) as Record<string, unknown> | undefined;
            if (row && !readAdminCanApprove(row)) return;
        }
        const endpoint = type === 'opportunity'
            ? `/api/v1/admin/opportunities/${id}/approve`
            : `/api/v1/admin/users/${id}/approve`;

        setApproveSubmittingKey(submittingKey);
        try {
            const res = await authenticatedFetch(endpoint, {
                method: 'POST'
            });
            if (res && res.ok) {
                if (type === 'opportunity') {
                    setOpportunities(prev => prev.filter(c => c.id !== id));
                } else {
                    setPendingUsers(prev => prev.filter(c => c.id !== id));
                }
            } else if (res?.status === 403) {
                toast.error("Not authorized to perform this approval.");
            } else if (res) {
                let msg = "Approval request failed.";
                try {
                    const err = (await res.json()) as { message?: unknown };
                    if (typeof err?.message === "string" && err.message.trim()) msg = err.message.trim();
                } catch {
                    /* ignore */
                }
                toast.error(msg);
            }
        } catch (error) {
            console.error("Failed to approve", error);
            toast.error("Approval request failed.");
        } finally {
            setApproveSubmittingKey((prev) => (prev === submittingKey ? null : prev));
        }
    };

    const handleRejectClick = (id: string, type: 'opportunity' | 'user' = 'opportunity') => {
        setRejectId(id);
        setRejectType(type);
        setRejectReason("");
        setIsRejectModalOpen(true);
    };

    const handleChatWithPartner = async (item: any) => {
        // Find the user ID for the partner. 
        // For registrations, it's the user's ID. 
        // For opportunities, it should be the partner's user ID.
        const partnerUserId = item.partner_id || item.userId || item.creatorId || (activeTab === 'registrations' ? item.id : null);

        if (!partnerUserId) {
            console.error("Partner user ID not found");
            // Fallback: try to find by organization or name if needed, but we need an ID for a direct chat
            return;
        }

        try {
            const res = await authenticatedFetch("/api/v1/chat/conversations", {
                method: "POST",
                body: JSON.stringify({
                    participantIds: [partnerUserId],
                    type: "DIRECT"
                })
            });

            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    router.push(`/dashboard/admin/messages?conversationId=${data.data.id}`);
                }
            }
        } catch (error) {
            console.error("Failed to start chat", error);
        }
    };

    const confirmReject = async () => {
        if (!rejectId) return;

        try {
            const endpoint = rejectType === 'opportunity'
                ? `/api/v1/admin/opportunities/${rejectId}/reject`
                : `/api/v1/admin/users/${rejectId}/reject`;

            const res = await authenticatedFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify({ reason: rejectReason })
            });

            if (res && res.ok) {
                if (rejectType === 'opportunity') {
                    setOpportunities(prev => prev.filter(c => c.id !== rejectId));
                } else {
                    setPendingUsers(prev => prev.filter(c => c.id !== rejectId));
                }
                setIsRejectModalOpen(false);
                setRejectId(null);
            }
        } catch (error) {
            console.error("Failed to reject", error);
        }
    };

    // Filter & Pagination Logic
    const getFilteredItems = () => {
        if (activeTab === "attendance") return [];
        const items = activeTab === 'projects' ? opportunities : pendingUsers;
        if (!searchQuery) return items;

        const lowerQuery = searchQuery.toLowerCase();
        return items.filter(item => {
            if (activeTab === 'projects') {
                return (
                    item.title?.toLowerCase().includes(lowerQuery) ||
                    item.partner_name?.toLowerCase().includes(lowerQuery) ||
                    readFlowStatus(item as Record<string, unknown>).toLowerCase().includes(lowerQuery)
                );
            } else {
                return (
                    item.name?.toLowerCase().includes(lowerQuery) ||
                    item.email?.toLowerCase().includes(lowerQuery)
                );
            }
        });
    };

    const filteredItems = getFilteredItems();
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page when tab or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery]);

    useEffect(() => {
        if (!isDetailModalOpen || !selectedOpportunity?.id) {
            setOpportunityDetail(null);
            return;
        }
        let cancelled = false;
        (async () => {
            setOpportunityDetailLoading(true);
            setOpportunityDetail(null);
            try {
                const res = await authenticatedFetch(`/api/v1/opportunities/detail`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: selectedOpportunity.id }),
                });
                if (!res?.ok || cancelled) return;
                const json = await res.json();
                const d = json?.data as Record<string, unknown> | undefined;
                if (!cancelled && d && typeof d === "object") {
                    setOpportunityDetail(d);
                }
            } catch {
                if (!cancelled) setOpportunityDetail(null);
            } finally {
                if (!cancelled) setOpportunityDetailLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isDetailModalOpen, selectedOpportunity?.id]);

    const adminDetailView = useMemo(() => {
        if (!selectedOpportunity) return null;
        const d = opportunityDetail;
        if (d && typeof d === "object") {
            return { ...selectedOpportunity, ...d } as Record<string, unknown>;
        }
        return selectedOpportunity as Record<string, unknown>;
    }, [selectedOpportunity, opportunityDetail]);

    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Pending Approvals</h1>
                    <p className="text-slate-500">Review and approve registration requests and project proposals.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={
                            activeTab === "attendance"
                                ? "Search disabled for attendance queue"
                                : activeTab === "projects"
                                  ? "Search projects..."
                                  : "Search users..."
                        }
                        disabled={activeTab === "attendance"}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-200 mb-8">
                <button
                    onClick={() => setActiveTab("registrations")}
                    className={`pb-4 px-2 text-sm font-bold transition-colors relative ${activeTab === "registrations" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                >
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> User & Participation Requests
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
                    </div>
                    {activeTab === "registrations" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab("projects")}
                    className={`pb-4 px-2 text-sm font-bold transition-colors relative ${activeTab === "projects" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                >
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Opportunity Requests
                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{opportunities.length}</span>
                    </div>
                    {activeTab === "projects" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab("attendance")}
                    className={`pb-4 px-2 text-sm font-bold transition-colors relative ${activeTab === "attendance" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                >
                    <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4" /> Attendance review
                    </div>
                    {activeTab === "attendance" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                </button>
            </div>

            {activeTab === "attendance" ? (
                <div className="max-w-3xl space-y-4">
                    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">Admin attendance queue.</span> Choose a project
                        from the list (same as All projects) or paste the opportunity ID, then load pending logs assigned
                        to CIEL Admin for that project. Partner-assigned sessions are reviewed in the partner dashboard.
                    </div>
                    {attendanceProjectsLoading ? (
                        <div className="flex justify-center py-10 text-slate-500 gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Project
                            </label>
                            <select
                                value={attendanceSelectValue}
                                onChange={(e) => setAttendanceProjectId(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                <option value="">Select an opportunity…</option>
                                {attendanceProjectOptions.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.title} ({p.id.slice(0, 8)}…)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Project ID
                        </label>
                        <input
                            type="text"
                            value={attendanceProjectId}
                            onChange={(e) => setAttendanceProjectId(e.target.value)}
                            placeholder="e.g. UUID from All projects or student URL ?project=…"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <AttendancePendingQueuePanel
                        projectId={attendanceProjectId}
                        title="Pending attendance (admin pool)"
                        description="Approve, reject, or flag entries. Reject and flag require a short reason."
                    />
                </div>
            ) : null}

            {activeTab === "projects" && (
                <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/90 px-4 py-3 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">CIEL final approval only.</span> This list is for
                    opportunities in the admin queue (typically status{" "}
                    <code className="text-xs bg-white/90 px-1.5 py-0.5 rounded border border-blue-100">pending_approval</code>
                    ), after faculty and partner steps where they apply. Faculty and partner work happens in their own
                    dashboards or email links — not missing from here by accident.
                </div>
            )}

            {activeTab !== "attendance" ? (
            <>
            <div className="grid grid-cols-1 gap-4">
                {activeTab === "registrations" ? (
                    paginatedItems.map((req) => (
                        <div key={req.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{req.name}</h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider">{req.organization_type || "User"}</span>
                                    {/* Naya Status Badge */}
                                    {req.status === 'pending_ciel_approval' && (
                                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider ml-2">
                                            Identity Verified (CIEL Review)
                                        </span>
                                    )}
                                    {req.opportunity && (
                                        <span className="font-bold text-slate-700 flex items-center gap-1">
                                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                                            {req.opportunity}
                                        </span>
                                    )}
                                    <span>{req.email}</span>
                                    <span>
                                        • Applied: {formatDateTime(req.created_at || req.createdAt || req.submitted_at || req.submittedAt)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleRejectClick(req.id, 'user')}
                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors">
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                                <button
                                    onClick={() => handleApprove(req.id, 'user')}
                                    disabled={approveSubmittingKey === `user:${req.id}`}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed">
                                    {approveSubmittingKey === `user:${req.id}` ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Approving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" /> {req.opportunity ? 'Approve Participation' : 'Approve User'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    paginatedItems.map((proj) => {
                        const projRow = proj as Record<string, unknown>;
                        const flowLabel = readFlowStatus(projRow);
                        const canAdminApprove = readAdminCanApprove(projRow);
                        return (
                        <div key={proj.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{proj.title}</h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                                    <span className="font-bold text-blue-600">{proj.partner_name || "Unknown Partner"}</span>
                                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{proj.types?.[0] || "General"}</span>
                                    {flowLabel ? (
                                        <span
                                            className="bg-violet-50 text-violet-800 px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider border border-violet-100"
                                            title="Workflow position in the approval chain"
                                        >
                                            {flowLabel}
                                        </span>
                                    ) : null}
                                    <span>
                                        • Submitted:{" "}
                                        {formatDateTime(
                                            proj.submitted_at || proj.submittedAt || proj.created_at || proj.createdAt,
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                                <button
                                    type="button"
                                    title="View full opportunity details"
                                    aria-label="View opportunity details"
                                    onClick={() => {
                                        setSelectedOpportunity(proj);
                                        setIsDetailModalOpen(true);
                                    }}
                                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors shadow-sm"
                                >
                                    <Eye className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedOpportunity(proj);
                                        setIsDetailModalOpen(true);
                                    }}
                                    className="text-slate-500 hover:text-blue-600 text-sm font-bold hidden sm:flex items-center gap-1"
                                >
                                    Details <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleRejectClick(proj.id, 'opportunity')}
                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
                                >
                                    <XCircle className="w-4 h-4" /> Return
                                </button>
                                <button
                                    onClick={() => handleApprove(proj.id, 'opportunity')}
                                    disabled={
                                        !canAdminApprove || approveSubmittingKey === `opportunity:${proj.id}`
                                    }
                                    title={
                                        !canAdminApprove
                                            ? "Executing organization verification pending"
                                            : undefined
                                    }
                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg disabled:cursor-not-allowed ${
                                        canAdminApprove
                                            ? "bg-green-600 text-white hover:bg-green-700 shadow-green-200 disabled:opacity-60"
                                            : "bg-slate-200 text-slate-500 shadow-none cursor-not-allowed opacity-70"
                                    }`}
                                >
                                    {approveSubmittingKey === `opportunity:${proj.id}` ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Approving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" /> Approve Project
                                        </>
                                    )}
                                </button>
                                {/* <button
                                    onClick={() => handleChatWithPartner(proj)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                                    title="Chat with Partner"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                </button> */}
                            </div>
                        </div>
                        );
                    })
                )}

                {filteredItems.length === 0 && !isLoading && (
                    <div className="text-center py-10 text-slate-500">
                        {searchQuery ? "No results found matching your search." : "No pending items found."}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {!isLoading && filteredItems.length > 0 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredItems.length}
                    itemsPerPage={itemsPerPage}
                />
            )}
            </>
            ) : null}
            {/* View Details Modal */}
            {isDetailModalOpen && selectedOpportunity && adminDetailView && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                                <div>
                                    {(() => {
                                        const submittedAt = pickDetailDate(
                                            adminDetailView,
                                            "submitted_at",
                                            "submittedAt",
                                            "created_at",
                                            "createdAt",
                                            "date_submitted",
                                        );
                                        return submittedAt ? (
                                            <p className="text-xs text-slate-400 mb-1">
                                                Submitted: {formatDateTime(submittedAt)}
                                            </p>
                                        ) : null;
                                    })()}
                                    <h2 className="text-2xl font-bold text-slate-900">
                                        {String(adminDetailView.title ?? selectedOpportunity.title ?? "Opportunity")}
                                    </h2>
                                    <p className="text-slate-500">
                                        {String(
                                            adminDetailView.partner_name ??
                                                selectedOpportunity.partner_name ??
                                                "Pending opportunity",
                                        )}
                                    </p>
                                    {(() => {
                                        const flow = readFlowStatus(adminDetailView as Record<string, unknown>);
                                        return flow ? (
                                            <p className="mt-2">
                                                <span
                                                    className="inline-flex items-center bg-violet-50 text-violet-800 px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider border border-violet-100"
                                                    title="Workflow position in the approval chain"
                                                >
                                                    {flow}
                                                </span>
                                            </p>
                                        ) : null;
                                    })()}
                                </div>
                                <button
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        setOpportunityDetail(null);
                                    }}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            {opportunityDetailLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                                    <p className="text-sm font-medium">Loading full record (student, faculty, partner)…</p>
                                </div>
                            ) : null}

                            <div className={`space-y-8 pr-2 ${opportunityDetailLoading ? "opacity-50 pointer-events-none" : ""}`}>
                                {(() => {
                                    const v = adminDetailView as Record<string, unknown>;
                                    const sh = stakeholderRows(v);
                                    const hasStudent =
                                        sh.student.name ||
                                        sh.student.email ||
                                        sh.student.id ||
                                        sh.student.university ||
                                        sh.student.department ||
                                        sh.student.phone;
                                    const facultyPipeline = facultyApprovalPipelineApplies(v);
                                    const hasFaculty = facultyPipeline && !!(sh.facultyName || sh.facultyEmail);
                                    const hasPartner = sh.partnerOrg || sh.partnerPerson || sh.partnerEmail;
                                    const facultyStatus = normalizeApprovalState(v.faculty_approval_status);
                                    const partnerStatus = normalizeApprovalState(v.partner_approval_status);
                                    const adminStatus =
                                        normalizeApprovalState(v.admin_approval_status) ||
                                        (normalizeApprovalState(v.workflow_stage) === "pending_admin" ||
                                        normalizeApprovalState(v.workflow_stage) === "pending_approval"
                                            ? "pending"
                                            : "");
                                    const submittedAt = pickDetailDate(
                                        v,
                                        "submitted_at",
                                        "submittedAt",
                                        "created_at",
                                        "createdAt",
                                        "date_submitted",
                                    );
                                    const execToken =
                                        typeof v.execution_verification_token === "string"
                                            ? v.execution_verification_token.trim()
                                            : typeof v.executionVerificationToken === "string"
                                              ? v.executionVerificationToken.trim()
                                              : "";
                                    const execVerified = v.execution_verified === true || v.executionVerified === true;
                                    const needsExecutingOrgVerify = !!execToken && !execVerified;

                                    const facultyGateStatus = facultyPipeline
                                        ? facultyStatus || "pending"
                                        : "not_applicable";
                                    const facultyGateHelper = facultyPipeline
                                        ? sh.facultyName || sh.facultyEmail || "Waiting for faculty review"
                                        : sh.facultyName || sh.facultyEmail
                                          ? "Supervision / executing contact on file (not a separate faculty approval gate for this posting type)"
                                          : "No separate faculty approval gate for this posting type";

                                    const approvalStages = [
                                        {
                                            label: "Student",
                                            helper: submittedAt ? `Submitted ${formatDateTime(submittedAt)}` : "Submission received",
                                            status: "approved",
                                        },
                                        {
                                            label: "Faculty",
                                            helper: facultyGateHelper,
                                            status: facultyGateStatus,
                                        },
                                        {
                                            label: "Partner",
                                            helper: needsExecutingOrgVerify
                                                ? "Executing organization email verification pending"
                                                : sh.partnerOrg || sh.partnerPerson || sh.partnerEmail
                                                    ? sh.partnerOrg || sh.partnerPerson || sh.partnerEmail
                                                    : "No partner step on this record",
                                            status: needsExecutingOrgVerify
                                                ? "pending"
                                                : hasPartner || partnerStatus
                                                    ? partnerStatus || "pending"
                                                    : "not_applicable",
                                        },
                                        {
                                            label: "Admin",
                                            helper: "CIEL final approval",
                                            status: adminStatus || "pending",
                                        },
                                    ];
                                    const wfBits = [
                                        v.workflow_stage ? `Workflow: ${String(v.workflow_stage)}` : "",
                                        v.faculty_approval_status ? `Faculty: ${String(v.faculty_approval_status)}` : "",
                                        v.partner_approval_status ? `Partner: ${String(v.partner_approval_status)}` : "",
                                        v.admin_approval_status ? `Admin: ${String(v.admin_approval_status)}` : "",
                                    ].filter(Boolean);
                                    return (
                                        <>
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                            <div className="flex items-center justify-between gap-3 mb-4">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                        Approval Workflow
                                                    </p>
                                                    <p className="text-sm text-slate-600 mt-1">
                                                        Track who has approved this opportunity so far.
                                                    </p>
                                                </div>
                                                {v.workflow_stage ? (
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                                        {String(v.workflow_stage).replace(/_/g, " ")}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {approvalStages.map((stage) => (
                                                    <div key={stage.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                    {stage.label}
                                                                </p>
                                                                <p className="mt-2 text-sm font-semibold text-slate-900 capitalize">
                                                                    {approvalLabel(stage.status)}
                                                                </p>
                                                            </div>
                                                            <span
                                                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${approvalPillClass(stage.status)}`}
                                                            >
                                                                {approvalLabel(stage.status)}
                                                            </span>
                                                        </div>
                                                        <p className="mt-2 text-xs text-slate-500">{stage.helper}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {wfBits.length > 0 ? (
                                                <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                        Approval pipeline (backend fields)
                                                    </p>
                                                    <p className="text-xs font-mono leading-relaxed">{wfBits.join(" · ")}</p>
                                                    {v.is_student_created === true ? (
                                                        <p className="text-[10px] text-slate-500 mt-2">Student-created opportunity</p>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {hasStudent ? (
                                                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 md:col-span-1">
                                                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
                                                        Student
                                                    </h3>
                                                    <ul className="text-sm text-slate-800 space-y-1">
                                                        {sh.student.name ? (
                                                            <li>
                                                                <span className="text-slate-500">Name:</span> {sh.student.name}
                                                            </li>
                                                        ) : null}
                                                        {sh.student.email ? (
                                                            <li>
                                                                <span className="text-slate-500">Email:</span> {sh.student.email}
                                                            </li>
                                                        ) : null}
                                                        {sh.student.id ? (
                                                            <li>
                                                                <span className="text-slate-500">Id:</span> {formatDisplayId(sh.student.id, "STU")}
                                                            </li>
                                                        ) : null}
                                                        {sh.student.university ? (
                                                            <li>
                                                                <span className="text-slate-500">University:</span> {sh.student.university}
                                                            </li>
                                                        ) : null}
                                                        {sh.student.department ? (
                                                            <li>
                                                                <span className="text-slate-500">Department:</span> {sh.student.department}
                                                            </li>
                                                        ) : null}
                                                        {sh.student.phone ? (
                                                            <li>
                                                                <span className="text-slate-500">Contact:</span> {sh.student.phone}
                                                            </li>
                                                        ) : null}
                                                    </ul>
                                                </div>
                                            ) : null}
                                            {hasFaculty ? (
                                                <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4 md:col-span-1">
                                                    <h3 className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-2">
                                                        Faculty
                                                    </h3>
                                                    <ul className="text-sm text-slate-800 space-y-1">
                                                        {sh.facultyName ? (
                                                            <li>
                                                                <span className="text-slate-500">Supervisor:</span> {sh.facultyName}
                                                            </li>
                                                        ) : null}
                                                        {sh.facultyEmail ? (
                                                            <li>
                                                                <span className="text-slate-500">Official email:</span> {sh.facultyEmail}
                                                            </li>
                                                        ) : null}
                                                    </ul>
                                                </div>
                                            ) : null}
                                            {hasPartner ? (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 md:col-span-1">
                                                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
                                                        Partner
                                                    </h3>
                                                    <ul className="text-sm text-slate-800 space-y-1">
                                                        {sh.partnerOrg ? (
                                                            <li>
                                                                <span className="text-slate-500">Organization:</span> {sh.partnerOrg}
                                                            </li>
                                                        ) : null}
                                                        {sh.partnerPerson ? (
                                                            <li>
                                                                <span className="text-slate-500">Contact:</span> {sh.partnerPerson}
                                                            </li>
                                                        ) : null}
                                                        {sh.partnerEmail ? (
                                                            <li>
                                                                <span className="text-slate-500">Email:</span> {sh.partnerEmail}
                                                            </li>
                                                        ) : null}
                                                    </ul>
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 md:col-span-1 flex items-center">
                                                    <p className="text-xs text-slate-500">
                                                        No external partner on this record (student-led or independent context).
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        </>
                                    );
                                })()}

                                {/* Section 1: Overview & Logistics */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Overview & Logistics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Mode</span>
                                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded text-sm">{String(adminDetailView.mode ?? "N/A")}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Location</span>
                                            <span className="font-bold text-slate-900 text-sm">
                                                {adminDetailView.location
                                                    ? `${(adminDetailView.location as { venue?: string }).venue || ""}, ${(adminDetailView.location as { city?: string }).city || ""}`
                                                    : "Remote"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Timeline Type</span>
                                            <span className="font-bold text-slate-900 text-sm">
                                                {String((adminDetailView.timeline as { type?: string } | undefined)?.type || "N/A")}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Visibility</span>
                                            <span className="font-bold text-slate-900 text-sm capitalize">{String(adminDetailView.visibility || "Public")}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Start Date</span>
                                            <span className="font-bold text-slate-900 text-sm">
                                                {(adminDetailView.timeline as { start_date?: string } | undefined)?.start_date
                                                    ? new Date(
                                                          String((adminDetailView.timeline as { start_date?: string }).start_date),
                                                      ).toLocaleDateString()
                                                    : "TBD"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">End Date</span>
                                            <span className="font-bold text-slate-900 text-sm">
                                                {(adminDetailView.timeline as { end_date?: string } | undefined)?.end_date
                                                    ? new Date(
                                                          String((adminDetailView.timeline as { end_date?: string }).end_date),
                                                      ).toLocaleDateString()
                                                    : "TBD"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Expected Hours (Per Student)</span>
                                            <span className="font-bold text-slate-900 text-sm">
                                                {Number((adminDetailView.timeline as { expected_hours?: number } | undefined)?.expected_hours) || 0}{" "}
                                                hrs/student
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Volunteers Needed</span>
                                            <span className="font-bold text-slate-900 text-sm">
                                                {Number((adminDetailView.timeline as { volunteers_required?: number } | undefined)?.volunteers_required) || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Objectives & Impact */}
                                <div>
                                    <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-4 border-b border-teal-100 pb-2 flex items-center gap-2">
                                        <Building2 className="w-4 h-4" /> Objectives & Impact
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Project Objective</span>
                                            <p className="text-sm text-slate-700 bg-teal-50/50 p-3 rounded-lg border border-teal-100 whitespace-pre-wrap">
                                                {String(
                                                    (adminDetailView.objectives as { description?: string } | undefined)?.description ||
                                                        adminDetailView.description ||
                                                        "No objective provided.",
                                                )}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <span className="text-xs text-slate-500 block mb-1">Beneficiaries Count</span>
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {Number((adminDetailView.objectives as { beneficiaries_count?: number } | undefined)?.beneficiaries_count) || 0}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-500 block mb-1">Beneficiary Types</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {(
                                                        (adminDetailView.objectives as { beneficiaries_type?: string[] } | undefined)?.beneficiaries_type || []
                                                    ).map((t: string, i: number) => (
                                                        <span key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                            {t}
                                                        </span>
                                                    )) || <span className="text-xs text-slate-500">N/A</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: SDG Alignment */}
                                <div>
                                    <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-4 border-b border-purple-100 pb-2 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> SDG Alignment
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                            <span className="text-xs text-purple-600 block mb-1 font-bold">Primary SDG</span>
                                            <span className="font-bold text-slate-900 text-sm block">
                                                SDG {(adminDetailView.sdg_info as { sdg_id?: string | number } | undefined)?.sdg_id ?? "N/A"}
                                            </span>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                            <span className="text-xs text-purple-600 block mb-1 font-bold">Target</span>
                                            <span className="font-bold text-slate-900 text-sm block">
                                                {(adminDetailView.sdg_info as { target_id?: string | number } | undefined)?.target_id ?? "N/A"}
                                            </span>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                            <span className="text-xs text-purple-600 block mb-1 font-bold">Indicator</span>
                                            <span className="font-bold text-slate-900 text-sm block">
                                                {(adminDetailView.sdg_info as { indicator_id?: string | number } | undefined)?.indicator_id ?? "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: Activities & Skills */}
                                <div>
                                    <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Activities & Skills
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Student Responsibilities</span>
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap pl-4 border-l-2 border-indigo-200">
                                                {String(
                                                    (adminDetailView.activity_details as { student_responsibilities?: string } | undefined)
                                                        ?.student_responsibilities || "No details provided.",
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-2">Skills Gained</span>
                                            <div className="flex flex-wrap gap-2">
                                                {(
                                                    (adminDetailView.activity_details as { skills_gained?: string[] } | undefined)?.skills_gained || []
                                                ).map((skill: string, idx: number) => (
                                                    <span
                                                        key={idx}
                                                        className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-100"
                                                    >
                                                        {skill}
                                                    </span>
                                                )) || <span className="text-xs text-slate-500">None specified</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 5: Supervision & Verification */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-4 border-b border-orange-100 pb-2 flex items-center gap-2">
                                            <Users className="w-4 h-4" /> Supervision (full)
                                        </h3>
                                        <div className="space-y-3 bg-orange-50/50 p-4 rounded-xl">
                                            <div>
                                                <span className="text-xs text-slate-500 block">Supervisor</span>
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {String((adminDetailView.supervision as { supervisor_name?: string } | undefined)?.supervisor_name || "N/A")}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-500 block">Role</span>
                                                <span className="text-slate-900 text-sm">
                                                    {String((adminDetailView.supervision as { role?: string } | undefined)?.role || "N/A")}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-500 block">Contact</span>
                                                <span className="text-slate-900 text-sm">
                                                    {String((adminDetailView.supervision as { contact?: string } | undefined)?.contact || "N/A")}
                                                </span>
                                            </div>
                                            <div className="flex gap-4 mt-2">
                                                {(adminDetailView.supervision as { safe_environment?: boolean } | undefined)?.safe_environment && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1 font-bold">
                                                        <CheckCircle className="w-3 h-3" /> Safe Env
                                                    </span>
                                                )}
                                                {(adminDetailView.supervision as { supervised?: boolean } | undefined)?.supervised && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1 font-bold">
                                                        <CheckCircle className="w-3 h-3" /> Supervised
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-4 border-b border-cyan-100 pb-2 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" /> Verification
                                        </h3>
                                        <div className="bg-cyan-50/50 p-4 rounded-xl">
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                                                {Array.isArray(adminDetailView.verification_method) ? (
                                                    (adminDetailView.verification_method as string[]).map((method: string, i: number) => (
                                                        <li key={i}>{method}</li>
                                                    ))
                                                ) : (
                                                    <li>No verification method specified</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        setOpportunityDetail(null);
                                    }}
                                    className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        setOpportunityDetail(null);
                                        handleRejectClick(selectedOpportunity.id, "opportunity");
                                    }}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => {
                                        handleApprove(selectedOpportunity.id, "opportunity");
                                        setIsDetailModalOpen(false);
                                        setOpportunityDetail(null);
                                    }}
                                    disabled={
                                        !readAdminCanApprove(adminDetailView as Record<string, unknown>) ||
                                        opportunityDetailLoading ||
                                        approveSubmittingKey === `opportunity:${selectedOpportunity.id}`
                                    }
                                    title={
                                        !readAdminCanApprove(adminDetailView as Record<string, unknown>)
                                            ? "Executing organization verification pending"
                                            : undefined
                                    }
                                    className={`px-4 py-2 rounded-lg font-bold disabled:cursor-not-allowed ${
                                        readAdminCanApprove(adminDetailView as Record<string, unknown>)
                                            ? "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                            : "bg-slate-200 text-slate-500 cursor-not-allowed opacity-70"
                                    }`}
                                >
                                    {approveSubmittingKey === `opportunity:${selectedOpportunity.id}` ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Approving...
                                        </span>
                                    ) : (
                                        "Approve"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {/* Reject Reason Modal */}
            {
                isRejectModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Return Opportunity</h2>
                                <button onClick={() => setIsRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Reason for Return</label>
                                <textarea
                                    className="w-full h-32 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Please explain why this opportunity is being returned..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsRejectModalOpen(false)}
                                    className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmReject}
                                    disabled={!rejectReason.trim()}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirm Return
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
