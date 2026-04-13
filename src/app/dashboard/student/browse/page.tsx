"use client";

import { useEffect, useState } from "react";
import { Button } from "../report/components/ui/button";
import { Badge } from "../report/components/ui/badge";
import { authenticatedFetch } from "@/utils/api";
import { getStoredCurrentUserId } from "@/utils/currentUser";
import { isStudentOpportunityLiveForReporting } from "@/utils/opportunityWorkflow";
import type { CreatorBucket, ModeBucket, VisibilityBucket } from "@/utils/opportunityListing";
import {
    buildSdgFilterLabel,
    computeSeatsRemaining,
    creatorMenuLabel,
    modeMenuLabel,
    normalizeModeBucket,
    passesSeatsFilter,
    pickCreatorBucket,
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
    creatorBucket?: CreatorBucket;
    modeBucket?: ModeBucket;
    visibilityBucket?: VisibilityBucket;
    opportunityTypes?: string[];
    sdgLabel?: string;
    seatsRemaining?: number | null;
    /** True while a join application is pending or approved; false when rejected so student can re-apply. */
    applyLocked?: boolean;
}

function lower(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
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
        city,
        category,
        hasApplied,
        has_applied: hasApplied,
        applyLocked,
        application_id: application_id || undefined,
        application_stage: application_stage || undefined,
        application_status: applicationStatus || undefined,
        universityLabel: pickUniversityLabel(raw),
        creatorBucket: pickCreatorBucket(raw),
        modeBucket: normalizeModeBucket(op.mode ?? raw.mode),
        visibilityBucket: pickVisibilityBucket(raw),
        opportunityTypes,
        sdgLabel: buildSdgFilterLabel(raw),
        seatsRemaining,
    };
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
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Team Dialog
    const [selectedTeamOpp, setSelectedTeamOpp] = useState<BrowseOpportunity | null>(null);
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);

    // Filters & View State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [universityFilter, setUniversityFilter] = useState("all");
    const [creatorFilter, setCreatorFilter] = useState<"all" | CreatorBucket>("all");
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
        if (creatorFilter !== "all" && (op.creatorBucket || "unspecified") !== creatorFilter) return false;
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
        setCreatorFilter("all");
        setModeFilter("all");
        setOppTypeFilter("all");
        setSdgFilter("all");
        setLocationFilter("all");
        setSeatsFilter("all");
        setVisibilityFilter("all");
    };

    const filterSelectClass =
        "h-9 min-w-[130px] max-w-[220px] px-2 text-sm rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20";

    const openApplicationDialog = (id: string, title: string) => {
        setApplyingId(id);
        setApplyingTitle(title);
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
                    const mappedOps = ((data.data || []) as BrowseOpportunity[])
                        .map((op) => normalizeOpportunity(op))
                        .filter((op) => shouldShowInBrowse(op));
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
            <div className="flex justify-center items-center h-full min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Browse Opportunities</h1>
                    <p className="text-slate-500">Discover and apply to volunteer projects from our partners.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                        value={creatorFilter}
                        onChange={(e) => setCreatorFilter(e.target.value as "all" | CreatorBucket)}
                        className={filterSelectClass}
                        title="Creator type"
                    >
                        <option value="all">All creators</option>
                        {(["student", "faculty", "partner", "unspecified"] as const).map((b) => (
                            <option key={b} value={b}>
                                {creatorMenuLabel(b)}
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
                    <Button variant="outline" size="sm" className="h-9 text-xs shrink-0" onClick={clearListingFilters}>
                        Clear
                    </Button>

                    <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block" />

                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {filteredOpportunities.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
                    <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">No Opportunities Found</h3>
                    <p className="text-slate-500 mb-6">Try adjusting your filters.</p>
                    <Button variant="outline" onClick={clearListingFilters}>
                        Clear Filters
                    </Button>
                </div>
            ) : (
                <div className={viewMode === 'grid'
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "space-y-4"
                }>
                    {filteredOpportunities.map((op) => {
                        const applyEligibility = resolveStudentUniversityApplyEligibility(
                            op as unknown as Record<string, unknown>,
                            studentInstitution,
                        );
                        return viewMode === 'grid' ? (
                            // GRID VIEW CARD
                            <div key={op.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
                                <div className="p-6 flex-1 space-y-4">
                                    <div className="flex justify-between items-start gap-2 flex-wrap">
                                        <div className="flex flex-wrap gap-2 items-center min-w-0">
                                            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">
                                                {op.category || "Social Impact"}
                                            </Badge>
                                            {applyEligibility.listingRestrictionLabel ? (
                                                <Badge className="bg-amber-50 text-amber-900 border border-amber-200 shadow-none hover:bg-amber-50 max-w-full whitespace-normal text-left leading-snug">
                                                    {applyEligibility.listingRestrictionLabel}
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                                            {op.modeBucket && op.modeBucket !== "unspecified"
                                                ? modeMenuLabel(op.modeBucket)
                                                : op.mode || "On Site"}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                            {op.title}
                                        </h3>
                                        <p className="text-sm font-medium text-slate-500 mt-1 line-clamp-1">
                                            by {op.organization_name || "Partner Organization"}
                                        </p>
                                    </div>

                                    <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                                        {op.description}
                                    </p>

                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {op.city || "Remote"}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {op.start_date ? new Date(op.start_date).toLocaleDateString() : "Flexible Dates"}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            {op.hours || "0"} Hours Credit
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-orange-600">
                                            <Users className="w-3.5 h-3.5" />
                                            {op.seatsRemaining ?? op.remaining_seats ?? op.volunteersNeeded ?? 0} Seats Remaining
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-slate-50 bg-slate-50/50 rounded-b-2xl flex justify-between items-center">
                                    <Link href={`/dashboard/student/browse/${op.id}`} className="text-sm font-bold text-slate-600 hover:text-slate-900">
                                        View Details
                                    </Link>
                                    {op.applyLocked ? (
                                        <div className="flex items-center gap-2">
                                            {/* Report Button - Only show if APPLICATION is approved/active */}
                                            {op.application_status != null &&
                                                ["approved", "verified"].includes(op.application_status) && (
                                                <Link href={`/dashboard/student/report?projectId=${op.id}`}>
                                                    <Button size="sm" variant="outline" className="text-xs h-8">
                                                        Start Report
                                                    </Button>
                                                </Link>
                                            )}

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
                                                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => openTeamDialog(op)}>
                                                    <Users className="w-3.5 h-3.5 mr-1" /> Team
                                                </Button>
                                            )}

                                            <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50 pointer-events-none">
                                                <CheckCircle2 className="w-4 h-4 mr-1" /> Applied
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
                                                        ? "bg-slate-900 hover:bg-blue-600 text-white transition-colors"
                                                        : "bg-slate-300 text-slate-600 hover:bg-slate-300 cursor-not-allowed"
                                                }
                                                onClick={() =>
                                                    applyEligibility.canApply &&
                                                    openApplicationDialog(op.id, op.title ?? "Opportunity")
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
                                                    ? "bg-slate-900 hover:bg-blue-600 text-white transition-colors"
                                                    : "bg-slate-300 text-slate-600 hover:bg-slate-300 cursor-not-allowed"
                                            }
                                            onClick={() =>
                                                applyEligibility.canApply &&
                                                openApplicationDialog(op.id, op.title ?? "Opportunity")
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
                            <div key={op.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all group flex flex-col md:flex-row gap-6 items-start md:items-center">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">
                                            {op.category || "Social Impact"}
                                        </Badge>
                                        {applyEligibility.listingRestrictionLabel ? (
                                            <Badge className="bg-amber-50 text-amber-900 border border-amber-200 shadow-none hover:bg-amber-50">
                                                {applyEligibility.listingRestrictionLabel}
                                            </Badge>
                                        ) : null}
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {op.modeBucket && op.modeBucket !== "unspecified"
                                                ? modeMenuLabel(op.modeBucket)
                                                : op.mode || "On Site"}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                        {op.title}
                                    </h3>

                                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-slate-500">
                                        <span className="font-medium text-slate-600">by {op.organization_name || "Partner Organization"}</span>
                                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {op.city || "Remote"}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {op.start_date ? new Date(op.start_date).toLocaleDateString() : "Flexible Dates"}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {op.hours || "0"} Hours</span>
                                        <span className="flex items-center gap-1 font-bold text-orange-600"><Users className="w-3.5 h-3.5" /> {op.seatsRemaining ?? op.remaining_seats ?? op.volunteersNeeded ?? 0} Seats left</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
                                    <Link href={`/dashboard/student/browse/${op.id}`} className="flex-1 md:flex-none">
                                        <Button variant="outline" className="w-full">Details</Button>
                                    </Link>
                                    {op.applyLocked ? (
                                        <div className="flex items-center gap-2 flex-1 md:flex-none justify-end">
                                            {/* Report Button - Only show if APPLICATION is approved/active */}
                                            {op.application_status != null &&
                                                ["approved", "verified"].includes(op.application_status) && (
                                                <Link href={`/dashboard/student/report?projectId=${op.id}`}>
                                                    <Button size="sm" variant="outline" className="text-xs h-9">
                                                        Start Report
                                                    </Button>
                                                </Link>
                                            )}

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
                                                <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => openTeamDialog(op)}>
                                                    <Users className="w-3.5 h-3.5 mr-1" /> Team
                                                </Button>
                                            )}

                                            <Button variant="ghost" className="text-green-600 bg-green-50 pointer-events-none">
                                                <CheckCircle2 className="w-4 h-4 mr-2" /> Applied
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
                                                        ? "bg-slate-900 hover:bg-blue-600 text-white transition-colors flex-1 md:flex-none"
                                                        : "bg-slate-300 text-slate-600 hover:bg-slate-300 cursor-not-allowed flex-1 md:flex-none"
                                                }
                                                onClick={() =>
                                                    applyEligibility.canApply &&
                                                    openApplicationDialog(op.id, op.title ?? "Opportunity")
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
                                                    ? "bg-slate-900 hover:bg-blue-600 text-white transition-colors flex-1 md:flex-none"
                                                    : "bg-slate-300 text-slate-600 hover:bg-slate-300 cursor-not-allowed flex-1 md:flex-none"
                                            }
                                            onClick={() =>
                                                applyEligibility.canApply &&
                                                openApplicationDialog(op.id, op.title ?? "Opportunity")
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
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                        setApplyingId(null);
                        setApplyingTitle(undefined);
                    }
                }}
                onSuccess={handleSuccess}
            />

            {/* Team Details Dialog */}
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0">
                    <DialogHeader className="p-6 bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl text-slate-900">
                                    Project Team
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 mt-1">
                                    Collaborators for <span className="font-medium text-slate-700">{selectedTeamOpp?.title}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6">
                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
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

                    <DialogFooter className="p-6 pt-0">
                        <Button onClick={() => setIsTeamDialogOpen(false)} className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
