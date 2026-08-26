"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { CommunityCrumb, HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { BADGE_CLASS, BADGE_ICON, type CommunityAwardBadge } from "@/utils/communityAwardModel";
import { isCommunityReportOnLiveDeck } from "@/utils/reviewQueue";

type WallRow = {
    id: string;
    project_title?: string;
    organization_name?: string;
    faculty_status?: string;
    status?: string;
    awardBadges?: CommunityAwardBadge[];
    cii_score?: number | null;
    section1?: { metrics?: { total_verified_hours?: number } };
};

export default function CommunityImpactWall() {
    const [rows, setRows] = useState<WallRow[]>([]);
    const [notes, setNotes] = useState<{ id: number; title: string; message: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/student/reports?limit=100", {}, { redirectToLogin: false }).then((r) => (r?.ok ? r.json() : null)),
            authenticatedFetch("/api/v1/notifications", {}, { redirectToLogin: false }).then((r) => (r?.ok ? r.json() : null)),
        ]).then(([reports, notifs]) => {
            if (cancelled) return;
            const list = Array.isArray(reports?.data) ? reports.data : [];
            setRows(
                list.filter((r: WallRow) => isCommunityReportOnLiveDeck(r)),
            );
            const inbox = Array.isArray(notifs?.data) ? notifs.data : [];
            setNotes(
                inbox
                    .filter((n: { title?: string }) => /ranked|honour|medal|faculty choice|best project/i.test(String(n.title || "")))
                    .slice(0, 8)
                    .map((n: { id: number; title: string; message: string }) => ({ id: n.id, title: n.title, message: n.message })),
            );
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const badges = rows.flatMap((r) => r.awardBadges || []);

    return (
        <div className="mx-auto max-w-[980px] pb-16">
            <CommunityCrumb role="Student" view="wall" />
            <div className="mt-3">
                <HubBackButton href="/dashboard/student/paths/community-service" label="← Back to Community Service hub" />
            </div>

            <div className="mt-4 rounded-[17px] border border-[#dcebee] bg-white px-4 py-4">
                <p className="text-[9px] font-extrabold tracking-[0.12em] text-[#0e7d74]">🏅 MY BADGE SHELF — AWARDED BY OTHERS, NEVER SELF-CLAIMED</p>
                <p className="mt-1 text-[9.5px] text-[#7a919a]">Faculty, partner, university and CIEL PK each grant badges by running the award model.</p>
                {loading ? (
                    <p className="mt-3 text-sm text-slate-500">Loading…</p>
                ) : badges.length === 0 ? (
                    <p className="mt-3 rounded-[14px] border-[1.5px] border-dashed border-[#cbe7e3] bg-[#fbfefd] px-4 py-3 text-[10px] leading-relaxed text-[#7a919a]">
                        🕊️ No badges yet. When faculty, a partner, your university or CIEL PK run the award model, they land here.
                    </p>
                ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {badges.map((b, i) => (
                            <div key={`${b.kind}-${b.at}-${i}`} className={`max-w-[250px] rounded-[13px] px-3 py-2 text-[9px] font-extrabold text-white ${BADGE_CLASS[b.kind]}`}>
                                {BADGE_ICON[b.kind]} {b.label}
                                <span className="mt-0.5 block text-[7px] font-bold opacity-85">
                                    Rank #{b.rank} of {b.of} · {b.score}/100
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-3 rounded-[17px] border border-[#dcebee] bg-white px-4 py-4">
                <p className="text-[9px] font-extrabold tracking-[0.12em] text-[#0e7d74]">⭐ APPROVED FLASH CARDS — HANGING FOREVER</p>
                {rows.length === 0 ? (
                    <p className="mt-3 text-[10px] text-[#7a919a]">Approved community-service reports will hang here.</p>
                ) : (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {rows.map((r) => (
                            <div key={r.id} className="overflow-hidden rounded-[17px] border border-[#dcebee] bg-white">
                                <div className="relative bg-[linear-gradient(130deg,#04252b,#0e5f63_55%,#12a5a0_120%)] px-4 py-3 text-white">
                                    <span className="absolute right-2.5 top-2.5 rounded-full bg-[linear-gradient(90deg,#6d28d9,#a78bfa)] px-2 py-0.5 text-[8px] font-extrabold">
                                        {r.cii_score != null ? `CII ${r.cii_score}` : "LIVE"}
                                    </span>
                                    <div className="pr-16 text-[7px] font-extrabold tracking-[0.13em] text-[#99f6e4]">
                                        {(r.organization_name || "Community service").toUpperCase()}
                                    </div>
                                    <b className="mt-1 block text-[11.5px] leading-snug">{r.project_title || "Community service"}</b>
                                    <div className="mt-0.5 text-[9px] text-[#cdf5f0]">
                                        {r.section1?.metrics?.total_verified_hours ? `${r.section1.metrics.total_verified_hours} verified hrs` : "Faculty-approved flash card"}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1 px-3 py-2">
                                    <span className="rounded-full bg-[#e6f6f4] px-2 py-0.5 text-[7px] font-extrabold text-[#0e7d74]">✅ FACULTY-APPROVED</span>
                                    {r.cii_score != null ? (
                                        <span className="rounded-full bg-[#f1ebfd] px-2 py-0.5 text-[7px] font-extrabold text-[#6d28d9]">🧠 CII {r.cii_score}/100</span>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-3 rounded-[17px] border border-[#dcebee] bg-white px-4 py-4">
                <p className="text-[9px] font-extrabold tracking-[0.12em] text-[#0e7d74]">🔔 AWARD NOTIFICATIONS</p>
                {notes.length === 0 ? (
                    <p className="mt-2 text-[10px] text-[#7a919a]">Rank notifications appear here the moment any stakeholder runs their model.</p>
                ) : (
                    notes.map((n) => (
                        <div key={n.id} className="border-b border-dashed border-[#dcebee] py-2 text-[10px] leading-relaxed last:border-0">
                            <b>{n.title}</b>
                            <p className="text-[#4c5f66]">{n.message}</p>
                        </div>
                    ))
                )}
                <Link href="/dashboard/student/notifications" className="mt-2 inline-block text-[11px] font-extrabold text-[#0e7d74] hover:underline">
                    Open full inbox →
                </Link>
            </div>
        </div>
    );
}
