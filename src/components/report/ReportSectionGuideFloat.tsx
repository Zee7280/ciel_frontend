"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check } from "lucide-react";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogTitle,
} from "@/app/dashboard/student/report/components/ui/dialog";
import StudentCommunityGuide from "./StudentCommunityGuide";

type ReportSectionGuideFloatProps = {
    /** Current report stepper step (1–9 form, 10 flash card). */
    sectionStep: number;
    /** Hide on pre-report guide / locked summary-only modes. */
    enabled?: boolean;
    /** Increment to open the existing section guide dialog (chrome help chip). */
    openSignal?: number;
    /** Report / project id: the guide opens by itself the first time each section is reached for it. */
    autoOpenKey?: string | null;
};

const AUTO_PREF_KEY = "ciel_report_guide_auto";

function readSeen(storageKey: string): number[] {
    try {
        const raw = JSON.parse(localStorage.getItem(storageKey) || "[]") as unknown;
        return Array.isArray(raw) ? raw.map(Number).filter((n) => Number.isFinite(n)) : [];
    } catch {
        return [];
    }
}

function readAutoPref(): boolean {
    try {
        return localStorage.getItem(AUTO_PREF_KEY) !== "off";
    } catch {
        return true;
    }
}

/**
 * Floating “Section guide” control for the student report flow.
 * Opens the Community Engagement student guide (student-guide-final.html) on the matching section.
 * Does not change the report stepper, save, or submit.
 */
export function ReportSectionGuideFloat({
    sectionStep,
    enabled = true,
    openSignal = 0,
    autoOpenKey = null,
}: ReportSectionGuideFloatProps) {
    const [open, setOpen] = useState(false);
    // Read once on the client; the checkbox only renders inside the (initially closed) dialog, so
    // the server/client difference never reaches the first paint.
    const [autoPref, setAutoPref] = useState(() => (typeof window === "undefined" ? true : readAutoPref()));
    const storageKey = autoOpenKey ? `ciel_report_guide_seen:${autoOpenKey}` : null;

    // New section → close any open guide; and pop it up by itself the first time this section is
    // reached for this report (unless the student switched automatic guides off).
    useEffect(() => {
        setOpen(false);
        if (!enabled || !storageKey || sectionStep < 1 || sectionStep > 9) return;
        if (!readAutoPref() || readSeen(storageKey).includes(sectionStep)) return;
        const timer = window.setTimeout(() => setOpen(true), 600);
        return () => window.clearTimeout(timer);
    }, [sectionStep, enabled, storageKey]);

    const markSeen = () => {
        if (!storageKey) return;
        try {
            const seen = readSeen(storageKey);
            if (!seen.includes(sectionStep)) localStorage.setItem(storageKey, JSON.stringify([...seen, sectionStep]));
        } catch {
            /* storage unavailable: the guide simply opens again next time */
        }
    };
    const close = () => {
        markSeen();
        setOpen(false);
    };
    const toggleAuto = (on: boolean) => {
        setAutoPref(on);
        try {
            localStorage.setItem(AUTO_PREF_KEY, on ? "on" : "off");
        } catch {
            /* ignore */
        }
    };

    useEffect(() => {
        if (openSignal > 0) setOpen(true);
    }, [openSignal]);

    if (!enabled || sectionStep < 1 || sectionStep > 11) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="cer-helpfab fixed z-[55] flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-0 bg-[linear-gradient(135deg,#0e5f63,#12a5a0)] text-white shadow-[0_10px_26px_rgba(14,125,116,0.35)] transition hover:scale-105 print:hidden"
                style={{
                    right: "1rem",
                    bottom: "calc(17rem + env(safe-area-inset-bottom, 0px))",
                }}
                title="Section help — how to fill this section, with examples"
                aria-label="Open the guide for this section"
            >
                <BookOpen className="h-5 w-5" aria-hidden />
                <span className="pointer-events-none absolute -top-2 -left-1 rounded-full bg-[#c9a227] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#16313d]">
                    Help
                </span>
            </button>

            <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
                <DialogContent className="relative flex h-[min(94vh,960px)] w-[calc(100vw-1rem)] max-w-5xl flex-col overflow-hidden bg-[#f8fcfd] p-0 gap-0">
                    <DialogTitle className="sr-only">Community Engagement — The Student Guide</DialogTitle>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
                        {/* showHero=false: this floating in-wizard coach must show only the current
                            section's guidance, never the large CIEL-branded hero banner — that's
                            appropriate for the standalone pre-report guide page, not a per-section
                            popup opened mid-wizard. */}
                        {open ? <StudentCommunityGuide wizardStep={sectionStep} showHero={false} /> : null}
                    </div>

                    <DialogFooter className="shrink-0 flex-col gap-3 border-t border-[#dcebee] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-[#5d727a]">
                            <input
                                type="checkbox"
                                checked={autoPref}
                                onChange={(e) => toggleAuto(e.target.checked)}
                                className="h-4 w-4 accent-[#0e7d74]"
                            />
                            Show this guide automatically when I reach a new section
                        </label>
                        <Button
                            type="button"
                            onClick={close}
                            className="h-10 w-full gap-2 rounded-lg bg-[#0e7d74] font-semibold text-white hover:bg-[#0c6b64] sm:w-auto sm:min-w-[200px]"
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
