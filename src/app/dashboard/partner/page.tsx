"use client";

import { useEffect, useState } from "react";
import { Users, FileCheck, Clock, FileText, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import PendingActionCards, { type PendingSummary } from "@/components/dashboard/PendingActionCards";
import Section1AnalyticsPanel from "@/components/analytics/Section1AnalyticsPanel";
import PendingAttendanceModal from "@/components/engagement/PendingAttendanceModal";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupKpiGrid, MockupPanel, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import { readStoredCurrentUser } from "@/utils/currentUser";

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

export default function PartnerDashboard() {
    const [stats, setStats] = useState<PartnerDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

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
                    subtitle="Monitor approved impact across Community Service, Coursework, FYP / Final Year Project and Startup / Venture — all in one institutional view."
                    stats={[
                        { value: String(stats?.stats?.reportsSubmitted ?? stats?.stats?.activeOpportunities ?? 0), label: "Approved Projects" },
                        { value: String(stats?.stats?.studentsEngaged ?? 0), label: "Students Engaged" },
                        { value: String(pendingVerifications), label: "Pending Review" },
                    ]}
                    rightStat={{ value: String(stats?.stats?.activeOpportunities ?? 0), label: "active opportunities across the university" }}
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

            <PendingActionCards summary={pendingSummary} emptyMessage="No partner reviews or approval follow-ups are pending." />

            {isUni ? (
                <>
                    <MockupSectionHead
                        title="University Overview"
                        subtitle="Institution-wide snapshot across all four impact areas."
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MockupActionCard
                            href="/dashboard/partner/community-service"
                            emoji="🏕️"
                            title="Community Service"
                            subtitle="Create opportunities, view approved Community Service work, assess impact and unlock analytics."
                            badge="OPEN"
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/university-showcase?mode=course-project"
                            emoji="📚"
                            title="Coursework"
                            subtitle="All faculty-approved sustainability-linked coursework flows automatically into the university view."
                            badge="OPEN"
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/university-showcase?mode=fyp-thesis"
                            emoji="🎓"
                            title="FYP / Final Year Project"
                            subtitle="Approved Final Year Projects from all departments flow automatically into the university view."
                            badge="OPEN"
                            background={MOCKUP_GRADIENTS.orange}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/impact"
                            emoji="💼"
                            title="Startup / Venture"
                            subtitle="View approved ventures, run AI Rankings and identify investor-ready student ventures."
                            badge="OPEN"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/impact"
                            emoji="🏆"
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
                            badge="ANALYTICS"
                            background={MOCKUP_GRADIENTS.gold}
                        />
                    </div>
                    <MockupPanel title="University Snapshot" subtitle="Filtered institutional performance across all four impact areas.">
                        <MockupKpiGrid
                            items={[
                                { label: "ACTIVE OPPORTUNITIES", value: String(stats?.stats?.activeOpportunities ?? 0), hint: "Live listings" },
                                { label: "STUDENTS ENGAGED", value: String(stats?.stats?.studentsEngaged ?? 0), hint: "Across impact areas" },
                                { label: "VERIFIED HOURS", value: String(stats?.stats?.verifiedHours ?? 0), hint: "Institutional total" },
                                { label: "REPORTS SUBMITTED", value: String(stats?.stats?.reportsSubmitted ?? 0), hint: "Awaiting or complete" },
                            ]}
                        />
                    </MockupPanel>
                </>
            ) : null}

            {/* Pending Verifications Alert */}
            {pendingVerifications > 0 && (
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        </div>
    );
}
