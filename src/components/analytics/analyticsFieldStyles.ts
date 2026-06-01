export const ANALYTICS_CHART_COLORS = [
    "#6366f1",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#14b8a6",
    "#f97316",
] as const;

export function statusTone(label: string): "success" | "warning" | "danger" | "neutral" {
    const s = label.toLowerCase();
    if (/complete|verified|linked|unlocked|standard|ok|yes|enabled|configured|audit.?ready/.test(s)) {
        return "success";
    }
    if (/progress|pending|warning|mode|partial|in.?progress/.test(s)) return "warning";
    if (/fail|not|locked|duplicate|red.?flag|no/.test(s)) return "danger";
    return "neutral";
}

export function toneClasses(tone: ReturnType<typeof statusTone>): string {
    switch (tone) {
        case "success":
            return "bg-emerald-50 text-emerald-700 ring-emerald-200";
        case "warning":
            return "bg-amber-50 text-amber-800 ring-amber-200";
        case "danger":
            return "bg-rose-50 text-rose-700 ring-rose-200";
        default:
            return "bg-slate-100 text-slate-700 ring-slate-200";
    }
}

export function progressBarColor(percent: number): string {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 60) return "bg-indigo-500";
    if (percent >= 30) return "bg-amber-500";
    return "bg-rose-500";
}
