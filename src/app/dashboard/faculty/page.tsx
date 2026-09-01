"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import PendingActionCards, { type PendingSummary } from "@/components/dashboard/PendingActionCards";
import {
    writeFacultyScopeSession,
    readFacultyDashboardViewPreference,
    writeFacultyDashboardViewPreference,
    type FacultyDashboardViewClient,
} from "@/utils/facultyScopeSession";
import PendingAttendanceModal from "@/components/engagement/PendingAttendanceModal";
import { ActionKpiGrid, CourseworkHero, PathSectionHead, WorkflowSteps } from "@/components/ciel/coursework/CourseworkHubChrome";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { readStoredCurrentUser } from "@/utils/currentUser";

type FacultyCourse = {
    id?: string;
    pending?: number;
    pending_grading?: number;
};

type FacultyDashboardViewMode = FacultyDashboardViewClient;

type FacultyDashboardStats = {
    dashboard_view?: FacultyDashboardViewMode;
    requested_dashboard_view?: FacultyDashboardViewMode;
    faculty_view_modes_available?: FacultyDashboardViewMode[];
    university_scope?: {
        organization_id?: string;
        organization_name?: string;
    } | null;
    students_active?: number;
    hours_verified?: number;
    pending_approvals?: number;
    courses?: FacultyCourse[];
    pendingSummary?: PendingSummary;
};

