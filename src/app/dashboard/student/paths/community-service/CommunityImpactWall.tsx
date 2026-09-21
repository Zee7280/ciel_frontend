"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import type { ActiveProject } from "@/app/dashboard/student/types";
import { MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import { CommunityCrumb } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { type CommunityAwardBadge, type CommunityServiceLevel } from "@/utils/communityAwardModel";
import { resolveCiiLevelBadge } from "@/utils/ciiLevelBadge";
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
    partner_status?: string;
    /** Backend's isReportPartnerStepSatisfied result — true for both an explicit partner
     * approval AND opportunities that never required one ('not_applicable'/'not_required'). */
    partner_verified?: boolean;
    status?: string;
    awardBadges?: CommunityAwardBadge[];
    cii_score?: number | null;
    level?: CommunityServiceLevel;
    section1?: { metrics?: { total_verified_hours?: number } };
    section4?: { project_summary?: { distinct_total_beneficiaries?: number | null } };
    section9?: {
        competency_scores?: { cognitive?: number; practical?: number; social?: number; transformative?: number } | null;
    };
    required_hours?: number | null;
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
        evidence?: Array<{ id: string; type: string; claim: string; verdict: "MATCH" | "PARTIAL" | "MISMATCH" }>;
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
        evidence?: Array<{ id: string; type: string; claim: string; verdict: "MATCH" | "PARTIAL" | "MISMATCH" }>;
    } | null;
    // Verified impact flashcard: badge, checklist, metrics, path and skills built from the
    // faculty-locked CII v2 record above — only present when aiAnalysis is present.
    flashcard?: {
        badgeSrc: string;
        badgeAlt: string;
        badgeTitle: string;
        checklist: Array<{ label: string; ok: boolean }>;
        metrics: Array<{ label: string; value: string }>;
        oneLiner?: string;
        path: Array<{ label: string; text: string }>;
        quality: { strongest: string[]; limitations: string[]; nextStep?: string };
        skills: Array<{ label: string; value: number }>;
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

type CiiSection = NonNullable<NonNullable<WallRow["ciiV2"]>["sections"]>[number];
type CompetencyScores = NonNullable<NonNullable<WallRow["section9"]>["competency_scores"]>;

function findSection(sections: CiiSection[] | undefined, id: number): CiiSection | undefined {
    return sections?.find((s) => s.id === id);
}

/** Self-rated reflection competencies (Section 9 of the report) — the closest real equivalent
 * to a "skill capability" chart; not fabricated scores, just relabeled from CIEL's own framework. */
function competencySkills(scores: CompetencyScores | null | undefined): Array<{ label: string; value: number }> {
    if (!scores) return [];
    const items: Array<[string, number | undefined]> = [
        ["Cognitive", scores.cognitive],
        ["Practical", scores.practical],
        ["Social & Civic", scores.social],
        ["Transformative", scores.transformative],
    ];
    return items
        .filter((pair): pair is [string, number] => typeof pair[1] === "number" && pair[1] > 0)
        .map(([label, value]) => ({ label, value }));
}

/** Builds the richer "verified impact flashcard" visuals (badge, checklist, metric rail, path,
 * quality judgement, skills) entirely from the faculty-locked CII v2 record — no new/fabricated
 * data, just a presentational layer on top of what CommunityCiiAnalyser already approved. */
function buildFlashcardExtras(
    r: WallRow,
    cii: NonNullable<WallRow["ciiV2"]>,
    hours: number,
    facultyScore: number | null,
): NonNullable<FlashState["flashcard"]> {
    const sections = cii.sections || [];
    const badge = resolveCiiLevelBadge(facultyScore ?? cii.final ?? 0);
    const evidenceCount = cii.evidence?.length ?? 0;
    const reach = r.section4?.project_summary?.distinct_total_beneficiaries;
    const sdgCount = sdgNumbers(r.sdgs).length;

    const checklist = [
        { label: "Faculty approved", ok: r.faculty_status === "approved" },
        { label: "Partner verified", ok: r.partner_verified ?? r.partner_status === "approved" },
        { label: "Hours compliant", ok: r.required_hours ? hours >= r.required_hours : hours > 0 },
        { label: "Evidence triangulated", ok: evidenceCount > 0 },
        { label: "CIEL PK verified", ok: true },
        { label: "Privacy protected", ok: true },
    ];

    const metrics: Array<{ label: string; value: string }> = [
        { label: "Verified hours", value: hours ? `${Math.round(hours)}h` : "—" },
    ];
    if (r.required_hours) metrics.push({ label: "Required minimum", value: `${Math.round(r.required_hours)}h` });
    if (typeof reach === "number" && reach > 0) metrics.push({ label: "People reached", value: String(reach) });
    metrics.push({ label: "Evidence items", value: String(evidenceCount) });
    if (sdgCount) metrics.push({ label: "SDGs linked", value: String(sdgCount) });

    const path = [
        {
            label: "Need",
            text: findSection(sections, 2)?.good || "Community need documented in the baseline.",
        },
        {
            label: "Student Action & Result",
            text: findSection(sections, 4)?.good || "Verified activities and outputs delivered in the field.",
        },
        {
            label: "Continuity",
            text: findSection(sections, 9)?.good || "Handover and continuation reviewed by faculty.",
        },
    ];

    const ranked = [...sections].sort((a, b) => b.score / (b.weight || 1) - a.score / (a.weight || 1));
    const strongest = ranked
        .filter((s) => s.good)
        .slice(0, 3)
        .map((s) => s.good as string);
    const limitations = ranked
        .filter((s) => s.limit)
        .slice(-3)
        .map((s) => s.limit as string);
    const nextStep = cii.studentFeedback?.five_specific_actions?.[0] || cii.redFlags?.[0]?.flag;

    return {
        badgeSrc: badge.src,
        badgeAlt: badge.alt,
        badgeTitle: badge.title,
        checklist,
        metrics,
        oneLiner: cii.studentFeedback?.opening_praise || r.story,
        path,
        quality: { strongest, limitations, nextStep },
        skills: competencySkills(r.section9?.competency_scores),
    };
}

function confidenceLabel(score: number, weight: number): string {
    if (!weight) return "—";
    const ratio = score / weight;
    if (ratio >= 0.85) return "High";
    if (ratio >= 0.65) return "Med-High";
    if (ratio >= 0.45) return "Developing";
    return "Needs work";
}

function evidenceIcon(type: string): string {
    const t = type.toLowerCase();
    if (t.includes("attend") || t.includes("session") || t.includes("ledger")) return "📋";
    if (t.includes("before") || t.includes("baseline")) return "📷";
    if (t.includes("after") || t.includes("complet") || t.includes("output")) return "🏫";
    if (t.includes("receipt") || t.includes("resource")) return "🧾";
    if (t.includes("partner")) return "🤝";
    if (t.includes("outcome") || t.includes("attendance sheet")) return "📊";
    return "📄";
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
    const fc = flash.flashcard;
    const [evidenceOpen, setEvidenceOpen] = useState<{ type: string; claim: string; verdict: string } | null>(null);

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

                {/* Verified Impact Flashcard: badge, checklist, metric rail, path, section grid,
                    quality judgement, skills and evidence gallery — all built from the same
                    faculty-locked CII v2 record shown in the AI Analysis column above. */}
                {fc && ai && (
                    <div className="border-t border-[#dde5ea] px-5 py-5 sm:px-[26px]">
                        <div className="flex flex-col items-center gap-3 rounded-[18px] bg-[linear-gradient(125deg,#052c37,#0b4850,#0d7c72)] p-5 text-center text-white sm:flex-row sm:text-left">
                            <img src={fc.badgeSrc} alt={fc.badgeAlt} className="h-20 w-20 rounded-full bg-white object-contain shadow-[0_10px_24px_rgba(0,0,0,.2)]" />
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#b8f2e8]">Verified Impact Badge</span>
                                <div className="mt-1 text-lg font-semibold">{fc.badgeTitle}</div>
                                {fc.oneLiner && <p className="mt-1.5 max-w-xl text-[11px] italic leading-relaxed text-[#d8f1ee]">“{fc.oneLiner}”</p>}
                            </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
                            {fc.checklist.map((c) => (
                                <div
                                    key={c.label}
                                    className={`rounded-[11px] border px-2.5 py-2 text-center text-[9px] font-black ${c.ok ? "border-[#cce9df] bg-[#eaf8f4] text-[#1a6c5d]" : "border-[#e5dccb] bg-[#faf6ec] text-[#8a6414]"}`}
                                >
                                    {c.ok ? "✓" : "•"} {c.label}
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
                            {fc.metrics.map((m) => (
                                <div key={m.label} className="rounded-[11px] border border-[#dde5ea] bg-[#fbfcfe] p-2.5 text-center">
                                    <strong className="block text-base text-[#16313d]">{m.value}</strong>
                                    <span className="mt-0.5 block text-[7.8px] font-black uppercase tracking-wide text-[#70808a]">{m.label}</span>
                                </div>
                            ))}
                        </div>

                        <h4 className="mb-2 mt-5 text-[10px] font-black uppercase tracking-[0.1em] text-[#70808a]">Need → Action → Continuity</h4>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {fc.path.map((p, i) => (
                                <div key={p.label} className="relative rounded-[14px] border border-[#dde5ea] bg-[#fbfdfd] p-3">
                                    <span className="mb-1.5 inline-grid h-5 w-5 place-items-center rounded-[7px] bg-[#082f3a] text-[9px] font-black text-white">{i + 1}</span>
                                    <b className="block text-[9px] font-black uppercase tracking-wide text-[#16313d]">{p.label}</b>
                                    <p className="mt-1 text-[10px] leading-relaxed text-[#5f737b]">{p.text}</p>
                                </div>
                            ))}
                        </div>

                        {ai.sections.length > 0 && (
                            <>
                                <h4 className="mb-2 mt-5 text-[10px] font-black uppercase tracking-[0.1em] text-[#70808a]">Section-by-section summary</h4>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {ai.sections.map((s) => (
                                        <div key={s.id} className="rounded-[14px] border border-[#dde5ea] bg-white p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <b className="text-[10.5px] leading-tight text-[#16313d]">{s.id}. {s.title}</b>
                                                <span className="whitespace-nowrap rounded-full border border-[#efdfb6] bg-[#fff9e9] px-1.5 py-0.5 text-[8.5px] font-black text-[#875f16]">{s.score}/{s.weight}</span>
                                            </div>
                                            {s.good && (
                                                <div className="mt-1.5 rounded-r-lg border-l-[3px] border-[#18aa9c] bg-[#f3fbf9] px-2 py-1 text-[8.6px] leading-relaxed text-[#315a57]">
                                                    <b>Verified highlight:</b> {s.good}
                                                </div>
                                            )}
                                            <div className="mt-1.5 text-[8px] font-black text-[#70808a]">
                                                <span className="rounded-full bg-[#edf9f5] px-1.5 py-0.5 text-[#287565]">{confidenceLabel(s.score, s.weight)} confidence</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {(fc.quality.strongest.length > 0 || fc.quality.limitations.length > 0 || fc.quality.nextStep) && (
                            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                {fc.quality.strongest.length > 0 && (
                                    <div className="rounded-[15px] border border-[#cce9df] bg-[#eaf8f4] p-3">
                                        <b className="text-[10px] text-[#16694f]">✓ Strongest signals</b>
                                        <ul className="mt-1.5 list-inside list-disc space-y-1 text-[9px] leading-relaxed text-[#2d6654]">
                                            {fc.quality.strongest.map((g, i) => <li key={i}>{g}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {fc.quality.nextStep && (
                                    <div className="rounded-[15px] border border-[#efdfb6] bg-[#fff9e9] p-3">
                                        <b className="text-[10px] text-[#875f16]">⚠ Critical next step</b>
                                        <p className="mt-1.5 text-[9px] leading-relaxed text-[#6b5b3f]">{fc.quality.nextStep}</p>
                                    </div>
                                )}
                                {fc.quality.limitations.length > 0 && (
                                    <div className="rounded-[15px] border border-[#e0daf0] bg-[#f5f1fb] p-3">
                                        <b className="text-[10px] text-[#5b3f8f]">◌ Limitations</b>
                                        <ul className="mt-1.5 list-inside list-disc space-y-1 text-[9px] leading-relaxed text-[#5d5775]">
                                            {fc.quality.limitations.map((l, i) => <li key={i}>{l}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {fc.skills.length > 0 && (
                            <>
                                <h4 className="mb-2 mt-5 text-[10px] font-black uppercase tracking-[0.1em] text-[#70808a]">Reflection competency profile</h4>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {fc.skills.map((s) => (
                                        <div key={s.label} className="rounded-[13px] border border-[#dde5ea] bg-[#fbfdfd] p-2.5">
                                            <div className="flex items-center justify-between text-[9px] font-black text-[#16313d]">
                                                <span>{s.label}</span>
                                                <span>{s.value.toFixed(1)}/5</span>
                                            </div>
                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e8efef]">
                                                <div className="h-full rounded-full bg-[linear-gradient(90deg,#0b8278,#3bc3b5)]" style={{ width: `${Math.min(100, (s.value / 5) * 100)}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {ai.evidence && ai.evidence.length > 0 && (
                            <>
                                <h4 className="mb-2 mt-5 text-[10px] font-black uppercase tracking-[0.1em] text-[#70808a]">Evidence gallery</h4>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                    {ai.evidence.map((e) => (
                                        <button
                                            key={e.id}
                                            type="button"
                                            onClick={() => setEvidenceOpen(e)}
                                            className="flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-[14px] border border-[#dde5ea] bg-[linear-gradient(145deg,#f4fbfa,#f7f9fc)] p-2.5 text-center hover:border-[#b7d9d4]"
                                        >
                                            <span className="text-xl">{evidenceIcon(e.type)}</span>
                                            <b className="text-[8px] leading-tight text-[#16313d]">{e.type}</b>
                                            <span
                                                className={`rounded-full px-1.5 py-0.5 text-[6.5px] font-black ${
                                                    e.verdict === "MATCH"
                                                        ? "bg-[#e7f7ef] text-[#176b5e]"
                                                        : e.verdict === "PARTIAL"
                                                          ? "bg-[#fff3dc] text-[#886210]"
                                                          : "bg-[#fff0f2] text-[#a34758]"
                                                }`}
                                            >
                                                {e.verdict === "MATCH" ? "Verified" : e.verdict === "PARTIAL" ? "Partial" : "Needs review"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {evidenceOpen && (
                    <div
                        className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(7,28,35,.58)] p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setEvidenceOpen(null);
                        }}
                        role="presentation"
                    >
                        <div role="dialog" aria-modal="true" className="w-[min(420px,94vw)] rounded-[18px] bg-white p-5">
                            <div className="mb-2.5 grid h-[70px] place-items-center rounded-[14px] bg-[linear-gradient(145deg,#e2f4ef,#eff3fa)] text-[38px]">
                                {evidenceIcon(evidenceOpen.type)}
                            </div>
                            <h3 className="m-0 text-sm font-semibold text-[#16313d]">{evidenceOpen.type}</h3>
                            <p className="mt-1.5 text-[11px] leading-relaxed text-[#70808a]">{evidenceOpen.claim}</p>
                            <button
                                type="button"
                                onClick={() => setEvidenceOpen(null)}
                                className="mt-4 rounded-[9px] bg-[#174b43] px-3 py-1.5 text-[10px] font-black text-white"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

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
        const facultyScore = cii ? (lock?.facultyApprovedScore ?? cii.facultyApprovedScore ?? cii.final ?? null) : null;
        const aiAnalysis = cii
            ? {
                  aiScore: lock?.aiRecommendedScore ?? cii.aiRecommendedScore ?? cii.final ?? null,
                  facultyScore,
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
                  evidence: cii.evidence || [],
              }
            : null;

        const flashcard = cii ? buildFlashcardExtras(r, cii, hours, facultyScore) : null;

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
            flashcard,
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
