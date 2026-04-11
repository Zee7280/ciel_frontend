"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Home, ExternalLink } from "lucide-react";
import Link from "next/link";
import { friendlyVerificationVerifyMessage } from "@/utils/verificationVerifyUx";

/**
 * CIEL verification landing (faculty, partner, or liaison — role is in the token only).
 * Always calls same-origin GET /api/v1/verifications/verify?token=… (Next proxy → backend).
 */
function VerifyProjectContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying your project claim...");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid verification link. The security token is missing.");
            return;
        }

        const verifyToken = async () => {
            try {
                // Always hit Next proxy (correct /api/v1 path + same-origin); avoids wrong BACKEND_BASE_URL in browser.
                const response = await fetch(`/api/v1/verifications/verify?token=${encodeURIComponent(token)}`, {
                    method: "GET",
                    headers: { Accept: "application/json" },
                });

                const data = (await response.json().catch(() => ({}))) as {
                    success?: boolean;
                    message?: string;
                };

                if (response.ok && data.success === true) {
                    setStatus("success");
                    setMessage(
                        typeof data.message === "string" && data.message.trim()
                            ? data.message
                            : "Verification completed. Thank you.",
                    );
                } else {
                    setStatus("error");
                    const raw =
                        typeof data.message === "string" && data.message.trim()
                            ? data.message
                            : "Failed to verify. The link may have expired or was already used.";
                    setMessage(friendlyVerificationVerifyMessage(raw, response.status) || raw);
                }
            } catch (error) {
                console.error("Verification error:", error);
                setStatus("error");
                setMessage("A connection error occurred with the CIEL servers. Please try again later.");
            }
        };

        // Delay slightly for better UX/Animation feel
        const timer = setTimeout(verifyToken, 1000);
        return () => clearTimeout(timer);
    }, [token]);

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
                        {status === "loading" ? "Validating Claim..." :
                            status === "success" ? "Verification Successful" : "Validation Failed"}
                    </h1>

                    <p className="text-slate-500 font-medium leading-relaxed mb-10 px-4">
                        {message}
                    </p>

                    {/* Actions */}
                    <div className="space-y-3">
                        {status !== "loading" && (
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
