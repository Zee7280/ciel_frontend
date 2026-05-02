"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";

import Image from "next/image";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import {
    isPartnerOrganizationComplete,
    isPartnerRole,
    profileCompletionRedirectPath,
} from "@/utils/profileCompletion";
import {
    consumePersistedVerificationReturn,
    isSafeInternalReturnPath,
} from "@/utils/verificationReturnUrl";
import { getDashboardHomePathForRole } from "@/utils/dashboardNavRole";
import { partnerNeedsMembershipPayment, notifyCielUserUpdated } from "@/utils/membershipPayment";
import {
    clearStudentDashboardCache,
    fetchStudentDashboardData,
    persistStudentDashboardCache,
} from "@/utils/student-dashboard-fetch";

function toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function extractProfileUser(profileResponse: unknown): Record<string, unknown> | null {
    const root = toRecord(profileResponse);
    if (!root) return null;
    const data = toRecord(root.data);
    if (!data) return null;

    const nestedUser = toRecord(data.user);
    if (nestedUser) return nestedUser;

    return data;
}

function flattenProfilePayload(userRecord: Record<string, unknown>): Record<string, unknown> {
    const nestedProfile = toRecord(userRecord.profile);
    if (!nestedProfile) return userRecord;
    const merged: Record<string, unknown> = { ...nestedProfile, ...userRecord };
    Object.keys(nestedProfile).forEach((key) => {
        const topLevelValue = userRecord[key];
        if (topLevelValue == null || (typeof topLevelValue === "string" && !topLevelValue.trim())) {
            merged[key] = nestedProfile[key];
        }
    });
    return merged;
}

function mergeMeaningfulFields(
    base: Record<string, unknown>,
    incoming: Record<string, unknown>
): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...base };
    Object.entries(incoming).forEach(([key, value]) => {
        if (value == null) return;
        if (typeof value === "string" && !value.trim()) return;
        merged[key] = value;
    });
    return merged;
}

function pickUserId(record: Record<string, unknown>): string | number | null {
    const direct = record.id ?? record.userId ?? record.user_id;
    if (direct != null && direct !== "") return direct as string | number;

    const nestedUser = toRecord(record.user);
    if (!nestedUser) return null;
    const nested = nestedUser.id ?? nestedUser.userId ?? nestedUser.user_id;
    return nested != null && nested !== "" ? (nested as string | number) : null;
}

function buildStoredUser(payloadValue: unknown, role: unknown): Record<string, unknown> {
    const payload = toRecord(payloadValue) ?? {};
    const payloadUser = toRecord(payload.user) ?? {};
    const merged = mergeMeaningfulFields(payload, payloadUser);

    delete merged.access_token;
    delete merged.token;
    delete merged.refresh_token;
    delete merged.user;

    const resolvedUserId = pickUserId(payload) ?? pickUserId(payloadUser);
    if (resolvedUserId != null) {
        if (merged.id == null || merged.id === "") merged.id = resolvedUserId;
        if (merged.userId == null || merged.userId === "") merged.userId = resolvedUserId;
    }

    if (role != null && role !== "") merged.role = role;
    return merged;
}

function syncStoredUser(user: Record<string, unknown>) {
    const s = JSON.stringify(user);
    localStorage.setItem("ciel_user", s);
    localStorage.setItem("user", s);
    notifyCielUserUpdated();
}

function normalizeNonEmptyString(value: unknown): string {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    return trimmed;
}

async function hydratePartnerUserFromOrganisation(
    token: string,
    user: Record<string, unknown>,
    orgData?: Record<string, unknown> | null
): Promise<Record<string, unknown> | null> {
    try {
        const data = orgData ?? await fetchPartnerOrganisationProfile(token, user);
        if (!data) return null;

        const orgName = normalizeNonEmptyString(data.name);
        const city = normalizeNonEmptyString(data.city);
        const contactPhone = normalizeNonEmptyString(data.contactPhone);

        const patch: Record<string, unknown> = {};
        if (orgName) patch.organization = orgName;
        if (city) patch.city = city;
        if (contactPhone) {
            patch.phone = contactPhone;
            patch.contact = contactPhone;
            patch.contactPhone = contactPhone;
        }

        if (Object.keys(patch).length === 0) return null;
        return mergeMeaningfulFields(user, patch);
    } catch (error) {
        console.error("Failed to hydrate partner organisation profile during login", error);
        return null;
    }
}

