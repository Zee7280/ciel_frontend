
"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "../../report/components/ui/button";
import { authenticatedFetch } from "@/utils/api";
import { resolveAttendanceApproverType } from "@/utils/attendanceApproverRouting";
import {
    extractOpportunityReturnRemarkSections,
    extractOpportunityReviewFeedback,
    formatOpportunityDetailStatusBadge,
} from "@/utils/opportunityWorkflow";
import { readDashboardNavRoleFromStorage, type DashboardNavRole } from "@/utils/dashboardNavRole";
import { formatDisplayId } from "@/utils/displayIds";
import {
    buildOpportunityRecordFlashcard,
    StudentOpportunityFlashcard,
} from "@/app/dashboard/student/create-opportunity/StudentOpportunityFlashcard";
import { Loader2, MapPin, Calendar, ArrowLeft, Share2, Printer, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { copyOpportunityShareLink } from "@/utils/opportunityShareLink";
import { toast } from "sonner";
import Link from "next/link";
import ApplicationDialog from "../components/ApplicationDialog";
import { fetchParticipationGuide, type ParticipationGuide } from "@/utils/participationGuide";
import {
    readStudentInstitutionFromBrowserStorage,
    resolveStudentUniversityApplyEligibility,
} from "@/utils/studentOpportunityApplyEligibility";
import {
    canStudentShowStartReportCta,
    joinApplicationPendingLabel,
    pickJoinApplicationId,
    pickJoinApplicationStage,
} from "@/utils/studentJoinApplication";
import { buildJoinApplyFields, resolveStudentProjectActions } from "@/utils/studentProjectActions";
import { isStudentOpportunityLiveForReporting } from "@/utils/opportunityWorkflow";
import {
    buildStudentReportsCheckMap,
    pickReportStatusFromCheckRow,
    resolveStudentBrowseReportCta,
} from "@/utils/studentBrowseReportCta";

type DisplayValue = string | number | null | undefined;

type OpportunityDetail = Record<string, unknown> & {
    title?: string;
    mode?: string;
    city?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
    application_status?: string;
    applyLocked?: boolean;
    hasApplied?: boolean;
    isStudentOwner?: boolean;
    report_status?: string;
    organization_name?: string;
    organization?: { name?: string; city?: string };
    location?: { city?: string; venue?: string };
    timeline?: {
        start_date?: string;
        end_date?: string;
        volunteers_required?: DisplayValue;
        expected_hours?: DisplayValue;
        type?: string;
    };
    sdg?: DisplayValue;
    sdg_info?: {
        sdg_id?: string | number;
        target_id?: string | number;
        indicator_id?: string | number;
    };
    types?: string[];
    secondary_sdgs?: Array<Record<string, unknown>>;
    detail_view?: Record<string, unknown>;
    verification_method?: string[];
    volunteers_needed?: DisplayValue;
    hours?: DisplayValue;
    timeline_type?: string;
    objectives?: {
        beneficiaries_count?: DisplayValue;
        description?: string;
        beneficiaries_type?: string[] | string;
    };
    activity_details?: {
        student_responsibilities?: string;
        skills_gained?: string[];
    };
    supervision?: {
        supervisor_name?: string;
        role?: string;
        safe_environment?: boolean;
        supervised?: boolean;
        partner_org_name?: string;
        partner_contact_person?: string;
        partner_email?: string;
    };
};

function pickOpportunityOwnerId(opportunity: Record<string, unknown>): string {
    for (const key of ["creatorId", "creator_id", "created_by", "owner_id"]) {
        const raw = opportunity[key];
        if (typeof raw === "string" && raw.trim()) return raw.trim();
        if (typeof raw === "number") return String(raw);
    }
    const creator =
        opportunity.creator && typeof opportunity.creator === "object"
            ? (opportunity.creator as Record<string, unknown>)
            : null;
    const nestedId = creator?.id ?? creator?.user_id;
    if (typeof nestedId === "string" && nestedId.trim()) return nestedId.trim();
    if (typeof nestedId === "number") return String(nestedId);
    return "";
}

export default function OpportunityDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [participationGuide, setParticipationGuide] = useState<ParticipationGuide | null>(null);
    const [viewerNavRole, setViewerNavRole] = useState<DashboardNavRole | null>(null);

    useLayoutEffect(() => {
        setViewerNavRole(readDashboardNavRoleFromStorage() ?? "student");
    }, []);

    useEffect(() => {
        if (id) {
            fetchOpportunityDetails();
            void fetchParticipationGuide(id).then(setParticipationGuide);
        }
    }, [id]);

    const applyEligibility = useMemo(() => {
        if (!opportunity) {
            return {
                canApply: true,
                isUniversityRestricted: false,
                blockedReason: null,
                listingRestrictionLabel: null,
                allowedUniversities: [] as string[],
            };
        }
        return resolveStudentUniversityApplyEligibility(
            opportunity as Record<string, unknown>,
            readStudentInstitutionFromBrowserStorage(),
        );
    }, [opportunity]);

    const fetchOpportunityDetails = async () => {
        try {
            let opData: Record<string, unknown> | null = null;

            const resBrowse = await authenticatedFetch(`/api/v1/students/opportunities/${id}`);
            if (resBrowse?.ok) {
                const dataBrowse = await resBrowse.json();
                if (dataBrowse.success && dataBrowse.data) {
                    opData = dataBrowse.data as Record<string, unknown>;
                }
            }

            // Student-created opportunities (pending approval) are not on the public browse API; use detail.
            if (!opData) {
                const resDetail = await authenticatedFetch(`/api/v1/opportunities/detail`, {
                    method: "POST",
                    body: JSON.stringify({ id }),
                });
                if (resDetail?.ok) {
                    const dataDetail = await resDetail.json();
                    if (dataDetail.success && dataDetail.data) {
                        opData = dataDetail.data as Record<string, unknown>;
                    }
                }
            }

            if (!opData) {
                toast.error("Failed to fetch opportunity");
                setOpportunity(null);
                return;
            }

            let myId: string | null = null;
            try {
                const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                if (raw) {
                    const u = JSON.parse(raw) as { id?: string | number; userId?: string | number };
                    const v = u.id ?? u.userId;
                    myId = v != null ? String(v) : null;
                }
            } catch {
                /* ignore */
            }

            const creatorStr = pickOpportunityOwnerId(opData);
            const isStudentOwner = Boolean(myId && creatorStr && creatorStr === myId);

            const joinFields = buildJoinApplyFields(opData);
            const application_status = joinFields.applicationStatus;
            const application_id = pickJoinApplicationId(opData);
            const application_stage = pickJoinApplicationStage(opData);
            const applyLocked = joinFields.applyLocked;
            const hasApplied = joinFields.hasApplied;

            let report_status: string | undefined;
            if (myId) {
                try {
                    const reportsRes = await authenticatedFetch(
                        `/api/v1/students/reports/check?studentId=${encodeURIComponent(myId)}`,
                    );
                    if (reportsRes?.ok) {
                        const reportsJson = (await reportsRes.json()) as { success?: boolean; data?: unknown };
                        if (reportsJson.success && Array.isArray(reportsJson.data)) {
                            const map = buildStudentReportsCheckMap(reportsJson.data);
                            report_status = pickReportStatusFromCheckRow(map.get(id));
                        }
                    }
                } catch {
                    /* ignore */
                }
            }

            setOpportunity({
                ...opData,
                application_status: application_status || undefined,
                application_id: application_id || undefined,
                application_stage: application_stage ?? undefined,
                hasApplied,
                applyLocked,
                isStudentOwner,
                report_status,
            });
        } catch (error) {
            console.error("Error fetching opportunity", error);
            toast.error("An error occurred while loading details");
            setOpportunity(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyClick = () => {
        if (!applyEligibility.canApply) {
            toast.error(applyEligibility.blockedReason || "You cannot apply to this opportunity.");
            return;
        }
        setIsPopupOpen(true);
    };

    const handleApplySuccess = () => {
        void fetchOpportunityDetails();
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!opportunity) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] space-y-4">
                <p className="text-slate-500 text-lg">Opportunity not found.</p>
                <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }

    const opportunitiesListHref =
        viewerNavRole === "admin" ? "/dashboard/admin/projects" : "/dashboard/student/browse";
    const opportunitiesBackLabel = viewerNavRole === "admin" ? "Back to all projects" : "Back to Opportunities";
    const hideStudentApplyActions = viewerNavRole === "admin" && !opportunity.isStudentOwner;
    const oppRecord = opportunity as Record<string, unknown>;
    const detailStatusBadgeLabel = formatOpportunityDetailStatusBadge(oppRecord);
    const detailWorkflowStageRaw =
        typeof (oppRecord.workflow_stage ?? oppRecord.workflowStage) === "string"
            ? String(oppRecord.workflow_stage ?? oppRecord.workflowStage).trim()
            : "";
    const remarkSections = extractOpportunityReturnRemarkSections(oppRecord);
    const reviewFeedback =
        remarkSections.length === 0 ? extractOpportunityReviewFeedback(oppRecord) : null;
    const projectActions =
        viewerNavRole === "admin"
            ? null
            : resolveStudentProjectActions({
                  raw: oppRecord,
                  isStudentOwner: Boolean(opportunity.isStudentOwner),
                  hasApplied: Boolean(opportunity.hasApplied),
                  applyLocked: Boolean(opportunity.applyLocked),
                  applicationStatus: opportunity.application_status || "",
                  live: isStudentOpportunityLiveForReporting(oppRecord),
              });

    const startReportCta =
        opportunity &&
        canStudentShowStartReportCta(oppRecord, {
            isStudentOwner: Boolean(opportunity.isStudentOwner),
        })
            ? resolveStudentBrowseReportCta(id, opportunity.report_status as string | undefined)
            : null;

    const applyBlockedByUniversity =
        !hideStudentApplyActions &&
        !opportunity.isStudentOwner &&
        !opportunity.applyLocked &&
        !applyEligibility.canApply;

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500 pb-24">
            {applyBlockedByUniversity ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 flex gap-3 items-start print:hidden">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Applications are not open for your university on this listing</p>
                        <p className="text-rose-900/90 mt-1">{applyEligibility.blockedReason}</p>
                    </div>
                </div>
            ) : null}
            {participationGuide?.messages?.en && !hideStudentApplyActions ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 flex gap-3 items-start print:hidden">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{participationGuide.messages.en}</p>
                </div>
            ) : null}
            {/* Header Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
                <Link
                    href={opportunitiesListHref}
                    className="text-slate-500 hover:text-slate-800 inline-flex items-center gap-2 text-sm font-medium shrink-0"
                >
                    <ArrowLeft className="w-4 h-4" /> {opportunitiesBackLabel}
                </Link>
                <div className="flex flex-col items-stretch sm:items-end gap-1.5 min-w-0">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2 rounded-lg shadow-none"
                            onClick={() => void copyOpportunityShareLink(id)}
                            aria-label="Copy share link"
                            title="Copy share link"
                        >
                            <Share2 className="w-4 h-4 shrink-0" /> Copy share link
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2 rounded-lg shadow-none"
                            onClick={() => window.print()}
                        >
                            <Printer className="w-4 h-4 shrink-0" /> Print / Save PDF
                        </Button>

                        {!hideStudentApplyActions && projectActions ? (
                            <>
                                {opportunity.isStudentOwner ? (
                                    <Link href="/dashboard/student/projects" className="inline-flex">
                                        <Button variant="outline" className="rounded-lg shadow-none">
                                            My Projects
                                        </Button>
                                    </Link>
                                ) : null}
                                {projectActions.showEditResubmit ? (
                                    <Link
                                        href={`/dashboard/student/create-opportunity?edit=${encodeURIComponent(id)}`}
                                        className="inline-flex"
                                    >
                                        <Button className="gap-2 rounded-lg px-5 shadow-sm">
                                            <Pencil className="w-4 h-4 shrink-0" /> Edit & Resubmit
                                        </Button>
                                    </Link>
                                ) : null}
                                {startReportCta && !projectActions.showEditResubmit ? (
                                    <Button
                                        onClick={() => router.push(startReportCta.href)}
                                        className="gap-2 rounded-lg bg-blue-600 px-5 text-white shadow-sm hover:bg-blue-700"
                                    >
                                        {startReportCta.label}
                                    </Button>
                                ) : null}
                                {projectActions.showJoinAppliedLocked ? (
                                    <span
                                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700"
                                        aria-label="Applied"
                                    >
                                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Applied
                                    </span>
                                ) : null}
                                {projectActions.showJoinApplyAgain || projectActions.showJoinApplyNow ? (
                                    <Button
                                        onClick={handleApplyClick}
                                        disabled={!applyEligibility.canApply}
                                        title={applyEligibility.blockedReason || undefined}
                                        className={
                                            applyEligibility.canApply
                                                ? "gap-2 rounded-lg px-5 shadow-sm"
                                                : "cursor-not-allowed gap-2 rounded-lg bg-slate-300 px-5 text-slate-600 shadow-sm hover:bg-slate-300"
                                        }
                                    >
                                        {projectActions.showJoinApplyAgain ? "Apply again" : "Apply Now"}
                                    </Button>
                                ) : null}
                            </>
                        ) : null}
                    </div>
                    {!hideStudentApplyActions && projectActions ? (
                        projectActions.helperMessage ? (
                            <p
                                className={`text-xs text-right sm:max-w-md ${
                                    projectActions.showListingClosed
                                        ? "font-medium text-rose-800"
                                        : projectActions.showJoinApplyAgain
                                          ? "font-medium text-rose-700"
                                          : "font-medium text-amber-800"
                                }`}
                            >
                                {projectActions.helperMessage}
                            </p>
                        ) : opportunity.isStudentOwner && !projectActions.showEditResubmit && !projectActions.showListingClosed ? (
                            <p className="text-xs text-slate-500 text-right">You created this listing.</p>
                        ) : projectActions.showJoinAppliedLocked &&
                          opportunity.application_status &&
                          ["pending", "pending_approval", "applied"].includes(opportunity.application_status) ? (
                            <p className="text-xs font-medium text-amber-700 text-right">
                                {joinApplicationPendingLabel(oppRecord)}
                            </p>
                        ) : null
                    ) : null}
                </div>
            </div>

            {/* Document View */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                {/* Title Section */}
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 print:bg-white print:border-none">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">{opportunity.title}</h1>
                            {Array.isArray(opportunity.types) && opportunity.types.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {opportunity.types.map((t: string) => (
                                        <span
                                            key={t}
                                            className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200"
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                            <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {opportunity.location?.city || opportunity.city || "Remote"}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Start: {opportunity.timeline?.start_date ? new Date(opportunity.timeline.start_date).toLocaleDateString() : (opportunity.start_date ? new Date(opportunity.start_date).toLocaleDateString() : "Flexible")}</span>
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">{opportunity.mode || "On Site"}</span>
                                {applyEligibility.listingRestrictionLabel ? (
                                    <span className="bg-amber-50 text-amber-900 px-2.5 py-0.5 rounded-full text-xs font-bold border border-amber-200">
                                        {applyEligibility.listingRestrictionLabel}
                                    </span>
                                ) : null}
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                                        detailStatusBadgeLabel === "Live"
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                            : detailStatusBadgeLabel === "Completed"
                                              ? "bg-slate-100 text-slate-800 border-slate-200"
                                              : detailStatusBadgeLabel === "Rejected"
                                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                                : "bg-amber-50 text-amber-900 border border-amber-200"
                                    }`}
                                >
                                    {detailStatusBadgeLabel}
                                </span>
                            </div>
                            {detailWorkflowStageRaw ? (
                                <p className="text-[11px] text-slate-500 mt-2">
                                    <span className="font-semibold text-slate-600">Pipeline step:</span>{" "}
                                    {detailWorkflowStageRaw.replace(/_/g, " ")}
                                </p>
                            ) : null}
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-400">Opportunity ID</div>
                            <div className="font-mono font-bold text-slate-600" title={id}>
                                {formatDisplayId(id, "OPP")}
                            </div>
                        </div>
                    </div>
                    {(remarkSections.length > 0 || reviewFeedback) && opportunity.isStudentOwner ? (
                        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
                                        Return remarks
                                    </p>
                                    {remarkSections.length > 0 ? (
                                        <div className="mt-2 space-y-3">
                                            {remarkSections.map((s) => (
                                                <div key={s.label}>
                                                    <p className="text-[10px] font-semibold text-rose-700">{s.label}</p>
                                                    <p className="mt-0.5 text-sm text-rose-900 whitespace-pre-wrap">
                                                        {s.text}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : reviewFeedback ? (
                                        <p className="mt-1 text-sm text-rose-900 whitespace-pre-wrap">{reviewFeedback}</p>
                                    ) : null}
                                </div>
                                {projectActions?.showEditResubmit ? (
                                    <Link href={`/dashboard/student/create-opportunity?edit=${encodeURIComponent(id)}`}>
                                        <Button variant="outline" className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-100">
                                            <Pencil className="w-4 h-4" /> Edit now
                                        </Button>
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="p-4 sm:p-6">
                    <StudentOpportunityFlashcard
                        model={{
                            ...buildOpportunityRecordFlashcard(opportunity as Record<string, unknown>, {
                                studentName: opportunity.isStudentOwner ? "You" : undefined,
                                university: opportunity.organization?.name || opportunity.organization_name,
                                partnerOrg: opportunity.organization?.name || opportunity.organization_name,
                            }),
                            eligible: applyEligibility.canApply,
                            eligibilityWhy:
                                applyEligibility.blockedReason ||
                                "Students who match the application scope can apply.",
                        }}
                    />
                </div>
            </div>

            <ApplicationDialog
                opportunityId={isPopupOpen ? id : null}
                opportunityTitle={opportunity.title ?? "Opportunity"}
                attendanceApproverType={resolveAttendanceApproverType(opportunity)}
                open={isPopupOpen}
                onOpenChange={setIsPopupOpen}
                onSuccess={handleApplySuccess}
            />
        </div>
    );

}
