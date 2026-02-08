"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { Search, Filter, MoreVertical, Shield, User, Building2, GraduationCap, Plus, Edit, Trash2, X } from "lucide-react";

interface User {
    id: number | string;
    name: string;
    email: string;
    role: string;
    status: string;
    joinDate: string;
    orgName?: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filtering & Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [activeActionMenu, setActiveActionMenu] = useState<number | string | null>(null);

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

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/users`);
            if (!res) return;
            const data = await res.json();

            let usersList = [];
            if (Array.isArray(data)) usersList = data;
            else if (data.success && Array.isArray(data.data)) usersList = data.data;

            if (usersList.length > 0) {
                const mappedUsers = usersList.map((u: any) => ({
                    id: u.id,
                    name: u.name || u.orgName || "Unknown User",
                    email: u.email,
                    role: u.role,
                    status: u.status || "active",
                    joinDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"
                }));
                setUsers(mappedUsers);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/users`, {
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
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/users/${id}`, {
                method: "DELETE"
            });
            if (res && res.ok) fetchUsers();
            else alert("Failed to delete user");
        } catch (error) {
            console.error("Error deleting user", error);
        }
        setActiveActionMenu(null);
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setFormData({ name: user.name, email: user.email, password: "", role: user.role, status: user.status });
        setIsEditModalOpen(true);
        setActiveActionMenu(null);
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        try {
            const payload: any = { ...formData };
            if (!payload.password) delete payload.password; // Don't send empty password

            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/users/${selectedUser.id}`, {
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
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs font-bold tracking-wider">
                        <tr>
                            <th className="p-6">User</th>
                            <th className="p-6">Role</th>
                            <th className="p-6">Status</th>
                            <th className="p-6">Joined Date</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading users...</td></tr>
                        ) : paginatedUsers.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No users found.</td></tr>
                        ) : paginatedUsers.map((user) => (
                            <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase">
                                            {user.name && user.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{user.name}</div>
                                            <div className="text-sm text-slate-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-2 capitalize text-sm font-bold text-slate-700">
                                        <div className="p-1.5 rounded-md bg-slate-50">
                                            {getRoleIcon(user.role)}
                                        </div>
                                        {user.role}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${user.status === 'active' ? 'bg-green-50 text-green-600' :
                                        user.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                            'bg-red-50 text-red-600'}`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="p-6 text-slate-500 text-sm font-medium">
                                    {user.joinDate}
                                </td>
                                <td className="p-6 text-right relative">
                                    <button
                                        onClick={() => setActiveActionMenu(activeActionMenu === user.id ? null : user.id)}
                                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>

                                    {/* Action Dropdown */}
                                    {activeActionMenu === user.id && (
                                        <div className="absolute right-8 top-12 w-32 bg-white rounded-lg shadow-xl border border-slate-100 z-10 py-1">
                                            <button onClick={() => openEditModal(user)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                <Edit className="w-4 h-4" /> Edit
                                            </button>
                                            <button onClick={() => handleDeleteUser(user.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <Trash2 className="w-4 h-4" /> Delete
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
            {!isLoading && filteredUsers.length > 0 && (
                <div className="flex justify-between items-center mt-4 text-sm text-slate-500">
                    <div>
                        Showing <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="font-bold text-slate-900">{filteredUsers.length}</span> users
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
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
