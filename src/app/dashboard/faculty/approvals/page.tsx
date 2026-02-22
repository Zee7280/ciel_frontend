"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, Eye, Filter } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/dashboard/student/report/components/ui/card";
import { toast } from "sonner";

export default function FacultyApprovalsPage() {
    const [pendingProjects, setPendingProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPendingProjects();
    }, []);

    const fetchPendingProjects = async () => {
        try {
            const res = await authenticatedFetch(`/api/v1/faculty/approvals?status=pending`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setPendingProjects(data.data || []);
                }
            }
        } catch (error) {
            console.error("Failed to fetch approvals", error);
            toast.error("Failed to load pending projects");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        try {
            const res = await authenticatedFetch(`/api/v1/faculty/approvals/${id}/approve`, {
                method: 'POST'
            });
            if (res && res.ok) {
                toast.success("Project Approved Successfully");
                setPendingProjects(prev => prev.filter(p => p.id !== id));
            } else {
                toast.error("Failed to approve project");
            }
        } catch (error) {
            console.error("Failed to approve", error);
            toast.error("Error connecting to server");
        }
    };

    const handleReject = async (id: number) => {
        try {
            const res = await authenticatedFetch(`/api/v1/faculty/approvals/${id}/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason: "Faculty rejected" })
            });
            if (res && res.ok) {
                toast.error("Project Rejected");
                setPendingProjects(prev => prev.filter(p => p.id !== id));
            } else {
                toast.error("Failed to reject project");
            }
        } catch (error) {
            console.error("Failed to reject", error);
            toast.error("Error connecting to server");
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 pb-20">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Student Project Approvals</h1>
                <p className="text-slate-500">Review and approve initial project proposals from students.</p>
            </div>

            <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by student name or ID..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-10">
                        <Filter className="w-4 h-4 mr-2" /> Filter Status
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                {pendingProjects.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">All Caught Up!</h3>
                        <p className="text-slate-500">No pending approvals at the moment.</p>
                    </div>
                ) : (
                    pendingProjects.map((project) => (
                        <Card key={project.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                <div className="p-6 flex-1 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-lg text-slate-900">{project.projectTitle}</h3>
                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                    <Clock className="w-3 h-3 mr-1" /> Pending Review
                                                </Badge>
                                            </div>
                                            <p className="text-slate-500 text-sm flex items-center gap-4">
                                                <span>Student: <strong className="text-slate-700">{project.studentName}</strong> ({project.studentId})</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>{project.submittedDate}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Primary SDG</p>
                                            <p className="font-medium text-slate-800">{project.sdg}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Proposed Duration</p>
                                            <p className="font-medium text-slate-800">Feb 15 - Mar 01 (2 Weeks)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border-l border-slate-100 p-6 flex flex-row md:flex-col justify-center gap-3 w-full md:w-48">
                                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleApprove(project.id)}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                    </Button>
                                    <Button variant="destructive" className="w-full" onClick={() => handleReject(project.id)}>
                                        <XCircle className="w-4 h-4 mr-2" /> Reject
                                    </Button>
                                    <Button variant="ghost" className="w-full">
                                        <Eye className="w-4 h-4 mr-2" /> View Details
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
