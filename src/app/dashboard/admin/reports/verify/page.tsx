"use client"

import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/utils/api';
import { CheckCircle2, XCircle, Clock, FileText, Search, Building2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import clsx from 'clsx';

interface Report {
    id: string;
    student_name: string;
    student_email: string;
    project_title: string;
    organization_name?: string;
    submission_date: string;
    status: string;
    partner_status: string;
    admin_status: string;
    created_at: string;
}

export default function AdminReportsVerificationPage() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'submitted' | 'verified' | 'rejected'>('submitted');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrg, setSelectedOrg] = useState<string>('all');
    const [organizations, setOrganizations] = useState<any[]>([]);

    useEffect(() => {
        fetchOrganizations();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [activeTab, selectedOrg]);

    const fetchOrganizations = async () => {
        try {
            const response = await authenticatedFetch(`/api/v1/admin/organizations`
            );
            if (response?.ok) {
                const data = await response.json();
                setOrganizations(data.organizations || []);
            }
        } catch (error) {
            console.error('Error fetching organizations:', error);
        }
    };

    const fetchReports = async () => {
        console.log('📞 ADMIN: Fetching all student reports');
        try {
            setLoading(true);

            // Admin gets ALL reports via the segregated admin endpoint
            let apiUrl = `/api/v1/admin/reports?`;

            // Add organization filter if selected
            if (selectedOrg && selectedOrg !== 'all') {
                apiUrl += `organizationId=${selectedOrg}&`;
            }

            // Add status filter
            if (activeTab !== 'all') {
                apiUrl += `status=${activeTab}`;
            }

            console.log('🌐 ADMIN API URL:', apiUrl);

            const response = await authenticatedFetch(apiUrl);
            console.log('📡 Response:', response?.ok);

            if (response?.ok) {
                const data = await response.json();
                console.log('📊 Reports data:', data);

                if (data.success && data.data) {
                    setReports(data.data);
                } else {
                    setReports([]);
                }
            } else {
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
            submitted: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock, label: 'Submitted' },
            partner_verified: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: CheckCircle2, label: 'NGO Verified' },
            verified: { color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2, label: 'Fully Verified' },
            rejected: { color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Rejected' },
            draft: { color: 'bg-slate-50 text-slate-700 border-slate-200', icon: FileText, label: 'Draft' },
            pending: { color: 'bg-slate-50 text-slate-500 border-slate-200', icon: Clock, label: 'Pending' },
            approved: { color: 'bg-green-50 text-green-600 border-green-200', icon: CheckCircle2, label: 'Approved' },
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
        report.project_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.organization_name && report.organization_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const tabs = [
        { id: 'submitted', label: 'Submitted', count: reports.filter(r => r.status === 'submitted').length },
        { id: 'all', label: 'All Reports', count: reports.length },
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
                            Student Reports Verification
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">
                            Review and verify student activity reports across all organizations
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

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by student, project, or organization..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-medium text-slate-700"
                            />
                        </div>
                    </div>

                    {/* Organization Filter */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                        <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <select
                                value={selectedOrg}
                                onChange={(e) => setSelectedOrg(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-medium text-slate-700 bg-white"
                            >
                                <option value="all">All Organizations</option>
                                {organizations.map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name}
                                    </option>
                                ))}
                            </select>
                        </div>
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
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Reports Found</h3>
                        <p className="text-slate-500 font-medium">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-left">
                                    <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-wider">Student</th>
                                    <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-wider">Project</th>
                                    <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-wider">Organization</th>
                                    <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-wider">Submitted</th>
                                    <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-wider">NGO Status</th>
                                    <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-wider">Overall Status</th>
                                    <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-6">
                                            <div className="font-bold text-slate-900">{report.student_name}</div>
                                            <div className="text-xs text-slate-500">{report.student_email}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-medium text-slate-700 line-clamp-2 max-w-xs">
                                                {report.project_title}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-sm font-medium text-slate-600">
                                                {report.organization_name || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-sm text-slate-600">
                                                {new Date(report.submission_date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            {getStatusBadge(report.partner_status)}
                                        </td>
                                        <td className="p-6">
                                            {getStatusBadge(report.status)}
                                        </td>
                                        <td className="p-6 text-right">
                                            <button
                                                onClick={() => router.push(`/dashboard/admin/reports/verify/${report.id}`)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
