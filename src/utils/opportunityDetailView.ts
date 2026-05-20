/** Read structured `detail_view` from API or fall back to legacy opportunity fields. */

export type OpportunityDetailViewPayload = {
    overview?: {
        title?: string;
        types?: string[];
        mode?: string | null;
    };
    timeline?: {
        type?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        from_time?: string | null;
        to_time?: string | null;
        expected_hours?: number | null;
        volunteers_required?: number | null;
    };
    location?: {
        city?: string | null;
        venue?: string | null;
        pin?: string | null;
    };
    objectives?: {
        description?: string;
        description_items?: string[];
        beneficiaries_count?: number | null;
        beneficiaries_type?: string[];
    };
    sdg?: {
        primary?: Record<string, unknown> | null;
        secondary?: unknown[];
    };
    activity?: {
        student_responsibilities?: string;
        student_responsibilities_preview?: string;
        student_responsibilities_is_long?: boolean;
        skills_gained?: string[];
    };
    supervision?: {
        faculty?: {
            name?: string | null;
            role?: string | null;
            email?: string | null;
            department?: string | null;
            university?: string | null;
        };
        partner?: {
            organization?: string | null;
            contact_person?: string | null;
            email?: string | null;
        };
    };
};

export function pickOpportunityDetailView(raw: Record<string, unknown> | null | undefined): OpportunityDetailViewPayload | null {
    const dv = raw?.detail_view ?? raw?.detailView;
    if (dv && typeof dv === "object" && !Array.isArray(dv)) {
        return dv as OpportunityDetailViewPayload;
    }
    return null;
}

export function readActivityPlan(raw: Record<string, unknown>): {
    full: string;
    preview: string;
    isLong: boolean;
    skills: string[];
} {
    const dv = pickOpportunityDetailView(raw);
    if (dv?.activity) {
        return {
            full: String(dv.activity.student_responsibilities || "").trim(),
            preview: String(dv.activity.student_responsibilities_preview || dv.activity.student_responsibilities || "").trim(),
            isLong: Boolean(dv.activity.student_responsibilities_is_long),
            skills: Array.isArray(dv.activity.skills_gained) ? dv.activity.skills_gained : [],
        };
    }
    const act = raw?.activity_details as { student_responsibilities?: string; skills_gained?: string[] } | undefined;
    const full = String(act?.student_responsibilities || "").trim();
    const isLong = full.length > 1_500;
    return {
        full,
        preview: isLong ? `${full.slice(0, 1_500).trim()}\n\n…` : full,
        isLong,
        skills: Array.isArray(act?.skills_gained) ? act.skills_gained : [],
    };
}

export function readObjectiveItems(raw: Record<string, unknown>): { description: string; items: string[] } {
    const dv = pickOpportunityDetailView(raw);
    if (dv?.objectives) {
        return {
            description: String(dv.objectives.description || "").trim(),
            items: Array.isArray(dv.objectives.description_items) ? dv.objectives.description_items : [],
        };
    }
    const obj = raw?.objectives as { description?: string } | undefined;
    const description = String(obj?.description || raw?.description || "").trim();
    return { description, items: description ? [description] : [] };
}

export type OpportunitySdgAlignmentRow = {
    role: "primary" | "secondary";
    sdg_id: string;
    target_id?: string;
    indicator_id?: string;
    justification?: string;
};

function pickSdgField(row: Record<string, unknown>, ...keys: string[]): string {
    for (const k of keys) {
        const v = row[k];
        if (v != null && String(v).trim()) return String(v).trim();
    }
    return "";
}

/** Primary + secondary SDGs from `detail_view`, `sdg_info`, and `secondary_sdgs`. */
export function readOpportunitySdgAlignments(raw: Record<string, unknown> | null | undefined): OpportunitySdgAlignmentRow[] {
    if (!raw || typeof raw !== "object") return [];

    const rows: OpportunitySdgAlignmentRow[] = [];
    const seen = new Set<string>();

    const pushRow = (row: OpportunitySdgAlignmentRow) => {
        const key = `${row.role}:${row.sdg_id}:${row.target_id ?? ""}:${row.indicator_id ?? ""}`;
        if (seen.has(key)) return;
        seen.add(key);
        rows.push(row);
    };

    const dv = pickOpportunityDetailView(raw);
    const primaryFromDv =
        dv?.sdg?.primary && typeof dv.sdg.primary === "object" ? (dv.sdg.primary as Record<string, unknown>) : null;
    const primary = primaryFromDv ?? (raw.sdg_info && typeof raw.sdg_info === "object" ? (raw.sdg_info as Record<string, unknown>) : null);
    if (primary) {
        const sdgId = pickSdgField(primary, "sdg_id", "sdgId") || pickSdgField(raw, "sdg");
        if (sdgId) {
            pushRow({
                role: "primary",
                sdg_id: sdgId,
                target_id: pickSdgField(primary, "target_id", "targetId") || undefined,
                indicator_id: pickSdgField(primary, "indicator_id", "indicatorId") || undefined,
            });
        }
    }

    const secondarySources: unknown[] = [];
    if (Array.isArray(dv?.sdg?.secondary)) secondarySources.push(...dv.sdg.secondary);
    if (Array.isArray(raw.secondary_sdgs)) secondarySources.push(...raw.secondary_sdgs);
    if (raw.secondary_sdg && typeof raw.secondary_sdg === "object") secondarySources.push(raw.secondary_sdg);

    for (const item of secondarySources) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const sdgId = pickSdgField(o, "sdg_id", "sdgId");
        if (!sdgId) continue;
        pushRow({
            role: "secondary",
            sdg_id: sdgId,
            target_id: pickSdgField(o, "target_id", "targetId") || undefined,
            indicator_id: pickSdgField(o, "indicator_id", "indicatorId") || undefined,
            justification: pickSdgField(o, "justification") || undefined,
        });
    }

    return rows;
}

export function formatOpportunitySdgAlignmentLine(row: OpportunitySdgAlignmentRow): string {
    const parts = [`SDG ${row.sdg_id}`];
    if (row.target_id) parts.push(`Target ${row.target_id}`);
    if (row.indicator_id) parts.push(`Indicator ${row.indicator_id}`);
    return parts.join(" · ");
}

export function readSupervisionStakeholders(raw: Record<string, unknown>) {
    const dv = pickOpportunityDetailView(raw);
    if (dv?.supervision) {
        return dv.supervision;
    }
    const sup = raw?.supervision as Record<string, unknown> | undefined;
    return {
        faculty: {
            name: typeof sup?.supervisor_name === "string" ? sup.supervisor_name : null,
            role: typeof sup?.role === "string" ? sup.role : null,
            email: typeof sup?.contact === "string" ? sup.contact : null,
            department: typeof sup?.faculty_department === "string" ? sup.faculty_department : null,
            university: typeof sup?.faculty_university_name === "string" ? sup.faculty_university_name : null,
        },
        partner: {
            organization: typeof sup?.partner_org_name === "string" ? sup.partner_org_name : null,
            contact_person: typeof sup?.partner_contact_person === "string" ? sup.partner_contact_person : null,
            email: typeof sup?.partner_email === "string" ? sup.partner_email : null,
        },
    };
}
