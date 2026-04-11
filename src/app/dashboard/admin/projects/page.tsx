"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import DataTable from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { Search, Filter, MoreVertical, Briefcase, MapPin, Loader2, Eye, FileDown } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

type AdminProjectRow = {
    id: string;
    title: string;
    subtitle: string;
    displayStatus: string;
    statusKey: string;
    locationLabel: string;
    locationKey: string;
    volunteers: number;
    hours: number;
    raw: Record<string, unknown>;
};

function lower(v: unknown): string {
    if (v == null) return "";
    return String(v).trim().toLowerCase();
}

function extractAdminProjectsList(body: unknown): Record<string, unknown>[] {
    if (Array.isArray(body)) return body as Record<string, unknown>[];
    if (body && typeof body === "object") {
        const o = body as Record<string, unknown>;
        if (o.success === false && !Array.isArray(o.data)) return [];
        for (const k of ["data", "projects", "opportunities", "items", "results", "rows"] as const) {
            const v = o[k];
            if (Array.isArray(v)) return v as Record<string, unknown>[];
        }
    }
    return [];
}

function pickLocation(p: Record<string, unknown>): string {
    const loc = p.location;
    if (typeof loc === "string" && loc.trim()) return loc.trim();
    if (loc && typeof loc === "object") {
        const l = loc as Record<string, unknown>;
        const city = typeof l.city === "string" ? l.city : "";
        const venue = typeof l.venue === "string" ? l.venue : "";
        const joined = [venue, city].filter(Boolean).join(", ");
        if (joined) return joined;
    }
    if (typeof p.city === "string" && p.city.trim()) return p.city.trim();
    return "Unknown";
}

function subtitleFromRaw(raw: Record<string, unknown>): string {
    const c = raw.creator && typeof raw.creator === "object" ? (raw.creator as Record<string, unknown>) : null;
    const fromCreator = c && typeof c.name === "string" ? c.name.trim() : "";
    return (
        (typeof raw.partner_name === "string" && raw.partner_name.trim()) ||
        (typeof raw.org === "string" && raw.org.trim()) ||
        (typeof raw.organization_name === "string" && raw.organization_name.trim()) ||
        fromCreator ||
        "—"
    );
}

function normalizeAdminProjectRow(raw: Record<string, unknown>): AdminProjectRow | null {
    const id = String(raw.id ?? raw.opportunity_id ?? "").trim();
    if (!id) return null;
    const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Untitled";
    const workflow = lower(raw.workflow_stage ?? raw.approval_stage);
    const status = lower(raw.status);
    const fac = lower(raw.faculty_approval_status);
    const part = lower(raw.partner_approval_status);

    let statusKey = workflow || status || "unknown";
    if (!workflow && status === "pending" && fac === "pending") statusKey = "pending_faculty";
    if (!workflow && fac === "approved" && part === "pending") statusKey = "pending_partner";

    let displayStatus = statusKey.replace(/_/g, " ").trim() || "unknown";
    if (workflow) displayStatus = String(raw.workflow_stage ?? raw.approval_stage ?? displayStatus).replace(/_/g, " ");
    else if (status) displayStatus = String(raw.status).replace(/_/g, " ");
    displayStatus = displayStatus.toUpperCase();

    const timeline = raw.timeline && typeof raw.timeline === "object" ? (raw.timeline as Record<string, unknown>) : null;
    const volunteers =
        Number(raw.volunteers ?? raw.volunteers_count ?? raw.volunteers_required ?? timeline?.volunteers_required) || 0;
    const hours =
        Number(raw.hours ?? raw.total_hours ?? raw.verified_hours ?? timeline?.expected_hours ?? raw.impact_hours) || 0;

    return {
        id,
        title,
        subtitle: subtitleFromRaw(raw),
        displayStatus,
        statusKey,
        locationLabel: pickLocation(raw),
        locationKey: pickLocation(raw).toLowerCase(),
        volunteers,
        hours,
        raw,
    };
}

