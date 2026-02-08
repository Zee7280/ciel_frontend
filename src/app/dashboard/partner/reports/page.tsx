"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Search, Filter, Edit, Trash2, Eye, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

import Link from "next/link";
import ReportForm from "@/components/partners/ReportForm";

interface Report {
    id: number;
    title: string;
    description: string;
    status: "draft" | "submitted" | "approved" | "rejected";
    submittedDate: string;
    beneficiaries: number;
    hoursLogged: number;
    sdgs: number[];
    evidence?: string[];
}

export default function PartnerReportsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [reports, setReports] = useState<Report[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingReport, setEditingReport] = useState<Report | null>(null);

    useEffect(() => {
        fetchReports();
    }, [statusFilter]);

    const fetchReports = async () => {
        try {
            const url = statusFilter === "All"
                ? `/api/v1/partners/reports`
                : `/api/v1/partners/reports?status=${statusFilter.toLowerCase()}`;

            const res = await authenticatedFetch(url);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setReports(data.data || []);
                }
            }
        } catch (error) {
            console.error("Failed to fetch reports", error);
            toast.error("Failed to load reports");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this report?")) return;

        try {
            const res = await authenticatedFetch(`/api/v1/partners/reports/${id}`, {
                method: 'DELETE'
            });
            if (res && res.ok) {
                setReports(prev => prev.filter(r => r.id !== id));
                toast.success("Report deleted successfully");
            }
        } catch (error) {
            toast.error("Failed to delete report");
        }
    };

    const filteredReports = reports.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case "draft": return "bg-slate-100 text-slate-700";
            case "submitted": return "bg-blue-100 text-blue-700";
            case "approved": return "bg-green-100 text-green-700";
            case "rejected": return "bg-red-100 text-red-700";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "draft": return <Edit className="w-4 h-4" />;
            case "submitted": return <Clock className="w-4 h-4" />;
            case "approved": return <CheckCircle className="w-4 h-4" />;
            case "rejected": return <XCircle className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Impact Reports</h1>
                    <p className="text-slate-500">Create, manage, and track your impact reports</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
                >
                    <Plus className="w-5 h-5" />
                    Create New Report
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search reports..."
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                        className="pl-10 pr-8 py-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white appearance-none cursor-pointer font-medium"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Draft">Draft</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full flex justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-slate-100">
                        <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 mb-2">No Reports Found</h3>
                        <p className="text-slate-500 mb-6">Start by creating your first impact report</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
                        >
                            <Plus className="w-5 h-5" />
                            Create Report
                        </button>
                    </div>
                ) : (
                    filteredReports.map((report) => (
                        <div
                            key={report.id}
                            className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                        >
                            {/* Status Badge */}
                            <div className="flex justify-between items-start mb-4">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase ${getStatusColor(report.status)}`}>
                                    {getStatusIcon(report.status)}
                                    {report.status}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="View Report"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    {report.status === "draft" && (
                                        <>
                                            <button
                                                onClick={() => setEditingReport(report)}
                                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Edit Report"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(report.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Report"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Report Info */}
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{report.title}</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Submitted: {new Date(report.submittedDate).toLocaleDateString()}
                            </p>

                            {/* Metrics */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-blue-50 rounded-lg p-3">
                                    <p className="text-xs text-blue-600 font-semibold mb-1">Beneficiaries</p>
                                    <p className="text-2xl font-bold text-blue-700">{report.beneficiaries.toLocaleString()}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3">
                                    <p className="text-xs text-green-600 font-semibold mb-1">Hours Logged</p>
                                    <p className="text-2xl font-bold text-green-700">{report.hoursLogged}</p>
                                </div>
                            </div>

                            {/* SDGs */}
                            <div className="flex flex-wrap gap-2">
                                {report.sdgs.map((sdg) => (
                                    <span
                                        key={sdg}
                                        className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold"
                                    >
                                        SDG {sdg}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            {(showCreateModal || editingReport) && (
                <ReportForm
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingReport(null);
                    }}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setEditingReport(null);
                        fetchReports();
                    }}
                    initialData={editingReport}
                />
            )}
        </div>
    );
}
