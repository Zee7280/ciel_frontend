"use client";

import { useState } from "react";
import { Plus, Calendar, Clock, MapPin, Tag, FileText, Loader2, CheckCircle2, Upload, X, Lock, Users, Info } from "lucide-react";
import { Button } from "../../report/components/ui/button";
import { Input } from "../../report/components/ui/input";
import { Label } from "../../report/components/ui/label";
import { authenticatedFetch } from "@/utils/api";
import clsx from "clsx";
import { useReportForm } from "../../report/context/ReportContext";
import React, { useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/ui/LocationPicker"), {
    ssr: false,
    loading: () => <div className="h-[200px] w-full bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Interactive Map...</div>
});

export default function AttendanceForm({
    verifiedUsers,
    onSuccess,
    selectedParticipantId,
    onParticipantChange,
    isLocked = false,
    isParticipationUnlocked,
    setParticipationUnlocked
}: {
    verifiedUsers: { id: string, name: string, status?: string }[],
    onSuccess: () => void,
    selectedParticipantId?: string | null,
    onParticipantChange?: (id: string) => void,
    isLocked?: boolean,
    isParticipationUnlocked?: boolean,
    setParticipationUnlocked?: (unlocked: boolean) => void
}) {
    const { data: reportData, updateSection } = useReportForm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        participantId: selectedParticipantId || (verifiedUsers.length > 0 ? verifiedUsers[0].id : ''),
        dateOfEngagement: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '12:00',
        organizationName: '',
        activityType: 'Field Visit',
        otherActivity: '',
        description: '',
        locationPin: '', // To store lat,lng
    });

    // Keep formData.participantId in sync with selectedParticipantId prop
    React.useEffect(() => {
        if (selectedParticipantId && selectedParticipantId !== formData.participantId) {
            setFormData(prev => ({ ...prev, participantId: selectedParticipantId }));
        }
    }, [selectedParticipantId]);

    const wordCount = formData.description.trim() === "" ? 0 : formData.description.trim().split(/\s+/).length;

    const selectedUser = verifiedUsers.find(u => u.id === formData.participantId);
    const isUserApproved = selectedUser?.status === 'approved' ||
        selectedUser?.status === 'verified' ||
        selectedUser?.status === 'active' ||
        selectedUser?.status === 'accepted' ||
        selectedUser?.status === 'pending' ||
        selectedUser?.status === 'pending_approval' ||
        selectedUser?.status === 'pending_faculty_approval' ||
        selectedUser?.status === 'pending_ciel_approval';
    // const effectiveLocked = !isUserApproved || (isLocked && !isParticipationUnlocked);
    const effectiveLocked = false; // Temporarily disabled by user request

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Strict Time Validation
        const [h1, m1] = formData.startTime.split(':').map(Number);
        const [h2, m2] = formData.endTime.split(':').map(Number);
        const diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);

        if (diffMinutes <= 0) {
            alert("End time must be after start time");
            return;
        }

        if (diffMinutes > 12 * 60) {
            alert("Daily attendance cannot exceed 12 hours");
            return;
        }

        const numericHours = diffMinutes / 60;
        const activeParticipantId = formData.participantId;
        const newEntry = {
            id: Math.random().toString(36).substring(2, 11),
            date: formData.dateOfEngagement,
            start_time: formData.startTime,
            end_time: formData.endTime,
            location: formData.organizationName,
            activity_type: formData.activityType === 'Other' ? formData.otherActivity : formData.activityType,
            description: formData.description,
            evidence_file: evidenceFile || undefined,
            hours: numericHours,
            participantId: activeParticipantId // Tag it for frontend filtering
        };
        setIsSubmitting(true);
        try {
            // Update Context first for immediate feedback
            const currentLogs = reportData.section1.attendance_logs || [];
            updateSection('section1', {
                attendance_logs: [...currentLogs, newEntry]
            });

            // Sync with backend if participantId exists
            if (activeParticipantId) {
                // Determine if we need to send multipart/form-data or application/json
                let fetchOptions: RequestInit = {};

                // Strip prefix for API calls (e.g. member:0:ID -> ID)
                const realId = activeParticipantId.includes(':') ? activeParticipantId.split(':').pop() : activeParticipantId;

                if (evidenceFile) {
                    const fd = new FormData();
                    fd.append('participantId', realId || '');
                    fd.append('dateOfEngagement', formData.dateOfEngagement);
                    fd.append('startTime', formData.startTime);
                    fd.append('endTime', formData.endTime);
                    fd.append('organizationName', formData.organizationName);
                    fd.append('activityType', formData.activityType === 'Other' ? formData.otherActivity : formData.activityType);
                    fd.append('description', formData.description);
                    fd.append('sessionHours', numericHours.toString());
                    fd.append('evidenceUploaded', 'true');
                    fd.append('evidence', evidenceFile); // Actual file

                    fetchOptions = {
                        method: 'POST',
                        body: fd,
                    };
                } else {
                    fetchOptions = {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...formData,
                            participantId: realId,
                            activityType: formData.activityType === 'Other' ? formData.otherActivity : formData.activityType,
                            evidenceUploaded: false,
                            sessionHours: numericHours
                        })
                    };
                }

                const res = await authenticatedFetch(`/api/v1/engagement/${realId}/attendance`, fetchOptions);

                if (!res || !res.ok) {
                    console.warn("Backend sync failed, but context updated");
                }
            }

            onSuccess();
            // Reset form
            setFormData({
                ...formData,
                description: '',
                otherActivity: ''
            });
            setEvidenceFile(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }

    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-xl shadow-slate-200/50 space-y-8 relative overflow-hidden group/form transition-all hover:border-report-primary-border/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-report-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover/form:bg-report-primary/10 transition-colors" />

            <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-report-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-report-primary-shadow ring-4 ring-report-primary-soft">
                        <Plus className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Add Attendance Entry</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Session Verification Protocol</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Student Selection (New) */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Student</Label>
                    <div className="relative">
                        <Users className="absolute left-4 top-4 w-5 h-5 text-slate-400 z-10" />
                        <select
                            value={formData.participantId}
                            onChange={(e) => {
                                setFormData({ ...formData, participantId: e.target.value });
                                if (onParticipantChange) onParticipantChange(e.target.value);
                            }}
                            className="w-full pl-12 h-14 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-base appearance-none focus:ring-4 focus:ring-report-primary/10 focus:border-report-primary/20 focus:bg-white transition-all cursor-pointer hover:bg-slate-100"
                            required
                        >
                            {verifiedUsers.length === 0 && <option value="">No verified students found</option>}
                            {verifiedUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-5 pointer-events-none">
                            <Plus className="w-4 h-4 text-slate-400 rotate-45" />
                        </div>
                    </div>
                </div>

                {/* Date Row */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Date of Engagement</Label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                        <Input
                            type="date"
                            value={formData.dateOfEngagement}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setFormData({ ...formData, dateOfEngagement: e.target.value })}
                            className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold text-base shadow-sm focus:ring-2 focus:ring-report-primary/20"
                            required
                        />
                    </div>
                </div>

                {/* Times Row */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Start Time */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Start Time</Label>
                        <div className="relative">
                            <Clock className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                            <Input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold text-base shadow-sm focus:ring-2 focus:ring-report-primary/20"
                                required
                            />
                        </div>
                    </div>

                    {/* End Time */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">End Time</Label>
                        <div className="relative">
                            <Clock className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                            <Input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold text-base shadow-sm focus:ring-2 focus:ring-report-primary/20"
                                required
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Organization / Location */}
                <div className="space-y-4 md:col-span-2">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Organization / Location Name</Label>
                        <div className="relative group/location">
                            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 z-10" />
                            <Input
                                placeholder="Enter organization or location name..."
                                value={formData.organizationName}
                                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                                className="pl-10 h-14 bg-slate-50 border-none rounded-2xl font-bold text-base shadow-sm focus:ring-2 focus:ring-report-primary/20 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Pin Exact Location (Optional)</Label>
                        <div className="rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-inner bg-slate-50 relative group/map">
                            <LocationPicker
                                onLocationSelect={(loc) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        organizationName: loc.address || prev.organizationName,
                                        locationPin: `${loc.lat},${loc.lng}`
                                    }));
                                }}
                            />
                            <div className="absolute bottom-4 right-4 z-[1000] pointer-events-none opacity-0 group-hover/map:opacity-100 transition-opacity">
                                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                    Interactive Leaflet Map
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 px-2">
                            <Info className="w-3 h-3" />
                            Click the map to precisely mark your engagement site
                        </p>
                    </div>
                </div>

                {/* Activity Type */}
                <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Activity Type</Label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 z-10" />
                        <select
                            value={formData.activityType}
                            onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                            className="w-full pl-10 h-14 bg-slate-50 border-none rounded-2xl font-bold text-base appearance-none focus:ring-2 focus:ring-report-primary/20 transition-all cursor-pointer"
                        >
                            {['Training / Workshop', 'Awareness Session', 'Research / Survey', 'Mentoring / Coaching', 'Field Visit', 'Resource Distribution', 'Technical Support', 'Administrative', 'Other'].map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    {formData.activityType === 'Other' && (
                        <Input
                            placeholder="Specify other activity"
                            value={formData.otherActivity}
                            onChange={(e) => setFormData({ ...formData, otherActivity: e.target.value })}
                            className="mt-2 h-14 bg-slate-50 border-none rounded-2xl font-bold text-base shadow-sm focus:ring-2 focus:ring-report-primary/20"
                            required
                        />
                    )}
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Brief Description</Label>
                    <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded", wordCount > 40 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500')}>
                        {wordCount} / 40 words
                    </span>
                </div>
                <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <textarea
                        placeholder="What did you accomplish during this session?"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full pl-10 p-4 h-32 bg-slate-50 border-none rounded-2xl font-bold text-base focus:ring-2 focus:ring-report-primary/20 resize-none shadow-sm transition-all"
                        required
                    />
                </div>
            </div>

            {/* Evidence Upload */}
            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Supporting Evidence (Optional)</Label>
                <div className="flex items-center gap-4">
                    {evidenceFile ? (
                        <div className="flex-1 flex items-center justify-between p-3 bg-report-primary-soft rounded-xl border border-report-primary-border">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-report-primary" />
                                <span className="text-sm font-bold text-report-primary">{evidenceFile.name} (linked)</span>
                            </div>
                            <button onClick={() => setEvidenceFile(null)} className="text-report-primary hover:text-report-primary-border">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 relative">
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center gap-1 text-slate-400 group-hover:border-blue-300 transition-colors">
                                <Upload className="w-6 h-6" />
                                <span className="text-xs font-bold">JPG, PNG, or PDF</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <Button
                    type="submit"
                    disabled={isSubmitting || wordCount > 40 || effectiveLocked}
                    className={clsx(
                        "w-full h-14 rounded-2xl font-black text-sm transition-all shadow-xl",
                        effectiveLocked
                            ? "bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed"
                            : "bg-report-primary hover:bg-report-primary-border text-white shadow-report-primary-shadow hover:translate-y-[-2px]"
                    )}
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : effectiveLocked ? (
                        <div className="flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4" />
                            {!isUserApproved && selectedUser ? "APPROVAL PENDING" : "RECORD LOCKED"}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            SAVE ATTENDANCE ENTRY
                        </div>
                    )}
                </Button>

                {effectiveLocked && setParticipationUnlocked && (
                    <div className="text-center">
                        {!isUserApproved && selectedUser ? (
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">
                                Attendance logging for this student is disabled until faculty approval.
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setParticipationUnlocked(true)}
                                className="text-[10px] font-black uppercase tracking-widest text-report-primary hover:text-report-primary-border underline"
                            >
                                Unlock for editing
                            </button>
                        )}
                    </div>
                )}
            </div>
        </form>
    );
}
