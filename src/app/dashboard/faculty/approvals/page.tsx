"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckCircle, XCircle, Clock, Eye, Filter, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Card } from "@/app/dashboard/student/report/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/app/dashboard/student/report/components/ui/dialog";
import { Textarea } from "@/app/dashboard/student/report/components/ui/textarea";
import { Label } from "@/app/dashboard/student/report/components/ui/label";
import { toast } from "sonner";
import {
    type FacultyApprovalRow,
    normalizeFacultyApprovalsResponse,
} from "@/utils/facultyApprovals";

export default function FacultyApprovalsPage() {
    const [tab, setTab] = useState<"pending" | "history">("pending");
    const [pendingProjects, setPendingProjects] = useState<FacultyApprovalRow[]>([]);
    const [historyProjects, setHistoryProjects] = useState<FacultyApprovalRow[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(null);
    /** When set, detail dialog shows Approve/Reject for this opportunity id (pending tab only). */
    const [detailActionId, setDetailActionId] = useState<string | null>(null);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
    const [rejectComment, setRejectComment] = useState("");
    const [rejectSubmitting, setRejectSubmitting] = useState(false);

    useEffect(() => {
        void loadLists();
    }, []);

    const loadLists = async () => {
        setIsLoading(true);
        try {
            const [pendingRes, historyRes] = await Promise.all([
                authenticatedFetch(`/api/v1/faculty/approvals?status=pending`),
                authenticatedFetch(`/api/v1/faculty/approvals?status=history`),
            ]);

            if (pendingRes?.ok) {
                const j = await pendingRes.json();
                setPendingProjects(normalizeFacultyApprovalsResponse(j));
            } else {
                toast.error("Could not load pending approvals");
            }

            if (historyRes?.ok) {
                const j = await historyRes.json();
                setHistoryProjects(normalizeFacultyApprovalsResponse(j));
            } else {
                toast.error("Could not load approval history");
            }
        } catch (error) {
            console.error("Failed to fetch approvals", error);
            toast.error("Failed to load approvals");
        } finally {
            setIsLoading(false);
        }
    };

    const openOpportunityDetail = async (opportunityId: string, options?: { showActions?: boolean }) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailRecord(null);
        setDetailActionId(options?.showActions ? opportunityId : null);
        try {
            const res = await authenticatedFetch(`/api/v1/opportunities/detail`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: opportunityId }),
            });
            if (!res?.ok) {
                toast.error("Could not load opportunity details");
                setDetailOpen(false);
                setDetailActionId(null);
                return;
            }
            const json = await res.json();
            const d = json?.data as Record<string, unknown> | undefined;
            if (!d) {
                toast.error("Opportunity not found");
                setDetailOpen(false);
                setDetailActionId(null);
                return;
            }
            setDetailRecord(d);
        } catch {
            toast.error("Could not load opportunity details");
            setDetailOpen(false);
            setDetailActionId(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const visibleList = tab === "pending" ? pendingProjects : historyProjects;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return visibleList;
        return visibleList.filter((p) => {
            const hay = [
                p.projectTitle,
                p.studentName,
                p.studentId,
                p.studentEmail || "",
                p.opportunityStatus || "",
            ]
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }, [visibleList, search]);

    const handleApprove = async (id: string) => {
        try {
            const res = await authenticatedFetch(`/api/v1/faculty/approvals/${id}/approve`, {
                method: "POST",
            });
            if (res && res.ok) {
                toast.success("Project Approved Successfully");
                setPendingProjects((prev) => prev.filter((p) => p.id !== id));
                setDetailOpen(false);
                setDetailActionId(null);
                void loadLists();
            } else {
                toast.error("Failed to approve project");
            }
        } catch (error) {
            console.error("Failed to approve", error);
            toast.error("Error connecting to server");
        }
    };

    const openRejectDialog = (id: string) => {
        setRejectTargetId(id);
        setRejectComment("");
        setRejectOpen(true);
    };

    const closeRejectDialog = () => {
        setRejectOpen(false);
        setRejectTargetId(null);
        setRejectComment("");
    };

    const confirmReject = async () => {
        if (!rejectTargetId) return;
        const reason = rejectComment.trim();
        if (reason.length < 3) {
            toast.error("Please add feedback for the student (at least 3 characters).");
            return;
        }
        setRejectSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/faculty/approvals/${rejectTargetId}/reject`, {
                method: "POST",
                body: JSON.stringify({ reason }),
            });
            if (res && res.ok) {
                toast.success("Rejected. Your comments are sent to the student when the server sends notifications.");
                setPendingProjects((prev) => prev.filter((p) => p.id !== rejectTargetId));
                setDetailOpen(false);
                setDetailActionId(null);
                setDetailRecord(null);
                closeRejectDialog();
                void loadLists();
            } else {
                toast.error("Failed to reject project");
            }
        } catch (error) {
            console.error("Failed to reject", error);
            toast.error("Error connecting to server");
        } finally {
            setRejectSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 pb-20">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Student Project Approvals</h1>
                <p className="text-slate-500">
                    When a student requests approval (you may get an email), open the opportunity and review{" "}
                    <strong className="text-slate-600 font-semibold">academic relevance</strong>,{" "}
                    <strong className="text-slate-600 font-semibold">feasibility</strong>, and{" "}
                    <strong className="text-slate-600 font-semibold">student readiness</strong>. Approve to move the
                    request forward, or reject with comments so they can revise.
                </p>
                <p className="text-slate-500 text-sm mt-2">
                    Past decisions appear under <span className="font-medium text-slate-600">Approval history</span>.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    variant={tab === "pending" ? "default" : "outline"}
                    size="sm"
                    className="h-9"
                    onClick={() => setTab("pending")}
                >
                    Pending
                </Button>
                <Button
                    variant={tab === "history" ? "default" : "outline"}
                    size="sm"
                    className="h-9"
                    onClick={() => setTab("history")}
                >
                    Approval history
                </Button>
            </div>

            <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by student name, ID, or email..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="grid gap-6">
                {isLoading ? (
                    <div className="text-center py-12 text-slate-500 text-sm">Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {tab === "pending" ? "All Caught Up!" : "No history yet"}
                        </h3>
                        <p className="text-slate-500">
                            {tab === "pending"
                                ? "No pending approvals at the moment."
                                : "Approved or progressed projects will appear here after you act or verify by email."}
                        </p>
                    </div>
                ) : (
                    filtered.map((project) => (
                        <Card key={project.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                <div className="p-6 flex-1 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="font-bold text-lg text-slate-900">{project.projectTitle}</h3>
                                                {tab === "pending" ? (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                        <Clock className="w-3 h-3 mr-1" /> Pending review
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                                                        {formatHistoryStatus(project)}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-slate-500 text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                                <span>
                                                    Student:{" "}
                                                    <strong className="text-slate-700">{project.studentName}</strong> ({project.studentId})
                                                </span>
                                                {project.studentEmail ? (
                                                    <span className="text-slate-600">· {project.studentEmail}</span>
                                                ) : null}
                                                <span className="hidden sm:inline w-1 h-1 bg-slate-300 rounded-full shrink-0" />
                                                <span>Submitted {project.submittedDate}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Impact Hours</p>
                                            <p className="font-bold text-blue-600 text-lg">
                                                {project.totalHours ?? "—"}{" "}
                                                <span className="text-xs font-medium text-slate-400">(after verification)</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">EIS Score</p>
                                            <p className="font-bold text-amber-600 text-lg">
                                                {project.eisScore ?? "—"}
                                                <span className="text-xs font-medium text-slate-400">/100</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Primary SDG</p>
                                            <p className="font-medium text-slate-800 text-sm">{project.sdg || "—"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border-l border-slate-100 p-6 flex flex-row md:flex-col justify-center gap-3 w-full md:w-48">
                                    {tab === "pending" ? (
                                        <>
                                            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleApprove(project.id)}>
                                                <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                            </Button>
                                            <Button variant="destructive" className="w-full" onClick={() => openRejectDialog(project.id)}>
                                                <XCircle className="w-4 h-4 mr-2" /> Reject
                                            </Button>
                                        </>
                                    ) : null}
                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        onClick={() => void openOpportunityDetail(project.id, { showActions: tab === "pending" })}
                                    >
                                        <Eye className="w-4 h-4 mr-2" /> {tab === "pending" ? "Review full details" : "Opportunity details"}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <Dialog
                open={detailOpen}
                onOpenChange={(open) => {
                    setDetailOpen(open);
                    if (!open) {
                        setDetailRecord(null);
                        setDetailActionId(null);
                    }
                }}
            >
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Student opportunity</DialogTitle>
                        <DialogDescription>
                            Student profile, partner context (if any), and full proposal. Confirm academic fit, feasibility,
                            and student capability before you approve or reject with written feedback.
                        </DialogDescription>
                    </DialogHeader>
                    {detailLoading ? (
                        <div className="flex justify-center py-12 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : detailRecord ? (
                        <>
                            <FacultyOpportunityDetailBody d={detailRecord} />
                            {detailActionId ? (
                                <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-200">
                                    <Button variant="destructive" onClick={() => detailActionId && openRejectDialog(detailActionId)}>
                                        <XCircle className="w-4 h-4 mr-2" /> Reject
                                    </Button>
                                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => void handleApprove(detailActionId)}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                    </Button>
                                </div>
                            ) : null}
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog open={rejectOpen} onOpenChange={(open) => !open && !rejectSubmitting && closeRejectDialog()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject with feedback</DialogTitle>
                        <DialogDescription>
                            Comments are shared with the student (and stored on the server) so they can understand what to
                            change.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="faculty-reject-comment">Comments for the student</Label>
                        <Textarea
                            id="faculty-reject-comment"
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder="e.g. Scope is too broad for one semester; tighten objectives and resubmit."
                            className="min-h-[120px]"
                            disabled={rejectSubmitting}
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={closeRejectDialog} disabled={rejectSubmitting}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => void confirmReject()} disabled={rejectSubmitting}>
                            {rejectSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" /> Submit rejection
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function formatHistoryStatus(project: FacultyApprovalRow): string {
    const st = (project.opportunityStatus || "").replace(/_/g, " ").trim();
    const ws = (project.workflowStage || "").replace(/_/g, " ").trim();
    if (ws) return ws;
    if (st) return st;
    return "In workflow";
}

function pickNestedStr(o: Record<string, unknown> | null, ...keys: string[]): string {
    if (!o) return "";
    for (const k of keys) {
        const v = o[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

/** Best-effort: detail API may expose creator/student under different keys. */
function studentCreatorFromDetail(d: Record<string, unknown>): {
    name: string;
    email: string;
    id: string;
    university: string;
    department: string;
    phone: string;
} {
    const user = d.user && typeof d.user === "object" ? (d.user as Record<string, unknown>) : null;
    const student = d.student && typeof d.student === "object" ? (d.student as Record<string, unknown>) : null;
    const creator = d.creator && typeof d.creator === "object" ? (d.creator as Record<string, unknown>) : null;
    const profile =
        d.student_profile && typeof d.student_profile === "object"
            ? (d.student_profile as Record<string, unknown>)
            : d.creator_profile && typeof d.creator_profile === "object"
              ? (d.creator_profile as Record<string, unknown>)
              : null;

    // Prefer nested `creator` when admin/detail API returns it (contract sync).
    const name =
        pickNestedStr(creator, "name", "full_name", "fullName") ||
        pickNestedStr(d, "creator_name", "student_name", "submitted_by_name", "owner_name") ||
        pickNestedStr(student, "name", "full_name", "fullName") ||
        pickNestedStr(user, "name", "fullName") ||
        pickNestedStr(profile, "name", "full_name");
    const email =
        pickNestedStr(creator, "email") ||
        pickNestedStr(d, "creator_email", "student_email", "submitted_by_email", "owner_email") ||
        pickNestedStr(student, "email") ||
        pickNestedStr(user, "email") ||
        pickNestedStr(profile, "email");
    const id =
        pickNestedStr(creator, "id", "user_id") ||
        pickNestedStr(d, "creator_id", "student_id", "student_user_id", "created_by", "owner_id") ||
        pickNestedStr(student, "id", "user_id") ||
        pickNestedStr(user, "id") ||
        pickNestedStr(profile, "id", "user_id");
    const university =
        pickNestedStr(creator, "university", "institution") ||
        pickNestedStr(d, "creator_university", "student_university") ||
        pickNestedStr(student, "university", "institution") ||
        pickNestedStr(profile, "university", "institution");
    const department =
        pickNestedStr(creator, "department") ||
        pickNestedStr(d, "creator_department", "student_department") ||
        pickNestedStr(student, "department") ||
        pickNestedStr(profile, "department");
    const phone =
        (typeof d.student_contact === "string" && d.student_contact.trim()) ||
        pickNestedStr(creator, "phone", "contact", "mobile") ||
        pickNestedStr(student, "phone", "contact", "mobile") ||
        pickNestedStr(user, "phone", "contact", "mobile") ||
        pickNestedStr(profile, "phone", "contact", "mobile");

    return { name, email, id, university, department, phone };
}

function FacultyOpportunityDetailBody({ d }: { d: Record<string, unknown> }) {
    const title = typeof d.title === "string" ? d.title : "—";
    const mode = typeof d.mode === "string" ? d.mode : "";
    const types = Array.isArray(d.types) ? (d.types as string[]).filter((t) => typeof t === "string") : [];
    const visibility = typeof d.visibility === "string" ? d.visibility : "";
    const studentRow = studentCreatorFromDetail(d);
    const hasStudentInfo =
        studentRow.name ||
        studentRow.email ||
        studentRow.id ||
        studentRow.university ||
        studentRow.department ||
        studentRow.phone;

    const objectives = d.objectives && typeof d.objectives === "object" ? (d.objectives as Record<string, unknown>) : null;
    const objDesc = objectives && typeof objectives.description === "string" ? objectives.description : "";
    const benCount =
        objectives && typeof objectives.beneficiaries_count === "number" ? objectives.beneficiaries_count : undefined;
    const benTypes = Array.isArray(objectives?.beneficiaries_type)
        ? (objectives!.beneficiaries_type as string[]).filter((t) => typeof t === "string")
        : [];

    const timeline = d.timeline && typeof d.timeline === "object" ? (d.timeline as Record<string, unknown>) : null;
    const activity =
        d.activity_details && typeof d.activity_details === "object"
            ? (d.activity_details as Record<string, unknown>)
            : d.activityDetails && typeof d.activityDetails === "object"
              ? (d.activityDetails as Record<string, unknown>)
              : null;
    const responsibilities =
        activity && typeof activity.student_responsibilities === "string"
            ? activity.student_responsibilities
            : activity && typeof activity.studentResponsibilities === "string"
              ? activity.studentResponsibilities
              : "";

    const skillsRaw = activity?.skills_gained ?? activity?.skillsGained;
    const skills = Array.isArray(skillsRaw) ? (skillsRaw as string[]).filter((s) => typeof s === "string") : [];

    const sdgInfo = d.sdg_info && typeof d.sdg_info === "object" ? (d.sdg_info as Record<string, unknown>) : null;
    const supervision = d.supervision && typeof d.supervision === "object" ? (d.supervision as Record<string, unknown>) : null;
    const executing =
        d.executing_context && typeof d.executing_context === "object"
            ? (d.executing_context as Record<string, unknown>)
            : d.executingContext && typeof d.executingContext === "object"
              ? (d.executingContext as Record<string, unknown>)
              : null;

    const loc = d.location && typeof d.location === "object" ? (d.location as Record<string, unknown>) : null;

    const participation =
        d.participation_scope && typeof d.participation_scope === "object"
            ? (d.participation_scope as Record<string, unknown>)
            : null;
    const deptRest =
        participation?.department_restriction && typeof participation.department_restriction === "object"
            ? (participation.department_restriction as Record<string, unknown>)
            : null;
    const deptList = Array.isArray(deptRest?.departments) ? (deptRest!.departments as string[]).filter(Boolean) : [];

    const extCollab =
        d.external_partner_collaboration && typeof d.external_partner_collaboration === "object"
            ? (d.external_partner_collaboration as Record<string, unknown>)
            : null;
    const partnerOrgRoot =
        d.partner_organization && typeof d.partner_organization === "object"
            ? (d.partner_organization as Record<string, unknown>)
            : null;
    const partnerOrg =
        pickNestedStr(supervision as Record<string, unknown> | null, "partner_org_name", "external_partner_org_name") ||
        (typeof extCollab?.organization_name === "string" ? extCollab.organization_name : "") ||
        (typeof partnerOrgRoot?.organization_name === "string" ? partnerOrgRoot.organization_name : "");
    const partnerPerson =
        pickNestedStr(
            supervision as Record<string, unknown> | null,
            "partner_contact_person",
            "external_partner_contact_person",
        ) ||
        (typeof extCollab?.contact_person === "string" ? extCollab.contact_person : "") ||
        (typeof partnerOrgRoot?.contact_person === "string" ? partnerOrgRoot.contact_person : "");
    const partnerEmail =
        pickNestedStr(supervision as Record<string, unknown> | null, "partner_email", "external_partner_email") ||
        (typeof extCollab?.official_email === "string" ? extCollab.official_email : "") ||
        (typeof partnerOrgRoot?.official_email === "string" ? partnerOrgRoot.official_email : "");
    const execPartner =
        executing && executing.partner && typeof executing.partner === "object"
            ? (executing.partner as Record<string, unknown>)
            : null;
    const epOrg = execPartner && typeof execPartner.organization_name === "string" ? execPartner.organization_name : "";
    const epPerson = execPartner && typeof execPartner.contact_person === "string" ? execPartner.contact_person : "";
    const epMail = execPartner && typeof execPartner.official_email === "string" ? execPartner.official_email : "";

    return (
        <div className="space-y-6 text-sm">
            {hasStudentInfo ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                    <p className="text-xs font-bold text-blue-800 uppercase mb-2">Student (submitter)</p>
                    <ul className="space-y-1 text-slate-800">
                        {studentRow.name ? (
                            <li>
                                <span className="text-slate-500">Name:</span> {studentRow.name}
                            </li>
                        ) : null}
                        {studentRow.email ? (
                            <li>
                                <span className="text-slate-500">Email:</span> {studentRow.email}
                            </li>
                        ) : null}
                        {studentRow.id ? (
                            <li>
                                <span className="text-slate-500">User / student id:</span> {studentRow.id}
                            </li>
                        ) : null}
                        {studentRow.university ? (
                            <li>
                                <span className="text-slate-500">University:</span> {studentRow.university}
                            </li>
                        ) : null}
                        {studentRow.department ? (
                            <li>
                                <span className="text-slate-500">Department:</span> {studentRow.department}
                            </li>
                        ) : null}
                        {studentRow.phone ? (
                            <li>
                                <span className="text-slate-500">Contact:</span> {studentRow.phone}
                            </li>
                        ) : null}
                    </ul>
                </div>
            ) : null}

            <div>
                <h3 className="font-bold text-lg text-slate-900">{title}</h3>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600">
                    {mode ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">{mode}</span>
                    ) : null}
                    {visibility ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-medium capitalize">{visibility}</span>
                    ) : null}
                </div>
            </div>

            {types.length > 0 ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Activity types</p>
                    <p className="text-slate-800">{types.join(", ")}</p>
                </div>
            ) : null}

            {timeline ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Timeline</p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1">
                        {typeof timeline.type === "string" ? <li>Type: {timeline.type}</li> : null}
                        {typeof timeline.start_date === "string" ? <li>Start: {timeline.start_date}</li> : null}
                        {typeof timeline.end_date === "string" ? <li>End: {timeline.end_date}</li> : null}
                        {typeof timeline.expected_hours === "number" ? <li>Expected hours (per student): {timeline.expected_hours}</li> : null}
                        {typeof timeline.volunteers_required === "number" ? <li>Volunteers: {timeline.volunteers_required}</li> : null}
                    </ul>
                </div>
            ) : null}

            {loc && (loc.city || loc.venue) ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Location</p>
                    <p className="text-slate-800">
                        {[typeof loc.venue === "string" ? loc.venue : "", typeof loc.city === "string" ? loc.city : ""]
                            .filter(Boolean)
                            .join(", ") || "—"}
                    </p>
                </div>
            ) : null}

            {objDesc ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Objectives</p>
                    <p className="text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">{objDesc}</p>
                </div>
            ) : null}

            {benCount !== undefined || benTypes.length > 0 ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Beneficiaries</p>
                    <p className="text-slate-800">
                        {benCount !== undefined ? <>Planned count: {benCount}. </> : null}
                        {benTypes.length > 0 ? <>Types: {benTypes.join(", ")}</> : null}
                    </p>
                </div>
            ) : null}

            {participation ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Participation scope</p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1">
                        {typeof participation.rule === "string" ? <li>Rule: {participation.rule}</li> : null}
                        {typeof participation.creator_university_name === "string" ? (
                            <li>Creator university: {participation.creator_university_name}</li>
                        ) : null}
                        {deptRest && typeof deptRest.scope === "string" ? (
                            <li>
                                Departments ({deptRest.scope}): {deptList.length ? deptList.join(", ") : "—"}
                            </li>
                        ) : null}
                    </ul>
                </div>
            ) : null}

            {sdgInfo ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">SDG</p>
                    <p className="text-slate-800">
                        Primary SDG ID: {String(sdgInfo.sdg_id ?? sdgInfo.sdgId ?? "—")} · Target:{" "}
                        {String(sdgInfo.target_id ?? sdgInfo.targetId ?? "—")}
                    </p>
                </div>
            ) : null}

            {responsibilities ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Student responsibilities</p>
                    <p className="text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">{responsibilities}</p>
                </div>
            ) : null}

            {skills.length > 0 ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Skills</p>
                    <p className="text-slate-800">{skills.join(", ")}</p>
                </div>
            ) : null}

            {supervision ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Faculty supervision (as submitted)</p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1">
                        {typeof supervision.supervisor_name === "string" ? <li>Supervisor: {supervision.supervisor_name}</li> : null}
                        {typeof supervision.role === "string" ? <li>Role: {supervision.role}</li> : null}
                        {typeof supervision.contact === "string" ? <li>Official email: {supervision.contact}</li> : null}
                        {typeof supervision.faculty_department === "string" ? <li>Department: {supervision.faculty_department}</li> : null}
                        {typeof supervision.faculty_university_name === "string" ? (
                            <li>University (context): {supervision.faculty_university_name}</li>
                        ) : null}
                    </ul>
                </div>
            ) : null}

            {partnerOrg || partnerPerson || partnerEmail || epOrg || epPerson || epMail ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                    <p className="text-xs font-bold text-amber-900 uppercase mb-2">Partner organization (if applicable)</p>
                    <ul className="space-y-1 text-slate-800">
                        <li>
                            <span className="text-slate-500">Organization:</span> {partnerOrg || epOrg || "—"}
                        </li>
                        <li>
                            <span className="text-slate-500">Contact person:</span> {partnerPerson || epPerson || "—"}
                        </li>
                        <li>
                            <span className="text-slate-500">Email:</span> {partnerEmail || epMail || "—"}
                        </li>
                    </ul>
                </div>
            ) : null}

            {executing && (executing.type || Object.keys(executing).length > 1) ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Executing context (raw)</p>
                    <pre className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-100 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(executing, null, 2)}
                    </pre>
                </div>
            ) : null}
        </div>
    );
}
