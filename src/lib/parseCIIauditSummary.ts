/**
 * Extracts structured fields from the Section 11 AI audit response (plain text, 11 blocks).
 * Tolerant to minor formatting drift from the model.
 */

export type ReportCIIauditMeta = {
    critical_red_flags: string | null;
    moderate_issues: string | null;
    minor_issues: string | null;
    credibility: string | null;
    risk_level: string | null;
    top_fixes: string[];
    final_remark: string | null;
    student_feedback: string | null;
    needs_revision: boolean;
};

function findFinalAuditParagraph(full: string): string | null {
    const normalized = full.replace(/\r\n/g, "\n").trim();
    if (!normalized) return null;

    const chunks = normalized
        .split(/\n\n+/)
        .map((c) => c.trim())
        .filter(Boolean);

    for (let i = chunks.length - 1; i >= 0; i--) {
        const c = chunks[i];
        if (/SECTION\s*11/i.test(c) && /CRITICAL\s+RED\s+FLAGS/i.test(c)) {
            return c;
        }
    }

    const idx = normalized.search(/SECTION\s*11[\s—-]*FINAL\s+AUDIT/i);
    if (idx >= 0 && /CRITICAL\s+RED\s+FLAGS/i.test(normalized)) {
        return normalized.slice(idx).trim();
    }

    if (/FINAL\s+AUDIT\s+SUMMARY/i.test(normalized) && /CRITICAL\s+RED\s+FLAGS/i.test(normalized)) {
        const j = normalized.search(/FINAL\s+AUDIT\s+SUMMARY/i);
        return normalized.slice(j).trim();
    }

    return null;
}

function sliceBetween(
    haystack: string,
    start: RegExp,
    endPatterns: RegExp[],
): string | null {
    const sm = haystack.match(start);
    if (!sm || sm.index === undefined) return null;
    let from = sm.index + sm[0].length;
    const rest = haystack.slice(from);

    let endIdx = rest.length;
    for (const ep of endPatterns) {
        const m = rest.match(ep);
        if (m && m.index !== undefined && m.index < endIdx) {
            endIdx = m.index;
        }
    }

    const chunk = rest.slice(0, endIdx).trim();
    return chunk.length ? chunk : null;
}

function parseTopFixes(raw: string | null): string[] {
    if (!raw) return [];
    const normalized = raw.replace(/\r\n/g, " ").replace(/\s+/g, " ").trim();
    const parts = normalized.split(/\d+\)\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts;
    const alt = normalized.split(/;\s*|\.\s+(?=[A-Z])/).map((p) => p.trim()).filter(Boolean);
    return alt.length > 1 ? alt : raw.trim() ? [raw.trim()] : [];
}

export function parseSection11AuditSummary(fullText: string): ReportCIIauditMeta | null {
    const para = findFinalAuditParagraph(fullText);
    if (!para) return null;

    const critical = sliceBetween(para, /CRITICAL\s+RED\s+FLAGS\s*:\s*/i, [
        /\bMODERATE\s+ISSUES\s*:/i,
    ]);

    const moderate = sliceBetween(para, /MODERATE\s+ISSUES\s*:\s*/i, [/\bMINOR\s+ISSUES\s*:/i]);

    const minor = sliceBetween(para, /MINOR\s+ISSUES\s*:\s*/i, [
        /\bOverall\s+Credibility\s+Score\s*:/i,
        /\bCredibility\s+Score\s*:/i,
    ]);

    const credibility = sliceBetween(para, /Overall\s+Credibility\s+Score\s*:\s*/i, [/\bRisk\s+Level\s*:/i]);

    const risk_level = sliceBetween(para, /Risk\s+Level\s*:\s*/i, [
        /\bTop\s*5\s+Required\s+Fixes\s*:/i,
        /\bTop\s+Five\s+Required\s+Fixes\s*:/i,
        /\bRequired\s+Fixes\s*:/i,
    ]);

    const topRaw = sliceBetween(para, /Top\s*5\s+Required\s+Fixes\s*:\s*/i, [
        /\bFinal\s+Auditor\s+Remark\s*:/i,
        /\bRETURN\s+TO\s+STUDENT/i,
        /\bStudent\s+Feedback\s*:/i,
    ]);

    const topRawAlt =
        topRaw ||
        sliceBetween(para, /Top\s+Five\s+Required\s+Fixes\s*:\s*/i, [
            /\bFinal\s+Auditor\s+Remark\s*:/i,
            /\bRETURN\s+TO\s+STUDENT/i,
            /\bStudent\s+Feedback\s*:/i,
        ]);

    const final_remark = sliceBetween(para, /Final\s+Auditor\s+Remark\s*:\s*/i, [
        /\bRETURN\s+TO\s+STUDENT/i,
        /\bStudent\s+Feedback\s*:/i,
        /\bSTUDENT\s+FEEDBACK\s*:/i,
    ]);

    const student_feedback =
        sliceBetween(para, /Student\s+Feedback\s*:\s*/i, []) ||
        sliceBetween(para, /STUDENT\s+FEEDBACK\s*:\s*/i, []);

    const top_fixes = parseTopFixes(topRawAlt);

    const needs_revision =
        /\bRETURN\s+TO\s+STUDENT\s+FOR\s+REVISION\b/i.test(para) ||
        /\bNeeds\s+Revision\b/i.test(risk_level || "") ||
        /\bReject\b/i.test(risk_level || "");

    const hasAny =
        critical ||
        moderate ||
        minor ||
        credibility ||
        risk_level ||
        top_fixes.length ||
        final_remark ||
        student_feedback;

    if (!hasAny) return null;

    return {
        critical_red_flags: critical,
        moderate_issues: moderate,
        minor_issues: minor,
        credibility: credibility ? credibility.replace(/\.\s*Risk\s+Level.*$/i, "").trim() : null,
        risk_level,
        top_fixes,
        final_remark,
        student_feedback,
        needs_revision,
    };
}
