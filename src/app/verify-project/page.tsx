"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Home, ExternalLink, LogIn } from "lucide-react";
import Link from "next/link";
import {
    fetchVerificationVerify,
    outcomeFromVerificationResponse,
} from "@/utils/verificationVerifyUx";
import {
    buildVerificationSignupHref,
    clearPersistedVerificationReturn,
    isSafeInternalReturnPath,
    persistVerificationReturnFromWindow,
} from "@/utils/verificationReturnUrl";
import {
    VERIFY_CTA_PROJECT_BODY,
    VERIFY_EMAIL_MATCH_HINT,
} from "@/config/verificationPageCopy";

/**
 * CIEL verification landing (faculty, partner, or liaison — role is in the token only).
 * Calls same-origin `/api/v1/verifications/verify` (GET `?token=` or POST `{ token }` via env).
 */
function VerifyProjectContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const returnToParam = searchParams.get("returnTo");
    const safeReturnTo =
        returnToParam && isSafeInternalReturnPath(returnToParam) ? returnToParam : null;

    const [status, setStatus] = useState<"loading" | "auth_required" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying your project claim...");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid verification link. The security token is missing.");
            return;
        }

        const postAuthReturn =
            pathname && token ? `${pathname}?${searchParams.toString()}` : "";
        const loginUrl =
            postAuthReturn && isSafeInternalReturnPath(postAuthReturn)
                ? `/login?next=${encodeURIComponent(postAuthReturn)}`
                : "/login";

        const verifyToken = async () => {
            try {
                const bearer =
                    typeof window !== "undefined" ? localStorage.getItem("ciel_token") : null;
                if (!bearer) {
                    persistVerificationReturnFromWindow();
                    router.replace(loginUrl);
                    return;
                }

                setStatus("loading");
                setMessage("Verifying your project claim...");
                const response = await fetchVerificationVerify(token, bearer);

                const data = (await response.json().catch(() => ({}))) as {
                    success?: boolean;
                    message?: string;
                };

                const out = outcomeFromVerificationResponse(
                    response,
                    data,
                    "Verification completed. Thank you.",
                );

                if (out.kind === "success") {
                    clearPersistedVerificationReturn();
                    setStatus("success");
                    setMessage(out.message);
                    if (safeReturnTo) {
                        window.setTimeout(() => {
                            router.replace(safeReturnTo);
                        }, 900);
                    }
                    return;
                }
                if (out.kind === "auth_required") {
                    persistVerificationReturnFromWindow();
                    setStatus("auth_required");
                    setMessage(out.message);
                    return;
                }
                setStatus("error");
                setMessage(out.message);
            } catch (error) {
                console.error("Verification error:", error);
                setStatus("error");
                setMessage("A connection error occurred with the CIEL servers. Please try again later.");
            }
        };

        const bearerNow =
            typeof window !== "undefined" ? localStorage.getItem("ciel_token") : null;
        const delayMs = bearerNow ? 600 : 0;

        const timer = setTimeout(verifyToken, delayMs);
        return () => clearTimeout(timer);
    }, [token, pathname, safeReturnTo, searchParams, router]);

    const postAuthReturn =
        token && pathname
            ? `${pathname}?${searchParams.toString()}`
            : "";
    const loginHref =
        postAuthReturn && isSafeInternalReturnPath(postAuthReturn)
            ? `/login?next=${encodeURIComponent(postAuthReturn)}`
            : "/login";
    const signupHref =
        postAuthReturn && isSafeInternalReturnPath(postAuthReturn)
            ? buildVerificationSignupHref(postAuthReturn)
            : "/signup";

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-outfit">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden relative">
                {/* Visual Flair */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-50 rounded-full opacity-50 blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-50 rounded-full opacity-50 blur-3xl animate-pulse"></div>

                <div className="p-10 relative z-10 text-center">
                    {/* Brand Header */}
                    <div className="mb-10 flex flex-col items-center">
                        <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                            Liaison Portal
                        </div>
                        <h2 className="font-dancing text-2xl text-blue-600 font-bold">Ciel PK</h2>
                    </div>

                    {/* Status Illustration */}
                    <div className="mb-8 flex justify-center">
                        {status === "auth_required" && (
                            <div className="relative">
                                <div className="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center">
                                    <LogIn className="w-10 h-10 text-amber-600" />
                                </div>
                            </div>
                        )}
                        {status === "loading" && (
                            <div className="relative">
                                <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                </div>
                                <div className="absolute -inset-2 border-2 border-dashed border-blue-200 rounded-[2.5rem] animate-[spin_10s_linear_infinite]"></div>
                            </div>
                        )}
                        {status === "success" && (
                            <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center animate-in zoom-in duration-500 shadow-xl shadow-emerald-100 ring-2 ring-emerald-100">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            </div>
                        )}
                        {status === "error" && (
                            <div className="w-24 h-24 bg-rose-50 rounded-[2rem] flex items-center justify-center animate-in zoom-in duration-500 shadow-xl shadow-rose-100 ring-2 ring-rose-100">
                                <XCircle className="w-12 h-12 text-rose-500" />
                            </div>
                        )}
                    </div>

                    {/* Messaging */}
                    <h1 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
                        {status === "loading"
                            ? "Validating Claim..."
                            : status === "auth_required"
                              ? "Sign in required"
                              : status === "success"
                                ? "Verification Successful"
                                : "Validation Failed"}
                    </h1>

                    <p className="text-slate-500 font-medium leading-relaxed px-4 mb-4">
                        {message}
                    </p>

                    {status === "error" && postAuthReturn && isSafeInternalReturnPath(postAuthReturn) && (
                        <div className="px-4 mb-6">
                            <Link
                                href={loginHref}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                            >
                                Sign in / use another account
                            </Link>
                        </div>
                    )}

                    {status === "auth_required" && (
                        <div className="text-left space-y-3 mb-8 px-2">
                            <p className="text-xs font-medium text-amber-900/90 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 leading-relaxed">
                                {VERIFY_EMAIL_MATCH_HINT}
                            </p>
                            <p className="text-sm text-slate-600 leading-relaxed">{VERIFY_CTA_PROJECT_BODY}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                        {status === "auth_required" && (
                            <>
                                <Link
                                    href={loginHref}
                                    className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg shadow-slate-200 hover:shadow-blue-200 group"
                                >
                                    <LogIn className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Sign in (I already have an account)
                                </Link>
                                <Link
                                    href={signupHref}
                                    className="flex items-center justify-center gap-2 w-full bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-800 font-bold py-4 px-6 rounded-2xl transition-all duration-300"
                                >
                                    Sign up — create an account
                                </Link>
                            </>
                        )}
                        {status !== "loading" && status !== "auth_required" && (
                            <Link
                                href="/"
                                className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg shadow-slate-200 hover:shadow-blue-200 group"
                            >
                                <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                Return Home
                            </Link>
                        )}

                        {status === "error" && (
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center justify-center gap-2 w-full bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 hover:text-slate-900 font-bold py-4 px-6 rounded-2xl transition-all duration-300"
                            >
                                <Loader2 className="w-4 h-4" />
                                Refresh Token
                            </button>
                        )}

                        <div className="pt-8 flex items-center justify-center gap-4 border-t border-slate-50">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                Lab Verified
                            </span>
                            <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                            <Link href="/about" className="text-[10px] font-black text-blue-400 hover:text-blue-600 uppercase tracking-widest flex items-center gap-1 transition-colors">
                                Learn More <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function VerifyProjectPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        }>
            <VerifyProjectContent />
        </Suspense>
    );
}
