"use client"

import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/utils/api';
import { CheckCircle2, XCircle, Clock, FileText, Search, CalendarDays, ExternalLink, User, Briefcase, Filter, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import clsx from 'clsx';

interface Report {
    id: string;
    student_name: string;
    student_email: string;
    project_title: string;
    submission_date: string;
    status: string;
    partner_status: string;
    admin_status: string;
    created_at: string;
}

export default function VerifyWorkPage() {
    console.log('🚀 VerifyWorkPage component mounted!');

    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'submitted' | 'verified' | 'rejected'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        console.log('🔄 useEffect triggered! activeTab:', activeTab);
        fetchReports();
    }, [activeTab]);

    const fetchReports = async () => {
        console.log('📞 fetchReports called!');
        try {
            console.log('🔧 Setting loading to true...');
            setLoading(true);

            const userStr = localStorage.getItem('ciel_user');
            console.log('🔍 User data from localStorage:', userStr);

            if (!userStr) {
                toast.error('User not found. Please login again.');
                setLoading(false);
                return;
            }

            const orgData = JSON.parse(userStr);
            console.log('📦 Parsed user data:', orgData);

            const orgId = orgData?.organizationId || orgData?.organization?.id;
            console.log('🏢 Organization ID:', orgId);

            if (!orgId) {
                toast.error('Organization not found');
                setLoading(false);
                return;
            }

            const statusParam = activeTab !== 'all' ? `?status=${activeTab}` : '';
            const apiUrl = `/api/v1/partners/student-reports${statusParam}`;

            console.log('🌐 Calling API:', apiUrl);

            const response = await authenticatedFetch(apiUrl);

            console.log('📡 API Response:', response);
            console.log('✅ Response OK?:', response?.ok);

            if (response?.ok) {
                const data = await response.json();
                console.log('📊 Reports data:', data);

                // Backend returns { success, data } not { reports }
                if (data.success && data.data) {
                    setReports(data.data);
                } else {
                    setReports([]);
                }
            } else {
                const errorText = await response?.text().catch(() => 'No error text');
                console.error('❌ API Error:', errorText);
                toast.error('Failed to load reports');
            }
        } catch (error) {
            console.error('💥 Error fetching reports:', error);
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const config = {
            submitted: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label: 'Pending Verification' },
            partner_verified: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: CheckCircle2, label: 'Verified by You' },
            verified: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Fully Verified' },
            rejected: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle, label: 'Rejected' },
            draft: { color: 'bg-slate-50 text-slate-600 border-slate-200', icon: FileText, label: 'Draft' },
            approved: { color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: CheckCircle2, label: 'Approved' },
            pending: { color: 'bg-slate-100 text-slate-500 border-slate-200', icon: Clock, label: 'Pending' },
        };

        const { color, icon: Icon, label } = config[status as keyof typeof config] || config.draft;

        return (
            <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-bold text-[10px] uppercase tracking-wider', color)}>
                <Icon className="w-3 h-3" />
                {label}
            </span>
        );
    };

    const filteredReports = reports.filter(report =>
        report.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.project_title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tabs = [
        { id: 'all', label: 'All Reports', count: reports.length },
        { id: 'submitted', label: 'Submitted', count: reports.filter(r => r.status === 'submitted').length },
        { id: 'verified', label: 'Verified', count: reports.filter(r => r.status === 'verified').length },
        { id: 'rejected', label: 'Rejected', count: reports.filter(r => r.status === 'rejected').length },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            Verification & Approval
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">
                            Review and verify student activities to empower their journey.
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-400 bg-white px-4 py-2 rounded-2xl border border-slate-100 italic">
                        <Filter className="w-4 h-4" /> Filtering for your organization
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-slate-200/50 p-1 rounded-[22px] border border-slate-200/60 inline-flex flex-wrap gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={clsx(
                                'px-6 py-2.5 rounded-[18px] font-bold text-sm transition-all duration-300 flex items-center gap-2',
                                activeTab === tab.id
                                    ? 'bg-white text-blue-600 shadow-[0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-slate-200/50'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                            )}
                        >
                            {tab.label}
                            <span className={clsx(
                                'px-2 py-0.5 rounded-lg text-[10px] font-black tracking-tight',
                                activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by student name or opportunity..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-medium text-slate-700"
                        />
                    </div>
                </div>

                {/* Reports Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">All Caught Up!</h3>
                        <p className="text-slate-500 font-medium">No pending items for verification.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredReports.map((report) => (
                            <div
                                key={report.id}
                                className="bg-white rounded-[32px] p-7 border border-slate-200 hover:border-blue-200 hover:shadow-[0_20px_40px_-15px_rgba(37,99,235,0.08)] transition-all duration-500 group relative flex flex-col"
                            >
                                <div className="flex items-start justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200 ring-4 ring-white">
                                                {report.student_name.charAt(0)}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors flex items-center gap-1">
                                                {report.student_name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                                                <User className="w-3.5 h-3.5" />
                                                <span className="text-[11px] font-bold uppercase tracking-wider truncate max-w-[120px]">{report.student_email.split('@')[0]}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        {getStatusBadge(report.status)}
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8 flex-1">
                                    <div className="bg-slate-50/80 rounded-[24px] p-5 border border-slate-100 group-hover:bg-blue-50/30 group-hover:border-blue-100 transition-colors duration-500">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Project</p>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 leading-relaxed line-clamp-2">
                                            {report.project_title}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 px-2">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-slate-400" />
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Submitted</span>
                                                <span className="text-xs font-black text-slate-600">
                                                    {new Date(report.submission_date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-auto">
                                    <button
                                        onClick={() => router.push(`/dashboard/partner/verify/${report.id}`)}
                                        className="flex-[2] bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-bold py-3.5 px-4 shadow-lg shadow-slate-200 hover:shadow-blue-200 transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                                    >
                                        View Details
                                        <ExternalLink className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    </button>
                                    {report.status === 'submitted' && (
                                        <button
                                            onClick={() => router.push(`/dashboard/partner/verify/${report.id}#actions`)}
                                            className="flex-1 rounded-2xl font-bold border-2 border-slate-100 text-slate-600 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50/50 py-3.5 px-4 transition-all duration-300 flex items-center justify-center"
                                            title="Quick Verify"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
