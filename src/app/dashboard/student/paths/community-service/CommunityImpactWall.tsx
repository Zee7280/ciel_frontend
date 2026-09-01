"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import type { ActiveProject } from "@/app/dashboard/student/types";
import { MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import { type CommunityAwardBadge, type CommunityServiceLevel } from "@/utils/communityAwardModel";
import { isCommunityReportOnLiveDeck } from "@/utils/reviewQueue";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { sdgData } from "@/utils/sdgData";

const HUB = "/dashboard/student/paths/community-service";

type WallRow = {
    id: string;
    project_id?: string | null;
    opportunity_id?: string | null;
    project_title?: string;
    organization_name?: string;
    university?: string;
    faculty_status?: string;
    status?: string;
    awardBadges?: CommunityAwardBadge[];
    cii_score?: number | null;
    level?: CommunityServiceLevel;
    section1?: { metrics?: { total_verified_hours?: number } };
    sdgs?: unknown;
    story?: string;
    executive_summary?: string;
    hours?: number;
    created_at?: string;
    impact_verify_url?: string | null;
    actions?: { certificate_url?: string | null; pdf_url?: string | null; evidence_url?: string | null };
};

type FlashState = {
    title: string;
    subtitle: string;
    stats: [string, string][];
    summary: string;
    impact: string;
    verify: string;
    pdf?: string | null;
    evidence?: string | null;
    certificate?: string | null;
    qr?: string | null;
};

function yearOf(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : String(d.getFullYear());
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

function sdgShort(nums: number[]): string {
    if (!nums.length) return "—";
    return nums.map((n) => `SDG ${n}`).join(" + ");
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

function studentName(): string {
    const user = readStoredCurrentUser();
    return typeof user?.name === "string" && user.name.trim() ? user.name.trim() : "Student";
}

function openOrToast(url: string | null | undefined, empty: string) {
    if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
    }
    toast.message(empty);
}

function CommunityFlashModal({ flash, onClose }: { flash: FlashState; onClose: () => void }) {
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
                aria-labelledby="cs-flash-title"
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
                        COMMUNITY SERVICE
                    </span>
                    <h3 id="cs-flash-title" className="mb-1.5 mt-1.5 text-2xl font-semibold">
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
                    <div className="mt-[15px] border-t border-[#dde5ea] pt-[15px]">
                        <div className="flex flex-wrap gap-1.5">
                            <button type="button" className="rounded-[9px] bg-[#f0f4f5] px-2.5 py-2 text-[9px] font-black text-[#34505b]" onClick={() => openOrToast(flash.pdf, "PDF is not attached yet")}>
                                PDF Report
                            </button>
                            <button type="button" className="rounded-[9px] bg-[#f0f4f5] px-2.5 py-2 text-[9px] font-black text-[#34505b]" onClick={() => openOrToast(flash.evidence, "Evidence files open from the report")}>
                                JPEG Evidence
                            </button>
                            <button type="button" className="rounded-[9px] bg-[#f0f4f5] px-2.5 py-2 text-[9px] font-black text-[#34505b]" onClick={() => openOrToast(flash.certificate, "Certificate is not ready yet")}>
                                Certificate
                            </button>
                            <button type="button" className="rounded-[9px] bg-[#f0f4f5] px-2.5 py-2 text-[9px] font-black text-[#34505b]" onClick={() => openOrToast(flash.qr, "QR verification is not issued yet")}>
                                QR Code
                            </button>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            <span className="rounded-xl bg-[#e8f5ef] px-2 py-1 text-[8.5px] font-black text-[#1d765d]">Faculty Approved</span>
                            <span className="rounded-xl bg-[#e8f5ef] px-2 py-1 text-[8.5px] font-black text-[#1d765d]">Partner Verified</span>
                            <span className="rounded-xl bg-[#e8f5ef] px-2 py-1 text-[8.5px] font-black text-[#1d765d]">CIEL PK Approved</span>
                        </div>
                        <p className="mt-2 text-[10px] text-[#70808a]">This verified record is also stored automatically in My Impact Portfolio.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CommunityImpactWall({
    projects = [],
    verifiedHours = 0,
    wallCount = 0,
    completion = 0,
}: {
    projects?: ActiveProject[];
    verifiedHours?: number;
    wallCount?: number;
    completion?: number;
}) {
    const [rows, setRows] = useState<WallRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [flash, setFlash] = useState<FlashState | null>(null);

    useEffect(() => {
        let cancelled = false;
        authenticatedFetch("/api/v1/student/reports?limit=100", {}, { redirectToLogin: false })
            .then((r) => (r?.ok ? r.json() : null))
            .then((reports) => {
                if (cancelled) return;
                const list = Array.isArray(reports?.data) ? reports.data : [];
                setRows(list.filter((r: WallRow) => isCommunityReportOnLiveDeck(r)));
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const openFlash = (r: WallRow) => {
        const hours = Number(r.section1?.metrics?.total_verified_hours || r.hours || 0);
        const year = yearOf(r.created_at);
        const sdgs = sdgNumbers(r.sdgs);
        const uni = r.university || r.organization_name || "Community Service";
        const reportHref = r.project_id || r.opportunity_id ? `/dashboard/student/report?projectId=${encodeURIComponent(String(r.project_id || r.opportunity_id))}` : null;
        setFlash({
            title: r.project_title || "Community service",
            subtitle: `${studentName()} • ${uni}${year ? ` • ${year}` : ""}`,
            stats: [
                ["Composite Indicator Score", r.cii_score != null ? String(r.cii_score) : "Approved"],
                ["Community Service Level", r.level || "Faculty Approved"],
                ["Verified Hours", hours ? `${Math.round(hours)}h` : "—"],
            ],
            summary:
                r.story ||
                r.executive_summary ||
                "Approved Community Service report with verified field activity.",
            impact: sdgLine(sdgs),
            verify: "Faculty verified. This record appears on My Community Service Impact and My Impact Portfolio.",
            pdf: r.actions?.pdf_url,
            evidence: r.actions?.evidence_url || reportHref,
            certificate: r.actions?.certificate_url,
            qr: r.impact_verify_url,
        });
    };

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <MockupHero
                title="Community Service"
                subtitle="Create opportunities, save drafts, follow Faculty → Partner → CIEL PK approvals, complete your 9-section report and build a verified Community Service impact record."
                stats={[
                    { value: String(projects.length), label: "Active Records" },
                    { value: verifiedHours ? `${Math.round(verifiedHours)}h` : "0h", label: "Verified Service" },
                    { value: String(wallCount || rows.length), label: "Impact Portfolio" },
                ]}
                rightStat={{ value: `${completion}%`, label: "overall current-work completion" }}
            />

            <MockupSectionHead
                title="My Community Service Impact"
                subtitle="Approved Community Service reports shown as verified impact flashcards."
                action={
                    <Link href={HUB} className="border-0 bg-transparent text-xs font-black text-[#087c75] hover:underline">
                        ← Back to module buttons
                    </Link>
                }
            />

            {loading ? (
                <p className="py-10 text-center text-sm text-[#7a919a]">Loading verified records…</p>
            ) : rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#cbe7e3] bg-[#fbfefd] px-5 py-10 text-center text-[12px] text-[#7a919a]">
                    Only approved records appear here. When Faculty signs off a Community Service report, its flashcard lands here and in My Impact Portfolio.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                    {rows.map((r) => {
                        const hours = Number(r.section1?.metrics?.total_verified_hours || r.hours || 0);
                        const year = yearOf(r.created_at);
                        const sdgs = sdgNumbers(r.sdgs);
                        const uni = r.university || r.organization_name || "Community Service";
                        const reportHref =
                            r.project_id || r.opportunity_id
                                ? `/dashboard/student/report?projectId=${encodeURIComponent(String(r.project_id || r.opportunity_id))}`
                                : null;
                        const extraBadges = r.awardBadges || [];
                        return (
                            <article key={r.id} className="overflow-hidden rounded-[20px] border border-[#dde5ea] bg-white shadow-[0_7px_18px_rgba(23,49,57,.05)]">
                                <div className="relative bg-[linear-gradient(135deg,#0e4d4e,#117669)] px-[18px] py-[17px] text-white">
                                    <span className="absolute right-3.5 top-3.5 rounded-[14px] border border-white/25 bg-white/12 px-2 py-1 text-[8.5px] font-[950]">
                                        ✓ VERIFIED
                                    </span>
                                    <p className="text-[8.5px] font-black tracking-[0.08em] text-[#9fe2d7]">COMMUNITY SERVICE IMPACT</p>
                                    <h4 className="mt-1.5 text-[17px] font-semibold leading-tight">{r.project_title || "Community service"}</h4>
                                    <p className="mt-1 text-[10px] text-[#d7eeea]">
                                        {[uni, year, hours ? `${Math.round(hours)} verified hours` : null].filter(Boolean).join(" • ")}
                                    </p>
                                </div>
                                <div className="px-[18px] py-[15px]">
                                    <div className="grid grid-cols-3 gap-1.5">
                                        <div className="rounded-[11px] border border-[#dde5ea] p-2">
                                            <span className="block text-[7.8px] font-black uppercase text-[#70808a]">Composite Score</span>
                                            <strong className="mt-0.5 block text-sm text-[#16313d]">{r.cii_score != null ? r.cii_score : "Approved"}</strong>
                                        </div>
                                        <div className="rounded-[11px] border border-[#dde5ea] p-2">
                                            <span className="block text-[7.8px] font-black uppercase text-[#70808a]">CIEL PK Level</span>
                                            <strong className="mt-0.5 block text-sm text-[#16313d]">{r.level || "Approved"}</strong>
                                        </div>
                                        <div className="rounded-[11px] border border-[#dde5ea] p-2">
                                            <span className="block text-[7.8px] font-black uppercase text-[#70808a]">SDG Link</span>
                                            <strong className="mt-0.5 block text-[11px] text-[#16313d]">{sdgShort(sdgs)}</strong>
                                        </div>
                                    </div>
                                    <p className="my-2.5 text-[10px] leading-[1.48] text-[#63747c]">
                                        {r.story ||
                                            r.executive_summary ||
                                            "Approved Community Service report with verified field activity."}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="rounded-xl bg-[#e8f5ef] px-2 py-1 text-[8.5px] font-black text-[#1d765d]">✓ Faculty Approved</span>
                                        <span className="rounded-xl bg-[#edf4fb] px-2 py-1 text-[8.5px] font-black text-[#376d9f]">
                                            {r.impact_verify_url ? "QR Verified" : "Verified"}
                                        </span>
                                        <span className="rounded-xl bg-[#f8f2e7] px-2 py-1 text-[8.5px] font-black text-[#765b25]">
                                            {extraBadges[0]?.label || r.level || "Verified Impact"}
                                        </span>
                                    </div>
                                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[#dde5ea] pt-2.5">
                                        <button type="button" onClick={() => openFlash(r)} className="rounded-[9px] bg-[#174b43] px-2.5 py-1.5 text-[9px] font-black text-white">
                                            Open Flashcard
                                        </button>
                                        <button type="button" onClick={() => openOrToast(r.actions?.pdf_url, "PDF is not attached yet")} className="rounded-[9px] bg-[#f0f4f5] px-2.5 py-1.5 text-[9px] font-black text-[#34505b]">
                                            PDF Report
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openOrToast(r.actions?.evidence_url || reportHref, "Open the report to view evidence")}
                                            className="rounded-[9px] bg-[#f0f4f5] px-2.5 py-1.5 text-[9px] font-black text-[#34505b]"
                                        >
                                            JPEG Evidence
                                        </button>
                                        <button type="button" onClick={() => openOrToast(r.actions?.certificate_url, "Certificate is not ready yet")} className="rounded-[9px] bg-[#f0f4f5] px-2.5 py-1.5 text-[9px] font-black text-[#34505b]">
                                            Certificate
                                        </button>
                                        <button type="button" onClick={() => openOrToast(r.impact_verify_url, "QR verification is not issued yet")} className="rounded-[9px] bg-[#f0f4f5] px-2.5 py-1.5 text-[9px] font-black text-[#34505b]">
                                            QR Code
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {flash ? <CommunityFlashModal flash={flash} onClose={() => setFlash(null)} /> : null}
        </div>
    );
}
