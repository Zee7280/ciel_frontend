/**
 * Display-only helpers for the CII v5.0 analyser screen: per-criterion marks, badge-gate
 * pills, the final checklist and the consolidated ten-section feedback (Copy / Print).
 *
 * Nothing here changes a score. Every number is derived from the server result (or from
 * the Admin's draft Dimension-7 anchors, which the server recomputes at Approve).
 */
import {
    CII_V45_ANCHOR_FACTORS,
    CII_V45_ANCHOR_NAMES,
    CII_V45_DIMENSIONS,
    criterionLabel,
    isR3Analysis,
    type CiiV45Badge,
    type CiiV45Dimension,
    type CiiV45Result,
} from "./communityCiiAnalyser";

export type AnchorIndex = 0 | 1 | 2 | 3 | 4;

export function isAnchorIndex(value: unknown): value is AnchorIndex {
    return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 4;
}

/** weight × factor[anchor], or null while the anchor is pending / not chosen. */
export function anchorPoints(weight: number, anchor: unknown): number | null {
    const a = typeof anchor === "string" && anchor.trim() !== "" ? Number(anchor) : anchor;
    if (!isAnchorIndex(a)) return null;
    return Math.round(weight * CII_V45_ANCHOR_FACTORS[a] * 100) / 100;
}

/** 2.55 → "2.55", 3 → "3", 2.5 → "2.5", null → "—". */
export function formatPts(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return "—";
    return String(Math.round(value * 100) / 100);
}

/** Label for one rating option, e.g. "3 · Strong (2.55 / 3)". */
export function anchorOptionLabel(weight: number, anchor: AnchorIndex): string {
    return `${anchor} · ${CII_V45_ANCHOR_NAMES[anchor]} (${formatPts(anchorPoints(weight, anchor))} / ${weight})`;
}

export function anchorName(anchor: unknown): string {
    const a = typeof anchor === "string" && anchor.trim() !== "" ? Number(anchor) : anchor;
    return isAnchorIndex(a) ? CII_V45_ANCHOR_NAMES[a] : "Pending";
}

export type GatePill = { code: "L4" | "L5" | "L6"; passed: boolean; note: string };

const GATE_NOTE: Record<GatePill["code"], string> = {
    L4: "4A ≥ 65%, 4B ≥ 55%, evidence ≥ 55%",
    L5: "L4 + 4B ≥ 70%, evidence ≥ 70%, 9 ≥ 55%",
    L6: "L5 + 4B ≥ 80%, evidence ≥ 85%, 9 ≥ 70%, Admin-verified exceptional feature",
};

export function gatePills(
    result: (Pick<CiiV45Result, "qualityGates"> & Partial<Pick<CiiV45Result, "rubricVersion" | "l6Assessment">>) | null | undefined,
): GatePill[] {
    const gates = result?.qualityGates ?? { L4: false, L5: false, L6: false };
    if (isR3Analysis(result)) {
        // R3: no L4/L5 quality gate (the CII alone picks the band); L6 needs the sourced qualification.
        const l6 = result?.l6Assessment;
        return [
            { code: "L4", passed: Boolean(gates.L4), note: R3_GATE_NOTE.L4 },
            { code: "L5", passed: Boolean(gates.L5), note: R3_GATE_NOTE.L5 },
            {
                code: "L6",
                passed: l6?.status === "QUALIFIED",
                note: l6?.status === "PENDING_QUALIFICATION" && l6.reasons.length ? `${R3_GATE_NOTE.L6} Missing: ${l6.reasons.join("; ")}.` : R3_GATE_NOTE.L6,
            },
        ];
    }
    return (["L4", "L5", "L6"] as const).map((code) => ({ code, passed: Boolean(gates[code]), note: GATE_NOTE[code] }));
}

const R3_GATE_NOTE: Record<GatePill["code"], string> = {
    L4: "No quality gate: the CII band decides",
    L5: "No quality gate: the CII band decides",
    L6: "CII ≥ 90, Measured Change ≥ 12/15, Sustainability ≥ 8/10, evidence ≥ 12/15 and three sourced confirmations. Otherwise L6 stays pending (never L5).",
};

