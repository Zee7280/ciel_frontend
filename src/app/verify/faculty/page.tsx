"use client";

/**
 * Legacy emails may use FRONTEND_URL/verify/faculty?token=…
 * Faculty complete the request from Dashboard → Approvals (no auto-call to /verifications/verify).
 */
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { XCircle, Loader2, Home, LogIn, ClipboardList } from "lucide-react";
import Link from "next/link";
import {
    buildVerificationSignupHref,
    isSafeInternalReturnPath,
} from "@/utils/verificationReturnUrl";

const FACULTY_APPROVALS_HREF = "/dashboard/faculty/approvals?tab=pending";

function FacultyVerifyContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "portal" | "error">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid link. The security token is missing.");
            return;
        }

        const bearer =
            typeof window !== "undefined" ? window.localStorage.getItem("ciel_token") : null;
        if (!bearer) {
            const loginUrl = `/login?next=${encodeURIComponent(FACULTY_APPROVALS_HREF)}`;
            router.replace(loginUrl);
            return;
        }

        setStatus("portal");
        setMessage(
            "You are signed in. Open Approvals to review and approve or reject this request in the portal — nothing is confirmed automatically from this link.",
        );
    }, [token, router]);

    const signupHref = buildVerificationSignupHref(FACULTY_APPROVALS_HREF, { presetRole: "faculty" });

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-10 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Faculty verification</p>
                <div className="flex justify-center mb-6">
                    {status === "loading" && <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />}
                    {status === "portal" && <ClipboardList className="w-12 h-12 text-emerald-600" />}
                    {status === "error" && <XCircle className="w-12 h-12 text-rose-500" />}
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-2">
                    {status === "loading"
                        ? "Opening CIEL…"
                        : status === "portal"
                          ? "Complete in Approvals"
                          : "Could not open link"}
                </h1>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">{message}</p>
                {status === "portal" && (
                    <div className="space-y-3 mb-2">
                        <Link
                            href={FACULTY_APPROVALS_HREF}
                            className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800"
                        >
                            <ClipboardList className="w-4 h-4" />
                            Go to Approvals
                        </Link>
                    </div>
                )}
                {status === "error" && token && pathname && isSafeInternalReturnPath(pathname) && (
                    <div className="space-y-3 mb-4">
                        <Link
                            href={`/login?next=${encodeURIComponent(FACULTY_APPROVALS_HREF)}`}
                            className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800"
                        >
                            <LogIn className="w-4 h-4" />
                            Sign in
                        </Link>
                        <Link
                            href={signupHref}
                            className="inline-flex items-center justify-center gap-2 w-full bg-white border border-slate-200 text-slate-800 font-semibold py-3 rounded-xl hover:bg-slate-50"
                        >
                            Sign up — Faculty account
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

export default function FacultyVerifyPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
            }
        >
            <FacultyVerifyContent />
        </Suspense>
    );
}
