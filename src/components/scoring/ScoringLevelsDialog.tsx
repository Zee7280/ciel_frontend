"use client";

import { Award } from "lucide-react";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/app/dashboard/student/report/components/ui/dialog";

/** Public static explainer — also used by platform tutorials / direct links. Do not remove. */
export const SCORING_LEVELS_HTML_SRC = "/scoring-levels.html";

type ScoringLevelsEmbedProps = {
    className?: string;
    /** iframe min height (content is tall: simulator + badge ladder). */
    minHeight?: number;
};

/** Inline embed for dashboard pages (same HTML as the modal / tutorial asset). */
export function ScoringLevelsEmbed({
    className,
    minHeight = 1600,
}: ScoringLevelsEmbedProps) {
    return (
        <section
            id="scoring-levels"
            className={
                className ??
                "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
            }
        >
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Scoring levels</h2>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                    How your Community Impact Score (CII) maps to badges and certificates.
                </p>
            </div>
            <iframe
                title="CIEL PK scoring levels"
                src={SCORING_LEVELS_HTML_SRC}
                className="w-full border-0 bg-[#f7f6fc]"
                style={{ minHeight }}
            />
        </section>
    );
}

type ScoringLevelsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/** Modal that embeds the public scoring-levels explainer (kept for browse / deep links). */
export function ScoringLevelsDialog({ open, onOpenChange }: ScoringLevelsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="relative flex h-[min(92vh,900px)] w-[calc(100vw-1.5rem)] max-w-4xl flex-col overflow-hidden p-0 gap-0">
                <DialogHeader className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-4 py-3 pr-12 sm:px-5">
                    <DialogTitle className="text-base text-slate-900 sm:text-lg">
                        Scoring levels
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 sm:text-sm">
                        How your Community Impact Score (CII) maps to badges and certificates.
                    </DialogDescription>
                </DialogHeader>
                <iframe
                    title="CIEL PK scoring levels"
                    src={SCORING_LEVELS_HTML_SRC}
                    className="min-h-0 w-full flex-1 border-0 bg-[#f7f6fc]"
                />
            </DialogContent>
        </Dialog>
    );
}

type ScoringLevelsButtonProps = {
    onClick: () => void;
    className?: string;
    /** Compact outline for card action columns */
    size?: "sm" | "default";
    label?: string;
};

/** Opens the scoring-levels dialog (dialog state lives on the parent page). */
export function ScoringLevelsButton({
    onClick,
    className,
    size = "sm",
    label = "Scoring levels",
}: ScoringLevelsButtonProps) {
    return (
        <Button
            type="button"
            variant="outline"
            size={size}
            onClick={onClick}
            className={
                className ??
                (size === "sm"
                    ? "h-8 gap-1.5 border-amber-200/90 bg-amber-50/50 text-xs font-medium text-amber-900 hover:bg-amber-50"
                    : "h-10 w-full gap-2 rounded-xl border-amber-200/90 bg-amber-50/40 text-amber-900 hover:bg-amber-50")
            }
            title="See how CII scores map to badge levels"
        >
            <Award className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
            {label}
        </Button>
    );
}
