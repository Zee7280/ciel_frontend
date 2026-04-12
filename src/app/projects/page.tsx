"use client";

import Navbar from "@/components/Navbar";
import PartnersFooter from "@/components/PartnersFooter";
import FooterBanner from "@/components/FooterBanner";
import Footer from "@/components/Footer";
import { Search, MapPin, Users, ArrowRight, Filter, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
    creatorBucket: CreatorBucket;
    modeBucket: ModeBucket;
    visibilityBucket: VisibilityBucket;
    opportunityTypes: string[];
    sdgLabel: string;
    seatsRemaining: number | null;
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [universityFilter, setUniversityFilter] = useState("all");
    const [creatorFilter, setCreatorFilter] = useState<"all" | CreatorBucket>("all");
    const [modeFilter, setModeFilter] = useState<"all" | ModeBucket>("all");
    const [oppTypeFilter, setOppTypeFilter] = useState("all");
    const [sdgFilter, setSdgFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");
    const [seatsFilter, setSeatsFilter] = useState<"all" | "1" | "5" | "10">("all");
    const [visibilityFilter, setVisibilityFilter] = useState<"all" | VisibilityBucket>("all");

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
                // Avoid 304 + empty body: `response.json()` can throw; list never hydrates and UI shows "no projects".
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

                // Match legacy page when `success` is set; if omitted but `data` is an array, still render (some proxies omit `success`).
                const shouldLoad =
                    Array.isArray(list) &&
                    (body.success === true || (body.success !== false && (Array.isArray(body.data) || list.length > 0)));

                if (shouldLoad) {
                    // Map API fields to UI fields
                    const mappedProjects = list.map((p: Record<string, unknown>) => {
                        // Handle location if it's an object {pin, city, venue}
                        let displayLocation = "Remote / Pakistan";
                        const loc = p.location;
                        if (typeof loc === "object" && loc !== null) {
                            const l = loc as Record<string, unknown>;
                            const parts: string[] = [];
                            if (typeof l.city === "string") parts.push(l.city);
                            if (typeof l.venue === "string") parts.push(l.venue);
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
                            creatorBucket: pickCreatorBucket(p),
                            modeBucket: normalizeModeBucket(p.mode),
                            visibilityBucket: pickVisibilityBucket(p),
                            opportunityTypes,
                            sdgLabel,
                            seatsRemaining: computeSeatsRemaining(p),
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

    const resetFilters = () => {
        setSearchQuery("");
        setUniversityFilter("all");
        setCreatorFilter("all");
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
        if (creatorFilter !== "all" && project.creatorBucket !== creatorFilter) return false;
        if (modeFilter !== "all" && project.modeBucket !== modeFilter) return false;
        if (oppTypeFilter !== "all" && !project.opportunityTypes.includes(oppTypeFilter)) return false;
        if (sdgFilter !== "all" && project.sdgLabel !== sdgFilter) return false;
        if (locationFilter !== "all" && project.location !== locationFilter) return false;
        if (!passesSeatsFilter(project.seatsRemaining, seatsFilter)) return false;
        if (visibilityFilter !== "all" && project.visibilityBucket !== visibilityFilter) return false;
        return true;
    });

    const selectClass =
        "min-w-[140px] flex-1 sm:flex-none h-10 px-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-slate-700";

    return (
        <main className="min-h-screen bg-slate-50 font-sans">
            <Navbar />

            {/* Header */}
            <section className="pt-32 pb-12 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-2 animate-fade-in-up">Active Projects</h1>
                        <p className="text-slate-500 animate-fade-in-up" style={{ animationDelay: '100ms' }}>Discover how our community is making a difference across Pakistan.</p>
                    </div>
                </div>

                {/* Search + filters */}
                <div className="space-y-4 mb-10 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <div className="relative w-full max-w-xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search title, location, university, SDG, types…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium"
                            />
                        </div>
                    </div>

                    <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-3 text-slate-600">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Refine results</span>
                        </div>
                        <div className="flex flex-wrap gap-3 items-end">
                            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                University
                                <select
                                    value={universityFilter}
                                    onChange={(e) => setUniversityFilter(e.target.value)}
                                    className={selectClass}
                                >
                                    {universityOptions.map((u) => (
                                        <option key={u} value={u}>
                                            {u === "all" ? "All universities" : u}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                Creator
                                <select
                                    value={creatorFilter}
                                    onChange={(e) => setCreatorFilter(e.target.value as "all" | CreatorBucket)}
                                    className={selectClass}
                                >
                                    <option value="all">All creators</option>
                                    {(["student", "faculty", "partner", "unspecified"] as const).map((b) => (
                                        <option key={b} value={b}>
                                            {creatorMenuLabel(b)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                Mode
                                <select
                                    value={modeFilter}
                                    onChange={(e) => setModeFilter(e.target.value as "all" | ModeBucket)}
                                    className={selectClass}
                                >
                                    <option value="all">All modes</option>
                                    {(["on-site", "hybrid", "remote", "unspecified"] as const).map((b) => (
                                        <option key={b} value={b}>
                                            {modeMenuLabel(b)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                Opportunity type
                                <select
                                    value={oppTypeFilter}
                                    onChange={(e) => setOppTypeFilter(e.target.value)}
                                    className={selectClass}
                                >
                                    {oppTypeOptions.map((t) => (
                                        <option key={t} value={t}>
                                            {t === "all" ? "All types" : t}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                SDG
                                <select value={sdgFilter} onChange={(e) => setSdgFilter(e.target.value)} className={selectClass}>
                                    {sdgOptions.map((s) => (
                                        <option key={s} value={s}>
                                            {s === "all" ? "All SDGs" : s}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                Location
                                <select
                                    value={locationFilter}
                                    onChange={(e) => setLocationFilter(e.target.value)}
                                    className={selectClass}
                                >
                                    {locationOptions.map((loc) => (
                                        <option key={loc} value={loc}>
                                            {loc === "all" ? "All locations" : loc}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                Seats (min.)
                                <select
                                    value={seatsFilter}
                                    onChange={(e) => setSeatsFilter(e.target.value as "all" | "1" | "5" | "10")}
                                    className={selectClass}
                                >
                                    <option value="all">Any</option>
                                    <option value="1">1+ available</option>
                                    <option value="5">5+ available</option>
                                    <option value="10">10+ available</option>
                                </select>
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                Visibility
                                <select
                                    value={visibilityFilter}
                                    onChange={(e) => setVisibilityFilter(e.target.value as "all" | VisibilityBucket)}
                                    className={selectClass}
                                >
                                    <option value="all">All visibility</option>
                                    {(["open", "restricted", "unspecified"] as const).map((b) => (
                                        <option key={b} value={b}>
                                            {visibilityMenuLabel(b)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="h-10 px-4 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin" />
                        <p className="font-bold text-sm tracking-widest uppercase">Fetching Projects...</p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold">No projects found matching your criteria.</p>
                        <button type="button" onClick={resetFilters} className="mt-4 text-blue-600 font-bold hover:underline">
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredProjects.map((project, index) => (
                            <div key={project.id} className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">

                                <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        project.status?.toLowerCase() === 'active' ? 'bg-green-50 text-green-700 border border-green-100' :
                                        project.status?.toLowerCase() === 'recruiting' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                        'bg-slate-50 text-slate-600 border border-slate-100'
                                    }`}>
                                        {project.status}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 justify-end">
                                        <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
                                            {modeMenuLabel(project.modeBucket)}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[55%] text-right leading-tight">
                                            {project.category}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight group-hover:text-blue-600 transition-colors line-clamp-2">{project.title}</h3>
                                <p className="text-sm font-bold text-blue-500 mb-6">{project.org}</p>

                                <p className="text-slate-500 text-[15px] font-medium mb-8 flex-grow leading-relaxed line-clamp-3">
                                    {project.description}
                                </p>

                                <div className="border-t border-slate-50 pt-6 flex items-center justify-between text-[13px] font-bold text-slate-500 gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <MapPin className="w-4 h-4 text-slate-300 shrink-0" />
                                        <span className="truncate">{project.location}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0" title="Participants joined">
                                        <Users className="w-4 h-4 text-slate-300" /> {project.volunteers}
                                    </div>
                                    {project.seatsRemaining != null && (
                                        <div className="w-full basis-full text-[11px] font-bold text-orange-600">
                                            {project.seatsRemaining} seat{project.seatsRemaining === 1 ? "" : "s"} left
                                        </div>
                                    )}
                                </div>

                                <Link
                                    href={`/projects/${project.id}`}
                                    className="mt-8 w-full py-4 rounded-2xl bg-slate-50 text-slate-900 font-bold text-sm hover:bg-slate-900 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                                >
                                    View Details <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform" />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <PartnersFooter />
            <FooterBanner />
            <Footer />
        </main>
    );
}
