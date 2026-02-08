"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, FileText, UserPlus, ArrowRight, Building2, TrendingUp, Users, Search } from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { authenticatedFetch } from "@/utils/api";

export default function AdminApprovalsPage() {
    const [activeTab, setActiveTab] = useState("registrations");

    const [isLoading, setIsLoading] = useState(true);
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Modal States
    const [selectedOpportunity, setSelectedOpportunity] = useState<any | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectType, setRejectType] = useState<'opportunity' | 'user'>('opportunity');
    const [rejectReason, setRejectReason] = useState("");
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    useEffect(() => {
        if (activeTab === 'projects') {
            fetchPendingOpportunities();
        } else if (activeTab === 'registrations') {
            fetchPendingUsers();
        }
    }, [activeTab]);

    const fetchPendingOpportunities = async () => {
        setIsLoading(true);
        try {
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/opportunities/pending`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setOpportunities(data.data || []);
                }
            }
        } catch (error) {
            console.error("Failed to fetch opportunities", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPendingUsers = async () => {
        setIsLoading(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/users/pending`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setPendingUsers(data.data || []);
                }
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: string, type: 'opportunity' | 'user' = 'opportunity') => {
        const endpoint = type === 'opportunity'
            ? `${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/opportunities/${id}/approve`
            : `/api/v1/admin/users/${id}/approve`;

        try {
            const res = await authenticatedFetch(endpoint, {
                method: 'POST'
            });
            if (res && res.ok) {
                if (type === 'opportunity') {
                    setOpportunities(prev => prev.filter(c => c.id !== id));
                } else {
                    setPendingUsers(prev => prev.filter(c => c.id !== id));
                }
            }
        } catch (error) {
            console.error("Failed to approve", error);
        }
    };

    const handleRejectClick = (id: string, type: 'opportunity' | 'user' = 'opportunity') => {
        setRejectId(id);
        setRejectType(type);
        setRejectReason("");
        setIsRejectModalOpen(true);
    };

    const confirmReject = async () => {
        if (!rejectId) return;

        try {
            const endpoint = rejectType === 'opportunity'
                ? `${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/opportunities/${rejectId}/reject`
                : `/api/v1/admin/users/${rejectId}/reject`;

            const res = await authenticatedFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify({ reason: rejectReason })
            });

            if (res && res.ok) {
                if (rejectType === 'opportunity') {
                    setOpportunities(prev => prev.filter(c => c.id !== rejectId));
                } else {
                    setPendingUsers(prev => prev.filter(c => c.id !== rejectId));
                }
                setIsRejectModalOpen(false);
                setRejectId(null);
            }
        } catch (error) {
            console.error("Failed to reject", error);
        }
    };

    // Filter & Pagination Logic
    const getFilteredItems = () => {
        const items = activeTab === 'projects' ? opportunities : pendingUsers;
        if (!searchQuery) return items;

        const lowerQuery = searchQuery.toLowerCase();
        return items.filter(item => {
            if (activeTab === 'projects') {
                return (
                    item.title?.toLowerCase().includes(lowerQuery) ||
                    item.partner_name?.toLowerCase().includes(lowerQuery)
                );
            } else {
                return (
                    item.name?.toLowerCase().includes(lowerQuery) ||
                    item.email?.toLowerCase().includes(lowerQuery)
                );
            }
        });
    };

    const filteredItems = getFilteredItems();
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page when tab or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery]);

    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Pending Approvals</h1>
                    <p className="text-slate-500">Review and approve registration requests and project proposals.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={activeTab === 'projects' ? "Search projects..." : "Search users..."}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-200 mb-8">
                <button
                    onClick={() => setActiveTab("registrations")}
                    className={`pb-4 px-2 text-sm font-bold transition-colors relative ${activeTab === "registrations" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                >
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> User Registrations
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
                    </div>
                    {activeTab === "registrations" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab("projects")}
                    className={`pb-4 px-2 text-sm font-bold transition-colors relative ${activeTab === "projects" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                >
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Opportunity Requests
                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{opportunities.length}</span>
                    </div>
                    {activeTab === "projects" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {activeTab === "registrations" ? (
                    paginatedItems.map((req) => (
                        <div key={req.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{req.name}</h3>
                                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">{req.organization_type || "User"}</span>
                                    <span>{req.email}</span>
                                    <span>• Applied: {req.created_at ? new Date(req.created_at).toLocaleDateString() : "N/A"}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleRejectClick(req.id, 'user')}
                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors">
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                                <button
                                    onClick={() => handleApprove(req.id, 'user')}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-lg shadow-blue-200">
                                    <CheckCircle className="w-4 h-4" /> Approve for Onboarding
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    paginatedItems.map((proj) => (
                        <div key={proj.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{proj.title}</h3>
                                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                    <span className="font-bold text-blue-600">{proj.partner_name || "Unknown Partner"}</span>
                                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{proj.types?.[0] || "General"}</span>
                                    <span>• Submitted: {proj.submitted_at ? new Date(proj.submitted_at).toLocaleDateString() : "N/A"}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedOpportunity(proj);
                                        setIsDetailModalOpen(true);
                                    }}
                                    className="text-slate-400 hover:text-blue-600 text-sm font-bold flex items-center gap-1 mr-4"
                                >
                                    View Details <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleRejectClick(proj.id, 'opportunity')}
                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
                                >
                                    <XCircle className="w-4 h-4" /> Return
                                </button>
                                <button
                                    onClick={() => handleApprove(proj.id, 'opportunity')}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2 transition-colors shadow-lg shadow-green-200"
                                >
                                    <CheckCircle className="w-4 h-4" /> Approve Project
                                </button>
                            </div>
                        </div>
                    ))
                )}

                {filteredItems.length === 0 && !isLoading && (
                    <div className="text-center py-10 text-slate-500">
                        {searchQuery ? "No results found matching your search." : "No pending items found."}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {!isLoading && filteredItems.length > 0 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredItems.length}
                    itemsPerPage={itemsPerPage}
                />
            )}
            {/* View Details Modal */}
            {
                isDetailModalOpen && selectedOpportunity && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{selectedOpportunity.title}</h2>
                                    <p className="text-slate-500">{selectedOpportunity.partner_name}</p>
                                </div>
                                <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-8 pr-2">
                                {/* Section 1: Overview & Logistics */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Overview & Logistics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Mode</span>
                                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded text-sm">{selectedOpportunity.mode || "N/A"}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Location</span>
                                            <span className="font-bold text-slate-900 text-sm">
                                                {selectedOpportunity.location ? `${selectedOpportunity.location.venue || ''}, ${selectedOpportunity.location.city || ''}` : "Remote"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Timeline Type</span>
                                            <span className="font-bold text-slate-900 text-sm">{selectedOpportunity.timeline?.type || "N/A"}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Visibility</span>
                                            <span className="font-bold text-slate-900 text-sm capitalize">{selectedOpportunity.visibility || "Public"}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Start Date</span>
                                            <span className="font-bold text-slate-900 text-sm">
                                                {selectedOpportunity.timeline?.start_date ? new Date(selectedOpportunity.timeline.start_date).toLocaleDateString() : "TBD"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">End Date</span>
                                            <span className="font-bold text-slate-900 text-sm">
                                                {selectedOpportunity.timeline?.end_date ? new Date(selectedOpportunity.timeline.end_date).toLocaleDateString() : "TBD"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Expected Hours</span>
                                            <span className="font-bold text-slate-900 text-sm">{selectedOpportunity.timeline?.expected_hours || 0} hrs/student</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Volunteers Needed</span>
                                            <span className="font-bold text-slate-900 text-sm">{selectedOpportunity.timeline?.volunteers_required || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Objectives & Impact */}
                                <div>
                                    <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-4 border-b border-teal-100 pb-2 flex items-center gap-2">
                                        <Building2 className="w-4 h-4" /> Objectives & Impact
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Project Objective</span>
                                            <p className="text-sm text-slate-700 bg-teal-50/50 p-3 rounded-lg border border-teal-100 whitespace-pre-wrap">
                                                {selectedOpportunity.objectives?.description || selectedOpportunity.description || "No objective provided."}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <span className="text-xs text-slate-500 block mb-1">Beneficiaries Count</span>
                                                <span className="font-bold text-slate-900 text-sm">{selectedOpportunity.objectives?.beneficiaries_count || 0}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-500 block mb-1">Beneficiary Types</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {selectedOpportunity.objectives?.beneficiaries_type?.map((t: string, i: number) => (
                                                        <span key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{t}</span>
                                                    )) || "N/A"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: SDG Alignment */}
                                <div>
                                    <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-4 border-b border-purple-100 pb-2 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> SDG Alignment
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                            <span className="text-xs text-purple-600 block mb-1 font-bold">Primary SDG</span>
                                            <span className="font-bold text-slate-900 text-sm block">SDG {selectedOpportunity.sdg_info?.sdg_id || "N/A"}</span>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                            <span className="text-xs text-purple-600 block mb-1 font-bold">Target</span>
                                            <span className="font-bold text-slate-900 text-sm block">{selectedOpportunity.sdg_info?.target_id || "N/A"}</span>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                            <span className="text-xs text-purple-600 block mb-1 font-bold">Indicator</span>
                                            <span className="font-bold text-slate-900 text-sm block">{selectedOpportunity.sdg_info?.indicator_id || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: Activities & Skills */}
                                <div>
                                    <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Activities & Skills
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Student Responsibilities</span>
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap pl-4 border-l-2 border-indigo-200">
                                                {selectedOpportunity.activity_details?.student_responsibilities || "No details provided."}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-2">Skills Gained</span>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedOpportunity.activity_details?.skills_gained?.map((skill: string, idx: number) => (
                                                    <span key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-100">
                                                        {skill}
                                                    </span>
                                                )) || "None specified"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 5: Supervision & Verification */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-4 border-b border-orange-100 pb-2 flex items-center gap-2">
                                            <Users className="w-4 h-4" /> Supervision
                                        </h3>
                                        <div className="space-y-3 bg-orange-50/50 p-4 rounded-xl">
                                            <div>
                                                <span className="text-xs text-slate-500 block">Supervisor</span>
                                                <span className="font-bold text-slate-900 text-sm">{selectedOpportunity.supervision?.supervisor_name || "N/A"}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-500 block">Role</span>
                                                <span className="text-slate-900 text-sm">{selectedOpportunity.supervision?.role || "N/A"}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-500 block">Contact</span>
                                                <span className="text-slate-900 text-sm">{selectedOpportunity.supervision?.contact || "N/A"}</span>
                                            </div>
                                            <div className="flex gap-4 mt-2">
                                                {selectedOpportunity.supervision?.safe_environment && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1 font-bold"><CheckCircle className="w-3 h-3" /> Safe Env</span>
                                                )}
                                                {selectedOpportunity.supervision?.supervised && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1 font-bold"><CheckCircle className="w-3 h-3" /> Supervised</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-4 border-b border-cyan-100 pb-2 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" /> Verification
                                        </h3>
                                        <div className="bg-cyan-50/50 p-4 rounded-xl">
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                                                {selectedOpportunity.verification_method?.map((method: string, i: number) => (
                                                    <li key={i}>{method}</li>
                                                )) || <li>No verification method specified</li>}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleRejectClick(selectedOpportunity.id, 'opportunity');
                                    }}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => {
                                        handleApprove(selectedOpportunity.id, 'opportunity');
                                        setIsDetailModalOpen(false);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                                >
                                    Approve
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Reject Reason Modal */}
            {
                isRejectModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Return Opportunity</h2>
                                <button onClick={() => setIsRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Reason for Return</label>
                                <textarea
                                    className="w-full h-32 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Please explain why this opportunity is being returned..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsRejectModalOpen(false)}
                                    className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmReject}
                                    disabled={!rejectReason.trim()}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirm Return
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
