import type { ReportData } from "@/app/dashboard/student/report/context/ReportContext";

export type LockedV17ClaimState =
    | "Supports Claim"
    | "Partially Supports"
    | "Cannot Verify"
    | "Unrelated"
    | "Contradicts";

export type LockedV17EvidenceItem = {
    name: string;
    url: string;
    kind: string;
    supports: string;
    caption: string;
    state: LockedV17ClaimState;
    finding: string;
    inspected: boolean;
    verified: boolean;
};

export type LockedV17AttendanceMember = {
    name: string;
    hours: number;
    required: number;
    met: boolean;
};

export type LockedV17AttendanceSession = {
    date: string;
    member: string;
    hours: number;
    location: string;
    type: string;
    description: string;
    verified: boolean;
};

export type LockedV17ClaimRow = {
    category: string;
    text: string;
    files: string;
    state: string;
    confidence: string;
    finding: string;
};

export type LockedV17SourceTabs = {
    evidenceItems: LockedV17EvidenceItem[];
    claimCoverage: number;
    attendanceMembers: LockedV17AttendanceMember[];
    attendanceSessions: LockedV17AttendanceSession[];
    personHours: number;
    analyzerReady: boolean;
    evidenceConfidence: string;
    badgeReadiness: string;
    levelLabel: string;
    whyBadge: string;
    whyNotHigher: string;
    strengths: string[];
    needs: string[];
    claimCounts: Record<LockedV17ClaimState, number>;
    claimIssues: string[];
    inspectedCount: number;
    claimRows: LockedV17ClaimRow[];
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function txt(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function num(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return 0;
}

function fileName(url: string, fallback = "Evidence"): string {
    const clean = url.split("?")[0] || "";
    const raw = clean.split("/").filter(Boolean).pop() || fallback;
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw || fallback;
    }
}

function fileKind(name: string, url: string): string {
    const blob = `${name} ${url}`.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(blob) || /photo|image/.test(blob)) return "photo";
    if (/\.(mp4|mov|webm)(\?|$)/i.test(blob) || /video/.test(blob)) return "video";
    if (/\.pdf(\?|$)/i.test(blob)) return "pdf";
    return "doc";
}

function claimArea(name: string, source: string): string {
    const blob = `${name} ${source}`.toLowerCase();
    if (/attend|session|hour|participation/.test(blob)) return "Participation";
    if (/receipt|invoice|resource|fund|cash|donat/.test(blob) || source.includes("section6")) return "Resources";
    if (/partner|mou|agreement/.test(blob) || source.includes("section7")) return "Partnerships";
    if (/survey|feedback|outcome|baseline|endline|quiz|checklist/.test(blob)) return "Outcomes";
    if (/sustain|handover|continu/.test(blob)) return "Sustainability";
    if (/photo|workshop|activit|session|install/.test(blob)) return "Activities";
    if (source.includes("attendance")) return "Participation";
    return "Evidence";
}

function verdictToState(verdict: string): LockedV17ClaimState {
    const key = verdict.trim().toUpperCase().replace(/[\s_]+/g, "_");
    // v2 verdicts (MATCH/PARTIAL/MISMATCH) and v4.5 `supportStatus` values
    // (SUPPORTED/PARTIALLY_SUPPORTED/UNSUPPORTED/CONTRADICTED/PROCESSING_REQUIRED) both land here.
    if (key === "MATCH" || key === "SUPPORTS" || key === "SUPPORTED") return "Supports Claim";
    if (key === "PARTIAL" || key === "PARTIALLY_SUPPORTS" || key === "PARTIALLY_SUPPORTED") return "Partially Supports";
    if (key === "UNRELATED" || key === "UNSUPPORTED") return "Unrelated";
    if (key === "CONTRADICTS" || key === "MISMATCH" || key === "CONTRADICTED") return "Cannot Verify";
    return "Cannot Verify";
}

