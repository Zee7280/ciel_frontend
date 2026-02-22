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
import ReportPrintView from '../../../student/report/components/ReportPrintView';

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
            const apiUrl = `/api/v1/students/reports/${params.reportId}`;
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

            const response = await authenticatedFetch(`/api/v1/students/reports/${params.reportId}/verify`,
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

                        <div className="flex flex-col items-end gap-2">
                            <span className={clsx(
                                'px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide border',
                                report.status === 'verified' && 'bg-green-50 text-green-700 border-green-200',
                                report.status === 'partner_verified' && 'bg-indigo-50 text-indigo-700 border-indigo-200',
                                report.status === 'submitted' && 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                report.status === 'rejected' && 'bg-red-50 text-red-700 border-red-200'
                            )}>
                                {report.status === 'partner_verified' ? 'Verified (Pending Admin)' : report.status}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 mt-1">ADMIN DECISION:</span>
                                <span className={clsx(
                                    'text-[10px] font-black mt-1 uppercase',
                                    report.admin_status === 'approved' ? 'text-green-600' : 'text-slate-400'
                                )}>
                                    {report.admin_status || 'Pending'}
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
                                <h2 className="text-2xl font-black text-slate-900">Participation Profile</h2>
                                <LabelValue label="Participation Type" value={report.section1.participation_type} />
                                <div className="mt-4">
                                    <h3 className="font-bold text-slate-800 text-sm mb-2 border-b pb-1">Team Lead</h3>
                                    <div className="flex flex-wrap">
                                        <LabelValue label="Name" value={report.section1.team_lead?.name} />
                                        <LabelValue label="University" value={report.section1.team_lead?.university} />
                                        <LabelValue label="Email" value={report.section1.team_lead?.email} />
                                        <LabelValue label="Role" value={report.section1.team_lead?.role} />
                                    </div>
                                </div>
                                {report.section1.team_members && report.section1.team_members.length > 0 && (
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
                            </div>
                        )}

                        {activeSection === 'section2' && report.section2 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">Project Context</h2>
                                <div className="flex flex-wrap">
                                    <LabelValue label="Discipline" value={report.section2.discipline} />
                                    <LabelValue label="Problem Statement" value={report.section2.problem_statement} fullWidth />
                                </div>
                            </div>
                        )}

                        {activeSection === 'section3' && report.section3 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">SDG Mapping</h2>
                                <LabelValue label="Primary SDG Explanation" value={report.section3.primary_sdg_explanation} fullWidth />
                                {report.section3.secondary_sdgs && report.section3.secondary_sdgs.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="font-bold text-slate-800 text-sm mb-2 border-b pb-1">Secondary SDGs</h3>
                                        <ul className="list-disc ml-5 text-sm text-slate-700">
                                            {report.section3.secondary_sdgs.map((sdg: any, i: number) => (
                                                <li key={i}>Goal {sdg.sdg_id}: {sdg.justification}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeSection === 'section4' && report.section4 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">Activities & Outputs</h2>
                                <div className="flex flex-wrap">
                                    <LabelValue label="Activity Type" value={report.section4.activity_type} />
                                    <LabelValue label="Total Beneficiaries" value={report.section4.total_beneficiaries} />
                                    <LabelValue label="Total Sessions" value={report.section4.total_sessions} />
                                    <LabelValue label="Duration" value={`${report.section4.duration_val} ${report.section4.duration_unit}`} />
                                </div>
                            </div>
                        )}

                        {activeSection === 'section5' && report.section5 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">Outcomes</h2>
                                <div className="flex flex-wrap">
                                    <LabelValue label="Observed Change" value={report.section5.observed_change} fullWidth />
                                    <LabelValue label="Challenges" value={report.section5.challenges} fullWidth />
                                </div>
                            </div>
                        )}

                        {activeSection === 'section6' && report.section6 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">Resources</h2>
                                <LabelValue label="Used External Resources" value={report.section6.use_resources} />
                                {report.section6.resources && report.section6.resources.length > 0 && (
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
                                                        <td className="border border-slate-200 p-2">{r.source}</td>
                                                        <td className="border border-slate-200 p-2">{r.purpose}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeSection === 'section7' && report.section7 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">Partnerships</h2>
                                <LabelValue label="Has Partners" value={report.section7.has_partners} />
                                {report.section7.partners && report.section7.partners.length > 0 && (
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
                        )}

                        {activeSection === 'section8' && report.section8 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">Evidence</h2>
                                <LabelValue label="Description" value={report.section8.description} fullWidth />
                                {report.section8.evidence_types && (
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
                        )}

                        {activeSection === 'section9' && report.section9 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">Reflection</h2>
                                <LabelValue label="Academic Connection" value={report.section9.academic_application} fullWidth />
                                <LabelValue label="Personal Growth" value={report.section9.personal_learning} fullWidth />
                                <LabelValue label="Strongest Competency" value={report.section9.strongest_competency} fullWidth />
                            </div>
                        )}

                        {activeSection === 'section10' && report.section10 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900">Sustainability</h2>
                                <LabelValue label="Continuation Status" value={report.section10.continuation_status} />
                                {report.section10.mechanisms && (
                                    <LabelValue label="Mechanisms" value={report.section10.mechanisms.join(", ")} fullWidth />
                                )}
                                <LabelValue label="Sustainability Details" value={report.section10.continuation_details} fullWidth />
                            </div>
                        )}

                        {activeSection === 'section11' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-slate-900 mb-6">Complete Report Summary</h2>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                                    <ReportPrintView projectData={report.opportunity} reportData={{ ...report }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Verification Actions */}
                {report.partner_status === 'pending' && (
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
