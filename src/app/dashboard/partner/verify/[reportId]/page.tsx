"use client"

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/utils/api';
import {
    ArrowLeft, CheckCircle2, XCircle, Download, ExternalLink,
    User, Building2, Calendar, Target, Users, Activity,
    TrendingUp, Package, Handshake, FileText, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';

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
    };
    submission_date: string;
    status: string;
    section1: any;
    section2: any;
    section3: any;
    section4: any;
    section5: any;
    section6: any;
    section7: any;
    section8: any;
    section10: any;
    section12: any;
    evidence_urls: string[];
}

export default function ReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [report, setReport] = useState<ReportDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [activeSection, setActiveSection] = useState('section1');

    useEffect(() => {
        fetchReportDetail();
    }, [params.reportId]);

    const fetchReportDetail = async () => {
        console.log('📞 Fetching report detail for ID:', params.reportId);
        try {
            setLoading(true);
            const apiUrl = `${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/reports/${params.reportId}`;
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
                setReport(data.data || data.report || data);
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

    const handleVerify = async (action: 'approve' | 'reject') => {
        if (action === 'reject' && !feedback.trim()) {
            toast.error('Please provide feedback for rejection');
            return;
        }

        try {
            setIsVerifying(true);
            const userData = JSON.parse(localStorage.getItem('ciel_user') || '{}');

            const response = await authenticatedFetch(
                `${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/reports/${params.reportId}/verify`,
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
                setTimeout(() => router.push('/dashboard/partner/verify'), 1500);
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
        { id: 'section1', label: 'Project Context', icon: FileText },
        { id: 'section2', label: 'Team Information', icon: Users },
        { id: 'section3', label: 'SDG Mapping', icon: Target },
        { id: 'section4', label: 'Activities', icon: Activity },
        { id: 'section5', label: 'Outcomes', icon: TrendingUp },
        { id: 'section6', label: 'Resources', icon: Package },
        { id: 'section7', label: 'Partnerships', icon: Handshake },
        { id: 'section8', label: 'Evidence', icon: FileText },
        { id: 'section10', label: 'Reflection', icon: MessageSquare },
    ];

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
                </div>

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

                        <span className={clsx(
                            'px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide border',
                            report.status === 'verified' && 'bg-green-50 text-green-700 border-green-200',
                            report.status === 'submitted' && 'bg-yellow-50 text-yellow-700 border-yellow-200',
                            report.status === 'rejected' && 'bg-red-50 text-red-700 border-red-200'
                        )}>
                            {report.status}
                        </span>
                    </div>

                    <div className="mt-6 p-4 bg-slate-50 rounded-2xl">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Opportunity</p>
                        <p className="text-lg font-bold text-slate-900">{report.opportunity.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{report.opportunity.organization}</p>
                    </div>
                </div>

                {/* Report Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Section Navigation */}
                    <div className="lg:col-span-1 space-y-2">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={clsx(
                                    'w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm text-left',
                                    activeSection === section.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                )}
                            >
                                <section.icon className="w-5 h-5" />
                                {section.label}
                            </button>
                        ))}
                    </div>

                    {/* Section Content */}
                    <div className="lg:col-span-3 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm min-h-[500px]">
                        {activeSection === 'section1' && report.section1 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">Project Context</h2>
                                <div>
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Problem Statement</label>
                                    <p className="mt-2 text-slate-700 leading-relaxed">{report.section1.problem_statement}</p>
                                </div>
                            </div>
                        )}

                        {activeSection === 'section2' && report.section2 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">Team Information</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Team Lead</label>
                                        <p className="mt-1 font-bold text-slate-900">{report.section2.team_lead?.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Participation Type</label>
                                        <p className="mt-1 font-bold text-slate-900 capitalize">{report.section2.participation_type}</p>
                                    </div>
                                </div>
                                {report.section2.team_members && report.section2.team_members.length > 0 && (
                                    <div>
                                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Team Members ({report.section2.team_members.length})</label>
                                        <div className="mt-4 space-y-2">
                                            {report.section2.team_members.map((member: any, index: number) => (
                                                <div key={index} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                                    <span className="font-bold text-slate-900">{member.name}</span>
                                                    <span className="text-sm text-slate-600">{member.role}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeSection === 'section3' && report.section3 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">SDG Mapping</h2>
                                <div>
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Primary SDG Explanation</label>
                                    <p className="mt-2 text-slate-700 leading-relaxed">{report.section3.primary_sdg_explanation}</p>
                                </div>
                            </div>
                        )}

                        {activeSection === 'section4' && report.section4 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">Activities & Outputs</h2>
                                <div>
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Activity Description</label>
                                    <p className="mt-2 text-slate-700 leading-relaxed">{report.section4.activity_description}</p>
                                </div>
                            </div>
                        )}

                        {activeSection === 'section8' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">Evidence Files</h2>
                                {report.evidence_urls && report.evidence_urls.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {report.evidence_urls.map((url, index) => (
                                            <a
                                                key={index}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-between group"
                                            >
                                                <span className="font-bold text-slate-900 group-hover:text-blue-600">Evidence {index + 1}</span>
                                                <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">No evidence files uploaded</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Verification Actions */}
                {report.status === 'submitted' && (
                    <div id="actions" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-black text-slate-900 mb-6">Verification Actions</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">Feedback (Optional for Approval, Required for Rejection)</label>
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Provide feedback on this report..."
                                    className="w-full min-h-[120px] rounded-2xl border border-slate-200 p-4 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleVerify('approve')}
                                    disabled={isVerifying}
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold py-4 text-lg shadow-lg shadow-green-200 transition-all disabled:opacity-50"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Approve Report
                                </button>
                                <button
                                    onClick={() => handleVerify('reject')}
                                    disabled={isVerifying}
                                    className="flex-1 flex items-center justify-center gap-2 border-2 border-red-300 text-red-600 hover:bg-red-50 rounded-2xl font-bold py-4 text-lg transition-all disabled:opacity-50"
                                >
                                    <XCircle className="w-5 h-5" />
                                    Reject Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
