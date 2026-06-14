import type { ReactNode } from "react";
import { useReportForm } from "../context/ReportContext";
import type { ReportData } from "../context/ReportContext";
import { Landmark } from "lucide-react";
import { calculateCII } from "../utils/calculateCII";
import {
    buildIndividualRosterFromSection1,
    calculateEngagementMetrics,
    formatHecComplianceLabel,
} from "../utils/engagementMetrics";
import { formatSection7PakistanDialForDisplay } from "@/utils/reportSection7PakistanDial";
import { buildSection1ParticipationDisplay, resolveReportAuthorParticipationSnapshot } from "@/utils/reportSection1ParticipationDisplay";
import { deriveCertificateProjectDisplay } from "../utils/certificateDisplay";
import { parseSection11AuditSummary } from "@/lib/parseCIIauditSummary";
import ReportVerificationQr from "@/components/ReportVerificationQr";
import { CompetencyScoresTable } from "@/components/verify/CompetencyScoresTable";
import {
    EngagementIndividualMetricsTable,
    engagementIndividualMetricsHaveTableRows,
} from "@/components/verify/EngagementIndividualMetricsTable";
import { AttendanceLogsDossierTable } from "@/components/verify/AttendanceLogsDossierTable";
import { buildSection1AttendanceParticipantNameMap } from "@/utils/attendanceLogDisplay";
import { formatDisplayId } from "@/utils/displayIds";
import {
    getReportReadinessLabel,
    isInstitutionallyVerifiedReport,
} from "@/utils/institutionalReportVerification";
import { pickImpactVerifyUrlFromPayload } from "@/utils/reportVerificationUrl";
import { readPersistedCiiSnapshot } from "@/utils/reportCiiSnapshot";
import { extractIssueFields, parseAuditSummaryIntoSections } from "@/lib/parseAuditSummarySections";
import { summarizeAuditIssueText, summarizeEngagementRedFlags } from "@/lib/summarizeRedFlagDetails";
import {
    formatSdgGoalPadded,
    listOpportunityReportSdgs,
    listStudentReportSdgs,
    mergeReportSdgSnapshotRows,
    mergedSdgTitlesLine,
    uniqueMergedSdgGoalNumbers,
} from "../utils/reportSdgMerge";

interface Props {
    projectData?: unknown;
    reportData?: unknown;
}

/** Section-wise academic report rhythm: compact, print-friendly blocks. */
const dossierSectionStack = "dossier-section-stack space-y-6 md:space-y-7";
const dossierFieldGrid = "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6 md:gap-y-5";
const dossierSubsectionEyebrow = "text-[9px] font-black uppercase tracking-[0.18em] text-[#0F8F83]";
const dossierMetricStrip = "grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4";
const dossierBodyText = "text-[13px] leading-relaxed";
const dossierLabel = "text-[9px] font-black uppercase leading-snug tracking-[0.18em]";

function getCiiCertificateBadge(score: number) {
    if (score >= 85) {
        return {
            src: "/certificate-badges/transformative-impact.png",
            alt: "Transformative Impact badge",
        };
    }
    if (score >= 70) {
        return {
            src: "/certificate-badges/strong-impact-contributor.png",
            alt: "Strong Impact Contributor badge",
        };
    }
    if (score >= 55) {
        return {
            src: "/certificate-badges/developing-impact-contributor.png",
            alt: "Developing Impact Contributor badge",
        };
    }
    if (score >= 40) {
        return {
            src: "/certificate-badges/emerging-community-contributor.png",
            alt: "Emerging Community Contributor badge",
        };
    }
    return {
        src: "/certificate-badges/foundation-stage-contributor.png",
        alt: "Foundation Stage Contributor badge",
    };
}

/** Section 6 stores `sources: string[]` (+ optional legacy `source`); print view must not render "undefined". */
function formatResourceSourcesLine(r: {
    sources?: string[];
    source_other?: string;
    source?: string;
}): string {
    const fromList = (r.sources || []).map((s) => String(s).trim()).filter(Boolean);
    const other = r.source_other?.trim();
    const merged =
        other && fromList.some((s) => s.toLowerCase().includes("other"))
            ? [...fromList.filter((s) => !s.toLowerCase().includes("other")), other]
            : fromList.length
              ? fromList
              : other
                ? [other]
                : [];
    if (merged.length) return merged.join(", ");
    const legacy = typeof r.source === "string" ? r.source.trim() : "";
    return legacy;
}

function normalizePrintAnswer(a: unknown): ReactNode {
    if (a === null || a === undefined) return null;
    if (typeof a === "number" && !Number.isNaN(a)) return a;
    if (typeof a === "boolean") return a ? "Yes" : "No";
    if (typeof a === "string") {
        const t = a.trim();
        if (!t || t.toLowerCase() === "undefined") return null;
        return t;
    }
    if (Array.isArray(a)) {
        const parts = a
            .map((item) => {
                if (item === null || item === undefined) return "";
                if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") return String(item);
                if (typeof item === "object") {
                    return Object.entries(item as Record<string, unknown>)
                        .map(([key, value]) => {
                            if (value === null || value === undefined) return "";
                            if (Array.isArray(value)) {
                                const joined = value
                                    .map((v) =>
                                        typeof v === "string" || typeof v === "number" || typeof v === "boolean"
                                            ? String(v)
                                            : "",
                                    )
                                    .filter(Boolean)
                                    .join(", ");
                                return joined ? `${key}: ${joined}` : "";
                            }
                            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                                return `${key}: ${value}`;
                            }
                            return "";
                        })
                        .filter(Boolean)
                        .join(" · ");
                }
                return "";
            })
            .map((item) => item.trim())
            .filter(Boolean);
        return parts.length ? parts.join(" | ") : null;
    }
    if (typeof a === "object") {
        const text = Object.entries(a as Record<string, unknown>)
            .map(([key, value]) => {
                if (value === null || value === undefined) return "";
                if (Array.isArray(value)) {
                    const joined = value
                        .map((v) => (typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : ""))
                        .filter(Boolean)
                        .join(", ");
                    return joined ? `${key}: ${joined}` : "";
                }
                if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                    return `${key}: ${value}`;
                }
                return "";
            })
            .filter(Boolean)
            .join(" · ");
        return text || null;
    }
    return null;
}

type PrintableFileRecord = {
    file?: File;
    name?: string;
    fileName?: string;
    filename?: string;
    originalName?: string;
    size?: number;
    bytes?: number;
    file_size?: number;
    size_bytes?: number;
    type?: string;
    mimeType?: string;
    mimetype?: string;
    url?: string;
    path?: string;
};

function isNativeFile(value: unknown): value is File {
    return typeof File !== "undefined" && value instanceof File;
}

function printableFileRecord(value: unknown): PrintableFileRecord | null {
    return value && typeof value === "object" && !Array.isArray(value) && !isNativeFile(value)
        ? (value as PrintableFileRecord)
        : null;
}

function printableFileName(value: unknown, index: number): string {
    if (typeof value === "string") {
        const last = value.split(/[/?#]/).filter(Boolean).pop();
        return last || `Evidence file ${index + 1}`;
    }
    if (isNativeFile(value)) return value.name || `Evidence file ${index + 1}`;
    const record = printableFileRecord(value);
    return firstNonBlank(
        record?.name,
        record?.fileName,
        record?.filename,
        record?.originalName,
        record?.file?.name,
        `Evidence file ${index + 1}`,
    );
}

function printableFileHref(value: unknown): string {
    if (typeof value === "string") return /^https?:\/\//i.test(value) || value.startsWith("/") ? value : "";
    const record = printableFileRecord(value);
    const href = firstNonBlank(record?.url, record?.path);
    return /^https?:\/\//i.test(href) || href.startsWith("/") ? href : "";
}

function printableFileType(value: unknown): string {
    if (isNativeFile(value)) return value.type || "";
    const record = printableFileRecord(value);
    return firstNonBlank(record?.type, record?.mimeType, record?.mimetype, record?.file?.type);
}

function printableFileSize(value: unknown): string {
    const record = printableFileRecord(value);
    const raw = isNativeFile(value)
        ? value.size
        : record?.size ?? record?.bytes ?? record?.file_size ?? record?.size_bytes ?? record?.file?.size;
    return typeof raw === "number" && Number.isFinite(raw) && raw > 0
        ? `${(raw / (1024 * 1024)).toFixed(2)} MB`
        : "";
}

function printObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function firstNonBlank(...values: unknown[]): string {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        if (Array.isArray(value)) {
            const joined = value.map((item) => String(item).trim()).filter(Boolean).join(", ");
            if (joined) return joined;
            continue;
        }
        const text = String(value).trim();
        if (text && text.toLowerCase() !== "undefined" && text.toLowerCase() !== "null") return text;
    }
    return "";
}

function firstOutcomeArray(section5: unknown): unknown[] {
    const record = printObject(section5);
    if (!record) return [];
    for (const key of [
        "measurable_outcomes",
        "measurableOutcomes",
        "outcomes",
        "outcome_metrics",
        "outcomeMetrics",
        "beneficiary_outcomes",
        "impact_outcomes",
    ]) {
        const value = record[key];
        if (Array.isArray(value)) return value;
        if (typeof value === "string" && value.trim().startsWith("[")) {
            try {
                const parsed = JSON.parse(value) as unknown;
                if (Array.isArray(parsed)) return parsed;
            } catch {
                /* ignore non-JSON strings */
            }
        }
    }
    return [];
}

function printRecordArray(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value)
        ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        : [];
}

type PrintableOutcome = {
    metric: string;
    baseline: string;
    endline: string;
    unit: string;
    outcomeArea: string;
    explanation: string;
    metricCategory: string;
    confidence: string;
};

type PrintableBlueprintRow = {
    label: string;
    value: string;
    fullWidth?: boolean;
};

function normalizePrintableOutcome(raw: unknown): PrintableOutcome | null {
    if (typeof raw === "string") {
        const metric = firstNonBlank(raw);
        return metric
            ? { metric, baseline: "", endline: "", unit: "", outcomeArea: "", explanation: "", metricCategory: "", confidence: "" }
            : null;
    }

    const record = printObject(raw);
    if (!record) return null;

    const metric = firstNonBlank(
        record.metric,
        record.metric_name,
        record.metricName,
        record.title,
        record.name,
        record.indicator,
        record.description,
    );
    const outcomeArea = firstNonBlank(
        record.outcome_area_other,
        record.outcomeAreaOther,
        record.outcome_sub_category,
        record.outcomeSubCategory,
        record.outcome_area,
        record.outcomeArea,
        record.category,
        record.area,
        record.dimension,
    );
    const explanation = firstNonBlank(
        record.measurement_explanation,
        record.measurementExplanation,
        record.explanation,
        record.evidence,
        record.notes,
    );
    const baseline = firstNonBlank(record.baseline, record.baseline_value, record.baselineValue, record.start_value, record.before);
    const endline = firstNonBlank(
        record.endline,
        record.endline_value,
        record.endlineValue,
        record.achieved,
        record.actual,
        record.final_value,
        record.after,
    );
    const unit = firstNonBlank(record.unit_other, record.unitOther, record.unit, record.unit_label, record.unitLabel);
    const metricCategory = firstNonBlank(record.metric_category, record.metricCategory);
    const confidence = firstNonBlank(record.confidence_level, record.confidenceLevel);

    if (!metric && !outcomeArea && !explanation && !baseline && !endline) return null;
    return {
        metric: metric || outcomeArea || "Measured outcome",
        baseline,
        endline,
        unit,
        outcomeArea,
        explanation,
        metricCategory,
        confidence,
    };
}

