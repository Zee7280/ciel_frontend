import { sdgData } from "@/utils/sdgData";
import {
    type CourseProjectEntry,
    type CourseProjectSectionSummaries,
    courseProjectMetricLine,
    normalizeGroupMembers,
    rankMovement,
    resolveSectionSummaries,
    stripBoldMarkup,
    stripEmoji,
} from "@/utils/courseProjectTypes";

export const FLASH_SECTIONS: { key: keyof CourseProjectSectionSummaries; emoji: string; label: string }[] = [
    { key: "course", emoji: "📌", label: "Course & context" },
    { key: "assignment", emoji: "🚀", label: "The work" },
    { key: "aims", emoji: "🎯", label: "Aims & objectives" },
    { key: "process", emoji: "🛠️", label: "Process & method" },
    { key: "results", emoji: "📦", label: "Results, evidence & outcomes" },
    { key: "sdg", emoji: "🌍", label: "SDG mapping" },
    { key: "reflection", emoji: "💡", label: "Reflection & what's next" },
];

export type FlashHighlight = {
    emoji: string;
    label: string;
    value: string;
    color: string;
    wide?: boolean;
};

export function formatFlashDate(iso?: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function courseworkRecordCode(entry: CourseProjectEntry): string {
    const year = entry.createdAt ? new Date(entry.createdAt).getFullYear() : new Date().getFullYear();
    const raw = (entry.verificationPublicSlug || entry.id || "").replace(/-/g, "");
    const tail = raw.slice(-4).toUpperCase().padStart(4, "0");
    return `CW-${year}-${tail}`;
}

export function courseworkApprovedFiles(entry: CourseProjectEntry): string[] {
    return [...(entry.assignmentFileUrl ? [entry.assignmentFileUrl] : []), ...(entry.evidenceUrls || [])].filter(Boolean);
}

export function fileNameFromUrl(url: string): string {
    try {
        const name = decodeURIComponent(new URL(url, "https://local.invalid").pathname.split("/").pop() || "");
        return name || "Attached file";
    } catch {
        return "Attached file";
    }
}

export function courseworkPrimaryTargetLabel(entry: CourseProjectEntry): string | null {
    const en = entry.sdgMapping?.entries?.[0];
    const tid = en?.targets?.[0];
    if (!en || !tid) return null;
    const sdg = sdgData.find((s) => s.number === en.goalNumber);
    const target = sdg?.targets.find((t) => t.id === tid);
    return target ? `${tid} ${target.description}` : tid;
}

export function courseworkFlashHeadline(entry: CourseProjectEntry): string {
    const finding = entry.resultsInfo?.findings?.[0]?.trim();
    if (finding) return finding;
    if (entry.resultsInfo?.outputDescription?.trim()) return entry.resultsInfo.outputDescription.trim();
    return entry.projectTitle || "Coursework sustainability record";
}

export function courseworkFlashStatement(entry: CourseProjectEntry): string {
    const sm = resolveSectionSummaries(entry);
    const parts = [sm.assignment, sm.aims, sm.process, sm.results, sm.sdg, sm.reflection]
        .map((t) => stripBoldMarkup((t || "").trim()))
        .filter(Boolean);
    return parts.join(" ") || courseworkFlashHeadline(entry);
}

export function courseworkFlashHighlights(entry: CourseProjectEntry): FlashHighlight[] {
    const ai = entry.assignmentInfo || {};
    const am = entry.aimsInfo || {};
    const re = entry.resultsInfo || {};
    const sm = entry.sdgMapping || {};
    const rf = entry.reflectionInfo || {};
    const formatLabels = (ai.formats?.length ? ai.formats : ai.format ? [ai.format] : []).map((f) =>
        stripEmoji(f).split(" (")[0].toLowerCase(),
    );
    const outs = (re.outputs || []).map(stripEmoji).filter(Boolean);
    const primary = sm.entries?.[0];
    const support = (sm.entries || []).slice(1);
    const sdg = primary ? sdgData.find((s) => s.number === primary.goalNumber) : undefined;
    const metric = (re.metrics || [])[0];
    const limitation = re.limitationType === "Other — describe below" ? re.limitationOther : re.limitationType;

    const items: FlashHighlight[] = [];
    if (entry.projectTitle) {
        items.push({
            emoji: "🚀",
            label: "The work",
            value: `${entry.projectTitle}${formatLabels.length ? ` · ${formatLabels.join(" and ")}` : ""}`,
            color: "#2563eb",
        });
    }
    if (am.aimStatement?.trim()) {
        items.push({ emoji: "🎯", label: "Aim", value: am.aimStatement.trim(), color: "#7c3aed" });
    }
    const output = re.outputDescription?.trim() || (outs.length ? outs.join(", ") : "");
    if (output) items.push({ emoji: "📦", label: "Output", value: output, color: "#ea580c" });
    if (re.findings?.[0]) items.push({ emoji: "💡", label: "Key finding", value: re.findings[0], color: "#db2777" });

    let evidence = "";
    if (metric?.name) {
        if (metric.value) {
            const unit = metric.unit === "Percentage (%)" ? "%" : metric.unit === "Other" ? metric.unitOther || "" : metric.unit || "";
            const status = metric.status ? metric.status.split(" — ")[0].toLowerCase() : "";
            evidence = `<b>${metric.value}${unit}</b> ${metric.name}${metric.sample ? ` · ${metric.sample}` : ""}${status ? ` · ${status}` : ""}`;
        } else {
            evidence = courseProjectMetricLine(metric);
        }
    } else if (re.evidenceStatus) {
        evidence = re.evidenceStatus;
    } else if (re.measured) {
        evidence = stripEmoji(re.measured);
    }
    if (evidence) items.push({ emoji: "📊", label: "Evidence", value: evidence, color: "#16a34a" });
    if (limitation) {
        items.push({
            emoji: "⚠️",
            label: "Limitation",
            value: `${stripEmoji(limitation)}${re.limitationDetail ? ` — ${re.limitationDetail}` : ""}`,
            color: "#dc2626",
        });
    }

    if (sm.notApplicable) {
        items.push({ emoji: "🌍", label: "SDG link", value: "None — declared not applicable", color: "#3F7E44" });
    } else if (primary) {
        const extra = support.length ? ` + SDG ${support.map((s) => s.goalNumber).join(", ")}` : "";
        const targets = primary.targets.length ? ` · ${primary.targets.join(", ")}` : "";
        items.push({
            emoji: "🌍",
            label: "SDG link",
            value: `<b>SDG ${primary.goalNumber}</b>${sdg ? ` ${sdg.title}` : ""}${targets}${extra}`,
            color: "#3F7E44",
        });
    }

    const integration = rf.integrationLevel || rf.sdgLinkHonesty;
    if (integration) items.push({ emoji: "🌱", label: "Integration", value: stripEmoji(integration), color: "#0f766e" });
    if (rf.nextSteps || rf.whatsNext) {
        items.push({
            emoji: "🔭",
            label: "What's next",
            value: [rf.nextSteps ? stripEmoji(rf.nextSteps) : "", rf.whatsNext].filter(Boolean).join(" — "),
            color: "#14202b",
        });
    }
    if (rf.adviceNextSemester?.trim()) {
        const advice = rf.adviceNextSemester.trim().replace(/^["“]|["”]$/g, "");
        items.push({ emoji: "🗣️", label: "Advice to next class", value: `“${advice}”`, color: "#c98a04", wide: true });
    }
    return items;
}

export function courseworkFlashMetaLine(entry: CourseProjectEntry): string {
    const si = entry.studentInfo || {};
    const ai = entry.assignmentInfo || {};
    const primaryFormat = ai.formats?.[0] ?? ai.format;
    const format = primaryFormat ? stripEmoji(primaryFormat).split(" (")[0].toUpperCase() : "REPORT";
    const members = normalizeGroupMembers(si.groupMembers).map((m) => m.name).filter(Boolean);
    const isTeam = !!si.teamMode && !/individual|solo/i.test(si.teamMode);
    const who = isTeam && members.length ? `Group — ${[si.studentName, ...members].filter(Boolean).join(", ")}` : `${si.studentName || "Student"} · Individual`;
    const batch = entry.createdAt ? new Date(entry.createdAt).getFullYear() : "";
    return [
        format,
        entry.course,
        si.programme,
        si.semester,
        who,
        si.universityName,
        batch ? `Batch ${batch}` : "",
    ]
        .filter(Boolean)
        .join(" · ");
}

export function courseworkApprovedMetaLine(entry: CourseProjectEntry): string {
    const si = entry.studentInfo || {};
    const members = normalizeGroupMembers(si.groupMembers).map((m) => m.name).filter(Boolean);
    const isTeam = !!si.teamMode && !/individual|solo/i.test(si.teamMode);
    const who = isTeam && members.length ? `Group — ${[si.studentName, ...members].filter(Boolean).join(", ")}` : si.studentName || "Student";
    const batch = entry.createdAt ? new Date(entry.createdAt).getFullYear() : "";
    const approvedOn = formatFlashDate(entry.facultyApprovalAt);
    return [
        courseworkRecordCode(entry),
        entry.course,
        si.programme,
        who,
        si.department || si.disciplineName,
        si.universityName,
        batch ? `Batch ${batch}` : "",
        si.teacherName ? `Approved by ${si.teacherName}${approvedOn ? ` ${approvedOn}` : ""}` : approvedOn ? `Approved ${approvedOn}` : "",
    ]
        .filter(Boolean)
        .join(" · ");
}

export function courseworkRibbonBadgeClass(scope?: string): "fac" | "uni" | "live" {
    const s = (scope || "").toLowerCase();
    if (s.includes("faculty")) return "fac";
    if (s.includes("university")) return "uni";
    return "live";
}

export function courseworkHistoryLines(entry: CourseProjectEntry): string[] {
    const lines: string[] = [];
    if (entry.createdAt) lines.push(`${formatFlashDate(entry.createdAt)} — Record started`);
    if (entry.updatedAt && entry.updatedAt !== entry.createdAt) {
        lines.push(`${formatFlashDate(entry.updatedAt)} — Last updated`);
    }
    if (entry.facultyApprovalAt) {
        lines.push(`${formatFlashDate(entry.facultyApprovalAt)} — Faculty approved — flashcard published to Student, Faculty, University and CIEL PK`);
    }
    return lines;
}

export function courseworkRankTrend(entry: CourseProjectEntry): { symbol: string; kind: "UP" | "DOWN" | "SAME" | "NEW" } | null {
    const move = rankMovement(entry.meritRibbon);
    if (!move) return null;
    if (move.symbol === "↑") return { symbol: "▲", kind: "UP" };
    if (move.symbol === "↓") return { symbol: "▼", kind: "DOWN" };
    if (move.symbol === "•") return { symbol: "✦", kind: "NEW" };
    return { symbol: "▬", kind: "SAME" };
}
