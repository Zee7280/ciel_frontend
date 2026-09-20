"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import {
    writeFacultyScopeSession,
    readFacultyDashboardViewPreference,
    writeFacultyDashboardViewPreference,
    type FacultyDashboardViewClient,
} from "@/utils/facultyScopeSession";
import PendingAttendanceModal from "@/components/engagement/PendingAttendanceModal";
import { FACULTY_HERO, MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import { FacultyCsInbox } from "@/components/ciel/community-service/FacultyCsInbox";
import { useFacultyCommunityServiceData } from "@/app/dashboard/faculty/community-service/useFacultyCommunityServiceData";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { readStoredCurrentUser } from "@/utils/currentUser";

type FacultyDashboardViewMode = FacultyDashboardViewClient;

type FacultyDashboardStats = {
    dashboard_view?: FacultyDashboardViewMode;
    requested_dashboard_view?: FacultyDashboardViewMode;
    faculty_view_modes_available?: FacultyDashboardViewMode[];
    university_scope?: {
        organization_id?: string;
        organization_name?: string;
    } | null;
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

    const cs = useFacultyCommunityServiceData();
    const communityActions = cs.pendingOppReviews + cs.pendingApps;
    const dash = (n: number) => (isLoading && cs.loading ? "—" : String(n));
    const tone = (n: number, kind: "bad" | "warn" = "bad") => (n ? kind : "default");

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <PendingAttendanceModal variant="faculty" />

            <MockupHero
                kicker="CIEL PK · Faculty Dashboard"
                title={namedTimeGreeting(firstName || "Faculty", "👩‍🏫")}
                subtitle="Choose an impact area from the left. Each area keeps its workflows, approvals, projects and verified outcomes together."
                gradient={FACULTY_HERO}
                stats={[
                    { value: "4", label: "Impact areas" },
                    { value: dash(communityActions), label: "Community actions", href: "/dashboard/faculty/community-service?view=review" },
                    { value: dash(cs.pendingReports.length), label: "Reports to review", href: "/dashboard/faculty/community-service?view=reports" },
                    { value: dash(cs.deckCards.length), label: "Verified impact", href: "/dashboard/faculty/community-service?view=impact" },
                ]}
                rightStat={{ value: "👩‍🏫", label: "Faculty impact workspace" }}
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

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                {(
                    [
                        {
                            n: cs.pendingOppReviews,
                            title: "Opportunities to review",
                            sub: "Student-created · your approval is first",
                            href: "/dashboard/faculty/community-service?view=review&tab=opps",
                            tone: tone(cs.pendingOppReviews),
                        },
                        {
                            n: cs.pendingApps,
                            title: "Participation requests",
                            sub: "Students applying to published opportunities",
                            href: "/dashboard/faculty/community-service?view=review&tab=apps",
                            tone: tone(cs.pendingApps, "warn"),
                        },
                        {
                            n: cs.pendingReports.length,
                            title: "Reports for review",
                            sub: "AI Review complete · CII provisional",
                            href: "/dashboard/faculty/community-service?view=reports&tab=pending",
                            tone: tone(cs.pendingReports.length),
                        },
                        {
                            n: cs.hoursProjectCount,
                            title: "Projects with members below hours",
                            sub: "Send a system reminder",
                            href: "/dashboard/faculty/attendance-review",
                            tone: tone(cs.hoursProjectCount, "warn"),
                        },
                    ] as const
                ).map((item) => (
                    <Link
                        key={item.title}
                        href={item.href}
                        className="flex items-center gap-3 rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 shadow-[0_8px_22px_rgba(24,52,64,.04)] transition hover:-translate-y-0.5 hover:border-[#bcd4d8]"
                    >
                        <span
                            className={
                                "min-w-[36px] text-[26px] font-black leading-none " +
                                (item.tone === "bad" ? "text-[#b34c4c]" : item.tone === "warn" ? "text-[#9a6410]" : "text-[#0e4d4e]")
                            }
                        >
                            {item.n}
                        </span>
                        <span className="min-w-0">
                            <b className="block text-[13px] font-extrabold leading-snug text-[#16313d]">{item.title}</b>
                            <small className="mt-0.5 block text-[11.5px] leading-relaxed text-[#6b7c86]">{item.sub}</small>
                        </span>
                    </Link>
                ))}
            </div>

            <div className="mt-4">
                <FacultyCsInbox items={cs.inboxItems} loading={cs.loading} hideEmpty />
            </div>

            <MockupSectionHead
                title="Impact Areas"
                subtitle="Home is only an overview. Open Community Service from the left navigation to access its complete workflow."
            />
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <MockupActionCard
                    href="/dashboard/faculty/community-service"
                    emoji="🌱"
                    ghost="🌱"
                    title="Community Service"
                    subtitle="Create, review and supervise Community Service opportunities and reports."
                    badge="OPEN AREA"
                    background={MOCKUP_GRADIENTS.teal}
                    hot={communityActions + cs.pendingReports.length > 0}
                />
                <MockupActionCard
                    href="/dashboard/faculty/coursework-projects"
                    emoji="📚"
                    ghost="📚"
                    title="Coursework / SDG Projects"
                    subtitle="Sustainability-linked academic projects and assignments."
                    badge="IMPACT AREA"
                    background={MOCKUP_GRADIENTS.blue}
                />
                <MockupActionCard
                    href="/dashboard/faculty/fyp-thesis"
                    emoji="🎓"
                    ghost="🎓"
                    title="FYP / Thesis"
                    subtitle="Final Year Projects and research with sustainability relevance."
                    badge="IMPACT AREA"
                    background={MOCKUP_GRADIENTS.purple}
                />
                <MockupActionCard
                    href="/dashboard/faculty/startup-business"
                    emoji="🚀"
                    ghost="🚀"
                    title="Startup / Venture"
                    subtitle="Student ventures and sustainability-linked entrepreneurship."
                    badge="IMPACT AREA"
                    background={MOCKUP_GRADIENTS.orange}
                />
            </div>
        </div>
    );
}
