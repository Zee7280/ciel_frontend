"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Home, ExternalLink, LogIn, ClipboardList, Handshake, ArrowRight } from "lucide-react";
import Link from "next/link";
import { fetchVerificationVerify, outcomeFromVerificationResponse } from "@/utils/verificationVerifyUx";
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
import { readDashboardNavRoleFromStorage } from "@/utils/dashboardNavRole";

const FACULTY_APPROVALS_HREF = "/dashboard/faculty/approvals?tab=pending";
const PARTNER_REQUESTS_HREF = "/dashboard/partner/requests";

/**
 * CIEL verification landing (faculty, partner, or liaison — role is in the token only).
 * Faculty: no automatic verify call; complete from Dashboard → Approvals.
 * Partner: optional explicit "Confirm verification" (no auto-run on page load).
 */
function VerifyProjectContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const returnToParam = searchParams.get("returnTo");
    const safeReturnTo =
        returnToParam && isSafeInternalReturnPath(returnToParam) ? returnToParam : null;

    const [status, setStatus] = useState<
        "loading" | "auth_required" | "portal" | "verifying" | "success" | "error"
    >("loading");
    const [message, setMessage] = useState("");
    const [navRole, setNavRole] = useState<ReturnType<typeof readDashboardNavRoleFromStorage>>(null);

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

        const bearer =
            typeof window !== "undefined" ? window.localStorage.getItem("ciel_token") : null;
        if (!bearer) {
            persistVerificationReturnFromWindow();
            router.replace(loginUrl);
            return;
        }

        const role = readDashboardNavRoleFromStorage();
        setNavRole(role);
        setStatus("portal");
        if (role === "partner") {
            setMessage("");
        } else {
            setMessage(
                "You are signed in. Approve or reject this request from Faculty → Approvals — nothing is confirmed automatically from this link.",
            );
        }
    }, [token, pathname, searchParams, router]);

    const runPartnerVerify = useCallback(async () => {
        if (!token) return;
        const bearer = typeof window !== "undefined" ? window.localStorage.getItem("ciel_token") : null;
        if (!bearer) {
            setStatus("auth_required");
            setMessage("Pehle login karein.");
            return;
        }

        setStatus("verifying");
        setMessage("Verifying your project claim...");
        try {
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
    }, [token, safeReturnTo, router]);

    const postAuthReturn =
        token && pathname ? `${pathname}?${searchParams.toString()}` : "";
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
                        <div
                            className={`bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
                                status === "portal" && navRole === "partner" ? "mb-2" : "mb-4"
                            }`}
                        >
                            Liaison Portal
                        </div>
                        {status === "portal" && navRole === "partner" ? (
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full mb-3">
                                Partner signed in
                            </span>
                        ) : null}
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
                        {(status === "loading" || status === "verifying") && (
                            <div className="relative">
                                <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                </div>
                                <div className="absolute -inset-2 border-2 border-dashed border-blue-200 rounded-[2.5rem] animate-[spin_10s_linear_infinite]"></div>
                            </div>
                        )}
                        {status === "portal" && (
                            <div className="relative">
                                <div
                                    className={`w-24 h-24 rounded-[2rem] flex items-center justify-center ${
                                        navRole === "partner" ? "bg-teal-50 ring-2 ring-teal-100/80" : "bg-emerald-50"
                                    }`}
                                >
                                    {navRole === "partner" ? (
                                        <Handshake className="w-10 h-10 text-teal-700" aria-hidden />
                                    ) : (
                                        <ClipboardList className="w-10 h-10 text-emerald-600" aria-hidden />
                                    )}
                                </div>
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
                            ? "Opening…"
                            : status === "verifying"
                              ? "Validating Claim..."
                              : status === "auth_required"
                                ? "Sign in required"
                                : status === "portal"
                                  ? navRole === "partner"
                                      ? "Partner next steps"
                                      : "Next step"
                                  : status === "success"
                                    ? "Verification Successful"
                                    : "Validation Failed"}
                    </h1>

                    {status === "portal" && navRole === "partner" ? (
                        <div className="text-left space-y-4 mb-6 px-1">
                            <p className="text-slate-600 text-sm leading-relaxed text-center sm:text-left">
                                Use your partner dashboard for decisions and context. This page only helps you jump
                                there or run organisation verification when you are asked to.
                            </p>
                            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-4 py-3.5 shadow-sm">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2.5">
                                    What to do here
                                </p>
                                <ol className="text-sm text-slate-600 space-y-2.5 list-decimal list-outside ml-4 marker:text-slate-400 marker:font-semibold">
                                    <li className="pl-1">
                                        <span className="font-semibold text-slate-800">My opportunities</span> — see
                                        pending items, approval status, and any{" "}
                                        <span className="font-semibold text-slate-800">return remarks</span> from
                                        faculty or CIEL.
                                    </li>
                                    <li className="pl-1">
                                        <span className="font-semibold text-slate-800">Confirm organisation verification</span>{" "}
                                        only when your invitation says that step is ready (usually after faculty has
                                        approved).
                                    </li>
                                </ol>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed text-center">
                                Nothing is saved automatically from this link until you complete an action above.
                            </p>
                        </div>
                    ) : (
                        <p className="text-slate-500 font-medium leading-relaxed px-4 mb-4">{message}</p>
                    )}

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
                        {status === "portal" && navRole === "partner" && (
                            <>
                                <Link
                                    href={PARTNER_REQUESTS_HREF}
                                    className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg shadow-slate-200 hover:shadow-blue-200 group"
                                >
                                    <ClipboardList className="w-4 h-4 group-hover:scale-110 transition-transform shrink-0" />
                                    <span className="flex-1 text-center">My opportunities</span>
                                    <ArrowRight className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                </Link>
                                <p className="text-[11px] text-slate-400 -mt-1 px-1">
                                    Opens Partner → Requests where you can open each item for full details and remarks.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void runPartnerVerify()}
                                    className="flex items-center justify-center gap-2 w-full bg-white border-2 border-blue-200 text-blue-800 hover:bg-blue-50 font-bold py-3.5 px-6 rounded-2xl transition-all duration-300"
                                >
                                    Confirm organisation verification
                                </button>
                            </>
                        )}
                        {status === "portal" && navRole !== "partner" && (
                            <>
                                <Link
                                    href={FACULTY_APPROVALS_HREF}
                                    className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg shadow-slate-200 hover:shadow-blue-200 group"
                                >
                                    <ClipboardList className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Open Approvals
                                </Link>
                                <Link
                                    href={PARTNER_REQUESTS_HREF}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                                >
                                    Partner account? Open My opportunities instead
                                </Link>
                            </>
                        )}

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

                        {status !== "loading" &&
                            status !== "auth_required" &&
                            status !== "portal" &&
                            status !== "verifying" && (
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
                                type="button"
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
                            <Link
                                href="/about"
                                className="text-[10px] font-black text-blue-400 hover:text-blue-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
                            >
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
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
            }
        >
            <VerifyProjectContent />
        </Suspense>
    );
}
