"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { isCommunityReportOnLiveDeck, isPathEntryApproved } from "@/utils/reviewQueue";
import { isFacultyApproved } from "@/utils/courseworkSectionReview";
import { type CourseProjectEntry } from "@/utils/courseProjectTypes";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { sdgData } from "@/utils/sdgData";
import CourseworkFlashCardModal from "@/components/ciel/coursework/CourseworkFlashCardModal";
import type { CommunityServiceLevel } from "@/utils/communityAwardModel";

const AREAS = ["All Impact", "Community Service", "Coursework", "FYP", "Startup"] as const;
type Area = (typeof AREAS)[number];
type ScoreKind = "community" | "ai" | "ok";
type BadgeKind = "level" | "ok";

type SimpleFlash = {
    type: string;
    title: string;
    subtitle: string;
    stats: [string, string][];
    summary: string;
    impact: string;
    verify: string;
};

type PortfolioRow = {
    id: string;
    title: string;
    meta: string;
    area: Exclude<Area, "All Impact">;
    areaLabel: string;
    score: string;
    scoreKind: ScoreKind;
    badge: string;
    badgeKind: BadgeKind;
    year: string;
    dateIso: string | null;
    sdgs: number[];
    href: string;
    coursework?: CourseProjectEntry;
    flash: SimpleFlash;
};

function yearOf(iso?: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : String(d.getFullYear());
}

