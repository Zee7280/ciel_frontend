"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import {
    Archive,
    Building2,
    Copy,
    FileDown,
    Filter,
    GraduationCap,
    Loader2,
    Search,
    X,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

type ProjectEvidenceRow = {
    id: string;
    title: string;
    status: string;
    organization_name: string;
    report_count: number;
    evidence_file_count: number;
    faculty_id: string | null;
    faculty_name: string | null;
    faculty_email: string | null;
};

type EvidencePresenceFilter = "all" | "with_evidence" | "without_evidence";

const UNASSIGNED_FACULTY = "__unassigned__";

function facultyFilterKey(row: ProjectEvidenceRow): string {
    if (row.faculty_email) return row.faculty_email;
    if (row.faculty_id) return `id:${row.faculty_id}`;
    if (row.faculty_name) return `name:${row.faculty_name.toLowerCase()}`;
    return UNASSIGNED_FACULTY;
}

function facultyDisplayLabel(row: ProjectEvidenceRow): string {
    if (row.faculty_name && row.faculty_email) return `${row.faculty_name} (${row.faculty_email})`;
    if (row.faculty_name) return row.faculty_name;
    if (row.faculty_email) return row.faculty_email;
    return "Unassigned";
}

function statusBadgeClass(status: string): string {
    const s = status.toLowerCase();
    if (s === "active" || s === "live" || s === "approved") {
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (s === "completed" || s === "closed") {
        return "bg-blue-50 text-blue-700 border border-blue-200";
    }
    if (s === "rejected" || s === "cancelled") {
        return "bg-rose-50 text-rose-700 border border-rose-200";
    }
    if (s.includes("revision") || s === "draft") {
        return "bg-amber-50 text-amber-800 border border-amber-200";
    }
    if (s.includes("pending_faculty") || s.includes("faculty")) {
        return "bg-violet-50 text-violet-800 border border-violet-200";
    }
    if (s.includes("pending") || s.includes("approval")) {
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
    return "bg-slate-50 text-slate-600 border border-slate-200";
}

function extractOverviewRows(body: unknown): ProjectEvidenceRow[] {
    if (!body || typeof body !== "object") return [];
    const o = body as Record<string, unknown>;
    const data = o.data;
    if (!data || typeof data !== "object") return [];
    const projects = (data as Record<string, unknown>).projects;
    if (!Array.isArray(projects)) return [];
    return projects
        .map((row): ProjectEvidenceRow | null => {
            if (!row || typeof row !== "object") return null;
            const r = row as Record<string, unknown>;
            const id = String(r.id ?? "").trim();
            if (!id) return null;
            const facultyName =
                typeof r.faculty_name === "string" && r.faculty_name.trim()
                    ? r.faculty_name.trim()
                    : null;
            const facultyEmail =
                typeof r.faculty_email === "string" && r.faculty_email.trim()
                    ? r.faculty_email.trim().toLowerCase()
                    : null;
            const facultyId =
                typeof r.faculty_id === "string" && r.faculty_id.trim() ? r.faculty_id.trim() : null;
            return {
                id,
                title: String(r.title ?? "Untitled"),
                status: String(r.status ?? "—"),
                organization_name: String(r.organization_name ?? "—"),
                report_count: Number(r.report_count) || 0,
                evidence_file_count: Number(r.evidence_file_count) || 0,
                faculty_id: facultyId,
                faculty_name: facultyName,
                faculty_email: facultyEmail,
            };
        })
        .filter((x): x is ProjectEvidenceRow => x !== null);
}

function parseFilenameFromDisposition(header: string | null): string | null {
    if (!header) return null;
    const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
    if (!match?.[1]) return null;
    try {
        return decodeURIComponent(match[1].replace(/"/g, "").trim());
    } catch {
        return match[1].replace(/"/g, "").trim();
    }
}

async function copyProjectId(id: string) {
    try {
        await navigator.clipboard.writeText(id);
        toast.success("Project ID copied");
    } catch {
        toast.error("Could not copy ID");
    }
}

export default function AdminProjectEvidencePage() {
    const [rows, setRows] = useState<ProjectEvidenceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [facultyFilter, setFacultyFilter] = useState("all");
    const [organizationFilter, setOrganizationFilter] = useState("all");
    const [evidenceFilter, setEvidenceFilter] = useState<EvidencePresenceFilter>("all");
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const loadOverview = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch("/api/v1/admin/projects/evidence-overview", {}, { redirectToLogin: true });
            if (!res?.ok) {
                const body = await res?.json().catch(() => ({}));
                toast.error((body as { error?: string }).error || "Could not load projects");
                setRows([]);
                return;
            }
            const body = await res.json();
            setRows(extractOverviewRows(body));
        } catch {
            toast.error("Network error while loading projects");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadOverview();
    }, [loadOverview]);

    const statusOptions = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => {
            const s = r.status.trim();
            if (s) set.add(s);
        });
        return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }, [rows]);

    const organizationOptions = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => {
            const org = r.organization_name.trim();
            if (org && org !== "—") set.add(org);
        });
        return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }, [rows]);

    const facultyOptions = useMemo(() => {
        const byKey = new Map<string, string>();
        let hasUnassigned = false;
        rows.forEach((r) => {
            const key = facultyFilterKey(r);
            if (key === UNASSIGNED_FACULTY) {
                hasUnassigned = true;
                return;
            }
            if (!byKey.has(key)) byKey.set(key, facultyDisplayLabel(r));
        });
        const sorted = Array.from(byKey.entries()).sort((a, b) => a[1].localeCompare(b[1]));
        const options: { value: string; label: string }[] = [
            { value: "all", label: "All faculty" },
            ...sorted.map(([value, label]) => ({ value, label })),
        ];
        if (hasUnassigned) {
            options.push({ value: UNASSIGNED_FACULTY, label: "Unassigned faculty" });
        }
        return options;
    }, [rows]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((r) => {
            if (statusFilter !== "all" && r.status !== statusFilter) return false;
            if (organizationFilter !== "all" && r.organization_name !== organizationFilter) return false;
            if (facultyFilter !== "all" && facultyFilterKey(r) !== facultyFilter) return false;
            if (evidenceFilter === "with_evidence" && r.evidence_file_count <= 0) return false;
            if (evidenceFilter === "without_evidence" && r.evidence_file_count > 0) return false;
            if (!q) return true;
            const facultyHaystack = [r.faculty_name, r.faculty_email].filter(Boolean).join(" ").toLowerCase();
            return (
                r.title.toLowerCase().includes(q) ||
                r.organization_name.toLowerCase().includes(q) ||
                r.id.toLowerCase().includes(q) ||
                r.status.toLowerCase().includes(q) ||
                facultyHaystack.includes(q)
            );
        });
    }, [rows, search, statusFilter, organizationFilter, facultyFilter, evidenceFilter]);

    const hasActiveFilters =
        Boolean(search.trim()) ||
        statusFilter !== "all" ||
        facultyFilter !== "all" ||
        organizationFilter !== "all" ||
        evidenceFilter !== "all";

    const clearFilters = () => {
        setSearch("");
        setStatusFilter("all");
        setFacultyFilter("all");
        setOrganizationFilter("all");
        setEvidenceFilter("all");
    };

    const downloadEvidence = async (row: ProjectEvidenceRow) => {
        if (row.evidence_file_count === 0) {
            toast.message("No evidence files", { description: "This project has no uploaded evidence yet." });
            return;
        }
        setDownloadingId(row.id);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/projects/${encodeURIComponent(row.id)}/evidence/download`,
                {},
                { redirectToLogin: true },
            );
            if (!res?.ok) {
                const body = await res?.json().catch(() => ({}));
                toast.error((body as { error?: string }).error || "Download failed");
                return;
            }
            const blob = await res.blob();
            const filename =
                parseFilenameFromDisposition(res.headers.get("Content-Disposition")) ||
                `${row.title.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 40)}-evidence.zip`;
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            toast.success("Evidence ZIP downloaded");
        } catch {
            toast.error("Could not download evidence ZIP");
        } finally {
            setDownloadingId(null);
        }
    };

    const columns: TableColumn<ProjectEvidenceRow>[] = [
        {
            name: "Project",
            selector: (row) => row.title,
            sortable: true,
            grow: 2,
            cell: (row) => (
                <div className="py-2 pr-2">
                    <p className="font-semibold text-slate-900 leading-snug">{row.title}</p>
                    <button
                        type="button"
                        onClick={() => void copyProjectId(row.id)}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 transition"
                        title="Copy project ID"
                    >
                        <Copy className="h-3 w-3" />
                        <span className="font-mono">{row.id.slice(0, 8)}…</span>
                    </button>
                </div>
            ),
        },
        {
            name: "Organization",
            selector: (row) => row.organization_name,
            sortable: true,
            grow: 1.2,
            cell: (row) => (
                <span className="text-sm text-slate-700 line-clamp-2" title={row.organization_name}>
                    {row.organization_name}
                </span>
            ),
        },
        {
            name: "Faculty",
            selector: (row) => row.faculty_name || row.faculty_email || "",
            sortable: true,
            grow: 1.3,
            cell: (row) => {
                const name = row.faculty_name;
                const email = row.faculty_email;
                if (!name && !email) {
                    return <span className="text-sm text-slate-400">—</span>;
                }
                return (
                    <div className="py-1">
                        <p className="text-sm font-medium text-slate-800 leading-snug">{name || email}</p>
                        {name && email ? (
                            <p className="text-[11px] text-slate-500 truncate max-w-[200px]" title={email}>
                                {email}
                            </p>
                        ) : null}
                    </div>
                );
            },
        },
        {
            name: "Status",
            selector: (row) => row.status,
            sortable: true,
            width: "150px",
            cell: (row) => (
                <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusBadgeClass(row.status)}`}
                >
                    {row.status.replace(/_/g, " ")}
                </span>
            ),
        },
        {
            name: "Reports",
            selector: (row) => row.report_count,
            sortable: true,
            right: true,
            width: "100px",
        },
        {
            name: "Evidence files",
            selector: (row) => row.evidence_file_count,
            sortable: true,
            right: true,
            width: "130px",
        },
        {
            name: "Download",
            width: "160px",
            cell: (row) => (
                <button
                    type="button"
                    disabled={downloadingId === row.id || row.evidence_file_count === 0}
                    onClick={() => void downloadEvidence(row)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {downloadingId === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <FileDown className="h-4 w-4" />
                    )}
                    {downloadingId === row.id ? "Preparing…" : "Download ZIP"}
                </button>
            ),
            ignoreRowClick: true,
            button: true,
        },
    ];

    const selectClassName =
        "w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none appearance-none cursor-pointer";

    return (
        <div className="p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-700 to-slate-900 text-white shadow-lg">
                        <Archive className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Project evidence export</h1>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500 sm:text-base">
                            All projects with a count of linked evidence. Download every file for a project in one ZIP (impact
                            reports, section uploads, and attendance evidence).
                        </p>
                    </div>
                </div>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by project, organization, faculty, or ID…"
                            className="w-full rounded-xl border border-transparent bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50/50"
                        />
                    </div>
                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:shrink-0 xl:grid-cols-4">
                        <div className="relative min-w-0 sm:min-w-[150px]">
                            <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={selectClassName}
                                aria-label="Filter by status"
                            >
                                {statusOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt === "all" ? "All statuses" : opt.replace(/_/g, " ")}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="relative min-w-0 sm:min-w-[180px]">
                            <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <select
                                value={facultyFilter}
                                onChange={(e) => setFacultyFilter(e.target.value)}
                                className={selectClassName}
                                aria-label="Filter by faculty"
                            >
                                {facultyOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="relative min-w-0 sm:min-w-[160px]">
                            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <select
                                value={organizationFilter}
                                onChange={(e) => setOrganizationFilter(e.target.value)}
                                className={selectClassName}
                                aria-label="Filter by organization"
                            >
                                {organizationOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt === "all" ? "All organizations" : opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="relative min-w-0 sm:min-w-[150px]">
                            <Archive className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <select
                                value={evidenceFilter}
                                onChange={(e) => setEvidenceFilter(e.target.value as EvidencePresenceFilter)}
                                className={selectClassName}
                                aria-label="Filter by evidence"
                            >
                                <option value="all">All evidence</option>
                                <option value="with_evidence">Has evidence</option>
                                <option value="without_evidence">No evidence</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-2 pb-1">
                    <p className="text-sm text-slate-500">
                        <span className="font-semibold text-slate-700">{filtered.length}</span>
                        {" of "}
                        {rows.length} project{rows.length === 1 ? "" : "s"}
                        {hasActiveFilters ? " (filtered)" : ""}
                    </p>
                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                            <X className="h-3.5 w-3.5" />
                            Clear filters
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <DataTable
                    columns={columns}
                    data={filtered}
                    progressPending={loading}
                    progressComponent={
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                            <p className="text-sm font-medium text-slate-500">Loading projects…</p>
                        </div>
                    }
                    pagination
                    paginationPerPage={15}
                    paginationRowsPerPageOptions={[15, 30, 50, 100]}
                    highlightOnHover
                    responsive
                    noDataComponent={
                        <div className="py-12 text-center">
                            <p className="text-sm text-slate-500">
                                {hasActiveFilters
                                    ? "No projects match these filters."
                                    : "No projects found."}
                            </p>
                            {hasActiveFilters ? (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
                                >
                                    Clear filters
                                </button>
                            ) : null}
                        </div>
                    }
                />
            </div>
        </div>
    );
}
