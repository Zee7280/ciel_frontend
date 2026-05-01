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
            const res = await authenticatedFetch(`/api/v1/admin/organizations`);
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
    const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
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
                const res = await authenticatedFetch(`/api/v1/admin/organizations/${id}`, {
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
                const res = await authenticatedFetch(`/api/v1/admin/organizations/status`, {
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

    const openOrganizationDetails = async (org: any) => {
        setSelectedOrg(org);
        setIsDetailsLoading(true);
        setActiveActionMenu(null);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/organizations/${org.id}`);
            if (res && res.ok) {
                const data = await res.json();
                const details = data?.data ?? data;
                setSelectedOrg((prev: any) => ({ ...(prev || {}), ...(details || {}) }));
            } else {
                toast.error("Failed to load organization details");
            }
        } catch (error) {
            console.error("Error loading organization details", error);
            toast.error("Failed to load organization details");
        } finally {
            setIsDetailsLoading(false);
        }
    };

    const readOrgValue = (org: any, keys: string[], fallback: string = "N/A") => {
        for (const key of keys) {
            const value = org?.[key];
            if (value !== undefined && value !== null && value !== "") {
                return String(value);
            }
        }
        return fallback;
    };

    const formatDateValue = (value: any) => {
        if (!value) return "N/A";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString();
    };

    return (
        <div className="relative p-0 lg:p-8">
            <div className="mb-8 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Organizations</h1>
                    <p className="text-slate-500">Manage NGO and Corporate partners.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                >
                    <Building2 className="w-4 h-4" /> Onboard Organization
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:gap-4">
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
                <button className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                    <Filter className="w-4 h-4" /> Filter
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[400px]">
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
                        <div className="overflow-x-auto">
                        <table className="min-w-[900px] w-full text-left">
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
                                                <div className="absolute right-8 top-12 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 py-1 text-left">
                                                    <button
                                                        onClick={() => openOrganizationDetails(org)}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium"
                                                    >
                                                        View Details
                                                    </button>
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
                        </div>
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
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200 sm:p-6">
                        <div className="mb-6 flex items-start justify-between gap-4">
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

            {/* Organization Details Modal */}
            {selectedOrg && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200 sm:p-6">
                        <div className="mb-2 flex items-start justify-between gap-4">
                            <h2 className="text-xl font-bold text-slate-900">Organization Details</h2>
                            <button onClick={() => setSelectedOrg(null)} className="text-slate-400 hover:text-slate-600">
                                <AlertCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">Review organization profile and verification metadata.</p>

                        {isDetailsLoading ? (
                            <div className="h-36 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Organization Name</p>
                                    <p className="text-slate-900 font-bold mt-1">{readOrgValue(selectedOrg, ["name", "organization_name"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Email</p>
                                    <p className="text-slate-900 mt-1 break-all">{readOrgValue(selectedOrg, ["email"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Contact Person</p>
                                    <p className="text-slate-900 mt-1">{readOrgValue(selectedOrg, ["contact_person", "contact", "contact_name"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Type</p>
                                    <p className="text-slate-900 uppercase mt-1">{readOrgValue(selectedOrg, ["organization_type", "type"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Status</p>
                                    <p className="text-slate-900 capitalize mt-1">{readOrgValue(selectedOrg, ["status", "verification_status"], "Unknown")}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Active Projects</p>
                                    <p className="text-slate-900 mt-1">{readOrgValue(selectedOrg, ["active_projects_count", "projects"], "0")}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Phone</p>
                                    <p className="text-slate-900 mt-1">{readOrgValue(selectedOrg, ["phone", "phone_number", "mobile"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Website</p>
                                    <p className="text-slate-900 mt-1 break-all">{readOrgValue(selectedOrg, ["website", "website_url"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 md:col-span-2">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Address</p>
                                    <p className="text-slate-900 mt-1">{readOrgValue(selectedOrg, ["address", "full_address", "street_address"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">City</p>
                                    <p className="text-slate-900 mt-1">{readOrgValue(selectedOrg, ["city"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">State / Province</p>
                                    <p className="text-slate-900 mt-1">{readOrgValue(selectedOrg, ["state", "province"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Country</p>
                                    <p className="text-slate-900 mt-1">{readOrgValue(selectedOrg, ["country"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Postal Code</p>
                                    <p className="text-slate-900 mt-1">{readOrgValue(selectedOrg, ["postal_code", "zip_code"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Registration Number</p>
                                    <p className="text-slate-900 mt-1">{readOrgValue(selectedOrg, ["registration_number", "reg_no", "license_number"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Tax Number</p>
                                    <p className="text-slate-900 mt-1">{readOrgValue(selectedOrg, ["tax_number", "ntn", "tax_id"])}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Created At</p>
                                    <p className="text-slate-900 mt-1">{formatDateValue(selectedOrg?.created_at || selectedOrg?.createdAt)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Updated At</p>
                                    <p className="text-slate-900 mt-1">{formatDateValue(selectedOrg?.updated_at || selectedOrg?.updatedAt)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 md:col-span-2">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Verified At</p>
                                    <p className="text-slate-900 mt-1">{formatDateValue(selectedOrg?.verified_at || selectedOrg?.verifiedAt)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
