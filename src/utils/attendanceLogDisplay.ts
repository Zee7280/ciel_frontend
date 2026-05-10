import { normalizeEngagementAttendanceLog } from "@/utils/engagementAttendanceMap";

function firstNonBlank(...vals: unknown[]): string {
    for (const v of vals) {
        if (typeof v === "string") {
            const t = v.trim();
            if (t) return t;
        }
    }
    return "";
}

function engagementParticipantBareId(id: string | undefined | null): string {
    if (!id) return "";
    if (id.startsWith("lead:")) return id.slice("lead:".length);
    const m = /^member:\d+:(.+)$/.exec(id);
    if (m?.[1]) return m[1];
    return id;
}

/** Names keyed by `lead:uuid`, `member:i:uuid`, bare uuid (aligned with Section 1 attendance). */
export function buildSection1AttendanceParticipantNameMap(data: {
    section1?: {
        team_lead?: { id?: string | null; fullName?: string | null; name?: string | null };
        team_members?: Array<{
            id?: string;
            participantId?: string;
            fullName?: string | null;
            name?: string | null;
        }>;
    };
    student?: { id?: string; name?: string | null };
}): Record<string, string> {
    const map: Record<string, string> = {};
    const s1 = data.section1;
    if (!s1) return map;

    const lead = s1.team_lead;
    if (lead?.id) {
        const n =
            firstNonBlank(lead.fullName, lead.name) || "Team lead";
        map[lead.id] = n;
        map[`lead:${lead.id}`] = n;
    }

    (s1.team_members ?? []).forEach((m, i) => {
        const id = m?.id || m?.participantId;
        if (!id) return;
        const n = firstNonBlank(m.fullName, m.name) || `Team member ${i + 1}`;
        map[id] = n;
        map[`member:${i}:${id}`] = n;
    });

    if (data.student?.id && data.student?.name?.trim()) {
        map[data.student.id] = data.student.name.trim();
    }

    return map;
}

export function resolveAttendanceParticipantLabel(
    participantId: string | undefined | null,
    participantNames: Record<string, string>,
): string {
    if (!participantId) return "—";
    const trimmedMap = (k: string) => (participantNames[k] || "").trim();
    const direct = trimmedMap(participantId);
    if (direct) return direct;
    const bare = engagementParticipantBareId(participantId);
    if (bare && trimmedMap(bare)) return trimmedMap(bare);
    for (const [key, name] of Object.entries(participantNames)) {
        const n = (name || "").trim();
        if (!n) continue;
        if (engagementParticipantBareId(key) === bare) return n;
    }
    return "Team member";
}

