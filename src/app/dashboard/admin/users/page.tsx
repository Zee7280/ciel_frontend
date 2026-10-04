"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    CheckCircle2,
    AlertCircle,
    MinusCircle,
    Mail,
    Download,
    Loader2,
    Eye,
    EyeOff,
    Copy,
    Lock,
    Info,
    SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import DataTable from "react-data-table-component";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import StatusBadge from "@/components/admin/StatusBadge";
import { useAbortableFetch, isAbortError, readErrorMessage } from "@/components/admin/useAbortableFetch";

const STATUS_OPTIONS = [
    "active",
    "approved",
    "pending",
    "pending_membership_payment",
    "inactive",
    "rejected",
    "suspended",
];
const statusOptionLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function csvCell(value: unknown): string {
    let v = value == null ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
    return `"${v.replace(/"/g, '""')}"`;
}

function getCurrentAdmin(): { id: string; email: string } {
    try {
        const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
        if (!raw) return { id: "", email: "" };
        const u = JSON.parse(raw);
        return { id: String(u?.id ?? ""), email: String(u?.email ?? "").toLowerCase() };
    } catch {
        return { id: "", email: "" };
    }
}

function formatJoinDate(createdAt: string | undefined | null): string {
    if (!createdAt) return "N/A";
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatRoleLabel(role: string): string {
    const r = role?.toLowerCase() || "";
    const map: Record<string, string> = {
        investor: "Investor / VC",
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
    /** Super-admin only: decrypted password copy from backend */
    stored_password?: string | null;
    /** Raw ISO timestamp, used for sorting */
    createdAt: string;
    /** From backend `findAllForAdmin`; absent on older APIs */
    profile_complete?: boolean;
    profile_missing_fields?: string[];
}

const ACTION_MENU_W = 224;
const ACTION_MENU_H = 140;
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
    const [totalUsers, setTotalUsers] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const { begin } = useAbortableFetch();
    const lastSearchRef = useRef("");

    // Filtering & Pagination States — all pushed to the server so the whole users table is never fetched at once.
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [profileFilter, setProfileFilter] = useState("all");
    const [joinedFrom, setJoinedFrom] = useState("");
    const [joinedTo, setJoinedTo] = useState("");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showPasswordColumn, setShowPasswordColumn] = useState(false);
    const [revealedPasswordIds, setRevealedPasswordIds] = useState<Record<string, boolean>>({});
    const [showFormPassword, setShowFormPassword] = useState(false);
    // Sorting runs on the server so it covers every page, not just the 20 rows on screen.
    const [sort, setSort] = useState<{ by: string; dir: "asc" | "desc" }>({ by: "createdAt", dir: "desc" });

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [actionMenu, setActionMenu] = useState<{
        userId: number | string;
        x: number;
        y: number;
    } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [resetTarget, setResetTarget] = useState<User | null>(null);
    const [statusConfirm, setStatusConfirm] = useState<{ user: User; from: string; to: string; role: string } | null>(null);
    const [currentAdmin, setCurrentAdmin] = useState<{ id: string; email: string }>({ id: "", email: "" });

    // Form States
    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "student", status: "active" });

    useEffect(() => {
        setCurrentAdmin(getCurrentAdmin());
    }, []);

    const isSelf = (u: User | null) =>
        !!u &&
        ((currentAdmin.id !== "" && String(u.id) === currentAdmin.id) ||
            (currentAdmin.email !== "" && String(u.email || "").toLowerCase() === currentAdmin.email));

    // Server already returns exactly the current page, filtered & searched.
    const totalPages = Math.max(1, Math.ceil(totalUsers / itemsPerPage));
    const rangeStart = totalUsers === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const rangeEnd = Math.min(currentPage * itemsPerPage, totalUsers);

    const actionMenuUser =
        actionMenu == null ? null : users.find((u) => u.id === actionMenu.userId) ?? null;

    // Debounce search so typing doesn't fire a request per keystroke; page resets in the same state update
    // that changes the filter so only one fetch happens.
    useEffect(() => {
        const t = setTimeout(() => {
            const next = searchQuery.trim();
            if (next !== lastSearchRef.current) {
                lastSearchRef.current = next;
                setCurrentPage(1);
                setDebouncedSearch(next);
            }
        }, 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

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

    const fetchUsers = useCallback(async () => {
        const run = begin();
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(itemsPerPage),
            });
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (roleFilter !== "all") params.set("role", roleFilter);
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (profileFilter !== "all") params.set("profile", profileFilter);
            if (joinedFrom) params.set("joined_from", joinedFrom);
            if (joinedTo) params.set("joined_to", joinedTo);
            if (showPasswordColumn) params.set("reveal_passwords", "1");
            params.set("sortBy", sort.by);
            params.set("sortDir", sort.dir);

            const res = await authenticatedFetch(`/api/v1/admin/users?${params.toString()}`, { signal: run.signal });
            if (!run.isCurrent()) return;
            if (!res) return;
            if (!res.ok) {
                toast.error(await readErrorMessage(res, "Failed to load users"));
                return;
            }
            const data = await res.json();
            if (!run.isCurrent()) return;

            let usersList: any[] = [];
            if (Array.isArray(data)) usersList = data;
            else if (Array.isArray(data?.data)) usersList = data.data;

            const mappedUsers: User[] = usersList.map((u: any) => ({
                id: u.id,
                name: u.name || u.orgName || "Unknown User",
                email: u.email,
                role: u.role,
                status: u.status || "active",
                joinDate: formatJoinDate(u.createdAt),
                createdAt: u.createdAt || "",
                stored_password:
                    typeof u.stored_password === "string" && u.stored_password.trim()
                        ? u.stored_password
                        : null,
                profile_complete: typeof u.profile_complete === "boolean" ? u.profile_complete : undefined,
                profile_missing_fields: Array.isArray(u.profile_missing_fields) ? u.profile_missing_fields : undefined,
            }));
            setUsers(mappedUsers);
            setTotalUsers(typeof data?.total === "number" ? data.total : mappedUsers.length);
        } catch (error) {
            if (isAbortError(error) || !run.isCurrent()) return;
            console.error("Failed to fetch users", error);
            toast.error("Failed to load users");
        } finally {
            if (run.isCurrent()) setIsLoading(false);
        }
    }, [begin, currentPage, itemsPerPage, debouncedSearch, roleFilter, statusFilter, profileFilter, joinedFrom, joinedTo, showPasswordColumn, sort]);

    useEffect(() => {
        void fetchUsers();
    }, [fetchUsers]);

    const changeRoleFilter = (v: string) => {
        setRoleFilter(v);
        setCurrentPage(1);
    };
    const changeStatusFilter = (v: string) => {
        setStatusFilter(v);
        setCurrentPage(1);
    };
    const changeProfileFilter = (v: string) => {
        setProfileFilter(v);
        setCurrentPage(1);
    };
    const changeJoinedFrom = (v: string) => {
        setJoinedFrom(v);
        setCurrentPage(1);
    };
    const changeJoinedTo = (v: string) => {
        setJoinedTo(v);
        setCurrentPage(1);
    };
    const clearAdvancedFilters = () => {
        setStatusFilter("all");
        setProfileFilter("all");
        setJoinedFrom("");
        setJoinedTo("");
        setCurrentPage(1);
    };
    const changeItemsPerPage = (n: number) => {
        setItemsPerPage(n);
        setCurrentPage(1);
    };

    const closeModals = () => {
        if (isSubmitting) return;
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setFormError(null);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setFormError(null);
        const name = formData.name.trim();
        const email = formData.email.trim();
        if (!name || !email) {
            setFormError("Name and email are required.");
            return;
        }
        if (formData.password.length < 8) {
            setFormError("Password must be at least 8 characters.");
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/users`, {
                method: "POST",
                body: JSON.stringify({ ...formData, name, email }),
            });
            if (res && res.ok) {
                toast.success("User created");
                setIsAddModalOpen(false);
                setFormData({ name: "", email: "", password: "", role: "student", status: "active" });
                void fetchUsers();
            } else {
                const msg = await readErrorMessage(res, "Failed to create user");
                setFormError(res?.status === 409 ? `${msg} (a user with this email already exists)` : msg);
            }
        } catch (error) {
            console.error("Error creating user", error);
            setFormError("Failed to create user. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDeleteUser = async () => {
        if (!deleteTarget || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/users/${deleteTarget.id}`, {
                method: "DELETE",
            });
            if (res && res.ok) {
                toast.success(`Deleted ${deleteTarget.name}`);
                setDeleteTarget(null);
                void fetchUsers();
            } else {
                toast.error(await readErrorMessage(res, "Failed to delete user"));
            }
        } catch (error) {
            console.error("Error deleting user", error);
            toast.error("Failed to delete user");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmSendReset = async () => {
        if (!resetTarget || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/users/${resetTarget.id}/send-password-reset`, {
                method: "POST",
            });
            if (res && res.ok) {
                toast.success(`Password reset email sent to ${resetTarget.email}`);
                setResetTarget(null);
            } else {
                toast.error(await readErrorMessage(res, "Failed to send password reset email"));
            }
        } catch (error) {
            console.error("Error sending password reset", error);
            toast.error("Failed to send password reset email");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setFormData({ name: user.name, email: user.email, password: "", role: user.role, status: user.status });
        setFormError(null);
        setShowFormPassword(false);
        setIsEditModalOpen(true);
        setActionMenu(null);
    };

    const saveEdit = async () => {
        if (!selectedUser) return;
        setIsSubmitting(true);
        setFormError(null);
        try {
            const payload: any = { ...formData, name: formData.name.trim(), email: formData.email.trim() };
            if (!payload.password) delete payload.password; // Don't send empty password
            else if (payload.password.length < 8) {
                setFormError("Password must be at least 8 characters.");
                return;
            }
            if (isSelf(selectedUser)) {
                // Never let an admin change their own role/status from here.
                payload.role = selectedUser.role;
                payload.status = selectedUser.status;
            }

            const res = await authenticatedFetch(`/api/v1/admin/users/${selectedUser.id}`, {
                method: "POST",
                body: JSON.stringify(payload),
            });
            if (res && res.ok) {
                toast.success("User updated");
                setIsEditModalOpen(false);
                setStatusConfirm(null);
                void fetchUsers();
            } else {
                setFormError(await readErrorMessage(res, "Failed to update user"));
                setStatusConfirm(null);
            }
        } catch (error) {
            console.error("Error updating user", error);
            setFormError("Failed to update user. Please try again.");
            setStatusConfirm(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || isSubmitting) return;
        if (!isSelf(selectedUser) && (formData.status !== selectedUser.status || formData.role !== selectedUser.role)) {
            setStatusConfirm({ user: selectedUser, from: selectedUser.status, to: formData.status, role: formData.role });
            return;
        }
        void saveEdit();
    };

    const exportCsv = () => {
        if (users.length === 0) {
            toast.error("Nothing to export");
            return;
        }
        const header = ["Name", "Email", "Role", "Status", "Profile", "Joined"];
        const rows = users.map((u) => [
            u.name,
            u.email,
            formatRoleLabel(u.role),
            u.status,
            u.profile_complete === true ? "Complete" : u.profile_complete === false ? "Incomplete" : "",
            u.createdAt || "",
        ]);
        const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `users-page-${currentPage}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const statusSelectOptions = useMemo(() => {
        const cur = formData.status;
        return cur && !STATUS_OPTIONS.includes(cur) ? [...STATUS_OPTIONS, cur] : STATUS_OPTIONS;
    }, [formData.status]);

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

    const storedPasswordCount = users.filter((u) => u.stored_password).length;
    const advancedFilterCount =
        (statusFilter !== "all" ? 1 : 0) +
        (profileFilter !== "all" ? 1 : 0) +
        (joinedFrom ? 1 : 0) +
        (joinedTo ? 1 : 0);

    const togglePasswordReveal = (userId: string | number) => {
        const key = String(userId);
        setRevealedPasswordIds((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const copyStoredPassword = async (password: string) => {
        try {
            await navigator.clipboard.writeText(password);
            toast.success("Password copied");
        } catch {
            toast.error("Could not copy password");
        }
    };

    const toolbarControlClass =
        "h-10 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none transition-shadow focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";

    return (
        <div className="relative p-4 sm:p-6 lg:p-8">
            <div className="mb-5 space-y-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">User Management</h1>
                    <p className="mt-1 text-sm text-slate-600">Manage registered users, roles, and account status.</p>
                    <p className="mt-2 text-xs font-medium text-slate-500">
                        {isLoading ? "Loading…" : `${totalUsers} user${totalUsers === 1 ? "" : "s"} total`}
                        {roleFilter !== "all" ? ` · ${formatRoleLabel(roleFilter)}` : ""}
                        {statusFilter !== "all" ? ` · ${statusOptionLabel(statusFilter)}` : ""}
                        {profileFilter !== "all" ? ` · ${profileFilter}` : ""}
                    </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:w-auto xl:justify-end">
                    {/* Search */}
                    <div className="relative min-w-0 flex-1 sm:min-w-[220px] sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name, email, university…"
                            className={`${toolbarControlClass} w-full pl-9 pr-3`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="relative w-full sm:w-[160px]">
                        <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <select
                            className={`${toolbarControlClass} w-full appearance-none pl-9 pr-8`}
                            value={roleFilter}
                            onChange={(e) => changeRoleFilter(e.target.value)}
                        >
                            <option value="all">All roles</option>
                            <option value="student">Student</option>
                            <option value="faculty">Faculty</option>
                            <option value="university">University</option>
                            <option value="ngo">NGO</option>
                            <option value="corporate">Corporate</option>
                            <option value="investor">Investor / VC</option>
                            <option value="organization_admin">Org Admin</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowAdvancedFilters((v) => !v)}
                        className={`inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition-colors sm:px-4 ${
                            showAdvancedFilters || advancedFilterCount > 0
                                ? "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        Advanced
                        {advancedFilterCount > 0 ? (
                            <span className="rounded-full bg-teal-200/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-teal-900">
                                {advancedFilterCount}
                            </span>
                        ) : null}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setShowPasswordColumn((v) => {
                                if (v) setRevealedPasswordIds({});
                                return !v;
                            });
                        }}
                        className={`inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition-colors sm:px-4 ${
                            showPasswordColumn
                                ? "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        title="Show stored password column (super admin)"
                    >
                        {showPasswordColumn ? <EyeOff className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        Passwords
                        {storedPasswordCount > 0 && (
                            <span className="rounded-full bg-violet-200/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-violet-900">
                                {storedPasswordCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={exportCsv}
                        disabled={isLoading || users.length === 0}
                        className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:px-4"
                        title="Export the users on this page as CSV"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>

                    <button
                        onClick={() => {
                            setFormData({ name: "", email: "", password: "", role: "student", status: "active" });
                            setFormError(null);
                            setShowFormPassword(false);
                            setIsAddModalOpen(true);
                        }}
                        className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        Add user
                    </button>
                </div>
                </div>

                {showAdvancedFilters ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</label>
                                <select
                                    className={`${toolbarControlClass} w-full appearance-none px-3`}
                                    value={statusFilter}
                                    onChange={(e) => changeStatusFilter(e.target.value)}
                                >
                                    <option value="all">All statuses</option>
                                    {STATUS_OPTIONS.map((st) => (
                                        <option key={st} value={st}>
                                            {statusOptionLabel(st)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Profile</label>
                                <select
                                    className={`${toolbarControlClass} w-full appearance-none px-3`}
                                    value={profileFilter}
                                    onChange={(e) => changeProfileFilter(e.target.value)}
                                >
                                    <option value="all">All profiles</option>
                                    <option value="complete">Complete</option>
                                    <option value="incomplete">Incomplete</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Joined from</label>
                                <input
                                    type="date"
                                    className={`${toolbarControlClass} w-full px-3`}
                                    value={joinedFrom}
                                    onChange={(e) => changeJoinedFrom(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Joined to</label>
                                <input
                                    type="date"
                                    className={`${toolbarControlClass} w-full px-3`}
                                    value={joinedTo}
                                    onChange={(e) => changeJoinedTo(e.target.value)}
                                />
                            </div>
                        </div>
                        {advancedFilterCount > 0 ? (
                            <button
                                type="button"
                                onClick={clearAdvancedFilters}
                                className="mt-3 text-xs font-semibold text-slate-600 hover:text-slate-900"
                            >
                                Clear advanced filters
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {showPasswordColumn && (
                    <div className="flex gap-3 rounded-xl border border-violet-200/80 bg-violet-50/80 px-4 py-3 text-sm text-violet-950">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
                        <p className="leading-relaxed">
                            Passwords appear after signup, when you set a new password in <strong>Edit</strong>, or when the user logs in again.
                            Empty rows need a login or an admin password reset.
                        </p>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="relative min-h-[320px] overflow-x-auto overflow-y-visible rounded-2xl border border-slate-200/80 bg-white shadow-sm">

                <DataTable
                    sortServer
                    defaultSortFieldId="createdAt"
                    defaultSortAsc={false}
                    onSort={(column, direction) => {
                        const by = String((column as { sortField?: string }).sortField || "createdAt");
                        setSort({ by, dir: direction === "asc" ? "asc" : "desc" });
                        setCurrentPage(1);
                    }}
                    columns={[
                        {
                            id: "name",
                            sortField: "name",
                            sortable: true,
                            name: "User",
                            cell: (user: User) => (
                                <div className="flex items-center gap-3 py-2">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase">
                                        {user.name && user.name[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-900 truncate">{user.name}</div>
                                        <div className="text-sm text-slate-500 truncate">{user.email}</div>
                                    </div>
                                </div>
                            ),
                            grow: 2
                        },
                        ...(showPasswordColumn
                            ? [
                                  {
                                      name: "Password",
                                      cell: (user: User) => {
                                          const key = String(user.id);
                                          const stored = user.stored_password;
                                          if (!stored) {
                                              return (
                                                  <span
                                                      className="text-xs text-slate-400"
                                                      title="Set via Edit, or captured on next login"
                                                  >
                                                      Not stored yet
                                                  </span>
                                              );
                                          }
                                          const revealed = revealedPasswordIds[key];
                                          return (
                                              <div className="flex items-center gap-1 py-1">
                                                  <code className="max-w-[140px] truncate rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800">
                                                      {revealed ? stored : "••••••••"}
                                                  </code>
                                                  <button
                                                      type="button"
                                                      onClick={() => togglePasswordReveal(user.id)}
                                                      className="rounded-md p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                                      title={revealed ? "Hide password" : "Show password"}
                                                      aria-label={revealed ? "Hide password" : "Show password"}
                                                  >
                                                      {revealed ? (
                                                          <EyeOff className="h-3.5 w-3.5" />
                                                      ) : (
                                                          <Eye className="h-3.5 w-3.5" />
                                                      )}
                                                  </button>
                                                  <button
                                                      type="button"
                                                      onClick={() => void copyStoredPassword(stored)}
                                                      className="rounded-md p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                                      title="Copy password"
                                                      aria-label="Copy password"
                                                  >
                                                      <Copy className="h-3.5 w-3.5" />
                                                  </button>
                                              </div>
                                          );
                                      },
                                      minWidth: "200px",
                                  },
                              ]
                            : []),
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
                                <StatusBadge status={user.status} />
                            )
                        },
                        {
                            name: "Profile",
                            cell: (user: User) => {
                                const missing = user.profile_missing_fields?.length
                                    ? user.profile_missing_fields
                                          .map((f) => f.replace(/_/g, " "))
                                          .join(", ")
                                    : "";
                                if (user.profile_complete === true) {
                                    return (
                                        <span
                                            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800"
                                            title="Required fields for submissions are filled"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                                            Complete
                                        </span>
                                    );
                                }
                                if (user.profile_complete === false) {
                                    return (
                                        <span
                                            className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900"
                                            title={missing ? `Missing: ${missing}` : "Profile incomplete"}
                                        >
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                            <span className="truncate">Incomplete</span>
                                        </span>
                                    );
                                }
                                return (
                                    <span
                                        className="inline-flex items-center gap-1.5 text-xs text-slate-400"
                                        title="Upgrade API or redeploy backend to see profile status"
                                    >
                                        <MinusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                        —
                                    </span>
                                );
                            },
                        },
                        {
                            id: "createdAt",
                            sortField: "createdAt",
                            name: "Joined Date",
                            selector: (user: User) => user.joinDate,
                            sortable: true,
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
                                        className="p-2.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>
                            )
                        }
                    ]}
                    data={users}
                    progressPending={isLoading}
                    pagination={false}
                    highlightOnHover
                    responsive

                    /* 🔥 IMPORTANT FIX */
                    customStyles={{
                        headRow: {
                            style: {
                                minHeight: "44px",
                                borderBottomWidth: "1px",
                                borderBottomColor: "#e2e8f0",
                            },
                        },
                        headCells: {
                            style: {
                                fontSize: "11px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                color: "#64748b",
                            },
                        },
                        table: {
                            style: {
                                overflow: "visible",
                            },
                        },
                        tableWrapper: {
                            style: {
                                overflow: "visible",
                            },
                        },
                        rows: {
                            style: {
                                overflow: "visible",
                                position: "relative",
                                minHeight: "56px",
                                borderBottomColor: "#f1f5f9",
                            },
                        },
                        cells: {
                            style: {
                                overflow: "visible",
                                paddingTop: "10px",
                                paddingBottom: "10px",
                            },
                        },
                    }}
                />

                {!isLoading && totalUsers > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 px-4 py-3 border-t border-slate-100 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Rows per page</span>
                            <select
                                className="border border-slate-200 rounded-md py-1 pl-2 pr-7 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                                value={itemsPerPage}
                                onChange={(e) => changeItemsPerPage(Number(e.target.value))}
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
                                {rangeStart}-{rangeEnd} of {totalUsers}
                            </span>
                            <div className="flex items-center gap-0.5">
                                <button
                                    type="button"
                                    aria-label="First page"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage(1)}
                                    className="p-2.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Previous page"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                    className="p-2.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next page"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                    className="p-2.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Last page"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="p-2.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
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
                        className="fixed z-[10000] w-56 rounded-lg border border-slate-100 bg-white py-1 shadow-xl"
                        style={{ left: actionMenu.x, top: actionMenu.y }}
                        role="menu"
                    >
                        <button
                            type="button"
                            onClick={() => openEditModal(actionMenuUser)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                            <Edit className="h-4 w-4 shrink-0" /> Edit
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setResetTarget(actionMenuUser);
                                setActionMenu(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                            <Mail className="h-4 w-4 shrink-0" /> Send password reset email
                        </button>
                        <button
                            type="button"
                            disabled={isSelf(actionMenuUser)}
                            title={isSelf(actionMenuUser) ? "You cannot delete your own account" : undefined}
                            onClick={() => {
                                setDeleteTarget(actionMenuUser);
                                setActionMenu(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            <Trash2 className="h-4 w-4 shrink-0" /> Delete
                        </button>
                    </div>,
                    document.body
                )}

            {/* Modals Overlay */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200 sm:p-8">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                                {isAddModalOpen ? "Add New User" : "Edit User"}
                            </h2>
                            <button type="button" aria-label="Close" onClick={closeModals} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={isAddModalOpen ? handleAddUser : handleEditUser} className="space-y-4">
                            {formError && (
                                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 break-words">
                                    {formError}
                                </div>
                            )}
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
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.role}
                                        disabled={isEditModalOpen && isSelf(selectedUser)}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="student">Student</option>
                                        <option value="faculty">Faculty</option>
                                        <option value="university">University</option>
                                        <option value="ngo">NGO</option>
                                        <option value="corporate">Corporate</option>
                                        <option value="investor">Investor / VC</option>
                                        <option value="organization_admin">Org Admin</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.status}
                                        disabled={isEditModalOpen && isSelf(selectedUser)}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        {statusSelectOptions.map((st) => (
                                            <option key={st} value={st}>
                                                {statusOptionLabel(st)}
                                            </option>
                                        ))}
                                    </select>
                                    {isEditModalOpen && isSelf(selectedUser) && (
                                        <p className="mt-1 text-xs text-slate-500">You cannot change your own role or status.</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">
                                    {isAddModalOpen ? "Password" : "New Password (Optional)"}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showFormPassword ? "text" : "password"}
                                        required={isAddModalOpen}
                                        minLength={8}
                                        autoComplete="new-password"
                                        className="w-full px-4 py-2 pr-11 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowFormPassword((v) => !v)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                        title={showFormPassword ? "Hide password" : "Show password"}
                                        aria-label={showFormPassword ? "Hide password" : "Show password"}
                                    >
                                        {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors mt-2 inline-flex items-center justify-center gap-2 disabled:opacity-60">
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                                {isAddModalOpen ? "Create User" : "Save Changes"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete ${deleteTarget?.name ?? "user"}?`}
                description={`This permanently deletes ${deleteTarget?.name ?? "this user"} (${deleteTarget?.email ?? ""}). This cannot be undone.`}
                confirmLabel="Delete user"
                variant="danger"
                loading={isSubmitting}
                onConfirm={confirmDeleteUser}
                onCancel={() => setDeleteTarget(null)}
            />
            <ConfirmDialog
                open={!!resetTarget}
                title="Send password reset email?"
                description={`A password reset link will be emailed to ${resetTarget?.name ?? "the user"} (${resetTarget?.email ?? ""}).`}
                confirmLabel="Send email"
                loading={isSubmitting}
                onConfirm={confirmSendReset}
                onCancel={() => setResetTarget(null)}
            />
            <ConfirmDialog
                open={!!statusConfirm}
                title={`Update ${statusConfirm?.user.name ?? "user"}?`}
                description={
                    statusConfirm
                        ? [
                              statusConfirm.from !== statusConfirm.to
                                  ? `Status for ${statusConfirm.user.name} (${statusConfirm.user.email}) will change from ${statusOptionLabel(statusConfirm.from)} to ${statusOptionLabel(statusConfirm.to)}.`
                                  : "",
                              statusConfirm.user.role !== statusConfirm.role
                                  ? `Role will change from ${formatRoleLabel(statusConfirm.user.role)} to ${formatRoleLabel(statusConfirm.role)}.`
                                  : "",
                          ]
                              .filter(Boolean)
                              .join(" ")
                        : ""
                }
                confirmLabel="Confirm change"
                variant="warning"
                loading={isSubmitting}
                onConfirm={saveEdit}
                onCancel={() => setStatusConfirm(null)}
            />
        </div>
    );
}
