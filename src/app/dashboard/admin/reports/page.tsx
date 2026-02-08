"use client";

import { useState, useEffect } from "react";
import { Flag, Eye, MessageSquare, AlertTriangle, CheckCircle } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";

export default function AdminReportsPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            setIsLoading(true);
            try {
                const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/reports`);
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setReports(data.data || []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch reports", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReports();
    }, []);

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Reports & Moderation</h1>
            <p className="text-slate-500 mb-8">Handle user reports, flags, and system alerts.</p>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs font-bold tracking-wider">
                        <tr>
                            <th className="p-6">Report Subject</th>
                            <th className="p-6">Type</th>
                            <th className="p-6">Reporter</th>
                            <th className="p-6">Severity</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">Loading reports...</td>
                            </tr>
                        ) : reports.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">No reports found.</td>
                            </tr>
                        ) : (
                            reports.map((report) => (
                                <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6">
                                        <div className="font-bold text-slate-900">{report.subject}</div>
                                        <div className="text-xs text-slate-500">ID: #{report.id}</div>
                                    </td>
                                    <td className="p-6">
                                        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            {report.type === 'Content' ? <MessageSquare className="w-4 h-4 text-blue-500" /> : <Flag className="w-4 h-4 text-red-500" />}
                                            {report.type}
                                        </span>
                                    </td>
                                    <td className="p-6 text-sm text-slate-600">{report.reporter}</td>
                                    <td className="p-6">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                                            ${report.severity === 'high' ? 'bg-red-100 text-red-700' :
                                                report.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {report.severity}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        {report.status === 'pending' ? (
                                            <span className="text-amber-600 text-xs font-bold uppercase bg-amber-50 px-2 py-1 rounded">Pending</span>
                                        ) : (
                                            <span className="text-green-600 text-xs font-bold uppercase bg-green-50 px-2 py-1 rounded">Resolved</span>
                                        )}
                                    </td>
                                    <td className="p-6 text-right">
                                        <button className="text-blue-600 hover:text-blue-800 font-bold text-sm mr-4">Review</button>
                                        <button className="text-slate-400 hover:text-slate-600"><Eye className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