function evidenceLinkLabel(href: string): string {
    try {
        if (href.startsWith("http")) {
            const u = new URL(href);
            const last = u.pathname.split("/").filter(Boolean).pop();
            if (last) return decodeURIComponent(last);
        }
        const last = href.split(/[/?#]/).filter(Boolean).pop();
        return last ? decodeURIComponent(last) : "Evidence";
    } catch {
        return "Evidence";
    }
}

function isNativeFile(value: unknown): value is File {
    return typeof File !== "undefined" && value instanceof File;
}

export function resolveAttendanceEvidenceHrefFromLog(norm: Record<string, unknown>): string | null {
    const evidence = norm.evidence_file;
    if (typeof evidence === "string" && evidence.trim()) return evidence.trim();
    const ex = norm as { evidence_url?: string; evidenceUrl?: string };
    for (const v of [ex.evidence_url, ex.evidenceUrl]) {
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    if (evidence && typeof evidence === "object" && !Array.isArray(evidence) && !isNativeFile(evidence)) {
        const o = evidence as Record<string, unknown>;
        for (const k of ["url", "href", "path", "fileUrl", "file_url", "publicUrl", "public_url"]) {
            const v = o[k];
            if (typeof v === "string" && v.trim()) return v.trim();
        }
    }
    return null;
}

export function formatAttendanceLogDate(dateStr: string): string {
    if (!dateStr) return "—";
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime())
        ? trimmed
        : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function pickSessionDescription(norm: Record<string, unknown>): string {
    for (const k of ["description", "session_description", "sessionDescription"]) {
        const v = norm[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function pickLocationLines(norm: Record<string, unknown>): string {
    const loc = firstNonBlank(
        norm.location as string,
        norm.organizationName as string,
        (norm as { organization_name?: string }).organization_name,
    );
    const pin = firstNonBlank(norm.location_pin as string, (norm as { locationPin?: string }).locationPin);
    if (loc && pin) return `${loc}\n${pin}`;
    return loc || pin || "—";
}

function approvalLabel(norm: Record<string, unknown>): string {
    const raw = norm.approval_status ?? norm.entryStatus ?? norm.entry_status;
    if (raw == null || String(raw).trim() === "") return "Legacy / verified";
    const s = String(raw).trim().toLowerCase();
    if (s === "pending") return "Pending review";
    if (s === "approved") return "Approved";
    if (s === "rejected") return "Rejected";
    if (s === "flagged") return "Flagged";
    if (s === "verified") return "Verified";
    return s.replace(/_/g, " ");
}

export type NormalizedAttendanceLogRow = Record<string, unknown> & {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
};

export function normalizeAttendanceLogsForDisplay(rawLogs: unknown): NormalizedAttendanceLogRow[] {
    if (!Array.isArray(rawLogs)) return [];
    return rawLogs.map((item) => {
        const rec = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
        return normalizeEngagementAttendanceLog(rec) as NormalizedAttendanceLogRow;
    });
}

export { evidenceLinkLabel };

export function describeEvidenceCell(norm: NormalizedAttendanceLogRow): { href: string | null; label: string } {
    const href = resolveAttendanceEvidenceHrefFromLog(norm);
    const uploaded =
        norm.evidenceUploaded === true ||
        norm.evidenceUploaded === "true" ||
        norm.evidence_uploaded === true ||
        norm.evidence_file === true;
    if (href) return { href, label: evidenceLinkLabel(href) };
    if (uploaded) return { href: null, label: "Uploaded (URL not stored)" };
    const ef = norm.evidence_file;
    if (isNativeFile(ef)) return { href: null, label: ef.name || "Local file" };
    if (ef && typeof ef === "object") return { href: null, label: "Evidence attached" };
    return { href: null, label: "—" };
}

export function pickApprovalRemark(norm: Record<string, unknown>): string {
    const candidates = [
        norm.approval_remark,
        norm.approvalActionReason,
        norm.approval_action_reason,
        norm.rejection_reason,
    ];
    for (const c of candidates) {
        if (typeof c === "string" && c.trim()) return c.trim();
    }
    return "";
}

export function buildAttendanceTableRows(
    rawLogs: unknown,
    participantNames: Record<string, string>,
): Array<{
    id: string;
    dateDisplay: string;
    timeRange: string;
    location: string;
    activity: string;
    description: string;
    hours: string;
    participant: string;
    participantIdRaw: string;
    approval: string;
    remark: string;
    evidenceHref: string | null;
    evidenceLabel: string;
}> {
    return normalizeAttendanceLogsForDisplay(rawLogs).map((norm, idx) => {
        const hoursRaw = norm.hours;
        const hours =
            typeof hoursRaw === "number" && Number.isFinite(hoursRaw)
                ? String(hoursRaw)
                : typeof hoursRaw === "string"
                  ? hoursRaw
                  : "—";
        const ev = describeEvidenceCell(norm);
        const pid = norm.participantId != null ? String(norm.participantId) : "";
        return {
            id: String(norm.id || `att-row-${idx}`),
            dateDisplay: formatAttendanceLogDate(String(norm.date ?? "")),
            timeRange: [norm.start_time, norm.end_time].filter(Boolean).join(" — ") || "—",
            location: pickLocationLines(norm),
            activity: firstNonBlank(norm.activity_type as string, (norm as { activityType?: string }).activityType) || "—",
            description: pickSessionDescription(norm) || "—",
            hours,
            participant: resolveAttendanceParticipantLabel(pid, participantNames),
            participantIdRaw: pid || "—",
            approval: approvalLabel(norm),
            remark: pickApprovalRemark(norm),
            evidenceHref: ev.href,
            evidenceLabel: ev.label,
        };
    });
}
