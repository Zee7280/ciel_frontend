"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, ShieldCheck, ChevronDown, BadgeCheck, Info, Upload, GraduationCap, User, Building2, Handshake, Briefcase, Landmark, Check, TrendingUp } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import { DEFAULT_PHONE_COUNTRY_KEY, dialFromPhoneCountryKey, validateNationalPhone } from "@/utils/countryCallingCodes";
import { pakistaniUniversities } from "@/utils/universityData";
import { usePublicPlatformConfig } from "@/utils/publicPlatformConfig";
import { PENDING_SUBSCRIPTION_STATUS } from "@/utils/studentSubscription";
import { hecPrograms } from "@/utils/hecProgramsData";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { PAKISTAN_REGION_OPTIONS } from "@/utils/pakistanRegions";
import { isSafeInternalReturnPath } from "@/utils/verificationReturnUrl";
import { isPersonalEmailDomain } from "@/utils/personalEmailDomains";
import PasswordStrengthMeter from "@/components/ciel/PasswordStrengthMeter";
import {
    SIGNUP_PROOF_ACCEPT,
    signupProofFileError,
    uploadSignupProof,
    type SignupProofDocument,
} from "@/utils/signupProofUpload";
import { authApiErrorMessage, isSignupEmailUnverifiedMessage } from "@/utils/authApiError";
import { EMPTY_INVESTOR_SIGNUP, INVESTOR_STEP_COPY, InvestorSignupPanel, type InvestorSignupState, type InvestorWizardStep } from "@/components/ciel/auth/InvestorSignupPanel";

import { Suspense } from "react";

const ROLES = [
    { id: "student", label: "Student", emoji: "🎓", desc: "Quick registration. Create coursework projects and build your Impact Wall.", formTitle: "Student Registration", formSub: "Quick and easy registration.", submitLabel: "Create Student Account" },
    { id: "faculty", label: "Faculty", emoji: "👤", desc: "Quick registration. Review coursework and verify student impact.", formTitle: "Faculty Registration", formSub: "Quick and easy registration.", submitLabel: "Create Faculty Account" },
    { id: "university", label: "University", emoji: "🏛️", desc: "Institutional account verified by CIEL PK Admin.", formTitle: "Institution / Organization Registration", formSub: "Requires verification by CIEL PK Admin.", submitLabel: "Submit for Verification" },
    { id: "ngo", label: "NGO / Partner", emoji: "🤝", desc: "Partner account verified by CIEL PK Admin.", formTitle: "Institution / Organization Registration", formSub: "Requires verification by CIEL PK Admin.", submitLabel: "Submit for Verification" },
    { id: "corporate", label: "Organization", emoji: "💼", desc: "Corporate / CSR account verified by CIEL PK Admin.", formTitle: "Institution / Organization Registration", formSub: "Requires verification by CIEL PK Admin.", submitLabel: "Submit for Verification" },
    { id: "investor", label: "Investor / VC", emoji: "📈", desc: "KYC-verified deal flow from faculty-approved university ventures.", formTitle: "Investor / VC Registration", formSub: "Requires KYC verification by CIEL PK Admin.", submitLabel: "Submit for verification" },
    { id: "government", label: "HEC / Government", emoji: "🏢", desc: "Official representative account verified by CIEL PK Admin.", formTitle: "Institution / Organization Registration", formSub: "Requires verification by CIEL PK Admin.", submitLabel: "Submit for Verification" },
] as const;

const ORG_KIND_OPTIONS = [
    { kind: "university", label: "University", role: "university", category: "Educational Institution", legal: "Educational Institution" },
    { kind: "ngo", label: "NGO / Partner Organization", role: "ngo", category: "Nonprofit Organization (NGO)", legal: "Nonprofit Organization (NGO)" },
    { kind: "corporate", label: "Organization / Corporate Partner", role: "corporate", category: "Corporate Organization", legal: "Private Limited Company" },
    { kind: "government", label: "HEC / Government", role: "ngo", category: "Government Organization", legal: "Government Department" },
    { kind: "international", label: "UN / International Organization", role: "ngo", category: "Development Organization", legal: "International Organization" },
] as const;

const ORG_FIELD_HINTS: Record<string, { orgName: string; designation: string; email: string }> = {
    university: {
        orgName: "e.g. Beaconhouse National University",
        designation: "e.g. Coordinator Community Engagement",
        email: "official@university.edu.pk",
    },
    ngo: {
        orgName: "e.g. Edhi Foundation",
        designation: "e.g. Programme Manager",
        email: "contact@ngo.org",
    },
    corporate: {
        orgName: "e.g. Packages Limited",
        designation: "e.g. CSR Lead",
        email: "csr@company.com",
    },
    government: {
        orgName: "e.g. Higher Education Commission",
        designation: "e.g. Director Quality Assurance",
        email: "official@hec.gov.pk",
    },
};

