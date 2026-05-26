"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { Archive, FileDown, Loader2, Search } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

type ProjectEvidenceRow = {
    id: string;
    title: string;
    status: string;
    organization_name: string;
    report_count: number;
    evidence_file_count: number;
};

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
            return {
                id,
                title: String(r.title ?? "Untitled"),
                status: String(r.status ?? "—"),
                organization_name: String(r.organization_name ?? "—"),
                report_count: Number(r.report_count) || 0,
                evidence_file_count: Number(r.evidence_file_count) || 0,
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

export default function AdminProjectEvidencePage() {
    const [rows, setRows] = useState<ProjectEvidenceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
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

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(
            (r) =>
                r.title.toLowerCase().includes(q) ||
                r.organization_name.toLowerCase().includes(q) ||
                r.id.toLowerCase().includes(q),
        );
    }, [rows, search]);

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
                <div className="py-2">
                    <p className="font-semibold text-slate-900">{row.title}</p>
                    <p className="text-xs text-slate-500">{row.id}</p>
                </div>
            ),
        },
        {
            name: "Organization",
            selector: (row) => row.organization_name,
            sortable: true,
        },
        {
            name: "Status",
            selector: (row) => row.status,
            sortable: true,
            cell: (row) => (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">
                    {row.status}
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

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-md flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title, organization, or ID…"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <p className="text-sm text-slate-500">
                    {filtered.length} project{filtered.length === 1 ? "" : "s"}
                </p>
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
                    highlightOnHover
                    responsive
                    noDataComponent={
                        <p className="py-12 text-center text-sm text-slate-500">No projects found.</p>
                    }
                />
            </div>
        </div>
    );
}
