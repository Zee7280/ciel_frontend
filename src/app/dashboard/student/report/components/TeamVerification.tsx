"use client";

import React, { useState } from "react";
import { Users, UserPlus, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Shield, LucideIcon, Trash2, Info } from "lucide-react";
import IdentityVerification, { Participant } from "../../engagement/components/IdentityVerification";
import { Button } from "./ui/button";
import clsx from "clsx";

export default function TeamVerification({
    projectId,
    members,
    onUpdateMembers,
    isLocked = false
}: {
    projectId: string;
    members: any[];
    onUpdateMembers: (newMembers: any[]) => void;
    isLocked?: boolean;
}) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const handleMemberSuccess = (index: number, participant: Participant) => {
        const newMembers = [...members];
        newMembers[index] = { ...newMembers[index], ...participant, verified: true };
        onUpdateMembers(newMembers); // This will trigger fetchInitialData in parent if length/verified list changes
        setExpandedIndex(null); // Collapse after success
    };

    const removeMember = async (index: number) => {
        const member = members[index];
        const participantId = member.id || member.participantId;

        if (participantId) {
            try {
                const res = await fetch(`/api/v1/engagement/${participantId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('ciel_token')}`
                    }
                });
                
                if (!res.ok) {
                    const err = await res.json();
                    alert(err.message || "Failed to remove member record from backend.");
                    return;
                }
            } catch (error) {
                console.error("Error removing member:", error);
                alert("An error occurred while removing the team member.");
                return;
            }
        }

        const newMembers = [...members];
        newMembers.splice(index, 1);
        onUpdateMembers(newMembers);
    };

    const handleAddMember = () => {
        onUpdateMembers([...members, {
            name: '',
            email: '',
            mobile: '',
            cnic: '',
            university: '',
            program: '',
            role: 'Member',
            verified: false
        }]);
        setExpandedIndex(members.length); // Expand the new member
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Users className="w-4.5 h-4.5" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 tracking-tight">Team Configuration</h4>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Manage project participants and verify identities for HEC compliance.</p>
                </div>

                <div className="flex items-center gap-3">
                    {!isLocked && (
                        <Button
                            onClick={handleAddMember}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-95"
                        >
                            <UserPlus className="w-4 h-4" /> Add Team Member
                        </Button>
                    )}
                </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-4 flex items-start gap-3 transition-colors hover:bg-amber-50">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 mt-0.5">
                    <p className="text-[11px] text-amber-800 font-black uppercase tracking-widest leading-none">Security Note</p>
                    <p className="text-xs text-amber-700/80 font-medium leading-relaxed">
                        Only registered CIEL users can be added. Each member must verify their identity via OTP during this stage to be included in the final audit trail.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {members.map((member, idx) => (
                    <div
                        key={idx}
                        className={clsx(
                            "group relative rounded-[2rem] border transition-all duration-300 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1",
                            member.verified ? "border-emerald-100 bg-emerald-50/5" : "border-slate-100"
                        )}
                    >
                        {/* Member Row */}
                        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-5">
                                <div className={clsx(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-sm group-hover:scale-110",
                                    member.verified ? "bg-indigo-600 text-white shadow-indigo-100" : "bg-slate-50 text-slate-400"
                                )}>
                                    {member.verified ? (
                                        <div className="relative">
                                            <Users className="w-7 h-7" />
                                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white animate-pulse">
                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                    ) : <Users className="w-7 h-7" />}
                                </div>
                                <div className="space-y-1 text-center sm:text-left">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <h4 className="text-lg font-black text-slate-900 tracking-tight">
                                            {member.fullName || member.name || `Team Member ${idx + 1}`}
                                        </h4>
                                        {member.verified && (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100/50">
                                                <div className="bg-emerald-500 rounded-full p-0.5">
                                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Identity Verified</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-slate-400">
                                        {member.role || 'Active Contributor'} • {member.university || 'Pending Institution Verification'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                                {!isLocked && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                                            className={clsx(
                                                "h-10 px-5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                                expandedIndex === idx ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            {expandedIndex === idx ? "Cancel Edit" : "Configure"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeMember(idx)}
                                            className="h-10 w-10 p-0 flex items-center justify-center border-slate-100 text-slate-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-4.5 h-4.5" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Accordion Content (Identity Verification) */}
                        {expandedIndex === idx && (
                            <div className="p-8 pt-2 border-t border-slate-100/60 bg-slate-50/20">
                                <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-indigo-100 shadow-sm">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest leading-none">Institutional Security Protocol</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Please provide the registered details for official OTP authentication.</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-inner">
                                    <IdentityVerification
                                        projectId={projectId}
                                        initialData={member}
                                        participationMode="team"
                                        isTeamLead={false}
                                        onSuccess={(p) => handleMemberSuccess(idx, p)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {members.length === 0 && (
                <div className="py-20 text-center space-y-5 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 transition-all hover:border-indigo-100 hover:bg-slate-50/50">
                    <div className="relative flex justify-center">
                        <div className="absolute w-20 h-20 bg-indigo-50 rounded-full blur-2xl opacity-60 animate-pulse"></div>
                        <Users className="w-14 h-14 text-slate-200 relative z-10" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Individual Participation</p>
                        <p className="text-xs text-slate-400 font-medium max-w-[280px] mx-auto leading-relaxed">No team members have been added yet. This report will be treated as an individual engagement.</p>
                    </div>
                    {!isLocked && (
                        <button 
                            onClick={handleAddMember}
                            className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] hover:text-indigo-700 transition-colors"
                        >
                            + Click to add collaborators
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
