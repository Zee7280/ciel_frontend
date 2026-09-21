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
            semester: '',
            role: 'Member',
            verified: false
        }]);
        setExpandedIndex(members.length);
    };

    const expandedMember = expandedIndex != null ? members[expandedIndex] : null;

    return (
        <div className="space-y-2">
            <p className="cer-sub !mb-1">
                Add registered CIEL users — send OTP to their email before they appear as verified.
            </p>

            <div className="cer-note">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                    Only registered CIEL users can be added. Each member verifies by <b>OTP to their email</b> — that
                    links this opportunity to their dashboard.
                </p>
            </div>

            {/* Member chips */}
            {members.length > 0 && (
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
                                        member.verified ? "border-[var(--teal)]/40" : "border-[var(--line)]",
                                        isOpen && "border-[var(--teal)] ring-2 ring-[var(--teal-soft)]",
                                    )}
                                >
                                    <span
                                        className={clsx(
                                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                                            member.verified
                                                ? "bg-gradient-to-br from-[#0e7d74] to-[#2dd4bf]"
                                                : "bg-[var(--muted)]",
                                        )}
                                    >
                                        {displayName.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="text-[var(--ink)]">{displayName}</span>
                                    {member.verified ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--teal)]" />
                                    ) : (
                                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--gold)]">
                                            Pending
                                        </span>
                                    )}
                                </button>
                                {mayRemove ? (
                                    <button
                                        type="button"
                                        onClick={() => removeMember(idx)}
                                        aria-label={`Remove ${displayName}`}
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-rose-50 hover:text-[var(--red)]"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            )}

            {members.length === 0 && (
                <div className="cer-hint !mb-0 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    No teammates yet — this report stays individual until you add members.
                </div>
            )}

            {!lockAddMembers ? (
                <button
                    type="button"
                    onClick={handleAddMember}
                    className="cer-addbig flex items-center justify-center gap-1.5"
                >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add team member — individual + academic configuration
                </button>
            ) : null}

            {/* Expanded configure panel */}
            {expandedMember ? (
                <div className="space-y-3 rounded-[13px] border-[1.5px] border-dashed border-[#cbe7e3] bg-[#fbfefd] p-3.5 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                            <Shield className="h-3.5 w-3.5 shrink-0 text-[var(--teal)]" />
                            Enter registered details, then send and confirm the email OTP.
                        </div>
                        <button
                            type="button"
                            onClick={() => setExpandedIndex(null)}
                            className="shrink-0 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
                        >
                            Close
                        </button>
                    </div>
                    <IdentityVerification
                        projectId={projectId}
                        initialData={expandedMember}
                        participationMode="team"
                        isTeamLead={false}
                        teamId={teamId}
                        primaryFacultyEmail={primaryFacultyEmail}
                        secondaryFacultyEmail={secondaryFacultyEmail}
                        showSemester
                        onSuccess={(p) => handleMemberSuccess(expandedIndex as number, p)}
                    />
                </div>
            ) : null}
        </div>
    );
}
