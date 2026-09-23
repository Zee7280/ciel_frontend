"use client";

import { useState } from "react";
import { School, CheckCircle2, Loader2, Smartphone, MessageSquare, ChevronRight, AlertCircle } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { BNU_DEGREE_PROGRAMS, isBnuUniversity, pakistaniUniversities } from "@/utils/universityData";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import { composeInternationalPhone, parsePhoneForDisplay } from "@/utils/countryCallingCodes";
import { formatPakistaniCnicInput, pakistaniCnicDigits } from "@/utils/section1ParticipantDossierFields";
import clsx from "clsx";
import { useRef, useEffect } from "react";

/** PK CNIC UI is 13 numeric digits — normalize API/localStorage quirks (spacing, coercion). */
function normalizePakistaniCnicDigits(value: unknown): string {
    return pakistaniCnicDigits(value);
}

export interface Participant {
    id: string;
    fullName: string;
    cnic: string;
    mobile: string;
    email: string;
    universityId: string;
    universityName: string;
    academicProgram: string;
    yearOfStudy: string;
    department: string;
    academicIntegrationType: string;
    facultySupervisorEmail?: string;
    /** Community-service report only (see `showSemester`) — not stored on the backend Participant record. */
    semester?: string;
}

const SEMESTER_OPTIONS = Array.from({ length: 10 }, (_, i) => `Semester ${i + 1}`);

function BnuUniversityIcon() {
    return (
        <svg viewBox="0 0 32 32" className="h-5 w-5 shrink-0" aria-hidden>
            <rect width="32" height="32" rx="8" fill="#0e4d4e" />
            <path
                d="M16 5.5c.4 2.4.2 4.2-.6 5.6 1.5-.3 2.8.2 3.6 1.4-1.8.2-3 .9-3.6 2.2.9-2.6.4-4.6-.8-6.2-.2 2.2-1.2 3.8-2.8 4.8 1.2-1.6 1.8-3.4 1.6-5.4-1.3 1.5-3.2 2.2-5.4 2.1 2.2-.8 3.8-2.2 4.6-4.5Z"
                fill="#f4c56a"
            />
            <text
                x="16"
                y="27.2"
                textAnchor="middle"
                fontSize="7"
                fontWeight="700"
                fill="#ffffff"
                fontFamily="Arial, Helvetica, sans-serif"
            >
                BNU
            </text>
        </svg>
    );
}

