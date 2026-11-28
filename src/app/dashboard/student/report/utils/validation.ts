/**
 * Validation utility for Student Report Form
 * Updated for the 11-Section Community Engagement Report
 */

import { SHORT_NOTE_MIN_WORDS, SHORT_NOTE_MAX_WORDS } from './section4Ladder';
import { MAX_ADDITIONAL_SDGS, additionalStudentSdgCount } from './sdgAdditionalCap';
import { isMixedResourceSource, resourceAmountNumber } from './resourceContributors';
import { activityIssues, challengeTagIssues, legacyOutcomeIssues, reachIssues, simpleMeasureIssues, splitOutcomes } from './section4Streamlined';
import { GLOBAL_ACTIVITY_TAXONOMY } from './globalActivityTaxonomy';
import { hasPublicSharePermission, isPublicMediaVisibility, resolveMediaVisibility } from './mediaVisibility';
import { riskBlockErrors } from './riskSafeguarding';
import { followupBlockErrors } from './sustainabilityFollowup';
import { contributorEmailLooksValid, contributorOrgRequired, contributorPhoneLooksValid, isExternalResourceSource, resourceContributedBy } from './resourceContributors';
import { isCashResource } from './resourceContributorsView';

export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}


/** Community report narrative textareas — default rule; specific fields can tighten it below. */
export const REPORT_TEXT_MIN_WORDS = 10;
export const REPORT_TEXT_MAX_WORDS = 200;
export const REPORT_TEXT_RANGE_LABEL = "10–200 words";

/** Per-field word-count overrides for narrative fields with a tighter, field-specific target. */
export const FIELD_WORD_POLICY: Record<string, { min: number; max: number }> = {
    problem_statement: { min: 10, max: 60 },
    discipline_contribution: { min: 15, max: 50 },
    contribution_intent_statement: { min: 30, max: 80 },
    student_contribution_intent_statement: { min: 10, max: 60 },
    justification_text: { min: 10, max: 60 },
    /** V19: "describe only what you observed; if nothing could be measured, say so" — short is fine. */
    observed_change: { min: 8, max: 100 },
    challenges: { min: 15, max: 60 },
    continuation_details: { min: 60, max: 120 },
    description: { min: 15, max: 60 },
    /** Confidence / proof note — 10 words is enough; keep it short. */
    measurement_explanation: { min: SHORT_NOTE_MIN_WORDS, max: SHORT_NOTE_MAX_WORDS },
    /** Overlap note when the same people appear in another activity. */
    overlap_note: { min: SHORT_NOTE_MIN_WORDS, max: SHORT_NOTE_MAX_WORDS },
    /** Step 7 extra-evidence caption — V19 "Optional evidence explanation": no minimum, up to 45 words. */
    evidence_caption: { min: 0, max: 45 },
    /** V19 Section 8 — the two reflections are scored on these ranges (same as the on-screen meters). */
    personal_learning: { min: 40, max: 100 },
    academic_application: { min: 25, max: 70 },
};

/** Step 8 chip ids, plus participation-enum aliases carried from program setup. */
export const ACADEMIC_INTEGRATION_OPTIONS: Array<{ id: string; aliases: string[] }> = [
    { id: "Voluntary extracurricular activity", aliases: ["Voluntary", "Voluntary Extracurricular"] },
    { id: "Course-linked assignment", aliases: ["Course-Linked", "Course-linked", "Directly related to coursework"] },
    { id: "Credit-bearing component", aliases: ["Credit-Bearing"] },
    { id: "Capstone / Thesis-linked project", aliases: ["Capstone / Thesis"] },
    { id: "Research-integrated project", aliases: ["Research-Integrated"] },
];

/** Map a participation enum or chip id onto the Step 8 Academic integration chip id. */
export function normalizeAcademicIntegration(value: unknown): string {
    const text = String(value || "").trim();
    if (!text) return "";
    const lower = text.toLowerCase();
    for (const opt of ACADEMIC_INTEGRATION_OPTIONS) {
        if (text === opt.id || opt.aliases.some((alias) => alias.toLowerCase() === lower)) {
            return opt.id;
        }
    }
    return text;
}

export function hasAcademicIntegration(value: unknown): boolean {
    return Boolean(String(value || "").trim());
}

export function wordRangeLabel(min: number, max: number): string {
    return min === 0 ? `up to ${max} words` : `${min}–${max} words`;
}

export function countWords(str: string): number {
    return String(str || "").trim().split(/\s+/).filter(w => w.length > 0).length;
}

