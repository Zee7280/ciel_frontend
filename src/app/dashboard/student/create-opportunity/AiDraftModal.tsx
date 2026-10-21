"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { apiErrorMessage } from "@/utils/apiErrorMessage";
import { integerFieldInput } from "@/utils/integerFieldInput";
import {
    aiDraftInputError,
    aiWorkloadHint,
    buildAiDraftRequest,
    type AiDraftFields,
    type AiDraftInputs,
} from "./aiDraft";
import { PRIVATE_TEAM_MAX_SEATS } from "./teamMode";

type Props = {
    /** Pre-filled from the form; mounted fresh each time it opens. */
    initial: AiDraftInputs;
    creatorPathway: "university" | "private";
    /** Private / Open choice is only offered while the wizard shows it. */
    teamModeChoosable: boolean;
    onClose: (inputs: AiDraftInputs) => void;
    onApply: (fields: AiDraftFields, inputs: AiDraftInputs) => void;
};

/** "Generate & Auto-Fill": the student describes the idea; AI drafts the editable form text. */
export default function AiDraftModal({ initial, creatorPathway, teamModeChoosable, onClose, onApply }: Props) {
    const [inputs, setInputs] = useState<AiDraftInputs>(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const set = <K extends keyof AiDraftInputs>(key: K, value: AiDraftInputs[K]) => {
        setInputs((prev) => ({ ...prev, [key]: value }));
        setError("");
    };
    const privateTeam = inputs.teamMode === "private_team";
    const workload = aiWorkloadHint(inputs);
    /** Close on a real backdrop click only — not when a text selection drag ends outside the card. */
    const pressStartedOnBackdrop = useRef(false);

    // Same as the wizard's other dialogs: the page behind must not scroll (mobile).
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    const generate = async () => {
        const problem = aiDraftInputError(inputs);
        if (problem) {
            setError(problem);
            return;
        }
        setBusy(true);
        setError("");
        try {
            const res = await authenticatedFetch("/api/v1/ai/opportunity-draft", {
                method: "POST",
                body: JSON.stringify(buildAiDraftRequest(inputs, creatorPathway)),
            });
            const body = res ? await res.json().catch(() => ({})) : {};
            const fields = (body as { data?: { fields?: AiDraftFields } }).data?.fields;
            if (!res?.ok || !fields) {
                setError(apiErrorMessage(body, "AI could not draft this right now. Try again, or fill the form yourself."));
                return;
            }
            onApply(fields, inputs);
        } catch {
            setError("AI could not draft this right now. Try again, or fill the form yourself.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(4,37,43,0.6)] p-3 sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-draft-title"
            onMouseDown={(e) => {
                pressStartedOnBackdrop.current = e.target === e.currentTarget;
            }}
            onClick={(e) => {
                if (!busy && pressStartedOnBackdrop.current && e.target === e.currentTarget) onClose(inputs);
            }}
        >
            <div className="flex max-h-[92dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-[24px] bg-white text-left">
                <div className="flex items-start justify-between gap-3 border-b border-[#e6ecef] px-5 pb-4 pt-5 sm:px-6">
                    <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0e7d74]">AI-assisted draft</p>
                        <h2 id="ai-draft-title" className="mt-1 text-lg font-extrabold text-[#0d2b33]">
                            Tell us what you want to do
                        </h2>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-[#3c5a5c]">
                            Write naturally — keywords, unfinished sentences or Urdu-English are fine. AI turns your idea into
                            clear form answers. You review and edit every step before submitting.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="shrink-0 rounded-xl p-2 text-[#70808a] hover:bg-[#f2f6f7]"
                        aria-label="Close"
                        disabled={busy}
                        onClick={() => onClose(inputs)}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
                    <div>
                        <label className="co-label" style={{ marginTop: 0 }} htmlFor="ai-title">
                            Opportunity idea / short title
                        </label>
                        <input
                            id="ai-title"
                            type="text"
                            maxLength={200}
                            placeholder="e.g. Classroom Upgradation"
                            value={inputs.titleHint}
                            onChange={(e) => set("titleHint", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="co-label" style={{ marginTop: 0 }} htmlFor="ai-idea">
                            Brainstorm your idea in any words *
                        </label>
                        <textarea
                            id="ai-idea"
                            rows={5}
                            maxLength={4000}
                            spellCheck
                            placeholder="e.g. sos kids. classroom looks old. drawings charts for syllabus, repaint chairs desks. need volunteers."
                            value={inputs.idea}
                            onChange={(e) => set("idea", e.target.value)}
                        />
                        <p className="mt-1 text-[10px] text-[#7a919a]">
                            Do not include phone numbers, emails or CNICs — they are removed before AI sees your text.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="co-label" style={{ marginTop: 0 }} htmlFor="ai-place">
                                City / service location
                            </label>
                            <input
                                id="ai-place"
                                type="text"
                                maxLength={200}
                                placeholder="e.g. SOS Village, Lahore"
                                value={inputs.place}
                                onChange={(e) => set("place", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="co-label" style={{ marginTop: 0 }} htmlFor="ai-benef">
                                Beneficiaries
                            </label>
                            <input
                                id="ai-benef"
                                type="text"
                                inputMode="numeric"
                                placeholder="e.g. 30"
                                value={inputs.beneficiaries}
                                onChange={(e) => set("beneficiaries", integerFieldInput(e.target.value, 7))}
                            />
                        </div>
                    </div>

                    {teamModeChoosable ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <button
                                type="button"
                                aria-pressed={privateTeam}
                                className={`co-choice${privateTeam ? " on" : ""}`}
                                onClick={() => {
                                    const n = parseInt(inputs.seats, 10);
                                    setInputs((prev) => ({
                                        ...prev,
                                        teamMode: "private_team",
                                        seats: !Number.isNaN(n) && n > PRIVATE_TEAM_MAX_SEATS ? String(PRIVATE_TEAM_MAX_SEATS) : prev.seats,
                                    }));
                                    setError("");
                                }}
                            >
                                <div className="text-[22px]">🔒</div>
                                <div className="mt-1 text-xs font-extrabold">Private Team</div>
                                <div className="mt-0.5 text-[10px] leading-snug text-[#7a919a]">
                                    Only you start the report and add members, up to {PRIVATE_TEAM_MAX_SEATS} including you.
                                </div>
                            </button>
                            <button
                                type="button"
                                aria-pressed={!privateTeam}
                                className={`co-choice${!privateTeam ? " on" : ""}`}
                                onClick={() => set("teamMode", "open")}
                            >
                                <div className="text-[22px]">🌍</div>
                                <div className="mt-1 text-xs font-extrabold">Open Opportunity</div>
                                <div className="mt-0.5 text-[10px] leading-snug text-[#7a919a]">
                                    Others can apply. Teams of up to {PRIVATE_TEAM_MAX_SEATS} form when reports start.
                                </div>
                            </button>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="co-label" style={{ marginTop: 0 }} htmlFor="ai-seats">
                                {privateTeam ? `Team places · 1–${PRIVATE_TEAM_MAX_SEATS} (including you)` : "Total places (including you)"}
                            </label>
                            <input
                                id="ai-seats"
                                type="text"
                                inputMode="numeric"
                                placeholder="e.g. 10"
                                value={inputs.seats}
                                onChange={(e) => set("seats", integerFieldInput(e.target.value, 4))}
                            />
                        </div>
                        <div>
                            <label className="co-label" style={{ marginTop: 0 }} htmlFor="ai-hours">
                                Required hours / student
                            </label>
                            <input
                                id="ai-hours"
                                type="text"
                                inputMode="numeric"
                                placeholder="e.g. 16"
                                value={inputs.hours}
                                onChange={(e) => set("hours", integerFieldInput(e.target.value, 3))}
                            />
                        </div>
                        <div>
                            <label className="co-label" style={{ marginTop: 0 }} htmlFor="ai-start">
                                Start date (optional)
                            </label>
                            <input
                                id="ai-start"
                                type="date"
                                value={inputs.startDate}
                                max={inputs.endDate || undefined}
                                onChange={(e) => set("startDate", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="co-label" style={{ marginTop: 0 }} htmlFor="ai-end">
                                End date (optional)
                            </label>
                            <input
                                id="ai-end"
                                type="date"
                                value={inputs.endDate}
                                min={inputs.startDate || undefined}
                                onChange={(e) => set("endDate", e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="co-label" style={{ marginTop: 0 }} htmlFor="ai-partner">
                            Main partner organization (optional)
                        </label>
                        <input
                            id="ai-partner"
                            type="text"
                            maxLength={200}
                            placeholder="e.g. SOS Children's Villages Pakistan"
                            value={inputs.mainPartner}
                            onChange={(e) => set("mainPartner", e.target.value)}
                        />
                        <p className="mt-1 text-[10px] text-[#7a919a]">
                            Only the one partner who approves your opportunity. You will still add their contact person and
                            official email yourself.
                        </p>
                    </div>
                    {workload ? (
                        <div className="co-note aqua">
                            <span>{workload}</span>
                        </div>
                    ) : null}
                    <div className="co-note">
                        <span>
                            AI drafts text only. Faculty, partner contacts, location pin, safety declarations and your signature
                            stay with you.
                        </span>
                    </div>
                    {error ? (
                        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                            {error}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-[#e6ecef] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <button
                        type="button"
                        className="rounded-[13px] border border-[#dde5ea] px-4 py-2.5 text-[12.5px] font-extrabold text-[#3c5a5c]"
                        disabled={busy}
                        onClick={() => onClose(inputs)}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-[13px] bg-[#0e7d74] px-5 py-2.5 text-[12.5px] font-extrabold text-white disabled:opacity-60"
                        disabled={busy}
                        onClick={() => void generate()}
                    >
                        {busy ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Drafting… (up to a minute)
                            </>
                        ) : (
                            "✦ Generate & Fill Form"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
