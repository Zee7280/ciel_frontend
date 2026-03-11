"use client"

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/utils/api';
import {
    ArrowLeft, CheckCircle2, XCircle, Download, ExternalLink,
    User, Building2, Calendar, Target, Users, Activity,
    TrendingUp, Package, Handshake, FileText, MessageSquare,
    Globe, MapPin, Clock as ClockIcon, Lock, AlertTriangle, List
} from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import ReportPrintView from '../../../../student/report/components/ReportPrintView';
import AttendanceSummaryTable from '../../../../student/engagement/components/AttendanceSummaryTable';
import { checkReportQuality, QualityAlert } from '@/utils/reportQuality';

interface ReportDetail {
    id: string;
    student: {
        name: string;
        email: string;
        university: string;
    };
    opportunity: {
        title: string;
        organization: string;
        organization_name?: string;
        city?: string;
        location_district?: string;
        start_date?: string;
        end_date?: string;
        hours?: number;
    };
    submission_date: string;
    status: string;
    partner_status: string;
    admin_status: string;
    section1: any;
    section2: any;
    section3: any;
    section4: any;
    section5: any;
    section6: any;
    section7: any;
    section8: any;
    section9: any;
    section10: any;
    section11: any;
    evidence_urls: string[];
}

export default function AdminReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [report, setReport] = useState<ReportDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [qualityAlerts, setQualityAlerts] = useState<QualityAlert[]>([]);

    useEffect(() => {
        fetchReportDetail();
    }, [params.reportId]);

    const fetchReportDetail = async () => {
        console.log('📞 ADMIN: Fetching report detail for ID:', params.reportId);
        try {
            setLoading(true);
            const apiUrl = `/api/v1/admin/reports/${params.reportId}`;
            console.log('🌐 API URL:', apiUrl);

            const response = await authenticatedFetch(apiUrl);
            console.log('📡 Response:', response);
            console.log('✅ Response OK?:', response?.ok);

            if (response?.ok) {
                const data = await response.json();
                console.log('📊 Full API Response:', data);
                console.log('📋 Report data:', data.report);
                console.log('📋 Data field:', data.data);

                // Backend might return { success, data } or { report }
                const reportData = data.data || data.report || data;
                setReport(reportData);
                setQualityAlerts(checkReportQuality(reportData));
            } else {
                const errorText = await response?.text().catch(() => 'No error text');
                console.error('❌ API Error:', response?.status, errorText);
                toast.error('Failed to load report');
            }
        } catch (error) {
            console.error('💥 Error fetching report:', error);
            toast.error('Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (action: 'approve' | 'reject' | 'unlock') => {
        if ((action === 'reject' || action === 'unlock') && !feedback.trim()) {
            toast.error(`Please provide notes/feedback for ${action === 'unlock' ? 'unlocking' : 'rejection'}`);
            return;
        }

        try {
            setIsVerifying(true);
            const userData = JSON.parse(localStorage.getItem('ciel_user') || '{}');

            const response = await authenticatedFetch(`/api/v1/admin/reports/${params.reportId}/verify`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action,
                        feedback: feedback.trim() || undefined,
                        verified_by: userData.id
                    })
                }
            );

            if (response?.ok) {
                toast.success(`Report ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
                setTimeout(() => router.push('/dashboard/admin/reports/verify'), 1500);
            } else {
                toast.error('Failed to verify report');
            }
        } catch (error) {
            console.error('Verification error:', error);
            toast.error('An error occurred');
        } finally {
            setIsVerifying(false);
        }
    };

    const sections = [
        { id: 'section1', label: 'Participation Profile', icon: Users },
        { id: 'section2', label: 'Project Context', icon: FileText },
        { id: 'section3', label: 'SDG Mapping', icon: Target },
        { id: 'section4', label: 'Activities & Outputs', icon: Activity },
        { id: 'section5', label: 'Outcomes', icon: TrendingUp },
        { id: 'section6', label: 'Resources', icon: Package },
        { id: 'section7', label: 'Partnerships', icon: Handshake },
        { id: 'section8', label: 'Evidence', icon: FileText },
        { id: 'section9', label: 'Reflection', icon: MessageSquare },
        { id: 'section10', label: 'Sustainability', icon: Activity },
        { id: 'section11', label: 'Summary / Print View', icon: FileText },
    ];

    const LabelValue = ({ label, value, fullWidth = false }: { label: string, value: any, fullWidth?: boolean }) => (
        <div className={`flex flex-col mb-4 ${fullWidth ? 'w-full' : 'w-1/2 pr-4'}`}>
            <span className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-1">{label}</span>
            <div className="text-sm text-slate-900 leading-relaxed text-justify">{value || "N/A"}</div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Report Not Found</h2>
                    <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-white rounded-lg font-medium transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Reports
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-black border border-blue-200 uppercase tracking-widest">
                            Single-Page Dossier Mode
                        </span>
                        <span className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-black border border-purple-200 uppercase tracking-widest">
                            Super Admin
                        </span>
                    </div>
                </div>

                {/* Quality Insight Banner */}
                {qualityAlerts.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-900 leading-none">Impact Quality Insights</h2>
                                <p className="text-xs text-amber-700 font-bold mt-1 uppercase tracking-wider">AI-Driven Automated Checks</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {qualityAlerts.map((alert, idx) => (
                                <div key={idx} className={clsx(
                                    "p-3 rounded-2xl border flex items-start gap-3 transition-all",
                                    alert.severity === 'error' ? "bg-red-50 border-red-100 text-red-700" : "bg-white border-amber-100 text-amber-700"
                                )}>
                                    <div className={clsx(
                                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                        alert.severity === 'error' ? "bg-red-500" : "bg-amber-500"
                                    )} />
                                    <p className="text-xs font-bold leading-relaxed">{alert.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Student & Opportunity Info */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-2xl border-4 border-slate-100">
                                {report.student.name.charAt(0)}
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 mb-2">{report.student.name}</h1>
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <User className="w-4 h-4" />
                                        <span className="font-medium">{report.student.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Building2 className="w-4 h-4" />
                                        <span className="font-medium">{report.student.university}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Calendar className="w-4 h-4" />
                                        <span className="font-medium">
                                            Submitted: {new Date(report.submission_date).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <span className={clsx(
                                'px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide border',
                                report.status === 'verified' && 'bg-green-50 text-green-700 border-green-200',
                                report.status === 'submitted' && 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                report.status === 'partner_verified' && 'bg-indigo-50 text-indigo-700 border-indigo-200',
                                report.status === 'rejected' && 'bg-red-50 text-red-700 border-red-200'
                            )}>
                                {report.status === 'partner_verified' ? 'NGO Verified' : report.status}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 mt-1">NGO DECISION:</span>
                                <span className={clsx(
                                    'text-[10px] font-black mt-1 uppercase',
                                    report.partner_status === 'approved' ? 'text-green-600' : 'text-slate-400'
                                )}>
                                    {report.partner_status || 'Pending'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-slate-50 rounded-2xl">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Opportunity</p>
                        <p className="text-lg font-bold text-slate-900">{report.opportunity.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{report.opportunity.organization}</p>
                    </div>
                </div>

                {/* Report Content - Unified Scrollable Dossier */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Sticky Table of Contents */}
                    <div className="lg:col-span-3 sticky top-8 space-y-4">
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <List className="w-4 h-4 text-blue-500" />
                                Dossier Contents
                            </h3>
                            <div className="space-y-1">
                                {sections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => {
                                            const el = document.getElementById(section.id);
                                            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-slate-50 group text-left"
                                    >
                                        <section.icon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{section.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Status Summary */}
                        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Decision Hub</p>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-slate-500 font-bold mb-1">Impact Score</p>
                                    <p className="text-2xl font-black">
                                        {report.section9?.competency_scores ? (Object.values(report.section9.competency_scores as Record<string, any>).reduce((a: any, b: any) => a + Number(b || 0), 0) / 12).toFixed(1) : "0.0"}
                                        <span className="text-lg text-slate-500 font-bold">/5.0</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        const el = document.getElementById('actions');
                                        el?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/40"
                                >
                                    Jump to Action
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* All Sections rendered vertically */}
                    <div className="lg:col-span-9 space-y-8">
                        {/* Section 1 */}
                        <div id="section1" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm scroll-mt-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">01. Participation Profile</h2>
                                </div>

                                <LabelValue label="Participation Type" value={report.section1?.participation_type} />
                                <div className="mt-4">
                                    <h3 className="font-bold text-slate-800 text-sm mb-2 border-b pb-1">Team Lead</h3>
                                    <div className="flex flex-wrap">
                                        <LabelValue label="Name" value={report.section1?.team_lead?.name} />
                                        <LabelValue label="University" value={report.section1?.team_lead?.university} />
                                        <LabelValue label="Email" value={report.section1?.team_lead?.email} />
                                        <LabelValue label="Role" value={report.section1?.team_lead?.role} />
                                    </div>
                                </div>
                                {report.section1?.team_members && report.section1.team_members.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="font-bold text-slate-800 text-sm mb-2 border-b pb-1">Team Members ({report.section1.team_members.length})</h3>
                                        <div className="space-y-2">
                                            {report.section1.team_members.map((member: any, index: number) => (
                                                <div key={index} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                                    <span className="font-bold text-slate-900">{member.name}</span>
                                                    <span className="text-sm text-slate-600">{member.role}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {report.section1?.attendance_logs && report.section1.attendance_logs.length > 0 && (
                                    <div className="mt-8">
                                        <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-1 uppercase tracking-widest text-slate-400">Attendance & Evidence Logs</h3>
                                        <AttendanceSummaryTable
                                            entries={report.section1.attendance_logs}
                                            isLocked={true}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div id="section2" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm scroll-mt-8">
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">02. Project Context</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Partner Organization</p>
                                            <p className="font-bold text-slate-900">{report.opportunity?.organization_name || report.opportunity?.organization || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Location</p>
                                            <p className="font-bold text-slate-900">{report.opportunity?.city || report.opportunity?.location_district || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Timeline</p>
                                            <p className="font-bold text-slate-900">
                                                {report.opportunity?.start_date ? new Date(report.opportunity.start_date).toLocaleDateString() : "—"} to {report.opportunity?.end_date ? new Date(report.opportunity.end_date).toLocaleDateString() : "—"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                            <ClockIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Credit Hours</p>
                                            <p className="font-bold text-slate-900">{report.opportunity?.hours || "0"} Hours Credit</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-6">
                                    <div className="flex flex-wrap">
                                        <LabelValue label="Discipline" value={report.section2?.discipline} />
                                        <LabelValue label="Problem Statement" value={report.section2?.problem_statement} fullWidth />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div id="section3" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm scroll-mt-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                        <Target className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">03. SDG Mapping</h2>
                                </div>
                                <LabelValue label="Contribution Logic / Purpose" value={report.section3?.contribution_intent_statement} fullWidth />
                                {report.section3?.secondary_sdgs && report.section3.secondary_sdgs.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="font-bold text-slate-800 text-sm mb-2 border-b pb-1">Secondary SDGs</h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {report.section3.secondary_sdgs.map((sdg: any, i: number) => (
                                                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded mr-2">GOAL {sdg.goal_number}</span>
                                                    <p className="inline text-sm text-slate-700">{sdg.justification_text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 4 */}
                        <div id="section4" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm scroll-mt-8">
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">04. Activities & Outputs</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-slate-800 text-sm border-b pb-1 uppercase tracking-widest text-slate-400">Engagement Details</h3>
                                        <div className="flex flex-wrap">
                                            <LabelValue label="Total Beneficiaries" value={report.section4?.total_beneficiaries} />
                                            <LabelValue label="Total Sessions" value={report.section4?.total_sessions} />
                                            <LabelValue label="Delivery Mode" value={report.section4?.delivery_mode} />
                                            <LabelValue label="Primary Change Area" value={report.section4?.primary_change_area} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-bold text-slate-800 text-sm border-b pb-1 uppercase tracking-widest text-slate-400">Core Activities</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {report.section4?.activities?.map((act: any, i: number) => (
                                                <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                                                    {act.type === 'Other' ? act.other_text : act.type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 text-sm border-b pb-1 uppercase tracking-widest text-slate-400">Tangible Outputs</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {report.section4?.outputs?.map((out: any, i: number) => (
                                            <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="text-2xl font-black text-slate-900">{out.count}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{out.type === 'Other' ? out.other_text : out.type}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 5 */}
                        <div id="section5" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm scroll-mt-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">05. Outcomes</h2>
                                </div>
                                <div className="flex flex-wrap">
                                    <LabelValue label="Observed Change" value={report.section5?.observed_change} fullWidth />
                                    <LabelValue label="Challenges" value={report.section5?.challenges} fullWidth />
                                </div>
                            </div>
                        </div>

                        {/* Section 6 */}
                        <div id="section6" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm scroll-mt-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">06. Resources</h2>
                                </div>
                                <LabelValue label="Used External Resources" value={report.section6?.use_resources} />
                                {report.section6?.resources && report.section6.resources.length > 0 && (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full text-sm border-collapse border border-slate-200">
                                            <thead>
                                                <tr className="bg-slate-50 text-left">
                                                    <th className="border border-slate-200 p-2">Type</th>
                                                    <th className="border border-slate-200 p-2">Amount</th>
                                                    <th className="border border-slate-200 p-2">Source</th>
                                                    <th className="border border-slate-200 p-2">Purpose</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {report.section6.resources.map((r: any, i: number) => (
                                                    <tr key={i}>
                                                        <td className="border border-slate-200 p-2">{r.type}</td>
                                                        <td className="border border-slate-200 p-2">{r.amount} {r.unit}</td>
                                                        <td className="border border-slate-200 p-2">{r.sources?.join(', ') || r.source}</td>
                                                        <td className="border border-slate-200 p-2">{r.purpose}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 7 */}
                        <div id="section7" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm scroll-mt-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                                        <Handshake className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">07. Partnerships</h2>
                                </div>
                                <LabelValue label="Has Partners" value={report.section7?.has_partners} />
                                {report.section7?.partners && report.section7.partners.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {report.section7.partners.map((p: any, i: number) => (
                                            <div key={i} className="text-sm border border-slate-200 p-3 rounded-lg bg-slate-50">
                                                <strong>{p.name}</strong> ({p.type})
                                                {p.contribution && <div className="mt-1 text-slate-600">Contributions: {p.contribution.join(", ")}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 8 */}
                        <div id="section8" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm scroll-mt-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">08. Evidence</h2>
                                </div>
                                <LabelValue label="Description" value={report.section8?.description} fullWidth />
                                {report.section8?.evidence_types && (
                                    <LabelValue label="Evidence Types" value={report.section8.evidence_types.join(", ")} fullWidth />
                                )}

                                <div className="mt-4">
                                    <h3 className="font-bold text-slate-800 text-sm mb-3">Evidence Files</h3>
                                    {report.evidence_urls && report.evidence_urls.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            {report.evidence_urls.map((url, index) => (
                                                <a
                                                    key={index}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-between group border border-slate-100"
                                                >
                                                    <span className="font-bold text-slate-900 group-hover:text-blue-600">Evidence {index + 1}</span>
                                                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 italic text-sm">No evidence files uploaded</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 9 */}
                        <div id="section9" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm scroll-mt-8">
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                        <MessageSquare className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">09. Reflection & Growth</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Academic Integration</p>
                                        <p className="font-bold text-slate-900">{report.section9?.academic_integration || "N/A"}</p>
                                    </div>
                                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Impact Score (Calculated)</p>
                                        <p className="font-bold text-slate-900">{report.section9?.competency_scores ? (Object.values(report.section9.competency_scores as Record<string, any>).reduce((a: any, b: any) => a + Number(b || 0), 0) / 12).toFixed(1) : "0.0"} / 5.0</p>
                                    </div>
                                </div>

                                <LabelValue label="Disciplinary / Academic Application" value={report.section9?.academic_application} fullWidth />
                                <LabelValue label="Personal Learning & Insights" value={report.section9?.personal_learning} fullWidth />
                                <LabelValue label="Sustainability & Systems Reflection" value={report.section9?.sustainability_reflection} fullWidth />
                            </div>
                        </div>

                        {/* Section 10 */}
                        <div id="section10" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm scroll-mt-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">10. Sustainability</h2>
                                </div>
                                <LabelValue label="Continuation Status" value={report.section10?.continuation_status} />
                                {report.section10?.mechanisms && (
                                    <LabelValue label="Mechanisms" value={report.section10.mechanisms.join(", ")} fullWidth />
                                )}
                                <LabelValue label="Sustainability Details" value={report.section10?.continuation_details} fullWidth />
                            </div>
                        </div>

                        {/* Summary View */}
                        <div id="section11" className="bg-white rounded-[3rem] p-12 border border-slate-200 shadow-xl scroll-mt-8 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <FileText className="w-64 h-64 text-slate-900" />
                            </div>
                            <div className="relative z-10 text-center">
                                <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-50 border border-indigo-100 rounded-full mb-6">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Premium Impact Dossier</span>
                                </div>
                                <h2 className="text-4xl font-black mb-12 text-slate-900">Executive Impact Dossier</h2>
                                <div className="text-left">
                                    <ReportPrintView projectData={report.opportunity} reportData={{ ...report }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="actions" className="bg-white rounded-[3rem] p-12 border border-slate-200 shadow-xl mt-12 mb-20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <CheckCircle2 className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-black text-slate-900 mb-2">Impact Decision Hub</h3>
                        <p className="text-slate-500 font-medium mb-8">Review all sections above before making a final determination on this impact report.</p>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Decision Feedback / Notes</label>
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Provide detailed feedback for the student..."
                                    className="w-full min-h-[160px] rounded-[2rem] border border-slate-200 p-6 focus:outline-none focus:ring-8 focus:ring-blue-50 focus:border-blue-400 bg-slate-50/50 text-slate-900 font-medium transition-all"
                                />
                                <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-wider italic">* Required for rejection, shared with the student upon decision.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                <button
                                    onClick={() => handleVerify('approve')}
                                    disabled={isVerifying || report.admin_status === 'approved'}
                                    className="flex flex-col items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] font-bold p-8 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50 group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg leading-tight">{report.admin_status === 'approved' ? 'Approved' : 'Approve'}</p>
                                        <p className="text-[10px] opacity-70 font-black uppercase tracking-widest mt-1">Verify Impact</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleVerify('reject')}
                                    disabled={isVerifying || report.status === 'rejected'}
                                    className="flex flex-col items-center gap-3 border-2 border-red-100 bg-red-50 text-red-600 hover:bg-red-100 rounded-[2rem] font-bold p-8 transition-all disabled:opacity-50 group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-red-200/50 flex items-center justify-center group-hover:scale-110 transition-transform text-red-600">
                                        <XCircle className="w-6 h-6" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg leading-tight">{report.status === 'rejected' ? 'Rejected' : 'Reject'}</p>
                                        <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mt-1">Needs Revision</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleVerify('unlock')}
                                    disabled={isVerifying || report.status === 'draft'}
                                    className="flex flex-col items-center gap-3 border-2 border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-[2rem] font-bold p-8 transition-all disabled:opacity-50 group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-blue-200/50 flex items-center justify-center group-hover:scale-110 transition-transform text-blue-600">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg leading-tight">{report.status === 'draft' ? 'Unlocked' : 'Unlock'}</p>
                                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1">Allow Changes</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
