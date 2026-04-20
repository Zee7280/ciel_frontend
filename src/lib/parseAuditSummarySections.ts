/**
 * Splits the Section 11 plain-text AI audit into per-section blocks
 * (SECTION 1 — … through SECTION 11 — …).
 */

export type AuditSummarySection = {
    sectionNum: number;
    title: string;
    body: string;
};

export function parseAuditSummaryIntoSections(full: string): AuditSummarySection[] {
    const normalized = full.replace(/\r\n/g, "\n").trim();
    if (!normalized) {
        return [];
    }

    const hasSectionHeaders = /\b(?:SECTION|Section)\s+\d+\b/i.test(normalized);

    if (!hasSectionHeaders) {
        if (normalized.length > 40) {
            return [{ sectionNum: 0, title: "Audit narrative", body: normalized }];
        }
        return [];
    }

    const parts = normalized
        .split(/(?=\b(?:SECTION|Section)\s+\d+\b)/i)
        .map((p) => p.trim())
        .filter(Boolean);

    const out: AuditSummarySection[] = [];
    for (const part of parts) {
        const m = part.match(
            /^(?:SECTION|Section)\s+(\d+)\s*(?:[—–\-]+|[.:]|\s-\s)?\s*([^:]+?)\s*:\s*([\s\S]*)$/i,
        );
        if (!m) continue;
        const sectionNum = parseInt(m[1], 10);
        if (!Number.isFinite(sectionNum)) continue;
        const title = m[2]
            .trim()
            .replace(/\s+/g, " ")
            .replace(/^[—–\-:.]+\s*/, "");
        const body = (m[3] || "").trim();
        out.push({ sectionNum, title: title || "Section", body });
    }

    if (out.length === 0 && hasSectionHeaders) {
        return [{ sectionNum: 0, title: "Audit narrative (unsegmented)", body: normalized }];
    }

    return out.sort((a, b) => {
        if (a.sectionNum === 0) return 1;
        if (b.sectionNum === 0) return -1;
        return a.sectionNum - b.sectionNum;
    });
}

/** Pulls common audit labels into short rows for modal display (best-effort). */
export function extractIssueFields(body: string, sectionNum: number): { label: string; value: string }[] {
    const raw = body.replace(/\r\n/g, "\n").trim();
    if (!raw) return [];

    const for1to10: { key: string; re: RegExp }[] = [
        { key: "Quality", re: /\bQuality\s*:\s*/i },
        { key: "Red flags", re: /\bRed\s+Flags\s*:\s*/i },
        { key: "Missing data", re: /\bMissing\s+Data\s*:\s*/i },
        { key: "Missing elements", re: /\bMissing\s+Elements\s*:\s*/i },
        { key: "Feedback", re: /\bFeedback\s*:\s*/i },
    ];

    const for11: { key: string; re: RegExp }[] = [
        { key: "Critical red flags", re: /\bCRITICAL\s+RED\s+FLAGS\s*:\s*/i },
        { key: "Moderate issues", re: /\bMODERATE\s+ISSUES\s*:\s*/i },
        { key: "Minor issues", re: /\bMINOR\s+ISSUES\s*:\s*/i },
        { key: "Credibility", re: /\bOverall\s+Credibility\s+Score\s*:\s*/i },
        { key: "Risk level", re: /\bRisk\s+Level\s*:\s*/i },
        { key: "Top fixes", re: /\bTop\s*5\s+Required\s+Fixes\s*:\s*/i },
        { key: "Top fixes", re: /\bTop\s+Five\s+Required\s+Fixes\s*:\s*/i },
        { key: "Auditor remark", re: /\bFinal\s+Auditor\s+Remark\s*:\s*/i },
        { key: "Student feedback", re: /\bStudent\s+Feedback\s*:\s*/i },
    ];

    const defs = sectionNum === 11 ? for11 : for1to10;
    const hits: { label: string; idx: number; len: number }[] = [];

    for (const { key, re } of defs) {
        const m = raw.match(re);
        if (m && m.index !== undefined) {
            hits.push({ label: key, idx: m.index, len: m[0].length });
        }
    }

    hits.sort((a, b) => a.idx - b.idx);

    const byLabel = new Map<string, { label: string; idx: number; len: number }>();
    for (const h of hits) {
        const prev = byLabel.get(h.label);
        if (!prev || h.idx < prev.idx) byLabel.set(h.label, h);
    }
    const ordered = [...byLabel.values()].sort((a, b) => a.idx - b.idx);

    if (ordered.length === 0) {
        return [{ label: "Details", value: raw }];
    }

    const rows: { label: string; value: string }[] = [];
    for (let i = 0; i < ordered.length; i++) {
        const start = ordered[i].idx + ordered[i].len;
        const end = i + 1 < ordered.length ? ordered[i + 1].idx : raw.length;
        const value = raw.slice(start, end).trim();
        if (value) rows.push({ label: ordered[i].label, value });
    }

    return rows.length ? rows : [{ label: "Details", value: raw }];
}
