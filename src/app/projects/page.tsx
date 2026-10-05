"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LayoutGrid, List, Loader2, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import PartnersFooter from "@/components/PartnersFooter";
import FooterBanner from "@/components/FooterBanner";
import Footer from "@/components/Footer";
import { sdgsForBrowseCard } from "@/app/dashboard/student/browse/BrowseOpportunityCard";
import MarketplaceOpportunityCard from "@/components/opportunities/MarketplaceOpportunityCard";
import { PaginationControls } from "@/components/ui/PaginationControls";
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
import { applicationsOpenFromPayload } from "@/utils/studentApplyMaintenance";
import {
    BROWSE_PATH_BY_KEY,
    classifyBrowseCreator,
    classifyBrowsePath,
    isUrgentBrowseDeadline,
    type BrowsePathKey,
} from "@/utils/browseOpportunityPath";
import {
    classifyMarketplaceStatus,
    marketplaceDurationDays,
    marketplaceStatusLabel,
    type MarketplaceStatus,
} from "@/utils/marketplaceListingStatus";

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

const PAGE_SIZE = 12;

const filterSelectClass =
    "h-10 w-full min-w-0 appearance-none rounded-xl border border-[#e4eeec] bg-white px-3 pr-8 text-sm text-[#16313d] transition-colors hover:border-slate-300 focus:border-[#0e7d74] focus:outline-none focus:ring-2 focus:ring-[#0e7d74]/20";

