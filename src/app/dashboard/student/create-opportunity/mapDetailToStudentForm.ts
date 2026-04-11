/**
 * Maps opportunity detail API shape into student create-opportunity form state.
 */

const BENEFICIARY_PREDEFINED = new Set([
    "Children",
    "Youth",
    "Women",
    "Elderly",
    "Persons with disabilities",
    "Students",
    "Community members",
]);

export function mapOpportunityDetailToStudentForm(d: Record<string, unknown>): {
    studentDetailsPatch: Partial<{
        name: string;
        email: string;
        institution: string;
        department: string;
        city: string;
        contact: string;
    }>;
    formDataPatch: Record<string, unknown>;
} {
    const sup = (d.supervision && typeof d.supervision === "object" ? d.supervision : {}) as Record<
        string,
        unknown
    >;
    const extC =
        d.external_partner_collaboration && typeof d.external_partner_collaboration === "object"
            ? (d.external_partner_collaboration as Record<string, unknown>)
            : {};
    const po =
        d.partner_organization && typeof d.partner_organization === "object"
            ? (d.partner_organization as Record<string, unknown>)
            : {};
    const timeline = (d.timeline && typeof d.timeline === "object" ? d.timeline : {}) as Record<
        string,
        unknown
    >;
    const sdgInfo = (d.sdg_info && typeof d.sdg_info === "object" ? d.sdg_info : {}) as Record<
        string,
        unknown
    >;
    const objectives = (d.objectives && typeof d.objectives === "object" ? d.objectives : {}) as Record<
        string,
        unknown
    >;
    const activity = (d.activity_details && typeof d.activity_details === "object"
        ? d.activity_details
        : {}) as Record<string, unknown>;
    const safety = (d.safety_declaration && typeof d.safety_declaration === "object"
        ? d.safety_declaration
        : {}) as Record<string, unknown>;
    const subConf =
        d.submission_confirmations && typeof d.submission_confirmations === "object"
            ? (d.submission_confirmations as Record<string, unknown>)
            : {};
    const scope = (d.participation_scope && typeof d.participation_scope === "object"
        ? d.participation_scope
        : {}) as Record<string, unknown>;
    const deptRest =
        scope.department_restriction && typeof scope.department_restriction === "object"
            ? (scope.department_restriction as Record<string, unknown>)
            : {};
    const ex = (d.executing_context && typeof d.executing_context === "object"
        ? d.executing_context
        : {}) as Record<string, unknown>;
    const exTypeRaw = String(ex.type || "").toLowerCase();
    const partnerBlock =
        ex.partner && typeof ex.partner === "object" ? (ex.partner as Record<string, unknown>) : {};
    const indBlock =
        ex.independent_community_activity && typeof ex.independent_community_activity === "object"
            ? (ex.independent_community_activity as Record<string, unknown>)
            : {};

    let executingContext: "" | "partner" | "independent" = "";
    if (exTypeRaw === "partner") executingContext = "partner";
    else if (exTypeRaw === "independent") executingContext = "independent";
    else if (typeof sup.partner_org_name === "string" && sup.partner_org_name.trim()) executingContext = "partner";
    else if (typeof sup.external_partner_org_name === "string" && sup.external_partner_org_name.trim())
        executingContext = "partner";
    else if (typeof sup.external_partner_email === "string" && sup.external_partner_email.trim())
        executingContext = "partner";
    else if (typeof po.official_email === "string" && po.official_email.trim()) executingContext = "partner";
    else if (typeof extC.official_email === "string" && extC.official_email.trim()) executingContext = "partner";
    else executingContext = "independent";

    const typesRaw = Array.isArray(d.types) ? (d.types as string[]) : [];
    const opportunityType: string[] = [];
    const otherSpecs: string[] = [];
    for (const t of typesRaw) {
        if (t.startsWith("Other: ")) {
            otherSpecs.push(t.slice(7).trim());
        } else if (t) {
            opportunityType.push(t);
        }
    }
    if (otherSpecs.length > 0 && !opportunityType.includes("Other")) {
        opportunityType.push("Other");
    }
    if (opportunityType.includes("Other") && otherSpecs.length === 0) otherSpecs.push("");

    const beneficiariesTypeRaw = Array.isArray(objectives.beneficiaries_type)
        ? (objectives.beneficiaries_type as string[])
        : [];
    const beneficiariesPredefined: string[] = [];
    const beneficiariesOther: string[] = [];
    for (const b of beneficiariesTypeRaw) {
        if (BENEFICIARY_PREDEFINED.has(b)) beneficiariesPredefined.push(b);
        else beneficiariesOther.push(b);
    }

    const verification = Array.isArray(d.verification_method) ? (d.verification_method as string[]) : [];

    const secondaryList = Array.isArray(d.secondary_sdgs) ? (d.secondary_sdgs as Record<string, unknown>[]) : [];
    const sec0 = secondaryList[0] || {};

    const deptScope = deptRest.scope === "specific" ? "specific" : "all";
    const departments = Array.isArray(deptRest.departments)
        ? (deptRest.departments as string[]).filter(Boolean)
        : [""];

    const studentDetailsPatch = {
        institution:
            (typeof scope.creator_university_name === "string" && scope.creator_university_name) ||
            (typeof sup.faculty_university_name === "string" && sup.faculty_university_name) ||
            "",
        contact: typeof d.student_contact === "string" ? d.student_contact : "",
    };

    const formDataPatch: Record<string, unknown> = {
        title: typeof d.title === "string" ? d.title : "",
        opportunityType: opportunityType.length ? opportunityType : [],
        otherActivitySpecs: otherSpecs.length ? otherSpecs : [""],
        mode: typeof d.mode === "string" ? d.mode : "",
        location:
            d.location && typeof d.location === "object"
                ? d.location
                : { city: "", venue: "", pin: "" },
        timelineType: typeof timeline.type === "string" ? timeline.type : "",
        dates: {
            start: typeof timeline.start_date === "string" ? timeline.start_date : "",
            end: typeof timeline.end_date === "string" ? timeline.end_date : "",
            fromTime: typeof timeline.from_time === "string" ? timeline.from_time : "",
            endTime: typeof timeline.to_time === "string" ? timeline.to_time : "",
        },
        capacity: {
            hours: timeline.expected_hours != null ? String(timeline.expected_hours) : "",
            volunteers: timeline.volunteers_required != null ? String(timeline.volunteers_required) : "",
        },
        sdg: typeof sdgInfo.sdg_id === "string" ? sdgInfo.sdg_id : typeof d.sdg === "string" ? d.sdg : "",
        target: typeof sdgInfo.target_id === "string" ? sdgInfo.target_id : "",
        indicator: typeof sdgInfo.indicator_id === "string" ? sdgInfo.indicator_id : "",
        secondarySdg: typeof sec0.sdg_id === "string" ? sec0.sdg_id : "",
        secondaryTarget: typeof sec0.target_id === "string" ? sec0.target_id : "",
        secondaryIndicator: typeof sec0.indicator_id === "string" ? sec0.indicator_id : "",
        objectives: {
            description: typeof objectives.description === "string" ? objectives.description : "",
            beneficiariesCount:
                objectives.beneficiaries_count != null ? String(objectives.beneficiaries_count) : "",
            beneficiariesType: beneficiariesPredefined,
            isOtherBeneficiaryChecked: beneficiariesOther.length > 0,
            otherBeneficiarySpecs: beneficiariesOther.length ? beneficiariesOther : [""],
        },
        activity: {
            responsibilities:
                typeof activity.student_responsibilities === "string" ? activity.student_responsibilities : "",
            skills: Array.isArray(activity.skills_gained) ? [...(activity.skills_gained as string[])] : [],
            isOtherSkillChecked: false,
            otherSkills: [""] as string[],
        },
        supervision: {
            facultyName: typeof sup.supervisor_name === "string" ? sup.supervisor_name : "",
            facultyDesignation: typeof sup.role === "string" ? sup.role : "",
            facultyDepartment: typeof sup.faculty_department === "string" ? sup.faculty_department : "",
            facultyOfficialEmail: typeof sup.contact === "string" ? sup.contact : "",
            executingContext,
            partnerOrgName:
                executingContext === "partner"
                    ? typeof sup.partner_org_name === "string"
                        ? sup.partner_org_name
                        : typeof sup.external_partner_org_name === "string"
                          ? sup.external_partner_org_name
                          : typeof partnerBlock.organization_name === "string"
                            ? partnerBlock.organization_name
                            : typeof extC.organization_name === "string"
                              ? extC.organization_name
                              : typeof po.organization_name === "string"
                                ? po.organization_name
                                : ""
                    : "",
            partnerContactPerson:
                executingContext === "partner"
                    ? typeof sup.partner_contact_person === "string"
                        ? sup.partner_contact_person
                        : typeof sup.external_partner_contact_person === "string"
                          ? sup.external_partner_contact_person
                          : typeof partnerBlock.contact_person === "string"
                            ? partnerBlock.contact_person
                            : typeof extC.contact_person === "string"
                              ? extC.contact_person
                              : typeof po.contact_person === "string"
                                ? po.contact_person
                                : ""
                    : "",
            partnerEmail:
                executingContext === "partner"
                    ? typeof sup.partner_email === "string"
                        ? sup.partner_email
                        : typeof sup.external_partner_email === "string"
                          ? sup.external_partner_email
                          : typeof partnerBlock.official_email === "string"
                            ? partnerBlock.official_email
                            : typeof extC.official_email === "string"
                              ? extC.official_email
                              : typeof po.official_email === "string"
                                ? po.official_email
                                : ""
                    : "",
            independentSiteDescription:
                typeof indBlock.activity_site_description === "string" ? indBlock.activity_site_description : "",
            independentLocalContact:
                typeof indBlock.local_contact_person === "string" ? indBlock.local_contact_person : "",
            independentContactPhone: typeof indBlock.contact_number === "string" ? indBlock.contact_number : "",
            declSafeEnvironment: safety.environment_safe_and_appropriate === true,
            declNoHazardous: safety.precautions_and_basic_safety === true,
            declFacultyOversight: safety.students_guided_and_supervised === true,
            declEthicalLawful: safety.lawful_ethical_and_non_hazardous === true,
        },
        sectionFConfirmations: {
            facultyApproval: subConf.activity_properly_supervised === true,
            genuineAccurate: subConf.academically_valid_and_accurately_described === true,
            safeAppropriate: subConf.environment_safe_and_appropriate === true,
            truthfulVerifiable: subConf.information_correct_and_verifiable === true,
        },
        participation: {
            departmentScope: deptScope,
            departments: departments.length ? departments : [""],
            sectionsNote: typeof deptRest.sections_or_class_note === "string" ? deptRest.sections_or_class_note : "",
        },
        verification,
        visibility: "restricted" as const,
    };

    return { studentDetailsPatch, formDataPatch };
}