function pickPrintValue(records: Record<string, unknown>[], keys: string[]): unknown {
    for (const record of records) {
        for (const key of keys) {
            const value = record[key];
            if (printObject(value)) return value;
            if (typeof value === "boolean") return value ? "Yes" : "No";
            const normalized = firstNonBlank(value);
            if (normalized) return normalized;
        }
    }
    return "";
}

function joinPrintParts(parts: unknown[]): string {
    return parts.map((part) => firstNonBlank(part)).filter(Boolean).join(" · ");
}

function buildPrintableBlueprintRows(reportData: unknown, projectData: unknown): PrintableBlueprintRow[] {
    const root = printObject(reportData) ?? {};
    const project = printObject(projectData) ?? {};
    const opportunity = printObject(root.opportunity) ?? project;
    const objectives = printObject(pickPrintValue([opportunity, project, root], ["objectives"])) ?? {};
    const activityDetails = printObject(pickPrintValue([opportunity, project, root], ["activity_details", "activityDetails", "activity"])) ?? {};
    const supervision = printObject(pickPrintValue([opportunity, project, root], ["supervision"])) ?? {};
    const executingContext = printObject(pickPrintValue([opportunity, project, root], ["executing_context", "executingContext"])) ?? {};
    const partnerContext =
        printObject(pickPrintValue([executingContext, root], ["partner", "partner_organization", "external_partner_collaboration"])) ?? {};
    const independentContext =
        printObject(pickPrintValue([executingContext, root], ["independent_community_activity", "independentCommunityActivity"])) ?? {};
    const safetyDeclaration = printObject(pickPrintValue([opportunity, project, root], ["safety_declaration", "safetyDeclaration"])) ?? {};
    const location = printObject(pickPrintValue([opportunity, project, root], ["location"])) ?? {};

    const supervisorSummary = joinPrintParts([
        pickPrintValue([supervision], ["supervisor_name", "supervisorName", "facultyName"]),
        pickPrintValue([supervision], ["role", "facultyDesignation"]),
        pickPrintValue([supervision], ["contact", "facultyOfficialEmail"]),
    ]);
    const partnerSummary = joinPrintParts([
        pickPrintValue([partnerContext, supervision], ["organization_name", "organizationName", "partner_org_name", "partnerOrgName"]),
        pickPrintValue([partnerContext, supervision], ["contact_person", "contactPerson", "partner_contact_person", "partnerContactPerson"]),
        pickPrintValue([partnerContext, supervision], ["official_email", "officialEmail", "partner_email", "partnerEmail"]),
    ]);
    const independentSummary = joinPrintParts([
        pickPrintValue([independentContext, supervision], ["activity_site_description", "activitySiteDescription", "independentSiteDescription"]),
        pickPrintValue([independentContext, supervision], ["local_contact_person", "localContactPerson", "independentLocalContact"]),
        pickPrintValue([independentContext, supervision], ["contact_number", "contactNumber", "independentContactPhone"]),
    ]);
    const locationSummary = joinPrintParts([
        pickPrintValue([location, opportunity, project, root], ["city", "district", "location_district", "locationDistrict"]),
        pickPrintValue([location, opportunity, project, root], ["venue", "address"]),
    ]);

    return [
        { label: "Opportunity title", value: firstNonBlank(pickPrintValue([opportunity, project, root], ["title", "project_title", "projectTitle"])), fullWidth: true },
        { label: "Project objectives", value: firstNonBlank(pickPrintValue([objectives, opportunity, project, root], ["description", "objective", "objectives_description"])), fullWidth: true },
        { label: "Expected beneficiaries", value: firstNonBlank(pickPrintValue([objectives, opportunity, project, root], ["beneficiaries_count", "beneficiariesCount", "beneficiary_count"])) },
        { label: "Beneficiary type", value: firstNonBlank(pickPrintValue([objectives, opportunity, project, root], ["beneficiaries_type", "beneficiariesType", "beneficiary_type"])) },
        { label: "Student responsibilities", value: firstNonBlank(pickPrintValue([activityDetails, opportunity, project, root], ["student_responsibilities", "studentResponsibilities", "responsibilities"])), fullWidth: true },
        { label: "Skills to be gained", value: firstNonBlank(pickPrintValue([activityDetails, opportunity, project, root], ["skills_gained", "skillsGained", "skills"])) },
        { label: "Mode / location", value: joinPrintParts([pickPrintValue([opportunity, project, root], ["mode"]), locationSummary]) },
        { label: "Faculty supervision", value: supervisorSummary, fullWidth: true },
        { label: "Partner / executing organization", value: partnerSummary, fullWidth: true },
        { label: "Independent community activity", value: independentSummary, fullWidth: true },
        { label: "Safe environment declared", value: firstNonBlank(pickPrintValue([safetyDeclaration, supervision], ["environment_safe_and_appropriate", "safe_environment"])) },
        { label: "Faculty oversight declared", value: firstNonBlank(pickPrintValue([safetyDeclaration, supervision], ["students_guided_and_supervised", "supervised"])) },
    ].filter((row) => row.value);
}

