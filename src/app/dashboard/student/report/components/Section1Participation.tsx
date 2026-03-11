import React from "react";
import { Users, UserPlus, Trash2, Shield, Info, AlertCircle, Clock, CheckCircle2, Loader2, Award, Zap, ChevronRight, ChevronLeft, Save, Lock, Unlock, PlusCircle } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { authenticatedFetch } from "@/utils/api";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { toast } from "sonner";

import { FieldError } from "./ui/FieldError";
import IdentityVerification from "../../engagement/components/IdentityVerification";
import AttendanceForm from "../../engagement/components/AttendanceForm";
import AttendanceSummaryTable from "../../engagement/components/AttendanceSummaryTable";
import EngagementOverview from "../../engagement/components/EngagementOverview";
import TeamVerification from "./TeamVerification";
import { calculateEngagementMetrics } from "../utils/engagementMetrics";

export default function Section1Participation({ projectData }: { projectData?: any } = {}) {
    const { data, updateSection, getFieldError, validationErrors, nextStep, saveReport, isReadOnly, isParticipationUnlocked, setParticipationUnlocked } = useReportForm();
    const searchParams = useSearchParams();
    const projectIdFromUrl = searchParams.get('project') || searchParams.get('projectId');

    const { participation_type, team_lead, team_members } = data.section1;
    // Extract available spots using all possible backend keys for the opportunity
    const maxTeamSize = projectData?.timeline?.volunteers_required || projectData?.volunteers_needed || projectData?.available_spots || 20;

    // Wizard State
    const [internalStep, setInternalStep] = React.useState(
        data.section1.verified_summary ? 5 : 1
    );
    const [isLoadingMetrics, setIsLoadingMetrics] = React.useState(false);
    const [verifiedMetrics, setVerifiedMetrics] = React.useState<any>(
        data.section1.metrics.total_verified_hours > 0 ? {
            totalHours: data.section1.metrics.total_verified_hours,
            eis: data.section1.metrics.eis_score,
            activeDays: data.section1.metrics.total_active_days,
            spanWeeks: Math.ceil(data.section1.metrics.engagement_span / 7),
            frequency: data.section1.metrics.attendance_frequency,
            weeklyContinuity: data.section1.metrics.weekly_continuity,
            category: data.section1.metrics.engagement_category,
            hecStatus: data.section1.metrics.hec_compliance
        } : null
    );
    const [verifiedSummary, setVerifiedSummary] = React.useState<string>(data.section1.verified_summary || "");
    const [isVerified, setIsVerified] = React.useState(!!data.section1.team_lead.verified);
    const [participantId, setParticipantId] = React.useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = React.useState(!!data.section1.verified_summary);
    const reviewChecked = data.section1.review_checked || [false, false, false];
    const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
    const [selectedParticipantId, setSelectedParticipantId] = React.useState<string | null>(null);

    // Hard Validation Gates
    const canMoveToStep2 = participation_type !== null;
    const canMoveToStep3 = isVerified; // Self must be verified in Step 2 gateway
    const canMoveToStep4 = participation_type === 'individual' ||
        (participation_type === 'team' && team_members.length > 0 && team_members.every(m => m.verified));
    const canMoveToStep5 = data.section1.attendance_logs.length > 0;

    const steps = [
        { id: 1, title: 'Participation Mode' },
        { id: 2, title: 'Identity & Team Setup' },
        { id: 3, title: 'Attendance Logging' },
        { id: 4, title: 'Review & Submit' },
        { id: 5, title: 'Metrics Dashboard' }
    ];

    // Data Fetching
    React.useEffect(() => {
        if (projectIdFromUrl) {
            fetchInitialData();
        }
    }, [projectIdFromUrl]);

    // Sync selectedParticipantId when participantId is fetched
    React.useEffect(() => {
        if (participantId && !selectedParticipantId) {
            setSelectedParticipantId(participantId);
        }
    }, [participantId]);

    const fetchInitialData = async () => {
        try {
            // 1. Fetch Team Lead's Participant Record
            const partRes = await authenticatedFetch(`/api/v1/engagement/my`);
            if (partRes && partRes.ok) {
                const parts = await partRes.json();
                const myPart = parts.data.find((p: any) => p.projectId === projectIdFromUrl);

                if (myPart) {
                    setParticipantId(myPart.id);
                    setIsVerified(true);
                    // Update wizard step based on progress
                    if (['submitted', 'verified', 'finalized'].includes(myPart.status)) {
                        setInternalStep(5);
                        setIsSubmitted(true);
                    } else if (myPart.mobileVerified || myPart.emailVerified) {
                        setInternalStep(3);
                    }

                    // 2. Collect all participant IDs (team lead + verified team members from saved report)
                    const allIdsToFetch: { id: string; pId: string }[] = [
                        { id: myPart.id, pId: myPart.id }
                    ];

                    // Add already-verified team members stored in the report draft
                    const savedMembers = data.section1.team_members || [];
                    savedMembers.forEach((m: any) => {
                        if (m.verified && m.id) {
                            allIdsToFetch.push({ id: m.id, pId: m.id });
                        }
                    });

                    // 3. Fetch Attendance from all participants in parallel and merge
                    const allLogs: any[] = [];
                    await Promise.all(allIdsToFetch.map(async ({ pId }) => {
                        const attRes = await authenticatedFetch(`/api/v1/engagement/${pId}/attendance`);
                        if (attRes && attRes.ok) {
                            const atts = await attRes.json();
                            const mapped = (atts.data || []).map((e: any) => ({
                                id: e.id,
                                date: e.dateOfEngagement || e.date,
                                start_time: e.startTime || e.start_time,
                                end_time: e.endTime || e.end_time,
                                location: e.organizationName || e.location,
                                activity_type: e.activityType || e.activity_type,
                                description: e.description,
                                hours: e.sessionHours || e.hours,
                                entryStatus: e.entryStatus,
                                participantId: pId,
                                evidence_file: e.evidenceUrl || (e.evidenceUploaded ? true : undefined)
                            }));
                            allLogs.push(...mapped);
                        }
                    }));

                    if (allLogs.length > 0) {
                        updateSection('section1', { attendance_logs: allLogs });
                        const calc = calculateEngagementMetrics(allLogs);
                        setVerifiedMetrics({
                            totalHours: calc.total_verified_hours,
                            activeDays: calc.total_active_days,
                            spanWeeks: Math.ceil(calc.engagement_span / 7),
                            frequency: calc.attendance_frequency,
                            weeklyContinuity: calc.weekly_continuity,
                            eis: calc.eis_score,
                            category: calc.engagement_category,
                            hecStatus: calc.hec_compliance,
                            evidenceCount: allLogs.filter((l: any) => l.evidence_file).length,
                            evidenceRatio: Math.round((allLogs.filter((l: any) => l.evidence_file).length / allLogs.length) * 100)
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching initial dynamic data:", err);
        }
    };

    const handleNext = () => {
        if (internalStep === 5) {
            updateSection('section1', {
                verified_summary: "Participation record finalized with HEC-compliant audit trail."
            });
            nextStep(); // Context next step
            return;
        }
        setInternalStep(prev => Math.min(prev + 1, 5));
    };
    const handleBack = () => setInternalStep(prev => Math.max(prev - 1, 1));

    const handleFinalSubmit = async () => {
        if (!participantId) return;
        setIsLoadingMetrics(true);
        try {
            // Trigger backend finalization and record locking
            const res = await authenticatedFetch(`/api/v1/engagement/${participantId}/finalize`, {
                method: 'POST'
            });

            if (res && res.ok) {
                // Calculate metrics locally since we have all the data
                const calc = calculateEngagementMetrics(data.section1.attendance_logs);
                const finalMetrics = {
                    totalHours: calc.total_verified_hours,
                    activeDays: calc.total_active_days,
                    spanWeeks: Math.ceil(calc.engagement_span / 7),
                    frequency: calc.attendance_frequency,
                    weeklyContinuity: calc.weekly_continuity,
                    eis: calc.eis_score,
                    category: calc.engagement_category,
                    hecStatus: calc.hec_compliance,
                    evidenceCount: data.section1.attendance_logs.filter(l => l.evidence_file).length,
                    evidenceRatio: Math.round((data.section1.attendance_logs.filter(l => l.evidence_file).length / data.section1.attendance_logs.length) * 100)
                };

                setVerifiedMetrics(finalMetrics);
                setIsSubmitted(true);
                setParticipationUnlocked(false); // Relock after submission

                // Persist completion state to report context
                updateSection('section1', {
                    verified_summary: "Participation record finalized with HEC-compliant audit trail.",
                    metrics: calc // Store raw calc for other sections if needed
                });

                handleNext(); // Move to dashboard
            } else {
                throw new Error("Finalization failed");
            }
        } catch (err) {
            console.error("Final Submit Error:", err);
        } finally {
            setIsLoadingMetrics(false);
        }
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm("Are you sure you want to remove this session?")) return;

        // Find which participant this entry belongs to
        const entry = data.section1.attendance_logs.find((l: any) => l.id === entryId);
        const entryParticipantId = (entry as any)?.participantId || participantId;
        if (!entryParticipantId) return;

        setIsDeleting(entryId);
        try {
            const res = await authenticatedFetch(`/api/v1/engagement/${entryParticipantId}/attendance/${entryId}`, {
                method: 'DELETE'
            });

            if (res && res.ok) {
                const newLogs = data.section1.attendance_logs.filter((l: any) => l.id !== entryId);
                updateSection('section1', { attendance_logs: newLogs });
            } else {
                alert("Failed to delete entry. Please try again.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsDeleting(null);
        }
    };


    const isRecordLocked = isSubmitted && !isParticipationUnlocked;

    return (
        <div className="space-y-10 pb-20">
            {/* Sticky Progress Bar */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 py-4 -mx-4 md:-mx-6 px-4 md:px-6 mb-8">
                <div className="max-w-none mx-auto">
                    <div className="flex justify-between items-center mb-2">
                        <span className="report-label !text-report-primary">Project Engagement Wizard</span>
                        <span className="report-label !text-slate-400">Step {internalStep} of {steps.length}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                        {steps.map((s) => (
                            <div
                                key={s.id}
                                className={clsx(
                                    "h-full flex-1 transition-all duration-500",
                                    internalStep >= s.id ? "bg-report-primary" : "bg-slate-200"
                                )}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 overflow-x-auto no-scrollbar gap-4">
                        {steps.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => internalStep > s.id && setInternalStep(s.id)}
                                className={clsx(
                                    "text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors",
                                    internalStep === s.id ? "text-report-primary" : internalStep > s.id ? "text-slate-900" : "text-slate-300"
                                )}
                            >
                                {s.title}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="max-w-none mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                {internalStep === 1 && (
                    <div className="space-y-8 py-10">
                        <div className="text-center space-y-4 max-w-xl mx-auto">
                            <h2 className="report-h2">How are you participating?</h2>
                            <p className="report-help">Select your involvement mode to begin high-intensity verification.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { id: 'individual', title: 'Individual Participation', desc: 'Direct contribution without a formal student team.', icon: UserPlus },
                                { id: 'team', title: 'Team Participation', desc: 'Working with a group of up to 20 students.', icon: Users },
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => updateSection('section1', { participation_type: mode.id })}
                                    className={clsx(
                                        "p-8 rounded-[2rem] border-2 text-left transition-all group relative overflow-hidden",
                                        participation_type === mode.id
                                            ? "border-report-primary bg-report-primary-soft/30 ring-4 ring-report-primary/5 shadow-xl"
                                            : "border-slate-100 bg-white hover:border-report-primary-border"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors",
                                        participation_type === mode.id ? "bg-report-primary text-white" : "bg-slate-50 text-slate-400 group-hover:bg-report-primary-soft group-hover:text-report-primary"
                                    )}>
                                        <mode.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="report-h3 !text-xl"> {mode.title}</h3>
                                    <p className="report-help !text-sm">{mode.desc}</p>

                                    {participation_type === mode.id && (
                                        <div className="absolute top-6 right-6">
                                            <div className="w-6 h-6 rounded-full bg-report-primary flex items-center justify-center">
                                                <CheckCircle2 className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {participation_type === 'team' && (
                            <div className="max-w-2xl mx-auto space-y-8 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 animate-in zoom-in-95 duration-500">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="report-label">Team Name (Optional)</Label>
                                        <Input
                                            placeholder="Enter team alias..."
                                            className="h-12 bg-white border-none rounded-2xl font-bold shadow-sm"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="report-h3">Team Composition</h4>
                                            <p className="report-help">{team_members.length + 1}/{maxTeamSize} members added (including you)</p>
                                        </div>
                                        <Button
                                            onClick={() => updateSection('section1', { team_members: [...team_members, { name: '', cnic: '', verified: false }] })}
                                            className="bg-report-primary text-white rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-report-primary-shadow hover:bg-report-primary/90 transition-all"
                                            disabled={team_members.length + 1 >= maxTeamSize}
                                        >
                                            <PlusCircle className="w-3.5 h-3.5 mr-2" /> Add Team Member
                                        </Button>
                                    </div>

                                    {team_members.length > 0 && (
                                        <div className="pt-4 flex flex-wrap gap-2 border-t border-slate-100">
                                            {team_members.map((member: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-2 pl-3 pr-1 py-1 bg-slate-200/70 text-slate-800 rounded-xl">
                                                    <Users className="w-3.5 h-3.5 text-slate-500" />
                                                    <span className="text-xs font-bold">
                                                        {member.name || `Member ${idx + 1}`}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            const newMembers = [...team_members];
                                                            newMembers.splice(idx, 1);
                                                            updateSection('section1', { team_members: newMembers });
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {internalStep === 2 && (
                    <div className="space-y-12">
                        {/* 1. Self Identity Verification */}
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <h3 className="report-h2 !text-2xl">Step 2: Identity & Team Setup</h3>
                                <p className="report-help">Establish your unique verified link and configure your team for HEC audit trails.</p>
                            </div>

                            <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-8 shadow-sm">
                                <h4 className="report-h3 !mb-6 !flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-report-primary" /> My Identity Verification
                                </h4>
                                {isVerified ? (
                                    <div className="flex items-center gap-4 p-6 bg-report-primary-soft/50 border-2 border-report-primary-border rounded-[1.5rem] shadow-sm">
                                        <div className="w-12 h-12 rounded-2xl bg-report-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-report-primary-shadow">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Identity Verified</p>
                                            <p className="report-help !pl-0 !text-[10px]">Your academic record has been linked and is ready for HEC audit trails.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <IdentityVerification
                                        projectId={data.project_id || projectIdFromUrl || ""}
                                        participationMode={participation_type as any}
                                        isTeamLead={true}
                                        onSuccess={(p) => {
                                            setIsVerified(true);
                                            setParticipantId(p.id);
                                            updateSection('section1', {
                                                team_lead: { ...team_lead, id: p.id, verified: true, fullName: p.fullName }
                                            });
                                            toast.success('Identity verified successfully!');

                                            if (participation_type === 'individual') {
                                                handleNext();
                                            } else {
                                                toast.info('Please proceed to setup your team members below.');
                                                setTimeout(() => {
                                                    const el = document.getElementById('team-setup-section');
                                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }, 100);
                                            }
                                        }}
                                    />
                                )}
                            </div>

                        </div>

                        {/* 2. Team Configuration (if applicable) */}
                        {participation_type === 'team' && (
                            <div id="team-setup-section" className="space-y-6 pt-6 border-t border-slate-100">
                                <h4 className="report-h3 !flex items-center gap-2">
                                    <Users className="w-4 h-4 text-report-primary" /> Team Members Setup
                                </h4>
                                <TeamVerification
                                    projectId={data.project_id || projectIdFromUrl || ""}
                                    members={team_members}
                                    onUpdateMembers={async (newMembers) => {
                                        updateSection('section1', { team_members: newMembers });
                                        // Direct API save to avoid stale React state issue
                                        // (saveReport reads from state which hasn't updated yet)
                                        const hasVerified = newMembers.some((m: any) => m.verified && m.id);
                                        if (hasVerified) {
                                            try {
                                                const projectId = data.project_id || projectIdFromUrl || '';
                                                if (projectId) {
                                                    await authenticatedFetch(`/api/v1/student/reports`, {
                                                        method: 'POST',
                                                        body: JSON.stringify({
                                                            ...data,
                                                            project_id: projectId,
                                                            section1: {
                                                                ...data.section1,
                                                                team_members: newMembers
                                                            },
                                                            status: 'draft'
                                                        })
                                                    });
                                                }
                                            } catch (err) {
                                                console.error('Auto-save after member verification failed:', err);
                                            }
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {/* Navigation button to advance manually from this combined step */}
                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={handleNext}
                                disabled={!isVerified}
                                className="bg-report-primary text-white hover:bg-report-primary/90 rounded-xl px-8 h-12 font-bold transition-all"
                            >
                                Continue to Attendance <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Placeholders for Steps 3, 4, 5 */}
                {internalStep === 3 && (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="report-h2 !text-2xl">Step 3: Attendance Logging</h3>
                                <p className="report-help">Record and verify your engagement sessions.</p>
                            </div>
                            <div className="flex gap-3">
                                {isSubmitted && (
                                    <Button
                                        onClick={() => setParticipationUnlocked(!isParticipationUnlocked)}
                                        variant="outline"
                                        className={clsx(
                                            "rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest transition-all",
                                            isParticipationUnlocked ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-report-primary-soft text-report-primary border-report-primary-border"
                                        )}
                                    >
                                        {isParticipationUnlocked ? <Unlock className="w-3.5 h-3.5 mr-2" /> : <Lock className="w-3.5 h-3.5 mr-2" />}
                                        {isParticipationUnlocked ? "Re-Lock Record" : "Unlock for Editing"}
                                    </Button>
                                )}
                                <div className="px-4 py-2 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-amber-600" />
                                    <span className="report-label !text-amber-800">Gateway active: Hours must exceed 40</span>
                                </div>
                            </div>
                        </div>

                        {/* Engagement Hours Summary Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-500">
                            {[
                                {
                                    label: "Required Hours",
                                    value: projectData?.hours || projectData?.timeline?.hours || 40,
                                    sub: "Institutional Goal",
                                    color: "bg-slate-50 border-slate-100 text-slate-900",
                                    icon: Shield
                                },
                                {
                                    label: "Logged Hours",
                                    value: data.section1.attendance_logs.reduce((acc: number, log: any) => acc + (Number(log.hours) || 0), 0),
                                    sub: "Sum of Sessions",
                                    color: "bg-report-primary-soft border-report-primary-border text-report-primary",
                                    icon: Award
                                },
                                {
                                    label: "Remaining Hours",
                                    value: Math.max(0, (projectData?.hours || projectData?.timeline?.hours || 40) - data.section1.attendance_logs.reduce((acc: number, log: any) => acc + (Number(log.hours) || 0), 0)),
                                    sub: "Target Completion",
                                    color: "bg-slate-50 border-slate-100 text-slate-600",
                                    icon: Zap
                                }
                            ].map((stat, i) => (
                                <div key={i} className={clsx("p-6 rounded-[2rem] border shadow-sm flex items-center gap-5 transition-all hover:translate-y-[-2px]", stat.color)}>
                                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <span className="report-label !opacity-60">{stat.label}</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-2xl font-black tabular-nums tracking-tight">{stat.value}</span>
                                            <span className="text-[10px] font-bold opacity-50">HRS</span>
                                        </div>
                                        <p className="report-label !text-[9px] !opacity-40 !mt-1">{stat.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
                            <div className="space-y-8">
                                <div className="p-1 bg-slate-100 rounded-2xl flex">
                                    <button className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-white text-report-primary rounded-xl shadow-sm">New Entry</button>
                                    <button className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Bulk Import</button>
                                </div>
                                {(() => {
                                    const verifiedUsersList = [
                                        ...(isVerified && participantId ? [{ id: participantId, name: (data.section1.team_lead as any).fullName || (data.section1.team_lead as any).name || "Team Lead (Self)" }] : []),
                                        ...data.section1.team_members
                                            .filter((m: any) => m.verified && m.id)
                                            .map((m: any) => ({ id: m.id, name: m.fullName || m.name }))
                                    ];
                                    return (
                                        <>
                                            <AttendanceForm
                                                verifiedUsers={verifiedUsersList}
                                                onSuccess={() => loadAllEntries()}
                                                selectedParticipantId={selectedParticipantId}
                                                onParticipantChange={setSelectedParticipantId}
                                                isLocked={isRecordLocked}
                                                isParticipationUnlocked={isParticipationUnlocked}
                                                setParticipationUnlocked={setParticipationUnlocked}
                                            />
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="space-y-6">
                                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-x-auto">
                                    <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <h4 className="report-h3 !flex items-center gap-2 !mb-0 text-slate-900 font-black">
                                                <Clock className="w-5 h-5 text-report-primary" /> Logged Sessions
                                            </h4>
                                            {selectedParticipantId && (
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-7">
                                                    Filtered by: {[
                                                        ...(isVerified && participantId ? [{ id: participantId, name: (data.section1.team_lead as any).fullName || (data.section1.team_lead as any).name || "Team Lead (Self)" }] : []),
                                                        ...data.section1.team_members
                                                            .filter((m: any) => m.verified && m.id)
                                                            .map((m: any) => ({ id: m.id, name: m.fullName || m.name }))
                                                    ].find(u => u.id === selectedParticipantId)?.name || "Self"}
                                                </p>
                                            )}
                                        </div>
                                        <span className="bg-white px-4 py-1.5 rounded-full border border-slate-100 text-[10px] font-black uppercase tracking-widest text-report-primary shadow-sm">
                                            {data.section1.attendance_logs.filter((log: any) => !selectedParticipantId || log.participantId === selectedParticipantId).length} Records
                                        </span>
                                    </div>
                                    <AttendanceSummaryTable
                                        entries={data.section1.attendance_logs.filter((log: any) => !selectedParticipantId || log.participantId === selectedParticipantId)}
                                        onDelete={handleDeleteEntry}
                                        isLocked={isRecordLocked}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {internalStep === 4 && (
                    <div className="max-w-2xl mx-auto space-y-10 py-10 animate-in zoom-in-95 duration-500">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-report-primary text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-report-primary-shadow">
                                <Shield className="w-10 h-10" />
                            </div>
                            <h2 className="report-h2">Final Verification & Submission</h2>
                            <p className="report-help">Please review all data points before triggering the hard lock.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="p-8 bg-amber-50 rounded-[2.5rem] border-2 border-amber-200/50 space-y-4">
                                <div className="flex items-center gap-3 text-amber-800">
                                    <AlertCircle className="w-6 h-6 shrink-0" />
                                    <h4 className="report-h3 !text-amber-800">Hard Gateway: Permanent Record Lock</h4>
                                </div>
                                <p className="report-body !text-amber-800/80">
                                    By proceeding, you acknowledge that all participation logs for this project will be <strong>strictly immutable</strong>.
                                    Any inaccuracies will be reflected in your HEC-verified record.
                                </p>
                            </div>

                            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
                                <div className="space-y-4">
                                    {['I verify that all session entries are authentic.', 'I understand that no further edits are possible after submission.', 'I consent to institutional report sharing.'].map((check, i) => (
                                        <label key={i} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={reviewChecked[i]}
                                                onChange={() => {
                                                    const newChecked = [...reviewChecked];
                                                    newChecked[i] = !newChecked[i];
                                                    updateSection('section1', { review_checked: newChecked });
                                                }}
                                                className="mt-1 w-5 h-5 rounded-md border-2 border-slate-200 text-report-primary focus:ring-report-primary transition-colors cursor-pointer"
                                            />
                                            <span className="report-body !text-slate-600">{check}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {internalStep === 5 && (
                    <div className="space-y-10 animate-in fade-in duration-700">
                        {verifiedMetrics ? (
                            <div className="animate-in slide-in-from-bottom-8 duration-700">
                                <EngagementOverview metrics={verifiedMetrics} isTeam={participation_type === 'team'} />
                            </div>
                        ) : (
                            <div className="py-40 text-center space-y-6 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                                        <div className="w-20 h-20 bg-report-primary-soft rounded-full blur-xl opacity-50"></div>
                                    </div>
                                    <Loader2 className="w-12 h-12 text-report-primary animate-spin mx-auto relative z-10" />
                                </div>
                                <div className="space-y-2 relative z-10">
                                    <p className="report-h3">Generating Intensity Analytics</p>
                                    <p className="report-help !text-xs !max-w-[280px] !mx-auto">
                                        Calculating EIS scores and verifying HEC compliance status for your record.
                                    </p>
                                </div>
                                {!isSubmitted && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setInternalStep(4)}
                                        className="rounded-2xl border-2 border-report-primary-border text-report-primary font-bold px-8 hover:bg-report-primary-soft transition-all"
                                    >
                                        Return to Review & Submit
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation Controls */}
                <div className="bg-white border-t border-slate-100 p-8 flex justify-center mt-12 mb-20 rounded-[2.5rem] shadow-sm">
                    <div className="max-w-none w-full flex justify-between items-center">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={internalStep === 1}
                            className="rounded-2xl h-14 px-8 font-black text-slate-400 hover:text-slate-900 transition-all"
                        >
                            <ChevronLeft className="w-5 h-5 mr-2" /> Back
                        </Button>

                        <div className="flex gap-4">
                            <Button
                                onClick={() => saveReport(false)}
                                className="bg-slate-100 text-slate-900 hover:bg-slate-200 rounded-2xl h-14 px-8 font-black shadow-sm flex items-center gap-2 group transition-all"
                            >
                                <Save className="w-4 h-4 text-slate-400 group-hover:text-slate-900" /> Save Draft
                            </Button>

                            {internalStep < 5 ? (
                                <div className="flex gap-4">
                                    {internalStep === 4 && (
                                        <Button
                                            onClick={handleFinalSubmit}
                                            disabled={!reviewChecked.every(Boolean) || isLoadingMetrics}
                                            className="bg-report-primary hover:bg-report-primary/90 text-white rounded-2xl h-14 px-12 font-black shadow-2xl shadow-report-primary-shadow animate-in zoom-in-95 duration-500"
                                        >
                                            {isLoadingMetrics ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                            Finalize & Generate Record <Lock className="w-5 h-5 ml-2" />
                                        </Button>
                                    )}
                                    <Button
                                        onClick={handleNext}
                                        disabled={false}
                                        className="bg-report-primary hover:bg-report-primary/90 text-white rounded-2xl h-14 px-10 font-black shadow-2xl shadow-report-primary-shadow animate-in slide-in-from-right-4 duration-500"
                                    >
                                        {internalStep === 4 ? "Skip Submission & Continue" : "Continue"} <ChevronRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleNext}
                                    className="bg-slate-900 hover:bg-black text-white rounded-2xl h-14 px-10 font-black shadow-xl transition-all hover:translate-y-[-2px] flex items-center gap-3"
                                >
                                    Save & Continue to Next Section <ChevronRight className="w-5 h-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );

    // Helpers (moved inside component if needed)
    async function loadEntries(pId: string) {
        try {
            const res = await authenticatedFetch(`/api/v1/engagement/${pId}/attendance`);
            if (res && res.ok) {
                const result = await res.json();
                const mappedEntries = (result.data || []).map((e: any) => ({
                    id: e.id,
                    date: e.dateOfEngagement || e.date,
                    start_time: e.startTime || e.start_time,
                    end_time: e.endTime || e.end_time,
                    location: e.organizationName || e.location,
                    activity_type: e.activityType || e.activity_type,
                    description: e.description,
                    hours: e.sessionHours || e.hours,
                    entryStatus: e.entryStatus
                }));
                updateSection('section1', { attendance_logs: mappedEntries });
            }
        } catch (err) {
            console.error("Error loading entries:", err);
        }
    }
    // Load attendance from ALL verified participants and merge
    async function loadAllEntries() {
        try {
            // Build list of all participant IDs: team lead + verified team members
            const allParticipantIds: string[] = [];
            if (participantId) allParticipantIds.push(participantId);
            data.section1.team_members
                .filter((m: any) => m.verified && m.id)
                .forEach((m: any) => allParticipantIds.push(m.id));

            if (allParticipantIds.length === 0) return;

            const allLogs: any[] = [];
            await Promise.all(allParticipantIds.map(async (pId) => {
                const res = await authenticatedFetch(`/api/v1/engagement/${pId}/attendance`);
                if (res && res.ok) {
                    const result = await res.json();
                    const mapped = (result.data || []).map((e: any) => ({
                        id: e.id,
                        date: e.dateOfEngagement || e.date,
                        start_time: e.startTime || e.start_time,
                        end_time: e.endTime || e.end_time,
                        location: e.organizationName || e.location,
                        activity_type: e.activityType || e.activity_type,
                        description: e.description,
                        hours: e.sessionHours || e.hours,
                        entryStatus: e.entryStatus,
                        participantId: pId,
                        evidence_file: e.evidenceUrl || (e.evidenceUploaded ? true : undefined)
                    }));
                    allLogs.push(...mapped);
                }
            }));

            updateSection('section1', { attendance_logs: allLogs });
        } catch (err) {
            console.error("Error loading all entries:", err);
        }
    }
}
