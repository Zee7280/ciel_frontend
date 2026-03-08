"use client";

import { useState } from "react";
import { Plus, Calendar, Clock, MapPin, Tag, FileText, Loader2, CheckCircle2, Upload, X, Lock, Users } from "lucide-react";
import { Button } from "../../report/components/ui/button";
import { Input } from "../../report/components/ui/input";
import { Label } from "../../report/components/ui/label";
import { authenticatedFetch } from "@/utils/api";
import clsx from "clsx";
import { useReportForm } from "../../report/context/ReportContext";

export default function AttendanceForm({
    verifiedUsers,
    onSuccess,
    isLocked = false,
    isParticipationUnlocked,
    setParticipationUnlocked
}: {
    verifiedUsers: { id: string, name: string }[],
    onSuccess: () => void,
    isLocked?: boolean,
    isParticipationUnlocked?: boolean,
    setParticipationUnlocked?: (unlocked: boolean) => void
}) {
    const { data: reportData, updateSection } = useReportForm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        participantId: verifiedUsers.length > 0 ? verifiedUsers[0].id : '',
        dateOfEngagement: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '12:00',
        organizationName: '',
        activityType: 'Field Visit',
        otherActivity: '',
        description: '',
    });

    const wordCount = formData.description.trim() === "" ? 0 : formData.description.trim().split(/\s+/).length;

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
        const newEntry = {
            id: Math.random().toString(36).substring(2, 11),
            date: formData.dateOfEngagement,
            start_time: formData.startTime,
            end_time: formData.endTime,
            location: formData.organizationName,
            activity_type: formData.activityType === 'Other' ? formData.otherActivity : formData.activityType,
            description: formData.description,
            evidence_file: evidenceFile || undefined,
            hours: numericHours
        };

        setIsSubmitting(true);
        try {
            // Update Context first for immediate feedback
            const currentLogs = reportData.section1.attendance_logs || [];
            updateSection('section1', {
                attendance_logs: [...currentLogs, newEntry]
            });

            // Sync with backend if participantId exists
            const activeParticipantId = formData.participantId;
            if (activeParticipantId) {
                // Determine if we need to send multipart/form-data or application/json
                let fetchOptions: RequestInit = {};

                if (evidenceFile) {
                    const fd = new FormData();
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
                        // DO NOT set Content-Type header manually for FormData, fetch will set it with the correct boundary
                    };
                } else {
                    fetchOptions = {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...formData,
                            activityType: formData.activityType === 'Other' ? formData.otherActivity : formData.activityType,
                            evidenceUploaded: false,
                            sessionHours: numericHours
                        })
                    };
                }

                const res = await authenticatedFetch(`/api/v1/engagement/${activeParticipantId}/attendance`, fetchOptions);

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
            // Even if sync fails, we keep context updated for UX? 
            // Better to show warning if sync is critical.
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-report-primary-soft text-report-primary rounded-xl flex items-center justify-center">
                        <Plus className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Add Attendance Entry</h3>
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
                            onChange={(e) => setFormData({ ...formData, participantId: e.target.value })}
                            className="w-full pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold text-base appearance-none focus:ring-2 focus:ring-report-primary/20 transition-all cursor-pointer"
                            required
                        >
                            {verifiedUsers.length === 0 && <option value="">No verified students found</option>}
                            {verifiedUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Organization */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Organization / Location</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Where did you engage?"
                            value={formData.organizationName}
                            onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                            className="pl-10 h-14 bg-slate-50 border-none rounded-2xl font-bold text-base shadow-sm focus:ring-2 focus:ring-report-primary/20"
                            required
                        />
                    </div>
                </div>

                {/* Activity Type */}
                <div className="space-y-2">
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
                    disabled={isSubmitting || wordCount > 40 || isLocked}
                    className={clsx(
                        "w-full h-14 rounded-2xl font-black text-sm transition-all shadow-xl",
                        isLocked
                            ? "bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed"
                            : "bg-report-primary hover:bg-report-primary-border text-white shadow-report-primary-shadow hover:translate-y-[-2px]"
                    )}
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : isLocked ? (
                        <div className="flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4" />
                            RECORD LOCKED
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            SAVE ATTENDANCE ENTRY
                        </div>
                    )}
                </Button>

                {isLocked && setParticipationUnlocked && (
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => setParticipationUnlocked(true)}
                            className="text-[10px] font-black uppercase tracking-widest text-report-primary hover:text-report-primary-border underline"
                        >
                            Unlock for editing
                        </button>
                    </div>
                )}
            </div>
        </form>
    );
}
