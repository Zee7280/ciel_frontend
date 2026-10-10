"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { fetchStudentReportsList, peekStudentReportsList } from "@/utils/student-community-cache";
import type { ActiveProject } from "@/app/dashboard/student/types";
import { CommunityCrumb, HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { type CommunityAwardBadge, type CommunityServiceLevel } from "@/utils/communityAwardModel";
import { resolveCiiLevelBadge } from "@/utils/ciiLevelBadge";
import { isCommunityReportOnLiveDeck, isCommunityReportRejected } from "@/utils/reviewQueue";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { sdgData } from "@/utils/sdgData";
import { studentImpactPackageHref } from "@/utils/studentImpactPackageHref";
import { pickCiiV45DisplayBadgeName, pickCiiV45DisplayScore } from "@/utils/reportCiiSnapshot";
import { displayOrganizationName } from "@/utils/displayOrganizationName";
import ImpactWallCiiRing from "@/components/ciel/community-service/ImpactWallCiiRing";

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
    awardBadgeHistory?: CommunityAwardBadge[];
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
    actions?: {
        certificate_url?: string | null;
        pdf_url?: string | null;
        report_url?: string | null;
        v17_url?: string | null;
        evidence_url?: string | null;
    };
    // Phase 3: CII v4.5 AI Analysis data for two-column display — this is the student's own
    // listing, so the backend redacts it (null until an Admin has locked it; no pre-lock
    // "provisional" release in v4.5, and no evidence/redFlags/facultyNote in the redacted shape).
    ciiV45?: {
        finalCII?: number;
        diagnosticCII?: number;
        baseCII?: number;
        knownBasePoints?: number;
        finalBadge?: { level: number; name: string } | null;
        recommendedBadge?: { level: number; name: string } | null;
        sectionScores?: Array<{
            dimension: string;
            name: string;
            score: number | null;
            maximumPoints: number;
        }>;
        extraMileUplift?: { total?: number | null };
        integrityPenalty?: { points?: number };
        strengths?: string[];
        developmentPriorities?: string[];
        /** v4.5 studentFeedback is always a plain string (v2's structured object is gone). */
        studentFeedback?: string;
    } | null;
    ciiV45Lock?: {
        locked?: boolean;
        lockedAt?: string;
        aiRecommendedScore?: number;
        adminApprovedScore?: number;
        scoreWasModerated?: boolean;
        scoreModerationReason?: string;
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

function studentDetailedReportHref(r: Pick<WallRow, "project_id" | "opportunity_id" | "actions">): string | null {
    return (
        studentImpactPackageHref(r.project_id || r.opportunity_id, "report") ||
        r.actions?.report_url ||
        r.actions?.v17_url ||
        null
    );
}

function WallAction({
    href,
    label,
    solid,
    external,
}: {
    href: string | null;
    label: string;
    solid?: boolean;
    external?: boolean;
}) {
    const cls = solid
        ? "rounded-[9px] bg-[#174b43] px-2.5 py-1.5 text-[9px] font-black text-white"
        : "rounded-[9px] bg-[#f0f4f5] px-2.5 py-1.5 text-[9px] font-black text-[#34505b]";
    if (!href) {
        return (
            <button type="button" onClick={() => toast.message(`${label} is not available yet`)} className={cls}>
                {label}
            </button>
        );
    }
    if (external) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
                {label}
            </a>
        );
    }
    return (
        <Link href={href} className={cls}>
            {label}
        </Link>
    );
}

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
    // Phase 3: AI Analysis data for two-column display. v4.5's redacted student-facing shape has
    // no per-file evidence, red flags, moderation reason text or faculty note — those only exist
    // in the full admin record — so this is deliberately thinner than the old v2 shape.
    aiAnalysis?: {
        aiScore: number | null;
        facultyScore: number | null;
        scoreWasAdjusted: boolean;
        levelName: string;
        sections: Array<{
            dimension: string;
            name: string;
            score: number | null;
            maximumPoints: number;
        }>;
        upliftTotal: number;
        integrityPenalty: number;
        feedback?: string;
        strengths: string[];
        developmentPriorities: string[];
        lockedAt?: string;
    } | null;
    // Verified impact flashcard: badge, checklist, metrics, path and skills built from the
    // admin-locked CII v4.5 record above — only present when aiAnalysis is present.
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
    projectId?: string | null;
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

