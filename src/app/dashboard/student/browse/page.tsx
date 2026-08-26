"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../report/components/ui/button";
import { authenticatedFetch } from "@/utils/api";
import { resolveAttendanceApproverType, type AttendanceApproverType } from "@/utils/attendanceApproverRouting";
import { getStoredCurrentUserId } from "@/utils/currentUser";
import { isStudentOpportunityLiveForReporting } from "@/utils/opportunityWorkflow";
import type { ModeBucket, VisibilityBucket } from "@/utils/opportunityListing";
import {
    buildSdgFilterLabel,
    computeSeatsRemaining,
    modeMenuLabel,
    normalizeModeBucket,
    passesSeatsFilter,
    pickOpportunityTypes,
    pickUniversityLabel,
    pickVisibilityBucket,
    visibilityMenuLabel,
} from "@/utils/opportunityListing";
import {
    readStudentInstitutionFromBrowserStorage,
    resolveStudentUniversityApplyEligibility,
} from "@/utils/studentOpportunityApplyEligibility";
import {
    isJoinApplicationPendingStatus,
    isJoinApplicationRejectedStatus,
    joinApplicationLocksApplyButton,
    mergeHasAppliedFields,
    pickJoinApplicationId,
    pickJoinApplicationStage,
} from "@/utils/studentJoinApplication";
import {
    buildStudentReportsCheckMap,
    pickReportStatusFromCheckRow,
    resolveStudentBrowseReportCta,
} from "@/utils/studentBrowseReportCta";
import { Loader2, MapPin, Calendar, Clock, Globe, CheckCircle2, LayoutGrid, List, Users, Mail, Phone, GraduationCap, Share2, Building2, ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import ApplicationDialog from "./components/ApplicationDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../report/components/ui/dialog";
import { ScoringLevelsDialog } from "@/components/scoring/ScoringLevelsDialog";
import { fetchImpactSummary, readImpactSummaryCache } from "@/utils/cielImpactSummary";
import { fetchStudentDashboardData } from "@/utils/student-dashboard-fetch";
import ProgressBar from "@/components/ciel/ProgressBar";

interface TeamMember {
    name: string;
    role: string;
    cnic: string;
    email?: string;
    mobile?: string;
    university?: string;
    program?: string;
    is_verified?: boolean;
}

interface BrowseOpportunity {
    id: string;
    title?: string;
    description?: string;
    status?: string;
    application_status?: string;
    application_id?: string;
    application_stage?: string | null;
    hasApplied?: boolean;
    has_applied?: boolean;
    category?: string;
    types?: string[];
    city?: string;
    mode?: string;
    hours?: string | number;
    start_date?: string;
    remaining_seats?: number;
    volunteersNeeded?: number;
    organization_name?: string;
    teamMembers?: TeamMember[];
    sdg_info?: {
        description?: string;
    };
    location?: {
        city?: string;
        district?: string;
    };
    organization?: {
        city?: string;
        name?: string;
    };
    createdAt?: string;
    seatsTotal?: number | null;
    /** Normalized for listing filters */
    universityLabel?: string;
    modeBucket?: ModeBucket;
    visibilityBucket?: VisibilityBucket;
    opportunityTypes?: string[];
    sdgLabel?: string;
    seatsRemaining?: number | null;
    /** True while a join application is pending or approved; false when rejected so student can re-apply. */
    applyLocked?: boolean;
    /** From bulk `/students/reports/check` when available. */
    report_status?: string;
    report_id?: string;
}

function lower(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Same public URL as My Projects “Copy share link” (`/projects/[id]`). */
function buildBrowseOpportunityShareUrl(opportunityId: string): string {
    if (typeof window === "undefined") return "";
    const id = encodeURIComponent(opportunityId);
    return `${window.location.origin}/projects/${id}`;
}

async function copyBrowseOpportunityShareLink(opportunityId: string): Promise<void> {
    const url = buildBrowseOpportunityShareUrl(opportunityId);
    if (!url) return;
    try {
        await navigator.clipboard.writeText(url);
        toast.success("Project link copied");
    } catch {
        toast.error("Could not copy link");
    }
}

/** API stores per-student hours on `timeline.expected_hours`; list payloads often omit legacy `hours`. */
function pickBrowseCreditHours(raw: Record<string, unknown>, op: BrowseOpportunity): string | number | undefined {
    const timeline = raw.timeline as { expected_hours?: unknown } | undefined;
    const expected = timeline?.expected_hours;
    if (expected !== undefined && expected !== null && expected !== "") {
        if (typeof expected === "number" && !Number.isNaN(expected)) {
            return expected;
        }
        if (typeof expected === "string") {
            const trimmed = expected.trim();
            if (trimmed) {
                const n = Number(trimmed);
                return Number.isNaN(n) ? expected : n;
            }
        }
    }
    return op.hours;
}

function normalizeOpportunity(op: BrowseOpportunity): BrowseOpportunity {
    const raw = op as unknown as Record<string, unknown>;
    const applicationStatus = lower(op.application_status ?? raw.applicationStatus);
    const opportunityStatus = lower(op.status);
    const hasApplied = mergeHasAppliedFields({
        ...raw,
        application_status: applicationStatus || raw.application_status,
        has_applied: op.has_applied,
        hasApplied: op.hasApplied,
        status: op.status,
    });
    const applyLocked = joinApplicationLocksApplyButton({
        ...raw,
        application_status: applicationStatus || raw.application_status,
        has_applied: op.has_applied,
        hasApplied: op.hasApplied,
        status: op.status,
    });

    const city =
        op.city ||
        op.location?.city ||
        op.location?.district ||
        op.organization?.city ||
        "Remote";

    const category =
        op.category ||
        op.types?.[0] ||
        op.sdg_info?.description ||
        "Social Impact";

    const opportunityTypes =
        pickOpportunityTypes(raw).length > 0
            ? pickOpportunityTypes(raw)
            : (op.types || []).filter((x): x is string => typeof x === "string" && Boolean(x.trim()));

    const seatsFromCompute = computeSeatsRemaining(raw);
    const seatsRemaining =
        seatsFromCompute ??
        (typeof op.remaining_seats === "number" ? op.remaining_seats : null) ??
        (typeof op.volunteersNeeded === "number" ? op.volunteersNeeded : null);

    const application_id = pickJoinApplicationId(raw) || op.application_id;
    const application_stage = (pickJoinApplicationStage(raw) ?? op.application_stage ?? null) as string | null;

    const org = raw.organization;
    const orgName =
        op.organization_name ||
        (org && typeof org === "object" && typeof (org as { name?: unknown }).name === "string"
            ? (org as { name: string }).name
            : undefined);

    const timeline = raw.timeline && typeof raw.timeline === "object" ? (raw.timeline as Record<string, unknown>) : null;
    const needed = Number(
        raw.volunteers_needed ?? raw.volunteersNeeded ?? timeline?.volunteers_required ?? raw.volunteers_count ?? op.volunteersNeeded,
    );
    const seatsTotal = Number.isFinite(needed) && needed > 0 ? needed : null;
    const createdRaw = raw.created_at ?? raw.createdAt ?? raw.published_at;
    const createdAt = typeof createdRaw === "string" && createdRaw.trim() ? createdRaw : undefined;

    return {
        ...op,
        hours: pickBrowseCreditHours(raw, op),
        organization_name: orgName,
        city,
        category,
        createdAt,
        seatsTotal,
        hasApplied,
        has_applied: hasApplied,
        applyLocked,
        application_id: application_id || undefined,
        application_stage: application_stage || undefined,
        application_status: applicationStatus || undefined,
        universityLabel: pickUniversityLabel(raw),
        modeBucket: normalizeModeBucket(op.mode ?? raw.mode),
        visibilityBucket: pickVisibilityBucket(raw),
        opportunityTypes,
        sdgLabel: buildSdgFilterLabel(raw),
        seatsRemaining,
    };
}

async function mergeBrowseOpportunitiesWithReportCheck(
    ops: BrowseOpportunity[],
    studentId: string,
): Promise<BrowseOpportunity[]> {
    if (!studentId.trim()) return ops;
    try {
        const reportsRes = await authenticatedFetch(`/api/v1/students/reports/check?studentId=${encodeURIComponent(studentId)}`);
        if (!reportsRes?.ok) return ops;
        const reportsData = (await reportsRes.json()) as { success?: boolean; data?: unknown };
        if (!reportsData.success || !Array.isArray(reportsData.data)) return ops;
        const map = buildStudentReportsCheckMap(reportsData.data);
        return ops.map((op) => {
            const row = map.get(op.id);
            const report_status = pickReportStatusFromCheckRow(row);
            const rid = row?.report_id ?? row?.id;
            const report_id = typeof rid === "string" ? rid : rid != null ? String(rid) : undefined;
            return { ...op, report_status, report_id };
        });
    } catch {
        return ops;
    }
}

function shouldShowInBrowse(op: BrowseOpportunity): boolean {
    if (op.hasApplied) return true;
    if (isStudentOpportunityLiveForReporting(op as unknown as Record<string, unknown>)) return true;

    const opportunityStatus = lower(op.status);
    const applicationStatus = lower(op.application_status);

    return (
        ["active", "live", "approved", "verified", "open", "recruiting"].includes(opportunityStatus) ||
        [
            "pending",
            "pending_approval",
            "applied",
            "approved",
            "verified",
            "accepted",
            "active",
            "rejected",
        ].includes(applicationStatus)
    );
}

function scheduleLabel(op: BrowseOpportunity): string {
    if (op.start_date) {
        const d = new Date(op.start_date);
        if (!Number.isNaN(d.getTime())) {
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        }
    }
    return "Flexible";
}

function hoursCreditLabel(op: BrowseOpportunity): string {
    const n = typeof op.hours === "number" ? op.hours : Number(op.hours);
    const shown = Number.isFinite(n) ? n : op.hours || "0";
    return `${shown} hours credit`;
}

function seatsLeftLabel(op: BrowseOpportunity): string {
    const left = op.seatsRemaining ?? op.remaining_seats ?? 0;
    if (op.seatsTotal && op.seatsTotal > 0) return `${left} of ${op.seatsTotal} seats left`;
    return `${left} seats left`;
}

function pathTagLabel(op: BrowseOpportunity): string {
    return op.opportunityTypes?.[0] || op.category || "Community service";
}

function isPendingJoin(op: BrowseOpportunity): boolean {
    return isJoinApplicationPendingStatus(op.application_status || "");
}

export default function StudentBrowseOpportunitiesPage() {
    const [opportunities, setOpportunities] = useState<BrowseOpportunity[]>([]);
    const [studentInstitution, setStudentInstitution] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [applyingTitle, setApplyingTitle] = useState<string | undefined>(undefined);
    const [applyingAttendanceApproverType, setApplyingAttendanceApproverType] = useState<AttendanceApproverType>("faculty");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Team Dialog
    const [selectedTeamOpp, setSelectedTeamOpp] = useState<BrowseOpportunity | null>(null);
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
    const [isScoringLevelsOpen, setIsScoringLevelsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [onlyOpenSeats, setOnlyOpenSeats] = useState(false);
    const [sortNewest, setSortNewest] = useState(true);
    const [moreOpen, setMoreOpen] = useState(false);
    const moreWrapRef = useRef<HTMLDivElement>(null);
    const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
    const [hoursLogged, setHoursLogged] = useState(0);
    const [hoursTarget, setHoursTarget] = useState(16);

    // Filters & View State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [universityFilter, setUniversityFilter] = useState("all");
    const [modeFilter, setModeFilter] = useState<"all" | ModeBucket>("all");
    const [oppTypeFilter, setOppTypeFilter] = useState("all");
    const [sdgFilter, setSdgFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");
    const [seatsFilter, setSeatsFilter] = useState<"all" | "1" | "5" | "10">("all");
    const [visibilityFilter, setVisibilityFilter] = useState<"all" | VisibilityBucket>("all");

    // Derived Data
    const universityOptions = Array.from(
        new Set(opportunities.map((op) => op.universityLabel || "Unspecified")),
    ).sort((a, b) => a.localeCompare(b));
    const oppTypeOptions = Array.from(
        new Set(opportunities.flatMap((op) => op.opportunityTypes || [])),
    ).sort((a, b) => a.localeCompare(b));
    const sdgOptions = Array.from(
        new Set(opportunities.map((op) => op.sdgLabel || "Unspecified SDG")),
    ).sort((a, b) => a.localeCompare(b));
    const locationOptions = Array.from(new Set(opportunities.map((op) => op.city || "Remote"))).sort((a, b) =>
        a.localeCompare(b),
    );

    const afterListingFilters = opportunities.filter((op) => {
        if (universityFilter !== "all" && (op.universityLabel || "Unspecified") !== universityFilter) return false;
        if (modeFilter !== "all" && (op.modeBucket || "unspecified") !== modeFilter) return false;
        if (oppTypeFilter !== "all" && !(op.opportunityTypes || []).includes(oppTypeFilter)) return false;
        if (sdgFilter !== "all" && (op.sdgLabel || "Unspecified SDG") !== sdgFilter) return false;
        if (locationFilter !== "all" && (op.city || "Remote") !== locationFilter) return false;
        if (!passesSeatsFilter(op.seatsRemaining ?? null, seatsFilter)) return false;
        if (visibilityFilter !== "all" && (op.visibilityBucket || "unspecified") !== visibilityFilter) return false;
        return true;
    });
    const needle = searchQuery.trim().toLowerCase();
    const fullHiddenCount = afterListingFilters.filter((op) => op.seatsRemaining != null && op.seatsRemaining <= 0).length;
    const filteredOpportunities = afterListingFilters
        .filter((op) => {
            if (onlyOpenSeats && op.seatsRemaining != null && op.seatsRemaining <= 0) return false;
            if (!needle) return true;
            const hay = `${op.title ?? ""} ${op.organization_name ?? ""} ${op.description ?? ""}`.toLowerCase();
            return hay.includes(needle);
        })
        .sort((a, b) => {
            const ta = new Date(a.createdAt || a.start_date || 0).getTime();
            const tb = new Date(b.createdAt || b.start_date || 0).getTime();
            const na = Number.isFinite(ta) ? ta : 0;
            const nb = Number.isFinite(tb) ? tb : 0;
            return sortNewest ? nb - na : na - nb;
        });

    const clearListingFilters = () => {
        setUniversityFilter("all");
        setModeFilter("all");
        setOppTypeFilter("all");
        setSdgFilter("all");
        setLocationFilter("all");
        setSeatsFilter("all");
        setVisibilityFilter("all");
        setSearchQuery("");
        setOnlyOpenSeats(false);
        setSortNewest(true);
    };

    const filterSelectClass =
        "h-10 min-w-[8.5rem] appearance-none rounded-lg border border-ciel-border bg-white px-3 pr-8 text-sm text-ciel-text transition-colors hover:border-slate-300 focus:border-ciel-green focus:outline-none focus:ring-2 focus:ring-ciel-green/20";

    const activeFilterCount = [
        universityFilter,
        modeFilter,
        oppTypeFilter,
        sdgFilter,
        locationFilter,
        seatsFilter,
        visibilityFilter,
    ].filter((v) => v !== "all").length + (onlyOpenSeats ? 1 : 0) + (needle ? 1 : 0);

    const pendingApplicationsCount = opportunities.filter((op) => op.applyLocked && isPendingJoin(op)).length;
    const hoursRemaining = Math.max(0, hoursTarget - hoursLogged);
    const hoursPct = hoursTarget > 0 ? Math.min(100, Math.round((hoursLogged / hoursTarget) * 100)) : 0;

    const openApplicationDialog = (opportunity: BrowseOpportunity) => {
        const title = opportunity.title ?? "Opportunity";
        setApplyingId(opportunity.id);
        setApplyingTitle(title);
        setApplyingAttendanceApproverType(resolveAttendanceApproverType(opportunity as unknown as Record<string, unknown>));
        setIsDialogOpen(true);
    };

    const handleSuccess = (id: string, meta?: { applicationId?: string; applicationStatus?: string }) => {
        setOpportunities((prev) =>
            prev.map((op) =>
                op.id === id
                    ? {
                          ...op,
                          hasApplied: true,
                          has_applied: true,
                          applyLocked: true,
                          application_id: meta?.applicationId ?? op.application_id,
                          application_status: meta?.applicationStatus ?? "pending_approval",
                      }
                    : op,
            ),
        );
        setApplyingId(null);
        setApplyingTitle(undefined);
        setApplyingAttendanceApproverType("faculty");
        void fetchOpportunities({ silent: true });
    };

    const handleWithdraw = async (opportunity: BrowseOpportunity) => {
        const applicationId = opportunity.application_id;
        if (!applicationId) {
            toast.error("No application to withdraw");
            return;
        }
        if (!window.confirm("Withdraw this application? You can apply again if seats are still open.")) {
            return;
        }
        setWithdrawingId(opportunity.id);
        try {
            const res = await authenticatedFetch(`/api/v1/students/applications/${encodeURIComponent(applicationId)}`, {
                method: "DELETE",
            });
            if (res?.ok) {
                toast.success("Application withdrawn");
                void fetchOpportunities({ silent: true });
            } else {
                toast.error("Could not withdraw this application");
            }
        } catch {
            toast.error("Could not withdraw this application");
        } finally {
            setWithdrawingId(null);
        }
    };

    useEffect(() => {
        setStudentInstitution(readStudentInstitutionFromBrowserStorage());
        void fetchOpportunities();
        void (async () => {
            const cached = readImpactSummaryCache();
            const [summary, dashboard] = await Promise.all([
                fetchImpactSummary({ redirectToLogin: false }),
                fetchStudentDashboardData({ redirectToLogin: false }),
            ]);
            const verified =
                summary?.verifiedHours ?? cached?.verifiedHours ?? dashboard?.overview?.totalVerifiedHours ?? 0;
            const required = (dashboard?.activeProjects ?? []).reduce(
                (sum, p) => sum + (Number(p.required_hours_per_student) || 0),
                0,
            );
            const pendingH = summary?.pendingHours ?? cached?.pendingHours ?? 0;
            setHoursLogged(Math.round(verified));
            setHoursTarget(required > 0 ? Math.round(required) : Math.max(Math.round(verified + pendingH), 16));
        })();
        const intervalId = window.setInterval(() => {
            void fetchOpportunities({ silent: true });
        }, 30000);
        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (!moreOpen) return;
        const onDoc = (e: MouseEvent) => {
            if (!moreWrapRef.current?.contains(e.target as Node)) setMoreOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [moreOpen]);

    const fetchOpportunities = async (options?: { silent?: boolean }) => {
        if (!options?.silent) {
            setIsLoading(true);
        }
        try {
            const userId = getStoredCurrentUserId() || null;
            // Backend defaults `limit` to 10 — without this, browse shows fewer rows than exist / than "My projects".
            const res = await authenticatedFetch(`/api/v1/students/opportunities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ student_id: userId, page: 1, limit: 500 }),
            });

            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    let mappedOps = ((data.data || []) as BrowseOpportunity[])
                        .map((op) => normalizeOpportunity(op))
                        .filter((op) => shouldShowInBrowse(op));
                    if (userId) {
                        mappedOps = await mergeBrowseOpportunitiesWithReportCheck(mappedOps, userId);
                    }
                    setOpportunities(mappedOps);
                }
            }
        } catch (error) {
            console.error("Failed to fetch opportunities", error);
        } finally {
            if (!options?.silent) {
                setIsLoading(false);
            }
        }
    };

    const openTeamDialog = (opportunity: BrowseOpportunity) => {
        setSelectedTeamOpp(opportunity);
        setIsTeamDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-full min-h-[480px] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-ciel-green" />
                <p className="text-sm text-ciel-text-mid">Loading opportunities…</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-5 pb-20">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-[28px] font-bold tracking-tight text-ciel-text">Browse opportunities</h1>
                    <p className="mt-1 text-sm text-ciel-text-mid">
                        Volunteer projects from CIEL partners. Apply, get accepted, then log your hours.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsScoringLevelsOpen(true)}
                    className="h-9 shrink-0 rounded-lg border border-ciel-border bg-white px-3.5 text-sm font-medium text-ciel-text hover:bg-slate-50"
                >
                    How scoring works
                </button>
            </header>

            <div className="flex flex-col gap-3 rounded-xl border border-ciel-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-5">
                <p className="shrink-0 text-sm font-bold text-ciel-text">
                    {hoursLogged} of {hoursTarget} hours logged
                </p>
                <ProgressBar value={hoursPct} className="h-2 flex-1" barClassName="bg-[#0e7d74]" trackClassName="bg-slate-200" />
                <p className="shrink-0 text-sm text-ciel-text-mid">
                    {hoursRemaining} hours to go · {pendingApplicationsCount} application{pendingApplicationsCount === 1 ? "" : "s"} pending
                </p>
            </div>

            <section className="rounded-xl border border-ciel-border bg-white p-3" aria-label="Filters">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search projects or organisations"
                            className="h-10 w-full rounded-lg border border-ciel-border bg-white pl-9 pr-3 text-sm text-ciel-text placeholder:text-ciel-text-soft focus:border-ciel-green focus:outline-none focus:ring-2 focus:ring-ciel-green/20"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <select
                                value={oppTypeFilter}
                                onChange={(e) => setOppTypeFilter(e.target.value)}
                                className={filterSelectClass}
                                title="Path"
                            >
                                <option value="all">All paths</option>
                                {oppTypeOptions.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" />
                        </div>
                        <div className="relative">
                            <select
                                value={modeFilter}
                                onChange={(e) => setModeFilter(e.target.value as "all" | ModeBucket)}
                                className={filterSelectClass}
                                title="Mode"
                            >
                                <option value="all">Any mode</option>
                                {(["on-site", "hybrid", "remote", "unspecified"] as const).map((b) => (
                                    <option key={b} value={b}>
                                        {modeMenuLabel(b)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" />
                        </div>
                        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-ciel-border bg-white px-3 text-sm text-ciel-text">
                            <input
                                type="checkbox"
                                checked={onlyOpenSeats}
                                onChange={(e) => setOnlyOpenSeats(e.target.checked)}
                                className="h-4 w-4 rounded border-ciel-border text-[#0e7d74] focus:ring-[#0e7d74]"
                            />
                            Only show projects with seats
                        </label>
                        <div className="relative" ref={moreWrapRef}>
                            <button
                                type="button"
                                onClick={() => setMoreOpen((o) => !o)}
                                className="inline-flex h-10 items-center gap-1 rounded-lg border border-ciel-border bg-white px-3 text-sm text-ciel-text hover:bg-slate-50"
                            >
                                More
                                {activeFilterCount > 0 ? (
                                    <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ciel-green-soft px-1 text-[11px] font-bold text-ciel-green-deep">
                                        {activeFilterCount}
                                    </span>
                                ) : null}
                                <ChevronDown className="h-4 w-4 text-ciel-text-soft" />
                            </button>
                            {moreOpen ? (
                                <div className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] space-y-3 rounded-xl border border-ciel-border bg-white p-3 shadow-lg">
                                    <div className="relative">
                                        <select value={universityFilter} onChange={(e) => setUniversityFilter(e.target.value)} className={`${filterSelectClass} w-full`} title="University">
                                            <option value="all">All universities</option>
                                            {universityOptions.map((u) => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" />
                                    </div>
                                    <div className="relative">
                                        <select value={sdgFilter} onChange={(e) => setSdgFilter(e.target.value)} className={`${filterSelectClass} w-full`} title="SDG">
                                            <option value="all">All SDGs</option>
                                            {sdgOptions.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" />
                                    </div>
                                    <div className="relative">
                                        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className={`${filterSelectClass} w-full`} title="Location">
                                            <option value="all">All locations</option>
                                            {locationOptions.map((loc) => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" />
                                    </div>
                                    <div className="relative">
                                        <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value as "all" | VisibilityBucket)} className={`${filterSelectClass} w-full`} title="Visibility">
                                            <option value="all">All visibility</option>
                                            {(["open", "restricted", "unspecified"] as const).map((b) => (
                                                <option key={b} value={b}>{visibilityMenuLabel(b)}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" />
                                    </div>
                                    <div className="relative">
                                        <select value={seatsFilter} onChange={(e) => setSeatsFilter(e.target.value as "all" | "1" | "5" | "10")} className={`${filterSelectClass} w-full`} title="Seats available">
                                            <option value="all">Any seats</option>
                                            <option value="1">1+ seats</option>
                                            <option value="5">5+ seats</option>
                                            <option value="10">10+ seats</option>
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" />
                                    </div>
                                    <div className="flex items-center justify-between gap-2 border-t border-ciel-border pt-2">
                                        <div className="flex rounded-lg border border-ciel-border p-0.5">
                                            <button type="button" onClick={() => setViewMode("grid")} className={`rounded-md p-1.5 ${viewMode === "grid" ? "bg-slate-100 text-ciel-text" : "text-ciel-text-soft"}`} title="Grid view">
                                                <LayoutGrid className="h-4 w-4" />
                                            </button>
                                            <button type="button" onClick={() => setViewMode("list")} className={`rounded-md p-1.5 ${viewMode === "list" ? "bg-slate-100 text-ciel-text" : "text-ciel-text-soft"}`} title="List view">
                                                <List className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <button type="button" onClick={clearListingFilters} className="text-sm font-medium text-ciel-text-mid hover:text-ciel-text">
                                            Clear filters
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className="relative ml-auto">
                            <select
                                value={sortNewest ? "newest" : "oldest"}
                                onChange={(e) => setSortNewest(e.target.value === "newest")}
                                className={filterSelectClass}
                                title="Sort"
                            >
                                <option value="newest">Newest first</option>
                                <option value="oldest">Oldest first</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" />
                        </div>
                    </div>
                </div>
            </section>

            <p className="text-sm text-ciel-text-mid">
                {filteredOpportunities.length} {filteredOpportunities.length === 1 ? "opportunity" : "opportunities"}
                {onlyOpenSeats && fullHiddenCount > 0 ? ` · ${fullHiddenCount} full project${fullHiddenCount === 1 ? "" : "s"} hidden` : ""}
            </p>

            {filteredOpportunities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ciel-border bg-white py-16 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ciel-green-soft">
                        <Globe className="h-8 w-8 text-ciel-green-deep" />
                    </div>
                    <h3 className="text-lg font-semibold text-ciel-text">No opportunities match</h3>
                    <p className="mt-1 text-sm text-ciel-text-mid">Try adjusting your filters or check back later.</p>
                    <Button variant="outline" className="mt-6 rounded-lg border-ciel-border" onClick={clearListingFilters}>
                        Clear filters
                    </Button>
                </div>
            ) : (
                <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
                    {filteredOpportunities.map((op) => {
                        const applyEligibility = resolveStudentUniversityApplyEligibility(
                            op as unknown as Record<string, unknown>,
                            studentInstitution,
                        );
                        const reportCta =
                            op.application_status != null && ["approved", "verified"].includes(op.application_status)
                                ? resolveStudentBrowseReportCta(op.id, op.report_status)
                                : null;
                        const modeLabel =
                            op.modeBucket && op.modeBucket !== "unspecified"
                                ? modeMenuLabel(op.modeBucket)
                                : op.mode || "On-site";
                        const visibilityTag =
                            applyEligibility.listingRestrictionLabel ||
                            (op.visibilityBucket === "open" ? "Open to all" : null);
                        const showWithdraw = op.applyLocked && isPendingJoin(op) && !!op.application_id;
                        return (
                            <article
                                key={op.id}
                                className="flex h-full flex-col rounded-xl border border-ciel-border bg-white p-5"
                            >
                                <h3 className="text-lg font-bold leading-snug text-ciel-text">{op.title}</h3>
                                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ciel-text-mid">
                                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{op.organization_name || "Partner Organization"}</span>
                                </p>
                                {op.description ? (
                                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ciel-text-mid">{op.description}</p>
                                ) : null}

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#e7f4f2] px-2 py-1 text-xs font-medium text-[#0e7d74]">
                                        <Clock className="h-3.5 w-3.5" />
                                        {hoursCreditLabel(op)}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#fff1e6] px-2 py-1 text-xs font-medium text-[#c2410c]">
                                        <Users className="h-3.5 w-3.5" />
                                        {seatsLeftLabel(op)}
                                    </span>
                                </div>

                                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ciel-text-mid">
                                    <span className="inline-flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5 text-ciel-text-soft" />
                                        {op.city || "Remote"}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-ciel-text-soft" />
                                        {scheduleLabel(op)}
                                    </span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    <span className="rounded-md bg-[#e7f4f2] px-2 py-0.5 text-xs font-medium text-[#0e7d74]">
                                        {pathTagLabel(op)}
                                    </span>
                                    <span className="rounded-md bg-[#e8f6f8] px-2 py-0.5 text-xs font-medium text-[#0f766e]">
                                        {modeLabel}
                                    </span>
                                    {visibilityTag ? (
                                        <span
                                            className={
                                                applyEligibility.listingRestrictionLabel
                                                    ? "rounded-md bg-[#fff1e6] px-2 py-0.5 text-xs font-medium text-[#c2410c]"
                                                    : "rounded-md bg-[#e7f4f2] px-2 py-0.5 text-xs font-medium text-[#0e7d74]"
                                            }
                                        >
                                            {visibilityTag}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-4">
                                    {op.applyLocked && isPendingJoin(op) ? (
                                        <span className="mr-auto inline-flex items-center gap-1 text-sm font-medium text-[#0e7d74]">
                                            <CheckCircle2 className="h-4 w-4" /> Applied
                                        </span>
                                    ) : op.applyLocked && reportCta ? (
                                        <Link href={reportCta.href} className="mr-auto text-sm font-medium text-[#0e7d74] hover:underline">
                                            {reportCta.label}
                                        </Link>
                                    ) : op.hasApplied && op.application_status && isJoinApplicationRejectedStatus(op.application_status) ? (
                                        <span className="mr-auto text-xs font-medium text-rose-700">Application not approved</span>
                                    ) : null}

                                    {op.teamMembers && op.teamMembers.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => openTeamDialog(op)}
                                            className="text-sm font-medium text-ciel-text-mid hover:text-ciel-text"
                                        >
                                            Team
                                        </button>
                                    ) : null}

                                    <Link
                                        href={`/dashboard/student/browse/${op.id}`}
                                        className="text-sm font-medium text-[#0e7d74] hover:underline"
                                    >
                                        Details
                                    </Link>
                                    <button
                                        type="button"
                                        className="text-ciel-text-soft hover:text-ciel-text"
                                        aria-label="Copy share link"
                                        title="Copy share link"
                                        onClick={() => void copyBrowseOpportunityShareLink(op.id)}
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </button>

                                    {op.applyLocked ? (
                                        showWithdraw ? (
                                            <button
                                                type="button"
                                                onClick={() => void handleWithdraw(op)}
                                                disabled={withdrawingId === op.id}
                                                className="rounded-md border border-slate-800 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                                            >
                                                {withdrawingId === op.id ? "Withdrawing…" : "Withdraw"}
                                            </button>
                                        ) : !reportCta && !isPendingJoin(op) ? (
                                            <span className="inline-flex items-center gap-1 text-sm font-medium text-[#0e7d74]">
                                                <CheckCircle2 className="h-4 w-4" /> Applied
                                            </span>
                                        ) : null
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => applyEligibility.canApply && openApplicationDialog(op)}
                                            disabled={!applyEligibility.canApply}
                                            title={applyEligibility.blockedReason || undefined}
                                            className={
                                                applyEligibility.canApply
                                                    ? "rounded-md bg-[#0e7d74] px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-[#0c6b64]"
                                                    : "cursor-not-allowed rounded-md bg-slate-200 px-3.5 py-1.5 text-sm font-semibold text-slate-500"
                                            }
                                        >
                                            {applyEligibility.canApply ? (op.hasApplied ? "Apply again" : "Apply") : "Not eligible"}
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <ApplicationDialog
                opportunityId={applyingId}
                opportunityTitle={applyingTitle}
                attendanceApproverType={applyingAttendanceApproverType}
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                        setApplyingId(null);
                        setApplyingTitle(undefined);
                        setApplyingAttendanceApproverType("faculty");
                    }
                }}
                onSuccess={handleSuccess}
            />

            {/* Team Details Dialog */}
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-hidden p-0 gap-0">
                    <DialogHeader className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-6">
                        <div className="flex items-start gap-3 sm:items-center">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                <Users className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 pr-6">
                                <DialogTitle className="text-lg text-slate-900 sm:text-xl">
                                    Project Team
                                </DialogTitle>
                                <DialogDescription className="mt-1 line-clamp-2 text-slate-500">
                                    Collaborators for <span className="font-medium text-slate-700">{selectedTeamOpp?.title}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="max-h-[65vh] overflow-y-auto p-4 sm:p-6">
                        <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                            <table className="min-w-[720px] w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Team Member</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Role</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Contact Info</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {selectedTeamOpp?.teamMembers?.map((member: TeamMember, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm ring-2 ring-white border border-slate-200">
                                                        {member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{member.name}</div>
                                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{member.cnic}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${member.role === 'Leader'
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                    : 'bg-slate-50 text-slate-600 border-slate-100'
                                                    }`}>
                                                    {member.role === 'Leader' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 animate-pulse" />}
                                                    {member.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    {member.email && (
                                                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                            <Mail className="w-3 h-3 text-slate-400" />
                                                            {member.email}
                                                        </div>
                                                    )}
                                                    {member.mobile && (
                                                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            {member.mobile}
                                                        </div>
                                                    )}
                                                    {member.university && (
                                                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                            <GraduationCap className="w-3 h-3 text-slate-400" />
                                                            {member.university}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase ${member.is_verified
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {member.is_verified ? 'Verified' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!selectedTeamOpp?.teamMembers || selectedTeamOpp.teamMembers.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                                                No team members added to this project.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="sm:hidden space-y-3">
                            {selectedTeamOpp?.teamMembers?.map((member: TeamMember, idx: number) => (
                                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm ring-2 ring-white border border-slate-200">
                                            {member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-slate-900">{member.name}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-0.5">{member.cnic}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${member.role === 'Leader'
                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                            : 'bg-slate-50 text-slate-600 border-slate-100'
                                            }`}>
                                            {member.role === 'Leader' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 animate-pulse" />}
                                            {member.role}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase ${member.is_verified
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {member.is_verified ? 'Verified' : 'Pending'}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                                        {member.email && (
                                            <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                                {member.email}
                                            </div>
                                        )}
                                        {member.mobile && (
                                            <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                                {member.mobile}
                                            </div>
                                        )}
                                        {member.university && (
                                            <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                                                {member.university}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {(!selectedTeamOpp?.teamMembers || selectedTeamOpp.teamMembers.length === 0) && (
                                <div className="rounded-xl border border-slate-200 px-6 py-8 text-center text-slate-500 italic">
                                    No team members added to this project.
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <Button onClick={() => setIsTeamDialogOpen(false)} className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ScoringLevelsDialog open={isScoringLevelsOpen} onOpenChange={setIsScoringLevelsOpen} />

        </div>
    );
}
