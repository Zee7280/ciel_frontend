"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { Flag, AlertTriangle } from "lucide-react";
import type { AuditSummarySection } from "@/lib/parseAuditSummarySections";
import { extractIssueFields } from "@/lib/parseAuditSummarySections";
import clsx from "clsx";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sections: AuditSummarySection[];
    /** True when AI multi-section audit was missing and rows were built from validation + CII. */
    usedSystemFallback?: boolean;
};

export default function RedFlagsAuditModal({ open, onOpenChange, sections, usedSystemFallback }: Props) {

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[min(90vh,720px)] flex flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 p-0 sm:rounded-2xl">
                <DialogHeader className="shrink-0 border-b border-slate-100 bg-slate-50/90 px-6 py-5 text-left">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
                            <Flag className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 space-y-1">
                            <DialogTitle className="text-left text-base font-black tracking-tight text-slate-900">
                                Section-wise audit & red flags
                            </DialogTitle>
                            <DialogDescription className="text-left text-xs font-medium text-slate-600 leading-relaxed">
                                {usedSystemFallback
                                    ? "No full AI audit is stored yet. Below: your section validation gaps, CII score drivers, and any saved summary text — all without ChatGPT."
                                    : "Issues and gaps from your stored Section 11 audit narrative (cross-section review)."}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                    {sections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
                            <AlertTriangle className="h-8 w-8 text-amber-500" />
                            <p className="text-sm font-bold text-slate-700">No section-wise audit on file</p>
                            <p className="max-w-sm text-xs font-medium text-slate-500 leading-relaxed">
                                A full audit appears here when your report includes the standard Section 1–11 audit text
                                (usually generated for your dossier). Until then, use the narrative under Comprehensive
                                audit review.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sections.map((sec) => {
                                const fields = extractIssueFields(sec.body, sec.sectionNum);
                                const isFinal = sec.sectionNum === 11;
                                /** Real Section 11 = stored AI “final audit” block. System fallback uses this title in `redFlagsModalMerge`. */
                                const isSystemCiiDrivers =
                                    isFinal && sec.title.trim() === "Score & drivers (system)";
                                const highlightFinalAudit = isFinal && !isSystemCiiDrivers;
                                return (
                                    <div
                                        key={`${sec.sectionNum}-${sec.title}`}
                                        className={clsx(
                                            "rounded-xl border p-4 shadow-sm",
                                            highlightFinalAudit
                                                ? "border-rose-200/80 bg-rose-50/40"
                                                : "border-slate-200 bg-white",
                                        )}
                                    >
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            Section {sec.sectionNum}
                                        </p>
                                        <h4 className="mt-1 text-sm font-black text-slate-900">{sec.title}</h4>
                                        <div className="mt-3 space-y-3">
                                            {fields.map((row, i) => (
                                                <div key={`${sec.sectionNum}-${row.label}-${i}`} className="text-left">
                                                    <p className="text-[10px] font-black uppercase tracking-wide text-report-primary">
                                                        {row.label}
                                                    </p>
                                                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-700 whitespace-pre-wrap">
                                                        {row.value}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
