"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { authenticatedFetch } from "@/utils/api";
import {
    Search,
    Filter,
    MoreVertical,
    Shield,
    User,
    Building2,
    GraduationCap,
    Plus,
    Edit,
    Trash2,
    X,
    ChevronsLeft,
    ChevronLeft,
    ChevronRight,
    ChevronsRight,
} from "lucide-react";
import DataTable from "react-data-table-component";

function formatJoinDate(createdAt: string | undefined | null): string {
    if (!createdAt) return "N/A";
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatRoleLabel(role: string): string {
    const r = role?.toLowerCase() || "";
    const map: Record<string, string> = {
        student: "Student",
        faculty: "Faculty",
        university: "University",
        ngo: "Ngo",
        corporate: "Corporate",
        organization_admin: "Org Admin",
        admin: "Admin",
    };
    return map[r] || r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface User {
    id: number | string;
    name: string;
    email: string;
    role: string;
    status: string;
    joinDate: string;
    orgName?: string;
}

const ACTION_MENU_W = 144;
const ACTION_MENU_H = 96;
const ACTION_MENU_GAP = 8;

function computeActionMenuPosition(trigger: DOMRect) {
    const spaceBelow = window.innerHeight - trigger.bottom - ACTION_MENU_GAP;
    const openAbove = spaceBelow < ACTION_MENU_H;
    let x = trigger.right - ACTION_MENU_W;
    let y = openAbove ? trigger.top - ACTION_MENU_H - ACTION_MENU_GAP : trigger.bottom + ACTION_MENU_GAP;
    x = Math.max(8, Math.min(x, window.innerWidth - ACTION_MENU_W - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - ACTION_MENU_H - 8));
    return { x, y };
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filtering & Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [actionMenu, setActionMenu] = useState<{
        userId: number | string;
        x: number;
        y: number;
    } | null>(null);

    // Form States
    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "student", status: "active" });

    // Filtered & Paginated Users
    const filteredUsers = users.filter(user => {
        const matchesSearch = (
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const rangeStart = filteredUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const rangeEnd = Math.min(currentPage * itemsPerPage, filteredUsers.length);

    const actionMenuUser =
        actionMenu == null
            ? null
            : filteredUsers.find((u) => u.id === actionMenu.userId) ?? users.find((u) => u.id === actionMenu.userId) ?? null;

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    useEffect(() => {
        setCurrentPage((p) => (p > totalPages ? totalPages : p));
    }, [filteredUsers.length, itemsPerPage, totalPages]);

    useEffect(() => {
        if (!actionMenu) return;
        const onPointerDown = (e: PointerEvent) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest("[data-user-row-actions]") || t?.closest("[data-user-actions-portal]")) return;
            setActionMenu(null);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [actionMenu]);

    useEffect(() => {
        if (!actionMenu) return;
        const close = () => setActionMenu(null);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [actionMenu]);

    useEffect(() => {
        if (actionMenu && !actionMenuUser) setActionMenu(null);
    }, [actionMenu, actionMenuUser]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/users`);
            if (!res) return;
            const data = await res.json();

            let usersList = [];
            if (Array.isArray(data)) usersList = data;
            else if (data.success && Array.isArray(data.data)) usersList = data.data;

            const mappedUsers = usersList.map((u: any) => ({
                id: u.id,
                name: u.name || u.orgName || "Unknown User",
                email: u.email,
                role: u.role,
                status: u.status || "active",
                joinDate: formatJoinDate(u.createdAt),
            }));
            setUsers(mappedUsers);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await authenticatedFetch(`/api/v1/admin/users`, {
                method: "POST",
                body: JSON.stringify(formData)
            });
            if (res && res.ok) {
                setIsAddModalOpen(false);
                fetchUsers(); // Refresh list
                setFormData({ name: "", email: "", password: "", role: "student", status: "active" });
            } else {
                alert("Failed to create user");
            }
        } catch (error) {
            console.error("Error creating user", error);
        }
    };

    const handleDeleteUser = async (id: number | string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            const res = await authenticatedFetch(`/api/v1/admin/users/${id}`, {
                method: "DELETE"
            });
            if (res && res.ok) fetchUsers();
            else alert("Failed to delete user");
        } catch (error) {
            console.error("Error deleting user", error);
        }
        setActionMenu(null);
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setFormData({ name: user.name, email: user.email, password: "", role: user.role, status: user.status });
        setIsEditModalOpen(true);
        setActionMenu(null);
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        try {
            const payload: any = { ...formData };
            if (!payload.password) delete payload.password; // Don't send empty password

            const res = await authenticatedFetch(`/api/v1/admin/users/${selectedUser.id}`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            if (res && res.ok) {
                setIsEditModalOpen(false);
                fetchUsers();
            } else {
                alert("Failed to update user");
            }
        } catch (error) {
            console.error("Error updating user", error);
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "admin": return <Shield className="w-4 h-4 text-purple-600" />;
            case "university": return <Building2 className="w-4 h-4 text-indigo-600" />;
            case "ngo": return <Building2 className="w-4 h-4 text-green-600" />;
            case "corporate": return <Building2 className="w-4 h-4 text-slate-600" />;
            case "organization_admin": return <User className="w-4 h-4 text-blue-600" />;
            case "faculty": return <User className="w-4 h-4 text-amber-600" />;
            default: return <GraduationCap className="w-4 h-4 text-blue-600" />;
        }
    };

    return (
        <div className="p-8 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-500">Manage all registered users and their roles.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Role Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            className="pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white cursor-pointer"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="all">All Roles</option>
                            <option value="student">Student</option>
                            <option value="faculty">Faculty</option>
                            <option value="university">University</option>
                            <option value="ngo">NGO</option>
                            <option value="corporate">Corporate</option>
                            <option value="organization_admin">Org Admin</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setFormData({ name: "", email: "", password: "", role: "student", status: "active" });
                            setIsAddModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" /> Add User
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-visible min-h-[400px] relative">

                <DataTable
                    columns={[
                        {
                            name: "User",
                            cell: (user: User) => (
                                <div className="flex items-center gap-3 py-2">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase">
                                        {user.name && user.name[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{user.name}</div>
                                        <div className="text-sm text-slate-500">{user.email}</div>
                                    </div>
                                </div>
                            ),
                            grow: 2
                        },
                        {
                            name: "Role",
                            cell: (user: User) => (
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <div className="p-1.5 rounded-md bg-slate-50">
                                        {getRoleIcon(user.role)}
                                    </div>
                                    {formatRoleLabel(user.role)}
                                </div>
                            )
                        },
                        {
                            name: "Status",
                            cell: (user: User) => (
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${user.status === "active"
                                        ? "bg-[#E8F5E9] text-green-700"
                                        : user.status === "pending"
                                            ? "bg-amber-50 text-amber-600"
                                            : "bg-red-50 text-red-600"
                                        }`}
                                >
                                    {user.status}
                                </span>
                            )
                        },
                        {
                            name: "Joined Date",
                            selector: (user: User) => user.joinDate,
                            sortable: true
                        },
                        {
                            name: "Actions",
                            cell: (user: User) => (
                                <div className="relative overflow-visible" data-user-row-actions>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (actionMenu?.userId === user.id) {
                                                setActionMenu(null);
                                                return;
                                            }
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const { x, y } = computeActionMenuPosition(rect);
                                            setActionMenu({ userId: user.id, x, y });
                                        }}
                                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>
                            )
                        }
                    ]}
                    data={paginatedUsers}
                    progressPending={isLoading}
                    pagination={false}
                    highlightOnHover
                    responsive

                    /* 🔥 IMPORTANT FIX */
                    customStyles={{
                        table: {
                            style: {
                                overflow: "visible"
                            }
                        },
                        tableWrapper: {
                            style: {
                                overflow: "visible"
                            }
                        },
                        rows: {
                            style: {
                                overflow: "visible",
                                position: "relative"
                            }
                        },
                        cells: {
                            style: {
                                overflow: "visible"
                            }
                        }
                    }}
                />

                {!isLoading && filteredUsers.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 px-4 py-3 border-t border-slate-100 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Rows per page</span>
                            <select
                                className="border border-slate-200 rounded-md py-1 pl-2 pr-7 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            >
                                {[10, 25, 50].map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="tabular-nums text-slate-700">
                                {rangeStart}-{rangeEnd} of {filteredUsers.length}
                            </span>
                            <div className="flex items-center gap-0.5">
                                <button
                                    type="button"
                                    aria-label="First page"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage(1)}
                                    className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Previous page"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                    className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next page"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                    className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Last page"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronsRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {typeof document !== "undefined" &&
                actionMenu &&
                actionMenuUser &&
                createPortal(
                    <div
                        data-user-actions-portal
                        className="fixed z-[10000] w-36 rounded-lg border border-slate-100 bg-white py-1 shadow-xl"
                        style={{ left: actionMenu.x, top: actionMenu.y }}
                        role="menu"
                    >
                        <button
                            type="button"
                            onClick={() => openEditModal(actionMenuUser)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                            <Edit className="h-4 w-4 shrink-0" /> Edit
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDeleteUser(actionMenuUser.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                            <Trash2 className="h-4 w-4 shrink-0" /> Delete
                        </button>
                    </div>,
                    document.body
                )}

            {/* Modals Overlay */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">
                                {isAddModalOpen ? "Add New User" : "Edit User"}
                            </h2>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={isAddModalOpen ? handleAddUser : handleEditUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="student">Student</option>
                                        <option value="faculty">Faculty</option>
                                        <option value="university">University</option>
                                        <option value="ngo">NGO</option>
                                        <option value="corporate">Corporate</option>
                                        <option value="organization_admin">Org Admin</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">
                                    {isAddModalOpen ? "Password" : "New Password (Optional)"}
                                </label>
                                <input
                                    type="password"
                                    required={isAddModalOpen}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors mt-2">
                                {isAddModalOpen ? "Create User" : "Save Changes"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
