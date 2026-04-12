"use client";

/**
 * Legacy emails may use FRONTEND_URL/verify/faculty?token=…
 * Same verification contract as /verify-project: call Next proxy → backend /verifications/verify.
 */
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Home, LogIn } from "lucide-react";
import Link from "next/link";
import { fetchVerificationVerify, outcomeFromVerificationResponse } from "@/utils/verificationVerifyUx";
import {
    buildVerificationSignupHref,
    clearPersistedVerificationReturn,
    isSafeInternalReturnPath,
    persistVerificationReturnFromWindow,
} from "@/utils/verificationReturnUrl";
import {
    VERIFY_CTA_FACULTY_BODY,
    VERIFY_EMAIL_MATCH_HINT,
} from "@/config/verificationPageCopy";

function FacultyVerifyContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "auth_required" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying faculty approval…");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid link. The security token is missing.");
            return;
        }

        const postAuthReturn =
            pathname && token ? `${pathname}?${searchParams.toString()}` : "";
        const loginUrl =
            postAuthReturn && isSafeInternalReturnPath(postAuthReturn)
                ? `/login?next=${encodeURIComponent(postAuthReturn)}`
                : "/login";

        const run = async () => {
            try {
                const bearer =
                    typeof window !== "undefined" ? localStorage.getItem("ciel_token") : null;
                if (!bearer) {
                    persistVerificationReturnFromWindow();
                    router.replace(loginUrl);
                    return;
                }

                setStatus("loading");
                setMessage("Verifying faculty approval…");
                const response = await fetchVerificationVerify(token, bearer);
                const data = (await response.json().catch(() => ({}))) as { success?: boolean; message?: string };

                const out = outcomeFromVerificationResponse(
                    response,
                    data,
                    "Faculty verification completed. Thank you.",
                );

                if (out.kind === "success") {
                    clearPersistedVerificationReturn();
                    setStatus("success");
                    setMessage(out.message);
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
            } catch {
                setStatus("error");
                setMessage("Could not reach CIEL. Please try again later.");
            }
        };

        const bearerNow =
            typeof window !== "undefined" ? localStorage.getItem("ciel_token") : null;
        const delayMs = bearerNow ? 400 : 0;
        const t = setTimeout(run, delayMs);
        return () => clearTimeout(t);
    }, [token, pathname, searchParams, router]);

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
            ? buildVerificationSignupHref(postAuthReturn, { presetRole: "faculty" })
            : "/signup";

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-10 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Faculty verification</p>
                <div className="flex justify-center mb-6">
                    {status === "auth_required" && <LogIn className="w-12 h-12 text-amber-600" />}
                    {status === "loading" && <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />}
                    {status === "success" && <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
                    {status === "error" && <XCircle className="w-12 h-12 text-rose-500" />}
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-2">
                    {status === "loading"
                        ? "Confirming…"
                        : status === "auth_required"
                          ? "Sign in required"
                          : status === "success"
                            ? "Success"
                            : "Could not verify"}
                </h1>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">{message}</p>
                {status === "error" && postAuthReturn && isSafeInternalReturnPath(postAuthReturn) && (
                    <div className="mb-4">
                        <Link
                            href={loginHref}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                        >
                            Sign in / use another account
                        </Link>
                    </div>
                )}
                {status === "auth_required" && (
                    <div className="text-left space-y-3 mb-6">
                        <p className="text-xs font-medium text-amber-900/90 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 leading-relaxed">
                            {VERIFY_EMAIL_MATCH_HINT}
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed">{VERIFY_CTA_FACULTY_BODY}</p>
                    </div>
                )}
                {status === "auth_required" && (
                    <div className="space-y-3 mb-2">
                        <Link
                            href={loginHref}
                            className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800"
                        >
                            <LogIn className="w-4 h-4" />
                            Sign in (I already have an account)
                        </Link>
                        <Link
                            href={signupHref}
                            className="inline-flex items-center justify-center gap-2 w-full bg-white border border-slate-200 text-slate-800 font-semibold py-3 rounded-xl hover:bg-slate-50"
                        >
                            Sign up — Faculty account
                        </Link>
                    </div>
                )}
                {status !== "loading" && status !== "auth_required" && (
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800"
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
