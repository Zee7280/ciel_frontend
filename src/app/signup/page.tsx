"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, ShieldCheck, ChevronDown, BadgeCheck, Info, Upload, GraduationCap, User, Building2, Handshake, Briefcase, Landmark, Check } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import { DEFAULT_PHONE_COUNTRY_KEY, dialFromPhoneCountryKey } from "@/utils/countryCallingCodes";
import { pakistaniUniversities } from "@/utils/universityData";
import { hecPrograms } from "@/utils/hecProgramsData";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { isSafeInternalReturnPath } from "@/utils/verificationReturnUrl";
import { isPersonalEmailDomain } from "@/utils/personalEmailDomains";
import PasswordStrengthMeter from "@/components/ciel/PasswordStrengthMeter";
import { authApiErrorMessage, isSignupEmailUnverifiedMessage } from "@/utils/authApiError";

import { Suspense } from "react";

const ROLES = [
    { id: "student", label: "Student", emoji: "🎓", desc: "Quick registration. Create coursework projects and build your Impact Wall.", formTitle: "Student Registration", formSub: "Quick and easy registration.", submitLabel: "Create Student Account" },
    { id: "faculty", label: "Faculty", emoji: "👤", desc: "Quick registration. Review coursework and verify student impact.", formTitle: "Faculty Registration", formSub: "Quick and easy registration.", submitLabel: "Create Faculty Account" },
    { id: "university", label: "University", emoji: "🏛️", desc: "Institutional account verified by CIEL PK Admin.", formTitle: "Institution / Organization Registration", formSub: "Requires verification by CIEL PK Admin.", submitLabel: "Submit for Verification" },
    { id: "ngo", label: "NGO / Partner", emoji: "🤝", desc: "Partner account verified by CIEL PK Admin.", formTitle: "Institution / Organization Registration", formSub: "Requires verification by CIEL PK Admin.", submitLabel: "Submit for Verification" },
    { id: "corporate", label: "Company", emoji: "💼", desc: "Corporate / CSR account verified by CIEL PK Admin.", formTitle: "Institution / Organization Registration", formSub: "Requires verification by CIEL PK Admin.", submitLabel: "Submit for Verification" },
    { id: "government", label: "HEC / Government", emoji: "🏢", desc: "Official representative account verified by CIEL PK Admin.", formTitle: "Institution / Organization Registration", formSub: "Requires verification by CIEL PK Admin.", submitLabel: "Submit for Verification" },
] as const;

const ORG_KIND_OPTIONS = [
    { kind: "university", label: "University", role: "university", category: "Educational Institution", legal: "Educational Institution" },
    { kind: "ngo", label: "NGO / Partner Organization", role: "ngo", category: "Nonprofit Organization (NGO)", legal: "Nonprofit Organization (NGO)" },
    { kind: "corporate", label: "Company / Corporate Partner", role: "corporate", category: "Corporate Organization", legal: "Private Limited Company" },
    { kind: "government", label: "HEC / Government", role: "ngo", category: "Government Organization", legal: "Government Department" },
    { kind: "international", label: "UN / International Organization", role: "ngo", category: "Development Organization", legal: "International Organization" },
] as const;

const PROOF_LINK_TYPES = [
    "Official Website Profile",
    "University / Organization Staff Directory",
    "LinkedIn Profile",
    "Official Organization Announcement",
    "Other Public Verification Link",
] as const;

