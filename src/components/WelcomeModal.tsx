"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PartyPopper, X } from "lucide-react";
import {
    getProfilePagePathForRole,
    isProfileCompleteForDashboardRole,
} from "@/utils/profileCompletion";
import { readDashboardNavRoleFromStorage } from "@/utils/dashboardNavRole";

const WELCOME_MODAL_SEEN_KEY = "ciel_welcome_modal_seen_v1";

function readSeenMap(): Record<string, boolean> {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(WELCOME_MODAL_SEEN_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function markSeen(userId: string) {
    if (typeof window === "undefined" || !userId) return;
    try {
        const seen = readSeenMap();
        seen[userId] = true;
        window.localStorage.setItem(WELCOME_MODAL_SEEN_KEY, JSON.stringify(seen));
    } catch {
        // Ignore storage errors (e.g. private browsing quota) — non-critical.
    }
}

/**
 * One-time welcome popup for student and faculty (same flow): incomplete profile
 * on first dashboard visit → prompt to update profile, then explore CIEL.
 */
export default function WelcomeModal() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [profilePath, setProfilePath] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!window.localStorage.getItem("ciel_token")) return;

        let user: Record<string, unknown>;
        try {
            const raw = window.localStorage.getItem("ciel_user") || window.localStorage.getItem("user");
            if (!raw) return;
            user = JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return;
        }

        const userId = String(user.id ?? user.userId ?? user.user_id ?? "").trim();
        const navRole = readDashboardNavRoleFromStorage();
        if (!userId || !navRole || navRole === "admin") return;

        // Same welcome flow for student and faculty only.
        if (navRole !== "student" && navRole !== "faculty") return;

        const seen = readSeenMap();
        if (seen[userId]) return;

        if (isProfileCompleteForDashboardRole(navRole, user)) {
            markSeen(userId);
            return;
        }

        const path = getProfilePagePathForRole(navRole);
        if (!path) return;

        setProfilePath(path);
        setIsOpen(true);
        markSeen(userId);
    }, []);

    if (!isOpen) return null;

    const handleUpdateProfile = () => {
        setIsOpen(false);
        if (profilePath) router.push(profilePath);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setIsOpen(false)}
            />
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-200">
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close"
                    className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="bg-[#1a3152] px-8 pb-8 pt-10 text-center text-white">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-400">
                        <PartyPopper className="h-8 w-8" />
                    </div>
                    <h2 className="mt-5 text-2xl font-black tracking-tight">Welcome on Board!</h2>
                </div>

                <div className="px-8 py-7 text-center">
                    <p className="text-sm font-medium leading-relaxed text-slate-600">
                        Before we move ahead, please update your profile — then you can explore everything CIEL has to offer.
                    </p>

                    <div className="mt-7 flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={handleUpdateProfile}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-emerald-700"
                        >
                            Update Profile <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-[11px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-600"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