export default function ReportPrintView({ projectData, reportData }: Props) {
    let data = reportData as ReportData | undefined;
    try {
        const contextData = useReportForm().data;
        if (!data) data = contextData;
    } catch {}

    if (!data) return <div className="p-8 text-center text-slate-500 italic">No report data available for preview.</div>;

    const teamSize =
        (data.section1?.participation_type === "team" ? data.section1?.team_members?.length || 0 : 0) + 1;
    const reqH = data.required_hours ?? 16;
    const rosterIds = buildIndividualRosterFromSection1(
        data.section1 ?? {},
        data.section1?.team_lead?.id,
    );
    const engagementRecalc = calculateEngagementMetrics(
        data.section1?.attendance_logs || [],
        reqH,
        teamSize,
        data.section1?.team_lead,
        rosterIds,
    );

    const storedVerified = Number(data.section1?.metrics?.total_verified_hours);
    const verifiedHours =
        Number.isFinite(storedVerified) && storedVerified > 0
            ? Math.round(storedVerified)
            : engagementRecalc.total_verified_hours > 0
              ? Math.round(engagementRecalc.total_verified_hours)
              : Math.round(
                    (parseFloat(String(data.section1?.team_lead?.hours ?? "")) || 0) +
                        (data.section1?.team_members?.reduce(
                            (sum: number, m: ReportData["section1"]["team_members"][number]) =>
                                sum + (parseFloat(String(m.hours ?? "")) || 0),
                            0,
                        ) || 0),
                );

    const mBase = data.section1?.metrics;
    const section1ParticipationDisplay = buildSection1ParticipationDisplay({
        section1: data.section1,
        requiredHours: reqH,
        reportForFaculty: data,
        projectData,
    });
    const authorParticipation = resolveReportAuthorParticipationSnapshot(data.section1, data.student);
    const dossierLeadRoleHoursLine = [section1ParticipationDisplay.teamLeadRole, section1ParticipationDisplay.teamLeadHours]
        .filter(Boolean)
        .join(" · ");

    const tm = data.section1?.team_members ?? [];
    const memberAuthor = !authorParticipation.isTeamLeadAuthor && authorParticipation.memberIndex >= 0;
    const authorMemberRow = memberAuthor ? tm[authorParticipation.memberIndex] : undefined;
    const dossierAuthorRoleHoursLine = memberAuthor
        ? [
              firstNonBlank(authorMemberRow && (authorMemberRow as { role?: string }).role),
              section1ParticipationDisplay.memberHoursLine(authorParticipation.memberIndex, authorMemberRow?.hours),
          ]
              .filter(Boolean)
              .join(" · ")
        : dossierLeadRoleHoursLine;

    const dossierProfilePrefix = authorParticipation.isTeamLeadAuthor ? "Lead" : "Student author";
    const dossierFacultyEmail = section1ParticipationDisplay.facultySupervisorEmail;
    const dossierAttendanceVerification = section1ParticipationDisplay.attendanceVerificationStatus;
    const allApplicantRows = (() => {
        const rows: Array<{
            key: string;
            name: string;
            contact: string;
            institutionProgram: string;
            role: string;
            hoursVerified: string;
        }> = [];
        const seen = new Set<string>();
        const pushRow = (row: (typeof rows)[number]) => {
            const normalizedKey = row.key.trim().toLowerCase();
            if (!normalizedKey || seen.has(normalizedKey)) return;
            seen.add(normalizedKey);
            rows.push(row);
        };

        const lead = data.section1?.team_lead;
        const leadName = firstNonBlank(lead?.fullName, lead?.name);
        if (leadName || firstNonBlank(lead?.email, lead?.id)) {
            pushRow({
                key: firstNonBlank(lead?.id, lead?.email, lead?.cnic, leadName),
                name: leadName || "Team lead",
                contact: [lead?.email, lead?.mobile, lead?.cnic ? `CNIC: ${lead.cnic}` : ""].filter(Boolean).join(" · "),
                institutionProgram: [lead?.university, lead?.degree, lead?.year].filter(Boolean).join(" · "),
                role: firstNonBlank(lead?.role, "Team lead"),
                hoursVerified: [
                    dossierLeadRoleHoursLine || (lead?.hours ? `${lead.hours} hours` : ""),
                    lead?.verified === undefined ? "" : lead.verified ? "Verified" : "Unverified",
                ].filter(Boolean).join(" · "),
            });
        }

        tm.forEach((m, i) => {
            const ext = m as ReportData["section1"]["team_members"][number] & { email?: string; participantId?: string };
            const name = firstNonBlank(m.fullName, m.name);
            pushRow({
                key: firstNonBlank(m.id, ext.participantId, ext.email, m.cnic, name),
                name: name || `Applicant ${i + 1}`,
                contact: [ext.email, m.mobile, m.cnic ? `CNIC: ${m.cnic}` : ""].filter(Boolean).join(" · "),
                institutionProgram: [m.university, m.program].filter(Boolean).join(" · "),
                role: firstNonBlank((m as { role?: string }).role, "Team member"),
                hoursVerified: [
                    section1ParticipationDisplay.memberHoursLine(i, m.hours),
                    m.verified === undefined ? "" : m.verified ? "Verified" : "Unverified",
                ].filter(Boolean).join(" · "),
            });
        });

        return rows;
    })();

    const engagementSpanForPrint =
        mBase?.engagement_span && mBase.engagement_span > 0
            ? mBase.engagement_span
            : engagementRecalc.engagement_span > 0
              ? engagementRecalc.engagement_span
              : 0;

    const reportForCii: ReportData = {
        ...data,
        section1: {
            ...data.section1,
            metrics: {
                ...(mBase || {
                    total_verified_hours: 0,
                    total_active_days: 0,
                    engagement_span: 0,
                    attendance_frequency: 0,
                    weekly_continuity: 0,
                    eis_score: 0,
                    engagement_category: "",
                    hec_compliance: "below",
                }),
                total_verified_hours: verifiedHours,
                total_active_days: mBase?.total_active_days || engagementRecalc.total_active_days,
                engagement_span: engagementSpanForPrint,
                attendance_frequency: mBase?.attendance_frequency || engagementRecalc.attendance_frequency,
                weekly_continuity: mBase?.weekly_continuity || engagementRecalc.weekly_continuity,
                eis_score: mBase?.eis_score || engagementRecalc.eis_score,
                engagement_category: mBase?.engagement_category || engagementRecalc.engagement_category,
                hec_compliance: mBase?.hec_compliance || engagementRecalc.hec_compliance,
            },
        },
    };

    const calculatedCiiResult = calculateCII({ ...reportForCii, required_hours: reqH });
    const persistedCii = readPersistedCiiSnapshot(data);
    const ciiResult = persistedCii
        ? {
              ...calculatedCiiResult,
              ...persistedCii,
              totalScore: Math.round(persistedCii.totalScore),
              breakdown: persistedCii.breakdown ?? calculatedCiiResult.breakdown,
              suggestions: persistedCii.suggestions ?? calculatedCiiResult.suggestions,
          }
        : calculatedCiiResult;
    const { totalScore, breakdown } = ciiResult;
    const ciiBadge = getCiiCertificateBadge(Math.round(totalScore));
    const penaltyApplied =
        typeof persistedCii?.penaltyApplied === "number" && Number.isFinite(persistedCii.penaltyApplied)
            ? persistedCii.penaltyApplied
            : 0;
    const showCiiPenaltyRow = penaltyApplied > 0;

    const dossierAuditMeta =
        data.section11?.audit_meta ??
        (data.section11?.summary_text ? parseSection11AuditSummary(String(data.section11.summary_text)) : null);

    const dossierSectionWiseAuditBlocks = (() => {
        const st = String(data.section11?.summary_text || "").trim();
        const legacy = "project successfully synthesized";
        if (!st || st.toLowerCase().includes(legacy)) return [];
        return parseAuditSummaryIntoSections(st).filter((s) => s.sectionNum >= 1 && s.sectionNum <= 10);
    })();

    const blocks = data.section4?.activity_blocks || [];
    const sessionsFromBlocks = blocks.reduce(
        (acc: number, b: { sessions_count?: string }) => acc + (parseInt(String(b.sessions_count), 10) || 0),
        0,
    );
    const explicitTotal = (data.section4 as { total_sessions?: number | string })?.total_sessions;
    const parsedExplicit =
        explicitTotal !== undefined && explicitTotal !== null && String(explicitTotal).trim() !== ""
            ? parseInt(String(explicitTotal), 10)
            : NaN;
    const totalSessionsDisplay = Number.isFinite(parsedExplicit) && parsedExplicit > 0
        ? parsedExplicit
        : sessionsFromBlocks > 0
          ? sessionsFromBlocks
          : blocks.length;

    const s4 = data.section4 as ReportData["section4"] & { activity_description?: string };
    const activityDescriptionCombined =
        (s4.activity_description && String(s4.activity_description).trim()) ||
        (s4.project_summary?.project_implementation_explanation &&
            String(s4.project_summary.project_implementation_explanation).trim()) ||
        blocks
            .map((b: { description?: string }) => (b.description || "").trim())
            .filter(Boolean)
            .join("\n\n") ||
        "";

    const calculateMetrics = () => {
        const metrics = {
            total_verified_hours: verifiedHours,
            eis_score: totalScore,
            attendance_frequency: reportForCii.section1?.metrics?.attendance_frequency || 0,
            total_beneficiaries: data.section4?.project_summary?.distinct_total_beneficiaries || 0,
            engagement_span: engagementSpanForPrint,
        };
        return metrics;
    };

    const metrics = calculateMetrics();
    const metricsMerged = reportForCii.section1?.metrics;
    const individualMetricsForPrint = engagementIndividualMetricsHaveTableRows(metricsMerged?.individual_metrics)
        ? metricsMerged?.individual_metrics
        : engagementRecalc.individual_metrics;

    const engagementForPrintDossier = {
        verified_session_count: metricsMerged?.verified_session_count ?? engagementRecalc.verified_session_count,
        total_active_days: metricsMerged?.total_active_days ?? engagementRecalc.total_active_days,
        engagement_span: metricsMerged?.engagement_span ?? engagementSpanForPrint,
        attendance_frequency: metricsMerged?.attendance_frequency ?? engagementRecalc.attendance_frequency,
        weekly_continuity: metricsMerged?.weekly_continuity ?? engagementRecalc.weekly_continuity,
        eis_score: metricsMerged?.eis_score ?? engagementRecalc.eis_score,
        engagement_category: metricsMerged?.engagement_category ?? engagementRecalc.engagement_category,
        hec_compliance: metricsMerged?.hec_compliance ?? engagementRecalc.hec_compliance,
        isNonCompliant:
            metricsMerged?.isNonCompliant !== undefined
                ? metricsMerged.isNonCompliant
                : engagementRecalc.isNonCompliant,
    };

    const redFlagsForPrint = (() => {
        const stored = metricsMerged?.redFlags;
        if (Array.isArray(stored) && stored.length) {
            return summarizeEngagementRedFlags(stored);
        }
        const calc = engagementRecalc.redFlags;
        return summarizeEngagementRedFlags(calc);
    })();

    const showEngagementDossierSection =
        Boolean(metricsMerged) ||
        (Array.isArray(data.section1?.attendance_logs) && data.section1.attendance_logs.length > 0) ||
        engagementRecalc.total_verified_hours > 0 ||
        redFlagsForPrint.length > 0;

    const projectRecord = printObject(projectData) ?? {};

    const dossierProjectHeadline = deriveCertificateProjectDisplay({
        ...(data as ReportData),
        project_title:
            (data as ReportData).project_title ||
            (typeof projectRecord.title === "string" ? projectRecord.title : "") ||
            "",
    }).headline;
    const teamMembers = data.section1.team_members || [];
    const sdgProjectData =
        projectData ??
        (data as { opportunity?: unknown }).opportunity ??
        data;

    const opportunitySdgRows = listOpportunityReportSdgs(sdgProjectData);
    const studentSdgRows = listStudentReportSdgs(data.section3);
    const mergedSdgNums = uniqueMergedSdgGoalNumbers(sdgProjectData, data.section3);
    const mergedSdgRows = mergeReportSdgSnapshotRows(sdgProjectData, data.section3);
    const sdgGoalDisplay = mergedSdgNums.join(", ");
    const sdgTitleLine = mergedSdgTitlesLine(sdgProjectData, data.section3);
    const printableBlueprintRows = buildPrintableBlueprintRows(data, projectData);
    const section4Blocks = printRecordArray(data.section4?.activity_blocks);
    const section4Outputs = section4Blocks.flatMap((block, blockIndex) =>
        printRecordArray(block.outputs).map((output, outputIndex) => ({
            blockTitle: firstNonBlank(block.title, block.primary_category, `Activity ${blockIndex + 1}`),
            output,
            key: `${blockIndex}-${outputIndex}`,
        })),
    );
    const primarySdgDisplay =
        studentSdgRows.find((row) => row.role === "primary") ||
        opportunitySdgRows.find((row) => row.role === "primary") ||
        mergedSdgRows[0];
    const printableOutcomes = firstOutcomeArray(data.section5)
        .map(normalizePrintableOutcome)
        .filter((outcome): outcome is PrintableOutcome => Boolean(outcome));

    const formatSdgRowAnswer = (r: (typeof opportunitySdgRows)[number]) => {
        const t = r.targetId || "—";
        const ind = r.indicatorId || "—";
        const base = `Goal ${r.goalNumber} — ${r.title}. Target: ${t}. Indicator: ${ind}.`;
        if (r.justification) return `${base} Contribution: ${r.justification}`;
        return base;
    };

    const reportRow = data as ReportData;
    const resolvedVerifyUrl = pickImpactVerifyUrlFromPayload(reportRow);
    const showVerificationQr = Boolean(resolvedVerifyUrl) && isInstitutionallyVerifiedReport(reportRow);

    const dossierPayloadRoot = data as ReportData & Record<string, unknown>;
    const apiStudentRecord =
        dossierPayloadRoot.student &&
        typeof dossierPayloadRoot.student === "object" &&
        !Array.isArray(dossierPayloadRoot.student)
            ? (dossierPayloadRoot.student as Record<string, unknown>)
            : null;
    const printHeaderUniversity = firstNonBlank(
        authorParticipation.university,
        apiStudentRecord?.university,
        data.section1?.team_lead?.university,
    );
    const printHeaderDepartment = firstNonBlank(data.section2?.discipline);
    const submissionDateRaw = firstNonBlank(dossierPayloadRoot.submission_date, dossierPayloadRoot.submissionDate);
    const submissionDateMs = submissionDateRaw ? Date.parse(submissionDateRaw) : NaN;
    const printHeaderSubmissionDate =
        submissionDateRaw && Number.isFinite(submissionDateMs)
            ? new Date(submissionDateMs).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
            : submissionDateRaw || "—";
    const printHeaderReportIdSource = firstNonBlank(data.report_id, data.id, data.project_id);
    const printHeaderReportIdDisplay = printHeaderReportIdSource
        ? formatDisplayId(printHeaderReportIdSource, "CPK")
        : "—";

    /** Dossier / print masthead accent (aligned with institutional report reference). */
    const hdrInk = "#0056B3";
    const sectionInk = "#071A33";
    const tealInk = "#0F8F83";
    const scorePercent = (score: number, max: number) => Math.round((score / max) * 100);
    const finalScoreLevel =
        totalScore >= 85
            ? "Impact Contributor"
            : totalScore >= 70
              ? "Strong Impact Contributor"
              : totalScore >= 55
                ? "Developing Impact Contributor"
                : totalScore >= 40
                  ? "Emerging Community Contributor"
                  : "Foundation Stage Contributor";
    const finalScoreNarrative =
        totalScore >= 85
            ? "The student has demonstrated strong commitment, consistent engagement, quality reporting, and meaningful community contribution through verified experiential learning."
            : totalScore >= 70
              ? "The student has demonstrated credible community contribution with structured evidence and clear learning outcomes."
              : "The student report documents emerging community contribution with opportunities for stronger evidence, continuity, and outcome measurement.";
    const finalReportCardRows = [
        {
            label: "Engagement & Participation",
            score: scorePercent(breakdown.participation, 10),
            note: "Attendance, active role, and meaningful participation.",
        },
        {
            label: "Quality of Work & Outputs",
            score: scorePercent(breakdown.outputs, 15),
            note: "Output scale and implementation structure.",
        },
        {
            label: "Impact & Outcomes",
            score: scorePercent(breakdown.outcomes, 20),
            note: "Observed change and measurable community benefit.",
        },
        {
            label: "Compliance & Professionalism",
            score: scorePercent(breakdown.evidence, 12),
            note: "Verification, ethics, and professional reporting standards.",
        },
    ];

    const SectionHeader = ({ title, number, question }: { title: string; number: number; question?: string }) => (
        <div className="dossier-section-header mt-12 mb-6 break-inside-avoid rounded-t-xl border-b-4 pb-0 first:mt-0 md:mt-14" style={{ borderBottomColor: sectionInk }}>
            <div className="flex items-center gap-3 rounded-t-xl px-5 py-3 text-white md:px-6" style={{ backgroundColor: sectionInk }}>
                <span className="flex h-7 min-w-10 shrink-0 items-center justify-center rounded bg-white/15 px-2 text-[10px] font-black tabular-nums tracking-widest">
                    {String(number).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="report-h3 text-[13px] font-black uppercase tracking-[0.18em] text-white sm:text-sm">
                        Section {number}: {title}
                    </h2>
                </div>
            </div>
            {question ? (
                <p className="border-x border-b border-slate-200 bg-slate-50/80 px-5 py-2.5 text-[10px] font-semibold leading-relaxed text-slate-600 md:px-6">
                    {question}
                </p>
            ) : null}
        </div>
    );

    const QandA = ({ q, a, fullWidth = false }: { q: string; a: unknown; fullWidth?: boolean }) => {
        const normalized = normalizePrintAnswer(a);
        const showPending =
            normalized === null ||
            normalized === undefined ||
            (typeof normalized === "string" && normalized.trim() === "");
        return (
            <div className={`dossier-qa flex min-h-0 flex-col ${fullWidth ? "md:col-span-2" : ""} break-inside-avoid`}>
                <span className={`mb-2 ${dossierLabel} text-slate-500`}>
                    {q}
                </span>
                <div className="flex min-h-[3.5rem] flex-1 flex-col rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
                    <div
                        className={`${dossierBodyText} font-medium text-slate-800 ${fullWidth ? "text-left sm:text-justify" : ""}`}
                    >
                        {showPending ? (
                            <span className="font-medium italic text-slate-400">Pending verification / not provided</span>
                        ) : (
                            normalized
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const FileListQA = ({ q, files, fullWidth = false }: { q: string; files: unknown; fullWidth?: boolean }) => {
        const items = (Array.isArray(files) ? files : files ? [files] : []).filter((item) => {
            if (item === null || item === undefined) return false;
            if (typeof item === "string") return item.trim().length > 0;
            return true;
        });

        return (
            <div className={`dossier-qa flex min-h-0 flex-col ${fullWidth ? "md:col-span-2" : ""} break-inside-avoid`}>
                <span className={`mb-2 ${dossierLabel} text-slate-500`}>
                    {q}
                </span>
                <div className="flex min-h-[3.5rem] flex-1 flex-col rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
                    {items.length === 0 ? (
                        <span className={`${dossierBodyText} font-medium italic text-slate-400`}>
                            Pending verification / not provided
                        </span>
                    ) : (
                        <div className="space-y-2.5">
                            {items.map((item, index) => {
                                const name = printableFileName(item, index);
                                const href = printableFileHref(item);
                                const meta = [printableFileSize(item), printableFileType(item)]
                                    .filter(Boolean)
                                    .join(" · ");
                                return (
                                    <div
                                        key={`${name}-${index}`}
                                        className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 transition-colors duration-200 hover:bg-slate-100/80"
                                    >
                                        {href ? (
                                            <a
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="break-words text-[13px] font-bold leading-snug text-[#0F8F83] underline decoration-[#0F8F83]/30 underline-offset-2 transition-colors duration-200 hover:text-[#0d7a70] focus-visible:ring-2 focus-visible:ring-[#0F8F83] focus-visible:ring-offset-2 focus-visible:outline-none rounded"
                                            >
                                                {name}
                                            </a>
                                        ) : (
                                            <p className="break-words text-[13px] font-bold leading-snug text-slate-800">{name}</p>
                                        )}
                                        {meta ? (
                                            <p className={`mt-1.5 ${dossierLabel} text-slate-500`}>
                                                {meta}
                                            </p>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const BlueprintCard = ({ row }: { row: PrintableBlueprintRow }) => (
        <div className={`min-w-0 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition-shadow duration-200 hover:shadow-md ${row.fullWidth ? "md:col-span-2" : ""}`}>
            <p className={`mb-2 ${dossierLabel} text-slate-500`}>
                {row.label}
            </p>
            <p className={`whitespace-pre-wrap break-words ${dossierBodyText} font-medium text-slate-800`}>
                {row.value}
            </p>
        </div>
    );

    const scoreTableItems = [
        { label: "Identity & Participation", score: breakdown.participation, max: 10, weight: "10%" },
        { label: "Project Context & Discipline", score: breakdown.context, max: 10, weight: "10%" },
        { label: "SDG Strategy & Intent", score: breakdown.sdg, max: 10, weight: "10%" },
        { label: "Activities & Output Scale", score: breakdown.outputs, max: 15, weight: "15%" },
        { label: "Outcomes & Measurable Change", score: breakdown.outcomes, max: 20, weight: "20%" },
        { label: "Resource Mobilization", score: breakdown.resources, max: 7, weight: "7%" },
        { label: "Partnerships & Collaboration", score: breakdown.partnerships, max: 7, weight: "7%" },
        { label: "Evidence & Verification", score: breakdown.evidence, max: 12, weight: "12%" },
        { label: "Personal & Academic Reflection", score: breakdown.learning, max: 4, weight: "4%" },
        { label: "Sustainability & Continuation", score: breakdown.sustainability, max: 5, weight: "5%" }
    ];
    const formatCiiScore = (score: number) => Number.isInteger(score) ? String(score) : score.toFixed(1);

    return (
        <div className="dossier-root group relative mx-auto max-w-5xl bg-white px-4 py-6 font-sans text-slate-900 sm:px-8 sm:py-10 print:max-w-none print:p-0">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 1cm; size: A4; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-container { width: 100% !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box; }
                    .report-print-masthead {
                        position: relative !important;
                        top: auto !important;
                        left: auto !important;
                        right: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                        z-index: auto !important;
                        background: #fff !important;
                    }
                    .report-header-grid {
                        display: grid !important;
                        grid-template-columns: 4.25cm 1fr 3.1cm !important;
                        gap: 0.45cm !important;
                        align-items: start !important;
                    }
                    .report-header-brand {
                        min-height: 1.55cm !important;
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        gap: 0.28cm !important;
                        border-right: 1px solid #e2e8f0 !important;
                        padding-right: 0.35cm !important;
                    }
                    .report-header-brand img {
                        width: 0.82cm !important;
                        height: 0.82cm !important;
                    }
                    .report-header-brand-title {
                        font-size: 14px !important;
                        line-height: 1 !important;
                        letter-spacing: 0.03em !important;
                    }
                    .report-header-brand-tagline {
                        margin-top: 0.12cm !important;
                        max-width: 3.2cm !important;
                        font-size: 7px !important;
                        line-height: 1.25 !important;
                    }
                    .report-header-main {
                        padding-top: 0.02cm !important;
                    }
                    .report-header-title {
                        font-size: 14px !important;
                        line-height: 1.12 !important;
                        white-space: nowrap !important;
                    }
                    .report-header-subtitle {
                        margin-top: 0.12cm !important;
                        font-size: 8px !important;
                        line-height: 1.25 !important;
                    }
                    .report-header-institution {
                        margin-top: 0.28cm !important;
                        gap: 0.15cm !important;
                    }
                    .report-header-institution svg {
                        width: 0.34cm !important;
                        height: 0.34cm !important;
                    }
                    .report-header-university {
                        font-size: 8px !important;
                        line-height: 1.2 !important;
                    }
                    .report-header-department {
                        margin-top: 0.05cm !important;
                        font-size: 7px !important;
                        line-height: 1.2 !important;
                    }
                    .report-header-meta {
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: flex-end !important;
                        gap: 0.16cm !important;
                        border-top: 0 !important;
                        padding-top: 0 !important;
                    }
                    .report-header-meta > div:first-child {
                        justify-content: flex-end !important;
                    }
                    .report-header-meta > div:first-child > div {
                        padding: 0.08cm !important;
                    }
                    .report-header-meta svg {
                        width: 1.25cm !important;
                        height: 1.25cm !important;
                    }
                    .report-header-meta-text {
                        font-size: 7px !important;
                        line-height: 1.2 !important;
                        text-align: right !important;
                    }
                    .report-cover-page { break-after: auto !important; page-break-after: auto !important; }
                    .dossier-section-header { margin-top: 1rem !important; }
                    .break-inside-avoid { page-break-inside: avoid !important; break-inside: avoid !important; }
                    .bg-slate-900 { background-color: #0f172a !important; }
                    .bg-slate-50 { background-color: #f8fafc !important; }
                    .bg-\\[\\#0056B3\\] { background-color: #0056b3 !important; }
                    .text-slate-900 { color: #0f172a !important; }
                    .text-slate-400 { color: #94a3b8 !important; }
                    .text-slate-500 { color: #64748b !important; }
                    .border-slate-900 { border-color: #0f172a !important; }
                    .border-slate-200 { border-color: #e2e8f0 !important; }
                    .border-\\[\\#0056B3\\] { border-color: #0056b3 !important; }
                    .text-\\[\\#0056B3\\] { color: #0056b3 !important; }
                    .text-teal-600 { color: #0d9488 !important; }
                    table { page-break-inside: auto; break-inside: auto; }
                    tr { page-break-inside: avoid; break-inside: avoid; }
                }
            `}} />

            <div className="print-container bg-white">
            <header className="report-print-masthead mb-8 break-inside-avoid border-b-[3px] border-[#071A33] bg-[radial-gradient(circle_at_top_left,rgba(15,143,131,0.06),transparent_34%),linear-gradient(180deg,#ffffff,#fbfdff)] pb-5 print:mb-5 print:pb-4">  <div className="report-header-grid grid grid-cols-1 gap-5 lg:grid-cols-[16rem_1fr_12rem] lg:items-start lg:gap-7">
    
    {/* Brand */}
    <div className="report-header-brand flex min-h-[5.8rem] items-center gap-4 self-stretch lg:border-r lg:border-slate-200 lg:pr-7">
      <img
        src="/iel-pk-logo.png"
        alt="CIEL PK Logo"
        className="h-12 w-12 shrink-0 object-contain print:h-9 print:w-9"
        width={256}
        height={256}
      />

      <div className="min-w-0">
        <p className="report-header-brand-title text-[2rem] font-black leading-none tracking-[0.08em] text-[#071A33] print:text-xl">
          CIEL PK
        </p>

        <p className="report-header-brand-tagline mt-2 max-w-[12rem] text-[11px] font-semibold leading-snug text-[#0F8F83] print:text-[9px]">
          Community Impact
          <br />
          Engagement & Learning
        </p>
      </div>
    </div>

    {/* Main Report Title */}
    <div className="report-header-main min-w-0 lg:pt-1">
      <h1 className="report-header-title text-[1.7rem] font-black leading-tight tracking-tight text-[#071A33] sm:text-[1.85rem] print:text-[1.25rem]">
        CIEL PK Student Academic Report
      </h1>

      <p className="report-header-subtitle mt-2 text-[13px] font-medium leading-snug tracking-wide text-slate-600 print:text-[10px]">
        Section-wise Academic Summary for Verified Community Impact
      </p>

      <div className="report-header-institution mt-5 flex items-start gap-3 print:mt-3">
        <Landmark
          className="mt-0.5 h-5 w-5 shrink-0 text-[#071A33] print:h-4 print:w-4"
          aria-hidden
        />

        <div className="min-w-0">
          <p className="report-header-university text-[13px] font-black leading-snug text-[#071A33] print:text-[10px]">
            {printHeaderUniversity || "—"}
          </p>

          <p className="report-header-department mt-1 text-[12px] font-medium leading-snug text-slate-500 print:text-[9px]">
            {printHeaderDepartment || "—"}
          </p>
        </div>
      </div>
    </div>

    {/* QR + Report Meta */}
    <div className="report-header-meta flex shrink-0 flex-col items-start gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-start sm:justify-between lg:flex-col lg:items-end lg:border-t-0 lg:pt-0 print:gap-2">
      {showVerificationQr ? (
        <div className="flex w-full justify-start sm:justify-end">
          <div className="rounded-lg border border-slate-300 bg-white p-2 shadow-sm print:rounded-md print:p-1.5">
            <ReportVerificationQr
              impactVerifyUrl={resolvedVerifyUrl ?? undefined}
              size={78}
              caption=""
              className="items-end"
            />
          </div>
        </div>
      ) : null}

      <div className="report-header-meta-text w-full space-y-1.5 text-left text-[11px] leading-snug sm:text-xs lg:text-right print:text-[8px]">
        <p className="tabular-nums text-[#071A33]">
          <span className="font-extrabold">Report ID:</span>{" "}
          <span className="font-semibold">{printHeaderReportIdDisplay}</span>
        </p>

        <p className="text-[#071A33]">
          <span className="font-extrabold">Submission Date:</span>{" "}
          <span className="font-medium">{printHeaderSubmissionDate}</span>
        </p>
      </div>
    </div>
  </div>
</header>
                <section className="report-cover-page break-inside-avoid">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="border-b border-slate-200 pb-5 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0056B3]">
                                Professional section-wise student report
                            </p>
                            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                Professional Section-wise Student Report
                            </h2>
                            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                                Verified academic summary for community impact engagement, experiential learning, and CIEL impact documentation.
                            </p>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
                            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
                                <p className={`${dossierLabel} text-slate-500`}>Student profile</p>
                                <p className="mt-2.5 text-base font-black text-slate-900">{authorParticipation.displayName || "—"}</p>
                                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                                    {authorParticipation.degreeProgramYearLine || printHeaderDepartment || "Academic profile pending"}
                                </p>
                            </div>
                            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
                                <p className={`${dossierLabel} text-slate-500`}>Current program</p>
                                <p className="mt-2 text-base font-black text-slate-900">{printHeaderDepartment || "—"}</p>
                                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{printHeaderUniversity || "—"}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
                                <p className={`${dossierLabel} text-slate-500`}>Entry to report</p>
                                <p className="mt-2 text-base font-black text-slate-900">{printHeaderReportIdDisplay}</p>
                                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">Submitted {printHeaderSubmissionDate}</p>
                            </div>
                        </div>

                        <div className="mt-6 rounded-xl border border-[#0F8F83]/20 bg-[#0F8F83]/5 p-5 shadow-sm">
                            <p className={`${dossierLabel} text-[#0F8F83]`}>Report package</p>
                            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                                This report packages student identity, project context, SDG mapping, operational metrics, outcomes, resources,
                                partnerships, evidence, reflection, sustainability, and CII intelligence into a section-wise academic record.
                            </p>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                            {[
                                { label: "Verified hours", value: metrics.total_verified_hours, suffix: "hrs" },
                                { label: "CII score", value: totalScore, suffix: "/100" },
                                {
                                    label: "Compliance",
                                    value: formatHecComplianceLabel(data.section1.metrics?.hec_compliance),
                                    suffix: "",
                                },
                                { label: "Readiness", value: getReportReadinessLabel(reportRow), suffix: "" },
                            ].map((cell) => (
                                <div key={cell.label} className="rounded-xl border border-slate-200/80 bg-white p-5 text-center shadow-sm transition-shadow duration-200 hover:shadow-md">
                                    <p className={`${dossierLabel} text-slate-500`}>{cell.label}</p>
                                    <p className="mt-2 text-lg font-black tabular-nums text-[#0056B3]">
                                        {cell.value}
                                        {cell.suffix ? <span className="ml-1 text-[10px] font-bold text-slate-500">{cell.suffix}</span> : null}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Section 1: Participation Profile */}
                <SectionHeader
                    number={1}
                    title="Participation profile"
                    question="Who participated in the project and what are their institutional credentials?"
                />
                <div className={dossierSectionStack}>
                    <div className={dossierFieldGrid}>
                    <QandA q="Participation structure" a={data.section1.participation_type === "team" ? "Team-based initiative" : "Individual project"} />
                    <QandA
                        q={authorParticipation.isTeamLeadAuthor ? "Lead author / coordinator" : "Report author (team member)"}
                        a={authorParticipation.displayName}
                    />
                    <QandA q="Host institution / university" a={authorParticipation.university} />
                    <QandA q="Verified total engagement" a={`${metrics.total_verified_hours} hours verified`} />
                    <QandA q={`${dossierProfilePrefix} CNIC`} a={authorParticipation.cnic} />
                    <QandA q={`${dossierProfilePrefix} mobile`} a={authorParticipation.mobile} />
                    <QandA q={`${dossierProfilePrefix} email`} a={authorParticipation.email} />
                    <QandA
                        q={authorParticipation.isTeamLeadAuthor ? "Lead degree / year" : "Student author program"}
                        a={authorParticipation.degreeProgramYearLine}
                    />
                    <QandA
                        q={authorParticipation.isTeamLeadAuthor ? "Lead role / hours" : "Student author role / hours"}
                        a={dossierAuthorRoleHoursLine}
                    />
                    <QandA q="Privacy consent" a={data.section1.privacy_consent} />
                    <QandA q="Faculty supervisor email" a={dossierFacultyEmail} />
                    <QandA q="Attendance verification status" a={dossierAttendanceVerification} />
                    <QandA q="Verified summary" a={data.section1.verified_summary} fullWidth />
                    </div>

                {allApplicantRows.length > 0 && (
                    <div className="break-inside-avoid space-y-3">
                        <p className={dossierSubsectionEyebrow}>All applicants / participant details</p>
                        <table className="w-full border-collapse overflow-hidden rounded-xl border border-slate-200 text-xs">
                            <thead>
                                <tr className="bg-slate-900 text-[9px] font-black uppercase tracking-widest text-white">
                                    <th className="w-[20%] px-3 py-3 text-left align-middle">Applicant</th>
                                    <th className="w-[27%] px-3 py-3 text-left align-middle">Contact / ID</th>
                                    <th className="w-[25%] px-3 py-3 text-left align-middle">Institution / program</th>
                                    <th className="px-3 py-3 text-left align-middle">Role</th>
                                    <th className="px-3 py-3 text-left align-middle">Hours / verified</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {allApplicantRows.map((row) => (
                                    <tr key={row.key}>
                                        <td className="px-3 py-3 align-top font-bold text-slate-900">
                                            {row.name || "—"}
                                        </td>
                                        <td className="px-3 py-3 align-top text-[10px] font-semibold leading-relaxed text-slate-600">
                                            {row.contact || "—"}
                                        </td>
                                        <td className="px-3 py-3 align-top text-[10px] font-semibold leading-relaxed text-slate-600">
                                            {row.institutionProgram || "—"}
                                        </td>
                                        <td className="px-3 py-3 align-top text-[10px] font-bold uppercase tracking-tight text-slate-600">
                                            {row.role || "—"}
                                        </td>
                                        <td className="px-3 py-3 align-top text-[10px] font-semibold text-slate-600">
                                            {row.hoursVerified || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showEngagementDossierSection ? (
                    <div className="break-inside-avoid space-y-4">
                        <p className={dossierSubsectionEyebrow}>Engagement analytics</p>
                        <p className="text-xs font-medium leading-relaxed text-slate-600">
                            Same engagement metrics shown to reviewers on institutional verify — EIS, compliance category, and per-member breakdown for teams.
                        </p>
                        <div className={dossierFieldGrid}>
                            <QandA q="Verified session count" a={engagementForPrintDossier.verified_session_count} />
                            <QandA q="Total active days" a={engagementForPrintDossier.total_active_days} />
                            <QandA q="Engagement span (days)" a={engagementForPrintDossier.engagement_span} />
                            <QandA q="Attendance frequency" a={engagementForPrintDossier.attendance_frequency} />
                            <QandA q="Weekly continuity (%)" a={engagementForPrintDossier.weekly_continuity} />
                            <QandA q="EIS score" a={engagementForPrintDossier.eis_score} />
                            <QandA q="Engagement category" a={engagementForPrintDossier.engagement_category} />
                            <QandA
                                q="HEC compliance"
                                a={formatHecComplianceLabel(engagementForPrintDossier.hec_compliance)}
                            />
                            <QandA q="Non-compliant (engagement)" a={engagementForPrintDossier.isNonCompliant} />
                        </div>
                        {redFlagsForPrint.length > 0 ? (
                            <div className="dossier-qa flex min-h-0 flex-col break-inside-avoid md:col-span-2">
                                <span className={`mb-2 ${dossierLabel} text-slate-500`}>Engagement red flags</span>
                                <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-3 shadow-sm">
                                    <ul className={`${dossierBodyText} list-disc space-y-1.5 pl-5 font-medium text-rose-950`}>
                                        {redFlagsForPrint.map((flag, i) => (
                                            <li key={i}>{flag}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : null}
                        {engagementIndividualMetricsHaveTableRows(individualMetricsForPrint) ? (
                            <div className="dossier-qa flex min-h-0 flex-col break-inside-avoid">
                                <span className={`mb-2 ${dossierLabel} text-slate-500`}>Individual metrics</span>
                                <div className="flex min-h-0 flex-1 flex-col overflow-x-auto rounded-xl border border-slate-200/80 bg-white px-2 py-2 shadow-sm sm:px-3 sm:py-3">
                                    <EngagementIndividualMetricsTable report={data} value={individualMetricsForPrint} />
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {Array.isArray(data.section1?.attendance_logs) && data.section1.attendance_logs.length > 0 ? (
                    <div className="break-inside-avoid space-y-3">
                        <p className={dossierSubsectionEyebrow}>Attendance &amp; evidence (submitted logs)</p>
                        <p className="text-xs font-medium leading-relaxed text-slate-600">
                            Each row reflects what the student uploaded: date, site / location, narrative, and proof-of-presence link where provided.
                        </p>
                        <div className="overflow-x-auto">
                            <AttendanceLogsDossierTable
                                logs={data.section1.attendance_logs}
                                participantNames={buildSection1AttendanceParticipantNameMap({
                                    section1: data.section1,
                                    student: data.student,
                                })}
                            />
                        </div>
                    </div>
                ) : null}
                </div>

                {/* Section 2: Project Context */}
                <SectionHeader
                    number={2}
                    title="Project context"
                    question="What specific problem was addressed and how did it relate to your academic discipline?"
                />
                <div className={dossierSectionStack}>
                    {printableBlueprintRows.length > 0 ? (
                        <div className={dossierFieldGrid}>
                            {printableBlueprintRows.map((row) => (
                                <BlueprintCard key={row.label} row={row} />
                            ))}
                        </div>
                    ) : null}
                    <QandA q="Core problem statement" a={data.section2.problem_statement} fullWidth />
                    <div className={dossierFieldGrid}>
                        <QandA q="Problem category" a={data.section2.problem_category} />
                        <QandA q="Primary beneficiary" a={data.section2.primary_beneficiary} />
                        <QandA q="Academic discipline" a={data.section2.discipline} />
                        <QandA q="Disciplinary contribution" a={data.section2.discipline_contribution} fullWidth />
                        <QandA q="Baseline evidence" a={data.section2.baseline_evidence} fullWidth />
                        <QandA q="Baseline evidence other" a={data.section2.baseline_evidence_other} fullWidth />
                        <QandA q="Baseline other entries" a={data.section2.baseline_other_entries} fullWidth />
                        <QandA q="Section summary" a={data.section2.summary_text} fullWidth />
                    </div>
                </div>

                {/* Section 3: SDG Impact — unified subsection spacing + aligned primary row */}
                <SectionHeader
                    number={3}
                    title="SDG impact mapping"
                    question="Which United Nations Sustainable Development Goals (SDGs) were prioritized by this project?"
                />
                <div className={dossierSectionStack}>
                    {opportunitySdgRows.length > 0 ? (
                        <div className="break-inside-avoid rounded-xl border border-slate-200/80 bg-slate-50/70 p-5 shadow-sm md:p-6">
                            <p className={dossierSubsectionEyebrow}>
                                Opportunity-registered SDGs
                            </p>
                            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                                These goals were set when the opportunity was published (partner / institution registration).
                            </p>
                            <div className={`mt-3 ${dossierFieldGrid}`}>
                                {opportunitySdgRows.map((r, i) => {
                                    const secondaryIndex =
                                        r.role === "secondary"
                                            ? opportunitySdgRows.slice(0, i).filter((x) => x.role === "secondary").length + 1
                                            : 0;
                                    const qLabel =
                                        r.role === "primary"
                                            ? "Primary SDG (opportunity)"
                                            : `Secondary SDG (opportunity) ${secondaryIndex}`;
                                    return (
                                        <QandA key={`opp-sdg-${r.goalNumber}-${i}`} q={qLabel} a={formatSdgRowAnswer(r)} />
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    <div className="break-inside-avoid rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6">
                        <p className={dossierSubsectionEyebrow}>
                            Student project SDG mapping (accountability profile)
                        </p>
                        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                            Student-selected primary goal and indicators below align to your Section 3 submission (audit trail).
                        </p>
                        <div className={`mt-3 ${dossierFieldGrid} md:items-stretch`}>
                            <div className="flex min-h-0 flex-col">
                                <span className="mb-1.5 min-h-[1.125rem] text-[8px] font-black uppercase leading-relaxed tracking-[0.18em] text-slate-500">
                                    Primary goal
                                </span>
                                <div className="flex min-h-[7rem] flex-1 items-center gap-5 rounded-xl border border-[#0F8F83]/25 bg-[#0F8F83]/[0.06] px-5 py-5 text-slate-900 shadow-sm print:min-h-[6.5rem]">
                                    <div className="rounded-xl bg-[#0F8F83] px-4 py-2.5 text-3xl font-black tabular-nums text-white shadow-md print:text-2xl">
                                        {primarySdgDisplay ? formatSdgGoalPadded(primarySdgDisplay.goalNumber) : "—"}
                                    </div>
                                    <div className="min-w-0 space-y-1.5">
                                        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#0F8F83]">
                                            {primarySdgDisplay?.source === "opportunity"
                                                ? "Opportunity primary goal"
                                                : "Student primary goal"}
                                        </p>
                                        <p className="text-sm font-black uppercase leading-snug tracking-tight text-slate-900">
                                            {primarySdgDisplay?.title || "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex min-h-0 flex-col">
                                <span className="mb-1.5 min-h-[1.125rem] text-[8px] font-black uppercase leading-relaxed tracking-[0.18em] text-slate-500">
                                    Primary — target &amp; indicator
                                </span>
                                <div className="flex min-h-[7rem] flex-1 flex-col justify-center rounded-xl border border-slate-200/80 bg-white px-5 py-5 shadow-sm print:min-h-[6.5rem]">
                                    <p className="text-[13px] font-semibold leading-relaxed text-slate-900">
                                        {primarySdgDisplay ? (
                                            <>
                                                <span className="rounded bg-[#0F8F83]/10 px-2 py-1 font-black tabular-nums text-[#0F8F83]">
                                                    {primarySdgDisplay.targetId || "T/A"}
                                                </span>
                                                <span className="mx-1.5 font-bold text-slate-300">—</span>
                                                <span className="rounded bg-[#0F8F83]/10 px-2 py-1 font-black tabular-nums text-[#0F8F83]">
                                                    {primarySdgDisplay.indicatorId || "I/A"}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="font-medium italic text-slate-400">Pending verification / not provided</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {studentSdgRows.filter((r) => r.role === "secondary").length > 0 ? (
                        <div className="break-inside-avoid rounded-xl border border-slate-200/80 bg-slate-50/70 p-5 shadow-sm md:p-6">
                            <p className={dossierSubsectionEyebrow}>
                                Student secondary SDGs
                            </p>
                            <div className={`mt-3 ${dossierFieldGrid}`}>
                                {studentSdgRows
                                    .filter((r) => r.role === "secondary")
                                    .map((r, i) => (
                                        <QandA
                                            key={`stu-sec-${r.goalNumber}-${i}`}
                                            q={`Secondary (student) ${i + 1}`}
                                            a={formatSdgRowAnswer(r)}
                                        />
                                    ))}
                            </div>
                        </div>
                    ) : null}

                    {(data.section3.contribution_intent_statement || "").trim() ||
                    (data.section3.student_contribution_intent_statement || "").trim() ? (
                        <div className={dossierFieldGrid}>
                            {(data.section3.contribution_intent_statement || "").trim() ? (
                                <QandA q="Contribution intent (pathway narrative)" a={data.section3.contribution_intent_statement} />
                            ) : null}
                            {(data.section3.student_contribution_intent_statement || "").trim() ? (
                                <QandA
                                    q="Student contribution intent"
                                    a={data.section3.student_contribution_intent_statement}
                                />
                            ) : null}
                        </div>
                    ) : null}

                    <div className={dossierFieldGrid}>
                        <QandA q="Validation status" a={data.section3.validation_status} />
                        <QandA q="Summary stage" a={data.section3.summary_stage} />
                        <QandA q="Section summary" a={data.section3.summary_text} fullWidth />
                        <QandA q="Raw secondary SDG entries" a={data.section3.secondary_sdgs} fullWidth />
                    </div>

                    <div className="rounded-xl border border-[#0F8F83]/20 bg-[#0F8F83]/[0.04] px-5 py-5 text-center shadow-sm">
                        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#0F8F83]">
                            All aligned goals (deduplicated)
                        </p>
                        <p className="mt-1 text-sm font-black text-slate-900">
                            {mergedSdgNums.length
                                ? `${mergedSdgNums.length === 1 ? "Goal" : "Goals"} ${sdgGoalDisplay}`
                                : "—"}
                        </p>
                        {sdgTitleLine ? (
                            <p className="mt-1.5 text-[10px] font-semibold leading-snug text-slate-500">{sdgTitleLine}</p>
                        ) : null}
                    </div>

                    {mergedSdgRows.length > 0 ? (
                        <div className={dossierFieldGrid}>
                            {mergedSdgRows.map((r, i) => (
                                <QandA
                                    key={`merged-sdg-${r.goalNumber}-${i}`}
                                    q={`Aligned SDG ${i + 1}`}
                                    a={formatSdgRowAnswer(r)}
                                />
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* Section 4: Operational Metrics */}
                <SectionHeader
                    number={4}
                    title="Operational metrics"
                    question="What were the measurable outputs and beneficiary reach of the project?"
                />
                <div className={dossierSectionStack}>
                    <div className={dossierMetricStrip}>
                    {[
                        { label: "Verified hours", value: metrics.total_verified_hours, suffix: "hrs" },
                        { label: "Total reach", value: metrics.total_beneficiaries, suffix: "pax" },
                        { label: "Sessions", value: totalSessionsDisplay, suffix: "" },
                        { label: "Impact span", value: metrics.engagement_span, suffix: "days" },
                    ].map((cell) => (
                        <div
                            key={cell.label}
                            className="flex min-h-[6.5rem] flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-4 text-center shadow-sm"
                        >
                            <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">{cell.label}</p>
                            <p className="report-h3 text-2xl font-black tabular-nums text-slate-900">
                                {cell.value}
                                {cell.suffix ? (
                                    <span className="ml-1 text-[10px] font-bold uppercase tracking-tight text-slate-500">{cell.suffix}</span>
                                ) : null}
                            </p>
                        </div>
                    ))}
                    </div>
                    <QandA q="Comprehensive activity description" a={activityDescriptionCombined} fullWidth />
                    <div className={dossierFieldGrid}>
                    <QandA q="Counting method" a={data.section4.project_summary?.counting_method} />
                    <QandA q="Overall overlap" a={data.section4.project_summary?.overall_overlap} />
                    <QandA q="Overall delivery mode" a={data.section4.project_summary?.overall_delivery_mode} />
                    <QandA q="Overall implementation model" a={data.section4.project_summary?.overall_implementation_model} />
                    <QandA q="Overall geographic reach" a={data.section4.project_summary?.overall_geographic_reach} />
                    <QandA q="Project implementation explanation" a={data.section4.project_summary?.project_implementation_explanation} fullWidth />
                    <QandA q="Section summary" a={data.section4.summary_text} fullWidth />
                    </div>
                {section4Blocks.length > 0 ? (
                    <div className="space-y-3 break-inside-avoid">
                        <p className={dossierSubsectionEyebrow}>Activity block details</p>
                        <div className="space-y-4">
                        {section4Blocks.map((block, i) => (
                            <div key={String(block.id ?? i)} className="break-inside-avoid rounded-2xl border border-slate-200 bg-slate-50/90 p-5">
                                <p className="mb-4 text-sm font-black text-slate-900">{firstNonBlank(block.title, `Activity ${i + 1}`)}</p>
                                <div className={dossierFieldGrid}>
                                    <QandA q="Primary category" a={block.primary_category} />
                                    <QandA q="Sub-category" a={block.sub_category} />
                                    <QandA q="Other category" a={block.other_category_text} />
                                    <QandA q="Status" a={block.status} />
                                    <QandA q="Delivery mode" a={block.delivery_mode} />
                                    <QandA q="Implementation models" a={block.implementation_models} />
                                    <QandA q="Sessions count" a={block.sessions_count} />
                                    <QandA q="Geographic reach" a={block.geographic_reach} />
                                    <QandA q="Geographic sub-category" a={block.geographic_sub_category} />
                                    <QandA q="Description" a={block.description} fullWidth />
                                    <QandA q="Delivery explanation" a={block.delivery_explanation} fullWidth />
                                    <QandA q="Serves beneficiaries" a={block.serves_beneficiaries} />
                                    <QandA q="Beneficiaries reached" a={block.beneficiaries_reached} />
                                    <QandA q="Beneficiary categories" a={block.beneficiary_categories} fullWidth />
                                    <QandA q="Relevance types" a={block.relevance_types} fullWidth />
                                    <QandA q="Overlap status" a={block.overlap_status} />
                                    <QandA q="Beneficiary description" a={block.beneficiary_description} fullWidth />
                                    <QandA q="Site note" a={block.site_note} fullWidth />
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                ) : null}
                {section4Outputs.length > 0 ? (
                    <div className="space-y-3 break-inside-avoid">
                        <p className={dossierSubsectionEyebrow}>Tangible output details</p>
                        <div className={dossierFieldGrid}>
                            {section4Outputs.map(({ blockTitle, output, key }) => (
                                <div key={key} className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5">
                                    <p className="mb-1 text-sm font-black text-slate-900">{firstNonBlank(output.title, "Output")}</p>
                                    <p className="mb-4 text-[9px] font-black uppercase tracking-widest text-slate-400">{blockTitle}</p>
                                    <div className="grid grid-cols-1 gap-4">
                                        <QandA q="Type" a={output.type} />
                                        <QandA q="Quantity / unit" a={[output.quantity, output.unit].filter(Boolean).join(" ")} />
                                        <QandA q="Shared" a={output.is_shared} />
                                        <QandA q="Verification note" a={output.verification_note} fullWidth />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
                </div>

                {/* Section 5: Measurable Outcomes */}
                <SectionHeader
                    number={5}
                    title="Systemic outcomes"
                    question="What specific measurable changes were observed at the end of the project?"
                />
                <div className={dossierSectionStack}>
                    {printableOutcomes.length > 0 ? (
                        printableOutcomes.map((outcome, i) => (
                            <div
                                key={`${outcome.metric}-${i}`}
                                className="grid grid-cols-1 gap-5 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md md:grid-cols-2 md:gap-6 break-inside-avoid"
                            >
                                <div className="min-w-0">
                                    <p className="mb-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-[#0F8F83]">
                                        Outcome {i + 1}
                                    </p>
                                    <p className="rounded-xl border border-[#0F8F83]/20 bg-[#0F8F83]/[0.05] px-3 py-3 text-base font-black leading-snug text-slate-900 sm:text-lg">
                                        {outcome.metric}
                                    </p>
                                    {(outcome.baseline || outcome.endline) && (
                                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                                            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-center">
                                                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                                                    Baseline
                                                </span>
                                                <div className="mt-2 rounded bg-white px-3 py-2 text-sm font-black tabular-nums text-slate-700">
                                                    {outcome.baseline || "—"} {outcome.unit}
                                                </div>
                                            </div>
                                            <div className="hidden h-0.5 w-8 shrink-0 bg-[#0F8F83]/30 sm:block" aria-hidden />
                                            <div className="rounded-xl border border-[#0F8F83]/25 bg-[#0F8F83]/[0.06] p-3 text-center">
                                                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-[#0F8F83]">
                                                    Achieved
                                                </span>
                                                <div className="mt-2 rounded bg-[#0F8F83] px-3 py-2 text-sm font-black tabular-nums text-white">
                                                    {outcome.endline || "—"} {outcome.unit}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <QandA q="Impact dimension" a={outcome.outcomeArea} />
                                    <QandA q="Metric category" a={outcome.metricCategory} />
                                    <QandA q="Confidence level" a={outcome.confidence} />
                                    <QandA q="Measurement note" a={outcome.explanation} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <QandA
                            q="Measured outcomes"
                            a={data.section5.observed_change || data.section5.summary_text || "No measurable outcomes were listed."}
                            fullWidth
                        />
                    )}
                    <QandA q="Observed change narrative" a={data.section5.observed_change} fullWidth />
                    <QandA q="Core implementation challenges" a={data.section5.challenges} fullWidth />
                    <QandA q="Section summary" a={data.section5.summary_text} fullWidth />
                </div>

                {/* Section 6: Resources */}
                <SectionHeader
                    number={6}
                    title="Resource utilization"
                    question="What resources were deployed and how were they sourced?"
                />
                <div className={dossierSectionStack}>
                    <div className={dossierFieldGrid}>
                    <QandA q="Used external resources" a={data.section6.use_resources} />
                    <FileListQA q="Resource evidence files" files={data.section6.evidence_files} />
                    </div>
                {data.section6.resources?.length > 0 ? (
                    <div className={dossierFieldGrid}>
                        {data.section6.resources.map((r: ReportData["section6"]["resources"][number], i: number) => (
                            <QandA
                                key={i}
                                q={`Resource ${i + 1}: ${r.type_other || r.type}?`}
                                a={(() => {
                                    const src = formatResourceSourcesLine(r);
                                    const countPart = `Count: ${r.amount ?? "—"} ${r.unit_other || r.unit || ""}`.trim();
                                    const verification = r.verification?.length ? ` | Verification: ${r.verification.join(", ")}` : "";
                                    const purpose = r.purpose ? ` | Purpose: ${r.purpose}` : "";
                                    return `${src ? `${countPart} | Source: ${src}` : countPart}${purpose}${verification}`;
                                })()}
                            />
                        ))}
                    </div>
                ) : (
                    <QandA
                        q="External resources used"
                        a="No external financial or physical resources were reported for this project."
                        fullWidth
                    />
                )}
                    <div className={dossierFieldGrid}>
                    <QandA q="Section summary" a={data.section6.summary_text} fullWidth />
                    </div>
                </div>

                {/* Section 7: Strategic Partnerships */}
                <SectionHeader
                    number={7}
                    title="Strategic partnerships"
                    question="Which organizations or partners collaborated in the project?"
                />
                <div className={dossierSectionStack}>
                    <div className={dossierFieldGrid}>
                    <QandA q="Has partners" a={data.section7.has_partners} />
                    <QandA q="Formalization status" a={data.section7.formalization_status} />
                    <QandA q="Formalization files" a={data.section7.formalization_files} fullWidth />
                    </div>
                {data.section7.partners?.length > 0 ? (
                    <div className={dossierFieldGrid}>
                        {data.section7.partners.map((p: ReportData["section7"]["partners"][number], i: number) => (
                            <QandA
                                key={i}
                                q={`Partner ${i + 1}`}
                                a={[
                                    `${p.name} (${p.type_other || p.type} organization)`,
                                    p.pakistan_contact_name?.trim()
                                        ? `Pakistan contact: ${p.pakistan_contact_name}`
                                        : "",
                                    p.pakistan_contact_number?.trim()
                                        ? `Phone: ${formatSection7PakistanDialForDisplay(p.pakistan_contact_number)}`
                                        : "",
                                    p.pakistan_contact_email?.trim()
                                        ? `Email: ${p.pakistan_contact_email}`
                                        : "",
                                    p.role?.length ? `Role: ${p.role.join(", ")}` : "",
                                    p.contribution?.length ? `Contribution: ${p.contribution.join(", ")}` : "",
                                    p.verification ? `Verification: ${p.verification}` : "",
                                ].filter(Boolean).join(" | ")}
                            />
                        ))}
                    </div>
                ) : (
                    <QandA
                        q="Formal partnerships established"
                        a="Sustainable impact was achieved through student-led initiative without formal external organizational partnering."
                        fullWidth
                    />
                )}
                    <div className={dossierFieldGrid}>
                    <QandA q="Section summary" a={data.section7.summary_text} fullWidth />
                    </div>
                </div>

                {/* Section 8: Evidence & Ethics */}
                <SectionHeader
                    number={8}
                    title="Evidence & ethics"
                    question="What evidence was captured and how were ethical standards maintained?"
                />
                <div className={dossierSectionStack}>
                    <div className={dossierFieldGrid}>
                    <QandA q="Has evidence" a={data.section8.has_evidence} />
                    <QandA q="Media visibility" a={data.section8.media_visible} />
                    <QandA q="Primary evidence types" a={data.section8.evidence_types} />
                    <QandA q="Evidence description" a={data.section8.description} fullWidth />
                    <FileListQA q="Evidence files" files={data.section8.evidence_files} fullWidth />
                    <QandA
                        q="Ethical declaration compliance"
                        a={
                            Object.entries(data.section8.ethical_compliance || {})
                                .filter((entry) => entry[1])
                                .map(([k]) => k.replace(/_/g, " "))
                                .join(", ") || "Global ethical compliance adhered"
                        }
                    />
                    <QandA q="Partner verification" a={data.section8.partner_verification} />
                    <QandA q="Partner verification type" a={data.section8.partner_verification_type} />
                    <FileListQA q="Partner verification files" files={data.section8.partner_verification_files} fullWidth />
                    <QandA q="Section summary" a={data.section8.summary_text} fullWidth />
                    </div>
                </div>

                {/* Section 9: Reflection */}
                <SectionHeader
                    number={9}
                    title="Reflection & synthesis"
                    question="How has this project influenced your professional growth and academic understanding?"
                />
                <div className={dossierSectionStack}>
                    <div className={dossierFieldGrid}>
                        <QandA q="Academic integration" a={data.section9.academic_integration} />
                    </div>
                    <div className={`dossier-qa flex min-h-0 flex-col md:col-span-2 break-inside-avoid`}>
                        <span className={`mb-2 ${dossierLabel} text-slate-500`}>Competency scores</span>
                        <div className="flex min-h-[3.5rem] flex-1 flex-col rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
                            <CompetencyScoresTable scores={data.section9.competency_scores} />
                        </div>
                    </div>
                    <QandA q="Academic–professional synthesis" a={data.section9.academic_application} fullWidth />
                    <QandA q="Personal narrative & identity growth" a={data.section9.personal_learning} fullWidth />
                    <QandA q="Sustainability & systems reflection" a={data.section9.sustainability_reflection} fullWidth />
                    <QandA q="Section summary" a={data.section9.summary_text} fullWidth />
                </div>

                {/* Section 10: Sustainability */}
                <SectionHeader
                    number={10}
                    title="Sustainability & roadmap"
                    question="How will the impact of this project be sustained after your involvement concludes?"
                />
                <div className={dossierSectionStack}>
                    <div className={dossierFieldGrid}>
                    <QandA q="Continuation strategy status" a={data.section10.continuation_status} />
                    <QandA q="Mechanisms" a={data.section10.mechanisms} />
                    <QandA q="Scaling potential" a={data.section10.scaling_potential} />
                    <QandA q="Policy influence" a={data.section10.policy_influence} />
                    </div>
                    <QandA q="Detailed roadmap for future continuity" a={data.section10.continuation_details} fullWidth />
                    <QandA q="Section summary" a={data.section10.summary_text} fullWidth />
                </div>

                {/* Section 11: Impact Intelligence breakdown */}
                <SectionHeader
                    number={11}
                    title="Impact intelligence analysis"
                    question="What is the detailed breakdown of the CII index score performance?"
                />
                <div className={dossierSectionStack}>
                    <div className="break-inside-avoid">
                    <table className="w-full border-collapse overflow-hidden rounded-xl border border-slate-200 text-xs">
                        <thead>
                            <tr className="bg-slate-900 text-[9px] font-black uppercase tracking-widest text-white">
                                <th className="w-[44%] px-4 py-3 text-left align-middle">Score category</th>
                                <th className="px-3 py-3 text-center align-middle">Weight</th>
                                <th className="px-3 py-3 text-center align-middle">Max</th>
                                <th className="w-[5.5rem] px-4 py-3 text-right align-middle">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {scoreTableItems.map((item, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-3 align-middle font-bold text-slate-900">{item.label}</td>
                                    <td className="px-3 py-3 text-center align-middle text-[10px] font-bold uppercase tracking-tight text-slate-500">
                                        {item.weight}
                                    </td>
                                    <td className="px-3 py-3 text-center align-middle font-bold tabular-nums text-slate-500">{item.max}</td>
                                    <td className="px-4 py-3 text-right align-middle">
                                        <span className="inline-flex min-w-[2.75rem] justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black tabular-nums text-slate-900">
                                            {formatCiiScore(item.score)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {showCiiPenaltyRow ? (
                                <tr className="bg-rose-50/60">
                                    <td className="px-4 py-3 align-middle font-black text-rose-900">
                                        Penalty deductions
                                    </td>
                                    <td className="px-3 py-3 text-center align-middle text-[10px] font-bold uppercase tracking-tight text-rose-700">
                                        Audit
                                    </td>
                                    <td className="px-3 py-3 text-center align-middle font-bold tabular-nums text-rose-700">—</td>
                                    <td className="px-4 py-3 text-right align-middle">
                                        <span className="inline-flex min-w-[2.75rem] justify-center rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-black tabular-nums text-rose-800">
                                            -{formatCiiScore(penaltyApplied)}
                                        </span>
                                    </td>
                                </tr>
                            ) : null}
                            <tr className="border-t-2 border-slate-200 bg-slate-50">
                                <td
                                    colSpan={3}
                                    className="px-4 py-3 text-right align-middle text-[10px] font-black uppercase tracking-widest text-slate-900"
                                >
                                    Aggregated CII index score
                                </td>
                                <td className="px-4 py-3 text-right align-middle">
                                    <span className="inline-flex min-w-[2.75rem] justify-center rounded-lg bg-slate-900 px-2 py-2 text-xs font-black tabular-nums text-white shadow-md">
                                        {formatCiiScore(totalScore)}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {dossierSectionWiseAuditBlocks.length > 0 ? (
                    <div className="break-inside-avoid">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                            CII AI audit — section-wise review
                        </p>
                        <h3 className="report-h3 mb-4 text-slate-900">Red flags by section (1–10)</h3>
                        <div className="space-y-5 text-xs leading-relaxed text-slate-800">
                            {dossierSectionWiseAuditBlocks.map((sec) => {
                                const rows = extractIssueFields(sec.body, sec.sectionNum);
                                return (
                                    <div
                                        key={sec.sectionNum}
                                        className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
                                    >
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            Section {sec.sectionNum}
                                        </p>
                                        <h4 className="mt-0.5 text-sm font-black text-slate-900">{sec.title}</h4>
                                        <div className="mt-3 space-y-2.5">
                                            {rows.map((row, i) => (
                                                <div key={`${sec.sectionNum}-${row.label}-${i}`}>
                                                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">
                                                        {row.label}
                                                    </p>
                                                    <p className="mt-0.5 font-medium text-slate-800">{row.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                {dossierAuditMeta ? (
                    <div className="break-inside-avoid rounded-2xl border-2 border-slate-900 bg-slate-50 p-6 sm:p-8">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                            Cross-section audit — CII transparency
                        </p>
                        <h3 className="report-h3 mb-4 text-slate-900">Red flags and required fixes (Section 11)</h3>
                        <div className="space-y-4 text-xs leading-relaxed text-slate-800">
                            {dossierAuditMeta.credibility ? (
                                <p>
                                    <span className="font-black text-slate-900">Credibility: </span>
                                    {dossierAuditMeta.credibility}
                                </p>
                            ) : null}
                            {dossierAuditMeta.risk_level ? (
                                <p>
                                    <span className="font-black text-slate-900">Risk level: </span>
                                    {dossierAuditMeta.risk_level}
                                </p>
                            ) : null}
                            {dossierAuditMeta.critical_red_flags ? (
                                <p className="whitespace-pre-wrap">
                                    <span className="font-black text-rose-800">Critical red flags: </span>
                                    {summarizeAuditIssueText(dossierAuditMeta.critical_red_flags) ??
                                        dossierAuditMeta.critical_red_flags}
                                </p>
                            ) : null}
                            {dossierAuditMeta.moderate_issues ? (
                                <p className="whitespace-pre-wrap">
                                    <span className="font-black text-amber-900">Moderate issues: </span>
                                    {summarizeAuditIssueText(dossierAuditMeta.moderate_issues) ??
                                        dossierAuditMeta.moderate_issues}
                                </p>
                            ) : null}
                            {dossierAuditMeta.minor_issues ? (
                                <p className="whitespace-pre-wrap">
                                    <span className="font-black text-slate-700">Minor issues: </span>
                                    {summarizeAuditIssueText(dossierAuditMeta.minor_issues) ??
                                        dossierAuditMeta.minor_issues}
                                </p>
                            ) : null}
                            {dossierAuditMeta.top_fixes.length > 0 ? (
                                <div>
                                    <p className="mb-2 font-black text-slate-900">Top fixes</p>
                                    <ol className="list-decimal space-y-1.5 pl-5">
                                        {dossierAuditMeta.top_fixes.map((fix: string, i: number) => (
                                            <li key={i}>{fix}</li>
                                        ))}
                                    </ol>
                                </div>
                            ) : null}
                            {dossierAuditMeta.final_remark ? (
                                <p>
                                    <span className="font-black text-slate-900">Auditor remark: </span>
                                    {dossierAuditMeta.final_remark}
                                </p>
                            ) : null}
                            {dossierAuditMeta.student_feedback ? (
                                <p>
                                    <span className="font-black text-indigo-900">Student feedback: </span>
                                    {dossierAuditMeta.student_feedback}
                                </p>
                            ) : null}
                        </div>
                    </div>
                ) : null}
                </div>

                {/* Final CII Score & Report Card */}
                <div className="mt-12 break-inside-avoid sm:mt-14">
                    <div className="mb-5 inline-flex min-w-[min(100%,28rem)] items-center rounded-md px-4 py-2.5 text-white shadow-sm" style={{ backgroundColor: sectionInk }}>
                        <span className="text-[12px] font-black uppercase tracking-[0.12em]">Final CII Score &amp; Report Card</span>
                    </div>

                    <div className="rounded-xl border border-teal-100 bg-teal-50/45 px-6 py-8 shadow-sm sm:px-10 sm:py-10">
                        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[12rem_1fr] md:gap-10">
                            <div className="flex justify-center">
                                <div
                                    className="flex h-36 w-36 items-center justify-center rounded-full"
                                    style={{
                                        background: `conic-gradient(${tealInk} ${Math.max(0, Math.min(100, totalScore))}%, #dce8e7 0)`,
                                    }}
                                    aria-label={`CII score ${totalScore} out of 100`}
                                >
                                    <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-teal-50 text-center">
                                        <span className="text-4xl font-black tabular-nums" style={{ color: tealInk }}>
                                            {totalScore}
                                        </span>
                                        <span className="mt-1 text-sm font-bold text-slate-700">/100</span>
                                    </div>
                                </div>
                            </div>

                            <div className="min-w-0">
                                <p className="text-sm font-black uppercase tracking-wide text-slate-900">CII Score</p>
                                <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl" style={{ color: tealInk }}>
                                    {finalScoreLevel}
                                </h2>
                                <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-700">
                                    {finalScoreNarrative}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-7 overflow-hidden rounded-sm border border-slate-200">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr style={{ backgroundColor: sectionInk }}>
                                    <th className="w-[36%] px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white">
                                        Category
                                    </th>
                                    <th className="w-[18%] px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white">
                                        Score
                                    </th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white">
                                        Report Card Note
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {finalReportCardRows.map((row) => (
                                    <tr key={row.label}>
                                        <td className="px-4 py-4 align-top text-[13px] font-semibold text-slate-800">{row.label}</td>
                                        <td className="px-4 py-4 align-top text-[13px] font-black tabular-nums text-slate-900">
                                            {row.score} / 100
                                        </td>
                                        <td className="px-4 py-4 align-top text-[13px] font-medium leading-relaxed text-slate-700">
                                            {row.note}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-7 rounded-sm border border-slate-200 bg-slate-50/80 px-5 py-4">
                        <h3 className="text-lg font-black text-slate-900">Conclusion</h3>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                            This report presents the student contribution in an academic, audit-ready, and presentation-friendly format.
                            The section-wise structure supports review, verification, institutional analytics, and evidence-based recognition
                            of community impact.
                        </p>
                        <p className="mt-4 text-xl font-black leading-snug text-slate-900">
                            Verified contribution to community. Strong learning. Real impact.
                        </p>
                    </div>
                </div>

                {/* Footer Signing Area */}
                <footer className="mb-10 mt-16 border-t-4 border-slate-100 pt-10 print:mb-6 print:mt-10 print:pt-6">
                    <div className="grid grid-cols-1 items-end gap-8 sm:grid-cols-3 sm:gap-6">
                        <div className="space-y-4 print:space-y-2">
                            <img
                                src="/ciel-e-signature.png"
                                alt="CIEL e-signature"
                                className="h-10 w-40 object-contain object-left print:h-8 print:w-32"
                                width={640}
                                height={160}
                            />
                            <div className="h-0.5 w-48 max-w-full bg-slate-900 print:w-40" />
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400 print:text-[7px]">
                                    E-signature / attestation
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-900 print:text-[8px]">
                                    Registrar of impact
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-start sm:justify-center">
                            <img
                                src={ciiBadge.src}
                                alt={ciiBadge.alt}
                                className="h-24 w-36 object-contain drop-shadow-sm print:h-[4.5rem] print:w-28 print:drop-shadow-none"
                                width={1024}
                                height={1024}
                            />
                        </div>

                        <div className="text-left sm:text-right">
                            <img
                                src="/certificate-iel-pk-logo.png"
                                alt="CIEL PK"
                                className="mb-3 h-10 w-10 shrink-0 object-contain sm:ml-auto print:h-8 print:w-8"
                                width={1024}
                                height={1024}
                            />
                            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-300 print:text-[7px]">
                                CIEL digital protocol — © {new Date().getFullYear()}
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
