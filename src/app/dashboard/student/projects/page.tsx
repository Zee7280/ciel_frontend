"use client";

import { useEffect, useState } from "react";
import { Button } from "../report/components/ui/button";
import Link from "next/link";
import { Badge } from "../report/components/ui/badge";
import { authenticatedFetch } from "@/utils/api";
import { Loader2, Plus, Users, Eye, Mail, Phone, GraduationCap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../report/components/ui/dialog";

interface TeamMember {
    name: string;
    role: string;
    cnic: string;
    email?: string;
    mobile?: string;
    university?: string;
    program?: string;
    is_verified?: boolean;
}

interface Project {
    id: string;
    title: string;
    category: string;
    status: string;
    submitted_at: string;
    description: string;
    teamMembers?: TeamMember[];
}

export default function MyProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTeamProject, setSelectedTeamProject] = useState<Project | null>(null);
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                // Get student ID from local storage
                const storedUser = localStorage.getItem("ciel_user");
                let studentId = "";
                if (storedUser) {
                    const userObj = JSON.parse(storedUser);
                    studentId = userObj.id || userObj.studentId || userObj.userId;
                }

                const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/projects`, {
                    method: 'POST',
                    body: JSON.stringify({ studentId })
                });

                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setProjects(data.data || []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch projects", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const openTeamDialog = (project: Project) => {
        setSelectedTeamProject(project);
        setIsTeamDialogOpen(true);
    };

    return (
        <div className="space-y-8 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Projects</h1>
                    <p className="text-slate-500">Manage your active and completed social impact projects.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
                    <p className="text-slate-500 mb-4">You haven't joined or created any projects yet.</p>
                    <Link href="/dashboard/student/create-opportunity">
                        <Button>Get Started</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6">
                    {projects.map((project) => (
                        <div key={project.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl shrink-0">
                                    {(project.title || "P").substring(0, 2).toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-slate-800">{project.title}</h3>
                                        <Badge className={`
                                            ${project.status === 'active' ? 'bg-green-100 text-green-700' :
                                                project.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' :
                                                    project.status === 'completed' ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'}
                                        `}>
                                            {project.status?.replace('_', ' ') || "Active"}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-500">{project.category || "Social Impact"} • {project.submitted_at ? new Date(project.submitted_at).toLocaleDateString() : "Just now"}</p>
                                    <p className="text-sm text-slate-600 max-w-2xl">
                                        {project.description || "No description provided."}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {project.teamMembers && project.teamMembers.length > 0 && (
                                    <Button variant="outline" onClick={() => openTeamDialog(project)} className="w-full md:w-auto flex items-center gap-2">
                                        <Users className="w-4 h-4" /> View Team
                                    </Button>
                                )}
                                {project.status === 'active' && (
                                    <Link href={`/dashboard/student/report?projectId=${project.id}`} className="w-full md:w-auto">
                                        <Button className="w-full md:w-auto">Submit Report</Button>
                                    </Link>
                                )}
                                <Button variant="outline" className="w-full md:w-auto">View Details</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Team Details Dialog */}
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0">
                    <DialogHeader className="p-6 bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl text-slate-900">
                                    Project Team
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 mt-1">
                                    Collaborators for <span className="font-medium text-slate-700">{selectedTeamProject?.title}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6">
                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Team Member</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Role</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Contact Info</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {selectedTeamProject?.teamMembers?.map((member, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm ring-2 ring-white border border-slate-200">
                                                        {member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{member.name}</div>
                                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{member.cnic}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${member.role === 'Leader'
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                    : 'bg-slate-50 text-slate-600 border-slate-100'
                                                    }`}>
                                                    {member.role === 'Leader' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 animate-pulse" />}
                                                    {member.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    {member.email && (
                                                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                            <Mail className="w-3 h-3 text-slate-400" />
                                                            {member.email}
                                                        </div>
                                                    )}
                                                    {member.mobile && (
                                                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            {member.mobile}
                                                        </div>
                                                    )}
                                                    {member.university && (
                                                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                            <GraduationCap className="w-3 h-3 text-slate-400" />
                                                            {member.university}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase ${member.is_verified
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {member.is_verified ? 'Verified' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!selectedTeamProject?.teamMembers || selectedTeamProject.teamMembers.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                                                No team members added to this project.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-0">
                        <Button onClick={() => setIsTeamDialogOpen(false)} className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
