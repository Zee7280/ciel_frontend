import { parseSection11AuditSummary } from "@/lib/parseCIIauditSummary";
import { parseSection11V61Response } from "@/lib/parseSection11V61";

export type Section11DashboardHighlights = {
    finalScore?: string;
    band?: string;
    recommendedAction?: string;
    donorTier?: string;
};

export type Section11DashboardView = {
    /** Short, student-friendly narrative for the summary page card. */
    narrative: string;
    highlights: Section11DashboardHighlights;
    /** True when the stored audit is the long multi-component CII report. */
    isComprehensiveReport: boolean;
};

const LEGACY_PLACEHOLDER = "project successfully synthesized";

function normalizeText(fullText: string): string {
    return fullText.replace(/\r\n/g, "\n").trim();
}

function sliceBetween(
    haystack: string,
    start: RegExp,
    endPatterns: RegExp[],
): string | null {
    const sm = haystack.match(start);
    if (!sm || sm.index === undefined) return null;

    const from = sm.index + sm[0].length;
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

function cleanNarrativeBlock(raw: string): string {
    return raw
        .split("\n")
        .map((line) => line.replace(/^\s*>\s?/, "").trim())
        .filter((line) => {
            if (!line) return false;
            if (/^use this template structure/i.test(line)) return false;
            if (/^component\s+\d+/i.test(line)) return false;
            if (/^follow this internal structure/i.test(line)) return false;
            return true;
        })
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function pickField(text: string, pattern: RegExp, endPatterns: RegExp[]): string | undefined {
    const value = sliceBetween(text, pattern, endPatterns);
    return value?.replace(/\s+/g, " ").trim() || undefined;
}

export function isComprehensiveSection11Report(fullText: string): boolean {
    const normalized = normalizeText(fullText);
    if (!normalized) return false;

    if (/Component\s*[12]\s*[—–\-]/i.test(normalized)) return true;
    if (/CII\s+EVALUATION\s*\(v6[\d.]+\)/i.test(normalized)) return true;

    const sectionHits = (normalized.match(/\b(?:SECTION|Section)\s+\d+\b/gi) || []).length;
    return sectionHits >= 3 && normalized.length > 2000;
}

function extractV4StyleNarrative(normalized: string): string | null {
    const parts: string[] = [];

    const executiveVerdict = sliceBetween(
        normalized,
        /Component\s*2\s*[—–\-]+\s*Executive\s+Verdict[^\n]*/i,
        [/Component\s*3\s*[—–\-]/i, /\nComponent\s*3\b/i],
    );
    if (executiveVerdict) {
        const cleaned = cleanNarrativeBlock(executiveVerdict);
        if (cleaned) parts.push(cleaned);
    }

    const finalAnalysis = sliceBetween(
        normalized,
        /Component\s*7\s*[—–\-]+\s*Comprehensive\s+Final\s+Analysis[^\n]*/i,
        [/Component\s*8\s*[—–\-]/i, /\nComponent\s*8\b/i],
    );
    if (finalAnalysis) {
        const cleaned = cleanNarrativeBlock(finalAnalysis);
        if (cleaned) parts.push(cleaned);
    }

    if (parts.length) return parts.join("\n\n");

    const recommendedAction = pickField(normalized, /\bRecommended\s+Action\s*:\s*/i, [
        /\bCurrent\s+Band\s*:/i,
        /\bPath\s+Forward\s*:/i,
        /Component\s*8\b/i,
    ]);
    const currentBand = pickField(normalized, /\bCurrent\s+Band\s*:\s*/i, [/\bPath\s+Forward\s*:/i]);

    if (recommendedAction || currentBand) {
        return [recommendedAction, currentBand ? `Current band: ${currentBand}` : ""]
            .filter(Boolean)
            .join("\n\n");
    }

    return null;
}

function extractLegacySectionNarrative(normalized: string): string | null {
    const meta = parseSection11AuditSummary(normalized);
    if (!meta) return null;

    const parts = [
        meta.student_feedback,
        meta.final_remark,
        meta.risk_level ? `Recommended action: ${meta.risk_level}` : null,
        meta.credibility ? `Credibility: ${meta.credibility}` : null,
    ].filter((p): p is string => Boolean(p && p.trim()));

    return parts.length ? parts.join("\n\n") : null;
}

function extractCoverHighlights(normalized: string): Section11DashboardHighlights {
    const highlights: Section11DashboardHighlights = {};

    highlights.finalScore = pickField(normalized, /\bFINAL\s+CII\s+SCORE\s+/i, [
        /\bBAND\s+ACHIEVED\b/i,
        /Component\s*2\b/i,
    ]);

    highlights.band = pickField(normalized, /\bBAND\s+ACHIEVED\s+/i, [
        /\bDONOR\s+TIER\b/i,
        /\bPARTNERSHIP\s+TIER\b/i,
        /Component\s*2\b/i,
    ]);

    highlights.donorTier = pickField(normalized, /\bDONOR\s+TIER\s+/i, [
        /\bPARTNERSHIP\s+TIER\b/i,
        /\bCOMPLIANCE\b/i,
        /Component\s*2\b/i,
    ]);

    highlights.recommendedAction =
        pickField(normalized, /\bRECOMMENDED\s+/i, [
            /Component\s*2\b/i,
            /\bFINAL\s+CII\s+SCORE\b/i,
        ]) ||
        pickField(normalized, /\bRecommended\s+Action\s*:\s*/i, [
            /\bCurrent\s+Band\s*:/i,
            /\bPath\s+Forward\s*:/i,
        ]);

    return highlights;
}

/**
 * Builds a short, readable narrative for Section 11 summary UI.
 * Full `summary_text` is preserved for print dossier, red-flags modal, and parsers.
 */
export function buildSection11DashboardView(fullText: string): Section11DashboardView {
    const normalized = normalizeText(fullText);

    const v61 = parseSection11V61Response(normalized);
    if (v61) {
        const executive = v61.evaluation.narrative?.executive_verdict?.trim();
        const finalDecision = v61.evaluation.narrative?.final_decision?.trim();
        const narrative = [executive, finalDecision].filter(Boolean).join("\n\n");
        return {
            narrative: narrative || v61.summaryText.split("\n\n").slice(0, 2).join("\n\n"),
            highlights: {
                finalScore:
                    typeof v61.evaluation.cii === "number"
                        ? `${Math.round(v61.evaluation.cii)} / 100`
                        : undefined,
                band: v61.evaluation.level_label,
                recommendedAction: v61.auditMeta.risk_level || undefined,
                donorTier: v61.evaluation.section_scores?.section_6?.donor_tier,
            },
            isComprehensiveReport: true,
        };
    }

    const isComprehensiveReport = isComprehensiveSection11Report(normalized);
    const highlights = extractCoverHighlights(normalized);

    if (!normalized) {
        return { narrative: "", highlights, isComprehensiveReport: false };
    }

    if (normalized.toLowerCase().includes(LEGACY_PLACEHOLDER)) {
        return { narrative: normalized, highlights, isComprehensiveReport: false };
    }

    const v4Narrative = extractV4StyleNarrative(normalized);
    if (v4Narrative) {
        return { narrative: v4Narrative, highlights, isComprehensiveReport: true };
    }

    if (isComprehensiveReport) {
        const legacyMetaNarrative = extractLegacySectionNarrative(normalized);
        if (legacyMetaNarrative) {
            return { narrative: legacyMetaNarrative, highlights, isComprehensiveReport: true };
        }

        const intro = sliceBetween(normalized, /^/, [/Component\s*3\b/i, /\bSECTION\s+1\b/i]);
        if (intro && intro.length < 1200) {
            return { narrative: cleanNarrativeBlock(intro), highlights, isComprehensiveReport: true };
        }
    }

    if (normalized.length <= 1800 && !/\b(?:SECTION|Section)\s+\d+\b/i.test(normalized)) {
        return { narrative: normalized, highlights, isComprehensiveReport: false };
    }

    const legacyMetaNarrative = extractLegacySectionNarrative(normalized);
    if (legacyMetaNarrative) {
        return { narrative: legacyMetaNarrative, highlights, isComprehensiveReport };
    }

    const firstChunk = normalized.split(/\n\n+/).slice(0, 2).join("\n\n").trim();
    return {
        narrative: firstChunk.length > 900 ? `${firstChunk.slice(0, 900).trim()}…` : firstChunk,
        highlights,
        isComprehensiveReport,
    };
}
