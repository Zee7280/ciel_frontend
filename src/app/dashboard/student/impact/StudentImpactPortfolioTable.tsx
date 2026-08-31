"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { isCommunityReportOnLiveDeck, isPathEntryApproved } from "@/utils/reviewQueue";
import { isFacultyApproved } from "@/utils/courseworkSectionReview";

const AREAS = ["All Impact", "Community Service", "Coursework", "FYP", "Startup"] as const;
type Area = (typeof AREAS)[number];

type PortfolioRow = {
    id: string;
    title: string;
    area: Exclude<Area, "All Impact">;
    score: string;
    badge: string;
    year: string;
    href: string;
};

function yearOf(iso?: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : String(d.getFullYear());
}

export default function StudentImpactPortfolioTable() {
    const [rows, setRows] = useState<PortfolioRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Area>("All Impact");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
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
                out.push({
                    id: `community-${r.id}`,
                    title: r.project_title || "Community service",
                    area: "Community Service",
                    score: r.cii_score != null ? `Composite ${r.cii_score}` : "Approved ✓",
                    badge: r.level ? String(r.level).replace(/_/g, " ") : "Faculty Approved",
                    year: yearOf(r.created_at),
                    href: `/dashboard/student/report?projectId=${encodeURIComponent(String(r.project_id || r.opportunity_id || r.id))}`,
                });
            }

            const courseworkRows = Array.isArray(coursework?.data) ? coursework.data : [];
            for (const r of courseworkRows) {
                if (!isFacultyApproved(r)) continue;
                out.push({
                    id: `coursework-${r.id}`,
                    title: r.projectTitle || r.course || "Coursework",
                    area: "Coursework",
                    score: "Approved ✓",
                    badge: "Faculty Approved",
                    year: yearOf(r.facultyApprovalAt || r.updatedAt || r.createdAt),
                    href: "/dashboard/student/paths/course-project?view=wall",
                });
            }

            const fypEntry = fyp?.data;
            if (fypEntry && isPathEntryApproved(fypEntry)) {
                const rank = fypEntry.meritRibbon?.rank;
                out.push({
                    id: "fyp",
                    title: fypEntry.projectTitle || "Final Year Project",
                    area: "FYP",
                    score: rank ? `AI Ranking ${rank}` : "Approved ✓",
                    badge: fypEntry.meritRibbon?.badgeLevel || "Verified",
                    year: yearOf(fypEntry.updatedAt || fypEntry.createdAt),
                    href: "/dashboard/student/paths/fyp-thesis?view=wall",
                });
            }

            const startupEntry = startup?.data;
            if (startupEntry && isPathEntryApproved(startupEntry)) {
                const rank = startupEntry.meritRibbon?.rank;
                out.push({
                    id: "startup",
                    title: startupEntry.ventureName || "Startup / Venture",
                    area: "Startup",
                    score: rank ? `AI Ranking ${rank}` : "Approved ✓",
                    badge: startupEntry.meritRibbon?.badgeLevel || "Verified",
                    year: yearOf(startupEntry.updatedAt || startupEntry.createdAt),
                    href: "/dashboard/student/paths/startup-business?view=wall",
                });
            }

            setRows(out);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const filtered = useMemo(
        () => (filter === "All Impact" ? rows : rows.filter((r) => r.area === filter)),
        [rows, filter],
    );

    return (
        <div className="rounded-[20px] border border-[#dcebee] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f3] px-5 py-4">
                <div>
                    <h3 className="text-[13px] font-extrabold text-[#0d2b33]">My Impact Portfolio</h3>
                    <p className="mt-0.5 text-[10.5px] text-[#7a919a]">
                        Your combined verified record across Community Service, Coursework, FYP and Startup / Venture.
                    </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {AREAS.map((a) => (
                        <button
                            key={a}
                            type="button"
                            onClick={() => setFilter(a)}
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-extrabold ${
                                filter === a
                                    ? "border-[#0d2b33] bg-[#0d2b33] text-white"
                                    : "border-[#dcebee] bg-white text-[#4c5f66]"
                            }`}
                        >
                            {a}
                        </button>
                    ))}
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
                    <table className="w-full text-left text-[11px]">
                        <thead>
                            <tr className="border-b border-[#eef2f3] text-[8.5px] font-extrabold uppercase tracking-wide text-[#8e999e]">
                                <th className="px-5 py-2.5">Project</th>
                                <th className="px-3 py-2.5">Area</th>
                                <th className="px-3 py-2.5">Score / Ranking</th>
                                <th className="px-3 py-2.5">Badge / Status</th>
                                <th className="px-3 py-2.5">Year</th>
                                <th className="px-3 py-2.5" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r) => (
                                <tr key={r.id} className="border-b border-[#f3f6f7] last:border-0">
                                    <td className="px-5 py-3 font-bold text-[#0d2b33]">{r.title}</td>
                                    <td className="px-3 py-3 text-[#4c5f66]">{r.area}</td>
                                    <td className="px-3 py-3">
                                        <span className="rounded-full bg-[#e6f6f4] px-2 py-0.5 text-[9.5px] font-extrabold text-[#0e7d74]">{r.score}</span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className="rounded-full bg-[#fbf0d7] px-2 py-0.5 text-[9.5px] font-extrabold capitalize text-[#8a5a06]">{r.badge}</span>
                                    </td>
                                    <td className="px-3 py-3 text-[#4c5f66]">{r.year}</td>
                                    <td className="px-3 py-3 text-right">
                                        <Link href={r.href} className="rounded-full bg-[#0d2b33] px-3 py-1.5 text-[9.5px] font-extrabold text-white">
                                            Open
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
