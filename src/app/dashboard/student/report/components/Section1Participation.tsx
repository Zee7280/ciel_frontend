import React from "react";
import { Users, User, UserPlus, Trash2, Shield, Info, AlertCircle, Clock, CheckCircle2, Loader2, Zap, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Save, Lock, Unlock, PlusCircle, Activity } from "lucide-react";
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
import { prepareReportEvidenceForSave } from "../utils/evidenceUpload";
import { formTeamFromLead } from "@/utils/participationGuide";
import { buildIndividualRosterFromSection1, calculateEngagementMetrics, effectiveHoursFromLog } from "../utils/engagementMetrics";
import { isAttendanceLogCountedForVerifiedMetrics } from "@/utils/attendanceApprovalEligibility";
import { normalizeEngagementAttendanceLog } from "@/utils/engagementAttendanceMap";
import { calculateSection1CII } from "@/utils/reportQuality";
import { calculateCII } from "../utils/calculateCII";
import { resolveScopedTeamMembers } from "@/utils/reportTeamScope";
import { effectiveParticipationStatusForReportActions } from "@/utils/studentJoinApplication";
import { resolveAttendanceSubmitError } from "@/utils/attendanceSubmitError";
import Section1AnalyticsPanel from "@/components/analytics/Section1AnalyticsPanel";
import { fetchSection1Analytics } from "@/utils/section1Analytics";
import {
    participationAttendanceVerificationRequested,
    resolveStudentAdminAttendanceUnlock,
} from "@/utils/adminEnrollmentAttendance";
import {
    opportunityHasPartner,
    type AttendanceApproverType,
} from "@/utils/attendanceApproverRouting";

/** Copy for verify-attendance UX: student picks faculty or partner after the oath. */
const ATTENDANCE_VERIFICATION_INFO = {
    lockNote:
        "One-time step: after you confirm, attendance stays locked until approval is complete.",
    routing:
        "After the oath in Step 3, choose whether Faculty or Partner should approve your attendance. Pending requests appear on that reviewer’s dashboard.",
    confirmBody:
        "Your attendance entries will lock for editing and go to the reviewer you selected (Faculty or Partner).",
    afterSent:
        "Attendance is locked until a reviewer completes approval.",
    afterSentWho:
        "Your selected Faculty or Partner reviewer has been notified and will see a pending attendance item on their dashboard.",
    step2Hint:
        "When every student has met the minimum hours, go to Step 3 (Review & submit), complete the oath, choose Faculty or Partner approval, then use Verify attendance (one time).",
} as const;

/** Align dropdown ids (`lead:uuid`, `member:0:…`) with API `participantId` (bare uuid/key). */
function engagementParticipantCompareKey(id: string | undefined | null): string {
    if (!id) return "";
    if (id.startsWith("lead:")) return id.slice("lead:".length);
    const m = /^member:\d+:(.+)$/.exec(id);
    if (m?.[1]) return m[1];
    return id;
}

function engagementParticipantIdsMatch(a: string | undefined | null, b: string | undefined | null): boolean {
    if (!a || !b) return false;
    if (a === b) return true;
    return engagementParticipantCompareKey(a) === engagementParticipantCompareKey(b);
}

/** Participation row ids for the signed-in student (team lead or member). */
function selfParticipantRealIds(
    currentUserEmail: string | null,
    teamLead: Record<string, unknown>,
    teamMembers: unknown[],
    leadParticipantId: string | null,
): string[] {
    if (!currentUserEmail) return [];
    const email = currentUserEmail.trim().toLowerCase();
    const ids: string[] = [];
    const leadEmail = typeof teamLead.email === "string" ? teamLead.email.trim().toLowerCase() : "";
    if (leadEmail && leadEmail === email) {
        const leadId = leadParticipantId || teamLead.id || teamLead.participantId;
        if (leadId != null && String(leadId)) ids.push(String(leadId));
    }
    if (Array.isArray(teamMembers)) {
        teamMembers.forEach((m) => {
            if (!m || typeof m !== "object") return;
            const row = m as Record<string, unknown>;
            const rowEmail = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
            if (rowEmail && rowEmail === email) {
                const mid = row.participantId ?? row.id;
                if (mid != null && String(mid)) ids.push(String(mid));
            }
        });
    }
    return ids;
}

function canDeleteAttendanceEntry(
    entry: { participantId?: string | null },
    selfIds: string[],
    currentUserEmail: string | null,
): boolean {
    if (currentUserEmail && selfIds.length === 0) return false;
    if (!entry?.participantId || selfIds.length === 0) return true;
    return selfIds.some((sid) => engagementParticipantIdsMatch(entry.participantId, sid));
}

function memberRowPrefixedId(m: any, idx: number): string {
    return `member:${idx}:${m?.id || m?.participantId || m?.cnic || m?.email || "anon"}`;
}