function extractCityLabel(location?: string): string {
    if (!location) return "Pakistan";
    const first = location.split(",")[0]?.trim();
    return first || location;
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

function listingOf(project: ExploreProject) {
    return {
        start_date: project.start_date,
        end_date: project.end_date,
        adminExpired: project.adminExpired,
        applicationsOpen: project.applicationsOpen,
        applyBlockedReason: project.applyBlockedReason,
    };
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
    const sdgIdRaw = (asRecord(raw.sdg_info)?.sdg_id as unknown) ?? raw.sdg;
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
    const end_date = str(raw.end_date) || str(timeline?.end_date) || str(timeline?.application_deadline) || null;
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
        is_virtual: typeof raw.is_virtual === "boolean" ? raw.is_virtual : normalizeModeBucket(raw.mode) === "remote",
        is_urgent: typeof raw.is_urgent === "boolean" ? raw.is_urgent : isUrgentBrowseDeadline(end_date),
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

export default function ProjectsPage() {
    const [projects, setProjects] = useState<ExploreProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [universityFilter, setUniversityFilter] = useState("all");
    const [modeFilter, setModeFilter] = useState<"all" | ModeBucket>("all");
    const [sdgFilter, setSdgFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [partnerFilter, setPartnerFilter] = useState("all");
    const [timeCommitment, setTimeCommitment] = useState<"all" | "8" | "16" | "17">("all");
    const [seatsFilter, setSeatsFilter] = useState<"all" | "open">("all");
    const [startDateFilter, setStartDateFilter] = useState("");
    const [durationFilter, setDurationFilter] = useState<"all" | "week" | "month" | "long">("all");
    const [applicationType, setApplicationType] = useState<"all" | "open" | "restricted">("all");
    const [statusFilter, setStatusFilter] = useState<MarketplaceStatus | "all">("all");
    const [sortNewest, setSortNewest] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [page, setPage] = useState(1);
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
                    setProjects(list.filter((row) => str(row.id)).map(mapPublicOpportunity));
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

    const visibleCatalog = useMemo(
        () => projects.filter((project) => project.applyBlockedReason !== "opportunity_hidden"),
        [projects],
    );

    const statusCounts = useMemo(() => {
        const counts = { live: 0, closing: 0, upcoming: 0, expired: 0, total: visibleCatalog.length };
        for (const project of visibleCatalog) counts[classifyMarketplaceStatus(listingOf(project))] += 1;
        return counts;
    }, [visibleCatalog]);

    const universityOptions = useMemo(
        () => Array.from(new Set(visibleCatalog.map((p) => p.universityLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        [visibleCatalog],
    );
    const sdgOptions = useMemo(
        () => Array.from(new Set(visibleCatalog.map((p) => p.sdgLabel).filter((s) => s && s !== "Unspecified SDG"))).sort((a, b) => a.localeCompare(b)),
        [visibleCatalog],
    );
    const locationOptions = useMemo(
        () => Array.from(new Set(visibleCatalog.map((p) => p.city || "Remote"))).sort((a, b) => a.localeCompare(b)),
        [visibleCatalog],
    );
    const partnerOptions = useMemo(
        () => Array.from(new Set(visibleCatalog.map((p) => p.partner_name || p.org).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        [visibleCatalog],
    );
    const typeOptions = useMemo(
        () => Array.from(new Set(visibleCatalog.flatMap((p) => p.opportunityTypes).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        [visibleCatalog],
    );

    const resetFilters = () => {
        setSearchQuery("");
        setUniversityFilter("all");
        setModeFilter("all");
        setSdgFilter("all");
        setLocationFilter("all");
        setTypeFilter("all");
        setPartnerFilter("all");
        setTimeCommitment("all");
        setSeatsFilter("all");
        setStartDateFilter("");
        setDurationFilter("all");
        setApplicationType("all");
        setStatusFilter("all");
        setSortNewest(true);
        setPage(1);
    };

    const filteredProjects = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();
        return visibleCatalog
            .filter((project) => {
                if (statusFilter !== "all" && classifyMarketplaceStatus(listingOf(project)) !== statusFilter) return false;
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
                    ]
                        .join(" ")
                        .toLowerCase();
                    if (!hay.includes(needle)) return false;
                }
                if (universityFilter !== "all" && project.universityLabel !== universityFilter) return false;
                if (modeFilter !== "all" && project.modeBucket !== modeFilter) return false;
                if (sdgFilter !== "all" && project.sdgLabel !== sdgFilter) return false;
                if (locationFilter !== "all" && project.city !== locationFilter) return false;
                if (typeFilter !== "all" && !project.opportunityTypes.includes(typeFilter)) return false;
                if (partnerFilter !== "all" && (project.partner_name || project.org) !== partnerFilter) return false;
                if (applicationType !== "all" && project.visibilityBucket !== applicationType) return false;
                if (timeCommitment !== "all") {
                    const hours = project.hours;
                    if (hours == null) return false;
                    if (timeCommitment === "8" && hours > 8) return false;
                    if (timeCommitment === "16" && (hours <= 8 || hours > 16)) return false;
                    if (timeCommitment === "17" && hours <= 16) return false;
                }
                if (startDateFilter && project.start_date && String(project.start_date).slice(0, 10) < startDateFilter) {
                    return false;
                }
                if (durationFilter !== "all") {
                    const days = marketplaceDurationDays(project.start_date, project.end_date);
                    if (days == null) return false;
                    if (durationFilter === "week" && days > 7) return false;
                    if (durationFilter === "month" && (days <= 7 || days > 31)) return false;
                    if (durationFilter === "long" && days <= 31) return false;
                }
                if (seatsFilter === "open" && (project.is_full || (project.seatsRemaining != null && project.seatsRemaining <= 0))) {
                    return false;
                }
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
        visibleCatalog,
        statusFilter,
        searchQuery,
        universityFilter,
        modeFilter,
        sdgFilter,
        locationFilter,
        typeFilter,
        partnerFilter,
        applicationType,
        timeCommitment,
        startDateFilter,
        durationFilter,
        seatsFilter,
        sortNewest,
    ]);

    useEffect(() => {
        setPage(1);
    }, [
        statusFilter,
        searchQuery,
        universityFilter,
        modeFilter,
        sdgFilter,
        locationFilter,
        typeFilter,
        partnerFilter,
        applicationType,
        timeCommitment,
        startDateFilter,
        durationFilter,
        seatsFilter,
        sortNewest,
    ]);

    const pageCount = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const pagedProjects = filteredProjects.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const scrollToResults = () => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const chipClass = (active: boolean, tone: string) =>
        `inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold ${
            active ? tone : "bg-white text-[#5d7278] border border-[#e4eeec]"
        }`;

    return (
        <main className="min-h-screen bg-[#f3f7f5] font-sans">
            <Navbar />

            <section className="relative overflow-hidden pt-28">
                <div className="mx-auto max-w-[1600px] px-4 pb-6 sm:px-6">
                    <div className="relative overflow-hidden rounded-[28px] border border-[#e6eeea] bg-white p-5 shadow-[0_18px_40px_rgba(16,48,54,.06)] sm:p-8 lg:p-10">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#1aa36a]">
                            Community Service Marketplace
                        </p>
                        <div className="mt-3 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] lg:items-center">
                            <div>
                                <h1 className="max-w-[16ch] text-[clamp(34px,4.4vw,58px)] font-black leading-[0.95] tracking-tight text-[#16313d]">
                                    Find a cause.
                                    <br />
                                    <span className="text-[#1aa36a]">Create real impact.</span>
                                </h1>
                                <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-[#5d7278]">
                                    Discover verified community service opportunities from universities, NGOs and partner
                                    organizations across Pakistan. Filter by city, SDG, hours, host organization, dates and
                                    availability — then choose the schedule that fits your interests.
                                </p>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStatusFilter("live");
                                            scrollToResults();
                                        }}
                                        className="inline-flex h-11 items-center rounded-full bg-[#16313d] px-5 text-[13px] font-extrabold text-white hover:bg-[#0f242c]"
                                    >
                                        Explore Live Opportunities
                                    </button>
                                    <Link
                                        href="/#where-your-impact-lives"
                                        className="inline-flex h-11 items-center rounded-full border border-[#d7e4e0] bg-white px-5 text-[13px] font-extrabold text-[#16313d] hover:bg-[#f7fafb]"
                                    >
                                        How Community Service Works
                                    </Link>
                                </div>
                                <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {[
                                        [statusCounts.total, "Community Service Projects"],
                                        [statusCounts.live, "Live Now"],
                                        [statusCounts.closing, "Closing Soon"],
                                        [statusCounts.upcoming, "Upcoming"],
                                    ].map(([value, label]) => (
                                        <div key={String(label)} className="rounded-2xl border border-[#e8eeec] bg-[#f7faf8] px-3 py-3">
                                            <b className="block text-[22px] font-black tabular-nums text-[#16313d]">{value}</b>
                                            <span className="text-[11px] font-semibold text-[#6b7c86]">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="relative mx-auto min-h-[220px] w-full max-w-[420px]">
                                <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_20%_20%,#e8f7c8,transparent_42%),radial-gradient(circle_at_80%_0%,#f8d9b0,transparent_40%),radial-gradient(circle_at_80%_80%,#d9c8f4,transparent_45%),linear-gradient(135deg,#f7f3e8,#e7f3ea)]" />
                                <div className="absolute left-[12%] top-[18%] h-24 w-24 rounded-full bg-white/55 shadow-sm" />
                                <div className="absolute right-[18%] top-[28%] h-28 w-28 rounded-full bg-white/50" />
                                <div className="absolute bottom-[16%] left-[28%] h-20 w-20 rounded-full bg-white/45" />
                                <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-[#16313d] p-4 text-white shadow-lg">
                                    <p className="text-[15px] font-black leading-snug">One student. 16 verified hours.</p>
                                    <p className="mt-1 text-[12px] leading-relaxed text-[#cfe3e0]">
                                        Thousands of students turn individual effort into visible community impact.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <p className="mt-6 text-[11px] font-semibold tracking-wide text-[#8aa0a6]">
                            Verified opportunities · Real communities · Measurable impact
                        </p>
                    </div>
                </div>
            </section>

            {applyBanner ? (
                <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
                    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                        <p className="font-semibold">Applications temporarily paused</p>
                        <p className="mt-1 text-amber-900/90">{applyBanner}</p>
                    </div>
                </div>
            ) : null}

            <section className="mx-auto max-w-[1600px] px-4 pb-16 sm:px-6">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-[22px] font-black text-[#16313d]">Community Service Opportunities</h2>
                        <p className="mt-1 text-[13px] text-[#6b7c86]">
                            Search, filter and compare verified opportunities across universities and partner organisations.
                        </p>
                    </div>
                    <p className="text-[13px] font-bold text-[#1aa36a]">{filteredProjects.length} Opportunities Found</p>
                </div>

                <div className="rounded-[22px] border border-[#e4eeec] bg-white p-4 shadow-[0_10px_28px_rgba(16,48,54,.04)]">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6b7c86] xl:col-span-1">
                            Search
                            <span className="relative mt-1 block">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search project, host, skills or keyword"
                                    className="h-10 w-full rounded-xl border border-[#e4eeec] bg-white pl-9 pr-3 text-sm text-[#16313d] placeholder:text-[#8aa0a6] focus:border-[#0e7d74] focus:outline-none"
                                />
                            </span>
                        </label>
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6b7c86]">
                            University
                            <span className="relative mt-1 block">
                                <select value={universityFilter} onChange={(e) => setUniversityFilter(e.target.value)} className={filterSelectClass}>
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
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6b7c86]">
                            City
                            <span className="relative mt-1 block">
                                <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className={filterSelectClass}>
                                    <option value="all">All cities</option>
                                    {locationOptions.map((loc) => (
                                        <option key={loc} value={loc}>
                                            {loc}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                            </span>
                        </label>
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6b7c86]">
                            Location Type
                            <span className="relative mt-1 block">
                                <select
                                    value={modeFilter}
                                    onChange={(e) => setModeFilter(e.target.value as "all" | ModeBucket)}
                                    className={filterSelectClass}
                                >
                                    <option value="all">All types</option>
                                    {(["on-site", "hybrid", "remote"] as const).map((b) => (
                                        <option key={b} value={b}>
                                            {modeMenuLabel(b)}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                            </span>
                        </label>
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6b7c86]">
                            SDG
                            <span className="relative mt-1 block">
                                <select value={sdgFilter} onChange={(e) => setSdgFilter(e.target.value)} className={filterSelectClass}>
                                    <option value="all">All SDGs</option>
                                    {sdgOptions.map((sdg) => (
                                        <option key={sdg} value={sdg}>
                                            {sdg}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                            </span>
                        </label>
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6b7c86]">
                            Skills / Opportunity Type
                            <span className="relative mt-1 block">
                                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={filterSelectClass}>
                                    <option value="all">All Causes</option>
                                    {typeOptions.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                            </span>
                        </label>
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6b7c86]">
                            Required Hours
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
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6b7c86]">
                            Seats Available
                            <span className="relative mt-1 block">
                                <select
                                    value={seatsFilter}
                                    onChange={(e) => setSeatsFilter(e.target.value as "all" | "open")}
                                    className={filterSelectClass}
                                >
                                    <option value="all">Any Seats</option>
                                    <option value="open">With open seats</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                            </span>
                        </label>
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6b7c86]">
                            Host Organization
                            <span className="relative mt-1 block">
                                <select value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)} className={filterSelectClass}>
                                    <option value="all">All hosts</option>
                                    {partnerOptions.map((p) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                            </span>
                        </label>
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6b7c86]">
                            Start Date
                            <input
                                type="date"
                                value={startDateFilter}
                                onChange={(e) => setStartDateFilter(e.target.value)}
                                className="mt-1 h-10 w-full rounded-xl border border-[#e4eeec] px-3 text-sm text-[#16313d]"
                            />
                        </label>
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6b7c86]">
                            Duration
                            <span className="relative mt-1 block">
                                <select
                                    value={durationFilter}
                                    onChange={(e) => setDurationFilter(e.target.value as "all" | "week" | "month" | "long")}
                                    className={filterSelectClass}
                                >
                                    <option value="all">Any Duration</option>
                                    <option value="week">Up to 7 days</option>
                                    <option value="month">8–31 days</option>
                                    <option value="long">Longer than a month</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                            </span>
                        </label>
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6b7c86]">
                            Application Type
                            <span className="relative mt-1 block">
                                <select
                                    value={applicationType}
                                    onChange={(e) => setApplicationType(e.target.value as "all" | "open" | "restricted")}
                                    className={filterSelectClass}
                                >
                                    <option value="all">All</option>
                                    <option value="open">Open to all universities</option>
                                    <option value="restricted">University restricted</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                            </span>
                        </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef4f3] pt-3">
                        <div className="flex flex-wrap gap-2">
                            {(["live", "closing", "upcoming", "expired"] as const).map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setStatusFilter((current) => (current === status ? "all" : status))}
                                    className={chipClass(
                                        statusFilter === status,
                                        status === "live"
                                            ? "bg-[#e8f8ef] text-[#148a4c]"
                                            : status === "closing"
                                              ? "bg-[#fff4d6] text-[#b45309]"
                                              : status === "upcoming"
                                                ? "bg-[#eee8ff] text-[#5b21b6]"
                                                : "bg-[#ffe4ea] text-[#be123c]",
                                    )}
                                >
                                    <span
                                        className={`h-2 w-2 rounded-full ${
                                            status === "live"
                                                ? "bg-[#1aa36a]"
                                                : status === "closing"
                                                  ? "bg-[#f2a100]"
                                                  : status === "upcoming"
                                                    ? "bg-[#6b4de6]"
                                                    : "bg-[#e11d48]"
                                        }`}
                                    />
                                    {marketplaceStatusLabel(status)} {statusCounts[status]}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="rounded-full border border-[#e4eeec] px-4 py-2 text-[12px] font-bold text-[#5d7278] hover:bg-slate-50"
                            >
                                Clear Filters
                            </button>
                            <button
                                type="button"
                                onClick={scrollToResults}
                                className="rounded-full bg-[#16313d] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#0f242c]"
                            >
                                More Search
                            </button>
                        </div>
                    </div>
                </div>

                <div ref={resultsRef} className="mt-6 flex flex-wrap items-center justify-between gap-3 scroll-mt-28">
                    <div>
                        <h3 className="text-[20px] font-black text-[#16313d]">
                            {filteredProjects.length}{" "}
                            {statusFilter === "all" ? "" : marketplaceStatusLabel(statusFilter) + " "}
                            {filteredProjects.length === 1 ? "Opportunity" : "Opportunities"}
                        </h3>
                        <p className="text-[12.5px] text-[#6b7c86]">
                            {statusFilter === "all"
                                ? "All verified listings. Use the chips to filter Live, Closing Soon, Upcoming or Expired."
                                : statusFilter === "live"
                                ? "Projects currently active between approved start and end dates."
                                : statusFilter === "closing"
                                  ? "Live now, with 5 or fewer days remaining."
                                  : statusFilter === "upcoming"
                                    ? "Approved and ready, start date still in the future."
                                    : "Ended or expired listings kept for reference."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select
                                value={sortNewest ? "newest" : "oldest"}
                                onChange={(e) => setSortNewest(e.target.value === "newest")}
                                className={`${filterSelectClass} min-w-[9rem]`}
                            >
                                <option value="newest">Recommended</option>
                                <option value="oldest">Oldest first</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a6]" />
                        </div>
                        <div className="flex rounded-xl border border-[#e4eeec] bg-white p-0.5">
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
                            <button
                                type="button"
                                onClick={() => setReloadNonce((n) => n + 1)}
                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0F8F83] px-5 py-2.5 text-sm font-bold text-white"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
                            <p className="font-semibold text-slate-700">No opportunities match your filters.</p>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0F8F83] px-5 py-2.5 text-sm font-bold text-white"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "grid gap-4"}>
                                {pagedProjects.map((project) => (
                                    <MarketplaceOpportunityCard
                                        key={project.id}
                                        id={project.id}
                                        title={project.title}
                                        description={
                                            project.description && project.description !== "No description"
                                                ? project.description
                                                : undefined
                                        }
                                        pathLabel={project.path_label}
                                        organizationName={project.partner_name || project.org}
                                        city={project.city}
                                        modeLabel={project.modeBucket !== "unspecified" ? modeMenuLabel(project.modeBucket) : "On-site"}
                                        skillLabel={project.opportunityTypes[0] || null}
                                        hours={project.hours}
                                        seatsRemaining={project.seatsRemaining}
                                        startDate={project.start_date}
                                        endDate={project.end_date}
                                        coverUrl={project.cover_url}
                                        universityLabel={project.universityLabel}
                                        visibilityOpen={project.visibilityBucket === "open"}
                                        sdgs={sdgsForBrowseCard(project.sdg_ids, project.sdgNumber, project.sdgTitle)}
                                        adminExpired={project.adminExpired}
                                        applicationsOpen={project.applicationsOpen}
                                        applyBlockedReason={project.applyBlockedReason}
                                    />
                                ))}
                            </div>
                            {pageCount > 1 ? (
                                <PaginationControls
                                    currentPage={safePage}
                                    totalPages={pageCount}
                                    onPageChange={(next) => {
                                        setPage(next);
                                        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }}
                                    totalItems={filteredProjects.length}
                                    itemsPerPage={PAGE_SIZE}
                                />
                            ) : null}
                        </>
                    )}
                </div>

                <p className="mt-8 text-[11px] leading-relaxed text-[#8aa0a6]">
                    Recommended production rule: “Live Now” should be calculated automatically when today falls between the
                    approved project start and end dates. “Closing Soon” can be triggered when 3–5 days remain. “Upcoming”
                    means the start date is in the future. Hidden or expired listings never appear as live.
                </p>
            </section>

            <PartnersFooter />
            <FooterBanner />
            <Footer />
        </main>
    );
}
