"use client";

import React, { useMemo } from "react";
import type { ReportCIIauditMeta } from "@/lib/parseCIIauditSummary";
import { summarizeAuditIssueText } from "@/lib/summarizeRedFlagDetails";
import clsx from "clsx";

type Props = {
    audit: ReportCIIauditMeta;
    /** When set, shows a short line relating audit to numeric CII. */
    ciiTotalScore?: number;
    className?: string;
    onTechnicalDetail?: () => void;
};

type HoldingItem = {
    severity: "Critical" | "Moderate" | "Minor";
    title: string;
    body: string;
    fix?: string;
};

function splitChunks(text: string | null | undefined): string[] {
    const summarized = summarizeAuditIssueText(text);
    if (!summarized) return [];
    return summarized
        .split("\n")
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .filter(Boolean);
}

function splitTitle(raw: string): { title: string; body: string } {
    const trimmed = raw.replace(/^[-*•]\s*/, "").trim();
    const colon = trimmed.match(/^([^:]{8,72}):\s+(.+)$/);
    if (colon) return { title: colon[1].trim(), body: colon[2].trim() };
    const sentence = trimmed.match(/^(.{12,90}?[.!?])\s+(.+)$/);
    if (sentence) return { title: sentence[1].replace(/[.!?]$/, "").trim(), body: sentence[2].trim() };
    if (trimmed.length > 96) {
        const cut = trimmed.slice(0, 88);
        const sp = cut.lastIndexOf(" ");
        return { title: (sp > 40 ? cut.slice(0, sp) : cut).trim(), body: trimmed };
    }
    return { title: trimmed, body: "" };
}

function extractFix(text: string): { body: string; fix?: string } {
    const m = text.match(/^(.*?)\s*(?:Fix:\s*)(.+)$/i);
    if (m) return { body: m[1].trim(), fix: m[2].trim() };
    return { body: text };
}

export function buildHoldingItems(audit: ReportCIIauditMeta): HoldingItem[] {
    const buckets: Array<{ severity: HoldingItem["severity"]; lines: string[] }> = [
        { severity: "Critical", lines: splitChunks(audit.critical_red_flags) },
        { severity: "Moderate", lines: splitChunks(audit.moderate_issues) },
        { severity: "Minor", lines: splitChunks(audit.minor_issues) },
    ];
    const fixes = audit.top_fixes.filter((f) => typeof f === "string" && f.trim());
    const items: HoldingItem[] = [];
    let fixIdx = 0;
    for (const bucket of buckets) {
        for (const line of bucket.lines) {
            const split = splitTitle(line);
            const withFix = extractFix(split.body || split.title);
            const item: HoldingItem = {
                severity: bucket.severity,
                title: split.title,
                body: split.body && withFix.body !== split.title ? withFix.body : withFix.body === split.title ? "" : withFix.body,
                fix: withFix.fix || (fixes[fixIdx] ? fixes[fixIdx] : undefined),
            };
            if (item.fix) fixIdx += 1;
            items.push(item);
        }
    }
    if (items.length === 0 && fixes.length) {
        return fixes.map((fix) => ({
            severity: "Moderate" as const,
            title: "Recommended fix",
            body: "",
            fix,
        }));
    }
    return items;
}

export default function CIIauditInsightsPanel({ audit, className, onTechnicalDetail }: Props) {
    const items = useMemo(() => buildHoldingItems(audit), [audit]);
    if (items.length === 0 && !audit.final_remark) return null;

    return (
        <div id="cer-holding" className={clsx("cer-hold", className)}>
            <div className="cer-hold-h">
                <h3>What&apos;s holding the score back</h3>
                {onTechnicalDetail ? (
                    <button type="button" className="cer-hold-tech" onClick={onTechnicalDetail}>
                        Technical detail
                    </button>
                ) : null}
            </div>
            {items.length ? (
                <div className="cer-hold-list">
                    {items.map((item, i) => (
                        <div key={`${item.severity}-${i}`} className="cer-hold-item">
                            <span className={clsx("cer-hold-sev", item.severity.toLowerCase())}>{item.severity}</span>
                            <div className="cer-hold-copy">
                                <p className="cer-hold-title">{item.title}</p>
                                {item.body ? <p className="cer-hold-body">{item.body}</p> : null}
                                {item.fix ? <p className="cer-hold-fix">Fix: {item.fix}</p> : null}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
            {audit.final_remark ? (
                <div className="cer-hold-note">
                    <p className="cer-hold-note-k">Auditor&apos;s note</p>
                    <p className="cer-hold-note-t">{audit.final_remark}</p>
                </div>
            ) : null}
        </div>
    );
}
