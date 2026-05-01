"use client";

import { useEffect, useState } from "react";
import { Button } from "../report/components/ui/button";
import { Badge } from "../report/components/ui/badge";
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
    isJoinApplicationRejectedStatus,
    joinApplicationLocksApplyButton,
    joinApplicationPendingLabel,
    mergeHasAppliedFields,
    pickJoinApplicationId,
    pickJoinApplicationStage,
} from "@/utils/studentJoinApplication";
import {
    buildStudentReportsCheckMap,
    pickReportStatusFromCheckRow,
    resolveStudentBrowseReportCta,
} from "@/utils/studentBrowseReportCta";
import { Loader2, MapPin, Calendar, Clock, Globe, CheckCircle2, LayoutGrid, List, Users, Mail, Phone, GraduationCap } from "lucide-react";
import Link from "next/link";
import ApplicationDialog from "./components/ApplicationDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../report/components/ui/dialog";

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
    };
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

    return {
        ...op,
        hours: pickBrowseCreditHours(raw, op),
        city,
        category,
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

    const filteredOpportunities = opportunities.filter((op) => {
        if (universityFilter !== "all" && (op.universityLabel || "Unspecified") !== universityFilter) return false;
        if (modeFilter !== "all" && (op.modeBucket || "unspecified") !== modeFilter) return false;
        if (oppTypeFilter !== "all" && !(op.opportunityTypes || []).includes(oppTypeFilter)) return false;
        if (sdgFilter !== "all" && (op.sdgLabel || "Unspecified SDG") !== sdgFilter) return false;
        if (locationFilter !== "all" && (op.city || "Remote") !== locationFilter) return false;
        if (!passesSeatsFilter(op.seatsRemaining ?? null, seatsFilter)) return false;
        if (visibilityFilter !== "all" && (op.visibilityBucket || "unspecified") !== visibilityFilter) return false;
        return true;
    });

    const clearListingFilters = () => {
        setUniversityFilter("all");
        setModeFilter("all");
        setOppTypeFilter("all");
        setSdgFilter("all");
        setLocationFilter("all");
        setSeatsFilter("all");
        setVisibilityFilter("all");
    };

    const filterSelectClass =
        "h-10 w-full min-w-0 px-3 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300";

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
    };

    useEffect(() => {
        setStudentInstitution(readStudentInstitutionFromBrowserStorage());
        void fetchOpportunities();
        const intervalId = window.setInterval(() => {
            void fetchOpportunities({ silent: true });
        }, 30000);
        return () => window.clearInterval(intervalId);
    }, []);

    const fetchOpportunities = async (options?: { silent?: boolean }) => {
        if (!options?.silent) {
            setIsLoading(true);
        }
        try {
            const userId = getStoredCurrentUserId() || null;
            const res = await authenticatedFetch(`/api/v1/students/opportunities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ student_id: userId })
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
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                <p className="text-sm text-slate-500">Loading opportunities…</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            <header className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Browse Opportunities</h1>
                <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                    Discover and apply to volunteer projects from our partners.
                </p>
            </header>

            <section
                className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm"
                aria-label="Filters"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    <select
                        value={universityFilter}
                        onChange={(e) => setUniversityFilter(e.target.value)}
                        className={filterSelectClass}
                        title="University"
                    >
                        <option value="all">All universities</option>
                        {universityOptions.map((u) => (
                            <option key={u} value={u}>
                                {u}
                            </option>
                        ))}
                    </select>
                    <select
                        value={modeFilter}
                        onChange={(e) => setModeFilter(e.target.value as "all" | ModeBucket)}
                        className={filterSelectClass}
                        title="Mode"
                    >
                        <option value="all">All modes</option>
                        {(["on-site", "hybrid", "remote", "unspecified"] as const).map((b) => (
                            <option key={b} value={b}>
                                {modeMenuLabel(b)}
                            </option>
                        ))}
                    </select>
                    <select
                        value={oppTypeFilter}
                        onChange={(e) => setOppTypeFilter(e.target.value)}
                        className={filterSelectClass}
                        title="Opportunity type"
                    >
                        <option value="all">All types</option>
                        {oppTypeOptions.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                    <select
                        value={sdgFilter}
                        onChange={(e) => setSdgFilter(e.target.value)}
                        className={filterSelectClass}
                        title="SDG"
                    >
                        <option value="all">All SDGs</option>
                        {sdgOptions.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:flex-1 lg:max-w-3xl">
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className={filterSelectClass}
                            title="Location"
                        >
                            <option value="all">All locations</option>
                            {locationOptions.map((loc) => (
                                <option key={loc} value={loc}>
                                    {loc}
                                </option>
                            ))}
                        </select>
                        <select
                            value={seatsFilter}
                            onChange={(e) => setSeatsFilter(e.target.value as "all" | "1" | "5" | "10")}
                            className={filterSelectClass}
                            title="Seats available"
                        >
                            <option value="all">Any seats</option>
                            <option value="1">1+ seats</option>
                            <option value="5">5+ seats</option>
                            <option value="10">10+ seats</option>
                        </select>
                        <select
                            value={visibilityFilter}
                            onChange={(e) => setVisibilityFilter(e.target.value as "all" | VisibilityBucket)}
                            className={filterSelectClass}
                            title="Visibility"
                        >
                            <option value="all">All visibility</option>
                            {(["open", "restricted", "unspecified"] as const).map((b) => (
                                <option key={b} value={b}>
                                    {visibilityMenuLabel(b)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-4 text-sm border-slate-200 text-slate-700 hover:bg-slate-50"
                            onClick={clearListingFilters}
                        >
                            Clear
                        </Button>
                        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setViewMode("grid")}
                                className={`rounded-md p-2 transition-colors ${viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                                title="Grid view"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("list")}
                                className={`rounded-md p-2 transition-colors ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                                title="List view"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {filteredOpportunities.length > 0 ? (
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {filteredOpportunities.length}{" "}
                    {filteredOpportunities.length === 1 ? "opportunity" : "opportunities"}
                </p>
            ) : null}

            {filteredOpportunities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-16 text-center">
                    <Globe className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-800">No opportunities match</h3>
                    <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or check back later.</p>
                    <Button variant="outline" className="mt-6 border-slate-200" onClick={clearListingFilters}>
                        Clear filters
                    </Button>
                </div>
            ) : (
                <div className={viewMode === 'grid'
                    ? "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
                    : "space-y-4"
                }>
                    {filteredOpportunities.map((op) => {
                        const applyEligibility = resolveStudentUniversityApplyEligibility(
                            op as unknown as Record<string, unknown>,
                            studentInstitution,
                        );
                        const reportCta =
                            op.application_status != null && ["approved", "verified"].includes(op.application_status)
                                ? resolveStudentBrowseReportCta(op.id, op.report_status)
                                : null;
                        return viewMode === 'grid' ? (
                            // GRID VIEW CARD
                            <div key={op.id} className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
                                <div className="flex flex-1 flex-col space-y-4 p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <Badge className="border-0 bg-slate-100 font-medium text-slate-700 hover:bg-slate-100">
                                                {op.category || "Social Impact"}
                                            </Badge>
                                            {applyEligibility.listingRestrictionLabel ? (
                                                <Badge className="max-w-full whitespace-normal border border-amber-200 bg-amber-50 text-left text-amber-900 shadow-none hover:bg-amber-50 leading-snug">
                                                    {applyEligibility.listingRestrictionLabel}
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                            {op.modeBucket && op.modeBucket !== "unspecified"
                                                ? modeMenuLabel(op.modeBucket)
                                                : op.mode || "On Site"}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-slate-700">
                                            {op.title}
                                        </h3>
                                        <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                                            by {op.organization_name || "Partner Organization"}
                                        </p>
                                    </div>

                                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-500">
                                        {op.description}
                                    </p>

                                    <div className="space-y-2.5 border-t border-slate-100 pt-3">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                            {op.city || "Remote"}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                            {op.start_date ? new Date(op.start_date).toLocaleDateString() : "Flexible Dates"}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                            {op.hours || "0"} hours credit
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                                            <Users className="h-3.5 w-3.5 shrink-0 text-amber-600/80" />
                                            {op.seatsRemaining ?? op.remaining_seats ?? op.volunteersNeeded ?? 0} seats remaining
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 rounded-b-xl border-t border-slate-100 bg-white px-5 py-4">
                                    <Link href={`/dashboard/student/browse/${op.id}`} className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline">
                                        View details
                                    </Link>
                                    {op.applyLocked ? (
                                        <div className="flex items-center gap-2">
                                            {/* Report Button - Only show if APPLICATION is approved/active */}
                                            {reportCta ? (
                                                <Link href={reportCta.href}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 border-slate-200 text-xs font-medium"
                                                    >
                                                        {reportCta.label}
                                                    </Button>
                                                </Link>
                                            ) : null}

                                            {(!op.application_status ||
                                                ["pending", "pending_approval", "applied"].includes(
                                                    op.application_status,
                                                )) && (
                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 italic">
                                                        {joinApplicationPendingLabel(op as unknown as Record<string, unknown>)}
                                                    </span>
                                                )}

                                            {/* Team Button */}
                                            {op.teamMembers && op.teamMembers.length > 0 && (
                                                <Button size="sm" variant="outline" className="h-8 border-slate-200 text-xs font-medium" onClick={() => openTeamDialog(op)}>
                                                    <Users className="mr-1 h-3.5 w-3.5" /> Team
                                                </Button>
                                            )}

                                            <Button size="sm" variant="ghost" className="pointer-events-none text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
                                                <CheckCircle2 className="mr-1 h-4 w-4" /> Applied
                                            </Button>
                                        </div>
                                    ) : op.hasApplied ? (
                                        <div className="flex items-center gap-2 flex-wrap justify-end max-w-[min(100%,14rem)] sm:max-w-none">
                                            {op.application_status &&
                                                isJoinApplicationRejectedStatus(op.application_status) && (
                                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 italic">
                                                        Application not approved
                                                    </span>
                                                )}
                                            <Button
                                                size="sm"
                                                className={
                                                    applyEligibility.canApply
                                                        ? "bg-slate-900 font-medium text-white transition-colors hover:bg-slate-800"
                                                        : "cursor-not-allowed bg-slate-200 text-slate-600 hover:bg-slate-200"
                                                }
                                                onClick={() =>
                                                    applyEligibility.canApply &&
                                                    openApplicationDialog(op)
                                                }
                                                disabled={!applyEligibility.canApply}
                                                title={applyEligibility.blockedReason || undefined}
                                            >
                                                {applyEligibility.canApply ? "Apply again" : "Not eligible"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            className={
                                                applyEligibility.canApply
                                                    ? "bg-slate-900 font-medium text-white transition-colors hover:bg-slate-800"
                                                    : "cursor-not-allowed bg-slate-200 text-slate-600 hover:bg-slate-200"
                                            }
                                            onClick={() =>
                                                applyEligibility.canApply &&
                                                openApplicationDialog(op)
                                            }
                                            disabled={!applyEligibility.canApply}
                                            title={applyEligibility.blockedReason || undefined}
                                        >
                                            {applyEligibility.canApply ? "Apply Now" : "Not eligible"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // LIST VIEW CARD
                            <div key={op.id} className="group flex flex-col items-start gap-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md md:flex-row md:items-center">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <Badge className="border-0 bg-slate-100 font-medium text-slate-700 hover:bg-slate-100">
                                            {op.category || "Social Impact"}
                                        </Badge>
                                        {applyEligibility.listingRestrictionLabel ? (
                                            <Badge className="border border-amber-200 bg-amber-50 text-amber-900 shadow-none hover:bg-amber-50">
                                                {applyEligibility.listingRestrictionLabel}
                                            </Badge>
                                        ) : null}
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                            {op.modeBucket && op.modeBucket !== "unspecified"
                                                ? modeMenuLabel(op.modeBucket)
                                                : op.mode || "On Site"}
                                        </span>
                                    </div>

                                    <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-slate-700">
                                        {op.title}
                                    </h3>

                                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                                        <span className="font-medium text-slate-600">by {op.organization_name || "Partner Organization"}</span>
                                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {op.city || "Remote"}</span>
                                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-400" /> {op.start_date ? new Date(op.start_date).toLocaleDateString() : "Flexible Dates"}</span>
                                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-400" /> {op.hours || "0"} hours</span>
                                        <span className="flex items-center gap-1 font-semibold text-amber-700"><Users className="h-3.5 w-3.5 text-amber-600/80" /> {op.seatsRemaining ?? op.remaining_seats ?? op.volunteersNeeded ?? 0} seats left</span>
                                    </div>
                                </div>

                                <div className="mt-2 flex w-full gap-3 md:mt-0 md:w-auto">
                                    <Link href={`/dashboard/student/browse/${op.id}`} className="flex-1 md:flex-none">
                                        <Button variant="outline" className="w-full border-slate-200 font-medium">Details</Button>
                                    </Link>
                                    {op.applyLocked ? (
                                        <div className="flex items-center gap-2 flex-1 md:flex-none justify-end">
                                            {/* Report Button - Only show if APPLICATION is approved/active */}
                                            {reportCta ? (
                                                <Link href={reportCta.href}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-9 border-slate-200 text-xs font-medium"
                                                    >
                                                        {reportCta.label}
                                                    </Button>
                                                </Link>
                                            ) : null}

                                            {(!op.application_status ||
                                                ["pending", "pending_approval", "applied"].includes(
                                                    op.application_status,
                                                )) && (
                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100 italic">
                                                        {joinApplicationPendingLabel(op as unknown as Record<string, unknown>)}
                                                    </span>
                                                )}

                                            {/* Team Button */}
                                            {op.teamMembers && op.teamMembers.length > 0 && (
                                                <Button size="sm" variant="outline" className="h-9 border-slate-200 text-xs font-medium" onClick={() => openTeamDialog(op)}>
                                                    <Users className="mr-1 h-3.5 w-3.5" /> Team
                                                </Button>
                                            )}

                                            <Button variant="ghost" className="pointer-events-none bg-emerald-50 text-emerald-800">
                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Applied
                                            </Button>
                                        </div>
                                    ) : op.hasApplied ? (
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 md:flex-none justify-end">
                                            {op.application_status &&
                                                isJoinApplicationRejectedStatus(op.application_status) && (
                                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-md border border-rose-100 italic text-center sm:text-left">
                                                        Application not approved
                                                    </span>
                                                )}
                                            <Button
                                                className={
                                                    applyEligibility.canApply
                                                        ? "flex-1 bg-slate-900 font-medium text-white transition-colors hover:bg-slate-800 md:flex-none"
                                                        : "flex-1 cursor-not-allowed bg-slate-200 text-slate-600 hover:bg-slate-200 md:flex-none"
                                                }
                                                onClick={() =>
                                                    applyEligibility.canApply &&
                                                    openApplicationDialog(op)
                                                }
                                                disabled={!applyEligibility.canApply}
                                                title={applyEligibility.blockedReason || undefined}
                                            >
                                                {applyEligibility.canApply ? "Apply again" : "Not eligible"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            className={
                                                applyEligibility.canApply
                                                    ? "flex-1 bg-slate-900 font-medium text-white transition-colors hover:bg-slate-800 md:flex-none"
                                                    : "flex-1 cursor-not-allowed bg-slate-200 text-slate-600 hover:bg-slate-200 md:flex-none"
                                            }
                                            onClick={() =>
                                                applyEligibility.canApply &&
                                                openApplicationDialog(op)
                                            }
                                            disabled={!applyEligibility.canApply}
                                            title={applyEligibility.blockedReason || undefined}
                                        >
                                            {applyEligibility.canApply ? "Apply Now" : "Not eligible"}
                                        </Button>
                                    )}
                                </div>
                            </div>
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
                        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
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
                    </div>

                    <DialogFooter className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <Button onClick={() => setIsTeamDialogOpen(false)} className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