function pushUrl(
    into: Map<string, LockedV17EvidenceItem>,
    value: unknown,
    source: string,
    ciiByFile: Map<string, { state: LockedV17ClaimState; finding: string; inspected: boolean }>,
) {
    if (!value) return;
    if (typeof value === "string") {
        const url = value.trim();
        if (!url || url === "undefined" || into.has(url)) return;
        if (!/^https?:\/\//i.test(url) && !url.startsWith("data:")) return;
        const name = fileName(url);
        const kind = fileKind(name, url);
        const supports = claimArea(name, source);
        const hit = ciiByFile.get(name.toLowerCase()) || ciiByFile.get(url.toLowerCase());
        into.set(url, {
            name,
            url,
            kind,
            supports,
            caption: "",
            state: hit?.state || "Cannot Verify",
            finding: hit?.finding || "Uploaded file is on the locked record. Content inspection is still required before this item is treated as proof.",
            inspected: Boolean(hit?.inspected),
            verified: Boolean(hit),
        });
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) pushUrl(into, item, source, ciiByFile);
        return;
    }
    const rec = asRecord(value);
    const url =
        txt(rec.url, rec.evidence_url, rec.file_url, rec.src, rec.href, rec.path) ||
        (typeof rec === "string" ? rec : "");
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("data:")) return;
    if (into.has(url)) return;
    const name = txt(rec.name, rec.label, rec.fileName, rec.filename) || fileName(url);
    const kind = txt(rec.kind, rec.type) || fileKind(name, url);
    const supports = txt(rec.supports, rec.claim) || claimArea(name, source);
    const hit = ciiByFile.get(name.toLowerCase()) || ciiByFile.get(url.toLowerCase());
    into.set(url, {
        name,
        url,
        kind,
        supports,
        caption: txt(rec.caption, rec.description),
        state: hit?.state || "Cannot Verify",
        finding: hit?.finding || "Uploaded file is on the locked record. Content inspection is still required before this item is treated as proof.",
        inspected: Boolean(hit?.inspected),
        verified: Boolean(hit) || rec.verified === true,
    });
}

function emptyCounts(): Record<LockedV17ClaimState, number> {
    return {
        "Supports Claim": 0,
        "Partially Supports": 0,
        "Cannot Verify": 0,
        Unrelated: 0,
        Contradicts: 0,
    };
}

/** Safe empty package so Flashcard / Detailed Report still open if source-tab parsing fails. */
export function emptyLockedV17SourceTabs(): LockedV17SourceTabs {
    return {
        evidenceItems: [],
        claimCoverage: 0,
        attendanceMembers: [],
        attendanceSessions: [],
        personHours: 0,
        analyzerReady: false,
        evidenceConfidence: "Not Assessable",
        badgeReadiness: "Analyzer not run",
        levelLabel: "Pending Faculty review",
        whyBadge: "Run the Analyzer on this locked package to generate a provisional CII.",
        whyNotHigher: "The next level requires stronger outcomes, evidence and sustainability — not simply more activity.",
        strengths: ["Pending Analyzer / Faculty moderation."],
        needs: ["Pending Analyzer / Faculty moderation."],
        claimCounts: emptyCounts(),
        claimIssues: [],
        inspectedCount: 0,
        claimRows: [],
    };
}

export function buildLockedV17SourceTabs(
    data: ReportData,
    assessment: Array<{ name: string; score: string; max: number }>,
    opts: { ciiLocked: boolean; ciiScore: number | null; badgeLabel: string; overall: string },
): LockedV17SourceTabs {
    try {
        return buildLockedV17SourceTabsUnsafe(data, assessment, opts);
    } catch {
        return emptyLockedV17SourceTabs();
    }
}