function asObj(value: unknown): Record<string, any> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, any>)
        : {};
}

function asList<T = any>(value: unknown): T[] {
    return Array.isArray(value) ? value : [];
}

export function reportTextWordMeter(
    count: number,
    min: number = REPORT_TEXT_MIN_WORDS,
    max: number = REPORT_TEXT_MAX_WORDS,
): {
    ok: boolean;
    over: boolean;
    barClass: string;
    textClass: string;
    widthPct: number;
} {
    const over = count > max;
    const ok = count >= min && !over;
    return {
        ok,
        over,
        barClass: count < min ? "bg-amber-400" : over ? "bg-red-500" : "bg-emerald-500",
        textClass: ok ? "text-emerald-600" : over ? "text-red-500" : "text-slate-400",
        widthPct: Math.min((count / max) * 100, 100),
    };
}

function pushWordRange(
    errors: ValidationError[],
    field: string,
    value: unknown,
    label: string,
    required = true,
    policyKeyOverride?: string,
) {
    const policyKey = policyKeyOverride
        || (field.includes(".") ? field.slice(field.lastIndexOf(".") + 1) : field);
    const { min, max } = FIELD_WORD_POLICY[policyKey] || { min: REPORT_TEXT_MIN_WORDS, max: REPORT_TEXT_MAX_WORDS };
    const rangeLabel = wordRangeLabel(min, max);
    const text = typeof value === "string" ? value : "";
    if (!text.trim()) {
        if (required) {
            errors.push({
                field,
                message: `${label} must be ${rangeLabel} (0 current)`,
            });
        }
        return;
    }
    const n = countWords(text);
    if (n < min || n > max) {
        errors.push({
            field,
            message: `${label} must be ${rangeLabel} (${n} current)`,
        });
    }
}

/**
 * Section 1: Participation
 * Enforce individual hour requirements
 */
export function validateSection1(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    data = asObj(data);
    const reviewChecked = asList<boolean>(data.review_checked);
    const hasPrivacyConsent = Boolean(data.privacy_consent || reviewChecked[2]);
    // The 3-item declaration replaces the old mid-flow attendance-verification request — the
    // whole report is verified once, at the end, by faculty. All three boxes must be ticked.
    const declarationComplete = reviewChecked.length >= 3
        ? reviewChecked.slice(0, 3).every(Boolean)
        : false;

    if (!declarationComplete) {
        errors.push({ field: 'review_checked', message: 'Please complete all three declaration checkboxes.' });
    }

    // Older drafts store the consent only in the final review checklist.
    if (!hasPrivacyConsent) {
        errors.push({ field: 'privacy_consent', message: 'You must provide privacy consent to proceed.' });
    }

    // V19 item 08 — every counted session needs a photo / document (mirrors the backend submit gate).
    const missing = attendanceSessionsWithoutEvidence(data.attendance_logs);
    if (missing.length) {
        const dates = missing
            .map((log) => String(log.date || '').slice(0, 10))
            .filter(Boolean)
            .slice(0, 5)
            .join(', ');
        errors.push({
            field: 'attendance_logs',
            message: `${missing.length} attendance session${missing.length === 1 ? ' has' : 's have'} no supporting evidence${dates ? ` (${dates})` : ''}. Add a photo or document to each session, or remove it.`,
        });
    }

    return { isValid: errors.length === 0, errors };
}

export type AttendanceLogEvidenceShape = {
    id?: string;
    date?: unknown;
    approval_status?: unknown;
    approvalStatus?: unknown;
    entryStatus?: unknown;
    evidence_file?: unknown;
    evidence_url?: unknown;
    evidenceUrl?: unknown;
    evidence_urls?: unknown;
    evidenceUploaded?: unknown;
};

/** Any uploaded URL, upload flag or attached file counts as evidence for a session. */
export function attendanceLogHasEvidence(log: AttendanceLogEvidenceShape): boolean {
    if (log.evidence_file) return true;
    if (log.evidenceUploaded === true) return true;
    for (const v of [log.evidence_url, log.evidenceUrl]) {
        if (typeof v === 'string' && v.trim()) return true;
    }
    return Array.isArray(log.evidence_urls) && log.evidence_urls.length > 0;
}

/** Sessions a reviewer has already approved / verified are trusted as logged; rejected ones do not count. */
export function attendanceSessionIsFrozenByReviewer(log: AttendanceLogEvidenceShape): boolean {
    const approval = String(log.approval_status ?? log.approvalStatus ?? '').trim().toLowerCase();
    const entry = String(log.entryStatus ?? '').trim().toLowerCase();
    return approval === 'approved' || entry === 'verified';
}

