"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Home, LogIn, Users } from "lucide-react";
import Link from "next/link";
import {
    buildVerificationSignupHref,
    isSafeInternalReturnPath,
    persistVerificationReturnFromWindow,
} from "@/utils/verificationReturnUrl";
import { authenticatedFetch } from "@/utils/api";

type Preview = {
    kind: "course_project" | "fyp" | "venture";
    entryId: string;
    email: string;
    status: "pending" | "accepted";
    expired: boolean;
    inviterName: string;
    title: string;
    kindLabel: string;
};

function destinationHref(kind: Preview["kind"], entryId: string): string {
    if (kind === "course_project") return `/dashboard/student/paths/course-project/${entryId}`;
    if (kind === "fyp") return "/dashboard/student/paths/fyp-thesis?view=workspace";
    return "/dashboard/student/paths/startup-business?view=workspace";
}

function TeamInviteContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<
        "loading" | "ready" | "accepting" | "accepted" | "error"
    >("loading");
    const [message, setMessage] = useState("");
    const [preview, setPreview] = useState<Preview | null>(null);

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid link. The security token is missing.");
            return;
        }

        const postAuthReturn = pathname ? `${pathname}?${searchParams.toString()}` : "";
        const loginUrl =
            postAuthReturn && isSafeInternalReturnPath(postAuthReturn)
                ? `/login?next=${encodeURIComponent(postAuthReturn)}`
                : "/login";

        const bearer =
            typeof window !== "undefined" ? window.localStorage.getItem("ciel_token") : null;
        if (!bearer) {
            persistVerificationReturnFromWindow();
            router.replace(loginUrl);
            return;
        }

        let cancelled = false;
        (async () => {
            const response = await authenticatedFetch(
                `/api/v1/paths/team-invites/${encodeURIComponent(token)}`,
                { method: "GET" },
                { redirectToLogin: false },
            );
            if (cancelled) return;
            if (!response || !response.ok) {
                setStatus("error");
                setMessage(
                    response?.status === 404
                        ? "This invite link is no longer valid."
                        : "Could not open this invite link. Please try again.",
                );
                return;
            }
            const body = await response.json().catch(() => null);
            const data = body?.data as Preview | undefined;
            if (!data) {
                setStatus("error");
                setMessage("Could not open this invite link. Please try again.");
                return;
            }
            setPreview(data);
            if (data.status === "accepted") {
                setStatus("accepted");
                setMessage("You've already accepted this invite.");
            } else if (data.expired) {
                setStatus("error");
                setMessage("This invite has expired — ask the report owner to resend it.");
            } else {
                setStatus("ready");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token, pathname, searchParams, router]);

    const acceptInvite = useCallback(async () => {
        if (!token) return;
        setStatus("accepting");
        setMessage("");
        const response = await authenticatedFetch(
            `/api/v1/paths/team-invites/${encodeURIComponent(token)}/accept`,
            { method: "POST" },
            { redirectToLogin: false },
        );
        if (!response) {
            setStatus("error");
            setMessage("Could not accept this invite. Please try again.");
            return;
        }
        const body = await response.json().catch(() => null);
        if (!response.ok) {
            setStatus("error");
            setMessage(body?.message || "This invite was sent to a different email address — sign in with that email to accept it.");
            return;
        }
        setStatus("accepted");
        setMessage("You're now linked — this report will appear on your dashboard.");
    }, [token]);

    const postAuthReturn = pathname && token ? `${pathname}?${searchParams.toString()}` : "";
    const signupHref = buildVerificationSignupHref(postAuthReturn || "/dashboard/student");

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-10 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Team invite
                </p>
                <div className="flex justify-center mb-6">
                    {(status === "loading" || status === "accepting") && (
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    )}
                    {status === "ready" && <Users className="w-12 h-12 text-indigo-600" />}
                    {status === "accepted" && <CheckCircle2 className="w-12 h-12 text-emerald-600" />}
                    {status === "error" && <XCircle className="w-12 h-12 text-rose-500" />}
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-2">
                    {status === "loading" && "Opening invite…"}
                    {status === "ready" && "You've been named as a team member"}
                    {status === "accepting" && "Confirming…"}
                    {status === "accepted" && "Confirmed"}
                    {status === "error" && "Could not open this invite"}
                </h1>
                {status === "ready" && preview && (
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                        <strong>{preview.inviterName}</strong> named you as a team member on their{" "}
                        {preview.kindLabel} <strong>&ldquo;{preview.title}&rdquo;</strong>. Nothing appears
                        on your dashboard until you accept.
                    </p>
                )}
                {message && status !== "ready" && (
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">{message}</p>
                )}
                {status === "ready" && (
                    <button
                        type="button"
                        onClick={acceptInvite}
                        className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Accept invite
                    </button>
                )}
                {status === "accepted" && preview && (
                    <div className="space-y-3 mb-2">
                        <Link
                            href={destinationHref(preview.kind, preview.entryId)}
                            className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800"
                        >
                            View it on your dashboard
                        </Link>
                    </div>
                )}
                {status === "error" &&
                    message.includes("different email") &&
                    token &&
                    pathname &&
                    isSafeInternalReturnPath(pathname) && (
                        <div className="space-y-3 mb-4">
                            <Link
                                href={`/login?next=${encodeURIComponent(postAuthReturn)}`}
                                className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800"
                            >
                                <LogIn className="w-4 h-4" />
                                Sign in with the invited email
                            </Link>
                            <Link
                                href={signupHref}
                                className="inline-flex items-center justify-center gap-2 w-full bg-white border border-slate-200 text-slate-800 font-semibold py-3 rounded-xl hover:bg-slate-50"
                            >
                                Sign up with that email instead
                            </Link>
                        </div>
                    )}
                {status !== "loading" && (
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 w-full bg-white border border-slate-200 text-slate-800 font-semibold py-3 rounded-xl hover:bg-slate-50 mt-2"
                    >
                        <Home className="w-4 h-4" />
                        Return home
                    </Link>
                )}
            </div>
        </div>
    );
}

export default function TeamInvitePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
            }
        >
            <TeamInviteContent />
        </Suspense>
    );
}
