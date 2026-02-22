"use client"

import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/utils/api';
import { CheckCircle2, XCircle, Clock, FileText, Search } from 'lucide-react';
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
            submitted: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock, label: 'Pending Verification' },
            partner_verified: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: CheckCircle2, label: 'Verified by You' },
            verified: { color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2, label: 'Fully Verified' },
            rejected: { color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Rejected' },
            draft: { color: 'bg-slate-50 text-slate-700 border-slate-200', icon: FileText, label: 'Draft' },
            approved: { color: 'bg-green-50 text-green-600 border-green-200', icon: CheckCircle2, label: 'Approved' },
            pending: { color: 'bg-slate-50 text-slate-500 border-slate-200', icon: Clock, label: 'Pending' },
        };

        const { color, icon: Icon, label } = config[status as keyof typeof config] || config.draft;

        return (
            <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border font-bold text-xs uppercase tracking-wide', color)}>
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
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                            Verification & Approval
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">
                            Review and verify student activities and reports
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-3xl p-2 border border-slate-200 shadow-sm inline-flex gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={clsx(
                                'px-6 py-3 rounded-2xl font-bold text-sm transition-all',
                                activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'text-slate-600 hover:bg-slate-50'
                            )}
                        >
                            {tab.label}
                            <span className={clsx(
                                'ml-2 px-2 py-0.5 rounded-lg text-xs font-black',
                                activeTab === tab.id ? 'bg-blue-500' : 'bg-slate-100'
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredReports.map((report) => (
                            <div
                                key={report.id}
                                className="bg-white rounded-3xl p-6 border border-slate-200 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-lg border-2 border-slate-100">
                                            {report.student_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                {report.student_name}
                                            </h3>
                                            <p className="text-xs text-slate-500 font-medium">{report.student_email}</p>
                                        </div>
                                    </div>
                                    {getStatusBadge(report.status)}
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="bg-slate-50 rounded-2xl p-4">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Project</p>
                                        <p className="text-sm font-bold text-slate-900 line-clamp-2">
                                            {report.project_title}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <div>
                                            <span className="text-slate-400 font-medium">Submitted:</span>
                                            <span className="ml-2 font-bold text-slate-700">
                                                {new Date(report.submission_date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => router.push(`/dashboard/partner/verify/${report.id}`)}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold py-2 px-4 shadow-lg shadow-blue-200 hover:shadow-xl transition-all"
                                    >
                                        View Report
                                    </button>
                                    {report.status === 'submitted' && (
                                        <button
                                            onClick={() => router.push(`/dashboard/partner/verify/${report.id}#actions`)}
                                            className="rounded-2xl font-bold border-2 border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50 py-2 px-4 transition-all"
                                        >
                                            Quick Verify
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
