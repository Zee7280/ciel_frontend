"use client";

import React, { useState } from "react";
import { Users, UserPlus, CheckCircle2, Shield, Trash2, Info } from "lucide-react";
import IdentityVerification, { Participant } from "../../engagement/components/IdentityVerification";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";

export default function TeamVerification({
    projectId,
    members,
    onUpdateMembers,
    lockAddMembers = false,
    canRemoveMember,
    teamId = "",
    primaryFacultyEmail = "",
    secondaryFacultyEmail = ""
}: {
    projectId: string;
    members: any[];
    onUpdateMembers: (newMembers: any[]) => void;
    lockAddMembers?: boolean;
    canRemoveMember?: (member: any, index: number) => boolean;
    teamId?: string;
    primaryFacultyEmail?: string;
    secondaryFacultyEmail?: string;
}) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const handleMemberSuccess = (index: number, participant: Participant) => {
        const newMembers = [...members];
        newMembers[index] = { ...newMembers[index], ...participant, verified: true };
        onUpdateMembers(newMembers);
        setExpandedIndex(null);
    };

    const removeMember = async (index: number) => {
        const member = members[index];
        if (canRemoveMember && !canRemoveMember(member, index)) {
            alert("You are not allowed to remove this team member.");
            return;
        }

        const participantId = member.id || member.participantId;

        if (participantId) {
            try {
                const res = await authenticatedFetch(`/api/v1/engagement/${encodeURIComponent(participantId)}`, {
                    method: 'DELETE',
                });
                
                if (!res || !res.ok) {
                    const err = await res?.json().catch(() => ({}));
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
        setExpandedIndex(members.length);
    };

    const expandedMember = expandedIndex != null ? members[expandedIndex] : null;

    return (
        <div className="space-y-3">
            <div>
                <p className="text-sm font-semibold text-slate-900">Team members</p>
                <p className="mt-0.5 text-xs text-slate-500">
                    Add registered CIEL users — each one verifies instantly through their own account, no OTP round-trips.
                </p>
            </div>

            <div className="flex gap-2.5 rounded-xl border border-amber-100 bg-amber-50/80 px-3.5 py-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-900">
                    Only registered CIEL users can be added. OTP verification is required for the audit trail.
                </p>
            </div>

            {/* Member chips */}
            <div className="flex flex-wrap items-center gap-2">
                {members.map((member, idx) => {
                    const mayRemove = canRemoveMember ? canRemoveMember(member, idx) : !lockAddMembers;
                    const isOpen = expandedIndex === idx;
                    const displayName = member.fullName || member.name || `Team Member ${idx + 1}`;
                    return (
                        <div key={idx} className="inline-flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setExpandedIndex(isOpen ? null : idx)}
                                title={`${member.role || "Member"} · ${member.university || "Pending university"}`}
                                className={clsx(
                                    "inline-flex items-center gap-2 rounded-full border bg-white py-1.5 pl-1.5 pr-3.5 text-sm font-semibold transition-colors",
                                    member.verified ? "border-emerald-200" : "border-slate-200",
                                    isOpen && "border-indigo-300 ring-2 ring-indigo-100",
                                )}
                            >
                                <span
                                    className={clsx(
                                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                                        member.verified
                                            ? "bg-gradient-to-br from-indigo-500 to-purple-500"
                                            : "bg-slate-300",
                                    )}
                                >
                                    {displayName.charAt(0).toUpperCase()}
                                </span>
                                <span className="text-slate-900">{displayName}</span>
                                {member.verified ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                ) : (
                                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                                        Pending
                                    </span>
                                )}
                            </button>
                            {mayRemove ? (
                                <button
                                    type="button"
                                    onClick={() => removeMember(idx)}
                                    aria-label={`Remove ${displayName}`}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            ) : null}
                        </div>
                    );
                })}
                {!lockAddMembers ? (
                    <button
                        type="button"
                        onClick={handleAddMember}
                        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-indigo-300 px-3.5 py-[7px] text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                    >
                        <UserPlus className="h-3.5 w-3.5" />
                        Add member
                    </button>
                ) : null}
            </div>

            {/* Expanded configure panel */}
            {expandedMember ? (
                <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Shield className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                            Enter registered details for OTP verification.
                        </div>
                        <button
                            type="button"
                            onClick={() => setExpandedIndex(null)}
                            className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800"
                        >
                            Close
                        </button>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                        <IdentityVerification
                            projectId={projectId}
                            initialData={expandedMember}
                            participationMode="team"
                            isTeamLead={false}
                            teamId={teamId}
                            primaryFacultyEmail={primaryFacultyEmail}
                            secondaryFacultyEmail={secondaryFacultyEmail}
                            onSuccess={(p) => handleMemberSuccess(expandedIndex as number, p)}
                        />
                    </div>
                </div>
            ) : null}

            {members.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-800">Individual participation</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                        No teammates yet — this report stays individual until you add members.
                    </p>
                    {!lockAddMembers ? (
                        <button
                            type="button"
                            onClick={handleAddMember}
                            className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                            + Add collaborators
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
