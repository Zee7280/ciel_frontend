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
};

/**
 * Floating “Section guide” control for the student report flow.
 * Opens the Community Engagement student guide (student-guide-final.html) on the matching section.
 * Does not change the report stepper, save, or submit.
 */
export function ReportSectionGuideFloat({
    sectionStep,
    enabled = true,
    openSignal = 0,
}: ReportSectionGuideFloatProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [sectionStep]);

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
                title="Community Engagement — The Student Guide"
                aria-label="Open Community Engagement student guide"
            >
                <BookOpen className="h-5 w-5" aria-hidden />
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="relative flex h-[min(94vh,960px)] w-[calc(100vw-1rem)] max-w-5xl flex-col overflow-hidden bg-[#f8fcfd] p-0 gap-0">
                    <DialogTitle className="sr-only">Community Engagement — The Student Guide</DialogTitle>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
                        {open ? <StudentCommunityGuide wizardStep={sectionStep} /> : null}
                    </div>

                    <DialogFooter className="shrink-0 border-t border-[#dcebee] bg-white px-4 py-3 sm:px-5">
                        <Button
                            type="button"
                            onClick={() => setOpen(false)}
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
