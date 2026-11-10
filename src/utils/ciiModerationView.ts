/**
 * Pure helpers for the R3 Admin review UI (criterion mark review, L6 qualification form, supplemental
 * evidence form, review-record export). No imports, so the node:test suite loads it directly. The
 * score itself is always recomputed by the server; nothing here decides a mark or a badge.
 */

/** Same floor the server enforces whenever a reviewed mark changes. */
export const MIN_MODERATION_REASON = 8;

const round2 = (n: number) => Math.round((n + 1e-9) * 100) / 100;
const sameMark = (a: number | null | undefined, b: number | null | undefined) =>
    a == null || b == null ? a == null && b == null : Math.abs(a - b) < 1e-9;

export type MarkRow = {
    key: string;
    /** The criterion maximum. */
    weight: number;
    /** What the AI anchor earns (null while the AI left the criterion pending). */
    aiScore: number | null;
    /** The mark in force today: the reviewed mark when edited, else the AI mark. */
    currentScore: number | null;
    adminEdited: boolean;
};

/** Builds the mark rows of one section from the stored (recomputed) criterion results. */
export function markRowsFor(section: {
    criterionScores: ReadonlyArray<{ criterion: string; maximumPoints?: number; score: number | null; aiScore?: number | null; adminEdited?: boolean }>;
}): MarkRow[] {
    return section.criterionScores.map((c) => ({
        key: c.criterion,
        weight: c.maximumPoints ?? 0,
        aiScore: c.aiScore === undefined ? c.score : c.aiScore,
        currentScore: c.score,
        adminEdited: c.adminEdited === true,
    }));
}

export type MarkParse = { ok: true; value: number | null } | { ok: false; error: string };

/** One typed mark: blank is "no mark", otherwise a number within 0..max with at most two decimals. */
export function parseMarkInput(raw: string, max: number): MarkParse {
    const text = String(raw ?? "").trim();
    if (text === "") return { ok: true, value: null };
    if (!/^-?\d+(\.\d+)?$/.test(text)) return { ok: false, error: "Enter a number." };
    const n = Number(text);
    if (!Number.isFinite(n) || n < 0 || n > max) return { ok: false, error: `Must be between 0 and ${max}.` };
    if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return { ok: false, error: "At most two decimals." };
    return { ok: true, value: n };
}

/** The text a mark input starts from. */
export function markInputText(score: number | null | undefined): string {
    return score == null ? "" : String(round2(score));
}

export type MarkDiff = {
    /** criterion key -> new reviewed points, or null to restore the AI mark. Changed criteria only. */
    edits: Record<string, number | null>;
    errors: Record<string, string>;
    changed: string[];
};

/**
 * Compares what the Admin typed against the marks in force. `dirty` holds only the inputs the
 * Admin touched (key -> text); an untouched criterion is never sent. A mark equal to the AI mark on
 * an edited criterion is a restore (null); a blank on an edited criterion whose AI mark is pending is
 * also a restore; any other blank over a real mark is an error (use Restore AI mark).
 */
export function diffCriterionEdits(rows: MarkRow[], dirty: Record<string, string>): MarkDiff {
    const edits: Record<string, number | null> = {};
    const errors: Record<string, string> = {};
    for (const row of rows) {
        if (!(row.key in dirty)) continue;
        const parsed = parseMarkInput(dirty[row.key], row.weight);
        if (!parsed.ok) {
            errors[row.key] = parsed.error;
            continue;
        }
        const v = parsed.value;
        if (v === null) {
            if (row.adminEdited && row.aiScore === null) edits[row.key] = null;
            else if (row.currentScore !== null) errors[row.key] = "Enter a mark, or restore the AI mark.";
            continue;
        }
        if (row.aiScore !== null && sameMark(v, row.aiScore)) {
            if (row.adminEdited) edits[row.key] = null;
            continue;
        }
        if (sameMark(v, row.currentScore)) continue;
        edits[row.key] = v;
    }
    return { edits, errors, changed: Object.keys(edits) };
}

/**
 * Live section total from the typed marks: a valid typed mark wins, otherwise the mark in force.
 * Null while any criterion still has no mark (the AI left it pending and nothing was typed).
 */
export function sectionTotalFromInputs(rows: MarkRow[], dirty: Record<string, string>): { total: number | null; unsaved: boolean } {
    let total = 0;
    let missing = false;
    let unsaved = false;
    for (const row of rows) {
        let value = row.currentScore;
        if (row.key in dirty) {
            const parsed = parseMarkInput(dirty[row.key], row.weight);
            if (parsed.ok) {
                value = parsed.value;
                if (!sameMark(value, row.currentScore)) unsaved = true;
            } else {
                unsaved = true;
            }
        }
        if (value === null) missing = true;
        else total += value;
    }
    return { total: missing ? null : round2(total), unsaved };
}