function asIso(iso?: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function sdgNumbers(raw: unknown): number[] {
    if (!Array.isArray(raw)) return [];
    const out: number[] = [];
    for (const item of raw) {
        if (typeof item === "number" && Number.isFinite(item)) out.push(item);
        else if (typeof item === "string") {
            const n = parseInt(item.replace(/\D/g, ""), 10);
            if (Number.isFinite(n)) out.push(n);
        } else if (item && typeof item === "object" && "goalNumber" in item) {
            const n = Number((item as { goalNumber?: unknown }).goalNumber);
            if (Number.isFinite(n)) out.push(n);
        }
    }
    return [...new Set(out)];
}

function sdgLine(nums: number[]): string {
    if (!nums.length) return "No SDG mapping recorded.";
    return nums
        .map((n) => {
            const sdg = sdgData.find((s) => s.number === n);
            return sdg ? `SDG ${sdg.number} — ${sdg.title}` : `SDG ${n}`;
        })
        .join(" • ");
}

function studentDisplayName(): string {
    const user = readStoredCurrentUser();
    return typeof user?.name === "string" && user.name.trim() ? user.name.trim() : "Student";
}

function matchesArea(row: PortfolioRow, filter: Area): boolean {
    if (filter === "All Impact") return true;
    if (filter === "Startup") return row.area === "Startup";
    return row.area === filter;
}

function scoreClass(kind: ScoreKind): string {
    if (kind === "community") return "inline-block rounded-2xl bg-[#e8f5ef] px-2 py-1.5 text-[9.5px] font-black text-[#1d765d]";
    if (kind === "ai") return "inline-block rounded-2xl bg-[#edf4fb] px-2 py-1.5 text-[9.5px] font-black text-[#376d9f]";
    return "inline-block rounded-[18px] bg-[#e8f5ef] px-2 py-1 text-[9.5px] font-black text-[#1d765d]";
}

function badgeClass(kind: BadgeKind): string {
    if (kind === "level") return "inline-block rounded-2xl bg-[#f8f2e7] px-2 py-1.5 text-[9.5px] font-black text-[#765b25]";
    return "inline-block rounded-[18px] bg-[#e8f5ef] px-2 py-1 text-[9.5px] font-black text-[#1d765d]";
}

function StudentPortfolioFlashModal({
    flash,
    href,
    onClose,
}: {
    flash: SimpleFlash;
    href: string;
    onClose: () => void;
}) {
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(7,28,35,.58)] p-6"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="portfolio-flash-title"
                className="max-h-[90vh] w-[min(760px,96vw)] overflow-auto rounded-[26px] bg-white shadow-[0_28px_70px_rgba(0,0,0,.24)]"
            >
                <div className="relative bg-[linear-gradient(125deg,#0e4d4e,#117669)] px-[26px] py-6 text-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-3.5 top-3.5 grid h-[34px] w-[34px] place-items-center rounded-full border-0 bg-white/16 text-[17px] font-black text-white"
                        aria-label="Close"
                    >
                        ×
                    </button>
                    <span className="inline-block rounded-[14px] border border-white/18 bg-white/14 px-2 py-1.5 text-[9px] font-black">
                        {flash.type}
                    </span>
                    <h3 id="portfolio-flash-title" className="mb-1.5 mt-1.5 text-2xl font-semibold">
                        {flash.title}
                    </h3>
                    <p className="m-0 text-xs text-[#d8efea]">{flash.subtitle}</p>
                </div>
                <div className="px-[26px] py-[22px]">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        {flash.stats.map(([label, value]) => (
                            <div key={label} className="rounded-[13px] border border-[#dde5ea] p-3">
                                <span className="text-[9px] font-black uppercase text-[#70808a]">{label}</span>
                                <strong className="mt-1 block text-lg text-[#16313d]">{value}</strong>
                            </div>
                        ))}
                    </div>
                    <div className="mt-[15px] border-t border-[#dde5ea] pt-[15px]">
                        <h4 className="m-0 mb-1.5 text-[13px] font-semibold text-[#16313d]">Project Snapshot</h4>
                        <p className="m-0 text-[11.5px] leading-[1.55] text-[#70808a]">{flash.summary}</p>
                    </div>
                    <div className="mt-[15px] border-t border-[#dde5ea] pt-[15px]">
                        <h4 className="m-0 mb-1.5 text-[13px] font-semibold text-[#16313d]">Impact &amp; SDG Linkage</h4>
                        <p className="m-0 text-[11.5px] leading-[1.55] text-[#70808a]">{flash.impact}</p>
                    </div>
                    <div className="mt-[15px] border-t border-[#dde5ea] pt-[15px]">
                        <h4 className="m-0 mb-1.5 text-[13px] font-semibold text-[#16313d]">Verification</h4>
                        <p className="m-0 text-[11.5px] leading-[1.55] text-[#70808a]">{flash.verify}</p>
                    </div>
                    <div className="mt-[15px] flex justify-end">
                        <Link href={href} className="rounded-[9px] bg-[#174b43] px-2.5 py-2 text-[9.5px] font-black text-white">
                            Open record
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function StudentImpactPortfolioTable() {
    const [rows, setRows] = useState<PortfolioRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Area>("All Impact");
    const [year, setYear] = useState("all");
    const [sdg, setSdg] = useState("all");
    const [status, setStatus] = useState("all");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [openId, setOpenId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const area = new URLSearchParams(window.location.search).get("area");
        if (area && (AREAS as readonly string[]).includes(area)) {
            setFilter(area as Area);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const me = studentDisplayName();
            const [community, coursework, fyp, startup] = await Promise.all([
                authenticatedFetch("/api/v1/student/reports?limit=100", {}, { redirectToLogin: false })
                    .then((r) => (r?.ok ? r.json() : null))
                    .catch(() => null),
                authenticatedFetch("/api/v1/paths/course-projects", {}, { redirectToLogin: false })
                    .then((r) => (r?.ok ? r.json() : null))
                    .catch(() => null),
                authenticatedFetch("/api/v1/paths/fyp-thesis", {}, { redirectToLogin: false })
                    .then((r) => (r?.ok ? r.json() : null))
                    .catch(() => null),
                authenticatedFetch("/api/v1/paths/startup-business", {}, { redirectToLogin: false })
                    .then((r) => (r?.ok ? r.json() : null))
                    .catch(() => null),
            ]);
            if (cancelled) return;

            const out: PortfolioRow[] = [];

            const communityRows = Array.isArray(community?.data) ? community.data : [];
            for (const r of communityRows) {
                if (!isCommunityReportOnLiveDeck(r)) continue;
                const level = r.level as CommunityServiceLevel | undefined;
                const hours = Number(r.section1?.metrics?.total_verified_hours || r.hours || 0);
                const year = yearOf(r.created_at);
                const sdgs = sdgNumbers(r.sdgs);
                const uni = r.university || r.organization_name || "Community Service";
                out.push({
                    id: `community-${r.id}`,
                    title: r.project_title || "Community service",
                    meta: r.organization_name || r.university || "Community Service",
                    area: "Community Service",
                    areaLabel: "Community Service",
                    score: r.cii_score != null ? `Composite ${r.cii_score}` : "Approved ✓",
                    scoreKind: r.cii_score != null ? "community" : "ok",
                    badge: level || "Faculty Approved",
                    badgeKind: level ? "level" : "ok",
                    year,
                    dateIso: asIso(r.created_at),
                    sdgs,
                    href: `/dashboard/student/report?projectId=${encodeURIComponent(String(r.project_id || r.opportunity_id || r.id))}`,
                    flash: {
                        type: "COMMUNITY SERVICE",
                        title: r.project_title || "Community service",
                        subtitle: `${me} • ${uni} • ${year}`,
                        stats: [
                            ["Composite Indicator Score", r.cii_score != null ? String(r.cii_score) : "Approved"],
                            ["Community Service Level", level || "Faculty Approved"],
                            ["Verified Hours", hours ? `${Math.round(hours)}h` : "—"],
                        ],
                        summary:
                            r.story ||
                            r.executive_summary ||
                            "Approved Community Service report with verified field activity and measurable beneficiary outcomes.",
                        impact: sdgLine(sdgs),
                        verify: "Faculty verified • Partner verified • CIEL PK approved.",
                    },
                });
            }

            const courseworkRows = Array.isArray(coursework?.data) ? coursework.data : [];
            for (const r of courseworkRows) {
                if (!isFacultyApproved(r)) continue;
                const entry = r as CourseProjectEntry;
                const uni = entry.studentInfo?.universityName || entry.course || "Coursework";
                const year = yearOf(entry.facultyApprovalAt || entry.updatedAt || entry.createdAt);
                const sdgs = sdgNumbers(entry.sdgMapping?.entries || entry.sdgs);
                out.push({
                    id: `coursework-${entry.id}`,
                    title: entry.projectTitle || entry.course || "Coursework",
                    meta: uni,
                    area: "Coursework",
                    areaLabel: "Coursework",
                    score: "Approved ✓",
                    scoreKind: "ok",
                    badge: "Faculty Approved",
                    badgeKind: "ok",
                    year,
                    dateIso: asIso(entry.facultyApprovalAt || entry.updatedAt || entry.createdAt),
                    sdgs,
                    href: `/dashboard/student/paths/course-project?view=wall&open=${encodeURIComponent(String(entry.id))}`,
                    coursework: entry,
                    flash: {
                        type: "COURSEWORK",
                        title: entry.projectTitle || entry.course || "Coursework",
                        subtitle: `${me} • ${uni} • ${year}`,
                        stats: [
                            ["Status", "Verified"],
                            ["Impact Area", "Coursework"],
                            ["Faculty", "Approved"],
                        ],
                        summary: entry.projectDescription || "Faculty-approved sustainability-linked coursework.",
                        impact: sdgLine(sdgs),
                        verify: "Faculty verified and added to My Impact Portfolio.",
                    },
                });
            }

            const fypEntry = fyp?.data;
            if (fypEntry && isPathEntryApproved(fypEntry)) {
                const total = fypEntry.meritRibbon?.total;
                const year = yearOf(fypEntry.updatedAt || fypEntry.createdAt);
                const sdgs = sdgNumbers(fypEntry.sdgMapping?.entries);
                const school = fypEntry.projectInfo?.school || "FYP";
                out.push({
                    id: "fyp",
                    title: fypEntry.projectTitle || "Final Year Project",
                    meta: school,
                    area: "FYP",
                    areaLabel: "FYP",
                    score: total != null ? `AI Ranking ${Math.round(Number(total))}` : "Approved ✓",
                    scoreKind: total != null ? "ai" : "ok",
                    badge: "Verified",
                    badgeKind: "ok",
                    year,
                    dateIso: asIso(fypEntry.updatedAt || fypEntry.createdAt),
                    sdgs,
                    href: "/dashboard/student/paths/fyp-thesis?view=wall",
                    flash: {
                        type: "FYP / FINAL YEAR PROJECT",
                        title: fypEntry.projectTitle || "Final Year Project",
                        subtitle: `${me} • ${school} • ${year}`,
                        stats: [
                            ["AI Ranking", total != null ? String(Math.round(Number(total))) : "Verified"],
                            ["Status", "Verified"],
                            ["Impact Area", "FYP"],
                        ],
                        summary:
                            fypEntry.sectionSummaries?.project ||
                            fypEntry.sectionSummaries?.findings ||
                            "Final Year Project verified by faculty / supervisor and added to My Impact Portfolio.",
                        impact: sdgLine(sdgs),
                        verify: "Faculty / supervisor verified and added to My Impact Portfolio.",
                    },
                });
            }

            const startupEntry = startup?.data;
            if (startupEntry && isPathEntryApproved(startupEntry)) {
                const total = startupEntry.meritRibbon?.total;
                const investorReady = !!startupEntry.gates?.investmentReadyOk;
                const year = yearOf(startupEntry.updatedAt || startupEntry.createdAt);
                const sdgs = sdgNumbers(startupEntry.sdgMapping?.entries);
                const uni = startupEntry.academicSetup?.university || "Startup / Venture";
                out.push({
                    id: "startup",
                    title: startupEntry.ventureName || "Startup / Venture",
                    meta: uni,
                    area: "Startup",
                    areaLabel: "Startup / Venture",
                    score: total != null ? `AI Ranking ${Math.round(Number(total))}` : "Approved ✓",
                    scoreKind: total != null ? "ai" : "ok",
                    badge: investorReady ? "Investor Ready" : "Verified",
                    badgeKind: "ok",
                    year,
                    dateIso: asIso(startupEntry.updatedAt || startupEntry.createdAt),
                    sdgs,
                    href: "/dashboard/student/paths/startup-business?view=wall",
                    flash: {
                        type: "STARTUP / VENTURE",
                        title: startupEntry.ventureName || "Startup / Venture",
                        subtitle: `${me} • ${uni} • ${year}`,
                        stats: [
                            ["AI Ranking", total != null ? String(Math.round(Number(total))) : "Verified"],
                            ["Investor Status", investorReady ? "Investor Ready" : "Verified"],
                            ["Impact Area", "Startup"],
                        ],
                        summary:
                            startupEntry.description ||
                            startupEntry.ideaInfo?.pitch ||
                            "Verified venture record with approved academic review.",
                        impact: sdgLine(sdgs),
                        verify: investorReady
                            ? "Faculty verified • Student opted in for investor visibility."
                            : "Faculty verified and added to My Impact Portfolio.",
                    },
                });
            }

            setRows(out);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const years = useMemo(() => [...new Set(rows.map((r) => r.year).filter((y) => y !== "—"))].sort(), [rows]);
    const sdgs = useMemo(() => [...new Set(rows.flatMap((r) => r.sdgs))].sort((a, b) => a - b), [rows]);
    const statuses = useMemo(() => [...new Set(rows.map((r) => r.badge))].sort(), [rows]);

    const filtered = useMemo(() => {
        return rows.filter((r) => {
            if (!matchesArea(r, filter)) return false;
            if (year !== "all" && r.year !== year) return false;
            if (sdg !== "all" && !r.sdgs.includes(Number(sdg))) return false;
            if (status !== "all" && r.badge !== status) return false;
            if (from && r.dateIso && r.dateIso.slice(0, 10) < from) return false;
            if (to && r.dateIso && r.dateIso.slice(0, 10) > to) return false;
            return true;
        });
    }, [rows, filter, year, sdg, status, from, to]);

    const openRow = openId ? rows.find((r) => r.id === openId) : undefined;

    return (
        <section className="overflow-hidden rounded-[22px] border border-[#dde5ea] bg-white shadow-[0_8px_22px_rgba(24,52,64,.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-[#dde5ea] px-5 py-[18px]">
                <div>
                    <h3 className="m-0 text-lg font-semibold text-[#16313d]">My Impact Portfolio</h3>
                    <p className="mt-1 text-xs text-[#70808a]">
                        Your combined verified record across Community Service, Coursework, FYP and Startup / Venture.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {AREAS.map((a) => (
                        <button
                            key={a}
                            type="button"
                            onClick={() => setFilter(a)}
                            className={
                                filter === a
                                    ? "rounded-[18px] border border-[#153f47] bg-[#153f47] px-2.5 py-[7px] text-[11px] font-[850] text-white"
                                    : "rounded-[18px] border border-[#dde5ea] bg-white px-2.5 py-[7px] text-[11px] font-[850] text-[#5c6d76]"
                            }
                        >
                            {a}
                        </button>
                    ))}
                </div>
            </div>

            <div className="border-b border-[#dde5ea] bg-[#fbfcfd] p-[15px]">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="rounded-[10px] border border-[#dde5ea] bg-white p-2.5 text-[10.5px] text-[#16313d]"
                    >
                        <option value="all">All Academic Years</option>
                        {years.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                    <select
                        value={sdg}
                        onChange={(e) => setSdg(e.target.value)}
                        className="rounded-[10px] border border-[#dde5ea] bg-white p-2.5 text-[10.5px] text-[#16313d]"
                    >
                        <option value="all">All SDGs</option>
                        {sdgs.map((n) => (
                            <option key={n} value={String(n)}>
                                SDG {n}
                            </option>
                        ))}
                    </select>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="rounded-[10px] border border-[#dde5ea] bg-white p-2.5 text-[10.5px] text-[#16313d]"
                    >
                        <option value="all">All Statuses</option>
                        {statuses.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="rounded-[10px] border border-[#dde5ea] bg-white p-2.5 text-[10.5px] text-[#16313d]"
                    />
                    <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="rounded-[10px] border border-[#dde5ea] bg-white p-2.5 text-[10.5px] text-[#16313d]"
                    />
                </div>
            </div>

            {loading ? (
                <div className="py-10 text-center text-[#7a919a]">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading your portfolio…
                </div>
            ) : filtered.length === 0 ? (
                <div className="px-5 py-10 text-center text-[11px] text-[#7a919a]">
                    Nothing approved here yet — approved work from any impact area lands on this table automatically.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <div className="grid min-w-[900px] grid-cols-[1.6fr_.8fr_1fr_.8fr_.8fr_90px] gap-2.5 bg-[#f8fafb] px-3.5 py-3 text-[9px] font-black uppercase tracking-[0.06em] text-[#74828a]">
                        <div>Project</div>
                        <div>Area</div>
                        <div>Score / Ranking</div>
                        <div>Badge / Status</div>
                        <div>Year</div>
                        <div />
                    </div>
                    {filtered.map((r) => (
                        <div
                            key={r.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setOpenId(r.id)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setOpenId(r.id);
                                }
                            }}
                            className="grid min-w-[900px] cursor-pointer grid-cols-[1.6fr_.8fr_1fr_.8fr_.8fr_90px] items-center gap-2.5 border-b border-[#dde5ea] px-3.5 py-3 hover:bg-[#f8fbfb]"
                        >
                            <div>
                                <div className="text-xs font-black text-[#16313d]">{r.title}</div>
                                <div className="mt-0.5 text-[9.5px] text-[#70808a]">{r.meta}</div>
                            </div>
                            <div className="text-[12px] text-[#16313d]">{r.areaLabel}</div>
                            <div>
                                <span className={scoreClass(r.scoreKind)}>{r.score}</span>
                            </div>
                            <div>
                                <span className={badgeClass(r.badgeKind)}>{r.badge}</span>
                            </div>
                            <div className="text-[12px] text-[#16313d]">{r.year}</div>
                            <div>
                                <button
                                    type="button"
                                    className="rounded-[9px] bg-[#174b43] px-2.5 py-2 text-[9.5px] font-black text-white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenId(r.id);
                                    }}
                                >
                                    Open
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {openRow?.coursework ? (
                <CourseworkFlashCardModal entry={openRow.coursework} onClose={() => setOpenId(null)} />
            ) : openRow ? (
                <StudentPortfolioFlashModal flash={openRow.flash} href={openRow.href} onClose={() => setOpenId(null)} />
            ) : null}
        </section>
    );
}
