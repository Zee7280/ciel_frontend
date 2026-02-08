"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isMobile, setIsMobile] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // API call to authenticate
            // In a real app, this would be your backend endpoint
            const loginUrl = `${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/auth/login`;
            console.log("Login URL:", loginUrl);
            const response = await fetch(loginUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, isMobile }),
            });

            console.log("Response Status:", response.status, response.statusText);
            const textRaw = await response.text();
            console.log("Response Raw:", textRaw);

            let data;
            try {
                data = JSON.parse(textRaw);
            } catch (e) {
                console.error("Failed to parse JSON", e);
                data = {};
            }

            console.log("Login API Response Data:", data); // Debugging

            if (!response.ok || data.error) {
                console.error("Login failed response:", data);
                setError(data.message || data.error || "Login failed");
                return;
            }

            // Extract role from response (support both data.role and data.user.role)
            const role = data.role || data.user?.role;

            // Redirect based on role
            if (!role) {
                console.error("Missing role in response:", data);
                setError("Login failed: Missing role information.");
                return;
            }

            // Store token if available (for future API calls)
            if (data.access_token || data.token) {
                const token = data.access_token || data.token;
                localStorage.setItem("ciel_token", token);

                // Fetch full user profile immediately to cache it
                try {
                    const profileRes = await fetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/users/me`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ userId: data.user?.id || data.id })
                    });

                    if (profileRes.ok) {
                        const profileData = await profileRes.json();
                        if (profileData.success) {
                            const fullUser = { ...data.user, ...profileData.data, role };
                            localStorage.setItem("ciel_user", JSON.stringify(fullUser));
                            localStorage.setItem("user", JSON.stringify(fullUser)); // Keep legacy sync
                        } else {
                            // Fallback to basic data
                            localStorage.setItem("ciel_user", JSON.stringify(data.user || { role }));
                            localStorage.setItem("user", JSON.stringify(data.user || { role }));
                        }
                    } else {
                        // Fallback to basic data
                        localStorage.setItem("ciel_user", JSON.stringify(data.user || { role }));
                        localStorage.setItem("user", JSON.stringify(data.user || { role }));
                    }
                } catch (e) {
                    console.error("Failed to pre-fetch profile", e);
                    // Fallback to basic data
                    localStorage.setItem("ciel_user", JSON.stringify(data.user || { role }));
                    localStorage.setItem("user", JSON.stringify(data.user || { role }));
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 min-h-[600px]">

                {/* Left: Brand / Visual */}
                <div className="bg-slate-900 p-12 text-white relative overflow-hidden flex flex-col justify-between order-2 lg:order-1">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/10 ring-2 ring-white/20">
                                <Image src="/ciel-logo-v2.png" alt="CIEL Logo" fill className="object-cover" />
                            </div>
                            <span className="text-xl font-bold tracking-tight">CIEL <span className="text-slate-400">PK</span></span>
                        </div>
                        <h1 className="text-4xl font-bold leading-tight mb-4">Empowering Communities Through Education</h1>
                        <p className="text-slate-400 text-lg">Join the platform where youth, universities, and communities create measurable impact.</p>
                    </div>

                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500 rounded-full blur-[100px] opacity-10 -ml-20 -mb-20"></div>

                    <div className="relative z-10 text-xs text-slate-500 mt-12">
                        © 2026 CIEL Pakistan. All rights reserved.
                    </div>
                </div>

                {/* Right: Login Form */}
                <div className="p-12 flex flex-col justify-center order-1 lg:order-2 relative">
                    <Link
                        href="/"
                        className="absolute top-8 left-12 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>

                    <div className="mb-8 mt-8">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
                        <p className="text-slate-500">Sign in to access your dashboard.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">Password</label>
                                <a href="#" className="text-xs font-bold text-blue-600 hover:text-blue-700">Forgot Password?</a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium animate-shake">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                <>
                                    Sign In <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-sm">
                            Don't have an account? <Link href="/signup" className="font-bold text-blue-600 hover:text-blue-700">Create New Account</Link>
                        </p>
                        <div className="mt-4 p-4 rounded-lg bg-blue-50 text-xs text-blue-700 text-left">
                            <p className="font-bold mb-1">Demo Credentials:</p>
                            <p>Student: student@ciel.pk / demo</p>
                            <p>Partner: partner@ciel.pk / demo</p>
                            <p>Faculty: faculty@ciel.pk / demo</p>
                            <p>Admin: admin@ciel.pk / demo</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
