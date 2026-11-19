"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Users, X } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { roleHasNotificationInbox } from "@/utils/cielNotificationsUnread";

export const TEAM_POPUP_SEEN_KEY_PREFIX = "ciel:team-change-popup:";
export const TEAM_NOTIFICATION_TYPE = "team";
/** Older roster notices are history, not news: never pop those up. */
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const POLL_MS = 60_000;

export type TeamNotification = {
    id: number | string;
    type?: string;
    title?: string;
    message?: string;
    isRead?: boolean;
    createdAt?: string;
};

function readSeen(userId: string): Set<string> | null {
    try {
        const raw = window.localStorage.getItem(TEAM_POPUP_SEEN_KEY_PREFIX + userId);
        const list: unknown = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(list) ? list.map(String) : []);
    } catch {
        return null;
    }
}

function markSeen(userId: string, ids: string[]) {
    try {
        const seen = readSeen(userId) ?? new Set<string>();
        ids.forEach((id) => seen.add(id));
        window.localStorage.setItem(TEAM_POPUP_SEEN_KEY_PREFIX + userId, JSON.stringify([...seen].slice(-300)));
    } catch {
        /* storage blocked: the popup simply will not be remembered */
    }
}

function fmtWhen(value?: string): string {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? ""
        : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** Splits "Project: joined — A, B. left — C." into readable lines. */
export function splitTeamMessage(message: string): string[] {
    return message
        .split(/(?<=\.)\s+(?=(?:joined|left)\b)/i)
        .map((part) => part.trim())
        .filter(Boolean);
}

/**
 * One-time pop-up for team roster changes ("who joined, who left"). The backend already emails
 * every member and drops a `team` notification in their inbox; this surfaces that notification
 * the moment the member opens any dashboard page, once per notification, then marks it read.
 */
export default function TeamChangePopup() {
    const userIdRef = useRef("");
    const [items, setItems] = useState<TeamNotification[]>([]);

    const check = useCallback(async (uid: string) => {
        const seen = readSeen(uid);
        if (!seen) return;
        try {
            const res = await authenticatedFetch(
                `/api/v1/notifications?type=${TEAM_NOTIFICATION_TYPE}&status=unread&limit=10`,
                {},
                { redirectToLogin: false },
            );
            if (!res || !res.ok) return;
            const body = (await res.json()) as { data?: TeamNotification[] };
            const rows = Array.isArray(body?.data) ? body.data : [];
            const now = Date.now();
            const fresh = rows.filter((n) => {
                if (!n || n.id == null || n.isRead) return false;
                if (String(n.type || "").toLowerCase() !== TEAM_NOTIFICATION_TYPE) return false;
                if (seen.has(String(n.id))) return false;
                const at = n.createdAt ? new Date(n.createdAt).getTime() : NaN;
                return !Number.isFinite(at) || now - at <= MAX_AGE_MS;
            });
            if (fresh.length) setItems(fresh.slice(0, 5));
        } catch {
            /* dashboards never break on this popup */
        }
    }, []);

    useEffect(() => {
        const user = readStoredCurrentUser();
        const uid = String(user?.id || "").trim();
        if (!uid || !roleHasNotificationInbox(typeof user?.role === "string" ? user.role : "")) return;
        userIdRef.current = uid;
        // First check runs after mount settles; then every minute and whenever the tab comes back.
        const first = window.setTimeout(() => void check(uid), 0);
        const timer = window.setInterval(() => void check(uid), POLL_MS);
        const onVisible = () => {
            if (document.visibilityState === "visible") void check(uid);
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            window.clearTimeout(first);
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [check]);

    const dismiss = async () => {
        const ids = items.map((n) => String(n.id));
        if (userIdRef.current) markSeen(userIdRef.current, ids);
        setItems([]);
        await Promise.all(
            ids.map((id) =>
                authenticatedFetch(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "PUT" }, { redirectToLogin: false }).catch(
                    () => null,
                ),
            ),
        );
    };

    if (!items.length) return null;

    return (
        <div
            data-ciel-team-change-popup
            role="dialog"
            aria-modal="true"
            aria-labelledby="ciel-team-change-title"
            className="fixed inset-0 z-[120] flex items-end justify-center bg-[#0b2a33]/55 p-4 sm:items-center"
        >
            <div className="w-full max-w-md rounded-2xl border border-[#cfe3df] bg-white p-5 shadow-[0_24px_60px_rgba(11,42,51,.35)] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#0e7d74] text-white">
                            <Users className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0e7d74]">Team update</p>
                            <h2 id="ciel-team-change-title" className="text-base font-bold text-[#16313d]">
                                {items.length === 1 ? items[0].title || "Your project team changed" : "Your project teams changed"}
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => void dismiss()}
                        aria-label="Close"
                        className="rounded-full p-1.5 text-[#6b7c86] hover:bg-slate-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <ul className="mt-4 space-y-3">
                    {items.map((n) => (
                        <li key={String(n.id)} className="rounded-xl border border-[#e3ecef] bg-[#f7fbfa] px-4 py-3">
                            {items.length > 1 && n.title ? <p className="text-[12px] font-bold text-[#16313d]">{n.title}</p> : null}
                            {splitTeamMessage(n.message || "").map((line, i) => (
                                <p key={i} className="text-[13px] leading-snug text-[#2f4a5a]">
                                    {line}
                                </p>
                            ))}
                            {n.createdAt ? <p className="mt-1 text-[10.5px] text-[#8aa0a6]">{fmtWhen(n.createdAt)}</p> : null}
                        </li>
                    ))}
                </ul>

                <p className="mt-3 text-[11.5px] text-[#6b7c86]">The same notice was emailed to every team member. It stays in your notifications.</p>
                <button
                    type="button"
                    onClick={() => void dismiss()}
                    className="mt-4 w-full rounded-xl bg-[#0e7d74] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b6a62]"
                >
                    Got it
                </button>
            </div>
        </div>
    );
}
