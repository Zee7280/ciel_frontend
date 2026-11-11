"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { recordIdLabel } from "@/utils/recordId";
import "./quick-impact-flashcard.css";

/** One approved Quick Community Impact activity that names this organisation (counts only: no student names or contacts). */
type PartnerImpactRow = {
    id: string;
    publicId?: string | null;
    title: string;
    activityType: string;
    date: string;
    venue: string;
    summary: string;
    hours: number;
    students: number;
    peopleReached: number | null;
    peopleTarget: number | null;
    evidenceCount: number;
    sdg: number | null;
    sdgName: string | null;
    sdgColor: string | null;
    /** Every goal, the main one first (an older API sends only the main one above). */
    sdgs?: { n: number; name: string; color: string; main: boolean }[];
    host: string | null;
    partners: string[];
};

/**
 * "Quick Community Impact" cards on a partner's My Impact Wall: the approved quick activities that
 * named the organisation's email as host or partner. It renders nothing when there are none (or the
 * request fails), so the rest of the wall is unaffected.
 */
export default function QuickImpactPartnerWall() {
    const [rows, setRows] = useState<PartnerImpactRow[]>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await authenticatedFetch("/api/v1/partner/quick-impact", {}, { redirectToLogin: false });
                if (!res?.ok) return;
                const body = await res.json().catch(() => null);
                if (!cancelled && body?.success && Array.isArray(body.data)) setRows(body.data as PartnerImpactRow[]);
            } catch {
                /* the wall simply shows its other records */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (!rows.length) return null;

    return (
        <section className="mt-8" aria-label="Quick Community Impact">
            <h3 className="text-base font-extrabold text-[#155a8b]">Quick Community Impact</h3>
            <p className="mt-0.5 text-xs text-[#55758f]">Verified quick activities hosted with your organization.</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {rows.map((r) => {
                    const hosts = [r.host, ...r.partners].filter(Boolean).join(" · ");
                    const goals = r.sdgs ?? (r.sdg ? [{ n: r.sdg, name: r.sdgName ?? "", color: r.sdgColor ?? "#607d8b", main: true }] : []);
                    return (
                        <article key={r.id} className="qif-card qif-card--fill">
                            <div className="qif-top">
                                <div className="qif-eyebrow">CIEL PK · Quick Community Impact · Published &amp; Verified</div>
                                <h4 className="qif-title">{r.title}</h4>
                                <p className="qif-sub">
                                    {[r.venue, r.date, r.activityType].filter(Boolean).join(" · ")}
                                </p>
                            </div>
                            <div className="qif-metrics">
                                <div>
                                    <small>Verified hours</small>
                                    <b>{r.hours}h</b>
                                </div>
                                <div>
                                    <small>Students</small>
                                    <b>{r.students}</b>
                                </div>
                                <div>
                                    <small>People reached</small>
                                    <b>{r.peopleReached ?? "—"}</b>
                                </div>
                                <div>
                                    <small>Evidence files</small>
                                    <b>{r.evidenceCount}</b>
                                </div>
                            </div>
                            <div className="qif-body">
                                <h4>{goals.length > 1 ? "Sustainable Development Goals" : "Sustainable Development Goal"}</h4>
                                {goals.length ? (
                                    goals.map((g) => (
                                        <span key={g.n} className="qif-sdg" style={{ background: g.color }}>
                                            SDG {g.n} · {g.name}
                                        </span>
                                    ))
                                ) : (
                                    <p>SDG not selected.</p>
                                )}
                                {r.peopleTarget ? (
                                    <>
                                        <h4>Reach against target</h4>
                                        <p>
                                            {r.peopleReached ?? 0} of {r.peopleTarget} people reached ·{" "}
                                            {Math.round(((r.peopleReached ?? 0) / r.peopleTarget) * 100)}%
                                        </p>
                                    </>
                                ) : null}
                                <h4>What happened</h4>
                                <p>{r.summary || "No activity summary was added."}</p>
                                {hosts ? (
                                    <>
                                        <h4>Host / partners</h4>
                                        <p>{hosts}</p>
                                    </>
                                ) : null}
                            </div>
                            <div className="qif-footer">
                                <span>✓ Faculty verified · ✓ CIEL PK published</span>
                                <b>Ref {recordIdLabel(r.publicId, r.id)}</b>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
