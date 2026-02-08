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
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8 font-sans antialiased">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-200/50">

                {/* Left side: Premium Branding */}
                <div className="relative bg-[#0F172A] p-12 text-white flex flex-col justify-between overflow-hidden">
                    {/* Abstract background elements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -mr-48 -mt-48 transition-opacity duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] -ml-40 -mb-40"></div>

                    <div className="relative z-10">
                        <Link href="/" className="inline-flex items-center gap-3 transition-transform hover:scale-105 duration-300">
                            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-white/5 p-2 backdrop-blur-md border border-white/10 shadow-inner">
                                <Image src="/ciel-logo-v2.png" alt="CIEL Logo" fill className="object-contain p-2" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight leading-none italic">CIEL <span className="text-blue-400 not-italic">PK</span></h1>
                                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 mt-1">Impact Verified</p>
                            </div>
                        </Link>
                    </div>

                    <div className="relative z-10 py-12">
                        <h2 className="text-5xl font-extrabold leading-[1.1] tracking-tight mb-8">
                            Empowering <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                                Global Youth
                            </span>
                        </h2>
                        <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-sm">
                            Join Pakistan's premier platform for university-led community impact and measurable SDG growth.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center justify-between pt-8 border-t border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">© 2026 CIEL Pakistan</p>
                        <div className="flex gap-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/20"></div>
                        </div>
                    </div>
                </div>

                {/* Right side: Modern Form */}
                <div className="p-10 md:p-16 flex flex-col justify-center bg-white">
                    <div className="w-full max-w-sm mx-auto">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-all mb-12 hover:-translate-x-1"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to Portal
                        </Link>

                        <div className="mb-10 text-center lg:text-left">
                            <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-3 italic">Welcome Back</h3>
                            <p className="text-slate-500 font-medium">Please enter your details to sign in.</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Provider</label>
                                <div className="group relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="e.g. name@ciel.pk"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Security Key</label>
                                    <a href="#" className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700">Lost Key?</a>
                                </div>
                                <div className="group relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-xs text-white bg-slate-900 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 hover:bg-slate-800 hover:shadow-2xl hover:shadow-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
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
                                <Link href="/signup" className="mt-2 inline-block text-blue-600 hover:text-blue-700 font-black border-b-2 border-blue-100 hover:border-blue-600 transition-all">Create Professional Account</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