export type ModeratePayload = {
    dimension: string;
    criterionEdits: Record<string, number | null>;
    reason: string;
    sourceRef?: string;
    expectedRevision: number;
};

/** Builds the /moderate body, or the first reason it cannot be sent. */
export function buildModeratePayload(args: {
    dimension: string;
    diff: MarkDiff;
    reason: string;
    sourceRef?: string;
    revision: number | null | undefined;
}): { ok: true; payload: ModeratePayload } | { ok: false; error: string } {
    const errorKeys = Object.keys(args.diff.errors);
    if (errorKeys.length) return { ok: false, error: `Fix the marked criterion: ${args.diff.errors[errorKeys[0]]}` };
    if (!args.diff.changed.length) return { ok: false, error: "No mark was changed." };
    const reason = String(args.reason ?? "").trim();
    if (reason.length < MIN_MODERATION_REASON) {
        return { ok: false, error: `Give a reason of at least ${MIN_MODERATION_REASON} characters for the change.` };
    }
    const sourceRef = String(args.sourceRef ?? "").trim();
    return {
        ok: true,
        payload: {
            dimension: args.dimension,
            criterionEdits: args.diff.edits,
            reason,
            ...(sourceRef ? { sourceRef } : {}),
            expectedRevision: args.revision ?? 0,
        },
    };
}

/** The moderation revision the editor last read (0 before the first edit). */
export function moderationRevision(result: { adminModeration?: { revision?: number } | null } | null | undefined): number {
    return result?.adminModeration?.revision ?? 0;
}

export type LogLike = {
    dimension: string;
    criterion: string;
    from: number | null;
    to: number | null;
    aiScore: number | null;
    reason: string;
    actorId: string;
    at: string;
};

const fmt = (n: number | null | undefined) => (n == null ? "pending" : String(round2(n)));

/** One review-log line: "Measured Change · Observed change: 2.8 → 4 (AI 2.8). Reason…". */
export function describeLogEntry(entry: LogLike, label: (dimension: string, criterion: string) => string): string {
    const restored = entry.to !== null && entry.aiScore !== null && sameMark(entry.to, entry.aiScore);
    return `${label(entry.dimension, entry.criterion)}: ${fmt(entry.from)} → ${fmt(entry.to)} (AI ${fmt(entry.aiScore)})${restored ? " · restored" : ""}. ${entry.reason}`;
}

/** Criteria the AI left pending that no Admin mark resolves yet (the readiness list). */
export function pendingCriteria(
    sections: ReadonlyArray<{ dimension: string; criterionScores: ReadonlyArray<{ criterion: string; score: number | null }> }>,
): Array<{ dimension: string; criterion: string }> {
    const out: Array<{ dimension: string; criterion: string }> = [];
    for (const section of sections) {
        if (section.dimension === "7") continue;
        for (const c of section.criterionScores) {
            if (c.score === null || c.score === undefined) out.push({ dimension: section.dimension, criterion: c.criterion });
        }
    }
    return out;
}

// ---------------------------------------------------------------- L6 qualification form

export type L6Form = {
    observedRetention: boolean;
    communityOwnership: boolean;
    externalCorroboration: boolean;
    sourceRef: string;
};

export const EMPTY_L6_FORM: L6Form = { observedRetention: false, communityOwnership: false, externalCorroboration: false, sourceRef: "" };

/** True once the Admin has entered anything on the qualification form. */
export function l6FormEntered(form: L6Form): boolean {
    return form.observedRetention || form.communityOwnership || form.externalCorroboration || form.sourceRef.trim() !== "";
}

/** The `l6Qualification` approve-body field: only for an R3 analysis and only when something was entered. */
export function l6ApprovePayload(r3: boolean, form: L6Form): L6Form | undefined {
    if (!r3 || !l6FormEntered(form)) return undefined;
    return { ...form, sourceRef: form.sourceRef.trim() };
}

/** Whether the qualification panel applies: a 90+ CII being approved, or an approved CII still pending L6. */
export function showL6Panel(args: { r3: boolean; locked: boolean; composite: number | null; badgeStatus: string | null | undefined }): "approve" | "confirm" | null {
    if (!args.r3) return null;
    if (args.locked) return args.badgeStatus === "L6_PENDING_QUALIFICATION" ? "confirm" : null;
    return args.composite !== null && args.composite >= 90 ? "approve" : null;
}

// ---------------------------------------------------------------- supplemental evidence form

