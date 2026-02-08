"use client";

import { useState, useEffect } from "react";
import { Search, Filter, MoreVertical, Building2, Globe, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

export default function AdminOrganizationsPage() {
    const [orgs, setOrgs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const fetchOrganizations = async () => {
        setIsLoading(true);
        try {
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/organizations`);
            if (res && res.ok) {
                const data = await res.json();

                // Hnadle different data structures (array directly or { data: [...] })
                let orgsList = [];
                if (Array.isArray(data)) {
                    orgsList = data;
                } else if (data.data && Array.isArray(data.data)) {
                    orgsList = data.data;
                }

                setOrgs(orgsList);
            } else {
                console.error("Failed to fetch organizations", res?.status);
            }
        } catch (error) {
            console.error("Error fetching organizations", error);
            // toast.error("Error loading data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganizations();
    }, []);

    // Filter Logic
    const filteredOrgs = orgs.filter(org => {
        const query = searchQuery.toLowerCase();
        return (
            org.name?.toLowerCase().includes(query) ||
            org.email?.toLowerCase().includes(query) ||
            org.contact?.toLowerCase().includes(query)
        );
    });

    const totalPages = Math.ceil(filteredOrgs.length / itemsPerPage);
    const paginatedOrgs = filteredOrgs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeActionMenu, setActiveActionMenu] = useState<number | string | null>(null);
    const [formData, setFormData] = useState({ name: "", email: "", contact: "", type: "ngo", password: "" });

    const handleAddOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await authenticatedFetch(`/api/v1/admin/organizations/create`, {
                method: "POST",
                body: JSON.stringify(formData)
            });
            if (res && res.ok) {
                toast.success("Organization onboarded successfully");
                setIsAddModalOpen(false);
                setFormData({ name: "", email: "", contact: "", type: "ngo", password: "" });
                fetchOrganizations();
            } else {
                toast.error("Failed to onboard organization");
            }
        } catch (error) {
            console.error("Error onboarding organization", error);
            toast.error("Error creating organization");
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'suspend' | 'delete') => {
        try {
            if (action === 'delete') {
                const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/organizations/${id}`, {
                    method: 'DELETE'
                });
                if (res && res.ok) {
                    toast.success("Organization deleted successfully");
                    fetchOrganizations();
                } else {
                    toast.error("Failed to delete organization");
                }
            } else {
                const status = action === 'approve' ? 'approve' : 'suspended';
                const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/organizations/status`, {
                    method: 'POST',
                    body: JSON.stringify({ id, status })
                });

                if (res && res.ok) {
                    toast.success(`Organization ${status} successfully`);
                    fetchOrganizations();
                } else {
                    toast.error(`Failed to update organization status`);
                }
            }
        } catch (error) {
            console.error(`Error ${action}ing organization`, error);
            toast.error("Action failed");
        }
        setActiveActionMenu(null);
    };

    return (
        <div className="p-8 relative">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Organizations</h1>
                    <p className="text-slate-500">Manage NGO and Corporate partners.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <Building2 className="w-4 h-4" /> Onboard Organization
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold text-sm">
                    <Filter className="w-4 h-4" /> Filter
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : filteredOrgs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Building2 className="w-12 h-12 mb-4 opacity-20" />
                        <p>No organizations found.</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs font-bold tracking-wider">
                                <tr>
                                    <th className="p-6">Organization</th>
                                    <th className="p-6">Type</th>
                                    <th className="p-6">Contact Person</th>
                                    <th className="p-6">Status</th>
                                    <th className="p-6">Active Projects</th>
                                    <th className="p-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedOrgs.map((org) => (
                                    <tr key={org.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{org.name}</div>
                                                    <div className="text-xs text-slate-400">{org.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                <Globe className="w-4 h-4 text-blue-500" /> {org.organization_type || org.type || "N/A"}
                                            </span>
                                        </td>
                                        <td className="p-6 text-sm text-slate-600">
                                            {org.contact_person || org.contact || "N/A"}
                                        </td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 w-fit
                                                ${(org.status === 'verified' || org.verification_status === 'verified') ? 'bg-green-50 text-green-600' :
                                                    (org.status === 'pending' || org.verification_status === 'pending') ? 'bg-amber-50 text-amber-600' :
                                                        'bg-red-50 text-red-600'}`}>
                                                {(org.status === 'verified' || org.verification_status === 'verified') && <ShieldCheck className="w-3 h-3" />}
                                                {(org.status === 'suspended' || org.verification_status === 'suspended') && <AlertCircle className="w-3 h-3" />}
                                                {org.status || org.verification_status || "Unknown"}
                                            </span>
                                        </td>
                                        <td className="p-6 font-bold text-slate-900">{org.active_projects_count || org.projects || 0}</td>
                                        <td className="p-6 text-right relative">
                                            <button
                                                onClick={() => setActiveActionMenu(activeActionMenu === org.id ? null : org.id)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>

                                            {/* Action Dropdown */}
                                            {activeActionMenu === org.id && (
                                                <div className="absolute right-8 top-12 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-10 py-1 text-left">
                                                    <button
                                                        onClick={() => handleAction(org.id, 'approve')}
                                                        className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 font-medium"
                                                    >
                                                        Approve Organization
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(org.id, 'suspend')}
                                                        className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 font-medium"
                                                    >
                                                        Suspend Organization
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(org.id, 'delete')}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Pagination Controls */}
                        <div className="bg-slate-50 p-4 border-t border-slate-100">
                            <PaginationControls
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                totalItems={filteredOrgs.length}
                                itemsPerPage={itemsPerPage}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Onboard Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Onboard New Organization</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <AlertCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleAddOrganization} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Organization Name</label>
                                <input
                                    type="text" required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                                <input
                                    type="email" required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Contact Person</label>
                                <input
                                    type="text" required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.contact}
                                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="ngo">NGO</option>
                                    <option value="corporate">Corporate</option>
                                    <option value="school">Educational Institute</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Temporary Password</label>
                                <input
                                    type="password" required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors mt-2">
                                Complete Onboarding
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