/** "Score band L5 · capped to L4 by quality gate" or null when nothing is capped. */
export function badgeCapNote(badge: CiiV45Badge | null | undefined): string | null {
    if (!badge || !badge.gateCapped) return null;
    return `Score band L${badge.numericLevel} · capped to ${badge.code} by quality gate`;
}

export type ChecklistItem = { label: string; ok: boolean; detail: string };

/**
 * Display-only readiness list. It never blocks Approve — today's flow lets Admin confirm
 * a flagged score, and this keeps that behaviour.
 */
export function finalChecklist(args: {
    result: CiiV45Result | null | undefined;
    dim7Complete: boolean;
    packetOk: boolean;
    locked: boolean;
}): ChecklistItem[] {
    const { result, dim7Complete, packetOk, locked } = args;
    const aiSections = (result?.sectionScores ?? []).filter((s) => s.dimension !== "7");
    const aiCriteria = aiSections.flatMap((s) => s.criterionScores ?? []);
    // An Admin-reviewed mark resolves a criterion the AI left pending.
    const isScored = (c: (typeof aiCriteria)[number]) => c.anchor !== "P" || Boolean(c.adminEdited);
    const aiScored = aiSections.length > 0 && aiCriteria.every(isScored);
    const reasoningCount = aiCriteria.filter((c) => String(c.reasoningSummary || "").trim()).length;
    const inputs = result?.inputCompleteness;
    const hours = inputs?.individualHours ?? [];
    const hoursPending = hours.some((h) => h.hours == null || h.recordComplete === false);
    const hoursShort = hours.some((h) => typeof h.hours === "number" && h.hours < h.requiredHours);
    const hoursOk = Boolean(result) && !hoursPending && !hoursShort && inputs?.mandatoryFieldsComplete !== false;
    const flags = Array.isArray(result?.adminReviewReasons) ? result!.adminReviewReasons.filter(Boolean) : [];
    const status = result?.scoreStatus;
    const flagsClear = Boolean(result) && (status === "FINAL" || (status === "ADMIN_EVIDENCE_REQUIRED" && flags.length === 0));
    const evidenceOk = locked ? result?.adminEvidenceAssessment?.status === "ASSESSED" : dim7Complete;
    const l6 = isR3Analysis(result) ? result?.l6Assessment : undefined;
    const l6Items: ChecklistItem[] =
        l6 && l6.status !== "NOT_REQUIRED"
            ? [
                  {
                      label: "L6 sustained-impact qualification",
                      ok: l6.status === "QUALIFIED",
                      detail: l6.status === "QUALIFIED" ? "Confirmed with a source" : `Pending: ${l6.reasons.join("; ")}`,
                  },
              ]
            : [];
    return [
        {
            label: "Student packet complete",
            ok: packetOk,
            detail: packetOk ? "Flashcard, Sections 1–9 and evidence inventory read" : "Packet integrity hold",
        },
        {
            label: "AI scored every criterion",
            ok: aiScored,
            detail: result ? `${aiCriteria.filter(isScored).length} of ${aiCriteria.length} criteria scored` : "Analyser not run",
        },
        {
            label: "AI reasoning supplied for every criterion",
            ok: aiCriteria.length > 0 && reasoningCount === aiCriteria.length,
            detail: result ? `${reasoningCount} of ${aiCriteria.length} with reasoning` : "Analyser not run",
        },
        {
            label: "All seven evidence marks entered",
            ok: Boolean(evidenceOk),
            detail: evidenceOk ? "Dimension 7 ready" : "Admin evidence /15 pending",
        },
        {
            label: "Hours and mandatory fields complete",
            ok: hoursOk,
            detail: !result
                ? "Analyser not run"
                : hoursShort
                  ? "A student is below the required hours"
                  : hoursPending
                    ? "An hours record is incomplete"
                    : inputs?.mandatoryFieldsComplete === false
                      ? "Mandatory report fields missing"
                      : "Attendance and fields verified",
        },
        {
            label: "No open analysis flags",
            ok: flagsClear,
            detail: flags.length ? flags.join("; ") : status === "RESUBMISSION_REQUIRED" ? "Resubmission flagged" : "Nothing flagged",
        },
        ...l6Items,
    ];
}

