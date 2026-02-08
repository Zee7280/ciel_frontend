"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../report/components/ui/dialog";
import { Button } from "../../report/components/ui/button";
import { RadioGroup, RadioGroupItem } from "../../report/components/ui/radio-group";
import { Label } from "../../report/components/ui/label";
import { Input } from "../../report/components/ui/input";
import { Select } from "../../report/components/ui/select";
import { Plus, Trash2, Loader2, Users, User } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";

interface ApplicationDialogProps {
    opportunityId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (id: string) => void;
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
    verificationStatus: 'unverified' | 'sending' | 'verified';
}

export default function ApplicationDialog({ opportunityId, open, onOpenChange, onSuccess, opportunityTitle }: ApplicationDialogProps) {
    const [participationType, setParticipationType] = useState<"individual" | "team">("individual");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
        { name: "", cnic: "", mobile: "", email: "", university: "", program: "", role: "Member", verificationStatus: 'unverified' }
    ]);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open) {
            // Reset to default when opened
            setParticipationType("individual");
            setTeamMembers([{ name: "", cnic: "", mobile: "", email: "", university: "", program: "", role: "Member", verificationStatus: 'unverified' }]);
        }
    }, [open, opportunityId]);

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

        const newMembers = [...teamMembers];
        newMembers[index].verificationStatus = 'sending';
        setTeamMembers(newMembers);

        // Simulate API call
        setTimeout(() => {
            const updatedMembers = [...newMembers];
            updatedMembers[index].verificationStatus = 'verified';
            setTeamMembers(updatedMembers);
            toast.success(`Verification email sent to ${member.email}`);
        }, 1500);
    };

    const handleSubmit = async () => {
        if (!opportunityId) return;

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
                team_members: participationType === "team" ? teamMembers : undefined
            };

            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/opportunities/${opportunityId}/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    toast.success("Application submitted successfully!");
                    onSuccess(opportunityId);
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
                                                <Label className="text-xs font-medium text-slate-600">University</Label>
                                                <Input
                                                    value={member.university}
                                                    onChange={(e) => updateMember(index, 'university', e.target.value)}
                                                    placeholder="Enter University/School Name"
                                                    className="h-9 bg-white"
                                                />
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
                                                {member.verificationStatus === 'unverified' && member.email && <p className="text-[10px] text-slate-400">Click Verify to send confirmation code.</p>}
                                            </div>

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
