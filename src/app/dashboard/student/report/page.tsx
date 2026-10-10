"use client"
import React, { Suspense } from 'react';
import { useReportForm, ReportProvider } from './context/ReportContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { authenticatedFetch } from '@/utils/api';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from './components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./components/ui/dialog";
import { canStudentAccessReportForProjectPayload } from '@/utils/studentJoinApplication';
import { reportRequiresReportingFee, communityReportReviewerName, isStudentReportAwaitingReview, studentReportPostSubmitHref } from '@/utils/reviewQueue';
import { mergeReportSection1TeamScope, mergeReportSection1TeamScopeForCertificate } from '@/utils/reportTeamScope';
import { pickPreferredEngagementSeat } from '@/utils/teamReportSubmitAccess';
import { isStudentImpactPackageView } from '@/utils/studentImpactPackageHref';
import { getIncompleteSectionsSummary, validateSection4, validateSection5 } from './utils/validation';
import {
    dataSectionsToSummarize,
    dataSectionToWizardStep,
    FLASH_CARD_STEP,
    formatIncompleteSectionHeading,
    isFlashCardStep,
    isMergedActivitiesStep,
    nextReportStep,
    prevReportStep,
    REPORT_UI_SECTION_TOTAL,
    uiSectionsCompleteCount,
    tabMatchesStep,
    uiStepLabel,
} from './utils/reportWizardNav';
import { pickImpactVerifyUrlFromPayload } from '@/utils/reportVerificationUrl';
import { prepareReportEvidenceForSave } from './utils/evidenceUpload';
import { normalizeEngagementAttendanceLog } from '@/utils/engagementAttendanceMap';
import { readPersistedCiiSnapshot } from '@/utils/reportCiiSnapshot';
import { calculateCII } from './utils/calculateCII';
import { pickReportStatusFromCheckRow } from '@/utils/studentBrowseReportCta';
import { isReportReturnedForRevision } from '@/utils/reportRevisionState';
import { buildIndividualRosterFromSection1, loggedHoursClearSubmitBar, sumNonRejectedLoggedHours } from './utils/engagementMetrics';

// Import New Sections
import Section1Participation from './components/Section1Participation';
import Section2ProjectContext from './components/Section2ProjectContext'; // Renamed
import Section3SDGMapping from './components/Section3SDGMapping';
import Section4Activities from './components/Section4Activities';
import Section5Outcomes from './components/Section5Outcomes';
import Section6Resources from './components/Section6Resources';
import Section7Partnerships from './components/Section7Partnerships';
import Section8Evidence from './components/Section8Evidence';
import Section9Reflection from './components/Section9Reflection'; // New
import Section10Sustainability from './components/Section10Sustainability'; // Renamed
import { FinalDeclarationCard } from './components/Section11Summary';
import {
    buildOpportunityRecordFlashcard,
    StudentOpportunityFlashcard,
} from '../create-opportunity/StudentOpportunityFlashcard';
import PreReportGuide from './components/PreReportGuide';
import { ReportSectionGuideFloat } from '@/components/report/ReportSectionGuideFloat';
import { ReportSectionBridge, ReportLiveBanner, ReportFlashCard, ReportMissionHero, ReportImpactJourney, ReportExampleSpot, ReportSectionModel, ReportWritingGuide, ReportGlobalCoverage, ReportSectionLeadNote } from './ReportFormChrome';
import { downloadExhibitionFlashcard, shareExhibitionFlashcard } from "./utils/flashcardExport";
import "./community-engagement-report.css";

const MissionHeroView = React.memo(ReportMissionHero);
const JourneyView = React.memo(ReportImpactJourney);
const BridgeView = React.memo(ReportSectionBridge);
const SectionModelView = React.memo(ReportSectionModel);
const LiveBannerView = React.memo(ReportLiveBanner);

type ProjectDetails = { title?: string } & Record<string, unknown>;

type SaveReportResult = { ok: true } | { ok: false; message: string };

function isSubmittedReportLifecycle(status?: string, reportStatus?: string): boolean {
    const st = String(status || "").toLowerCase();
    const rs = String(reportStatus || "").toLowerCase();
    return [
        "submitted",
        "pending_payment",
        "payment_pending",
        "payment_under_review",
        "paid",
        "partner_verified",
        "verified",
        "approved",
        "finalized",
        "under_review",
    ].includes(st) || ["pending_payment", "payment_under_review", "paid"].includes(rs);
}

function formatSaveCatchError(error: unknown, mode: "save" | "submit" = "save"): string {
    const fallback =
        mode === "submit"
            ? "Could not submit report. Please try again."
            : "Could not save progress. Please try again.";
    const timeoutMsg =
        mode === "submit"
            ? "Submit timed out. Check your connection and try again."
            : "Save timed out. Check your connection and try again.";
    if (error instanceof Error) {
        if (error.name === "AbortError") {
            return timeoutMsg;
        }
        const m = error.message || "";
        if (m.includes("Evidence upload failed")) {
            const hint = mode === "submit" ? "then try submitting again." : "then save again.";
            return `${m} Fix or remove the file, ${hint}`;
        }
        if (m.trim()) return m;
    }
    return fallback;
}

