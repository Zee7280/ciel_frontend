"use client"

import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/utils/api';
import { CheckCircle2, XCircle, Clock, FileText, Search, Building2, Eye, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import clsx from 'clsx';

function formatDisplayName(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .map((part) =>
            part.length ? part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase() : part
        )
        .join(' ');
}

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

type ReportStatusFilter = 'all' | 'submitted' | 'pending' | 'verified' | 'rejected';

function normalizeStatus(value: string | null | undefined): string {
    if (!value) return '';
    return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function reportMatchesTab(report: Report, tab: ReportStatusFilter): boolean {
    if (tab === 'all') return true;
    const statuses = [
        normalizeStatus(report.status),
        normalizeStatus(report.admin_status),
        normalizeStatus(report.partner_status),
    ].filter(Boolean);

    if (tab === 'pending') {
        return statuses.some((status) =>
            status.includes('pending') ||
            status.includes('submitted') ||
            status.includes('under_review') ||
            status.includes('awaiting'),
        );
    }
    if (tab === 'submitted') {
        return statuses.some((status) => status === 'submitted' || status.includes('under_review'));
    }
    if (tab === 'verified') {
        return statuses.some((status) =>
            status === 'verified' || status === 'approved' || status === 'partner_verified',
        );
    }
    if (tab === 'rejected') {
        return statuses.some((status) => status === 'rejected');
    }
    return true;
}

export default function AdminReportsVerificationPage() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ReportStatusFilter>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrg, setSelectedOrg] = useState<string>('all');
    const [organizations, setOrganizations] = useState<any[]>([]);

    useEffect(() => {
        fetchOrganizations();
    }, []);

    useEffect(() => {
        // Keep UX deterministic: default view opens on pending queue.
        setActiveTab('pending');
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
            submitted: { color: 'bg-yellow-50 text-yellow-700', icon: Clock, label: 'Submitted' },
            partner_verified: { color: 'bg-indigo-50 text-indigo-700', icon: CheckCircle2, label: 'NGO Verified' },
            verified: { color: 'bg-green-50 text-green-700', icon: CheckCircle2, label: 'Verified' },
            rejected: { color: 'bg-red-50 text-red-700', icon: XCircle, label: 'Rejected' },
            draft: { color: 'bg-slate-100 text-slate-600', icon: FileText, label: 'Draft' },
            pending: { color: 'bg-amber-50 text-amber-700', icon: Clock, label: 'Pending' },
            approved: { color: 'bg-green-50 text-green-600', icon: CheckCircle2, label: 'Approved' },
        };

        const { color, icon: Icon, label } = config[status as keyof typeof config] || config.draft;

        return (
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', color)}>
                <Icon className="h-3.5 w-3.5" />
                {label}
            </span>
        );
    };

    const filteredReports = reports.filter((report) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            report.student_name.toLowerCase().includes(q) ||
            report.student_email.toLowerCase().includes(q) ||
            report.project_title.toLowerCase().includes(q) ||
            (report.organization_name && report.organization_name.toLowerCase().includes(q));
        return matchesSearch && reportMatchesTab(report, activeTab);
    });

    const statusOptions = [
        { id: 'pending', label: 'Pending' },
        { id: 'submitted', label: 'Submitted' },
        { id: 'all', label: 'All Reports' },
        { id: 'verified', label: 'Verified' },
        { id: 'rejected', label: 'Rejected' },
    ] as const;

    const resetFilters = () => {
        setSearchQuery('');
        setSelectedOrg('all');
        setActiveTab('pending');
    };

    return (
        <div className="min-h-screen bg-[#f7f9fc] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            Student Reports Verification
                        </h1>
                        <p className="mt-2 text-sm text-slate-500 sm:text-base">
                            Review and verify student activity reports
                        </p>
                    </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, project..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                            />
                        </div>
                        <div className="relative w-full xl:w-48 shrink-0">
                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value as ReportStatusFilter)}
                                className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                        <div className="relative w-full xl:w-52 shrink-0">
                            <Building2 className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <select
                                value={selectedOrg}
                                onChange={(e) => setSelectedOrg(e.target.value)}
                                className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-12 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                            >
                                <option value="all">All Organizations</option>
                                {organizations.map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                        <div className="w-full xl:w-auto">
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="h-14 w-full rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 xl:w-auto"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="rounded-[28px] border border-slate-200 bg-white p-16 text-center shadow-sm">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Reports Found</h3>
                        <p className="text-slate-500 font-medium">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-[980px] w-full">
                            <thead className="border-b border-slate-200 bg-slate-100/80">
                                <tr className="text-left">
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Project</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Organization</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Submitted</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">NGO Status</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Overall</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredReports.map((report) => (
                                    <tr key={report.id} className="align-top transition-colors hover:bg-slate-50/60">
                                        <td className="px-6 py-5">
                                            <div className="font-semibold text-slate-900">{formatDisplayName(report.student_name)}</div>
                                            <div className="mt-1 text-sm text-slate-500 break-all">{report.student_email}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="max-w-[240px] break-words text-base font-medium text-slate-700">
                                                {report.project_title}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex max-w-[180px] break-words rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                                                {report.organization_name || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className="text-sm text-slate-700">
                                                {new Date(report.submission_date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-1">{getStatusBadge(report.partner_status)}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-1">{getStatusBadge(report.status)}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center">
                                                <button
                                                    onClick={() => router.push(`/dashboard/admin/reports/verify/${report.id}`)}
                                                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Review
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