/** Counted sessions (not rejected, not reviewer-approved) that carry no evidence — the ones item 08 blocks on. */
export function attendanceSessionsWithoutEvidence(logs: unknown): AttendanceLogEvidenceShape[] {
    if (!Array.isArray(logs)) return [];
    return logs.filter((raw): raw is AttendanceLogEvidenceShape => {
        if (!raw || typeof raw !== 'object') return false;
        const log = raw as AttendanceLogEvidenceShape;
        const approval = String(log.approval_status ?? log.approvalStatus ?? '').trim().toLowerCase();
        if (approval === 'rejected') return false;
        if (attendanceSessionIsFrozenByReviewer(log)) return false;
        return !attendanceLogHasEvidence(log);
    });
}


/**
 * Section 2: Project Context
 */
export function validateSection2(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    data = asObj(data);

    pushWordRange(errors, 'problem_statement', data.problem_statement, 'Problem statement');

    if (!String(data.affected_group || '').trim()) {
        errors.push({ field: 'affected_group', message: 'Who was affected is required' });
    }
    const affectedCount = Number(String(data.affected_count || '').replace(/,/g, ''));
    if (!String(data.affected_count || '').trim() || !Number.isFinite(affectedCount) || affectedCount <= 0) {
        errors.push({ field: 'affected_count', message: 'Enter the approximate number affected' });
    }
    if (!Array.isArray(data.system_gaps) || data.system_gaps.length === 0) {
        errors.push({ field: 'system_gaps', message: 'Choose at least one thing that was missing' });
    }

    if (!data.discipline) {
        errors.push({ field: 'discipline', message: 'Academic discipline is required' });
    } else if (data.discipline === 'Other…' && !String(data.discipline_other || '').trim()) {
        errors.push({ field: 'discipline_other', message: 'Please name your discipline' });
    }

    pushWordRange(errors, 'discipline_contribution', data.discipline_contribution, 'Discipline contribution explanation');

    if (!asList(data.baseline_evidence).length) {
        errors.push({ field: 'baseline_evidence', message: 'At least one baseline evidence type is required' });
    }

    // "Other" system-gap chip reveals required free-text row(s); support multi-entry Add another.
    if (Array.isArray(data.system_gaps) && data.system_gaps.includes('Other')) {
        const entries: string[] =
            Array.isArray(data.system_gaps_other_entries) && data.system_gaps_other_entries.length > 0
                ? data.system_gaps_other_entries
                : [String(data.system_gaps_other || '')];
        let anyFilled = false;
        for (let i = 0; i < entries.length; i++) {
            if (!String(entries[i] || '').trim()) {
                errors.push({
                    field: `system_gaps_other_entries.${i}`,
                    message: `Other gap #${i + 1} is required`,
                });
            } else {
                anyFilled = true;
            }
        }
        if (!anyFilled && entries.length === 0) {
            errors.push({ field: 'system_gaps_other', message: 'Please specify the "Other" system gap' });
        }
    }

    const hasOtherToken = Array.isArray(data.baseline_evidence) && (data.baseline_evidence as string[]).some((s) => /^__o_(\d+)$/.test(String(s)));
    const hasLegacyOther = Array.isArray(data.baseline_evidence) && (data.baseline_evidence as string[]).includes("Other");
    if (hasOtherToken || hasLegacyOther) {
        const entries: string[] =
            Array.isArray((data as { baseline_other_entries?: string[] }).baseline_other_entries) &&
            (data as { baseline_other_entries?: string[] }).baseline_other_entries!.length > 0
                ? (data as { baseline_other_entries: string[] }).baseline_other_entries
                : [String((data as { baseline_evidence_other?: string }).baseline_evidence_other || "")];
        for (let i = 0; i < entries.length; i++) {
            if (!String(entries[i] || "").trim()) {
                errors.push({
                    field: `baseline_other_entries.${i}`,
                    message: `Other evidence source #${i + 1} is required`,
                });
            }
        }
    }

    // 2.3 Risk, safeguarding & consent — only enforced once a real risk is selected, so reports
    // saved before this block existed (no risk_* keys) keep validating exactly as before.
    errors.push(...riskBlockErrors(data));

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 3: SDG Mapping
 */
export function validateSection3(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    data = asObj(data);
    const primary = asObj(data.primary_sdg);
    const hasStudentMappingSelection = Boolean(
        primary.goal_number ||
        primary.target_id ||
        primary.target_code ||
        primary.indicator_id ||
        primary.indicator_code
    );

    pushWordRange(errors, 'contribution_intent_statement', data.contribution_intent_statement, 'Contribution logic');

    const forbiddenPhrases = ["achieved", "solved", "eliminated"];
    const intent = String(data.contribution_intent_statement || "").toLowerCase();
    forbiddenPhrases.forEach(phrase => {
        if (intent.includes(phrase.toLowerCase())) {
            errors.push({ field: 'contribution_intent_statement', message: `Avoid outcome claims like "${phrase}". Focus on intent.` });
        }
    });

    if (hasStudentMappingSelection) {
        pushWordRange(errors, 'student_contribution_intent_statement', data.student_contribution_intent_statement, 'Student contribution logic');

        const studentIntent = String(data.student_contribution_intent_statement || "").toLowerCase();
        forbiddenPhrases.forEach(phrase => {
            if (studentIntent.includes(phrase.toLowerCase())) {
                errors.push({ field: 'student_contribution_intent_statement', message: `Avoid outcome claims like "${phrase}". Focus on intent.` });
            }
        });
    }

    asList(data.secondary_sdgs).forEach((sdg: any, index: number) => {
        // V19 3.2 — a student-discovered SDG is only credible with its Target and Indicator.
        if (!String(sdg?.target_id || '').trim()) {
            errors.push({ field: `secondary_sdgs.${index}.target_id`, message: `Additional SDG ${index + 1}: choose the closest genuine target` });
        }
        if (!String(sdg?.indicator_id || '').trim()) {
            errors.push({ field: `secondary_sdgs.${index}.indicator_id`, message: `Additional SDG ${index + 1}: the indicator is mandatory` });
        }
        pushWordRange(errors, `secondary_sdgs.${index}.justification_text`, sdg?.justification_text, 'Justification');
    });

    // V19 3.2 — up to two additional goals in total; the student's own primary mapping counts as
    // one when the opportunity already has a registered primary goal.
    const extraGoals = additionalStudentSdgCount(data);
    if (extraGoals > MAX_ADDITIONAL_SDGS) {
        errors.push({
            field: 'secondary_sdgs',
            message: `Additional SDGs: at most ${MAX_ADDITIONAL_SDGS} in total (your own primary mapping counts as one) — remove ${extraGoals - MAX_ADDITIONAL_SDGS}`,
        });
    }

    // V19 item 17 — one contribution statement per SDG registered as secondary on the opportunity.
    // Section 3 seeds a key per registered secondary SDG; reports without the map are left alone.
    const registered = asObj(data.registered_secondary_contributions);
    Object.keys(registered)
        .sort((a, b) => Number(a) - Number(b))
        .forEach((goal) => {
            pushWordRange(
                errors,
                `registered_secondary_contributions.${goal}`,
                registered[goal],
                `Registered SDG ${goal} contribution`,
                true,
                'justification_text',
            );
        });

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 4: Activities & Outputs
 */
export function validateSection4(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    data = asObj(data);
    const activityBlocks = asList(data.activity_blocks).map((block: any) => asObj(block));

    if (!activityBlocks.length) {
        errors.push({ field: 'activity_blocks', message: 'At least one activity block is required' });
    } else {
        activityBlocks.forEach((row: any, index: number) => {
            // V19 streamlined card: name, status, category (+ sub / custom), what we did, and what we
            // delivered (≥ 1 complete output, or the explicit "no countable output" + reason).
            const issues = activityIssues(row, index, (category) => GLOBAL_ACTIVITY_TAXONOMY[category] || []);
            const descIssue = issues.find((i) => i.field.endsWith('.description'));
            issues.filter((i) => i !== descIssue).forEach((i) => errors.push(i));
            if (descIssue) errors.push(descIssue);
            else pushWordRange(errors, `activity_blocks.${index}.description`, row.description, `Activity ${index + 1} description`);
            // Older ladder rows that only recorded a per-activity reach (no outputs) stay valid.
            const legacyReach = String(row.beneficiaries_reached ?? '').trim() && !row.v19 && !row.no_output && !asList(row.outputs).length;
            if (legacyReach) {
                const idx = errors.findIndex((e) => e.field === `activity_blocks.${index}.outputs`);
                if (idx >= 0) errors.splice(idx, 1);
            }
        });
    }

    // 4.2 Community reach: one project-level answer (counted + source, unconfirmed, or none).
    reachIssues(asObj(data.project_summary), activityBlocks).forEach((i) => errors.push(i));

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 5: Outcomes & Results
 */
export function validateSection5(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    data = asObj(data);
    pushWordRange(errors, 'observed_change', data.observed_change, 'Observed change narrative');
    // V19 4.3 — the results story has three blanks; "How do you know?" is the evidence basis of the claim.
    if (!String(data.story_because || '').trim() && !asList(data.evidence_basis_tags).length) {
        errors.push({
            field: 'story_because',
            message: 'How do you know? — name the evidence behind the change (or say that no change could be measured yet)',
        });
    }

    // V19: the one before / after result is optional; when started it must be complete. Older
    // detailed outcomes (no `simple` flag) keep their original rules.
    // Blank earlier-version rows (the old form saved one by default) carry nothing and never block;
    // rows with information keep the original detailed rules and are shown in 4.3 to finish or remove.
    const split = splitOutcomes(asList(data.measurable_outcomes));
    simpleMeasureIssues(split.simple ? asObj(split.simple) : null).forEach((i) => errors.push(i));
    split.legacy.forEach(({ row }, index) => {
        legacyOutcomeIssues(row, index).forEach((i) => errors.push(i));
    });

    challengeTagIssues(data.challenge_tags).forEach((i) => errors.push(i));
    pushWordRange(errors, 'challenges', data.challenges, 'Challenges description');

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 6: Resources
 */
/** Section 5 (Resources) 6.2 — "What did it make possible?" must be a line, not a word. */
export const RESOURCE_PURPOSE_MIN_WORDS = 3;

export function validateSection6(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    data = asObj(data);

    if (data.use_resources !== 'yes' && data.use_resources !== 'no') {
        errors.push({ field: 'use_resources', message: 'Tell us whether the project used extra resources' });
    }
    
    if (data.use_resources === 'yes') {
        const resources = asList(data.resources);
        // V21 step 3: every box carries a proof file. Files saved before proofs were linked to boxes
        // (no resource_index) still count until they are linked or removed.
        const proofFiles = asList(data.evidence_files);
        const linkedProofIndexes = new Set<number>(
            proofFiles.map((file: any) => (typeof file?.resource_index === 'number' ? file.resource_index : -1)).filter((i: number) => i >= 0),
        );
        const hasUnlinkedProofs = proofFiles.some((file: any) => typeof file?.resource_index !== 'number');
        if (!resources.length) {
            errors.push({ field: 'resources', message: 'Please list the resources used' });
        } else {
            resources.forEach((res: any, index: number) => {
                const row = asObj(res);
                // One clear line beats a 50-word minimum — just require it's said.
                // V19 6.2 — type, quantity/value, unit, source(s) and verification method(s) make an entry complete.
                if (!String(row.type || '').trim()) {
                    errors.push({ field: `resources.${index}.type`, message: 'Choose the resource type' });
                }
                const amountNumber = resourceAmountNumber(row.amount);
                if (!String(row.amount ?? '').trim()) {
                    errors.push({ field: `resources.${index}.amount`, message: 'Enter the amount or quantity' });
                } else if (amountNumber !== null && amountNumber <= 0) {
                    // A negative or zero quantity is not a resource (mirrors the backend submit gate).
                    errors.push({ field: `resources.${index}.amount`, message: 'Enter an amount greater than 0' });
                }
                if (!String(row.unit || '').trim()) {
                    errors.push({ field: `resources.${index}.unit`, message: 'Choose the unit' });
                }
                if (!asList(row.sources).length) {
                    // V21 asks "Who contributed it?" and then "Who are they?" — the sources follow those answers.
                    const who = resourceContributedBy(row);
                    errors.push({
                        field: `resources.${index}.sources`,
                        message: who === 'outside' || who === 'both' ? 'Choose what kind of contributor they are' : 'Choose who contributed this resource',
                    });
                }
                if (!asList(row.verification).length) {
                    errors.push({ field: `resources.${index}.verification`, message: 'Choose at least one verification method' });
                }
                if (!hasUnlinkedProofs && !linkedProofIndexes.has(index)) {
                    errors.push({ field: `resources.${index}.proof`, message: 'Upload a receipt, photo, letter or other proof' });
                }
                if (!String(row.purpose || '').trim()) {
                    errors.push({ field: `resources.${index}.purpose`, message: 'Say what this resource made possible' });
                } else if (countWords(String(row.purpose)) < RESOURCE_PURPOSE_MIN_WORDS) {
                    // One clear line, not a single word — same rule as the backend submit gate.
                    errors.push({ field: `resources.${index}.purpose`, message: `What did it make possible? — write one clear line (at least ${RESOURCE_PURPOSE_MIN_WORDS} words)` });
                }

                if (['Other (Specify)', 'Other / Custom'].includes(row.type) && !String(row.type_other || '').trim()) {
                    errors.push({ field: `resources.${index}.type_other`, message: 'Please specify the resource type' });
                }

                if (['Other (Specify)', 'Other…'].includes(row.unit) && !String(row.unit_other || '').trim()) {
                    errors.push({ field: `resources.${index}.unit_other`, message: 'Please specify the unit' });
                }

                const sources = asList(row.sources);
                if (sources.some((item: string) => item === 'Other (Specify)' || item === 'Other / Custom Source') && !String(row.source_other || '').trim()) {
                    errors.push({ field: `resources.${index}.source_other`, message: 'Please specify the source' });
                }

                // Accountability: a contribution from outside the team names its contributor and
                // carries an evidence trail (mirrors the backend submit gate).
                const external = isExternalResourceSource(sources);
                // V19 5.2 mixed source: the student team's share is recorded in the same unit; the
                // contributor's share is the remainder, so the two always reconcile to the total.
                if (isMixedResourceSource(sources)) {
                    const shareText = String(row.student_team_share ?? '').trim();
                    const share = resourceAmountNumber(row.student_team_share);
                    if (!shareText) {
                        errors.push({ field: `resources.${index}.student_team_share`, message: "Record the student team's share in the same unit (enter 0 if none)" });
                    } else if (share === null || share < 0) {
                        errors.push({ field: `resources.${index}.student_team_share`, message: "The student team's share must be a number of 0 or more" });
                    } else if (amountNumber !== null && share > amountNumber) {
                        errors.push({ field: `resources.${index}.student_team_share`, message: `The student team's share (${share}) cannot exceed the resource total (${amountNumber})` });
                    }
                }
                if (!contributorEmailLooksValid(row.contributor_email)) {
                    errors.push({ field: `resources.${index}.contributor_email`, message: 'Enter a valid email address' });
                }
                const phoneGiven = String(row.contributor_phone || '').trim() !== '';
                if (phoneGiven && !contributorPhoneLooksValid(row.contributor_phone_code, row.contributor_phone)) {
                    errors.push({ field: `resources.${index}.contributor_phone`, message: 'Mobile number needs a country code, e.g. +92 300 1234567' });
                }
                if (external) {
                    if (!String(row.contributor_name || '').trim()) {
                        errors.push({ field: `resources.${index}.contributor_name`, message: 'Name the contributor of this resource' });
                    }
                    if (contributorOrgRequired(row) && !String(row.contributor_org || '').trim()) {
                        errors.push({ field: `resources.${index}.contributor_org`, message: 'Add the organization name' });
                    }
                    if (!String(row.contributor_email || '').trim()) {
                        errors.push({ field: `resources.${index}.contributor_email`, message: "Add the contributor's email" });
                    }
                    if (!phoneGiven) {
                        errors.push({ field: `resources.${index}.contributor_phone`, message: "Add the contributor's mobile number with country code" });
                    }
                    if (!String(row.evidence_trail || '').trim()) {
                        errors.push({ field: `resources.${index}.evidence_trail`, message: 'Describe the evidence trail: where it came from, how it was used, who received it' });
                    }
                    // Optional estimated PKR value of a non-cash contribution: only checked once entered.
                    // Only while the field is on screen (a unit is chosen and the resource is not cash):
                    // a value left behind after switching to cash must not block submit.
                    const valueText = String(row.contributor_value_pkr ?? '').trim();
                    if (valueText && String(row.unit ?? '').trim() && !isCashResource(row)) {
                        const value = Number(valueText.replace(/,/g, ''));
                        if (!Number.isFinite(value) || value <= 0 || !/^\d[\d,]*(\.\d{1,2})?$/.test(valueText)) {
                            errors.push({ field: `resources.${index}.contributor_value_pkr`, message: 'The estimated PKR value must be a positive amount (up to two decimal places)' });
                        }
                        if (!String(row.contributor_value_basis ?? '').trim()) {
                            errors.push({ field: `resources.${index}.contributor_value_basis`, message: 'Say how it was valued (invoice, quotation or market rate)' });
                        }
                    }
                }
            });
        }
    }
    
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 7: Partnerships
 */
export function validateSection7(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    data = asObj(data);

    // Require explicit selection — empty string means user hasn't chosen yet
    if (!data.has_partners) {
        errors.push({ field: 'has_partners', message: 'Please confirm whether this project had active partners' });
        return { isValid: false, errors };
    }

    // If 'no', bypass all further validation
    if (data.has_partners === 'no') {
        return { isValid: true, errors: [] };
    }

    // has_partners === 'yes' — must have at least one partner
    const partners = asList(data.partners);
    if (!partners.length) {
        errors.push({ field: 'partners', message: 'Please list your external partners' });
        return { isValid: false, errors };
    }

    // Validate individual partner fields
    partners.forEach((p: any, index: number) => {
        const row = asObj(p);
        if (!String(row.name || '').trim()) {
            errors.push({ field: `partners.${index}.name`, message: `Partner ${index + 1}: Organization name is required` });
        }
        // The partner type is "Recommended" on the card (V19 Section 6 asks for roles and the
        // contribution line); only a chosen "Other" must be spelled out.
        // "Others (please specify)" reveals a required free-text field (Section7Partnerships.tsx)
        // that was never actually enforced here — selecting it and leaving it blank passed submit.
        if ((row.type === 'Others (please specify)' || row.type === '✏️ Other') && !String(row.type_other || '').trim()) {
            errors.push({ field: `partners.${index}.type_other`, message: `Partner ${index + 1}: Please specify the "Other" partner type` });
        }
        const roleList = Array.isArray(row.role) ? row.role : (row.role ? [String(row.role)] : []);
        if (!roleList.length) {
            errors.push({ field: `partners.${index}.role`, message: `Partner ${index + 1}: At least one role in project is required` });
        }
        if (!asList(row.contribution).length && !String(row.contribution || '').trim()) {
            errors.push({ field: `partners.${index}.contribution`, message: `Partner ${index + 1}: say what this partner contributed, in one line` });
        }
    });

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 8: Evidence & Ethics
 */
export function validateSection8(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    data = asObj(data);

    if (data.has_evidence !== 'yes' && data.has_evidence !== 'no') {
        errors.push({ field: 'has_evidence', message: 'Tell us whether you have more evidence to add' });
    }

    if (data.has_evidence === 'yes') {
        if (!asList(data.evidence_files).length) {
            errors.push({ field: 'evidence_files', message: 'Add at least one evidence file' });
        }
        if (!asList(data.evidence_types).length) {
            errors.push({ field: 'evidence_types', message: 'Choose at least one evidence type' });
        }
        const types: string[] = asList(data.evidence_types);
        if (types.some((type) => /other supporting document/i.test(String(type))) && !String(data.evidence_type_other || '').trim()) {
            errors.push({ field: 'evidence_type_other', message: 'Say what kind of document this is' });
        }
        // V19 8.2 — the caption is optional ("Optional evidence explanation"); a given one stays within 45 words.
        pushWordRange(errors, 'description', data.description, 'What does your evidence show?', false, 'evidence_caption');
    }

    // V19 8.2 — the consolidated authenticity / consent / privacy confirmation is mandatory for every report.
    if (!evidenceEthicsConfirmed(data.ethical_compliance)) {
        errors.push({
            field: 'ethical_compliance',
            message: 'Confirm that the evidence is authentic, relates to this project, and that consent and privacy details are reported accurately',
        });
    }

    const visibility = resolveMediaVisibility(data.media_visible);
    if (isPublicMediaVisibility(visibility) && !hasPublicSharePermission(data)) {
        errors.push({ field: 'public_share_permission', message: 'Confirm informed consent for public publication of this evidence (including identifiable individuals and minors), or choose Restricted.' });
    }
    return { isValid: errors.length === 0, errors };
}

/** All four wizard flags — one confirmation statement in the Section 8 UI (mirrors the backend gate). */
export const EVIDENCE_ETHICS_FLAGS = ['authentic', 'informed_consent', 'no_harm', 'privacy_respected'] as const;
export function evidenceEthicsConfirmed(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    const flags = value as Record<string, unknown>;
    return EVIDENCE_ETHICS_FLAGS.every((key) => flags[key] === true);
}

/**
 * Section 9: Reflection
 */
export function validateSection9(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    data = asObj(data);

    if (!hasAcademicIntegration(data.academic_integration)) {
        errors.push({
            field: 'academic_integration',
            message: 'Tap an Academic integration option (Voluntary, course, credit, capstone, or research)',
        });
    }
    const skills = asList(data.skills_grown);
    if (!skills.length) {
        errors.push({ field: 'skills_grown', message: 'Tap at least one skill you grew' });
    }
    if (skills.some((skill: string) => String(skill).replace(/^✏️\s*/, '').trim().toLowerCase() === 'other') && !String(data.skills_grown_other || '').trim()) {
        errors.push({ field: 'skills_grown_other', message: 'Name the other skill you grew' });
    }
    if (!String(data.reflection_biggest_learning || '').trim()) {
        errors.push({ field: 'reflection_biggest_learning', message: 'Say the biggest thing you learned' });
    }
    if (!String(data.reflection_moment || '').trim()) {
        errors.push({ field: 'reflection_moment', message: 'Name a moment that changed how you see things' });
    }
    if (!String(data.reflection_discipline_help || '').trim()) {
        errors.push({ field: 'reflection_discipline_help', message: 'Name an academic skill you actually applied' });
    }

    pushWordRange(errors, 'personal_learning', data.personal_learning, 'Personal growth statement');
    pushWordRange(errors, 'academic_application', data.academic_application, 'Academic application explanation');

    const scoreKeys = [
        'cognitive_systemic', 'cognitive_critical', 'cognitive_evaluate',
        'practical_design', 'practical_evidence', 'practical_engagement',
        'social_empathy', 'social_diversity', 'social_collaboration',
        'transformative_longterm', 'transformative_benefits', 'transformative_sustainability',
    ];
    const scores = asObj(data.competency_scores);
    if (!scoreKeys.every((key) => Number(scores[key]) >= 1)) {
        errors.push({ field: 'competency_scores', message: 'Rate all 12 competencies' });
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 10: Sustainability
 */
export function validateSection10(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    data = asObj(data);
    if (!data.continuation_status) {
        errors.push({ field: 'continuation_status', message: 'Choose whether the impact will continue after you (Yes / Partial / No)' });
    }
    pushWordRange(errors, 'continuation_details', data.continuation_details, 'What continues, what stops?');

    const mechanisms = asList(data.mechanisms);
    if (!mechanisms.length) {
        errors.push({ field: 'mechanisms', message: 'Tap at least one option under What keeps it alive?' });
    }
    if (mechanisms.some((item: string) => String(item).replace(/^✏️\s*/, '').trim().toLowerCase() === 'other') && !String(data.mechanism_other || '').trim()) {
        errors.push({ field: 'mechanism_other', message: 'Say what else keeps it going' });
    }
    if (!data.scaling_potential) {
        errors.push({ field: 'scaling_potential', message: 'Select a Scaling potential option' });
    }
    if (!data.policy_influence) {
        errors.push({ field: 'policy_influence', message: 'Select whether this project influenced a long-term system' });
    }
    // 9.5 Follow-up check — optional; only enforced once a plan is chosen, so reports saved before
    // 9.5 existed (no followup_* keys) keep validating exactly as before.
    errors.push(...followupBlockErrors(data));
    return { isValid: errors.length === 0, errors };
}

/** Labels for data sections 1–10. UI merges 4+5 into one tab and renumbers 6–10 as 5–9. */
export const REPORT_SECTION_LABELS: Record<number, string> = {
    1: 'Participation',
    2: 'Context',
    3: 'SDG Mapping',
    4: 'Activities & Outputs (Part A)',
    5: 'Activities & Outputs (Part B)',
    6: 'Resources',
    7: 'Partnerships',
    8: 'Evidence',
    9: 'Reflection',
    10: 'Sustainability',
};

export type SectionIncompleteInfo = {
    section: number;
    label: string;
    errors: ValidationError[];
};

/**
 * Returns each of sections 1–10 that still fail validation, with field-level messages
 * (used on the summary step and before submit).
 */
export function getIncompleteSectionsSummary(data: {
    section1: any;
    section2: any;
    section3: any;
    section4: any;
    section5: any;
    section6: any;
    section7: any;
    section8: any;
    section9: any;
    section10: any;
}): SectionIncompleteInfo[] {
    const rows: Array<{ section: number; result: ValidationResult }> = [
        { section: 1, result: validateSection1(data?.section1) },
        { section: 2, result: validateSection2(data?.section2) },
        { section: 3, result: validateSection3(data?.section3) },
        { section: 4, result: validateSection4(data?.section4) },
        { section: 5, result: validateSection5(data?.section5) },
        { section: 6, result: validateSection6(data?.section6) },
        { section: 7, result: validateSection7(data?.section7) },
        { section: 8, result: validateSection8(data?.section8) },
        { section: 9, result: validateSection9(data?.section9) },
        { section: 10, result: validateSection10(data?.section10) },
    ];
    return rows
        .filter((r) => !r.result.isValid)
        .map((r) => ({
            section: r.section,
            label: REPORT_SECTION_LABELS[r.section] || `Section ${r.section}`,
            errors: r.result.errors,
        }));
}
