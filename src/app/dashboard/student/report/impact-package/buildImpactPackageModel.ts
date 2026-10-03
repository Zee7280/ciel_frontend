import type { ReportData } from "../context/ReportContext";
import { findSdgById } from "@/utils/sdgData";
import { getReportProjectContextDisplay } from "@/utils/reportProjectContext";
import { mergeReportSdgSnapshotRows } from "../utils/reportSdgMerge";
import { distinctBeneficiaryTotal } from "../utils/activityReach";
import {
    buildIndividualRosterFromSection1,
    calculateEngagementMetrics,
    sumNonRejectedLoggedHours,
} from "../utils/engagementMetrics";
import {
    MEDIA_VISIBILITY_LABELS,
    hasPublicSharePermission,
    isPublicMediaVisibility,
    resolveMediaVisibility,
    type MediaVisibility,
} from "../utils/mediaVisibility";
import { resolveReportCii } from "../utils/resolveReportCii";
import { classifyEvidenceGalleryKind } from "@/components/ciel/community-service/ReportEvidenceGallery";

export type ImpactPackageAudience = "student" | "faculty" | "university" | "admin" | "partner" | "public";

export type ImpactPackageEvidenceKind = "image" | "video" | "audio" | "archive" | "file";

export type ImpactPackageEvidenceFile = {
    id: string;
    url: string;
    name: string;
    kind: ImpactPackageEvidenceKind;
    section: string;
    claim: string;
    previewable: boolean;
};

export type ImpactPackageChip = { text: string; cls?: string };

export type ImpactPackageTile = {
    n: number;
    title: string;
    text: string;
    chips: ImpactPackageChip[];
};

export type ImpactPackageMetric = {
    value: string;
    label: string;
    qual: string;
};

export type ImpactPackageChange = {
    label: string;
    before: number | null;
    after: number | null;
    unit: string;
    note: string;
};

