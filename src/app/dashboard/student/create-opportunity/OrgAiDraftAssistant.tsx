"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { usePublicPlatformConfig } from "@/utils/publicPlatformConfig";
import { findSdgById, findSdgIndicator, findSdgTarget } from "@/utils/sdgData";
import { PAKISTAN_REGION_OPTIONS } from "@/utils/pakistanRegions";
import { OPPORTUNITY_BENEFICIARY_PRESETS, ORG_SKILL_PRESETS } from "@/utils/opportunityChipOptions";
import AiDraftModal from "./AiDraftModal";
import {
    aiDraftInputsFromOrgForm,
    applyAiDraftToOrgForm,
    type AiDraftFields,
    type AiDraftInputs,
    type AiDraftOrgFormShape,
} from "./aiDraft";

/** Activity-type chips on the faculty and partner wizards (Section B). */
export const ORG_ACTIVITY_TYPE_OPTIONS = [
    "Community Service",
    "Volunteer Activity",
    "Awareness Campaign",
    "Training / Teaching",
    "Research / Survey Support",
    "Technical / Professional Support",
    "Environmental Action",
    "Corporate CSR Activity",
] as const;

type Props<F extends AiDraftOrgFormShape> = {
    formData: F;
    setFormData: Dispatch<SetStateAction<F>>;
    creatorPathway: "faculty" | "organization";
    /** Partner / co-host name already in the form (pre-fills the modal). */
    mainPartner: string;
    /** Puts a partner name typed in the modal into the form's own partner block (only when empty). */
    withMainPartner: (form: F, name: string) => F;
    /** Hidden while an existing listing is still loading. */
    hidden?: boolean;
    /** Runs after the drafted form has rendered (the page moves to step B and saves its draft). */
    onApplied: () => void;
};

/**
 * "✦ AI Opportunity Assistant" for the faculty (also Super Admin) and partner / NGO / university /
 * corporate wizards. Same admin switch and endpoint as the student form; the AI drafts text only.
 */
export default function OrgAiDraftAssistant<F extends AiDraftOrgFormShape>({
    formData,
    setFormData,
    creatorPathway,
    mainPartner,
    withMainPartner,
    hidden,
    onApplied,
}: Props<F>) {
    const enabled = usePublicPlatformConfig().student_ai_draft_enabled;
    const [open, setOpen] = useState(false);
    const [lastInputs, setLastInputs] = useState<AiDraftInputs | null>(null);
    const [feasibility, setFeasibility] = useState("");
    const [appliedCount, setAppliedCount] = useState(0);

    useEffect(() => {
        if (appliedCount > 0) onApplied();
        // Only after a new draft is applied; onApplied changes identity every page render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appliedCount]);

    if (!enabled || hidden) return null;

    const apply = (fields: AiDraftFields, inputs: AiDraftInputs) => {
        setFormData((prev) => {
            let next = applyAiDraftToOrgForm(prev, fields, inputs, {
                cityOptions: PAKISTAN_REGION_OPTIONS,
                sdgTargetExists: (sdgId, targetId) => Boolean(findSdgTarget(findSdgById(sdgId), targetId)),
                sdgIndicatorExists: (sdgId, targetId, indicatorId) =>
                    Boolean(findSdgIndicator(findSdgTarget(findSdgById(sdgId), targetId), indicatorId)),
                activityTypeOptions: ORG_ACTIVITY_TYPE_OPTIONS,
                skillOptions: ORG_SKILL_PRESETS,
                beneficiaryOptions: OPPORTUNITY_BENEFICIARY_PRESETS,
            });
            const partner = inputs.mainPartner.trim();
            if (partner) next = withMainPartner(next, partner);
            return next;
        });
        setLastInputs(inputs);
        setOpen(false);
        setFeasibility(fields.feasibility_warning.trim());
        setAppliedCount((n) => n + 1);
        toast.success("Draft filled — review every step before submitting.");
    };

    const initial = aiDraftInputsFromOrgForm(formData, mainPartner);

    return (
        <>
            {open ? (
                <AiDraftModal
                    initial={lastInputs ? { ...initial, idea: lastInputs.idea } : initial}
                    creatorPathway={creatorPathway}
                    teamModeChoosable={false}
                    onClose={(inputs) => {
                        setLastInputs(inputs);
                        setOpen(false);
                    }}
                    onApply={apply}
                />
            ) : null}
            <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-[#cfe6df] bg-[linear-gradient(135deg,#edf8f4,#fff)] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-extrabold text-[#0d2b33]">✦ AI Opportunity Assistant</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#3c5a5c]">
                        Describe your idea once in any words — AI drafts the editable fields of this form. You review every
                        step.
                    </p>
                </div>
                <button
                    type="button"
                    className="shrink-0 rounded-[13px] bg-[#0e7d74] px-4 py-2.5 text-[12px] font-extrabold text-white"
                    onClick={() => setOpen(true)}
                >
                    ✦ Generate &amp; Auto-Fill
                </button>
            </div>
            {feasibility ? (
                <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11.5px] leading-relaxed text-amber-950">
                    <p className="font-extrabold">✨ AI scope and hours check</p>
                    <p className="mt-1 whitespace-pre-line">{feasibility}</p>
                </div>
            ) : null}
        </>
    );
}
