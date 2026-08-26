import { parseSection11AuditSummary } from "@/lib/parseCIIauditSummary";
import {
    isSection11V81Evaluation,
    parseSection11V81Response,
    type Section11V81Evaluation,
    type Section11V81SectionScore,
} from "@/lib/parseSection11V81";
import {
    CII_BREAKDOWN_ORDER,
    CII_SECTION_LABELS,
    CII_SECTION_MAX,
    type CIIBreakdownKey,
} from "@/app/dashboard/student/report/utils/ciiSectionWeights";
import { mergeReportSdgSnapshotRows } from "@/app/dashboard/student/report/utils/reportSdgMerge";
import type { ReportData } from "@/app/dashboard/student/report/context/ReportContext";
import { findSdgById } from "@/utils/sdgData";
import { readPersistedCiiSnapshot } from "@/utils/reportCiiSnapshot";
import { resolveCiiLevelRecognition } from "@/utils/ciiLevelBadge";
import { getReportProjectContextDisplay } from "@/utils/reportProjectContext";
import { dataSectionReviewBannerLabel } from "@/app/dashboard/student/report/utils/reportWizardNav";

export const CONDITIONAL_REMARK_PREFIX = "[Conditional badge]";
export const ADMIN_REVIEW_REMARK_PREFIX = "[Admin review requested]";

export type FacultyDecisionKind = "ap" | "cn" | "ar" | "";

export type FacultyEvidenceItem = {
    url: string;
    label: string;
    ext: string;
    isImage: boolean;
};

export type FacultySectionRow = {
    n: number;
    name: string;
    weight: number;
    anchor: number | null;
    score: number | null;
    comment: string;
};

export type FacultyBonusFlag = {
    kind: "bonus" | "flag";
    label: string;
};

export type FacultyAiEvaluationModel = {
    title: string;
    studentsLine: string;
    partnerLine: string;
    timelineLine: string;
    university: string;
    discipline: string;
    sdgs: Array<{ goalNumber: number; label: string; color: string; primary: boolean }>;
    hoursLabel: string;
    reachedLabel: string;
    attendanceLabel: string;
    evidenceCount: number;
    evidence: FacultyEvidenceItem[];
    aiQuote: string;
    sectionBanners: Array<{ n: number; label: string; text: string }>;
    cii: number | null;
    ciiMax: number;
    levelTitle: string;
    levelName: string;
    certificateLine: string;
    readiness: string;
    indices: Array<{ label: string; value: string }>;
    sections: FacultySectionRow[];
    bonusesFlags: FacultyBonusFlag[];
    studentFeedbackHtmlParts: string[];
    actions: string[];
    facultyStatus: string;
    facultyRemarks: string;
    decision: FacultyDecisionKind;
    hasAiEvaluation: boolean;
    frameworkVersion: string;
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function pickString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function pickNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number(value.replace(/[%+,]/g, "").trim());
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function fileExt(url: string, fallback = "FILE"): string {
    const clean = url.split("?")[0] || "";
    const match = clean.match(/\.([a-z0-9]{2,5})$/i);
    return match?.[1] ? match[1].toUpperCase() : fallback;
}

function isImageUrl(url: string, ext: string): boolean {
    if (url.startsWith("data:image/")) return true;
    return ["JPG", "JPEG", "PNG", "GIF", "WEBP", "AVIF"].includes(ext);
}

function collectUrls(value: unknown, into: FacultyEvidenceItem[]): void {
    if (!value) return;
    if (typeof value === "string") {
        const url = value.trim();
        if (!url || url === "undefined") return;
        const ext = fileExt(url);
        into.push({
            url,
            label: url.split("/").pop()?.split("?")[0] || "Evidence",
            ext,
            isImage: isImageUrl(url, ext),
        });
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) collectUrls(item, into);
        return;
    }
    const rec = asRecord(value);
    const url =
        pickString(rec.url) ||
        pickString(rec.evidence_url) ||
        pickString(rec.file_url) ||
        pickString(rec.src) ||
        pickString(rec.href) ||
        pickString(rec.path);
    if (!url) return;
    const ext = fileExt(url, pickString(rec.type) || "FILE");
    into.push({
        url,
        label: pickString(rec.name) || pickString(rec.label) || url.split("/").pop()?.split("?")[0] || "Evidence",
        ext,
        isImage: isImageUrl(url, ext),
    });
}