const PROOF_LINK_TYPES = [
    "Official Website Profile",
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
    const platformCfg = usePublicPlatformConfig();
    const [investorStep, setInvestorStep] = useState<InvestorWizardStep>(1);
    const [investor, setInvestor] = useState<InvestorSignupState>(EMPTY_INVESTOR_SIGNUP);
    const [proofMethod, setProofMethod] = useState<"upload" | "link">("upload");
    const [proofFileName, setProofFileName] = useState("");
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofLinkType, setProofLinkType] = useState<(typeof PROOF_LINK_TYPES)[number]>(PROOF_LINK_TYPES[0]);
    const [proofUrl, setProofUrl] = useState("");
    const [showUniversityAdminModal, setShowUniversityAdminModal] = useState(false);
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
        city: "",
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
        if (selectedRole === "university") {
            setShowUniversityAdminModal(true);
            return;
        }
        applyRoleSelection(selectedRole);
    };

    const applyRoleSelection = (selectedRole: string) => {
        setRole(selectedRole);
        setInvestorStep(1);
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
    const isInvestor = role === "investor";
    const orgHints = ORG_FIELD_HINTS[orgKind] ?? ORG_FIELD_HINTS[role] ?? ORG_FIELD_HINTS.ngo;
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

        if (isInvestor) {
            if (!formData.contactPerson.trim()) newErrors.contactPerson = "Designation is required";
            if (!formData.orgName.trim()) newErrors.orgName = "Fund / organisation name is required";
            if (!investor.linkedin.trim()) newErrors.linkedin = "LinkedIn profile is required";
            if (!investor.website.trim()) newErrors.website = "Website is required";
            if (!investor.investorType.trim()) newErrors.investorType = "Investor type is required";
            if (investorStep >= 2) {
                if (!investor.preferredRounds.length) newErrors.preferredRounds = "Select at least one round";
                if (!investor.preferredStages.length) newErrors.preferredStages = "Select at least one product stage";
                if (!investor.typicalTicket.trim()) newErrors.typicalTicket = "Typical ticket is required";
                if (!investor.sectors.length) newErrors.sectors = "Select at least one sector";
            }
            if (investorStep >= 3) {
                if (!investor.proofOrgFile) newErrors.proofOrgLabel = "Proof of organisation is required";
                else if (signupProofFileError(investor.proofOrgFile)) newErrors.proofOrgLabel = signupProofFileError(investor.proofOrgFile)!;
                if (!investor.proofRoleFile) newErrors.proofRoleLabel = "Proof of role is required";
                else if (signupProofFileError(investor.proofRoleFile)) newErrors.proofRoleLabel = signupProofFileError(investor.proofRoleFile)!;
                if (!investor.agreePlatform || !investor.agreePrivacy || !investor.agreeAuthority) {
                    newErrors.consent = "Accept all three agreement checkboxes to continue";
                }
            }
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
        } else {
            const phoneErr = validateNationalPhone(formData.phoneCountryKey, formData.phone);
            if (phoneErr) newErrors.phone = phoneErr;
        }

        if (!formData.city.trim() && !isInvestor) {
            newErrors.city = "City is required";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = "Invalid email formatting";
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < (isInvestor ? 10 : 8)) {
            newErrors.password = isInvestor ? "Password must be at least 10 characters" : "Password must be at least 8 characters";
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

        if (!consent && !isInvestor) newErrors.consent = "You must accept the terms to continue";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const isFormValid = useMemo(() => {
        if (!isInvestor && !consent) return false;
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return false;
        if (!formData.password || formData.password.length < (isInvestor ? 10 : 8)) return false;
        if (!formData.phone.trim() || validateNationalPhone(formData.phoneCountryKey, formData.phone)) return false;
        if (!isInvestor && !formData.city.trim()) return false;
        if (isInvestor) {
            if (!formData.name.trim() || !formData.contactPerson.trim() || !formData.orgName.trim()) return false;
            if (!investor.linkedin.trim() || !investor.website.trim() || !investor.investorType.trim()) return false;
            if (!investor.preferredRounds.length || !investor.preferredStages.length || !investor.sectors.length || !investor.typicalTicket.trim()) return false;
            if (!investor.proofOrgFile || !investor.proofRoleFile) return false;
            if (signupProofFileError(investor.proofOrgFile) || signupProofFileError(investor.proofRoleFile)) return false;
            if (!investor.agreePlatform || !investor.agreePrivacy || !investor.agreeAuthority) return false;
            return true;
        }
        if (isOrgRole) {
            if (!formData.orgName.trim() || !formData.contactPerson.trim() || !formData.organizationCategory.trim() || !formData.legalRegistrationType.trim()) return false;
            if (proofMethod === "link") {
                const url = proofUrl.trim();
                if (!url || !/^https?:\/\/.+\..+/.test(url)) return false;
            } else if (!proofFile || signupProofFileError(proofFile)) {
                return false;
            }
        } else if (!formData.name.trim()) {
            return false;
        }
        if ((role === "student" || role === "faculty") && (!formData.institution.trim() || !formData.department.trim())) return false;
        if (role === "student" && !formData.enrollmentYear.trim()) return false;
        return true;
    }, [formData, role, isOrgRole, isInvestor, investor, consent, proofMethod, proofUrl, proofFile]);

    const firstIncompleteHint = useMemo(() => {
        if (isFormValid) return "";
        if (isOrgRole) {
            if (!formData.contactPerson.trim()) return "Enter your designation to continue";
            if (!formData.orgName.trim()) return "Enter the organisation name to continue";
            if (!formData.email.trim()) return "Enter your official email to continue";
            if (!formData.phone.trim() || validateNationalPhone(formData.phoneCountryKey, formData.phone)) return "Enter your mobile number to continue";
            if (!formData.city.trim()) return "Select your city to continue";
            if (!formData.password || formData.password.length < 8) return "Create a password of at least 8 characters to continue";
            if (proofMethod === "link" && !proofUrl.trim()) return "Add a verification link to continue";
            if (proofMethod === "upload" && !proofFile) return "Upload a proof document to continue";
            if (!consent) return "Accept the terms to continue";
            return "Complete the remaining fields to continue";
        }
        if (!formData.name.trim()) return "Enter your full name to continue";
        if ((role === "student" || role === "faculty") && !formData.institution.trim()) return "Select your university to continue";
        if ((role === "student" || role === "faculty") && !formData.department.trim()) {
            return role === "student" ? "Select your programme to continue" : "Enter your department to continue";
        }
        if (!formData.email.trim()) return "Enter your email to continue";
        if (!formData.phone.trim() || validateNationalPhone(formData.phoneCountryKey, formData.phone)) return "Enter your mobile number to continue";
        if (!formData.city.trim()) return "Select your city to continue";
        if (role === "student" && !formData.enrollmentYear.trim()) return "Select your enrolment year to continue";
        if (!formData.password || formData.password.length < 8) return "Create a password of at least 8 characters to continue";
        if (!consent) return "Accept the terms to continue";
        return "Complete the remaining fields to continue";
    }, [isFormValid, isOrgRole, formData, role, proofMethod, proofUrl, proofFile, consent]);

    // Step 1: Validate form, then send OTP — swaps the form into the "check your inbox" state.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!validateForm()) return;
        if (isInvestor && investorStep < 3) {
            setInvestorStep((s) => (s === 1 ? 2 : 3));
            return;
        }

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

            // The proof files go up only once the email is verified — the backend refuses them before that.
            const proofUploads: { label: string; file: File }[] = !verifyRes.ok
                ? []
                : isInvestor
                  ? [
                        ...(investor.proofOrgFile ? [{ label: "Proof of organisation", file: investor.proofOrgFile }] : []),
                        ...(investor.proofRoleFile ? [{ label: "Proof of role", file: investor.proofRoleFile }] : []),
                    ]
                  : isOrgRole && proofMethod === "upload" && proofFile
                    ? [{ label: "Proof of affiliation", file: proofFile }]
                    : [];
            // Proof is required for every non-student account: if a file doesn't upload, stop here.
            const signupProofDocuments: SignupProofDocument[] = [];
            for (const p of proofUploads) {
                signupProofDocuments.push(await uploadSignupProof(normalizedEmail, p.label, p.file));
            }

            const { phoneCountryKey, token: _inviteToken, ...signupFields } = formData;
            const signupRes = await fetch("/api/v1/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...signupFields,
                    countryCode: dialFromPhoneCountryKey(phoneCountryKey),
                    email: normalizedEmail,
                    role: apiRole,
                    // The backend refuses signup without explicit acceptance (investors accept via their three agreements).
                    acceptedTerms: isInvestor
                        ? investor.agreePlatform && investor.agreePrivacy && investor.agreeAuthority
                        : consent,
                    name: isOrgRole ? formData.contactPerson.trim() : formData.name.trim(),
                    orgName: formData.orgName.trim(),
                    orgType: isOrgRole ? signupApiRole(role) : formData.orgType,
                    contactPerson: isInvestor || isOrgRole ? formData.contactPerson.trim() : formData.contactPerson,
                    affiliationProofKind: isOrgRole ? proofMethod : isInvestor ? "upload" : undefined,
                    affiliationProofUrl: isOrgRole && proofMethod === "link" ? proofUrl.trim() : isInvestor ? investor.website.trim() : undefined,
                    affiliationProofLabel: isOrgRole
                        ? (proofMethod === "link" ? proofLinkType : proofFileName || "Document upload selected")
                        : isInvestor
                          ? [investor.proofOrgLabel, investor.proofRoleLabel].filter(Boolean).join(" · ")
                          : undefined,
                    signupProofDocuments: signupProofDocuments.length ? signupProofDocuments : undefined,
                    university:
                        role === "student" || role === "faculty"
                            ? formData.institution.trim()
                            : undefined,
                    faculty_department: role === "faculty" ? formData.department.trim() : undefined,
                    city: isInvestor ? investor.country : formData.city,
                    investorProfile: isInvestor
                        ? {
                              linkedin: investor.linkedin.trim(),
                              website: investor.website.trim(),
                              investorType: investor.investorType,
                              country: investor.country,
                              hearAbout: investor.hearAbout,
                              referralCode: investor.referralCode.trim(),
                              preferredRounds: investor.preferredRounds,
                              preferredStages: investor.preferredStages,
                              sectors: investor.sectors,
                              typicalTicket: investor.typicalTicket,
                              geographicFocus: investor.geographicFocus,
                              dealsPerYear: investor.dealsPerYear,
                              decisionTimeline: investor.decisionTimeline,
                              leadFollow: investor.leadFollow,
                              sdgInterests: investor.sdgInterests.trim(),
                              valueAdd: investor.valueAdd.trim(),
                              plan: investor.plan,
                              professionalReference: investor.professionalReference.trim(),
                              proofOrgLabel: investor.proofOrgLabel,
                              proofRoleLabel: investor.proofRoleLabel,
                          }
                        : undefined,
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
            const needsSubscriptionFlow =
                createdUser?.requires_subscription_payment === true ||
                String(createdUser?.account_status ?? "").trim().toLowerCase() === PENDING_SUBSCRIPTION_STATUS;
            const loginQs = new URLSearchParams();
            const su = needsMembershipFlow
                ? "membership"
                : needsSubscriptionFlow
                  ? "subscription"
                  : createdUser?.account_status === "pending" || createdUser?.status === "pending"
                    ? "pending"
                    : isOrgRole
                      ? "org_pending"
                      : "success";
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
            const res = await fetch("/api/v1/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email.trim().toLowerCase() }),
            });
            // A failed send must not look like success — otherwise the user waits for an email that never left.
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setOtpError(authApiErrorMessage(data, "Could not resend the code. Try again."));
                if (res.status === 429) setResendCooldown(10);
                return;
            }
            setOtpDigits(["", "", "", "", "", ""]);
            setResendCooldown(30);
            otpRefs.current[0]?.focus();
        } catch {
            setOtpError("Could not resend the code. Check your connection and try again.");
        }
    };

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const fieldClass = (hasError: boolean, extra?: string) =>
        clsx(
            "w-full min-w-0 rounded-lg border bg-white px-3.5 py-3 text-sm font-medium text-[#173540] outline-none transition-all placeholder:text-[#94a3b0] focus-visible:ring-2 focus-visible:ring-[#0e7d74]/35",
            hasError ? "border-red-400 focus:border-red-500" : "border-[#d7e3e6] focus:border-[#0e7d74]",
            extra,
        );

    const selectClass = (hasError: boolean) => clsx(fieldClass(hasError), "pr-11 cursor-pointer appearance-none");
    const labelClass = "mb-1.5 block text-[12px] font-semibold text-[#3d5560]";
    const personRoleButtons = [
        { id: "student", label: "Student", icon: GraduationCap },
        { id: "faculty", label: "Faculty", icon: User },
        { id: "investor", label: "Investor / VC", icon: TrendingUp },
    ] as const;
    const orgButtons = [
        { id: "university", label: "University", icon: Building2 },
        { id: "ngo", label: "NGO", icon: Handshake },
        { id: "corporate", label: "Organisation", icon: Briefcase },
        { id: "government", label: "HEC / Govt", icon: Landmark },
    ] as const;
    /** Both rows are one single choice, so every option shares the same card, check mark and radio semantics. */
    const renderRoleOption = (
        item: { id: string; label: string; icon: typeof GraduationCap },
        size: "tall" | "short",
    ) => {
        const selected = role === item.id;
        return (
            <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleRoleSelect(item.id)}
                className={clsx(
                    "relative flex flex-col items-start justify-center rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7d74]/35",
                    size === "tall" ? "min-h-[84px] px-3 py-3 sm:min-h-[92px] sm:px-4 sm:py-4" : "min-h-[76px] px-3 py-3 sm:px-3.5",
                    selected
                        ? "border-[#0e7d74] bg-[#e8f7f4] shadow-[0_0_0_1px_rgba(14,125,116,0.15)]"
                        : "border-[#d7e3e6] bg-white hover:border-[#0e7d74]/45",
                )}
            >
                {selected && (
                    <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0e7d74] text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                )}
                <item.icon className={clsx("h-5 w-5", selected ? "text-[#0e7d74]" : "text-[#6b828b]")} />
                <p className={clsx("mt-2 font-semibold leading-tight text-[#173540]", size === "tall" ? "text-[13px] sm:text-sm" : "text-[13px]")}>
                    {item.label}
                </p>
            </button>
        );
    };
    const formStepLabel = isInvestor
        ? `GET STARTED · STEP 0${investorStep} OF 03`
        : step === "otp"
          ? "GET STARTED · STEP 02 OF 02"
          : "GET STARTED · STEP 01 OF 02";
    const formProgressPct = isInvestor ? (investorStep / 3) * 100 : step === "otp" ? 100 : 48;

    return (
        <div className="min-h-dvh bg-[#f7fafb] font-sans antialiased text-[#173540]">
            <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[minmax(300px,40%)_1fr]">
                <aside className="relative flex flex-col justify-between overflow-hidden bg-[linear-gradient(165deg,#071c22_0%,#0b2f38_42%,#0e4a4a_100%)] px-6 py-7 text-white sm:px-8 lg:px-11 lg:py-9">
                    <div className="pointer-events-none absolute -left-16 top-24 h-64 w-64 rounded-full border border-white/5" />
                    <div className="pointer-events-none absolute -right-20 -top-10 h-80 w-80 rounded-full border border-white/[0.06]" />
                    <div className="pointer-events-none absolute bottom-28 right-8 h-40 w-40 rounded-full bg-[#14b8a6]/10 blur-3xl" />
                    <div>
                        <Link href="/" className="relative z-10 inline-flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
                                <Image src="/iel-pk-logo-192.webp" alt="CIEL PK" width={80} height={80} className="object-contain" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase leading-tight tracking-[0.14em] text-white/95">Community Impact Education Lab - PK</p>
                                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7dfff0]/90">Youth Empowered Community Impact</p>
                            </div>
                        </Link>

                        <div className="relative z-10 mt-12 hidden lg:block">
                            <h2 className="max-w-[20ch] text-[2.05rem] font-semibold leading-[1.15] tracking-tight">
                                {step === "otp" ? (
                                    <>Verify <span className="text-[#5eead4]">your email.</span></>
                                ) : (
                                    <>Where your contribution becomes <span className="text-[#5eead4]">credible impact.</span></>
                                )}
                            </h2>
                            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-white/68">
                                {step === "otp"
                                    ? `A 6-digit code was sent to ${formData.email}. Enter it to activate your account.`
                                    : "Connect with meaningful community projects, record your verified service, and build an impact profile you can share with confidence."}
                            </p>
                            {step === "form" && (
                                <ul className="mt-9 space-y-5">
                                    {[
                                        { title: "Discover meaningful opportunities", body: "Explore community service projects aligned with the SDGs." },
                                        { title: "Document work that matters", body: "Track attendance, service hours and approved evidence." },
                                        { title: "Showcase your verified impact", body: "Receive a published report package, CII score and QR-linked certificate after approval." },
                                    ].map((item) => (
                                        <li key={item.title} className="flex gap-3">
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#14b8a6] text-[10px] font-black text-[#062428]">✓</span>
                                            <div>
                                                <p className="text-[14px] font-semibold text-white">{item.title}</p>
                                                <p className="mt-0.5 text-[13px] leading-relaxed text-white/55">{item.body}</p>
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
                                className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-[#5eead4]"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" /> Back to details
                            </button>
                        )}
                        {step === "form" && (
                            <div className="mb-6 hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm lg:block">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">CIEL PK Impact Profile</p>
                                    <span className="rounded-full bg-[#14b8a6]/20 px-2 py-0.5 text-[10px] font-bold text-[#5eead4]">Verified</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { n: "01", t: "Community Service" },
                                        { n: "02", t: "Verified Hours" },
                                        { n: "03", t: "Impact & CII" },
                                    ].map((item) => (
                                        <div key={item.n} className="rounded-xl bg-black/20 px-2.5 py-2.5">
                                            <p className="text-[10px] font-black text-[#5eead4]">{item.n}</p>
                                            <p className="mt-1 text-[11px] font-semibold leading-snug text-white/85">{item.t}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[10px] uppercase tracking-[0.14em] text-white/40">
                            <span>© 2026 CIEL PK</span>
                            <span className="normal-case tracking-normal text-white/45">Serve · Apply · Investigate · Innovate</span>
                        </div>
                    </div>
                </aside>

                <main className="min-w-0 overflow-y-auto bg-white px-5 py-6 sm:px-10 lg:px-14 lg:py-8">
                    <div className="mx-auto w-full max-w-[44rem]">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a9099]">Secure account registration</p>
                            <Link href="/login" className="shrink-0 text-[13px] font-semibold text-[#0e7d74] hover:underline">
                                Already a member? Sign in →
                            </Link>
                        </div>

                        {step === "form" && (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0e7d74]">{formStepLabel}</p>
                                            <h1 className="mt-1.5 text-[1.85rem] font-semibold tracking-tight text-[#173540]">
                                                {isInvestor ? INVESTOR_STEP_COPY[investorStep - 1].title : "Create your account"}
                                            </h1>
                                            <p className="mt-1.5 text-sm text-[#5d737c]">
                                                {isInvestor ? INVESTOR_STEP_COPY[investorStep - 1].sub : "Choose your role, complete your details, then verify your email."}
                                            </p>
                                        </div>
                                        <span className="mt-1 shrink-0 rounded-full border border-[#d7e3e6] bg-[#f4f8f8] px-2.5 py-1 text-[11px] font-semibold text-[#5d737c]">
                                            About 1 minute
                                        </span>
                                    </div>
                                    <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#e6eff1]">
                                        <div className="h-full rounded-full bg-[#0e7d74] transition-all duration-300" style={{ width: `${formProgressPct}%` }} />
                                    </div>
                                </div>

                                <div>
                                    <div role="radiogroup" aria-label="Account type">
                                        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7a9099]">I&apos;m joining as</p>
                                        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                                            {personRoleButtons.map((item) => renderRoleOption(item, "tall"))}
                                        </div>
                                        <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7a9099]">or register an organisation</p>
                                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                            {orgButtons.map((item) => renderRoleOption(item, "short"))}
                                        </div>
                                    </div>
                                    <p className="mt-2 text-[12px] leading-relaxed text-[#7a9099]">
                                        {isInvestor
                                            ? "Investor accounts are KYC-verified by CIEL PK within 3 working days before founder access is activated."
                                            : "Organisation accounts need a short CIEL admin check. Students and faculty activate after email verification."}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7a9099]">Your details</p>
                                    {isOrgRole ? (
                                        <div key={role} className="ciel-crossfade-enter space-y-4">
                                            <div>
                                                <label className={labelClass}>Organization name</label>
                                                {orgKind === "university" ? (
                                                    <SearchableSelect value={formData.orgName} onChange={(v) => handleGenericChange("orgName", v)} options={pakistaniUniversities} placeholder="Select organization name" searchPlaceholder="Search universities..." hasError={!!errors.orgName} ariaLabel="Organization name" allowCustomValue={false} variant="field" />
                                                ) : (
                                                    <input type="text" value={formData.orgName} onChange={(e) => handleGenericChange("orgName", e.target.value)} className={fieldClass(!!errors.orgName)} placeholder={orgHints.orgName} aria-label="Organization name" />
                                                )}
                                                {errors.orgName && <p className="text-[11px] text-red-500 font-semibold ml-1">{errors.orgName}</p>}
                                            </div>

                                            <div>
                                                <label className={labelClass}>Your designation</label>
                                                <input type="text" value={formData.contactPerson} onChange={(e) => handleGenericChange("contactPerson", e.target.value)} className={fieldClass(!!errors.contactPerson)} placeholder={orgHints.designation} />
                                                {errors.contactPerson && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.contactPerson}</p>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={`${role}-name`} className="ciel-crossfade-enter space-y-4">
                                            <div className={clsx(!isInvestor && "grid grid-cols-1 items-start gap-4 sm:grid-cols-2")}>
                                                <div>
                                                    <label className={labelClass}>Full name{isInvestor ? " *" : ""}</label>
                                                    <div className="relative">
                                                        {!isInvestor ? <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b0]" /> : null}
                                                        <input type="text" value={formData.name} onChange={(e) => handleGenericChange("name", e.target.value)} className={fieldClass(!!errors.name, !isInvestor ? "pl-10" : undefined)} placeholder={isInvestor ? "e.g. Ayesha Khan" : "Enter your full name"} />
                                                    </div>
                                                    {errors.name && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.name}</p>}
                                                </div>
                                                {!isInvestor ? (
                                                    <div>
                                                        <label className={labelClass}>Email address</label>
                                                        <div className="group relative">
                                                            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b0]" />
                                                            <input
                                                                type="email"
                                                                value={formData.email}
                                                                onChange={(e) => { handleGenericChange("email", e.target.value); setDismissedEmailWarning(false); }}
                                                                className={fieldClass(!!errors.email, "pl-10")}
                                                                placeholder={role === "faculty" ? "faculty@university.edu.pk" : "you@university.edu.pk"}
                                                            />
                                                        </div>
                                                        {errors.email && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.email}</p>}
                                                    </div>
                                                ) : null}
                                            </div>
                                            {isInvestor && (
                                                <>
                                                    <div>
                                                        <label className={labelClass}>Designation *</label>
                                                        <input type="text" value={formData.contactPerson} onChange={(e) => handleGenericChange("contactPerson", e.target.value)} className={fieldClass(!!errors.contactPerson)} placeholder="e.g. Investment Director" />
                                                        {errors.contactPerson && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.contactPerson}</p>}
                                                    </div>
                                                    <div>
                                                        <label className={labelClass}>Fund / organisation name *</label>
                                                        <input type="text" value={formData.orgName} onChange={(e) => handleGenericChange("orgName", e.target.value)} className={fieldClass(!!errors.orgName)} placeholder="e.g. ABC Ventures" />
                                                        {errors.orgName && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.orgName}</p>}
                                                    </div>
                                                </>
                                            )}
                                            {!isInvestor && formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && !errors.email ? (
                                                isPersonalEmail && !dismissedEmailWarning ? (
                                                    <div className="flex items-start gap-2 rounded-xl bg-[#f4f8f8] px-3 py-2.5">
                                                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#5d737c]" />
                                                        <div className="flex-1">
                                                            <p className="text-[12px] leading-relaxed text-[#5d737c]">A personal email works. A university address skips extra checks — you&apos;d be active after verifying, instead of waiting on an admin.</p>
                                                            <button type="button" onClick={() => setDismissedEmailWarning(true)} className="mt-1 text-[12px] font-semibold text-[#0b5f58] underline">
                                                                Use it anyway
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-[#0b5f58]">
                                                        <BadgeCheck className="h-3.5 w-3.5" /> Looks good — we&apos;ll verify this at the end
                                                    </p>
                                                )
                                            ) : null}
                                        </div>
                                    )}

                                    {(role === "student" || role === "faculty") && (
                                        <div key={`${role}-inst`} className="ciel-crossfade-enter relative z-30 grid grid-cols-1 items-start gap-4 overflow-visible sm:grid-cols-2">
                                            <div>
                                                <label className={labelClass}>University</label>
                                                <SearchableSelect value={formData.institution} onChange={(v) => handleGenericChange("institution", v)} options={pakistaniUniversities} placeholder="Select university" searchPlaceholder="Search universities..." hasError={!!errors.institution} ariaLabel="University" allowCustomValue={false} variant="field" />
                                                {errors.institution && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.institution}</p>}
                                            </div>
                                            <div className="relative z-20 min-w-0">
                                                <label className={labelClass}>{role === "student" ? "Programme" : "Department"}</label>
                                                {role === "student" ? (
                                                    <SearchableSelect value={formData.department} onChange={(v) => handleGenericChange("department", v)} options={hecPrograms} placeholder={formData.institution ? "Select programme" : "Select university first"} searchPlaceholder="Search HEC programs..." hasError={!!errors.department} ariaLabel="Programme" disabled={!formData.institution} variant="field" />
                                                ) : (
                                                    <input type="text" value={formData.department} onChange={(e) => handleGenericChange("department", e.target.value)} className={fieldClass(!!errors.department)} placeholder="e.g. School of Management Sciences" aria-label="Department" />
                                                )}
                                                {errors.department && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.department}</p>}
                                            </div>
                                        </div>
                                    )}

                                    {(isOrgRole || isInvestor) && (
                                    <div>
                                        <label className={labelClass}>{isOrgRole ? "Official email address" : "Email address"}</label>
                                        <div className="group relative">
                                            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b0]" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => { handleGenericChange("email", e.target.value); setDismissedEmailWarning(false); }}
                                                className={fieldClass(!!errors.email, "pl-10")}
                                                placeholder={isInvestor ? "name@fund.com" : orgHints.email}
                                            />
                                        </div>
                                        {errors.email && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.email}</p>}
                                        {!errors.email && formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                                            isPersonalEmail && !dismissedEmailWarning ? (
                                                <div className="mt-2 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                                                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#5d737c]" />
                                                    <div className="flex-1">
                                                        <p className="text-[12px] leading-relaxed text-[#5d737c]">A personal email works. A university address skips extra checks — you&apos;d be active after verifying, instead of waiting on an admin.</p>
                                                        <button type="button" onClick={() => setDismissedEmailWarning(true)} className="mt-1 text-[12px] font-semibold text-[#0b5f58] underline">
                                                            Use it anyway
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[#0b5f58]">
                                                    <BadgeCheck className="h-3.5 w-3.5" /> Looks good — we&apos;ll verify this at the end
                                                </p>
                                            )
                                        )}
                                    </div>
                                    )}

                                    <div className={clsx("grid grid-cols-1 items-start gap-4", !isOrgRole && !isInvestor && "sm:grid-cols-2")}>
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
                                                selectClassName="rounded-lg border border-[#d7e3e6] bg-white py-3 text-sm font-medium text-[#173540] focus:border-[#0e7d74]"
                                                inputClassName={clsx(
                                                    "rounded-lg border bg-white py-3 text-sm font-medium text-[#173540] placeholder:text-[#94a3b0] focus:bg-white sm:px-3.5",
                                                    errors.phone ? "border-red-500 focus:border-red-500" : "border-[#d7e3e6] focus:border-[#0e7d74]",
                                                )}
                                            />
                                        </div>

                                        {!isInvestor && (
                                        <div>
                                            <label className={labelClass}>City</label>
                                            <div className="relative">
                                                <select value={formData.city} onChange={(e) => handleGenericChange("city", e.target.value)} aria-invalid={!!errors.city} aria-label="City" className={selectClass(!!errors.city)}>
                                                    <option value="">Select city</option>
                                                    {PAKISTAN_REGION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b0]" aria-hidden />
                                            </div>
                                            {errors.city && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.city}</p>}
                                        </div>
                                        )}
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
                                                            accept={SIGNUP_PROOF_ACCEPT}
                                                            onChange={(e) => {
                                                                const f = e.target.files?.[0] ?? null;
                                                                setProofFile(f);
                                                                setProofFileName(f?.name ?? "");
                                                                setErrors((prev) => ({ ...prev, proofFile: signupProofFileError(f) ?? "" }));
                                                            }}
                                                        />
                                                    </label>
                                                    <p className="mt-2 text-[12px] leading-relaxed text-ciel-text-soft">Accepted: university or employee ID, faculty card, or authorization letter (PDF or image, max 4 MB). CIEL PK reviews it before approving your account.</p>
                                                    {errors.proofFile ? <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.proofFile}</p> : null}
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
                                        <label className={labelClass}>Create password</label>
                                        <div className="group relative">
                                            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b0]" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => handleGenericChange("password", e.target.value)}
                                                className={fieldClass(!!errors.password, "pl-10 pr-11")}
                                                placeholder={isInvestor ? "Min. 10 characters" : "Minimum 8 characters"}
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#94a3b0] hover:text-[#0e7d74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7d74]" tabIndex={-1}>
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {errors.password ? (
                                            <div className="mt-1 flex items-start gap-1.5">
                                                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                                                <p className="text-[11px] font-semibold text-red-500">{errors.password}</p>
                                            </div>
                                        ) : formData.password ? (
                                            <PasswordStrengthMeter password={formData.password} />
                                        ) : (
                                            <p className="mt-1.5 text-[12px] text-[#7a9099]">Use {isInvestor ? 10 : 8} or more characters</p>
                                        )}
                                    </div>
                                </div>

                                {isInvestor && (
                                    <InvestorSignupPanel
                                        step={investorStep}
                                        setStep={setInvestorStep}
                                        onNext={() => {
                                            if (!validateForm()) return;
                                            setInvestorStep((s) => (s === 1 ? 2 : 3));
                                        }}
                                        investor={investor}
                                        setInvestor={setInvestor}
                                        errors={errors}
                                        fieldClass={fieldClass}
                                        selectClass={selectClass}
                                        labelClass={labelClass}
                                    />
                                )}

                                {formError && (
                                    <div className="p-4 rounded-ciel-md bg-red-50 text-red-600 text-xs font-semibold border border-red-100 flex items-start gap-3">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{formError}</span>
                                    </div>
                                )}

                                {!isInvestor && (
                                <>
                                {role === "student" ? (
                                    <div className="flex items-start gap-2.5 rounded-xl border border-[#d7e8e6] bg-[#f3faf8] px-3.5 py-3">
                                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0e7d74]" />
                                        <p className="text-[12px] leading-relaxed text-[#3d5560]">
                                            For students: CIEL PK member-university registrations are free. Any applicable non-member subscription is confirmed after signup; community service reporting fees are separate
                                            {platformCfg.student_subscription_required
                                                ? ` (non-member portal unlock: PKR ${platformCfg.student_subscription_fee_pkr.toLocaleString("en-PK")}).`
                                                : "."}
                                        </p>
                                    </div>
                                ) : null}

                                <label className="flex cursor-pointer items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={consent}
                                        onChange={(e) => { setConsent(e.target.checked); if (errors.consent) setErrors((prev) => ({ ...prev, consent: "" })); }}
                                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#d7e3e6] text-[#0e7d74] focus-visible:ring-2 focus-visible:ring-[#0e7d74]"
                                    />
                                    <span className="text-xs leading-relaxed text-[#5d737c]">
                                        I agree to CIEL PK&apos;s <Link href="/about" className="font-semibold text-[#0b5f58] underline">Terms &amp; Conditions</Link> and <Link href="/about" className="font-semibold text-[#0b5f58] underline">Data Use &amp; Privacy Policy</Link>, and consent to my verified activity being recorded on the platform.
                                    </span>
                                </label>
                                {errors.consent && <p className="-mt-4 ml-7 text-[11px] font-semibold text-red-500">{errors.consent}</p>}

                                <button
                                    type="submit"
                                    disabled={isLoading || !isFormValid}
                                    className={clsx(
                                        "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7d74] focus-visible:ring-offset-2",
                                        isFormValid && !isLoading
                                            ? "bg-[#0e7d74] text-white hover:bg-[#0b655e]"
                                            : "cursor-not-allowed bg-[#dce5e8] text-[#7a9099]",
                                    )}
                                >
                                    {isLoading ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Sending code...</>
                                    ) : (
                                        <>Create account <ArrowRight className="h-4 w-4" /></>
                                    )}
                                </button>
                                <p className="text-center text-[12px] text-[#7a9099]">Next step: verify your email address to activate your profile.</p>
                                {!isFormValid && (
                                    <p className="text-center text-[12px] text-[#7a9099]">{firstIncompleteHint}</p>
                                )}
                                {isOrgRole && (
                                    <p className="text-center text-[12px] text-[#7a9099]">Organisation accounts stay pending until CIEL admin review.</p>
                                )}
                                </>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8f0f2] pt-4 text-[12px] text-[#7a9099]">
                                    <span>Built for verified community impact · CIEL PK</span>
                                    <Link href="/contact" className="font-semibold text-[#0e7d74] hover:underline">Need help?</Link>
                                </div>
                            </form>
                        )}

                        {step === "otp" && (
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0e7d74]">{formStepLabel}</p>
                                    <h1 className="mt-1.5 text-[1.85rem] font-semibold tracking-tight text-[#173540]">Check your inbox</h1>
                                    <p className="mt-1.5 text-sm text-[#5d737c]">
                                        We sent a 6-digit code to <span className="font-semibold text-[#0b5f58]">{formData.email}</span>
                                    </p>
                                    <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#e6eff1]">
                                        <div className="h-full rounded-full bg-[#0e7d74]" style={{ width: "100%" }} />
                                    </div>
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
                                        "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7d74] focus-visible:ring-offset-2",
                                        otpLoading || otpDigits.join("").length !== 6
                                            ? "cursor-not-allowed bg-[#dce5e8] text-[#7a9099]"
                                            : "bg-[#0e7d74] text-white hover:bg-[#0b655e]",
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

            {showUniversityAdminModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4 z-50">
                    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
                        <div className="flex justify-center mb-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f7f4]">
                                <Landmark className="h-8 w-8 text-[#0e7d74]" />
                            </div>
                        </div>
                        <h2 className="text-center text-[1.35rem] font-semibold text-[#173540]">
                            Are you a university administrator?
                        </h2>
                        <p className="mt-3 text-center text-[13px] leading-relaxed text-[#5d737c]">
                            The University category is only for authorised administrators registering on behalf of their institution.
                        </p>

                        <div className="mt-5 rounded-xl bg-[#f0f9f7] border border-[#c8e6e0] p-3.5">
                            <div className="flex gap-3">
                                <GraduationCap className="h-4 w-4 shrink-0 text-[#0e7d74] mt-0.5" />
                                <p className="text-[13px] leading-relaxed text-[#0e7d74]">
                                    If you are a university student, please register under <strong>Student</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUniversityAdminModal(false);
                                    applyRoleSelection("university");
                                }}
                                className="w-full rounded-xl bg-[#0e7d74] px-4 py-3 text-center text-[13px] font-semibold text-white hover:bg-[#0b655e] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7d74]/35"
                            >
                                Yes, continue as University Admin
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUniversityAdminModal(false);
                                    applyRoleSelection("student");
                                }}
                                className="w-full rounded-xl border-2 border-[#0e7d74] px-4 py-3 text-center text-[13px] font-semibold text-[#0e7d74] hover:bg-[#f0f9f7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7d74]/35"
                            >
                                No, register as Student
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowUniversityAdminModal(false)}
                            className="mt-4 w-full text-center text-[13px] font-semibold text-[#5d737c] hover:text-[#0e7d74] transition-colors"
                        >
                            Back to role selection
                        </button>
                    </div>
                </div>
            )}
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
