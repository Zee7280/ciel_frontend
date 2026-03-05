"use client";

import React, { useState } from "react";
import { Users, UserPlus, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Shield, LucideIcon, Trash2 } from "lucide-react";
import IdentityVerification, { Participant } from "../../engagement/components/IdentityVerification";
import { Button } from "./ui/button";
import clsx from "clsx";

export default function TeamVerification({
    projectId,
    members,
    onUpdateMembers
}: {
    projectId: string;
    members: any[];
    onUpdateMembers: (newMembers: any[]) => void;
}) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

    const handleMemberSuccess = (index: number, participant: Participant) => {
        const newMembers = [...members];
        newMembers[index] = { ...newMembers[index], ...participant, verified: true };
        onUpdateMembers(newMembers);
        setExpandedIndex(null); // Collapse after success
    };

    const removeMember = (index: number) => {
        const newMembers = [...members];
        newMembers.splice(index, 1);
        onUpdateMembers(newMembers);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
                {members.map((member, idx) => (
                    <div
                        key={idx}
                        className={clsx(
                            "rounded-[2rem] border-2 transition-all overflow-hidden",
                            member.verified ? "border-emerald-100 bg-emerald-50/20" : "border-slate-100 bg-white"
                        )}
                    >
                        {/* Accordion Header */}
                        <div
                            onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                            className="p-6 flex items-center justify-between cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    member.verified ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                                )}>
                                    {member.verified ? <CheckCircle2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 uppercase">
                                        {member.fullName || member.name || `Student ${idx + 1}`}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className={clsx(
                                            "w-2 h-2 rounded-full",
                                            member.verified ? "bg-emerald-500" : "bg-amber-400"
                                        )}></div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {member.verified ? 'Verified' : 'Draft - Identity Required'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeMember(idx); }}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                {expandedIndex === idx ? <ChevronUp className="w-5 h-5 text-slate-300" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
                            </div>
                        </div>

                        {/* Accordion Content */}
                        {expandedIndex === idx && (
                            <div className="p-8 pt-0 border-t border-slate-50 animate-in slide-in-from-top-4 duration-500">
                                <div className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">GATEWAY: OTP Verification Required for this member</p>
                                </div>
                                <IdentityVerification
                                    projectId={projectId}
                                    initialData={member}
                                    participationMode="team"
                                    isTeamLead={false}
                                    onSuccess={(p) => handleMemberSuccess(idx, p)}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {members.length === 0 && (
                <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <Users className="w-12 h-12 text-slate-200 mx-auto" />
                    <p className="text-sm text-slate-400 font-bold">No team members added. Go back to Step 1.</p>
                </div>
            )}
        </div>
    );
}
