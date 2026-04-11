"use client";

/**
 * Legacy emails may use FRONTEND_URL/verify/faculty?token=…
 * Same verification contract as /verify-project: call Next proxy → backend /verifications/verify.
 */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Home } from "lucide-react";
import Link from "next/link";
import { friendlyVerificationVerifyMessage } from "@/utils/verificationVerifyUx";

function FacultyVerifyContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying faculty approval…");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid link. The security token is missing.");
            return;
        }

        const run = async () => {
            try {
                const response = await fetch(`/api/v1/verifications/verify?token=${encodeURIComponent(token)}`, {
                    method: "GET",
                    headers: { Accept: "application/json" },
                });
                const data = (await response.json().catch(() => ({}))) as { success?: boolean; message?: string };

                if (response.ok && data.success === true) {
                    setStatus("success");
                    setMessage(
                        typeof data.message === "string" && data.message.trim()
                            ? data.message
                            : "Faculty verification completed. Thank you.",
                    );
                } else {
                    setStatus("error");
                    const raw =
                        typeof data.message === "string" && data.message.trim()
                            ? data.message
                            : "Verification failed. The link may have expired or was already used.";
                    setMessage(friendlyVerificationVerifyMessage(raw, response.status) || raw);
                }
            } catch {
                setStatus("error");
                setMessage("Could not reach CIEL. Please try again later.");
            }
        };

        const t = setTimeout(run, 400);
        return () => clearTimeout(t);
    }, [token]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-10 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Faculty verification</p>
                <div className="flex justify-center mb-6">
                    {status === "loading" && <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />}
                    {status === "success" && <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
                    {status === "error" && <XCircle className="w-12 h-12 text-rose-500" />}
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-2">
                    {status === "loading" ? "Confirming…" : status === "success" ? "Success" : "Could not verify"}
                </h1>
                <p className="text-slate-600 text-sm leading-relaxed mb-8">{message}</p>
                {status !== "loading" && (
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
