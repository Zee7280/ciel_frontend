"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, ShieldCheck, ChevronDown, BadgeCheck, Info } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import { DEFAULT_PHONE_COUNTRY_KEY, dialFromPhoneCountryKey } from "@/utils/countryCallingCodes";
import { pakistaniUniversities } from "@/utils/universityData";
import { hecPrograms } from "@/utils/hecProgramsData";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { isSafeInternalReturnPath } from "@/utils/verificationReturnUrl";
import { LEGAL_REGISTRATION_TYPES, ORGANIZATION_CATEGORIES } from "@/utils/organizationTaxonomy";
import { isPersonalEmailDomain } from "@/utils/personalEmailDomains";
import RoleTile from "@/components/ciel/RoleTile";
import PasswordStrengthMeter from "@/components/ciel/PasswordStrengthMeter";
import { authApiErrorMessage, isSignupEmailUnverifiedMessage } from "@/utils/authApiError";

import { Suspense } from "react";

const ROLES = [
    { id: "student", label: "Student", emoji: "🎓", desc: "Join verified projects, document your community impact, and earn SDG-aligned records." },
    { id: "faculty", label: "Faculty", emoji: "🧑‍🏫", desc: "Oversee student engagement, validate learning and impact, and support SDG-ready reporting." },
    { id: "university", label: "University", emoji: "🏛️", desc: "Monitor engagement, aggregate verified impact data, and generate institutional SDG reports." },
    { id: "ngo", label: "NGO", emoji: "🤝", desc: "Post SDG-aligned opportunities, engage students, and receive verified impact reports." },
    { id: "corporate", label: "Company", emoji: "🏢", desc: "Support impactful projects and track CSR goals aligned with SDGs." },
] as const;

const CURRENT_YEAR = 2026;
const ENROLLMENT_YEARS = Array.from({ length: 8 }, (_, i) => String(CURRENT_YEAR - i));

