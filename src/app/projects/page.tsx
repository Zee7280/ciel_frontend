"use client";

import Navbar from "@/components/Navbar";
import PartnersFooter from "@/components/PartnersFooter";
import FooterBanner from "@/components/FooterBanner";
import Footer from "@/components/Footer";
import BrowseOpportunityCard, { sdgsForBrowseCard } from "@/app/dashboard/student/browse/BrowseOpportunityCard";
import {
    Search,
    Users,
    Loader2,
    Boxes,
    LayoutGrid,
    List,
    Map as MapIcon,
    Clock,
    CheckCircle2,
    BarChart3,
    Leaf,
    Lightbulb,
    Filter,
    ChevronDown,
    X,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import clsx from "clsx";
import type { ModeBucket, VisibilityBucket } from "@/utils/opportunityListing";
import {
    buildSdgFilterLabel,
    computeSeatsRemaining,
    modeMenuLabel,
    normalizeModeBucket,
    pickOpportunityTypes,
    pickUniversityLabel,
    pickVisibilityBucket,
} from "@/utils/opportunityListing";
import { findSdgById } from "@/utils/sdgData";
import { buildOpportunityMapPoints } from "@/utils/opportunityMapCoordinates";
import { applicationsOpenFromPayload, listingIsExpiredFromPayload } from "@/utils/studentApplyMaintenance";
import {
    BROWSE_PATHS,
    BROWSE_PATH_BY_KEY,
    classifyBrowseCreator,
    classifyBrowsePath,
    isUrgentBrowseDeadline,
    type BrowsePathKey,
} from "@/utils/browseOpportunityPath";

const OpportunitiesMapView = dynamic(
    () => import("@/components/opportunities/OpportunitiesMapView"),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-[min(70vh,560px)] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-[#0F8F83]" />
            </div>
        ),
    },
);

type ExploreCreator = "student" | "faculty" | "partner" | "admin";

type ExploreProject = {
    id: string;
    title: string;
    description: string;
    status: string;
    org: string;
    city: string;
    location: string;
    locationPin: string | null;
    universityLabel: string;
    modeBucket: ModeBucket;
    visibilityBucket: VisibilityBucket;
    opportunityTypes: string[];
    sdgLabel: string;
    sdgNumber: number | null;
    sdgTitle: string | null;
    sdg_ids: string[];
    seatsRemaining: number | null;
    hours: number | null;
    start_date: string | null;
    end_date: string | null;
    createdAt?: string;
    department: string | null;
    partner_name: string | null;
    path_key: BrowsePathKey;
    path_label: string;
    cover_url: string | null;
    is_full: boolean;
    is_virtual: boolean;
    is_urgent: boolean;
    created_by_role: ExploreCreator | null;
    faculty_verified: boolean;
    execution_verified: boolean;
    admin_approved: boolean;
    participant_count: number;
    applicationsOpen: boolean;
    applyBlockedReason: string | null;
    adminExpired: boolean;
};

type ExploreStats = {
    total: number;
    verified: number;
    partners: number;
    students_impacted: number;
};

type PathCounts = Record<BrowsePathKey | "all", number>;

const EMPTY_PATH_COUNTS: PathCounts = {
    all: 0,
    community_service: 0,
    coursework: 0,
    fyp: 0,
    startup: 0,
};