export const SUPPLEMENTAL_SECTIONS = ["general", "1", "2", "3", "4A", "4B", "5", "6", "8", "9"] as const;
export const SUPPLEMENTAL_VISIBILITIES = ["restricted", "private", "public"] as const;

export function validateSupplementalForm(args: { hasFile: boolean; label: string }): string | null {
    if (!args.hasFile) return "Choose a file to attach.";
    const label = args.label.trim();
    if (label.length < 3) return "Label the file (3 to 120 characters): say why it was added.";
    if (label.length > 120) return "The label can be at most 120 characters.";
    return null;
}

export function sectionOptionLabel(section: string): string {
    return section === "general" ? "General (whole report)" : `Section ${section}`;
}

// ---------------------------------------------------------------- review record export

export type ReviewRecordInput = {
    reportId: string;
    projectTitle: string;
    result: {
        rubricVersion?: string | null;
        aiProposalScore?: number | null;
        aiReportScore?: number | null;
        adminEvidenceScore?: number | null;
        finalCII?: number | null;
        diagnosticCII?: number | null;
        moderated?: boolean;
        badgeStatus?: string | null;
        candidateBadge?: unknown;
        adminModeration?: unknown;
        l6Assessment?: unknown;
        sectionScores?: ReadonlyArray<{
            dimension: string;
            name?: string;
            maximumPoints?: number;
            score: number | null;
            criterionScores: ReadonlyArray<{
                criterion: string;
                anchor: unknown;
                maximumPoints?: number;
                score: number | null;
                aiScore?: number | null;
                adminEdited?: boolean;
            }>;
        }>;
    } | null;
    lock: Record<string, unknown> | null;
    evidenceMarks: Record<string, string>;
    evidenceComments: Record<string, string>;
    adminComment: string;
    supplemental: ReadonlyArray<Record<string, unknown>>;
    exportedAt: string;
};

/**
 * The review record an Admin can keep: the AI baseline (proposal total and every criterion's AI mark),
 * the reviewed marks and the full change log, the Admin evidence marks, the approval and the
 * supplemental files. Everything in it is already visible to this Admin on screen.
 */
export function buildReviewRecord(input: ReviewRecordInput) {
    const r = input.result;
    const lock = input.lock;
    return {
        kind: "ciel-admin-review-record",
        exportedAt: input.exportedAt,
        reportId: input.reportId,
        projectTitle: input.projectTitle,
        rubricVersion: r?.rubricVersion ?? null,
        officialApproval: lock?.locked === true,
        scores: {
            aiProposal: r?.aiProposalScore ?? null,
            aiReviewed: r?.aiReportScore ?? null,
            adminEvidence: r?.adminEvidenceScore ?? null,
            cii: lock?.locked === true ? (lock.adminApprovedScore ?? r?.finalCII ?? null) : (r?.diagnosticCII ?? null),
            moderated: r?.moderated === true,
        },
        sections: (r?.sectionScores ?? []).map((s) => ({
            dimension: s.dimension,
            name: s.name ?? null,
            maximum: s.maximumPoints ?? null,
            reviewedScore: s.score,
            criteria: (s.criterionScores ?? []).map((c) => ({
                criterion: c.criterion,
                anchor: c.anchor,
                maximum: c.maximumPoints ?? null,
                aiMark: c.aiScore ?? null,
                reviewedMark: c.score,
                adminEdited: c.adminEdited === true,
            })),
        })),
        adminModeration: r?.adminModeration ?? null,
        evidenceMarks: { anchors: input.evidenceMarks, comments: input.evidenceComments },
        adminComment: input.adminComment,
        badge: {
            status: lock?.badgeStatus ?? r?.badgeStatus ?? null,
            candidate: lock?.candidateBadge ?? r?.candidateBadge ?? null,
            awarded: lock?.finalBadge ?? null,
            l6Assessment: r?.l6Assessment ?? null,
            l6Qualification: lock?.l6Qualification ?? null,
        },
        approval: lock?.locked === true ? { hash: lock.hash ?? null, lockedAt: lock.lockedAt ?? null, lockedByAdminId: lock.lockedByAdminId ?? null } : null,
        supplementalEvidence: input.supplemental,
    };
}

export function reviewRecordFileName(reportId: string): string {
    return `CIEL_PK_Admin_Review_Record_${String(reportId || "report").replace(/[^a-z0-9_-]/gi, "_")}.json`;
}

/** Approve toast that never claims a badge that was not awarded. */
export function approveToast(badgeStatus: string | null | undefined, r3: boolean): string {
    if (r3 && badgeStatus === "L6_PENDING_QUALIFICATION") {
        return "CII approved and locked. The 90+ score is kept; L6 stays pending until the qualification is confirmed.";
    }
    return "CII v5.0 approved and locked — badge issued";
}
