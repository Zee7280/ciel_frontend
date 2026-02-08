"use client";

import { useState } from "react";
import { User, Mail, Phone, Star, Award, MoreVertical, Search } from "lucide-react";

export default function PartnerVolunteersPage() {
    const [volunteers] = useState([
        { id: 1, name: "Ali Ahmed", email: "ali@student.edu", role: "Team Lead", hours: 45, rating: 4.8, status: "active" },
        { id: 2, name: "Sara Khan", email: "sara@student.edu", role: "Volunteer", hours: 12, rating: 5.0, status: "active" },
        { id: 3, name: "John Doe", email: "john@student.edu", role: "Volunteer", hours: 0, rating: 0, status: "pending" },
    ]);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Volunteers</h1>
                    <p className="text-slate-500">Track and manage volunteers across all projects.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search volunteers..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 w-64" />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs font-bold tracking-wider">
                        <tr>
                            <th className="p-6">Volunteer</th>
                            <th className="p-6">Role</th>
                            <th className="p-6">Hours Contributed</th>
                            <th className="p-6">Performance</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {volunteers.map((vol) => (
                            <tr key={vol.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                                            {vol.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{vol.name}</div>
                                            <div className="text-xs text-slate-400">{vol.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 text-sm font-bold text-slate-700">{vol.role}</td>
                                <td className="p-6 font-bold text-slate-900">{vol.hours} hrs</td>
                                <td className="p-6">
                                    <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                                        <Star className="w-4 h-4 fill-current" /> {vol.rating > 0 ? vol.rating : "N/A"}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                                        ${vol.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {vol.status}
                                    </span>
                                </td>
                                <td className="p-6 text-right">
                                    <button className="text-slate-400 hover:text-blue-600"><MoreVertical className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
