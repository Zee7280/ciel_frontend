"use client";

import { criterionLabel, type CiiV45SectionResult } from "@/utils/communityCiiAnalyser";
import { anchorName, anchorPoints, formatPts } from "@/utils/ciiAnalyserView";
import { diffCriterionEdits, markInputText, markRowsFor, MIN_MODERATION_REASON } from "@/utils/ciiModerationView";

/**
 * One section's criterion table.
 *  - "legacy": the original read-only table, unchanged (R1/R2 analyses, faculty view).
 *  - "r3-readonly": R3 table for a locked score or a viewer who cannot edit: shows the reviewed mark,
 *    and for an Admin-reviewed criterion its tag and the original AI mark.
 *  - "r3-edit": R3 table for the Admin on an unlocked analysis: AI baseline, an editable Reviewed
 *    mark per criterion, and a reason + Save for the section. The server recomputes every total.
 */
export type CriterionMarksMode = "legacy" | "r3-readonly" | "r3-edit";

export function CiiCriterionMarks({
    section,
    mode,
    dirty,
    onDirty,
    onRestore,
    reason,
    onReason,
    sourceRef,
    onSourceRef,
    saving,
    onSave,
    onDiscard,
}: {
    section: CiiV45SectionResult;
    mode: CriterionMarksMode;
    /** Inputs the Admin touched in this section (criterion key -> text). */
    dirty: Record<string, string>;
    onDirty: (criterion: string, value: string) => void;
    onRestore: (criterion: string, aiScore: number | null) => void;
    reason: string;
    onReason: (value: string) => void;
    sourceRef: string;
    onSourceRef: (value: string) => void;
    saving: boolean;
    onSave: () => void;
    onDiscard: () => void;
}) {
    if (mode === "legacy") {
        return (
            <div className="crit-table-wrap">
                <table className="crit-table">
                    <thead>
                        <tr>
                            <th>Locked criterion</th>
                            <th>Anchor</th>
                            <th>Marks</th>
                            <th>AI reasoning</th>
                        </tr>
                    </thead>
                    <tbody>
                        {section.criterionScores.map((criterion) => {
                            const weight = criterion.maximumPoints || 0;
                            const pts = typeof criterion.score === "number" ? criterion.score : anchorPoints(weight, criterion.anchor);
                            return (
                                <tr key={criterion.criterion}>
                                    <td>
                                        <strong>{criterionLabel(section.dimension, criterion.criterion)}</strong>
                                    </td>
                                    <td>{criterion.anchor === "P" ? "Pending" : `${criterion.anchor} · ${anchorName(criterion.anchor)}`}</td>
                                    <td className="crit-pts">
                                        {formatPts(pts)} / {weight}
                                    </td>
                                    <td>{criterion.reasoningSummary?.trim() ? criterion.reasoningSummary : <em>No reasoning supplied by the AI</em>}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    const editable = mode === "r3-edit";
    const rows = markRowsFor(section);
    const diff = diffCriterionEdits(rows, dirty);
    const dirtyCount = Object.keys(dirty).length;
    const reasonShort = diff.changed.length > 0 && reason.trim().length < MIN_MODERATION_REASON;

    return (
        <div className="crit-table-wrap">
            <table className="crit-table">
                <thead>
                    <tr>
                        <th>Locked criterion</th>
                        <th>AI baseline</th>
                        <th>{editable ? "Reviewed mark" : "Mark"}</th>
                        <th>AI reasoning</th>
                    </tr>
                </thead>
                <tbody>
                    {section.criterionScores.map((criterion, i) => {
                        const row = rows[i];
                        const weight = criterion.maximumPoints || 0;
                        const edited = criterion.adminEdited === true;
                        const err = diff.errors[criterion.criterion];
                        return (
                            <tr key={criterion.criterion} className={edited ? "crit-edited" : undefined}>
                                <td>
                                    <strong>{criterionLabel(section.dimension, criterion.criterion)}</strong>
                                    {edited ? <span className="tag crit-tag">Admin-reviewed</span> : null}
                                </td>
                                <td>
                                    {criterion.anchor === "P" ? "Pending" : `${criterion.anchor} · ${anchorName(criterion.anchor)}`}
                                    <div className="optional">AI mark {row.aiScore == null ? "pending" : formatPts(row.aiScore)} / {weight}</div>
                                </td>
                                <td className="crit-pts">
                                    {editable ? (
                                        <>
                                            <input
                                                type="number"
                                                className="crit-input"
                                                inputMode="decimal"
                                                min={0}
                                                max={weight}
                                                step={0.01}
                                                value={criterion.criterion in dirty ? dirty[criterion.criterion] : markInputText(criterion.score)}
                                                placeholder={criterion.score == null ? "pending" : ""}
                                                aria-label={`Reviewed mark for ${criterionLabel(section.dimension, criterion.criterion)}`}
                                                onChange={(e) => onDirty(criterion.criterion, e.target.value)}
                                                disabled={saving}
                                            />{" "}
                                            / {weight}
                                            {edited ? (
                                                <button type="button" className="crit-restore" disabled={saving} onClick={() => onRestore(criterion.criterion, row.aiScore)}>
                                                    Restore AI mark
                                                </button>
                                            ) : null}
                                            {err ? <div className="crit-error">{err}</div> : null}
                                        </>
                                    ) : (
                                        <>
                                            {criterion.score == null ? "Pending" : formatPts(criterion.score)} / {weight}
                                            {edited ? <div className="optional">AI mark {formatPts(row.aiScore)}</div> : null}
                                        </>
                                    )}
                                </td>
                                <td>
                                    {criterion.reasoningSummary?.trim() ? criterion.reasoningSummary : <em>No reasoning supplied by the AI</em>}
                                    {edited && criterion.adminEdit ? <div className="optional">Admin: {criterion.adminEdit.reason}</div> : null}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {editable ? (
                <div className="crit-save">
                    <textarea
                        value={reason}
                        onChange={(e) => onReason(e.target.value)}
                        disabled={saving}
                        placeholder={`Reason for the changed marks (at least ${MIN_MODERATION_REASON} characters). Say what in the report or evidence supports it.`}
                    />
                    <input type="text" value={sourceRef} onChange={(e) => onSourceRef(e.target.value)} disabled={saving} placeholder="Source reference (optional), e.g. section4.activities[0]" />
                    <div className="crit-save-actions">
                        <button type="button" className="primary" disabled={saving || diff.changed.length === 0 || reasonShort || Object.keys(diff.errors).length > 0} onClick={onSave}>
                            {saving ? "Saving…" : `Save reviewed marks${diff.changed.length ? ` (${diff.changed.length})` : ""}`}
                        </button>
                        <button type="button" className="secondary" disabled={saving || dirtyCount === 0} onClick={onDiscard}>
                            Discard changes
                        </button>
                        <span className="optional">The AI mark stays on record. The section total and the CII are recomputed by the server.</span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
