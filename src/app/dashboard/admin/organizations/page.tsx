"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, MoreVertical, Building2, Globe, ShieldCheck, AlertCircle, Loader2, UserPlus } from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import StatusBadge from "@/components/admin/StatusBadge";
import { useAbortableFetch, isAbortError, readErrorMessage } from "@/components/admin/useAbortableFetch";

type OrgAction = "approve" | "suspend" | "unsuspend" | "reject" | "delete";

const STATUS_FILTERS: { value: string; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "verified", label: "Verified" },
    { value: "suspended", label: "Suspended" },
    { value: "rejected", label: "Rejected" },
];

const MENU_W = 208;
const MENU_H = 260;
const MENU_GAP = 8;

function computeMenuPosition(trigger: DOMRect) {
    const spaceBelow = window.innerHeight - trigger.bottom - MENU_GAP;
    const openAbove = spaceBelow < MENU_H && trigger.top > spaceBelow;
    let x = trigger.right - MENU_W;
    let y = openAbove ? trigger.top - MENU_H - MENU_GAP : trigger.bottom + MENU_GAP;
    x = Math.max(8, Math.min(x, window.innerWidth - MENU_W - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - MENU_H - 8));
    return { x, y };
}

const orgStatusOf = (org: any): string =>
    String(org?.status || org?.verification_status || "unknown").toLowerCase();