export type FeedbackSection = {
    dimension: CiiV45Dimension;
    name: string;
    score: number | null;
    max: number;
    summary: string;
    strengths: string[];
    limitations: string[];
    recommendation: string;
    /** Only on Dimension 7 — the Admin's own ratings. */
    evidenceNotes: string[];
    /** R3: criterion marks the Admin reviewed in this section ("Label: AI 2.8 → 4 / 4 — reason"). */
    reviewedMarks?: string[];
};

export type Dim7Draft = {
    anchors: Record<string, string | number | undefined>;
    comments: Record<string, string | undefined>;
    /** True when the ratings are the Admin's confirmed / locked assessment. */
    confirmed: boolean;
};

const DIM_ORDER = CII_V45_DIMENSIONS.map((d) => d.id);

/** Ten sections in rubric order, each with summary, strengths, limitations and a recommendation. */
export function buildFeedbackSections(result: CiiV45Result | null | undefined, dim7: Dim7Draft): FeedbackSection[] {
    if (!result) return [];
    const analyses = new Map((result.sectionAnalyses ?? []).map((row) => [row.dimension as string, row]));
    const dim7Def = CII_V45_DIMENSIONS.find((d) => d.id === "7")!;
    const rows = [...(result.sectionScores ?? [])].sort(
        (a, b) => DIM_ORDER.indexOf(a.dimension) - DIM_ORDER.indexOf(b.dimension),
    );
    return rows.map((section) => {
        const def = CII_V45_DIMENSIONS.find((d) => d.id === section.dimension);
        const max = section.maximumPoints || def?.maxPoints || 0;
        if (section.dimension === "7") {
            const rated = dim7Def.criteria.map((c) => {
                const anchor = anchorPoints(c.weight, dim7.anchors[c.key]) == null ? null : Number(dim7.anchors[c.key]);
                return { key: c.key, label: criterionLabel("7", c.key), anchor, comment: String(dim7.comments[c.key] || "").trim() };
            });
            const complete = rated.every((r) => r.anchor != null);
            const score = complete
                ? Math.round(rated.reduce((sum, r) => sum + (anchorPoints(dim7Def.criteria.find((c) => c.key === r.key)!.weight, r.anchor) || 0), 0) * 100) / 100
                : typeof section.score === "number"
                  ? section.score
                  : null;
            const weak = rated.filter((r) => r.anchor != null && r.anchor <= 2).map((r) => r.label);
            const strong = rated.filter((r) => r.anchor != null && r.anchor >= 3).map((r) => r.label);
            return {
                dimension: "7",
                name: section.name || def?.name || "Evidence, Ethics & Verification",
                score,
                max,
                summary: !complete
                    ? "Admin evidence assessment pending — all seven evidence criteria must be rated."
                    : dim7.confirmed
                      ? "CIEL PK Admin reviewed the submitted evidence against the seven fixed criteria."
                      : "Draft Admin evidence ratings — confirmed at Approve Score.",
                strengths: strong.length ? [`Well-evidenced: ${strong.join(", ")}.`] : [],
                limitations: weak.length ? [`Weaker proof for: ${weak.join(", ")}.`] : [],
                recommendation: weak.length
                    ? `Strengthen the originals that prove ${weak.join(", ").toLowerCase()} in the next submission.`
                    : complete
                      ? "Evidence coverage is strong — keep the same standard of originals in future projects."
                      : "Complete the evidence review to generate recommendations.",
                evidenceNotes: rated.map((r) => `${r.label}: ${r.anchor == null ? "Pending" : anchorName(r.anchor)}${r.comment ? ` — ${r.comment}` : ""}`),
            };
        }
        const analysis = analyses.get(section.dimension);
        const strengths = (analysis?.strengths ?? []).filter(Boolean);
        const limitations = (analysis?.limitations ?? []).filter(Boolean);
        const pendingCriteria = (section.criterionScores ?? [])
            .filter((c) => c.anchor === "P" && !c.adminEdited)
            .map((c) => criterionLabel(section.dimension, c.criterion));
        const reviewedMarks = (section.criterionScores ?? [])
            .filter((c) => c.adminEdited)
            .map(
                (c) =>
                    `${criterionLabel(section.dimension, c.criterion)}: AI ${formatPts(c.aiScore ?? null)} → ${formatPts(c.score)} / ${c.maximumPoints}${c.adminEdit?.reason ? ` — ${c.adminEdit.reason}` : ""}`,
            );
        return {
            dimension: section.dimension,
            name: section.name || def?.name || `Dimension ${section.dimension}`,
            score: typeof section.score === "number" ? section.score : null,
            max,
            summary: analysis?.summary?.trim() || (pendingCriteria.length ? `AI left ${pendingCriteria.join(", ")} pending — Admin review required.` : "AI did not supply a section summary."),
            strengths,
            limitations,
            recommendation: limitations.length
                ? "Address the limitations noted above in the next submission."
                : strengths.length
                  ? "Maintain this standard in future projects."
                  : "Review the criterion reasoning for improvement opportunities.",
            evidenceNotes: [],
            ...(reviewedMarks.length ? { reviewedMarks } : {}),
        };
    });
}

