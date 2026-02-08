"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, FileText, Image, Clock, ExternalLink } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";

export default function PartnerVerificationPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [pendingItems, setPendingItems] = useState<any[]>([]);

    useEffect(() => {
        fetchVerifications();
    }, []);

    const fetchVerifications = async () => {
        try {
            const res = await authenticatedFetch(`/api/v1/verifications?status=pending`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setPendingItems(data.data || []);
                }
            }
        } catch (error) {
            console.error("Failed to fetch verifications", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        try {
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/verifications/${id}/approve`, { method: 'POST' });
            if (res && res.ok) {
                setPendingItems(prev => prev.filter(item => item.id !== id));
            }
        } catch (error) {
            console.error("Failed to approve", error);
        }
    };

    const handleReject = async (id: number) => {
        try {
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/verifications/${id}/reject`, { method: 'POST' });
            if (res && res.ok) {
                setPendingItems(prev => prev.filter(item => item.id !== id));
            }
        } catch (error) {
            console.error("Failed to reject", error);
        }
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Verification & Approval</h1>
                <p className="text-slate-500">Review and verify student activities and reports.</p>
            </div>

            <div className="space-y-6">
                {pendingItems.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                        <CheckCircle className="w-16 h-16 text-green-100 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">All Caught Up!</h3>
                        <p className="text-slate-500">No pending items for verification.</p>
                    </div>
                ) : (
                    pendingItems.map((item) => (
                        <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6">
                            {/* Evidence Preview (Mock) */}
                            <div className="w-full md:w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                {item.evidence.endsWith('pdf') ? <FileText className="w-10 h-10 text-slate-400" /> : <Image className="w-10 h-10 text-slate-400" />}
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-800 text-lg">{item.student}</h3>
                                    <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase tracking-wide">{item.type}</span>
                                </div>
                                <p className="text-slate-600 mb-4">{item.content}</p>
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Submitted: {item.date}</span>
                                    <button className="flex items-center gap-1 text-blue-600 hover:underline font-medium">
                                        <ExternalLink className="w-4 h-4" /> View Evidence
                                    </button>
                                </div>
                            </div>

                            <div className="flex md:flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 min-w-[140px]">
                                <button
                                    onClick={() => handleApprove(item.id)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition-colors"
                                >
                                    <CheckCircle className="w-4 h-4" /> Approve
                                </button>
                                <button
                                    onClick={() => handleReject(item.id)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
