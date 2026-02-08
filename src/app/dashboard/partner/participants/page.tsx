"use client";

import { useState, useEffect } from "react";
import { User, Search, Filter, MoreVertical, Eye, CheckCircle, Clock, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

export default function PartnerParticipantsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [participants, setParticipants] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    useEffect(() => {
        fetchParticipants();
    }, []);

    const fetchParticipants = async () => {
        try {
            const storedUser = localStorage.getItem("ciel_user");
            const user = storedUser ? JSON.parse(storedUser) : null;
            const userId = user?.id || user?.userId;

            if (!userId) {
                toast.error("User session invalid. Please login again.");
                return;
            }

            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/participants`, {
                method: 'POST',
                body: JSON.stringify({ id: userId })
            });

            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setParticipants(data.data || []);
                } else {
                    toast.error(data.message || "Failed to fetch participants");
                }
            } else {
                toast.error("Failed to connect to server");
            }
        } catch (error) {
            console.error("Failed to fetch participants", error);
            toast.error("Failed to load participants");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredParticipants = participants.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.opportunity.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "All" || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Student Participants</h1>
                    <p className="text-slate-500">View and manage students joined in your opportunities.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 w-64 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-white appearance-none cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Completed">Completed</option>
                            <option value="Dropped">Dropped</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs font-bold tracking-wider">
                        <tr>
                            <th className="p-6">Student Name</th>
                            <th className="p-6">Opportunity</th>
                            <th className="p-6">Joined Date</th>
                            <th className="p-6">Logged Hours</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="p-10 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                                </td>
                            </tr>
                        ) : filteredParticipants.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-10 text-center text-slate-500">
                                    No participants found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredParticipants.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                                {p.name[0]}
                                            </div>
                                            <span className="font-bold text-slate-900">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-sm text-slate-600">{p.opportunity}</td>
                                    <td className="p-6 text-sm text-slate-500">{p.joinedDate}</td>
                                    <td className="p-6 font-bold text-slate-900 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" /> {p.hours} hrs
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase 
                                            ${p.status === 'Active' ? 'bg-blue-50 text-blue-600' :
                                                p.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right flex justify-end gap-2">
                                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="View Timesheets">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Mark Complete">
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
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
