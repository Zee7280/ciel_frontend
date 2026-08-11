"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Star } from "lucide-react";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/app/dashboard/student/report/components/ui/dialog";
import { CII_SECTION_MAX } from "@/app/dashboard/student/report/utils/ciiSectionWeights";
import { SECTION_GUIDE_CONTENT } from "./sectionGuideContent";
import { SectionGuideBody } from "./SectionGuideBody";

/** Steps that have a structured HTML guide (replaces /public/section-guides PNGs). */
export const SECTION_GUIDE_STEPS = Object.keys(SECTION_GUIDE_CONTENT)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

const STEP_TO_CII_KEY: Partial<Record<number, keyof typeof CII_SECTION_MAX>> = {
    1: "participation",
    2: "context",
    3: "sdg",
    4: "outputs",
    5: "outcomes",
    6: "resources",
    7: "partnerships",
    8: "evidence",
    9: "learning",
    10: "sustainability",
};

type ReportSectionGuideFloatProps = {
    /** Current report stepper step (1–11). */
    sectionStep: number;
    /** Hide on pre-report guide / locked summary-only modes. */
    enabled?: boolean;
};

/**
 * Floating “Section guide” control for the student report flow.
 * Renders crisp HTML guides (Lucide icons) — no pixelated mockup PNGs, single “Got it” CTA.
 */
export function ReportSectionGuideFloat({
    sectionStep,
    enabled = true,
}: ReportSectionGuideFloatProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [sectionStep]);

    const meta = useMemo(() => {
        const content = SECTION_GUIDE_CONTENT[sectionStep];
        if (!content) return null;
        const ciiKey = STEP_TO_CII_KEY[sectionStep];
        const points = ciiKey ? CII_SECTION_MAX[ciiKey] : undefined;
        return {
            content,
            title: content.title,
            subtitle: content.subtitle,
            points,
        };
    }, [sectionStep]);

    if (!enabled || !meta) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="fixed z-[55] flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 print:hidden sm:px-4"
                style={{
                    right: "1rem",
                    /* Clear support stack (chat + WhatsApp @ bottom 7rem, ~8rem tall) + gap */
                    bottom: "calc(17rem + env(safe-area-inset-bottom, 0px))",
                }}
                title={meta.title}
                aria-label={`Open ${meta.title}`}
            >
                <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">Section guide</span>
                <span className="sm:hidden">Guide</span>
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="relative flex h-[min(94vh,960px)] w-[calc(100vw-1rem)] max-w-5xl flex-col overflow-hidden p-0 gap-0">
                    <DialogHeader className="shrink-0 border-b border-slate-100 bg-slate-50/90 px-4 py-3 pr-12 sm:px-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                                <DialogTitle className="text-base text-slate-900 sm:text-lg">
                                    {meta.title}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 sm:text-sm">
                                    {meta.subtitle}
                                </DialogDescription>
                            </div>
                            {typeof meta.points === "number" ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-800">
                                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                                    {meta.points} points
                                </span>
                            ) : null}
                        </div>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6fb] px-2 py-4 sm:px-4 sm:py-5">
                        <SectionGuideBody content={meta.content} />
                    </div>

                    <DialogFooter className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
                        <Button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="h-10 w-full gap-2 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 sm:w-auto sm:min-w-[200px]"
                        >
                            <Check className="h-4 w-4" />
                            Got it, thanks!
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
