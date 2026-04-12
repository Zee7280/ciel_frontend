"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, CheckCircle, School, Landmark, ArrowLeft, Building2, User, GraduationCap, Phone, Globe, Heart, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import { DEFAULT_PHONE_COUNTRY_KEY, dialFromPhoneCountryKey } from "@/utils/countryCallingCodes";
import { pakistaniUniversities } from "@/utils/universityData";
import { isSafeInternalReturnPath } from "@/utils/verificationReturnUrl";

import { Suspense } from "react";

function SignUpContent() {
    const router = useRouter();
    const [step, setStep] = useState<"role" | "form" | "otp">("role");
    const [role, setRole] = useState<string | null>(null);
    const [hoveredRole, setHoveredRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    /** After signup, send user to login with this `next` (e.g. magic-link verify page). */
    const [postAuthRedirectNext, setPostAuthRedirectNext] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const searchParams = useSearchParams();

    // OTP states
    const [otpDigits, setOtpDigits] = useState<string[]>(["" ,"", "", "", "", ""]);
    const [otpError, setOtpError] = useState<string | null>(null);
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);


    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        institution: "",
        department: "",
        orgName: "",
        orgType: "",
        contactPerson: "",
        phoneCountryKey: DEFAULT_PHONE_COUNTRY_KEY,
        phone: "",
        cnic: "",
        token: "",
    });

    useEffect(() => {
        const emailParam = searchParams.get('email');
        const roleParam = searchParams.get('role');
        const tokenParam = searchParams.get('token');
        const nextParam = searchParams.get("next");
        if (nextParam && isSafeInternalReturnPath(nextParam)) {
            setPostAuthRedirectNext(nextParam);
        }

        if (roleParam && roles.find(r => r.id === roleParam)) {
            setRole(roleParam);
            setStep("form");
            if (emailParam || tokenParam) {
                setFormData(prev => ({ 
                    ...prev, 
                    email: emailParam || prev.email,
                    token: tokenParam || prev.token
                }));
            }
        }
    }, [searchParams]);


    const roles = [
        { id: "student", label: "Student", icon: GraduationCap, desc: "Join verified projects, document your community impact, and earn SDG‑aligned records.", color: "blue" },
        { id: "faculty", label: "Faculty / Academic Staff", icon: User, desc: "Oversee student engagement, validate learning and impact, and support SDG‑ready reporting.", color: "amber" },
        { id: "university", label: "University / Institution", icon: School, desc: "Monitor engagement, aggregate verified impact data, and generate institutional SDG reports.", color: "indigo" },
        { id: "ngo", label: "NGO / Non-Profit", icon: Heart, desc: "Post SDG‑aligned opportunities, engage students, and receive verified impact reports.", color: "green" },
        { id: "corporate", label: "Corporate / Private", icon: Building2, desc: "Support impactful projects and track CSR goals aligned with SDGs.", color: "slate" },
    ];

    const handleRoleSelect = (selectedRole: any) => {
        setRole(selectedRole);
        if (['university', 'ngo', 'corporate'].includes(selectedRole)) {
            setFormData(prev => ({ ...prev, orgType: selectedRole }));
        }
        setStep("form");
        setErrors({});
    };

    const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/[^0-9-]/g, "");
        if (value.length > 15) value = value.slice(0, 15);
        setFormData({ ...formData, cnic: value });
        if (errors.cnic) setErrors({ ...errors, cnic: "" });
    };

    const handleGenericChange = (field: string, value: string) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) setErrors({ ...errors, [field]: "" });
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (['university', 'ngo', 'corporate'].includes(role || "")) {
            if (!formData.orgName.trim()) newErrors.orgName = "Organization Name is required";
            if (!formData.contactPerson.trim()) newErrors.contactPerson = "Contact Person is required";
        } else {
            if (!formData.name.trim()) newErrors.name = "Full Name is required";
        }

        if (role === "student" || role === "faculty") {
            if (!formData.institution.trim()) newErrors.institution = "Institution is required";
            if (!formData.department.trim()) newErrors.department = role === "student" ? "Degree Program is required" : "Department is required";
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "Phone Number is required";
        } else if (formData.phone.length < 10) {
            newErrors.phone = "Phone Number must be at least 10 digits";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = "Invalid email formatting";
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
        } else if (/^(\d)\1+$/.test(formData.password) || /^(0123456789|1234567890|12345678|123456789|0987654321|abcdefgh|qwertyui|password|pass1234)/i.test(formData.password) || ["12345678", "123456789", "1234567890", "00000000", "11111111", "password", "pass1234", "qwerty123", "abc12345"].includes(formData.password.toLowerCase())) {
            newErrors.password = "Password is too weak. Avoid simple sequences like 12345678";
        } else if (!/[A-Za-z]/.test(formData.password) && /^\d+$/.test(formData.password)) {
            newErrors.password = "Password must contain at least one letter, not just numbers";
        }

        if (formData.cnic && formData.cnic.replace(/-/g, "").length !== 13) {
            newErrors.cnic = "CNIC must be 13 digits";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Step 1: Validate form, then send OTP
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!validateForm()) return;

        const normalizedEmail = formData.email.trim().toLowerCase();

        setIsLoading(true);
        try {
            const res = await fetch("/api/v1/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send OTP");

            // Move to OTP step
            setOtpDigits(["", "", "", "", "", ""]);
            setOtpError(null);
            setStep("otp");
            setResendCooldown(30);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "Failed to send OTP");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify OTP then create account
    const handleVerifyOtp = async () => {
        const otp = otpDigits.join("");
        if (otp.length !== 6) {
            setOtpError("Please enter all 6 digits.");
            return;
        }
        setOtpLoading(true);
        setOtpError(null);
        const normalizedEmail = formData.email.trim().toLowerCase();
        try {
            // Verify OTP
            const verifyRes = await fetch("/api/v1/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail, otp }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Invalid or expired OTP");

            // OTP verified — now create account
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
            const { phoneCountryKey, ...signupFields } = formData;
            const signupRes = await fetch(`${backendUrl}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...signupFields,
                    countryCode: dialFromPhoneCountryKey(phoneCountryKey),
                    email: normalizedEmail,
                    role,
                }),
            });
            if (!signupRes.ok) {
                const err = await signupRes.json();
                throw new Error(err.message || err.error || "Signup failed");
            }
            const signupData = await signupRes.json();
            const loginQs = new URLSearchParams();
            loginQs.set("signup", signupData.user?.status === "pending" ? "pending" : "success");
            if (postAuthRedirectNext) {
                loginQs.set("next", postAuthRedirectNext);
            }
            router.push(`/login?${loginQs.toString()}`);
        } catch (error) {
            setOtpError(error instanceof Error ? error.message : "Verification failed");
        } finally {
            setOtpLoading(false);
        }
    };

    // OTP input handlers
    const handleOtpChange = (index: number, value: string) => {
        if (!/^[0-9]?$/.test(value)) return;
        const next = [...otpDigits];
        next[index] = value;
        setOtpDigits(next);
        setOtpError(null);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!pasted) return;
        e.preventDefault();
        const next = [...otpDigits];
        pasted.split("").forEach((ch, i) => { if (i < 6) next[i] = ch; });
        setOtpDigits(next);
        otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;
        setOtpError(null);
        try {
            await fetch("/api/v1/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email.trim().toLowerCase() }),
            });
            setOtpDigits(["", "", "", "", "", ""]);
            setResendCooldown(30);
            otpRefs.current[0]?.focus();
        } catch {
            setOtpError("Could not resend OTP. Try again.");
        }
    };

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const activeRoleData = roles.find(r => r.id === (hoveredRole || role));
    const displayTitle = step === 'otp'
        ? 'Verify Email'
        : step === 'form'
            ? `Register as ${roles.find(r => r.id === role)?.label}`
            : hoveredRole
                ? activeRoleData?.label
                : 'Create Your CIEL Account';

    const displayText = step === 'otp'
        ? `A 6-digit code was sent to ${formData.email}. Enter it to activate your account.`
        : step === 'form'
            ? 'Fill in your details to create your account and start making an impact.'
            : hoveredRole
                ? activeRoleData?.desc
                : "Choose how you want to engage with CIEL's Community Impact Education Lab.";

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8 font-sans antialiased text-slate-900">
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-200/50 min-h-[700px]">

                {/* Left side: Premium Branding & Dynamic Context */}
                <div className="relative bg-[#1a3152] p-12 text-white flex flex-col justify-between overflow-hidden order-2 lg:order-1">
                    {/* Abstract background elements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-[120px] -mr-48 -mt-48 transition-opacity duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-[100px] -ml-40 -mb-40"></div>

                    <div className="relative z-10">
                        <Link href="/" className="inline-flex items-center gap-5 transition-transform hover:scale-105 duration-300">
                            <div className="relative w-24 h-24 p-3 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-900/20">
                                <Image src="/ciel-logo-final.png" alt="CIEL Logo" width={200} height={200} className="object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-black tracking-tighter text-white leading-none uppercase">
                                    Community Impact <br /> Education Lab
                                </span>
                                <span className="text-[10px] font-black text-emerald-400 mt-2 tracking-[0.3em] uppercase opacity-80">
                                    Youth Empowered Community Impact
                                </span>
                            </div>
                        </Link>
                    </div>

                    <div className="relative z-10 py-12">
                        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500" key={displayTitle}>
                            <h2 className="text-3xl md:text-4xl font-black leading-[1.1] tracking-tight mb-8">
                                {step === 'role' ? (
                                    <>Empowering <br /><span className="text-emerald-400">Pakistan's Youth</span><br />for Impact.</>
                                ) : (
                                    <>Verify <br /><span className="text-emerald-400">Identity.</span></>
                                )}
                            </h2>
                            <div className="space-y-3">
                                <h3 className="text-sm font-black text-white/90 uppercase tracking-widest">{displayTitle}</h3>
                                <p className="text-slate-300/70 text-sm font-medium leading-relaxed max-w-sm">
                                    {step === 'role'
                                        ? "Join Pakistan's leading platform for university-led community impact and SDG-aligned growth."
                                        : displayText
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col gap-10">
                        {(step === "form" || step === "otp") && (
                            <button
                                onClick={() => step === "otp" ? setStep("form") : setStep("role")}
                                className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-emerald-400 transition-all w-fit"
                            >
                                <div className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center group-hover:border-emerald-400/50 group-hover:bg-emerald-400/5 transition-all">
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                </div>
                                {step === "otp" ? "Back to Form" : "Back to Role Grid"}
                            </button>
                        )}

                        <div className="flex items-center justify-between pt-10 border-t border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">© 2026 CIEL Global</p>
                            <div className="flex gap-4 items-center">
                                <div className={clsx("w-2 h-2 rounded-full transition-all duration-500", step === 'role' ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] scale-125" : "bg-white/10")}></div>
                                <div className={clsx("w-2 h-2 rounded-full transition-all duration-500", step === 'form' ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] scale-125" : "bg-white/10")}></div>
                                <div className={clsx("w-2 h-2 rounded-full transition-all duration-500", step === 'otp' ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] scale-125" : "bg-white/10")}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side: Interactive Form / Selection */}
                <div className="p-10 md:p-16 flex flex-col justify-center order-1 lg:order-2 bg-white">
                    <div className="w-full max-w-md mx-auto">

                        {step === "role" && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                <div className="text-center lg:text-left">
                                    <h3 className="text-4xl font-black text-[#1E293B] tracking-tight mb-3">Account Type</h3>
                                    <p className="text-slate-500 font-medium">Select your professional category to proceed.</p>
                                </div>

                                <div className="grid gap-4">
                                    {roles.map((r) => (
                                        <button
                                            key={r.id}
                                            onClick={() => handleRoleSelect(r.id)}
                                            onMouseEnter={() => setHoveredRole(r.id)}
                                            onMouseLeave={() => setHoveredRole(null)}
                                            className="group relative flex items-center gap-5 p-6 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all text-left overflow-hidden bg-white"
                                        >
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-emerald-500 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm border border-slate-100 group-hover:border-emerald-100 group-hover:shadow-lg group-hover:shadow-emerald-50">
                                                <r.icon className="w-7 h-7" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-black uppercase tracking-widest text-[#1E293B] mb-0.5">{r.label}</h4>
                                                <p className="text-[10px] font-black text-slate-400 group-hover:text-emerald-600/70 transition-colors uppercase tracking-widest">Start impacting today</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300 border border-slate-100 group-hover:bg-white group-hover:border-emerald-200">
                                                <ArrowRight className="w-5 h-5 text-emerald-600" />
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="text-center pt-6">
                                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">
                                        Already a member? <br />
                                        <Link href="/login" className="mt-3 inline-block text-emerald-600 hover:text-emerald-700 font-black border-b-4 border-emerald-50 hover:border-emerald-600/20 transition-all">Sign In to Dashboard</Link>
                                    </p>
                                </div>
                            </div>
                        )}

                        {step === "form" && (
                            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                <div className="mb-8 text-center lg:text-left">
                                    <h3 className="text-4xl font-black text-[#1E293B] tracking-tight mb-2">Credentials</h3>
                                    <p className="text-slate-500 font-medium text-sm italic">Verify your details as <span className="text-emerald-600 font-black uppercase tracking-tight">{roles.find(r => r.id === role)?.label}</span></p>
                                </div>

                                <div className="space-y-6">
                                    {['university', 'ngo', 'corporate'].includes(role || "") ? (
                                        <div className="space-y-5">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                                    {role === 'university' ? "Institution Name" : role === 'corporate' ? "Company Name" : "Organization Name"}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.orgName}
                                                    onChange={(e) => handleGenericChange("orgName", e.target.value)}
                                                    className={clsx(
                                                        "w-full px-5 py-4 rounded-2xl border-2 bg-slate-50/50 focus:bg-white outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300",
                                                        errors.orgName ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-emerald-600"
                                                    )}
                                                    placeholder="e.g. Hope Foundation"
                                                />
                                                {errors.orgName && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-1">{errors.orgName}</p>}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Org Category</label>
                                                    <select
                                                        value={formData.orgType}
                                                        onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}
                                                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/30 font-bold text-slate-400 cursor-not-allowed outline-none"
                                                        disabled
                                                    >
                                                        <option value="ngo">NGO</option>
                                                        <option value="university">University</option>
                                                        <option value="corporate">Private Sector</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Lead Official</label>
                                                    <input
                                                        type="text"
                                                        value={formData.contactPerson}
                                                        onChange={(e) => handleGenericChange("contactPerson", e.target.value)}
                                                        className={clsx(
                                                            "w-full px-5 py-4 rounded-2xl border-2 bg-slate-50/50 focus:bg-white outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300",
                                                            errors.contactPerson ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-emerald-600"
                                                        )}
                                                        placeholder="Full Name"
                                                    />
                                                    {errors.contactPerson && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-1">{errors.contactPerson}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Individual Identity</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => handleGenericChange("name", e.target.value)}
                                                className={clsx(
                                                    "w-full px-5 py-4 rounded-2xl border-2 bg-slate-50/50 focus:bg-white outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300",
                                                    errors.name ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-emerald-600"
                                                )}
                                                placeholder="Full Name"
                                            />
                                            {errors.name && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-1">{errors.name}</p>}
                                        </div>
                                    )}

                                    {(role === "student" || role === "faculty") && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Institution</label>
                                                <select
                                                    value={formData.institution}
                                                    onChange={(e) => handleGenericChange("institution", e.target.value)}
                                                    className={clsx(
                                                        "w-full px-5 py-4 rounded-2xl border-2 bg-slate-50/50 focus:bg-white outline-none transition-all font-bold text-slate-800 appearance-none",
                                                        errors.institution ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-emerald-600"
                                                    )}
                                                >
                                                    <option value="">Select Institution</option>
                                                    {pakistaniUniversities.map(u => (
                                                        <option key={u} value={u}>{u}</option>
                                                    ))}
                                                </select>
                                                {errors.institution && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-1">{errors.institution}</p>}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">{role === "student" ? "Program" : "Dept"}</label>
                                                <input
                                                    type="text"
                                                    value={formData.department}
                                                    onChange={(e) => handleGenericChange("department", e.target.value)}
                                                    className={clsx(
                                                        "w-full px-5 py-4 rounded-2xl border-2 bg-slate-50/50 focus:bg-white outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300",
                                                        errors.department ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-emerald-600"
                                                    )}
                                                    placeholder={role === "student" ? "BS CS" : "Admin"}
                                                />
                                                {errors.department && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-1">{errors.department}</p>}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Connectivity</label>
                                        <PhoneConnectivityRow
                                            phoneCountryKey={formData.phoneCountryKey}
                                            nationalDigits={formData.phone}
                                            onPhoneCountryKeyChange={(phoneCountryKey) =>
                                                setFormData({ ...formData, phoneCountryKey })
                                            }
                                            onNationalDigitsChange={(phone) => {
                                                setFormData({ ...formData, phone });
                                                if (errors.phone) setErrors({ ...errors, phone: "" });
                                            }}
                                            errorText={errors.phone}
                                            maxNationalDigits={15}
                                            inputClassName={clsx(
                                                errors.phone ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-emerald-600",
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Verification Route (Email)</label>
                                        <div className="group relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleGenericChange("email", e.target.value)}
                                                className={clsx(
                                                    "w-full pl-12 pr-5 py-4 rounded-2xl border-2 bg-slate-50/50 focus:bg-white outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300",
                                                    errors.email ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-emerald-600"
                                                )}
                                                placeholder="you@domain.pk"
                                            />
                                        </div>
                                        {errors.email && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-1">{errors.email}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Secure Passphrase</label>
                                        <div className="group relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => handleGenericChange("password", e.target.value)}
                                                className={clsx(
                                                    "w-full pl-12 pr-12 py-4 rounded-2xl border-2 bg-slate-50/50 focus:bg-white outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300",
                                                    errors.password ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-emerald-600"
                                                )}
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {errors.password && (
                                            <div className="flex items-start gap-1.5 mt-1">
                                                <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">{errors.password}</p>
                                            </div>
                                        )}
                                        {!errors.password && formData.password && (
                                            <div className="mt-2 space-y-1">
                                                <div className="flex gap-1">
                                                    {[1,2,3,4].map((level) => (
                                                        <div key={level} className={clsx(
                                                            "h-1 flex-1 rounded-full transition-all duration-300",
                                                            level <= (formData.password.length >= 12 && /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password) && /[^A-Za-z0-9]/.test(formData.password) ? 4 :
                                                               formData.password.length >= 10 && /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password) ? 3 :
                                                               formData.password.length >= 8 && /[A-Za-z]/.test(formData.password) ? 2 : 1)
                                                            ? level === 1 ? "bg-red-400" : level === 2 ? "bg-amber-400" : level === 3 ? "bg-emerald-400" : "bg-emerald-600"
                                                            : "bg-slate-100"
                                                        )} />
                                                    ))}
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {formData.password.length >= 12 && /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password) && /[^A-Za-z0-9]/.test(formData.password) ? "Strong Password" :
                                                     formData.password.length >= 10 && /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password) ? "Good Password" :
                                                     formData.password.length >= 8 && /[A-Za-z]/.test(formData.password) ? "Acceptable — add uppercase & numbers" :
                                                     "Weak — must be at least 8 characters"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {formError && (
                                    <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-bold border border-red-100 flex items-start gap-3">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{formError}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-xs text-white bg-slate-900 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 hover:bg-slate-800 hover:shadow-2xl hover:shadow-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group px-4"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sending OTP...
                                        </>
                                    ) : (
                                        <>
                                            Register Account <CheckCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        </>
                                    )}
                                </button>

                                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                    By registering, you comply with <br />
                                    <span className="text-slate-900">CIEL’s Global Governance Protocols.</span>
                                </p>
                            </form>
                        )}

                        {step === "otp" && (
                            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                                {/* Header */}
                                <div className="mb-8 text-center lg:text-left">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.25rem] bg-emerald-50 mb-5">
                                        <ShieldCheck className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h3 className="text-4xl font-black text-[#1E293B] tracking-tight mb-2">Verify OTP</h3>
                                    <p className="text-slate-500 font-medium text-sm">
                                        Code sent to <span className="text-emerald-600 font-black">{formData.email}</span>
                                    </p>
                                </div>

                                {/* 6 Digit Boxes */}
                                <div className="flex gap-3 justify-center mb-6" onPaste={handleOtpPaste}>
                                    {otpDigits.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={el => { otpRefs.current[i] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={e => handleOtpChange(i, e.target.value)}
                                            onKeyDown={e => handleOtpKeyDown(i, e)}
                                            className={clsx(
                                                "w-12 h-14 text-center text-2xl font-black rounded-2xl border-2 outline-none transition-all duration-200 bg-slate-50 focus:bg-white",
                                                otpError
                                                    ? "border-red-400 focus:border-red-500 bg-red-50"
                                                    : digit
                                                        ? "border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.1)]"
                                                        : "border-slate-200 focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]"
                                            )}
                                        />
                                    ))}
                                </div>

                                {/* Error */}
                                {otpError && (
                                    <div className="flex items-center gap-2 mb-4 p-3 rounded-2xl bg-red-50 border border-red-100">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <p className="text-xs font-bold text-red-600">{otpError}</p>
                                    </div>
                                )}

                                {/* Verify Button */}
                                <button
                                    onClick={handleVerifyOtp}
                                    disabled={otpLoading || otpDigits.join("").length !== 6}
                                    className="w-full py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-xs text-white bg-slate-900 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 hover:bg-emerald-700 hover:border-emerald-800 hover:shadow-2xl hover:shadow-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-4"
                                >
                                    {otpLoading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                                    ) : (
                                        <><ShieldCheck className="w-4 h-4" /> Verify &amp; Create Account</>
                                    )}
                                </button>

                                {/* Resend */}
                                <div className="text-center">
                                    <button
                                        onClick={handleResendOtp}
                                        disabled={resendCooldown > 0}
                                        className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors disabled:cursor-not-allowed"
                                    >
                                        {resendCooldown > 0
                                            ? `Resend OTP in ${resendCooldown}s`
                                            : "Didn't receive? Resend OTP"}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SignUpPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        }>
            <SignUpContent />
        </Suspense>
    );
}
