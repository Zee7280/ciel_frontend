"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../report/components/ui/dialog";
import { Button } from "../../report/components/ui/button";
import { RadioGroup, RadioGroupItem } from "../../report/components/ui/radio-group";
import { Label } from "../../report/components/ui/label";
import { Input } from "../../report/components/ui/input";
import { Plus, Trash2, Loader2, Users, User } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { pakistaniUniversities } from "@/utils/universityData";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import {
    DEFAULT_PHONE_COUNTRY_KEY,
    composeInternationalPhone,
    parsePhoneForDisplay,
} from "@/utils/countryCallingCodes";

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
}

interface TeamMember {
    name: string;
    cnic: string;
    mobile: string;
    email: string;
    university: string;
    program: string;
    role: string;
    verificationStatus: 'unverified' | 'sending' | 'otp_sent' | 'verified';
    otp?: string;
    showOtpInput?: boolean;
}

// Generate a short unique team ID (e.g. TM-2024-XXXX)
function generateTeamId() {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TM-${year}-${rand}`;
}

export default function ApplicationDialog({ opportunityId, open, onOpenChange, onSuccess, opportunityTitle }: ApplicationDialogProps) {
    const [participationType, setParticipationType] = useState<"individual" | "team">("individual");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [primaryFacultyEmail, setPrimaryFacultyEmail] = useState("");
    const [secondaryFacultyEmail, setSecondaryFacultyEmail] = useState("");
    const [teamId, setTeamId] = useState("");
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
        { name: "", cnic: "", mobile: "", email: "", university: "", program: "", role: "Member", verificationStatus: 'unverified' }
    ]);
    const [applicantPhoneCountryKey, setApplicantPhoneCountryKey] = useState(DEFAULT_PHONE_COUNTRY_KEY);
    const [applicantPhoneNational, setApplicantPhoneNational] = useState("");

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open) {
            setParticipationType("individual");
            setPrimaryFacultyEmail("");
            setSecondaryFacultyEmail("");
            setTeamId("");

            const storedUserStr = localStorage.getItem("user") || localStorage.getItem("ciel_user");
            let initialMember: TeamMember = { name: "", cnic: "", mobile: "", email: "", university: "", program: "", role: "Member", verificationStatus: 'unverified' };

            if (storedUserStr) {
                try {
                    const u = JSON.parse(storedUserStr);
                    initialMember = {
                        name: u.name || "",
                        cnic: (u.cnic || u.national_id || "").replace(/\D/g, "").slice(0, 13),
                        mobile: u.phone || u.contact || "",
                        email: u.email || "",
                        university: u.university || u.institution || "",
                        program: u.program || "",
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
    }, [open, opportunityId]);

    // Auto-generate team ID when switching to team mode
    useEffect(() => {
        if (participationType === 'team' && !teamId) {
            setTeamId(generateTeamId());
        }
    }, [participationType]);

    const handleAddMember = () => {
        setTeamMembers([...teamMembers, { name: "", cnic: "", mobile: "", email: "", university: "", program: "", role: "Member", verificationStatus: 'unverified' }]);
    };

    const handleRemoveMember = (index: number) => {
        if (teamMembers.length > 1) {
            const newMembers = [...teamMembers];
            newMembers.splice(index, 1);
            setTeamMembers(newMembers);
        } else {
            toast.error("A team must have at least one member (other than you).");
        }
    };

    const updateMember = (index: number, field: keyof TeamMember, value: string) => {
        // Strict Numeric Support for CNIC and Mobile
        if (field === 'cnic' || field === 'mobile') {
            if (!/^\d*$/.test(value)) return; // Only allow numbers
            if (field === 'cnic' && value.length > 13) return; // Max 13
            if (field === 'mobile' && value.length > 11) return; // Max 11
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

        // 1. Immediately show loader and disable button
        setTeamMembers(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], verificationStatus: 'sending' };
            return updated;
        });

        try {
            const res = await authenticatedFetch(`/api/v1/student/verify-team-member/send`, {
                method: 'POST',
                body: JSON.stringify({ email: member.email })
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
                toast.error(errorData.message || "Failed to send OTP");
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
        if (participationType === "individual") {
            const n = applicantPhoneNational.replace(/\D/g, "");
            if (!applicantPhoneE164 || n.length < 8) {
                toast.error("Please enter a valid mobile number with country code.");
                return;
            }
        }

        // Validation for team
        if (participationType === "team") {
            for (let i = 0; i < teamMembers.length; i++) {
                const member = teamMembers[i];
                if (!member.name || !member.cnic || !member.mobile) {
                    toast.error(`Please fill in all required fields for Member ${i + 1}.`);
                    return;
                }
                if (member.cnic.length !== 13) {
                    toast.error(`CNIC for Member ${i + 1} must be exactly 13 digits.`);
                    return;
                }
                if (member.mobile.length !== 11) {
                    toast.error(`Mobile Number for Member ${i + 1} must be exactly 11 digits.`);
                    return;
                }
                if (member.verificationStatus !== 'verified') {
                    toast.error(`Please verify the email for Member ${i + 1} before submitting.`);
                    return;
                }
            }
        }

        setIsSubmitting(true);
        try {
            const payload = {
                participation_type: participationType,
                team_id: participationType === 'team' ? teamId : undefined,
                primary_faculty_email: primaryFacultyEmail,
                secondary_faculty_email: secondaryFacultyEmail || undefined,
                team_members:
                    participationType === "team"
                        ? teamMembers
                        : teamMembers.length > 0
                          ? teamMembers.map((m, i) => {
                                const role = i === 0 && (!m.role || m.role === "Member") ? "Lead" : m.role;
                                // CNIC is collected at engagement identity verification for individuals
                                // (avoids asking twice when it is not returned on the project record).
                                const { cnic: _cnic, ...rest } = m;
                                return { ...rest, role };
                            })
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
                const data = await res.json();
                if (data.success) {
                    const d = (data.data ?? {}) as Record<string, unknown>;
                    const applicationId =
                        typeof d.application_id === "string"
                            ? d.application_id
                            : typeof d.applicationId === "string"
                              ? d.applicationId
                              : undefined;
                    const applicationStatus =
                        typeof d.application_status === "string"
                            ? d.application_status
                            : typeof d.applicationStatus === "string"
                              ? d.applicationStatus
                              : undefined;
                    toast.success(typeof data.message === "string" ? data.message : "Application submitted successfully!");
                    onSuccess(opportunityId!, {
                        applicationId,
                        applicationStatus: applicationStatus ?? "pending_approval",
                    });
                    onOpenChange(false);
                } else {
                    toast.error(data.message || "Failed to submit application");
                }
            } else {
                toast.error("Failed to connect to server");
            }
        } catch (error) {
            console.error("Error applying", error);
            toast.error("An error occurred while applying");
        } finally {
            setIsSubmitting(false);
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
                                <span className="text-sm text-slate-500 text-center mt-1">I will participate on my own</span>
                            </label>

                            <label className={`flex flex-col items-center justify-between rounded-xl border-2 p-6 hover:bg-slate-50 cursor-pointer transition-all ${participationType === 'team' ? 'border-primary bg-blue-50/50' : 'border-slate-200'}`}>
                                <RadioGroupItem value="team" id="team" className="sr-only" />
                                <Users className={`w-10 h-10 mb-4 ${participationType === 'team' ? 'text-primary' : 'text-slate-400'}`} />
                                <span className="font-bold text-lg">Team</span>
                                <span className="text-sm text-slate-500 text-center mt-1">I am leading a group of students</span>
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
                                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">Required · Analytics Owner</span>
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
                                This faculty member will receive approval requests and own the analytics for this project.
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
                                    {participationType === "individual" ? (
                                        <span className="text-red-500 ml-1">*</span>
                                    ) : null}
                                </Label>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                                    {participationType === "individual" ? "Required" : "Optional"}
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
                                                teamMembers[0].mobile ||
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
                                    <p className="text-sm text-slate-500">Provide details for all students in your team.</p>
                                </div>
                                <Button size="sm" onClick={handleAddMember} className="bg-slate-900 text-white hover:bg-slate-800">
                                    <Plus className="w-4 h-4 mr-2" /> Add Member
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {teamMembers.map((member, index) => (
                                    <div key={index} className="p-6 border rounded-xl bg-slate-50/50 relative group transition-all hover:bg-slate-100/50">
                                        <div className="absolute right-3 top-3">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveMember(index)}
                                                className="h-8 w-8 text-slate-400 hover:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="mb-4 flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
                                                {index + 1}
                                            </span>
                                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Member Details</h4>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-600">Full Name *</Label>
                                                <Input
                                                    value={member.name}
                                                    onChange={(e) => updateMember(index, 'name', e.target.value)}
                                                    placeholder="As appear on CNIC"
                                                    className="h-9 bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-600">CNIC (13 digits) *</Label>
                                                <Input
                                                    value={member.cnic}
                                                    onChange={(e) => updateMember(index, 'cnic', e.target.value)}
                                                    placeholder="35202..."
                                                    className="h-9 bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-600">Mobile Number *</Label>
                                                <Input
                                                    value={member.mobile}
                                                    onChange={(e) => updateMember(index, 'mobile', e.target.value)}
                                                    placeholder="0300..."
                                                    className="h-9 bg-white"
                                                />
                                            </div>

                                            {/* University - moved to 2nd row or shared */}
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-600">University *</Label>
                                                <select
                                                    className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={member.university}
                                                    onChange={(e) => updateMember(index, 'university', e.target.value)}
                                                >
                                                    <option value="">Select University</option>
                                                    {pakistaniUniversities.map(uni => (
                                                        <option key={uni} value={uni}>{uni}</option>
                                                    ))}
                                                    <option value="Other">Other / Not Listed</option>
                                                </select>
                                            </div>

                                            {/* Email Verification Row - spans full or separate */}
                                            <div className="lg:col-span-2 space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-600">Email Verification *</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={member.email}
                                                        onChange={(e) => updateMember(index, 'email', e.target.value)}
                                                        placeholder="email@example.com"
                                                        type="email"
                                                        className={`h-9 bg-white ${member.verificationStatus === 'verified' ? 'border-green-500 ring-green-500/20' : ''}`}
                                                        readOnly={member.verificationStatus === 'verified'}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        className={`min-w-[100px] ${member.verificationStatus === 'verified' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900'}`}
                                                        onClick={() => handleVerifyEmail(index)}
                                                        disabled={member.verificationStatus === 'verified' || member.verificationStatus === 'sending' || !member.email}
                                                        type="button"
                                                    >
                                                        {member.verificationStatus === 'sending' ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : member.verificationStatus === 'verified' ? (
                                                            "Verified"
                                                        ) : (
                                                            "Verify"
                                                        )}
                                                    </Button>
                                                </div>
                                                {member.verificationStatus === 'verified' && <p className="text-[10px] text-green-600 font-medium">Email verified successfully.</p>}
                                                {member.verificationStatus === 'unverified' && member.email && <p className="text-[10px] text-slate-400">Click Verify to send OTP code.</p>}
                                                {member.verificationStatus === 'otp_sent' && <p className="text-[10px] text-blue-600 font-medium">OTP code has been sent to this email.</p>}
                                            </div>

                                            {member.showOtpInput && (
                                                <div className="lg:col-span-2 mt-2 p-4 bg-blue-50/50 rounded-xl border border-blue-100 animate-in slide-in-from-top-2 duration-300">
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