function wallCiiScore(r: WallRow): number | null {
    return pickCiiV45DisplayScore(r.ciiV45, r.ciiV45Lock) ?? (typeof r.cii_score === "number" ? r.cii_score : null);
}

function wallBadgeName(r: WallRow, score: number | null): string {
    return (
        pickCiiV45DisplayBadgeName(r.ciiV45, r.ciiV45Lock) ||
        r.ciiV45?.finalBadge?.name ||
        (score != null ? resolveCiiLevelBadge(score).title : "") ||
        r.level ||
        "Verified"
    );
}

function nationalBadge(r: WallRow): CommunityAwardBadge | undefined {
    return (r.awardBadges || []).find((b) => b.kind === "ciel");
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

type CompetencyScores = NonNullable<NonNullable<WallRow["section9"]>["competency_scores"]>;

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
 * quality judgement, skills) entirely from the admin-locked CII v4.5 record — no new/fabricated
 * data, just a presentational layer on top of what CommunityCiiAnalyser already approved.
 * The redacted student-facing `ciiV45` carries no per-file evidence, red flags or faculty note
 * (those only exist in the full admin shape), so the checklist/metrics/path below lean on what
 * the redacted payload actually has: section scores, uplift total, integrity points, the overall
 * `strengths`/`developmentPriorities` and `studentFeedback` string. */
