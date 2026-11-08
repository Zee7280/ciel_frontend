"use client";

import React, { useState } from "react";
import { Users, UserPlus, CheckCircle2, Shield, Trash2, Info } from "lucide-react";
import IdentityVerification, { Participant, participantSeatIsUnlinked } from "../../engagement/components/IdentityVerification";
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
    secondaryFacultyEmail = "",
    teamLeadEmail = "",
    maxMembers,
    allowedUniversities,
}: {
    projectId: string;
    members: any[];
    onUpdateMembers: (newMembers: any[]) => void;
    lockAddMembers?: boolean;
    canRemoveMember?: (member: any, index: number) => boolean;
    teamId?: string;
    primaryFacultyEmail?: string;
    secondaryFacultyEmail?: string;
    teamLeadEmail?: string;
    /** Max members besides the lead (opportunity seats − 1). Undefined = no cap known. */
    maxMembers?: number;
    /** Opportunity university scope — forwarded to each member's IdentityVerification. */
    allowedUniversities?: string[];
}) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    // A teammate being added lives here until their OTP is confirmed. Only then do they join
    // `members` — so closing the panel halfway never leaves a "Pending" ghost seat in the draft
    // (which used to flip the report to "team" with nobody actually verified).
    const [draftOpen, setDraftOpen] = useState(false);

    /**
     * The backend refuses a new teammate seat without a CIEL account, so this fires only for an
     * older seat that was saved by email alone. Say so right here — a green chip the teammate
     * cannot see from their side is exactly the confusion this guards against.
     */
    const warnIfUnlinked = (participant: Participant) => {
        if (!participantSeatIsUnlinked(participant)) return;
        alert(
            `${participant.fullName || participant.email || "This teammate"} is verified, but this seat is not linked to a CIEL account, so it will not appear in their dashboard. Remove them and add them again with the email they registered on CIEL with.`,
        );
    };

    const handleMemberSuccess = (index: number, participant: Participant) => {
        const newMembers = [...members];
        newMembers[index] = { ...newMembers[index], ...participant, verified: true };
        onUpdateMembers(newMembers);
        setExpandedIndex(null);
        warnIfUnlinked(participant);
    };

    const handleDraftSuccess = (participant: Participant) => {
        warnIfUnlinked(participant);
        onUpdateMembers([
            ...members,
            {
                ...participant,
                // Roster rows use the report's field names alongside the Participant shape.
                name: participant.fullName,
                university: participant.universityName,
                program: participant.academicProgram,
                semester: participant.semester ?? "",
                role: "Member",
                verified: true,
            },
        ]);
        setDraftOpen(false);
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

    const atCapacity = typeof maxMembers === "number" && members.length >= maxMembers;

    const handleAddMember = () => {
        if (atCapacity) {
            alert(`This opportunity has ${maxMembers! + 1} seats (team lead + ${maxMembers} member${maxMembers === 1 ? "" : "s"}).`);
            return;
        }
        setExpandedIndex(null);
        setDraftOpen(true);
    };

    const expandedMember = expandedIndex != null ? members[expandedIndex] : null;
    const reservedEmails = [
        teamLeadEmail,
        ...members
            .map((member, idx) => (idx === expandedIndex ? "" : String(member?.email || "")))
            .filter(Boolean),
    ];
    const panelMember = draftOpen ? {} : expandedMember;

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
                        // Roster rows carry the seat's account id; a verified seat without one is invisible to that teammate.
                        const unlinked = Boolean(member.verified) && participantSeatIsUnlinked(member);
                        return (
                            <div key={idx} className="inline-flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDraftOpen(false);
                                        setExpandedIndex(isOpen ? null : idx);
                                    }}
                                    title={
                                        unlinked
                                            ? `${displayName}: not linked to a CIEL account — they will not see this project. Remove and re-add with their registered email.`
                                            : `${member.role || "Member"} · ${member.university || "Pending university"}${member.email ? ` · ${member.email}` : ""}`
                                    }
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
                                    {unlinked ? (
                                        <span
                                            className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800"
                                            data-testid="teammate-unlinked"
                                        >
                                            Not linked
                                        </span>
                                    ) : member.verified ? (
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

            {members.length === 0 ? (
                <div className="cer-hint !mb-0 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    No teammates yet — this report stays individual until you add members.
                </div>
            ) : members.some((m) => m?.verified && participantSeatIsUnlinked(m)) ? (
                <div className="cer-hint !mb-0 flex items-start gap-1.5 text-amber-800" data-testid="teammate-unlinked-hint" role="alert">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                        {members
                            .filter((m) => m?.verified && participantSeatIsUnlinked(m))
                            .map((m) => m.fullName || m.name || m.email)
                            .join(", ")}{" "}
                        — verified, but not linked to a CIEL account, so this project will not appear in their dashboard. Remove and add them again with the email they registered on CIEL with.
                    </span>
                </div>
            ) : members.some((m) => m?.verified) ? (
                <div className="cer-hint !mb-0 flex items-center gap-1.5" data-testid="teammate-visibility-hint">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--teal)]" />
                    Verified teammates see this project under My Reports in their own CIEL account (they may need to refresh an open dashboard).
                </div>
            ) : null}

            {!lockAddMembers && !atCapacity && !draftOpen ? (
                <button
                    type="button"
                    onClick={handleAddMember}
                    className="cer-addbig mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#e6f6f4] px-4 py-3 text-[13px] font-semibold text-[#0e7d74] hover:bg-[#cfe9e6] transition-colors"
                >
                    <UserPlus className="h-4 w-4" />
                    Add team member — individual + academic configuration
                </button>
            ) : null}
            {!lockAddMembers && atCapacity ? (
                <div className="cer-hint !mb-0 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    Team is full — {maxMembers! + 1} seats = team lead + {maxMembers} member{maxMembers === 1 ? "" : "s"}.
                </div>
            ) : null}

            {/* Expanded configure panel (existing member) or the new-teammate draft */}
            {panelMember ? (
                <div className="space-y-3 rounded-[13px] border-[1.5px] border-dashed border-[#cbe7e3] bg-[#fbfefd] p-3.5 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                            <Shield className="h-3.5 w-3.5 shrink-0 text-[var(--teal)]" />
                            {draftOpen
                                ? "New teammate: enter their registered details, then send and confirm the email OTP. They join the team only once verified."
                                : "Enter registered details, then send and confirm the email OTP."}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setExpandedIndex(null);
                                setDraftOpen(false);
                            }}
                            className="shrink-0 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
                        >
                            {draftOpen ? "Cancel" : "Close"}
                        </button>
                    </div>
                    <IdentityVerification
                        key={draftOpen ? "draft" : `member-${expandedIndex}`}
                        projectId={projectId}
                        initialData={panelMember}
                        participationMode="team"
                        isTeamLead={false}
                        teamId={teamId}
                        primaryFacultyEmail={primaryFacultyEmail}
                        secondaryFacultyEmail={secondaryFacultyEmail}
                        reservedEmails={reservedEmails}
                        enforceUniqueOnProject
                        showSemester
                        allowedUniversities={allowedUniversities}
                        onSuccess={(p) => (draftOpen ? handleDraftSuccess(p) : handleMemberSuccess(expandedIndex as number, p))}
                    />
                </div>
            ) : null}
        </div>
    );
}
