"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, Clock, MoreVertical, Loader2, Search, Filter, Users, Eye } from "lucide-react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../../../student/report/components/ui/dialog";
import { Button } from "../../../../student/report/components/ui/button";

interface TeamMember {
    name: string;
    role: string;
    cnic: string;
}

interface Applicant {
    id: string;
    studentName: string;
    university: string;
    email: string;
    status: 'pending' | 'shortlisted' | 'accepted' | 'rejected';
    appliedAt: string;
    avatar?: string;
    type?: 'individual' | 'team';
    teamName?: string;
    teamMembers?: TeamMember[];
}

export default function ManageApplicantsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id;

    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState("");

    // Team View State
    const [selectedTeam, setSelectedTeam] = useState<Applicant | null>(null);
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);

    // Fetch Applicants
    useEffect(() => {
        const fetchApplicants = async () => {
            try {
                // Using Next.js API route with mock data
                const res = await authenticatedFetch(`/api/v1/partner/opportunities/applicants`, {
                    method: 'POST',
                    body: JSON.stringify({ id })
                });

                if (res && res.ok) {
                    const data = await res.json();
                    setApplicants(data.data || []);
                } else {
                    toast.error("Failed to load applicants");
                }
            } catch (error) {
                console.error("Error fetching applicants", error);
                toast.error("An error occurred while loading applicants");
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchApplicants();
        }
    }, [id]);

    const handleStatusUpdate = async (applicantId: string, newStatus: string) => {
        setUpdatingId(applicantId);
        try {
            const res = await authenticatedFetch(`/api/v1/partner/opportunities/applicants`, {
                method: 'POST',
                body: JSON.stringify({ id, applicantId, status: newStatus })
            });

            if (res && res.ok) {
                toast.success(`Applicant marked as ${newStatus}`);
                // Update local state
                setApplicants(prev => prev.map(app =>
                    app.id === applicantId ? { ...app, status: newStatus as any } : app
                ));
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setUpdatingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'accepted': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Accepted</span>;
            case 'rejected': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
            case 'shortlisted': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Shortlisted</span>;
            default: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
        }
    };

    const filteredApplicants = applicants.filter(app => {
        const matchesSearch = app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || app.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const openTeamDialog = (applicant: Applicant) => {
        setSelectedTeam(applicant);
        setIsTeamDialogOpen(true);
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <Link href="/dashboard/partner/requests" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-2 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Opportunities
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">Manage Applicants</h1>
                    <p className="text-slate-500">Opportunity ID: <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{id}</span></p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-bold text-slate-700">Student / Team</th>
                            <th className="px-6 py-4 font-bold text-slate-700">University</th>
                            <th className="px-6 py-4 font-bold text-slate-700">Applied On</th>
                            <th className="px-6 py-4 font-bold text-slate-700">Status</th>
                            <th className="px-6 py-4 font-bold text-slate-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredApplicants.length > 0 ? (
                            filteredApplicants.map((app) => (
                                <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-slate-200">
                                                <AvatarImage src={app.avatar} />
                                                <AvatarFallback>{app.studentName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                                    {app.type === 'team' ? (
                                                        <>
                                                            {app.teamName} <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">Team</span>
                                                        </>
                                                    ) : (
                                                        app.studentName
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500">{app.email}</div>
                                                {app.type === 'team' && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5">Lead: {app.studentName}</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{app.university}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {new Date(app.appliedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(app.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {updatingId === app.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                            ) : (
                                                <>
                                                    {app.type === 'team' && (
                                                        <button
                                                            onClick={() => openTeamDialog(app)}
                                                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors mr-1"
                                                            title="View Team"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {app.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(app.id, 'shortlisted')}
                                                            className="px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 text-xs font-bold transition-colors"
                                                        >
                                                            Shortlist
                                                        </button>
                                                    )}
                                                    {app.status !== 'accepted' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(app.id, 'accepted')}
                                                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-bold shadow-sm shadow-green-500/30 transition-colors"
                                                        >
                                                            Accept
                                                        </button>
                                                    )}
                                                    {app.status !== 'rejected' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(app.id, 'rejected')}
                                                            className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-bold transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    No applicants found matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Team Details Dialog */}
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            {selectedTeam?.teamName}
                            <span className="text-sm font-normal text-slate-500">({selectedTeam?.studentName})</span>
                        </DialogTitle>
                        <DialogDescription>
                            Review the team composition for this application.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-100 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 font-bold text-slate-700">Name</th>
                                        <th className="px-4 py-3 font-bold text-slate-700">Role</th>
                                        <th className="px-4 py-3 font-bold text-slate-700">CNIC</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedTeam?.teamMembers?.map((member, idx) => (
                                        <tr key={idx} className="hover:bg-slate-100/50">
                                            <td className="px-4 py-3 font-medium text-slate-900">{member.name}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${member.role === 'Leader' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {member.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-slate-500">{member.cnic}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setIsTeamDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