function buildPublicProjectShareUrl(projectId: string): string {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/projects/${encodeURIComponent(projectId)}`;
}

async function copyPublicProjectShareLink(projectId: string): Promise<void> {
    const url = buildPublicProjectShareUrl(projectId);
    if (!url) return;
    try {
        await navigator.clipboard.writeText(url);
        toast.success("Project link copied");
    } catch {
        toast.error("Could not copy link");
    }
}

function normalizeStatus(status: string): string {
    return String(status || "").trim().toLowerCase();
}

function isArchivedStatus(status: string): boolean {
    const s = normalizeStatus(status);
    return ["completed", "archived", "closed", "inactive", "cancelled"].some((x) => s.includes(x));
}

function extractCityLabel(location?: string): string {
    if (!location) return "Pakistan";
    const first = location.split(",")[0]?.trim();
    return first || location;
}

function statusDisplayLabel(status: string): string {
    const s = normalizeStatus(status);
    if (s.includes("closing")) return "Closing Soon";
    if (s.includes("full")) return "Full";
    if (isArchivedStatus(status)) return "Completed";
    if (s === "active" || s.includes("open")) return "Open";
    if (s === "recruiting") return "Recruiting";
    return status || "Open";
}

function formatStat(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return "0";
    return value.toLocaleString("en-US");
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function pickCity(raw: Record<string, unknown>, fallbackLocation: string): string {
    const loc = raw.location;
    if (loc && typeof loc === "object") {
        const l = loc as Record<string, unknown>;
        return str(l.city) || str(l.district) || str(l.venue) || extractCityLabel(fallbackLocation);
    }
    if (typeof loc === "string" && loc.trim()) return extractCityLabel(loc);
    return extractCityLabel(fallbackLocation) || "Remote";
}

function mapPublicOpportunity(raw: Record<string, unknown>): ExploreProject {
    let displayLocation = "Remote / Pakistan";
    let locationPin: string | null = null;
    const loc = raw.location;
    if (typeof loc === "object" && loc !== null) {
        const l = loc as Record<string, unknown>;
        const parts: string[] = [];
        if (typeof l.city === "string") parts.push(l.city);
        if (typeof l.venue === "string") parts.push(l.venue);
        if (typeof l.pin === "string" && l.pin.trim()) locationPin = l.pin.trim();
        displayLocation =
            parts.length > 0
                ? parts.join(", ")
                : typeof l.pin === "string" && l.pin.trim()
                  ? l.pin
                  : "Pakistan";
    } else if (typeof loc === "string" && loc.trim()) {
        displayLocation = loc;
    }

    const opportunityTypes = pickOpportunityTypes(raw);
    const sdgLabel = buildSdgFilterLabel(raw);
    const sdgIdRaw =
        (asRecord(raw.sdg_info)?.sdg_id as unknown) ?? raw.sdg;
    const sdg = findSdgById(sdgIdRaw as string | number | undefined);
    const sdgIds = Array.isArray(raw.sdg_ids)
        ? raw.sdg_ids.map((id) => String(id))
        : [sdgIdRaw].filter((id) => id != null && String(id).trim()).map((id) => String(id));
    const path_key = classifyBrowsePath(opportunityTypes.length ? opportunityTypes : raw.types, raw.path_key);
    const org =
        str(raw.partner_name) ||
        str(raw.organization_name) ||
        str(asRecord(raw.organization)?.name) ||
        "Verified Partner";
    const seatsRemaining = computeSeatsRemaining(raw);
    const hoursRaw = Number(raw.hours);
    const timeline = asRecord(raw.timeline);
    const start_date = str(raw.start_date) || str(timeline?.start_date) || null;
    const end_date =
        str(raw.end_date) || str(timeline?.end_date) || str(timeline?.application_deadline) || null;
    const remainingForFull = typeof seatsRemaining === "number" ? seatsRemaining : null;
    const volunteersNeeded = Number(raw.volunteersNeeded ?? timeline?.volunteers_required);
    const hasSeatCap = Number.isFinite(volunteersNeeded) && volunteersNeeded > 0;

    return {
        id: String(raw.id ?? ""),
        title: String(raw.title ?? ""),
        description: String(raw.description ?? ""),
        status: String(raw.status || "Active"),
        org,
        city: pickCity(raw, displayLocation),
        location: displayLocation,
        locationPin,
        universityLabel: pickUniversityLabel(raw),
        modeBucket: normalizeModeBucket(raw.mode),
        visibilityBucket: pickVisibilityBucket(raw),
        opportunityTypes,
        sdgLabel,
        sdgNumber: sdg?.number ?? null,
        sdgTitle: sdg?.title ?? null,
        sdg_ids: sdgIds,
        seatsRemaining,
        hours: Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : null,
        start_date,
        end_date,
        createdAt: str(raw.created_at || raw.createdAt) || undefined,
        department: str(raw.department) || null,
        partner_name: str(raw.partner_name) || org,
        path_key,
        path_label: str(raw.path_label) || BROWSE_PATH_BY_KEY[path_key].shortLabel,
        cover_url: str(raw.cover_url) || null,
        is_full:
            typeof raw.is_full === "boolean"
                ? raw.is_full
                : Boolean(hasSeatCap && remainingForFull != null && remainingForFull <= 0),
        is_virtual:
            typeof raw.is_virtual === "boolean" ? raw.is_virtual : normalizeModeBucket(raw.mode) === "remote",
        is_urgent:
            typeof raw.is_urgent === "boolean" ? raw.is_urgent : isUrgentBrowseDeadline(end_date),
        created_by_role: classifyBrowseCreator(raw),
        faculty_verified: raw.faculty_verified === true,
        execution_verified: raw.execution_verified === true,
        admin_approved: raw.admin_approved === true,
        participant_count: Number(raw.participant_count) || 0,
        applicationsOpen: applicationsOpenFromPayload(raw),
        applyBlockedReason: str(raw.apply_blocked_reason) || null,
        adminExpired: raw.admin_expired === true,
    };
}

function computeExploreStats(rows: ExploreProject[]): ExploreStats {
    const partners = new Set<string>();
    let studentsImpacted = 0;
    let verified = 0;
    for (const row of rows) {
        if (row.org && row.org.toLowerCase() !== "unknown") partners.add(row.org);
        if (row.participant_count > 0) studentsImpacted += row.participant_count;
        if (row.faculty_verified || row.execution_verified || row.admin_approved) verified += 1;
    }
    return {
        total: rows.length,
        verified: verified || rows.length,
        partners: partners.size,
        students_impacted: studentsImpacted,
    };
}

function computePathCounts(rows: ExploreProject[]): PathCounts {
    const counts: PathCounts = { ...EMPTY_PATH_COUNTS, all: rows.length };
    for (const row of rows) counts[row.path_key] += 1;
    return counts;
}

const filterSelectClass =
    "h-10 w-full min-w-0 appearance-none rounded-xl border border-[#e4eeec] bg-white px-3 pr-8 text-sm text-[#16313d] transition-colors hover:border-slate-300 focus:border-[#0e7d74] focus:outline-none focus:ring-2 focus:ring-[#0e7d74]/20";

export default function ProjectsPage() {
    const [projects, setProjects] = useState<ExploreProject[]>([]);
    const [apiStats, setApiStats] = useState<ExploreStats | null>(null);
    const [apiPathCounts, setApiPathCounts] = useState<PathCounts | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [universityFilter, setUniversityFilter] = useState("all");
    const [modeFilter, setModeFilter] = useState<"all" | ModeBucket>("all");
    const [sdgFilter, setSdgFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");
    const [pathTab, setPathTab] = useState<"all" | BrowsePathKey>("all");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [partnerFilter, setPartnerFilter] = useState("all");
    const [timeCommitment, setTimeCommitment] = useState<"all" | "8" | "16" | "17">("all");
    const [creatorFilter, setCreatorFilter] = useState<"all" | ExploreCreator>("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [onlyOpenSeats, setOnlyOpenSeats] = useState(false);
    const [virtualOnly, setVirtualOnly] = useState(false);
    const [urgentOnly, setUrgentOnly] = useState(false);
    const [sortNewest, setSortNewest] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [promoOpen, setPromoOpen] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [reloadNonce, setReloadNonce] = useState(0);
    const [applyBanner, setApplyBanner] = useState<string | null>(null);
    const resultsRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const fetchProjects = async () => {
            setIsLoading(true);
            setFetchError(false);
            try {
                const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "").replace(/\/$/, "");
                if (!backendUrl) {
                    console.error("NEXT_PUBLIC_BACKEND_BASE_URL is not set");
                    setProjects([]);
                    setFetchError(true);
                    return;
                }
                const url = `${backendUrl}/public/opportunities`;
                const response = await fetch(url, { cache: "no-store" });
                if (!response.ok) {
                    console.error("GET /public/opportunities failed:", response.status, response.statusText);
                    setProjects([]);
                    setFetchError(true);
                    return;
                }
                const rawText = await response.text();
                let data: Record<string, unknown>;
                try {
                    data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
                } catch {
                    console.error("Invalid JSON from /public/opportunities");
                    setProjects([]);
                    setFetchError(true);
                    return;
                }

                const maintenance = asRecord(data.apply_maintenance);
                setApplyBanner(
                    maintenance?.enabled === true && typeof maintenance.message === "string" && maintenance.message.trim()
                        ? maintenance.message.trim()
                        : null,
                );
                const list: Record<string, unknown>[] = Array.isArray(data.data)
                    ? (data.data as Record<string, unknown>[])
                    : Array.isArray(data.opportunities)
                      ? (data.opportunities as Record<string, unknown>[])
                      : [];

                const shouldLoad =
                    Array.isArray(list) &&
                    (data.success === true || (data.success !== false && (Array.isArray(data.data) || list.length > 0)));

                if (shouldLoad) {
                    const mapped = list.filter((row) => str(row.id)).map(mapPublicOpportunity);
                    setProjects(mapped);
                    const stats = asRecord(data.stats);
                    if (stats) {
                        setApiStats({
                            total: Number(stats.total) || mapped.length,
                            verified: Number(stats.verified) || mapped.length,
                            partners: Number(stats.partners) || 0,
                            students_impacted: Number(stats.students_impacted) || 0,
                        });
                    } else {
                        setApiStats(null);
                    }
                    const counts = asRecord(data.path_counts);
                    if (counts) {
                        setApiPathCounts({
                            all: Number(counts.all) || mapped.length,
                            community_service: Number(counts.community_service) || 0,
                            coursework: Number(counts.coursework) || 0,
                            fyp: Number(counts.fyp) || 0,
                            startup: Number(counts.startup) || 0,
                        });
                    } else {
                        setApiPathCounts(null);
                    }
                } else {
                    setProjects([]);
                    setFetchError(true);
                }
            } catch (err) {
                console.error("Failed to fetch projects:", err);
                setProjects([]);
                setFetchError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, [reloadNonce]);

    const universityOptions = useMemo(() => {
        return Array.from(new Set(projects.map((p) => p.universityLabel).filter(Boolean))).sort((a, b) =>
            a.localeCompare(b),
        );
    }, [projects]);

    const sdgOptions = useMemo(() => {
        return Array.from(new Set(projects.map((p) => p.sdgLabel).filter((s) => s && s !== "Unspecified SDG"))).sort(
            (a, b) => a.localeCompare(b),
        );
    }, [projects]);

    const locationOptions = useMemo(() => {
        return Array.from(new Set(projects.map((p) => p.city || "Remote"))).sort((a, b) => a.localeCompare(b));
    }, [projects]);

    const departmentOptions = useMemo(() => {
        return Array.from(new Set(projects.map((p) => p.department).filter((d): d is string => Boolean(d)))).sort(
            (a, b) => a.localeCompare(b),
        );
    }, [projects]);

    const partnerOptions = useMemo(() => {
        return Array.from(new Set(projects.map((p) => p.partner_name || p.org).filter(Boolean))).sort((a, b) =>
            a.localeCompare(b),
        );
    }, [projects]);

    const liveStats = useMemo(() => apiStats || computeExploreStats(projects), [apiStats, projects]);
    const pathCounts = useMemo(() => apiPathCounts || computePathCounts(projects), [apiPathCounts, projects]);

    const partnerHighlights = useMemo(() => {
        const map = new Map<string, number>();
        projects.forEach((p) => {
            const org = p.org || "Verified Partner";
            map.set(org, (map.get(org) || 0) + 1);
        });
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
    }, [projects]);

    const resetFilters = () => {
        setSearchQuery("");
        setUniversityFilter("all");
        setModeFilter("all");
        setSdgFilter("all");
        setLocationFilter("all");
        setPathTab("all");
        setDepartmentFilter("all");
        setPartnerFilter("all");
        setTimeCommitment("all");
        setCreatorFilter("all");
        setDateFrom("");
        setDateTo("");
        setOnlyOpenSeats(false);
        setVirtualOnly(false);
        setUrgentOnly(false);
        setSortNewest(true);
    };

    const filteredProjects = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();
        return projects
            .filter((project) => {
                // Defense-in-depth: the backend already excludes admin_hidden rows from this
                // endpoint, but never render one as a normal "Open" card if it ever slips through.
                if (project.applyBlockedReason === "opportunity_hidden") return false;
                if (pathTab !== "all" && project.path_key !== pathTab) return false;
                if (needle) {
                    const hay = [
                        project.title,
                        project.description,
                        project.org,
                        project.partner_name,
                        project.universityLabel,
                        project.sdgLabel,
                        project.department,
                        project.city,
                        project.opportunityTypes.join(" "),
                        project.sdg_ids.join(" "),
                    ]
                        .join(" ")
                        .toLowerCase();
                    if (!hay.includes(needle)) return false;
                }
                if (universityFilter !== "all" && project.universityLabel !== universityFilter) return false;
                if (modeFilter !== "all" && project.modeBucket !== modeFilter) return false;
                if (sdgFilter !== "all" && project.sdgLabel !== sdgFilter) return false;
                if (locationFilter !== "all" && project.city !== locationFilter) return false;
                if (departmentFilter !== "all" && project.department !== departmentFilter) return false;
                if (partnerFilter !== "all" && (project.partner_name || project.org) !== partnerFilter) return false;
                if (creatorFilter !== "all" && project.created_by_role !== creatorFilter) return false;
                if (timeCommitment !== "all") {
                    const hours = project.hours;
                    if (hours == null) return false;
                    if (timeCommitment === "8" && hours > 8) return false;
                    if (timeCommitment === "16" && (hours <= 8 || hours > 16)) return false;
                    if (timeCommitment === "17" && hours <= 16) return false;
                }
                if (dateFrom && project.end_date && String(project.end_date).slice(0, 10) < dateFrom) return false;
                if (dateTo && (project.start_date || project.end_date) && String(project.start_date || project.end_date).slice(0, 10) > dateTo) {
                    return false;
                }
                if (onlyOpenSeats && (project.is_full || (project.seatsRemaining != null && project.seatsRemaining <= 0))) {
                    return false;
                }
                if (virtualOnly && !project.is_virtual) return false;
                if (urgentOnly && !project.is_urgent) return false;
                return true;
            })
            .sort((a, b) => {
                const ta = new Date(a.createdAt || a.start_date || 0).getTime();
                const tb = new Date(b.createdAt || b.start_date || 0).getTime();
                const na = Number.isFinite(ta) ? ta : 0;
                const nb = Number.isFinite(tb) ? tb : 0;
                return sortNewest ? nb - na : na - nb;
            });
    }, [
        projects,
        pathTab,
        searchQuery,
        universityFilter,
        modeFilter,
        sdgFilter,
        locationFilter,
        departmentFilter,
        partnerFilter,
        creatorFilter,
        timeCommitment,
        dateFrom,
        dateTo,
        onlyOpenSeats,
        virtualOnly,
        urgentOnly,
        sortNewest,
    ]);

    const filteredPathCounts = useMemo(() => computePathCounts(filteredProjects), [filteredProjects]);

    const mapPoints = useMemo(
        () =>
            buildOpportunityMapPoints(
                filteredProjects.map((p) => ({
                    id: p.id,
                    title: p.title,
                    org: p.org,
                    location: p.location,
                    modeBucket: p.modeBucket,
                    status: p.status,
                    locationPin: p.locationPin,
                })),
                statusDisplayLabel,
            ),
        [filteredProjects],
    );

    const activeFilterCount =
        [
            universityFilter,
            modeFilter,
            sdgFilter,
            locationFilter,
            departmentFilter,
            partnerFilter,
            timeCommitment,
            creatorFilter,
        ].filter((v) => v !== "all").length +
        (searchQuery.trim() ? 1 : 0) +
        (pathTab !== "all" ? 1 : 0) +
        (onlyOpenSeats ? 1 : 0) +
        (virtualOnly ? 1 : 0) +
        (urgentOnly ? 1 : 0) +
        (dateFrom || dateTo ? 1 : 0);

    const scrollToResults = () => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const pathIcon = (key: BrowsePathKey) => {
        if (key === "coursework") return Leaf;
        if (key === "startup") return Lightbulb;
        if (key === "fyp") return Search;
        return Users;
    };

    return (
        <main className="min-h-screen bg-[#f7f8f4] font-sans">
            <Navbar />

            <section className="relative overflow-hidden border-b border-slate-200/80 bg-[#f7f8f4] pt-28 pb-8">
                <div className="relative z-10 mx-auto max-w-7xl px-6">
                    <div className="mx-auto max-w-3xl text-center">
                        <h1 className="font-serif text-4xl font-bold tracking-tight text-[#16313d] sm:text-5xl">
                            Explore Opportunities
                        </h1>
                        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                            Discover meaningful community impact opportunities. Gain real-world experience,
                            develop new skills, and contribute to a more sustainable and inclusive future.
                        </p>
                    </div>

                    <form
                        className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row"
                        onSubmit={(e) => {
                            e.preventDefault();
                            scrollToResults();
                        }}
                    >
                        <div className="relative min-w-0 flex-1">
                            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                placeholder="Search by title, partner, skills, SDGs, or keywords..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-12 w-full rounded-full border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-[#0F8F83] focus:ring-4 focus:ring-[#0F8F83]/15"
                            />
                        </div>
                        <button
                            type="submit"
                            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[#174b43] px-8 text-sm font-bold text-white shadow-md transition hover:bg-[#123c36]"
                        >
                            Search
                        </button>
                    </form>

                    {promoOpen ? (
                        <div className="relative mx-auto mt-6 max-w-5xl rounded-2xl border border-amber-200 bg-[#fff8e8] px-5 py-4 text-left">
                            <button
                                type="button"
                                aria-label="Dismiss"
                                className="absolute right-3 top-3 text-amber-700/70 hover:text-amber-900"
                                onClick={() => setPromoOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <p className="pr-6 text-sm font-bold text-amber-950">
                                Make a difference with real opportunities
                            </p>
                            <p className="mt-1 pr-6 text-sm text-amber-900/90">
                                Explore community service, sustainability projects, research opportunities and startup
                                initiatives from our trusted partners.
                            </p>
                        </div>
                    ) : null}

                    {applyBanner ? (
                        <div className="mx-auto mt-4 max-w-5xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                            <p className="font-semibold">Applications temporarily paused</p>
                            <p className="mt-1 text-amber-900/90">{applyBanner}</p>
                        </div>
                    ) : null}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: "Total Opportunities", value: liveStats.total, icon: Boxes, tint: "bg-emerald-50 text-emerald-700" },
                        { label: "Verified Opportunities", value: liveStats.verified, icon: CheckCircle2, tint: "bg-sky-50 text-sky-700" },
                        { label: "Partner Organizations", value: liveStats.partners, icon: Users, tint: "bg-teal-50 text-teal-700" },
                        { label: "Student Impacted", value: liveStats.students_impacted, icon: BarChart3, tint: "bg-lime-50 text-lime-700" },
                    ].map(({ label, value, icon: Icon, tint }) => (
                        <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                            <div className={clsx("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", tint)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black tabular-nums text-slate-900">{formatStat(value)}</p>
                                <p className="text-xs font-semibold text-slate-500">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 pb-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {BROWSE_PATHS.map((path) => {
                        const Icon = pathIcon(path.key);
                        const active = pathTab === path.key;
                        return (
                            <button
                                key={path.key}
                                type="button"
                                onClick={() => setPathTab(active ? "all" : path.key)}
                                className="flex items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left shadow-sm transition"
                                style={
                                    active
                                        ? { borderColor: path.accent, boxShadow: `0 0 0 1px ${path.accent}` }
                                        : { borderColor: "#e4eeec" }
                                }
                            >
                                <span
                                    className="mt-0.5 grid h-10 w-10 place-items-center rounded-xl"
                                    style={{ background: path.accentSoft, color: path.accentText }}
                                >
                                    <Icon className="h-5 w-5" />
                                </span>
                                <span>
                                    <span className="block text-[15px] font-bold leading-tight" style={{ color: path.accentText }}>
                                        {path.label}
                                    </span>
                                    <span className="mt-0.5 block text-[12px] text-[#6b7c86]">{path.tagline}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 pb-10">
                <div className="rounded-2xl border border-[#e4eeec] bg-white p-4 shadow-[0_8px_24px_rgba(15,42,48,.04)]" aria-label="Filters">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="inline-flex items-center gap-2 text-[15px] font-bold text-[#16313d]">
                            <Filter className="h-4 w-4 text-[#0e7d74]" />
                            Advanced Filters
                            {activeFilterCount > 0 ? (
                                <span className="rounded-full bg-[#e8f8f1] px-2 py-0.5 text-[11px] font-black text-[#0f6b4a]">
                                    {activeFilterCount}
                                </span>
                            ) : null}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((open) => !open)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#e4eeec] px-3 py-1.5 text-[12px] font-semibold text-[#5d7278] hover:bg-slate-50"
                        >
                            {filtersOpen ? "Hide Filters" : "Show Filters"}
                            <ChevronDown className={`h-3.5 w-3.5 transition ${filtersOpen ? "rotate-180" : ""}`} />
                        </button>
                    </div>

                    {filtersOpen ? (
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                <label className="block text-[11px] font-bold text-[#5d7278]">
                                    Keyword Search
                                    <span className="relative mt-1 block">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                        <input
                                            type="search"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by title, partner, skills…"
                                            className="h-10 w-full rounded-xl border border-[#e4eeec] bg-white pl-9 pr-3 text-sm text-[#16313d] placeholder:text-[#8aa0a6] focus:border-[#0e7d74] focus:outline-none"
                                        />
                                    </span>
                                </label>
                                <label className="block text-[11px] font-bold text-[#5d7278]">
                                    SDG(s)
                                    <span className="relative mt-1 block">
                                        <select value={sdgFilter} onChange={(e) => setSdgFilter(e.target.value)} className={filterSelectClass}>
                                            <option value="all">Select SDGs</option>
                                            {sdgOptions.map((sdg) => (
                                                <option key={sdg} value={sdg}>
                                                    {sdg}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                    </span>
                                </label>
                                <label className="block text-[11px] font-bold text-[#5d7278]">
                                    Location
                                    <span className="relative mt-1 block">
                                        <select
                                            value={locationFilter}
                                            onChange={(e) => setLocationFilter(e.target.value)}
                                            className={filterSelectClass}
                                        >
                                            <option value="all">All Locations</option>
                                            {locationOptions.map((loc) => (
                                                <option key={loc} value={loc}>
                                                    {loc}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                    </span>
                                </label>
                                <label className="block text-[11px] font-bold text-[#5d7278]">
                                    Mode
                                    <span className="relative mt-1 block">
                                        <select
                                            value={modeFilter}
                                            onChange={(e) => setModeFilter(e.target.value as "all" | ModeBucket)}
                                            className={filterSelectClass}
                                        >
                                            <option value="all">All Modes</option>
                                            {(["on-site", "hybrid", "remote"] as const).map((b) => (
                                                <option key={b} value={b}>
                                                    {modeMenuLabel(b)}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                    </span>
                                </label>
                                <label className="block text-[11px] font-bold text-[#5d7278]">
                                    Department
                                    <span className="relative mt-1 block">
                                        <select
                                            value={departmentFilter}
                                            onChange={(e) => setDepartmentFilter(e.target.value)}
                                            className={filterSelectClass}
                                        >
                                            <option value="all">All Departments</option>
                                            {departmentOptions.map((d) => (
                                                <option key={d} value={d}>
                                                    {d}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                    </span>
                                </label>
                                <label className="block text-[11px] font-bold text-[#5d7278]">
                                    University
                                    <span className="relative mt-1 block">
                                        <select
                                            value={universityFilter}
                                            onChange={(e) => setUniversityFilter(e.target.value)}
                                            className={filterSelectClass}
                                        >
                                            <option value="all">All Universities</option>
                                            {universityOptions.map((u) => (
                                                <option key={u} value={u}>
                                                    {u}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                    </span>
                                </label>
                                <label className="block text-[11px] font-bold text-[#5d7278]">
                                    Partner / NGO
                                    <span className="relative mt-1 block">
                                        <select
                                            value={partnerFilter}
                                            onChange={(e) => setPartnerFilter(e.target.value)}
                                            className={filterSelectClass}
                                        >
                                            <option value="all">All Partners</option>
                                            {partnerOptions.map((p) => (
                                                <option key={p} value={p}>
                                                    {p}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                    </span>
                                </label>
                                <label className="block text-[11px] font-bold text-[#5d7278]">
                                    Time Commitment
                                    <span className="relative mt-1 block">
                                        <select
                                            value={timeCommitment}
                                            onChange={(e) => setTimeCommitment(e.target.value as "all" | "8" | "16" | "17")}
                                            className={filterSelectClass}
                                        >
                                            <option value="all">Any Hours</option>
                                            <option value="8">Up to 8 hrs</option>
                                            <option value="16">9–16 hrs</option>
                                            <option value="17">17+ hrs</option>
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                    </span>
                                </label>
                                <label className="block text-[11px] font-bold text-[#5d7278] xl:col-span-2">
                                    Date Range
                                    <span className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="h-10 rounded-xl border border-[#e4eeec] px-2 text-sm text-[#16313d]"
                                        />
                                        <span className="text-[#8aa0a6]">→</span>
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="h-10 rounded-xl border border-[#e4eeec] px-2 text-sm text-[#16313d]"
                                        />
                                    </span>
                                </label>
                            </div>

                            <div className="grid gap-3 border-t border-[#eef4f3] pt-3 lg:grid-cols-[1fr_1.2fr_auto] lg:items-end">
                                <div>
                                    <p className="text-[11px] font-bold text-[#5d7278]">Created By</p>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-[#16313d]">
                                        <label className="inline-flex items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={creatorFilter === "all"}
                                                onChange={() => setCreatorFilter("all")}
                                                className="h-4 w-4 rounded border-[#cfe3de] text-[#0e7d74] focus:ring-[#0e7d74]"
                                            />
                                            All
                                        </label>
                                        {([
                                            ["student", "Student"],
                                            ["faculty", "Faculty"],
                                            ["partner", "Partner / NGO"],
                                            ["admin", "Admin"],
                                        ] as const).map(([value, label]) => (
                                            <label key={value} className="inline-flex items-center gap-1.5">
                                                <input
                                                    type="checkbox"
                                                    checked={creatorFilter === value}
                                                    onChange={() => setCreatorFilter(creatorFilter === value ? "all" : value)}
                                                    className="h-4 w-4 rounded border-[#cfe3de] text-[#0e7d74] focus:ring-[#0e7d74]"
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#5d7278]">Special Filters</p>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-[#16313d]">
                                        <label className="inline-flex items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={onlyOpenSeats}
                                                onChange={(e) => setOnlyOpenSeats(e.target.checked)}
                                                className="h-4 w-4 rounded border-[#cfe3de] text-[#0e7d74] focus:ring-[#0e7d74]"
                                            />
                                            With Available Seats Only
                                        </label>
                                        <label className="inline-flex items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={virtualOnly}
                                                onChange={(e) => setVirtualOnly(e.target.checked)}
                                                className="h-4 w-4 rounded border-[#cfe3de] text-[#0e7d74] focus:ring-[#0e7d74]"
                                            />
                                            Virtual Opportunities
                                        </label>
                                        <label className="inline-flex items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={urgentOnly}
                                                onChange={(e) => setUrgentOnly(e.target.checked)}
                                                className="h-4 w-4 rounded border-[#cfe3de] text-[#0e7d74] focus:ring-[#0e7d74]"
                                            />
                                            Urgent Opportunities
                                        </label>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="rounded-full border border-[#e4eeec] px-4 py-2 text-[13px] font-semibold text-[#5d7278] hover:bg-slate-50"
                                    >
                                        Clear All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={scrollToResults}
                                        className="rounded-full bg-[#174b43] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#123c36]"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div ref={resultsRef} className="mt-6 flex flex-col gap-3 scroll-mt-28 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-black text-[#16313d]">
                            {filteredProjects.length} {filteredProjects.length === 1 ? "Opportunity Found" : "Opportunities Found"}
                        </p>
                        <button
                            type="button"
                            onClick={() => setPathTab("all")}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                                pathTab === "all" ? "bg-[#16313d] text-white" : "bg-[#edf2f3] text-[#29454f]"
                            }`}
                        >
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
                            <select
                                value={sortNewest ? "newest" : "oldest"}
                                onChange={(e) => setSortNewest(e.target.value === "newest")}
                                className={`${filterSelectClass} min-w-[9rem]`}
                                title="Sort"
                            >
                                <option value="newest">Most Recent</option>
                                <option value="oldest">Oldest first</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                        </div>
                        <div className="flex rounded-xl border border-[#e4eeec] p-0.5">
                            <button
                                type="button"
                                onClick={() => setViewMode("grid")}
                                className={`rounded-lg p-1.5 ${viewMode === "grid" ? "bg-slate-100 text-[#16313d]" : "text-[#8aa0a6]"}`}
                                title="Grid view"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("list")}
                                className={`rounded-lg p-1.5 ${viewMode === "list" ? "bg-slate-100 text-[#16313d]" : "text-[#8aa0a6]"}`}
                                title="List view"
                            >
                                <List className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("map")}
                                className={`rounded-lg p-1.5 ${viewMode === "map" ? "bg-slate-100 text-[#16313d]" : "text-[#8aa0a6]"}`}
                                title="Map view"
                            >
                                <MapIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 min-w-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-slate-400">
                            <Loader2 className="h-10 w-10 animate-spin text-[#0F8F83]" />
                            <p className="text-sm font-bold uppercase tracking-widest">Loading opportunities…</p>
                        </div>
                    ) : fetchError ? (
                        <div className="rounded-2xl border border-dashed border-red-200 bg-white px-6 py-20 text-center">
                            <p className="font-semibold text-slate-700">
                                Something went wrong loading opportunities — please try again.
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                This is a connection problem on our side, not an empty search.
                            </p>
                            <button
                                type="button"
                                onClick={() => setReloadNonce((n) => n + 1)}
                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0F8F83] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0d7a70]"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
                            <p className="font-semibold text-slate-700">No opportunities match your filters.</p>
                            <p className="mt-2 text-sm text-slate-500">Try another path or clear filters to see more results.</p>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0F8F83] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0d7a70]"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : viewMode === "map" ? (
                        <OpportunitiesMapView points={mapPoints} />
                    ) : (
                        <div
                            className={
                                viewMode === "grid"
                                    ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                                    : "space-y-4"
                            }
                        >
                            {filteredProjects.map((project) => {
                                const hoursLabel = `${project.hours ?? 0} hrs`;
                                const seatsLeft = project.seatsRemaining ?? 0;
                                return (
                                    <BrowseOpportunityCard
                                        key={project.id}
                                        id={project.id}
                                        title={project.title}
                                        description={
                                            project.description && project.description !== "No description"
                                                ? project.description
                                                : undefined
                                        }
                                        pathKey={project.path_key}
                                        pathLabel={project.path_label}
                                        organizationName={project.partner_name || project.org}
                                        city={project.city}
                                        modeLabel={
                                            project.modeBucket !== "unspecified"
                                                ? modeMenuLabel(project.modeBucket)
                                                : "On-site"
                                        }
                                        hoursLabel={hoursLabel}
                                        seatsLabel={`${seatsLeft} seats`}
                                        deadline={project.end_date}
                                        coverUrl={project.cover_url}
                                        isFull={project.is_full}
                                        isExpired={listingIsExpiredFromPayload({
                                            admin_expired: project.adminExpired,
                                            apply_blocked_reason: project.applyBlockedReason,
                                            applications_open: project.applicationsOpen,
                                        })}
                                        sdgs={sdgsForBrowseCard(project.sdg_ids, project.sdgNumber, project.sdgTitle)}
                                        visibilityTag={
                                            project.visibilityBucket === "open"
                                                ? "Open to all"
                                                : project.universityLabel || null
                                        }
                                        visibilityWarn={project.visibilityBucket === "restricted"}
                                        appliedPending={false}
                                        appliedRejected={false}
                                        showTeam={false}
                                        showWithdraw={false}
                                        withdrawing={false}
                                        canApplyNow={false}
                                        showJoin={false}
                                        joinButtonLabel="Join Opportunity"
                                        detailsHref={`/projects/${project.id}`}
                                        viewMode={viewMode}
                                        onShare={() => void copyPublicProjectShareLink(project.id)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {!isLoading && partnerHighlights.length > 0 ? (
                <section className="border-t border-slate-200 bg-white py-12">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="mb-6 flex items-end justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">Browse by Partner</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Organizations currently hosting opportunities on CIEL PK.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {partnerHighlights.map(([org, count]) => (
                                <button
                                    key={org}
                                    type="button"
                                    onClick={() => {
                                        setPartnerFilter(org);
                                        setSearchQuery("");
                                        scrollToResults();
                                    }}
                                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-[#f4f7f6] p-4 text-left transition hover:border-[#0F8F83]/40 hover:bg-white hover:shadow-sm"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0F8F83]/10 text-lg font-black text-[#065f46]">
                                        {org.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-bold text-slate-900">{org}</p>
                                        <p className="text-xs font-semibold text-slate-500">
                                            {count} active {count === 1 ? "project" : "projects"}
                                        </p>
                                    </div>
                                    <Clock className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            ) : null}

            <PartnersFooter />
            <FooterBanner />
            <Footer />
        </main>
    );
}
