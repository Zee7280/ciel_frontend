"use client";

import React, { useState } from "react";
import { Users, UserPlus, CheckCircle2, Shield, Trash2, Info } from "lucide-react";
import IdentityVerification, { Participant } from "../../engagement/components/IdentityVerification";
import { Button } from "./ui/button";
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

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-900">Team configuration</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Add registered CIEL users; each member verifies identity via OTP.
                    </p>
                </div>
                {!lockAddMembers ? (
                    <Button
                        type="button"
                        onClick={handleAddMember}
                        className="h-9 shrink-0 gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                        <UserPlus className="h-3.5 w-3.5" />
                        Add member
                    </Button>
                ) : null}
            </div>

            <div className="flex gap-2.5 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-900">
                    Only registered CIEL users can be added. OTP verification is required for the audit trail.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {members.map((member, idx) => {
                    const mayRemove = canRemoveMember ? canRemoveMember(member, idx) : !lockAddMembers;
                    return (
                    <div
                        key={idx}
                        className={clsx(
                            "rounded-xl border bg-white transition-colors",
                            member.verified ? "border-emerald-200" : "border-slate-200",
                        )}
                    >
                        <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                    member.verified ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400",
                                )}>
                                    <Users className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-sm font-semibold text-slate-900">
                                            {member.fullName || member.name || `Team Member ${idx + 1}`}
                                        </h4>
                                        {member.verified ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Verified
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {member.role || "Member"} · {member.university || "Pending university"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {!lockAddMembers ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                                        className={clsx(
                                            "h-8 rounded-lg px-3 text-xs font-semibold",
                                            expandedIndex === idx
                                                ? "border-slate-900 bg-slate-900 text-white"
                                                : "border-slate-200 text-slate-700",
                                        )}
                                    >
                                        {expandedIndex === idx ? "Close" : "Configure"}
                                    </Button>
                                ) : null}
                                {mayRemove ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeMember(idx)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border-slate-200 p-0 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        {expandedIndex === idx ? (
                            <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 p-3.5">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <Shield className="h-3.5 w-3.5 text-indigo-600" />
                                    Enter registered details for OTP verification.
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                                    <IdentityVerification
                                        projectId={projectId}
                                        initialData={member}
                                        participationMode="team"
                                        isTeamLead={false}
                                        teamId={teamId}
                                        primaryFacultyEmail={primaryFacultyEmail}
                                        secondaryFacultyEmail={secondaryFacultyEmail}
                                        onSuccess={(p) => handleMemberSuccess(idx, p)}
                                    />
                                </div>
                            </div>
                        ) : null}
                    </div>
                );})}
            </div>

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