async function fetchPartnerOrganisationProfile(
    _token: string,
    user: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
    const userId = pickUserId(user);
    if (userId == null || userId === "") return null;

    try {
        const res = await authenticatedFetch("/api/v1/organisation/profile/detail", {
            method: "POST",
            body: JSON.stringify({ userId }),
        }, { redirectToLogin: false });

        if (!res?.ok) return null;

        const body = await res.json().catch(() => null);
        const root = toRecord(body);
        return toRecord(root?.data) ?? root;
    } catch (error) {
        console.error("Failed to fetch partner organisation profile during login", error);
        return null;
    }
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isMobile, setIsMobile] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);


    // ── Forgot / Reset Password ──────────────────────────────────────────
    const [view, setView] = useState<"login" | "forgot" | "reset">("login");
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetSuccess, setResetSuccess] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [fpError, setFpError] = useState<string | null>(null);

    // Auto-fill token from URL
    useEffect(() => {
        const tokenFromUrl = searchParams.get("token");
        if (tokenFromUrl) {
            setResetToken(tokenFromUrl);
            setView("reset");
        }
    }, [searchParams]);

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setFpError(null);
        setForgotSuccess(null);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
            const res = await fetch(`${backendUrl}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                setForgotSuccess("Reset link sent! Check your email to reset your password.");
                // We keep the view as "forgot" so they see the success message
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
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
            const res = await fetch(`${backendUrl}/auth/reset-password`, {
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
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
            const loginUrl = `${backendUrl}/auth/login`;
            console.log("Login URL:", loginUrl);
            const response = await fetch(loginUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase(), password, isMobile }),
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

            const authToken = payload.access_token || payload.token;
            const loginUser = buildStoredUser(payload, role);

            // Store token if available (for future API calls)
            if (authToken) {
                const token = authToken;
                localStorage.setItem("ciel_token", token);

                // Fetch full user profile immediately to cache it
                try {
                    const profileRes = await fetch(`${backendUrl}/user/me`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (profileRes.ok) {
                        const profileData = await profileRes.json();
                        if (profileData.success) {
                            const profileUser = extractProfileUser(profileData);
                            const normalizedProfileUser = profileUser ? flattenProfilePayload(profileUser) : {};
                            const baseUser = loginUser;
                            const fullUser: Record<string, unknown> = {
                                ...mergeMeaningfulFields(baseUser, normalizedProfileUser),
                                role,
                            };
                            const resolvedUserId =
                                pickUserId(fullUser) ?? pickUserId(baseUser) ?? pickUserId(normalizedProfileUser);
                            if (resolvedUserId != null) {
                                if (fullUser.id == null || fullUser.id === "") fullUser.id = resolvedUserId;
                                if (fullUser.userId == null || fullUser.userId === "") fullUser.userId = resolvedUserId;
                            }
                            syncStoredUser(fullUser);
                        } else {
                            // Fallback to basic data
                            syncStoredUser(loginUser);
                        }
                    } else {
                        // Fallback to basic data
                        syncStoredUser(loginUser);
                    }
                } catch (e) {
                    console.error("Failed to pre-fetch profile", e);
                    // Fallback to basic data
                    syncStoredUser(loginUser);
                }
            }

            const roleNormalized = String(role).trim().toLowerCase().replace(/\s+/g, "_");
            if (authToken && roleNormalized === "student") {
                try {
                    clearStudentDashboardCache();
                    const dash = await fetchStudentDashboardData({ redirectToLogin: false });
                    if (dash) persistStudentDashboardCache(dash);
                } catch {
                    /* dashboard prefetch is optional */
                }
            } else {
                clearStudentDashboardCache();
            }

            let targetPath = getDashboardHomePathForRole(role);

            let profilePath: string | null = null;
            if (authToken) {
                try {
                    const uStr = localStorage.getItem("ciel_user");
                    if (uStr) {
                        let u = JSON.parse(uStr) as Record<string, unknown>;
                        if (isPartnerRole(String(role))) {
                            const orgData = await fetchPartnerOrganisationProfile(String(authToken), u);
                            const hydratedUser = await hydratePartnerUserFromOrganisation(String(authToken), u, orgData);
                            if (hydratedUser) {
                                u = hydratedUser;
                                syncStoredUser(u);
                            }
                            if (partnerNeedsMembershipPayment(u)) {
                                profilePath = "/dashboard/partner/membership-payment";
                            } else {
                                profilePath =
                                    !orgData || !isPartnerOrganizationComplete(orgData)
                                        ? "/dashboard/partner/organization"
                                        : null;
                            }
                        } else {
                            profilePath = profileCompletionRedirectPath(String(role), u);
                        }
                        if (profilePath) targetPath = profilePath;
                    }
                } catch {
                    /* keep default dashboard path */
                }
            }

            if (profilePath) {
                router.push(profilePath);
                return;
            }

            const verificationResume = consumePersistedVerificationReturn();
            if (verificationResume) {
                router.push(verificationResume);
                return;
            }

            const nextParam = searchParams.get("next");
            if (nextParam && isSafeInternalReturnPath(nextParam)) {
                router.push(nextParam);
                return;
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
                                <Image src="/iel-pk-logo.png" alt="IEL PK" width={200} height={200} className="object-contain" />
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

                                {searchParams.get("signup") === "membership" && (
                                    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/90 p-4 text-left text-xs font-semibold text-blue-900">
                                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                        <span>
                                            Your university or corporate account was created. After you sign in, you will
                                            complete the one-time membership fee (or wait for an admin to activate you).
                                        </span>
                                    </div>
                                )}

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
                                                type={showPassword ? "text" : "password"}
                                                required
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-600 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
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

                                    {forgotSuccess && (
                                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
                                            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>{forgotSuccess}</span>
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
                                            <p className="text-slate-500 font-medium">
                                                {searchParams.get("token") ? "Choose a new password." : "Enter your token and choose a new password."}
                                            </p>
                                        </div>

                                        <form onSubmit={handleResetPassword} className="space-y-5">
                                            {!searchParams.get("token") && (
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
                                            )}

                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">New Password</label>
                                                <div className="group relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                                    <input
                                                        type={showNewPassword ? "text" : "password"}
                                                        required
                                                        minLength={8}
                                                        placeholder="Min 8 characters"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-600 outline-none transition-all font-bold text-slate-800"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                                                    >
                                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>

                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
                                                <div className="group relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                                    <input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        required
                                                        placeholder="Repeat new password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className={clsx(
                                                            "w-full pl-12 pr-12 py-4 rounded-2xl border-2 bg-slate-50/50 focus:bg-white outline-none transition-all font-bold text-slate-800",
                                                            confirmPassword && confirmPassword !== newPassword ? "border-red-400 focus:border-red-500" : "border-slate-100 focus:border-emerald-600"
                                                        )}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
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

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
