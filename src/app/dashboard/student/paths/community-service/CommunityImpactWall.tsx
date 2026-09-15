"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import type { ActiveProject } from "@/app/dashboard/student/types";
import { MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import { CommunityCrumb } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { type CommunityAwardBadge, type CommunityServiceLevel } from "@/utils/communityAwardModel";
import { isCommunityReportOnLiveDeck, isCommunityReportRejected } from "@/utils/reviewQueue";
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
    // Phase 3: CII v2 AI Analysis data for two-column display
    ciiV2?: {
        final?: number;
        aiRecommendedScore?: number;
        facultyApprovedScore?: number;
        level?: { level: number; name: string; quality: string };
        sections?: Array<{
            id: number;
            title: string;
            score: number;
            weight: number;
            good?: string;
            limit?: string;
        }>;
        bonus?: { effort: number; resources: number; partners: number; total: number };
        integrityPenalty?: number;
        studentFeedback?: {
            opening_praise?: string;
            why_score_is_high_or_low?: string;
            encouragement?: string;
            five_specific_actions?: string[];
        };
        redFlags?: Array<{ flag: string; severity?: string }>;
    } | null;
    ciiV2Lock?: {
        locked?: boolean;
        lockedAt?: string;
        aiRecommendedScore?: number;
        facultyApprovedScore?: number;
        scoreWasAdjusted?: boolean;
        scoreAdjustmentReason?: string;
        facultyNote?: string;
    } | null;
    // Phase 4: Independent AI analyses from My Impact Wall
    independentAiAnalyses?: Array<{
        id: string;
        runAt: string;
        runByUserId: string;
        runByRole: "faculty" | "university" | "ciel_admin";
        runByName?: string;
        score: number;
        level?: { level: number; name: string; quality: string };
        feedback?: {
            opening_praise?: string;
            why_score_is_high_or_low?: string;
            encouragement?: string;
            five_specific_actions?: string[];
        };
        note?: string;
    }> | null;
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
    // Phase 3: AI Analysis data for two-column display
    aiAnalysis?: {
        aiScore: number | null;
        facultyScore: number | null;
        scoreWasAdjusted: boolean;
        scoreAdjustmentReason?: string;
        levelName: string;
        levelQuality: string;
        sections: Array<{
            id: number;
            title: string;
            score: number;
            weight: number;
            good?: string;
            limit?: string;
        }>;
        bonus: { effort: number; resources: number; partners: number; total: number };
        integrityPenalty: number;
        feedback?: {
            praise?: string;
            summary?: string;
            encouragement?: string;
            actions?: string[];
        };
        redFlags?: Array<{ flag: string; severity?: string }>;
        lockedAt?: string;
        facultyNote?: string;
    } | null;
    // Phase 4: Independent AI analyses (do not overwrite faculty-approved)
    independentAnalyses?: Array<{
        id: string;
        runAt: string;
        runByName?: string;
        runByRole: string;
        score: number;
        levelName?: string;
        note?: string;
    }>;
    reportId?: string;
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

/**
 * Phase 3: Two-Column Modal — Flash Card | AI Analysis & Score
 * 
 * When student opens the record, they see the same two-column presentation
 * that faculty used for review. Student can view but cannot edit.
 */
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

    const ai = flash.aiAnalysis;
    const hasTwoColumns = Boolean(ai);

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center overflow-auto bg-[rgba(7,28,35,.58)] p-4 sm:p-6"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="cs-flash-title"
                className={`max-h-[95vh] overflow-auto rounded-[26px] bg-white shadow-[0_28px_70px_rgba(0,0,0,.24)] ${
                    hasTwoColumns ? "w-[min(1100px,96vw)]" : "w-[min(760px,96vw)]"
                }`}
            >
                {/* Header */}
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
                        VERIFIED COMMUNITY SERVICE RECORD
                    </span>
                    <h3 id="cs-flash-title" className="mb-1.5 mt-1.5 text-2xl font-semibold">
                        {flash.title}
                    </h3>
                    <p className="m-0 text-xs text-[#d8efea]">{flash.subtitle}</p>
                </div>

                {/* Body: Two-column layout when AI analysis exists */}
                <div className={`grid gap-5 p-5 sm:p-[26px] ${hasTwoColumns ? "lg:grid-cols-2" : ""}`}>
                    {/* LEFT COLUMN: Flash Card */}
                    <div className="min-w-0">
                        <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.1em] text-[#70808a]">
                            Flash Card
                        </h4>
                        <div className="rounded-[16px] border border-[#dde5ea] bg-[#fbfcfe] p-4">
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                {flash.stats.map(([label, value]) => (
                                    <div key={label} className="rounded-[11px] border border-[#dde5ea] bg-white p-2.5">
                                        <span className="text-[8px] font-black uppercase text-[#70808a]">{label}</span>
                                        <strong className="mt-1 block text-base text-[#16313d]">{value}</strong>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 border-t border-[#dde5ea] pt-4">
                                <h5 className="m-0 mb-1.5 text-[12px] font-semibold text-[#16313d]">Project Snapshot</h5>
                                <p className="m-0 text-[11px] leading-[1.55] text-[#70808a]">{flash.summary}</p>
                            </div>
                            <div className="mt-3 border-t border-[#dde5ea] pt-3">
                                <h5 className="m-0 mb-1.5 text-[12px] font-semibold text-[#16313d]">Impact &amp; SDG Linkage</h5>
                                <p className="m-0 text-[11px] leading-[1.55] text-[#70808a]">{flash.impact}</p>
                            </div>
                            <div className="mt-3 border-t border-[#dde5ea] pt-3">
                                <h5 className="m-0 mb-1.5 text-[12px] font-semibold text-[#16313d]">Verification Status</h5>
                                <p className="m-0 text-[11px] leading-[1.55] text-[#70808a]">{flash.verify}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span className="rounded-lg bg-[#e8f5ef] px-2 py-1 text-[8px] font-black text-[#1d765d]">✓ Faculty Approved</span>
                                    <span className="rounded-lg bg-[#e8f5ef] px-2 py-1 text-[8px] font-black text-[#1d765d]">✓ CIEL PK Verified</span>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#dde5ea] pt-3">
                                <button type="button" className="rounded-[8px] bg-[#f0f4f5] px-2.5 py-1.5 text-[9px] font-black text-[#34505b]" onClick={() => openOrToast(flash.pdf, "PDF is not attached yet")}>
                                    PDF Report
                                </button>
                                <button type="button" className="rounded-[8px] bg-[#f0f4f5] px-2.5 py-1.5 text-[9px] font-black text-[#34505b]" onClick={() => openOrToast(flash.evidence, "Evidence files open from the report")}>
                                    Evidence
                                </button>
                                <button type="button" className="rounded-[8px] bg-[#f0f4f5] px-2.5 py-1.5 text-[9px] font-black text-[#34505b]" onClick={() => openOrToast(flash.certificate, "Certificate is not ready yet")}>
                                    Certificate
                                </button>
                                <button type="button" className="rounded-[8px] bg-[#f0f4f5] px-2.5 py-1.5 text-[9px] font-black text-[#34505b]" onClick={() => openOrToast(flash.qr, "QR verification is not issued yet")}>
                                    QR Code
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: AI Analysis & Score (only if available) */}
                    {ai && (
                        <div className="min-w-0">
                            <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.1em] text-[#70808a]">
                                AI Analysis &amp; Score
                            </h4>
                            <div className="rounded-[16px] border border-[#e0daf0] bg-[#faf9ff] p-4">
                                {/* Score Display */}
                                <div className="flex items-center gap-4">
                                    <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-[linear-gradient(135deg,#6d28d9,#a78bfa)]">
                                        <span className="text-[22px] font-black text-white">
                                            {Math.round(ai.facultyScore ?? ai.aiScore ?? 0)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="inline-block rounded-full bg-[#f1ebfd] px-2.5 py-1 text-[9px] font-black text-[#6d28d9]">
                                            {ai.levelQuality}
                                        </span>
                                        <div className="mt-1 text-[14px] font-bold text-[#16313d]">{ai.levelName}</div>
                                        {ai.scoreWasAdjusted && (
                                            <div className="mt-1 text-[10px] text-[#8b600a]">
                                                AI {Math.round(ai.aiScore ?? 0)} → Faculty {Math.round(ai.facultyScore ?? 0)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Score Adjustment Note (if any) */}
                                {ai.scoreWasAdjusted && ai.scoreAdjustmentReason && (
                                    <div className="mt-3 rounded-lg border border-[#f3d9a0] bg-[#fffbf0] p-2.5">
                                        <span className="text-[9px] font-black text-[#8b600a]">FACULTY ADJUSTMENT REASON</span>
                                        <p className="mt-1 text-[10px] leading-relaxed text-[#6b5b3f]">
                                            {ai.scoreAdjustmentReason}
                                        </p>
                                    </div>
                                )}

                                {/* Section Scores */}
                                {ai.sections.length > 0 && (
                                    <div className="mt-4 border-t border-[#e0daf0] pt-3">
                                        <span className="text-[9px] font-black text-[#8b82a6]">SECTION SCORES</span>
                                        <div className="mt-2 space-y-1.5">
                                            {ai.sections.map((s) => (
                                                <div key={s.id} className="flex items-center justify-between gap-2 text-[10px]">
                                                    <span className="text-[#5d5775]">S{s.id}. {s.title.slice(0, 30)}{s.title.length > 30 ? "…" : ""}</span>
                                                    <span className="font-bold text-[#6d28d9]">{s.score.toFixed(1)}/{s.weight}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Bonus & Penalty */}
                                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#e0daf0] pt-3">
                                    <div className="rounded-lg bg-[#e9f8f0] p-2 text-center">
                                        <span className="text-[8px] font-black text-[#16865a]">BONUS</span>
                                        <div className="text-[12px] font-bold text-[#16865a]">+{ai.bonus.total.toFixed(1)}</div>
                                    </div>
                                    <div className="rounded-lg bg-[#fff3dc] p-2 text-center">
                                        <span className="text-[8px] font-black text-[#8b600a]">PENALTY</span>
                                        <div className="text-[12px] font-bold text-[#8b600a]">-{ai.integrityPenalty}</div>
                                    </div>
                                </div>

                                {/* Feedback */}
                                {ai.feedback && (
                                    <div className="mt-3 border-t border-[#e0daf0] pt-3">
                                        <span className="text-[9px] font-black text-[#8b82a6]">FEEDBACK</span>
                                        {ai.feedback.praise && (
                                            <p className="mt-1.5 text-[10px] leading-relaxed text-[#5d5775]">
                                                {ai.feedback.praise}
                                            </p>
                                        )}
                                        {ai.feedback.summary && (
                                            <p className="mt-1.5 text-[10px] leading-relaxed text-[#5d5775]">
                                                {ai.feedback.summary}
                                            </p>
                                        )}
                                        {ai.feedback.actions && ai.feedback.actions.length > 0 && (
                                            <div className="mt-2">
                                                <span className="text-[8px] font-black text-[#8b82a6]">IMPROVEMENT ACTIONS</span>
                                                <ul className="mt-1 list-inside list-disc space-y-0.5 text-[10px] text-[#5d5775]">
                                                    {ai.feedback.actions.slice(0, 3).map((action, i) => (
                                                        <li key={i}>{action}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Faculty Note */}
                                {ai.facultyNote && (
                                    <div className="mt-3 rounded-lg border border-[#bfe3d1] bg-[#f0faf5] p-2.5">
                                        <span className="text-[9px] font-black text-[#16865a]">FACULTY NOTE</span>
                                        <p className="mt-1 text-[10px] leading-relaxed text-[#2d6654]">
                                            {ai.facultyNote}
                                        </p>
                                    </div>
                                )}

                                {/* Lock Info */}
                                {ai.lockedAt && (
                                    <div className="mt-3 border-t border-[#e0daf0] pt-2 text-center text-[9px] text-[#8b82a6]">
                                        🔒 Record locked {new Date(ai.lockedAt).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Phase 4: Independent AI Analyses Section */}
                {flash.independentAnalyses && flash.independentAnalyses.length > 0 && (
                    <div className="border-t border-[#dde5ea] bg-[#fefcf8] px-5 py-4 sm:px-[26px]">
                        <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.1em] text-[#8b7355]">
                            Additional AI Analyses (Do Not Override Faculty-Approved Score)
                        </h4>
                        <div className="space-y-2">
                            {flash.independentAnalyses.map((ia) => (
                                <div
                                    key={ia.id}
                                    className="flex items-center justify-between rounded-lg border border-[#e8dcc8] bg-white p-3"
                                >
                                    <div>
                                        <span className="text-[11px] font-semibold text-[#5a4832]">
                                            Score: {Math.round(ia.score)}
                                            {ia.levelName && <span className="ml-2 text-[10px] text-[#8b7355]">({ia.levelName})</span>}
                                        </span>
                                        <div className="mt-0.5 text-[9px] text-[#8b7355]">
                                            Run by {ia.runByName || ia.runByRole} on{" "}
                                            {new Date(ia.runAt).toLocaleDateString()}
                                        </div>
                                        {ia.note && (
                                            <div className="mt-1 text-[9px] italic text-[#6b5b3f]">{ia.note}</div>
                                        )}
                                    </div>
                                    <div className="rounded-full bg-[#f5eee0] px-2 py-1 text-[8px] font-black text-[#8b7355]">
                                        INDEPENDENT
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-2 text-[9px] text-[#8b7355]">
                            These analyses are for reference only. The faculty-approved score remains the official record.
                        </p>
                    </div>
                )}

                {/* Footer */}
                <div className="border-t border-[#dde5ea] bg-[#f8fafb] px-[26px] py-4 text-center text-[10px] text-[#70808a]">
                    This verified record is the official approved version distributed across CIEL PK.
                    <br />
                    Student → Faculty → University → CIEL PK
                </div>
            </div>
        </div>
    );
}

export default function CommunityImpactWall(_props: {
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
                // Mirrors the backend live-deck gate (isCommunityAwardLiveReport): a late
                // Faculty/Admin rejection blocks the record even when an earlier stage had
                // approved it — without the rejected check such a row still rendered here as
                // "✓ VERIFIED".
                setRows(list.filter((r: WallRow) => isCommunityReportOnLiveDeck(r) && !isCommunityReportRejected(r)));
                setLoading(false);
            })
            .catch(() => {
                // Never leave the wall stuck on "Loading verified records…" after a network error.
                if (!cancelled) setLoading(false);
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

        // Phase 3: Build AI Analysis data from ciiV2 + ciiV2Lock
        const cii = r.ciiV2;
        const lock = r.ciiV2Lock;
        const aiAnalysis = cii
            ? {
                  aiScore: lock?.aiRecommendedScore ?? cii.aiRecommendedScore ?? cii.final ?? null,
                  facultyScore: lock?.facultyApprovedScore ?? cii.facultyApprovedScore ?? cii.final ?? null,
                  scoreWasAdjusted: lock?.scoreWasAdjusted ?? false,
                  scoreAdjustmentReason: lock?.scoreAdjustmentReason,
                  levelName: cii.level?.name || r.level || "Approved",
                  levelQuality: cii.level?.quality || "VERIFIED",
                  sections: cii.sections || [],
                  bonus: cii.bonus || { effort: 0, resources: 0, partners: 0, total: 0 },
                  integrityPenalty: cii.integrityPenalty || 0,
                  feedback: cii.studentFeedback
                      ? {
                            praise: cii.studentFeedback.opening_praise,
                            summary: cii.studentFeedback.why_score_is_high_or_low,
                            encouragement: cii.studentFeedback.encouragement,
                            actions: cii.studentFeedback.five_specific_actions,
                        }
                      : undefined,
                  redFlags: cii.redFlags,
                  lockedAt: lock?.lockedAt,
                  facultyNote: lock?.facultyNote,
              }
            : null;

        // Phase 4: Build independent analyses list
        const independentAnalyses = (r.independentAiAnalyses || []).map((a) => ({
            id: a.id,
            runAt: a.runAt,
            runByName: a.runByName,
            runByRole: a.runByRole,
            score: a.score,
            levelName: a.level?.name,
            note: a.note,
        }));

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
            aiAnalysis,
            independentAnalyses,
            reportId: r.id,
        });
    };

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <CommunityCrumb role="Student" view="Impact" />
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
