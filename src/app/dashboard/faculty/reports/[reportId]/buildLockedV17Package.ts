import type { ReportData } from "@/app/dashboard/student/report/context/ReportContext";
import { buildReportFlashAgg } from "@/app/dashboard/student/report/ReportFormChrome";
import { resolveReportCii } from "@/app/dashboard/student/report/utils/resolveReportCii";
import { pickCiiV45DisplayScore } from "@/utils/reportCiiSnapshot";
import { buildLockedV17DetailAndAssessment, v19OverallCopy } from "./buildLockedV17Assessment";
import { buildLockedV17SourceTabs, emptyLockedV17SourceTabs, type LockedV17SourceTabs } from "./buildLockedV17SourceTabs";

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function txt(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function firstSentence(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return "";
    const match = trimmed.match(/^[^.!?]*[.!?]/);
    return (match ? match[0] : trimmed).trim();
}

export type LockedV17Spot = { ey: string; value: string; note: string; tone: "blue" | "coral" | "gold" | "pink" | "green" };
export type LockedV17Section = { n: string; title: string; cls?: string; bullets: string[] };
export type LockedV17FieldRow = {
    field: string;
    value: string;
    status: "Recorded" | "Required data" | "Optional / not provided";
    required: boolean;
};

export type LockedV17FlowNode = { k: string; v: string };

export type LockedV17DetailBlock = {
    n: string;
    title: string;
    body: string[];
    hold: { code: "HOLD" | "READY" | "REVIEW"; cls: "hold" | "ready" | "review"; label: string };
    coveragePct: number;
    reqFilled: number;
    reqTotal: number;
    narrative: string;
    flow: LockedV17FlowNode[];
    evidence: string;
    limitation: string;
    fields: LockedV17FieldRow[];
};

export type LockedV17Assess = {
    no: string;
    name: string;
    score: string;
    max: number;
    chips: Array<{ label: string; weight: number }>;
    reason: string;
    strengths: string[];
    limits: string[];
    improvements: string[];
};

export type LockedV17PackageModel = {
    title: string;
    story: string;
    meta: string;
    statusChips: string[];
    hoursLabel: string;
    sessions: number;
    reach: string;
    outputs: number;
    outcomes: number;
    evidence: number;
    spots: LockedV17Spot[];
    sections: LockedV17Section[];
    detailBlocks: LockedV17DetailBlock[];
    ciiLocked: boolean;
    ciiScore: number | null;
    ciiSource: string;
    badgeLabel: string;
    badgeRange: string;
    lockNote: string;
    assessment: LockedV17Assess[];
    overall: string;
    requiredGaps: number;
    sourceTabs: LockedV17SourceTabs;
};

function listJoin(items: string[]): string {
    if (items.length <= 1) return items[0] || "";
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function scoreRange(score: number): string {
    if (score >= 92) return "92–100";
    if (score >= 84) return "84–91";
    if (score >= 67) return "67–83";
    if (score >= 58) return "58–66";
    if (score >= 48) return "48–57";
    return "0–47";
}

function finiteNum(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return null;
}

export function buildLockedV17Package(data: ReportData, projectData?: unknown): LockedV17PackageModel {
    const agg = buildReportFlashAgg(data, projectData);
    const cii = resolveReportCii(data);
    const s1 = data.section1;
    const s2 = data.section2;
    const s6 = data.section6;
    const s7 = data.section7;
    const s9 = data.section9;
    const s10 = data.section10;
    const logs = Array.isArray(s1?.attendance_logs) ? s1.attendance_logs : agg.logs;
    const countedLogs = logs.filter((log) => {
        const status = String(log.approval_status ?? (log as { approvalStatus?: string }).approvalStatus ?? "")
            .trim()
            .toLowerCase();
        return status !== "rejected";
    });
    const sessions = countedLogs.length || logs.length;
    const logHours = countedLogs.reduce((sum, log) => {
        const n = Number(log.hours);
        return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const hours = logHours > 0 ? logHours : agg.hours;
    const hoursLabel = hours ? `${Math.round(hours * 10) / 10}h` : "0h";
    const members = agg.members || 1;
    const reach = agg.reach || "0";
    const outputs = agg.outputs;
    const outcomes = Array.isArray(agg.measured) ? agg.measured.length : 0;
    const evidence = agg.evidence;
    const story =
        firstSentence(txt(s2?.summary_text, s2?.problem_statement, agg.context.projectLocation)) ||
        "The student submission is locked in the Impact Package received by Faculty.";
    const partner = txt(agg.context.partnerOrganization) || "Partner not named";
    const location = txt(agg.context.projectLocation);
    const faculty = txt(asRecord(s1).faculty_supervisor_name, s1?.faculty_supervisor_email);
    const dates = logs.map((log) => String(log.date || "")).filter(Boolean).sort();
    const dateSpan = dates.length > 1 ? `${dates[0]} → ${dates[dates.length - 1]}` : dates[0] || txt(agg.context.timelineLabel);
    const meta = [partner && `🏛️ ${partner}`, location && `📍 ${location}`, dateSpan && `📅 ${dateSpan}`, faculty && `🧑‍🏫 ${faculty}`]
        .filter(Boolean)
        .join(" · ");

    const ciiV45 = asRecord(data.ciiV45);
    const finalNumRaw = pickCiiV45DisplayScore(data.ciiV45, data.ciiV45Lock);
    const finalNum = finalNumRaw == null ? null : Math.round(finalNumRaw * 10) / 10;
    const locked = cii.source === "faculty_locked";
    const gaps: string[] = [];
    if (!txt(s2?.problem_statement, s2?.summary_text, s2?.affected_group)) gaps.push("community-need");
    if (!agg.acts.length) gaps.push("activity");
    if (!outcomes) gaps.push("outcome");
    if (!evidence) gaps.push("evidence");
    if (!txt(s10?.continuation_status)) gaps.push("sustainability");
    const statusChips: string[] = [];
    if (!locked && gaps.length) statusChips.push("DRAFT");
    statusChips.push(`${members} student${members === 1 ? "" : "s"}`);
    if (!locked && gaps.length) statusChips.push("HOLD CII · REQUIRED CORRECTIONS");
    if (locked) {
        statusChips.push(`FACULTY-VERIFIED CII · ${cii.totalScore}/100`);
        statusChips.push("BADGE · ATTACHED");
    } else if (finalNum != null) {
        statusChips.push(`SYSTEM CII · ${finalNum}/100`);
        statusChips.push("BADGE STATUS · AWAITING FACULTY VERIFICATION");
    }
    const lockNote = gaps.length
        ? `The current submission records verified participation, while the ${listJoin(gaps)} sections still contain required gaps.`
        : "Locked-source rule. The Raw Flashcard and Raw Detailed Report below are preserved from the student submission. CII is calculated primarily from the Detailed Report, structured source fields and evidence. The assessment layer adds marks/reasoning but does not rewrite the student's source record.";

    const sdgLine = (agg.sdgs || [])
        .map((row) => (row.goalNumber ? `SDG ${row.goalNumber}` : ""))
        .filter(Boolean)
        .join(" · ");
    const partners = Array.isArray(s7?.partners) ? s7.partners : [];
    const resources = Array.isArray(s6?.resources) ? s6.resources : [];

    const spots: LockedV17Spot[] = [
        {
            ey: "Beneficiaries",
            value: String(reach || "0"),
            note: reach && reach !== "0" ? "Affected group and unique reach from the locked record." : "Affected group and unique reach are still pending.",
            tone: "blue",
        },
        {
            ey: "Outputs & Outcomes",
            value: `${outputs} / ${outcomes}`,
            note:
                outputs || outcomes
                    ? "Quantified outputs and measurable outcomes from the detailed report."
                    : "No quantified outputs or measurable outcomes are yet supported in the current record.",
            tone: "coral",
        },
        {
            ey: "Resources Mobilised",
            value: resources.length ? String(resources.length) : "Pending",
            note: resources.length ? "Resource entries recorded in Section 5." : "Resource model and resource entries have not yet been provided.",
            tone: "gold",
        },
        {
            ey: "Partnerships",
            value: String(partners.length || (partner && partner !== "N/A" ? 1 : 0)),
            note: partners[0]?.name || partner || "Role and contribution details remain incomplete.",
            tone: "pink",
        },
        {
            ey: "SDGs & Sustainability",
            value: String((agg.sdgs || []).length),
            note: sdgLine || "Contribution logic and continuation evidence pending.",
            tone: "green",
        },
    ];

    const memberHours = [
        s1?.team_lead ? `${txt(s1.team_lead.fullName, s1.team_lead.name) || "Lead"} ${s1.team_lead.hours || 0}h` : "",
        ...(Array.isArray(s1?.team_members)
            ? s1.team_members.map((m) => `${txt(m.fullName, m.name) || "Member"} ${m.hours || 0}h`)
            : []),
    ].filter(Boolean);

    const sections: LockedV17Section[] = [
        {
            n: "01",
            title: "Participation & Verified Effort",
            bullets: [
                `${members} student${members === 1 ? "" : "s"} logged ${hoursLabel} across ${sessions} session${sessions === 1 ? "" : "s"}.`,
                memberHours.length ? `Hours: ${memberHours.join(" · ")}.` : "Individual hour split is not yet recorded.",
                sessions ? "Session log is part of the locked submission." : "Session evidence and participation declarations remain missing.",
            ],
        },
        {
            n: "02",
            title: "Community Need, Beneficiaries & Baseline",
            cls: "context",
            bullets: [
                `Problem / need: ${txt(s2?.problem_statement) || "Not provided."}`,
                `Affected group: ${txt(s2?.affected_group) || "Not provided."}`,
                `Approx. number affected: ${txt(s2?.affected_count, reach) || "Not provided."}`,
            ],
        },
        {
            n: "03",
            title: "SDG Contribution",
            cls: "sdg",
            bullets: sdgLine ? sdgLine.split(" · ").map((line) => line) : ["SDG mapping is not yet provided."],
        },
        {
            n: "04",
            title: "Activities, Outputs & Outcomes",
            cls: "activity",
            bullets: [
                `${agg.acts.length} activity block${agg.acts.length === 1 ? "" : "s"} in the locked record.`,
                `Outputs: ${outputs} quantified outputs.`,
                `Reach: ${reach || 0} unique beneficiaries currently substantiated.`,
                `Outcomes: ${outcomes} before/after row${outcomes === 1 ? "" : "s"}.`,
            ],
        },
        {
            n: "05",
            title: "Resources Mobilised",
            cls: "resources",
            bullets: resources.length
                ? resources.slice(0, 4).map((row) => `${txt(row.type) || "Resource"} · ${txt(row.amount)} ${txt(row.unit)}`)
                : ["Resource model has not been provided."],
        },
        {
            n: "06",
            title: "Partnerships Developed",
            cls: "partners",
            bullets: partners.length
                ? partners.map((p) => `${txt(p.name) || "Partner"}${Array.isArray(p.role) && p.role.length ? ` · ${p.role.join(", ")}` : ""}`)
                : [partner && partner !== "N/A" ? `${partner} is the registered partner.` : "No partner is documented."],
        },
        {
            n: "07",
            title: "Evidence, Ethics & Verification",
            cls: "evidence",
            bullets: [
                `${evidence} evidence item${evidence === 1 ? "" : "s"} currently support the report.`,
                agg.ethicsOk ? "Ethics / consent confirmation is recorded." : "Ethics / consent confirmation is pending.",
            ],
        },
        {
            n: "08",
            title: "Reflection & Academic Growth",
            bullets: [
                txt(s9?.academic_integration) ? `Academic integration: ${s9?.academic_integration}.` : "Academic integration is not yet provided.",
                agg.competency ? `Mean competency rating ${agg.competency}.` : "Competency ratings remain pending.",
                txt(s9?.reflection_biggest_learning, s9?.personal_learning) || "Biggest learning is not yet provided.",
            ],
        },
        {
            n: "09",
            title: "Sustainability & Handover",
            cls: "sustain",
            bullets: [
                `Continuation outlook: ${txt(s10?.continuation_status) || "Pending."}`,
                Array.isArray(s10?.mechanisms) && s10.mechanisms.length
                    ? `Continuation mechanisms: ${s10.mechanisms.length} named.`
                    : "Continuation mechanisms: 0 named.",
            ],
        },
    ];

    const ciiSections = Array.isArray(ciiV45.sectionScores) ? (ciiV45.sectionScores as Array<Record<string, unknown>>) : [];
    const { detailBlocks, assessment } = buildLockedV17DetailAndAssessment(data, agg, { locked, ciiSections });

    const levelRec = asRecord(ciiV45.finalBadge);
    // v4.5 studentFeedback is a plain string (v2 was a structured object) — no fallback fields.
    const feedback = txt(ciiV45.studentFeedback);
    const badgeLabel = locked
        ? txt(levelRec.name) || "Faculty-Verified Impact Badge"
        : finalNum != null
          ? "System score awaiting Faculty verification"
          : "Badge pending";
    const displayScore = locked ? cii.totalScore : finalNum;
    const overall = v19OverallCopy(detailBlocks, locked, displayScore, feedback);
    const requiredGaps = detailBlocks.reduce((sum, block) => sum + block.fields.filter((row) => row.status === "Required data").length, 0);
    let sourceTabs: LockedV17SourceTabs;
    try {
        sourceTabs = buildLockedV17SourceTabs(data, assessment, {
            ciiLocked: locked,
            ciiScore: displayScore,
            badgeLabel,
            overall,
        });
    } catch {
        sourceTabs = { ...emptyLockedV17SourceTabs() };
    }

    return {
        title: agg.title,
        story,
        meta,
        statusChips,
        hoursLabel,
        sessions,
        reach: String(reach || "0"),
        outputs,
        outcomes,
        evidence,
        spots,
        sections,
        detailBlocks,
        ciiLocked: locked,
        ciiScore: displayScore,
        ciiSource: cii.source,
        badgeLabel,
        badgeRange: displayScore != null ? scoreRange(displayScore) : "—",
        lockNote,
        assessment,
        overall,
        requiredGaps,
        sourceTabs,
    };
}
