"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import DataTable from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { Search, Filter, MoreVertical, Briefcase, MapPin, Eye, FileDown, Trash2, Users, Loader2, X, UserMinus } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

type AdminProjectRow = {
    id: string;
    title: string;
    subtitle: string;
    displayStatus: string;
    statusKey: string;
    locationLabel: string;
    locationKey: string;
    /** Current enrolled / joined volunteers */
    volunteers: number;
    /** Capacity target when API sends volunteers_required */
    volunteersRequired: number | null;
    remainingSeats: number | null;
    remainingMembers: number | null;
    hours: number;
    remainingHours: number | null;
    raw: Record<string, unknown>;
};

function lower(v: unknown): string {
    if (v == null) return "";
    return String(v).trim().toLowerCase();
}

function extractAdminProjectsList(body: unknown): Record<string, unknown>[] {
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

function pickLocation(p: Record<string, unknown>): string {
    const loc = p.location;
    if (typeof loc === "string" && loc.trim()) return loc.trim();
    if (loc && typeof loc === "object") {
        const l = loc as Record<string, unknown>;
        const city = typeof l.city === "string" ? l.city : "";
        const venue = typeof l.venue === "string" ? l.venue : "";
        const joined = [venue, city].filter(Boolean).join(", ");
        if (joined) return joined;
    }
    if (typeof p.city === "string" && p.city.trim()) return p.city.trim();
    return "Unknown";
}

function subtitleFromRaw(raw: Record<string, unknown>): string {
    const c = raw.creator && typeof raw.creator === "object" ? (raw.creator as Record<string, unknown>) : null;
    const fromCreator = c && typeof c.name === "string" ? c.name.trim() : "";
    return (
        (typeof raw.partner_name === "string" && raw.partner_name.trim()) ||
        (typeof raw.org === "string" && raw.org.trim()) ||
        (typeof raw.organization_name === "string" && raw.organization_name.trim()) ||
        fromCreator ||
        "—"
    );
}

function optionalPositiveNumber(raw: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
        const n = Number(raw[key]);
        if (Number.isFinite(n) && n >= 0) return n;
    }
    return null;
}

function normalizeAdminProjectRow(raw: Record<string, unknown>): AdminProjectRow | null {
    const id = String(raw.id ?? raw.opportunity_id ?? "").trim();
    if (!id) return null;
    const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Untitled";
    const workflow = lower(raw.workflow_stage ?? raw.approval_stage);
    const status = lower(raw.status);
    const fac = lower(raw.faculty_approval_status);
    const part = lower(raw.partner_approval_status);

    let statusKey = workflow || status || "unknown";
    if (!workflow && status === "pending" && fac === "pending") statusKey = "pending_faculty";
    if (!workflow && fac === "approved" && part === "pending") statusKey = "pending_partner";

    let displayStatus = statusKey.replace(/_/g, " ").trim() || "unknown";
    if (workflow) displayStatus = String(raw.workflow_stage ?? raw.approval_stage ?? displayStatus).replace(/_/g, " ");
    else if (status) displayStatus = String(raw.status).replace(/_/g, " ");
    displayStatus = displayStatus.toUpperCase();

    const timeline = raw.timeline && typeof raw.timeline === "object" ? (raw.timeline as Record<string, unknown>) : null;
    /** Enrolled count only — never use volunteers_required here (capacity is separate). */
    const volunteers = Number(raw.volunteers ?? raw.volunteers_count) || 0;
    const vrFromRoot = optionalPositiveNumber(raw, ["volunteers_required"]);
    const vrFromTimeline = timeline ? optionalPositiveNumber(timeline, ["volunteers_required"]) : null;
    const volunteersRequired = vrFromRoot ?? vrFromTimeline;

    const hours =
        Number(raw.hours ?? raw.total_hours ?? raw.verified_hours ?? timeline?.expected_hours ?? raw.impact_hours) || 0;

    const parseNonNegInt = (v: unknown): number | null =>
        v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : null;

    const remainingHours = parseNonNegInt(raw.remaining_hours);
    const remainingSeats = parseNonNegInt(raw.remaining_seats);
    const remainingMembers = parseNonNegInt(raw.remaining_members);

    return {
        id,
        title,
        subtitle: subtitleFromRaw(raw),
        displayStatus,
        statusKey,
        locationLabel: pickLocation(raw),
        locationKey: pickLocation(raw).toLowerCase(),
        volunteers,
        volunteersRequired: volunteersRequired !== null && volunteersRequired > 0 ? volunteersRequired : null,
        remainingSeats,
        remainingMembers,
        hours,
        remainingHours,
        raw,
    };
}

type IncompleteReportApplicantRow = {
    applicationId: string;
    studentName: string;
    studentEmail: string;
    reportStatusRaw: string;
    reportStatusLabel: string;
};

type IncompleteApplicantStatusFilter = "all" | "not_started" | "draft_or_progress";

