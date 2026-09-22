"use client";

import { useEffect, useState } from "react";
import { Users, FileCheck, Clock, FileText, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import PendingActionCards, { type PendingSummary } from "@/components/dashboard/PendingActionCards";
import Section1AnalyticsPanel from "@/components/analytics/Section1AnalyticsPanel";
import PendingAttendanceModal from "@/components/engagement/PendingAttendanceModal";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupPanel, MockupSectionHead, MockupStatBars } from "@/components/ciel/dashboard/MockupChrome";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { isPathEntryApproved } from "@/utils/reviewQueue";
import { readPartnerOrgKind, type PartnerOrgKind } from "@/utils/partnerOrgKind";
import NgoDashboardHome from "./NgoDashboardHome";
import UniversityDashboardHome from "./UniversityDashboardHome";

type PartnerProject = {
    id: string;
    title: string;
    location: string;
    volunteersNeeded: number;
    volunteersApplied: number;
};

type PartnerDashboardData = {
    stats?: {
        activeOpportunities?: number;
        studentsEngaged?: number;
        verifiedHours?: number;
        reportsSubmitted?: number;
    };
    pendingVerifications?: number;
    pendingSummary?: PendingSummary;
    recentProjects?: PartnerProject[];
    verificationProgress?: {
        percentage?: number;
        label?: string;
    };
};

type UniSnap = {
    community: number;
    communityHours: number;
    coursework: number;
    courseworkCourses: number;
    fyp: number;
    fypDepts: number;
    startup: number;
    investorOptIns: number;
    departments: number;
    faculty: number;
    sdgs: number;
    mix: { label: string; pct: number }[];
    topDepts: { label: string; pct: number }[];
};

function asList(json: { data?: unknown } | null): Record<string, unknown>[] {
    return Array.isArray(json?.data) ? (json.data as Record<string, unknown>[]) : [];
}

function pickDept(row: Record<string, unknown>): string {
    const pi = (row.projectInfo as Record<string, unknown> | undefined) || {};
    const student = (row.student as Record<string, unknown> | undefined) || {};
    const academic = (row.academicSetup as Record<string, unknown> | undefined) || {};
    const si = (row.studentInfo as Record<string, unknown> | undefined) || {};
    return String(pi.school || student.department || academic.department || si.department || row.course || "").trim();
}

function pickFaculty(row: Record<string, unknown>): string {
    const pi = (row.projectInfo as Record<string, unknown> | undefined) || {};
    const academic = (row.academicSetup as Record<string, unknown> | undefined) || {};
    const si = (row.studentInfo as Record<string, unknown> | undefined) || {};
    return String(pi.supervisorName || academic.supervisorName || si.facultyName || row.faculty || "").trim();
}

function pickSdgs(row: Record<string, unknown>): number[] {
    const mapping = (row.sdgMapping as { entries?: { goalNumber?: number }[] } | undefined) || {};
    return (mapping.entries || []).map((e) => Number(e.goalNumber)).filter((n) => n >= 1 && n <= 17);
}

function pctShare(part: number, whole: number) {
    if (!whole) return 0;
    return Math.round((part / whole) * 100);
}

export default function PartnerDashboard() {
    const [orgKind, setOrgKind] = useState<PartnerOrgKind | null>(null);

    useEffect(() => {
        setOrgKind(readPartnerOrgKind(readStoredCurrentUser()));
    }, []);

    if (!orgKind) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (orgKind === "ngo") {
        return <NgoDashboardHome />;
    }

    if (orgKind === "university") {
        return <UniversityDashboardHome />;
    }

    return <PartnerOrgOrUniversityDashboard />;
}

