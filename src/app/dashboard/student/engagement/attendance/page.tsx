"use client";

import { useState, useEffect } from "react";
import { Loader2, ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import AttendanceForm from "../components/AttendanceForm";
import AttendanceSummaryTable from "../components/AttendanceSummaryTable";

export default function AttendancePage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [participantId, setParticipantId] = useState<string | null>(null);

    const loadEntries = async (pId: string) => {
        try {
            const res = await authenticatedFetch(`/api/v1/engagement/${pId}/attendance`);
            if (res && res.ok) {
                const result = await res.json();
                setEntries(result.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const res = await authenticatedFetch(`/api/v1/engagement/my`);
                if (res && res.ok) {
                    const result = await res.json();
                    if (result.success && result.data.length > 0) {
                        const pId = result.data[0].id;
                        setParticipantId(pId);
                        await loadEntries(pId);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <Link href="/dashboard/student/engagement" className="group flex items-center gap-1.5 text-slate-400 hover:text-blue-600 transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        <span className="text-xs font-black uppercase tracking-widest">Back to Overview</span>
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Attendance Logging</h1>
                    <p className="text-slate-500 font-medium">Every session counts towards your HEC recognition</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                <div className="lg:col-span-2">
                    {participantId && <AttendanceForm participantId={participantId} onSuccess={() => loadEntries(participantId)} />}
                </div>

                <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" /> Attendance History
                        </h3>
                        <p className="text-xs font-bold text-slate-400">{entries.length} Sessions Logged</p>
                    </div>
                    <AttendanceSummaryTable entries={entries} />
                </div>
            </div>
        </div>
    );
}
