"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, CheckCircle, School, Landmark, ArrowLeft, Building2, User, GraduationCap, Phone, Globe, Heart } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";
import { pakistaniUniversities } from "@/utils/universityData";

export default function SignUpPage() {
    const router = useRouter();
    const [step, setStep] = useState<"role" | "form">("role");
    const [role, setRole] = useState<string | null>(null);
    const [hoveredRole, setHoveredRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        institution: "",
        department: "",
        orgName: "",
        orgType: "",
        contactPerson: "",
        countryCode: "+92",
        phone: "",
        cnic: "",
    });

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

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/[^0-9]/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        setFormData({ ...formData, phone: value });
        if (errors.phone) setErrors({ ...errors, phone: "" });
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
        }

        if (formData.cnic && formData.cnic.replace(/-/g, "").length !== 13) {
            newErrors.cnic = "CNIC must be 13 digits";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
            const response = await fetch(`${backendUrl}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    role,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || data.error || "Signup failed");
            }

            const data = await response.json();

            if (data.user?.status === "pending") {
                router.push("/login?signup=pending");
            } else {
                router.push("/login?signup=success");
            }
        } catch (error) {
            console.error("Signup failed", error);
            setFormError(error instanceof Error ? error.message : "Signup failed");
        } finally {
            setIsLoading(false);
        }
    };

    const activeRoleData = roles.find(r => r.id === (hoveredRole || role));
    const displayTitle = step === 'form'
        ? `Register as ${roles.find(r => r.id === role)?.label}`
        : hoveredRole
            ? activeRoleData?.label
            : "Create Your CIEL Account";

    const displayText = step === 'form'
        ? "Fill in your details to create your account and start making an impact."
        : hoveredRole
            ? activeRoleData?.desc
            : "Choose how you want to engage with CIEL’s Community Impact Education Lab.";

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8 font-sans antialiased text-slate-900">
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-200/50 min-h-[700px]">

                {/* Left side: Premium Branding & Dynamic Context */}
                <div className="relative bg-slate-800 p-12 text-white flex flex-col justify-between overflow-hidden order-2 lg:order-1">
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
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500" key={displayTitle}>
                            <h2 className="text-4xl md:text-5xl font-extrabold leading-[1.1] tracking-tight mb-8">
                                {step === 'role' ? (
                                    <>Empowering <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-orange-400">Pakistan's Youth</span><br />for Measurable Impact</>
                                ) : (
                                    <>Verify <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-orange-400">Identity.</span></>
                                )}
                            </h2>
                            <h3 className="text-2xl font-bold tracking-tight text-white mb-2">{displayTitle}</h3>
                            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-sm">
                                {step === 'role'
                                    ? "Join Pakistan's leading platform for university-led community impact and SDG-aligned growth."
                                    : displayText
                                }
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col gap-8">
                        {step === "form" && (
                            <button
                                onClick={() => setStep("role")}
                                className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all w-fit"
                            >
                                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/40 transition-colors">
                                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                                </div>
                                Back to Selection
                            </button>
                        )}

                        <div className="flex items-center justify-between pt-8 border-t border-white/5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 italic">© 2026 CIEL Pakistan</p>
                            <div className="flex gap-4 items-center">
                                <div className={clsx("w-1.5 h-1.5 rounded-full transition-all", step === 'role' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] scale-125" : "bg-white/20")}></div>
                                <div className={clsx("w-1.5 h-1.5 rounded-full transition-all", step === 'form' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] scale-125" : "bg-white/20")}></div>
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
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-3 italic">Account Type</h3>
                                    <p className="text-slate-500 font-medium">Select your professional category to proceed.</p>
                                </div>

                                <div className="grid gap-3">
                                    {roles.map((r) => (
                                        <button
                                            key={r.id}
                                            onClick={() => handleRoleSelect(r.id)}
                                            onMouseEnter={() => setHoveredRole(r.id)}
                                            onMouseLeave={() => setHoveredRole(null)}
                                            className="group relative flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left overflow-hidden"
                                        >
                                            <div className={clsx(
                                                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm border",
                                                r.id === "student" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                    r.id === "faculty" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                        r.id === "university" ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                                            r.id === "ngo" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                                "bg-slate-50 text-slate-600 border-slate-200"
                                            )}>
                                                <r.icon className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-0.5">{r.label}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">Start impacting today</p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                                <ArrowRight className="w-4 h-4 text-emerald-600" />
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="text-center pt-4">
                                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                                        Already a member? <br />
                                        <Link href="/login" className="mt-2 inline-block text-emerald-600 hover:text-emerald-700 font-black border-b-2 border-emerald-100 hover:border-emerald-600 transition-all">Sign In to Dashboard</Link>
                                    </p>
                                </div>
                            </div>
                        )}

                        {step === "form" && (
                            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                <div className="mb-8 text-center lg:text-left">
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-2 italic">Credentials</h3>
                                    <p className="text-slate-500 font-medium text-sm">Verify your details as <span className="text-emerald-600 font-bold">{roles.find(r => r.id === role)?.label}</span></p>
                                </div>

                                <div className="max-h-[500px] overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
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
                                        <div className="flex gap-2">
                                            <select
                                                value={formData.countryCode}
                                                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                                                className="w-32 px-3 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 font-bold text-xs outline-none focus:border-emerald-600"
                                            >
                                                <option value="+92">PK +92</option>
                                                <option value="+1">US +1</option>
                                                <option value="+44">UK +44</option>
                                                <option value="+971">UAE +971</option>
                                                <option value="+966">SA +966</option>
                                            </select>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={handlePhoneChange}
                                                className={clsx(
                                                    "flex-1 px-5 py-4 rounded-2xl border-2 bg-slate-50/50 focus:bg-white outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300",
                                                    errors.phone ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-emerald-600"
                                                )}
                                                placeholder="3001234567"
                                            />
                                        </div>
                                        {errors.phone && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-1">{errors.phone}</p>}
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
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => handleGenericChange("password", e.target.value)}
                                                className={clsx(
                                                    "w-full pl-12 pr-5 py-4 rounded-2xl border-2 bg-slate-50/50 focus:bg-white outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300",
                                                    errors.password ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-emerald-600"
                                                )}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        {errors.password && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-1">{errors.password}</p>}
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
                                            Provisioning Account...
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

                    </div>
                </div>
            </div>
        </div>
    );
}