export default function IdentityVerification({
    projectId,
    onSuccess,
    initialData = {},
    participationMode = 'individual',
    isTeamLead = false,
    teamId = "",
    primaryFacultyEmail = "",
    secondaryFacultyEmail = "",
    showSemester = false,
}: {
    projectId: string;
    onSuccess: (p: Participant) => void;
    initialData?: Partial<any>;
    participationMode?: 'individual' | 'team';
    isTeamLead?: boolean;
    teamId?: string;
    primaryFacultyEmail?: string;
    secondaryFacultyEmail?: string;
    /** Community-service report screens pass true to also collect Semester (1-10) here. */
    showSemester?: boolean;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'academic'>('personal');
    const [isVerifyingOtp, setIsVerifyingOtp] = useState({ email: false });
    const [otpSent, setOtpSent] = useState({ email: false });
    const [otpVerified, setOtpVerified] = useState({ email: !!initialData.verified });
    const [showUniDropdown, setShowUniDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const initialPhone = parsePhoneForDisplay(String(initialData.mobile ?? ""));
    const [phoneCountryKey, setPhoneCountryKey] = useState(initialPhone.phoneCountryKey);
    const [phoneNational, setPhoneNational] = useState(initialPhone.national);

    const [formData, setFormData] = useState({
        fullName: initialData.fullName || '',
        cnic: normalizePakistaniCnicDigits(initialData?.cnic),
        email: initialData.email || '',
        universityId: initialData.universityId || '',
        universityName: initialData.universityName || '',
        academicProgram: initialData.academicProgram || '',
        yearOfStudy: initialData.yearOfStudy || '3rd Year',
        department: initialData.department || '',
        academicIntegrationType: initialData.academicIntegrationType || 'Course-Linked',
        facultySupervisorEmail: initialData.facultySupervisorEmail || '',
        semester: initialData.semester || '',
    });

    const [otpInputs, setOtpInputs] = useState({ email: '' });

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowUniDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (initialData.verified) {
            setOtpVerified({ email: true });
        }
    }, [initialData.verified]);

    useEffect(() => {
        const next = parsePhoneForDisplay(String(initialData?.mobile ?? ""));
        setPhoneCountryKey(next.phoneCountryKey);
        setPhoneNational(next.national);
    }, [initialData?.mobile]);

    const sendOtp = async (type: 'email') => {
        setIsVerifyingOtp(prev => ({ ...prev, [type]: true }));
        try {
            const res = await authenticatedFetch(`/api/v1/student/verify-team-member/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email }),
            });
            if (res && res.ok) {
                setOtpSent(prev => ({ ...prev, [type]: true }));
            } else {
                const err = await res?.json();
                alert(err?.message || "Failed to send OTP");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        } finally {
            setIsVerifyingOtp(prev => ({ ...prev, [type]: false }));
        }
    };

    // Pre-fill profile fields for team lead when the name row is still empty
    useEffect(() => {
        if (isTeamLead && !formData.fullName) {
            const storedUserStr = localStorage.getItem("user") || localStorage.getItem("ciel_user");
            if (storedUserStr) {
                try {
                    const u = JSON.parse(storedUserStr);
                    const rawPhone = u.phone || u.contact;
                    if (rawPhone) {
                        const p = parsePhoneForDisplay(String(rawPhone));
                        setPhoneCountryKey(p.phoneCountryKey);
                        setPhoneNational(p.national);
                    }
                    setFormData(prev => ({
                        ...prev,
                        fullName: u.name || prev.fullName,
                        email: u.email || prev.email,
                        universityName: u.university || u.institution || prev.universityName
                    }));
                    if (u.email) {
                        setOtpVerified({ email: true });
                    }
                } catch (e) {}
            }
        }
    }, [isTeamLead]);

    // CNIC: draft/API first, then account profile (cnic or national_id). Applies to all flows including /engagement/verify.
    useEffect(() => {
        setFormData((prev) => {
            if (normalizePakistaniCnicDigits(prev.cnic).length === 13) return prev;

            const fromInitial = normalizePakistaniCnicDigits(initialData?.cnic);
            if (fromInitial.length === 13) {
                return { ...prev, cnic: fromInitial };
            }

            const storedUserStr = localStorage.getItem("user") || localStorage.getItem("ciel_user");
            if (!storedUserStr) return prev;
            try {
                const u = JSON.parse(storedUserStr);
                const raw = normalizePakistaniCnicDigits(u.cnic ?? u.national_id);
                if (raw.length !== 13) return prev;
                return { ...prev, cnic: raw };
            } catch {
                return prev;
            }
        });
    }, [initialData?.cnic, initialData?.id]);

    const [effectiveTeamId, setEffectiveTeamId] = useState(() => {
        const fromProps = (teamId || "").trim();
        if (fromProps) return fromProps;
        const fromInitial = initialData?.teamId ?? initialData?.team_id;
        return typeof fromInitial === "string" ? fromInitial.trim() : "";
    });

    // Team leads: report/draft payloads can briefly carry truncated CNIC. Engagement row is authoritative once saved.
    useEffect(() => {
        if (!isTeamLead || !projectId.trim()) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await authenticatedFetch(`/api/v1/engagement/my`);
                if (!res?.ok || cancelled) return;
                const body = await res.json().catch(() => null);
                const rows: unknown[] = Array.isArray(body?.data) ? body.data : [];
                const pid = projectId.trim();
                const candidate = rows.find((r): r is Record<string, unknown> => {
                    if (!r || typeof r !== "object") return false;
                    const row = r as Record<string, unknown>;
                    const rp = String(row.projectId ?? "");
                    const leadFlag =
                        Boolean(row.isTeamLead) ||
                        row.is_team_lead === true ||
                        String(row.is_team_lead ?? "").toLowerCase() === "true";
                    return rp === pid && leadFlag;
                }) ?? rows.find((r): r is Record<string, unknown> => {
                    if (!r || typeof r !== "object") return false;
                    return String((r as Record<string, unknown>).projectId ?? "") === pid;
                }) ?? null;

                const rowTeamId = candidate
                    ? String(candidate.teamId ?? candidate.team_id ?? "").trim()
                    : "";
                if (rowTeamId && !cancelled) {
                    setEffectiveTeamId(rowTeamId);
                }

                const d = normalizePakistaniCnicDigits(candidate?.cnic);
                if (d.length !== 13 || cancelled) return;

                setFormData((prev) =>
                    normalizePakistaniCnicDigits(prev.cnic).length === 13 ? prev : { ...prev, cnic: d },
                );
            } catch {
                /* non-blocking */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isTeamLead, projectId]);

    useEffect(() => {
        const fromProps = (teamId || "").trim();
        if (fromProps) setEffectiveTeamId(fromProps);
    }, [teamId]);

    const handleChangeEmail = () => {
        setOtpSent(prev => ({ ...prev, email: false }));
        setOtpVerified(prev => ({ ...prev, email: false }));
        setOtpInputs(prev => ({ ...prev, email: '' }));
    };

    const verifyOtp = async (type: 'email') => {
        setIsVerifyingOtp(prev => ({ ...prev, [type]: true }));
        try {
            const res = await authenticatedFetch(`/api/v1/student/verify-team-member/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, otp: otpInputs.email }),
            });
            if (res && res.ok) {
                setOtpVerified(prev => ({ ...prev, [type]: true }));
            } else {
                const err = await res?.json();
                alert(err?.message || "Invalid OTP");
                setOtpVerified(prev => ({ ...prev, [type]: false }));
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred during verification");
        } finally {
            setIsVerifyingOtp(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleSubmit = async () => {
        if (!otpVerified.email && !initialData.verified) {
            alert("Verify this member by OTP to their email before adding them.");
            return;
        }
        if (pakistaniCnicDigits(formData.cnic).length !== 13) {
            alert("Enter a 13-digit CNIC (xxxxx-xxxxxxx-x).");
            return;
        }
        if (phoneNational.replace(/\D/g, "").length < 8) {
            alert("Enter a mobile number with country code.");
            return;
        }
        setIsSubmitting(true);
        try {
            const body: any = {
                ...formData,
                mobile: composeInternationalPhone(phoneCountryKey, phoneNational),
                projectId,
                participationMode,
                isTeamLead,
                status: 'pending_ciel_approval',
            };
            // facultySupervisorEmail is now collected at the application/apply stage — not here
            delete body.facultySupervisorEmail;
            // Only the community-service report flow collects semester — leave other callers' records untouched.
            if (!showSemester) delete body.semester;
            const resolvedTeamId =
                effectiveTeamId ||
                teamId ||
                initialData.teamId ||
                initialData.team_id ||
                "";
            if (resolvedTeamId) {
                body.teamId = resolvedTeamId;
                body.team_id = resolvedTeamId;
            }
            const resolvedPrimaryFacultyEmail =
                primaryFacultyEmail ||
                initialData.primaryFacultyEmail ||
                initialData.primary_faculty_email ||
                initialData.facultyEmail ||
                initialData.faculty_email ||
                "";
            const resolvedSecondaryFacultyEmail =
                secondaryFacultyEmail ||
                initialData.secondaryFacultyEmail ||
                initialData.secondary_faculty_email ||
                "";
            if (resolvedPrimaryFacultyEmail) {
                body.primary_faculty_email = resolvedPrimaryFacultyEmail;
                body.secondary_faculty_email = resolvedSecondaryFacultyEmail || null;
            }

            const res = await authenticatedFetch(`/api/v1/engagement/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res && res.ok) {
                const result = await res.json();
                onSuccess(result.data);
            } else {
                const err = await res?.json();
                alert(err?.message || "Registration failed");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const cnicNormalized = normalizePakistaniCnicDigits(formData.cnic);
    const phoneOk = phoneNational.replace(/\D/g, "").length >= 8;
    const isPersonalValid =
        !!formData.fullName.trim() && cnicNormalized.length === 13 && phoneOk && otpVerified.email;
    const isAcademicValid = !!(formData.universityId && formData.universityName && formData.academicProgram && (!showSemester || formData.semester));

    /** Verified / email-linked records can still lack CNIC (e.g. individual apply). Keep CNIC editable until 13 digits are saved. */
    const cnicDigitsLen = cnicNormalized.length;
    const cnicFieldLocked =
        (otpVerified.email || !!initialData.verified) && cnicDigitsLen === 13;

    return (
        <div className="cer-scope space-y-4">
            {/* Tab Navigation */}
            <div className="cer-chips">
                {(['personal', 'academic'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx("cer-chip", activeTab === tab && "on")}
                    >
                        {tab === 'personal' ? '👤 Personal info' : '🎓 Academic info'}
                    </button>
                ))}
            </div>

            {activeTab === 'personal' ? (
                <div className="space-y-1">
                    <div className="cer-g2">
                        <div>
                            <label className="cer-field-label">Full name (per CNIC)</label>
                            <input
                                placeholder="Enter full name"
                                value={formData.fullName}
                                disabled={otpVerified.email || !!initialData.verified}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="cer-input"
                            />
                        </div>
                        <div>
                            <label className="cer-field-label">CNIC number</label>
                            <input
                                placeholder="xxxxx-xxxxxxx-x"
                                maxLength={15}
                                inputMode="numeric"
                                value={formatPakistaniCnicInput(formData.cnic)}
                                disabled={cnicFieldLocked}
                                onChange={(e) => setFormData({ ...formData, cnic: pakistaniCnicDigits(e.target.value) })}
                                className="cer-input tracking-[0.08em]"
                            />
                            <p className="cer-hint">13 digits with dashes, e.g. 35202-1234567-1</p>
                        </div>
                    </div>

                    {/* OTP Flow for Mobile/Email */}
                    <div className="cer-g2">
                        {/* Mobile */}
                        <div>
                            <label className="cer-field-label flex items-center gap-1.5">
                                <Smartphone className="w-3 h-3" /> Mobile contact
                            </label>
                            <PhoneConnectivityRow
                                usePortalCountryPicker
                                phoneCountryKey={phoneCountryKey}
                                nationalDigits={phoneNational}
                                onPhoneCountryKeyChange={setPhoneCountryKey}
                                onNationalDigitsChange={setPhoneNational}
                                disabled={otpVerified.email || !!initialData.verified}
                                maxNationalDigits={15}
                                placeholderNational="3001234567"
                                selectClassName="cer-input min-w-[6.5rem]"
                                inputClassName="cer-input"
                                rowClassName="items-stretch gap-2"
                            />
                            <p className="cer-hint">Country code + mobile number, e.g. +92 · 3001234567.</p>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="cer-field-label flex items-center gap-1.5">
                                <MessageSquare className="w-3 h-3" /> Email verification
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    placeholder="student@uni.edu"
                                    value={formData.email}
                                    disabled={otpSent.email || otpVerified.email || !!initialData.verified}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="cer-input pr-[5.5rem]"
                                />
                                {!otpSent.email && (
                                    <button
                                        onClick={() => sendOtp('email')}
                                        disabled={isVerifyingOtp.email || !formData.email}
                                        className="cer-aibtn absolute right-1.5 top-1.5 !mt-0 !py-1 !px-2.5 text-[9px] disabled:opacity-50"
                                    >
                                        {isVerifyingOtp.email ? <Loader2 className="w-3 h-3 animate-spin" /> : '📩 Send OTP'}
                                    </button>
                                )}
                                {otpSent.email && !otpVerified.email && (
                                    <button
                                        onClick={handleChangeEmail}
                                        className="absolute right-2 top-1.5 h-8 px-2 text-[9px] font-black uppercase tracking-wider text-[var(--muted)] hover:text-[var(--ink)]"
                                    >
                                        Change
                                    </button>
                                )}
                            </div>

                            {otpSent.email && !otpVerified.email && (
                                <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="6-digit"
                                            maxLength={6}
                                            value={otpInputs.email}
                                            onChange={(e) => setOtpInputs({ ...otpInputs, email: e.target.value })}
                                            className="cer-input text-center tracking-[0.4em]"
                                        />
                                        <button
                                            onClick={() => verifyOtp('email')}
                                            disabled={isVerifyingOtp.email || otpInputs.email.length !== 6}
                                            className="cer-aibtn !mt-0 whitespace-nowrap disabled:opacity-50"
                                        >
                                            {isVerifyingOtp.email ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => sendOtp('email')}
                                        disabled={isVerifyingOtp.email}
                                        className="text-[10px] font-black text-[var(--teal)] uppercase tracking-widest hover:underline disabled:text-[var(--muted)]"
                                    >
                                        {isVerifyingOtp.email ? 'Sending...' : 'Resend OTP'}
                                    </button>
                                </div>
                            )}

                            {otpVerified.email && (
                                <div className="cer-note !mb-0 mt-2 items-center">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Academy mail linked
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        disabled={!isPersonalValid}
                        onClick={() => setActiveTab('academic')}
                        className="cer-aibtn w-full !mt-4 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Confirm info &amp; proceed to academic <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                <div className="space-y-1">
                    <div className="relative" ref={dropdownRef}>
                        <label className="cer-field-label">University / institution</label>
                        <div className="relative">
                            <div className="flex items-center gap-2">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--line)] bg-white">
                                    {isBnuUniversity(formData.universityName) ? (
                                        <BnuUniversityIcon />
                                    ) : (
                                        <School className="h-4 w-4 text-[var(--teal)]" />
                                    )}
                                </span>
                                <input
                                    placeholder="Search and select your university..."
                                    value={formData.universityName}
                                    onFocus={() => setShowUniDropdown(true)}
                                    onChange={(e) => {
                                        setFormData({ ...formData, universityName: e.target.value });
                                        setShowUniDropdown(true);
                                    }}
                                    className="cer-input min-w-0"
                                />
                            </div>
                            {showUniDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-[var(--line)] z-[100] max-h-[260px] overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {pakistaniUniversities
                                        .filter(u => u.toLowerCase().includes(formData.universityName.toLowerCase()))
                                        .map((uni, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setFormData({ ...formData, universityName: uni });
                                                    setShowUniDropdown(false);
                                                }}
                                                className="w-full text-left px-2.5 py-2 hover:bg-[var(--teal-soft)] rounded-lg transition-colors flex items-center gap-2 text-xs font-bold text-[var(--ink)]"
                                            >
                                                {isBnuUniversity(uni) ? (
                                                    <BnuUniversityIcon />
                                                ) : (
                                                    <School className="w-3 h-3 text-[var(--teal)]" />
                                                )}
                                                {uni}
                                            </button>
                                        ))}
                                    {pakistaniUniversities.filter(u => u.toLowerCase().includes(formData.universityName.toLowerCase())).length === 0 && (
                                        <div className="p-3 text-center text-[11px] text-[var(--muted)] font-bold">
                                            No university found within Pakistan list.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="cer-g2">
                        <div>
                            <label className="cer-field-label">Student ID / CNIC link</label>
                            <input
                                placeholder="FA21-BCS-056"
                                value={formData.universityId}
                                onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                                className="cer-input"
                            />
                        </div>
                        <div>
                            <label className="cer-field-label">Degree program</label>
                            {isBnuUniversity(formData.universityName) ? (
                                <select
                                    value={formData.academicProgram}
                                    onChange={(e) => setFormData({ ...formData, academicProgram: e.target.value })}
                                    className="cer-input"
                                >
                                    <option value="">Select degree program…</option>
                                    {formData.academicProgram &&
                                    !BNU_DEGREE_PROGRAMS.some((group) =>
                                        group.programs.includes(formData.academicProgram),
                                    ) ? (
                                        <option value={formData.academicProgram}>{formData.academicProgram}</option>
                                    ) : null}
                                    {BNU_DEGREE_PROGRAMS.map((group) => (
                                        <optgroup key={group.school} label={group.school}>
                                            {group.programs.map((program) => (
                                                <option key={program} value={program}>
                                                    {program}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    placeholder="BS Computer Science"
                                    value={formData.academicProgram}
                                    onChange={(e) => setFormData({ ...formData, academicProgram: e.target.value })}
                                    className="cer-input"
                                />
                            )}
                        </div>
                    </div>

                    {showSemester && (
                        <div className="cer-g2">
                            <div>
                                <label className="cer-field-label">Semester</label>
                                <select
                                    value={formData.semester}
                                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                    className="cer-input"
                                >
                                    <option value="">Select semester…</option>
                                    {SEMESTER_OPTIONS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {!showSemester && (
                        <div className="cer-g2">
                            <div>
                                <label className="cer-field-label">Year of study</label>
                                <select
                                    value={formData.yearOfStudy}
                                    onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
                                    className="cer-input"
                                >
                                    {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Postgraduate'].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="cer-field-label">Academic integration type</label>
                                <select
                                    value={formData.academicIntegrationType}
                                    onChange={(e) => setFormData({ ...formData, academicIntegrationType: e.target.value })}
                                    className="cer-input"
                                >
                                    {['Voluntary', 'Course-Linked', 'Credit-Bearing', 'Capstone / Thesis', 'Research-Integrated'].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 !mt-4">
                        <button
                            onClick={() => setActiveTab('personal')}
                            className="cer-ghost"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !isAcademicValid || !isPersonalValid}
                            className="cer-bigbtn flex-1 !mt-0 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify identity & link record"}
                        </button>
                    </div>
                </div>
            )}

            <div className="cer-note !mt-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>
                    Identity verification is a <strong>hard gateway</strong>. Your academic record will be locked and traceable for institutional HEC compliance once verified.
                </p>
            </div>
        </div>
    );
}
