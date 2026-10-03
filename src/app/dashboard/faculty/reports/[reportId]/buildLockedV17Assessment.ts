import { hasPublicSharePermission, isPublicMediaVisibility, mediaVisibilityTitle, normalizeMediaVisibility } from "@/app/dashboard/student/report/utils/mediaVisibility";
import type { ReportData } from "@/app/dashboard/student/report/context/ReportContext";
import type { LockedV17Assess, LockedV17DetailBlock, LockedV17FieldRow, LockedV17FlowNode } from "./buildLockedV17Package";

export const V19_ASSESSMENT_RULE =
    "When the report becomes CII-ready, the System awards marks only to evidence-supported performance. Faculty may moderate the section/sub-criterion score with a recorded reason.";

type AggLike = {
    hours: number;
    members: number;
    logs: unknown[];
    acts: Array<{ title?: string; primary_category?: string; description?: string }>;
    outputs: number;
    measured: unknown[];
    evidence: number;
    sdgs: Array<{ goalNumber?: number | string; role?: string }>;
    ethicsOk: boolean;
    competency: number | string | null;
    reach: string | number;
    context: { partnerOrganization?: string; projectLocation?: string };
};

type Chip = { label: string; weight: number };

const V19_RUBRIC: Record<string, { name: string; max: number; chips: Chip[] }> = {
    "01": {
        name: "Participation & Verified Effort",
        max: 10,
        chips: [
            { label: "Minimum-hour compliance", weight: 3 },
            { label: "Meaningful effort beyond minimum", weight: 2 },
            { label: "Session quality & consistency", weight: 2 },
            { label: "Student ownership & leadership", weight: 2 },
            { label: "Participation integrity", weight: 1 },
        ],
    },
    "02": {
        name: "Community Need & Starting Point",
        max: 10,
        chips: [
            { label: "Problem specificity & materiality", weight: 2 },
            { label: "Beneficiary definition", weight: 2 },
            { label: "Baseline evidence", weight: 3 },
            { label: "Gap diagnosis", weight: 2 },
            { label: "Academic/disciplinary lens", weight: 1 },
        ],
    },
    "03": {
        name: "SDG Contribution",
        max: 10,
        chips: [
            { label: "Correct SDG relevance", weight: 2 },
            { label: "Appropriate SDG target", weight: 2 },
            { label: "Indicator/local metric quality", weight: 2 },
            { label: "Contribution pathway", weight: 3 },
            { label: "Evidence & non-overclaiming", weight: 1 },
        ],
    },
    "04": {
        name: "Activities & Outputs",
        max: 13,
        chips: [
            { label: "Intervention relevance/design", weight: 3 },
            { label: "Execution quality", weight: 3 },
            { label: "Outputs", weight: 4 },
            { label: "Beneficiary reach integrity", weight: 3 },
        ],
    },
    "05": {
        name: "Outcomes & Measured Change",
        max: 7,
        chips: [
            { label: "Demonstrated outcomes/change", weight: 5 },
            { label: "Attribution & limitations", weight: 2 },
        ],
    },
    "06": {
        name: "Resources & Stewardship",
        max: 15,
        chips: [
            { label: "Traceability & verification", weight: 3 },
            { label: "Mobilisation depth & additionality", weight: 4 },
            { label: "Relevance", weight: 3 },
            { label: "Stewardship/leverage", weight: 3 },
            { label: "Durable resource legacy", weight: 2 },
        ],
    },
    "07": {
        name: "Partnership & Collaboration",
        max: 10,
        chips: [
            { label: "Functional partner contribution", weight: 3 },
            { label: "Community/partner voice", weight: 3 },
            { label: "Reciprocity/mutual benefit", weight: 2 },
            { label: "Verification role", weight: 1 },
            { label: "Relationship continuity", weight: 1 },
        ],
    },
    "08": {
        name: "Evidence, Ethics & Verification",
        max: 10,
        chips: [
            { label: "Evidence coverage", weight: 3 },
            { label: "Evidence quality", weight: 3 },
            { label: "Triangulation", weight: 2 },
            { label: "Ethics/consent/privacy", weight: 1 },
            { label: "Internal consistency/auditability", weight: 1 },
        ],
    },
    "09": {
        name: "Reflection & Academic Growth",
        max: 5,
        chips: [
            { label: "Specific reflective learning", weight: 2 },
            { label: "Academic application", weight: 1.5 },
            { label: "Demonstrated skill development", weight: 1 },
            { label: "Honest self-assessment", weight: 0.5 },
        ],
    },
    "10": {
        name: "Sustainability & Handover",
        max: 10,
        chips: [
            { label: "Continuation credibility", weight: 2 },
            { label: "Named ownership", weight: 2 },
            { label: "Handover/capacity transfer", weight: 2 },
            { label: "Future support requirements", weight: 1 },
            { label: "Replicability/scaling", weight: 1 },
            { label: "Institutional/community influence", weight: 1 },
            { label: "Sustainability honesty & evidence", weight: 1 },
        ],
    },
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function txt(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return "";
}

function finiteNum(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return null;
}

function joinList(items: string[]): string {
    const clean = items.filter(Boolean);
    if (clean.length <= 1) return clean[0] || "";
    if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
    return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

function clip(value: string, words = 12): string {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= words) return value.trim();
    return `${parts.slice(0, words).join(" ")}…`;
}

function field(label: string, value: string, required = true): LockedV17FieldRow {
    const filled = Boolean(value.trim());
    return {
        field: label,
        value: filled ? value.trim() : "Not provided",
        status: filled ? "Recorded" : required ? "Required data" : "Optional / not provided",
        required,
    };
}

function coverage(fields: LockedV17FieldRow[]): { pct: number; filled: number; total: number } {
    const req = fields.filter((row) => row.required);
    const filled = req.filter((row) => row.status === "Recorded").length;
    const total = req.length || 1;
    return { pct: Math.round((filled / total) * 100), filled, total };
}

function holdState(fields: LockedV17FieldRow[], extraHold = false): LockedV17DetailBlock["hold"] {
    const miss = fields.filter((row) => row.required && row.status !== "Recorded");
    if (miss.length || extraHold) {
        return { code: "HOLD", cls: "hold", label: "HOLD · REQUIRED DATA MISSING" };
    }
    return { code: "READY", cls: "ready", label: "READY FOR CII REVIEW" };
}

function limitationOf(fields: LockedV17FieldRow[], fallback: string): string {
    const miss = fields.filter((row) => row.required && row.status !== "Recorded").map((row) => row.field);
    if (miss.length) {
        const shown = miss.slice(0, 4).join(", ");
        return `Required information missing from ${shown}${miss.length > 4 ? "…" : ""}`;
    }
    return fallback;
}

function narrativeOf(fields: LockedV17FieldRow[], headline: string): string {
    const filled = fields.filter((row) => row.status === "Recorded").slice(0, 5);
    if (!filled.length) {
        return "This section does not yet contain enough completed information to generate a detailed evidence-aware narrative.";
    }
    return `${headline} ${filled.map((row) => `${row.field}: ${clip(row.value, 22)}`).join(". ")}.`;
}

function ethicsOk(s8: ReportData["section8"] | undefined): boolean {
    if (!s8) return false;
    const vis = normalizeMediaVisibility(s8.media_visible);
    if (!vis) return false;
    if (vis === "public") return hasPublicSharePermission(s8);
    return true;
}

function memberHours(data: ReportData, required: number): Array<{ name: string; hours: number; met: boolean }> {
    const s1 = data.section1;
    const rows: Array<{ name: string; hours: number }> = [];
    if (s1?.team_lead) {
        rows.push({
            name: txt(s1.team_lead.fullName, s1.team_lead.name) || "Lead",
            hours: finiteNum(s1.team_lead.hours) || 0,
        });
    }
    for (const member of s1?.team_members || []) {
        rows.push({
            name: txt(member.fullName, member.name) || "Member",
            hours: finiteNum(member.hours) || 0,
        });
    }
    return rows.map((row) => ({ ...row, met: row.hours >= required }));
}

function measuredOutcomes(data: ReportData) {
    return (data.section5?.measurable_outcomes || []).filter((row) => txt(row.metric, row.outcome_area) && txt(row.baseline) && txt(row.endline));
}

function listJoin(items: unknown[], mapFn?: (item: unknown) => string): string {
    return items
        .map((item) => (mapFn ? mapFn(item) : txt(item)))
        .filter(Boolean)
        .join(", ");
}

export function buildLockedV17DetailAndAssessment(
    data: ReportData,
    agg: AggLike,
    options: { locked: boolean; v2Sections: Array<Record<string, unknown>> },
): { detailBlocks: LockedV17DetailBlock[]; assessment: LockedV17Assess[] } {
    const requiredHours = data.required_hours || 16;
    const s1 = data.section1;
    const s2 = data.section2;
    const s3 = data.section3;
    const s4 = data.section4;
    const s5 = data.section5;
    const s6 = data.section6;
    const s7 = data.section7;
    const s8 = data.section8;
    const s9 = data.section9;
    const s10 = data.section10;
    const hours = memberHours(data, requiredHours);
    const sessions = Array.isArray(s1?.attendance_logs) ? s1.attendance_logs.length : agg.logs.length;
    const resources = Array.isArray(s6?.resources) ? s6.resources : [];
    const partners = Array.isArray(s7?.partners) ? s7.partners : [];
    const partnerName = txt(partners[0]?.name, agg.context.partnerOrganization);
    const sdgLine = (agg.sdgs || [])
        .map((row) => (row.goalNumber ? `SDG ${row.goalNumber}` : ""))
        .filter(Boolean)
        .join(" · ");
    const resourceMode =
        s6?.use_resources === "no" ? "Time & effort only" : s6?.use_resources === "yes" ? "Resources used" : "";
    const resourceLines = resources
        .map((row, index) => {
            const type = txt(row.type, row.type_other) || "type missing";
            const amount = txt(row.amount) || "amount missing";
            const unit = txt(row.unit_other, row.unit) || "unit missing";
            const source = Array.isArray(row.sources) && row.sources.length ? row.sources.join(", ") : "missing";
            const verification = Array.isArray(row.verification) && row.verification.length ? row.verification.join(", ") : "missing";
            const enabled = txt(row.purpose) || "not stated";
            return `${index + 1}. ${type} · ${amount} ${unit} · source: ${source} · verification: ${verification} · enabled: ${enabled}`;
        })
        .join(" | ");
    const outcomeRows = data.section5?.measurable_outcomes || [];
    const measured = measuredOutcomes(data);
    const evidenceN = agg.evidence || 0;
    const consentOk = ethicsOk(s8);

    const blocks: Array<{
        n: string;
        fields: LockedV17FieldRow[];
        flow: LockedV17FlowNode[];
        evidence: string;
        extraHold?: boolean;
        extraLimit?: string;
        bullets: string[];
    }> = [
        {
            n: "01",
            fields: [
                field(
                    "Team configuration",
                    s1?.participation_type
                        ? `${s1.participation_type === "team" ? "Team" : "Individual"} · ${agg.members} student${agg.members === 1 ? "" : "s"}`
                        : "",
                ),
                field(
                    "Hours compliance",
                    hours.length
                        ? hours.map((row) => `${row.name} ${row.hours}h / ${requiredHours}h`).join(" · ")
                        : sessions
                          ? `${Math.round(agg.hours * 10) / 10}h logged across ${sessions} session${sessions === 1 ? "" : "s"}`
                          : "",
                ),
                field("Session log", sessions ? `${sessions} session${sessions === 1 ? "" : "s"} recorded` : ""),
                field("Participation type", txt(s1?.participation_type), false),
            ],
            flow: [
                { k: "PEOPLE", v: `${agg.members} member${agg.members === 1 ? "" : "s"}` },
                { k: "SERVICE", v: `${sessions} session${sessions === 1 ? "" : "s"}` },
                { k: "EFFORT", v: `${Math.round(agg.hours * 10) / 10}h logged` },
            ],
            evidence: evidenceN
                ? `${evidenceN} report evidence item(s); ${sessions} session record(s).`
                : "Participation evidence is not yet on file.",
            bullets: [
                `${agg.members} student${agg.members === 1 ? "" : "s"} logged ${Math.round(agg.hours * 10) / 10}h across ${sessions} session${sessions === 1 ? "" : "s"}.`,
            ],
        },
        {
            n: "02",
            fields: [
                field("Problem / need", txt(s2?.problem_statement, s2?.summary_text)),
                field("Affected group", txt(s2?.affected_group, s2?.primary_beneficiary)),
                field("Approx. number affected", txt(s2?.affected_count, agg.reach)),
                field("Gaps identified", Array.isArray(s2?.system_gaps) && s2.system_gaps.length ? s2.system_gaps.join(", ") : ""),
                field("Baseline evidence sources", Array.isArray(s2?.baseline_evidence) && s2.baseline_evidence.length ? s2.baseline_evidence.join(", ") : ""),
                field("Discipline", txt(s2?.discipline_other, s2?.discipline), false),
                field("How discipline helped", txt(s2?.discipline_contribution), false),
            ],
            flow: [
                { k: "NEED", v: clip(txt(s2?.problem_statement) || "Need pending", 12) },
                { k: "AFFECTED", v: clip(txt(s2?.affected_group) || "Group pending", 10) },
                { k: "BASELINE", v: `${Array.isArray(s2?.baseline_evidence) ? s2.baseline_evidence.length : 0} source type(s)` },
            ],
            evidence: `${Array.isArray(s2?.baseline_evidence) ? s2.baseline_evidence.length : 0} baseline source type(s) recorded.`,
            extraLimit:
                Array.isArray(s2?.baseline_evidence) && s2.baseline_evidence.length < 2
                    ? "Baseline is based on a limited number of evidence-source types."
                    : undefined,
            bullets: [txt(s2?.problem_statement) || "Problem / need is not provided."],
        },
        {
            n: "03",
            fields: [
                field("Registered SDG(s)", sdgLine || txt(s3?.primary_sdg?.goal_number ? `SDG ${s3.primary_sdg.goal_number}` : "")),
                field("Actual contribution to registered SDG(s)", txt(s3?.student_contribution_intent_statement, s3?.contribution_intent_statement)),
                field(
                    "Additional SDG connection(s)",
                    Array.isArray(s3?.secondary_sdgs) && s3.secondary_sdgs.length
                        ? s3.secondary_sdgs.map((row) => (row.goal_number ? `SDG ${row.goal_number}` : "")).filter(Boolean).join(" · ")
                        : "",
                    false,
                ),
                field("Local impact metric(s)", txt(s3?.primary_sdg?.sub_indicator, s3?.primary_sdg?.indicator_id), false),
            ],
            flow: [
                { k: "ACTIVITY", v: "Recorded engagement" },
                { k: "SDG", v: `${(agg.sdgs || []).length || (s3?.primary_sdg?.goal_number ? 1 : 0)} linked goal(s)` },
                { k: "LOGIC", v: clip(txt(s3?.student_contribution_intent_statement, s3?.contribution_intent_statement) || "Contribution logic pending", 12) },
            ],
            evidence: evidenceN ? `${evidenceN} evidence item(s) available across the report.` : "Evidence status depends on the wider report record.",
            bullets: sdgLine ? [sdgLine] : ["SDG mapping is not yet provided."],
        },
        {
            n: "04",
            fields: [
                field("Activity blocks", agg.acts.length ? `${agg.acts.length} activity block${agg.acts.length === 1 ? "" : "s"}` : ""),
                field("At least one activity title", txt(agg.acts[0]?.title, (s4?.activity_blocks || [])[0]?.title)),
                field(
                    "Categories / sub-categories",
                    listJoin(s4?.activity_blocks || [], (item) => {
                        const rec = asRecord(item);
                        return [txt(rec.primary_category), txt(rec.sub_category)].filter(Boolean).join(" / ");
                    }),
                ),
                field("Quantified outputs", agg.outputs ? `${agg.outputs} quantified output${agg.outputs === 1 ? "" : "s"}` : ""),
                field("Beneficiary reach", txt(agg.reach) && String(agg.reach) !== "0" ? String(agg.reach) : ""),
                field("Counting method", txt(s4?.project_summary?.counting_method, (s4?.activity_blocks || [])[0]?.reach_counting_method), false),
                field("Geography / site", txt((s4?.activity_blocks || [])[0]?.geographic_reach, (s4?.activity_blocks || [])[0]?.site_note), false),
            ],
            flow: [
                { k: "ACTIVITIES", v: String(agg.acts.length) },
                { k: "OUTPUTS", v: String(agg.outputs) },
                { k: "REACH", v: `${agg.reach || 0} unique` },
            ],
            evidence: evidenceN ? `${evidenceN} evidence item(s) available across the report.` : "Evidence status depends on the wider report record.",
            bullets: agg.acts.length ? agg.acts.map((block) => txt(block.title, block.primary_category) || "Activity") : ["Not provided."],
        },
        {
            n: "05",
            fields: [
                field("Change narrative", txt(s5?.observed_change, s5?.story_before && s5?.story_now ? `${s5.story_before} → ${s5.story_now}` : "")),
                field("Measurable outcome(s)", measured.length ? `${measured.length} measured outcome${measured.length === 1 ? "" : "s"}` : outcomeRows.length ? `${outcomeRows.length} outcome row(s) without baseline/endline` : ""),
                field("Outcome category / metric", listJoin(outcomeRows, (item) => txt(asRecord(item).metric, asRecord(item).outcome_area))),
                field("Baseline values", listJoin(outcomeRows, (item) => txt(asRecord(item).baseline))),
                field("Endline values", listJoin(outcomeRows, (item) => txt(asRecord(item).endline))),
                field("Confidence / verification level", listJoin(outcomeRows, (item) => Array.isArray(asRecord(item).confidence_level) ? (asRecord(item).confidence_level as string[]).join(", ") : txt(asRecord(item).confidence_level))),
                field("Challenges", txt(s5?.challenges), false),
            ],
            flow: measured[0]
                ? [
                      { k: "BASELINE", v: txt(measured[0].baseline) },
                      { k: "ENDLINE", v: txt(measured[0].endline) },
                      { k: "CONFIDENCE", v: Array.isArray(measured[0].confidence_level) && measured[0].confidence_level.length ? measured[0].confidence_level.join(", ") : "Not stated" },
                  ]
                : [
                      { k: "BASELINE", v: "Pending" },
                      { k: "ENDLINE", v: "Pending" },
                      { k: "CHANGE", v: "Not yet measured" },
                  ],
            evidence: listJoin(outcomeRows, (item) => Array.isArray(asRecord(item).confidence_level) ? (asRecord(item).confidence_level as string[]).join(", ") : "")
                ? `Outcome confidence labels recorded.`
                : "Outcome confidence/verification is not yet established.",
            extraLimit: measured.length ? undefined : "No fully measured before-to-after outcome is currently available; avoid claiming demonstrated impact.",
            extraHold: Boolean(outcomeRows.length && !measured.length),
            bullets: measured.length
                ? measured.map((row) => `${txt(row.metric, row.outcome_area)}: ${txt(row.baseline)} → ${txt(row.endline)}`)
                : ["Not provided."],
        },
        {
            n: "06",
            fields: [
                field("Resource model", resourceMode),
                field("Resource entries", s6?.use_resources === "no" ? "Zero-budget / time-led project" : resourceLines, s6?.use_resources === "yes"),
                field("Resource type(s)", listJoin(resources, (item) => txt(asRecord(item).type, asRecord(item).type_other)), s6?.use_resources === "yes"),
                field("Amount / unit", listJoin(resources, (item) => `${txt(asRecord(item).amount)} ${txt(asRecord(item).unit_other, asRecord(item).unit)}`.trim()), s6?.use_resources === "yes"),
                field("Source(s)", listJoin(resources, (item) => Array.isArray(asRecord(item).sources) ? (asRecord(item).sources as string[]).join(", ") : ""), s6?.use_resources === "yes"),
                field("Verification method(s)", listJoin(resources, (item) => Array.isArray(asRecord(item).verification) ? (asRecord(item).verification as string[]).join(", ") : ""), s6?.use_resources === "yes"),
                field("What resources enabled", listJoin(resources, (item) => txt(asRecord(item).purpose)), s6?.use_resources === "yes"),
            ],
            flow: [
                { k: "SOURCE", v: clip(listJoin(resources, (item) => Array.isArray(asRecord(item).sources) ? (asRecord(item).sources as string[]).join(", ") : "") || "Student time", 10) },
                { k: "RESOURCE", v: clip(listJoin(resources, (item) => txt(asRecord(item).type)) || resourceMode || "Pending", 10) },
                { k: "ENABLED", v: clip(listJoin(resources, (item) => txt(asRecord(item).purpose)) || "Delivery", 12) },
            ],
            evidence: evidenceN ? `${evidenceN} evidence item(s) available across the report.` : "Evidence status depends on the wider report record.",
            bullets: resources.length ? resources.map((row) => `${txt(row.type)} · ${txt(row.amount)} ${txt(row.unit)}`.trim()) : resourceMode ? [resourceMode] : ["Not provided."],
        },
        {
            n: "07",
            fields: [
                field("Registered partner", partnerName && partnerName !== "N/A" ? partnerName : ""),
                field("Partner organization type", txt(partners[0]?.type_other, partners[0]?.type), false),
                field("Partner contact person", txt(partners[0]?.pakistan_contact_name), false),
                field("Partner designation", txt(partners[0]?.designation), false),
                field("Partner role(s)", Array.isArray(partners[0]?.role) && partners[0].role.length ? partners[0].role.join(", ") : ""),
                field("Partner contribution", txt(partners[0]?.contribution_line, Array.isArray(partners[0]?.contribution) ? partners[0].contribution.join(", ") : "")),
                field("Additional partner(s)", partners.slice(1).map((row) => txt(row.name)).filter(Boolean).join(", "), false),
            ],
            flow: [
                { k: "PARTNER", v: clip(partnerName || "Pending", 10) },
                { k: "ROLE", v: clip(Array.isArray(partners[0]?.role) && partners[0].role.length ? partners[0].role.join(", ") : "Pending", 10) },
                { k: "CONTRIBUTION", v: clip(txt(partners[0]?.contribution_line) || "Pending", 12) },
            ],
            evidence:
                Array.isArray(partners[0]?.role) && partners[0].role.length
                    ? `${partners[0].role.length} partner role(s) recorded; partner verification should be checked in approval workflow.`
                    : "Partner role evidence is incomplete.",
            bullets: partners.length ? partners.map((row) => txt(row.name) || "Partner") : [partnerName || "Not provided."],
        },
        {
            n: "08",
            fields: [
                field("Additional evidence decision", s8?.has_evidence === "yes" ? "Yes — additional evidence attached" : s8?.has_evidence === "no" ? "No additional evidence" : ""),
                field("Additional evidence files", evidenceN ? `${evidenceN} evidence item${evidenceN === 1 ? "" : "s"}` : "", s8?.has_evidence === "yes"),
                field("What evidence shows", txt(s8?.description), s8?.has_evidence === "yes"),
                field("Public share permission", isPublicMediaVisibility(s8?.media_visible) ? (hasPublicSharePermission(s8) ? "Confirmed" : "") : "Not required"),
                field("Evidence visibility", mediaVisibilityTitle(s8?.media_visible) || txt(s8?.media_visible)),
            ],
            flow: [
                { k: "CLAIMS", v: "Report record" },
                { k: "EVIDENCE", v: `${evidenceN} item(s)` },
                { k: "VISIBILITY", v: mediaVisibilityTitle(s8?.media_visible) || "Restricted" },
            ],
            evidence: `${evidenceN} item(s) available; visibility and consent remain distinct from verification strength.`,
            extraLimit: evidenceN ? undefined : "No evidence files are currently available to substantiate report claims.",
            extraHold: !consentOk,
            bullets: [`${evidenceN} evidence item${evidenceN === 1 ? "" : "s"}`, consentOk ? "Evidence visibility is recorded." : "Evidence visibility or public-share permission is pending."],
        },
        {
            n: "09",
            fields: [
                field("Academic integration", txt(s9?.academic_integration)),
                field("Skills developed", Array.isArray(s9?.skills_grown) && s9.skills_grown.length ? [...s9.skills_grown, txt(s9.skills_grown_other)].filter(Boolean).join(", ") : ""),
                field("Biggest learning", txt(s9?.reflection_biggest_learning, s9?.personal_learning)),
                field("Perspective-changing moment", txt(s9?.reflection_moment), false),
                field("Academic application", txt(s9?.academic_application, s9?.reflection_discipline_help)),
                field(
                    "Competency ratings",
                    agg.competency ? `Mean competency rating ${agg.competency}` : s9?.competency_scores && Object.values(s9.competency_scores).some((n) => Number(n) >= 1) ? "Competency ratings recorded" : "",
                ),
            ],
            flow: [
                { k: "EXPERIENCE", v: "Community engagement" },
                { k: "LEARNING", v: clip(txt(s9?.reflection_biggest_learning, s9?.personal_learning) || "Pending", 11) },
                { k: "APPLICATION", v: clip(txt(s9?.academic_application) || "Pending", 11) },
            ],
            evidence: evidenceN ? `${evidenceN} evidence item(s) available across the report.` : "Evidence status depends on the wider report record.",
            bullets: [txt(s9?.academic_integration) ? `Academic integration: ${s9?.academic_integration}.` : "Academic integration is not yet provided."],
        },
        {
            n: "10",
            fields: [
                field("Continuation outlook", txt(s10?.continuation_status)),
                field("What continues / what stops", txt(s10?.continuation_details, s10?.continuation_keep_going)),
                field("Continuation mechanism(s)", Array.isArray(s10?.mechanisms) && s10.mechanisms.length ? [...s10.mechanisms, txt(s10.mechanism_other)].filter(Boolean).join(", ") : ""),
                field("Scaling potential", txt(s10?.scaling_potential), false),
                field("System influence", txt(s10?.policy_influence), false),
            ],
            flow: [
                { k: "PROJECT END", v: "Student phase closes" },
                { k: "MECHANISMS", v: `${Array.isArray(s10?.mechanisms) ? s10.mechanisms.length : 0} named` },
                { k: "CONTINUATION", v: clip(txt(s10?.continuation_status) || "Pending", 10) },
            ],
            evidence: evidenceN ? `${evidenceN} evidence item(s) available across the report.` : "Evidence status depends on the wider report record.",
            extraLimit: Array.isArray(s10?.mechanisms) && s10.mechanisms.length ? undefined : "No concrete continuation or handover mechanism is currently named.",
            bullets: [txt(s10?.continuation_status) ? `Continuation outlook: ${s10?.continuation_status}` : "Continuation outlook is pending."],
        },
    ];

    const belowMin = hours.filter((row) => !row.met);
    const allMet = hours.length > 0 && belowMin.length === 0;

    const findings: Record<string, { reason: string; strengths: string[]; limits: string[]; improvements: string[] }> = {
        "01": {
            reason: allMet
                ? "All required members meet the verified-hour threshold and the session record supports substantive participation."
                : hours.length
                  ? `The current record contains useful participation data, but final CII scoring is blocked because ${belowMin.length === 1 ? "one team member is" : "required team members are"} below the ${requiredHours}-hour requirement.`
                  : "The participation record is incomplete for final compliance because verified hours and session evidence are not yet complete.",
            strengths: [
                hours.length ? `${hours.length} team member${hours.length === 1 ? "" : "s"} ${hours.length === 1 ? "is" : "are"} identified.` : "",
                sessions ? `${Math.round(agg.hours * 10) / 10} total service hours are logged across ${sessions} session${sessions === 1 ? "" : "s"}.` : "",
                hours.filter((row) => row.met).length ? `${hours.filter((row) => row.met).length} member${hours.filter((row) => row.met).length === 1 ? "" : "s"} currently meet the ${requiredHours}-hour requirement.` : "",
            ].filter(Boolean),
            limits: [
                ...belowMin.map((row) => `${row.name} is recorded at ${row.hours}/${requiredHours} hours.`),
                sessions ? "" : "Session log is not on file.",
            ].filter(Boolean),
            improvements: [
                `Complete the minimum-hour requirement for every required team member.`,
                "Use evidence-backed session descriptions that show what was actually achieved.",
                "Show student initiative, decisions and problem solving rather than attendance alone.",
            ],
        },
        "02": {
            reason: txt(s2?.problem_statement) && txt(s2?.affected_group)
                ? "The need is identified, but baseline depth still determines how far Context marks can go."
                : "There is not enough submitted information to establish the community problem, beneficiary population or baseline. A defensible need assessment cannot yet be scored.",
            strengths: [
                txt(s2?.problem_statement) ? "The report identifies a specific community problem." : "",
                txt(agg.context.projectLocation) ? "The project title and host location establish a broad intervention context." : "The report structure includes a dedicated need-assessment section.",
            ].filter(Boolean),
            limits: [
                txt(s2?.problem_statement) ? "" : "Problem/need is missing.",
                txt(s2?.affected_group) && txt(s2?.affected_count) ? "" : "Affected group and approximate number affected are missing.",
                Array.isArray(s2?.baseline_evidence) && s2.baseline_evidence.length ? "" : "Baseline evidence sources, identified gaps and disciplinary lens are missing.",
            ].filter(Boolean),
            improvements: [
                "Define the problem specifically and identify who is affected.",
                "Add credible baseline sources such as partner records, observation, interviews or institutional data.",
                "Explain the precise gap and how the student's discipline informed the response.",
            ],
        },
        "03": {
            reason: sdgLine
                ? `${sdgLine} ${txt(s3?.student_contribution_intent_statement) ? "includes a contribution statement." : "are mapped, but the report does not yet explain the project's actual contribution pathway or local evidence of contribution."}`
                : "No defensible SDG contribution pathway is recorded.",
            strengths: sdgLine ? sdgLine.split(" · ").map((line) => `${line} is identified.`) : ["The report includes a dedicated SDG mapping structure."],
            limits: [
                txt(s3?.student_contribution_intent_statement, s3?.contribution_intent_statement) ? "" : "Actual contribution to the registered SDGs is missing.",
                txt(s3?.primary_sdg?.indicator_id, s3?.primary_sdg?.sub_indicator) ? "" : "Local impact metrics and contribution logic are not documented.",
            ].filter(Boolean),
            improvements: [
                "Explain Activity → Output → Local Change → SDG Contribution for each retained SDG.",
                "Add an appropriate local metric or official indicator where genuinely applicable.",
                "Remove any SDG that cannot be supported by the intervention evidence.",
            ],
        },
        "04": {
            reason: txt(agg.acts[0]?.title)
                ? `The principal activity “${agg.acts[0]?.title}” is assessed for relevance, execution, tangible outputs and unique reach.`
                : agg.acts.length
                  ? "One activity block exists, but core delivery information required to evaluate intervention relevance, execution, outputs and beneficiary reach has not been completed."
                  : "The activity record is not specific enough to support a strong delivery score.",
            strengths: [agg.acts.length ? `An activity block has been created${(s4?.activity_blocks || [])[0]?.status ? ` and is marked ${String((s4?.activity_blocks || [])[0]?.status).toLowerCase()}` : ""}.` : "The report includes a dedicated activity/output structure."],
            limits: [
                txt(agg.acts[0]?.title) ? "" : "Activity title and categories are missing.",
                agg.outputs ? "" : "Responsibility statements and quantified outputs are missing.",
                txt(agg.reach) && String(agg.reach) !== "0" ? "" : "Unique reach, overlap control, counting method and geography/site are missing.",
            ].filter(Boolean),
            improvements: [
                "Name and classify each activity.",
                "Document student responsibilities and tangible/countable outputs.",
                "Provide unique-beneficiary reach with a defensible counting method and duplicate-control explanation.",
            ],
        },
        "05": {
            reason: measured.length
                ? `A before-to-after outcome is documented (${txt(measured[0].baseline)} → ${txt(measured[0].endline)}); the System gives outcome credit only to the change supported by the stated evidence and confidence.`
                : outcomeRows.length
                  ? "An outcome record exists structurally, but no measurable before-to-after change, data source, confidence level, attribution statement or evidence reference is currently documented."
                  : "The report does not yet demonstrate a measurable before-to-after change.",
            strengths: [outcomeRows.length || s5 ? "The report includes a dedicated measurable-outcomes structure." : "Outcome fields are available in the locked template."],
            limits: [
                txt(s5?.story_before, s5?.observed_change) ? "" : "Before/now statements are missing.",
                measured.length ? "" : "Outcome category/metric, baseline and endline values are missing.",
                listJoin(outcomeRows, (item) => Array.isArray(asRecord(item).confidence_level) ? (asRecord(item).confidence_level as string[]).join(", ") : "") && txt(s5?.challenges)
                    ? ""
                    : "Confidence, data source, attribution, evidence reference, challenges and limitations are missing.",
            ].filter(Boolean),
            improvements: [
                "State the baseline and endline using the same measure.",
                "Identify how the change was measured and what evidence supports it.",
                "Separate project contribution from causation and state limitations honestly.",
            ],
        },
        "06": {
            reason: resources.length
                ? `${resources.length} resource record(s) are assessed for verification, mobilisation depth, relevance and what they enabled. Financial value is rewarded only when traceable and appropriately deployed.`
                : resourceMode === "Time & effort only"
                  ? "The project is recorded as time-and-effort led. Efficiency is assessed contextually; a zero-budget project is not treated as weak."
                  : "The resource model has not yet been completed, so the system cannot evaluate mobilisation depth, traceability, relevance, stewardship or durable resource legacy.",
            strengths: [resources.length ? `${resources.length} resource record(s) are listed.` : "Student time is implicitly part of the project effort."],
            limits: [
                resourceMode ? "" : "No resource model is provided.",
                resources.length || resourceMode === "Time & effort only" ? "" : "No cash, in-kind, materials, equipment, source, amount or verification method is recorded.",
                resources.some((row) => txt(row.purpose)) || resourceMode === "Time & effort only" ? "" : "What resources enabled is not documented.",
            ].filter(Boolean),
            improvements: [
                "Record all relevant cash and in-kind resources, including student funding, donations, equipment, venue, staff time or expertise.",
                "Provide source and verification for material resources.",
                "Explain what each resource enabled and whether useful value remains after the project.",
            ],
        },
        "07": {
            reason: partnerName && partnerName !== "N/A"
                ? `${partnerName} is identified as the partner, but the functional partnership, reciprocity, community voice, verification role and continuation cannot yet be assessed unless roles and contribution are documented.`
                : "No functional partnership record is available.",
            strengths: [partnerName && partnerName !== "N/A" ? "A named partner organization is linked to the project." : "The report includes a dedicated partnership section."],
            limits: [
                txt(partners[0]?.type, partners[0]?.pakistan_contact_name) ? "" : "Partner type, contact person and designation are missing.",
                Array.isArray(partners[0]?.role) && partners[0].role.length && txt(partners[0]?.contribution_line, Array.isArray(partners[0]?.contribution) ? partners[0].contribution.join(", ") : "")
                    ? ""
                    : "Partner roles and contribution are not documented.",
                txt(partners[0]?.verification) ? "" : "No evidence yet shows co-design, reciprocity or partner verification.",
            ].filter(Boolean),
            improvements: [
                "Document what the partner actually contributed.",
                "Show where partner/community voice influenced the project.",
                "Record any verification, co-delivery, resources, expertise or continuation responsibilities.",
            ],
        },
        "08": {
            reason: evidenceN
                ? `${evidenceN} evidence item(s) are assessed by the claims they substantiate, their quality and triangulation—not by file count or public visibility.`
                : "No evidence items are currently available in the report record, and consent/visibility fields are incomplete. Material impact claims therefore cannot be verified.",
            strengths: ["The report separates evidence visibility/consent from verification strength, which supports proper governance once populated."],
            limits: [
                evidenceN ? "" : "0 evidence items currently support the report.",
                s8?.has_evidence ? "" : "Auto-collected evidence and additional-evidence decision are missing.",
                consentOk && txt(s8?.media_visible) ? "" : "Evidence visibility or public-share permission is missing.",
            ].filter(Boolean),
            improvements: [
                "Attach evidence that supports the most important claims rather than uploading repetitive files.",
                "Use partner/institutional records, attendance, receipts, before/after evidence and outcome data where relevant.",
                "Complete consent/privacy and visibility settings.",
            ],
        },
        "09": {
            reason: txt(s9?.reflection_biggest_learning, s9?.personal_learning)
                ? "Reflection is scored for specificity, changed understanding, academic application and evidence of development—not for length or polished language."
                : txt(s9?.academic_integration)
                  ? `Academic integration is recorded as ${s9?.academic_integration}, but the learning, academic application and calibrated self-assessment needed for scoring are not yet provided.`
                  : "No substantive reflection is available.",
            strengths: [txt(s9?.academic_integration) ? "Academic integration status is recorded." : "The report includes dedicated reflection and competency fields."],
            limits: [
                txt(s9?.reflection_biggest_learning, s9?.personal_learning) && (Array.isArray(s9?.skills_grown) && s9.skills_grown.length) ? "" : "Skills developed, biggest learning and perspective-changing moment are missing.",
                txt(s9?.academic_application) ? "" : "Academic skill/application and personal reflection are missing.",
                agg.competency ? "" : "Competency ratings and self-rating coverage are missing.",
            ].filter(Boolean),
            improvements: [
                "Describe specific decisions, challenges, learning and changed assumptions.",
                "Show how disciplinary knowledge was applied in actual project work.",
                "Use honest competency ratings supported by project evidence.",
            ],
        },
        "10": {
            reason: txt(s10?.continuation_status) && Array.isArray(s10?.mechanisms) && s10.mechanisms.length
                ? "A continuation outlook and mechanism are documented. Sustainability credit is based on the mechanism and evidence—not on a student simply describing the project as “sustainable”."
                : "Sustainability cannot be inferred from intention. The current record does not yet identify what continues, who owns continuation, the handover mechanism, scaling evidence or system influence.",
            strengths: ["The report includes dedicated continuation, scaling and system-influence fields."],
            limits: [
                txt(s10?.continuation_status) ? "" : "Continuation outlook is missing.",
                txt(s10?.continuation_details) && Array.isArray(s10?.mechanisms) && s10.mechanisms.length ? "" : "What continues/what stops and continuation mechanism are missing.",
                txt(s10?.scaling_potential, s10?.policy_influence) ? "" : "Scaling potential and system influence are incomplete.",
            ].filter(Boolean),
            improvements: [
                "Name the post-project owner and specify what continues.",
                "Document handover/capacity transfer and future support requirements.",
                "Distinguish planned continuation from demonstrated continuation and provide follow-up evidence where available.",
            ],
        },
    };

    const v2ByHint = (no: string): Record<string, unknown> | undefined => {
        const aliases: Record<string, string[]> = {
            "01": ["participation"],
            "02": ["context"],
            "03": ["sdg"],
            "04": ["outputs"],
            "05": ["outcomes"],
            "06": ["resources"],
            "07": ["partnerships"],
            "08": ["evidence"],
            "09": ["learning"],
            "10": ["sustainability"],
        };
        const keys = aliases[no] || [];
        return options.v2Sections.find((row) => keys.includes(String(row.key || row.id || "").toLowerCase()));
    };

    const detailBlocks: LockedV17DetailBlock[] = blocks.map((block) => {
        const rubric = V19_RUBRIC[block.n] || { name: `Section ${block.n}`, max: 0, chips: [] };
        const cov = coverage(block.fields);
        const hold = holdState(block.fields, Boolean(block.extraHold));
        return {
            n: block.n,
            title: rubric.name,
            body: block.bullets.filter(Boolean),
            hold,
            coveragePct: cov.pct,
            reqFilled: cov.filled,
            reqTotal: block.fields.filter((row) => row.required).length,
            narrative: narrativeOf(block.fields, `${rubric.name} is scored from the locked student-source fields.`),
            flow: block.flow,
            evidence: block.evidence,
            limitation: limitationOf(block.fields, block.extraLimit || "No major completeness limitation detected; faculty should still validate evidence quality and attribution."),
            fields: block.fields,
        };
    });

    const assessment: LockedV17Assess[] = detailBlocks.map((block) => {
        const rubric = V19_RUBRIC[block.n] || { name: block.title, max: 0, chips: [] };
        const generated = findings[block.n] || {
            reason: "Assessment layer appears after Faculty runs the Analyzer. Student-source text is not rewritten.",
            strengths: ["Pending Analyzer / Faculty moderation."],
            limits: ["Pending Analyzer / Faculty moderation."],
            improvements: [],
        };
        const fromV2 = v2ByHint(block.n);
        const scoreRaw = finiteNum(fromV2?.score);
        const missReq = block.fields.some((row) => row.required && row.status !== "Recorded");
        const showScore = scoreRaw != null && (options.locked || !missReq);
        const analyserReason = txt(fromV2?.reason, fromV2?.comment);
        const analyserGood = txt(fromV2?.good);
        const analyserLimit = txt(fromV2?.limit);
        const analyserImprove = txt(fromV2?.improve, fromV2?.improvement);
        return {
            no: block.n,
            name: rubric.name,
            score: showScore ? String(scoreRaw) : "HOLD",
            max: finiteNum(fromV2?.weight) || rubric.max,
            chips: rubric.chips,
            reason: missReq || !analyserReason ? generated.reason : analyserReason,
            strengths: analyserGood && showScore ? [analyserGood] : generated.strengths.length ? generated.strengths : ["Pending Analyzer / Faculty moderation."],
            limits: analyserLimit && showScore ? [analyserLimit] : generated.limits.length ? generated.limits : ["Pending Analyzer / Faculty moderation."],
            improvements: analyserImprove && showScore ? [analyserImprove] : generated.improvements,
        };
    });

    return { detailBlocks, assessment };
}

export function v19OverallCopy(detailBlocks: LockedV17DetailBlock[], locked: boolean, score: number | null, feedback: string): string {
    const gaps = detailBlocks.reduce((sum, block) => sum + block.fields.filter((row) => row.status === "Required data").length, 0);
    if (locked) return feedback || `Faculty-Verified CII ${score}/100.`;
    if (score != null && !gaps) {
        return feedback || `Provisional System CII ${score}/100. The badge updates on the flashcard only after Faculty verification.`;
    }
    if (gaps) {
        return `The current V17 record cannot receive a defensible CII because required source data and evidence are materially incomplete. The Detailed Report itself confirms ${gaps} required gap${gaps === 1 ? "" : "s"} and instructs that CII must evaluate structured source facts, evidence and verification alongside generated summaries.`;
    }
    return "A provisional CII is available only after Faculty runs the Analyzer. The badge updates on the flashcard only after Faculty verification.";
}
