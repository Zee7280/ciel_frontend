import type { ReportData } from "../context/ReportContext";

/** One-line title for certificates: no wall of text. */
export function shortenCertificateHeadline(text: string, max = 92): string {
    const t = text.replace(/\s+/g, " ").trim();
    if (!t) return "";
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const lastStop = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
    if (lastStop >= 36) return cut.slice(0, lastStop + 1).trim();
    const lastSpace = cut.lastIndexOf(" ");
    const base = lastSpace > 44 ? cut.slice(0, lastSpace) : cut;
    return `${base.trim()}…`;
}

/**
 * Prefer opportunity `project_title`, then first activity title, then a shortened problem statement.
 * Optional `contextLine` is a subdued second line when the headline is an activity name but a problem narrative exists.
 */
export function deriveCertificateProjectDisplay(
    data: ReportData & { project_title?: string },
): { headline: string; contextLine: string | null } {
    const fromApi = (data.project_title || "").trim();
    if (fromApi) {
        return { headline: shortenCertificateHeadline(fromApi, 100), contextLine: null };
    }

    const act = data.section4?.activity_blocks?.[0]?.title?.trim();
    const ps = (data.section2?.problem_statement || "").trim();
    if (act) {
        const ctx = ps.length > 70 ? shortenCertificateHeadline(ps, 155) : null;
        return { headline: shortenCertificateHeadline(act, 100), contextLine: ctx };
    }
    if (ps) {
        return { headline: shortenCertificateHeadline(ps, 92), contextLine: null };
    }
    return { headline: "Community Improvement Initiative", contextLine: null };
}