export default function FacultyDashboard() {
    const [stats, setStats] = useState<FacultyDashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewHydrated, setViewHydrated] = useState(false);
    const [dashboardView, setDashboardView] = useState<FacultyDashboardViewMode>("combined");
    // Starts "" (matching the server render) rather than reading localStorage synchronously in a
    // useMemo — that caused a hydration mismatch (and the thrown error killed interactivity for
    // the whole page) for any returning visitor who already had a stored name. Set client-side in
    // the effect below instead, which only runs after hydration completes.
    const [firstName, setFirstName] = useState("");

    useEffect(() => {
        const name = readStoredCurrentUser()?.name;
        setFirstName(typeof name === "string" ? name.trim().split(/\s+/)[0] : "");
        setDashboardView(readFacultyDashboardViewPreference());
        setViewHydrated(true);
    }, []);

    useEffect(() => {
        if (!viewHydrated) return;
        const fetchStats = async () => {
            try {
                setIsLoading(true);
                const res = await authenticatedFetch(
                    `/api/v1/faculty/dashboard?view=${encodeURIComponent(dashboardView)}`,
                );
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        const d = data.data as FacultyDashboardStats;
                        setStats(d);
                        const modes: FacultyDashboardViewMode[] = d.faculty_view_modes_available?.length
                            ? d.faculty_view_modes_available
                            : d.university_scope
                              ? ["combined", "personal", "university"]
                              : ["combined", "personal"];
                        if (!modes.includes(dashboardView)) {
                            setDashboardView("combined");
                            writeFacultyDashboardViewPreference("combined");
                        }
                        const effective = d.dashboard_view;
                        const requested = (data.data as { requested_dashboard_view?: FacultyDashboardViewMode })
                            .requested_dashboard_view;
                        if (requested === "university" && effective === "combined" && !d.university_scope) {
                            setDashboardView("combined");
                            writeFacultyDashboardViewPreference("combined");
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch faculty stats", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [dashboardView, viewHydrated]);

    useEffect(() => {
        if (isLoading) return;
        const scope = stats?.university_scope;
        if (scope?.organization_name) {
            writeFacultyScopeSession({
                organization_name: scope.organization_name,
                organization_id: scope.organization_id,
            });
        } else {
            writeFacultyScopeSession(null);
        }
    }, [isLoading, stats?.university_scope]);

    const pendingGrading = useMemo(() => {
        return (stats?.courses ?? []).reduce((sum, c) => {
            const n = typeof c.pending_grading === "number" ? c.pending_grading : c.pending ?? 0;
            return sum + n;
        }, 0);
    }, [stats?.courses]);

    const viewModes: FacultyDashboardViewMode[] = useMemo(() => {
        if (stats?.faculty_view_modes_available?.length) {
            return stats.faculty_view_modes_available;
        }
        return stats?.university_scope ? ["combined", "personal", "university"] : ["combined", "personal"];
    }, [stats?.faculty_view_modes_available, stats?.university_scope]);

    const activeDashboardView = viewModes.includes(dashboardView) ? dashboardView : "combined";
    const viewLabels: Record<FacultyDashboardViewMode, string> = {
        combined: "All activity",
        personal: "My supervision",
        university: "University only",
    };

    const setView = (v: FacultyDashboardViewMode) => {
        writeFacultyDashboardViewPreference(v);
        setDashboardView(v);
    };

    const pendingApprovals = stats?.pending_approvals ?? 0;
    const pendingSummary: PendingSummary = stats?.pendingSummary ?? {
        total: pendingApprovals + pendingGrading,
        items: [
            {
                key: "faculty_pending_approvals",
                title: "Pending approvals",
                count: pendingApprovals,
                href: "/dashboard/faculty/approvals",
                tone: "warning",
                description: "Student-created opportunities waiting for your review.",
            },
            {
                key: "faculty_pending_reports",
                title: "Reports to review",
                count: pendingGrading,
                href: "/dashboard/faculty/reports",
                tone: "neutral",
                description: "Submitted student work still waiting for faculty sign-off.",
            },
        ],
    };

    const dash = (n: number) => (isLoading ? "—" : String(n));

    return (
        <div className="mx-auto max-w-[1240px]">
            <PendingAttendanceModal variant="faculty" />

            <CourseworkHero
                kicker="FACULTY IMPACT DASHBOARD"
                title={namedTimeGreeting(firstName, "🧑‍🏫")}
                subtitle="Approve what’s waiting, then open the path you need. Verified work lands on your Faculty Impact Wall."
                stats={[
                    { value: dash(stats?.students_active ?? 0), label: "Active Students" },
                    { value: dash(stats?.hours_verified ?? 0), label: "Hours Verified" },
                    { value: dash(pendingApprovals), label: "Pending Review" },
                ]}
            />

            {viewModes.length > 1 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {viewModes.map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setView(m)}
                            disabled={isLoading}
                            className={
                                "rounded-full px-3 py-1.5 text-[11px] font-extrabold transition " +
                                (activeDashboardView === m
                                    ? "bg-[#0e7d74] text-white"
                                    : "border border-[#dcebee] bg-white text-slate-600 hover:border-[#0e7d74]")
                            }
                        >
                            {viewLabels[m]}
                        </button>
                    ))}
                    {stats?.university_scope?.organization_name ? (
                        <span className="rounded-full bg-[#e6f6f4] px-3 py-1.5 text-[10px] font-extrabold text-[#0e7d74]">
                            {stats.university_scope.organization_name}
                        </span>
                    ) : null}
                </div>
            ) : null}

            <div className="mt-4">
                <PendingActionCards summary={pendingSummary} emptyMessage="Nothing waiting — your inbox is clear." />
            </div>

            <div className="mt-4">
                <MockupSectionHead title="Community Service Management" subtitle="Approve student/community service submissions, monitor active reports and review verified evidence." />
                <PathSectionHead title="Your paths" subtitle="Open a path to review submissions, run the grader, and publish to the Impact Wall." pill="FACULTY VIEW" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MockupActionCard
                    href="/dashboard/faculty/community-service"
                    emoji="⛺"
                    title="Community Service"
                    subtitle="Monitor service opportunities, participation, reports and verified community impact."
                    badge="REVIEW"
                    background={MOCKUP_GRADIENTS.teal}
                />
                <MockupActionCard
                    href="/dashboard/faculty/coursework-projects"
                    emoji="📚"
                    title="Coursework Project"
                    subtitle="Review course-linked impact projects, approve completion and run semester rankings after approval."
                    badge="OPEN"
                    background={MOCKUP_GRADIENTS.teal}
                />
                <MockupActionCard
                    href="/dashboard/faculty/fyp-thesis"
                    emoji="🎓"
                    title="FYP / Thesis"
                    subtitle="Supervisor approval that puts a record on the live deck."
                    badge="SIGN-OFF"
                    background={MOCKUP_GRADIENTS.navy}
                />
                <MockupActionCard
                    href="/dashboard/faculty/startup-business"
                    emoji="💼"
                    title="Startup / Business"
                    subtitle="Supervisor approval that puts a venture on the live deck."
                    badge="SIGN-OFF"
                    background={MOCKUP_GRADIENTS.orange}
                />
                </div>
            </div>

            <ActionKpiGrid
                items={[
                    { value: dash(pendingApprovals), label: "Opportunity Approvals" },
                    { value: dash(pendingGrading), label: "Reports Awaiting Review" },
                    { value: dash(pendingSummary.total), label: "Total Action Items" },
                    { value: dash(stats?.hours_verified ?? 0), label: "Hours Verified" },
                ]}
            />

            <WorkflowSteps
                title="Faculty review workflow"
                subtitle="Approved work flows into the same unified Faculty Impact Wall."
                steps={["Opportunity Submitted", "Faculty Opportunity Approval", "Activity + Report", "Faculty Report Approval", "Impact Wall + AI Badge"]}
            />

            <PathSectionHead title="Workspace" subtitle="Approvals, enrolments, reports and new opportunities." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MockupActionCard
                    href="/dashboard/faculty/approvals"
                    emoji="✅"
                    title="Approve Opportunities"
                    subtitle="Review opportunities requiring faculty approval. Approve, request revision or reject."
                    badge={pendingApprovals ? `${pendingApprovals} PENDING` : "QUEUE"}
                    background={MOCKUP_GRADIENTS.teal}
                />
                <MockupActionCard
                    href="/dashboard/faculty/reports"
                    emoji="📄"
                    title="Approve Reports"
                    subtitle="Review submitted service reports with evidence, hours, SDGs and AI preliminary assessment."
                    badge={pendingGrading ? `${pendingGrading} REPORTS` : "REVIEW"}
                    background={MOCKUP_GRADIENTS.blue}
                />
                <MockupActionCard
                    href="/dashboard/faculty/join-applications"
                    emoji="📋"
                    title="Applications"
                    subtitle="Students asking to join your opportunities — approve or decline."
                    badge="ENROLMENTS"
                    background={MOCKUP_GRADIENTS.pink}
                />
                <MockupActionCard
                    href="/dashboard/faculty/create-opportunity"
                    emoji="🚀"
                    title="Create an opportunity"
                    subtitle="A supervised listing your students can enrol on."
                    badge="PUBLISH"
                    background={MOCKUP_GRADIENTS.green}
                />
            </div>

            <p className="mt-6 text-center text-[11px] text-[#71828e]">
                <Link href="/dashboard/faculty/my-opportunities" className="font-extrabold text-[#08756b] hover:underline">
                    My opportunities
                </Link>
                {" · "}
                <Link href="/dashboard/faculty/attendance-review" className="font-extrabold text-[#08756b] hover:underline">
                    Attendance
                </Link>
                {" · "}
                <Link href="/dashboard/faculty/analytics" className="font-extrabold text-[#08756b] hover:underline">
                    Analytics
                </Link>
                {" · "}
                <Link href="/dashboard/faculty/impact" className="font-extrabold text-[#08756b] hover:underline">
                    Impact Wall
                </Link>
            </p>
        </div>
    );
}
