import type { AuditSummarySection } from "@/lib/parseAuditSummarySections";
import { parseAuditSummaryIntoSections } from "@/lib/parseAuditSummarySections";
import type { SectionIncompleteInfo } from "@/app/dashboard/student/report/utils/validation";
import type { CIIResult } from "@/app/dashboard/student/report/utils/calculateCII";

const BREAKDOWN_MAX: Record<keyof CIIResult["breakdown"], number> = {
    participation: 15,
    context: 5,
    sdg: 5,
    outputs: 15,
    outcomes: 25,
    resources: 5,
    partnerships: 10,
    evidence: 10,
    learning: 4,
    sustainability: 5,
};

const DIM_LABEL: Record<keyof CIIResult["breakdown"], string> = {
    participation: "Participation",
    context: "Context",
    sdg: "SDG alignment",
    outputs: "Activities / outputs",
    outcomes: "Outcomes",
    resources: "Resources",
    partnerships: "Partnerships",
    evidence: "Evidence",
    learning: "Reflection",
    sustainability: "Sustainability",
};

/**
 * Prefers a real multi-section AI audit when `summary_text` contains SECTION 1–10 blocks.
 * Otherwise builds section-wise rows from validation errors + CII breakdown (no ChatGPT).
 */
export function getRedFlagsModalSections(
    auditSummaryText: string,
    incomplete: SectionIncompleteInfo[],
    cii: CIIResult,
): { sections: AuditSummarySection[]; usedSystemFallback: boolean } {
    const parsed = parseAuditSummaryIntoSections(auditSummaryText);
    const aiSectionCount = parsed.filter((p) => p.sectionNum >= 1 && p.sectionNum <= 10).length;

    /** A single stored Section 1–10 block is enough to treat the narrative as the CII audit (avoid false fallback). */
    if (aiSectionCount >= 1) {
        return { sections: parsed, usedSystemFallback: false };
    }

    const system: AuditSummarySection[] = [];

    for (const block of incomplete) {
        const lines = block.errors.map((e) => `• ${e.message}`).join("\n");
        if (!lines.trim()) continue;
        system.push({
            sectionNum: block.section,
            title: `${block.label} — needs attention`,
            body: `Validation / completeness:\n\n${lines}`,
        });
    }

    const weakDims: string[] = [];
    (Object.keys(BREAKDOWN_MAX) as (keyof typeof BREAKDOWN_MAX)[]).forEach((key) => {
        const max = BREAKDOWN_MAX[key];
        const v = cii.breakdown[key];
        if (max > 0 && v / max < 0.36) {
            weakDims.push(`• ${DIM_LABEL[key]} (${v}/${max})`);
        }
    });

    const ciiParts = [
        `Total score (CII-style): ${Math.round(cii.totalScore)}/100 — ${cii.level}.`,
        cii.suggestions.length ? `Tips:\n${cii.suggestions.map((s) => `• ${s}`).join("\n")}` : "",
        weakDims.length ? `Weakest dimensions:\n${weakDims.join("\n")}` : ""
    ].filter(Boolean);

    system.push({
        sectionNum: 11,
        title: "Score & drivers (system)",
        body: ciiParts.join("\n\n"),
    });

    const narrative = parsed.find((p) => p.sectionNum === 0 && p.body.trim().length > 0);
    let restParsed = parsed.filter((p) => p.sectionNum !== 0);
    if (system.some((s) => s.sectionNum === 11)) {
        restParsed = restParsed.filter((p) => p.sectionNum !== 11);
    }

    const merged: AuditSummarySection[] = [];
    if (narrative) {
        merged.push({
            ...narrative,
            title: narrative.title.includes("unsegmented") ? "Stored audit text (single block)" : narrative.title,
        });
    }
    merged.push(...restParsed);
    merged.push(...system);

    return { sections: merged, usedSystemFallback: true };
}