function normalizeReportStatusKey(value: string): string {
    return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function humanizeIncompleteApplicantStatus(raw: string): string {
    const key = normalizeReportStatusKey(raw);
    if (key === "not_started") return "No report started";
    if (key === "draft") return "Draft";
    if (key === "in_progress" || key === "inprogress") return "In progress";
    if (key === "incomplete") return "Incomplete";
    return raw.replace(/_/g, " ");
}

function incompleteApplicantBadgeClass(reportStatusRaw: string): string {
    const key = normalizeReportStatusKey(reportStatusRaw);
    if (key === "not_started")
        return "bg-slate-100 text-slate-700 border border-slate-200";
    if (key === "draft") return "bg-amber-50 text-amber-900 border border-amber-100";
    return "bg-amber-50 text-amber-800 border border-amber-100";
}

type TeamMemberRow = {
    id: string;
    name: string;
    email: string;
    role: string;
    reportStatus: string;
    reportAvailable: boolean;
};

type ParticipationMode = "team" | "individual";

type TeamOverviewRow = {
    id: string;
    teamName: string;
    leadName: string;
    reportStatus: string;
    reportAvailable: boolean;
    members: TeamMemberRow[];
    participationMode: ParticipationMode;
};

function normalizeParticipationMode(raw: Record<string, unknown>): ParticipationMode {
    const v = lower(raw.participation_mode ?? raw.participationMode);
    if (v === "individual") return "individual";
    return "team";
}

/** Listing-only synthetic group key; DELETE .../teams/:teamId expects a persisted Participation.teamId. */
function isSyntheticIndividualGroupId(teamId: string): boolean {
    return /^individual:/i.test(String(teamId).trim());
}

function teamOverviewRemoveGroupDisabled(team: TeamOverviewRow): boolean {
    return isSyntheticIndividualGroupId(team.id);
}

type TeamOverviewSummary = {
    registeredTeams: number;
    completedReports: number;
    reportsAvailable: number;
};

/** Backend returns { data: [...] }; keep fallbacks for older payloads only. */
function extractIncompleteApplicantsList(body: unknown): Record<string, unknown>[] {
    if (Array.isArray(body)) return body as Record<string, unknown>[];
    if (body && typeof body === "object") {
        const o = body as Record<string, unknown>;
        const data = o.data;
        if (Array.isArray(data)) return data as Record<string, unknown>[];
        for (const k of ["applicants", "items", "rows", "students"] as const) {
            const v = o[k];
            if (Array.isArray(v)) return v as Record<string, unknown>[];
        }
    }
    return [];
}

function mapIncompleteApplicant(raw: Record<string, unknown>): IncompleteReportApplicantRow | null {
    const applicationId = String(raw.application_id ?? raw.applicationId ?? "").trim();
    if (!applicationId) return null;
    const name =
        (typeof raw.student_name === "string" && raw.student_name.trim()) ||
        (typeof raw.studentName === "string" && raw.studentName.trim()) ||
        "—";
    const email =
        (typeof raw.student_email === "string" && raw.student_email.trim()) ||
        (typeof raw.studentEmail === "string" && raw.studentEmail.trim()) ||
        "";
    const reportStatusRaw =
        (typeof raw.report_status === "string" && raw.report_status.trim()) ||
        (typeof raw.reportStatus === "string" && raw.reportStatus.trim()) ||
        "incomplete";
    return {
        applicationId,
        studentName: name,
        studentEmail: email,
        reportStatusRaw,
        reportStatusLabel: humanizeIncompleteApplicantStatus(reportStatusRaw),
    };
}

function incompleteApplicantMatchesFilter(row: IncompleteReportApplicantRow, filter: IncompleteApplicantStatusFilter): boolean {
    if (filter === "all") return true;
    const key = normalizeReportStatusKey(row.reportStatusRaw);
    if (filter === "not_started") return key === "not_started";
    if (filter === "draft_or_progress") return key !== "not_started";
    return true;
}

function pickString(raw: Record<string, unknown>, keys: string[], fallback = ""): string {
    for (const key of keys) {
        const value = raw[key];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return fallback;
}

function pickBoolean(raw: Record<string, unknown>, keys: string[], fallback = false): boolean {
    for (const key of keys) {
        const value = raw[key];
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value > 0;
        if (typeof value === "string") {
            const s = value.trim().toLowerCase();
            if (["true", "1", "yes", "available", "completed"].includes(s)) return true;
            if (["false", "0", "no", "unavailable"].includes(s)) return false;
        }
    }
    return fallback;
}

function mapTeamMember(raw: Record<string, unknown>): TeamMemberRow | null {
    const id = pickString(raw, ["id", "member_id", "memberId", "student_id", "studentId", "application_id", "applicationId"]);
    if (!id) return null;
    return {
        id,
        name: pickString(raw, ["name", "student_name", "studentName", "full_name", "fullName"], "—"),
        email: pickString(raw, ["email", "student_email", "studentEmail"], ""),
        role: pickString(raw, ["role", "member_role", "memberRole"], "Member"),
        reportStatus: pickString(raw, ["report_status", "reportStatus", "status"], "not_started").replace(/_/g, " "),
        reportAvailable: pickBoolean(raw, ["report_available", "reportAvailable", "is_report_available", "isReportAvailable"]),
    };
}

function extractTeamRows(body: unknown): TeamOverviewRow[] {
    const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const listCandidate = payload ? payload.data ?? payload.teams ?? payload.items ?? payload.rows : body;
    const list = Array.isArray(listCandidate) ? listCandidate : [];
    return list
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const raw = item as Record<string, unknown>;
            const id = pickString(raw, ["id", "team_id", "teamId", "application_id", "applicationId"]);
            if (!id) return null;
            const participationMode = normalizeParticipationMode(raw);
            const membersCandidate = raw.members ?? raw.team_members ?? raw.teamMembers ?? raw.students;
            const members = Array.isArray(membersCandidate)
                ? membersCandidate.map((m) => (m && typeof m === "object" ? mapTeamMember(m as Record<string, unknown>) : null)).filter(Boolean) as TeamMemberRow[]
                : [];
            return {
                id,
                teamName: pickString(raw, ["team_name", "teamName", "name"], "Untitled team"),
                leadName: pickString(raw, ["lead_name", "leadName", "student_name", "studentName"], members[0]?.name || "—"),
                reportStatus: pickString(raw, ["report_status", "reportStatus", "status"], "not_started").replace(/_/g, " "),
                reportAvailable: pickBoolean(raw, ["report_available", "reportAvailable", "is_report_available", "isReportAvailable"]),
                members,
                participationMode,
            };
        })
        .filter(Boolean) as TeamOverviewRow[];
}