function pickFacultyEmail(record: unknown, keys: string[]): string {
    if (!record || typeof record !== "object") return "";
    const source = record as Record<string, unknown>;
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function readFacultyEmails(...records: unknown[]): { primary: string; secondary: string } {
    for (const record of records) {
        const primary = pickFacultyEmail(record, [
            "primaryFacultyEmail",
            "primary_faculty_email",
            "facultyEmail",
            "faculty_email",
        ]);
        const secondary = pickFacultyEmail(record, [
            "secondaryFacultyEmail",
            "secondary_faculty_email",
        ]);

        if (primary || secondary) {
            return { primary, secondary };
        }
    }

    return { primary: "", secondary: "" };
}

function pickTeamId(record: unknown): string {
    if (!record || typeof record !== "object") return "";
    const source = record as Record<string, unknown>;
    const value = source.teamId ?? source.team_id;
    if (typeof value === "string") return value.trim();
    if (value != null && (typeof value === "number" || typeof value === "boolean")) return String(value).trim();
    return "";
}

/** Resolve API `participantId` to the same prefixed ids used in the participant dropdown. */
function resolveAttendanceLogParticipantPrefixedId(
    realId: string,
    rawParticipants: { id: string }[],
    resolvedLeadId: string | null,
    teamMembers: any[],
): string {
    if (!realId) return realId;
    const match = rawParticipants.find(
        (p) =>
            p.id === realId ||
            p.id.endsWith(realId) ||
            engagementParticipantIdsMatch(p.id, realId),
    );
    if (match) return match.id;
    if (resolvedLeadId && realId === resolvedLeadId) {
        return `lead:${resolvedLeadId}`;
    }
    for (let idx = 0; idx < teamMembers.length; idx++) {
        const m = teamMembers[idx];
        if (!m) continue;
        const keys = [m.id, m.participantId].filter(Boolean).map(String);
        if (keys.some((k) => k === realId) || keys.some((k) => engagementParticipantIdsMatch(k, realId))) {
            return memberRowPrefixedId(m, idx);
        }
    }
    return realId;
}

export default function Section1Participation({ projectData }: { projectData?: any } = {}) {
    const {
        data,
        updateSection,
        getFieldError,
        validationErrors,
        nextStep,
        saveReport,
        isReadOnly,
        isTeamMemberAttendanceOnly,
        isParticipationUnlocked,
        setParticipationUnlocked,
        setRequiredHours,
        myParticipationIsTeamLead,
    } = useReportForm();

    const searchParams = useSearchParams();
    // Use search params primarily for initialization to prevent context-update loops
    const queryProjectId = searchParams.get('project') || searchParams.get('projectId');
    const projectIdFromUrl = queryProjectId || data.project_id;

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
            sessionCount: data.section1.metrics.verified_session_count,
            eis: data.section1.metrics.eis_score,
            activeDays: data.section1.metrics.total_active_days,
            spanWeeks: Math.ceil(data.section1.metrics.engagement_span / 7),
            frequency: data.section1.metrics.attendance_frequency,
            weeklyContinuity: data.section1.metrics.weekly_continuity,
            category: data.section1.metrics.engagement_category,
            hecStatus: data.section1.metrics.hec_compliance,
            individual_metrics: data.section1.metrics.individual_metrics,
        } : null
    );
    const [verifiedSummary, setVerifiedSummary] = React.useState<string>(data.section1.verified_summary || "");
    const isSubmittedReport = data.status === 'submitted' || data.status === 'verified' || data.status === 'partner_verified' || data.status === 'finalized';
    const [isSubmitted, setIsSubmitted] = React.useState(isSubmittedReport);
    const reviewChecked = data.section1.review_checked || [false, false, false];
    const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
    const [isRequestingAttendanceVerification, setIsRequestingAttendanceVerification] = React.useState(false);
    const [attendanceApproverChoice, setAttendanceApproverChoice] =
        React.useState<AttendanceApproverType | "">(() => {
            const stored = (data.section1 as { attendance_approver_type?: string })
                ?.attendance_approver_type;
            return stored === "faculty" || stored === "partner" ? stored : "";
        });
    const [facultyApproverEmail, setFacultyApproverEmail] = React.useState(() => {
        const stored = (data.section1 as { attendance_faculty_email?: string })
            ?.attendance_faculty_email;
        return typeof stored === "string" ? stored.trim() : "";
    });
    const [selectedParticipantId, setSelectedParticipantId] = React.useState<string | null>(null);
    const [isEditingLead, setIsEditingLead] = React.useState(false);
    const [leadStatus, setLeadStatus] = React.useState<string>('pending_approval');
    const [isVerified, setIsVerified] = React.useState(!!data.section1.team_lead.verified);
    const [participantId, setParticipantId] = React.useState<string | null>(data.section1.team_lead.id || null);
    const [currentUserEmail, setCurrentUserEmail] = React.useState<string | null>(null);
    const [isLeavingTeam, setIsLeavingTeam] = React.useState(false);
    const [myParticipationVerificationRequested, setMyParticipationVerificationRequested] =
        React.useState(false);

    const applyAdminParticipationUnlock = React.useCallback(() => {
        setParticipationUnlocked(true);
        setMyParticipationVerificationRequested(false);
        const section1 = data.section1 as Record<string, unknown>;
        if (
            section1.attendance_verification_requested_at ||
            section1.attendanceVerificationRequestedAt ||
            section1.attendance_verification_locked === true
        ) {
            updateSection("section1", {
                attendance_verification_requested_at: null,
                attendance_verification_locked: false,
                attendance_verification_status: null,
            });
        }
    }, [data.section1, setParticipationUnlocked, updateSection]);

    const syncParticipationAttendanceFlags = React.useCallback(
        (myPart: Record<string, unknown>, teamRows?: unknown[] | null) => {
            const adminUnlocked = resolveStudentAdminAttendanceUnlock(myPart, teamRows);
            if (adminUnlocked) {
                applyAdminParticipationUnlock();
                return;
            }
            setMyParticipationVerificationRequested(
                participationAttendanceVerificationRequested(myPart),
            );
        },
        [applyAdminParticipationUnlock],
    );

    React.useEffect(() => {
        if (!isTeamMemberAttendanceOnly) return;
        // Teammates skip identity/submit wizard steps and land on attendance logging.
        if (internalStep === 1 || internalStep === 3) {
            setInternalStep(2);
            return;
        }
        // Metrics dashboard is lead-only until finalized; teammates stay on attendance.
        if (internalStep === 4 && !verifiedMetrics && !isSubmittedReport) {
            setInternalStep(2);
        }
    }, [isTeamMemberAttendanceOnly, internalStep, verifiedMetrics, isSubmittedReport]);

    /** When CIEL admin enabled attendance override, unlock Section 1 logging for this project. */
    React.useEffect(() => {
        if (!projectIdFromUrl || isReadOnly) return;
        let cancelled = false;

        const applyAdminUnlock = () => {
            applyAdminParticipationUnlock();
        };

        void (async () => {
            try {
                const payload = await fetchSection1Analytics(
                    `/api/v1/student/projects/${encodeURIComponent(projectIdFromUrl)}/section1-analytics`,
                );
                if (cancelled || !payload?.fields) return;
                const unlock = payload.fields.attendance_logging_unlock_status;
                if (
                    unlock &&
                    typeof unlock === "object" &&
                    (unlock as Record<string, unknown>).admin_override === true &&
                    (unlock as Record<string, unknown>).unlocked === true
                ) {
                    applyAdminUnlock();
                }
            } catch {
                /* non-fatal */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [projectIdFromUrl, isReadOnly, applyAdminParticipationUnlock]);

    // Identify current user for labeling
    React.useEffect(() => {
        const storedUser = localStorage.getItem("user") || localStorage.getItem("ciel_user");
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                const email = u?.email || u?.Email;
                if (email) setCurrentUserEmail(email);
            } catch (e) { }
        }
    }, []);

    const projectRecord =
        projectData && typeof projectData === "object"
            ? (projectData as Record<string, unknown>)
            : null;
    const effectiveLeadStatus = effectiveParticipationStatusForReportActions(leadStatus, projectRecord);

    const rawParticipants = React.useMemo(() => [
        ...(isVerified || data.section1.team_lead.verified || participantId ? [{
            id: `lead:${participantId || data.section1.team_lead.id}`,
            name: `${((data.section1.team_lead as any).fullName || (data.section1.team_lead as any).name || "Team Lead")}${((data.section1.team_lead as any).email === currentUserEmail) ? ' (Self)' : ''}`,
            status: effectiveLeadStatus,
            email: (data.section1.team_lead as any).email
        }] : []),
        ...data.section1.team_members
            .map((m: any, idx: number) => ({
                id: `member:${idx}:${m.id || m.participantId || m.cnic || m.email || 'anon'}`,
                name: `${(m.fullName || m.name || m.email || `Student ${idx + 1}`)}${(m.email === currentUserEmail) ? ' (Self)' : ''}`,
                verified: m.verified,
                status: effectiveParticipationStatusForReportActions(
                    m.status || (m.verified ? 'approved' : 'pending_approval'),
                    projectRecord,
                ),
                email: m.email
            }))
    ], [isVerified, participantId, data.section1.team_lead, data.section1.team_members, currentUserEmail, effectiveLeadStatus, projectRecord]);

    const [hasSelectedInitial, setHasSelectedInitial] = React.useState(false);

    // Auto-select "Self" record ONCE initially
    React.useEffect(() => {
        if (!hasSelectedInitial && currentUserEmail && rawParticipants.length > 0) {
            const selfRecord = rawParticipants.find(p => p.email === currentUserEmail);
            if (selfRecord) {
                console.log(`[Identity] Initial Sync: Defaulting to 'Self' (${selfRecord.id})`);
                setSelectedParticipantId(selfRecord.id);
                setHasSelectedInitial(true); // Mark as done to avoid overriding manual selection
            }
        }
    }, [currentUserEmail, rawParticipants, hasSelectedInitial, selectedParticipantId]);
    const [teamId, setTeamId] = React.useState<string>('');
    const [primaryFacultyEmail, setPrimaryFacultyEmail] = React.useState<string>('');
    const [secondaryFacultyEmail, setSecondaryFacultyEmail] = React.useState<string>('');

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

    const participantNamesMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        for (const u of rawParticipants) {
            const name = String((u as { name?: string }).name || "").trim() || "Participant";
            map[u.id] = name;
            const bare = engagementParticipantCompareKey(u.id);
            if (bare && bare !== u.id) map[bare] = name;
        }
        return map;
    }, [rawParticipants]);

    const isFetchingRef = React.useRef(false);

    // Data Fetching - Initialization ONLY when project ID in URL changes
    React.useEffect(() => {
        if (queryProjectId) {
            console.log("[Identity] Initializing data for project:", queryProjectId);
            fetchInitialData();
            setRequiredHours(requiredHoursPerStudent);
        }
    }, [queryProjectId]);
    
    // Sync context required hours if it changes from projectData
    React.useEffect(() => {
        if (requiredHoursPerStudent !== data.required_hours) {
            setRequiredHours(requiredHoursPerStudent);
        }
    }, [requiredHoursPerStudent]);


    // Sync selectedParticipantId when participantId is fetched
    React.useEffect(() => {
        if (participantId && !selectedParticipantId) {
            setSelectedParticipantId(`lead:${participantId || data.section1.team_lead.id}`);
        }
    }, [participantId, data.section1.team_lead.id]);


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
        if (!queryProjectId || isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            // 1. Fetch Team Lead's Participant Record
            const partRes = await authenticatedFetch(`/api/v1/engagement/my`);
            if (partRes && partRes.ok) {
                const parts = await partRes.json();
                console.log("[Identity] Found my records:", parts.data.map((p: any) => `${p.projectId}: ${p.id} (${p.email})`));
                const myPart = parts.data.find(
                    (p: any) =>
                        p.projectId === projectIdFromUrl || p.project_id === projectIdFromUrl,
                );

                if (myPart) {
                    console.log(`[Identity] Syncing correct ID for this project: ${myPart.id}`);
                    const myPartIsTeamLead =
                        myPart.isTeamLead === true ||
                        myPart.is_team_lead === true ||
                        String(myPart.is_team_lead ?? "").toLowerCase() === "true";

                    setParticipantId(myPart.id);
                    setSelectedParticipantId(
                        myPartIsTeamLead ? `lead:${myPart.id}` : `member:0:${myPart.id}`,
                    );

                    setLeadStatus(
                        effectiveParticipationStatusForReportActions(
                            myPart.status || 'pending_approval',
                            projectRecord,
                        ),
                    );
                    setIsVerified(true);
                    syncParticipationAttendanceFlags(myPart);

                    // Update wizard step based on progress
                    if (['submitted', 'verified', 'finalized'].includes(myPart.status)) {
                        setInternalStep(4);
                        setIsSubmitted(true);
                    }

                    if (myPartIsTeamLead) {
                        const tlLead = data.section1.team_lead as Record<string, unknown>;
                        const partCnicDigits = String(myPart?.cnic ?? "")
                            .replace(/\D/g, "")
                            .slice(0, 13);
                        const leadCnicDigits = String(tlLead?.cnic ?? "")
                            .replace(/\D/g, "")
                            .slice(0, 13);
                        const resolvedLeadCnic =
                            partCnicDigits.length === 13
                                ? partCnicDigits
                                : leadCnicDigits.length === 13
                                  ? leadCnicDigits
                                  : partCnicDigits || leadCnicDigits || String(myPart.cnic ?? tlLead.cnic ?? "");

                        updateSection('section1', {
                            team_lead: {
                                ...data.section1.team_lead,
                                id: myPart.id,
                                verified: true,
                                name: myPart.fullName || myPart.name || myPart.studentName || data.section1.team_lead.name,
                                fullName: myPart.fullName || myPart.name || myPart.studentName || (data.section1.team_lead as any).fullName,
                                cnic: resolvedLeadCnic,
                                email: myPart.email || (data.section1.team_lead as any).email,
                                mobile: myPart.mobile || (data.section1.team_lead as any).mobile,
                                universityName: myPart.universityName || (data.section1.team_lead as any).universityName,
                                universityId: myPart.universityId || (data.section1.team_lead as any).universityId,
                                academicProgram: myPart.academicProgram || (data.section1.team_lead as any).academicProgram,
                                yearOfStudy: myPart.yearOfStudy || (data.section1.team_lead as any).yearOfStudy,
                                academicIntegrationType: myPart.academicIntegrationType || (data.section1.team_lead as any).academicIntegrationType
                            }
                        });
                    }

                    // Pull faculty + teamId from backend participation record
                    const myPartFaculty = readFacultyEmails(myPart);
                    if (myPartFaculty.primary) setPrimaryFacultyEmail(myPartFaculty.primary);
                    if (myPartFaculty.secondary) setSecondaryFacultyEmail(myPartFaculty.secondary);
                    const myPartTeamId = pickTeamId(myPart);
                    if (myPartTeamId) setTeamId(myPartTeamId);

                    // 2. Fetch all team members for this project (Unified Table)
                    let scopedTeamForAttendance: any[] | undefined;
                    const teamRes = await authenticatedFetch(`/api/v1/engagement/project/${projectIdFromUrl}/team`);
                    if (teamRes && teamRes.ok) {
                        const teamData = await teamRes.json();
                        if (teamData.success && teamData.data) {
                            const teamRows = Array.isArray(teamData.data) ? teamData.data : [];
                            const { team_members: scopedMembers, participation_type: scopedMode } =
                                resolveScopedTeamMembers(myPart, teamRows);
                            const leadTeamRow = teamRows.find((row: unknown) => {
                                const teamRow = row && typeof row === "object" ? row as Record<string, unknown> : {};
                                const rowId = String(teamRow.id || teamRow.participantId || "");
                                const rowEmail = String(teamRow.email || "").toLowerCase();
                                return rowId === String(myPart.id) || (!!rowEmail && rowEmail === String(myPart.email || "").toLowerCase());
                            });
                            const teamFaculty = readFacultyEmails(leadTeamRow, scopedMembers[0]);
                            if (teamFaculty.primary) setPrimaryFacultyEmail(teamFaculty.primary);
                            if (teamFaculty.secondary) setSecondaryFacultyEmail(teamFaculty.secondary);
                            const resolvedTeamId = pickTeamId(leadTeamRow) || pickTeamId(scopedMembers[0]);
                            if (resolvedTeamId) setTeamId(resolvedTeamId);

                            scopedTeamForAttendance = scopedMembers;
                            updateSection("section1", {
                                team_members: scopedMembers,
                                participation_type: scopedMode,
                            });
                            syncParticipationAttendanceFlags(myPart, teamRows);
                        }
                    }

                    // 3. Fetch all logs (pass lead + roster snapshot: context/rawParticipants are still pre-render here)
                    await loadAllEntries(myPart.id, scopedTeamForAttendance);
                }
            }
        } catch (err) {
            console.error("Error fetching initial dynamic data:", err);
        } finally {
            isFetchingRef.current = false;
        }
    };

    const teamVerifications = data.section1.team_members.map((m: any) => m.verified).join(',');
    const teamMemberParticipantKeys = data.section1.team_members
        .map((m: any) => String(m?.id || m?.participantId || ""))
        .join("|");
    
    // Re-fetch logs whenever the team composition or verification status changes
    React.useEffect(() => {
        if (projectIdFromUrl && isVerified) {
            loadAllEntries();
        }
    }, [
        projectIdFromUrl,
        isVerified, 
        data.section1.team_members.length,
        teamVerifications,
        teamMemberParticipantKeys,
        participantId,
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
                const rosterIds = buildIndividualRosterFromSection1(data.section1, participantId ?? data.section1.team_lead?.id);
                const calc = calculateEngagementMetrics(
                    data.section1.attendance_logs,
                    requiredHoursPerStudent,
                    teamSize,
                    data.section1.team_lead,
                    rosterIds,
                );

                const finalMetrics = {
                    totalHours: calc.total_verified_hours,
                    sessionCount: calc.verified_session_count,
                    activeDays: calc.total_active_days,
                    spanWeeks: Math.ceil(calc.engagement_span / 7),
                    frequency: calc.attendance_frequency,
                    weeklyContinuity: calc.weekly_continuity,
                    eis: calc.eis_score,
                    category: calc.engagement_category,
                    hecStatus: calc.hec_compliance,
                    evidenceCount: data.section1.attendance_logs.filter(l => l.evidence_file).length,
                    evidenceRatio: Math.round((data.section1.attendance_logs.filter(l => l.evidence_file).length / data.section1.attendance_logs.length) * 100),
                    redFlags: calc.redFlags,
                    isNonCompliant: calc.isNonCompliant,
                    individual_metrics: calc.individual_metrics,
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

    const selfParticipantIds = React.useMemo(
        () =>
            selfParticipantRealIds(
                currentUserEmail,
                data.section1.team_lead as Record<string, unknown>,
                data.section1.team_members,
                participantId,
            ),
        [currentUserEmail, data.section1.team_lead, data.section1.team_members, participantId],
    );

    const handleDeleteEntry = async (entryId: string) => {
        const entry = data.section1.attendance_logs.find((l: any) => l.id === entryId);
        if (!entry) return;

        if (!canDeleteAttendanceEntry(entry as { participantId?: string }, selfParticipantIds, currentUserEmail)) {
            toast.error("You can only delete attendance entries that you logged for yourself.");
            return;
        }

        if (!confirm("Are you sure you want to remove this session?")) return;

        const entryParticipantId = (entry as any)?.participantId || participantId;
        if (!entryParticipantId) return;

        // Strip prefix for API call
        const segments = entryParticipantId.split(':');
        const realId = segments.length > 1 ? segments[segments.length - 1] : entryParticipantId;
        if (!realId) return;

        setIsDeleting(entryId);
        try {
            const res = await authenticatedFetch(`/api/v1/engagement/${realId}/attendance/${entryId}`, {
                method: 'DELETE'
            });

            if (res && res.ok) {
                const newLogs = data.section1.attendance_logs.filter((l: any) => l.id !== entryId);
                updateSection('section1', { attendance_logs: newLogs });
                toast.success("Attendance entry removed.");
            } else {
                const message = await resolveAttendanceSubmitError(res, "delete");
                toast.error(message, { duration: 8000 });
            }
        } catch (err) {
            console.error(err);
            toast.error("Could not delete this entry. Check your connection and try again.");
        } finally {
            setIsDeleting(null);
        }
    };


    const attendanceVerificationRequestedAt =
        (data.section1 as any).attendance_verification_requested_at ||
        (data.section1 as any).attendanceVerificationRequestedAt ||
        "";
    const isLeadReportVerificationRequested = !!attendanceVerificationRequestedAt;
    const isAttendanceVerificationRequested = isTeamMemberAttendanceOnly
        ? myParticipationVerificationRequested && !isParticipationUnlocked
        : isLeadReportVerificationRequested;
    const isAttendanceFormLocked = isTeamMemberAttendanceOnly
        ? !isParticipationUnlocked &&
          (isSubmittedReport || myParticipationVerificationRequested)
        : !isParticipationUnlocked && (isSubmittedReport || isLeadReportVerificationRequested);
    const lockTeamMemberAdd =
        !isParticipationUnlocked && (isSubmittedReport || isAttendanceVerificationRequested);

    const currentUserIsTeamLead = React.useMemo(() => {
        if (myParticipationIsTeamLead === true) return true;
        const leadEmail = String((team_lead as { email?: string })?.email ?? "")
            .trim()
            .toLowerCase();
        const selfEmail = currentUserEmail?.trim().toLowerCase();
        return Boolean(selfEmail && leadEmail && selfEmail === leadEmail);
    }, [myParticipationIsTeamLead, team_lead, currentUserEmail]);

    const canRemoveTeamMember = React.useCallback(
        (member: { email?: string }) => {
            if (isSubmittedReport && !isParticipationUnlocked) return false;
            const memberEmail = String(member?.email ?? "").trim().toLowerCase();
            const selfEmail = currentUserEmail?.trim().toLowerCase();
            if (selfEmail && memberEmail && selfEmail === memberEmail) return true;
            return currentUserIsTeamLead;
        },
        [isSubmittedReport, isParticipationUnlocked, currentUserEmail, currentUserIsTeamLead],
    );

    const handleSelfLeaveTeam = async () => {
        if (isSubmittedReport && !isParticipationUnlocked) return;
        const selfMember = team_members.find(
            (m: { email?: string }) =>
                String(m?.email ?? "").trim().toLowerCase() === currentUserEmail?.trim().toLowerCase(),
        );
        const selfParticipationId = String(
            participantId || selfMember?.id || selfMember?.participantId || "",
        ).trim();
        if (!selfParticipationId) {
            toast.error("Could not find your participation record. Refresh and try again.");
            return;
        }
        if (
            !window.confirm(
                "Leave this team project?\n\nYour seat will be released and your attendance on this project will no longer be linked to the team report.",
            )
        ) {
            return;
        }
        setIsLeavingTeam(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/engagement/${encodeURIComponent(selfParticipationId)}`,
                { method: "DELETE" },
            );
            if (!res?.ok) {
                const err = await res?.json().catch(() => ({}));
                toast.error(
                    typeof (err as { message?: string }).message === "string"
                        ? (err as { message: string }).message
                        : "Could not leave this team project",
                );
                return;
            }
            toast.success("You have left this team project.");
            window.location.href = "/dashboard/student";
        } catch {
            toast.error("Could not leave this team project.");
        } finally {
            setIsLeavingTeam(false);
        }
    };

    const handleRequestAttendanceVerification = async () => {
        if (isAttendanceVerificationRequested || isSubmittedReport) return;
        if (!projectIdFromUrl) {
            toast.error("Project context missing. Please refresh and try again.");
            return;
        }
        if (!data.section1.attendance_logs.length) {
            toast.error("Please add at least one attendance entry before verification.");
            return;
        }
        if (!isMinimumHoursMet) {
            toast.error(
                `Every student must reach at least ${requiredHoursPerStudent} hours before you can request verification.`,
            );
            return;
        }
        if (!reviewChecked.every(Boolean)) {
            toast.error("Please complete the confirmation checklist (oath) before requesting verification.");
            return;
        }
        if (attendanceApproverChoice !== "faculty" && attendanceApproverChoice !== "partner") {
            toast.error("Please choose who should approve your attendance: Faculty or Partner.");
            return;
        }
        const facultyEmailTrimmed = facultyApproverEmail.trim();
        if (attendanceApproverChoice === "faculty") {
            if (!facultyEmailTrimmed || !facultyEmailTrimmed.includes("@")) {
                toast.error("Enter the faculty email who should approve your attendance.");
                return;
            }
        }
        const confirmed = window.confirm(
            "Request attendance verification?\n\n" +
                ATTENDANCE_VERIFICATION_INFO.confirmBody +
                " " +
                ATTENDANCE_VERIFICATION_INFO.lockNote,
        );
        if (!confirmed) return;

        const requestedAt = new Date().toISOString();
        setIsRequestingAttendanceVerification(true);

        updateSection("section1", {
            attendance_verification_requested_at: requestedAt,
            attendance_verification_status: "pending_approval",
            attendance_verification_locked: true,
            attendance_verification_email_notified: false,
            attendance_approver_type: attendanceApproverChoice,
            ...(attendanceApproverChoice === "faculty"
                ? { attendance_faculty_email: facultyEmailTrimmed }
                : {}),
        });
        setParticipationUnlocked(false);

        let serverNotified = false;
        let requestType = "created";
        try {
            const res = await authenticatedFetch(
                `/api/v1/engagement/project/${encodeURIComponent(projectIdFromUrl)}/attendance/verify-request`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        projectId: projectIdFromUrl,
                        // Nest DTO requires a bare UUID — strip UI prefixes like `lead:` / `member:N:`.
                        participantId: (() => {
                            const raw = String(participantId || "").trim();
                            if (!raw) return undefined;
                            if (raw.startsWith("lead:")) return raw.slice("lead:".length) || undefined;
                            const memberMatch = /^member:\d+:(.+)$/.exec(raw);
                            if (memberMatch?.[1]) return memberMatch[1];
                            return raw;
                        })(),
                        requestedAt,
                        attendanceApproverType: attendanceApproverChoice,
                        oathCompleted: true,
                        ...(attendanceApproverChoice === "faculty"
                            ? { facultyEmail: facultyEmailTrimmed }
                            : {}),
                    }),
                },
            );

            if (res?.ok) {
                const json = await res.json().catch(() => ({}));
                serverNotified = Boolean(json?.emailNotified);
                requestType = typeof json?.type === "string" ? json.type : "created";
            } else {
                const err = await res?.json().catch(() => ({}));
                const msg =
                    typeof (err as { message?: string }).message === "string"
                        ? (err as { message: string }).message
                        : "Verification locked. Reviewer notify endpoint not available yet.";
                toast.warning(msg);
            }
        } catch {
            toast.warning("Verification locked. Email notify endpoint not available yet.");
        } finally {
            updateSection("section1", {
                attendance_verification_requested_at: requestedAt,
                attendance_verification_status: "pending_approval",
                attendance_verification_locked: true,
                attendance_verification_email_notified: serverNotified,
                attendance_approver_type: attendanceApproverChoice,
                ...(attendanceApproverChoice === "faculty"
                    ? { attendance_faculty_email: facultyEmailTrimmed }
                    : {}),
            });
            await saveReport(true);
            setIsRequestingAttendanceVerification(false);
        }

        if (requestType === "already_requested") {
            toast.success("Attendance verification was already requested earlier and remains locked.");
            return;
        }

        toast.success(
            serverNotified
                ? `Attendance submitted for verification. Your ${attendanceApproverChoice === "partner" ? "Partner" : "Faculty"} reviewer has been notified.`
                : "Attendance locked for verification.",
        );
    };

    // Helpers
    async function loadEntries(pId: string) {
        // Individual loadEntries is now deprecated in favor of loadAllEntries bulk sync,
        // but we keep it for fallback or specific single-user refreshes if needed.
        try {
            const segments = pId.split(':');
            const realId = segments.length > 1 ? segments[segments.length - 1] : pId;
            const res = await authenticatedFetch(`/api/v1/engagement/${realId}/attendance`);
            if (res && res.ok) {
                const result = await res.json();
                return (result.data || []).map((e: any) =>
                    normalizeEngagementAttendanceLog(e, { participantPrefixedId: pId }),
                );
            }
        } catch (e) {}
        return [];
    }

    async function loadAllEntries(knownLeadParticipantId?: string | null, teamMembersSnapshot?: any[] | null) {
        if (!projectIdFromUrl) return;
        try {
            console.log(`[Attendance] Performing unified bulk sync for project: ${projectIdFromUrl}`);
            const res = await authenticatedFetch(`/api/v1/engagement/project/${projectIdFromUrl}/attendance-logs`);
            
            if (res && res.ok) {
                const result = await res.json();
                const rawLogs = result.data || [];

                const resolvedLeadId =
                    knownLeadParticipantId ?? participantId ?? data.section1.team_lead.id ?? null;
                const teamMembersForMapping =
                    teamMembersSnapshot !== undefined && teamMembersSnapshot !== null
                        ? teamMembersSnapshot
                        : data.section1.team_members;

                // Map raw logs to prefixed IDs for frontend isolation
                const unifiedLogs = rawLogs.map((e: any) => {
                    const realId = String(e.participantId ?? "");
                    const prefixedId = resolveAttendanceLogParticipantPrefixedId(
                        realId,
                        rawParticipants,
                        resolvedLeadId,
                        teamMembersForMapping,
                    );

                    return normalizeEngagementAttendanceLog(e, { participantPrefixedId: prefixedId });
                });
                
                // Deduplicate and update
                const uniqueLogs = Array.from(new Map(unifiedLogs.map((l: any) => [l.id, l])).values());
                console.log(`[Attendance] Bulk sync completed: ${uniqueLogs.length} entries found.`);
                
                updateSection('section1', { attendance_logs: uniqueLogs });

                // Recalculate metrics
                const teamSize = 1 + data.section1.team_members.length;
                const rosterIds = buildIndividualRosterFromSection1(data.section1, participantId ?? data.section1.team_lead?.id);
                const calc = calculateEngagementMetrics(uniqueLogs as any, requiredHoursPerStudent, teamSize, undefined, rosterIds);
                setVerifiedMetrics({
                    totalHours: calc.total_verified_hours,
                    sessionCount: calc.verified_session_count,
                    activeDays: calc.total_active_days,
                    spanWeeks: Math.ceil(calc.engagement_span / 7),
                    frequency: calc.attendance_frequency,
                    weeklyContinuity: calc.weekly_continuity,
                    eis: calc.eis_score,
                    category: calc.engagement_category,
                    hecStatus: calc.hec_compliance,
                    evidenceCount: uniqueLogs.filter((l: any) => l.evidence_file).length,
                    evidenceRatio: Math.round((uniqueLogs.filter((l: any) => l.evidence_file).length / (uniqueLogs.length || 1)) * 100),
                    individual_metrics: calc.individual_metrics,
                });
            }
        } catch (err) {
            console.error("Error in unified attendance sync:", err);
        }
    }



    const projectGoal = requiredHoursPerStudent * (1 + team_members.length);

    /** Sum hours only for roster members (matches per-student cards); excludes other project participants in bulk API. */
    const collectiveProjectHours = React.useMemo(() => {
        const logs = data.section1.attendance_logs || [];
        const total = rawParticipants.reduce((sum, u) => {
            const perMember = logs
                .filter((l: { participantId?: string }) =>
                    engagementParticipantIdsMatch(l.participantId, u.id),
                )
                .reduce((acc: number, log: (typeof logs)[number]) => acc + effectiveHoursFromLog(log), 0);
            return sum + perMember;
        }, 0);
        return Math.round(total * 100) / 100;
    }, [data.section1.attendance_logs, rawParticipants]);

    const isMinimumHoursMet = rawParticipants.every(u => {
        const hours = data.section1.attendance_logs
            .filter((l: any) => {
                if (!engagementParticipantIdsMatch(l.participantId, u.id)) return false;
                // Before one-time verification, count logged (non-rejected) hours — not only approved.
                const status = String(l.approval_status ?? l.approvalStatus ?? "")
                    .trim()
                    .toLowerCase();
                return status !== "rejected";
            })
            .reduce((acc: number, log: any) => acc + (Number(log.hours) || 0), 0);
        return hours >= requiredHoursPerStudent;
    });

    // Prefill faculty email from apply / team supervision when switching to Faculty approval.
    React.useEffect(() => {
        if (attendanceApproverChoice !== "faculty") return;
        if (facultyApproverEmail.trim()) return;
        const fromState = (primaryFacultyEmail || secondaryFacultyEmail || "").trim();
        if (fromState) setFacultyApproverEmail(fromState);
    }, [attendanceApproverChoice, facultyApproverEmail, primaryFacultyEmail, secondaryFacultyEmail]);


    return (
        <div className="flex min-h-0 w-full min-w-0 flex-col bg-slate-50/30">
            {isTeamMemberAttendanceOnly ? (
                <div className="mx-3 mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 sm:mx-5 lg:mx-6">
                    <p className="font-semibold">Team member — attendance only</p>
                    <p className="mt-1 text-xs text-sky-800/90">
                        Your team lead completes and submits this report. You may log and update your own attendance below.
                    </p>
                    {!isSubmittedReport || isParticipationUnlocked ? (
                        <button
                            type="button"
                            onClick={() => void handleSelfLeaveTeam()}
                            disabled={isLeavingTeam}
                            className="mt-3 inline-flex items-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                            {isLeavingTeam ? "Leaving..." : "Leave team project"}
                        </button>
                    ) : null}
                </div>
            ) : null}

            {/* Section 1 — 4-step progress stepper */}
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                <nav aria-label="Section 1 progress" className="mx-auto max-w-3xl">
                    <ol className="flex items-start">
                        {steps.map((s, idx) => {
                            const isComplete = internalStep > s.id;
                            const isCurrent = internalStep === s.id;
                            const isDisabled =
                                isTeamMemberAttendanceOnly && (s.id === 1 || s.id === 3);
                            const canNavigate = !isDisabled && isComplete;

                            return (
                                <li
                                    key={s.id}
                                    className={clsx(
                                        "relative flex flex-1 flex-col items-center",
                                        idx < steps.length - 1 && "pr-2 sm:pr-0",
                                    )}
                                >
                                    {idx < steps.length - 1 ? (
                                        <div
                                            className={clsx(
                                                "absolute left-[calc(50%+1rem)] right-0 top-4 hidden h-0.5 sm:block",
                                                isComplete ? "bg-emerald-400" : "bg-slate-200",
                                            )}
                                            aria-hidden
                                        />
                                    ) : null}

                                    <button
                                        type="button"
                                        disabled={isDisabled || (!canNavigate && !isCurrent)}
                                        onClick={() => {
                                            if (isDisabled) return;
                                            if (canNavigate) setInternalStep(s.id);
                                        }}
                                        className={clsx(
                                            "relative z-10 flex flex-col items-center gap-1.5 transition-opacity",
                                            isDisabled
                                                ? "cursor-not-allowed opacity-40"
                                                : canNavigate || isCurrent
                                                  ? "cursor-pointer"
                                                  : "cursor-default",
                                        )}
                                    >
                                        <span
                                            className={clsx(
                                                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                                                isCurrent &&
                                                    "bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-4 ring-indigo-50",
                                                isComplete &&
                                                    !isCurrent &&
                                                    "bg-emerald-500 text-white",
                                                !isCurrent &&
                                                    !isComplete &&
                                                    "bg-slate-100 text-slate-400 ring-1 ring-slate-200",
                                            )}
                                        >
                                            {isComplete && !isCurrent ? (
                                                <CheckCircle2 className="h-4 w-4" />
                                            ) : (
                                                s.id
                                            )}
                                        </span>
                                        <span
                                            className={clsx(
                                                "hidden max-w-[5.5rem] text-center text-[11px] font-medium leading-tight sm:block",
                                                isCurrent
                                                    ? "text-indigo-700"
                                                    : isComplete
                                                      ? "text-emerald-700"
                                                      : "text-slate-400",
                                            )}
                                        >
                                            {s.title}
                                        </span>
                                        <span
                                            className={clsx(
                                                "max-w-[4.5rem] text-center text-[10px] font-medium leading-tight sm:hidden",
                                                isCurrent ? "text-indigo-700" : "text-slate-400",
                                            )}
                                        >
                                            {s.title.split(" ")[0]}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            </div>

            {/* Scrollable Content Workspace */}
            <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-5 sm:px-5 sm:py-6 lg:px-6">
                <div className="mx-auto max-w-6xl min-w-0 space-y-5">
                    {internalStep === 1 && (
                        <div className="space-y-6">
                            {/* ── Institutional purpose (orientation) ── */}
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="h-1 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-400" aria-hidden />
                                <div className="p-6 md:p-8">
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                                    Institutional purpose
                                                </p>
                                                <h3 className="mt-2 text-lg md:text-xl font-semibold text-slate-900 tracking-tight">
                                                    Establish accountability
                                                </h3>
                                                <p className="mt-3 text-[13px] text-slate-600 leading-relaxed max-w-3xl">
                                                    This section documents verified participation and academic alignment so your community engagement record meets institutional audit expectations.
                                                </p>
                                            </div>
                                            <ul className="grid gap-4 sm:grid-cols-2">
                                                {[
                                                    "Verified participation via audit-ready logs",
                                                    "Academic linkage to official student records",
                                                    "Attendance integrity through HEC-compliant tracking",
                                                    "Individual accountability for community hours"
                                                ].map((p, i) => (
                                                    <li
                                                        key={i}
                                                        className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-[13px] text-slate-700 leading-relaxed shadow-sm"
                                                    >
                                                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                                            {i + 1}
                                                        </span>
                                                        <span>{p}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs font-medium text-indigo-600">Step 1</p>
                                <h3 className="text-xl font-semibold text-slate-900">Identity & team setup</h3>
                                <p className="text-sm text-slate-500">Verify your profile and team configuration to unlock attendance logging.</p>
                            </div>

                            {/* 1. Identity Verification Accordion */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-slate-800">Identity Verification</h4>
                                    </div>
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                </div>

                                <div className="px-6 pb-6">
                                    {(isVerified && !isEditingLead) ? (
                                        <div className="rounded-xl border border-emerald-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                                            {(() => {
                                                const leadCnicRaw = String((data.section1.team_lead as any).cnic || "").replace(/\D/g, "");
                                                const leadCnicOk = leadCnicRaw.length === 13;
                                                return !leadCnicOk ? (
                                                    <div className="px-5 pt-4 pb-0">
                                                        <p className="text-[13px] font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 leading-relaxed">
                                                            CNIC is missing or incomplete for this project record. Use <span className="font-bold">Edit Academic</span> to add your 13-digit CNIC so your report meets traceability requirements.
                                                        </p>
                                                    </div>
                                                ) : null;
                                            })()}
                                            <div className="p-6 flex items-center justify-between">
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
                                                        <p className="text-[11px] text-slate-600 font-mono font-medium pt-1">
                                                            CNIC:{" "}
                                                            {String((data.section1.team_lead as any).cnic || "")
                                                                .replace(/\D/g, "")
                                                                .length === 13
                                                                ? String((data.section1.team_lead as any).cnic || "").replace(/\D/g, "")
                                                                : "—"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setIsEditingLead(true)}
                                                        className="inline-flex items-center gap-2 h-9 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
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
                                                            className="inline-flex items-center gap-2 h-9 px-4 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 hover:shadow-md transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
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
                                            initialData={{
                                                ...team_lead,
                                                ...(teamId ? { teamId, team_id: teamId } : {}),
                                            }}
                                            isTeamLead={true}
                                            teamId={teamId}
                                            primaryFacultyEmail={primaryFacultyEmail}
                                            secondaryFacultyEmail={secondaryFacultyEmail}
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
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                                            <Users className="w-5 h-5 text-report-primary" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-slate-800">Team Members</h4>
                                    </div>
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                </div>                            <div className="px-6 pb-6 pt-2">
                                    <TeamVerification
                                        projectId={data.project_id || projectIdFromUrl || ""}
                                        members={team_members}
                                        lockAddMembers={lockTeamMemberAdd}
                                        canRemoveMember={canRemoveTeamMember}
                                        teamId={teamId}
                                        primaryFacultyEmail={primaryFacultyEmail}
                                        secondaryFacultyEmail={secondaryFacultyEmail}
                                        onUpdateMembers={async (newMembers) => {
                                            const newType = newMembers.length > 0 ? 'team' : 'individual';
                                            updateSection('section1', {
                                                team_members: newMembers,
                                                participation_type: newType
                                            });

                                            const hasVerified = newMembers.some((m: any) => m.verified && (m.id || m.participantId));
                                            if (hasVerified) {
                                                const verifiedIds = newMembers
                                                    .filter((m: any) => m.verified && (m.id || m.participantId))
                                                    .map((m: any) => String(m.id || m.participantId));
                                                try {
                                                    const projectId = data.project_id || projectIdFromUrl || '';
                                                    if (projectId && verifiedIds.length) {
                                                        const formRes = await formTeamFromLead(projectId, verifiedIds);
                                                        if (formRes?.ok) {
                                                            const formJson = await formRes.json().catch(() => ({}));
                                                            if (formJson?.data?.formed) {
                                                                toast.success(
                                                                    formJson.data.team_display_name
                                                                        ? `Team formed: ${formJson.data.team_display_name}`
                                                                        : "Your project is now a team project.",
                                                                );
                                                                if (formJson.data.team_id) {
                                                                    setTeamId(formJson.data.team_id);
                                                                }
                                                            } else {
                                                                const msg =
                                                                    typeof formJson?.data?.message === "string"
                                                                        ? formJson.data.message
                                                                        : typeof formJson?.message === "string"
                                                                          ? formJson.message
                                                                          : "Team was not formed. Add verified members and try again.";
                                                                toast.error(msg);
                                                            }
                                                        } else {
                                                            const errJson = formRes
                                                                ? await formRes.json().catch(() => ({}))
                                                                : {};
                                                            toast.error(
                                                                typeof (errJson as { message?: string }).message === "string"
                                                                    ? (errJson as { message: string }).message
                                                                    : "Could not form team. Please try again.",
                                                            );
                                                        }
                                                        const payload = await prepareReportEvidenceForSave(
                                                            {
                                                                ...data,
                                                                project_id: projectId,
                                                                section1: {
                                                                    ...data.section1,
                                                                    team_members: newMembers,
                                                                    participation_type: newType,
                                                                },
                                                                status: "continue",
                                                            },
                                                            projectId,
                                                        );
                                                        await authenticatedFetch(
                                                            `/api/v1/student/reports/draft`,
                                                            { method: "POST", body: JSON.stringify(payload) },
                                                            { timeoutMs: 120000 },
                                                        );
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
                        const selectedStudentName =
                            rawParticipants.find((u: { id: string }) => u.id === selectedParticipantId)
                                ?.name || "Selected student";
                        const participantLogs = data.section1.attendance_logs.filter(
                            (l: { participantId?: string }) => {
                                if (!selectedParticipantId) return true;
                                return engagementParticipantIdsMatch(
                                    l.participantId,
                                    selectedParticipantId,
                                );
                            },
                        );
                        const loggedEff = participantLogs.reduce(
                            (acc: number, log: (typeof participantLogs)[number]) =>
                                acc + effectiveHoursFromLog(log),
                            0,
                        );
                        const loggedRounded = Math.round(loggedEff * 100) / 100;
                        const remainingHours = Math.max(
                            0,
                            Math.round((requiredHoursPerStudent - loggedEff) * 100) / 100,
                        );
                        const personalProgressPct =
                            requiredHoursPerStudent > 0
                                ? Math.min(100, Math.round((loggedEff / requiredHoursPerStudent) * 100))
                                : 0;
                        const teamProgressPct =
                            projectGoal > 0
                                ? Math.min(100, Math.round((collectiveProjectHours / projectGoal) * 100))
                                : 0;
                        const filteredLogCount = participantLogs.length;

                        return (
                            <div className="space-y-6">

                                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-indigo-600">Step 2</p>
                                        <h3 className="mt-0.5 text-xl font-semibold text-slate-900">
                                            Attendance logging
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Record and verify your engagement hours for HEC audit trails.
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 sm:max-w-xs">
                                        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                        <p className="text-xs leading-relaxed text-amber-800">
                                            Each student must meet the required hour goal before submission.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    {[
                                        {
                                            label: "Project goal",
                                            value: projectGoal,
                                            suffix: "hrs",
                                            icon: Shield,
                                            progress: null as number | null,
                                        },
                                        {
                                            label: "Team hours logged",
                                            value: collectiveProjectHours,
                                            suffix: "hrs",
                                            icon: Users,
                                            progress: teamProgressPct,
                                        },
                                        {
                                            label: "Team progress",
                                            value: `${teamProgressPct}%`,
                                            suffix: null,
                                            icon: Activity,
                                            progress: teamProgressPct,
                                        },
                                    ].map((stat, i) => (
                                        <div
                                            key={i}
                                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-100">
                                                    <stat.icon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-slate-500">{stat.label}</p>
                                                    <p className="text-xl font-bold text-slate-900">
                                                        {stat.value}
                                                        {stat.suffix ? (
                                                            <span className="ml-1 text-xs font-medium text-slate-400">
                                                                {stat.suffix}
                                                            </span>
                                                        ) : null}
                                                    </p>
                                                </div>
                                            </div>
                                            {stat.progress != null ? (
                                                <div className="mt-3">
                                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                        <div
                                                            className="h-full rounded-full bg-indigo-500 transition-all"
                                                            style={{ width: `${stat.progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>

                                {selectedParticipantId ? (
                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-semibold">
                                                    {selectedStudentName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Personal tracking</p>
                                                    <p className="text-sm font-semibold text-slate-900">
                                                        {selectedStudentName}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 text-center">
                                                <div>
                                                    <p className="text-xs text-slate-500">Logged</p>
                                                    <p className="text-lg font-bold text-indigo-600">
                                                        {loggedRounded}{" "}
                                                        <span className="text-xs font-medium text-slate-400">hrs</span>
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Remaining</p>
                                                    <p className="text-lg font-bold text-amber-600">
                                                        {remainingHours}{" "}
                                                        <span className="text-xs font-medium text-slate-400">hrs</span>
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Goal</p>
                                                    <p className="text-lg font-bold text-slate-700">
                                                        {requiredHoursPerStudent}{" "}
                                                        <span className="text-xs font-medium text-slate-400">hrs</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <div className="mb-1 flex justify-between text-xs text-slate-500">
                                                <span>Individual progress</span>
                                                <span className="font-medium text-slate-700">
                                                    {personalProgressPct}%
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-indigo-100">
                                                <div
                                                    className={clsx(
                                                        "h-full rounded-full transition-all",
                                                        personalProgressPct >= 100
                                                            ? "bg-emerald-500"
                                                            : "bg-indigo-500",
                                                    )}
                                                    style={{ width: `${personalProgressPct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
                                    <div className="min-w-0 space-y-4">
                                        <AttendanceForm
                                            verifiedUsers={rawParticipants}
                                            onSuccess={() => loadAllEntries()}
                                            selectedParticipantId={selectedParticipantId}
                                            onParticipantChange={setSelectedParticipantId}
                                            isLocked={isAttendanceFormLocked}
                                            isParticipationUnlocked={isParticipationUnlocked}
                                            setParticipationUnlocked={setParticipationUnlocked}
                                            allowManualUnlock={!isAttendanceVerificationRequested}
                                        />

                                        {!isSubmittedReport && !isParticipationUnlocked && (
                                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                                {isAttendanceVerificationRequested ? (
                                                    <div className="space-y-1.5">
                                                        <p className="text-xs font-semibold text-emerald-700">
                                                            Verification request sent
                                                        </p>
                                                        <p className="text-sm leading-relaxed text-slate-600">
                                                            {ATTENDANCE_VERIFICATION_INFO.afterSent}
                                                            <span className="mt-1.5 block text-slate-500">
                                                                {ATTENDANCE_VERIFICATION_INFO.afterSentWho}
                                                            </span>
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-xs leading-relaxed text-indigo-900">
                                                        <p className="font-semibold text-indigo-800">
                                                            Verify attendance (one time) — available on Step 3
                                                        </p>
                                                        <p className="mt-1.5">{ATTENDANCE_VERIFICATION_INFO.step2Hint}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-3.5 text-white">
                                            <p className="text-xs font-semibold">How approval works</p>
                                            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                                                After you take the oath and submit for verification in Step 3,
                                                your chosen Faculty or Partner reviewer will approve each session.
                                                Approved hours count toward your goal.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="min-w-0 space-y-4">
                                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                            <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                                        <Clock className="h-4 w-4 text-indigo-600" />
                                                        Logged sessions
                                                    </h4>
                                                    <p className="mt-0.5 text-xs text-slate-500">
                                                        {selectedParticipantId
                                                            ? `Showing entries for ${selectedStudentName}`
                                                            : "Showing all team members"}
                                                    </p>
                                                </div>
                                                <span className="w-fit shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                                                    {filteredLogCount}{" "}
                                                    {filteredLogCount === 1 ? "entry" : "entries"}
                                                </span>
                                            </div>
                                            <AttendanceSummaryTable
                                                embedded
                                                entries={participantLogs}
                                                participantNames={participantNamesMap}
                                                onDelete={handleDeleteEntry}
                                                canDeleteEntry={(entry) =>
                                                    canDeleteAttendanceEntry(
                                                        entry,
                                                        selfParticipantIds,
                                                        currentUserEmail,
                                                    )
                                                }
                                                isLocked={isAttendanceFormLocked}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}


                    {internalStep === 3 && (
                        <div className="mx-auto max-w-2xl space-y-6 py-4">

                            <div className="text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                                    <Shield className="h-7 w-7" />
                                </div>
                                <p className="text-xs font-medium text-indigo-600">Step 3</p>
                                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                                    Review & submit
                                </h2>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                                    Confirm your attendance records are accurate before finalizing.
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-xs font-medium text-slate-500">Hours summary</p>
                                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                                    <div className="rounded-lg bg-slate-50 px-2 py-2.5 ring-1 ring-slate-100">
                                        <p className="text-lg font-bold text-slate-900">{projectGoal}</p>
                                        <p className="text-[11px] text-slate-500">Project goal</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 px-2 py-2.5 ring-1 ring-slate-100">
                                        <p className="text-lg font-bold text-indigo-600">
                                            {collectiveProjectHours}
                                        </p>
                                        <p className="text-[11px] text-slate-500">Team logged</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 px-2 py-2.5 ring-1 ring-slate-100">
                                        <p
                                            className={clsx(
                                                "text-lg font-bold",
                                                isMinimumHoursMet ? "text-emerald-600" : "text-amber-600",
                                            )}
                                        >
                                            {requiredHoursPerStudent}
                                        </p>
                                        <p className="text-[11px] text-slate-500">Per student</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2 rounded-lg px-1 py-1">
                                    {isMinimumHoursMet ? (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                            <p className="text-xs text-emerald-700">
                                                All students have met the minimum hour requirement.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                                            <p className="text-xs text-amber-700">
                                                Some students still need more hours. Return to Step 2 to
                                                add sessions.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                                <div>
                                    <h4 className="text-sm font-semibold text-amber-900">
                                        Permanent record lock
                                    </h4>
                                    <p className="mt-1 text-sm leading-relaxed text-amber-800">
                                        After submission, all participation records become{" "}
                                        <strong>permanently locked</strong> and cannot be edited. Any
                                        inaccuracies will appear on your official HEC verification record.
                                    </p>
                                </div>
                            </div>

                            {!isMinimumHoursMet ? (
                                <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-red-900">
                                            Minimum hours not met
                                        </h4>
                                        <p className="mt-1 text-sm leading-relaxed text-red-700">
                                            Every student must reach{" "}
                                            <strong>{requiredHoursPerStudent} hours</strong> before you can
                                            finalize. Go back to attendance logging to complete remaining
                                            sessions.
                                        </p>
                                    </div>
                                </div>
                            ) : null}

                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
                                    <h4 className="text-sm font-semibold text-slate-900">
                                        Confirmation checklist
                                    </h4>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Complete this oath, then choose your attendance approver and verify.
                                    </p>
                                </div>
                                <div className="divide-y divide-slate-100 p-2">
                                    {[
                                        "I verify that all session entries are authentic.",
                                        "I understand that no further edits are possible after submission.",
                                        "I consent to institutional report sharing.",
                                    ].map((check, i) => (
                                        <label
                                            key={i}
                                            className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-slate-50"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={reviewChecked[i]}
                                                onChange={() => {
                                                    const newChecked = [...reviewChecked];
                                                    newChecked[i] = !newChecked[i];
                                                    updateSection("section1", {
                                                        review_checked: newChecked,
                                                        ...(i === 2
                                                            ? { privacy_consent: newChecked[i] }
                                                            : {}),
                                                    });
                                                }}
                                                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                            />
                                            <span className="text-sm leading-relaxed text-slate-700">
                                                {check}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {!isSubmittedReport && !isTeamMemberAttendanceOnly ? (
                                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-wide text-slate-900">
                                            Who should approve your attendance?
                                        </h4>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                            {ATTENDANCE_VERIFICATION_INFO.routing}
                                        </p>
                                    </div>

                                    {(() => {
                                        const partnerAvailable = opportunityHasPartner(
                                            projectRecord,
                                        );
                                        const facultyOptions = [
                                            primaryFacultyEmail,
                                            secondaryFacultyEmail,
                                        ]
                                            .map((e) => e.trim())
                                            .filter(Boolean)
                                            .filter(
                                                (e, i, arr) =>
                                                    arr.findIndex(
                                                        (x) => x.toLowerCase() === e.toLowerCase(),
                                                    ) === i,
                                            );
                                        return (
                                            <div className="space-y-4">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <label
                                                    className={clsx(
                                                        "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors",
                                                        attendanceApproverChoice === "faculty"
                                                            ? "border-indigo-500 bg-indigo-50/60"
                                                            : "border-slate-200 hover:border-slate-300",
                                                        isAttendanceVerificationRequested && "pointer-events-none opacity-70",
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="attendanceApprover"
                                                        className="mt-1 text-indigo-600"
                                                        checked={attendanceApproverChoice === "faculty"}
                                                        disabled={isAttendanceVerificationRequested}
                                                        onChange={() => setAttendanceApproverChoice("faculty")}
                                                    />
                                                    <span>
                                                        <span className="block text-sm font-bold text-slate-900">
                                                            Faculty
                                                        </span>
                                                        <span className="mt-0.5 block text-xs text-slate-500">
                                                            Supervising faculty receives pending attendance on their dashboard.
                                                        </span>
                                                    </span>
                                                </label>
                                                <label
                                                    className={clsx(
                                                        "flex items-start gap-3 rounded-xl border-2 p-4 transition-colors",
                                                        partnerAvailable
                                                            ? "cursor-pointer"
                                                            : "cursor-not-allowed opacity-50",
                                                        attendanceApproverChoice === "partner"
                                                            ? "border-amber-500 bg-amber-50/60"
                                                            : "border-slate-200 hover:border-slate-300",
                                                        isAttendanceVerificationRequested && "pointer-events-none opacity-70",
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="attendanceApprover"
                                                        className="mt-1 text-amber-600"
                                                        checked={attendanceApproverChoice === "partner"}
                                                        disabled={
                                                            !partnerAvailable || isAttendanceVerificationRequested
                                                        }
                                                        onChange={() => setAttendanceApproverChoice("partner")}
                                                    />
                                                    <span>
                                                        <span className="block text-sm font-bold text-slate-900">
                                                            Partner
                                                        </span>
                                                        <span className="mt-0.5 block text-xs text-slate-500">
                                                            {partnerAvailable
                                                                ? "Partner organisation receives pending attendance on their dashboard."
                                                                : "Not available — this opportunity has no partner contact email."}
                                                        </span>
                                                    </span>
                                                </label>
                                            </div>

                                            {attendanceApproverChoice === "faculty" &&
                                            !isAttendanceVerificationRequested ? (
                                                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                                                    <div>
                                                        <label className="text-xs font-black uppercase tracking-wider text-indigo-800">
                                                            Faculty email <span className="text-red-500">*</span>
                                                        </label>
                                                        <p className="mt-0.5 text-[11px] text-indigo-700/80">
                                                            Select a faculty email from your application, or type another faculty email. They will see a pending attendance popup on their dashboard.
                                                        </p>
                                                    </div>
                                                    {facultyOptions.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {facultyOptions.map((email) => (
                                                                <button
                                                                    key={email}
                                                                    type="button"
                                                                    onClick={() => setFacultyApproverEmail(email)}
                                                                    className={clsx(
                                                                        "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                                                                        facultyApproverEmail.trim().toLowerCase() ===
                                                                            email.toLowerCase()
                                                                            ? "border-indigo-600 bg-indigo-600 text-white"
                                                                            : "border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50",
                                                                    )}
                                                                >
                                                                    {email}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                    <Input
                                                        type="email"
                                                        value={facultyApproverEmail}
                                                        onChange={(e) =>
                                                            setFacultyApproverEmail(e.target.value)
                                                        }
                                                        placeholder="faculty@university.edu.pk"
                                                        className="h-10 bg-white border-indigo-200"
                                                    />
                                                </div>
                                            ) : null}
                                            </div>
                                        );
                                    })()}

                                    {isAttendanceVerificationRequested ? (
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                            <p className="font-semibold">Verification request sent</p>
                                            <p className="mt-1 text-xs text-emerald-700">
                                                {ATTENDANCE_VERIFICATION_INFO.afterSent}{" "}
                                                {ATTENDANCE_VERIFICATION_INFO.afterSentWho}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Button
                                                type="button"
                                                onClick={handleRequestAttendanceVerification}
                                                disabled={
                                                    isRequestingAttendanceVerification ||
                                                    !isMinimumHoursMet ||
                                                    !reviewChecked.every(Boolean) ||
                                                    (attendanceApproverChoice !== "faculty" &&
                                                        attendanceApproverChoice !== "partner") ||
                                                    (attendanceApproverChoice === "faculty" &&
                                                        !facultyApproverEmail.trim().includes("@")) ||
                                                    !data.section1.attendance_logs.length
                                                }
                                                className="h-12 w-full rounded-xl bg-slate-900 text-sm font-black uppercase tracking-widest text-white shadow-md hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isRequestingAttendanceVerification ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Sending for verification…
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2">
                                                        <Lock className="h-4 w-4" />
                                                        Verify attendance (one time)
                                                    </span>
                                                )}
                                            </Button>
                                            <p className="text-center text-[11px] font-medium leading-relaxed text-slate-500">
                                                Enabled only when every student has met minimum hours and the oath
                                                checklist above is complete. {ATTENDANCE_VERIFICATION_INFO.lockNote}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : null}

                        </div>
                    )}

                    {/* Metrics Dashboard (step 4) */}
                    {internalStep === 4 && (
                        <div className="space-y-6">

                            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-xs font-medium text-indigo-600">Step 4</p>
                                    <h2 className="mt-0.5 text-xl font-semibold text-slate-900">
                                        Metrics dashboard
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Engagement intensity scores and HEC compliance results.
                                    </p>
                                </div>
                                {isSubmitted ? (
                                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Record finalized
                                    </span>
                                ) : null}
                            </div>

                            {verifiedMetrics ? (

                                <div className="animate-in slide-in-from-bottom-4 duration-500">

                                    <EngagementOverview
                                        metrics={{ 
                                            ...verifiedMetrics, 
                                            projectGoal, 
                                            requiredHours: requiredHoursPerStudent,
                                            individual_metrics:
                                                verifiedMetrics.individual_metrics ??
                                                data.section1.metrics.individual_metrics,
                                        }}
                                        isTeam={participation_type === 'team'}
                                        hideIntensityHero
                                        report={data}
                                    />

                                    {projectIdFromUrl ? (
                                        <Section1AnalyticsPanel
                                            apiPath={`/api/v1/student/projects/${encodeURIComponent(projectIdFromUrl)}/section1-analytics`}
                                            title="Participation & attendance"
                                            description="Read-only analytics from CIEL (your engagement metrics above are unchanged)."
                                            className="mt-8"
                                        />
                                    ) : null}


                                </div>

                            ) : (

                                <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">

                                    <Loader2 className="mx-auto h-9 w-9 animate-spin text-indigo-600" />

                                    <p className="mt-4 text-base font-semibold text-slate-800">
                                        Generating analytics
                                    </p>

                                    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                                        Calculating engagement intensity scores and verifying HEC
                                        compliance for your submission record.
                                    </p>

                                    {!isSubmitted ? (
                                        <Button
                                            variant="outline"
                                            onClick={() => setInternalStep(3)}
                                            className="mt-6 h-10 rounded-lg border-indigo-200 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                                        >
                                            Return to review
                                        </Button>
                                    ) : null}

                                </div>

                            )}

                        </div>

                    )}
                </div>
            </main>

            {/* Sticky bottom actions */}
            <div className="mt-auto border-t border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={internalStep === 1}
                        className="order-2 h-10 rounded-lg border-slate-200 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:order-1 disabled:opacity-40"
                    >
                        <ChevronLeft className="mr-1.5 h-4 w-4" />
                        Back
                    </Button>

                    <div className="order-1 flex flex-col gap-2 sm:order-2 sm:flex-row sm:items-center sm:gap-2">
                        {!isTeamMemberAttendanceOnly ? (
                            <Button
                                variant="outline"
                                onClick={() => saveReport(false)}
                                className="h-10 rounded-lg border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                <Save className="mr-1.5 h-4 w-4 text-slate-400" />
                                Save draft
                            </Button>
                        ) : null}

                        {internalStep < 4 ? (
                            <>
                                {internalStep === 3 ? (
                                    <Button
                                        onClick={handleFinalSubmit}
                                        disabled={
                                            !reviewChecked.every(Boolean) ||
                                            isLoadingMetrics ||
                                            !isMinimumHoursMet
                                        }
                                        className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                                    >
                                        {isLoadingMetrics ? (
                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Lock className="mr-1.5 h-4 w-4" />
                                        )}
                                        Finalize & generate record
                                    </Button>
                                ) : null}
                                <Button
                                    onClick={handleNext}
                                    disabled={
                                        (internalStep === 1 && !isVerified) ||
                                        (internalStep === 3 && !isMinimumHoursMet) ||
                                        (isTeamMemberAttendanceOnly && internalStep >= 2)
                                    }
                                    className={clsx(
                                        "h-10 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-50",
                                        internalStep === 3
                                            ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 shadow-none"
                                            : "bg-indigo-600 hover:bg-indigo-700 shadow-sm",
                                    )}
                                >
                                    {internalStep === 3 ? "Skip & continue" : "Continue"}
                                    <ChevronRight className="ml-1.5 h-4 w-4" />
                                </Button>
                            </>
                        ) : !isTeamMemberAttendanceOnly ? (
                            <Button
                                onClick={handleNext}
                                className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                                Save & continue to next section
                                <ChevronRight className="ml-1.5 h-4 w-4" />
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
