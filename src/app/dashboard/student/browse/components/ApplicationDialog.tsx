"use client";

import SearchableSelect from "@/components/ui/SearchableSelect";
import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../report/components/ui/dialog";
import { Button } from "../../report/components/ui/button";
import { RadioGroup, RadioGroupItem } from "../../report/components/ui/radio-group";
import { Label } from "../../report/components/ui/label";
import { Input } from "../../report/components/ui/input";
import { Plus, Trash2, Loader2, Users, User } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { canonicalPakistaniUniversity, canonicalUniversityAllowlist, pakistaniUniversities } from "@/utils/universityData";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import PartnerOrganizationGuidance from "@/components/ui/PartnerOrganizationGuidance";
import type { AttendanceApproverType } from "@/utils/attendanceApproverRouting";
import {
    DEFAULT_PHONE_COUNTRY_KEY,
    composeInternationalPhone,
    parsePhoneForDisplay,
    validateNationalPhone,
} from "@/utils/countryCallingCodes";
import { formatPakistaniCnicInput, pakistaniCnicDigits } from "@/utils/section1ParticipantDossierFields";
import {
    messageFromApplyProxyError,
    normalizeNestHttpMessage,
    resolveApplyOpportunityToastMessage,
    isAlreadyAppliedApplyErrorMessage,
} from "@/utils/applyOpportunityUx";
import { fetchParticipationGuide, type ParticipationGuide } from "@/utils/participationGuide";

export type ApplySuccessMeta = {
    applicationId?: string;
    applicationStatus?: string;
};

interface ApplicationDialogProps {
    opportunityId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (id: string, meta?: ApplySuccessMeta) => void;
    opportunityTitle?: string;
    attendanceApproverType?: AttendanceApproverType;
    /** Opportunity university scope (same list Section 1 / IdentityVerification use). Empty → full Pakistan list. */
    allowedUniversities?: string[];
    /** Seats still open on the listing (lead + members must fit). null/undefined → no cap known. */
    seatsRemaining?: number | null;
}

interface TeamMember {
    name: string;
    cnic: string;
    /** Full international digits (E.164-style), kept in sync with phone parts for the apply API. */
    mobile: string;
    phoneCountryKey: string;
    phoneNational: string;
    email: string;
    university: string;
    program: string;
    role: string;
    verificationStatus: 'unverified' | 'sending' | 'otp_sent' | 'verified';
    otp?: string;
    showOtpInput?: boolean;
}

/** Profile spelling → picker entry ("BNU" → "Beaconhouse National University (BNU)"). Unknown names stay as typed. */
function profileUniversityForPicker(profileValue: string): string {
    const t = (profileValue || "").trim();
    if (!t || t === "Other") return t;
    return canonicalPakistaniUniversity(t) || t;
}