export default function AdminOrganizationsPage() {
    const [orgs, setOrgs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const { begin } = useAbortableFetch();

    const fetchOrganizations = useCallback(async () => {
        const run = begin();
        setIsLoading(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/organizations`, { signal: run.signal });
            if (!run.isCurrent() || !res) return;
            if (res.ok) {
                const data = await res.json();
                if (!run.isCurrent()) return;

                // Handle different data structures (array directly or { data: [...] })
                let orgsList: any[] = [];
                if (Array.isArray(data)) {
                    orgsList = data;
                } else if (data?.data && Array.isArray(data.data)) {
                    orgsList = data.data;
                }

                setOrgs(orgsList);
            } else {
                toast.error(await readErrorMessage(res, "Failed to load organizations"));
            }
        } catch (error) {
            if (isAbortError(error) || !run.isCurrent()) return;
            console.error("Error fetching organizations", error);
            toast.error("Failed to load organizations");
        } finally {
            if (run.isCurrent()) setIsLoading(false);
        }
    }, [begin]);

    useEffect(() => {
        void fetchOrganizations();
    }, [fetchOrganizations]);

    // Filter Logic (only fields the API actually returns)
    const query = searchQuery.trim().toLowerCase();
    const filteredOrgs = orgs.filter((org) => {
        if (statusFilter !== "all" && orgStatusOf(org) !== statusFilter) return false;
        if (!query) return true;
        return [org.name, org.email, org.contact_person, org.contact_number, org.organization_type].some((v) =>
            String(v ?? "").toLowerCase().includes(query),
        );
    });

    const totalPages = Math.max(1, Math.ceil(filteredOrgs.length / itemsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedOrgs = filteredOrgs.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [actionMenu, setActionMenu] = useState<{ orgId: number | string; x: number; y: number } | null>(null);
    const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
    const [formData, setFormData] = useState({ name: "", email: "", contact: "", type: "ngo", password: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirm, setConfirm] = useState<{ action: OrgAction; org: any } | null>(null);
    const [rejectNotes, setRejectNotes] = useState("");

    const actionMenuOrg = actionMenu == null ? null : orgs.find((o) => o.id === actionMenu.orgId) ?? null;

    useEffect(() => {
        if (!actionMenu) return;
        const onPointerDown = (e: PointerEvent) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest("[data-org-row-actions]") || t?.closest("[data-org-actions-portal]")) return;
            setActionMenu(null);
        };
        const close = () => setActionMenu(null);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setActionMenu(null);
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKey);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [actionMenu]);

    const handleAddOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/organizations/create`, {
                method: "POST",
                body: JSON.stringify(formData)
            });
            if (res && res.ok) {
                toast.success("Organization onboarded successfully");
                setIsAddModalOpen(false);
                setFormData({ name: "", email: "", contact: "", type: "ngo", password: "" });
                void fetchOrganizations();
            } else {
                toast.error(await readErrorMessage(res, "Failed to onboard organization"));
            }
        } catch (error) {
            console.error("Error onboarding organization", error);
            toast.error("Error creating organization");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openConfirm = (action: OrgAction, org: any) => {
        setRejectNotes("");
        setConfirm({ action, org });
        setActionMenu(null);
    };

    const runConfirmedAction = async () => {
        if (!confirm || isSubmitting) return;
        const { action, org } = confirm;
        const id = org.id;
        const name = org.name || "organization";
        const status = orgStatusOf(org);
        setIsSubmitting(true);
        try {
            if (action === "delete") {
                const res = await authenticatedFetch(`/api/v1/admin/organizations/${id}`, { method: "DELETE" });
                if (res && res.ok) {
                    toast.success(`${name} deleted`);
                } else {
                    toast.error(await readErrorMessage(res, "Failed to delete organization"));
                    return;
                }
            } else if (action === "approve") {
                // Real approve endpoint records verifiedBy/verifiedAt. A suspended org also needs the
                // block lifted, which is a second call: run sequentially and report partial failure.
                const res = await authenticatedFetch(`/api/v1/admin/organizations/${id}/approve`, { method: "PATCH" });
                if (!res || !res.ok) {
                    toast.error(await readErrorMessage(res, "Failed to approve organization"));
                    return;
                }
                if (status === "suspended") {
                    const unblockRes = await authenticatedFetch(`/api/v1/admin/organizations/status`, {
                        method: "POST",
                        body: JSON.stringify({ id, status: "active" }),
                    });
                    if (!unblockRes || !unblockRes.ok) {
                        const msg = await readErrorMessage(unblockRes, "request failed");
                        toast.error(`${name} was approved but is still suspended (${msg}). Use Unsuspend to retry.`);
                        return;
                    }
                }
                toast.success(`${name} approved`);
            } else if (action === "unsuspend") {
                const res = await authenticatedFetch(`/api/v1/admin/organizations/status`, {
                    method: "POST",
                    body: JSON.stringify({ id, status: "active" }),
                });
                if (!res || !res.ok) {
                    toast.error(await readErrorMessage(res, "Failed to unsuspend organization"));
                    return;
                }
                toast.success(`${name} unsuspended`);
            } else if (action === "reject") {
                const notes = rejectNotes.trim();
                if (!notes) {
                    toast.error("Please enter a reason for rejection");
                    return;
                }
                const res = await authenticatedFetch(`/api/v1/admin/organizations/${id}/reject`, {
                    method: "PATCH",
                    body: JSON.stringify({ notes }),
                });
                if (!res || !res.ok) {
                    toast.error(await readErrorMessage(res, "Failed to reject organization"));
                    return;
                }
                toast.success(`${name} rejected`);
            } else {
                const res = await authenticatedFetch(`/api/v1/admin/organizations/${id}/block`, { method: "PATCH" });
                if (!res || !res.ok) {
                    toast.error(await readErrorMessage(res, "Failed to suspend organization"));
                    return;
                }
                toast.success(`${name} suspended`);
            }
            setConfirm(null);
        } catch (error) {
            console.error(`Error running ${action} on organization`, error);
            toast.error("Action failed");
        } finally {
            setIsSubmitting(false);
            // Always resync: a partial failure may have changed state server-side.
            void fetchOrganizations();
        }
    };

    const openOrganizationDetails = async (org: any) => {
        setSelectedOrg(org);
        setIsDetailsLoading(true);
        setActionMenu(null);
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

    const isUniversityOrganization = (org: any) => {
        const t = String(org?.organization_type || org?.type || org?.orgType || "").toLowerCase();
        return t.includes("university");
    };

    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [memberForm, setMemberForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "university" as "university" | "organization_admin",
    });

    const handleAddUniversityMember = async (e: React.FormEvent) => {
        e.preventDefault();
        const orgId = selectedOrg?.id;
        if (!orgId || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/organizations/${orgId}/members`, {
                method: "POST",
                body: JSON.stringify({
                    name: memberForm.name,
                    email: memberForm.email,
                    password: memberForm.password,
                    role: memberForm.role,
                }),
            });
            const data = await res?.json().catch(() => ({}));
            if (!res?.ok) {
                toast.error(data?.message || data?.error || "Failed to add staff account");
                return;
            }
            toast.success("University staff account created");
            setIsMemberModalOpen(false);
            setMemberForm({ name: "", email: "", password: "", role: "university" });
        } catch (err) {
            console.error(err);
            toast.error("Failed to add staff account");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative p-0 lg:p-8">
            <div className="mb-8 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Organizations</h1>
                    <p className="text-slate-500">Manage NGO, corporate, and university partners.</p>
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
                        placeholder="Search name, email, contact, type..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            aria-pressed={statusFilter === f.value}
                            onClick={() => {
                                setStatusFilter(f.value);
                                setCurrentPage(1);
                            }}
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                                statusFilter === f.value
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
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
                        <table className="min-w-[760px] w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs font-bold tracking-wider">
                                <tr>
                                    <th className="p-4 sm:p-6">Organization</th>
                                    <th className="p-4 sm:p-6">Type</th>
                                    <th className="p-4 sm:p-6">Contact Person</th>
                                    <th className="p-4 sm:p-6">Status</th>
                                    <th className="p-4 sm:p-6">Active Projects</th>
                                    <th className="p-4 sm:p-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedOrgs.map((org) => (
                                    <tr key={org.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 sm:p-6">
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
                                        <td className="p-4 sm:p-6">
                                            <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                <Globe className="w-4 h-4 text-blue-500" /> {org.organization_type || org.type || "N/A"}
                                            </span>
                                        </td>
                                        <td className="p-4 sm:p-6 text-sm text-slate-600">
                                            {org.contact_person || "N/A"}
                                        </td>
                                        <td className="p-4 sm:p-6">
                                            <StatusBadge status={orgStatusOf(org)} className="gap-1">
                                                {orgStatusOf(org) === "verified" && <ShieldCheck className="w-3 h-3" />}
                                                {orgStatusOf(org) === "suspended" && <AlertCircle className="w-3 h-3" />}
                                                {orgStatusOf(org).replace(/_/g, " ")}
                                            </StatusBadge>
                                        </td>
                                        <td className="p-4 sm:p-6 font-bold text-slate-900">{org.active_projects_count || org.projects || 0}</td>
                                        <td className="p-4 sm:p-6 text-right">
                                            <div className="inline-block" data-org-row-actions>
                                                <button
                                                    type="button"
                                                    aria-label={`Actions for ${org.name}`}
                                                    onClick={(e) => {
                                                        if (actionMenu?.orgId === org.id) {
                                                            setActionMenu(null);
                                                            return;
                                                        }
                                                        const { x, y } = computeMenuPosition(e.currentTarget.getBoundingClientRect());
                                                        setActionMenu({ orgId: org.id, x, y });
                                                    }}
                                                    className="p-2.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                        {/* Pagination Controls */}
                        <div className="bg-slate-50 p-4 border-t border-slate-100">
                            <PaginationControls
                                currentPage={safePage}
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
                                    <option value="university">University</option>
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

                            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors mt-2 disabled:opacity-60">
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

                        {selectedOrg && isUniversityOrganization(selectedOrg) && (
                            <div className="mt-6 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsMemberModalOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Add university staff login
                                </button>
                                <p className="mt-2 text-xs text-slate-500">
                                    Creates another user attached to this organization (e.g. operations team). Requires admin.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isMemberModalOpen && selectedOrg && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <h3 className="text-lg font-bold text-slate-900">Add university staff</h3>
                            <button
                                type="button"
                                onClick={() => setIsMemberModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                                aria-label="Close"
                            >
                                <AlertCircle className="h-6 w-6 rotate-45" />
                            </button>
                        </div>
                        <p className="mb-4 text-sm text-slate-500">
                            Organization: <strong>{readOrgValue(selectedOrg, ["name"])}</strong>
                        </p>
                        <form onSubmit={handleAddUniversityMember} className="space-y-3">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Full name</label>
                                <input
                                    required
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                                    value={memberForm.name}
                                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                                <input
                                    required
                                    type="email"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                                    value={memberForm.email}
                                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Temporary password</label>
                                <input
                                    required
                                    type="password"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                                    value={memberForm.password}
                                    onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Role</label>
                                <select
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                                    value={memberForm.role}
                                    onChange={(e) =>
                                        setMemberForm({
                                            ...memberForm,
                                            role: e.target.value as "university" | "organization_admin",
                                        })
                                    }
                                >
                                    <option value="university">University operator</option>
                                    <option value="organization_admin">Organization admin</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="mt-2 w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                Create account
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {typeof document !== "undefined" &&
                actionMenu &&
                actionMenuOrg &&
                createPortal(
                    <div
                        data-org-actions-portal
                        role="menu"
                        className="fixed z-[10000] w-52 rounded-lg border border-slate-100 bg-white py-1 text-left shadow-xl"
                        style={{ left: actionMenu.x, top: actionMenu.y }}
                    >
                        <button
                            type="button"
                            onClick={() => openOrganizationDetails(actionMenuOrg)}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            View Details
                        </button>
                        {orgStatusOf(actionMenuOrg) !== "verified" && (
                            <button
                                type="button"
                                onClick={() => openConfirm("approve", actionMenuOrg)}
                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-green-600 hover:bg-green-50"
                            >
                                Approve Organization
                            </button>
                        )}
                        {orgStatusOf(actionMenuOrg) !== "rejected" && (
                            <button
                                type="button"
                                onClick={() => openConfirm("reject", actionMenuOrg)}
                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-orange-600 hover:bg-orange-50"
                            >
                                Reject Organization
                            </button>
                        )}
                        {orgStatusOf(actionMenuOrg) === "suspended" ? (
                            <button
                                type="button"
                                onClick={() => openConfirm("unsuspend", actionMenuOrg)}
                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-blue-600 hover:bg-blue-50"
                            >
                                Unsuspend Organization
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => openConfirm("suspend", actionMenuOrg)}
                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-amber-600 hover:bg-amber-50"
                            >
                                Suspend Organization
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => openConfirm("delete", actionMenuOrg)}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                            Delete
                        </button>
                    </div>,
                    document.body,
                )}

            <ConfirmDialog
                open={!!confirm}
                title={
                    confirm
                        ? {
                              approve: `Approve ${confirm.org.name}?`,
                              suspend: `Suspend ${confirm.org.name}?`,
                              unsuspend: `Unsuspend ${confirm.org.name}?`,
                              reject: `Reject ${confirm.org.name}?`,
                              delete: `Delete ${confirm.org.name}?`,
                          }[confirm.action]
                        : ""
                }
                description={
                    confirm
                        ? {
                              approve:
                                  orgStatusOf(confirm.org) === "suspended"
                                      ? "The organization will be marked verified and its suspension lifted (two sequential steps)."
                                      : "The organization will be marked as verified.",
                              suspend: "The organization will be blocked and all its users will be signed out.",
                              unsuspend: "The block will be lifted so the organization's users can sign in again.",
                              reject: "The organization will be marked as rejected. The reason is stored with the verification record.",
                              delete: "This permanently deletes the organization. This cannot be undone.",
                          }[confirm.action]
                        : undefined
                }
                confirmLabel={
                    confirm
                        ? { approve: "Approve", suspend: "Suspend", unsuspend: "Unsuspend", reject: "Reject", delete: "Delete organization" }[confirm.action]
                        : "Confirm"
                }
                variant={confirm?.action === "delete" ? "danger" : confirm?.action === "approve" || confirm?.action === "unsuspend" ? "default" : "warning"}
                requireText={confirm?.action === "delete" ? String(confirm.org.name ?? "") : undefined}
                confirmDisabled={confirm?.action === "reject" && !rejectNotes.trim()}
                loading={isSubmitting}
                onConfirm={runConfirmedAction}
                onCancel={() => setConfirm(null)}
            >
                {confirm?.action === "reject" && (
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Reason (required)</label>
                        <textarea
                            data-autofocus
                            rows={3}
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                    </div>
                )}
            </ConfirmDialog>
        </div>
    );
}