export type ImpactPackageModel = {
    projectId: string;
    reportId: string;
    title: string;
    /** Designed two-line display title; falls back to project title. */
    headline: [string] | [string, string];
    projectName: string;
    story: string;
    heroMeta: string[];
    changeEyebrow: string;
    statusTitle: string;
    statusDetail: string;
    metrics: ImpactPackageMetric[];
    change: ImpactPackageChange | null;
    tiles: ImpactPackageTile[];
    visibility: MediaVisibility;
    visibilityLabel: string;
    publicConsent: boolean;
    effectiveVisibility: MediaVisibility;
    files: ImpactPackageEvidenceFile[];
    adminApproved: boolean;
    submitted: boolean;
    ciiLabel: string;
    ciiPending: boolean;
    sectionsComplete: number;
    sectionsTotal: number;
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function pickString(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function pickNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const n = Number(value.replace(/,/g, "").replace(/%/g, "").trim());
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function firstSentence(text: string, max = 220): string {
    const trimmed = (text || "").replace(/\s+/g, " ").trim();
    if (!trimmed) return "";
    const match = trimmed.match(/^[^.!?]*[.!?]/);
    const out = (match ? match[0] : trimmed).trim();
    return out.length > max ? `${out.slice(0, max - 1)}…` : out;
}

function nice(value: unknown): string {
    return String(value || "")
        .replaceAll("_", " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayName(person: { name?: string; fullName?: string } | undefined): string {
    return pickString(person?.fullName, person?.name);
}

function uuidFromRosterId(studentId: string): string {
    const lead = /^lead:(.+)$/.exec(studentId);
    if (lead?.[1]) return lead[1];
    const member = /^member:\d+:(.+)$/.exec(studentId);
    if (member?.[1]) return member[1];
    return studentId;
}

/** Same roster person Section 1 Individual metrics uses (fullName, then name). */
function participantChipName(data: ReportData, studentId: string): string {
    const key = uuidFromRosterId(studentId);
    const lead = data.section1?.team_lead;
    if (lead?.id && (studentId === `lead:${lead.id}` || key === String(lead.id))) {
        return displayName(lead) || "Team lead";
    }
    const members = Array.isArray(data.section1?.team_members) ? data.section1.team_members : [];
    for (const member of members) {
        const memberId = member?.id ?? member?.participantId;
        if (memberId && (key === String(memberId) || studentId.includes(String(memberId)))) {
            return displayName(member) || "Member";
        }
    }
    return "Member";
}

function fmtNum(n: number | string | null | undefined): string {
    const num = typeof n === "number" ? n : Number(String(n ?? "").replace(/,/g, ""));
    if (!Number.isFinite(num)) return String(n || "—");
    return num.toLocaleString();
}

function hoursLabel(hours: number): string {
    const rounded = Math.round(hours * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function isApproved(value: unknown): boolean {
    const st = String(value || "").toLowerCase();
    return st === "approved" || st === "verified";
}

function isSubmitted(data: ReportData): boolean {
    const st = String(data.status || "").toLowerCase();
    return ![
        "",
        "draft",
        "in_progress",
        "not_started",
    ].includes(st);
}

function sdgChipClass(goal: number): string {
    if (goal === 3) return "goal g3";
    if (goal === 4) return "goal";
    if (goal === 11) return "goal g11";
    if (goal === 13) return "goal g13";
    return "goal";
}

function displayHeadline(title: string): [string] | [string, string] {
    const trimmed = title.replace(/\s+/g, " ").trim();
    const dashed = trimmed.split(/\s+[—–-]\s+/);
    if (dashed.length >= 2 && dashed[0].length <= 42 && dashed[1].length <= 42) {
        return [dashed[0].replace(/\.$/, "") + ".", dashed[1]];
    }
    const sentenced = trimmed.match(/^(.{12,42}[.!?])\s+(.{8,42})$/);
    if (sentenced) return [sentenced[1], sentenced[2]];
    const comma = trimmed.split(/:\s+/);
    if (comma.length === 2 && comma[0].length <= 42 && comma[1].length <= 48) {
        return [comma[0] + ".", comma[1]];
    }
    return [trimmed];
}

function fileKind(url: string, name: string): ImpactPackageEvidenceKind {
    const blob = `${name} ${url.split("?")[0]}`.toLowerCase();
    if (/\.(mp4|webm|mov|m4v|avi|mkv)(\?|#|$)/.test(blob)) return "video";
    if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/.test(blob)) return "audio";
    if (/\.(zip|rar|7z|tar|gz)(\?|#|$)/.test(blob)) return "archive";
    const gallery = classifyEvidenceGalleryKind(url, name);
    if (gallery === "image") return "image";
    if (gallery === "video") return "video";
    return "file";
}

function nameFromUrl(url: string): string {
    const path = url.split("?")[0].split("#")[0];
    try {
        return decodeURIComponent(path).split("/").filter(Boolean).pop() || "Evidence file";
    } catch {
        return path.split("/").filter(Boolean).pop() || "Evidence file";
    }
}

function pickEvidenceRef(value: unknown): { url: string; name: string } | null {
    if (typeof value === "string") {
        const text = value.trim();
        if (!/^https?:\/\//i.test(text) && !text.startsWith("blob:") && !text.startsWith("data:")) return null;
        return { url: text, name: nameFromUrl(text) };
    }
    if (!value || typeof value !== "object") return null;
    const rec = value as Record<string, unknown>;
    const urlFields = [rec.url, rec.evidence_url, rec.file_url, rec.location, rec.path, rec.href, rec.src];
    const url = urlFields.find((item): item is string => typeof item === "string" && Boolean(item.trim()))?.trim();
    if (!url) return null;
    const nameFields = [rec.name, rec.fileName, rec.filename, rec.originalName, rec.label];
    const name = nameFields.find((item): item is string => typeof item === "string" && Boolean(item.trim()))?.trim();
    return { url, name: name || nameFromUrl(url) };
}

function collectEvidenceFiles(data: ReportData, extra?: Array<{ url?: string; name?: string; source?: string }>): ImpactPackageEvidenceFile[] {
    const items: ImpactPackageEvidenceFile[] = [];
    const seen = new Set<string>();
    const push = (url: string, name: string, section: string, claim = "") => {
        if (!url || seen.has(url)) return;
        seen.add(url);
        const kind = fileKind(url, name);
        items.push({
            id: `ev-${items.length + 1}`,
            url,
            name: name || nameFromUrl(url),
            kind,
            section,
            claim: claim || name || "Attached evidence",
            previewable: kind === "image" || kind === "video" || /\.pdf(\?|#|$)/i.test(`${name} ${url}`),
        });
    };
    const pushRef = (value: unknown, section: string, claim = "") => {
        const ref = pickEvidenceRef(value);
        if (ref) push(ref.url, ref.name, section, claim);
    };
    const pushList = (list: unknown, section: string) => {
        if (Array.isArray(list)) list.forEach((item) => pushRef(item, section));
        else pushRef(list, section);
    };

    const sections = [
        ["section1", data.section1],
        ["section2", data.section2],
        ["section3", data.section3],
        ["section4", data.section4],
        ["section5", data.section5],
        ["section6", data.section6],
        ["section7", data.section7],
        ["section8", data.section8],
        ["section9", data.section9],
        ["section10", data.section10],
    ] as const;
    for (const [key, section] of sections) {
        const rec = asRecord(section);
        pushList(rec.media_urls, key);
        pushList(rec.evidence_files, key);
        pushList(rec.formalization_files, key);
        pushList(rec.partner_verification_files, key);
    }
    (Array.isArray(data.section1?.attendance_logs) ? data.section1.attendance_logs : []).forEach((log) => {
        pushRef((log as { evidence_url?: unknown }).evidence_url, "section1", pickString(log.description, log.activity_type));
        pushList((log as { evidence_urls?: unknown }).evidence_urls, "section1");
        pushRef((log as { evidence_file?: unknown }).evidence_file, "section1");
    });
    pushList(data.evidence_urls, "report");
    (extra || []).forEach((file) => {
        if (file?.url) push(file.url, file.name || nameFromUrl(file.url), file.source || "package");
    });
    return items;
}

function memberHours(data: ReportData): Array<{ name: string; hours: number; required: number }> {
    const required = data.required_hours || 16;
    const logs = Array.isArray(data.section1?.attendance_logs) ? data.section1.attendance_logs : [];
    const lead = data.section1?.team_lead;
    const leadName = displayName(lead) || "Team lead";
    const members = Array.isArray(data.section1?.team_members) ? data.section1.team_members : [];

    if (data.section1?.participation_type !== "team") {
        return [
            {
                name: leadName,
                hours: sumNonRejectedLoggedHours(logs) || pickNumber(lead?.hours) || 0,
                required,
            },
        ];
    }

    const rosterIds = buildIndividualRosterFromSection1(data.section1, lead?.id);
    const calc = calculateEngagementMetrics(
        logs,
        required,
        1 + members.length,
        lead,
        rosterIds,
        { includeUnreviewed: true },
    );
    const liveRows = calc.individual_metrics ?? [];
    if (liveRows.length > 0) {
        return liveRows.map((row) => ({
            name: participantChipName(data, row.student_id),
            hours: row.individual_hours,
            required,
        }));
    }

    return [
        { name: leadName, hours: pickNumber(lead?.hours) || 0, required },
        ...members.map((member) => ({
            name: displayName(member) || "Member",
            hours: pickNumber(member.hours) || 0,
            required,
        })),
    ];
}

export function buildImpactPackageModel(
    data: ReportData,
    projectData?: unknown,
    extraFiles?: Array<{ url?: string; name?: string; source?: string }>,
): ImpactPackageModel {
    const project = asRecord(projectData);
    const opportunity = asRecord(project.opportunity).id ? asRecord(project.opportunity) : project;
    const context = getReportProjectContextDisplay({ ...opportunity, opportunity: projectData, ...data });
    const title = pickString(opportunity.title, project.title, data.project_title) || "Community engagement";
    const sdgs = mergeReportSdgSnapshotRows({ ...opportunity, ...data }, data.section3);
    const logs = Array.isArray(data.section1?.attendance_logs) ? data.section1.attendance_logs : [];
    const hours =
        pickNumber(data.section1?.metrics?.total_verified_hours) ||
        sumNonRejectedLoggedHours(logs) ||
        memberHours(data).reduce((sum, row) => sum + row.hours, 0);
    const acts = (Array.isArray(data.section4?.activity_blocks) ? data.section4.activity_blocks : []).filter((block) =>
        pickString(block.title, block.primary_category),
    );
    const outputRows = acts.flatMap((block) => (Array.isArray(block.outputs) ? block.outputs : [])).filter((row) => String(row?.quantity ?? "").trim());
    const reachCount = distinctBeneficiaryTotal(data.section4) || pickNumber(data.section2?.affected_count) || 0;
    const outcomes = Array.isArray(data.section5?.measurable_outcomes) ? data.section5.measurable_outcomes : [];
    const measured = outcomes.filter((o) => pickString(o.metric, o.outcome_area) && (o.baseline || o.endline));
    const numericChange = measured
        .map((o) => ({
            label: pickString(o.metric, o.outcome_area) || "Reported change",
            before: pickNumber(o.baseline),
            after: pickNumber(o.endline),
            unit: pickString(o.unit_other, o.unit),
            note: pickString(o.measurement_explanation),
        }))
        .find((row) => row.before != null && row.after != null) || null;
    const pkr = (data.section6?.resources || []).reduce((sum, r) => {
        if (String(r.unit || "").toUpperCase() !== "PKR") return sum;
        return sum + (pickNumber(r.amount) || 0);
    }, 0);
    const files = collectEvidenceFiles(data, extraFiles);
    const visibility = resolveMediaVisibility(data.section8?.media_visible ?? asRecord(data.section8).media_usage);
    const publicConsent = visibility === "public" ? hasPublicSharePermission(data.section8) : false;
    const effectiveVisibility: MediaVisibility = visibility === "public" && !publicConsent ? "restricted" : visibility;
    const adminApproved = isApproved(data.admin_status) || isApproved(data.admin_approval_status) || String(data.status || "").toLowerCase() === "verified";
    const submitted = isSubmitted(data);
    const cii = resolveReportCii(data);
    const members = memberHours(data);
    const names = members.map((row) => row.name).filter(Boolean);
    const university = pickString(data.section1?.team_lead?.university, asRecord(opportunity).university as string);
    const discipline = pickString(data.section2?.discipline, data.section1?.team_lead?.degree);
    const s1 = asRecord(data.section1);
    const faculty = pickString(
        s1.faculty_supervisor_name,
        s1.facultySupervisorName,
        asRecord(opportunity).faculty_name,
        asRecord(opportunity).facultyName,
        asRecord(project).faculty_name,
        data.section1?.faculty_supervisor_email,
    );
    const heroMeta = [
        [context.partnerOrganization, context.projectLocation !== "N/A" ? context.projectLocation : ""].filter(Boolean).join(" · "),
        context.timelineLabel !== "—" ? context.timelineLabel : "",
        [university, discipline].filter(Boolean).join(" · "),
        [names.join(" + "), faculty ? `Faculty: ${faculty}` : ""].filter(Boolean).join(" · "),
    ].filter(Boolean);

    const story =
        firstSentence(pickString(data.section5?.observed_change, data.section5?.story_now, data.section2?.problem_statement, data.section2?.summary_text, data.section4?.summary_text)) ||
        "This package is the locked student-source record for the submitted community engagement report.";

    const holdBits: string[] = [];
    members.forEach((row) => {
        if (row.hours < row.required) holdBits.push(`${row.name} ${hoursLabel(row.hours)} / ${row.required} h`);
    });
    if (!files.length) holdBits.push("no evidence files attached");
    const statusTitle = adminApproved
        ? "PUBLISHED · CIEL PK accepted"
        : submitted
          ? "INTEGRITY HOLD · Awaiting CIEL PK review"
          : "DRAFT · Not yet submitted";
    const statusDetail = holdBits.length ? holdBits.join(" · ") : submitted ? "Student source record locked for review" : "Complete remaining fields, then submit";

    const firstOutput = outputRows[0];
    const metrics: ImpactPackageMetric[] = [
        {
            value: reachCount > 0 ? fmtNum(reachCount) : "—",
            label: reachCount > 0 ? "people reported" : "reach not recorded",
            qual: reachCount > 0 ? "Student-reported unique reach" : "Beneficiary count not supplied",
        },
        {
            value: firstOutput ? String(firstOutput.quantity) : String(outputRows.length || "—"),
            label: firstOutput ? nice(firstOutput.title || firstOutput.type || "output") : "outputs recorded",
            qual: outputRows.length ? "Student-reported output" : "No quantified outputs",
        },
        {
            value: outputRows.length > 1 ? String(outputRows.length) : fmtNum(acts.length || "—"),
            label: outputRows.length > 1 ? "output lines" : "activities logged",
            qual: acts.length ? "From Section 4" : "No activity blocks",
        },
        {
            value: hours > 0 ? `${hoursLabel(hours)} <small>h</small>` : "—",
            label: "team-hours logged",
            qual: `${data.required_hours || 16} h required per member`,
        },
        {
            value: pkr > 0 ? `${fmtNum(pkr)} <small>PKR</small>` : "—",
            label: pkr > 0 ? "cash reported" : "resources",
            qual: data.section6?.use_resources === "no" ? "No cash resources used" : pkr > 0 ? "From Section 5 resources" : "No PKR amount recorded",
        },
    ];

    const sessionTypes = Array.from(new Set(logs.map((log) => nice(log.activity_type)).filter(Boolean))).slice(0, 3);
    const partners = Array.isArray(data.section7?.partners) ? data.section7.partners : [];
    const skills = [
        ...(Array.isArray(data.section9?.skills_grown) ? data.section9.skills_grown : []).map((s) => nice(String(s).replace(/^[^\p{L}\p{N}]+/u, ""))),
        pickString(data.section9?.skills_grown_other),
    ].filter((s) => s && !/^other/i.test(s));
    const competencyScores = Object.values(data.section9?.competency_scores || {}).filter((n) => typeof n === "number" && n > 0) as number[];
    const competencyAvg =
        competencyScores.length > 0
            ? (competencyScores.reduce((sum, n) => sum + n, 0) / competencyScores.length).toFixed(2)
            : "";
    const continuation = pickString(data.section10?.continuation_details, data.section10?.summary_text);
    const continuationChip = ({ yes: "Continues", partially: "Partly continues", no: "Will not continue" } as Record<string, string>)[
        String(data.section10?.continuation_status || "").toLowerCase()
    ] || "";

    const tiles: ImpactPackageTile[] = [
        {
            n: 1,
            title: "Participation",
            text:
                logs.length > 0
                    ? `${logs.length} dated session${logs.length === 1 ? "" : "s"} record the team’s field work. Each member’s required hours remain visible.`
                    : "Session log is empty. Hours still show against the opportunity minimum.",
            chips: members.map((row) =>
                row.hours >= row.required
                    ? { text: `${row.name} ${hoursLabel(row.hours)} / ${row.required} h` }
                    : { text: `${row.name} ${hoursLabel(row.hours)} / ${row.required} h · remaining`, cls: "warn" },
            ),
        },
        {
            n: 2,
            title: "Context & baseline",
            text:
                firstSentence(pickString(data.section2?.problem_statement, data.section2?.summary_text, data.section2?.affected_group)) ||
                "Baseline problem statement was not supplied.",
            chips: [
                ...((Array.isArray(data.section2?.baseline_evidence) ? data.section2.baseline_evidence : []).slice(0, 3).map((item) => ({ text: nice(item) }))),
                pickString(data.section2?.primary_beneficiary, data.section2?.affected_group)
                    ? { text: pickString(data.section2?.primary_beneficiary, data.section2?.affected_group) }
                    : null,
            ].filter(Boolean) as ImpactPackageChip[],
        },
        {
            n: 3,
            title: "SDG contribution",
            text:
                firstSentence(pickString(data.section3?.student_contribution_intent_statement, data.section3?.contribution_intent_statement)) ||
                (sdgs.length ? `${sdgs.length} SDG${sdgs.length === 1 ? "" : "s"} registered on this report.` : "No SDG mapping supplied."),
            chips: sdgs.slice(0, 4).map((row) => {
                const goal = Number(row.goalNumber);
                const sdg = Number.isFinite(goal) ? findSdgById(String(goal)) : null;
                return {
                    text: Number.isFinite(goal) ? `${goal} · ${sdg?.title || row.title || "SDG"}` : String(row.title || "SDG"),
                    cls: Number.isFinite(goal) ? sdgChipClass(goal) : "goal",
                };
            }),
        },
        {
            n: 4,
            title: "Activities & outcomes",
            text:
                firstSentence(pickString(data.section5?.observed_change, data.section4?.summary_text, acts[0]?.title)) ||
                "No activity or outcome narrative supplied.",
            chips: [
                acts[0]?.title ? { text: acts[0].title } : null,
                numericChange ? { text: `${fmtNum(numericChange.before)} → ${fmtNum(numericChange.after)}` } : { text: "Before–after not quantified", cls: "warn" },
            ].filter(Boolean) as ImpactPackageChip[],
        },
        {
            n: 5,
            title: "Resources",
            text:
                data.section6?.use_resources === "no"
                    ? "The team reported no cash or in-kind resources for this project."
                    : pkr > 0
                      ? `PKR ${fmtNum(pkr)} recorded against resource lines.`
                      : firstSentence(pickString(data.section6?.summary_text)) || "No resource amounts recorded.",
            chips: (data.section6?.resources || [])
                .flatMap((row) => (Array.isArray(row.sources) ? row.sources : []))
                .filter(Boolean)
                .slice(0, 3)
                .map((src) => ({ text: nice(src) })),
        },
        {
            n: 6,
            title: "Partnerships",
            text:
                partners.length > 0
                    ? partners
                          .map((p) => pickString(p.name))
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("; ") || "Partner entries are present."
                    : data.section7?.has_partners === "no"
                      ? "No additional partner entry is supplied."
                      : "Partnerships were not recorded.",
            chips: partners.slice(0, 3).flatMap((p) => {
                const roles = Array.isArray((p as { roles?: unknown }).roles) ? ((p as { roles?: string[] }).roles || []) : [];
                return [p.type ? { text: nice(p.type) } : null, ...roles.slice(0, 2).map((role) => ({ text: nice(role) }))].filter(Boolean) as ImpactPackageChip[];
            }),
        },
        {
            n: 7,
            title: "Evidence & consent",
            text: `${files.length} evidence ${files.length === 1 ? "entry" : "entries"} share one setting. One project-level choice applies to every file.`,
            chips: [
                { text: `All evidence · ${MEDIA_VISIBILITY_LABELS[effectiveVisibility]}`, cls: effectiveVisibility === "public" ? "" : "warn" },
                visibility === "public" && !publicConsent
                    ? { text: "Public permission pending", cls: "warn" }
                    : effectiveVisibility === "private"
                      ? { text: "Internal verification only" }
                      : effectiveVisibility === "restricted"
                        ? { text: "Approval-gated internal view" }
                        : { text: "Public permission confirmed" },
            ],
        },
        {
            n: 8,
            title: "Reflection & learning",
            text:
                firstSentence(pickString(data.section9?.reflection_biggest_learning, data.section9?.personal_learning, data.section9?.summary_text, data.section9?.academic_application)) ||
                "Reflection narrative was not supplied. Ratings are self-assessments.",
            chips: [
                ...skills.slice(0, 3).map((s) => ({ text: s })),
                competencyAvg ? { text: `${competencyAvg} / 5 average` } : null,
            ].filter(Boolean) as ImpactPackageChip[],
        },
        {
            n: 9,
            title: "Sustainability",
            text: firstSentence(continuation) || "Sustainability / continuation answer was not supplied.",
            chips: [continuationChip ? { text: continuationChip } : { text: "Continuation not classified", cls: "warn" }],
        },
    ];

    if (sessionTypes.length && tiles[0].chips.length < 4) {
        sessionTypes.forEach((t) => tiles[0].chips.push({ text: t }));
    }

    const changeEyebrow = numericChange
        ? /attend/i.test(numericChange.label)
            ? "Reported attendance change"
            : `Reported ${numericChange.label} change`.replace(/\s+/g, " ")
        : "Measured change";

    return {
        projectId: pickString(data.project_id, opportunity.id, data.report_id, data.id),
        reportId: pickString(data.report_id, data.id, data.project_id),
        title,
        headline: displayHeadline(title),
        projectName: title,
        story,
        heroMeta,
        changeEyebrow,
        statusTitle,
        statusDetail,
        metrics,
        change: numericChange,
        tiles,
        visibility,
        visibilityLabel: MEDIA_VISIBILITY_LABELS[effectiveVisibility],
        publicConsent,
        effectiveVisibility,
        files,
        adminApproved,
        submitted,
        ciiLabel: cii.source === "faculty_locked" && cii.totalScore != null ? `CII ${cii.totalScore}/100` : "CII: not issued",
        ciiPending: cii.source !== "faculty_locked",
        sectionsComplete: 0,
        sectionsTotal: 9,
    };
}

export function impactPackageCanViewEvidence(audience: ImpactPackageAudience, visibility: MediaVisibility): boolean {
    if (visibility === "public") return true;
    if (audience === "student" || audience === "admin") return true;
    if (audience === "faculty" || audience === "university") return true;
    return false;
}

export function impactPackageCanDownload(audience: ImpactPackageAudience, visibility: MediaVisibility, publicConsent: boolean): boolean {
    return visibility === "public" && publicConsent && impactPackageCanViewEvidence(audience, visibility);
}

export function impactPackageAccessText(audience: ImpactPackageAudience, visibility: MediaVisibility, adminApproved: boolean): string {
    if (visibility === "public") return "Anyone viewing the published project can see the evidence.";
    const internal = adminApproved
        ? "Student, Super Admin, Faculty and University · view only"
        : "Student and Super Admin · view only. Faculty and University unlock after super-admin approval";
    if (visibility === "private") return `${internal}. Internal verification only; never published. Downloads are blocked for everyone.`;
    return `${internal}. Not shown publicly. Partner / NGO stay locked and all downloads are blocked.`;
}

export function impactPackageLockLine(adminApproved: boolean): string {
    return adminApproved ? "Evidence verified — not publicly available" : "Evidence pending verification — not publicly available";
}


function ciiHasFinal(data: ReportData): boolean {
    const final = (data.ciiV2 as { final?: unknown } | null | undefined)?.final;
    return typeof final === "number"
        ? Number.isFinite(final)
        : typeof final === "string" && final.trim() !== "" && Number.isFinite(Number(final));
}

/** Analysis exists and CIEL PK Admin has locked it. */
export function hasImpactPackageAnalysis(data: ReportData): boolean {
    const lock = data.ciiV2Lock as { locked?: unknown } | null | undefined;
    const locked = lock?.locked === true || lock?.locked === "true";
    return Boolean(locked && ciiHasFinal(data));
}

/** Partner / NGO never see the analysis report. Student / faculty / university see it after Super Admin approval. Admin sees it when attached. */
export function shouldShowImpactPackageAnalysis(audience: ImpactPackageAudience, data: ReportData): boolean {
    if (audience === "partner" || audience === "public") return false;
    // Admin can open the analysis as soon as the analyser has produced a score (before locking).
    if (audience === "admin") return ciiHasFinal(data);
    if (!hasImpactPackageAnalysis(data)) return false;
    const st = String(data.admin_status || data.admin_approval_status || data.status || "").toLowerCase();
    return st === "approved" || st === "verified";
}

/** Student sees the compiled detailed report only after Super Admin approval. Faculty / admin / university / partner keep it for review. */
export function shouldShowImpactPackageDetailedReport(audience: ImpactPackageAudience, adminApproved: boolean): boolean {
    if (audience === "student") return adminApproved;
    return true;
}