function uniqueEvidence(items: FacultyEvidenceItem[]): FacultyEvidenceItem[] {
    const seen = new Set<string>();
    const out: FacultyEvidenceItem[] = [];
    for (const item of items) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        out.push(item);
    }
    return out.slice(0, 24);
}

function readEvaluation(report: Record<string, unknown>): Section11V81Evaluation | null {
    const section11 = asRecord(report.section11);
    const candidates = [section11.evaluation, section11.ai_evaluation, section11.v82, section11.v81, section11];
    for (const candidate of candidates) {
        if (isSection11V81Evaluation(candidate)) return candidate;
    }
    const texts = [section11.summary_text, section11.raw_response, section11.ai_response, report.section11];
    for (const text of texts) {
        if (typeof text !== "string" || !text.trim()) continue;
        const parsed = parseSection11V81Response(text);
        if (parsed) return parsed.evaluation;
    }
    return null;
}

function resolveStudentFeedback(evalData: Section11V81Evaluation | null) {
    return evalData?.student_feedback ?? evalData?.student_facing_feedback ?? null;
}

function resolveSectionScore(row: Section11V81SectionScore): number | null {
    return pickNumber(row.score) ?? pickNumber(row.final_section_score);
}

function formatHours(hours: number | null): string {
    if (hours === null) return "—";
    const rounded = Math.round(hours * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}h` : `${rounded}h`;
}

function percentChange(baseline: number, endline: number): string {
    if (baseline === 0) return "—";
    const delta = ((endline - baseline) / Math.abs(baseline)) * 100;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${Math.round(delta)}%`;
}

function parseOutcomeNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const match = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
}

function facultyStatusKey(value: unknown): string {
    return pickString(value).toLowerCase().replace(/[\s-]+/g, "_") || "pending";
}

export function decisionFromFacultyRecord(status: unknown, remarks: unknown): FacultyDecisionKind {
    const key = facultyStatusKey(status);
    const note = pickString(remarks);
    if (key === "rejected" || note.startsWith(ADMIN_REVIEW_REMARK_PREFIX)) return "ar";
    if (key === "approved" && note.startsWith(CONDITIONAL_REMARK_PREFIX)) return "cn";
    if (key === "approved") return "ap";
    return "";
}

export function buildFacultyActionBody(kind: Exclude<FacultyDecisionKind, "">, notes: string) {
    const trimmed = notes.trim();
    if (kind === "ap") {
        return { status: "approved" as const, remarks: trimmed || undefined };
    }
    if (kind === "cn") {
        return {
            status: "approved" as const,
            remarks: trimmed ? `${CONDITIONAL_REMARK_PREFIX} ${trimmed}` : CONDITIONAL_REMARK_PREFIX,
        };
    }
    return {
        status: "rejected" as const,
        remarks: trimmed ? `${ADMIN_REVIEW_REMARK_PREFIX} ${trimmed}` : ADMIN_REVIEW_REMARK_PREFIX,
    };
}