function SignUpContent() {
    const router = useRouter();
    const [step, setStep] = useState<"form" | "otp">("form");
    const [role, setRole] = useState<string>("student");
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    /** After signup, send user to login with this `next` (e.g. magic-link verify page). */
    const [postAuthRedirectNext, setPostAuthRedirectNext] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [consent, setConsent] = useState(false);
    const [dismissedEmailWarning, setDismissedEmailWarning] = useState(false);
    const searchParams = useSearchParams();

    // OTP states
    const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
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
        enrollmentYear: "",
        registrationNumber: "",
        orgName: "",
        orgType: "",
        organizationCategory: "",
        legalRegistrationType: "",
        contactPerson: "",
        phoneCountryKey: DEFAULT_PHONE_COUNTRY_KEY,
        phone: "",
        cnic: "",
        token: "",
    });

    const orgRoleDefaults = (roleId: string) => {
        const base = { orgType: roleId, organizationCategory: "", legalRegistrationType: "" };
        if (roleId === "university") return { ...base, organizationCategory: "Educational Institution", legalRegistrationType: "Educational Institution" };
        if (roleId === "ngo") return { ...base, organizationCategory: "Nonprofit Organization (NGO)", legalRegistrationType: "Nonprofit Organization (NGO)" };
        if (roleId === "corporate") return { ...base, organizationCategory: "Corporate Organization" };
        return base;
    };

    useEffect(() => {
        const emailParam = searchParams.get("email");
        const roleParam = searchParams.get("role");
        const tokenParam = searchParams.get("token");
        const nextParam = searchParams.get("next");
        if (nextParam && isSafeInternalReturnPath(nextParam)) {
            setPostAuthRedirectNext(nextParam);
        }
        if (roleParam && ROLES.find((r) => r.id === roleParam)) {
            setRole(roleParam);
            setFormData((prev) => ({
                ...prev,
                ...(["university", "ngo", "corporate"].includes(roleParam) ? orgRoleDefaults(roleParam) : {}),
                ...(emailParam || tokenParam ? { email: emailParam || prev.email, token: tokenParam || prev.token } : {}),
            }));
        }
    }, [searchParams]);

    const handleRoleSelect = (selectedRole: string) => {
        setRole(selectedRole);
        if (["university", "ngo", "corporate"].includes(selectedRole)) {
            setFormData((prev) => ({ ...prev, ...orgRoleDefaults(selectedRole) }));
        }
        setErrors({});
    };

    const handleGenericChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const isOrgRole = ["university", "ngo", "corporate"].includes(role);
    const isPersonalEmail = useMemo(() => isPersonalEmailDomain(formData.email), [formData.email]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (isOrgRole) {
            if (!formData.orgName.trim()) newErrors.orgName = "Org name is required";
            if (!formData.contactPerson.trim()) newErrors.contactPerson = "Contact person is required";
            if (!formData.organizationCategory.trim()) newErrors.organizationCategory = "Organization type is required";
            if (!formData.legalRegistrationType.trim()) newErrors.legalRegistrationType = "Legal registration type is required";
        } else {
            if (!formData.name.trim()) newErrors.name = "Full name is required";
        }

        if (role === "student" || role === "faculty") {
            if (!formData.institution.trim()) newErrors.institution = "Institution is required";
            if (!formData.department.trim()) newErrors.department = role === "student" ? "Degree program is required" : "Department is required";
        }
        if (role === "student" && !formData.enrollmentYear.trim()) {
            newErrors.enrollmentYear = "Enrollment year is required";
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "Phone number is required";
        } else if (formData.phone.length < 10) {
            newErrors.phone = "Phone number must be at least 10 digits";
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
        } else if (
            /^(\d)\1+$/.test(formData.password) ||
            /^(0123456789|1234567890|12345678|123456789|0987654321|abcdefgh|qwertyui|password|pass1234)/i.test(formData.password) ||
            ["12345678", "123456789", "1234567890", "00000000", "11111111", "password", "pass1234", "qwerty123", "abc12345"].includes(formData.password.toLowerCase())
        ) {
            newErrors.password = "Password is too weak. Avoid simple sequences like 12345678";
        } else if (!/[A-Za-z]/.test(formData.password) && /^\d+$/.test(formData.password)) {
            newErrors.password = "Password must contain at least one letter, not just numbers";
        }

        if (formData.cnic && formData.cnic.replace(/-/g, "").length !== 13) {
            newErrors.cnic = "CNIC must be 13 digits";
        }

        if (!consent) newErrors.consent = "You must accept the terms to continue";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const isFormValid = useMemo(() => {
        if (!consent) return false;
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return false;
        if (!formData.password || formData.password.length < 8) return false;
        if (!formData.phone.trim() || formData.phone.length < 10) return false;
        if (isOrgRole) {
            if (!formData.orgName.trim() || !formData.contactPerson.trim() || !formData.organizationCategory.trim() || !formData.legalRegistrationType.trim()) return false;
        } else if (!formData.name.trim()) {
            return false;
        }
        if ((role === "student" || role === "faculty") && (!formData.institution.trim() || !formData.department.trim())) return false;
        if (role === "student" && !formData.enrollmentYear.trim()) return false;
        return true;
    }, [formData, role, isOrgRole, consent]);

    // Step 1: Validate form, then send OTP — swaps the form into the "check your inbox" state.
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
            if (!res.ok) throw new Error(authApiErrorMessage(data, "Failed to send code"));

            setOtpDigits(["", "", "", "", "", ""]);
            setOtpError(null);
            setStep("otp");
            setResendCooldown(30);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "Failed to send code");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify OTP then create account
    const handleVerifyOtp = async () => {
        const otp = otpDigits.join("");
        if (otp.length !== 6) {
            setOtpError("Enter all 6 digits.");
            return;
        }
        setOtpLoading(true);
        setOtpError(null);
        const normalizedEmail = formData.email.trim().toLowerCase();
        try {
            const verifyRes = await fetch("/api/v1/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail, otp }),
            });
            const verifyData = await verifyRes.json().catch(() => ({}));
            const verifyFailedMessage = verifyRes.ok
                ? ""
                : authApiErrorMessage(verifyData, "That code is invalid or expired");

            const { phoneCountryKey, token: _inviteToken, ...signupFields } = formData;
            const signupRes = await fetch("/api/v1/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...signupFields,
                    countryCode: dialFromPhoneCountryKey(phoneCountryKey),
                    email: normalizedEmail,
                    role,
                    name: isOrgRole ? formData.contactPerson.trim() : formData.name.trim(),
                    orgName: formData.orgName.trim(),
                    contactPerson: isOrgRole ? formData.contactPerson.trim() : formData.contactPerson,
                    university:
                        role === "student" || role === "faculty"
                            ? formData.institution.trim()
                            : undefined,
                    faculty_department: role === "faculty" ? formData.department.trim() : undefined,
                }),
            });
            if (!signupRes.ok) {
                const err = await signupRes.json().catch(() => ({}));
                const signupMsg = authApiErrorMessage(err, "Signup failed");
                if (verifyFailedMessage && isSignupEmailUnverifiedMessage(signupMsg)) {
                    throw new Error(verifyFailedMessage);
                }
                throw new Error(signupMsg);
            }
            const signupData = await signupRes.json();
            const createdUser = signupData?.data?.user ?? signupData?.user;
            const needsMembershipFlow =
                createdUser?.requires_membership_payment === true ||
                String(createdUser?.account_status ?? "").trim().toLowerCase() === "pending_membership_payment";
            const loginQs = new URLSearchParams();
            const su = needsMembershipFlow ? "membership" : createdUser?.account_status === "pending" || createdUser?.status === "pending" ? "pending" : "success";
            loginQs.set("signup", su);
            if (postAuthRedirectNext) loginQs.set("next", postAuthRedirectNext);
            router.push(`/login?${loginQs.toString()}`);
        } catch (error) {
            setOtpError(error instanceof Error ? error.message : "Verification failed");
        } finally {
            setOtpLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^[0-9]?$/.test(value)) return;
        const next = [...otpDigits];
        next[index] = value;
        setOtpDigits(next);
        setOtpError(null);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
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
            setOtpError("Could not resend the code. Try again.");
        }
    };

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const fieldClass = (hasError: boolean, extra?: string) =>
        clsx(
            "w-full px-5 py-4 rounded-ciel-md border-2 bg-ciel-page/50 focus:bg-white outline-none transition-all font-semibold text-ciel-text placeholder:text-ciel-text-soft focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-1",
            hasError ? "border-red-500 focus:border-red-500" : "border-ciel-border focus:border-ciel-green",
            extra,
        );

    const selectClass = (hasError: boolean) => clsx(fieldClass(hasError), "pr-12 cursor-pointer appearance-none");

    const activeRole = ROLES.find((r) => r.id === role);

    return (
        <div className="min-h-screen bg-ciel-page flex items-center justify-center p-4 md:p-8 font-sans antialiased text-ciel-text">
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-ciel-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] overflow-hidden border border-ciel-border min-h-[700px]">

                {/* Left: navy rail — unchanged branding + stepper pattern */}
                <div className="relative bg-ciel-navy p-6 sm:p-8 lg:p-12 text-white flex flex-col justify-between overflow-hidden order-2 lg:order-1">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-ciel-green/10 rounded-full blur-[120px] -mr-48 -mt-48" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-[100px] -ml-40 -mb-40" />

                    <div className="relative z-10">
                        <Link href="/" className="inline-flex items-center gap-5 ciel-transition hover:scale-105">
                            <div className="relative w-24 h-24 p-3 bg-white rounded-ciel-lg flex items-center justify-center shadow-2xl shadow-black/20">
                                <Image src="/iel-pk-logo.png" alt="IEL PK" width={200} height={200} className="object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-black tracking-tighter text-white leading-none uppercase">
                                    Community Impact <br /> Education Lab
                                </span>
                                <span className="text-[10px] font-black text-ciel-green mt-2 tracking-[0.3em] uppercase opacity-80">
                                    Youth Empowered Community Impact
                                </span>
                            </div>
                        </Link>
                    </div>

                    <div className="relative z-10 py-12">
                        <div className="space-y-8" key={step}>
                            <h2 className="text-3xl md:text-4xl font-black leading-[1.1] tracking-tight mb-8">
                                {step === "form" ? (
                                    <>Empowering <br /><span className="text-ciel-green">Pakistan&apos;s Youth</span><br />for impact.</>
                                ) : (
                                    <>Verify <br /><span className="text-ciel-green">your identity.</span></>
                                )}
                            </h2>
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-white/90">
                                    {step === "otp" ? "Check your inbox" : `Registering as ${activeRole?.label}`}
                                </h3>
                                <p className="text-white/60 text-sm font-medium leading-relaxed max-w-sm">
                                    {step === "otp"
                                        ? `A 6-digit code was sent to ${formData.email}. Enter it to activate your account.`
                                        : "Join Pakistan's leading platform for university-led community impact and SDG-aligned growth."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col gap-10">
                        {step === "otp" && (
                            <button
                                onClick={() => setStep("form")}
                                className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white/50 hover:text-ciel-green ciel-transition w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green rounded-ciel-xs"
                            >
                                <div className="w-10 h-10 rounded-ciel-sm border border-white/10 flex items-center justify-center group-hover:border-ciel-green/50 group-hover:bg-ciel-green/5 ciel-transition">
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 ciel-transition" />
                                </div>
                                Back to details
                            </button>
                        )}

                        <div className="flex items-center justify-between pt-10 border-t border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 italic">© 2026 CIEL Global</p>
                            <div className="flex gap-4 items-center">
                                <div className={clsx("w-2 h-2 rounded-full ciel-transition", step === "form" ? "bg-ciel-green shadow-[0_0_15px_rgba(76,195,138,0.6)] scale-125" : "bg-white/10")} />
                                <div className={clsx("w-2 h-2 rounded-full ciel-transition", step === "otp" ? "bg-ciel-green shadow-[0_0_15px_rgba(76,195,138,0.6)] scale-125" : "bg-white/10")} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: form / check-inbox state */}
                <div className="p-8 md:p-14 flex flex-col justify-center order-1 lg:order-2 bg-white overflow-y-auto max-h-screen">
                    <div className="w-full max-w-md mx-auto">

                        {step === "form" && (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="mb-2 text-center lg:text-left">
                                    <h3 className="text-3xl font-black text-ciel-text tracking-tight mb-2">Create your CIEL account</h3>
                                    <p className="text-ciel-text-mid font-medium text-sm">Tell us how you&apos;ll be using CIEL, then fill in your details.</p>
                                </div>

                                <div role="radiogroup" aria-label="Account category" className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {ROLES.map((r) => (
                                        <RoleTile key={r.id} label={r.label} emoji={r.emoji} selected={role === r.id} onSelect={() => handleRoleSelect(r.id)} />
                                    ))}
                                </div>
                                <p className="text-xs text-ciel-text-soft -mt-2">{activeRole?.desc}</p>

                                <div className="space-y-5">
                                    {isOrgRole ? (
                                        <div key={role} className="ciel-crossfade-enter space-y-5">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft ml-1">
                                                    Org name
                                                </label>
                                                {role === "university" ? (
                                                    <div className="relative">
                                                        <select value={formData.orgName} onChange={(e) => handleGenericChange("orgName", e.target.value)} aria-invalid={!!errors.orgName} aria-label="Org name" className={selectClass(!!errors.orgName)}>
                                                            <option value="">Select org name</option>
                                                            {pakistaniUniversities.map((u) => <option key={u} value={u}>{u}</option>)}
                                                        </select>
                                                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ciel-text-soft" aria-hidden />
                                                    </div>
                                                ) : (
                                                    <input type="text" value={formData.orgName} onChange={(e) => handleGenericChange("orgName", e.target.value)} className={fieldClass(!!errors.orgName)} placeholder="e.g. Hope Foundation" aria-label="Org name" />
                                                )}
                                                {errors.orgName && <p className="text-[11px] text-red-500 font-semibold ml-1">{errors.orgName}</p>}
                                            </div>

                                            {role === "corporate" && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft ml-1">Organization type</label>
                                                        <div className="relative">
                                                            <select value={formData.organizationCategory} onChange={(e) => handleGenericChange("organizationCategory", e.target.value)} aria-invalid={!!errors.organizationCategory} aria-label="Organization type" className={selectClass(!!errors.organizationCategory)}>
                                                                <option value="">Select organization type</option>
                                                                {ORGANIZATION_CATEGORIES.map((o) => <option key={o} value={o}>{o}</option>)}
                                                            </select>
                                                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ciel-text-soft" aria-hidden />
                                                        </div>
                                                        {errors.organizationCategory && <p className="text-[11px] text-red-500 font-semibold ml-1">{errors.organizationCategory}</p>}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft ml-1">Legal registration type</label>
                                                        <div className="relative">
                                                            <select value={formData.legalRegistrationType} onChange={(e) => handleGenericChange("legalRegistrationType", e.target.value)} aria-invalid={!!errors.legalRegistrationType} aria-label="Legal registration type" className={selectClass(!!errors.legalRegistrationType)}>
                                                                <option value="">Select legal registration type</option>
                                                                {LEGAL_REGISTRATION_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                                                            </select>
                                                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ciel-text-soft" aria-hidden />
                                                        </div>
                                                        {errors.legalRegistrationType && <p className="text-[11px] text-red-500 font-semibold ml-1">{errors.legalRegistrationType}</p>}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft ml-1">Lead official</label>
                                                <input type="text" value={formData.contactPerson} onChange={(e) => handleGenericChange("contactPerson", e.target.value)} className={fieldClass(!!errors.contactPerson)} placeholder="Full name" />
                                                {errors.contactPerson && <p className="text-[11px] text-red-500 font-semibold ml-1">{errors.contactPerson}</p>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={role} className="ciel-crossfade-enter space-y-1.5">
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft ml-1">Full name</label>
                                            <input type="text" value={formData.name} onChange={(e) => handleGenericChange("name", e.target.value)} className={fieldClass(!!errors.name)} placeholder="Full name" />
                                            {errors.name && <p className="text-[11px] text-red-500 font-semibold ml-1">{errors.name}</p>}
                                        </div>
                                    )}

                                    {(role === "student" || role === "faculty") && (
                                        <div key={`${role}-inst`} className="ciel-crossfade-enter grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft ml-1">Institution</label>
                                                <div className="relative">
                                                    <select value={formData.institution} onChange={(e) => handleGenericChange("institution", e.target.value)} aria-invalid={!!errors.institution} aria-label="Institution" className={selectClass(!!errors.institution)}>
                                                        <option value="">Select institution</option>
                                                        {pakistaniUniversities.map((u) => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ciel-text-soft" aria-hidden />
                                                </div>
                                                {errors.institution && <p className="text-[11px] text-red-500 font-semibold ml-1">{errors.institution}</p>}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft ml-1">{role === "student" ? "Program" : "Department"}</label>
                                                {role === "student" ? (
                                                    <SearchableSelect value={formData.department} onChange={(v) => handleGenericChange("department", v)} options={hecPrograms} placeholder="Select program" searchPlaceholder="Search HEC programs..." hasError={!!errors.department} ariaLabel="Degree program" />
                                                ) : (
                                                    <input type="text" value={formData.department} onChange={(e) => handleGenericChange("department", e.target.value)} className={fieldClass(!!errors.department)} placeholder="Department" />
                                                )}
                                                {errors.department && <p className="text-[11px] text-red-500 font-semibold ml-1">{errors.department}</p>}
                                            </div>
                                        </div>
                                    )}

                                    {role === "student" && (
                                        <div key="student-extra" className="ciel-crossfade-enter grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft ml-1">Enrollment year</label>
                                                <div className="relative">
                                                    <select value={formData.enrollmentYear} onChange={(e) => handleGenericChange("enrollmentYear", e.target.value)} aria-invalid={!!errors.enrollmentYear} aria-label="Enrollment year" className={selectClass(!!errors.enrollmentYear)}>
                                                        <option value="">Select year</option>
                                                        {ENROLLMENT_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                                                    </select>
                                                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ciel-text-soft" aria-hidden />
                                                </div>
                                                {errors.enrollmentYear && <p className="text-[11px] text-red-500 font-semibold ml-1">{errors.enrollmentYear}</p>}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft ml-1">Student ID <span className="text-ciel-text-soft normal-case font-medium">(optional)</span></label>
                                                <input type="text" value={formData.registrationNumber} onChange={(e) => handleGenericChange("registrationNumber", e.target.value)} className={fieldClass(false)} placeholder="e.g. FA22-BCS-123" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft ml-1">Phone (+92)</label>
                                        <PhoneConnectivityRow
                                            phoneCountryKey={formData.phoneCountryKey}
                                            nationalDigits={formData.phone}
                                            onPhoneCountryKeyChange={(phoneCountryKey) => setFormData((prev) => ({ ...prev, phoneCountryKey }))}
                                            onNationalDigitsChange={(phone) => {
                                                setFormData((prev) => ({ ...prev, phone }));
                                                if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                                            }}
                                            errorText={errors.phone}
                                            maxNationalDigits={15}
                                            inputClassName={clsx(errors.phone ? "border-red-500 focus:border-red-500" : "border-ciel-border focus:border-ciel-green")}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft ml-1">Email</label>
                                        <div className="group relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ciel-text-soft" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => { handleGenericChange("email", e.target.value); setDismissedEmailWarning(false); }}
                                                className={fieldClass(!!errors.email, "pl-12")}
                                                placeholder="you@university.edu.pk"
                                            />
                                        </div>
                                        {errors.email && <p className="text-[11px] text-red-500 font-semibold ml-1">{errors.email}</p>}
                                        {!errors.email && formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                                            isPersonalEmail && !dismissedEmailWarning ? (
                                                <div className="mt-1.5 flex items-start gap-2 rounded-ciel-sm bg-ciel-amber-soft border border-ciel-amber/20 px-3 py-2.5">
                                                    <Info className="h-4 w-4 text-ciel-amber shrink-0 mt-0.5" />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-semibold text-ciel-amber">This looks like a personal email. University or partner emails verify instantly.</p>
                                                        <button type="button" onClick={() => setDismissedEmailWarning(true)} className="mt-1 text-xs font-bold underline text-ciel-amber hover:text-ciel-amber/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green rounded-ciel-xs">
                                                            Use it anyway
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-ciel-green-deep ml-1">
                                                    <BadgeCheck className="h-3.5 w-3.5" /> Verifies instantly
                                                </p>
                                            )
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft ml-1">Password</label>
                                        <div className="group relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ciel-text-soft" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => handleGenericChange("password", e.target.value)}
                                                className={fieldClass(!!errors.password, "pl-12 pr-12")}
                                                placeholder="••••••••"
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-ciel-text-soft hover:text-ciel-green ciel-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green rounded-ciel-xs" tabIndex={-1}>
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {errors.password ? (
                                            <div className="flex items-start gap-1.5 mt-1">
                                                <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                                                <p className="text-[11px] text-red-500 font-semibold">{errors.password}</p>
                                            </div>
                                        ) : (
                                            <PasswordStrengthMeter password={formData.password} />
                                        )}
                                    </div>
                                </div>

                                {formError && (
                                    <div className="p-4 rounded-ciel-md bg-red-50 text-red-600 text-xs font-semibold border border-red-100 flex items-start gap-3">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{formError}</span>
                                    </div>
                                )}

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={consent}
                                        onChange={(e) => { setConsent(e.target.checked); if (errors.consent) setErrors((prev) => ({ ...prev, consent: "" })); }}
                                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ciel-border text-ciel-green focus-visible:ring-2 focus-visible:ring-ciel-green"
                                    />
                                    <span className="text-xs text-ciel-text-mid leading-relaxed">
                                        I agree to CIEL&apos;s <Link href="/about" className="font-semibold text-ciel-green-deep underline">terms and data use policy</Link>, and consent to my verified activity being recorded on the platform.
                                    </span>
                                </label>
                                {errors.consent && <p className="text-[11px] text-red-500 font-semibold -mt-4 ml-7">{errors.consent}</p>}

                                <button
                                    type="submit"
                                    disabled={isLoading || !isFormValid}
                                    className="w-full py-4 rounded-ciel-lg font-bold text-sm text-white bg-ciel-navy hover:bg-ciel-navy/90 ciel-transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                                >
                                    {isLoading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending code...</>
                                    ) : (
                                        <>Create my account <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 ciel-transition" /></>
                                    )}
                                </button>

                                <p className="text-center text-xs text-ciel-text-mid">
                                    Already a member?{" "}
                                    <Link href="/login" className="font-bold text-ciel-green-deep hover:underline">Sign in</Link>
                                </p>
                            </form>
                        )}

                        {step === "otp" && (
                            <div>
                                <div className="mb-8 text-center lg:text-left">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-ciel-lg bg-ciel-green-soft mb-5">
                                        <ShieldCheck className="w-8 h-8 text-ciel-green-deep" />
                                    </div>
                                    <h3 className="text-3xl font-black text-ciel-text tracking-tight mb-2">Check your inbox</h3>
                                    <p className="text-ciel-text-mid font-medium text-sm">
                                        We sent a 6-digit code to <span className="text-ciel-green-deep font-bold">{formData.email}</span>
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mb-6" onPaste={handleOtpPaste}>
                                    {otpDigits.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => { otpRefs.current[i] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            className={clsx(
                                                "w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-ciel-md border-2 outline-none ciel-transition bg-ciel-page focus:bg-white focus-visible:ring-2 focus-visible:ring-ciel-green",
                                                otpError ? "border-red-400 bg-red-50" : digit ? "border-ciel-green" : "border-ciel-border focus:border-ciel-green",
                                            )}
                                        />
                                    ))}
                                </div>

                                {otpError && (
                                    <div className="flex items-center gap-2 mb-4 p-3 rounded-ciel-md bg-red-50 border border-red-100">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <p className="text-xs font-semibold text-red-600">{otpError}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleVerifyOtp}
                                    disabled={otpLoading || otpDigits.join("").length !== 6}
                                    className="w-full py-4 rounded-ciel-lg font-bold text-sm text-white bg-ciel-navy hover:bg-ciel-green-deep ciel-transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                                >
                                    {otpLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>) : (<><ShieldCheck className="w-4 h-4" /> Verify &amp; create account</>)}
                                </button>

                                <div className="text-center">
                                    <button
                                        onClick={handleResendOtp}
                                        disabled={resendCooldown > 0}
                                        className="text-xs font-bold text-ciel-text-mid hover:text-ciel-green-deep ciel-transition disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green rounded-ciel-xs"
                                    >
                                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive it? Resend code"}
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
            <div className="min-h-screen bg-ciel-page flex items-center justify-center p-4">
                <Loader2 className="w-8 h-8 animate-spin text-ciel-green" />
            </div>
        }>
            <SignUpContent />
        </Suspense>
    );
}