/** NestJS / common API envelopes: `message` string or validation array. */
function extractJsonApiMessage(j: Record<string, unknown>): string {
    const m = j.message;
    if (typeof m === "string" && m.trim()) return m.trim();
    if (Array.isArray(m)) {
        const parts = m
            .filter((x): x is string => typeof x === "string")
            .map((s) => s.trim())
            .filter(Boolean);
        if (parts.length) return parts.join(" ");
    }
    for (const k of ["error", "detail"] as const) {
        const v = j[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

/** Appends the per-field / per-member reasons the API sends in `validation_issues`. */
function withValidationIssues(base: string, j: Record<string, unknown>): string {
    const issues = Array.isArray(j.validation_issues) ? j.validation_issues : [];
    const lines = issues
        .map((i) => {
            const row = (i || {}) as { message?: unknown; student_name?: unknown; name?: unknown; section?: unknown };
            const msg = typeof row.message === "string" ? row.message.trim() : "";
            if (!msg) return "";
            const who = typeof row.student_name === "string" ? row.student_name : typeof row.name === "string" ? row.name : "";
            const sec = typeof row.section === "number" ? `Section ${row.section}: ` : "";
            return `${who ? `${who}: ` : ""}${sec}${msg}`;
        })
        .filter(Boolean)
        .slice(0, 6);
    return lines.length ? `${base} ${lines.join(" · ")}` : base;
}

/** Parses JSON/text error bodies from backend `fetch` responses. */
async function httpFailureUserMessage(res: Response, actionLabel: string): Promise<string> {
    const prefix = `${actionLabel} (HTTP ${res.status}).`;
    if (res.status === 413) {
        return `${prefix} Payload too large. Remove or re-upload heavy attachments / evidence files, save again — or ask an admin to increase the API body-size limit on the server.`;
    }
    try {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
            const j = (await res.json()) as Record<string, unknown>;
            const serverMsg = withValidationIssues(extractJsonApiMessage(j), j).trim();
            if (serverMsg && (res.status === 403 || res.status === 401)) {
                return serverMsg;
            }
            if (serverMsg) {
                return `${prefix} ${serverMsg}`;
            }
            return prefix;
        }
        const text = (await res.text()).trim();
        return text ? `${prefix} ${text.slice(0, 240)}` : prefix;
    } catch {
        return prefix;
    }
}

/** Same lifecycle tokens as browse / My Projects (`pickReportStatusFromCheckRow`) — never infer from payload size. */
function shouldSkipPreReportGuide(reportForState: Record<string, unknown>): boolean {
    const w = pickReportStatusFromCheckRow(reportForState);
    return w === "continue" || w === "rejected" || w === "revision" || w === "draft";
}

function ReportFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId =
        searchParams.get('project') ||
        searchParams.get('projectId') ||
        searchParams.get('id');
    const fromSurface = (searchParams.get('from') || '').trim().toLowerCase();
    const memberAttendanceMode = searchParams.get('mode') === 'member-attendance';
    const packageView = searchParams.get('view');
    const wantsPackageView = isStudentImpactPackageView(packageView);
    const {
        activeStep,
        nextStep,
        prevStep,
        validateCurrentSection,
        validationErrors,
        data,
        setFullData,
        setStep,
        setProjectId,
        updateSection,
        setReadOnly,
        isReadOnly,
        isEligibleForSubmission,
        areAllSectionsComplete,
        finalDeclarationComplete,
        canSubmitReport,
        canFinalizeSubmit,
        isTeamLeadForSubmit,
        isTeamMemberAttendanceOnly,
        setMyParticipationIsTeamLead,
        incompleteSectionsSummary,
    } = useReportForm();

    const [isSaving, setIsSaving] = React.useState(false);
    // Stays true from the moment submit succeeds through the redirect below — isSaving alone isn't
    // enough, since it resets in `finally` well before the 2s setTimeout actually navigates away,
    // leaving a window where the Submit button re-enables and a second click can double-POST.
    const [submitSucceeded, setSubmitSucceeded] = React.useState(false);
    const postSubmitNavTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [aiStatus, setAiStatus] = React.useState<string | null>(null);
    const [projectDetails, setProjectDetails] = React.useState<ProjectDetails | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [showGuide, setShowGuide] = React.useState(true);
    const [helpSignal, setHelpSignal] = React.useState(0);
    const [opportunityFlashOpen, setOpportunityFlashOpen] = React.useState(false);

    const goBackToPreviousPage = React.useCallback(() => {
        if (fromSurface === 'wall') {
            router.push('/dashboard/student/paths/community-service?view=wall');
            return;
        }
        if (fromSurface === 'files') {
            router.push('/dashboard/student/paths/community-service?view=files');
            return;
        }
        const st = String(data?.status || "").toLowerCase();
        const rs = String(data?.report_status || "").toLowerCase();
        const adm = String(data?.admin_status || data?.admin_approval_status || "").toLowerCase();
        const fac = String(data?.faculty_status || "").toLowerCase();
        let filter: "ready" | "reports" | "review" | "action" | "completed" | "archived" = "reports";
        if (st.includes("revision") || fac.includes("revision") || adm.includes("revision")) {
            filter = "action";
        } else if (st === "rejected" || fac === "rejected") {
            filter = "archived";
        } else if (["verified", "approved"].includes(st) || ["verified", "approved"].includes(adm)) {
            filter = "completed";
        } else if (
            reportRequiresReportingFee(data) &&
            isStudentReportAwaitingReview(data) &&
            (["pending_payment", "payment_pending", "payment_under_review"].includes(st) ||
                ["pending_payment", "payment_under_review"].includes(rs))
        ) {
            filter = "reports";
        } else if (isStudentReportAwaitingReview(data) || submitSucceeded) {
            filter = "review";
        }
        router.push(`/dashboard/student/paths/community-service?view=workspace&filter=${filter}`);
    }, [router, fromSurface, submitSucceeded, data, data?.status, data?.report_status, data?.admin_status, data?.admin_approval_status, data?.faculty_status, data?.private_candidate, data?.review_route, data?.is_editable]);

    React.useEffect(() => {
        return () => {
            if (postSubmitNavTimerRef.current) clearTimeout(postSubmitNavTimerRef.current);
        };
    }, []);

    React.useEffect(() => {
        if (memberAttendanceMode) {
            setMyParticipationIsTeamLead(false);
        }
    }, [memberAttendanceMode, setMyParticipationIsTeamLead]);

    React.useEffect(() => {
        if (!wantsPackageView) return;
        setShowGuide(false);
        setStep(FLASH_CARD_STEP);
    }, [wantsPackageView, setStep]);

    const resolveEngagementSeatForProject = React.useCallback(async () => {
        const myRes = await authenticatedFetch(`/api/v1/engagement/my`);
        if (!myRes?.ok) return null;
        const myJson = await myRes.json().catch(() => ({}));
        const rows = Array.isArray(myJson.data) ? myJson.data : [];
        return pickPreferredEngagementSeat(rows, projectId || "");
    }, [projectId]);

    // Initial Load
    React.useEffect(() => {
        if (!projectId) {
            router.push('/dashboard/student');
            return;
        }
        setProjectId(projectId);
        fetchProjectAndReport();
    }, [projectId]);

    const fetchProjectAndReport = async () => {
        if (!projectId) return;
        try {
            setIsLoading(true);
            const [projectRes, reportRes] = await Promise.all([
                authenticatedFetch(`/api/v1/student/projects/${projectId}`),
                authenticatedFetch(`/api/v1/student/reports/${projectId}`)
            ]);

            const myPart = await resolveEngagementSeatForProject();
            const isLeadFlag = Boolean(
                myPart &&
                    (myPart.isTeamLead === true ||
                        myPart.is_team_lead === true ||
                        String(myPart.is_team_lead ?? "").toLowerCase() === "true"),
            );
            const teamSeatId = String(myPart?.teamId || myPart?.team_id || "").trim();
            const isTeamSeat = Boolean(
                myPart &&
                    (myPart.participationMode === "team" ||
                        myPart.participation_mode === "team" ||
                        teamSeatId),
            );
            const isTeamMemberSeat = isTeamSeat && !isLeadFlag;
            if (isTeamMemberSeat || memberAttendanceMode) {
                setMyParticipationIsTeamLead(false);
                setShowGuide(false);
            } else if (myPart) {
                setMyParticipationIsTeamLead(isLeadFlag);
            } else {
                setMyParticipationIsTeamLead(null);
            }

            let projectPayload: Record<string, unknown> | null = null;

            if (projectRes && projectRes.ok) {
                const projectData = await projectRes.json();
                const pInfo = projectData.data || projectData;
                projectPayload = pInfo as Record<string, unknown>;
                setProjectDetails(pInfo);

                const isStudentOwner = Boolean(
                    pInfo.is_student_owner === true ||
                        pInfo.isStudentOwner === true,
                );
                // Team members already have a seat — they must be able to read the shared report
                // even if a leftover pending join-application overlay is still on the project payload.
                if (
                    !isTeamMemberSeat &&
                    !canStudentAccessReportForProjectPayload(pInfo as Record<string, unknown>, { isStudentOwner })
                ) {
                    toast.error('Approval is required to start/edit a report for this project.');
                    router.push('/dashboard/student');
                    return;
                }
            }

            const pickOpportunityTitle = (p: Record<string, unknown> | null): string => {
                if (!p) return "";
                const keys = ["title", "name", "opportunity_title", "project_title", "opportunity_name"] as const;
                for (const k of keys) {
                    const v = p[k];
                    if (typeof v === "string" && v.trim()) return v.trim();
                }
                return "";
            };

            if (reportRes && reportRes.ok) {
                const reportData = await reportRes.json();
                const actualReportData = reportData.data || reportData; // Handle potential wrapper
                if (actualReportData && Object.keys(actualReportData).length > 0) {
                    const existingTitle = String(
                        (actualReportData as { project_title?: string }).project_title || "",
                    ).trim();
                    const titleFromProject = pickOpportunityTitle(projectPayload);
                    const impactVerifyNormalized = pickImpactVerifyUrlFromPayload(actualReportData);
                    const mergedReport = {
                        ...actualReportData,
                        project_id:
                            String(
                                (actualReportData as { project_id?: string }).project_id ||
                                    (actualReportData as { projectId?: string }).projectId ||
                                    (actualReportData as { opportunityId?: string }).opportunityId ||
                                    projectId ||
                                    "",
                            ).trim() || projectId,
                        ...(!existingTitle && titleFromProject ? { project_title: titleFromProject } : {}),
                        ...(impactVerifyNormalized ? { impact_verify_url: impactVerifyNormalized } : {}),
                    };

                    let reportForState: Record<string, unknown> = mergedReport as Record<string, unknown>;
                    let reportIsSubmitted = false;
                    try {
                        const myRes = await authenticatedFetch(`/api/v1/engagement/my`);
                        if (myRes && myRes.ok) {
                            const myJson = await myRes.json();
                            const rows = Array.isArray(myJson.data) ? myJson.data : [];
                            const myPart = pickPreferredEngagementSeat(rows, projectId || "");
                            if (myPart) {
                                const isLeadFlag =
                                    myPart.isTeamLead === true ||
                                    myPart.is_team_lead === true ||
                                    String(myPart.is_team_lead ?? "").toLowerCase() === "true";
                                const teamSeatId = String(myPart.teamId || myPart.team_id || "").trim();
                                const isTeamSeat =
                                    myPart.participationMode === "team" ||
                                    myPart.participation_mode === "team" ||
                                    Boolean(teamSeatId);
                                const isTeamMemberSeat = isTeamSeat && !isLeadFlag;
                                if (isTeamMemberSeat) {
                                    setMyParticipationIsTeamLead(false);
                                    setShowGuide(false);
                                } else {
                                    setMyParticipationIsTeamLead(isLeadFlag);
                                }
                                const teamRes = await authenticatedFetch(
                                    `/api/v1/engagement/project/${encodeURIComponent(projectId)}/team`,
                                );
                                if (teamRes && teamRes.ok) {
                                    const teamJson = await teamRes.json();
                                    const teamRows =
                                        teamJson.success && Array.isArray(teamJson.data) ? teamJson.data : [];
                                    const needsRevisionPreview = isReportReturnedForRevision({
                                        status: reportForState.status as string | undefined,
                                        report_status: reportForState.report_status as string | undefined,
                                        admin_status: reportForState.admin_status as string | undefined,
                                        admin_approval_status: reportForState.admin_approval_status as string | undefined,
                                        partner_status: reportForState.partner_status as string | undefined,
                                        faculty_status: reportForState.faculty_status as string | undefined,
                                    });
                                    reportIsSubmitted =
                                        !needsRevisionPreview &&
                                        isStudentReportAwaitingReview({
                                            status: reportForState.status as string | undefined,
                                            report_status: reportForState.report_status as string | undefined,
                                            admin_status: reportForState.admin_status as string | undefined,
                                            admin_approval_status: reportForState.admin_approval_status as
                                                | string
                                                | undefined,
                                            is_editable: reportForState.is_editable as boolean | undefined,
                                        });
                                    reportForState = reportIsSubmitted
                                        ? mergeReportSection1TeamScopeForCertificate(
                                              reportForState,
                                              myPart,
                                              teamRows,
                                          )
                                        : mergeReportSection1TeamScope(reportForState, myPart, teamRows);
                                }
                            } else {
                                setMyParticipationIsTeamLead(null);
                            }
                        }
                    } catch (scopeErr) {
                        console.warn("[Report] Section 1 team scope normalization skipped:", scopeErr);
                    }

                    try {
                        const attendanceRes = await authenticatedFetch(
                            `/api/v1/engagement/project/${encodeURIComponent(projectId)}/attendance-logs`,
                        );
                        if (attendanceRes && attendanceRes.ok) {
                            const attendanceJson = await attendanceRes.json();
                            const rawLogs = Array.isArray(attendanceJson.data) ? attendanceJson.data : [];
                            // Live project logs win — including an empty list after admin delete.
                            // Do not keep stale section1.attendance_logs when the API returns [].
                            const section1 = ((reportForState.section1 as Record<string, unknown> | undefined) || {});
                            reportForState = {
                                ...reportForState,
                                section1: {
                                    ...section1,
                                    attendance_logs: rawLogs.map((log: Record<string, unknown>) =>
                                        normalizeEngagementAttendanceLog(log),
                                    ),
                                },
                            };
                        }
                    } catch (attendanceErr) {
                        console.warn("[Report] Attendance log refresh skipped:", attendanceErr);
                    }

                    const reportAccess = reportForState.report_access as
                        | {
                              is_team_lead?: boolean;
                              can_submit_report?: boolean;
                              can_edit_report_body?: boolean;
                          }
                        | undefined;
                    if (reportAccess) {
                        if (
                            reportAccess.can_submit_report === false ||
                            reportAccess.can_edit_report_body === false ||
                            reportAccess.is_team_lead === false
                        ) {
                            setMyParticipationIsTeamLead(false);
                            setShowGuide(false);
                        } else if (typeof reportAccess.is_team_lead === "boolean") {
                            setMyParticipationIsTeamLead(reportAccess.is_team_lead);
                        }
                    }

                    setFullData(reportForState as typeof mergedReport);
                    const st = String((reportForState.status as string | undefined) || "").toLowerCase();
                    const adminSt = String(
                        (reportForState.admin_status as string | undefined) ||
                            (reportForState.admin_approval_status as string | undefined) ||
                            "",
                    ).toLowerCase();
                    const needsRevision = isReportReturnedForRevision({
                        status: reportForState.status as string | undefined,
                        report_status: reportForState.report_status as string | undefined,
                        admin_status: reportForState.admin_status as string | undefined,
                        admin_approval_status: reportForState.admin_approval_status as string | undefined,
                        partner_status: reportForState.partner_status as string | undefined,
                        faculty_status: reportForState.faculty_status as string | undefined,
                    });
                    const isSubmitted =
                        reportIsSubmitted ||
                        (!needsRevision &&
                            isStudentReportAwaitingReview({
                                status: st,
                                report_status: reportForState.report_status as string | undefined,
                                admin_status: adminSt,
                                is_editable: reportForState.is_editable as boolean | undefined,
                            }));
                    if (needsRevision) {
                        setShowGuide(false);
                        setReadOnly(false);
                    } else if (isSubmitted) {
                        // Report already submitted — skip guide, go straight to summary
                        setShowGuide(false);
                        setStep(FLASH_CARD_STEP);
                        setReadOnly(true);
                    } else if (shouldSkipPreReportGuide(reportForState)) {
                        setShowGuide(false);
                    }
                } else {
                    // Report deleted / empty payload — wipe reflection, CII, and section bodies.
                    setFullData({
                        project_id: projectId,
                        project_title: pickOpportunityTitle(projectPayload),
                        status: "none",
                    } as typeof data);
                    setReadOnly(false);
                }
            } else {
                // 404 after admin delete — start clean so old reflection cannot stick in client state.
                setFullData({
                    project_id: projectId,
                    project_title: pickOpportunityTitle(projectPayload),
                    status: "none",
                } as typeof data);
                setReadOnly(false);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load project details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Team members may read every section of the shared report. They still cannot save
        // or submit sections 2–10 — only the team lead files the body.
        if (isTeamMemberAttendanceOnly) {
            if (isFlashCardStep(activeStep)) return;
            setStep(nextReportStep(activeStep));
            return;
        }

        const isValid = validateCurrentSection();
        
        if (activeStep < FLASH_CARD_STEP) {
            setIsSaving(true);
            let updatedData = { ...data };

            // Auto-generate AI Summary for specific sections (non-blocking for navigation if save succeeds)
            const dataNums = dataSectionsToSummarize(activeStep);
            let aiSummaryIssue: string | null = null;
            const stepsForAi = dataNums.filter((n) => {
                if (n === 4) return validateSection4(data.section4).isValid;
                if (n === 5) return validateSection5(data.section5).isValid;
                return isValid;
            });
            if (stepsForAi.length) {
                setAiStatus('Analyzing Data & Writing Summary...');
                try {
                    const { generateAISummary } = await import('./utils/aiSummarizer');
                    for (const stepNum of stepsForAi) {
                        const sectionKey = `section${stepNum}` as Exclude<keyof typeof data, 'project_id'>;
                        try {
                            const summaryRes = await generateAISummary(sectionKey, data[sectionKey]);
                            if (summaryRes.summary) {
                                updatedData = {
                                    ...updatedData,
                                    [sectionKey]: {
                                        ...(updatedData[sectionKey] as Record<string, unknown>),
                                        summary_text: summaryRes.summary
                                    }
                                };
                                updateSection(sectionKey, { summary_text: summaryRes.summary });
                            } else if (summaryRes.error) {
                                aiSummaryIssue = summaryRes.error;
                            }
                        } catch (error) {
                            console.error('Failed to auto-generate summary', error);
                            aiSummaryIssue =
                                error instanceof Error ? error.message : 'Auto-summary request failed.';
                        }
                    }
                } catch (error) {
                    console.error('Failed to auto-generate summary', error);
                    aiSummaryIssue =
                        error instanceof Error ? error.message : 'Auto-summary request failed.';
                }
            }

            if (!isTeamMemberAttendanceOnly) {
                setAiStatus('Saving Progress...');
                const saveResult = await handleSave(true, updatedData);
                if (!saveResult.ok) {
                    toast.error(saveResult.message);
                    return;
                }
            }

            if (aiSummaryIssue) {
                toast.warning(
                    `Step saved, but the auto-summary did not complete: ${aiSummaryIssue} You can edit the summary field on this step or try Next again.`,
                );
            }
            
            if (!isValid) {
                toast.info("Draft saved. Some fields need attention before submission.");
            }

            if (activeStep === FLASH_CARD_STEP - 1 && !isEligibleForSubmission && !needsRevision) {
                toast.error(
                    "Summary unlocks when every student has met the required hours (100% compliance). Log attendance in Section 1 first.",
                );
                setBlockedSubmitOpen(true);
                setAiStatus("");
                setIsSaving(false);
                return;
            }
            
            nextStep();
            window.scrollTo(0, 0);
        } else {
            if (!canFinalizeSubmit) {
                if (canSubmitReport && !isTeamLeadForSubmit) {
                    toast.error('Only your team lead can submit this team report.');
                } else if (!isEligibleForSubmission) {
                    toast.error(
                        `Minimum logged hours not met (${sumNonRejectedLoggedHours(data.section1?.attendance_logs || [])}/${data.required_hours || 16}). Complete Section 1 first.`,
                    );
                } else {
                    toast.error('Complete all required fields in every section before submitting.');
                }
                setBlockedSubmitOpen(true);
                return;
            }
            handleSubmit();
        }
    };

    const handleSave = async (silent = false, customData = data): Promise<SaveReportResult> => {
        if (!isSaving) setIsSaving(true);
        try {
            if (isReadOnly) {
                const message = 'This report is locked and cannot be edited.';
                if (!silent) toast.error(message);
                return { ok: false, message };
            }
            if (isTeamMemberAttendanceOnly) {
                if (!silent) {
                    toast.info('Only your team lead can save report sections. Update your attendance in Section 1.');
                }
                return { ok: true };
            }
            if (isSubmittedReportLifecycle(customData.status, customData.report_status)) {
                return { ok: true };
            }

            setAiStatus('Uploading Evidence...');
            const projectIdForSave = customData.project_id || projectId || '';
            const dataForSave = projectIdForSave
                ? await prepareReportEvidenceForSave(customData, projectIdForSave)
                : customData;

            const res = await authenticatedFetch(`/api/v1/student/reports/draft`, {
                method: 'POST',
                body: JSON.stringify({
                    ...dataForSave,
                    status: 'continue'
                })
            }, {
                timeoutMs: 120000
            });

            if (!res) {
                const message =
                    'Save failed: no response from server (session may have expired). Sign in again and retry.';
                if (!silent) toast.error(message);
                return { ok: false, message };
            }

            if (!res.ok) {
                const message = await httpFailureUserMessage(res, "Could not save draft");
                if (!silent) toast.error(message);
                return { ok: false, message };
            }

            if (projectIdForSave) setFullData(dataForSave);
            if (!silent) toast.success('Progress saved');
            return { ok: true };
        } catch (error) {
            console.error(error);
            const message = formatSaveCatchError(error, "save");
            if (!silent) toast.error(message);
            return { ok: false, message };
        } finally {
            setIsSaving(false);
            setAiStatus(null);
        }
    };

    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
    const [blockedSubmitOpen, setBlockedSubmitOpen] = React.useState(false);

    const goFixIncomplete = React.useCallback((dataSection: number) => {
        setBlockedSubmitOpen(false);
        setStep(dataSectionToWizardStep(dataSection));
    }, [setStep]);

    const handleSubmit = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (isReadOnly) return;
        if (isTeamMemberAttendanceOnly) {
            toast.error('Only your team lead can submit this team report.');
            return;
        }

        setIsConfirmOpen(true);
    };

    const confirmSubmit = async () => {
        if (submitSucceeded) return;
        const hoursOk = loggedHoursClearSubmitBar({
            logs: data.section1?.attendance_logs || [],
            requiredHours: data.required_hours || 16,
            rosterIds: buildIndividualRosterFromSection1(
                data.section1,
                data.section1?.team_lead?.id,
            ),
        });
        const stillIncomplete = getIncompleteSectionsSummary(data);
        if (!hoursOk || stillIncomplete.length > 0) {
            toast.error('Report is not ready to submit. Fix the items below and try again.');
            setIsConfirmOpen(false);
            setBlockedSubmitOpen(true);
            return;
        }

        setIsConfirmOpen(false);
        setIsSaving(true);
        try {
            let submitData = data;

            // Local CII snapshot only — do not block submit on ChatGPT. The OpenAI
            // section11 audit can take up to 3 minutes and is not a submit gate.
            // Admin CII v3.1 analyser still runs later from the review package.
            try {
                setAiStatus('Preparing report...');
                const ciiResult = calculateCII(data);
                // section11.summary_text is only ever written by the (removed-from-submit) OpenAI
                // audit call, so on a resubmit-after-revision it's still the PREVIOUS cycle's prose
                // — nothing clears it when the student edits sections 1-10 and resubmits.
                // readPersistedCiiSnapshot regex-parses a "Final Adjusted CII Score" line out of
                // that text and would silently overwrite the freshly calculated score with the old
                // one. Strip it here so only the just-computed ciiResult can win.
                const snapshot = readPersistedCiiSnapshot({
                    ...data,
                    ciiV45: undefined,
                    ciiV45Lock: undefined,
                    cii_index: ciiResult,
                    section11: { ...data.section11, summary_text: undefined, cii_index: ciiResult },
                }) ?? ciiResult;
                submitData = {
                    ...data,
                    cii_index: snapshot,
                    section11: {
                        ...data.section11,
                        cii_index: snapshot,
                    },
                };
            } catch (ciiError) {
                console.error('Failed to attach local CII snapshot', ciiError);
            }

            setAiStatus('Uploading Evidence...');
            submitData = await prepareReportEvidenceForSave(submitData, projectId || submitData.project_id, true);
            setFullData(submitData);

            const submitProjectId = String(projectId || submitData.project_id || "").trim();
            if (!submitProjectId) {
                toast.error("Submit failed: this report is not linked to a project. Open it from your project page.");
                return;
            }
            const res = await authenticatedFetch(`/api/v1/student/reports/${encodeURIComponent(submitProjectId)}/submit`, {
                method: 'POST',
                body: JSON.stringify({
                    ...submitData,
                    submit: true,
                    opportunityId: projectId || submitData.project_id,
                    project_id: projectId || submitData.project_id,
                })
            }, {
                timeoutMs: 120000
            });

            if (!res) {
                toast.error(
                    'Submit failed: no response from server (session may have expired). Sign in again and retry.',
                );
                return;
            }
            if (!res.ok) {
                const message = await httpFailureUserMessage(res, "Could not submit report");
                toast.error(message);
                return;
            }

            const payload = (await res.json().catch(() => null)) as {
                data?: {
                    status?: string;
                    private_candidate?: boolean;
                    review_route?: string;
                };
            } | null;
            const submittedStatus = String(payload?.data?.status || "").toLowerCase();
            const routeFlags = {
                private_candidate:
                    payload?.data?.private_candidate ??
                    (submitData as { private_candidate?: boolean }).private_candidate,
                review_route:
                    payload?.data?.review_route ??
                    (submitData as { review_route?: string }).review_route,
            };
            const feeRequired = reportRequiresReportingFee(routeFlags);
            const nextStatus = feeRequired
                ? submittedStatus || "pending_payment"
                : submittedStatus || "submitted";

            setSubmitSucceeded(true);
            setReadOnly(true);
            setStep(FLASH_CARD_STEP);
            setFullData({
                ...submitData,
                status: nextStatus,
                report_status: nextStatus,
                private_candidate: routeFlags.private_candidate,
                review_route: routeFlags.review_route,
            });
            if (feeRequired) {
                toast.success("Report submitted! Redirecting to payment...");
            } else {
                toast.success(`Report submitted. ${communityReportReviewerName(routeFlags)} will review it next.`);
            }
            postSubmitNavTimerRef.current = setTimeout(() => {
                window.location.href = studentReportPostSubmitHref({
                    feeRequired,
                    projectId: submitProjectId,
                });
            }, feeRequired ? 2000 : 1200);
        } catch (error) {
            console.error(error);
            toast.error(formatSaveCatchError(error, "submit"));
        } finally {
            setIsSaving(false);
            setAiStatus(null);
        }
    };

    const reportStatusLower = String(data?.status || "").toLowerCase();
    const adminStatusLower = String(data?.admin_status || "").toLowerCase();
    const needsRevision = React.useMemo(
        () =>
            isReportReturnedForRevision({
                status: data?.status,
                report_status: data?.report_status,
                admin_status: data?.admin_status,
                admin_approval_status: data?.admin_approval_status,
                partner_status: data?.partner_status,
                faculty_status: data?.faculty_status,
            }),
        [data?.status, data?.report_status, data?.admin_status, data?.admin_approval_status, data?.partner_status, data?.faculty_status],
    );
    const postSubmitAwaitingReview = React.useMemo(() => {
        if (needsRevision) return false;
        return isStudentReportAwaitingReview(data);
    }, [needsRevision, data]);
    /** Same gate as Section 11 “Report Approved & Impact Verified” — CII index must stay on summary only. */
    const ciiVerifiedSummaryLock = React.useMemo(
        () =>
            reportStatusLower === "verified" ||
            reportStatusLower === "approved" ||
            adminStatusLower === "verified" ||
            adminStatusLower === "approved",
        [reportStatusLower, adminStatusLower],
    );
    const summaryOnlyWorkspace = React.useMemo(
        () =>
            canSubmitReport &&
            !isReadOnly &&
            !needsRevision &&
            reportStatusLower !== "rejected" &&
            reportStatusLower !== "revision",
        [canSubmitReport, isReadOnly, needsRevision, reportStatusLower],
    );
    const stepperLockedToSummaryOnly = summaryOnlyWorkspace || ciiVerifiedSummaryLock;
    const deferredData = React.useDeferredValue(data);
    const incompleteStepNums = React.useMemo(
        () => new Set(incompleteSectionsSummary.map((block) => block.section)),
        [incompleteSectionsSummary],
    );
    const sectionsCompleteCount = uiSectionsCompleteCount(incompleteStepNums);
    const progressPct = Math.round((sectionsCompleteCount / REPORT_UI_SECTION_TOTAL) * 100);
    const sendBlockLabels = React.useMemo(() => {
        const labels = incompleteSectionsSummary.map((block) =>
            formatIncompleteSectionHeading(block.section, block.label),
        );
        if (!isEligibleForSubmission && !labels.some((label) => /section 1|hours|attendance|participation/i.test(label))) {
            labels.push("minimum hours (every teammate)");
        }
        if (!finalDeclarationComplete) labels.push("final declaration");
        if (canSubmitReport && !isTeamLeadForSubmit) labels.push("team-lead submit only");
        return labels;
    }, [
        incompleteSectionsSummary,
        isEligibleForSubmission,
        finalDeclarationComplete,
        canSubmitReport,
        isTeamLeadForSubmit,
    ]);
    const openSectionHelp = React.useCallback(() => setHelpSignal((n) => n + 1), []);
    const goJourneyRef = React.useRef<(step: number) => void>(() => {});
    goJourneyRef.current = (step: number) => {
        const lockedSummary = stepperLockedToSummaryOnly && step !== FLASH_CARD_STEP;
        // Team members can read every shared-report stop; they still cannot save/submit the body.
        if (lockedSummary) return;
        const isActive = tabMatchesStep(step, activeStep);
        const isCompleted = activeStep > step;
        if (isCompleted || isReadOnly || activeStep < FLASH_CARD_STEP) {
            setStep(step);
        } else if (!isActive && validateCurrentSection()) {
            setStep(step);
        } else if (!isActive) {
            toast.info("Navigating to step. Please complete mandatory fields later.");
            setStep(step);
        }
    };
    const goJourney = React.useCallback((step: number) => {
        goJourneyRef.current(step);
    }, []);

    React.useEffect(() => {
        if (isLoading || showGuide) return;
        if (!summaryOnlyWorkspace && !ciiVerifiedSummaryLock) return;
        if (activeStep !== FLASH_CARD_STEP) setStep(FLASH_CARD_STEP);
    }, [isLoading, showGuide, summaryOnlyWorkspace, ciiVerifiedSummaryLock, activeStep, setStep]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#0e7d74]" />
            </div>
        );
    }

    const projectTitle = String(projectDetails?.title || data?.project_title || "").trim() || "Community engagement report";
    const projectPaymentId = String(
        data?.project_id ||
            (data as { projectId?: string } | null)?.projectId ||
            (data as { opportunityId?: string } | null)?.opportunityId ||
            "",
    ).trim();
    const paymentHref = projectPaymentId
        ? `/dashboard/student/payment?projectId=${encodeURIComponent(projectPaymentId)}`
        : "";
    const onFlash = isFlashCardStep(activeStep);

    const shareReport = async () => {
        await shareExhibitionFlashcard({
            title: projectTitle,
            verifyUrl: pickImpactVerifyUrlFromPayload(data) || data?.impact_verify_url,
        });
    };

    if (showGuide) {
        return (
            <div className="max-w-none mx-auto px-4 md:px-8 py-5">
                <PreReportGuide
                    projectTitle={projectDetails?.title}
                    onStart={() => {
                        setStep(1);
                        setShowGuide(false);
                    }}
                />
            </div>
        );
    }

    return (
        <div className={onFlash ? "cer cer-ipkg" : "cer"}>
            <div className="cer-wrap">
                <div className="cer-sticky-head">
                <div className="cer-apph cer-apph-actions">
                    <div className="cer-actions">
                        <button
                            type="button"
                            className="cer-ghost"
                            onClick={goBackToPreviousPage}
                        >
                            ← Back to my reports
                        </button>
                        {onFlash ? null : (
                            <button
                                type="button"
                                className="cer-ghost"
                                onClick={() => setOpportunityFlashOpen(true)}
                                disabled={!projectDetails}
                            >
                                Opportunity flash card
                            </button>
                        )}
                    </div>
                    <div className="cer-actions">
                        {onFlash ? null : (
                            <>
                                <button
                                    type="button"
                                    className="cer-ghost"
                                    onClick={() => void downloadExhibitionFlashcard(projectTitle)}
                                >
                                    Download
                                </button>
                                <button type="button" className="cer-ghost" onClick={() => void shareReport()}>
                                    Share
                                </button>
                            </>
                        )}
                        {!isReadOnly && !isTeamMemberAttendanceOnly && !onFlash ? (
                            <button
                                type="button"
                                className="cer-ghost"
                                onClick={() => handleSave(false)}
                                disabled={isSaving}
                            >
                                {isSaving ? "Saving…" : "Save draft"}
                            </button>
                        ) : null}
                        {!onFlash ? (
                            <div className="cer-prog">
                                <span className="cer-pt">{sectionsCompleteCount}/{REPORT_UI_SECTION_TOTAL}</span>
                                <span className="cer-pb">
                                    <i style={{ width: `${progressPct}%` }} />
                                </span>
                            </div>
                        ) : null}
                    </div>
                </div>
                </div>

                {isTeamMemberAttendanceOnly ? (
                    <div className="cer-note">
                        Team member — you can read the full shared report. Only Section 1 attendance can be updated. Your team lead files and submits.
                        {" "}
                        {onFlash ? (
                            <button type="button" className="cer-ghost" onClick={() => goJourney(1)}>
                                ← Back to Section 1
                            </button>
                        ) : (
                            <button type="button" className="cer-ghost" onClick={() => goJourney(FLASH_CARD_STEP)}>
                                View Flash Card →
                            </button>
                        )}
                    </div>
                ) : null}

                {!onFlash ? <MissionHeroView data={deferredData} projectData={projectDetails} /> : null}

                {!onFlash && !stepperLockedToSummaryOnly ? (
                    <JourneyView
                        data={deferredData}
                        activeStep={activeStep}
                        incompleteStepNums={incompleteStepNums}
                        sectionsCompleteCount={sectionsCompleteCount}
                        onGo={goJourney}
                    />
                ) : null}

                {!onFlash ? (
                    <>
                        <BridgeView
                            step={activeStep}
                            data={deferredData}
                            projectData={projectDetails}
                            onOpenHelp={openSectionHelp}
                        />
                        {activeStep === 1 ? (
                            <div className="cer-own">
                                <div>
                                    <div className="ey">REPORT OWNERSHIP & ACCESS</div>
                                    <b>{isTeamMemberAttendanceOnly ? "Team member · attendance only" : "Master Student · Report Owner"}</b>
                                    <p>
                                        {isTeamMemberAttendanceOnly
                                            ? "You can read every section of the shared report. Only your own attendance can be edited. The team lead writes Sections 2–9 and submits."
                                            : "You control Sections 1–9, team setup, final declarations and submission."}
                                    </p>
                                </div>
                            </div>
                        ) : null}
                        <ReportWritingGuide step={activeStep} />
                        <ReportExampleSpot step={activeStep} />
                        <ReportGlobalCoverage step={activeStep} />
                        <ReportSectionLeadNote step={activeStep} />
                        <SectionModelView step={activeStep} data={deferredData} />
                    </>
                ) : null}

                <div>
                    {activeStep === 1 && <Section1Participation projectData={projectDetails} />}
                    {activeStep === 2 && <Section2ProjectContext projectData={projectDetails} />}
                    {activeStep === 3 && <Section3SDGMapping projectData={projectDetails} />}
                    {isMergedActivitiesStep(activeStep) && (
                        <div className="cer-s4">
                            <div className="cer-partk">PART A · WHAT WE DID — ACTIVITY BY ACTIVITY</div>
                            <Section4Activities />
                            <div className="cer-partk">PART B · WHAT CHANGED BECAUSE OF IT</div>
                            <Section5Outcomes />
                        </div>
                    )}
                    {activeStep === 5 && <Section6Resources projectData={projectDetails} />}
                    {activeStep === 6 && <Section7Partnerships projectData={projectDetails} />}
                    {activeStep === 7 && <Section8Evidence />}
                    {activeStep === 8 && <Section9Reflection />}
                    {activeStep === 9 && <Section10Sustainability />}
                    {isFlashCardStep(activeStep) && (
                        <>
                            <ReportFlashCard
                                data={data}
                                projectData={projectDetails}
                                sectionsComplete={sectionsCompleteCount}
                                missingLabels={sendBlockLabels}
                                canSend={(canFinalizeSubmit || needsRevision) && !isReadOnly && !isTeamMemberAttendanceOnly}
                                onSend={!isReadOnly && !isTeamMemberAttendanceOnly ? handleSubmit : undefined}
                                sending={isSaving}
                                paymentHref={paymentHref || undefined}
                            />
                            {isTeamMemberAttendanceOnly ? (
                                <div className="mt-4 flex flex-wrap items-center gap-5 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--teal-soft)] via-white to-white p-6">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--teal-soft)]">
                                        <CheckCircle className="h-8 w-8 text-[var(--teal)]" />
                                    </div>
                                    <div className="min-w-[220px] flex-1 space-y-2">
                                        <span className="inline-block rounded-full bg-[var(--teal-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--teal)]">
                                            Project Complete
                                        </span>
                                        <h3 className="text-2xl font-extrabold text-[var(--ink)]">Great work, team!</h3>
                                        <p className="text-sm text-[var(--muted)]">Your project is ready for final reporting.</p>
                                        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold-soft)] px-4 py-2 text-sm font-bold text-[var(--gold)]">
                                            <span className="h-2 w-2 rounded-full bg-[var(--gold)]" />
                                            Only the Team Lead can submit the Final Report.
                                        </span>
                                    </div>
                                </div>
                            ) : !isReadOnly && !postSubmitAwaitingReview ? (
                                <div className="mt-5 space-y-4 rounded-2xl border border-[#d9dfd4] bg-[#fffef9] p-6">
                                    {!isEligibleForSubmission ? (
                                        <p className="rounded-xl border border-[#efdbb6] bg-[#fff1d8] px-4 py-3 text-sm text-[#744c10]">
                                            Submit stays closed until every teammate has logged their own required hours.
                                            Amber chips on Participation show who is still short. Hours cannot be pooled from one member to another.
                                        </p>
                                    ) : null}
                                    {sendBlockLabels.length > 0 ? (
                                        <p className="text-sm text-[#61716c]">
                                            Still needed: {sendBlockLabels.join(" · ")}.
                                        </p>
                                    ) : null}
                                    <FinalDeclarationCard
                                        declaration={data.section11?.final_declaration || [false, false, false, false, false]}
                                        signatureName={data.section11?.signature_name || ""}
                                        requiresFee={reportRequiresReportingFee(data)}
                                        onToggle={(i) => {
                                            const next = [...(data.section11?.final_declaration || [false, false, false, false, false])];
                                            next[i] = !next[i];
                                            const allNowChecked = next.slice(0, 5).every(Boolean);
                                            updateSection("section11", {
                                                final_declaration: next,
                                                ...(allNowChecked && (data.section11?.signature_name || "").trim()
                                                    ? { signed_at: new Date().toISOString() }
                                                    : {}),
                                            });
                                        }}
                                        onSignatureChange={(value) => {
                                            const flags = data.section11?.final_declaration || [false, false, false, false, false];
                                            const allChecked = flags.slice(0, 5).every(Boolean);
                                            updateSection("section11", {
                                                signature_name: value,
                                                ...(allChecked && value.trim()
                                                    ? { signed_at: data.section11?.signed_at || new Date().toISOString() }
                                                    : {}),
                                            });
                                        }}
                                    />
                                    <p className="mx-auto max-w-lg text-center text-xs text-[#61716c]">
                                        After you submit, this flashcard is the locked package. Score, badge, QR and downloads unlock when CIEL PK Super Admin approves.
                                    </p>
                                </div>
                            ) : postSubmitAwaitingReview ? (
                                <p className="mt-4 rounded-xl border border-[#d9dfd4] bg-[#fffef9] px-4 py-3 text-sm text-[#61716c]">
                                    Report submitted. CIEL PK is reviewing this flashcard. Score and downloads unlock after Super Admin approval.
                                </p>
                            ) : null}
                        </>
                    )}
                </div>
                {activeStep >= 1 && activeStep < FLASH_CARD_STEP && activeStep !== 3 ? (
                    <LiveBannerView step={activeStep} data={deferredData} projectData={projectDetails} />
                ) : null}

            {!ciiVerifiedSummaryLock &&
                activeStep !== 1 &&
                !(isFlashCardStep(activeStep) && postSubmitAwaitingReview && isReadOnly) && (
                <div className="cer-foot">
                    <div>
                        {((!isReadOnly && !summaryOnlyWorkspace) || isTeamMemberAttendanceOnly) && (
                            <button
                                type="button"
                                className="cer-prev"
                                onClick={() => (isTeamMemberAttendanceOnly ? setStep(prevReportStep(activeStep)) : prevStep())}
                                disabled={activeStep === 1}
                            >
                                Previous step
                            </button>
                        )}
                    </div>

                    {!isReadOnly &&
                        !summaryOnlyWorkspace &&
                        activeStep < FLASH_CARD_STEP &&
                        !isTeamMemberAttendanceOnly && (
                        <button
                            type="button"
                            className="cer-save"
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving…" : `Save section ${uiStepLabel(activeStep)}`}
                        </button>
                    )}

                    <div>
                        {!(isFlashCardStep(activeStep) && postSubmitAwaitingReview) && (
                            <button
                                type="button"
                                className="cer-next"
                                onClick={handleNext}
                                disabled={
                                    isSaving ||
                                    submitSucceeded ||
                                    (isFlashCardStep(activeStep) && isTeamMemberAttendanceOnly)
                                }
                            >
                                {isSaving ? (
                                    "Working…"
                                ) : isFlashCardStep(activeStep) ? (
                                    needsRevision ? "Resubmit report" : "Submit report"
                                ) : (
                                    aiStatus || "Next step"
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}
            </div>

            <Dialog open={opportunityFlashOpen} onOpenChange={setOpportunityFlashOpen}>
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Opportunity flash card</DialogTitle>
                        <DialogDescription>
                            The approved opportunity connected to this report.
                        </DialogDescription>
                    </DialogHeader>
                    {projectDetails ? (
                        <StudentOpportunityFlashcard model={buildOpportunityRecordFlashcard(projectDetails)} />
                    ) : null}
                </DialogContent>
            </Dialog>

            {/* Submit Confirmation Dialog */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Report?</DialogTitle>
                        <DialogDescription>
                            {needsRevision
                                ? "Resubmit your revised report for admin review? You can edit again if more changes are requested."
                                : "Are you sure you want to submit this report? You will not be able to edit it after submission."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-[#0e7d74] hover:bg-[#0f5e57] text-white" onClick={confirmSubmit} disabled={isSaving || submitSucceeded}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Yes, Submit Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={blockedSubmitOpen} onOpenChange={setBlockedSubmitOpen}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Cannot submit yet</DialogTitle>
                        <DialogDescription className="sr-only">
                            The report cannot be submitted until the logged hour minimum and all required steps are complete.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-left text-sm text-slate-600">
                        {!isEligibleForSubmission && (
                            <button
                                type="button"
                                onClick={() => goFixIncomplete(1)}
                                className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7d74]"
                            >
                                Logged hours:{" "}
                                <span className="font-semibold text-slate-900">
                                    {sumNonRejectedLoggedHours(data.section1?.attendance_logs || [])} / {data.required_hours || 16}
                                </span>
                                . Log attendance in Section 1 until the minimum is met. CIEL PK Admin reviews your flash card after you submit.
                                {sumNonRejectedLoggedHours(data.section1?.attendance_logs || []) >= (data.required_hours || 16) ? (
                                    <>
                                        {" "}
                                        The team total meets the goal, but every teammate needs their own hours logged — hours can&apos;t be pooled from one member to cover another.
                                    </>
                                ) : null}
                                <span className="mt-1.5 block text-xs font-bold text-[#0e7d74]">Open Section 1 →</span>
                            </button>
                        )}
                        {incompleteSectionsSummary.length > 0 && (
                            <div className="space-y-3">
                                <p className="font-medium text-slate-800">Steps that still need attention — tap a step to open it:</p>
                                <ul className="space-y-3 border border-slate-200 rounded-xl p-3 bg-slate-50/80">
                                    {incompleteSectionsSummary.map((block) => (
                                        <li key={block.section} className="text-sm">
                                            <button
                                                type="button"
                                                onClick={() => goFixIncomplete(block.section)}
                                                className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7d74]"
                                            >
                                                <span className="font-bold text-[#0e7d74] underline underline-offset-2">
                                                    {formatIncompleteSectionHeading(block.section, block.label)}
                                                </span>
                                                <ul className="mt-1.5 ml-3 list-disc text-slate-600 space-y-1">
                                                    {block.errors.map((err, i) => (
                                                        <li key={`${err.field}-${i}`}>{err.message}</li>
                                                    ))}
                                                </ul>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button className="w-full sm:w-auto" onClick={() => setBlockedSubmitOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ReportSectionGuideFloat
                sectionStep={activeStep}
                enabled={!summaryOnlyWorkspace && !ciiVerifiedSummaryLock}
                openSignal={helpSignal}
            />
        </div>
    );
}

export default function ReportPage() {
    return (
        <ReportProvider>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-[#0e7d74]" /></div>}>
                <ReportFormContent />
            </Suspense>
        </ReportProvider>
    );
}
