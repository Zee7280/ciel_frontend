import type { ReportData } from "../context/ReportContext";
import { pickImpactVerifyUrlFromPayload } from "@/utils/reportVerificationUrl";

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

function formatCodeFromSlugToken(slug: string): string | null {
    const compact = slug.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (compact.length < 6) return null;
    const yr = new Date().getFullYear().toString().slice(-2);
    const chunks = compact.match(/.{1,4}/g)?.slice(0, 6) ?? [];
    if (!chunks.length) return null;
    return `CIL-${yr}-${chunks.join("-")}`;
}

/** Prefer API `certificate_verification_code`; fallback to slug / verify URL token. */
export function pickCertificateVerificationCode(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;
    const o = payload as Record<string, unknown>;

    const fromApi = o.certificate_verification_code ?? o.certificateVerificationCode;
    if (typeof fromApi === "string" && fromApi.trim()) return fromApi.trim();

    const slug = o.verification_public_slug ?? o.verificationPublicSlug;
    if (typeof slug === "string" && slug.trim()) {
        return formatCodeFromSlugToken(slug.trim());
    }

    const verifyUrl = pickImpactVerifyUrlFromPayload(payload);
    if (verifyUrl) {
        try {
            const path = verifyUrl.startsWith("http") ? new URL(verifyUrl).pathname : verifyUrl;
            const seg = path.split("/").filter(Boolean).pop() || "";
            if (seg) return formatCodeFromSlugToken(seg);
        } catch {
            /* fall through */
        }
    }

    const projectId = o.project_id ?? o.projectId;
    if (typeof projectId === "string" && projectId.trim()) {
        return formatCodeFromSlugToken(projectId.trim());
    }

    return null;
}

/** @deprecated Use pickCertificateVerificationCode — kept for callers passing raw fields. */
export function formatCertificateVerificationCode(
    impactVerifyUrl: string | null | undefined,
    projectId: string | null | undefined,
): string {
    return (
        pickCertificateVerificationCode({
            impact_verify_url: impactVerifyUrl,
            project_id: projectId,
        }) ?? "—"
    );
}

/** Certificate footer date, e.g. `25 MAY 2026`. */
export function formatCertificateDate(d = new Date()): string {
    const day = d.getDate();
    const month = d.toLocaleString("en-GB", { month: "short" }).toUpperCase();
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
}
