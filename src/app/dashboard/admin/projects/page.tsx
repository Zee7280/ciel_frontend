"use client";

import { useState, useEffect } from "react";
import { Search, Filter, MoreVertical, Briefcase, Calendar, MapPin, Users, Loader2 } from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { authenticatedFetch } from "@/utils/api";

export default function AdminProjectsPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        const fetchProjects = async () => {
            setIsLoading(true);
            try {
                const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/projects`);
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success || Array.isArray(data.data)) {
                        setProjects(data.data || data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch projects", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const handleExport = () => {
        if (!projects.length) return;

        const headers = ["ID", "Title", "Organization", "Status", "Volunteers", "Total Hours", "Location"];
        const csvContent = [
            headers.join(","),
            ...projects.map(p => [
                p.id,
                `"${p.title?.replace(/"/g, '""')}"`,
                `"${(p.org || p.partner_name || "").replace(/"/g, '""')}"`,
                p.status,
                p.volunteers || p.volunteers_count || 0,
                p.hours || p.total_hours || 0,
                `"${(p.location || "").replace(/"/g, '""')}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `projects_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
            case 'completed': return 'bg-blue-50 text-blue-700 border border-blue-200';
            case 'pending_approval': return 'bg-amber-50 text-amber-700 border border-amber-200';
            default: return 'bg-slate-50 text-slate-600 border border-slate-200';
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await authenticatedFetch(`/api/v1/admin/opportunities/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            if (res && res.ok) {
                // Optimistic update
                setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
                setActiveMenuId(null);
            }
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if ((event.target as HTMLElement).closest('.menu-trigger')) return;
            setActiveMenuId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const filteredProjects = projects.filter(project => {
        const searchLower = searchQuery.toLowerCase();
        return (
            project.title?.toLowerCase().includes(searchLower) ||
            (project.org || project.partner_name)?.toLowerCase().includes(searchLower) ||
            project.location?.toLowerCase().includes(searchLower)
        );
    });

    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    const paginatedProjects = filteredProjects.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Projects Overview</h1>
                    <p className="text-slate-500 mt-1 text-base">Monitor all active and past social impact projects.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
                >
                    <Briefcase className="w-4 h-4" /> Export Report
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none font-medium text-slate-700 text-sm"
                    />
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-bold text-xs transition-all uppercase tracking-wide">
                        <Filter className="w-3.5 h-3.5" /> Status
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-bold text-xs transition-all uppercase tracking-wide">
                        <MapPin className="w-3.5 h-3.5" /> Location
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-32">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="text-center py-32 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">No projects found</h3>
                    <p className="text-slate-500">Try adjusting your filters or search query.</p>
                </div>
            ) : (
                <>
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">Project</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4 text-center">Volunteers</th>
                                    <th className="px-6 py-4 text-center">Hours</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedProjects.map((project) => (
                                    <tr key={project.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                    {project.title}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                                                    <Briefcase className="w-3 h-3" />
                                                    {project.org || project.partner_name || "Unknown Organization"}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(project.status || 'pending_approval')}`}>
                                                {project.status?.replace('_', ' ') || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                {project.location || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm font-bold text-slate-900">{project.volunteers || project.volunteers_count || 0}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm font-bold text-slate-900">{project.hours || project.total_hours || 0}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === project.id ? null : project.id);
                                                }}
                                                className="menu-trigger text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {activeMenuId === project.id && (
                                                <div
                                                    className="absolute right-8 top-8 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="p-1">
                                                        {project.status === 'active' && (
                                                            <button
                                                                onClick={() => handleStatusUpdate(project.id, 'pending_approval')}
                                                                className="w-full text-left px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg flex items-center gap-2"
                                                            >
                                                                Revert to Pending
                                                            </button>
                                                        )}
                                                        {project.status === 'pending_approval' && (
                                                            <button
                                                                onClick={() => handleStatusUpdate(project.id, 'active')}
                                                                className="w-full text-left px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg flex items-center gap-2"
                                                            >
                                                                Approve Project
                                                            </button>
                                                        )}
                                                        {project.status !== 'rejected' && (
                                                            <button
                                                                onClick={() => handleStatusUpdate(project.id, 'rejected')}
                                                                className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                                                            >
                                                                Reject Project
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredProjects.length}
                        itemsPerPage={itemsPerPage}
                    />
                </>
            )}
        </div>
    );
}
