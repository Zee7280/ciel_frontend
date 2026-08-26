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
import { HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
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
    const firstName = useMemo(() => {
        const name = readStoredCurrentUser()?.name;
        return typeof name === "string" ? name.trim().split(/\s+/)[0] : "";
    }, []);

    useEffect(() => {
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
        <div className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6">
            <PendingAttendanceModal variant="faculty" />

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a919a]">
                Faculty Dashboard
            </p>

            <div className="relative mt-4 overflow-hidden rounded-[26px] bg-[linear-gradient(115deg,#04252b,#0e5f63_55%,#0e7d74_115%)] px-7 py-6 text-white">
                <p className="text-[9.5px] font-extrabold tracking-[0.22em] text-white/80">FACULTY · COMMAND</p>
                <h1 className="mt-1.5 text-[23px] font-extrabold leading-tight">
                    {namedTimeGreeting(firstName, "🧑‍🏫")}
                </h1>
                <p className="mt-1 max-w-[640px] text-xs leading-relaxed text-white/90">
                    Approve what’s waiting, then open the hub you need. Analytics stay on their own page.
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2.5">
                    <HeroStat value={dash(stats?.students_active ?? 0)} label="ACTIVE STUDENTS" />
                    <HeroStat value={dash(stats?.hours_verified ?? 0)} label="HOURS VERIFIED" />
                    <HeroStat value={dash(pendingApprovals)} label="PENDING APPROVALS" />
                </div>
            </div>

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
                <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#7a919a]">Your cohorts</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <HubTile
                    href="/dashboard/faculty/community-service"
                    badge="REVIEW"
                    badgeClass="text-[#0e7d74]"
                    emoji="🤝"
                    title="Community service"
                    subtitle="Waiting reports, approved flash cards, and your award run."
                    background="linear-gradient(135deg,#0e7d74,#2dd4bf)"
                />
                <HubTile
                    href="/dashboard/faculty/coursework-projects"
                    badge="FLASH CARDS"
                    badgeClass="text-[#6d28d9]"
                    emoji="📘"
                    title="Coursework"
                    subtitle="Review submitted cards, then run the analyzer on approved work."
                    background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                />
                <HubTile
                    href="/dashboard/faculty/fyp-thesis"
                    badge="SIGN-OFF"
                    badgeClass="text-[#1e1b4b]"
                    emoji="🎓"
                    title="FYP / Thesis"
                    subtitle="Supervisor approval that puts a record on the live deck."
                    background="linear-gradient(135deg,#1e1b4b,#818cf8)"
                />
                <HubTile
                    href="/dashboard/faculty/startup-business"
                    badge="SIGN-OFF"
                    badgeClass="text-[#b45309]"
                    emoji="💼"
                    title="Startup / Business"
                    subtitle="Supervisor approval that puts a venture on the live deck."
                    background="linear-gradient(135deg,#b45309,#f59e0b)"
                />
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <HubTile
                    href="/dashboard/faculty/approvals"
                    badge={pendingApprovals ? `${pendingApprovals} WAITING` : "QUEUE"}
                    badgeClass="text-[#b45309]"
                    emoji="✅"
                    title="Opportunity approvals"
                    subtitle="Student-created opportunities that named you as faculty."
                    background="linear-gradient(135deg,#b45309,#fbbf24)"
                />
                <HubTile
                    href="/dashboard/faculty/join-applications"
                    badge="ENROLMENTS"
                    badgeClass="text-[#9f1239]"
                    emoji="📋"
                    title="Applications"
                    subtitle="Students asking to join your opportunities — approve or decline."
                    background="linear-gradient(135deg,#9f1239,#fb7185)"
                />
                <HubTile
                    href="/dashboard/faculty/reports"
                    badge="AI CONSOLE"
                    badgeClass="text-[#0369a1]"
                    emoji="📝"
                    title="Student impact reports"
                    subtitle="Open the existing evaluation screen — approve once, card goes live."
                    background="linear-gradient(135deg,#0369a1,#38bdf8)"
                />
                <HubTile
                    href="/dashboard/faculty/create-opportunity"
                    badge="PUBLISH"
                    badgeClass="text-[#04252b]"
                    emoji="🚀"
                    title="Create an opportunity"
                    subtitle="A supervised listing your students can enrol on."
                    background="linear-gradient(135deg,#04252b,#0e7d74)"
                    className="sm:col-span-2 lg:col-span-1"
                />
            </div>

            <p className="mt-4 text-center text-[11px] text-[#7a919a]">
                <Link href="/dashboard/faculty/my-opportunities" className="font-extrabold text-[#0e7d74] hover:underline">
                    My opportunities
                </Link>
                {" · "}
                <Link href="/dashboard/faculty/attendance-review" className="font-extrabold text-[#0e7d74] hover:underline">
                    Attendance
                </Link>
                {" · "}
                <Link href="/dashboard/faculty/analytics" className="font-extrabold text-[#0e7d74] hover:underline">
                    Analytics
                </Link>
            </p>
        </div>
    );
}

function HeroStat({ value, label }: { value: string; label: string }) {
    return (
        <div className="min-w-[96px] rounded-[14px] border border-white/22 bg-white/10 px-4 py-2.5 text-center">
            <div className="text-[15px] font-extrabold">{value}</div>
            <div className="mt-0.5 text-[7px] font-extrabold tracking-[0.13em] text-white/85">{label}</div>
        </div>
    );
}
