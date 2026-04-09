/**
 * Maps GET/POST opportunity detail (API / entity shape) into faculty create form state.
 * Safe for partial / missing nested objects.
 */

type ParticipationRule =
    | "open_all_universities"
    | "restricted_specific_universities"
    | "own_university_only"
    | "departments_across_universities"
    | "own_university_departments";

export function mapOpportunityDetailToFacultyForm(d: Record<string, unknown>): {
    facultyDetailsPatch: Partial<{
        name: string;
        institution: string;
        city: string;
        contact: string;
        email: string;
    }>;
    formDataPatch: Record<string, unknown>;
} {
    const sup = (d.supervision && typeof d.supervision === "object" ? d.supervision : {}) as Record<
        string,
        unknown
    >;
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
    const scope = (d.participation_scope && typeof d.participation_scope === "object"
        ? d.participation_scope
        : {}) as Record<string, unknown>;
    const deptRest =
        scope.department_restriction && typeof scope.department_restriction === "object"
            ? (scope.department_restriction as Record<string, unknown>)
            : {};
    const academicRaw =
        d.academic_linkage && typeof d.academic_linkage === "object"
            ? (d.academic_linkage as Record<string, unknown>)
            : {};
    const subConf =
        d.submission_confirmations && typeof d.submission_confirmations === "object"
            ? (d.submission_confirmations as Record<string, unknown>)
            : {};

    const extOrg = sup.external_partner_org_name || sup.partner_org_name;
    const extContact = sup.external_partner_contact_person || sup.partner_contact_person;
    const extEmail = sup.external_partner_email || sup.partner_email;
    const hasPartner = Boolean(
        (typeof extOrg === "string" && extOrg.trim()) ||
            (typeof extContact === "string" && extContact.trim()) ||
            (typeof extEmail === "string" && extEmail.trim()),
    );

    const typesRaw = Array.isArray(d.types) ? (d.types as string[]) : [];
    const opportunityType: string[] = [];
    const otherSpecs: string[] = [];
    let isOtherTypeChecked = false;
    for (const t of typesRaw) {
        if (t.startsWith("Other: ")) {
            isOtherTypeChecked = true;
            otherSpecs.push(t.slice(7).trim());
        } else {
            opportunityType.push(t);
        }
    }

    const rule = (scope.rule as ParticipationRule) || "open_all_universities";
    const uniNames = Array.isArray(scope.university_names) ? (scope.university_names as string[]) : [];
    const departments = Array.isArray(deptRest.departments)
        ? (deptRest.departments as string[]).filter(Boolean)
        : [""];

    const beneficiariesType = Array.isArray(objectives.beneficiaries_type)
        ? (objectives.beneficiaries_type as string[])
        : [];

    const verification = Array.isArray(d.verification_method) ? (d.verification_method as string[]) : [];

    const facultyDetailsPatch = {
        name: typeof sup.supervisor_name === "string" ? sup.supervisor_name : "",
        institution:
            typeof sup.faculty_university_name === "string" ? sup.faculty_university_name : "",
        city: "",
        contact: "",
        email: typeof sup.contact === "string" ? sup.contact : "",
    };

    const formDataPatch: Record<string, unknown> = {
        title: typeof d.title === "string" ? d.title : "",
        opportunityType,
        isOtherTypeChecked,
        otherTypeSpecs: otherSpecs.length ? otherSpecs : [""],
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
            hours:
                timeline.expected_hours != null ? String(timeline.expected_hours) : "",
            volunteers:
                timeline.volunteers_required != null ? String(timeline.volunteers_required) : "",
        },
        sdg: typeof sdgInfo.sdg_id === "string" ? sdgInfo.sdg_id : typeof d.sdg === "string" ? d.sdg : "",
        target: typeof sdgInfo.target_id === "string" ? sdgInfo.target_id : "",
        indicator: typeof sdgInfo.indicator_id === "string" ? sdgInfo.indicator_id : "",
        secondarySdgs: Array.isArray(d.secondary_sdgs)
            ? (d.secondary_sdgs as Record<string, string>[]).map((s) => ({
                  sdgId: s.sdg_id || "",
                  targetId: s.target_id || "",
                  indicatorId: s.indicator_id || "",
                  justification: s.justification || "",
              }))
            : [],
        objectives: {
            description: typeof objectives.description === "string" ? objectives.description : "",
            beneficiariesCount:
                objectives.beneficiaries_count != null ? String(objectives.beneficiaries_count) : "",
            beneficiariesType,
            isOtherBeneficiaryChecked: false,
            otherBeneficiarySpecs: [""] as string[],
        },
        activity: {
            responsibilities:
                typeof activity.student_responsibilities === "string"
                    ? activity.student_responsibilities
                    : "",
            skills: Array.isArray(activity.skills_gained) ? (activity.skills_gained as string[]) : [],
            isOtherSkillChecked: false,
            otherSkills: [""] as string[],
        },
        academicLead: {
            designation: typeof sup.role === "string" ? sup.role : "",
            department: typeof sup.faculty_department === "string" ? sup.faculty_department : "",
            officialEmail: typeof sup.contact === "string" ? sup.contact : "",
        },
        partnerCollaboration: {
            hasPartner,
            orgName: typeof extOrg === "string" ? extOrg : "",
            contactPerson: typeof extContact === "string" ? extContact : "",
            email: typeof extEmail === "string" ? extEmail : "",
        },
        safetyDeclarations: {
            safeAppropriate: safety.environment_safe_and_appropriate === true,
            guidedSupervised: safety.students_guided_and_supervised === true,
            lawfulEthical: safety.lawful_ethical_and_non_hazardous === true,
            precautionsInPlace: safety.precautions_and_basic_safety === true,
        },
        verification,
        isOtherVerificationChecked: false,
        otherVerification: "",
        participationScope: {
            rule,
            selectedUniversities: uniNames,
            departments: departments.length ? departments : [""],
            sectionsNote:
                typeof deptRest.sections_or_class_note === "string"
                    ? deptRest.sections_or_class_note
                    : "",
        },
        academicLinkage: {
            courseName: typeof academicRaw.course_name === "string" ? academicRaw.course_name : "",
            semester: typeof academicRaw.semester === "string" ? academicRaw.semester : "",
        },
        finalConfirmations: {
            academicallyValid: subConf.academically_valid_and_accurately_described === true,
            properlySupervised: subConf.activity_properly_supervised === true,
            safeEnvironment: subConf.environment_safe_and_appropriate === true,
            correctVerifiable: subConf.information_correct_and_verifiable === true,
        },
    };

    return { facultyDetailsPatch, formDataPatch };
}
