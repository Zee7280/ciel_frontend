"use client";

import { useState } from "react";
import { authenticatedFetch } from "@/utils/api";

type Kind = "course_project" | "fyp" | "venture";

/** Real invite-state badge for a team member row — replaces the old always-on "LINKED" badge that
 * showed regardless of whether anything was actually sent/verified. Shown only once an email is
 * typed; `entryId` is the saved record's own id (undefined before the first save, in which case we
 * can't yet know or resend the invite state). */
export function TeamInviteBadge({
    kind,
    entryId,
    email,
    inviteStatus,
}: {
    kind: Kind;
    entryId?: string;
    email?: string;
    inviteStatus?: "pending" | "accepted";
}) {
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    if (!email?.trim()) return null;

    const resend = async () => {
        if (!entryId || resending) return;
        setResending(true);
        try {
            const res = await authenticatedFetch(
                "/api/v1/paths/team-invites/resend",
                { method: "POST", body: JSON.stringify({ kind, entryId, email }) },
                { redirectToLogin: false },
            );
            if (res?.ok) setResent(true);
        } finally {
            setResending(false);
        }
    };

    if (inviteStatus === "accepted") {
        return (
            <span className="flex items-center justify-center gap-1 rounded-full bg-ciel-green-soft px-3 py-2 text-center text-[10px] font-black text-ciel-green-deep">
                ✅ Confirmed — visible on their dashboard
            </span>
        );
    }

    if (inviteStatus === "pending") {
        return (
            <span className="flex flex-col items-center justify-center gap-0.5 rounded-full bg-ciel-gold-soft px-3 py-2 text-center text-[10px] font-black text-ciel-gold-deep">
                <span>✉️ Invited — awaiting confirmation</span>
                <button
                    type="button"
                    onClick={resend}
                    disabled={resending || resent}
                    className="font-bold normal-case tracking-normal underline disabled:no-underline disabled:opacity-60"
                >
                    {resent ? "Invite resent" : resending ? "Resending…" : "Resend invite"}
                </button>
            </span>
        );
    }

    return (
        <span className="flex items-center justify-center rounded-full bg-ciel-page px-3 py-2 text-center text-[10px] font-black text-ciel-text-mid">
            Will invite on save
        </span>
    );
}
