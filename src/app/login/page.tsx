"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isMobile, setIsMobile] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Forgot / Reset Password ──────────────────────────────────────────
    const [view, setView] = useState<"login" | "forgot" | "reset">("login");
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetSuccess, setResetSuccess] = useState(false);
    const [fpError, setFpError] = useState<string | null>(null);

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setFpError(null);
        setForgotSuccess(null);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:3000";
            const res = await fetch(`${backendUrl}/api/v1/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmail }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                // In testing mode backend sends token in response,
                // pre-fill token field for convenience
                if (data.data?.resetToken) {
                    setResetToken(data.data.resetToken);
                }
                setForgotSuccess("Reset token generated! Check your email or copy the token from console.");
                setView("reset");
            } else {
                setFpError(data.message || "Failed to send reset request.");
            }
        } catch {
            setFpError("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setFpError("Passwords do not match.");
            return;
        }
        setIsLoading(true);
        setFpError(null);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:3000";
            const res = await fetch(`${backendUrl}/api/v1/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: resetToken, newPassword }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                setResetSuccess(true);
            } else {
                setFpError(data.message || "Reset failed. Token may have expired.");
            }
        } catch {
            setFpError("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    // ────────────────────────────────────────────────────────────────────

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // API call to authenticate
            // In a real app, this would be your backend endpoint
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:3000";
            const loginUrl = `${backendUrl}/api/v1/auth/login`;
            console.log("Login URL:", loginUrl);
            const response = await fetch(loginUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, isMobile }),
            });

            console.log("Response Status:", response.status, response.statusText);
            console.log("Response Type:", response.type);

            const jsonResponse = await response.json().catch(() => ({}));
            console.log("Login API Response Data:", jsonResponse); // Debugging

            // Handle standard response format { success: boolean, data: ... }
            // or legacy format which might return data directly
            const isStandardResponse = jsonResponse.success !== undefined;

            if (!response.ok || (isStandardResponse && !jsonResponse.success) || jsonResponse.error) {
                console.error("Login failed response:", jsonResponse);
                setError(jsonResponse.message || jsonResponse.error || "Invalid email or password");
                return;
            }

            // Extract payload (the actual data object)
            // If response is { success: true, data: { ... } }, payload is jsonResponse.data
            // If response is flat (legacy), payload is jsonResponse itself
            const payload = (isStandardResponse && jsonResponse.data) ? jsonResponse.data : jsonResponse;

            // Extract role from response (support both payload.role and payload.user.role)
            // Debugging: explicitly log what we are looking for
            console.log("Extracting role from payload:", payload);
            const role = payload.role || payload.user?.role;
            console.log("Extracted role:", role);

            // Redirect based on role
            if (!role) {
                console.error("Missing role in response:", payload);
                setError("Login failed: Missing role information. Please check console for details.");
                return;
            }

            // Store token if available (for future API calls)
            if (payload.access_token || payload.token) {
                const token = payload.access_token || payload.token;
                localStorage.setItem("ciel_token", token);

                // Fetch full user profile immediately to cache it
                try {
                    const profileRes = await fetch(`/api/v1/user/me`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (profileRes.ok) {
                        const profileData = await profileRes.json();
                        if (profileData.success) {
                            const fullUser = { ...payload.user, ...profileData.data, role };
                            localStorage.setItem("ciel_user", JSON.stringify(fullUser));
                            localStorage.setItem("user", JSON.stringify(fullUser)); // Keep legacy sync
                        } else {
                            // Fallback to basic data
                            localStorage.setItem("ciel_user", JSON.stringify(payload.user || { role }));
                            localStorage.setItem("user", JSON.stringify(payload.user || { role }));
                        }
                    } else {
                        // Fallback to basic data
                        localStorage.setItem("ciel_user", JSON.stringify(payload.user || { role }));
                        localStorage.setItem("user", JSON.stringify(payload.user || { role }));
                    }
                } catch (e) {
                    console.error("Failed to pre-fetch profile", e);
                    // Fallback to basic data
                    localStorage.setItem("ciel_user", JSON.stringify(payload.user || { role }));
                    localStorage.setItem("user", JSON.stringify(payload.user || { role }));
                }
            }

            let targetPath = `/dashboard/${role}`;
            if (['university', 'ngo', 'corporate', 'organization_admin'].includes(role)) {
                targetPath = '/dashboard/partner';
            }

            router.push(targetPath);
        } catch (err) {
            setError("Invalid email or password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8 font-sans antialiased">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-200/50">

                {/* Left side: Premium Branding */}
                <div className="relative bg-slate-800 p-12 text-white flex flex-col justify-between overflow-hidden">
                    {/* Abstract background elements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-[120px] -mr-48 -mt-48 transition-opacity duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px] -ml-40 -mb-40"></div>

                    <div className="relative z-10">
                        <Link href="/" className="inline-flex items-center gap-4 transition-transform hover:scale-105 duration-300">
                            <div className="relative w-24 h-24 p-2 bg-white rounded-full flex items-center justify-center">
                                <Image src="/ciel-logo-final.png" alt="CIEL Logo" width={200} height={200} className="object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold tracking-tight text-white leading-none">
                                    Community Impact <br /> Education Lab
                                </span>
                                <span className="text-sm text-emerald-400 font-[family-name:var(--font-dancing)] mt-1 tracking-wide">
                                    Youth Empowered Community Impact
                                </span>
                            </div>
                        </Link>
                    </div>

                    <div className="relative z-10 py-12">
                        <h2 className="text-4xl md:text-4xl font-extrabold leading-[1.1] tracking-tight mb-8">
                            Empowering <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-orange-400">
                                Pakistan's Youth
                            </span> <br />
                            for Measurable Impact
                        </h2>
                        <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-sm">
                            Join Pakistan's leading platform for university-led community impact and SDG-aligned growth.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center justify-between pt-8 border-t border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">© 2026 CIEL Pakistan</p>
                        <div className="flex gap-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20"></div>
                        </div>
                    </div>
                </div>

                {/* Right side: Modern Form */}
                <div className="p-10 md:p-16 flex flex-col justify-center bg-white">
                    <div className="w-full max-w-sm mx-auto">

                        {/* ── Back nav ── */}
                        {view === "login" ? (
                            <Link href="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-all mb-12 hover:-translate-x-1">
                                <ArrowLeft className="w-3 h-3" /> Back to Portal
                            </Link>
                        ) : (
                            <button onClick={() => { setView("login"); setFpError(null); setResetSuccess(false); }} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-all mb-12 hover:-translate-x-1">
                                <ArrowLeft className="w-3 h-3" /> Back to Login
                            </button>
                        )}

                        {/* ══════════════════════════════════════════ */}
                        {/* VIEW: LOGIN                               */}
                        {/* ══════════════════════════════════════════ */}
                        {view === "login" && (
                            <>
                                <div className="mb-10 text-center lg:text-left">
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-3 italic">Welcome Back</h3>
                                    <p className="text-slate-500 font-medium">Please enter your details to sign in.</p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                        <div className="group relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                            <input
                                                type="email"
                                                required
                                                placeholder="e.g. name@ciel.pk"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-600 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Password</label>
                                            <button type="button" onClick={() => { setView("forgot"); setFpError(null); setForgotSuccess(null); }} className="text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700">Forgot Password?</button>
                                        </div>
                                        <div className="group relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                            <input
                                                type="password"
                                                required
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-600 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
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
                                        disabled={isLoading}
                                        className="w-full py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-xs text-white bg-slate-900 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 hover:bg-emerald-600 hover:border-emerald-700 hover:shadow-2xl hover:shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Authenticating...
                                            </>
                                        ) : (
                                            <>
                                                Sign In Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-12 text-center">
                                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                                        New to the platform? <br />
                                        <Link href="/signup" className="mt-2 inline-block text-emerald-600 hover:text-emerald-700 font-black border-b-2 border-emerald-100 hover:border-emerald-600 transition-all">Create Professional Account</Link>
                                    </p>
                                </div>
                            </>
                        )}

                        {/* ══════════════════════════════════════════ */}
                        {/* VIEW: FORGOT PASSWORD                     */}
                        {/* ══════════════════════════════════════════ */}
                        {view === "forgot" && (
                            <>
                                <div className="mb-10 text-center lg:text-left">
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-3 italic">Forgot Password</h3>
                                    <p className="text-slate-500 font-medium">Enter your email to receive a reset token.</p>
                                </div>

                                <form onSubmit={handleForgotPassword} className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                        <div className="group relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                            <input
                                                type="email"
                                                required
                                                placeholder="e.g. name@ciel.pk"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-600 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                                            />
                                        </div>
                                    </div>

                                    {fpError && (
                                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>{fpError}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-xs text-white bg-slate-900 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 hover:bg-emerald-600 hover:border-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
                                    >
                                        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <>Send Reset Token <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                                    </button>
                                </form>
                            </>
                        )}

                        {/* ══════════════════════════════════════════ */}
                        {/* VIEW: RESET PASSWORD                      */}
                        {/* ══════════════════════════════════════════ */}
                        {view === "reset" && (
                            <>
                                {resetSuccess ? (
                                    <div className="text-center py-8 space-y-4">
                                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                            <CheckCircle className="w-10 h-10 text-emerald-600" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900">Password Reset!</h3>
                                        <p className="text-slate-500 font-medium">Your password has been updated successfully.</p>
                                        <button
                                            onClick={() => { setView("login"); setResetSuccess(false); setNewPassword(""); setConfirmPassword(""); setResetToken(""); }}
                                            className="mt-4 w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition-all"
                                        >
                                            Back to Login
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-10 text-center lg:text-left">
                                            <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-3 italic">Reset Password</h3>
                                            <p className="text-slate-500 font-medium">Enter your token and choose a new password.</p>
                                        </div>

                                        <form onSubmit={handleResetPassword} className="space-y-5">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Reset Token</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Paste token from email"
                                                    value={resetToken}
                                                    onChange={(e) => setResetToken(e.target.value)}
                                                    className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-600 outline-none transition-all font-mono text-sm text-slate-800"
                                                />
                                            </div>

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

                                            {fpError && (
                                                <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100">
                                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                    <span>{fpError}</span>
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={isLoading || (!!confirmPassword && confirmPassword !== newPassword)}
                                                className="w-full py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-xs text-white bg-slate-900 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 hover:bg-emerald-600 hover:border-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
                                            >
                                                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : <>Reset Password <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                                            </button>
                                        </form>
                                    </>
                                )}
                            </>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