function buildLockedV17SourceTabsUnsafe(
    data: ReportData,
    assessment: Array<{ name: string; score: string; max: number }>,
    opts: { ciiLocked: boolean; ciiScore: number | null; badgeLabel: string; overall: string },
): LockedV17SourceTabs {
    const ciiV45 = asRecord((data as unknown as Record<string, unknown>).ciiV45);
    // v4.5's per-file mapping lives in `evidenceAudit` (full admin/faculty shape only — this
    // array is absent from the redacted student/partner/university payload, same as v2's
    // `evidence` was).
    const ciiEvidence = Array.isArray(ciiV45.evidenceAudit) ? ciiV45.evidenceAudit : [];
    const ciiByFile = new Map<string, { state: LockedV17ClaimState; finding: string; inspected: boolean }>();
    for (const row of ciiEvidence) {
        const rec = asRecord(row);
        const file = txt(rec.fileName, rec.file, rec.url, rec.name);
        if (!file) continue;
        const state = verdictToState(txt(rec.supportStatus, rec.verdict));
        const finding =
            txt(rec.explanation, rec.why, rec.claim) || "Analyzer mapped this file to a material claim from the locked report.";
        const inspected = txt(rec.processingStatus).toUpperCase() === "INSPECTED" || Boolean(rec.verdict);
        ciiByFile.set(file.toLowerCase(), { state, finding, inspected });
        ciiByFile.set(fileName(file).toLowerCase(), { state, finding, inspected });
    }

    const files = new Map<string, LockedV17EvidenceItem>();
    const s1 = asRecord(data.section1);
    const s6 = asRecord(data.section6);
    const s7 = asRecord(data.section7);
    const s8 = asRecord(data.section8);
    pushUrl(files, (data as unknown as Record<string, unknown>).evidence_urls, "evidence_urls", ciiByFile);
    pushUrl(files, s8.evidence_files, "section8", ciiByFile);
    pushUrl(files, s8.partner_verification_files, "section8", ciiByFile);
    pushUrl(files, s8.media_urls, "section8", ciiByFile);
    pushUrl(files, s6.evidence_files, "section6", ciiByFile);
    pushUrl(files, s7.formalization_files, "section7", ciiByFile);
    pushUrl(files, s7.partner_verification_files, "section7", ciiByFile);
    const logs = Array.isArray(s1.attendance_logs) ? s1.attendance_logs : [];
    for (const log of logs) {
        const rec = asRecord(log);
        pushUrl(files, rec.evidence_url, "attendance", ciiByFile);
        pushUrl(files, rec.evidence_urls, "attendance", ciiByFile);
        pushUrl(files, rec.evidence_file, "attendance", ciiByFile);
    }
    const evidenceItems = Array.from(files.values());

    const required = Math.max(1, num((data as unknown as Record<string, unknown>).required_hours) || 16);
    const lead = asRecord(s1.team_lead);
    const membersRaw = Array.isArray(s1.team_members) ? s1.team_members : [];
    const student = asRecord((data as unknown as Record<string, unknown>).student);
    const roster: LockedV17AttendanceMember[] = [];
    const leadName = txt(lead.fullName, lead.name, student.name) || "Student";
    const leadHours = num(lead.hours);
    if (txt(s1.participation_type).toLowerCase() === "team" || membersRaw.length) {
        roster.push({
            name: leadName,
            hours: leadHours,
            required,
            met: leadHours >= required,
        });
        for (const row of membersRaw) {
            const rec = asRecord(row);
            const name = txt(rec.fullName, rec.name) || "Member";
            const hours = num(rec.hours);
            roster.push({ name, hours, required, met: hours >= required });
        }
    } else {
        const hoursFromLogs = logs.reduce((sum, log) => {
            const rec = asRecord(log);
            const status = txt(rec.approval_status, rec.approvalStatus).toLowerCase();
            if (status === "rejected") return sum;
            return sum + num(rec.hours);
        }, 0);
        const hours = hoursFromLogs || leadHours;
        roster.push({ name: leadName, hours, required, met: hours >= required });
    }

    const nameByParticipant = new Map<string, string>();
    if (txt(lead.id)) nameByParticipant.set(String(lead.id), leadName);
    membersRaw.forEach((row, index) => {
        const rec = asRecord(row);
        const name = txt(rec.fullName, rec.name) || `Member ${index + 1}`;
        if (txt(rec.id)) nameByParticipant.set(String(rec.id), name);
        if (txt(rec.participantId)) nameByParticipant.set(String(rec.participantId), name);
    });

    const attendanceSessions: LockedV17AttendanceSession[] = logs.map((log) => {
        const rec = asRecord(log);
        const status = txt(rec.approval_status, rec.approvalStatus, rec.entryStatus).toLowerCase();
        const pid = txt(rec.participantId);
        return {
            date: txt(rec.date, rec.dateOfEngagement) || "—",
            member: (pid && nameByParticipant.get(pid)) || txt(rec.member, rec.student_name, rec.studentName) || leadName,
            hours: num(rec.hours),
            location: txt(rec.location, rec.organizationName) || "—",
            type: txt(rec.activity_type, rec.activityType, rec.type) || "Session",
            description: txt(rec.description) || "—",
            verified: status === "approved" || status === "verified" || status === "",
        };
    });

    if (attendanceSessions.length) {
        const hoursByName = new Map<string, number>();
        for (const session of attendanceSessions) {
            hoursByName.set(session.member, (hoursByName.get(session.member) || 0) + session.hours);
        }
        for (const row of roster) {
            const fromLogs = hoursByName.get(row.name);
            if ((row.hours <= 0 || !Number.isFinite(row.hours)) && fromLogs) {
                row.hours = Math.round(fromLogs * 10) / 10;
                row.met = row.hours >= row.required;
            }
        }
        if (roster.length === 1 && roster[0].hours <= 0) {
            const total = attendanceSessions.reduce((sum, session) => sum + session.hours, 0);
            roster[0].hours = Math.round(total * 10) / 10;
            roster[0].met = roster[0].hours >= roster[0].required;
        }
    }

    const personHours = Math.round(roster.reduce((sum, row) => sum + row.hours, 0) * 10) / 10;
    const claimCounts = emptyCounts();
    for (const item of evidenceItems) claimCounts[item.state] += 1;
    const inspectedCount = evidenceItems.filter((item) => item.inspected).length;
    const areas = new Set(evidenceItems.map((item) => item.supports).filter(Boolean));
    const claimCoverage = Math.min(6, areas.size);

    const claimRows: LockedV17ClaimRow[] = evidenceItems.length
        ? evidenceItems.map((item) => ({
              category: item.supports,
              text: item.caption || `${item.name} is attached to the locked report.`,
              files: item.name,
              state: item.state,
              confidence: item.inspected ? "Mapped" : "Pending",
              finding: item.finding,
          }))
        : [];

    const claimIssues: string[] = [];
    if (!evidenceItems.length) {
        claimIssues.push("No evidence files are attached to this locked report.");
    } else if (inspectedCount < evidenceItems.length) {
        claimIssues.push(
            `${inspectedCount}/${evidenceItems.length} evidence file(s) have a recorded Analyzer mapping. Filenames alone are not treated as proof.`,
        );
    }

    const scored = assessment.filter((row) => row.score !== "HOLD");
    const analyzerReady = opts.ciiScore != null || scored.length > 0;
    const ranked = scored
        .map((row) => ({
            label: `${row.name}: ${row.score}/${row.max}`,
            ratio: Number(row.score) / Math.max(1, row.max),
        }))
        .sort((a, b) => b.ratio - a.ratio);
    const strengths = ranked.slice(0, 3).map((row) => row.label);
    const needs = ranked.slice(-3).reverse().map((row) => row.label);
    const evidenceConfidence = !evidenceItems.length
        ? "Not Assessable"
        : inspectedCount === evidenceItems.length
          ? "Moderate"
          : "Not Assessable";
    const badgeReadiness = opts.ciiLocked ? "Faculty-verified" : analyzerReady ? "Review" : "Analyzer not run";
    const levelLabel = opts.ciiScore != null ? opts.badgeLabel : "Pending Faculty review";

    return {
        evidenceItems,
        claimCoverage,
        attendanceMembers: roster,
        attendanceSessions,
        personHours,
        analyzerReady,
        evidenceConfidence,
        badgeReadiness,
        levelLabel,
        whyBadge: analyzerReady
            ? `${opts.badgeLabel} is proposed from the locked Detailed Report after section scoring and quality gates.`
            : "Run the Analyzer on this locked package to generate a provisional CII.",
        whyNotHigher: opts.overall || "The next level requires stronger outcomes, evidence and sustainability — not simply more activity.",
        strengths: strengths.length ? strengths : ["Pending Analyzer / Faculty moderation."],
        needs: needs.length ? needs : ["Pending Analyzer / Faculty moderation."],
        claimCounts,
        claimIssues,
        inspectedCount,
        claimRows,
    };
}