function universityKey(value: unknown): string {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isUniversityWithinScope(university: string, allowlist: string[]): boolean {
    if (allowlist.length === 0) return true;
    const key = universityKey(canonicalPakistaniUniversity(university) || university);
    return allowlist.some((u) => universityKey(u) === key);
}

/** Backend requires non-empty unique `team_id` for every team application. */
function generateTeamId() {
    const year = new Date().getFullYear();
    const a = Math.random().toString(36).slice(2, 10).toUpperCase();
    const b = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `TM-${year}-${a}-${b}`;
}

/** Only fields the apply API persists — omit OTP / verification UI state so backend never sees junk keys. */
function teamMemberRowForApplyApi(m: TeamMember) {
    return {
        name: m.name,
        cnic: m.cnic,
        mobile: composeInternationalPhone(m.phoneCountryKey, m.phoneNational),
        email: m.email.trim(),
        university: canonicalPakistaniUniversity(m.university) || m.university,
        program: m.program,
        role: m.role,
    };
}

function emailKey(value: unknown): string {
    return String(value || "").trim().toLowerCase();
}

const DUPLICATE_TEAM_EMAIL_MESSAGE =
    "This email is already on this team (team lead or another member). Each student must use their own registered email.";

function isDuplicateTeamMemberEmail(email: string, members: TeamMember[], selfIndex: number): boolean {
    const next = emailKey(email);
    if (!next) return false;
    return members.some((member, idx) => idx !== selfIndex && emailKey(member.email) === next);
}

const DUPLICATE_TEAM_CNIC_MESSAGE = "This CNIC is already used by another member of this team.";

function isDuplicateTeamMemberCnic(cnic: string, members: TeamMember[], selfIndex: number): boolean {
    const next = pakistaniCnicDigits(cnic);
    if (next.length !== 13) return false;
    return members.some((member, idx) => idx !== selfIndex && pakistaniCnicDigits(member.cnic) === next);
}

export default function ApplicationDialog({
    opportunityId,
    open,
    onOpenChange,
    onSuccess,
    opportunityTitle,
    attendanceApproverType = "faculty",
    allowedUniversities,
    seatsRemaining,
}: ApplicationDialogProps) {
    const submitLockRef = useRef(false);
    const universityAllowlist = useMemo(() => canonicalUniversityAllowlist(allowedUniversities), [allowedUniversities]);
    const universityLocked = universityAllowlist.length === 1;
    const universityOptions = useMemo(
        () => (universityAllowlist.length > 0 ? universityAllowlist : [...pakistaniUniversities, "Other"]),
        [universityAllowlist],
    );
    /** University a fresh member row starts with: the single allowed one, otherwise nothing (never a silent list default). */
    const blankMemberUniversity = universityLocked ? universityAllowlist[0] : "";
    const maxTeamSize =
        typeof seatsRemaining === "number" && Number.isFinite(seatsRemaining) && seatsRemaining > 0
            ? Math.floor(seatsRemaining)
            : null;
    const [participationType, setParticipationType] = useState<"individual" | "team">("individual");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [primaryFacultyEmail, setPrimaryFacultyEmail] = useState("");
    const [secondaryFacultyEmail, setSecondaryFacultyEmail] = useState("");
    const [teamId, setTeamId] = useState("");
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
        {
            name: "",
            cnic: "",
            mobile: "",
            phoneCountryKey: DEFAULT_PHONE_COUNTRY_KEY,
            phoneNational: "",
            email: "",
            university: "",
            program: "",
            role: "Member",
            verificationStatus: "unverified",
        },
    ]);
    const [applicantPhoneCountryKey, setApplicantPhoneCountryKey] = useState(DEFAULT_PHONE_COUNTRY_KEY);
    const [applicantPhoneNational, setApplicantPhoneNational] = useState("");
    const [participationGuide, setParticipationGuide] = useState<ParticipationGuide | null>(null);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open && opportunityId) {
            void fetchParticipationGuide(opportunityId).then(setParticipationGuide);
        } else if (!open) {
            setParticipationGuide(null);
        }
    }, [open, opportunityId]);

    useEffect(() => {
        if (open) {
            setParticipationType("individual");
            setPrimaryFacultyEmail("");
            setSecondaryFacultyEmail("");
            setTeamId("");

            const storedUserStr = localStorage.getItem("user") || localStorage.getItem("ciel_user");
            let initialMember: TeamMember = {
                name: "",
                cnic: "",
                mobile: "",
                phoneCountryKey: DEFAULT_PHONE_COUNTRY_KEY,
                phoneNational: "",
                email: "",
                university: blankMemberUniversity,
                program: "",
                role: "Member",
                verificationStatus: "unverified",
            };

            if (storedUserStr) {
                try {
                    const u = JSON.parse(storedUserStr);
                    const rawPhone = u.phone || u.contact || "";
                    const parsedMember = parsePhoneForDisplay(rawPhone);
                    initialMember = {
                        name: u.name || "",
                        cnic: (u.cnic || u.national_id || "").replace(/\D/g, "").slice(0, 13),
                        mobile: composeInternationalPhone(parsedMember.phoneCountryKey, parsedMember.national),
                        phoneCountryKey: parsedMember.phoneCountryKey,
                        phoneNational: parsedMember.national,
                        email: u.email || "",
                        // Lead's seat is their profile university; a single-university scope wins over any profile spelling.
                        university: universityLocked
                            ? universityAllowlist[0]
                            : profileUniversityForPicker(u.university || u.institution || ""),
                        program: u.program || u.department || "",
                        role: "Lead",
                        verificationStatus: 'verified'
                    };
                } catch (e) {
                    console.error("Failed to parse user for pre-fill", e);
                }
            }

            setTeamMembers([initialMember]);
            const parsed = parsePhoneForDisplay(initialMember.mobile);
            setApplicantPhoneCountryKey(parsed.phoneCountryKey);
            setApplicantPhoneNational(parsed.national);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, opportunityId, universityLocked, universityAllowlist[0]]);

    // "Your mobile number" is the lead's contact in both modes — keep the lead row in sync so the
    // team payload never carries a stale/empty profile phone while the field above is filled.
    useEffect(() => {
        setTeamMembers((prev) => {
            const idx = prev.findIndex((m) => m.role === "Lead");
            if (idx < 0) return prev;
            const lead = prev[idx];
            if (lead.phoneCountryKey === applicantPhoneCountryKey && lead.phoneNational === applicantPhoneNational) return prev;
            const next = [...prev];
            next[idx] = {
                ...lead,
                phoneCountryKey: applicantPhoneCountryKey,
                phoneNational: applicantPhoneNational,
                mobile: composeInternationalPhone(applicantPhoneCountryKey, applicantPhoneNational),
            };
            return next;
        });
    }, [applicantPhoneCountryKey, applicantPhoneNational]);

    // Backend rejects empty team_id — keep a trimmed value whenever user is in team mode
    useEffect(() => {
        if (participationType === "team" && !teamId.trim()) {
            setTeamId(generateTeamId());
        }
    }, [participationType, teamId]);

    const teamIsFull = maxTeamSize != null && teamMembers.length >= maxTeamSize;

    const handleAddMember = () => {
        if (teamIsFull) {
            toast.error(
                maxTeamSize === 1
                    ? "Only 1 seat is left on this opportunity, so a team cannot be formed — apply as an individual."
                    : `Only ${maxTeamSize} seats are left on this opportunity (you + ${maxTeamSize - 1} member${maxTeamSize - 1 === 1 ? "" : "s"}).`,
            );
            return;
        }
        setTeamMembers([
            ...teamMembers,
            {
                name: "",
                cnic: "",
                mobile: "",
                phoneCountryKey: DEFAULT_PHONE_COUNTRY_KEY,
                phoneNational: "",
                email: "",
                university: blankMemberUniversity,
                program: "",
                role: "Member",
                verificationStatus: "unverified",
            },
        ]);
    };

    const handleRemoveMember = (index: number) => {
        if (teamMembers[index]?.role === "Lead") {
            toast.error("You are the team lead — your own row cannot be removed. Switch to Individual instead.");
            return;
        }
        const newMembers = [...teamMembers];
        newMembers.splice(index, 1);
        setTeamMembers(newMembers);
    };

    const updateMemberPhone = (index: number, patch: { phoneCountryKey?: string; phoneNational?: string }) => {
        setTeamMembers((prev) => {
            const newMembers = [...prev];
            const m = newMembers[index];
            if (!m) return prev;
            const phoneCountryKey = patch.phoneCountryKey ?? m.phoneCountryKey;
            const phoneNational = patch.phoneNational ?? m.phoneNational;
            newMembers[index] = {
                ...m,
                phoneCountryKey,
                phoneNational,
                mobile: composeInternationalPhone(phoneCountryKey, phoneNational),
            };
            return newMembers;
        });
    };

    const updateMember = (index: number, field: keyof TeamMember, value: string) => {
        // Strict numeric support for CNIC
        if (field === "cnic") {
            value = pakistaniCnicDigits(value);
        }

        if (field === "university" && (teamMembers[index]?.role === "Lead" || universityLocked)) {
            return;
        }

        const newMembers = [...teamMembers];

        // Reset verification if email changes
        if (field === 'email' && newMembers[index].verificationStatus === 'verified') {
            newMembers[index] = { ...newMembers[index], [field]: value, verificationStatus: 'unverified' };
        } else {
            newMembers[index] = { ...newMembers[index], [field]: value };
        }

        setTeamMembers(newMembers);
    };

    const handleVerifyEmail = async (index: number) => {
        const member = teamMembers[index];
        if (!member.email) {
            toast.error("Please enter an email address first.");
            return;
        }
        if (isDuplicateTeamMemberEmail(member.email, teamMembers, index)) {
            toast.error(DUPLICATE_TEAM_EMAIL_MESSAGE);
            return;
        }

        // 1. Immediately show loader and disable button
        setTeamMembers(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], verificationStatus: 'sending' };
            return updated;
        });

        try {
            const res = await authenticatedFetch(`/api/v1/student/verify-team-member/send`, {
                method: 'POST',
                body: JSON.stringify({
                    email: member.email,
                    projectId: opportunityId,
                    blockIfOnRoster: member.role !== "Lead",
                })
            });

            if (res && res.ok) {
                setTeamMembers(prev => {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], verificationStatus: 'otp_sent', showOtpInput: true };
                    return updated;
                });
                toast.success(`OTP sent to ${member.email}`);
            } else {
                const errorData = res ? await res.json() : { message: "Failed to connect to server" };
                setTeamMembers(prev => {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], verificationStatus: 'unverified' };
                    return updated;
                });
                toast.error(normalizeNestHttpMessage(errorData.message) || "Failed to send OTP");
            }
        } catch (error) {
            console.error("Verification error", error);
            setTeamMembers(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], verificationStatus: 'unverified' };
                return updated;
            });
            toast.error("An error occurred while sending OTP");
        }
    };

    const handleConfirmOtp = async (index: number) => {
        const member = teamMembers[index];
        if (!member.otp) {
            toast.error("Please enter the OTP code.");
            return;
        }

        // 1. Immediately show loader and disable button
        setTeamMembers(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], verificationStatus: 'sending' };
            return updated;
        });

        try {
            const res = await authenticatedFetch(`/api/v1/student/verify-team-member/confirm`, {
                method: 'POST',
                body: JSON.stringify({ email: member.email, otp: member.otp })
            });

            if (res && res.ok) {
                setTeamMembers(prev => {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], verificationStatus: 'verified', showOtpInput: false };
                    return updated;
                });
                toast.success("Email verified successfully!");
            } else {
                const errorData = res ? await res.json() : { message: "Invalid OTP" };
                setTeamMembers(prev => {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], verificationStatus: 'otp_sent' };
                    return updated;
                });
                toast.error(errorData.message || "Invalid OTP code");
            }
        } catch (error) {
            console.error("OTP Confirmation error", error);
            setTeamMembers(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], verificationStatus: 'otp_sent' };
                return updated;
            });
            toast.error("An error occurred during verification");
        }
    };

    const handleSubmit = async () => {
        if (!opportunityId) return;

        // Primary faculty is always required
        if (!primaryFacultyEmail || !primaryFacultyEmail.includes('@')) {
            toast.error("Primary Faculty email is required and must be a valid email.");
            return;
        }

        const applicantPhoneE164 = composeInternationalPhone(applicantPhoneCountryKey, applicantPhoneNational);
        // Lead contact is required in both modes: individual seat, or the lead row of the team payload.
        const phoneErr = validateNationalPhone(applicantPhoneCountryKey, applicantPhoneNational);
        if (phoneErr) {
            toast.error(phoneErr);
            return;
        }

        const lead = teamMembers.find((m) => m.role === "Lead");
        if (lead && !isUniversityWithinScope(lead.university, universityAllowlist)) {
            toast.error(
                `This opportunity is open to ${universityAllowlist.join(", ")} students only. Your profile university (${lead.university || "not set"}) does not match.`,
            );
            return;
        }

        // Team apply: always send a non-empty team_id string (never rely on JSON omitting undefined)
        const resolvedTeamId =
            participationType === "team" ? (teamId.trim() || generateTeamId()) : undefined;

        // Validation for team
        if (participationType === "team") {
            if (!teamMembers.some((m) => m.role !== "Lead")) {
                toast.error("Add at least one verified team member, or apply as an individual.");
                return;
            }
            if (maxTeamSize != null && teamMembers.length > maxTeamSize) {
                toast.error(`Only ${maxTeamSize} seat${maxTeamSize === 1 ? " is" : "s are"} left on this opportunity — your team has ${teamMembers.length} people.`);
                return;
            }
            for (let i = 0; i < teamMembers.length; i++) {
                const member = teamMembers[i];
                const label = member.role === "Lead" ? "you (team lead)" : `Member ${i + 1}`;
                const memberPhoneErr = validateNationalPhone(member.phoneCountryKey, member.phoneNational);
                if (!member.name.trim() || !member.cnic || memberPhoneErr) {
                    toast.error(memberPhoneErr ? `${memberPhoneErr} (${label})` : `Please fill in all required fields for ${label}.`);
                    return;
                }
                if (member.cnic.length !== 13) {
                    toast.error(`CNIC for ${label} must be exactly 13 digits.`);
                    return;
                }
                if (isDuplicateTeamMemberCnic(member.cnic, teamMembers, i)) {
                    toast.error(`${DUPLICATE_TEAM_CNIC_MESSAGE} (${label})`);
                    return;
                }
                if (!member.email.trim() || !member.email.includes("@")) {
                    toast.error(`A valid email is required for ${label}.`);
                    return;
                }
                if (member.verificationStatus !== 'verified') {
                    toast.error(`Please verify the email for ${label} before submitting.`);
                    return;
                }
                if (isDuplicateTeamMemberEmail(member.email, teamMembers, i)) {
                    toast.error(DUPLICATE_TEAM_EMAIL_MESSAGE);
                    return;
                }
                if (!member.university.trim()) {
                    toast.error(`Select the university for ${label}.`);
                    return;
                }
                if (!isUniversityWithinScope(member.university, universityAllowlist)) {
                    toast.error(
                        `${member.university} is not allowed on this opportunity (${label}). Open to: ${universityAllowlist.join(", ")}.`,
                    );
                    return;
                }
            }
        }

        // Sync displayed team ID only once we actually send — avoids jitter if validation aborted above
        if (participationType === "team" && resolvedTeamId && !teamId.trim()) {
            setTeamId(resolvedTeamId);
        }

        if (submitLockRef.current) return;

        setIsSubmitting(true);
        submitLockRef.current = true;
        try {
            const payload = {
                participation_type: participationType === "team" ? "team" : "individual",
                ...(participationType === "team" && resolvedTeamId
                    ? { team_id: resolvedTeamId }
                    : {}),
                primary_faculty_email: primaryFacultyEmail,
                secondary_faculty_email: secondaryFacultyEmail || undefined,
                attendance_approver_type: attendanceApproverType,
                // Individual: omit team_members — backend treats any member row with an email as team apply
                // and then requires team_id; lead profile comes from the authenticated student.
                team_members:
                    participationType === "team"
                        ? teamMembers.map(teamMemberRowForApplyApi)
                        : undefined,
                ...(applicantPhoneE164
                    ? { contact_phone_e164: applicantPhoneE164 }
                    : {}),
            };

            const res = await authenticatedFetch(`/api/v1/students/opportunities/${opportunityId}/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                let data: Record<string, unknown> = {};
                try {
                    data = (await res.json()) as Record<string, unknown>;
                } catch {
                    data = {};
                }

                const inner = (data.data ?? {}) as Record<string, unknown>;
                const applicationId =
                    typeof inner.application_id === "string"
                        ? inner.application_id
                        : typeof inner.applicationId === "string"
                          ? inner.applicationId
                          : undefined;
                const applicationStatus =
                    typeof inner.application_status === "string"
                        ? inner.application_status
                        : typeof inner.applicationStatus === "string"
                          ? inner.applicationStatus
                          : undefined;

                const successFlag = data.success === true || data.success === "true";

                if (successFlag || applicationId) {
                    const okMsg =
                        typeof data.message === "string"
                            ? data.message
                            : normalizeNestHttpMessage(data.message) || "";
                    toast.success(okMsg.trim() ? okMsg : "Application submitted successfully!");
                    onSuccess(opportunityId!, {
                        applicationId,
                        applicationStatus: applicationStatus ?? "pending_approval",
                    });
                    onOpenChange(false);
                } else {
                    toast.error(
                        resolveApplyOpportunityToastMessage(
                            normalizeNestHttpMessage(data.message) || undefined,
                        ),
                    );
                }
            } else if (!res) {
                toast.error("Failed to connect to server");
            } else {
                let errPayload: Record<string, unknown> | null = null;
                try {
                    errPayload = (await res.json()) as Record<string, unknown>;
                } catch {
                    errPayload = null;
                }
                const apiMsg = messageFromApplyProxyError(errPayload);

                if (isAlreadyAppliedApplyErrorMessage(apiMsg)) {
                    toast.info(resolveApplyOpportunityToastMessage("Already applied to this opportunity"));
                    onSuccess(opportunityId!, {
                        applicationStatus: "pending_approval",
                    });
                    onOpenChange(false);
                } else {
                    toast.error(resolveApplyOpportunityToastMessage(apiMsg || undefined));
                }
            }
        } catch (error) {
            console.error("Error applying", error);
            toast.error("An error occurred while applying");
        } finally {
            setIsSubmitting(false);
            submitLockRef.current = false;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto w-full">
                <DialogHeader>
                    <DialogTitle>Apply for {opportunityTitle || "Opportunity"}</DialogTitle>
                    <DialogDescription>
                        Select how you want to participate in this project.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-8 py-4 px-1">
                    {participationGuide?.messages?.en ? (
                        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                            {participationGuide.messages.en}
                        </div>
                    ) : null}
                    <PartnerOrganizationGuidance context="enroll" />
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Participation Type</Label>
                        <RadioGroup
                            value={participationType}
                            onValueChange={(val) => setParticipationType(val as "individual" | "team")}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                            <label className={`flex flex-col items-center justify-between rounded-xl border-2 p-6 hover:bg-slate-50 cursor-pointer transition-all ${participationType === 'individual' ? 'border-primary bg-blue-50/50' : 'border-slate-200'}`}>
                                <RadioGroupItem value="individual" id="individual" className="sr-only" />
                                <User className={`w-10 h-10 mb-4 ${participationType === 'individual' ? 'text-primary' : 'text-slate-400'}`} />
                                <span className="font-bold text-lg">Individual</span>
                                <span className="text-sm text-slate-500 text-center mt-1">Starting my own work on this project (add teammates later in Section 1)</span>
                            </label>

                            <label className={`flex flex-col items-center justify-between rounded-xl border-2 p-6 hover:bg-slate-50 cursor-pointer transition-all ${participationType === 'team' ? 'border-primary bg-blue-50/50' : 'border-slate-200'} ${participationGuide && !participationGuide.can_apply_as_team_lead ? 'opacity-50 pointer-events-none' : ''}`}>
                                <RadioGroupItem value="team" id="team" className="sr-only" />
                                <Users className={`w-10 h-10 mb-4 ${participationType === 'team' ? 'text-primary' : 'text-slate-400'}`} />
                                <span className="font-bold text-lg">Team</span>
                                <span className="text-sm text-slate-500 text-center mt-1">I am leading a new group (not joining someone who already started)</span>
                            </label>
                        </RadioGroup>
                    </div>

                    {/* ───────────────────────────────────────────────
                        FACULTY ASSIGNMENT (appears for both modes)
                    ─────────────────────────────────────────────── */}
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 border-b pb-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black">F</div>
                            <Label className="text-base font-bold text-slate-800">Faculty Supervisor Assignment</Label>
                        </div>

                        {/* Primary Faculty — always required */}
                        <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black text-indigo-700 uppercase tracking-widest">
                                    Primary Faculty Supervisor <span className="text-red-500 ml-1">*</span>
                                </Label>
                                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
                                    {attendanceApproverType === "partner" ? "Required · Academic Supervisor" : "Required · Attendance Owner"}
                                </span>
                            </div>
                            <Input
                                id="primary-faculty-email"
                                type="email"
                                value={primaryFacultyEmail}
                                onChange={(e) => setPrimaryFacultyEmail(e.target.value)}
                                placeholder="faculty@university.edu.pk"
                                className="h-10 bg-white border-indigo-200 focus:border-indigo-400"
                            />
                            <p className="text-[10px] text-indigo-500 font-medium">
                                {attendanceApproverType === "partner"
                                    ? "This faculty member approves your join request first (CIEL PK then gives final approval) and confirms your supervision before you start the report. Attendance for this partner-created project is reviewed by the partner."
                                    : "This faculty member approves your join request first (CIEL PK then gives final approval), confirms your supervision before you start the report, and receives attendance approval requests."}
                            </p>
                        </div>

                        {/* Secondary Faculty — optional */}
                        <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/40 space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                    Secondary Faculty Supervisor
                                </Label>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Optional · Visibility Only</span>
                            </div>
                            <Input
                                id="secondary-faculty-email"
                                type="email"
                                value={secondaryFacultyEmail}
                                onChange={(e) => setSecondaryFacultyEmail(e.target.value)}
                                placeholder="co-supervisor@university.edu.pk"
                                className="h-10 bg-white border-slate-200"
                            />
                            <p className="text-[10px] text-slate-400 font-medium">
                                Added for collaboration only. They can view but cannot approve or own analytics.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl border border-slate-100 bg-white space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                                    Your mobile number
                                    <span className="text-red-500 ml-1">*</span>
                                </Label>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                                    Required
                                </span>
                            </div>
                            <PhoneConnectivityRow
                                usePortalCountryPicker
                                phoneCountryKey={applicantPhoneCountryKey}
                                nationalDigits={applicantPhoneNational}
                                onPhoneCountryKeyChange={setApplicantPhoneCountryKey}
                                onNationalDigitsChange={setApplicantPhoneNational}
                                maxNationalDigits={15}
                                placeholderNational="3001234567"
                                selectClassName="border-indigo-200 focus-visible:border-indigo-400"
                                inputClassName="border-indigo-200"
                                rowClassName="items-stretch"
                            />
                            <p className="text-[10px] text-slate-400 font-medium">
                                Country code and number for project coordinators to reach you.
                            </p>
                        </div>
                    </div>

                    {/* ───────────────────────────────────────────────
                        TEAM ID (only shown for team mode)
                    ─────────────────────────────────────────────── */}
                    {participationType === 'team' && teamId && (
                        <div className="flex items-center gap-4 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 animate-in fade-in duration-200">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <Users className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">System-Generated Team ID</p>
                                <p className="text-lg font-black text-slate-900 tracking-widest font-mono">{teamId}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium max-w-[150px] text-right leading-relaxed">
                                This ID is unique to your team and links all members together.
                            </p>
                        </div>
                    )}

                    {participationType === "individual" && teamMembers.length > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="border-b pb-2">
                                <Label className="text-lg font-bold text-slate-800">My Details (Autofilled)</Label>
                                <p className="text-sm text-slate-500">Your verified profile information will be used for this application.</p>
                            </div>
                            
                            <div className="p-6 border rounded-2xl bg-indigo-50/30 border-indigo-100 relative group transition-all">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                                        <p className="font-bold text-slate-700">{teamMembers[0].name || "Not provided"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                                        <p className="font-bold text-slate-700">{teamMembers[0].email || "Not provided"}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Verified</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">University</p>
                                        <p className="font-bold text-slate-700">{teamMembers[0].university || "Not provided"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</p>
                                        <p className="font-bold text-slate-700">
                                            {composeInternationalPhone(applicantPhoneCountryKey, applicantPhoneNational) ||
                                                composeInternationalPhone(
                                                    teamMembers[0]?.phoneCountryKey ?? DEFAULT_PHONE_COUNTRY_KEY,
                                                    teamMembers[0]?.phoneNational ?? "",
                                                ) ||
                                                teamMembers[0]?.mobile ||
                                                "Not provided"}
                                        </p>
                                    </div>
                                </div>
                                <p className="mt-4 text-[10px] text-indigo-500 font-medium">
                                    You will enter your 13-digit CNIC once during project engagement (identity verification), so it matches your verified engagement record.
                                </p>
                            </div>
                        </div>
                    )}

                    {participationType === "team" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex justify-between items-center border-b pb-2">
                                <div className="space-y-1">
                                    <Label className="text-lg font-bold text-slate-800">Team Members</Label>
                                    <p className="text-sm text-slate-500">
                                        You are the team lead (row 1). Add every teammate and verify their email by OTP.
                                        {maxTeamSize != null ? ` Seats left: ${maxTeamSize} (team of ${teamMembers.length}).` : ""}
                                    </p>
                                    {universityAllowlist.length === 0 ? (
                                        <p className="text-xs font-medium text-slate-500">
                                            This opportunity is open to students of any university.
                                        </p>
                                    ) : null}
                                    {universityAllowlist.length > 0 ? (
                                        <p className="text-xs font-semibold text-indigo-600">
                                            {universityLocked
                                                ? `Open to ${universityAllowlist[0]} students only — every member must be from there and registered on CIEL.`
                                                : `Open to: ${universityAllowlist.join(", ")}. Every member must be from one of these and registered on CIEL.`}
                                        </p>
                                    ) : null}
                                </div>
                                <Button size="sm" onClick={handleAddMember} disabled={teamIsFull} className="bg-slate-900 text-white hover:bg-slate-800 shrink-0">
                                    <Plus className="w-4 h-4 mr-2" /> Add Member
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {teamMembers.map((member, index) => (
                                    <div key={index} className="p-6 border rounded-xl bg-slate-50/50 relative group transition-all hover:bg-slate-100/50">
                                        {member.role !== "Lead" ? (
                                            <div className="absolute right-3 top-3">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveMember(index)}
                                                    aria-label={`Remove member ${index + 1}`}
                                                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : null}
                                        <div className="mb-4 flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
                                                {index + 1}
                                            </span>
                                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                                {member.role === "Lead" ? "Team Lead (you)" : "Member Details"}
                                            </h4>
                                            {member.role === "Lead" ? (
                                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                                    From your profile
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-x-5 lg:gap-y-4 lg:items-start">
                                            <div className="space-y-1.5 md:col-span-1 lg:col-span-3">
                                                <Label className="text-xs font-medium text-slate-600">Full Name *</Label>
                                                <Input
                                                    value={member.name}
                                                    onChange={(e) => updateMember(index, 'name', e.target.value)}
                                                    placeholder="As appear on CNIC"
                                                    className={`h-10 bg-white ${member.role === "Lead" ? "bg-slate-50 cursor-default" : ""}`}
                                                    readOnly={member.role === "Lead"}
                                                />
                                            </div>
                                            <div className="space-y-1.5 md:col-span-1 lg:col-span-3">
                                                <Label className="text-xs font-medium text-slate-600">CNIC (xxxxx-xxxxxxx-x) *</Label>
                                                <Input
                                                    value={formatPakistaniCnicInput(member.cnic)}
                                                    onChange={(e) => updateMember(index, 'cnic', e.target.value)}
                                                    placeholder="35202-1234567-1"
                                                    inputMode="numeric"
                                                    maxLength={15}
                                                    className={`h-10 bg-white ${isDuplicateTeamMemberCnic(member.cnic, teamMembers, index) ? "border-red-500" : ""}`}
                                                />
                                                {isDuplicateTeamMemberCnic(member.cnic, teamMembers, index) ? (
                                                    <p className="text-[10px] text-red-600 font-medium">{DUPLICATE_TEAM_CNIC_MESSAGE}</p>
                                                ) : null}
                                            </div>
                                            <div className="space-y-1.5 md:col-span-2 lg:col-span-6">
                                                <Label className="text-xs font-medium text-slate-600">Mobile Number *</Label>
                                                <PhoneConnectivityRow
                                                    usePortalCountryPicker
                                                    phoneCountryKey={member.phoneCountryKey}
                                                    nationalDigits={member.phoneNational}
                                                    onPhoneCountryKeyChange={(key) => updateMemberPhone(index, { phoneCountryKey: key })}
                                                    onNationalDigitsChange={(digits) => updateMemberPhone(index, { phoneNational: digits })}
                                                    maxNationalDigits={15}
                                                    placeholderNational="3001234567"
                                                    readOnly={member.role === "Lead"}
                                                    selectClassName="border-slate-200 focus-visible:border-indigo-400 h-10 min-h-10 rounded-md text-xs py-0 box-border shrink-0"
                                                    inputClassName="border-slate-200 h-10 min-h-10 rounded-md text-sm py-0 box-border"
                                                    rowClassName="items-center gap-2"
                                                />
                                                {member.role === "Lead" ? (
                                                    <p className="text-[10px] text-slate-400">Edit this under “Your mobile number” above.</p>
                                                ) : null}
                                            </div>

                                            <div className="space-y-1.5 md:col-span-1 lg:col-span-3">
                                                <Label className="text-xs font-medium text-slate-600">University *</Label>
                                                <SearchableSelect
                                                    value={member.university}
                                                    onChange={(v) => updateMember(index, 'university', v)}
                                                    options={
                                                        member.university && !universityOptions.includes(member.university)
                                                            ? [member.university, ...universityOptions]
                                                            : universityOptions
                                                    }
                                                    placeholder={universityAllowlist.length > 1 ? "Select an allowed university" : "Select University"}
                                                    searchPlaceholder="Search universities..."
                                                    ariaLabel={`University for member ${index + 1}`}
                                                    accent="blue"
                                                    allowCustomValue={false}
                                                    disabled={member.role === "Lead" || universityLocked}
                                                />
                                                {member.role === "Lead" ? (
                                                    <p className="text-[10px] text-slate-400">Taken from your profile.</p>
                                                ) : member.university && !isUniversityWithinScope(member.university, universityAllowlist) ? (
                                                    <p className="text-[10px] text-red-600 font-medium">Not allowed on this opportunity.</p>
                                                ) : null}
                                            </div>

                                            <div className="space-y-1.5 md:col-span-2 lg:col-span-9">
                                                <Label className="text-xs font-medium text-slate-600">Email Verification *</Label>
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                                                    <Input
                                                        value={member.email}
                                                        onChange={(e) => updateMember(index, 'email', e.target.value)}
                                                        placeholder="email@example.com"
                                                        type="email"
                                                        className={`h-10 min-h-10 flex-1 min-w-0 bg-white ${member.verificationStatus === 'verified' ? 'border-green-500 ring-green-500/20' : ''}`}
                                                        readOnly={member.verificationStatus === 'verified'}
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="default"
                                                        className={`h-10 min-h-10 shrink-0 px-4 sm:min-w-[100px] ${member.verificationStatus === 'verified' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900'}`}
                                                        onClick={() => handleVerifyEmail(index)}
                                                        disabled={member.verificationStatus === 'verified' || member.verificationStatus === 'sending' || !member.email || isDuplicateTeamMemberEmail(member.email, teamMembers, index)}
                                                    >
                                                        {member.verificationStatus === 'sending' ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : member.verificationStatus === 'verified' ? (
                                                            "Verified"
                                                        ) : member.verificationStatus === 'otp_sent' ? (
                                                            "OTP sent"
                                                        ) : (
                                                            "Send OTP"
                                                        )}
                                                    </Button>
                                                </div>
                                                <div className="min-h-[1.125rem] space-y-0.5">
                                                    {isDuplicateTeamMemberEmail(member.email, teamMembers, index) && (
                                                        <p className="text-[10px] text-red-600 font-medium">{DUPLICATE_TEAM_EMAIL_MESSAGE}</p>
                                                    )}
                                                    {member.verificationStatus === 'verified' && (
                                                        <p className="text-[10px] text-green-600 font-medium">Email verified successfully.</p>
                                                    )}
                                                    {member.verificationStatus === 'unverified' && member.email && !isDuplicateTeamMemberEmail(member.email, teamMembers, index) && (
                                                        <p className="text-[10px] text-slate-400">Click Send OTP — they must confirm the code before they are added.</p>
                                                    )}
                                                    {member.verificationStatus === 'otp_sent' && (
                                                        <p className="text-[10px] text-blue-600 font-medium">OTP code has been sent to this email.</p>
                                                    )}
                                                </div>
                                            </div>

                                            {member.showOtpInput && (
                                                <div className="md:col-span-2 lg:col-span-12 mt-0 p-4 bg-blue-50/50 rounded-xl border border-blue-100 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                                                        <div className="flex-1 space-y-1.5 w-full">
                                                            <div className="flex justify-between items-center">
                                                                <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Verification Code</Label>
                                                                <button
                                                                    onClick={() => handleVerifyEmail(index)}
                                                                    disabled={member.verificationStatus === 'sending'}
                                                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
                                                                >
                                                                    Resend OTP
                                                                </button>
                                                            </div>
                                                            <div className="relative">
                                                                <Input
                                                                    value={member.otp || ""}
                                                                    onChange={(e) => updateMember(index, 'otp', e.target.value)}
                                                                    placeholder="000000"
                                                                    className="h-10 bg-white border-blue-200 focus:border-blue-500 text-center font-mono text-lg tracking-[0.5em] pr-2"
                                                                    maxLength={6}
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            className="h-10 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-sm font-bold shadow-lg shadow-blue-200"
                                                            onClick={() => handleConfirmOtp(index)}
                                                            disabled={member.verificationStatus === 'sending'}
                                                        >
                                                            {member.verificationStatus === 'sending' ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                "Confirm OTP"
                                                            )}
                                                        </Button>
                                                    </div>
                                                    <p className="text-[10px] text-blue-500 mt-2 flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                                                        Enter the 6-digit code sent to {member.email}
                                                    </p>
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                            </>
                        ) : (
                            "Submit Application"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
