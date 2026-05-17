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
    CheckCircle2,
    AlertCircle,
    MinusCircle,
    Eye,
    EyeOff,
    Copy,
    Lock,
    Info,
} from "lucide-react";
import { toast } from "sonner";
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
    /** Super-admin only: decrypted password copy from backend */
    stored_password?: string | null;
    /** From backend `findAllForAdmin`; absent on older APIs */
    profile_complete?: boolean;
    profile_missing_fields?: string[];
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
    const [showPasswordColumn, setShowPasswordColumn] = useState(false);
    const [revealedPasswordIds, setRevealedPasswordIds] = useState<Record<string, boolean>>({});

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
                stored_password:
                    typeof u.stored_password === "string" && u.stored_password.trim()
                        ? u.stored_password
                        : null,
                profile_complete: typeof u.profile_complete === "boolean" ? u.profile_complete : undefined,
                profile_missing_fields: Array.isArray(u.profile_missing_fields) ? u.profile_missing_fields : undefined,
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

    const storedPasswordCount = users.filter((u) => u.stored_password).length;

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
        <div className="relative p-0 lg:p-8">
            <div className="mb-5 space-y-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">User Management</h1>
                    <p className="mt-1 text-sm text-slate-600">Manage registered users, roles, and account status.</p>
                    <p className="mt-2 text-xs font-medium text-slate-500">
                        {isLoading ? "Loading…" : `${filteredUsers.length} user${filteredUsers.length === 1 ? "" : "s"} shown`}
                        {roleFilter !== "all" ? ` · ${formatRoleLabel(roleFilter)}` : ""}
                    </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:w-auto xl:justify-end">
                    {/* Search */}
                    <div className="relative min-w-0 flex-1 sm:min-w-[220px] sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name or email…"
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
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="all">All roles</option>
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
                        onClick={() => {
                            setFormData({ name: "", email: "", password: "", role: "student", status: "active" });
                            setIsAddModalOpen(true);
                        }}
                        className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        Add user
                    </button>
                </div>
                </div>

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
                                                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
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
                                                      onClick={() => copyStoredPassword(stored)}
                                                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
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
                                <span
                                    className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold capitalize ${user.status === "active"
                                        ? "border-slate-200 bg-slate-50 text-slate-700"
                                        : user.status === "pending"
                                            ? "border-amber-200 bg-amber-50 text-amber-800"
                                            : "border-red-200 bg-red-50 text-red-700"
                                        }`}
                                >
                                    {user.status}
                                </span>
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
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200 sm:p-8">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
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
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
