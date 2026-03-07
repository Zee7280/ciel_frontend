"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Auto-fill token from URL
        const urlToken = searchParams.get("token");
        if (urlToken) {
            setToken(urlToken);
        }
    }, [searchParams]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            setError("Reset token is missing. Please use the link from your email.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
            const res = await fetch(`${backendUrl}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                setSuccess(true);
            } else {
                setError(data.message || "Password reset failed. The link may have expired.");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8 font-sans antialiased">
            <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-200/50 p-10 md:p-16">
                <Link href="/login" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-all mb-12 hover:-translate-x-1">
                    <ArrowLeft className="w-3 h-3" /> Back to Login
                </Link>

                {success ? (
                    <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900">Password Reset!</h3>
                        <p className="text-slate-500 font-medium">Your password has been updated successfully. You can now log in using your new password.</p>
                        <Link href="/login" className="mt-8 block w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition-all text-center">
                            Go to Login
                        </Link>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-10 text-center lg:text-left">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 lg:mx-0 mx-auto">
                                <Lock className="w-8 h-8 text-slate-700" />
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-3 italic">Set New Password</h3>
                            <p className="text-slate-500 font-medium">Please enter your new password below.</p>
                        </div>

                        <form onSubmit={handleResetPassword} className="space-y-5">
                            {/* Hidden Token Field just for form submission requirement if needed, but not visible to user */}
                            {!searchParams.get("token") && (
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Reset Token</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Paste token from email"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-600 outline-none transition-all font-mono text-sm text-slate-800"
                                    />
                                    <p className="text-[10px] text-slate-400 ml-2">Token is usually provided via URL link in your email.</p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">New Password</label>
                                <div className="group relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        placeholder="Min 8 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-600 outline-none transition-all font-bold text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
                                <div className="group relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        placeholder="Repeat new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={clsx(
                                            "w-full pl-12 pr-4 py-4 rounded-2xl border-2 bg-slate-50/50 focus:bg-white outline-none transition-all font-bold text-slate-800",
                                            confirmPassword && confirmPassword !== newPassword ? "border-red-400 focus:border-red-500" : "border-slate-100 focus:border-emerald-600"
                                        )}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || (!!confirmPassword && confirmPassword !== newPassword) || !token}
                                className="w-full py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-xs text-white bg-slate-900 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 hover:bg-emerald-600 hover:border-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group mt-6"
                            >
                                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : <>Change Password</>}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
