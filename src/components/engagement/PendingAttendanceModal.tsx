"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Clock, X } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { extractPendingAttendanceRows } from "@/utils/engagementPendingAttendanceResponse";

type PendingAttendanceModalProps = {
    /** faculty → /dashboard/faculty/attendance-review ; partner → /dashboard/partner/attendance-review */
    variant: "faculty" | "partner";
};

const SESSION_DISMISS_PREFIX = "ciel_pending_attendance_popup_dismissed_";

/**
 * One-session popup when the signed-in faculty/partner has pending engagement
 * attendance waiting for approval. Does not change existing review pages.
 */
export default function PendingAttendanceModal({ variant }: PendingAttendanceModalProps) {
    const [open, setOpen] = useState(false);
    const [count, setCount] = useState(0);

    const reviewHref =
        variant === "faculty"
            ? "/dashboard/faculty/attendance-review"
            : "/dashboard/partner/attendance-review";
    const dismissKey = `${SESSION_DISMISS_PREFIX}${variant}`;

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (sessionStorage.getItem(dismissKey) === "1") return;

        let cancelled = false;
        (async () => {
            try {
                const res = await authenticatedFetch("/api/v1/engagement/attendance/pending", {
                    method: "GET",
                }, { redirectToLogin: false });
                if (!res?.ok || cancelled) return;
                const json = await res.json().catch(() => null);
                const rows = extractPendingAttendanceRows(json);
                if (cancelled || rows.length === 0) return;
                setCount(rows.length);
                setOpen(true);
            } catch {
                // Non-blocking — dashboard still works without the popup.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [dismissKey]);

    const dismiss = () => {
        try {
            sessionStorage.setItem(dismissKey, "1");
        } catch {
            /* ignore */
        }
        setOpen(false);
    };

    if (!open || count <= 0) return null;

    const roleLabel = variant === "faculty" ? "Faculty" : "Partner";

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={dismiss}
            />
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Close"
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="bg-amber-50 px-6 pb-5 pt-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                        <Clock className="h-7 w-7" />
                    </div>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
                        {roleLabel} review needed
                    </p>
                    <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                        Pending attendance approval
                    </h2>
                </div>

                <div className="space-y-4 px-6 py-5 text-center">
                    <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-left">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <p className="text-sm font-medium leading-relaxed text-amber-950">
                            You have{" "}
                            <strong className="font-black">
                                {count} pending attendance {count === 1 ? "entry" : "entries"}
                            </strong>{" "}
                            waiting for your review. Students cannot unlock attendance until you approve or reject these sessions.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Link
                            href={reviewHref}
                            onClick={dismiss}
                            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 text-xs font-black uppercase tracking-widest text-white transition hover:bg-amber-700"
                        >
                            Review attendance now
                        </Link>
                        <button
                            type="button"
                            onClick={dismiss}
                            className="text-[11px] font-black uppercase tracking-widest text-slate-400 transition hover:text-slate-600"
                        >
                            Remind me later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
