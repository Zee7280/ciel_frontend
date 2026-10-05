"use client";

import { useEffect, useState } from "react";
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
} from "@/utils/opportunityListing";
import {
    readStudentInstitutionFromBrowserStorage,
    resolveStudentUniversityApplyEligibility,
} from "@/utils/studentOpportunityApplyEligibility";
import {
    canJoinOrApply,
    canRecordCompletedService,
    lifecycleStatusLabel,
} from "@/utils/opportunityTimelineLifecycle";
import {
    applicationsOpenFromPayload,
    applyBlockedMessageFromPayload,
    applyClosedCtaLabel,
    listingIsExpiredFromPayload,
} from "@/utils/studentApplyMaintenance";
import {
    isJoinApplicationPendingStatus,
    isJoinApplicationRejectedStatus,
    isJoinApplicationApprovedStatus,
    joinApplicationLocksApplyButton,
    mergeHasAppliedFields,
    pickJoinApplicationId,
    pickJoinApplicationStage,
    joinApplicationPendingLabel,
} from "@/utils/studentJoinApplication";
import {
    buildStudentReportsCheckMap,
    pickReportStatusFromCheckRow,
    resolveStudentBrowseReportCta,
} from "@/utils/studentBrowseReportCta";
import { Loader2, Globe, LayoutGrid, List, Users, Mail, Phone, GraduationCap, ChevronDown, Search, Filter, Leaf, Lightbulb } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { fetchStudentBrowsePayload, peekStudentBrowsePayload } from "@/utils/student-community-cache";
import BrowseOpportunityCard, { sdgsForBrowseCard } from "./BrowseOpportunityCard";
import ApplicationDialog from "./components/ApplicationDialog";
import {
    BROWSE_PATHS,
    BROWSE_PATH_BY_KEY,
    classifyBrowseCreator,
    classifyBrowsePath,
    isUrgentBrowseDeadline,
    type BrowsePathKey,
} from "@/utils/browseOpportunityPath";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../report/components/ui/dialog";
import { ScoringLevelsDialog } from "@/components/scoring/ScoringLevelsDialog";
import { fetchImpactSummary, readImpactSummaryCache } from "@/utils/cielImpactSummary";
import { fetchStudentDashboardData } from "@/utils/student-dashboard-fetch";
import ProgressBar from "@/components/ciel/ProgressBar";
import { findSdgById } from "@/utils/sdgData";

type BrowseCreatorLabel = "Student" | "Faculty" | "NGO" | "Partner" | "CIEL PK";

