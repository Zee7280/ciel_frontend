"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Terminal, Loader2, Search, Filter } from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { authenticatedFetch } from "@/utils/api";

export default function AdminAuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [totalItems, setTotalItems] = useState(0);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            // Note: Backend pagination implemented, passing page/limit
            const res = await authenticatedFetch(`/api/v1/admin/audit-logs?page=${currentPage}&limit=${itemsPerPage}`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setLogs(data.data || []);
                    setTotalItems(data.meta?.total || 0); // Assuming meta.total if backend sends it, otherwise length
                }
            }
        } catch (error) {
            console.error("Failed to fetch audit logs", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [currentPage]); // Refetch on page change

    const displayedLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="p-0 lg:p-8">
            <div className="mb-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                    <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">Audit Logs</h1>
                    <p className="text-slate-500">System security and action logs.</p>
                </div>
                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-slate-900 p-4 font-mono text-sm text-slate-300 shadow-2xl sm:p-6">
                <div className="flex items-center gap-2 mb-6 text-slate-400 border-b border-slate-800 pb-4">
                    <Terminal className="w-5 h-5" /> system_audit.log
                </div>
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                        </div>
                    ) : displayedLogs.length === 0 ? (
                        <div className="text-center p-8 text-slate-500">No logs found.</div>
                    ) : (
                        displayedLogs.map((log) => (
                            <div key={log.id} className="group flex flex-col gap-2 rounded border-b border-slate-800/50 p-3 transition-colors last:border-0 hover:bg-slate-800 md:flex-row md:items-center md:gap-8">
                                <span className="min-w-0 text-xs text-slate-500 md:min-w-[160px]">
                                    {log.created_at ? new Date(log.created_at).toLocaleString() : "N/A"}
                                </span>
                                <span className={`w-fit min-w-0 rounded bg-slate-800/50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider md:min-w-[140px]
                                    ${log.action.includes('FAIL') || log.action.includes('REJECT') ? 'text-red-400' :
                                        log.action.includes('DELETE') ? 'text-amber-400' : 'text-blue-400'}`}>
                                    {log.action}
                                </span>
                                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                                    <span className="text-slate-200 font-medium">{log.user || "System"}</span>
                                    {log.user_email && <span className="text-slate-600 text-xs hidden md:inline">&lt;{log.user_email}&gt;</span>}
                                    <span className="text-slate-600 hidden md:inline">→</span>
                                    <span className="text-emerald-400">{log.target || "N/A"}</span>
                                    {log.target_type && <span className="text-slate-600 text-xs italic">({log.target_type})</span>}
                                </div>
                                <div className="text-left md:text-right">
                                    <span className="text-slate-600 text-xs block">{log.ip}</span>
                                    {log.details && (
                                        <span className="text-slate-500 text-[10px] mt-1 block max-w-[200px] truncate">
                                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                <div className="mt-6 pt-4 border-t border-slate-800">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                        <div>
                            Page {currentPage} of {Math.max(1, totalPages)}
                        </div>
                        <div className="flex gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                [ Previous ]
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                [ Next ]
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
