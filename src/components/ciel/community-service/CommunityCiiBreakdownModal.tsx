"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { pickCiiV45DisplayBadgeName, pickCiiV45DisplayScore } from "@/utils/reportCiiSnapshot";
import { CiiFinalOnePageSheet } from "@/components/ciel/community-service/CiiFinalOnePageSheet";

type CiiSection = {
    dimension: string;
    name: string;
    maximumPoints: number;
    score: number | null;
};

type CiiBreakdown = {
    finalCII?: number | null;
    diagnosticCII?: number | null;
    aiReportScore?: number | null;
    knownBasePoints?: number | null;
    baseCII?: number | null;
    finalBadge?: { level?: number; numericLevel?: number; name?: string } | null;
    recommendedBadge?: { level?: number; numericLevel?: number; name?: string } | null;
    diagnosticBadge?: { level?: number; numericLevel?: number; name?: string } | null;
    sectionScores?: CiiSection[];
    strengths?: string[];
    developmentPriorities?: string[];
    studentFeedback?: string;
    analysisSummary?: string;
};

/**
 * Read-only CII analysis sheet for non-faculty stakeholders (NGO, Partner, University, Super
 * Admin) — same FINAL-110 one-page design as Admin analyser / student / faculty analysis.
 * `fetchUrl` picks the caller's own role-scoped endpoint; this component doesn't know or care
 * which role is viewing it.
 */
export default function CommunityCiiBreakdownModal({
    fetchUrl,
    title,
    onClose,
}: {
    fetchUrl: string;
    title: string;
    onClose: () => void;
}) {
    const [state, setState] = useState<"loading" | "ok" | "error">("loading");
    const [data, setData] = useState<CiiBreakdown | null>(null);
    const [lock, setLock] = useState<{ locked?: boolean | string; lockedAt?: string; adminNote?: string } | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        setState("loading");
        authenticatedFetch(fetchUrl, {}, { redirectToLogin: false })
            .then(async (r) => {
                if (cancelled) return;
                if (!r?.ok) {
                    const body = await r?.json().catch(() => null);
                    setErrorMessage(body?.message || "This record isn't faculty-approved yet, or isn't in your scope.");
                    setState("error");
                    return;
                }
                const json = await r.json();
                setData(json?.data?.ciiV45 ?? null);
                setLock(json?.data?.ciiV45Lock ?? null);
                setState("ok");
            })
            .catch(() => {
                if (cancelled) return;
                setErrorMessage("Could not load the CII breakdown.");
                setState("error");
            });
        return () => {
            cancelled = true;
        };
    }, [fetchUrl]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const badge = data?.finalBadge || data?.recommendedBadge || data?.diagnosticBadge;
    const badgeLevelRaw = Number(badge?.numericLevel ?? badge?.level);

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center overflow-auto bg-[rgba(7,28,35,.58)] p-4 sm:p-6"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                className="relative max-h-[92vh] w-[min(960px,96vw)] overflow-auto rounded-[22px] bg-[#f0efe8] shadow-[0_28px_70px_rgba(0,0,0,.24)]"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3.5 top-3.5 z-10 grid h-[30px] w-[30px] place-items-center rounded-full border-0 bg-[#0c312d] text-[15px] font-black text-white"
                    aria-label="Close"
                >
                    ×
                </button>
                <div className="p-3 sm:p-5">
                    {state === "loading" && <p className="py-8 text-center text-sm text-slate-500">Loading…</p>}
                    {state === "error" && (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
                            {errorMessage}
                        </p>
                    )}
                    {state === "ok" && data && (
                        <CiiFinalOnePageSheet
                            title={title}
                            studentName="Student"
                            reportId={undefined}
                            score={pickCiiV45DisplayScore(data, lock)}
                            badgeName={pickCiiV45DisplayBadgeName(data, lock) || badge?.name || null}
                            badgeLevel={Number.isFinite(badgeLevelRaw) ? badgeLevelRaw : null}
                            lockedAt={lock?.lockedAt || null}
                            sections={data.sectionScores || []}
                            analysis={data.studentFeedback || data.analysisSummary || ""}
                            strengths={data.strengths || []}
                            limitations={data.developmentPriorities || []}
                            adminComment={lock?.adminNote || ""}
                            showPrint={false}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