function extractTeamSummary(body: unknown, rows: TeamOverviewRow[]): TeamOverviewSummary {
    const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const summaryRaw = payload && typeof payload.summary === "object" ? (payload.summary as Record<string, unknown>) : null;
    const summaryFromApi = {
        registeredTeams: Number(summaryRaw?.registered_teams ?? summaryRaw?.registeredTeams ?? 0),
        completedReports: Number(summaryRaw?.completed_reports ?? summaryRaw?.completedReports ?? 0),
        reportsAvailable: Number(summaryRaw?.reports_available ?? summaryRaw?.reportsAvailable ?? 0),
    };
    if (summaryFromApi.registeredTeams > 0 || summaryFromApi.completedReports > 0 || summaryFromApi.reportsAvailable > 0) {
        return summaryFromApi;
    }
    const completedReports = rows.filter((team) => lower(team.reportStatus) === "completed").length;
    const reportsAvailable = rows.filter((team) => team.reportAvailable).length;
    return {
        registeredTeams: rows.length,
        completedReports,
        reportsAvailable,
    };
}

function statusBadgeClass(statusKey: string): string {
    const s = statusKey.toLowerCase();
    if (s === "active" || s === "live" || s === "approved") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (s === "completed") return "bg-blue-50 text-blue-700 border border-blue-200";
    if (s === "rejected") return "bg-rose-50 text-rose-700 border border-rose-200";
    if (s.includes("pending_faculty") || s === "pending_faculty" || s.includes("faculty"))
        return "bg-slate-100 text-slate-700 border border-slate-200";
    if (s.includes("pending_partner") || s.includes("partner")) return "bg-violet-50 text-violet-800 border border-violet-200";
    if (s.includes("pending_admin") || s.includes("pending_approval") || s.includes("admin"))
        return "bg-amber-50 text-amber-800 border border-amber-200";
    return "bg-slate-50 text-slate-600 border border-slate-200";
}