export function buildFacultyAiEvaluationModel(raw: unknown): FacultyAiEvaluationModel | null {
    if (!raw || typeof raw !== "object") return null;
    const report = raw as Record<string, unknown>;
    const student = asRecord(report.student);
    const opportunity = asRecord(report.opportunity);
    const section1 = asRecord(report.section1);
    const section2 = asRecord(report.section2);
    const section3 = asRecord(report.section3);
    const section4 = asRecord(report.section4);
    const section5 = asRecord(report.section5);
    const section11 = asRecord(report.section11);
    const metrics = asRecord(section1.metrics);
    const teamLead = asRecord(section1.team_lead);
    const context = getReportProjectContextDisplay(report);
    const evaluation = readEvaluation(report);
    const snapshot = readPersistedCiiSnapshot(report);
    const feedback = resolveStudentFeedback(evaluation);
    const audit = parseSection11AuditSummary(pickString(section11.summary_text));

    const teamMembers = Array.isArray(section1.team_members) ? section1.team_members : [];
    const names = [
        pickString(student.name) || pickString(teamLead.fullName) || pickString(teamLead.name),
        ...teamMembers
            .map((row) => {
                const rec = asRecord(row);
                return pickString(rec.fullName) || pickString(rec.name);
            })
            .filter(Boolean),
    ].filter(Boolean);
    const uniqueNames = [...new Set(names)];

    const sdgRows = mergeReportSdgSnapshotRows(report, section3 as ReportData["section3"]);
    const sdgs = sdgRows.map((row) => {
        const sdg = findSdgById(row.goalNumber);
        const target = row.targetId?.trim();
        return {
            goalNumber: row.goalNumber,
            label: target ? `SDG ${row.goalNumber} · ${target}` : `SDG ${row.goalNumber}`,
            color: sdg?.color || "#0e7d74",
            primary: row.role === "primary",
        };
    });

    const hours =
        pickNumber(metrics.total_verified_hours) ??
        pickNumber(opportunity.hours) ??
        pickNumber(opportunity.expected_hours);

    const impactScale = asRecord(section4.impact_scale);
    const reached =
        pickString(impactScale.distinct_total_beneficiaries) ||
        pickString(impactScale.beneficiaries_reached) ||
        pickString(section4.primary_beneficiary) ||
        "—";

    const outcomes = Array.isArray(section5.measurable_outcomes) ? section5.measurable_outcomes : [];
    let attendanceLabel = "—";
    for (const outcome of outcomes) {
        const rec = asRecord(outcome);
        const baseline = parseOutcomeNumber(rec.baseline);
        const endline = parseOutcomeNumber(rec.endline);
        if (baseline === null || endline === null) continue;
        const metric = `${pickString(rec.metric)} ${pickString(rec.outcome_area)}`.toLowerCase();
        if (metric.includes("attend") || attendanceLabel === "—") {
            attendanceLabel = percentChange(baseline, endline);
            if (metric.includes("attend")) break;
        }
    }

    const evidence: FacultyEvidenceItem[] = [];
    collectUrls(report.evidence_urls, evidence);
    collectUrls(asRecord(report.section8).evidence_files, evidence);
    collectUrls(asRecord(report.section8).partner_verification_files, evidence);
    collectUrls(asRecord(report.section6).evidence_files, evidence);
    const uniqueFiles = uniqueEvidence(evidence);

    const cii =
        pickNumber(evaluation?.final_result?.cii_score) ??
        (snapshot ? Math.round(snapshot.totalScore) : null);
    const recognition = cii !== null ? resolveCiiLevelRecognition(cii) : null;
    const levelTitle =
        pickString(evaluation?.final_result?.badge_title) || recognition?.title || pickString(snapshot?.level) || "—";
    const levelName =
        evaluation?.final_result?.level != null
            ? `Level ${evaluation.final_result.level}`
            : recognition
              ? `Level ${recognition.level}`
              : "—";

    const indicesRec = evaluation?.indices || {};
    const indices = [
        {
            label: "Quality",
            value:
                pickNumber(indicesRec.quality_index_out_of_10) !== null
                    ? `${indicesRec.quality_index_out_of_10}/10`
                    : "—",
        },
        {
            label: "Quantity",
            value:
                pickNumber(indicesRec.quantity_index_out_of_10) !== null
                    ? `${indicesRec.quantity_index_out_of_10}/10`
                    : "—",
        },
        {
            label: "Evidence Confidence",
            value:
                pickNumber(indicesRec.evidence_confidence_index_out_of_10) !== null
                    ? `${indicesRec.evidence_confidence_index_out_of_10}/10`
                    : "—",
        },
        {
            label: "Integrity Audit",
            value:
                pickNumber(indicesRec.integrity_audit_score_out_of_10) !== null
                    ? `${indicesRec.integrity_audit_score_out_of_10}/10`
                    : "—",
        },
    ];

    const evalSections = Array.isArray(evaluation?.section_scores) ? evaluation!.section_scores! : [];
    const sections: FacultySectionRow[] = CII_BREAKDOWN_ORDER.map((key: CIIBreakdownKey, index) => {
        const n = index + 1;
        const fromEval = evalSections.find((row) => row.section_number === n);
        const sectionRec = asRecord(report[`section${n}`]);
        const weight = pickNumber(fromEval?.weight) ?? CII_SECTION_MAX[key];
        const score =
            (fromEval ? resolveSectionScore(fromEval) : null) ??
            pickNumber(snapshot?.breakdown?.[key]) ??
            null;
        const comment =
            pickString(fromEval?.student_facing_comment) ||
            pickString(fromEval?.what_was_done) ||
            pickString(fromEval?.strengths) ||
            pickString(sectionRec.summary_text);
        return {
            n,
            name: pickString(fromEval?.section_name) || CII_SECTION_LABELS[key],
            weight,
            anchor: pickNumber(fromEval?.anchor),
            score,
            comment,
        };
    });

    const bonusesFlags: FacultyBonusFlag[] = [];
    for (const entry of evaluation?.bonuses ?? []) {
        const row = asRecord(entry);
        const name = pickString(row.name) || pickString(row.bonus) || pickString(row.type) || "Bonus";
        const amount =
            pickNumber(row.amount) ?? pickNumber(row.bonus_amount) ?? pickNumber(row.points) ?? pickNumber(row.value);
        const note = pickString(row.reason) || pickString(row.note) || pickString(row.description);
        bonusesFlags.push({
            kind: "bonus",
            label: `${name}${amount !== null ? ` +${amount}` : ""}${note ? ` — ${note}` : ""}`,
        });
    }
    for (const flag of evaluation?.red_flags ?? []) {
        const line = [flag.flag || flag.admin_note || "Flag", flag.severity ? `(${flag.severity})` : null]
            .filter(Boolean)
            .join(" ");
        if (line) bonusesFlags.push({ kind: "flag", label: line });
    }
    if (!bonusesFlags.length && audit) {
        if (audit.critical_red_flags) bonusesFlags.push({ kind: "flag", label: audit.critical_red_flags });
        if (audit.moderate_issues) bonusesFlags.push({ kind: "flag", label: audit.moderate_issues });
        if (audit.minor_issues) bonusesFlags.push({ kind: "flag", label: audit.minor_issues });
    }

    const actions = (
        (feedback as { five_specific_actions?: string[] } | null)?.five_specific_actions ||
        (feedback as { five_actions?: string[] } | null)?.five_actions ||
        snapshot?.suggestions ||
        audit?.top_fixes ||
        []
    )
        .map((item) => pickString(item))
        .filter(Boolean)
        .slice(0, 5);

    const feedbackParts = [
        pickString(feedback?.opening_praise),
        "summary" in (feedback || {})
            ? pickString((feedback as { summary?: string }).summary)
            : pickString((feedback as { why_score_is_high_or_low?: string } | null)?.why_score_is_high_or_low),
        pickString(feedback?.encouragement),
        pickString(evaluation?.final_result?.one_line_verdict),
        pickString(audit?.final_remark),
    ].filter(Boolean);

    const sectionBanners = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        .map((n) => {
            const rec = asRecord(report[`section${n}`]);
            return {
                n,
                label: dataSectionReviewBannerLabel(n),
                text: pickString(rec.summary_text),
            };
        })
        .filter((row) => row.text);

    const facultyStatus = facultyStatusKey(report.faculty_status);
    const facultyRemarks = pickString(report.faculty_remarks);

    return {
        title:
            pickString(opportunity.title) ||
            pickString(report.project_title) ||
            pickString(section2.problem_statement).slice(0, 80) ||
            "Impact report",
        studentsLine: uniqueNames.join(" & ") || "Student",
        partnerLine: context.partnerOrganization,
        timelineLine: context.timelineLabel,
        university:
            pickString(student.university) ||
            pickString(teamLead.university) ||
            "",
        discipline: pickString(teamLead.degree) || pickString(teamLead.program) || pickString(section2.discipline) || "",
        sdgs,
        hoursLabel: formatHours(hours),
        reachedLabel: reached,
        attendanceLabel,
        evidenceCount: uniqueFiles.length,
        evidence: uniqueFiles,
        aiQuote:
            pickString(evaluation?.final_result?.one_line_verdict) ||
            pickString(feedback?.opening_praise) ||
            pickString(section5.summary_text) ||
            pickString(section11.summary_text).split("\n")[0] ||
            "AI evaluation will appear here once flash-card CII scoring is stored on this report.",
        sectionBanners,
        cii,
        ciiMax: snapshot?.cii_score_max || 100,
        levelTitle,
        levelName,
        certificateLine:
            pickString(evaluation?.final_result?.certificate_line) || recognition?.tagline || "",
        readiness:
            pickString(evaluation?.final_result?.badge_readiness) ||
            (evaluation?.final_result?.admin_review_required
                ? "Admin review required"
                : cii !== null
                  ? "Ready for faculty decision"
                  : "Waiting for AI evaluation"),
        indices,
        sections,
        bonusesFlags,
        studentFeedbackHtmlParts: feedbackParts,
        actions,
        facultyStatus,
        facultyRemarks,
        decision: decisionFromFacultyRecord(report.faculty_status, report.faculty_remarks),
        hasAiEvaluation: Boolean(evaluation || snapshot),
        frameworkVersion:
            pickString(evaluation?.framework_version) ||
            pickString(snapshot?.evaluation_framework_version) ||
            "v8.2",
    };
}
