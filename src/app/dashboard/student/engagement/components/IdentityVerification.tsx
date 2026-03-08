"use client";

import { useState } from "react";
import { Shield, User, GraduationCap, Mail, Phone, Hash, School, Book, Calendar, CheckCircle2, Loader2, Smartphone, MessageSquare, ChevronRight, AlertCircle } from "lucide-react";
import { Input } from "../../report/components/ui/input";
import { Label } from "../../report/components/ui/label";
import { Button } from "../../report/components/ui/button";
import { authenticatedFetch } from "@/utils/api";
import { pakistaniUniversities } from "@/utils/universityData";
import clsx from "clsx";
import { useRef, useEffect } from "react";

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
}

export default function IdentityVerification({
    projectId,
    onSuccess,
    initialData = {},
    participationMode = 'individual',
    isTeamLead = false
}: {
    projectId: string;
    onSuccess: (p: Participant) => void;
    initialData?: Partial<any>;
    participationMode?: 'individual' | 'team';
    isTeamLead?: boolean;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'academic'>('personal');
    const [isVerifyingOtp, setIsVerifyingOtp] = useState({ email: false });
    const [otpSent, setOtpSent] = useState({ email: false });
    const [otpVerified, setOtpVerified] = useState({ email: false });
    const [showUniDropdown, setShowUniDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    const [formData, setFormData] = useState({
        fullName: initialData.fullName || '',
        cnic: initialData.cnic || '',
        mobile: initialData.mobile || '',
        email: initialData.email || '',
        universityId: initialData.universityId || '',
        universityName: initialData.universityName || '',
        academicProgram: initialData.academicProgram || '',
        yearOfStudy: initialData.yearOfStudy || '3rd Year',
        department: initialData.department || '',
        academicIntegrationType: initialData.academicIntegrationType || 'Course-Linked',
    });

    const [otpInputs, setOtpInputs] = useState({ email: '' });

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
        setIsSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/engagement/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, projectId, participationMode, isTeamLead }),
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

    const isPersonalValid = formData.fullName && formData.cnic.length === 13 && otpVerified.email;
    const isAcademicValid = formData.universityId && formData.universityName && formData.academicProgram;

    return (
        <div className="space-y-8">
            {/* Tab Navigation */}
            <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full max-w-sm mx-auto">
                {(['personal', 'academic'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx(
                            "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                            activeTab === tab
                                ? "bg-white text-report-primary shadow-sm"
                                : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        {tab === 'personal' ? 'Personal Info' : 'Academic Info'}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-8 min-h-[400px]">
                {activeTab === 'personal' ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Full Name (per CNIC)</Label>
                                <Input
                                    placeholder="Enter full name"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="h-12 bg-slate-50 border-none rounded-2xl font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">CNIC Number</Label>
                                <Input
                                    placeholder="13 digits"
                                    maxLength={13}
                                    value={formData.cnic}
                                    onChange={(e) => setFormData({ ...formData, cnic: e.target.value.replace(/\D/g, '') })}
                                    className="h-12 bg-slate-50 border-none rounded-2xl font-bold tracking-[0.2em]"
                                />
                            </div>
                        </div>

                        {/* OTP Flow for Mobile/Email */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Mobile */}
                            <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Smartphone className="w-3.5 h-3.5" /> Mobile Contact
                                </Label>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Input
                                            placeholder="03XXXXXXXXX"
                                            value={formData.mobile}
                                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                            className="h-11 bg-white border-slate-100 rounded-xl font-bold"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">Used for critical institutional notifications.</p>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5" /> Email Verification
                                </Label>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Input
                                            type="email"
                                            placeholder="student@uni.edu"
                                            value={formData.email}
                                            disabled={otpSent.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="h-11 bg-white border-slate-100 rounded-xl font-bold"
                                        />
                                        {!otpSent.email && (
                                            <button
                                                onClick={() => sendOtp('email')}
                                                disabled={isVerifyingOtp.email || !formData.email}
                                                className="absolute right-2 top-1.5 h-8 px-3 bg-report-primary text-white rounded-lg text-[9px] font-black uppercase tracking-wider disabled:bg-slate-200 transition-all hover:bg-report-primary-border"
                                            >
                                                {isVerifyingOtp.email ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Send OTP'}
                                            </button>
                                        )}
                                        {otpSent.email && !otpVerified.email && (
                                            <button
                                                onClick={handleChangeEmail}
                                                className="absolute right-2 top-1.5 h-8 px-3 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all"
                                            >
                                                Change
                                            </button>
                                        )}
                                    </div>

                                    {otpSent.email && !otpVerified.email && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="6-digit"
                                                    maxLength={6}
                                                    value={otpInputs.email}
                                                    onChange={(e) => setOtpInputs({ ...otpInputs, email: e.target.value })}
                                                    className="h-11 bg-white border-slate-200 rounded-xl text-center font-bold tracking-[0.4em]"
                                                />
                                                <Button
                                                    onClick={() => verifyOtp('email')}
                                                    disabled={isVerifyingOtp.email || otpInputs.email.length !== 6}
                                                    className="bg-slate-900 text-white rounded-xl h-11 px-6 font-bold"
                                                >
                                                    {isVerifyingOtp.email ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                                                </Button>
                                            </div>
                                            <div className="flex justify-between items-center px-1">
                                                <button
                                                    onClick={() => sendOtp('email')}
                                                    disabled={isVerifyingOtp.email}
                                                    className="text-[10px] font-black text-report-primary uppercase tracking-widest hover:underline disabled:text-slate-400"
                                                >
                                                    {isVerifyingOtp.email ? 'Sending...' : 'Resend OTP'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {otpVerified.email && (
                                        <div className="flex items-center gap-2 text-report-primary font-black text-[10px] uppercase tracking-widest bg-report-primary-soft p-2 rounded-xl">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Academy Mail Linked
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button
                            disabled={!isPersonalValid}
                            onClick={() => setActiveTab('academic')}
                            className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-slate-200"
                        >
                            Confirm Info & Proceed to Academic <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="space-y-6">
                            <div className="space-y-2 relative" ref={dropdownRef}>
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">University / Institution</Label>
                                <div className="relative">
                                    <School className="absolute left-4 top-4 w-4 h-4 text-slate-400 z-10" />
                                    <Input
                                        placeholder="Search and select your university..."
                                        value={formData.universityName}
                                        onFocus={() => setShowUniDropdown(true)}
                                        onChange={(e) => {
                                            setFormData({ ...formData, universityName: e.target.value });
                                            setShowUniDropdown(true);
                                        }}
                                        className="h-12 pl-11 bg-slate-50 border-none rounded-2xl font-bold shadow-sm"
                                    />
                                    {showUniDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] max-h-[300px] overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {pakistaniUniversities
                                                .filter(u => u.toLowerCase().includes(formData.universityName.toLowerCase()))
                                                .map((uni, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            setFormData({ ...formData, universityName: uni });
                                                            setShowUniDropdown(false);
                                                        }}
                                                        className="w-full text-left p-3 hover:bg-report-primary-soft rounded-xl transition-colors flex items-center gap-3 text-sm font-bold text-slate-700"
                                                    >
                                                        <School className="w-3.5 h-3.5 text-report-primary" />
                                                        {uni}
                                                    </button>
                                                ))}
                                            {pakistaniUniversities.filter(u => u.toLowerCase().includes(formData.universityName.toLowerCase())).length === 0 && (
                                                <div className="p-4 text-center text-xs text-slate-400 font-bold">
                                                    No university found within Pakistan list.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Student ID / CNIC Link</Label>
                                    <Input
                                        placeholder="FA21-BCS-056"
                                        value={formData.universityId}
                                        onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                                        className="h-12 bg-slate-50 border-none rounded-2xl font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Degree Program</Label>
                                    <Input
                                        placeholder="BS Computer Science"
                                        value={formData.academicProgram}
                                        onChange={(e) => setFormData({ ...formData, academicProgram: e.target.value })}
                                        className="h-12 bg-slate-50 border-none rounded-2xl font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Year of Study</Label>
                                    <select
                                        value={formData.yearOfStudy}
                                        onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
                                        className="w-full h-12 bg-slate-50 border-none rounded-2xl font-bold text-sm px-4 focus:ring-2 focus:ring-report-primary outline-none appearance-none"
                                    >
                                        {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Postgraduate'].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Academic Integration Type</Label>
                                    <select
                                        value={formData.academicIntegrationType}
                                        onChange={(e) => setFormData({ ...formData, academicIntegrationType: e.target.value })}
                                        className="w-full h-12 bg-slate-50 border-none rounded-2xl font-bold text-sm px-4 focus:ring-2 focus:ring-report-primary outline-none appearance-none"
                                    >
                                        {['Voluntary', 'Course-Linked', 'Credit-Bearing', 'Capstone / Thesis', 'Research-Integrated'].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                onClick={() => setActiveTab('personal')}
                                variant="outline"
                                className="h-14 border-slate-200 rounded-2xl font-bold px-8"
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !isAcademicValid}
                                className="flex-1 h-14 bg-report-primary hover:bg-report-primary-border text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-report-primary-shadow"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify Identity & Link Record"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-report-primary-soft rounded-3xl border border-report-primary-border flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-report-primary mt-1 shrink-0" />
                <p className="text-xs text-report-primary font-medium leading-relaxed">
                    Identity verification is a <strong>hard gateway</strong>. Your academic record will be locked and traceable for institutional HEC compliance once verified.
                </p>
            </div>
        </div>
    );
}
