"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Search, Filter, Edit, Trash2, Eye, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

import Link from "next/link";
import ReportForm from "@/components/partners/ReportForm";

/** List row: NGO impact form (ReportForm) and/or student impact reports returned by the same endpoint. */
interface Report {
    id: number | string;
    title?: string | null;
    description?: string | null;
    status: string;
    submittedDate?: string;
    submission_date?: string;
    submitted_at?: string;
    created_at?: string;
    project_title?: string | null;
    student_name?: string | null;
    student_email?: string | null;
    partner_status?: string | null;
    beneficiaries?: number;
    hoursLogged?: number;
    sdgs?: number[];
    evidence?: string[];
}

function looksLikeWorkflowStatus(status: unknown): boolean {
    const s = String(status ?? "").trim();
    if (!s) return false;
    if (s.includes("_")) return true;
    return s === s.toUpperCase() && s.length > 2;
}

function isStudentImpactReportRow(r: Report): boolean {
    if (r.submission_date || r.project_title || r.student_name || r.student_email) return true;
    if (looksLikeWorkflowStatus(r.status)) return true;
    return false;
}

function isLegacyPartnerFormReport(r: Report): boolean {
    if (r.submission_date || r.project_title || r.student_name || r.student_email) return false;
    if (looksLikeWorkflowStatus(r.status)) return false;
    const s = String(r.status ?? "").trim().toLowerCase();
    return ["draft", "submitted", "approved", "rejected"].includes(s);
}

function formatSubmittedLabel(r: Report): string {
    const raw =
        r.submittedDate ??
        r.submission_date ??
        r.submitted_at ??
        r.created_at ??
        null;
    if (raw == null || raw === "") return "Date not available";
    const d = new Date(String(raw));
    return Number.isNaN(d.getTime()) ? "Date not available" : d.toLocaleDateString();
}

function cardTitle(r: Report): string {
    const t = r.title?.trim();
    if (t) return t;
    const p = r.project_title?.trim();
    if (p) return p;
    const s = r.student_name?.trim();
    if (s) return s;
    return "Untitled report";
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
            const baseUrl = '/api/v1';
            const url = statusFilter === "All"
                ? `${baseUrl}/partner/reports`
                : `${baseUrl}/partner/reports?status=${statusFilter.toLowerCase()}`;

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

    const handleDelete = async (id: number | string) => {
        if (!confirm("Are you sure you want to delete this report?")) return;

        try {
            // NGO-only impact form CRUD lives under `/partners/reports` (unchanged on backend).
            const res = await authenticatedFetch(`/api/v1/partners/reports/${id}`, {
                method: 'DELETE'
            });
            if (res && res.ok) {
                setReports(prev => prev.filter((r) => String(r.id) !== String(id)));
                toast.success("Report deleted successfully");
            }
        } catch (error) {
            toast.error("Failed to delete report");
        }
    };

    const q = searchQuery.trim().toLowerCase();
    const filteredReports = reports.filter((r) => {
        const hay = [r.title, r.project_title, r.student_name, r.student_email]
            .map((x) => (x ?? "").toLowerCase())
            .join(" ");
        return q === "" || hay.includes(q);
    });

    const getStatusColor = (status: string) => {
        const s = String(status ?? "").trim().toLowerCase();
        switch (s) {
            case "draft": return "bg-slate-100 text-slate-700";
            case "submitted": return "bg-blue-100 text-blue-700";
            case "approved":
            case "verified":
            case "partner_verified": return "bg-green-100 text-green-700";
            case "rejected": return "bg-red-100 text-red-700";
            default:
                if (s.includes("review") || s.includes("pending")) return "bg-amber-100 text-amber-800";
                return "bg-slate-100 text-slate-700";
        }
    };

    const getStatusIcon = (status: string) => {
        const s = String(status ?? "").trim().toLowerCase();
        switch (s) {
            case "draft": return <Edit className="w-4 h-4" />;
            case "submitted": return <Clock className="w-4 h-4" />;
            case "approved":
            case "verified":
            case "partner_verified": return <CheckCircle className="w-4 h-4" />;
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
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase w-fit max-w-full ${getStatusColor(report.status)}`}>
                                        {getStatusIcon(report.status)}
                                        <span className="truncate">{String(report.status ?? "").replace(/_/g, " ")}</span>
                                    </span>
                                    {report.partner_status != null && String(report.partner_status).trim() !== "" && (
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                            NGO / partner: {String(report.partner_status).replace(/_/g, " ")}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    {isStudentImpactReportRow(report) ? (
                                        <Link
                                            href={`/dashboard/partner/verify/${encodeURIComponent(String(report.id))}`}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Open report dossier (review / verify)"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                    ) : (
                                        <button
                                            type="button"
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title={
                                                String(report.status).toLowerCase() === "draft"
                                                    ? "Open organization impact report"
                                                    : "Use Edit when available for organization impact reports"
                                            }
                                            onClick={() => {
                                                if (String(report.status).toLowerCase() === "draft") {
                                                    setEditingReport(report);
                                                } else {
                                                    toast.message("Organization impact reports use Edit when the report is in draft.");
                                                }
                                            }}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    )}
                                    {isLegacyPartnerFormReport(report) && String(report.status).toLowerCase() === "draft" && (
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
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{cardTitle(report)}</h3>
                            {isStudentImpactReportRow(report) && (report.student_name || report.project_title) && (
                                <p className="text-xs text-slate-500 mb-1">
                                    {[report.student_name, report.project_title].filter(Boolean).join(" · ")}
                                </p>
                            )}
                            <p className="text-sm text-slate-500 mb-4">
                                Submitted: {formatSubmittedLabel(report)}
                            </p>
                            {isStudentImpactReportRow(report) && (
                                <Link
                                    href={`/dashboard/partner/verify/${encodeURIComponent(String(report.id))}`}
                                    className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3"
                                >
                                    Review & verify (dossier)
                                </Link>
                            )}

                            {/* Metrics */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-blue-50 rounded-lg p-3">
                                    <p className="text-xs text-blue-600 font-semibold mb-1">Beneficiaries</p>
                                    <p className="text-2xl font-bold text-blue-700">{(report.beneficiaries ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3">
                                    <p className="text-xs text-green-600 font-semibold mb-1">Hours Logged</p>
                                    <p className="text-2xl font-bold text-green-700">{report.hoursLogged ?? 0}</p>
                                </div>
                            </div>

                            {/* SDGs */}
                            <div className="flex flex-wrap gap-2">
                                {(report.sdgs ?? []).map((sdg) => (
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
