"use client";

import { useState } from "react";
import {
    Plus,
    Calendar,
    Clock,
    MapPin,
    Tag,
    Loader2,
    CheckCircle2,
    Upload,
    X,
    Lock,
    Users,
    Info,
    AlertCircle,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../report/components/ui/button";
import { Input } from "../../report/components/ui/input";
import { Label } from "../../report/components/ui/label";
import { authenticatedFetch } from "@/utils/api";
import { normalizeEngagementAttendanceLog } from "@/utils/engagementAttendanceMap";
import { canLogAttendanceForParticipationStatus } from "@/utils/attendanceApproverRouting";
import { resolveAttendanceSubmitError } from "@/utils/attendanceSubmitError";
import { uploadAttendanceEvidenceViaPresign } from "@/utils/attendanceEvidenceUpload";
import {
    ATTENDANCE_DESCRIPTION_MAX_CHARS,
    ATTENDANCE_DESCRIPTION_MAX_WORDS,
    MAX_DAILY_ATTENDANCE_HOURS,
    attendanceDescriptionLimitMessage,
    attendanceDescriptionOverLimit,
    dailyAttendanceCapMessage,
} from "@/utils/attendanceDescriptionLimits";
import clsx from "clsx";
import { REPORT_ATTACHMENT_ACCEPT } from "@/utils/reportAttachmentAccept";
import { useReportForm } from "../../report/context/ReportContext";
import React from "react";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/ui/LocationPicker"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[180px] w-full animate-pulse items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">
            Loading map…
        </div>
    ),
});

type AttendanceLogLike = {
    date?: unknown;
    dateOfEngagement?: unknown;
    start_time?: unknown;
    startTime?: unknown;
    end_time?: unknown;
    endTime?: unknown;
    participantId?: unknown;
};

function attendanceParticipantKey(id: unknown): string {
    if (typeof id !== "string") return "";
    const memberMatch = /^member:\d+:(.+)$/.exec(id);
    if (memberMatch?.[1]) return memberMatch[1];
    if (id.startsWith("lead:")) return id.slice("lead:".length);
    return id;
}

function attendanceParticipantsMatch(a: unknown, b: unknown): boolean {
    if (typeof a !== "string" || typeof b !== "string") return false;
    return a === b || attendanceParticipantKey(a) === attendanceParticipantKey(b);
}

function normalizeAttendanceDate(value: unknown): string {
    if (typeof value !== "string" || !value.trim()) return "";
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString().slice(0, 10);
}

function timeToMinutes(value: unknown): number | null {
    if (typeof value !== "string") return null;
    const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
}

function hasOverlappingAttendanceLog(
    logs: AttendanceLogLike[],
    candidate: { participantId: string; date: string; startTime: string; endTime: string },
): boolean {
    const candidateDate = normalizeAttendanceDate(candidate.date);
    const candidateStart = timeToMinutes(candidate.startTime);
    const candidateEnd = timeToMinutes(candidate.endTime);
    if (!candidateDate || candidateStart == null || candidateEnd == null) return false;

    return logs.some((log) => {
        if (!attendanceParticipantsMatch(log.participantId, candidate.participantId)) return false;
        const logDate = normalizeAttendanceDate(log.dateOfEngagement ?? log.date);
        if (logDate !== candidateDate) return false;

        const logStart = timeToMinutes(log.startTime ?? log.start_time);
        const logEnd = timeToMinutes(log.endTime ?? log.end_time);
        if (logStart == null || logEnd == null) return false;

        return candidateStart < logEnd && candidateEnd > logStart;
    });
}

function computeSessionHours(startTime: string, endTime: string): number | null {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (start == null || end == null || end <= start) return null;
    return Math.round((end - start) / 60 * 100) / 100;
}

function FormSection({
    title,
    description,
    children,
    step,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    step: number;
}) {
    return (
        <section className="space-y-4">
            <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100">
                    {step}
                </span>
                <div className="min-w-0 pt-0.5">
                    <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
                    {description ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
                    ) : null}
                </div>
            </div>
            <div className="ml-10 space-y-4">{children}</div>
        </section>
    );
}

