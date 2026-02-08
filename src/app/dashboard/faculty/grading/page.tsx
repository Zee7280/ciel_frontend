"use client";

import { useState } from "react";
import { FileText, Download, CheckCircle, MessageSquare, Star } from "lucide-react";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/dashboard/student/report/components/ui/card";
import { Input } from "@/app/dashboard/student/report/components/ui/input";
import { Label } from "@/app/dashboard/student/report/components/ui/label";
import { Textarea } from "@/app/dashboard/student/report/components/ui/textarea";

export default function FacultyGradingPage() {
    const [selectedReport, setSelectedReport] = useState<number | null>(null);

    const reports = [
        {
            id: 1,
            studentName: "Ali Khan",
            projectTitle: "Community Clean-up Drive",
            submissionDate: "Jan 28, 2026",
            status: "Submitted",
            grade: null
        },
        {
            id: 2,
            studentName: "Fatima Ahmed",
            projectTitle: "Financial Literacy for Women",
            submissionDate: "Jan 25, 2026",
            status: "Graded",
            grade: "A"
        }
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 pb-20">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Student Grading</h1>
                <p className="text-slate-500">Review final impact reports and assign grades.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Submissions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 p-3">
                            {reports.map((report) => (
                                <div
                                    key={report.id}
                                    onClick={() => setSelectedReport(report.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedReport === report.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-slate-800 text-sm">{report.studentName}</h4>
                                        {report.grade ? (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700">{report.grade}</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-600">Needs Review</Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">{report.projectTitle}</p>
                                    <p className="text-xs text-slate-400 mt-1">{report.submissionDate}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    {selectedReport ? (
                        <Card className="h-full">
                            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-xl">Impact Report Review</CardTitle>
                                        <CardDescription>Ali Khan - Community Clean-up Drive</CardDescription>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        <Download className="w-4 h-4 mr-2" /> Download PDF
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-8">
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <h3 className="font-bold text-slate-900 mb-2">Section 1: Project Overview</h3>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Our project aimed to clean up the local park... (This is a preview of the report content)
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <h3 className="font-bold text-slate-900 mb-2">Section 3: SDG Mapping</h3>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            We primarily targeted SDG 11. Our team collected 50kg of waste...
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-6 space-y-4">
                                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Assessment
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Final Grade</Label>
                                            <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2">
                                                <option>Evaluate...</option>
                                                <option>A (Excellent)</option>
                                                <option>B (Good)</option>
                                                <option>C (Average)</option>
                                                <option>F (Fail)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>SDG Hours Credit</Label>
                                            <Input type="number" placeholder="e.g. 20" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Feedback for Student</Label>
                                        <Textarea placeholder="Great work on the SDG alignment..." className="h-32" />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <Button variant="outline">Save Draft</Button>
                                        <Button>Submit Grade</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                            <FileText className="w-12 h-12 mb-4 opacity-50" />
                            <h3 className="font-bold text-lg">Select a Report</h3>
                            <p className="text-sm">Choose a student submission from the list to start grading.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
