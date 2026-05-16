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
