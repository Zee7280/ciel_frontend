import type { ReportData } from "../context/ReportContext";
import { formatInternationalPhoneDisplay } from "@/utils/countryCallingCodes";
import { formatPakistaniCnicDisplay } from "@/utils/section1ParticipantDossierFields";
import { formatSection7PakistanDialForDisplay } from "@/utils/reportSection7PakistanDial";
import { findSdgById } from "@/utils/sdgData";
import { mergeReportSdgSnapshotRows } from "../utils/reportSdgMerge";
import { distinctBeneficiaryTotal } from "../utils/activityReach";
import { effectiveHoursFromLog, isLogCountedBeforeFacultyReview } from "../utils/engagementMetrics";
import { MEDIA_VISIBILITY_LABELS, hasPublicSharePermission, resolveMediaVisibility } from "../utils/mediaVisibility";
import { reportRequiresReportingFee } from "@/utils/reviewQueue";
import {
    buildImpactPackageModel,
    type ImpactPackageAudience,
    type ImpactPackageEvidenceFile,
} from "./buildImpactPackageModel";

export type DetailedReportValue =
    | string
    | number
    | boolean
    | null
    | DetailedReportValue[]
    | { [key: string]: DetailedReportValue };

export type DetailedReportRow = {
    question: string;
    answer: DetailedReportValue;
    origin: string;
    source_path: string;
};

export type DetailedReportSubsection = {
    id: string;
    title: string;
    rows: DetailedReportRow[];
};

export type DetailedReportSection = {
    id: string;
    title: string;
    source: string;
    subsections: DetailedReportSubsection[];
};

export type DetailedReportCheck = {
    level: string;
    title: string;
    detail: string;
};

export type ImpactPackageDetailedReportModel = {
    title: string;
    projectId: string;
    adminApproved: boolean;
    submitted: boolean;
    sections: DetailedReportSection[];
    fieldCount: number;
    subsectionCount: number;
    checks: DetailedReportCheck[];
    coverage: string;
    banner: { kind: "warning" | "info"; htmlTitle: string; text: string } | null;
};

const PRIVATE_EXCLUDED = "Private identity value excluded from this shareable package.";
const PRIVATE_CONTACT = "Private contact value excluded from this shareable package.";
const PRIVATE_EMAIL = "Private email excluded from this shareable package.";
const NOT_SUPPLIED = "Not supplied";
const SOURCE = "Source record";

const COMPETENCY: Array<[string, string]> = [
    ["cognitive_systemic", "Cognitive — systemic thinking"],
    ["cognitive_critical", "Cognitive — critical thinking"],
    ["cognitive_evaluate", "Cognitive — evaluate evidence"],
    ["practical_design", "Practical — design"],
    ["practical_evidence", "Practical — evidence"],
    ["practical_engagement", "Practical — engagement"],
    ["social_empathy", "Social — empathy"],
    ["social_diversity", "Social — diversity"],
    ["social_collaboration", "Social — collaboration"],
    ["transformative_longterm", "Transformative — long-term view"],
    ["transformative_benefits", "Transformative — shared benefits"],
    ["transformative_sustainability", "Transformative — sustainability"],
];

function rec(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === "string" && value.trim() && value.trim().toLowerCase() !== "undefined") return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
        if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    }
    return "";
}