function PartnerOrgOrUniversityDashboard() {
    const [stats, setStats] = useState<PartnerDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [uniSnap, setUniSnap] = useState<UniSnap | null>(null);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const storedUser = localStorage.getItem("ciel_user");
                const user = storedUser ? JSON.parse(storedUser) : null;
                const userId = user?.id || user?.userId;

                if (!userId) {
                    console.error("User ID not found in storage");
                    setLoading(false);
                    return;
                }

                const response = await authenticatedFetch(`/api/v1/partners/dashboard?id=${userId}`);
                if (response?.ok) {
                    const result = await response.json();
                    if (result.success) {
                        setStats(result.data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
    }, []);

    useEffect(() => {
        const storedUser = readStoredCurrentUser() as { orgType?: string; organization_type?: string; type?: string } | null;
        const university = String(storedUser?.orgType || storedUser?.organization_type || storedUser?.type || "")
            .toLowerCase()
            .includes("university");
        if (!university) return;
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/paths/course-projects/university?approvalStatus=approved", {}, { redirectToLogin: false }),
            authenticatedFetch("/api/v1/paths/fyp-thesis/university?approvalStatus=approved", {}, { redirectToLogin: false }),
            authenticatedFetch("/api/v1/paths/startup-business/university", {}, { redirectToLogin: false }),
        ])
            .then(async ([courseRes, fypRes, ventureRes]) => {
                const courseJson = courseRes?.ok ? await courseRes.json().catch(() => null) : null;
                const fypJson = fypRes?.ok ? await fypRes.json().catch(() => null) : null;
                const ventureJson = ventureRes?.ok ? await ventureRes.json().catch(() => null) : null;
                if (cancelled) return;
                const coursework = asList(courseJson);
                const fyps = asList(fypJson);
                const ventures = asList(ventureJson).filter((row) => isPathEntryApproved(row as { status?: string; facultyApprovalStatus?: string; supervisorApprovalStatus?: string; reviewPipeline?: { supervisorStatus?: string | null } | null }));
                const investorOptIns = ventures.filter((row) => {
                    const pub = row.publishSettings as { acceptIntros?: boolean; featured?: boolean } | undefined;
                    return Boolean(pub?.acceptIntros || pub?.featured);
                }).length;
                const all = [...coursework, ...fyps, ...ventures];
                const depts = new Set(all.map(pickDept).filter(Boolean));
                const faculty = new Set(all.map(pickFaculty).filter(Boolean));
                const sdgs = new Set(all.flatMap(pickSdgs));
                const community = 0;
                const total = community + coursework.length + fyps.length + ventures.length;
                const deptCounts = new Map<string, number>();
                all.forEach((row) => {
                    const d = pickDept(row) || "Unspecified";
                    deptCounts.set(d, (deptCounts.get(d) || 0) + 1);
                });
                const topDepts = [...deptCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([label, n]) => ({ label, pct: pctShare(n, all.length || 1) }));
                const fypDepts = new Set(fyps.map(pickDept).filter(Boolean)).size;
                const courses = new Set(coursework.map((row) => String(row.course || "").trim()).filter(Boolean)).size;
                setUniSnap({
                    community,
                    communityHours: 0,
                    coursework: coursework.length,
                    courseworkCourses: courses,
                    fyp: fyps.length,
                    fypDepts,
                    startup: ventures.length,
                    investorOptIns,
                    departments: depts.size,
                    faculty: faculty.size,
                    sdgs: sdgs.size,
                    mix: [
                        { label: "Community Service", pct: pctShare(community, total) },
                        { label: "Coursework", pct: pctShare(coursework.length, total) },
                        { label: "FYP", pct: pctShare(fyps.length, total) },
                        { label: "Startup / Venture", pct: pctShare(ventures.length, total) },
                    ],
                    topDepts,
                });
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const colorStyles = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        purple: "bg-purple-50 text-purple-600",
        amber: "bg-amber-50 text-amber-600"
    };

    const statCards = [
        { label: "Active Opportunities", value: stats?.stats?.activeOpportunities ?? 0, icon: FileCheck, color: "blue" as const },
        { label: "Students Engaged", value: stats?.stats?.studentsEngaged ?? 0, icon: Users, color: "green" as const },
        { label: "Verified Hours", value: stats?.stats?.verifiedHours?.toLocaleString() ?? 0, icon: Clock, color: "purple" as const },
        { label: "Reports Submitted", value: stats?.stats?.reportsSubmitted ?? 0, icon: FileText, color: "amber" as const },
    ];
    const pendingVerifications = stats?.pendingVerifications ?? 0;
    const recentProjects = stats?.recentProjects ?? [];
    const pendingSummary: PendingSummary = stats?.pendingSummary ?? {
        total: pendingVerifications,
        items: [
            {
                key: "partner_pending_verifications",
                title: "Pending verifications",
                count: pendingVerifications,
                href: "/dashboard/partner/verification",
                tone: "warning",
                description: "Student hours or reports waiting for partner review.",
            },
        ],
    };
    const stored = readStoredCurrentUser() as { orgType?: string; organization_type?: string; type?: string } | null;
    const isUni = String(stored?.orgType || stored?.organization_type || stored?.type || "")
        .toLowerCase()
        .includes("university");

    return (
        <div className="space-y-8">
            <PendingAttendanceModal variant="partner" />
            {isUni ? (
                <MockupHero
                    title="University Impact Dashboard"
                    subtitle="Monitor approved impact across Community Service, Coursework, Final Year Project (FYP) and Startup / Venture — all in one institutional view."
                    stats={[
                        {
                            value: String(
                                (stats?.stats?.reportsSubmitted ?? 0) +
                                    (uniSnap?.coursework ?? 0) +
                                    (uniSnap?.fyp ?? 0) +
                                    (uniSnap?.startup ?? 0),
                            ),
                            label: "Approved Projects",
                            href: "/dashboard/partner/impact",
                        },
                        { value: String(uniSnap?.departments ?? 0), label: "Departments" },
                        { value: String(uniSnap?.faculty ?? 0), label: "Faculty" },
                    ]}
                    rightStat={{ value: String(uniSnap?.sdgs ?? 0), label: "SDGs represented across university impact" }}
                />
            ) : (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 to-indigo-800 p-5 text-white sm:p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10">
                    <h2 className="mb-2 text-2xl font-bold sm:text-3xl">Welcome, Partner</h2>
                    <p className="text-blue-100 max-w-xl">
                        Manage your project requests, track volunteer engagement, and report impact directly through the CIEL Partner Portal.
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
                        <Link href="/dashboard/partner/requests/new" className="inline-flex justify-center rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-blue-900 transition-colors hover:bg-blue-50">Post New Request</Link>
                        <Link href="/dashboard/partner/reports" className="inline-flex justify-center rounded-xl border border-blue-700 bg-blue-800 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">
                            View reports
                        </Link>
                    </div>
                </div>
            </div>
            )}

            {isUni ? null : (
            <PendingActionCards summary={pendingSummary} emptyMessage="No partner reviews or approval follow-ups are pending." />
            )}

            {isUni ? (
                <>
                    <div className="rounded-[18px] border border-[#dde5ea] bg-white p-3.5 shadow-[0_5px_14px_rgba(24,52,64,.035)]">
                        <div className="mb-2.5 flex items-center justify-between gap-2.5">
                            <b className="text-xs text-[#16313d]">University Overview Filters</b>
                            <span className="text-[10px] text-[#70808a]">Use one or multiple filters to refine the institutional view.</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                            {["All Departments", "All Faculty Members", "All Programs", "All Batches", "All Semesters", "All Academic Years", "All Impact Areas", "All SDGs", "All Project Types", "All Statuses"].map((label) => (
                                <select key={label} defaultValue={label} className="w-full rounded-[10px] border border-[#dde5ea] bg-white px-2.5 py-2 text-[10.5px] text-[#4c5d65]">
                                    <option>{label}</option>
                                </select>
                            ))}
                            <input type="date" className="w-full rounded-[10px] border border-[#dde5ea] bg-white px-2.5 py-2 text-[10.5px] text-[#4c5d65]" aria-label="From date" />
                            <input type="date" className="w-full rounded-[10px] border border-[#dde5ea] bg-white px-2.5 py-2 text-[10.5px] text-[#4c5d65]" aria-label="To date" />
                        </div>
                    </div>
                    <MockupSectionHead
                        title="University Overview"
                        subtitle="Institution-wide snapshot across all four impact areas."
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MockupActionCard
                            href="#university-snapshot"
                            emoji="🏠"
                            ghost="🏠"
                            title="University Snapshot"
                            subtitle="Review approved records, departments, faculty participation and overall impact mix."
                            badge="VIEW"
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/impact"
                            emoji="🏆"
                            ghost="🏆"
                            title="University Impact Portfolio"
                            subtitle="Open the combined institutional portfolio across all four areas."
                            badge="PORTFOLIO"
                            background={MOCKUP_GRADIENTS.green}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/university-analytics"
                            emoji="📊"
                            ghost="🔒"
                            title="Overall Impact Analytics"
                            subtitle="Unlock cross-module trends, comparisons, rankings and downloadable institutional intelligence."
                            badge="LOCKED"
                            background={MOCKUP_GRADIENTS.purple}
                            locked
                            full
                        />
                    </div>
                    <div id="university-snapshot">
                    <MockupPanel title="University Snapshot" subtitle="Filtered institutional performance across all four impact areas.">
                        <div className="grid grid-cols-1 gap-[11px] sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                { href: "/dashboard/partner/community-service", label: "APPROVED COMMUNITY SERVICE", value: String(stats?.stats?.reportsSubmitted ?? 0), hint: `${(stats?.stats?.verifiedHours ?? 0).toLocaleString()} verified hours` },
                                { href: "/dashboard/partner/university-showcase?mode=course-project", label: "APPROVED COURSEWORK", value: String(uniSnap?.coursework ?? 0), hint: uniSnap?.courseworkCourses ? `Across ${uniSnap.courseworkCourses} courses` : "Faculty-approved records" },
                                { href: "/dashboard/partner/university-showcase?mode=fyp-thesis", label: "APPROVED FYP", value: String(uniSnap?.fyp ?? 0), hint: uniSnap?.fypDepts ? `${uniSnap.fypDepts} departments represented` : "Supervisor-approved records" },
                                { href: "/dashboard/partner/startup-business", label: "APPROVED STARTUPS", value: String(uniSnap?.startup ?? 0), hint: uniSnap?.investorOptIns ? `${uniSnap.investorOptIns} investor opt-ins` : "Faculty-approved ventures" },
                            ].map((kpi) => (
                                <Link key={kpi.label} href={kpi.href} className="rounded-[15px] border border-[#dde5ea] bg-white p-3.5 transition hover:-translate-y-px hover:border-[#9fd3c8] hover:shadow-[0_6px_14px_rgba(21,152,139,.10)]">
                                    <span className="text-[9px] font-black tracking-[0.05em] text-[#70808a]">{kpi.label}</span>
                                    <strong className="mt-1.5 block text-2xl font-semibold text-[#16313d]">{kpi.value}</strong>
                                    <small className="text-[10px] text-[#18806a]">{kpi.hint}</small>
                                </Link>
                            ))}
                        </div>
                        <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
                            <MockupStatBars
                                title="Impact Area Mix"
                                rows={((): { label: string; pct: number }[] => {
                                    const community = stats?.stats?.reportsSubmitted ?? 0;
                                    const coursework = uniSnap?.coursework ?? 0;
                                    const fyp = uniSnap?.fyp ?? 0;
                                    const startup = uniSnap?.startup ?? 0;
                                    const total = community + coursework + fyp + startup;
                                    return [
                                        { label: "Community Service", pct: pctShare(community, total) },
                                        { label: "Coursework", pct: pctShare(coursework, total) },
                                        { label: "FYP", pct: pctShare(fyp, total) },
                                        { label: "Startup / Venture", pct: pctShare(startup, total) },
                                    ];
                                })()}
                            />
                            <MockupStatBars title="Top Departments by Approved Impact" rows={uniSnap?.topDepts?.length ? uniSnap.topDepts : [{ label: "No approved records yet", pct: 0 }]} />
                        </div>
                    </MockupPanel>
                    </div>
                </>
            ) : null}

            {!isUni && pendingVerifications > 0 && (
                <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-3 sm:items-center">
                        <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-900">Pending Verifications</h3>
                            <p className="text-sm text-amber-700">You have {pendingVerifications} student reports waiting for your approval.</p>
                        </div>
                    </div>
                    <Link href="/dashboard/partner/verification" className="inline-flex justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-700">
                        Review Now
                    </Link>
                </div>
            )}

            {!isUni ? (
            <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col gap-4 group hover:-translate-y-1 transition-transform">
                        <div className="flex justify-between items-start">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${colorStyles[stat.color]}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold bg-slate-50 px-2 py-1 rounded text-slate-400">+12%</span>
                        </div>
                        <div>
                            <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
                            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Project Requests */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="mb-6 flex items-center justify-between gap-3">
                        <h3 className="font-bold text-slate-800 text-lg">Recent Project Requests</h3>
                        <Link href="/dashboard/partner/requests" className="text-sm font-bold text-blue-600 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-4">
                        {recentProjects.length > 0 ? (
                            recentProjects.map((project) => (
                                <div key={project.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-50 rounded-xl hover:border-slate-100 hover:shadow-sm transition-all">
                                    <div className="flex min-w-0 items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="truncate font-bold text-slate-800">{project.title}</h4>
                                            <p className="text-xs text-slate-500">{project.location} • {project.volunteersNeeded} Volunteers Needed</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                                        <div className="flex -space-x-2">
                                            {/* Mock avatars */}
                                            <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                                            <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white"></div>
                                            <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">+{project.volunteersApplied}</div>
                                        </div>
                                        <Link href={`/dashboard/partner/requests/${project.id}`} className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors">Manage</Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-sm">No recent projects found.</div>
                        )}
                    </div>
                </div>

                {/* Verification progress — real data: verified vs. (verified + pending) submissions */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-48 h-48 rounded-full border-[12px] border-slate-50 border-t-blue-500 border-r-green-500 flex items-center justify-center mb-4 relative" style={{ background: `conic-gradient(from 0deg, #3b82f6 0%, #3b82f6 ${stats?.verificationProgress?.percentage || 0}%, #f8fafc ${stats?.verificationProgress?.percentage || 0}%, #f8fafc 100%)`, borderRadius: '50%' }}>
                        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                            <div>
                                <div className="text-3xl font-bold text-slate-800">{stats?.verificationProgress?.percentage || 0}%</div>
                                <div className="text-xs font-bold text-slate-400 uppercase">Verified</div>
                            </div>
                        </div>
                    </div>
                    <h3 className="font-bold text-slate-800">Verification Progress</h3>
                    <p className="text-sm text-slate-500 max-w-xs mt-2">{stats?.verificationProgress?.label || "No submissions yet"}</p>
                </div>
            </div>

            <Section1AnalyticsPanel
                apiPath="/api/v1/partners/analytics/section1"
                query={{
                    project_id: recentProjects[0]?.id,
                    scope: recentProjects[0]?.id ? "project" : "aggregate",
                }}
                title="Participation & attendance"
                description="Participation and verification metrics for your organization."
                className="mt-8"
            />
            </>
            ) : null}
        </div>
    );
}