function signupApiRole(selectedRoleId: string) {
    return selectedRoleId === "government" ? "ngo" : selectedRoleId;
}

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
    const [orgKind, setOrgKind] = useState<(typeof ORG_KIND_OPTIONS)[number]["kind"]>("university");
    const [proofMethod, setProofMethod] = useState<"upload" | "link">("upload");
    const [proofFileName, setProofFileName] = useState("");
    const [proofLinkType, setProofLinkType] = useState<(typeof PROOF_LINK_TYPES)[number]>(PROOF_LINK_TYPES[0]);
    const [proofUrl, setProofUrl] = useState("");
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
        const match = ORG_KIND_OPTIONS.find((o) => o.kind === roleId) ?? ORG_KIND_OPTIONS.find((o) => o.role === roleId);
        if (!match) return { orgType: roleId, organizationCategory: "", legalRegistrationType: "" };
        return { orgType: match.role, organizationCategory: match.category, legalRegistrationType: match.legal };
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
            const kindMatch = ORG_KIND_OPTIONS.find((o) => o.kind === roleParam);
            if (kindMatch) setOrgKind(kindMatch.kind);
            setFormData((prev) => ({
                ...prev,
                ...(["university", "ngo", "corporate", "government"].includes(roleParam) ? orgRoleDefaults(roleParam) : {}),
                ...(emailParam || tokenParam ? { email: emailParam || prev.email, token: tokenParam || prev.token } : {}),
            }));
        }
    }, [searchParams]);

    const handleRoleSelect = (selectedRole: string) => {
        setRole(selectedRole);
        const kindMatch = ORG_KIND_OPTIONS.find((o) => o.kind === selectedRole);
        if (kindMatch) setOrgKind(kindMatch.kind);
        setFormData((prev) => ({
            ...prev,
            registrationNumber: "",
            ...(["university", "ngo", "corporate", "government"].includes(selectedRole) ? orgRoleDefaults(selectedRole) : {}),
            orgName:
                kindMatch?.role === "university" && !pakistaniUniversities.includes(prev.orgName) ? "" : prev.orgName,
        }));
        setErrors({});
    };

    const handleGenericChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const isOrgRole = ["university", "ngo", "corporate", "government"].includes(role);
    const apiRole = signupApiRole(role);
    const isPersonalEmail = useMemo(() => isPersonalEmailDomain(formData.email), [formData.email]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (isOrgRole) {
            if (!formData.orgName.trim()) newErrors.orgName = "Organization name is required";
            if (!formData.contactPerson.trim()) newErrors.contactPerson = "Your designation is required";
            if (!formData.organizationCategory.trim()) newErrors.organizationCategory = "Organization type is required";
            if (!formData.legalRegistrationType.trim()) newErrors.legalRegistrationType = "Legal registration type is required";
            if (proofMethod === "link") {
                const url = proofUrl.trim();
                if (!url) newErrors.proofUrl = "Please add a public verification link before submitting.";
                else if (!/^https?:\/\/.+\..+/.test(url)) newErrors.proofUrl = "Enter a valid public URL starting with http";
            }
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
            if (proofMethod === "link") {
                const url = proofUrl.trim();
                if (!url || !/^https?:\/\/.+\..+/.test(url)) return false;
            }
        } else if (!formData.name.trim()) {
            return false;
        }
        if ((role === "student" || role === "faculty") && (!formData.institution.trim() || !formData.department.trim())) return false;
        if (role === "student" && !formData.enrollmentYear.trim()) return false;
        return true;
    }, [formData, role, isOrgRole, consent, proofMethod, proofUrl]);

    const firstIncompleteHint = useMemo(() => {
        if (isFormValid) return "";
        if (isOrgRole) {
            if (!formData.contactPerson.trim()) return "Enter your designation to continue";
            if (!formData.orgName.trim()) return "Enter the organisation name to continue";
            if (!formData.email.trim()) return "Enter your official email to continue";
            if (!formData.phone.trim() || formData.phone.length < 10) return "Enter your mobile number to continue";
            if (!formData.password || formData.password.length < 8) return "Create a password to continue";
            if (proofMethod === "link" && !proofUrl.trim()) return "Add a verification link to continue";
            if (!consent) return "Accept the terms to continue";
            return "Complete the remaining fields to continue";
        }
        if (!formData.name.trim()) return "Enter your full name to continue";
        if ((role === "student" || role === "faculty") && !formData.institution.trim()) return "Select your university to continue";
        if ((role === "student" || role === "faculty") && !formData.department.trim()) {
            return role === "student" ? "Select your programme to continue" : "Enter your department to continue";
        }
        if (!formData.email.trim()) return "Enter your email to continue";
        if (!formData.phone.trim() || formData.phone.length < 10) return "Enter your mobile number to continue";
        if (role === "student" && !formData.enrollmentYear.trim()) return "Select your enrolment year to continue";
        if (!formData.password || formData.password.length < 8) return "Create a password to continue";
        if (!consent) return "Accept the terms to continue";
        return "Complete the remaining fields to continue";
    }, [isFormValid, isOrgRole, formData, role, proofMethod, proofUrl, consent]);

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
                    role: apiRole,
                    name: isOrgRole ? formData.contactPerson.trim() : formData.name.trim(),
                    orgName: formData.orgName.trim(),
                    orgType: isOrgRole ? signupApiRole(role) : formData.orgType,
                    contactPerson: isOrgRole ? formData.contactPerson.trim() : formData.contactPerson,
                    affiliationProofKind: isOrgRole ? proofMethod : undefined,
                    affiliationProofUrl: isOrgRole && proofMethod === "link" ? proofUrl.trim() : undefined,
                    affiliationProofLabel: isOrgRole
                        ? (proofMethod === "link" ? proofLinkType : proofFileName || "Document upload selected")
                        : undefined,
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
            "w-full min-w-0 rounded-xl border bg-white px-3.5 py-3 text-sm font-medium text-ciel-text outline-none transition-all placeholder:text-ciel-text-soft focus-visible:ring-2 focus-visible:ring-ciel-green/40",
            hasError ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-ciel-green",
            extra,
        );

    const selectClass = (hasError: boolean) => clsx(fieldClass(hasError), "pr-11 cursor-pointer appearance-none");
    const labelClass = "mb-1.5 block text-[13px] font-semibold text-ciel-text";
    const orgButtons = [
        { id: "university", label: "University", icon: Building2 },
        { id: "ngo", label: "NGO", icon: Handshake },
        { id: "corporate", label: "Company", icon: Briefcase },
        { id: "government", label: "HEC / Gov", icon: Landmark },
    ] as const;

    return (
        <div className="min-h-dvh bg-white font-sans antialiased text-ciel-text">
            <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[minmax(280px,34%)_1fr]">
                <aside className="relative flex flex-col justify-between overflow-hidden bg-[#12303F] px-6 py-6 text-white sm:px-8 lg:px-10 lg:py-8">
                    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ciel-green/10 blur-3xl" />
                    <div>
                        <Link href="/" className="relative z-10 inline-flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
                                <Image src="/iel-pk-logo.png" alt="CIEL" width={80} height={80} className="object-contain" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-black uppercase leading-tight tracking-[0.14em] text-white">Community Impact Education Lab</p>
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ciel-green">Youth Empowered Impact</p>
                            </div>
                        </Link>

                        <div className="relative z-10 mt-10 hidden lg:block">
                            <h2 className="text-[1.75rem] font-semibold leading-tight tracking-tight">
                                {step === "otp" ? (
                                    <>Verify <span className="text-ciel-green">your email.</span></>
                                ) : (
                                    <>Turn your volunteering into a <span className="text-ciel-green">verified record.</span></>
                                )}
                            </h2>
                            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
                                {step === "otp"
                                    ? `A 6-digit code was sent to ${formData.email}. Enter it to activate your account.`
                                    : "CIEL helps Pakistani students turn campus and community work into a record employers and universities can trust."}
                            </p>
                            {step === "form" && (
                                <ul className="mt-8 space-y-5">
                                    {[
                                        { title: "Find real projects", body: "Browse opportunities from vetted NGOs and campus societies." },
                                        { title: "Log your hours", body: "Your supervisor verifies them, so the record holds up." },
                                        { title: "Get a verified certificate", body: "Scored against the CII index and scannable by anyone." },
                                    ].map((item) => (
                                        <li key={item.title} className="flex gap-3">
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ciel-green text-[10px] font-black text-[#12303F]">✓</span>
                                            <div>
                                                <p className="text-sm font-semibold">{item.title}</p>
                                                <p className="mt-0.5 text-sm leading-relaxed text-white/60">{item.body}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="relative z-10 mt-8">
                        {step === "otp" && (
                            <button
                                type="button"
                                onClick={() => setStep("form")}
                                className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-ciel-green"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" /> Back to details
                            </button>
                        )}
                        <div className="hidden gap-6 text-xs font-medium text-white/80 lg:flex">
                            <span>156 live projects</span>
                            <span>2,400+ students</span>
                            <span>40+ partners</span>
                        </div>
                        <p className="mt-5 text-[10px] uppercase tracking-[0.16em] text-white/35">© 2026 CIEL Global</p>
                    </div>
                </aside>

                <main className="min-w-0 overflow-y-auto bg-white px-5 py-8 sm:px-10 lg:px-16 lg:py-12">
                    <div className="mx-auto w-full max-w-[34rem]">

                        {step === "form" && (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <h1 className="text-[2rem] font-semibold tracking-tight text-ciel-text">Create your account</h1>
                                    <p className="mt-1.5 text-sm text-ciel-text-mid">Takes about a minute. You&apos;ll verify your email at the end.</p>
                                </div>

                                <div>
                                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ciel-text-soft">I&apos;m joining as</p>
                                    <div role="radiogroup" aria-label="Account category" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {([
                                            { id: "student", label: "Student", desc: "Find projects, log hours, build your impact record.", Icon: GraduationCap },
                                            { id: "faculty", label: "Faculty", desc: "Post opportunities, review reports, verify student hours.", Icon: User },
                                        ] as const).map((item) => {
                                            const selected = role === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={selected}
                                                    onClick={() => handleRoleSelect(item.id)}
                                                    className={clsx(
                                                        "relative rounded-2xl border px-4 py-4 text-left transition-colors",
                                                        selected ? "border-ciel-green bg-ciel-green-soft" : "border-slate-200 bg-white hover:border-ciel-green/40",
                                                    )}
                                                >
                                                    {selected && (
                                                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-ciel-green-deep text-white">
                                                            <Check className="h-3 w-3" strokeWidth={3} />
                                                        </span>
                                                    )}
                                                    <item.Icon className={clsx("h-5 w-5", selected ? "text-ciel-green-deep" : "text-ciel-text-mid")} />
                                                    <p className="mt-2 text-sm font-semibold text-ciel-text">{item.label}</p>
                                                    <p className="mt-1 text-[12px] leading-snug text-ciel-text-mid">{item.desc}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-ciel-text-soft">or register an organisation</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {orgButtons.map((item) => {
                                            const selected = role === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => handleRoleSelect(item.id)}
                                                    className={clsx(
                                                        "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 text-center transition-colors",
                                                        selected ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-slate-200 bg-white text-ciel-text-mid hover:border-ciel-green/40",
                                                    )}
                                                >
                                                    <item.icon className="h-4 w-4" />
                                                    <span className="text-[10px] font-semibold leading-tight">{item.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-2 text-[12px] italic leading-relaxed text-ciel-text-soft">
                                        Organisation accounts need a short CIEL admin check. Students and faculty activate after email verification.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {isOrgRole ? (
                                        <div key={role} className="ciel-crossfade-enter space-y-4">
                                            <div>
                                                <label className={labelClass}>Organization name</label>
                                                {orgKind === "university" ? (
                                                    <div className="relative">
                                                        <select value={formData.orgName} onChange={(e) => handleGenericChange("orgName", e.target.value)} aria-invalid={!!errors.orgName} aria-label="Organization name" className={selectClass(!!errors.orgName)}>
                                                            <option value="">Select organization name</option>
                                                            {pakistaniUniversities.map((u) => <option key={u} value={u}>{u}</option>)}
                                                        </select>
                                                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ciel-text-soft" aria-hidden />
                                                    </div>
                                                ) : (
                                                    <input type="text" value={formData.orgName} onChange={(e) => handleGenericChange("orgName", e.target.value)} className={fieldClass(!!errors.orgName)} placeholder="e.g. Beaconhouse National University" aria-label="Organization name" />
                                                )}
                                                {errors.orgName && <p className="text-[11px] text-red-500 font-semibold ml-1">{errors.orgName}</p>}
                                            </div>

                                            <div>
                                                <label className={labelClass}>Your designation</label>
                                                <input type="text" value={formData.contactPerson} onChange={(e) => handleGenericChange("contactPerson", e.target.value)} className={fieldClass(!!errors.contactPerson)} placeholder="e.g. Coordinator Community Engagement" />
                                                {errors.contactPerson && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.contactPerson}</p>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={`${role}-name`} className="ciel-crossfade-enter">
                                            <label className={labelClass}>Full name</label>
                                            <input type="text" value={formData.name} onChange={(e) => handleGenericChange("name", e.target.value)} className={fieldClass(!!errors.name)} placeholder={role === "faculty" ? "As it appears on your faculty record" : "As it appears on your student record"} />
                                            {errors.name && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.name}</p>}
                                        </div>
                                    )}

                                    {(role === "student" || role === "faculty") && (
                                        <div key={`${role}-inst`} className="ciel-crossfade-enter grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className={labelClass}>University</label>
                                                <div className="relative">
                                                    <select value={formData.institution} onChange={(e) => handleGenericChange("institution", e.target.value)} aria-invalid={!!errors.institution} aria-label="University" className={selectClass(!!errors.institution)}>
                                                        <option value="">Select university</option>
                                                        {pakistaniUniversities.map((u) => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" aria-hidden />
                                                </div>
                                                {errors.institution && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.institution}</p>}
                                            </div>
                                            <div>
                                                <label className={labelClass}>{role === "student" ? "Programme" : "Department"}</label>
                                                {role === "student" ? (
                                                    <SearchableSelect value={formData.department} onChange={(v) => handleGenericChange("department", v)} options={hecPrograms} placeholder={formData.institution ? "Select programme" : "Select university first"} searchPlaceholder="Search HEC programs..." hasError={!!errors.department} ariaLabel="Programme" disabled={!formData.institution} />
                                                ) : (
                                                    <input type="text" value={formData.department} onChange={(e) => handleGenericChange("department", e.target.value)} className={fieldClass(!!errors.department)} placeholder="e.g. School of Management Sciences" />
                                                )}
                                                {errors.department && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.department}</p>}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className={labelClass}>{isOrgRole ? "Official email address" : "Email address"}</label>
                                        <div className="group relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ciel-text-soft" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => { handleGenericChange("email", e.target.value); setDismissedEmailWarning(false); }}
                                                className={fieldClass(!!errors.email, "pl-11")}
                                                placeholder={role === "faculty" ? "faculty@university.edu.pk" : role === "student" ? "you@university.edu.pk" : "official@organization.org"}
                                            />
                                        </div>
                                        {errors.email && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.email}</p>}
                                        {!errors.email && formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                                            isPersonalEmail && !dismissedEmailWarning ? (
                                                <div className="mt-2 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                                                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-ciel-text-mid" />
                                                    <div className="flex-1">
                                                        <p className="text-[12px] leading-relaxed text-ciel-text-mid">A personal email works. A university address skips extra checks — you&apos;d be active after verifying, instead of waiting on an admin.</p>
                                                        <button type="button" onClick={() => setDismissedEmailWarning(true)} className="mt-1 text-[12px] font-semibold text-ciel-green-deep underline">
                                                            Use it anyway
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-ciel-green-deep">
                                                    <BadgeCheck className="h-3.5 w-3.5" /> Looks good — we&apos;ll verify this at the end
                                                </p>
                                            )
                                        )}
                                    </div>

                                    <div>
                                        <label className={labelClass}>Mobile number</label>
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

                                    {isOrgRole && (
                                        <div className="ciel-crossfade-enter space-y-3">
                                            <div>
                                                <label className={labelClass}>Proof of affiliation</label>
                                                <p className="mt-1 text-[12px] leading-relaxed text-ciel-text-soft">Upload a document or add a public verification link.</p>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setProofMethod("upload")}
                                                    className={clsx(
                                                        "flex items-start gap-2 rounded-xl border px-3 py-3 text-left transition-colors",
                                                        proofMethod === "upload" ? "border-ciel-green bg-ciel-green-soft" : "border-slate-200 bg-white hover:border-ciel-green/40",
                                                    )}
                                                >
                                                    <span className={clsx("mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2", proofMethod === "upload" ? "border-ciel-green-deep bg-ciel-green-deep" : "border-slate-300")} />
                                                    <span>
                                                        <span className="block text-[13px] font-semibold text-ciel-text">Upload document</span>
                                                        <span className="mt-0.5 block text-[12px] leading-snug text-ciel-text-soft">Employee ID, staff letter, or official proof.</span>
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setProofMethod("link")}
                                                    className={clsx(
                                                        "flex items-start gap-2 rounded-xl border px-3 py-3 text-left transition-colors",
                                                        proofMethod === "link" ? "border-ciel-green bg-ciel-green-soft" : "border-slate-200 bg-white hover:border-ciel-green/40",
                                                    )}
                                                >
                                                    <span className={clsx("mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2", proofMethod === "link" ? "border-ciel-green-deep bg-ciel-green-deep" : "border-slate-300")} />
                                                    <span>
                                                        <span className="block text-[13px] font-semibold text-ciel-text">Add verification link</span>
                                                        <span className="mt-0.5 block text-[12px] leading-snug text-ciel-text-soft">Staff directory, LinkedIn, or public profile.</span>
                                                    </span>
                                                </button>
                                            </div>
                                            {proofMethod === "upload" ? (
                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center">
                                                        <Upload className="mb-2 h-4 w-4 text-ciel-text-mid" />
                                                        <span className="text-sm font-semibold text-ciel-text">{proofFileName || "Upload ID / supporting document"}</span>
                                                        <input
                                                            type="file"
                                                            className="sr-only"
                                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/*"
                                                            onChange={(e) => setProofFileName(e.target.files?.[0]?.name ?? "")}
                                                        />
                                                    </label>
                                                    <p className="mt-2 text-[12px] leading-relaxed text-ciel-text-soft">Accepted: university or employee ID, faculty card, or authorization letter.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr]">
                                                        <div className="relative">
                                                            <select value={proofLinkType} onChange={(e) => setProofLinkType(e.target.value as (typeof PROOF_LINK_TYPES)[number])} className={selectClass(false)} aria-label="Verification link type">
                                                                {PROOF_LINK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                                            </select>
                                                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" aria-hidden />
                                                        </div>
                                                        <input type="url" value={proofUrl} onChange={(e) => { setProofUrl(e.target.value); if (errors.proofUrl) setErrors((prev) => ({ ...prev, proofUrl: "" })); }} className={fieldClass(!!errors.proofUrl)} placeholder="https://example.org/staff/your-name" aria-label="Public verification link" />
                                                    </div>
                                                    {errors.proofUrl && <p className="text-[11px] font-semibold text-red-500">{errors.proofUrl}</p>}
                                                    <p className="text-[12px] leading-relaxed text-ciel-text-soft">The link should show your name and connection to the organisation. CIEL admin reviews it before approval.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {role === "faculty" && (
                                        <div key="faculty-id" className="ciel-crossfade-enter">
                                            <label className={labelClass}>Faculty / Employee ID <span className="font-normal text-ciel-text-soft">(optional)</span></label>
                                            <input type="text" value={formData.registrationNumber} onChange={(e) => handleGenericChange("registrationNumber", e.target.value)} className={fieldClass(false)} placeholder="Leave blank if unsure" aria-label="Faculty / Employee ID" />
                                            <p className="mt-1 text-[12px] text-ciel-text-soft">Preferred, but not required.</p>
                                        </div>
                                    )}

                                    {role === "student" && (
                                        <div key="student-extra" className="ciel-crossfade-enter grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className={labelClass}>Enrolment year</label>
                                                <div className="relative">
                                                    <select value={formData.enrollmentYear} onChange={(e) => handleGenericChange("enrollmentYear", e.target.value)} aria-invalid={!!errors.enrollmentYear} aria-label="Enrolment year" className={selectClass(!!errors.enrollmentYear)}>
                                                        <option value="">Select year</option>
                                                        {ENROLLMENT_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                                                    </select>
                                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" aria-hidden />
                                                </div>
                                                {errors.enrollmentYear && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.enrollmentYear}</p>}
                                            </div>
                                            <div>
                                                <label className={labelClass}>Student ID <span className="font-normal text-ciel-text-soft">(optional)</span></label>
                                                <input type="text" value={formData.registrationNumber} onChange={(e) => handleGenericChange("registrationNumber", e.target.value)} className={fieldClass(false)} placeholder="Leave blank if unsure" />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className={labelClass}>Password</label>
                                        <div className="group relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ciel-text-soft" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => handleGenericChange("password", e.target.value)}
                                                className={fieldClass(!!errors.password, "pl-11 pr-11")}
                                                placeholder="At least 8 characters"
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
                                        ) : formData.password ? (
                                            <PasswordStrengthMeter password={formData.password} />
                                        ) : (
                                            <p className="mt-1.5 text-[12px] text-ciel-text-soft">Use 8 or more characters</p>
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
                                    className={clsx(
                                        "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2",
                                        isFormValid && !isLoading
                                            ? "bg-[#12303F] text-white hover:bg-[#0d242f]"
                                            : "cursor-not-allowed bg-slate-200 text-slate-500",
                                    )}
                                >
                                    {isLoading ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Sending code...</>
                                    ) : (
                                        <>Create account <ArrowRight className="h-4 w-4" /></>
                                    )}
                                </button>
                                {!isFormValid && (
                                    <p className="text-center text-[12px] text-ciel-text-soft">{firstIncompleteHint}</p>
                                )}
                                {isOrgRole && (
                                    <p className="text-center text-[12px] text-ciel-text-soft">Organisation accounts stay pending until CIEL admin review.</p>
                                )}

                                <p className="text-center text-sm text-ciel-text-mid">
                                    Already a member?{" "}
                                    <Link href="/login" className="font-semibold text-ciel-green-deep hover:underline">Sign in</Link>
                                </p>
                            </form>
                        )}

                        {step === "otp" && (
                            <div className="space-y-6">
                                <div>
                                    <h1 className="text-[2rem] font-semibold tracking-tight text-ciel-text">Check your inbox</h1>
                                    <p className="mt-1.5 text-sm text-ciel-text-mid">
                                        We sent a 6-digit code to <span className="font-semibold text-ciel-green-deep">{formData.email}</span>
                                    </p>
                                </div>

                                <div className="flex flex-wrap justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
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
                                                "h-12 w-10 rounded-xl border bg-white text-center text-xl font-semibold outline-none transition-all focus-visible:ring-2 focus-visible:ring-ciel-green/40 sm:h-14 sm:w-12 sm:text-2xl",
                                                otpError ? "border-red-400 bg-red-50" : digit ? "border-ciel-green" : "border-slate-200 focus:border-ciel-green",
                                            )}
                                        />
                                    ))}
                                </div>

                                {otpError && (
                                    <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
                                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                                        <p className="text-xs font-semibold text-red-600">{otpError}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleVerifyOtp}
                                    disabled={otpLoading || otpDigits.join("").length !== 6}
                                    className={clsx(
                                        "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2",
                                        otpLoading || otpDigits.join("").length !== 6
                                            ? "cursor-not-allowed bg-slate-200 text-slate-500"
                                            : "bg-[#12303F] text-white hover:bg-[#0d242f]",
                                    )}
                                >
                                    {otpLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>) : (<><ShieldCheck className="h-4 w-4" /> Verify &amp; create account</>)}
                                </button>

                                <p className="text-center">
                                    <button
                                        onClick={handleResendOtp}
                                        disabled={resendCooldown > 0}
                                        className="text-sm font-semibold text-ciel-text-mid hover:text-ciel-green-deep disabled:cursor-not-allowed"
                                    >
                                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive it? Resend code"}
                                    </button>
                                </p>
                            </div>
                        )}
                    </div>
                </main>
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