export type FeedbackHeader = {
    projectTitle: string;
    studentName: string;
    university?: string;
    reportId: string;
    aiScore: number | null;
    evidenceScore: number | null;
    compositeScore: number | null;
    badgeLabel: string;
    locked: boolean;
    overallSummary?: string;
    overallStrengths?: string[];
    overallPriorities?: string[];
    adminComment?: string;
};

/** Plain-text version of the consolidated feedback for Copy. */
export function feedbackPlainText(header: FeedbackHeader, sections: FeedbackSection[]): string {
    const lines: string[] = [
        "CIEL PK — Community Impact Assessment (CII v5.0)",
        `Project: ${header.projectTitle}`,
        `Student: ${header.studentName}${header.university ? ` · ${header.university}` : ""}`,
        `Report ID: ${header.reportId}`,
        `AI report quality: ${formatPts(header.aiScore)} / 85`,
        `Admin evidence: ${formatPts(header.evidenceScore)} / 15`,
        `Composite CII: ${formatPts(header.compositeScore)} / 100${header.locked ? " (approved & locked)" : " (preview)"}`,
        `Badge: ${header.badgeLabel}`,
        "",
    ];
    if (header.overallSummary) lines.push(`Overall: ${header.overallSummary}`, "");
    if (header.overallStrengths?.length) lines.push(`Overall strengths: ${header.overallStrengths.join("; ")}`);
    if (header.overallPriorities?.length) lines.push(`Development priorities: ${header.overallPriorities.join("; ")}`);
    if (header.overallStrengths?.length || header.overallPriorities?.length) lines.push("");
    sections.forEach((s, i) => {
        lines.push(`SECTION ${i + 1} — D${s.dimension} ${s.name} (${formatPts(s.score)} / ${s.max})`);
        lines.push(s.summary);
        lines.push(`Strengths: ${s.strengths.join("; ") || "Not specified"}`);
        lines.push(`Limitations: ${s.limitations.join("; ") || "Not specified"}`);
        if (s.evidenceNotes.length) lines.push(`Evidence ratings: ${s.evidenceNotes.join("; ")}`);
        if (s.reviewedMarks?.length) lines.push(`Admin-reviewed marks: ${s.reviewedMarks.join("; ")}`);
        lines.push(`Recommendation: ${s.recommendation}`, "");
    });
    if (header.adminComment?.trim()) lines.push(`Admin comment: ${header.adminComment.trim()}`);
    return lines.join("\n").trimEnd() + "\n";
}