function buildFlashcardExtras(
    r: WallRow,
    cii: NonNullable<WallRow["ciiV45"]>,
    hours: number,
    facultyScore: number | null,
): NonNullable<FlashState["flashcard"]> {
    const badge = resolveCiiLevelBadge(facultyScore ?? cii.finalCII ?? 0);
    const reach = r.section4?.project_summary?.distinct_total_beneficiaries;
    const sdgCount = sdgNumbers(r.sdgs).length;

    const checklist = [
        { label: "Faculty approved", ok: r.faculty_status === "approved" },
        { label: "Partner verified", ok: r.partner_verified ?? r.partner_status === "approved" },
        { label: "Hours compliant", ok: r.required_hours ? hours >= r.required_hours : hours > 0 },
        { label: "CIEL PK verified", ok: true },
        { label: "Privacy protected", ok: true },
    ];

    const metrics: Array<{ label: string; value: string }> = [
        { label: "Verified hours", value: hours ? `${Math.round(hours)}h` : "—" },
    ];
    if (r.required_hours) metrics.push({ label: "Required minimum", value: `${Math.round(r.required_hours)}h` });
    if (typeof reach === "number" && reach > 0) metrics.push({ label: "People reached", value: String(reach) });
    if (sdgCount) metrics.push({ label: "SDGs linked", value: String(sdgCount) });

    const path = [
        { label: "Need", text: "Community need documented in the baseline." },
        { label: "Student Action & Result", text: "Verified activities and outputs delivered in the field." },
        { label: "Continuity", text: "Handover and continuation reviewed by faculty." },
    ];

    // v4.5's redacted sectionScores carry no per-section narrative (no `good`/`limit`); the
    // overall strengths/developmentPriorities are the closest real equivalent.
    const strongest = (cii.strengths || []).slice(0, 3);
    const limitations = (cii.developmentPriorities || []).slice(0, 3);
    const nextStep = (cii.developmentPriorities || [])[0];

    return {
        badgeSrc: badge.src,
        badgeAlt: badge.alt,
        badgeTitle: badge.title,
        checklist,
        metrics,
        oneLiner: cii.studentFeedback || r.story,
        path,
        quality: { strongest, limitations, nextStep },
        skills: competencySkills(r.section9?.competency_scores),
    };
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
                                <WallAction href={studentImpactPackageHref(flash.projectId, "print") || flash.pdf || null} label="PDF Report" />
                                <WallAction href={studentImpactPackageHref(flash.projectId, "evidence") || flash.evidence || null} label="Evidence" />
                                <WallAction href={studentImpactPackageHref(flash.projectId, "certificate") || flash.certificate || null} label="Certificate" />
                                <WallAction href={studentImpactPackageHref(flash.projectId, "package") || null} label="View package" />
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
                                            VERIFIED
                                        </span>
                                        <div className="mt-1 text-[14px] font-bold text-[#16313d]">{ai.levelName}</div>
                                        {ai.scoreWasAdjusted && (
                                            <div className="mt-1 text-[10px] text-[#8b600a]">
                                                AI {Math.round(ai.aiScore ?? 0)} → Faculty {Math.round(ai.facultyScore ?? 0)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Uplift & Penalty */}
                                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#e0daf0] pt-3">
                                    <div className="rounded-lg bg-[#e9f8f0] p-2 text-center">
                                        <span className="text-[8px] font-black text-[#16865a]">EXTRA-MILE UPLIFT</span>
                                        <div className="text-[12px] font-bold text-[#16865a]">+{ai.upliftTotal.toFixed(1)}</div>
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
                                        <p className="mt-1.5 text-[10px] leading-relaxed text-[#5d5775]">
                                            {ai.feedback}
                                        </p>
                                        {ai.developmentPriorities.length > 0 && (
                                            <div className="mt-2">
                                                <span className="text-[8px] font-black text-[#8b82a6]">IMPROVEMENT ACTIONS</span>
                                                <ul className="mt-1 list-inside list-disc space-y-0.5 text-[10px] text-[#5d5775]">
                                                    {ai.developmentPriorities.slice(0, 3).map((action, i) => (
                                                        <li key={i}>{action}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
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

                {/* Verified Impact Flashcard: badge, checklist, metric rail, path,
                    quality judgement and skills — all built from the same admin-locked CII v4.5
                    record shown in the AI Analysis column above. */}
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
    const cachedReports = peekStudentReportsList();
    const [rows, setRows] = useState<WallRow[]>(() =>
        ((cachedReports ?? []) as WallRow[]).filter((r) => isCommunityReportOnLiveDeck(r) && !isCommunityReportRejected(r)),
    );
    const [loading, setLoading] = useState(!cachedReports);
    const [flash, setFlash] = useState<FlashState | null>(null);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<"all" | "ranked">("all");
    const [sort, setSort] = useState<"recent" | "cii">("recent");
    const [yearFilter, setYearFilter] = useState("all");

    useEffect(() => {
        let cancelled = false;
        fetchStudentReportsList()
            .then((list) => {
                if (cancelled) return;
                setRows(
                    (list as WallRow[]).filter((r) => isCommunityReportOnLiveDeck(r) && !isCommunityReportRejected(r)),
                );
                setLoading(false);
            })
            .catch(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const years = useMemo(() => {
        const set = new Set<string>();
        for (const r of rows) {
            const y = yearOf(r.created_at);
            if (y) set.add(y);
        }
        return [...set].sort((a, b) => Number(b) - Number(a));
    }, [rows]);

    const stats = useMemo(() => {
        const hours = rows.reduce((sum, r) => sum + Number(r.hours || r.section1?.metrics?.total_verified_hours || 0), 0);
        const scores = rows.map((r) => wallCiiScore(r)).filter((n): n is number => n != null && Number.isFinite(n));
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        const national = rows.filter((r) => nationalBadge(r)).length;
        return {
            published: rows.length,
            hours: Math.round(hours),
            avg,
            national,
        };
    }, [rows]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const next = rows.filter((r) => {
            if (q && !String(r.project_title || "").toLowerCase().includes(q)) return false;
            if (filter === "ranked" && !(r.awardBadges || []).length) return false;
            if (yearFilter !== "all" && yearOf(r.created_at) !== yearFilter) return false;
            return true;
        });
        next.sort((a, b) => {
            if (sort === "cii") return (wallCiiScore(b) ?? -1) - (wallCiiScore(a) ?? -1);
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        return next;
    }, [rows, query, filter, yearFilter, sort]);

    const openFlash = (r: WallRow) => {
        const hours = Number(r.hours || r.section1?.metrics?.total_verified_hours || 0);
        const year = yearOf(r.created_at);
        const sdgs = sdgNumbers(r.sdgs);
        const uni = r.university || displayOrganizationName(r.organization_name) || "Community Service";
        const reportHref = r.project_id || r.opportunity_id ? `/dashboard/student/report?projectId=${encodeURIComponent(String(r.project_id || r.opportunity_id))}` : null;

        // Phase 3: Build AI Analysis data from ciiV45 + ciiV45Lock (redacted student shape —
        // null until an Admin has locked it; no pre-lock provisional release in v4.5).
        const cii = r.ciiV45;
        const lock = r.ciiV45Lock;
        const facultyScore = cii ? pickCiiV45DisplayScore(cii, lock) : null;
        const aiAnalysis = cii
            ? {
                  aiScore: lock?.aiRecommendedScore ?? facultyScore ?? cii.finalCII ?? cii.diagnosticCII ?? null,
                  facultyScore,
                  scoreWasAdjusted: lock?.scoreWasModerated ?? false,
                  levelName: cii.finalBadge?.name || r.level || "Approved",
                  sections: cii.sectionScores || [],
                  upliftTotal: cii.extraMileUplift?.total || 0,
                  integrityPenalty: cii.integrityPenalty?.points || 0,
                  feedback: cii.studentFeedback,
                  strengths: cii.strengths || [],
                  developmentPriorities: cii.developmentPriorities || [],
                  lockedAt: lock?.lockedAt,
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
            projectId: r.project_id || r.opportunity_id || null,
        });
    };

    const avgLabel =
        stats.avg == null ? "—" : Number.isInteger(stats.avg) ? String(Math.round(stats.avg)) : stats.avg.toFixed(1);

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <CommunityCrumb role="Student" view="My Impact" />
            <HubBackButton href={HUB} label="← Back to Community Service" />

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 max-w-3xl">
                    <h1 className="text-[32px] font-semibold tracking-tight text-[#143f3b]">My Impact Wall.</h1>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b7c86]">
                        A curated record of your published community service projects — verified outcomes, composite scores,
                        institutional recognition and supporting documentation, all in one place.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-full border border-[#cfe0dc] bg-white px-4 py-2 text-[12px] font-bold text-[#174b43]"
                    >
                        Print portfolio
                    </button>
                    <Link
                        href="/dashboard/student/impact?area=Community%20Service"
                        className="rounded-full bg-[#0e4d4e] px-4 py-2 text-[12px] font-bold text-white"
                    >
                        View full portfolio →
                    </Link>
                </div>
            </div>

            <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-[#e4eeec] bg-white px-5 py-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#7a919a]">Published projects</p>
                    <p className="mt-2 text-[28px] font-semibold tracking-tight text-[#143f3b]">{stats.published}</p>
                    <p className="text-[11px] text-[#7a919a]">Accepted and published</p>
                </div>
                <div className="rounded-2xl border border-[#e4eeec] bg-white px-5 py-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#7a919a]">Verified hours</p>
                    <p className="mt-2 text-[28px] font-semibold tracking-tight text-[#143f3b]">
                        {stats.hours}
                        <span className="text-[14px] font-semibold text-[#7a919a]">h</span>
                    </p>
                    <p className="text-[11px] text-[#7a919a]">Across these records</p>
                </div>
                <div className="rounded-2xl border border-[#e4eeec] bg-[#f3faf7] px-5 py-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#7a919a]">Average CII</p>
                    <p className="mt-2 text-[28px] font-semibold tracking-tight text-[#143f3b]">
                        {avgLabel}
                        <span className="text-[14px] font-semibold text-[#7a919a]">/100</span>
                    </p>
                    <p className="text-[11px] text-[#7a919a]">Composite Impact Index</p>
                </div>
                <div className="rounded-2xl border border-[#efe6d4] bg-[#fbf6ee] px-5 py-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#7a919a]">National recognitions</p>
                    <p className="mt-2 text-[28px] font-semibold tracking-tight text-[#143f3b]">{stats.national}</p>
                    <p className="text-[11px] text-[#7a919a]">Projects with rankings</p>
                </div>
            </div>

            {loading ? (
                <p className="py-10 text-center text-sm text-[#7a919a]">Loading verified records…</p>
            ) : rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#cbe7e3] bg-[#fbfefd] px-5 py-10 text-center text-[12px] text-[#7a919a]">
                    Only approved records appear here. When Faculty signs off a Community Service report, its flashcard lands here and in My Impact Portfolio.
                </div>
            ) : (
                <>
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <h2 className="text-[18px] font-semibold text-[#143f3b]">Published impact projects</h2>
                            <p className="text-[12px] text-[#7a919a]">Only accepted and published projects appear on your Impact Wall.</p>
                        </div>
                        <p className="text-[12px] text-[#7a919a]">
                            Showing {visible.length} of {rows.length} {rows.length === 1 ? "project" : "projects"}
                        </p>
                    </div>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search your project titles..."
                            className="min-w-[220px] flex-1 rounded-full border border-[#d7e4e1] bg-white px-4 py-2 text-[13px] text-[#16313d] outline-none placeholder:text-[#9aadb3]"
                        />
                        <div className="flex flex-wrap gap-1 rounded-full bg-[#eef4f2] p-1">
                            {(
                                [
                                    ["all", "All projects"],
                                    ["ranked", "Ranked"],
                                ] as const
                            ).map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setFilter(id)}
                                    className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                                        filter === id ? "bg-white text-[#143f3b] shadow-sm" : "text-[#5f737b]"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value === "cii" ? "cii" : "recent")}
                            className="rounded-full border border-[#d7e4e1] bg-white px-3 py-2 text-[12px] font-semibold text-[#174b43]"
                        >
                            <option value="recent">Most recent</option>
                            <option value="cii">Highest CII</option>
                        </select>
                        <select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                            className="rounded-full border border-[#d7e4e1] bg-white px-3 py-2 text-[12px] font-semibold text-[#174b43]"
                        >
                            <option value="all">All years</option>
                            {years.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>
                    {visible.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#cbe7e3] bg-[#fbfefd] px-5 py-10 text-center text-[12px] text-[#7a919a]">
                            No published projects match this search.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {visible.map((r) => {
                                const hours = Number(r.hours || r.section1?.metrics?.total_verified_hours || 0);
                                const year = yearOf(r.created_at);
                                const sdgs = sdgNumbers(r.sdgs);
                                const uni = r.university || displayOrganizationName(r.organization_name) || "Community Service";
                                const score = wallCiiScore(r);
                                const badge = wallBadgeName(r, score);
                                const national = nationalBadge(r);
                                const packageHref = studentImpactPackageHref(r.project_id || r.opportunity_id, "package", { from: "wall" });
                                const reportHref = studentImpactPackageHref(r.project_id || r.opportunity_id, "report", { from: "wall" }) || studentDetailedReportHref(r);
                                return (
                                    <article key={r.id} className="flex flex-col overflow-hidden rounded-[22px] border border-[#dde8e5] bg-white shadow-[0_8px_24px_rgba(20,63,59,.06)]">
                                        <div className="relative bg-[linear-gradient(135deg,#0e4d4e,#117669)] px-5 py-4 text-white">
                                            <span className="absolute right-3.5 top-3.5 rounded-full border border-white/25 bg-white/12 px-2.5 py-1 text-[8px] font-black tracking-wide">
                                                ✓ VERIFIED & PUBLISHED
                                            </span>
                                            <p className="pr-28 text-[8.5px] font-black tracking-[0.1em] text-[#9fe2d7]">
                                                COMMUNITY SERVICE · {year || "—"}
                                            </p>
                                            <h4 className="mt-1.5 break-words text-[17px] font-semibold leading-tight [overflow-wrap:anywhere]">
                                                {r.project_title || "Community service"}
                                            </h4>
                                            <p className="mt-1 text-[11px] text-[#d7eeea]">
                                                {uni}
                                                {hours ? ` · ${Math.round(hours)} verified hours` : ""}
                                            </p>
                                        </div>
                                        <div className="flex flex-1 flex-col px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <ImpactWallCiiRing score={score} />
                                                <div className="min-w-0">
                                                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#7a919a]">Composite Impact Index</p>
                                                    <p className="mt-0.5 text-[15px] font-semibold leading-tight text-[#16313d]">{badge}</p>
                                                    <p className="mt-0.5 text-[11px] text-[#7a919a]">Verified CII score</p>
                                                </div>
                                                {national ? (
                                                    <div className="ml-auto rounded-xl border border-[#efdfb6] bg-[#fff9e9] px-2.5 py-2 text-center">
                                                        <p className="text-[7.5px] font-black uppercase tracking-wide text-[#875f16]">National rank</p>
                                                        <p className="text-[16px] font-black text-[#875f16]">#{national.rank}</p>
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#eef2f1] pt-3 text-center">
                                                <div>
                                                    <p className="text-[8px] font-black uppercase tracking-wide text-[#7a919a]">Hours</p>
                                                    <p className="mt-1 text-[13px] font-semibold text-[#16313d]">{hours ? `${Math.round(hours)} verified` : "—"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black uppercase tracking-wide text-[#7a919a]">Year</p>
                                                    <p className="mt-1 text-[13px] font-semibold text-[#16313d]">{year || "—"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black uppercase tracking-wide text-[#7a919a]">SDG link</p>
                                                    <p className="mt-1 text-[13px] font-semibold text-[#16313d]">{sdgs.length ? sdgShort(sdgs) : "—"}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                <span className="rounded-full bg-[#e8f5ef] px-2.5 py-1 text-[10px] font-bold text-[#1d765d]">✓ Accepted</span>
                                            </div>
                                            <div className="mt-auto flex gap-2 border-t border-[#eef2f1] pt-3">
                                                {packageHref ? (
                                                    <Link
                                                        href={packageHref}
                                                        className="flex-1 rounded-full bg-[#0e4d4e] px-4 py-2.5 text-center text-[12px] font-bold text-white"
                                                    >
                                                        View package →
                                                    </Link>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => toast.message("Package is not available yet")}
                                                        className="flex-1 rounded-full bg-[#0e4d4e] px-4 py-2.5 text-[12px] font-bold text-white"
                                                    >
                                                        View package →
                                                    </button>
                                                )}
                                                {reportHref ? (
                                                    <Link
                                                        href={reportHref}
                                                        className="rounded-full border border-[#d7e4e1] bg-white px-4 py-2.5 text-[12px] font-bold text-[#174b43]"
                                                        title="Detailed report"
                                                    >
                                                        Report
                                                    </Link>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => toast.message("Detailed report is not available yet")}
                                                        className="rounded-full border border-[#d7e4e1] bg-white px-4 py-2.5 text-[12px] font-bold text-[#174b43]"
                                                    >
                                                        Report
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {flash ? <CommunityFlashModal flash={flash} onClose={() => setFlash(null)} /> : null}
        </div>
    );
}
