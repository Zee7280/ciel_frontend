"use client";

import { useCallback, useEffect, useState } from "react";
import { quickWorkApi } from "@/utils/quickWorkApi";
import { quickImpactPublishedForViewer, type QuickWorkLog } from "@/utils/quickWorkRules";
import { QuickImpactFlashcard, QuickImpactViewer } from "./QuickImpactFlashcard";
import "./quick-impact-flashcard.css";

/**
 * "⚡ Quick Community Impact" on the student's My Impact Wall: flashcards appear only after CIEL PK's final
 * approval. Loads on its own; if Quick Impact Log cannot be read, the section stays hidden so the
 * structured wall is never affected.
 */
export default function QuickImpactWallSection() {
    const [logs, setLogs] = useState<QuickWorkLog[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [open, setOpen] = useState<QuickWorkLog | null>(null);
    const close = useCallback(() => setOpen(null), []);

    useEffect(() => {
        let cancelled = false;
        quickWorkApi
            .mine()
            .then((mine) => {
                if (!cancelled) setLogs(quickImpactPublishedForViewer(mine.logs));
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (failed || logs === null) return null;

    return (
        <section className="mt-8 rounded-2xl border border-[#d7e7f4] bg-[#f7fbff] p-4 sm:p-5" aria-labelledby="qciWallTitle">
            <h2 id="qciWallTitle" className="text-[16px] font-semibold text-[#165683]">
                ⚡ Quick Community Impact
            </h2>
            <p className="mb-3 mt-1 text-[11px] text-[#72899b]">
                Short community work · Separate from structured Community Service · Faculty verified, CIEL PK published
            </p>
            {logs.length ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
                    {logs.map((log) => (
                        <div key={log.id} className="min-w-0">
                            <QuickImpactFlashcard log={log} compact />
                            <button
                                type="button"
                                onClick={() => setOpen(log)}
                                className="mt-2.5 rounded-[10px] bg-[#287db8] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#1f6ca3]"
                            >
                                View Quick Impact Flashcard
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-[#c6ddeb] bg-white p-4 text-[11px] text-[#627f95]">
                    Approved Quick Community Impact flashcards will appear here after final CIEL PK publication.
                </div>
            )}
            {open ? <QuickImpactViewer log={open} onClose={close} /> : null}
        </section>
    );
}
