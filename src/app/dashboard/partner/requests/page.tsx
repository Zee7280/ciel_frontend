"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Users, Calendar, MoreVertical, MapPin, Loader2, Edit, Trash2, ExternalLink } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

export default function PartnerRequestsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [activeMenu, setActiveMenu] = useState<{ id: string | number; top: number; right: number } | null>(null);

    const fetchOpportunities = async () => {
        try {
            const res = await authenticatedFetch(`/api/v1/opportunities`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setRequests(data.data || []);
                }
            }
        } catch (error) {
            console.error("Failed to fetch opportunities", error);
            toast.error("Failed to load opportunities");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOpportunities();
    }, []);

    // Close menu on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (activeMenu) setActiveMenu(null);
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [activeMenu]);

    const handleDelete = async (id: string | number) => {
        if (!confirm("Are you sure you want to delete this opportunity? This action cannot be undone.")) return;

        // Optimistic UI update
        const originalRequests = [...requests];
        setRequests(requests.filter(req => req.id !== id));
        setActiveMenu(null); // Close menu

        try {
            const res = await authenticatedFetch(`/api/v1/opportunities/${id}`, {
                method: 'DELETE'
            });

            if (res && res.ok) {
                toast.success("Opportunity deleted successfully");
            } else {
                // Revert on failure
                setRequests(originalRequests);
                toast.error("Failed to delete opportunity");
            }
        } catch (error) {
            console.error("Delete failed", error);
            setRequests(originalRequests);
            toast.error("Failed to delete opportunity");
        }
    };

    const activeRequest = activeMenu ? requests.find(r => r.id === activeMenu.id) : null;

    return (
        <div className="w-full pb-32 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Opportunities</h1>
                </div>
                <Link href="/dashboard/partner/requests/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
                    <Plus className="w-4 h-4" /> Post New
                </Link>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-6 h-6 text-slate-300" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">No Opportunities</h3>
                    <p className="text-xs text-slate-500 mb-4">Post your first opportunity to get started.</p>
                    <Link href="/dashboard/partner/requests/new" className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline">
                        Create Now
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="px-6 py-4">Project Name</th>
                                    <th className="px-6 py-4 text-center">Needed</th>
                                    <th className="px-6 py-4 text-center">Applied</th>
                                    <th className="px-6 py-4 w-48">Progress</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => router.push(`/dashboard/partner/requests/${req.id}`)}>
                                                        {req.title}
                                                    </h3>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border
                                                        ${req.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' :
                                                            req.status === 'pending_approval' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                                                    'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                                        {req.status?.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {req.location?.city || "N/A"}</span>
                                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Ends: {req.dates?.end || "N/A"}</span>
                                                    <span className="font-mono text-slate-300">#{req.id?.toString().slice(0, 8)}...</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="font-bold text-slate-900">{req.capacity?.volunteers || 0}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={`font-bold ${req.applicants_count > 0 ? "text-blue-600" : "text-slate-400"}`}>
                                                {req.applicants_count || 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-full">
                                                <div className="flex justify-between text-[10px] mb-1">
                                                    <span className="text-slate-400 font-bold">Completion</span>
                                                    <span className="text-slate-600 font-bold">{req.capacity?.volunteers > 0 ? Math.round(((req.applicants_count || 0) / req.capacity.volunteers) * 100) : 0}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${req.capacity?.volunteers > 0 ? ((req.applicants_count || 0) / req.capacity.volunteers) * 100 : 0}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/dashboard/partner/requests/${req.id}/applicants`}
                                                    className="h-8 px-3 flex items-center gap-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 whitespace-nowrap transition-all shadow-sm"
                                                >
                                                    <Users className="w-3 h-3" /> Applicants
                                                </Link>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setActiveMenu(activeMenu?.id === req.id ? null : {
                                                            id: req.id,
                                                            top: rect.bottom + 6,
                                                            right: window.innerWidth - rect.right
                                                        });
                                                    }}
                                                    className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors border border-transparent ${activeMenu?.id === req.id ? 'bg-slate-100 text-slate-900 border-slate-200' : 'text-slate-400 hover:bg-white hover:border-slate-200 hover:text-slate-600'}`}
                                                >
                                                    <MoreVertical className="w-4 h-4" />
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

            {/* Fixed Action Menu */}
            {activeMenu && activeRequest && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setActiveMenu(null)}
                    ></div>
                    <div
                        className="fixed w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100"
                        style={{ top: activeMenu.top, right: activeMenu.right }}
                    >
                        <button
                            onClick={() => router.push(`/dashboard/partner/requests/${activeRequest.id}`)}
                            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-medium transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> View Details
                        </button>
                        <button
                            onClick={() => router.push(`/dashboard/partner/requests/${activeRequest.id}?edit=true`)}
                            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-medium transition-colors"
                        >
                            <Edit className="w-3.5 h-3.5 text-slate-400" /> Edit Opportunity
                        </button>
                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                        <button
                            onClick={() => handleDelete(activeRequest.id)}
                            className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Opportunity
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
