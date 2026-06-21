"use client";

import Navbar from "@/components/Navbar";
import PartnersFooter from "@/components/PartnersFooter";
import FooterBanner from "@/components/FooterBanner";
import Footer from "@/components/Footer";
import {
    Search,
    MapPin,
    Users,
    ArrowRight,
    Loader2,
    Share2,
    Briefcase,
    Building2,
    LayoutGrid,
    Map as MapIcon,
    Clock,
    Bookmark,
    GraduationCap,
    Sparkles,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import clsx from "clsx";
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
import { findSdgById } from "@/utils/sdgData";
import { buildOpportunityMapPoints } from "@/utils/opportunityMapCoordinates";

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

interface Project {
    id: string | number;
    title: string;
    partner_name?: string;
    org?: string;
    location?: string;
    status: string;
    participant_count?: number;
    volunteers?: number;
    description: string;
    category?: string;
    types?: string[];
    universityLabel: string;
    modeBucket: ModeBucket;
    visibilityBucket: VisibilityBucket;
    opportunityTypes: string[];
    sdgLabel: string;
    seatsRemaining: number | null;
    locationPin: string | null;
}

type ListingTab = "open" | "closing" | "university" | "archived";

function buildPublicProjectShareUrl(projectId: string | number): string {
    if (typeof window === "undefined") return "";
    const id = encodeURIComponent(String(projectId));
    return `${window.location.origin}/projects/${id}`;
}

async function copyPublicProjectShareLink(projectId: string | number): Promise<void> {
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

function isOpenStatus(status: string): boolean {
    return !isArchivedStatus(status) && !normalizeStatus(status).includes("full");
}

function isClosingSoon(project: Project): boolean {
    const s = normalizeStatus(project.status);
    if (s.includes("closing")) return true;
    if (project.seatsRemaining != null && project.seatsRemaining > 0 && project.seatsRemaining <= 5) {
        return true;
    }
    return false;
}

function extractCityLabel(location?: string): string {
    if (!location) return "Pakistan";
    const first = location.split(",")[0]?.trim();
    return first || location;
}

function parseSdgNumber(sdgLabel: string): number | null {
    const match = sdgLabel.match(/^(\d+)\./);
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
}

function statusBadgeClass(status: string): string {
    const s = normalizeStatus(status);
    if (s.includes("closing")) return "bg-amber-50 text-amber-800 border-amber-200";
    if (s.includes("full")) return "bg-slate-100 text-slate-600 border-slate-200";
    if (isArchivedStatus(status)) return "bg-slate-100 text-slate-600 border-slate-200";
    if (s === "active" || s.includes("open")) return "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (s === "recruiting") return "bg-sky-50 text-sky-800 border-sky-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
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

function FilterPill({
    active,
    onClick,
    children,
    className,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={clsx(
                "rounded-lg border px-3 py-1.5 text-left text-xs font-semibold transition-colors",
                active
                    ? "border-[#0F8F83] bg-[#0F8F83]/10 text-[#065f46]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                className,
            )}
        >
            {children}
        </button>
    );
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [universityFilter, setUniversityFilter] = useState("all");
    const [modeFilter, setModeFilter] = useState<"all" | ModeBucket>("all");
    const [oppTypeFilter, setOppTypeFilter] = useState("all");
    const [sdgFilter, setSdgFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");
    const [seatsFilter, setSeatsFilter] = useState<"all" | "1" | "5" | "10">("all");
    const [visibilityFilter, setVisibilityFilter] = useState<"all" | VisibilityBucket>("all");
    const [activeTab, setActiveTab] = useState<ListingTab>("open");
    const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "").replace(/\/$/, "");
                if (!backendUrl) {
                    console.error("NEXT_PUBLIC_BACKEND_BASE_URL is not set");
                    setProjects([]);
                    return;
                }
                const url = `${backendUrl}/public/opportunities`;
                const response = await fetch(url, { cache: "no-store" });
                if (!response.ok) {
                    console.error("GET /public/opportunities failed:", response.status, response.statusText);
                    setProjects([]);
                    return;
                }
                const rawText = await response.text();
                let data: { success?: boolean; data?: unknown };
                try {
                    data = rawText ? (JSON.parse(rawText) as { success?: boolean; data?: unknown }) : {};
                } catch {
                    console.error("Invalid JSON from /public/opportunities");
                    setProjects([]);
                    return;
                }

                type Payload = { success?: boolean; data?: unknown; opportunities?: unknown };
                const body = data as Payload;
                const list: Record<string, unknown>[] = Array.isArray(body.data)
                    ? (body.data as Record<string, unknown>[])
                    : Array.isArray(body.opportunities)
                      ? (body.opportunities as Record<string, unknown>[])
                      : [];

                const shouldLoad =
                    Array.isArray(list) &&
                    (body.success === true || (body.success !== false && (Array.isArray(body.data) || list.length > 0)));

                if (shouldLoad) {
                    const mappedProjects = list.map((p: Record<string, unknown>) => {
                        let displayLocation = "Remote / Pakistan";
                        let locationPin: string | null = null;
                        const loc = p.location;
                        if (typeof loc === "object" && loc !== null) {
                            const l = loc as Record<string, unknown>;
                            const parts: string[] = [];
                            if (typeof l.city === "string") parts.push(l.city);
                            if (typeof l.venue === "string") parts.push(l.venue);
                            if (typeof l.pin === "string" && l.pin.trim()) {
                                locationPin = l.pin.trim();
                            }
                            displayLocation =
                                parts.length > 0
                                    ? parts.join(", ")
                                    : typeof l.pin === "string" && l.pin.trim()
                                      ? l.pin
                                      : "Pakistan";
                        } else if (typeof loc === "string" && loc.trim()) {
                            displayLocation = loc;
                        }

                        const opportunityTypes = pickOpportunityTypes(p);
                        const sdgLabel = buildSdgFilterLabel(p);

                        return {
                            id: p.id as string | number,
                            title: String(p.title ?? ""),
                            org:
                                (typeof p.partner_name === "string" && p.partner_name) ||
                                (typeof p.organization_name === "string" && p.organization_name) ||
                                "Verified Partner",
                            location: displayLocation,
                            status: String(p.status || "Active"),
                            volunteers: Number(p.participant_count) || 0,
                            description: String(p.description ?? ""),
                            category:
                                opportunityTypes[0] ||
                                (typeof sdgLabel === "string" && sdgLabel !== "Unspecified SDG"
                                    ? sdgLabel
                                    : "Social Impact"),
                            types: opportunityTypes,
                            universityLabel: pickUniversityLabel(p),
                            modeBucket: normalizeModeBucket(p.mode),
                            visibilityBucket: pickVisibilityBucket(p),
                            opportunityTypes,
                            sdgLabel,
                            seatsRemaining: computeSeatsRemaining(p),
                            locationPin,
                        };
                    });
                    setProjects(mappedProjects);
                } else {
                    setProjects([]);
                }
            } catch (err) {
                console.error("Failed to fetch projects:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const universityOptions = useMemo(() => {
        const s = new Set<string>();
        projects.forEach((p) => {
            if (p.universityLabel) s.add(p.universityLabel);
        });
        return ["all", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
    }, [projects]);

    const oppTypeOptions = useMemo(() => {
        const s = new Set<string>();
        projects.forEach((p) => (p.opportunityTypes ?? []).forEach((t) => s.add(t)));
        return ["all", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
    }, [projects]);

    const sdgOptions = useMemo(() => {
        const s = new Set<string>();
        projects.forEach((p) => s.add(p.sdgLabel));
        return ["all", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
    }, [projects]);

    const locationOptions = useMemo(() => {
        const s = new Set<string>();
        projects.forEach((p) => {
            if (p.location) s.add(p.location);
        });
        return ["all", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
    }, [projects]);

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

    const stats = useMemo(() => {
        const openCount = projects.filter((p) => isOpenStatus(p.status)).length;
        const partners = new Set(projects.map((p) => p.org).filter(Boolean)).size;
        const cities = new Set(projects.map((p) => extractCityLabel(p.location))).size;
        return { openCount, partners, cities };
    }, [projects]);

    const resetFilters = () => {
        setSearchQuery("");
        setUniversityFilter("all");
        setModeFilter("all");
        setOppTypeFilter("all");
        setSdgFilter("all");
        setLocationFilter("all");
        setSeatsFilter("all");
        setVisibilityFilter("all");
    };

    const filteredProjects = projects.filter((project) => {
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            const hay = [
                project.title,
                project.location,
                project.org,
                project.universityLabel,
                project.sdgLabel,
                project.opportunityTypes.join(" "),
            ]
                .join(" ")
                .toLowerCase();
            if (!hay.includes(q)) return false;
        }
        if (universityFilter !== "all" && project.universityLabel !== universityFilter) return false;
        if (modeFilter !== "all" && project.modeBucket !== modeFilter) return false;
        if (oppTypeFilter !== "all" && !project.opportunityTypes.includes(oppTypeFilter)) return false;
        if (sdgFilter !== "all" && project.sdgLabel !== sdgFilter) return false;
        if (locationFilter !== "all" && project.location !== locationFilter) return false;
        if (!passesSeatsFilter(project.seatsRemaining, seatsFilter)) return false;
        if (visibilityFilter !== "all" && project.visibilityBucket !== visibilityFilter) return false;
        return true;
    });

    const tabFilteredProjects = useMemo(() => {
        return filteredProjects.filter((project) => {
            switch (activeTab) {
                case "open":
                    return isOpenStatus(project.status);
                case "closing":
                    return isOpenStatus(project.status) && isClosingSoon(project);
                case "university":
                    return (
                        isOpenStatus(project.status) &&
                        (project.visibilityBucket === "restricted" ||
                            !project.universityLabel.toLowerCase().includes("open (all"))
                    );
                case "archived":
                    return isArchivedStatus(project.status);
                default:
                    return true;
            }
        });
    }, [filteredProjects, activeTab]);

    const tabCounts = useMemo(() => {
        return {
            open: filteredProjects.filter((p) => isOpenStatus(p.status)).length,
            closing: filteredProjects.filter((p) => isOpenStatus(p.status) && isClosingSoon(p)).length,
            university: filteredProjects.filter(
                (p) =>
                    isOpenStatus(p.status) &&
                    (p.visibilityBucket === "restricted" ||
                        !p.universityLabel.toLowerCase().includes("open (all")),
            ).length,
            archived: filteredProjects.filter((p) => isArchivedStatus(p.status)).length,
        };
    }, [filteredProjects]);

    const mapPoints = useMemo(
        () =>
            buildOpportunityMapPoints(
                tabFilteredProjects.map((p) => ({
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
        [tabFilteredProjects],
    );

    const listingTabs: { id: ListingTab; label: string; count: number }[] = [
        { id: "open", label: "Open Opportunities", count: tabCounts.open },
        { id: "closing", label: "Closing Soon", count: tabCounts.closing },
        { id: "university", label: "University-Specific", count: tabCounts.university },
        { id: "archived", label: "Completed / Archived", count: tabCounts.archived },
    ];

    const activeFilterCount = [
        universityFilter !== "all",
        modeFilter !== "all",
        oppTypeFilter !== "all",
        sdgFilter !== "all",
        locationFilter !== "all",
        seatsFilter !== "all",
        visibilityFilter !== "all",
        searchQuery.trim().length > 0,
    ].filter(Boolean).length;

    const toggleMode = (bucket: ModeBucket) => {
        setModeFilter((prev) => (prev === bucket ? "all" : bucket));
    };

    const toggleOppType = (type: string) => {
        setOppTypeFilter((prev) => (prev === type ? "all" : type));
    };

    const toggleUniversity = (uni: string) => {
        setUniversityFilter((prev) => (prev === uni ? "all" : uni));
    };

    const toggleVisibility = (bucket: VisibilityBucket) => {
        setVisibilityFilter((prev) => (prev === bucket ? "all" : bucket));
    };

    const toggleSdg = (sdg: string) => {
        setSdgFilter((prev) => (prev === sdg ? "all" : sdg));
    };

    const toggleLocation = (loc: string) => {
        setLocationFilter((prev) => (prev === loc ? "all" : loc));
    };

    return (
        <main className="min-h-screen bg-[#faf8f4] font-sans">
            <Navbar />

            {/* Hero — no background image */}
            <section className="relative overflow-hidden border-b border-slate-200/80 bg-[#faf8f4] pt-28 pb-12">
                <div className="relative z-10 mx-auto max-w-7xl px-6">
                    <div className="max-w-3xl">
                        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#0F8F83]">
                            CIEL PK Opportunities Hub
                        </p>
                        <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-[#1a3d34] sm:text-5xl">
                            Explore Opportunities
                        </h1>
                        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                            Discover verified community engagement opportunities from partner organizations across
                            Pakistan — filter by interest, location, SDG, and eligibility.
                        </p>
                    </div>

                    <form
                        className="mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row"
                        onSubmit={(e) => e.preventDefault()}
                    >
                        <div className="relative min-w-0 flex-1">
                            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                placeholder="Search by project, partner, SDG, city, skill, or university…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-[#0F8F83] focus:ring-4 focus:ring-[#0F8F83]/15"
                            />
                        </div>
                        <button
                            type="submit"
                            className="inline-flex h-14 shrink-0 items-center justify-center rounded-2xl bg-[#1a3d34] px-8 text-sm font-bold text-white shadow-md transition hover:bg-[#143029]"
                        >
                            Search
                        </button>
                    </form>
                </div>
            </section>

            {/* Stats */}
            <section className="relative z-10 mx-auto -mt-6 max-w-7xl px-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                        {
                            label: "Active Opportunities",
                            value: stats.openCount,
                            icon: Briefcase,
                            suffix: "",
                        },
                        {
                            label: "Partner Organizations",
                            value: stats.partners,
                            icon: Building2,
                            suffix: stats.partners > 0 ? "+" : "",
                        },
                        {
                            label: "Cities Covered",
                            value: stats.cities,
                            icon: MapPin,
                            suffix: stats.cities > 0 ? "+" : "",
                        },
                    ].map(({ label, value, icon: Icon, suffix }) => (
                        <div
                            key={label}
                            className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0F8F83]/10 text-[#0F8F83]">
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black tabular-nums text-slate-900">
                                    {value}
                                    {suffix}
                                </p>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Main hub */}
            <section className="mx-auto max-w-7xl px-6 py-10">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1 lg:border-none lg:pb-0">
                        {listingTabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    "rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                                    activeTab === tab.id
                                        ? "border-b-2 border-[#0F8F83] bg-white text-[#065f46] shadow-sm"
                                        : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
                                )}
                            >
                                {tab.label}
                                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 self-end lg:self-auto">
                        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setViewMode("grid")}
                                className={clsx(
                                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                                    viewMode === "grid"
                                        ? "bg-[#0F8F83] text-white"
                                        : "text-slate-600 hover:bg-slate-50",
                                )}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                Card View
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("map")}
                                className={clsx(
                                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                                    viewMode === "map"
                                        ? "bg-[#0F8F83] text-white"
                                        : "text-slate-600 hover:bg-slate-50",
                                )}
                            >
                                <MapIcon className="h-3.5 w-3.5" />
                                Map View
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                    {/* Sidebar filters */}
                    <aside className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-28 lg:w-72">
                        <div className="mb-5 flex items-center justify-between gap-2">
                            <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">Filters</h2>
                            {activeFilterCount > 0 ? (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="text-xs font-semibold text-[#0F8F83] hover:underline"
                                >
                                    Clear all ({activeFilterCount})
                                </button>
                            ) : null}
                        </div>

                        <div className="space-y-6">
                            <div>
                                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Find by Interest
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {oppTypeOptions
                                        .filter((t) => t !== "all")
                                        .slice(0, 8)
                                        .map((type) => (
                                            <FilterPill
                                                key={type}
                                                active={oppTypeFilter === type}
                                                onClick={() => toggleOppType(type)}
                                            >
                                                {type}
                                            </FilterPill>
                                        ))}
                                    {oppTypeOptions.length <= 1 ? (
                                        <p className="text-xs text-slate-400">No type tags yet</p>
                                    ) : null}
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500">
                                    <MapPin className="h-3.5 w-3.5" />
                                    Find by Practical Need
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {(["remote", "hybrid", "on-site"] as const).map((bucket) => (
                                        <FilterPill
                                            key={bucket}
                                            active={modeFilter === bucket}
                                            onClick={() => toggleMode(bucket)}
                                        >
                                            {modeMenuLabel(bucket)}
                                        </FilterPill>
                                    ))}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {locationOptions
                                        .filter((l) => l !== "all")
                                        .slice(0, 4)
                                        .map((loc) => (
                                            <FilterPill
                                                key={loc}
                                                active={locationFilter === loc}
                                                onClick={() => toggleLocation(loc)}
                                                className="max-w-full truncate"
                                            >
                                                {extractCityLabel(loc)}
                                            </FilterPill>
                                        ))}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {(["1", "5", "10"] as const).map((min) => (
                                        <FilterPill
                                            key={min}
                                            active={seatsFilter === min}
                                            onClick={() =>
                                                setSeatsFilter((prev) => (prev === min ? "all" : min))
                                            }
                                        >
                                            {min}+ seats
                                        </FilterPill>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500">
                                    <GraduationCap className="h-3.5 w-3.5" />
                                    Find by Eligibility
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <FilterPill
                                        active={visibilityFilter === "open"}
                                        onClick={() => toggleVisibility("open")}
                                    >
                                        Open to All Universities
                                    </FilterPill>
                                    <FilterPill
                                        active={visibilityFilter === "restricted"}
                                        onClick={() => toggleVisibility("restricted")}
                                    >
                                        Selected Universities
                                    </FilterPill>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {universityOptions
                                        .filter((u) => u !== "all")
                                        .slice(0, 5)
                                        .map((uni) => (
                                            <FilterPill
                                                key={uni}
                                                active={universityFilter === uni}
                                                onClick={() => toggleUniversity(uni)}
                                                className="max-w-full truncate"
                                            >
                                                {uni.length > 28 ? `${uni.slice(0, 28)}…` : uni}
                                            </FilterPill>
                                        ))}
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
                                    SDG Focus
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {sdgOptions
                                        .filter((s) => s !== "all" && s !== "Unspecified SDG")
                                        .slice(0, 6)
                                        .map((sdg) => {
                                            const num = parseSdgNumber(sdg);
                                            return (
                                                <FilterPill
                                                    key={sdg}
                                                    active={sdgFilter === sdg}
                                                    onClick={() => toggleSdg(sdg)}
                                                >
                                                    {num ? `SDG ${num}` : sdg.slice(0, 18)}
                                                </FilterPill>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Results */}
                    <div className="min-w-0 flex-1">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                            <p>
                                Showing{" "}
                                <span className="font-bold text-slate-900">{tabFilteredProjects.length}</span>{" "}
                                {tabFilteredProjects.length === 1 ? "opportunity" : "opportunities"}
                            </p>
                            {activeFilterCount > 0 ? (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="font-semibold text-[#0F8F83] hover:underline"
                                >
                                    Reset filters
                                </button>
                            ) : null}
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-slate-400">
                                <Loader2 className="h-10 w-10 animate-spin text-[#0F8F83]" />
                                <p className="text-sm font-bold uppercase tracking-widest">Loading opportunities…</p>
                            </div>
                        ) : tabFilteredProjects.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
                                <p className="font-semibold text-slate-700">No opportunities match your filters.</p>
                                <p className="mt-2 text-sm text-slate-500">
                                    Try another tab or clear filters to see more results.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetFilters();
                                        setActiveTab("open");
                                    }}
                                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0F8F83] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0d7a70]"
                                >
                                    Clear filters
                                </button>
                            </div>
                        ) : viewMode === "map" ? (
                            <OpportunitiesMapView points={mapPoints} />
                        ) : (
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2">
                                {tabFilteredProjects.map((project) => {
                                    const sdgNum = parseSdgNumber(project.sdgLabel);
                                    const sdg = sdgNum ? findSdgById(sdgNum) : null;
                                    const orgInitial = (project.org || "P").charAt(0).toUpperCase();

                                    return (
                                        <article
                                            key={project.id}
                                            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0F8F83]/30 hover:shadow-md"
                                        >
                                            <div className="mb-4 flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F8F83]/10 text-sm font-black text-[#065f46]">
                                                        {orgInitial}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-bold uppercase tracking-wide text-[#0F8F83]">
                                                            {project.org}
                                                        </p>
                                                        <h3 className="mt-1 line-clamp-2 text-lg font-black leading-snug text-slate-900 group-hover:text-[#065f46]">
                                                            {project.title}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <span
                                                    className={clsx(
                                                        "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
                                                        statusBadgeClass(project.status),
                                                    )}
                                                >
                                                    {statusDisplayLabel(project.status)}
                                                </span>
                                            </div>

                                            <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
                                                {project.description}
                                            </p>

                                            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                    {extractCityLabel(project.location)}
                                                </span>
                                                <span className="text-slate-300">|</span>
                                                <span>{modeMenuLabel(project.modeBucket)}</span>
                                            </div>

                                            <div className="mb-4 flex flex-wrap gap-2">
                                                {sdg ? (
                                                    <span
                                                        className="rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white"
                                                        style={{ backgroundColor: sdg.color }}
                                                    >
                                                        SDG {sdg.number}
                                                    </span>
                                                ) : project.sdgLabel !== "Unspecified SDG" ? (
                                                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                                                        {project.sdgLabel.slice(0, 24)}
                                                    </span>
                                                ) : null}
                                                {(project.opportunityTypes ?? []).slice(0, 2).map((type) => (
                                                    <span
                                                        key={type}
                                                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600"
                                                    >
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                                                <div>
                                                    <p className="font-bold uppercase tracking-wide text-slate-400">
                                                        Participants
                                                    </p>
                                                    <p className="mt-0.5 flex items-center gap-1 font-black text-slate-800">
                                                        <Users className="h-3.5 w-3.5" />
                                                        {project.volunteers ?? 0}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="font-bold uppercase tracking-wide text-slate-400">
                                                        Seats
                                                    </p>
                                                    <p className="mt-0.5 font-black text-slate-800">
                                                        {project.seatsRemaining != null
                                                            ? `${project.seatsRemaining} left`
                                                            : "Open"}
                                                    </p>
                                                </div>
                                            </div>

                                            <p className="mb-4 flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-slate-500">
                                                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                {project.universityLabel}
                                            </p>

                                            <div className="mt-auto flex items-center gap-2">
                                                <Link
                                                    href={`/projects/${project.id}`}
                                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0F8F83] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0d7a70]"
                                                >
                                                    {isArchivedStatus(project.status) ? "View Summary" : "View Details"}
                                                    <ArrowRight className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                                                    aria-label="Copy share link"
                                                    title="Copy share link"
                                                    onClick={() => void copyPublicProjectShareLink(project.id)}
                                                >
                                                    <Share2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400"
                                                    aria-label="Save opportunity"
                                                    title="Save (coming soon)"
                                                    onClick={() => toast.message("Save feature coming soon")}
                                                >
                                                    <Bookmark className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Browse by partner */}
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
                                    onClick={() => setSearchQuery(org)}
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
