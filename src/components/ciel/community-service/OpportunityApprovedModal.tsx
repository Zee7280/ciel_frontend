"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { fetchStudentOpportunityMine } from "@/utils/student-community-cache";
import { isStudentOpportunityLiveForReporting } from "@/utils/opportunityWorkflow";
import { buildStudentReportsCheckMap, pickReportStatusFromCheckRow } from "@/utils/studentBrowseReportCta";

const SEEN_KEY_PREFIX = "ciel:opportunity-approved-popup:";

/** Opportunity ids this student already saw the popup for, or null when storage is unavailable. */
function readSeen(userId: string): Set<string> | null {
    try {
        const raw = window.localStorage.getItem(SEEN_KEY_PREFIX + userId);
        const list: unknown = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(list) ? list.map(String) : []);
    } catch {
        return null;
    }
}

function markSeen(userId: string, opportunityId: string) {
    try {
        const seen = readSeen(userId) ?? new Set<string>();
        seen.add(opportunityId);
        window.localStorage.setItem(SEEN_KEY_PREFIX + userId, JSON.stringify([...seen].slice(-200)));
    } catch {
        // Storage blocked: the popup simply will not be remembered.
    }
}

/**
 * One-time "Your Opportunity Is Approved!" popup on the student dashboard. Shown for a
 * student-created opportunity that is live for reporting and has no report yet, once per
 * opportunity. Read-only: it only links to the existing report page.
 */
export default function OpportunityApprovedModal() {
    const router = useRouter();
    const [userId, setUserId] = useState("");
    const [opportunity, setOpportunity] = useState<{ id: string; title: string } | null>(null);

    useEffect(() => {
        let cancelled = false;
        const id = String(readStoredCurrentUser()?.id || "").trim();
        if (!id) return;
        const seen = readSeen(id);
        if (!seen) return;
        void (async () => {
            try {
                const rows = await fetchStudentOpportunityMine();
                const candidates = rows.filter(
                    (row) => row?.id && !seen.has(String(row.id)) && isStudentOpportunityLiveForReporting(row),
                );
                if (cancelled || !candidates.length) return;
                const res = await authenticatedFetch(
                    `/api/v1/students/reports/check?studentId=${encodeURIComponent(id)}`,
                    {},
                    { redirectToLogin: false },
                );
                if (cancelled || !res?.ok) return;
                const json = (await res.json().catch(() => null)) as { success?: boolean; data?: unknown } | null;
                if (cancelled || !json?.success || !Array.isArray(json.data)) return;
                const reports = buildStudentReportsCheckMap(json.data);
                const next = candidates.find((row) => pickReportStatusFromCheckRow(reports.get(String(row.id))) === "none");
                if (!next) return;
                setUserId(id);
                setOpportunity({ id: String(next.id), title: String(next.title || "") });
            } catch {
                // Never block the dashboard on this popup.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const close = useCallback(() => {
        if (opportunity) markSeen(userId, opportunity.id);
        setOpportunity(null);
    }, [opportunity, userId]);

    const startReport = useCallback(() => {
        if (!opportunity) return;
        markSeen(userId, opportunity.id);
        router.push(`/dashboard/student/report?projectId=${encodeURIComponent(opportunity.id)}`);
        setOpportunity(null);
    }, [opportunity, router, userId]);

    useEffect(() => {
        if (!opportunity) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [opportunity, close]);

    if (!opportunity) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#16313d]/40 px-4 backdrop-blur-sm"
            onClick={(event) => {
                if (event.target === event.currentTarget) close();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="opportunity-approved-title"
                className="relative w-full max-w-[640px] rounded-2xl bg-white px-6 pb-8 pt-6 text-center shadow-2xl sm:px-10"
            >
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold tracking-wide text-[#16313d]">CIELPK.COM</span>
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close"
                        className="rounded-full p-1 text-[#4b5d67] hover:bg-[#f1f5f7]"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#e8f6ea]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3fb34f]">
                        <Check className="h-8 w-8 text-white" strokeWidth={3} />
                    </div>
                </div>
                <h2 id="opportunity-approved-title" className="mt-5 text-2xl font-extrabold text-[#0f1f3d] sm:text-3xl">
                    Your Opportunity Is Approved! 🎉
                </h2>
                {opportunity.title ? (
                    <p className="mt-2 text-sm font-semibold text-[#087c75]">{opportunity.title}</p>
                ) : null}
                <p className="mx-auto mt-4 max-w-[480px] text-base leading-relaxed text-[#16313d]">
                    Click <strong>Start Report</strong> and add your team members in <strong>Section 1</strong>, if any. You can add or
                    remove team members later.
                </p>
                <p className="mt-4 text-sm text-[#5d6f7a]">Good luck with your community impact journey!</p>
                <button
                    type="button"
                    onClick={startReport}
                    className="mx-auto mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a6fe0] px-10 py-3 text-base font-bold text-white hover:bg-[#155dc0]"
                >
                    Start Report <ArrowRight className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
