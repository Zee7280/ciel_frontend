import React from "react";
import { Users, User, UserPlus, Trash2, Shield, Info, AlertCircle, Clock, CheckCircle2, Loader2, Award, Zap, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Save, Lock, Unlock, PlusCircle, Activity } from "lucide-react";
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
import { calculateSection1CII } from "@/utils/reportQuality";
import { calculateCII } from "../utils/calculateCII";

export default function Section1Participation({ projectData }: { projectData?: any } = {}) {
    const { data, updateSection, getFieldError, validationErrors, nextStep, saveReport, isReadOnly, isParticipationUnlocked, setParticipationUnlocked, setRequiredHours } = useReportForm();

    const searchParams = useSearchParams();
    const projectIdFromUrl = searchParams.get('project') || searchParams.get('projectId') || data.project_id;

    const { participation_type, team_lead, team_members } = data.section1;
    // Extract available spots using all possible backend keys for the opportunity
    const maxTeamSize = projectData?.timeline?.volunteers_required || projectData?.volunteers_needed || projectData?.available_spots || 20;
    const requiredHoursPerStudent = projectData?.required_hours || projectData?.hours_requirement || projectData?.engagement_hours || 16;


    // Wizard State
    const [internalStep, setInternalStep] = React.useState(
        data.section1.verified_summary ? 4 : 1
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
    const [participantId, setParticipantId] = React.useState<string | null>(data.section1.team_lead.id || null);
    const isSubmittedReport = data.status === 'submitted' || data.status === 'verified' || data.status === 'partner_verified' || data.status === 'finalized';
    const [isSubmitted, setIsSubmitted] = React.useState(isSubmittedReport);
    const reviewChecked = data.section1.review_checked || [false, false, false];
    const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
    const [selectedParticipantId, setSelectedParticipantId] = React.useState<string | null>(null);
    const [isEditingLead, setIsEditingLead] = React.useState(false);
    const [leadStatus, setLeadStatus] = React.useState<string>('pending_approval');
    const [teamId, setTeamId] = React.useState<string>('');
    const [primaryFacultyEmail, setPrimaryFacultyEmail] = React.useState<string>('');

    // Scroll to Top on Step Change
    React.useEffect(() => {
        const workspace = document.querySelector('main');
        if (workspace) {
            workspace.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [internalStep]);

    // Hard Validation Gates
    const canMoveToStep2 = participation_type !== null && isVerified && (!!participantId || !!data.section1.team_lead.id);
    const canMoveToStep3 = isVerified && (!!participantId || !!data.section1.team_lead.id); // Self must be verified and have ID
    const canMoveToStep4 = participation_type === 'individual' ||
        (participation_type === 'team' && team_members.length > 0 && team_members.every(m => m.verified));
    const canMoveToStep5 = data.section1.attendance_logs.length > 0;

    const steps = [
        { id: 1, title: 'Identity & Team Setup' },
        { id: 2, title: 'Attendance Logging' },
        { id: 3, title: 'Review & Submit' },
        { id: 4, title: 'Metrics Dashboard' }
    ];

    const rawParticipants = [
        ...(isVerified || data.section1.team_lead.verified || participantId ? [{
            id: `lead:${participantId || data.section1.team_lead.id}`,
            name: ((data.section1.team_lead as any).fullName || (data.section1.team_lead as any).name || "Team Lead (Self)") as string,
            status: leadStatus
        }] : []),
        ...data.section1.team_members
            .map((m: any, idx: number) => ({
                id: `member:${idx}:${m.id || m.participantId || m.cnic || m.email || 'anon'}`,
                name: (m.fullName || m.name || m.email || `Student ${idx + 1}`) as string,
                verified: m.verified,
                status: m.status || (m.verified ? 'approved' : 'pending_approval')
            }))
    ];
    const participantNamesMap = Object.fromEntries(rawParticipants.map((u: any) => [u.id, u.name]));

    // Data Fetching
    React.useEffect(() => {
        if (projectIdFromUrl) {
            fetchInitialData();
            setRequiredHours(requiredHoursPerStudent);
        }
    }, [projectIdFromUrl, requiredHoursPerStudent]);
    
    // Sync context required hours if it changes from projectData
    React.useEffect(() => {
        if (requiredHoursPerStudent !== data.required_hours) {
            setRequiredHours(requiredHoursPerStudent);
        }
    }, [requiredHoursPerStudent]);


    // Sync selectedParticipantId when participantId is fetched
    React.useEffect(() => {
        if (participantId && !selectedParticipantId) {
            setSelectedParticipantId(participantId);
        }
    }, [participantId]);

    // Sync local states with context if context is updated from elsewhere
    React.useEffect(() => {
        if (data.section1.team_lead.id && !participantId) {
            setParticipantId(data.section1.team_lead.id);
        }
        if (data.section1.team_lead.verified && !isVerified) {
            setIsVerified(true);
        }
    }, [data.section1.team_lead.id, data.section1.team_lead.verified]);

    const fetchInitialData = async () => {
        try {
            // 1. Fetch Team Lead's Participant Record
            const partRes = await authenticatedFetch(`/api/v1/engagement/my`);
            if (partRes && partRes.ok) {
                const parts = await partRes.json();
                const myPart = parts.data.find((p: any) => p.projectId === projectIdFromUrl);

                if (myPart) {
                    setParticipantId(myPart.id);
                    setLeadStatus(myPart.status || 'pending_approval');
                    setIsVerified(true);
                    
                    // Update wizard step based on progress
                    if (['submitted', 'verified', 'finalized'].includes(myPart.status)) {
                        setInternalStep(4);
                        setIsSubmitted(true);
                    }

                    // Always refresh team_lead ID and name from the backend record
                    updateSection('section1', {
                        team_lead: {
                            ...data.section1.team_lead,
                            id: myPart.id,
                            verified: true,
                            name: myPart.fullName || myPart.name || myPart.studentName || data.section1.team_lead.name,
                            fullName: myPart.fullName || myPart.name || myPart.studentName || (data.section1.team_lead as any).fullName,
                            cnic: myPart.cnic || (data.section1.team_lead as any).cnic,
                            email: myPart.email || (data.section1.team_lead as any).email,
                            mobile: myPart.mobile || (data.section1.team_lead as any).mobile,
                            universityName: myPart.universityName || (data.section1.team_lead as any).universityName,
                            universityId: myPart.universityId || (data.section1.team_lead as any).universityId,
                            academicProgram: myPart.academicProgram || (data.section1.team_lead as any).academicProgram,
                            yearOfStudy: myPart.yearOfStudy || (data.section1.team_lead as any).yearOfStudy,
                            academicIntegrationType: myPart.academicIntegrationType || (data.section1.team_lead as any).academicIntegrationType
                        }
                    });

                    // Pull faculty + teamId from backend participation record
                    if (myPart.primaryFacultyEmail) setPrimaryFacultyEmail(myPart.primaryFacultyEmail);
                    if (myPart.teamId) setTeamId(myPart.teamId);

                    // 2. Fetch all team members for this project (Unified Table)
                    const teamRes = await authenticatedFetch(`/api/v1/engagement/project/${projectIdFromUrl}/team`);
                    if (teamRes && teamRes.ok) {
                        const teamData = await teamRes.json();
                        if (teamData.success && teamData.data) {
                            // Filter out the current user (lead) from team_members if returned in the same list
                            const otherMembers = teamData.data
                                .filter((m: any) => m.id !== myPart.id)
                                .map((m: any) => ({
                                    ...m,
                                    verified: true, // Backend entries in team endpoint are by definition verified participants
                                    name: m.fullName || m.name,
                                    university: m.universityName || m.university
                                }));

                            updateSection('section1', {
                                team_members: otherMembers,
                                participation_type: otherMembers.length > 0 ? 'team' : 'individual'
                            });
                        }
                    }

                    // 3. Fetch all logs using the unified loader
                    await loadAllEntries();
                }
            }
        } catch (err) {
            console.error("Error fetching initial dynamic data:", err);
        }
    };

    // Re-fetch logs whenever the team composition or verification status changes
    React.useEffect(() => {
        if (projectIdFromUrl && isVerified) {
            // Check if we need to re-fetch logs or sync team
            loadAllEntries();
        }
    }, [
        isVerified, 
        data.section1.team_members.length,
        data.section1.team_members.map((m: any) => m.verified).join(',')
    ]);

    const handleNext = () => {
        if (internalStep === 4) {
            updateSection('section1', {
                verified_summary: "Participation record finalized with HEC-compliant audit trail."
            });
            nextStep(); // Context next step
            return;
        }
        setInternalStep(prev => Math.min(prev + 1, 4));
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
                const teamSize = 1 + team_members.length;
                const calc = calculateEngagementMetrics(data.section1.attendance_logs, requiredHoursPerStudent, teamSize);

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
                setParticipationUnlocked(false); // Relock after submission

                // Persist completion state to report context
                updateSection('section1', {
                    verified_summary: "Participation record finalized with HEC-compliant audit trail.",
                    metrics: calc
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

        const entry = data.section1.attendance_logs.find((l: any) => l.id === entryId);
        const entryParticipantId = (entry as any)?.participantId || participantId;
        if (!entryParticipantId) return;

        // Strip prefix for API call
        const realId = entryParticipantId.includes(':') ? entryParticipantId.split(':').pop() : entryParticipantId;
        if (!realId) return;

        setIsDeleting(entryId);
        try {
            const res = await authenticatedFetch(`/api/v1/engagement/${realId}/attendance/${entryId}`, {
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


    const isRecordLocked = isSubmittedReport && !isParticipationUnlocked;

    // Helpers
    async function loadEntries(pId: string) {
        try {
            // Strip prefix for API call (e.g. member:0:ID -> ID)
            const realId = pId.includes(':') ? pId.split(':').pop() : pId;
            const res = await authenticatedFetch(`/api/v1/engagement/${realId}/attendance`);
            if (res && res.ok) {
                const result = await res.json();
                return (result.data || []).map((e: any) => ({
                    id: e.id,
                    date: e.dateOfEngagement || e.date,
                    start_time: e.startTime || e.start_time,
                    end_time: e.endTime || e.end_time,
                    location: e.organizationName || e.location,
                    activity_type: e.activityType || e.activity_type,
                    description: e.description,
                    hours: e.sessionHours || e.hours,
                    participantId: pId, // KEEP THE PREFIXED ID HERE for frontend isolation
                    entryStatus: e.entryStatus,
                    evidence_file: e.evidenceUrl || (e.evidenceUploaded ? true : undefined)
                }));
            }
        } catch (err) {
            console.error(`Error loading entries for ${pId}:`, err);
        }
        return [];
    }

    async function loadAllEntries() {
        try {
            const compoundIds = [
                ...(isVerified || data.section1.team_lead.verified || participantId ? [`lead:${participantId || data.section1.team_lead.id}`] : []).filter(id => !id.endsWith('undefined') && !id.endsWith('null') && id !== 'lead:'),
                ...data.section1.team_members.map((m: any, idx: number) => `member:${idx}:${m.id || m.participantId || m.cnic || m.email || 'anon'}`)
            ];

            const allLogsResults = await Promise.all(compoundIds.map(pId => loadEntries(pId)));
            const allLogs = allLogsResults.flat();
            
            // Deduplicate by Log ID to ensure that if the same 
            // record is returned for multiple people (e.g. sharing an ID), it doesn't duplicate the state.
            const uniqueLogs = Array.from(new Map(allLogs.map(l => [l.id || JSON.stringify(l), l])).values());

            updateSection('section1', { attendance_logs: uniqueLogs });

            // Recalculate metrics for UI update
            const teamSize = 1 + team_members.length;
            const calc = calculateEngagementMetrics(uniqueLogs, requiredHoursPerStudent, teamSize);

            setVerifiedMetrics({
                totalHours: calc.total_verified_hours,
                activeDays: calc.total_active_days,
                spanWeeks: Math.ceil(calc.engagement_span / 7),
                frequency: calc.attendance_frequency,
                weeklyContinuity: calc.weekly_continuity,
                eis: calc.eis_score,
                category: calc.engagement_category,
                hecStatus: calc.hec_compliance,
                evidenceCount: uniqueLogs.filter((l: any) => l.evidence_file).length,
                evidenceRatio: Math.round((uniqueLogs.filter((l: any) => l.evidence_file).length / (uniqueLogs.length || 1)) * 100)
            });
        } catch (err) {
            console.error("Error loading all entries:", err);
        }
    }



    const projectGoal = requiredHoursPerStudent * (1 + team_members.length);


    return (
        <div className="flex flex-col bg-slate-50/30">

            {/* Sticky Nav Progress */}
            <div className="bg-white border-b border-slate-100 px-8 py-4 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                    {steps.map((s, idx) => (
                        <React.Fragment key={s.id}>
                            <button
                                onClick={() => internalStep > s.id && setInternalStep(s.id)}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                                    internalStep === s.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" :
                                        internalStep > s.id ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <span className={clsx(
                                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                                    internalStep === s.id ? "bg-white/20" : "bg-slate-100"
                                )}>{s.id}</span>
                                {s.title}
                            </button>
                            {idx < steps.length - 1 && <div className="w-8 h-[1px] bg-slate-100 shrink-0" />}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Scrollable Content Workspace */}
            <main className="px-8 py-10">
                <div className="max-w-6xl mx-auto space-y-10">
                    {internalStep === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-1 mb-8">
                                <h3 className="text-xl font-bold text-slate-900">STEP 1 — Participation</h3>
                                <p className="text-sm text-slate-500">Configure identity and team members for this engagement report</p>
                            </div>

                            {/* 1. Identity Verification Accordion */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-slate-800">Identity Verification</h4>
                                    </div>
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                </div>

                                <div className="px-6 pb-6">
                                    {(isVerified && !isEditingLead) ? (
                                        <div className="rounded-2xl border border-emerald-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
                                            <div className="p-5 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                                        <div className="relative">
                                                            <User className="w-6 h-6" />
                                                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white">
                                                                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-base font-bold text-slate-800">
                                                                {(data.section1.team_lead as any).fullName || (data.section1.team_lead as any).name || "Team Lead"}
                                                            </h4>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="bg-emerald-500 rounded-full p-0.5">
                                                                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Verified</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-medium">
                                                            {(data.section1.team_lead as any).university || (data.section1.team_lead as any).universityName || "Academic Record Linked"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setIsEditingLead(true)}
                                                        className="h-8 px-4 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                                                    >
                                                        Edit Academic
                                                    </button>
                                                    {!participantId && (
                                                        <button
                                                            onClick={async () => {
                                                                setIsLoadingMetrics(true);
                                                                await fetchInitialData();
                                                                setIsLoadingMetrics(false);
                                                            }}
                                                            disabled={isLoadingMetrics}
                                                            className="h-8 px-4 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-colors disabled:opacity-50"
                                                        >
                                                            {isLoadingMetrics ? "Syncing..." : "Sync record"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <IdentityVerification
                                            projectId={data.project_id || projectIdFromUrl || ""}
                                            participationMode={participation_type as any}
                                            initialData={team_lead}
                                            isTeamLead={true}
                                            onSuccess={(p) => {
                                                setIsVerified(true);
                                                setIsEditingLead(false);
                                                setParticipantId(p.id);
                                                updateSection('section1', {
                                                    team_lead: {
                                                        ...team_lead,
                                                        ...p,
                                                        verified: true,
                                                        university: p.universityName,
                                                        degree: p.academicProgram,
                                                        year: p.yearOfStudy,
                                                        name: p.fullName
                                                    }
                                                });
                                                toast.success('Identity updated successfully!');
                                            }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* 2. Team Members Accordion */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <Users className="w-5 h-5 text-report-primary" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-slate-800">Team Members</h4>
                                    </div>
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                </div>                            <div className="px-6 pb-6 pt-2">
                                    <TeamVerification
                                        projectId={data.project_id || projectIdFromUrl || ""}
                                        members={team_members}
                                        isLocked={isRecordLocked}
                                        onUpdateMembers={async (newMembers) => {
                                            const newType = newMembers.length > 0 ? 'team' : 'individual';
                                            updateSection('section1', {
                                                team_members: newMembers,
                                                participation_type: newType
                                            });

                                            const hasVerified = newMembers.some((m: any) => m.verified && m.id);
                                            if (hasVerified) {
                                                try {
                                                    const projectId = data.project_id || projectIdFromUrl || '';
                                                    if (projectId) {
                                                        await authenticatedFetch(`/api/v1/student/reports/draft`, {
                                                            method: 'POST',
                                                            body: JSON.stringify({
                                                                ...data,
                                                                project_id: projectId,
                                                                section1: {
                                                                    ...data.section1,
                                                                    team_members: newMembers,
                                                                    participation_type: newType
                                                                },
                                                                status: 'continue'
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
                            </div>
                        </div>
                    )}                    {internalStep === 2 && (() => {
                        return (
                            <div className="space-y-8">

                                <div className="flex items-center justify-between mb-2">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-slate-900">STEP 2: ATTENDANCE LOGGING</h3>
                                        <p className="text-sm text-slate-500">Record and verify your engagement hours for HEC audit trails</p>
                                    </div>
                                    <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Gateway Active: Hours must be at least equal to the required goal for each student to successfully meet the community engagement requirement.</span>
                                    </div>
                                </div>

                                {/* Engagement Hours Summary Dashboard */}
                                <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                    {/* Level 1: Overall Project Context */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[
                                            {
                                                label: "Project Goal",
                                                value: projectGoal,
                                                sub: "Required Institutional Hours",
                                                color: "bg-slate-50 border-slate-100 text-slate-900",
                                                icon: Shield
                                            },
                                            {
                                                label: "Collective Hours",
                                                value: data.section1.attendance_logs.reduce((acc: number, log: any) => acc + (Number(log.hours) || 0), 0),
                                                sub: "Total Project Engagement",
                                                color: "bg-slate-50 border-slate-100 text-slate-600",
                                                icon: Users
                                            },
                                            {
                                                label: "Team Compliance",
                                                value: `${Math.round((data.section1.attendance_logs.reduce((acc: number, log: any) => acc + (Number(log.hours) || 0), 0) / projectGoal) * 100)}%`,
                                                sub: "Aggregated Progress",
                                                color: "bg-slate-50 border-slate-100 text-slate-600",
                                                icon: Activity
                                            }
                                        ].map((stat, i) => (
                                            <div key={i} className={clsx("p-6 rounded-[2rem] border shadow-sm flex items-center gap-5 transition-all hover:bg-white", stat.color)}>
                                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                                    <stat.icon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <span className="report-label !opacity-60">{stat.label}</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-2xl font-black tabular-nums tracking-tight">{stat.value}</span>
                                                        {stat.label !== "Team Compliance" && <span className="text-[10px] font-bold opacity-50">HRS</span>}
                                                    </div>
                                                    <p className="report-label !text-[9px] !opacity-40 !mt-1">{stat.sub}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Level 2: Student Specific Tracking */}
                                    {selectedParticipantId && (
                                        <div className="p-10 bg-report-primary-soft/30 rounded-[3rem] border-2 border-report-primary-border/30 relative overflow-hidden group/userbase">
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover/userbase:opacity-[0.07] transition-opacity">
                                                <Award className="w-32 h-32 rotate-12" />
                                            </div>

                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-lg shadow-report-primary-shadow">
                                                            <User className="w-5 h-5" />
                                                        </div>
                                                        <h4 className="text-lg font-black text-slate-900 tracking-tight">
                                                            Personal Tracking: 
                                                            <span className="text-report-primary ml-2">
                                                                {(() => {
                                                                    const lookupUsers = rawParticipants;
                                                                    return lookupUsers.find((u: any) => u.id === selectedParticipantId)?.name || "Selected Student";
                                                                })()}
                                                            </span>
                                                        </h4>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-13">Individual Contribution Metrics</p>
                                                </div>

                                                <div className="flex gap-8">
                                                    {[
                                                        {
                                                            label: "Logged",
                                                            val: data.section1.attendance_logs
                                                                .filter((l: any) => {
                                                                    if (!selectedParticipantId) return true;
                                                                    const logRealId = l.participantId?.includes(':') ? l.participantId.split(':').pop() : l.participantId;
                                                                    const selRealId = selectedParticipantId?.includes(':') ? selectedParticipantId.split(':').pop() : selectedParticipantId;
                                                                    return logRealId === selRealId;
                                                                })
                                                                .reduce((acc: number, log: any) => acc + (Number(log.hours) || 0), 0),
                                                            color: "text-report-primary"
                                                        },
                                                        {
                                                            label: "Remaining",
                                                            val: Math.max(0, requiredHoursPerStudent - data.section1.attendance_logs
                                                                .filter((l: any) => {
                                                                    if (!selectedParticipantId) return true;
                                                                    const logRealId = l.participantId?.includes(':') ? l.participantId.split(':').pop() : l.participantId;
                                                                    const selRealId = selectedParticipantId?.includes(':') ? selectedParticipantId.split(':').pop() : selectedParticipantId;
                                                                    return logRealId === selRealId;
                                                                })
                                                                .reduce((acc: number, log: any) => acc + (Number(log.hours) || 0), 0)),
                                                            color: "text-amber-600"
                                                        }
                                                    ]
.map((m, i) => (
                                                        <div key={i} className="text-center">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
                                                            <div className="flex items-baseline justify-center gap-1">
                                                                <span className={clsx("text-3xl font-black tabular-nums", m.color)}>{m.val}</span>
                                                                <span className="text-[10px] font-bold text-slate-300">HRS</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
                                    <div className="space-y-8">
                                        <div className="p-1 bg-slate-100 rounded-2xl flex">
                                            <button className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-white text-report-primary rounded-xl shadow-sm">New Entry</button>
                                            <button className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Bulk Import</button>
                                        </div>

                                        <AttendanceForm
                                            verifiedUsers={rawParticipants}
                                            onSuccess={() => loadAllEntries()}
                                            selectedParticipantId={selectedParticipantId}
                                            onParticipantChange={setSelectedParticipantId}
                                            isLocked={isRecordLocked}
                                            isParticipationUnlocked={isParticipationUnlocked}
                                            setParticipationUnlocked={setParticipationUnlocked}
                                        />
                                    </div>
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-x-auto">
                                            <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <h4 className="report-h3 !flex items-center gap-2 !mb-0 text-slate-900 font-black">
                                                        <Clock className="w-5 h-5 text-report-primary" /> Logged Sessions
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-7">
                                                        {selectedParticipantId ? `Filtered by: ${rawParticipants.find(u => u.id === selectedParticipantId)?.name || 'Self'}` : 'Showing records for all verified team members'}
                                                    </p>
                                                </div>
                                                        <span className="bg-white px-4 py-1.5 rounded-full border border-slate-100 text-[10px] font-black uppercase tracking-widest text-report-primary shadow-sm">
                                                            {data.section1.attendance_logs.filter((log: any) => {
                                                                if (!selectedParticipantId) return true;
                                                                const logRealId = log.participantId?.includes(':') ? log.participantId.split(':').pop() : log.participantId;
                                                                const selRealId = selectedParticipantId?.includes(':') ? selectedParticipantId.split(':').pop() : selectedParticipantId;
                                                                return logRealId === selRealId;
                                                            }).length} Records
                                                        </span>
                                                    </div>
                                                    <AttendanceSummaryTable
                                                        entries={data.section1.attendance_logs.filter((log: any) => {
                                                            if (!selectedParticipantId) return true;
                                                            const logRealId = log.participantId?.includes(':') ? log.participantId.split(':').pop() : log.participantId;
                                                            const selRealId = selectedParticipantId?.includes(':') ? selectedParticipantId.split(':').pop() : selectedParticipantId;
                                                            return logRealId === selRealId;
                                                        })}
                                                    participantNames={participantNamesMap}
                                                    onDelete={handleDeleteEntry}
                                                    isLocked={isRecordLocked}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                        );
                    })()}


                    {internalStep === 3 && (
                        <div className="max-w-2xl mx-auto space-y-10 py-10">

                            {/* HEADER */}
                            <div className="text-center space-y-4">

                                <div className="w-16 h-16 bg-report-primary text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
                                    <Shield className="w-8 h-8" />
                                </div>

                                <h2 className="text-2xl font-semibold text-slate-900">
                                    Final Verification & Submission
                                </h2>

                                <p className="text-sm text-slate-500">
                                    Please review all information carefully before submitting the final report.
                                </p>

                            </div>



                            <div className="space-y-6">

                                {/* WARNING CARD */}
                                <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 space-y-3">

                                    <div className="flex items-center gap-3 text-amber-800">

                                        <AlertCircle className="w-5 h-5 shrink-0" />

                                        <h4 className="text-base font-semibold text-amber-800">
                                            Permanent Record Lock
                                        </h4>

                                    </div>

                                    <p className="text-sm text-amber-700 leading-relaxed">

                                        By submitting this report, all participation records will become
                                        <strong className="font-semibold"> permanently locked </strong>
                                        and no further edits will be allowed. Any inaccuracies will be reflected
                                        in your official HEC verification record.

                                    </p>

                                </div>



                                {/* CHECKLIST CARD */}
                                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">

                                    <div className="space-y-4">

                                        {[
                                            'I verify that all session entries are authentic.',
                                            'I understand that no further edits are possible after submission.',
                                            'I consent to institutional report sharing.'
                                        ].map((check, i) => (

                                            <label
                                                key={i}
                                                className="flex items-start gap-3 p-4 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                                            >

                                                <input
                                                    type="checkbox"
                                                    checked={reviewChecked[i]}
                                                    onChange={() => {
                                                        const newChecked = [...reviewChecked];
                                                        newChecked[i] = !newChecked[i];

                                                        updateSection('section1', {
                                                            review_checked: newChecked
                                                        });
                                                    }}
                                                    className="mt-1 w-5 h-5 rounded border border-slate-300 text-report-primary focus:ring-report-primary cursor-pointer"
                                                />

                                                <span className="text-sm text-slate-600 leading-relaxed">
                                                    {check}
                                                </span>

                                            </label>

                                        ))}

                                    </div>

                                </div>

                            </div>

                        </div>

                    )}

                    {/* Metrics Dashboard (now step 4) */}
                    {internalStep === 4 && (
                        <div className="space-y-10 animate-in fade-in duration-500">

                            {verifiedMetrics ? (

                                <div className="animate-in slide-in-from-bottom-4 duration-500">

                                    <EngagementOverview
                                        metrics={{ 
                                            ...verifiedMetrics, 
                                            projectGoal, 
                                            requiredHours: requiredHoursPerStudent,
                                            individual_metrics: data.section1.metrics.individual_metrics
                                        }}
                                        isTeam={participation_type === 'team'}
                                        participantNames={participantNamesMap}
                                    />


                                </div>

                            ) : (

                                <div className="py-28 text-center space-y-6 bg-white rounded-xl border border-slate-200 shadow-sm">

                                    {/* Loader */}
                                    <div className="relative flex justify-center">

                                        <div className="absolute w-16 h-16 bg-indigo-50 rounded-full blur-lg opacity-50"></div>

                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin relative z-10" />

                                    </div>


                                    {/* Text */}
                                    <div className="space-y-2">

                                        <p className="text-lg font-semibold text-slate-800">
                                            Generating Intensity Analytics
                                        </p>

                                        <p className="text-sm text-slate-500 max-w-[320px] mx-auto leading-relaxed">
                                            Calculating engagement intensity scores and verifying HEC compliance status for your submission record.
                                        </p>

                                    </div>


                                    {/* Return Button */}
                                    {!isSubmitted && (

                                        <Button
                                            variant="outline"
                                            onClick={() => setInternalStep(3)}
                                            className="rounded-lg border border-indigo-200 text-indigo-600 font-semibold px-6 hover:bg-indigo-50 transition"
                                        >

                                            Return to Review & Submit

                                        </Button>

                                    )}

                                </div>

                            )}

                        </div>

                    )}
                </div>
            </main>

            {/* Sticky Bottom Footer */}
            <div className="bg-white border-t border-slate-100 px-8 py-6 flex justify-between items-center mt-auto">
                <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={internalStep === 1}
                    className="rounded-xl h-12 px-8 font-bold text-slate-600 border-slate-200 hover:bg-slate-50 transition-all"
                >
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={() => saveReport(false)}
                        className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl h-12 px-8 font-bold flex items-center gap-2 transition-all shadow-sm"
                    >
                        <Save className="w-4 h-4 text-slate-400" /> Save Draft
                    </Button>

                    {internalStep < 4 ? (
                        <div className="flex gap-4">
                            {internalStep === 3 && (
                                <Button
                                    onClick={handleFinalSubmit}
                                    disabled={!reviewChecked.every(Boolean) || isLoadingMetrics}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-10 font-bold shadow-lg shadow-indigo-200 transition-all"
                                >
                                    {isLoadingMetrics ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Finalize & Generate Record <Lock className="w-4 h-4 ml-2" />
                                </Button>
                            )}
                            <Button
                                onClick={handleNext}
                                disabled={internalStep === 1 && !isVerified}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-10 font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                            >
                                {internalStep === 3 ? "Skip Submission & Continue" : "Continue"} <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={handleNext}
                            className="bg-slate-900 hover:bg-black text-white rounded-xl h-12 px-10 font-bold shadow-lg transition-all flex items-center gap-2"
                        >
                            Save & Continue to Next Section <ChevronRight className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