function formatWhen(...values: unknown[]): string {
    const raw = text(...values);
    if (!raw) return "";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function nice(value: unknown): string {
    return String(value || "")
        .replaceAll("_", " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Session rows stay `pending` in the DB until CII Confirm. Hours already count; do not show raw pending on the package. */
function attendanceStatusLabel(status: unknown): string {
    const key = String(status || "")
        .trim()
        .toLowerCase();
    if (key === "rejected" || key === "declined") return "Rejected";
    if (key === "approved" || key === "verified" || key === "accepted") return "Approved";
    return "Logged";
}

function isEmpty(value: DetailedReportValue): boolean {
    if (value == null) return true;
    if (typeof value === "string") return !value.trim() || value === NOT_SUPPLIED;
    if (typeof value === "number") return !Number.isFinite(value);
    if (typeof value === "boolean") return false;
    if (Array.isArray(value)) return value.length === 0 || value.every((item) => isEmpty(item));
    return Object.keys(value).length === 0;
}

function originOf(value: DetailedReportValue, fallback = SOURCE): string {
    return isEmpty(value) ? NOT_SUPPLIED : fallback;
}

function row(question: string, answer: DetailedReportValue, origin?: string, sourcePath?: string): DetailedReportRow {
    const resolved = isEmpty(answer) ? NOT_SUPPLIED : answer;
    return {
        question,
        answer: resolved,
        origin: origin || originOf(resolved),
        source_path: sourcePath || "",
    };
}

function personName(person: { name?: string; fullName?: string } | undefined): string {
    return text(person?.fullName, person?.name);
}

function identityAnswer(
    hidePrivate: boolean,
    kind: "cnic" | "mobile" | "email",
    raw: unknown,
): { answer: DetailedReportValue; origin: string } {
    if (hidePrivate) {
        const answer = kind === "email" ? PRIVATE_EMAIL : kind === "mobile" ? PRIVATE_CONTACT : PRIVATE_EXCLUDED;
        return { answer, origin: "Private field · not included" };
    }
    if (kind === "cnic") {
        const shown = formatPakistaniCnicDisplay(raw);
        return { answer: shown || NOT_SUPPLIED, origin: originOf(shown) };
    }
    if (kind === "mobile") {
        const shown = formatInternationalPhoneDisplay(typeof raw === "string" ? raw : String(raw || ""));
        return { answer: shown || NOT_SUPPLIED, origin: originOf(shown) };
    }
    const shown = text(raw);
    return { answer: shown || NOT_SUPPLIED, origin: originOf(shown) };
}

function declarationItems(data: ReportData): string[] {
    const fee = reportRequiresReportingFee(data);
    return [
        "I confirm every section of this report is accurate to the best of my knowledge.",
        "I understand that after final submission, no further edits are possible.",
        "I understand my whole report — not each session — is verified once, by CIEL PK, from the flash card.",
        "I consent to this report and its evidence being shared with CIEL PK, and my faculty and institution after approval.",
        fee
            ? "I understand a reporting fee applies before CIEL PK can review my score and certificate."
            : "I understand CIEL PK Admin reviews this report next. Hours and score are confirmed when the Admin approves it.",
    ];
}

/** Session owner ids: "lead:<id>" / "member:<n>:<id>" or the bare participant id. */
function participantKey(id: string): string {
    if (id.startsWith("lead:")) return id.slice("lead:".length);
    const member = /^member:[^:]+:(.+)$/.exec(id);
    return member?.[1] || id;
}

function sameParticipant(a?: unknown, b?: unknown): boolean {
    const x = typeof a === "string" ? a : "";
    const y = typeof b === "string" ? b : "";
    if (!x || !y) return false;
    return x === y || participantKey(x) === participantKey(y);
}

function hasSessionEvidence(log: Record<string, unknown>): boolean {
    const urls = log.evidence_urls;
    return Boolean(text(log.evidence_url) || log.evidence_file || (Array.isArray(urls) && urls.length));
}

function roundHours(n: number): number {
    return Math.round(n * 10) / 10;
}

export function buildImpactPackageDetailedReport(
    data: ReportData,
    projectData?: unknown,
    extraFiles?: Array<{ url?: string; name?: string; source?: string }>,
    audience: ImpactPackageAudience = "student",
): ImpactPackageDetailedReportModel {
    const model = buildImpactPackageModel(data, projectData, extraFiles);
    const hidePrivate = audience === "partner" || audience === "public";
    const lead = data.section1?.team_lead;
    const members = Array.isArray(data.section1?.team_members) ? data.section1.team_members : [];
    const logs = Array.isArray(data.section1?.attendance_logs) ? data.section1.attendance_logs : [];
    const required = data.required_hours || 16;
    const liveHours = (model.tiles[0]?.chips || []).map((chip) => chip.text).filter((line) => /\d/.test(line));
    const leadRec = rec(lead);
    /** Shareable (partner / public) copies keep student IDs private, like CNIC, mobile and email. */
    const privateId = (value: string) => (hidePrivate && value ? PRIVATE_EXCLUDED : value);
    const isTeam = data.section1?.participation_type === "team";
    const roster = [
        { id: text(leadRec.id) || "lead", rec: leadRec, name: personName(lead) || "Team lead", lead: true },
        ...(isTeam ? members : []).map((member, index) => {
            const m = rec(member);
            return { id: text(m.id, m.participantId) || `member-${index}`, rec: m, name: personName(member) || `Member ${index + 1}`, lead: false };
        }),
    ];
    const onRoster = (owner: unknown) => roster.some((person) => sameParticipant(owner, person.id));
    /** Whose session: its participant id, else the lead (individual reports and unassigned / orphan logs). */
    const ownerOf = (log: Record<string, unknown>) => {
        const owner = log.participantId;
        if (typeof owner === "string" && owner && onRoster(owner)) {
            return roster.find((person) => sameParticipant(owner, person.id)) || roster[0];
        }
        return roster[0];
    };
    const countedLogs = logs.filter((log) => isLogCountedBeforeFacultyReview(log));
    const hoursByStudent = roster.map((person) => {
        const own = countedLogs.filter((log) => ownerOf(rec(log)) === person);
        const logged = roundHours(own.reduce((sum, log) => sum + effectiveHoursFromLog(log), 0));
        return {
            student: person.name,
            role: person.lead ? "Team lead" : "Team member",
            entries: own.length,
            logged_hours: logged,
            required_hours: required,
            remaining_hours: roundHours(Math.max(0, required - logged)),
            status: logged >= required ? "Minimum met" : "Below minimum",
        };
    });
    const sessionKey = (log: Record<string, unknown>) =>
        [
            text(log.date, log.dateOfEngagement, log.date_of_engagement),
            text(log.start_time, log.startTime),
            text(log.end_time, log.endTime),
            text(log.location, log.organizationName, log.organization_name),
        ]
            .filter(Boolean)
            .join(" · ") || "Session";
    const matrixSessions = [...new Set(countedLogs.map((log) => sessionKey(rec(log))))].sort();
    const attendanceMatrix = roster.length > 1
        ? matrixSessions.map((key) => {
              const line: Record<string, DetailedReportValue> = { session: key };
              for (const person of roster) {
                  const hours = countedLogs
                      .filter((log) => sessionKey(rec(log)) === key && ownerOf(rec(log)) === person)
                      .reduce((sum, log) => sum + effectiveHoursFromLog(log), 0);
                  line[person.name] = hours ? `${roundHours(hours)}h` : "—";
              }
              return line;
          })
        : [];

    const s1: DetailedReportSection = {
        id: "1",
        title: "Identity, team & participation",
        source: "",
        subsections: [
            {
                id: "1.1",
                title: "Personal and academic identity",
                rows: [
                    row("Full name", personName(lead)),
                    (() => {
                        const idn = identityAnswer(hidePrivate, "cnic", lead?.cnic);
                        return row("CNIC / identity number", idn.answer, idn.origin);
                    })(),
                    (() => {
                        const idn = identityAnswer(hidePrivate, "mobile", lead?.mobile);
                        return row("Mobile contact", idn.answer, idn.origin);
                    })(),
                    (() => {
                        const idn = identityAnswer(hidePrivate, "email", lead?.email);
                        return row("Institutional email / OTP verification", idn.answer, idn.origin);
                    })(),
                    row("University", text(lead?.university, leadRec.universityName)),
                    row("Student / registration ID", privateId(text(leadRec.student_id, leadRec.universityId))),
                    row("Programme", text(lead?.degree, leadRec.academicProgram, leadRec.program)),
                    row("Department / discipline", text(data.section2?.discipline_other, data.section2?.discipline, leadRec.department, lead?.degree, leadRec.academicProgram)),
                    row("Semester", text(leadRec.semester, lead?.year, leadRec.yearOfStudy)),
                    row("Academic integration", text(data.section9?.academic_integration)),
                    row(
                        "Identity confirmation status",
                        lead?.verified === true ? "Verified" : lead?.verified === false ? "Unverified" : NOT_SUPPLIED,
                    ),
                ],
            },
            {
                id: "1.2",
                title: "Team configuration",
                rows: [
                    row(
                        "Participation type",
                        text(data.section1?.participation_type) === "team" ? "Team" : "Individual",
                    ),
                    row(
                        "Registered members",
                        [
                            {
                                name: personName(lead) || "Team lead",
                                role: text(lead?.role) || "Team lead",
                                hours: text(lead?.hours),
                            },
                            ...members.map((member) => {
                                const m = rec(member);
                                return {
                                    name: personName(member) || "Member",
                                    role: text(member.role) || "Team member",
                                    hours: text(member.hours),
                                    university: text(m.universityName, m.university),
                                    student_id: privateId(text(m.universityId, m.student_id)),
                                    programme: text(m.academicProgram, m.program, m.degree),
                                    semester: text(m.semester, m.yearOfStudy, m.year),
                                };
                            }),
                        ],
                    ),
                    row(
                        "Lead submission right",
                        data.section1?.participation_type === "team"
                            ? "Only the Team Lead submits the final report. Other members view the final report."
                            : "The registered student submits the report.",
                    ),
                ],
            },
            {
                id: "1.3",
                title: "Session details",
                rows: [
                    row(
                        "Date, time, location, activity and accomplishment",
                        logs.map((log) => {
                            const item = rec(log);
                            return {
                                date: text(item.date, item.dateOfEngagement, item.date_of_engagement),
                                start: text(item.start_time, item.startTime),
                                end: text(item.end_time, item.endTime),
                                hours: text(item.hours, item.sessionHours, item.session_hours),
                                location: text(item.location, item.organizationName, item.organization_name),
                                activity: text(item.activity_type, item.activityType),
                                description: text(item.description),
                                status: attendanceStatusLabel(item.approval_status ?? item.approvalStatus),
                                student: ownerOf(item).name,
                                evidence: hasSessionEvidence(item) ? "Attached" : "None",
                            };
                        }),
                    ),
                ],
            },
            {
                id: "1.4",
                title: "Hours clock",
                rows: [
                    row("Minimum per member", `${required} hours`),
                    row("Team-hours logged", liveHours.join(" · ") || NOT_SUPPLIED),
                    ...liveHours.map((line) => row("Participant hours", line)),
                ],
            },
            {
                id: "1.5",
                title: "Complete activities log",
                rows: [
                    row("Total sessions", logs.length ? `${logs.length} source sessions` : NOT_SUPPLIED),
                    row(
                        "Session types",
                        [...new Set(logs.map((log) => text(log.activity_type)).filter(Boolean))],
                    ),
                    row("What was done", text(data.section1?.verified_summary, data.section4?.summary_text)),
                    row(
                        "Session evidence count",
                        `${model.files.filter((file) => file.section === "section1").length} attached from sessions`,
                    ),
                ],
            },
            {
                id: "1.6",
                title: "Participation declaration",
                rows: [
                    row(
                        "Privacy consent",
                        data.section1?.privacy_consent === true ? true : data.section1?.privacy_consent === false ? false : NOT_SUPPLIED,
                    ),
                    row(
                        "Participation declaration items confirmed",
                        Array.isArray(data.section1?.review_checked) && data.section1.review_checked.length
                            ? `${data.section1.review_checked.filter(Boolean).length} of ${data.section1.review_checked.length}`
                            : NOT_SUPPLIED,
                    ),
                ],
            },
            {
                id: "1.7",
                title: "Hours by student",
                rows: [
                    row("Every student's hours against the minimum", hoursByStudent),
                    ...(attendanceMatrix.length ? [row("Attendance matrix · one column per student", attendanceMatrix)] : []),
                ],
            },
        ],
    };

    const s2: DetailedReportSection = {
        id: "2",
        title: "Project context & baseline",
        source: "",
        subsections: [
            {
                id: "2.1",
                title: "Quick questions",
                rows: [
                    row("What problem did you see?", text(data.section2?.problem_statement, data.section2?.summary_text)),
                    row("Who was affected?", text(data.section2?.affected_group, data.section2?.primary_beneficiary)),
                    row("Approximately how many?", text(data.section2?.affected_count)),
                    row("What was missing?", data.section2?.system_gaps || []),
                    row("How did you know?", data.section2?.baseline_evidence || []),
                    row("Field of study", text(data.section2?.discipline_other, data.section2?.discipline)),
                    row("How did your discipline help?", text(data.section2?.discipline_contribution)),
                    row("Other gap / other source / other discipline", text(
                        data.section2?.system_gaps_other,
                        Array.isArray(data.section2?.system_gaps_other_entries)
                            ? data.section2.system_gaps_other_entries.join("; ")
                            : "",
                        data.section2?.baseline_evidence_other,
                    )),
                    row("What else informed you?", (data.section2?.baseline_other_entries || []).filter((item) => text(item))),
                ],
            },
            {
                id: "2.2",
                title: "Baseline statement",
                rows: [
                    row("Composed baseline", text(data.section2?.summary_text, data.section2?.baseline_smart_draft)),
                    row("Problem category", text(data.section2?.problem_category)),
                ],
            },
            {
                id: "2.3",
                title: "Risk, safeguarding & consent",
                rows: [
                    row("Who could be harmed, and how?", data.section2?.risk_factors || []),
                    row("What did you do about it?", text(data.section2?.risk_mitigation)),
                    row("Consent for photos and data", text(data.section2?.risk_consent)),
                    row("Responsible for safeguarding on site", text(data.section2?.risk_safeguarding_lead)),
                    row("Anything unresolved?", text(data.section2?.risk_unresolved)),
                ],
            },
        ],
    };

    const sdgs = mergeReportSdgSnapshotRows({ ...rec(projectData), ...data }, data.section3);
    const s3: DetailedReportSection = {
        id: "3",
        title: "SDGs & contribution pathways",
        source: "",
        subsections: [
            {
                id: "3.1",
                title: "Primary contribution",
                rows: [
                    row(
                        "Primary SDG",
                        (() => {
                            const n = Number(data.section3?.primary_sdg?.goal_number);
                            const found = Number.isFinite(n) ? findSdgById(n) : undefined;
                            return found ? `SDG ${found.number} — ${found.title}` : text(data.section3?.primary_sdg?.goal_title);
                        })(),
                    ),
                    row("Target", text(data.section3?.primary_sdg?.target_id)),
                    row("Indicator", text(data.section3?.primary_sdg?.indicator_id)),
                    row("Local metric / sub-indicator", text(data.section3?.primary_sdg?.sub_indicator)),
                    row(
                        "Contribution intent",
                        text(data.section3?.student_contribution_intent_statement, data.section3?.contribution_intent_statement),
                    ),
                ],
            },
            {
                id: "3.2",
                title: "Additional SDGs",
                rows: [
                    row(
                        "Mapped goals",
                        sdgs.map((rowSdg) => `SDG ${rowSdg.goalNumber}${rowSdg.title ? ` — ${rowSdg.title}` : ""}`),
                    ),
                    row(
                        "Secondary justifications",
                        (Array.isArray(data.section3?.secondary_sdgs) ? data.section3.secondary_sdgs : []).map((item) => ({
                            goal: text(item.goal_number),
                            target: text(item.target_id),
                            indicator: text(item.indicator_id),
                            note: text(item.justification_text),
                            status: text(item.status),
                        })),
                    ),
                    row("Validation status", text(data.section3?.validation_status)),
                ],
            },
        ],
    };

    const acts = Array.isArray(data.section4?.activity_blocks) ? data.section4.activity_blocks : [];
    const outcomes = Array.isArray(data.section5?.measurable_outcomes) ? data.section5.measurable_outcomes : [];
    const s4: DetailedReportSection = {
        id: "4",
        title: "Activities, outputs & measured change",
        source: "",
        subsections: [
            {
                id: "4.1",
                title: "Activities delivered",
                rows: [
                    row(
                        "Activity blocks",
                        acts.map((block) => ({
                            title: text(block.title),
                            status: text(block.status),
                            category: text(block.primary_category, block.other_category_text),
                            subcategory: text(block.sub_category, block.other_sub_category_text),
                            who_did_what: text(block.description),
                            delivery: text(block.delivery_mode),
                            sessions: text(block.sessions_count),
                            geography: [text(block.geographic_reach), text(block.geographic_sub_category), text(block.site_note)]
                                .filter(Boolean)
                                .join(" · "),
                            overlap: text(block.overlap_status, block.overlap_note),
                            reach: text(block.unique_beneficiaries, block.beneficiaries_reached),
                            count_method: text(block.reach_counting_method_other, block.reach_counting_method),
                            partner_host: text(block.partner_host),
                            served_people_directly:
                                block.serves_beneficiaries === true ? "Yes" : block.serves_beneficiaries === false ? "No" : "",
                            who_benefited: [
                                ...(Array.isArray(block.beneficiary_categories) ? block.beneficiary_categories : []),
                                text(block.other_beneficiary_text),
                            ].filter((item) => text(item)),
                        })),
                    ),
                ],
            },
            {
                id: "4.2",
                title: "Outputs",
                rows: [
                    row(
                        "Output entries",
                        acts.flatMap((block) =>
                            (Array.isArray(block.outputs) ? block.outputs : []).map((output) => ({
                                activity: text(block.title),
                                title: text(output.title),
                                type: text(output.type_other, output.type),
                                quantity: text(output.quantity),
                                unit: text(output.unit_other, output.unit),
                                verification: text(output.verification_note),
                            })),
                        ),
                    ),
                ],
            },
            {
                id: "4.3",
                title: "Reach",
                rows: [
                    row("Distinct people reached", distinctBeneficiaryTotal(data.section4) || text(data.section4?.project_summary?.distinct_total_beneficiaries)),
                    row("Counting method", text(data.section4?.project_summary?.counting_method)),
                    row("Overall overlap", text(data.section4?.project_summary?.overall_overlap)),
                    row("Overall geography", text(data.section4?.project_summary?.overall_geographic_reach)),
                ],
            },
            {
                id: "4.4",
                title: "Measured change",
                rows: [
                    row("Before", text(data.section5?.story_before)),
                    row("Now", text(data.section5?.story_now, data.section5?.observed_change)),
                    row("Known because", text(data.section5?.story_because)),
                    row(
                        "Outcome metrics",
                        outcomes.map((outcome) => ({
                            area: text(outcome.outcome_area_other, outcome.outcome_area),
                            metric: text(outcome.metric_other, outcome.metric),
                            baseline: text(outcome.baseline),
                            endline: text(outcome.endline),
                            unit: text(outcome.unit_other, outcome.unit),
                            proof: text(outcome.measurement_explanation),
                            change: (() => {
                                const b = Number(String(outcome.baseline ?? "").replace(/,/g, ""));
                                const e = Number(String(outcome.endline ?? "").replace(/,/g, ""));
                                if (!text(outcome.baseline) || !text(outcome.endline) || !Number.isFinite(b) || !Number.isFinite(e)) return "";
                                const delta = roundHours(e - b);
                                return `${delta > 0 ? "+" : ""}${delta}`;
                            })(),
                            sub_category: text(outcome.outcome_sub_category),
                            metric_scale: text(outcome.metric_category),
                            confidence: Array.isArray(outcome.confidence_level) ? outcome.confidence_level : [],
                        })),
                    ),
                ],
            },
            {
                id: "4.5",
                title: "Challenges & limits",
                rows: [
                    row("Challenges", text(data.section5?.challenges)),
                    row("Challenge tags", data.section5?.challenge_tags || []),
                ],
            },
        ],
    };

    const resources = Array.isArray(data.section6?.resources) ? data.section6.resources : [];
    const s5: DetailedReportSection = {
        id: "5",
        title: "Resources & funding",
        source: "",
        subsections: [
            {
                id: "5.1",
                title: "Resource use",
                rows: [
                    row("Did the project use resources?", text(data.section6?.use_resources)),
                    row(
                        "Items",
                        resources.map((item) => ({
                            type: text(item.type_other, item.type),
                            amount: text(item.amount),
                            unit: text(item.unit_other, item.unit),
                            sources: [...(item.sources || []), text(item.source_other)].filter((value) => text(value)),
                            purpose: text(item.purpose),
                            verification: [...(item.verification || []), text(rec(item).verification_other)].filter((value) => text(value)),
                        })),
                    ),
                ],
            },
            {
                id: "5.2",
                title: "Cash total",
                rows: [
                    row(
                        "Total cash PKR",
                        resources.reduce((sum, item) => {
                            if (String(item.unit || "").toUpperCase() !== "PKR") return sum;
                            const n = Number(String(item.amount || "").replace(/,/g, ""));
                            return sum + (Number.isFinite(n) ? n : 0);
                        }, 0),
                    ),
                    row(
                        "Totals by resource type and unit (cash and in-kind kept separate)",
                        (() => {
                            const sums = new Map<string, { type: string; unit: string; total: number }>();
                            for (const item of resources) {
                                const n = Number(String(item.amount || "").replace(/,/g, ""));
                                const unit = text(item.unit_other, item.unit);
                                const type = text(item.type_other, item.type);
                                if (!Number.isFinite(n) || !unit || !type) continue;
                                const key = `${type}|${unit}`;
                                const prev = sums.get(key) || { type, unit, total: 0 };
                                sums.set(key, { ...prev, total: prev.total + n });
                            }
                            return [...sums.values()].map((entry) => ({
                                type: entry.type,
                                unit: entry.unit,
                                total: Math.round(entry.total * 100) / 100,
                            }));
                        })(),
                    ),
                ],
            },
        ],
    };

    const partners = Array.isArray(data.section7?.partners) ? data.section7.partners : [];
    const s6: DetailedReportSection = {
        id: "6",
        title: "Partners & collaboration",
        source: "",
        subsections: [
            {
                id: "6.1",
                title: "Partner organisations",
                rows: [
                    row("Were partners involved?", text(data.section7?.has_partners)),
                    row(
                        "Partners",
                        partners.map((partner) => ({
                            name: text(partner.name),
                            type: text(partner.type_other, partner.type),
                            roles: [...(partner.role || []), text(rec(partner).role_other)].filter((value) => text(value)),
                            designation: text(partner.designation),
                            website: text(partner.website),
                            contribution: text(partner.contribution_line, Array.isArray(partner.contribution) ? partner.contribution.join("; ") : ""),
                            contact: hidePrivate
                                ? "Private contact excluded from this shareable package."
                                : [
                                      text(partner.pakistan_contact_name),
                                      formatSection7PakistanDialForDisplay(partner.pakistan_contact_number),
                                      text(partner.pakistan_contact_email),
                                  ]
                                      .filter(Boolean)
                                      .join(" · "),
                            verification: text(partner.verification),
                        })),
                    ),
                ],
            },
            {
                id: "6.2",
                title: "Formalisation",
                rows: [
                    row("Formalisation status", data.section7?.formalization_status || []),
                ],
            },
        ],
    };

    const vis = resolveMediaVisibility(data.section8?.media_visible);
    const visLabel = MEDIA_VISIBILITY_LABELS[vis];
    const consent = vis === "public" ? hasPublicSharePermission(data.section8) : false;
    const s7: DetailedReportSection = {
        id: "7",
        title: "Evidence & consent",
        source: "",
        subsections: [
            {
                id: "7.1",
                title: "Evidence package",
                rows: [
                    row("Was evidence attached?", text(data.section8?.has_evidence)),
                    row("Evidence types", data.section8?.evidence_types || []),
                    row("Other evidence type", text(data.section8?.evidence_type_other)),
                    row("What the files show", text(data.section8?.description)),
                    row("Current evidence sharing", `${visLabel} · applies to all evidence`),
                    row(
                        "Public sharing permission",
                        vis === "public"
                            ? consent
                                ? "Confirmed for the whole package"
                                : "Pending · package remains Restricted"
                            : `Not required for ${visLabel}`,
                    ),
                    row(
                        "Complete inventory",
                        model.files.map((file) => evidenceInventoryRow(file, audience, visLabel)),
                    ),
                ],
            },
            {
                id: "7.2",
                title: "Consent & ethics",
                rows: [
                    row("Authentic", data.section8?.ethical_compliance?.authentic === true),
                    row("Informed consent", data.section8?.ethical_compliance?.informed_consent === true),
                    row("No harm", data.section8?.ethical_compliance?.no_harm === true),
                    row("Privacy respected", data.section8?.ethical_compliance?.privacy_respected === true),
                    row("Partner verification", data.section8?.partner_verification === true),
                    row("Partner verification type", text(data.section8?.partner_verification_type)),
                ],
            },
        ],
    };

    const scores = rec(data.section9?.competency_scores);
    const s8: DetailedReportSection = {
        id: "8",
        title: "Reflection & learning",
        source: "",
        subsections: [
            {
                id: "8.1",
                title: "Skills grown",
                rows: [
                    row("Skills", data.section9?.skills_grown || []),
                    row("Other skill", text(data.section9?.skills_grown_other)),
                    row("Biggest learning", text(data.section9?.reflection_biggest_learning, data.section9?.personal_learning)),
                ],
            },
            {
                id: "8.2",
                title: "Academic application",
                rows: [
                    row("How the discipline helped", text(data.section9?.reflection_discipline_help, data.section9?.academic_application)),
                    row("A moment that mattered", text(data.section9?.reflection_moment)),
                    row("Academic integration", text(data.section9?.academic_integration)),
                ],
            },
            {
                id: "8.3",
                title: "12 competency ratings",
                rows: COMPETENCY.map(([key, label]) => row(label, scores[key] as number)),
            },
        ],
    };

    const s9: DetailedReportSection = {
        id: "9",
        title: "Sustainability & continuation",
        source: "",
        subsections: [
            {
                id: "9.1",
                title: "Continuation",
                rows: [
                    row("Will the work continue?", text(data.section10?.continuation_status)),
                    row("Explanation", text(data.section10?.continuation_details)),
                    row("What keeps it going", text(data.section10?.continuation_keep_going)),
                    row("Main risk", text(data.section10?.continuation_risk)),
                ],
            },
            {
                id: "9.2",
                title: "Mechanisms",
                rows: [
                    row("Mechanisms", data.section10?.mechanisms || []),
                    row("Other mechanism", text(data.section10?.mechanism_other)),
                ],
            },
            {
                id: "9.3",
                title: "Scalability",
                rows: [row("Scaling potential", text(data.section10?.scaling_potential))],
            },
            {
                id: "9.4",
                title: "System influence",
                rows: [row("Policy / system influence", text(data.section10?.policy_influence))],
            },
            {
                id: "9.5",
                title: "Follow-up check",
                rows: (() => {
                    const s10 = data.section10;
                    const plan = text(s10?.followup_plan);
                    const planLabel = plan === "yes" ? "Planned" : plan === "no" ? "Not planned" : plan === "later" ? "Decide later" : "";
                    return [
                        row("Is a follow-up check planned or needed?", planLabel || NOT_SUPPLIED),
                        row("Why is no follow-up planned?", text(s10?.followup_no_reason_other, s10?.followup_no_reason)),
                        row("Who should decide whether follow-up is needed?", text(s10?.followup_decision_owner)),
                        row("Who will check the results?", text(s10?.followup_owner_role)),
                        row("Responsible person", text(s10?.followup_owner_name)),
                        row(
                            "Email for follow-up invitation",
                            hidePrivate ? (text(s10?.followup_owner_email) ? PRIVATE_EMAIL : NOT_SUPPLIED) : text(s10?.followup_owner_email),
                        ),
                        row("When should results be checked?", text(s10?.followup_interval)),
                        row("Chosen follow-up date", text(s10?.followup_custom_date)),
                        row("Follow-up due date", text(s10?.followup_due_date)),
                        row("What should be checked?", text(s10?.followup_check)),
                        row("Specific instruction", text(s10?.followup_check_notes)),
                    ];
                })(),
            },
        ],
    };

    const flags = Array.isArray(data.section11?.final_declaration) ? data.section11.final_declaration : [];
    const items = declarationItems(data);
    const root = rec(data);
    const s11 = rec(data.section11);
    const signedWhen = formatWhen(
        s11.signed_at,
        s11.signedAt,
        root.reportSubmittedAt,
        root.report_submitted_at,
        root.submission_date,
        root.submitted_at,
    );
    const s10: DetailedReportSection = {
        id: "10",
        title: "Final check, sign-off & publication",
        source: "",
        subsections: [
            {
                id: "10.1",
                title: "Final declarations & electronic sign-off",
                rows: [
                    ...items.map((item, index) =>
                        row(`Declaration ${index + 1}`, flags[index] === true ? item : flags[index] === false ? "Not signed" : item),
                    ),
                    row("Signed declarations", flags.length === 5 && flags.every(Boolean)),
                    row("Electronic signature", text(s11.signature_name, s11.signatureName)),
                    row("Signed date-time", signedWhen),
                ],
            },
            {
                id: "10.2",
                title: "Consistency & readiness review",
                rows: [
                    row("Source content completion", `${model.sectionsComplete} / ${model.sectionsTotal} content sections`),
                    row("Admin approved", model.adminApproved),
                    row("CII / badge", model.ciiPending ? "Pending Super Admin approval — never fabricated." : model.ciiLabel),
                ],
            },
            {
                id: "10.3",
                title: "Submission, review & distribution",
                rows: [
                    row("Package", ["Impact flashcard", "Detailed report", "Evidence gallery"]),
                    row("Submission status", text(data.status)),
                    row("Faculty status", text(data.faculty_status)),
                    row("Admin status", text(data.admin_status, data.admin_approval_status)),
                    row("Partner status", text(data.partner_status)),
                    row("Final reviewer", "CIEL PK Super Admin"),
                ],
            },
        ],
    };

    const sections = [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10].map((section) => ({
        ...section,
        subsections: section.subsections.map((sub) => ({
            ...sub,
            rows: sub.rows.map((item, index) => ({
                ...item,
                source_path:
                    item.source_path ||
                    `student_source.section_${section.id}.${sub.id}.row_${index + 1}`,
            })),
        })),
    }));
    const subsectionCount = sections.reduce((sum, section) => sum + section.subsections.length, 0);
    const fieldCount = sections.reduce(
        (sum, section) => sum + section.subsections.reduce((inner, sub) => inner + sub.rows.length, 0),
        0,
    );

    const checks: DetailedReportCheck[] = [];
    (model.tiles[0]?.chips || []).forEach((chip) => {
        if (/remaining/i.test(chip.text)) {
            checks.push({
                level: "hold",
                title: "Hours below minimum",
                detail: chip.text,
            });
        }
    });
    if (!model.files.length) {
        checks.push({
            level: "hold",
            title: "Evidence files",
            detail: "No evidence files are attached to this package yet.",
        });
    }
    if (data.faculty_remarks) {
        checks.push({ level: "note", title: "Faculty remarks", detail: String(data.faculty_remarks) });
    }
    if (data.admin_feedback || data.feedback) {
        checks.push({
            level: "note",
            title: "Reviewer feedback",
            detail: String(data.admin_feedback || data.feedback),
        });
    }

    const banner = model.adminApproved
        ? null
        : {
              kind: "warning" as const,
              htmlTitle: "Awaiting CIEL PK Super Admin approval.",
              text: "This is the locked student-source record, not a verified publication. Certificate and public card stay closed until approval.",
          };

    return {
        title: model.title,
        projectId: model.projectId || data.project_id,
        adminApproved: model.adminApproved,
        submitted: model.submitted,
        sections,
        fieldCount,
        subsectionCount,
        checks,
        coverage:
            "Full answer coverage includes personal-profile field status, every session detail, activity outputs, before–after metrics, resource entries, partner roles, evidence permissions, 12 competency ratings, sustainability and final sign-off.",
        banner,
    };
}

function evidenceInventoryRow(
    file: ImpactPackageEvidenceFile,
    audience: ImpactPackageAudience,
    visLabel: string,
): DetailedReportValue {
    const locked = audience === "partner" && visLabel.toLowerCase() !== "public";
    if (locked) {
        return {
            name: `${visLabel} evidence`,
            access: "Locked for this viewer",
        };
    }
    return {
        name: file.name,
        kind: file.kind,
        section: file.section,
        claim: file.claim,
        visibility: visLabel,
    };
}

export function detailedReportMatchesQuery(
    row: DetailedReportRow,
    subsection: DetailedReportSubsection,
    query: string,
): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const blob = `${subsection.id} ${subsection.title} ${row.question} ${row.origin} ${row.source_path} ${flattenValue(row.answer)}`.toLowerCase();
    return blob.includes(q);
}

function flattenValue(value: DetailedReportValue): string {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map(flattenValue).join(" ");
    return Object.entries(value)
        .map(([key, item]) => `${nice(key)} ${flattenValue(item)}`)
        .join(" ");
}

export function niceDetailedReportKey(value: unknown): string {
    return nice(value);
}