function statusBadgeClass(statusKey: string): string {
    const s = statusKey.toLowerCase();
    if (s === "active" || s === "live" || s === "approved") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (s === "completed") return "bg-blue-50 text-blue-700 border border-blue-200";
    if (s === "rejected") return "bg-rose-50 text-rose-700 border border-rose-200";
    if (s.includes("pending_faculty") || s === "pending_faculty" || s.includes("faculty"))
        return "bg-slate-100 text-slate-700 border border-slate-200";
    if (s.includes("pending_partner") || s.includes("partner")) return "bg-violet-50 text-violet-800 border border-violet-200";
    if (s.includes("pending_admin") || s.includes("pending_approval") || s.includes("admin"))
        return "bg-amber-50 text-amber-800 border border-amber-200";
    return "bg-slate-50 text-slate-600 border border-slate-200";
}

export default function AdminProjectsPage() {
    const [rows, setRows] = useState<AdminProjectRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");
    const [activeMenu, setActiveMenu] = useState<{ id: string; top: number; right: number } | null>(null);

    const loadProjects = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/projects`);
            if (!res || !res.ok) {
                const err = res ? await res.json().catch(() => ({})) : {};
                toast.error(typeof (err as { error?: string }).error === "string" ? (err as { error: string }).error : "Could not load projects");
                setRows([]);
                return;
            }
            const data = await res.json();
            const list = extractAdminProjectsList(data);
            const mapped = list.map(normalizeAdminProjectRow).filter(Boolean) as AdminProjectRow[];
            setRows(mapped);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load projects");
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadProjects();
    }, [loadProjects]);

    useEffect(() => {
        if (!activeMenu) return;
        if (!rows.some((r) => r.id === activeMenu.id)) {
            setActiveMenu(null);
            return;
        }
        const close = () => setActiveMenu(null);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [activeMenu, rows]);

    const statusOptions = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => set.add(r.statusKey));
        return ["all", ...Array.from(set).sort()];
    }, [rows]);

    const locationOptions = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => {
            if (r.locationLabel && r.locationLabel !== "Unknown") set.add(r.locationLabel);
        });
        return ["all", ...Array.from(set).sort()];
    }, [rows]);

    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return rows.filter((r) => {
            if (statusFilter !== "all" && r.statusKey !== statusFilter) return false;
            if (locationFilter !== "all" && r.locationLabel !== locationFilter) return false;
            if (!q) return true;
            return (
                r.title.toLowerCase().includes(q) ||
                r.subtitle.toLowerCase().includes(q) ||
                r.locationLabel.toLowerCase().includes(q) ||
                r.displayStatus.toLowerCase().includes(q)
            );
        });
    }, [rows, searchQuery, statusFilter, locationFilter]);

    const handleExport = () => {
        if (!filteredRows.length) {
            toast.message("No rows to export");
            return;
        }
        const headers = ["ID", "Title", "Organization / creator", "Status", "Volunteers", "Hours", "Location"];
        const csvContent = [
            headers.join(","),
            ...filteredRows.map((r) =>
                [
                    r.id,
                    `"${r.title.replace(/"/g, '""')}"`,
                    `"${r.subtitle.replace(/"/g, '""')}"`,
                    `"${r.displayStatus.replace(/"/g, '""')}"`,
                    r.volunteers,
                    r.hours,
                    `"${r.locationLabel.replace(/"/g, '""')}"`,
                ].join(","),
            ),
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `projects_report_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Export started");
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await authenticatedFetch(`/api/v1/admin/opportunities/${id}/status`, {
                method: "PUT",
                body: JSON.stringify({ status: newStatus }),
            });
            if (res?.ok) {
                toast.success("Status updated");
                setActiveMenu(null);
                await loadProjects();
            } else {
                toast.error("Could not update status");
            }
        } catch {
            toast.error("Could not update status");
        }
    };

    const activeMenuRow = activeMenu ? rows.find((r) => r.id === activeMenu.id) : null;

    const columns: TableColumn<AdminProjectRow>[] = [
        {
            name: "Project",
            grow: 2,
            sortable: true,
            selector: (r) => r.title,
            cell: (r) => (
                <div className="py-2 pr-2">
                    <Link
                        href={`/dashboard/student/browse/${encodeURIComponent(r.id)}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                    >
                        {r.title}
                    </Link>
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                        <Briefcase className="w-3 h-3 shrink-0" />
                        <span className="line-clamp-1">{r.subtitle}</span>
                    </div>
                </div>
            ),
        },
        {
            name: "Status",
            sortable: true,
            selector: (r) => r.displayStatus,
            cell: (r) => (
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(r.statusKey)}`}
                >
                    {r.displayStatus}
                </span>
            ),
        },
        {
            name: "Location",
            sortable: true,
            selector: (r) => r.locationLabel,
            cell: (r) => (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="line-clamp-2">{r.locationLabel}</span>
                </div>
            ),
        },
        {
            name: "Volunteers",
            sortable: true,
            width: "120px",
            selector: (r) => r.volunteers,
            cell: (r) => (
                <div className="text-center w-full">
                    <span className="text-sm font-bold text-slate-900">{r.volunteers}</span>
                </div>
            ),
        },
        {
            name: "Hours",
            sortable: true,
            width: "100px",
            selector: (r) => r.hours,
            cell: (r) => (
                <div className="text-center w-full">
                    <span className="text-sm font-bold text-slate-900">{r.hours}</span>
                </div>
            ),
        },
        {
            name: "Actions",
            width: "88px",
            cell: (r) => (
                <div className="relative flex justify-end py-1 w-full">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setActiveMenu((prev) =>
                                prev?.id === r.id
                                    ? null
                                    : { id: r.id, top: rect.bottom + 6, right: window.innerWidth - rect.right },
                            );
                        }}
                        className="admin-project-menu-trigger text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
                        aria-label="Actions"
                        aria-expanded={activeMenu?.id === r.id}
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Projects Overview</h1>
                    <p className="text-slate-500 mt-1 text-base">Monitor all active and past social impact projects.</p>
                </div>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={!filteredRows.length}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FileDown className="w-4 h-4" /> Export report
                </button>
            </div>

            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="search"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none font-medium text-slate-700 text-sm"
                    />
                </div>
                <div className="flex flex-wrap gap-3 shrink-0">
                    <div className="relative min-w-[160px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none appearance-none cursor-pointer"
                            aria-label="Filter by status"
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt === "all" ? "All statuses" : opt.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="relative min-w-[160px]">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none appearance-none cursor-pointer"
                            aria-label="Filter by location"
                        >
                            {locationOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt === "all" ? "All locations" : opt}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-visible min-h-[320px]">
                {filteredRows.length === 0 && !isLoading ? (
                    <div className="text-center py-24 px-4">
                        <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">No projects found</h3>
                        <p className="text-slate-500 text-sm mt-1">Try adjusting search or filters, or check the API response.</p>
                    </div>
                ) : (
                    <DataTable<AdminProjectRow>
                        columns={columns}
                        data={filteredRows}
                        progressPending={isLoading}
                        pagination
                        paginationPerPage={10}
                        paginationRowsPerPageOptions={[10, 25, 50, 100]}
                        highlightOnHover
                        responsive
                        dense
                        customStyles={{
                            headRow: {
                                style: {
                                    backgroundColor: "#f8fafc",
                                    borderBottomWidth: "1px",
                                    borderBottomColor: "#e2e8f0",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    color: "#64748b",
                                },
                            },
                            table: { style: { overflow: "visible" } },
                            tableWrapper: { style: { overflow: "visible" } },
                            rows: { style: { overflow: "visible", position: "relative" } },
                            cells: { style: { overflow: "visible" } },
                        }}
                    />
                )}
                {activeMenu && activeMenuRow && (
                    <>
                        <div className="fixed inset-0 z-40" aria-hidden onClick={() => setActiveMenu(null)} />
                        <div
                            role="menu"
                            className="admin-project-menu-panel fixed w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden text-left py-0.5"
                            style={{ top: activeMenu.top, right: activeMenu.right }}
                        >
                            <Link
                                href={`/dashboard/student/browse/${encodeURIComponent(activeMenuRow.id)}`}
                                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => setActiveMenu(null)}
                            >
                                <Eye className="w-4 h-4" /> View details
                            </Link>
                            {lower(activeMenuRow.raw.status) === "active" && (
                                <button
                                    type="button"
                                    onClick={() => void handleStatusUpdate(activeMenuRow.id, "pending_approval")}
                                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                >
                                    Revert to pending
                                </button>
                            )}
                            {lower(activeMenuRow.raw.status) === "pending_approval" && (
                                <button
                                    type="button"
                                    onClick={() => void handleStatusUpdate(activeMenuRow.id, "active")}
                                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 flex items-center gap-2"
                                >
                                    Mark active
                                </button>
                            )}
                            {lower(activeMenuRow.raw.status) !== "rejected" && (
                                <button
                                    type="button"
                                    onClick={() => void handleStatusUpdate(activeMenuRow.id, "rejected")}
                                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    Reject
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