export default function AdminProjectsPage() {
    const [rows, setRows] = useState<AdminProjectRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");
    const [activeMenu, setActiveMenu] = useState<{ id: string; top: number; right: number } | null>(null);
    const [applicantsModal, setApplicantsModal] = useState<{ opportunityId: string; title: string } | null>(null);
    const [incompleteApplicants, setIncompleteApplicants] = useState<IncompleteReportApplicantRow[]>([]);
    const [applicantsLoading, setApplicantsLoading] = useState(false);
    const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null);
    const [teamOverviewModal, setTeamOverviewModal] = useState<{ opportunityId: string; title: string } | null>(null);
    const [teamOverviewRows, setTeamOverviewRows] = useState<TeamOverviewRow[]>([]);
    const [teamOverviewSummary, setTeamOverviewSummary] = useState<TeamOverviewSummary>({
        registeredTeams: 0,
        completedReports: 0,
        reportsAvailable: 0,
    });
    const [teamOverviewLoading, setTeamOverviewLoading] = useState(false);
    const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
    const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
    const [teamOverviewParticipationFilter, setTeamOverviewParticipationFilter] = useState<"all" | "team" | "individual">("all");
    const [incompleteApplicantStatusFilter, setIncompleteApplicantStatusFilter] = useState<IncompleteApplicantStatusFilter>("all");
    /** Bumps when the modal closes or reopens so in-flight fetches cannot apply stale rows. */
    const incompleteApplicantsLoadSeq = useRef(0);

    const loadProjects = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/projects`);
            if (!res || !res.ok) {
                const err = res ? await res.json().catch(() => ({})) : {};
                toast.error(typeof (err as { error?: string }).error === "string" ? (err as { error: string }).error : "Could not load projects");
                setRows([]);
                return;
            }
            const data = await res.json();
            const list = extractAdminProjectsList(data);
            const mapped = list.map(normalizeAdminProjectRow).filter(Boolean) as AdminProjectRow[];
            setRows(mapped);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load projects");
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadProjects();
    }, [loadProjects]);

    const loadIncompleteApplicants = useCallback(async (opportunityId: string, seq: number) => {
        setApplicantsLoading(true);
        setIncompleteApplicants([]);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(opportunityId)}/incomplete-report-applicants`,
            );
            if (seq !== incompleteApplicantsLoadSeq.current) return;
            if (!res) {
                toast.error("Could not load applicant list");
                setIncompleteApplicants([]);
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (seq !== incompleteApplicantsLoadSeq.current) return;
            if (!res.ok) {
                const msg =
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not load applicant list";
                toast.error(msg);
                setIncompleteApplicants([]);
                return;
            }
            const list = extractIncompleteApplicantsList(data)
                .map(mapIncompleteApplicant)
                .filter(Boolean) as IncompleteReportApplicantRow[];
            if (seq !== incompleteApplicantsLoadSeq.current) return;
            setIncompleteApplicants(list);
        } catch {
            if (seq !== incompleteApplicantsLoadSeq.current) return;
            toast.error("Could not load applicant list");
            setIncompleteApplicants([]);
        } finally {
            if (seq === incompleteApplicantsLoadSeq.current) {
                setApplicantsLoading(false);
            }
        }
    }, []);

    const closeApplicantsModal = useCallback(() => {
        incompleteApplicantsLoadSeq.current += 1;
        setApplicantsModal(null);
        setIncompleteApplicants([]);
        setApplicantsLoading(false);
        setDeletingApplicationId(null);
        setIncompleteApplicantStatusFilter("all");
    }, []);

    const openApplicantsModal = (row: AdminProjectRow) => {
        setActiveMenu(null);
        incompleteApplicantsLoadSeq.current += 1;
        const seq = incompleteApplicantsLoadSeq.current;
        setApplicantsModal({ opportunityId: row.id, title: row.title });
        void loadIncompleteApplicants(row.id, seq);
    };

    const closeTeamOverviewModal = useCallback(() => {
        setTeamOverviewModal(null);
        setTeamOverviewRows([]);
        setTeamOverviewSummary({
            registeredTeams: 0,
            completedReports: 0,
            reportsAvailable: 0,
        });
        setTeamOverviewLoading(false);
        setDeletingTeamId(null);
        setDeletingMemberId(null);
        setTeamOverviewParticipationFilter("all");
    }, []);

    const loadTeamOverview = useCallback(async (opportunityId: string) => {
        setTeamOverviewLoading(true);
        setTeamOverviewRows([]);
        setTeamOverviewSummary({
            registeredTeams: 0,
            completedReports: 0,
            reportsAvailable: 0,
        });
        try {
            const res = await authenticatedFetch(`/api/v1/admin/opportunities/${encodeURIComponent(opportunityId)}/teams`);
            if (!res) {
                toast.error("Could not load team overview");
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not load team overview",
                );
                return;
            }
            const mappedRows = extractTeamRows(data);
            setTeamOverviewRows(mappedRows);
            setTeamOverviewSummary(extractTeamSummary(data, mappedRows));
        } catch {
            toast.error("Could not load team overview");
        } finally {
            setTeamOverviewLoading(false);
        }
    }, []);

    const openTeamOverviewModal = (row: AdminProjectRow) => {
        setActiveMenu(null);
        setTeamOverviewModal({ opportunityId: row.id, title: row.title });
        void loadTeamOverview(row.id);
    };

    const handleRemoveTeam = async (teamId: string) => {
        if (!teamOverviewModal) return;
        if (
            !confirm(
                "Remove this full team?\n\nAll team members will be removed from this project and seats will be released.\n\nThis cannot be undone.",
            )
        ) {
            return;
        }
        setDeletingTeamId(teamId);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(teamOverviewModal.opportunityId)}/teams/${encodeURIComponent(teamId)}`,
                { method: "DELETE" },
            );
            if (res && (res.ok || res.status === 204)) {
                toast.success("Team removed successfully");
                await loadTeamOverview(teamOverviewModal.opportunityId);
                await loadProjects();
            } else {
                const data = res ? await res.json().catch(() => ({})) : {};
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not remove team",
                );
            }
        } catch {
            toast.error("Could not remove team");
        } finally {
            setDeletingTeamId(null);
        }
    };

    const handleRemoveTeamMember = async (teamId: string, memberId: string) => {
        if (!teamOverviewModal) return;
        if (!confirm("Remove this member from team?\n\nThis action cannot be undone.")) return;
        setDeletingMemberId(memberId);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(teamOverviewModal.opportunityId)}/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`,
                { method: "DELETE" },
            );
            if (res && (res.ok || res.status === 204)) {
                toast.success("Member removed successfully");
                await loadTeamOverview(teamOverviewModal.opportunityId);
                await loadProjects();
            } else {
                const data = res ? await res.json().catch(() => ({})) : {};
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not remove member",
                );
            }
        } catch {
            toast.error("Could not remove member");
        } finally {
            setDeletingMemberId(null);
        }
    };

    const handleRemoveIncompleteApplicant = async (applicationId: string) => {
        if (!applicantsModal) return;
        if (
            !confirm(
                "Withdraw this applicant from the project (admin)?\n\nParticipation and in-progress report data for this opportunity will be cleared, and the seat will show as available again — same occupancy rules as the rest of the app.\n\nThis cannot be undone.",
            )
        ) {
            return;
        }
        setDeletingApplicationId(applicationId);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(applicantsModal.opportunityId)}/applications/${encodeURIComponent(applicationId)}`,
                { method: "DELETE" },
            );
            if (res && (res.ok || res.status === 204)) {
                toast.success("Applicant withdrawn; seat freed");
                setIncompleteApplicants((prev) => prev.filter((r) => r.applicationId !== applicationId));
                await loadProjects();
            } else {
                const body = res ? await res.json().catch(() => ({})) : {};
                toast.error(
                    typeof (body as { message?: string }).message === "string"
                        ? (body as { message: string }).message
                        : "Could not remove applicant",
                );
            }
        } catch {
            toast.error("Could not remove applicant");
        } finally {
            setDeletingApplicationId(null);
        }
    };

    useEffect(() => {
        if (!activeMenu) return;
        if (!rows.some((r) => r.id === activeMenu.id)) {
            setActiveMenu(null);
            return;
        }
        const close = () => setActiveMenu(null);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [activeMenu, rows]);

    const statusOptions = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => set.add(r.statusKey));
        return ["all", ...Array.from(set).sort()];
    }, [rows]);

    const locationOptions = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => {
            if (r.locationLabel && r.locationLabel !== "Unknown") set.add(r.locationLabel);
        });
        return ["all", ...Array.from(set).sort()];
    }, [rows]);

    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return rows.filter((r) => {
            if (statusFilter !== "all" && r.statusKey !== statusFilter) return false;
            if (locationFilter !== "all" && r.locationLabel !== locationFilter) return false;
            if (!q) return true;
            return (
                r.title.toLowerCase().includes(q) ||
                r.subtitle.toLowerCase().includes(q) ||
                r.locationLabel.toLowerCase().includes(q) ||
                r.displayStatus.toLowerCase().includes(q)
            );
        });
    }, [rows, searchQuery, statusFilter, locationFilter]);

    const filteredTeamOverviewRows = useMemo(() => {
        if (teamOverviewParticipationFilter === "all") return teamOverviewRows;
        return teamOverviewRows.filter((t) =>
            teamOverviewParticipationFilter === "individual" ? t.participationMode === "individual" : t.participationMode === "team",
        );
    }, [teamOverviewRows, teamOverviewParticipationFilter]);

    const incompleteApplicantsFiltered = useMemo(
        () => incompleteApplicants.filter((r) => incompleteApplicantMatchesFilter(r, incompleteApplicantStatusFilter)),
        [incompleteApplicants, incompleteApplicantStatusFilter],
    );

    const incompleteApplicantStatusCounts = useMemo(() => {
        let notStarted = 0;
        let other = 0;
        for (const r of incompleteApplicants) {
            if (normalizeReportStatusKey(r.reportStatusRaw) === "not_started") notStarted += 1;
            else other += 1;
        }
        return { notStarted, other, total: incompleteApplicants.length };
    }, [incompleteApplicants]);

    const teamRegisteredMetricLabel = teamOverviewRows.some((r) => r.participationMode === "individual")
        ? "Enrollments"
        : "Registered teams";

    const handleExport = () => {
        if (!filteredRows.length) {
            toast.message("No rows to export");
            return;
        }
        const headers = [
            "ID",
            "Title",
            "Organization / creator",
            "Status",
            "Volunteers enrolled",
            "Volunteers required",
            "Remaining seats",
            "Remaining members",
            "Hours logged",
            "Remaining hours",
            "Location",
        ];
        const csvContent = [
            headers.join(","),
            ...filteredRows.map((r) =>
                [
                    r.id,
                    `"${r.title.replace(/"/g, '""')}"`,
                    `"${r.subtitle.replace(/"/g, '""')}"`,
                    `"${r.displayStatus.replace(/"/g, '""')}"`,
                    r.volunteers,
                    r.volunteersRequired ?? "",
                    r.remainingSeats ?? "",
                    r.remainingMembers ?? "",
                    r.hours,
                    r.remainingHours ?? "",
                    `"${r.locationLabel.replace(/"/g, '""')}"`,
                ].join(","),
            ),
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `projects_report_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Export started");
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await authenticatedFetch(`/api/v1/admin/opportunities/${id}/status`, {
                method: "PUT",
                body: JSON.stringify({ status: newStatus }),
            });
            if (res?.ok) {
                toast.success("Status updated");
                setActiveMenu(null);
                await loadProjects();
            } else {
                toast.error("Could not update status");
            }
        } catch {
            toast.error("Could not update status");
        }
    };

    const handleDeleteOpportunity = async (id: string) => {
        const target = rows.find((row) => row.id === id);
        const label = target?.title?.trim() || "this opportunity";
        if (!confirm(`Delete "${label}"?\n\nThis should also remove related dependent records from the backend and cannot be undone.`)) {
            return;
        }

        setDeletingId(id);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/opportunities/${id}`, {
                method: "DELETE",
            });

            if (!res) {
                toast.error("Failed to delete opportunity");
                return;
            }

            if (res.ok) {
                toast.success("Opportunity deleted successfully");
                setActiveMenu(null);
                await loadProjects();
                return;
            }

            const body = await res.json().catch(() => ({}));
            const message =
                typeof (body as { message?: string; error?: string }).message === "string"
                    ? (body as { message: string }).message
                    : typeof (body as { message?: string; error?: string }).error === "string"
                      ? (body as { error: string }).error
                      : "Failed to delete opportunity";
            toast.error(message);
        } catch (error) {
            console.error("Delete opportunity failed:", error);
            toast.error("Failed to delete opportunity");
        } finally {
            setDeletingId(null);
        }
    };

    const activeMenuRow = activeMenu ? rows.find((r) => r.id === activeMenu.id) : null;

    const columns: TableColumn<AdminProjectRow>[] = [
        {
            name: "Project",
            grow: 2,
            sortable: true,
            selector: (r) => r.title,
            cell: (r) => (
                <div className="py-2 pr-2">
                    <Link
                        href={`/dashboard/student/browse/${encodeURIComponent(r.id)}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                    >
                        {r.title}
                    </Link>
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                        <Briefcase className="w-3 h-3 shrink-0" />
                        <span className="line-clamp-1">{r.subtitle}</span>
                    </div>
                </div>
            ),
        },
        {
            name: "Status",
            sortable: true,
            selector: (r) => r.displayStatus,
            cell: (r) => (
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(r.statusKey)}`}
                >
                    {r.displayStatus}
                </span>
            ),
        },
        {
            name: "Location",
            sortable: true,
            selector: (r) => r.locationLabel,
            cell: (r) => (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="line-clamp-2">{r.locationLabel}</span>
                </div>
            ),
        },
        {
            name: "Volunteers",
            sortable: true,
            width: "132px",
            selector: (r) => r.volunteers,
            cell: (r) => (
                <div className="text-center w-full py-1">
                    <span className="text-sm font-bold text-slate-900">
                        {r.volunteersRequired != null ? `${r.volunteers} / ${r.volunteersRequired}` : r.volunteers}
                    </span>
                    {r.remainingSeats != null || r.remainingMembers != null ? (
                        <div className="text-[10px] font-medium text-slate-500 mt-0.5 leading-snug">
                            {r.remainingSeats != null ? `${r.remainingSeats} seat${r.remainingSeats === 1 ? "" : "s"} left` : null}
                            {r.remainingSeats != null && r.remainingMembers != null && r.remainingMembers !== r.remainingSeats ? " · " : null}
                            {r.remainingMembers != null && r.remainingMembers !== r.remainingSeats
                                ? `${r.remainingMembers} member slot${r.remainingMembers === 1 ? "" : "s"}`
                                : null}
                            {r.remainingSeats == null && r.remainingMembers != null
                                ? `${r.remainingMembers} member slot${r.remainingMembers === 1 ? "" : "s"} left`
                                : null}
                        </div>
                    ) : null}
                </div>
            ),
        },
        {
            name: "Hours",
            sortable: true,
            width: "112px",
            selector: (r) => r.hours,
            cell: (r) => (
                <div className="text-center w-full py-1">
                    <span className="text-sm font-bold text-slate-900">{r.hours}</span>
                    {r.remainingHours != null ? (
                        <div className="text-[10px] font-medium text-slate-500 mt-0.5">{r.remainingHours} h remaining</div>
                    ) : null}
                </div>
            ),
        },
        {
            name: "Actions",
            width: "88px",
            cell: (r) => (
                <div className="relative flex justify-end py-1 w-full">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setActiveMenu((prev) =>
                                prev?.id === r.id
                                    ? null
                                    : { id: r.id, top: rect.bottom + 6, right: window.innerWidth - rect.right },
                            );
                        }}
                        className="admin-project-menu-trigger text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
                        aria-label="Actions"
                        aria-expanded={activeMenu?.id === r.id}
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Projects Overview</h1>
                    <p className="text-slate-500 mt-1 text-base">Monitor all active and past social impact projects.</p>
                </div>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={!filteredRows.length}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FileDown className="w-4 h-4" /> Export report
                </button>
            </div>

            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="search"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none font-medium text-slate-700 text-sm"
                    />
                </div>
                <div className="flex flex-wrap gap-3 shrink-0">
                    <div className="relative min-w-[160px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none appearance-none cursor-pointer"
                            aria-label="Filter by status"
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt === "all" ? "All statuses" : opt.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="relative min-w-[160px]">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none appearance-none cursor-pointer"
                            aria-label="Filter by location"
                        >
                            {locationOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt === "all" ? "All locations" : opt}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-visible min-h-[320px]">
                {filteredRows.length === 0 && !isLoading ? (
                    <div className="text-center py-24 px-4">
                        <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">No projects found</h3>
                        <p className="text-slate-500 text-sm mt-1">Try adjusting search or filters, or check the API response.</p>
                    </div>
                ) : (
                    <DataTable<AdminProjectRow>
                        columns={columns}
                        data={filteredRows}
                        progressPending={isLoading}
                        pagination
                        paginationPerPage={10}
                        paginationRowsPerPageOptions={[10, 25, 50, 100]}
                        highlightOnHover
                        responsive
                        dense
                        customStyles={{
                            headRow: {
                                style: {
                                    backgroundColor: "#f8fafc",
                                    borderBottomWidth: "1px",
                                    borderBottomColor: "#e2e8f0",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    color: "#64748b",
                                },
                            },
                            table: { style: { overflow: "visible" } },
                            tableWrapper: { style: { overflow: "visible" } },
                            rows: { style: { overflow: "visible", position: "relative" } },
                            cells: { style: { overflow: "visible" } },
                        }}
                    />
                )}
                {activeMenu && activeMenuRow && (
                    <>
                        <div className="fixed inset-0 z-40" aria-hidden onClick={() => setActiveMenu(null)} />
                        <div
                            role="menu"
                            className="admin-project-menu-panel fixed w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden text-left py-0.5"
                            style={{ top: activeMenu.top, right: activeMenu.right }}
                        >
                            <Link
                                href={`/dashboard/student/browse/${encodeURIComponent(activeMenuRow.id)}`}
                                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => setActiveMenu(null)}
                            >
                                <Eye className="w-4 h-4" /> View details
                            </Link>
                            <button
                                type="button"
                                onClick={() => openApplicantsModal(activeMenuRow)}
                                className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <Users className="w-4 h-4" /> Applicant list
                            </button>
                            <button
                                type="button"
                                onClick={() => openTeamOverviewModal(activeMenuRow)}
                                className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <Users className="w-4 h-4" /> Teams &amp; enrollments
                            </button>
                            {lower(activeMenuRow.raw.status) === "active" && (
                                <button
                                    type="button"
                                    onClick={() => void handleStatusUpdate(activeMenuRow.id, "pending_approval")}
                                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                >
                                    Revert to pending
                                </button>
                            )}
                            {lower(activeMenuRow.raw.status) === "pending_approval" && (
                                <button
                                    type="button"
                                    onClick={() => void handleStatusUpdate(activeMenuRow.id, "active")}
                                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 flex items-center gap-2"
                                >
                                    Mark active
                                </button>
                            )}
                            {lower(activeMenuRow.raw.status) !== "rejected" && (
                                <button
                                    type="button"
                                    onClick={() => void handleStatusUpdate(activeMenuRow.id, "rejected")}
                                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    Reject
                                </button>
                            )}
                            <div className="h-px bg-slate-100 my-0.5" />
                            <button
                                type="button"
                                onClick={() => void handleDeleteOpportunity(activeMenuRow.id)}
                                disabled={deletingId === activeMenuRow.id}
                                className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="w-4 h-4" />
                                {deletingId === activeMenuRow.id ? "Deleting..." : "Delete opportunity"}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {applicantsModal && (
                <>
                    <div className="fixed inset-0 z-[60] bg-slate-900/40" aria-hidden onClick={closeApplicantsModal} />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="incomplete-applicants-title"
                        className="fixed left-1/2 top-1/2 z-[70] w-[min(100%-1.5rem,28rem)] max-h-[min(85vh,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
                    >
                        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
                            <div className="min-w-0">
                                <h2 id="incomplete-applicants-title" className="text-lg font-extrabold text-slate-900 tracking-tight">
                                    Incomplete reports
                                </h2>
                                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2" title={applicantsModal.title}>
                                    Students without a completed report (including no draft started) —{" "}
                                    <span className="font-semibold text-slate-700">{applicantsModal.title}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeApplicantsModal}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
                            {applicantsLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                    <p className="text-sm font-medium">Loading applicants…</p>
                                </div>
                            ) : incompleteApplicants.length === 0 ? (
                                <div className="text-center py-10 px-2">
                                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-semibold text-slate-800">No incomplete reports</p>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        No applicants are returned for this project&apos;s incomplete-report queue (everyone is complete or not listed here).
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {incompleteApplicantStatusCounts.total > 0 ? (
                                        <p className="text-[11px] font-medium text-slate-500">
                                            {incompleteApplicantStatusCounts.total} applicant
                                            {incompleteApplicantStatusCounts.total !== 1 ? "s" : ""}
                                            {incompleteApplicantStatusCounts.notStarted > 0 ? (
                                                <>
                                                    {" · "}
                                                    {incompleteApplicantStatusCounts.notStarted} no report started
                                                </>
                                            ) : null}
                                            {incompleteApplicantStatusCounts.other > 0 ? (
                                                <>
                                                    {" · "}
                                                    {incompleteApplicantStatusCounts.other} draft / in progress
                                                </>
                                            ) : null}
                                        </p>
                                    ) : null}
                                    <div className="relative">
                                        <label htmlFor="incomplete-report-status-filter" className="sr-only">
                                            Filter by report status
                                        </label>
                                        <select
                                            id="incomplete-report-status-filter"
                                            value={incompleteApplicantStatusFilter}
                                            onChange={(e) =>
                                                setIncompleteApplicantStatusFilter(e.target.value as IncompleteApplicantStatusFilter)
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                        >
                                            <option value="all">All statuses</option>
                                            <option value="not_started">No report started</option>
                                            <option value="draft_or_progress">Draft or in progress</option>
                                        </select>
                                    </div>
                                    {incompleteApplicantsFiltered.length === 0 ? (
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-center text-xs font-medium text-slate-600">
                                            Nothing matches this filter. Choose &ldquo;All statuses&rdquo; or another option.
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                                            {incompleteApplicantsFiltered.map((r) => (
                                                <li
                                                    key={`${r.applicationId}:${r.studentEmail || r.studentName}`}
                                                    className="bg-white px-3 py-3 first:pt-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
                                                >
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-slate-900 text-sm truncate">{r.studentName}</div>
                                                {r.studentEmail ? (
                                                    <div className="text-xs text-slate-500 truncate mt-0.5">{r.studentEmail}</div>
                                                ) : null}
                                                <span
                                                    className={`inline-flex mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${incompleteApplicantBadgeClass(r.reportStatusRaw)}`}
                                                >
                                                    {r.reportStatusLabel}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void handleRemoveIncompleteApplicant(r.applicationId)}
                                                disabled={deletingApplicationId === r.applicationId}
                                                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {deletingApplicationId === r.applicationId ? (
                                                    <>
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Withdrawing…
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 className="w-3.5 h-3.5" /> Withdraw & free seat
                                                    </>
                                                )}
                                            </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {teamOverviewModal && (
                <>
                    <div className="fixed inset-0 z-[80] bg-slate-900/40" aria-hidden onClick={closeTeamOverviewModal} />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="team-overview-title"
                        className="fixed left-1/2 top-1/2 z-[90] w-[min(100%-1.5rem,72rem)] max-h-[min(90vh,46rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
                    >
                        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
                            <div className="min-w-0">
                                <h2 id="team-overview-title" className="text-lg font-extrabold text-slate-900 tracking-tight">
                                    Teams &amp; enrollments
                                </h2>
                                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                                    Team and individual participation plus report progress for{" "}
                                    <span className="font-semibold text-slate-700">{teamOverviewModal.title}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeTeamOverviewModal}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-5 py-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{teamRegisteredMetricLabel}</div>
                                <div className="mt-1 text-2xl font-black text-slate-900">{teamOverviewSummary.registeredTeams}</div>
                            </div>
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Completed reports</div>
                                <div className="mt-1 text-2xl font-black text-emerald-800">{teamOverviewSummary.completedReports}</div>
                            </div>
                            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Reports available</div>
                                <div className="mt-1 text-2xl font-black text-blue-800">{teamOverviewSummary.reportsAvailable}</div>
                            </div>
                        </div>
                        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
                            {teamOverviewLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                    <p className="text-sm font-medium">Loading team overview…</p>
                                </div>
                            ) : teamOverviewRows.length === 0 ? (
                                <div className="text-center py-14 px-2">
                                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-semibold text-slate-800">No enrollments found</p>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        No team or individual registrations are available for this project yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <label htmlFor="team-overview-participation-filter" className="sr-only">
                                            Filter by participation
                                        </label>
                                        <select
                                            id="team-overview-participation-filter"
                                            value={teamOverviewParticipationFilter}
                                            onChange={(e) =>
                                                setTeamOverviewParticipationFilter(e.target.value as "all" | "team" | "individual")
                                            }
                                            className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                        >
                                            <option value="all">All: teams &amp; individuals</option>
                                            <option value="team">Teams only</option>
                                            <option value="individual">Individuals only</option>
                                        </select>
                                    </div>
                                    {filteredTeamOverviewRows.length === 0 ? (
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-center text-sm font-medium text-slate-600">
                                            Nothing matches this filter. Switch back to &ldquo;All&rdquo; or pick the other enrollment type.
                                        </div>
                                    ) : null}
                                    {filteredTeamOverviewRows.map((team) => {
                                        const disableRemoveGroup = teamOverviewRemoveGroupDisabled(team);
                                        return (
                                        <div key={team.id} className="rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-slate-900 truncate">{team.teamName}</span>
                                                        <span
                                                            className={`inline-flex shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                                                                team.participationMode === "individual"
                                                                    ? "bg-violet-50 text-violet-800 border-violet-100"
                                                                    : "bg-emerald-50 text-emerald-800 border-emerald-100"
                                                            }`}
                                                        >
                                                            {team.participationMode === "individual" ? "Individual" : "Team"}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        {team.participationMode === "individual"
                                                            ? `Participant: ${team.leadName}`
                                                            : `Lead: ${team.leadName}`}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-100">
                                                        {team.reportStatus}
                                                    </span>
                                                    <span
                                                        className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                                                            team.reportAvailable
                                                                ? "bg-blue-50 text-blue-800 border-blue-100"
                                                                : "bg-slate-100 text-slate-600 border-slate-200"
                                                        }`}
                                                    >
                                                        {team.reportAvailable ? "report available" : "report unavailable"}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleRemoveTeam(team.id)}
                                                        disabled={deletingTeamId === team.id || disableRemoveGroup}
                                                        title={
                                                            disableRemoveGroup
                                                                ? "This row uses a listing-only group id (individual:…), not a persisted team id. Use per-member removal or application withdraw until the API supports synthetic ids."
                                                                : undefined
                                                        }
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 border border-red-100 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {deletingTeamId === team.id ? (
                                                            <>
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Removing…
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Trash2 className="w-3.5 h-3.5" /> Remove full team
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-white border-b border-slate-100">
                                                        <tr>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Member</th>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Role</th>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Report</th>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Availability</th>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {team.members.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={5} className="px-4 py-4 text-xs text-slate-500">
                                                                    No members found.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            team.members.map((member) => (
                                                                <tr key={member.id}>
                                                                    <td className="px-4 py-3">
                                                                        <div className="font-semibold text-slate-900">{member.name}</div>
                                                                        {member.email ? (
                                                                            <div className="text-xs text-slate-500 mt-0.5">{member.email}</div>
                                                                        ) : null}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-slate-700">{member.role}</td>
                                                                    <td className="px-4 py-3 text-slate-700">{member.reportStatus}</td>
                                                                    <td className="px-4 py-3">
                                                                        <span
                                                                            className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                                                                                member.reportAvailable
                                                                                    ? "bg-blue-50 text-blue-800 border-blue-100"
                                                                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                                                            }`}
                                                                        >
                                                                            {member.reportAvailable ? "available" : "unavailable"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => void handleRemoveTeamMember(team.id, member.id)}
                                                                            disabled={deletingMemberId === member.id}
                                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold text-red-700 bg-red-50 border border-red-100 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >
                                                                            {deletingMemberId === member.id ? (
                                                                                <>
                                                                                    <Loader2 className="w-3 h-3 animate-spin" /> Removing…
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <UserMinus className="w-3 h-3" />{" "}
                                                                                    {team.participationMode === "individual"
                                                                                        ? "Remove from project"
                                                                                        : "Remove"}
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
