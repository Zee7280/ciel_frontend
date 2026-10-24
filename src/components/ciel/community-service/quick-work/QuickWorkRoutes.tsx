"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QUICK_WORK_HREF } from "@/utils/quickWorkApi";
import { BookIcon, LeafIcon, QuickWorkIntroDialog, RouteChoiceDialog } from "./QuickWorkShared";

/** Where "Structured Community Service" leads on the hub: the existing 16-hour tools below. */
export const STRUCTURED_TOOLS_ANCHOR = "structured-tools";

/**
 * Route popups for the Community Service hub. `openIntro` explains Quick Community Work before the
 * log opens; `openCompare` answers "Which route should I use?". Render `dialogs` once.
 */
export function useQuickWorkRoutes(onStructured?: () => void) {
    const router = useRouter();
    const [open, setOpen] = useState<"intro" | "compare" | null>(null);
    const close = useCallback(() => setOpen(null), []);
    const goStructured = useCallback(() => {
        setOpen(null);
        if (onStructured) return onStructured();
        document.getElementById(STRUCTURED_TOOLS_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [onStructured]);

    const dialogs: ReactNode =
        open === "intro" ? (
            <QuickWorkIntroDialog
                onClose={close}
                onContinue={() => {
                    setOpen(null);
                    router.push(`${QUICK_WORK_HREF}?log=new`);
                }}
                onStructured={goStructured}
            />
        ) : open === "compare" ? (
            <RouteChoiceDialog onClose={close} onStructured={goStructured} onQuick={() => setOpen("intro")} />
        ) : null;

    return {
        openIntro: useCallback(() => setOpen("intro"), []),
        openCompare: useCallback(() => setOpen("compare"), []),
        goStructured,
        dialogs,
    };
}

/** The two route cards and the 16-hour reminder, placed above the existing Community Service tools. */
export function QuickWorkRouteCards({ onQuick, onStructured }: { onQuick: () => void; onStructured: () => void }) {
    return (
        <section aria-label="Choose your community service route" className="mt-5">
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-5">
                <article className="flex flex-col items-start rounded-[18px] border border-[#ccdfe0] border-t-4 border-t-[#136d67] bg-white px-5 py-5 shadow-[0_5px_20px_#173c3806] sm:px-7 sm:py-6">
                    <div className="mb-4 flex w-full items-center justify-between gap-3">
                        <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-[#ebf5f1] text-[#12685d]">
                            <BookIcon className="h-[23px] w-[23px]" />
                        </span>
                        <span className="rounded-full bg-[#edf6f3] px-3 py-1.5 text-[9px] font-extrabold tracking-[0.6px] text-[#21615b] sm:text-[10px] sm:tracking-[0.9px]">
                            16-HOUR REQUIREMENT
                        </span>
                    </div>
                    <h2 className="mb-2.5 text-[22px] font-bold leading-tight tracking-[-0.6px] text-[#163d50] sm:text-[25px]">Structured Community Service</h2>
                    <p className="max-w-[480px] text-[13px] leading-relaxed text-[#526d74]">
                        Working towards your university’s HEC-aligned community service requirement? Choose this route.
                    </p>
                    <ul className="mb-5 mt-3.5 list-disc pl-[18px] text-xs leading-[1.9] text-[#3c5961]">
                        <li>At least 16 verified hours per student</li>
                        <li>Structured project and detailed report</li>
                    </ul>
                    <button
                        type="button"
                        onClick={onStructured}
                        className="mt-auto flex w-full items-center justify-between rounded-[9px] bg-[#12685d] px-[18px] py-[13px] text-sm font-semibold text-white hover:bg-[#104c46]"
                    >
                        Open Structured Service <span aria-hidden="true">→</span>
                    </button>
                    <small className="mt-2.5 text-[11px] leading-normal text-[#637875] sm:text-[10px]">
                        Find or create an opportunity, then complete your report.
                    </small>
                </article>
                <article className="flex flex-col items-start rounded-[18px] border border-[#e8d9b7] border-t-4 border-t-[#efa11c] bg-[#fffdf7] px-5 py-5 shadow-[0_5px_20px_#173c3806] sm:px-7 sm:py-6">
                    <div className="mb-4 flex w-full items-center justify-between gap-3">
                        <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-[#fff0ce] text-[#986100]">
                            <LeafIcon className="h-[23px] w-[23px]" />
                        </span>
                        <span className="rounded-full bg-[#fff1d5] px-3 py-1.5 text-[9px] font-extrabold tracking-[0.6px] text-[#825507] sm:text-[10px] sm:tracking-[0.9px]">
                            SHORT UNIVERSITY ACTIVITIES
                        </span>
                    </div>
                    <h2 className="mb-2.5 text-[22px] font-bold leading-tight tracking-[-0.6px] text-[#163d50] sm:text-[25px]">Quick Community Work</h2>
                    <p className="max-w-[480px] text-[13px] leading-relaxed text-[#526d74]">
                        Took part in a short activity at university? Record what you did through a brief activity log.
                    </p>
                    <ul className="mb-5 mt-3.5 list-disc pl-[18px] text-xs leading-[1.9] text-[#3c5961]">
                        <li>Tree drives, awareness events, clean-ups and more</li>
                        <li>Actual attendance, evidence and final faculty approval</li>
                    </ul>
                    <button
                        type="button"
                        onClick={onQuick}
                        className="mt-auto flex w-full items-center justify-between rounded-[9px] bg-[#f4a51c] px-[18px] py-[13px] text-sm font-extrabold text-[#2e270e] hover:bg-[#e99a12]"
                    >
                        Quick Community Work <span aria-hidden="true">→</span>
                    </button>
                    <small className="mt-2.5 text-[11px] leading-normal text-[#637875] sm:text-[10px]">
                        Separate activity record · does not automatically fulfil 16 hours.
                    </small>
                </article>
            </div>
            <div className="mb-2 mt-[18px] flex items-start gap-2.5 rounded-[10px] border border-[#dbe9ee] bg-[#eaf2f5] px-3 py-3 text-[11px] text-[#375965] sm:items-center sm:px-4 sm:text-xs">
                <span aria-hidden="true" className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-[#d4e5ec] font-serif font-bold">
                    i
                </span>
                <p className="m-0">
                    <b>Completing your 16-hour requirement?</b> Choose <b>Structured Community Service</b>. Use <b>Quick Community Work</b> for short
                    university activities, recorded separately.
                </p>
            </div>
        </section>
    );
}

/** Below the tools: a way back to submitted quick-work records. */
export function QuickWorkRecordLink() {
    return (
        <section className="my-5 flex flex-col items-start justify-between gap-4 rounded-[14px] border border-[#dce5df] bg-white px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
                <h3 className="text-[15px] font-semibold text-[#163d3b]">Already submitted quick community work?</h3>
                <p className="mt-1 text-xs text-[#57706e]">Track faculty decisions and your approved quick-work hours.</p>
            </div>
            <Link
                href={QUICK_WORK_HREF}
                className="inline-flex w-full items-center justify-center rounded-lg border border-[#b8cec3] bg-white px-4 py-2.5 text-xs font-semibold text-[#12685d] hover:bg-[#f5faf7] sm:w-auto"
            >
                View My Quick Work →
            </Link>
        </section>
    );
}