/** Keep aligned with BE `classifyBrowseCreator`. NGO stays a browse-only split of partner. */
function pickBrowseCreatorLabel(raw: Record<string, unknown>): BrowseCreatorLabel | null {
    const r = String(raw.created_by_role ?? raw.creator_role ?? raw.creator_type ?? "")
        .trim()
        .toLowerCase();
    if (r.includes("ngo") && !r.includes("partner")) return "NGO";
    const key = classifyBrowseCreator(raw);
    if (key === "student") return "Student";
    if (key === "faculty") return "Faculty";
    if (key === "admin") return "CIEL PK";
    if (key === "partner") return r.includes("ngo") ? "NGO" : "Partner";
    if (!r) return null;
    if (r.includes("faculty")) return "Faculty";
    if (r.includes("admin") || r.includes("ciel")) return "CIEL PK";
    return "Partner";
}

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
    sdgNumber?: number | null;
    sdgTitle?: string | null;
    creatorLabel?: BrowseCreatorLabel | null;
    seatsRemaining?: number | null;
    seatsApproved?: number | null;
    path_key?: BrowsePathKey;
    path_label?: string;
    end_date?: string | null;
    cover_url?: string | null;
    department?: string | null;
    partner_name?: string | null;
    sdg_ids?: string[];
    is_full?: boolean;
    is_virtual?: boolean;
    is_urgent?: boolean;
    /** True while a join application is pending or approved; false when rejected so student can re-apply. */
    applyLocked?: boolean;
    applications_open?: boolean;
    admin_expired?: boolean;
    apply_blocked_reason?: string | null;
    apply_blocked_message?: string | null;
    apply_maintenance?: { enabled?: boolean; message?: string };
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

    const sdgIdRaw =
        (op.sdg_info && typeof op.sdg_info === "object" ? (op.sdg_info as { sdg_id?: unknown }).sdg_id : undefined) ??
        raw.sdg;
    const sdg = findSdgById(sdgIdRaw as string | number | undefined);
    const creatorLabel = pickBrowseCreatorLabel(raw);

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
    const seatsApproved =
        seatsTotal != null && seatsRemaining != null ? Math.max(0, seatsTotal - seatsRemaining) : null;
    const createdRaw = raw.created_at ?? raw.createdAt ?? raw.published_at;
    const createdAt = typeof createdRaw === "string" && createdRaw.trim() ? createdRaw : undefined;
    const timelineStart = typeof timeline?.start_date === "string" ? timeline.start_date : undefined;
    const timelineEnd =
        (typeof raw.end_date === "string" && raw.end_date.trim()
            ? raw.end_date
            : typeof timeline?.end_date === "string" && timeline.end_date.trim()
              ? timeline.end_date
              : typeof timeline?.application_deadline === "string" && timeline.application_deadline.trim()
                ? timeline.application_deadline
                : null);
    const path_key = classifyBrowsePath(opportunityTypes, raw.path_key);
    const sdgIds = Array.isArray(raw.sdg_ids)
        ? raw.sdg_ids.map((id) => String(id))
        : [sdgIdRaw].filter((id) => id != null && String(id).trim()).map((id) => String(id));
    const remainingForFull = typeof seatsRemaining === "number" ? seatsRemaining : null;
    const is_full =
        typeof raw.is_full === "boolean"
            ? raw.is_full
            : Boolean(seatsTotal && remainingForFull != null && remainingForFull <= 0);

    return {
        ...op,
        hours: pickBrowseCreditHours(raw, op),
        organization_name: orgName,
        city,
        category,
        createdAt,
        start_date: op.start_date || timelineStart,
        end_date: timelineEnd,
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
        sdgNumber: sdg?.number ?? null,
        sdgTitle: sdg?.title ?? null,
        sdg_ids: sdgIds,
        creatorLabel,
        seatsRemaining,
        seatsApproved,
        path_key,
        path_label: typeof raw.path_label === "string" && raw.path_label.trim() ? raw.path_label : undefined,
        cover_url: typeof raw.cover_url === "string" ? raw.cover_url : null,
        department: typeof raw.department === "string" && raw.department.trim() ? raw.department : null,
        partner_name: typeof raw.partner_name === "string" && raw.partner_name.trim() ? raw.partner_name : orgName || null,
        is_full,
        is_virtual: typeof raw.is_virtual === "boolean" ? raw.is_virtual : normalizeModeBucket(op.mode ?? raw.mode) === "remote",
        is_urgent: typeof raw.is_urgent === "boolean" ? raw.is_urgent : isUrgentBrowseDeadline(timelineEnd),
        applications_open: op.applications_open,
        admin_expired: raw.admin_expired === true,
        apply_blocked_reason: op.apply_blocked_reason,
        apply_blocked_message: op.apply_blocked_message,
        apply_maintenance: op.apply_maintenance,
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

function mapBrowseFromPayload(payload: { data?: unknown[] } | null): BrowseOpportunity[] {
    if (!payload?.data) return [];
    return (payload.data as BrowseOpportunity[]).map((op) => normalizeOpportunity(op)).filter((op) => shouldShowInBrowse(op));
}

function isPendingJoin(op: BrowseOpportunity): boolean {
    return isJoinApplicationPendingStatus(op.application_status || "");
}

export default function StudentBrowseOpportunitiesPage() {
    const cachedBrowse = peekStudentBrowsePayload();
    const [opportunities, setOpportunities] = useState<BrowseOpportunity[]>(() => mapBrowseFromPayload(cachedBrowse));
    const [studentInstitution, setStudentInstitution] = useState("");
    const [isLoading, setIsLoading] = useState(!cachedBrowse);
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
    const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
    const [hoursLogged, setHoursLogged] = useState(0);
    const [hoursTarget, setHoursTarget] = useState(16);
    const [applyMaintenanceBanner, setApplyMaintenanceBanner] = useState<string | null>(() => {
        const maintenance = cachedBrowse?.apply_maintenance;
        return maintenance?.enabled && typeof maintenance.message === "string" && maintenance.message.trim()
            ? maintenance.message.trim()
            : null;
    });

    // Filters & View State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [universityFilter, setUniversityFilter] = useState("all");
    const [modeFilter, setModeFilter] = useState<"all" | ModeBucket>("all");
    const [oppTypeFilter, setOppTypeFilter] = useState("all");
    const [sdgFilter, setSdgFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");
    const [seatsFilter, setSeatsFilter] = useState<"all" | "1" | "5" | "10">("all");
    const [visibilityFilter, setVisibilityFilter] = useState<"all" | VisibilityBucket>("all");
    const [creatorFilter, setCreatorFilter] = useState<"all" | BrowseCreatorLabel>("all");
    const [pathTab, setPathTab] = useState<"all" | BrowsePathKey>("all");
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [statusFilter, setStatusFilter] = useState<"all" | "open" | "full">("all");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [partnerFilter, setPartnerFilter] = useState("all");
    const [timeCommitment, setTimeCommitment] = useState<"all" | "8" | "16" | "17">("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [openTo, setOpenTo] = useState<"all" | "university" | "department" | "public">("all");
    const [virtualOnly, setVirtualOnly] = useState(false);
    const [urgentOnly, setUrgentOnly] = useState(false);

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
    const departmentOptions = Array.from(
        new Set(opportunities.map((op) => op.department).filter((d): d is string => Boolean(d))),
    ).sort((a, b) => a.localeCompare(b));
    const partnerOptions = Array.from(
        new Set(opportunities.map((op) => op.partner_name || op.organization_name).filter((d): d is string => Boolean(d))),
    ).sort((a, b) => a.localeCompare(b));
    const computeBrowsePathCounts = (list: typeof opportunities) => ({
        all: list.length,
        community_service: list.filter((op) => (op.path_key || "community_service") === "community_service").length,
        coursework: list.filter((op) => op.path_key === "coursework").length,
        fyp: list.filter((op) => op.path_key === "fyp").length,
        startup: list.filter((op) => op.path_key === "startup").length,
    });
    const pathCounts = computeBrowsePathCounts(opportunities);

    const afterListingFilters = opportunities.filter((op) => {
        // Defense-in-depth: the backend already excludes admin_hidden rows from this endpoint,
        // but never render one as a normal "Open" card if it ever slips through.
        if (op.apply_blocked_reason === "opportunity_hidden") return false;
        if (universityFilter !== "all" && (op.universityLabel || "Unspecified") !== universityFilter) return false;
        if (modeFilter !== "all" && (op.modeBucket || "unspecified") !== modeFilter) return false;
        if (oppTypeFilter !== "all" && !(op.opportunityTypes || []).includes(oppTypeFilter)) return false;
        if (sdgFilter !== "all" && (op.sdgLabel || "Unspecified SDG") !== sdgFilter) return false;
        if (locationFilter !== "all" && (op.city || "Remote") !== locationFilter) return false;
        if (!passesSeatsFilter(op.seatsRemaining ?? null, seatsFilter)) return false;
        if (visibilityFilter !== "all" && (op.visibilityBucket || "unspecified") !== visibilityFilter) return false;
        if (creatorFilter !== "all" && op.creatorLabel !== creatorFilter) return false;
        if (pathTab !== "all" && (op.path_key || "community_service") !== pathTab) return false;
        if (statusFilter === "open" && op.is_full) return false;
        if (statusFilter === "full" && !op.is_full) return false;
        if (departmentFilter !== "all" && op.department !== departmentFilter) return false;
        if (partnerFilter !== "all" && (op.partner_name || op.organization_name) !== partnerFilter) return false;
        if (timeCommitment !== "all") {
            const hours = typeof op.hours === "number" ? op.hours : Number(op.hours);
            if (!Number.isFinite(hours)) return false;
            if (timeCommitment === "8" && hours > 8) return false;
            if (timeCommitment === "16" && (hours <= 8 || hours > 16)) return false;
            if (timeCommitment === "17" && hours <= 16) return false;
        }
        if (dateFrom && op.end_date && String(op.end_date).slice(0, 10) < dateFrom) return false;
        if (dateTo && (op.start_date || op.end_date) && String(op.start_date || op.end_date).slice(0, 10) > dateTo) return false;
        if (openTo === "public" && op.visibilityBucket !== "open") return false;
        if (openTo === "university" && op.visibilityBucket !== "restricted") return false;
        if (openTo === "department" && !op.department) return false;
        if (virtualOnly && !op.is_virtual) return false;
        if (urgentOnly && !op.is_urgent) return false;
        return true;
    });
    const filteredPathCounts = computeBrowsePathCounts(afterListingFilters);
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
        setCreatorFilter("all");
        setSearchQuery("");
        setOnlyOpenSeats(false);
        setSortNewest(true);
        setPathTab("all");
        setStatusFilter("all");
        setDepartmentFilter("all");
        setPartnerFilter("all");
        setTimeCommitment("all");
        setDateFrom("");
        setDateTo("");
        setOpenTo("all");
        setVirtualOnly(false);
        setUrgentOnly(false);
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
        creatorFilter,
        statusFilter,
        departmentFilter,
        partnerFilter,
        timeCommitment,
        openTo,
    ].filter((v) => v !== "all").length + (onlyOpenSeats ? 1 : 0) + (needle ? 1 : 0) + (pathTab !== "all" ? 1 : 0) + (virtualOnly ? 1 : 0) + (urgentOnly ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);

    const pendingApplicationsCount = opportunities.filter((op) => op.applyLocked && isPendingJoin(op)).length;
    const myApplications = opportunities.filter((op) => op.hasApplied || op.has_applied || op.applyLocked);
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
        void fetchOpportunities({ silent: true, force: true });
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
                void fetchOpportunities({ silent: true, force: true });
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

    const fetchOpportunities = async (options?: { silent?: boolean; force?: boolean }) => {
        if (!options?.silent && !peekStudentBrowsePayload()) {
            setIsLoading(true);
        }
        try {
            const userId = getStoredCurrentUserId() || null;
            const data = await fetchStudentBrowsePayload({ force: options?.force });
            if (data.success) {
                const maintenance = data.apply_maintenance;
                setApplyMaintenanceBanner(
                    maintenance?.enabled && typeof maintenance.message === "string" && maintenance.message.trim()
                        ? maintenance.message.trim()
                        : null,
                );
                let mappedOps = mapBrowseFromPayload(data);
                if (userId) {
                    mappedOps = await mergeBrowseOpportunitiesWithReportCheck(mappedOps, userId);
                }
                setOpportunities(mappedOps);
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

    if (isLoading && opportunities.length === 0) {
        return (
            <div className="mx-auto max-w-[1400px] space-y-5 pb-20">
                <header>
                    <h1 className="text-[28px] font-bold tracking-tight text-ciel-text">Browse opportunities</h1>
                    <p className="mt-1 text-sm text-ciel-text-mid">Published listings from Faculty, NGOs, Partners and CIEL PK.</p>
                </header>
                <div className="flex flex-col justify-center items-center min-h-[280px] gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-ciel-green" />
                    <p className="text-sm text-ciel-text-mid">Loading opportunities…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1400px] space-y-5 pb-20">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-[28px] font-bold tracking-tight text-ciel-text">Browse opportunities</h1>
                    <p className="mt-1 text-sm text-ciel-text-mid">
                        Only published opportunities created by Faculty, NGOs, Partners or CIEL PK appear here. Apply here; once participation is approved, the project moves to My Reports.
                    </p>
                    <Link href="/dashboard/student/paths/community-service" className="mt-2 inline-block text-xs font-extrabold text-[#0e7d74] hover:underline">
                        ← Community Service hub
                    </Link>
                </div>
                <button
                    type="button"
                    onClick={() => setIsScoringLevelsOpen(true)}
                    className="h-9 shrink-0 rounded-lg border border-ciel-border bg-white px-3.5 text-sm font-medium text-ciel-text hover:bg-slate-50"
                >
                    How scoring works
                </button>
            </header>

            {applyMaintenanceBanner ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p className="font-semibold">Applications temporarily paused</p>
                    <p className="mt-1 text-amber-900/90">{applyMaintenanceBanner}</p>
                </div>
            ) : null}

            <div className="flex flex-col gap-3 rounded-xl border border-ciel-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-5">
                <p className="shrink-0 text-sm font-bold text-ciel-text">
                    {hoursLogged} of {hoursTarget} hours logged
                </p>
                <ProgressBar value={hoursPct} className="h-2 flex-1" barClassName="bg-[#0e7d74]" trackClassName="bg-slate-200" />
                <p className="shrink-0 text-sm text-ciel-text-mid">
                    {hoursRemaining} hours to go · {pendingApplicationsCount} application{pendingApplicationsCount === 1 ? "" : "s"} pending
                </p>
            </div>

            <section className="rounded-xl border border-ciel-border bg-white p-4">
                <h2 className="text-[17px] font-semibold text-[#16313d]">My applications</h2>
                <p className="mt-1 text-[12.5px] text-[#70808a]">
                    Apply here → participation approval stays here → once approved, the assigned project moves to My Reports → Ready to Start.
                </p>
                {myApplications.length === 0 ? (
                    <p className="mt-3 text-sm text-[#7a919a]">No applications yet.</p>
                ) : (
                    <div className="mt-3 grid gap-2.5">
                        {myApplications.map((op) => {
                            const status = op.application_status || "";
                            const pending = isPendingJoin(op);
                            const approved = isJoinApplicationApprovedStatus(status);
                            const declined = isJoinApplicationRejectedStatus(status);
                            const next = pending
                                ? "No action required — waiting on participation approval"
                                : approved
                                  ? "Moved to My Reports · Ready to Start"
                                  : declined
                                    ? "Application closed — review other opportunities"
                                    : "—";
                            return (
                                <div key={op.id} className="flex flex-col gap-2 rounded-2xl border border-[#dde5ea] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-[#16313d]">{op.title || "Opportunity"}</p>
                                        <p className="mt-0.5 text-[11.5px] text-[#6b7c86]">
                                            {pending
                                                ? joinApplicationPendingLabel(op as unknown as Record<string, unknown>)
                                                : approved
                                                  ? "Approved · assigned"
                                                  : declined
                                                    ? "Declined"
                                                    : status || "Applied"}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11.5px] text-[#6b7c86]">{next}</span>
                                        {approved ? (
                                            <Link
                                                href="/dashboard/student/paths/community-service?view=workspace&filter=ready"
                                                className="rounded-[9px] bg-[#174b43] px-2.5 py-2 text-[10px] font-black text-white"
                                            >
                                                Go to My Reports
                                            </Link>
                                        ) : (
                                            <Link
                                                href={`/dashboard/student/browse/${encodeURIComponent(op.id)}`}
                                                className="rounded-[9px] bg-[#edf2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]"
                                            >
                                                View opportunity
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {BROWSE_PATHS.map((path) => {
                    const Icon = path.key === "coursework" ? Leaf : path.key === "startup" ? Lightbulb : path.key === "fyp" ? Search : Users;
                    const active = pathTab === path.key;
                    return (
                        <button
                            key={path.key}
                            type="button"
                            onClick={() => setPathTab(active ? "all" : path.key)}
                            className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left shadow-sm transition ${
                                active ? "border-transparent text-white" : "border-[#e4eeec] bg-white hover:border-[#cfe3de]"
                            }`}
                            style={active ? { background: path.accent } : undefined}
                        >
                            <span className={`mt-0.5 grid h-10 w-10 place-items-center rounded-xl ${active ? "bg-white/15 text-white" : ""}`} style={!active ? { background: path.accentSoft, color: path.accentText } : undefined}>
                                <Icon className="h-5 w-5" />
                            </span>
                            <span>
                                <span className="block text-[15px] font-bold leading-tight">{path.label}</span>
                                <span className={`mt-0.5 block text-[12px] ${active ? "text-white/85" : "text-[#6b7c86]"}`}>{path.tagline}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <section className="rounded-2xl border border-[#e4eeec] bg-white p-4 shadow-[0_8px_24px_rgba(15,42,48,.04)]" aria-label="Filters">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="inline-flex items-center gap-2 text-[15px] font-bold text-[#16313d]">
                        <Filter className="h-4 w-4 text-[#0e7d74]" />
                        Advanced Filters
                        {activeFilterCount > 0 ? (
                            <span className="rounded-full bg-[#e8f8f1] px-2 py-0.5 text-[11px] font-black text-[#0f6b4a]">{activeFilterCount}</span>
                        ) : null}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={clearListingFilters} className="rounded-full border border-[#e4eeec] px-3 py-1.5 text-[12px] font-semibold text-[#5d7278] hover:bg-slate-50">
                            Clear All
                        </button>
                        <button type="button" onClick={() => setFiltersOpen((open) => !open)} className="inline-flex items-center gap-1 rounded-full border border-[#e4eeec] px-3 py-1.5 text-[12px] font-semibold text-[#5d7278] hover:bg-slate-50">
                            {filtersOpen ? "Hide Filters" : "Show Filters"}
                            <ChevronDown className={`h-3.5 w-3.5 transition ${filtersOpen ? "rotate-180" : ""}`} />
                        </button>
                    </div>
                </div>
                {filtersOpen ? (
                    <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                            <label className="block text-[11px] font-bold text-[#5d7278]">
                                Keyword Search
                                <span className="relative mt-1 block">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                    <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by title, partner, skills…" className="h-10 w-full rounded-xl border border-[#e4eeec] bg-white pl-9 pr-3 text-sm text-[#16313d] placeholder:text-[#8aa0a6] focus:border-[#0e7d74] focus:outline-none" />
                                </span>
                            </label>
                            <label className="block text-[11px] font-bold text-[#5d7278]">
                                Opportunity Type
                                <span className="relative mt-1 block">
                                    <select value={oppTypeFilter} onChange={(e) => setOppTypeFilter(e.target.value)} className={`${filterSelectClass} w-full min-w-0 rounded-xl`}>
                                        <option value="all">All Types</option>
                                        {oppTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                </span>
                            </label>
                            <label className="block text-[11px] font-bold text-[#5d7278]">
                                Category
                                <span className="relative mt-1 block">
                                    <select value={pathTab} onChange={(e) => setPathTab(e.target.value as "all" | BrowsePathKey)} className={`${filterSelectClass} w-full min-w-0 rounded-xl`}>
                                        <option value="all">All Categories</option>
                                        {BROWSE_PATHS.map((p) => <option key={p.key} value={p.key}>{p.shortLabel}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                </span>
                            </label>
                            <label className="block text-[11px] font-bold text-[#5d7278]">
                                Location
                                <span className="relative mt-1 block">
                                    <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className={`${filterSelectClass} w-full min-w-0 rounded-xl`}>
                                        <option value="all">All Locations</option>
                                        {locationOptions.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                </span>
                            </label>
                            <label className="block text-[11px] font-bold text-[#5d7278]">
                                Mode
                                <span className="relative mt-1 block">
                                    <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value as "all" | ModeBucket)} className={`${filterSelectClass} w-full min-w-0 rounded-xl`}>
                                        <option value="all">All Modes</option>
                                        {(["on-site", "hybrid", "remote"] as const).map((b) => <option key={b} value={b}>{modeMenuLabel(b)}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                </span>
                            </label>
                            <label className="block text-[11px] font-bold text-[#5d7278]">
                                Status
                                <span className="relative mt-1 block">
                                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "open" | "full")} className={`${filterSelectClass} w-full min-w-0 rounded-xl`}>
                                        <option value="all">All Statuses</option>
                                        <option value="open">Open</option>
                                        <option value="full">Full</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                </span>
                            </label>
                            <label className="block text-[11px] font-bold text-[#5d7278]">
                                SDG(s)
                                <span className="relative mt-1 block">
                                    <select value={sdgFilter} onChange={(e) => setSdgFilter(e.target.value)} className={`${filterSelectClass} w-full min-w-0 rounded-xl`}>
                                        <option value="all">Select SDGs</option>
                                        {sdgOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                </span>
                            </label>
                            <label className="block text-[11px] font-bold text-[#5d7278]">
                                Department
                                <span className="relative mt-1 block">
                                    <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className={`${filterSelectClass} w-full min-w-0 rounded-xl`}>
                                        <option value="all">All Departments</option>
                                        {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                </span>
                            </label>
                            <label className="block text-[11px] font-bold text-[#5d7278]">
                                University
                                <span className="relative mt-1 block">
                                    <select value={universityFilter} onChange={(e) => setUniversityFilter(e.target.value)} className={`${filterSelectClass} w-full min-w-0 rounded-xl`}>
                                        <option value="all">All Universities</option>
                                        {universityOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                </span>
                            </label>
                            <label className="block text-[11px] font-bold text-[#5d7278]">
                                Partner / NGO
                                <span className="relative mt-1 block">
                                    <select value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)} className={`${filterSelectClass} w-full min-w-0 rounded-xl`}>
                                        <option value="all">All Partners</option>
                                        {partnerOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                </span>
                            </label>
                            <label className="block text-[11px] font-bold text-[#5d7278]">
                                Time Commitment
                                <span className="relative mt-1 block">
                                    <select value={timeCommitment} onChange={(e) => setTimeCommitment(e.target.value as "all" | "8" | "16" | "17")} className={`${filterSelectClass} w-full min-w-0 rounded-xl`}>
                                        <option value="all">Any Hours</option>
                                        <option value="8">Up to 8 hrs</option>
                                        <option value="16">9–16 hrs</option>
                                        <option value="17">17+ hrs</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                </span>
                            </label>
                            <label className="block text-[11px] font-bold text-[#5d7278]">
                                Date Range
                                <span className="mt-1 grid grid-cols-2 gap-1">
                                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 rounded-xl border border-[#e4eeec] px-2 text-sm text-[#16313d]" />
                                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 rounded-xl border border-[#e4eeec] px-2 text-sm text-[#16313d]" />
                                </span>
                            </label>
                        </div>
                        <div className="grid gap-3 border-t border-[#eef4f3] pt-3 lg:grid-cols-3">
                            <div>
                                <p className="text-[11px] font-bold text-[#5d7278]">Open To</p>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-[#16313d]">
                                    {([
                                        ["all", "All"],
                                        ["university", studentInstitution ? `${studentInstitution} only` : "My university only"],
                                        ["department", "Department only"],
                                        ["public", "Public (all universities)"],
                                    ] as const).map(([value, label]) => (
                                        <label key={value} className="inline-flex items-center gap-1.5">
                                            <input type="checkbox" checked={openTo === value} onChange={() => setOpenTo(value)} className="h-4 w-4 rounded border-[#cfe3de] text-[#0e7d74] focus:ring-[#0e7d74]" />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[#5d7278]">Created By</p>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-[#16313d]">
                                    <label className="inline-flex items-center gap-1.5">
                                        <input type="checkbox" checked={creatorFilter === "all"} onChange={() => setCreatorFilter("all")} className="h-4 w-4 rounded border-[#cfe3de] text-[#0e7d74] focus:ring-[#0e7d74]" />
                                        All
                                    </label>
                                    {(["Student", "Faculty", "NGO", "Partner", "CIEL PK"] as const).map((c) => (
                                        <label key={c} className="inline-flex items-center gap-1.5">
                                            <input type="checkbox" checked={creatorFilter === c} onChange={() => setCreatorFilter(creatorFilter === c ? "all" : c)} className="h-4 w-4 rounded border-[#cfe3de] text-[#0e7d74] focus:ring-[#0e7d74]" />
                                            {c === "CIEL PK" ? "Admin" : c}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[#5d7278]">Special Filter</p>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-[#16313d]">
                                    <label className="inline-flex items-center gap-1.5">
                                        <input type="checkbox" checked={onlyOpenSeats} onChange={(e) => setOnlyOpenSeats(e.target.checked)} className="h-4 w-4 rounded border-[#cfe3de] text-[#0e7d74] focus:ring-[#0e7d74]" />
                                        With Available Seats Only
                                    </label>
                                    <label className="inline-flex items-center gap-1.5">
                                        <input type="checkbox" checked={virtualOnly} onChange={(e) => setVirtualOnly(e.target.checked)} className="h-4 w-4 rounded border-[#cfe3de] text-[#0e7d74] focus:ring-[#0e7d74]" />
                                        Virtual Opportunities
                                    </label>
                                    <label className="inline-flex items-center gap-1.5">
                                        <input type="checkbox" checked={urgentOnly} onChange={(e) => setUrgentOnly(e.target.checked)} className="h-4 w-4 rounded border-[#cfe3de] text-[#0e7d74] focus:ring-[#0e7d74]" />
                                        Urgent Opportunities
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </section>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-black text-[#16313d]">{filteredOpportunities.length} Opportunities Found</p>
                    <button type="button" onClick={() => setPathTab("all")} className={`rounded-full px-2.5 py-1 text-[11px] font-black ${pathTab === "all" ? "bg-[#16313d] text-white" : "bg-[#edf2f3] text-[#29454f]"}`}>
                        All {pathTab === "all" ? filteredPathCounts.all : pathCounts.all}
                    </button>
                    {BROWSE_PATHS.map((path) => (
                        <button
                            key={path.key}
                            type="button"
                            onClick={() => setPathTab(path.key)}
                            className="rounded-full px-2.5 py-1 text-[11px] font-black"
                            style={
                                pathTab === path.key
                                    ? { background: path.accent, color: "#fff" }
                                    : { background: path.accentSoft, color: path.accentText }
                            }
                        >
                            {path.shortLabel} {pathTab === path.key ? filteredPathCounts[path.key] : pathCounts[path.key]}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select value={sortNewest ? "newest" : "oldest"} onChange={(e) => setSortNewest(e.target.value === "newest")} className={`${filterSelectClass} min-w-[9rem] rounded-xl`} title="Sort">
                            <option value="newest">Most Recent</option>
                            <option value="oldest">Oldest first</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                    </div>
                    <div className="flex rounded-xl border border-[#e4eeec] p-0.5">
                        <button type="button" onClick={() => setViewMode("grid")} className={`rounded-lg p-1.5 ${viewMode === "grid" ? "bg-slate-100 text-[#16313d]" : "text-[#8aa0a6]"}`} title="Grid view">
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setViewMode("list")} className={`rounded-lg p-1.5 ${viewMode === "list" ? "bg-slate-100 text-[#16313d]" : "text-[#8aa0a6]"}`} title="List view">
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
            {onlyOpenSeats && fullHiddenCount > 0 ? (
                <p className="text-sm text-ciel-text-mid">{fullHiddenCount} full project{fullHiddenCount === 1 ? "" : "s"} hidden</p>
            ) : null}

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
                <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "space-y-4"}>
                    {filteredOpportunities.map((op) => {
                        const applyEligibility = resolveStudentUniversityApplyEligibility(
                            op as unknown as Record<string, unknown>,
                            studentInstitution,
                        );
                        const timeline = (op as { timeline?: unknown }).timeline;
                        const joinOpen = canJoinOrApply(timeline);
                        const lateRecord = canRecordCompletedService(timeline);
                        const lifeLabel = lifecycleStatusLabel(timeline);
                        const rawOp = op as unknown as Record<string, unknown>;
                        const catalogOpen = applicationsOpenFromPayload(rawOp);
                        const dateAllowsJoin = catalogOpen && (joinOpen || lateRecord);
                        const canApplyNow = applyEligibility.canApply && dateAllowsJoin;
                        const joinButtonLabel = !applyEligibility.canApply
                            ? "Not eligible"
                            : !catalogOpen
                              ? applyClosedCtaLabel(
                                    listingIsExpiredFromPayload(rawOp)
                                        ? "opportunity_expired"
                                        : op.apply_blocked_reason,
                                )
                              : !dateAllowsJoin
                              ? lifeLabel || "Closed"
                              : lateRecord && !joinOpen
                                ? "Record Completed Service"
                                : op.hasApplied
                                  ? "Apply again"
                                  : "Join Opportunity";
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
                        const hoursNum = typeof op.hours === "number" ? op.hours : Number(op.hours);
                        const hoursLabel = `${Number.isFinite(hoursNum) ? hoursNum : op.hours || 0} hrs`;
                        const seatsLeft = op.seatsRemaining ?? op.remaining_seats ?? 0;
                        const pathKey = op.path_key || "community_service";
                        return (
                            <BrowseOpportunityCard
                                key={op.id}
                                id={op.id}
                                title={op.title}
                                description={op.description && op.description !== "No description" ? op.description : undefined}
                                pathKey={pathKey}
                                pathLabel={op.path_label || BROWSE_PATH_BY_KEY[pathKey].shortLabel}
                                organizationName={op.partner_name || op.organization_name}
                                city={op.city}
                                modeLabel={modeLabel}
                                hoursLabel={hoursLabel}
                                seatsLabel={`${seatsLeft} seats`}
                                deadline={op.end_date}
                                coverUrl={op.cover_url}
                                isFull={Boolean(op.is_full)}
                                isExpired={listingIsExpiredFromPayload(rawOp)}
                                sdgs={sdgsForBrowseCard(op.sdg_ids || [], op.sdgNumber, op.sdgTitle)}
                                visibilityTag={visibilityTag}
                                visibilityWarn={Boolean(applyEligibility.listingRestrictionLabel)}
                                appliedPending={Boolean(op.applyLocked && isPendingJoin(op))}
                                appliedRejected={Boolean(op.hasApplied && op.application_status && isJoinApplicationRejectedStatus(op.application_status))}
                                reportHref={reportCta?.href}
                                reportLabel={reportCta?.label}
                                showTeam={Boolean(op.teamMembers && op.teamMembers.length > 0)}
                                showWithdraw={Boolean(showWithdraw)}
                                withdrawing={withdrawingId === op.id}
                                canApplyNow={Boolean(canApplyNow)}
                                showJoin={op.applyLocked !== true}
                                joinButtonLabel={joinButtonLabel}
                                joinTitle={
                                    !catalogOpen
                                        ? applyBlockedMessageFromPayload(rawOp) || "Applications closed"
                                        : !dateAllowsJoin
                                          ? lifeLabel || "Applications closed"
                                          : applyEligibility.blockedReason || undefined
                                }
                                viewMode={viewMode}
                                onOpenTeam={() => openTeamDialog(op)}
                                onShare={() => void copyBrowseOpportunityShareLink(op.id)}
                                onWithdraw={() => void handleWithdraw(op)}
                                onJoin={() => openApplicationDialog(op)}
                            />
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
