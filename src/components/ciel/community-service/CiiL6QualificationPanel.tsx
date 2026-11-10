"use client";

import type { CiiV45L6Assessment } from "@/utils/communityCiiAnalyser";
import type { L6Form } from "@/utils/ciiModerationView";

/**
 * R3 "L6 sustained-impact qualification". A 90+ CII is kept either way; L6 is awarded only when the
 * numeric minima hold and the Admin confirms observed retention, community ownership or adoption, and
 * corroboration from outside the student team against a named source. The server re-checks all of it.
 *  - "approve": shown before approval; whatever is ticked travels with the Approve request.
 *  - "confirm": shown after an approval that left L6 pending; posts to the L6 qualification endpoint.
 */
export function CiiL6QualificationPanel({
    mode,
    form,
    onChange,
    assessment,
    disabled,
    busy,
    onConfirm,
}: {
    mode: "approve" | "confirm";
    form: L6Form;
    onChange: (next: L6Form) => void;
    assessment: CiiV45L6Assessment | null;
    disabled: boolean;
    busy?: boolean;
    onConfirm?: () => void;
}) {
    const reasons = assessment?.reasons ?? [];
    const qualified = assessment?.status === "QUALIFIED";
    return (
        <div className="full card l6-panel" data-testid="l6-panel">
            <div className="eyebrow">L6 SUSTAINED-IMPACT QUALIFICATION · CURRENT PUBLISHED POLICY</div>
            <p className="optional" style={{ margin: "6px 0 10px" }}>
                {mode === "approve"
                    ? "A 90+ CII is retained either way. L6 is awarded only when the minima below hold and the confirmations are sourced; otherwise the CII is kept and L6 stays pending. It is never replaced by L5."
                    : "This approval kept the 90+ CII with L6 pending. Record the sourced confirmations to award L6. The CII and the approval do not change."}
            </p>
            <label className="confirm-box">
                <input type="checkbox" checked={form.observedRetention} disabled={disabled} onChange={(e) => onChange({ ...form, observedRetention: e.target.checked })} />
                <span>A completed later check demonstrates retained benefits.</span>
            </label>
            <label className="confirm-box">
                <input type="checkbox" checked={form.communityOwnership} disabled={disabled} onChange={(e) => onChange({ ...form, communityOwnership: e.target.checked })} />
                <span>Community ownership, accepted handover or actual adoption is established.</span>
            </label>
            <label className="confirm-box">
                <input type="checkbox" checked={form.externalCorroboration} disabled={disabled} onChange={(e) => onChange({ ...form, externalCorroboration: e.target.checked })} />
                <span>A source outside the student team corroborates the claim.</span>
            </label>
            <input
                type="text"
                className="l6-source"
                value={form.sourceRef}
                disabled={disabled}
                onChange={(e) => onChange({ ...form, sourceRef: e.target.value })}
                placeholder="Supporting source reference (report section, follow-up record or evidence ID)"
                aria-label="L6 qualification source reference"
            />
            <div className="l6-checklist">
                {assessment && assessment.status !== "NOT_REQUIRED" ? (
                    qualified ? (
                        <div className="checklist-row ok">
                            <span className="checklist-mark">✓</span>
                            <span className="checklist-label">Qualification complete</span>
                            <span className="checklist-detail">L6 will be awarded.</span>
                        </div>
                    ) : (
                        reasons.map((reason) => (
                            <div key={reason} className="checklist-row">
                                <span className="checklist-mark">•</span>
                                <span className="checklist-label">{reason}</span>
                            </div>
                        ))
                    )
                ) : null}
            </div>
            {mode === "confirm" ? (
                <div className="approve-actions">
                    <button type="button" className="primary" disabled={disabled || busy || !qualified} onClick={onConfirm}>
                        {busy ? "Saving…" : "Confirm L6 qualification"}
                    </button>
                </div>
            ) : null}
        </div>
    );
}