export default function AttendanceForm({
    verifiedUsers,
    onSuccess,
    selectedParticipantId,
    onParticipantChange,
    isLocked = false,
    isParticipationUnlocked,
    setParticipationUnlocked,
    allowManualUnlock = true,
}: {
    verifiedUsers: { id: string; name: string; status?: string }[];
    onSuccess: () => void;
    selectedParticipantId?: string | null;
    onParticipantChange?: (id: string) => void;
    isLocked?: boolean;
    isParticipationUnlocked?: boolean;
    setParticipationUnlocked?: (unlocked: boolean) => void;
    allowManualUnlock?: boolean;
}) {
    const { data: reportData, updateSection } = useReportForm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [formData, setFormData] = useState({
        participantId: selectedParticipantId || (verifiedUsers.length > 0 ? verifiedUsers[0].id : ""),
        dateOfEngagement: "",
        startTime: "09:00",
        endTime: "12:00",
        organizationName: "",
        activityType: "Field Visit",
        otherActivity: "",
        description: "",
        locationPin: "",
    });

    React.useEffect(() => {
        setMounted(true);
        setFormData((prev) =>
            prev.dateOfEngagement
                ? prev
                : { ...prev, dateOfEngagement: new Date().toISOString().split("T")[0] },
        );
    }, []);

    React.useEffect(() => {
        if (!selectedParticipantId) return;
        setFormData((prev) =>
            selectedParticipantId === prev.participantId
                ? prev
                : { ...prev, participantId: selectedParticipantId },
        );
    }, [selectedParticipantId]);

    const { wordCount, charCount, overWords, overChars } = attendanceDescriptionOverLimit(
        formData.description,
    );
    const descriptionLimitMessage = attendanceDescriptionLimitMessage(wordCount, charCount);
    const descriptionOverLimit = overWords || overChars;
    const sessionHours = computeSessionHours(formData.startTime, formData.endTime);

    const selectedUser = verifiedUsers.find((u) => u.id === formData.participantId);
    const isUserApproved =
        !!selectedUser && canLogAttendanceForParticipationStatus(selectedUser.status);

    const effectiveLocked = isParticipationUnlocked
        ? false
        : !isUserApproved || isLocked;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        const [h1, m1] = formData.startTime.split(":").map(Number);
        const [h2, m2] = formData.endTime.split(":").map(Number);
        const diffMinutes = h2 * 60 + m2 - (h1 * 60 + m1);

        if (diffMinutes <= 0) {
            alert("End time must be after start time");
            return;
        }

        const numericHours = diffMinutes / 60;
        const dailyCapMessage = dailyAttendanceCapMessage();
        if (numericHours > MAX_DAILY_ATTENDANCE_HOURS) {
            alert(dailyCapMessage);
            return;
        }

        const activeParticipantId = formData.participantId;
        const currentLogs = reportData.section1.attendance_logs || [];
        const engagementDateKey = formData.dateOfEngagement.split("T")[0];
        const existingDailyHours = currentLogs
            .filter((log) => {
                if (!attendanceParticipantsMatch(log.participantId, activeParticipantId)) return false;
                const logDate = normalizeAttendanceDate(log.date);
                return logDate === engagementDateKey;
            })
            .reduce((sum, log) => sum + (Number(log.hours) || 0), 0);
        if (existingDailyHours + numericHours > MAX_DAILY_ATTENDANCE_HOURS) {
            alert(dailyCapMessage);
            return;
        }

        const submitDescLimits = attendanceDescriptionOverLimit(formData.description);
        const limitMsg = attendanceDescriptionLimitMessage(
            submitDescLimits.wordCount,
            submitDescLimits.charCount,
        );
        if (limitMsg) {
            setSubmitError(limitMsg);
            toast.error(limitMsg);
            return;
        }

        if (
            hasOverlappingAttendanceLog(currentLogs, {
                participantId: activeParticipantId,
                date: formData.dateOfEngagement,
                startTime: formData.startTime,
                endTime: formData.endTime,
            })
        ) {
            const message =
                "This student already has an attendance entry for this date/time. Please choose a non-overlapping session.";
            setSubmitError(message);
            toast.error(message);
            return;
        }

        const newEntry: Record<string, unknown> = {
            id: Math.random().toString(36).substring(2, 11),
            date: formData.dateOfEngagement,
            start_time: formData.startTime,
            end_time: formData.endTime,
            location: formData.organizationName,
            activity_type:
                formData.activityType === "Other" ? formData.otherActivity : formData.activityType,
            description: formData.description,
            evidence_file: evidenceFile || undefined,
            hours: numericHours,
            participantId: activeParticipantId,
        };
        let mergedEntry: Record<string, unknown> = { ...newEntry };
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            if (activeParticipantId) {
                let fetchOptions: RequestInit = {};

                const segments = activeParticipantId.split(":");
                const realId =
                    segments.length > 1 ? segments[segments.length - 1] : activeParticipantId;

                if (!realId || realId === "anon") {
                    const message =
                        "This student is not linked to a participation record yet. Refresh the page or complete team registration first.";
                    setSubmitError(message);
                    toast.error(message);
                    return;
                }

                let presignedEvidenceUrl: string | undefined;
                if (evidenceFile) {
                    try {
                        presignedEvidenceUrl = await uploadAttendanceEvidenceViaPresign(evidenceFile);
                    } catch (uploadErr) {
                        const message =
                            uploadErr instanceof Error
                                ? uploadErr.message
                                : "Could not upload photo. Try a smaller image or save without evidence.";
                        setSubmitError(message);
                        toast.error(message, { duration: 8000 });
                        return;
                    }
                }

                const payload = {
                    participantId: realId,
                    dateOfEngagement: formData.dateOfEngagement,
                    startTime: formData.startTime,
                    endTime: formData.endTime,
                    organizationName: formData.organizationName,
                    activityType:
                        formData.activityType === "Other"
                            ? formData.otherActivity
                            : formData.activityType,
                    description: formData.description,
                    sessionHours: numericHours,
                    evidenceUploaded: Boolean(presignedEvidenceUrl),
                    evidenceUrl: presignedEvidenceUrl,
                    locationPin: formData.locationPin || undefined,
                };

                fetchOptions = {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                };

                const res = await authenticatedFetch(
                    `/api/v1/engagement/${realId}/attendance`,
                    fetchOptions,
                );

                if (!res || !res.ok) {
                    const message = await resolveAttendanceSubmitError(res);
                    setSubmitError(message);
                    toast.error(message, { duration: 8000 });
                    return;
                }
                try {
                    const okBody = await res.json();
                    const saved = okBody?.data ?? okBody;
                    if (saved && typeof saved === "object") {
                        mergedEntry = {
                            ...normalizeEngagementAttendanceLog(saved as Record<string, unknown>, {
                                participantPrefixedId: activeParticipantId,
                            }),
                            participantId: activeParticipantId,
                            evidence_file:
                                (saved as { evidenceUrl?: string }).evidenceUrl ||
                                newEntry.evidence_file ||
                                undefined,
                        };
                    }
                } catch {
                    /* keep optimistic mergedEntry */
                }
            }

            updateSection("section1", {
                attendance_logs: [...currentLogs, mergedEntry],
            });

            onSuccess();
            setFormData({
                ...formData,
                description: "",
                otherActivity: "",
            });
            setEvidenceFile(null);
        } catch (error) {
            const message =
                error instanceof Error && error.message.trim()
                    ? error.message.trim()
                    : "Network error while saving attendance. Check your connection and try again.";
            setSubmitError(message);
            toast.error(message, { duration: 8000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const fieldClass =
        "h-11 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-sm transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";

    return (
        <form
            onSubmit={handleSubmit}
            className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                        <Plus className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">Add attendance entry</h3>
                        <p className="text-xs text-slate-500">Fill in your session details below</p>
                    </div>
                </div>
            </div>

            <div className="space-y-8 px-5 py-6">
                <FormSection
                    step={1}
                    title="Who & when"
                    description="Select the student and session date/time."
                >
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-600">Student</Label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={formData.participantId}
                                onChange={(e) => {
                                    const newId = e.target.value;
                                    setFormData({ ...formData, participantId: newId });
                                    if (onParticipantChange) onParticipantChange(newId);
                                }}
                                className={clsx(fieldClass, "w-full appearance-none pl-10 pr-4")}
                                required
                            >
                                {verifiedUsers.length === 0 && (
                                    <option value="">No verified students found</option>
                                )}
                                {verifiedUsers.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-600">Date of engagement</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                type="date"
                                value={formData.dateOfEngagement}
                                max={mounted ? new Date().toISOString().split("T")[0] : undefined}
                                onChange={(e) =>
                                    setFormData({ ...formData, dateOfEngagement: e.target.value })
                                }
                                className={clsx(fieldClass, "pl-10")}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-slate-600">Start time</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) =>
                                        setFormData({ ...formData, startTime: e.target.value })
                                    }
                                    className={clsx(fieldClass, "pl-10")}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-slate-600">End time</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) =>
                                        setFormData({ ...formData, endTime: e.target.value })
                                    }
                                    className={clsx(fieldClass, "pl-10")}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {sessionHours != null ? (
                        <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-700">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>
                                Session duration: <strong>{sessionHours} hours</strong>
                            </span>
                        </div>
                    ) : formData.startTime && formData.endTime ? (
                        <p className="text-xs text-amber-600">End time must be after start time.</p>
                    ) : null}
                </FormSection>

                <FormSection
                    step={2}
                    title="Where"
                    description="Name the organization or site where engagement took place."
                >
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-600">
                            Organization / location name
                        </Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="e.g. Green Earth NGO, Community Center"
                                value={formData.organizationName}
                                onChange={(e) =>
                                    setFormData({ ...formData, organizationName: e.target.value })
                                }
                                className={clsx(fieldClass, "pl-10")}
                                required
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/50">
                        <button
                            type="button"
                            onClick={() => setShowMap((v) => !v)}
                            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                            <span className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                Pin exact location on map
                                <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                                    Optional
                                </span>
                            </span>
                            {showMap ? (
                                <ChevronUp className="h-4 w-4 text-slate-400" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                        </button>
                        {showMap ? (
                            <div className="border-t border-slate-200 p-2">
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    <LocationPicker
                                        onLocationSelect={(loc) => {
                                            setFormData((prev) => ({
                                                ...prev,
                                                organizationName: loc.address || prev.organizationName,
                                                locationPin: `${loc.lat},${loc.lng}`,
                                            }));
                                        }}
                                    />
                                </div>
                                {formData.locationPin ? (
                                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Location pinned
                                    </p>
                                ) : (
                                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                                        <Info className="h-3 w-3" />
                                        Click the map to mark your engagement site
                                    </p>
                                )}
                            </div>
                        ) : null}
                    </div>
                </FormSection>

                <FormSection
                    step={3}
                    title="What you did"
                    description="Describe the activity and your contribution."
                >
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-600">Activity type</Label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={formData.activityType}
                                onChange={(e) =>
                                    setFormData({ ...formData, activityType: e.target.value })
                                }
                                className={clsx(fieldClass, "w-full appearance-none pl-10 pr-4")}
                            >
                                {[
                                    "Training / Workshop",
                                    "Awareness Session",
                                    "Research / Survey",
                                    "Mentoring / Coaching",
                                    "Field Visit",
                                    "Resource Distribution",
                                    "Technical Support",
                                    "Administrative",
                                    "Other",
                                ].map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {formData.activityType === "Other" && (
                            <Input
                                placeholder="Specify activity type"
                                value={formData.otherActivity}
                                onChange={(e) =>
                                    setFormData({ ...formData, otherActivity: e.target.value })
                                }
                                className={fieldClass}
                                required
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label className="text-xs font-medium text-slate-600">
                                Brief description
                            </Label>
                            <div className="flex gap-1.5">
                                <span
                                    className={clsx(
                                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                        overWords
                                            ? "bg-red-50 text-red-600"
                                            : "bg-slate-100 text-slate-500",
                                    )}
                                >
                                    {wordCount}/{ATTENDANCE_DESCRIPTION_MAX_WORDS} words
                                </span>
                                <span
                                    className={clsx(
                                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                        overChars
                                            ? "bg-red-50 text-red-600"
                                            : "bg-slate-100 text-slate-500",
                                    )}
                                >
                                    {charCount}/{ATTENDANCE_DESCRIPTION_MAX_CHARS} chars
                                </span>
                            </div>
                        </div>
                        <textarea
                            spellCheck
                            placeholder="What did you accomplish during this session?"
                            value={formData.description}
                            maxLength={ATTENDANCE_DESCRIPTION_MAX_CHARS}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            className={clsx(
                                "w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100",
                                "min-h-[96px]",
                            )}
                            required
                            aria-invalid={descriptionOverLimit}
                            aria-describedby={
                                descriptionOverLimit ? "attendance-description-limit" : undefined
                            }
                        />
                        {descriptionLimitMessage ? (
                            <p id="attendance-description-limit" className="text-xs text-red-600">
                                {descriptionLimitMessage}
                            </p>
                        ) : null}
                    </div>
                </FormSection>

                <FormSection
                    step={4}
                    title="Supporting evidence"
                    description="Upload a photo or document to verify this session (optional)."
                >
                    {evidenceFile ? (
                        <div className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600" />
                                <span className="truncate text-sm font-medium text-indigo-700">
                                    {evidenceFile.name}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEvidenceFile(null)}
                                className="shrink-0 text-indigo-400 hover:text-indigo-600"
                                aria-label="Remove file"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <input
                                type="file"
                                accept={REPORT_ATTACHMENT_ACCEPT}
                                onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 z-10 cursor-pointer opacity-0"
                            />
                            <div className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-5 text-center transition-colors hover:border-indigo-200 hover:bg-indigo-50/30">
                                <Upload className="h-5 w-5 text-slate-400" />
                                <span className="text-xs font-medium text-slate-600">
                                    Drop a file or click to upload
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    JPG, PNG, PDF, or Word
                                </span>
                            </div>
                        </div>
                    )}
                </FormSection>
            </div>

            <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                {submitError ? (
                    <div
                        role="alert"
                        className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
                    >
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
                        <p className="min-w-0 leading-relaxed">{submitError}</p>
                    </div>
                ) : null}

                <Button
                    type="submit"
                    disabled={isSubmitting || descriptionOverLimit || effectiveLocked}
                    className={clsx(
                        "h-11 w-full rounded-lg text-sm font-semibold transition-all",
                        effectiveLocked
                            ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 shadow-none"
                            : "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700",
                    )}
                >
                    {isSubmitting ? (
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : effectiveLocked ? (
                        <span className="flex items-center justify-center gap-2">
                            <Lock className="h-4 w-4" />
                            {!isUserApproved && selectedUser ? "Approval pending" : "Record locked"}
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Save attendance entry
                        </span>
                    )}
                </Button>

                {effectiveLocked && setParticipationUnlocked && allowManualUnlock ? (
                    <div className="text-center">
                        {!isUserApproved && selectedUser ? (
                            <p className="text-xs text-amber-600">
                                Attendance logging is disabled until your reviewer approves
                                participation.
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setParticipationUnlocked(true)}
                                className="text-xs font-medium text-indigo-600 underline hover:text-indigo-800"
                            >
                                Unlock for editing
                            </button>
                        )}
                    </div>
                ) : null}
            </div>
        </form>
    );
}
