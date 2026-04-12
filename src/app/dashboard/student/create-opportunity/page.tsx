"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Users, Loader2, X, Plus, Lock } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import dynamic from 'next/dynamic';
import { findSdgById, opportunityFormSdgList } from "@/utils/sdgData";
import { isStudentProfileComplete, isValidEmailFormat, pickProfileEmail } from "@/utils/profileCompletion";
import { mapOpportunityDetailToStudentForm } from "./mapDetailToStudentForm";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import {
    composeInternationalPhone,
    DEFAULT_PHONE_COUNTRY_KEY,
    parsePhoneForDisplay,
} from "@/utils/countryCallingCodes";

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('@/components/ui/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center text-slate-400">Loading Map...</div>
});

const ACTIVITY_TYPES_MAIN = [
    "Community Service", "Volunteer Activity", "Awareness Campaign", "Training / Teaching",
    "Research", "Technical Support", "Environmental Action",
] as const;

/** Timeline modes that collect start/end date + daily from/to time (sent as timeline.* on create). */
/** Show optional schedule fields for these timeline types. */
const TIMELINES_WITH_SCHEDULE_UI = ["Fixed dates", "Flexible", "Ongoing"] as const;

const BENEFICIARY_PREDEFINED = [
    "Children",
    "Youth",
    "Women",
    "Elderly",
    "Persons with disabilities",
    "Students",
    "Community members",
] as const;

function isValidEmail(s: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/** Match student profile: backend / localStorage may use contact, phone, or mobile. */
function pickProfileContact(u: unknown): string {
    if (!u || typeof u !== "object") return "";
    const o = u as Record<string, unknown>;
    const raw = o.contact ?? o.phone ?? o.mobile ?? o.phone_number;
    if (raw == null) return "";
    const s = typeof raw === "string" ? raw : String(raw);
    return s.trim();
}

function readCachedStudentUser(): unknown | null {
    try {
        const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

const STUDENT_OPPORTUNITY_DRAFT_KEY = "ciel_student_create_opportunity_draft_v1";

function isPlainObject(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** Merge saved draft over current form state (nested objects, arrays replaced from draft). */
function normalizeSupervisionIndependentPhone<T extends { supervision: Record<string, unknown> }>(fd: T): T {
    const s = fd.supervision as { independentContactPhoneKey?: unknown; independentContactPhone?: unknown };
    const key = typeof s.independentContactPhoneKey === "string" ? s.independentContactPhoneKey : "";
    if (key.includes("|")) return fd;
    const raw = typeof s.independentContactPhone === "string" ? s.independentContactPhone : "";
    const parsed = parsePhoneForDisplay(raw.trim());
    return {
        ...fd,
        supervision: {
            ...fd.supervision,
            independentContactPhoneKey: parsed.phoneCountryKey,
            independentContactPhone: parsed.national,
        },
    };
}

function deepMergeDraft<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
    const out = { ...target } as Record<string, unknown>;
    for (const key of Object.keys(source)) {
        const s = source[key];
        const t = out[key];
        if (isPlainObject(s) && isPlainObject(t)) {
            out[key] = deepMergeDraft(t, s);
        } else if (s !== undefined) {
            out[key] = s;
        }
    }
    return out as T;
}

export default function StudentOpportunityCreationPage() {
    const router = useRouter();
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
    const [isLoadingEdit, setIsLoadingEdit] = useState(false);

    // Student Details State
    const [studentDetails, setStudentDetails] = useState({
        name: "",
        email: "",
        institution: "",
        department: "",
        city: "",
        contact: ""
    });

    // Form State
    const [formData, setFormData] = useState({
        // Section B
        title: "",
        opportunityType: [] as string[],
        otherActivitySpecs: [""] as string[],
        mode: "", // on-site, remote, hybrid
        location: { city: "", venue: "", pin: "" },
        timelineType: "", // fixed, flexible, ongoing
        dates: { start: "", end: "", fromTime: "", endTime: "" },
        capacity: { hours: "", volunteers: "" },

        // Section C
        sdg: "",
        target: "",
        indicator: "",
        secondarySdg: "",
        secondaryTarget: "",
        secondaryIndicator: "",

        // Section D
        objectives: {
            description: "",
            beneficiariesCount: "",
            beneficiariesType: [] as string[],
            isOtherBeneficiaryChecked: false,
            otherBeneficiarySpecs: [""] as string[],
        },

        // Section E
        activity: {
            responsibilities: "",
            skills: [] as string[],
            isOtherSkillChecked: false,
            otherSkills: [""] as string[]
        },

        // Section F — student-created opportunity (controlled)
        supervision: {
            facultyName: "",
            facultyDesignation: "",
            facultyDepartment: "",
            facultyOfficialEmail: "",
            executingContext: "" as "" | "partner" | "independent",
            partnerOrgName: "",
            partnerContactPerson: "",
            partnerEmail: "",
            independentSiteDescription: "",
            independentLocalContact: "",
            independentContactPhoneKey: DEFAULT_PHONE_COUNTRY_KEY,
            independentContactPhone: "",
            declSafeEnvironment: false,
            declNoHazardous: false,
            declFacultyOversight: false,
            declEthicalLawful: false,
        },

        sectionFConfirmations: {
            facultyApproval: false,
            genuineAccurate: false,
            safeAppropriate: false,
            truthfulVerifiable: false,
        },

        participation: {
            departmentScope: "all" as "all" | "specific",
            departments: [""] as string[],
            sectionsNote: "",
        },

        // Section G
        verification: [] as string[],

        // Section H — student opportunities: own university only (locked in UI)
        visibility: "restricted" as const,
    });

    const validateForm = () => {
        if (!studentDetails.contact.trim()) {
            toast.error("Contact No. is missing from your profile. Add it under Student Profile, then try again.");
            return false;
        }
        if (!isValidEmailFormat(studentDetails.email)) {
            toast.error("A valid email on your profile is required. Update your profile, then try again.");
            return false;
        }
        if (!studentDetails.department.trim()) {
            toast.error("Department is missing from your profile. Update your profile, then try again.");
            return false;
        }
        if (!formData.title.trim()) {
            toast.error("Please enter an Opportunity Title (Section B)");
            return false;
        }
        if (formData.opportunityType.length === 0) {
            toast.error("Please select at least one Opportunity Type (Section B)");
            return false;
        }
        if (formData.opportunityType.includes("Other")) {
            const specs = formData.otherActivitySpecs.map((s) => s.trim()).filter(Boolean);
            if (specs.length === 0) {
                toast.error("Please add at least one Other activity description (Section B)");
                return false;
            }
        }
        if (!formData.mode) {
            toast.error("Please select a Mode of Engagement (Section B)");
            return false;
        }
        if (formData.mode !== 'Remote') {
            if (!formData.location.city.trim()) {
                toast.error("Please enter a City/Area (Section B)");
                return false;
            }
            // Exant Venue validation removed; it is now optional
        }
        if (!formData.timelineType) {
            toast.error("Please select a Timeline Type (Section B)");
            return false;
        }
        if (formData.timelineType === "Fixed dates") {
            if (!formData.dates.start.trim() || !formData.dates.end.trim()) {
                toast.error("Fixed dates requires both a start date and an end date (Section B5)");
                return false;
            }
            if (formData.dates.start > formData.dates.end) {
                toast.error("End date must be on or after the start date (Section B5)");
                return false;
            }
        }

        const hoursNum = parseInt(formData.capacity.hours, 10);
        if (!formData.capacity.hours.trim() || Number.isNaN(hoursNum) || hoursNum <= 0) {
            toast.error("Please enter expected hours per student as a positive number (Section B5)");
            return false;
        }

        const volNum = parseInt(formData.capacity.volunteers, 10);
        if (!formData.capacity.volunteers.trim() || Number.isNaN(volNum) || volNum < 2 || volNum > 20) {
            toast.error("Team size must be between 2 and 20 (Section B5)");
            return false;
        }

        // Section C
        if (!formData.sdg) {
            toast.error("Please select a Primary SDG (Section C)");
            return false;
        }
        if (!formData.target) {
            toast.error("Please select an SDG Target (Section C)");
            return false;
        }
        if (formData.secondarySdg) {
            if (formData.secondarySdg === formData.sdg) {
                toast.error("Secondary SDG must be different from the Primary SDG (Section C)");
                return false;
            }
            if (!formData.secondaryTarget) {
                toast.error("Please select an SDG Target for your Secondary SDG (Section C)");
                return false;
            }
        }

        // Section D
        if (!formData.objectives.description.trim()) {
            toast.error("Please enter Project Objectives (Section D)");
            return false;
        }
        const benStr = formData.objectives.beneficiariesCount.trim();
        const benNum = parseInt(benStr, 10);
        if (!benStr || Number.isNaN(benNum) || benNum < 1) {
            toast.error("Please enter the expected number of beneficiaries (at least 1) in Section D2");
            return false;
        }
        if (formData.objectives.isOtherBeneficiaryChecked) {
            const ob = formData.objectives.otherBeneficiarySpecs.map((s) => s.trim()).filter(Boolean);
            if (ob.length === 0) {
                toast.error("Please add at least one other beneficiary type (Section D)");
                return false;
            }
        }
        const predefinedSelected = formData.objectives.beneficiariesType.filter((t) =>
            (BENEFICIARY_PREDEFINED as readonly string[]).includes(t),
        );
        const otherFilled =
            formData.objectives.isOtherBeneficiaryChecked &&
            formData.objectives.otherBeneficiarySpecs.some((s) => s.trim().length > 0);
        if (predefinedSelected.length === 0 && !otherFilled) {
            toast.error("Select at least one beneficiary type or add an “Other” type (Section D)");
            return false;
        }

        // Section E
        if (!formData.activity.responsibilities.trim()) {
            toast.error("Please list Student Responsibilities (Section E)");
            return false;
        }
        const mergedSkills = formData.activity.isOtherSkillChecked
            ? [
                  ...formData.activity.skills,
                  ...formData.activity.otherSkills.map((s) => s.trim()).filter(Boolean),
              ]
            : formData.activity.skills;
        if (mergedSkills.length === 0) {
            toast.error("Select at least one skill to be gained, or add skills under Other (Section E)");
            return false;
        }

        if (!studentDetails.institution.trim()) {
            toast.error("Your university/institution is missing from your profile. Complete your profile, then try again.");
            return false;
        }

        // Section F1 — Faculty approval
        const s = formData.supervision;
        if (!s.facultyName.trim() || !s.facultyDesignation.trim() || !s.facultyDepartment.trim()) {
            toast.error("Please complete Faculty Approval details (Section F1)");
            return false;
        }
        if (!s.facultyOfficialEmail.trim() || !isValidEmail(s.facultyOfficialEmail)) {
            toast.error("Please enter a valid faculty official email (Section F1)");
            return false;
        }

        // Section F2 — Executing context
        if (s.executingContext !== "partner" && s.executingContext !== "independent") {
            toast.error("Please choose an executing context: partner organization or independent community activity (Section F2)");
            return false;
        }
        if (s.executingContext === "partner") {
            if (!s.partnerOrgName.trim() || !s.partnerContactPerson.trim() || !s.partnerEmail.trim()) {
                toast.error("Please provide complete partner organization details (Section F2)");
                return false;
            }
            if (!isValidEmail(s.partnerEmail)) {
                toast.error("Please enter a valid partner organization email (Section F2)");
                return false;
            }
        } else {
            const independentPhoneFull = composeInternationalPhone(
                s.independentContactPhoneKey || DEFAULT_PHONE_COUNTRY_KEY,
                s.independentContactPhone,
            ).trim();
            if (!s.independentSiteDescription.trim() || !s.independentLocalContact.trim() || !independentPhoneFull) {
                toast.error("Please provide activity site, local contact, and contact number for your independent activity (Section F2)");
                return false;
            }
        }

        // Section F3 — Safety & responsibility
        if (!s.declSafeEnvironment || !s.declNoHazardous || !s.declFacultyOversight || !s.declEthicalLawful) {
            toast.error("Please confirm all items in Safety & Responsibility (Section F3)");
            return false;
        }

        // Section F5 — Department scope
        if (formData.participation.departmentScope === "specific") {
            const deps = formData.participation.departments.map((d) => d.trim()).filter(Boolean);
            if (deps.length === 0) {
                toast.error("Add at least one department or choose “all departments” (Section F5)");
                return false;
            }
        }

        // Section F6 — Required confirmations
        const c = formData.sectionFConfirmations;
        if (!c.facultyApproval || !c.genuineAccurate || !c.safeAppropriate || !c.truthfulVerifiable) {
            toast.error("Please accept all required confirmations before submitting");
            return false;
        }

        if (formData.verification.length === 0) {
            toast.error("Select at least one verification method in Section G");
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (isLoadingEdit) return;
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const hasOther = formData.opportunityType.includes("Other");
            const typesPayload = hasOther
                ? [
                    ...formData.opportunityType.filter((t) => t !== "Other"),
                    ...formData.otherActivitySpecs.map((s) => s.trim()).filter(Boolean).map((s) => `Other: ${s}`),
                ]
                : formData.opportunityType;

            const predefinedBenef = BENEFICIARY_PREDEFINED as readonly string[];
            const otherBeneficiaryMerged = formData.objectives.isOtherBeneficiaryChecked
                ? [
                      ...formData.objectives.beneficiariesType.filter((t) => predefinedBenef.includes(t)),
                      ...formData.objectives.otherBeneficiarySpecs.map((s) => s.trim()).filter(Boolean),
                  ]
                : formData.objectives.beneficiariesType.filter((t) => predefinedBenef.includes(t));

            // Transform state to match API Spec
            const payload = {
                title: formData.title,
                types: typesPayload,
                student_contact: studentDetails.contact.trim(),
                mode: formData.mode,
                location: formData.mode === 'Remote' ? null : formData.location,
                timeline: {
                    type: formData.timelineType,
                    start_date: formData.dates.start,
                    end_date: formData.dates.end,
                    ...((TIMELINES_WITH_SCHEDULE_UI as readonly string[]).includes(formData.timelineType)
                        ? {
                              ...(formData.dates.fromTime.trim() ? { from_time: formData.dates.fromTime.trim() } : {}),
                              ...(formData.dates.endTime.trim() ? { to_time: formData.dates.endTime.trim() } : {}),
                          }
                        : {}),
                    expected_hours: parseInt(formData.capacity.hours) || 0,
                    volunteers_required: parseInt(formData.capacity.volunteers) || 0
                },
                sdg_info: {
                    sdg_id: formData.sdg,
                    target_id: formData.target,
                    indicator_id: formData.indicator
                },
                ...(formData.secondarySdg && formData.secondaryTarget
                    ? {
                          secondary_sdgs: [
                              {
                                  sdg_id: formData.secondarySdg,
                                  target_id: formData.secondaryTarget,
                                  indicator_id: formData.secondaryIndicator,
                                  justification: ""
                              }
                          ]
                      }
                    : {}),
                objectives: {
                    description: formData.objectives.description,
                    beneficiaries_count: parseInt(formData.objectives.beneficiariesCount) || 0,
                    beneficiaries_type: otherBeneficiaryMerged,
                },
                activity_details: {
                    student_responsibilities: formData.activity.responsibilities,
                    // Append `otherSkills` if checked and not empty
                    skills_gained: formData.activity.isOtherSkillChecked
                        ? [...formData.activity.skills, ...formData.activity.otherSkills.filter(s => s.trim() !== "")]
                        : formData.activity.skills
                },
                // Legacy supervision block (keys preserved for existing admin/API consumers)
                // Faculty-created flow also sends `external_partner_*` + `external_partner_collaboration`;
                // backend email/verification jobs expect those names, so mirror them for student + partner.
                supervision: {
                    supervisor_name: formData.supervision.facultyName.trim(),
                    role: formData.supervision.facultyDesignation.trim(),
                    contact: formData.supervision.facultyOfficialEmail.trim(),
                    faculty_department: formData.supervision.facultyDepartment.trim(),
                    faculty_university_name: studentDetails.institution.trim(),
                    ...(formData.supervision.executingContext === "partner"
                        ? {
                              partner_org_name: formData.supervision.partnerOrgName.trim(),
                              partner_contact_person: formData.supervision.partnerContactPerson.trim(),
                              partner_email: formData.supervision.partnerEmail.trim(),
                              external_partner_org_name: formData.supervision.partnerOrgName.trim(),
                              external_partner_contact_person: formData.supervision.partnerContactPerson.trim(),
                              external_partner_email: formData.supervision.partnerEmail.trim(),
                          }
                        : {}),
                    safe_environment:
                        formData.supervision.declSafeEnvironment &&
                        formData.supervision.declNoHazardous &&
                        formData.supervision.declEthicalLawful,
                    supervised: formData.supervision.declFacultyOversight,
                    information_accurate:
                        formData.sectionFConfirmations.genuineAccurate &&
                        formData.sectionFConfirmations.truthfulVerifiable,
                },
                ...(formData.supervision.executingContext === "partner"
                    ? {
                          external_partner_collaboration: {
                              organization_name: formData.supervision.partnerOrgName.trim(),
                              contact_person: formData.supervision.partnerContactPerson.trim(),
                              official_email: formData.supervision.partnerEmail.trim(),
                          },
                          // Backend partner email resolution includes partner_organization.official_email
                          partner_organization: {
                              organization_name: formData.supervision.partnerOrgName.trim(),
                              contact_person: formData.supervision.partnerContactPerson.trim(),
                              official_email: formData.supervision.partnerEmail.trim(),
                          },
                      }
                    : { external_partner_collaboration: null }),
                executing_context: {
                    type: formData.supervision.executingContext,
                    ...(formData.supervision.executingContext === "partner"
                        ? {
                              partner: {
                                  organization_name: formData.supervision.partnerOrgName.trim(),
                                  contact_person: formData.supervision.partnerContactPerson.trim(),
                                  official_email: formData.supervision.partnerEmail.trim(),
                              },
                          }
                        : {
                              independent_community_activity: {
                                  activity_site_description: formData.supervision.independentSiteDescription.trim(),
                                  local_contact_person: formData.supervision.independentLocalContact.trim(),
                                  contact_number: composeInternationalPhone(
                                      formData.supervision.independentContactPhoneKey || DEFAULT_PHONE_COUNTRY_KEY,
                                      formData.supervision.independentContactPhone,
                                  ).trim(),
                              },
                          }),
                },
                // Must match ciel_backend OpportunitiesService.validateSafetyDeclaration / validateSubmissionConfirmations
                safety_declaration: {
                    environment_safe_and_appropriate: formData.supervision.declSafeEnvironment,
                    students_guided_and_supervised: formData.supervision.declFacultyOversight,
                    lawful_ethical_and_non_hazardous: formData.supervision.declEthicalLawful,
                    precautions_and_basic_safety: formData.supervision.declNoHazardous,
                },
                submission_confirmations: {
                    academically_valid_and_accurately_described: formData.sectionFConfirmations.genuineAccurate,
                    activity_properly_supervised: formData.sectionFConfirmations.facultyApproval,
                    environment_safe_and_appropriate: formData.sectionFConfirmations.safeAppropriate,
                    information_correct_and_verifiable: formData.sectionFConfirmations.truthfulVerifiable,
                },
                participation_scope: {
                    rule: "own_university_only",
                    creator_university_name: studentDetails.institution.trim(),
                    department_restriction: {
                        scope: formData.participation.departmentScope,
                        departments:
                            formData.participation.departmentScope === "specific"
                                ? formData.participation.departments.map((d) => d.trim()).filter(Boolean)
                                : [],
                        sections_or_class_note: formData.participation.sectionsNote.trim() || null,
                    },
                },
                verification_method: formData.verification,
                visibility: formData.visibility,
                restricted_universities: [studentDetails.institution.trim()],
            };

            const isEdit = Boolean(editingOpportunityId);
            const editId = editingOpportunityId ?? "";
            const res = await authenticatedFetch(
                isEdit
                    ? `/api/v1/student/opportunity/${encodeURIComponent(editId)}`
                    : `/api/v1/student/opportunity`,
                {
                    method: "POST",
                    body: JSON.stringify(payload),
                },
            );

            if (res == null) {
                toast.error("Session expired or not authorized. Please log in again.");
                return;
            }

            const data = await res.json().catch(() => ({} as Record<string, unknown>));
            const created =
                data.success === true &&
                (Boolean((data as { data?: { id?: string } }).data?.id) ||
                    Boolean((data as { data?: unknown }).data));
            const legacyShape = Boolean((data as { id?: string }).id) || Boolean((data as { title?: string }).title);
            const updateOk =
                isEdit &&
                (data.success === true ||
                    Boolean((data as { id?: string }).id) ||
                    Boolean((data as { title?: string }).title));

            if (res.ok && (updateOk || (!isEdit && (created || legacyShape)))) {
                try {
                    localStorage.removeItem(STUDENT_OPPORTUNITY_DRAFT_KEY);
                } catch {
                    /* ignore */
                }
                toast.success(isEdit ? "Opportunity updated successfully!" : "Opportunity created successfully!");
                router.push("/dashboard/student/projects");
            } else {
                const errObj = data as {
                    message?: string;
                    error?: string;
                    statusCode?: number;
                };
                const fromNest = Array.isArray((data as { message?: unknown }).message)
                    ? String((data as { message: string[] }).message[0])
                    : undefined;
                const msg =
                    errObj.message ||
                    fromNest ||
                    (typeof errObj.error === "string" ? errObj.error : undefined) ||
                    (res.status === 401 || res.status === 403
                        ? "Not authorized. Please log in again."
                        : res.status >= 500
                          ? "Server error. Try again later or contact support."
                          : isEdit
                            ? `Could not update opportunity (${res.status}).`
                            : `Could not create opportunity (${res.status}).`);
                toast.error(msg);
            }
        } catch (error) {
            console.error("Error submitting form", error);
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleType = (type: string) => {
        setFormData((prev) => {
            const wasIncluded = prev.opportunityType.includes(type);
            const types = wasIncluded
                ? prev.opportunityType.filter((t) => t !== type)
                : [...prev.opportunityType, type];
            return {
                ...prev,
                opportunityType: types,
                ...(type === "Other" && wasIncluded ? { otherActivitySpecs: [""] } : {}),
            };
        });
    };

    const [expandedSections, setExpandedSections] = useState<string[]>(["A", "B"]);

    const displayStudentContact = useMemo(
        () => parsePhoneForDisplay(studentDetails.contact),
        [studentDetails.contact],
    );

    const handleSaveDraft = () => {
        try {
            localStorage.setItem(
                STUDENT_OPPORTUNITY_DRAFT_KEY,
                JSON.stringify({
                    v: 1,
                    savedAt: Date.now(),
                    formData,
                    studentDetails,
                    expandedSections,
                }),
            );
            toast.success("Draft saved on this device.");
        } catch (e) {
            console.error("Draft save failed", e);
            toast.error("Could not save draft. Check browser storage.");
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let base: Record<string, unknown> = {};
                try {
                    const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                    if (raw) base = JSON.parse(raw) as Record<string, unknown>;
                } catch {
                    /* ignore */
                }

                const cached = readCachedStudentUser();
                let name = typeof base.name === "string" ? base.name : "";
                let email = pickProfileEmail(base);
                let institution =
                    (typeof base.institution === "string" && base.institution.trim()) ||
                    (typeof base.university === "string" && base.university.trim()) ||
                    "";
                let department =
                    (typeof base.department === "string" && base.department.trim()) ||
                    (typeof base.faculty_department === "string" && base.faculty_department.trim()) ||
                    "";
                let city = typeof base.city === "string" ? base.city : "";
                let contact = pickProfileContact(base);

                if (cached) {
                    const c = cached as Record<string, unknown>;
                    name = typeof c.name === "string" ? c.name : name;
                    email = pickProfileEmail(c) || email;
                    institution =
                        (typeof c.institution === "string" && c.institution.trim()) ||
                        (typeof c.university === "string" && c.university.trim()) ||
                        institution;
                    department =
                        (typeof c.department === "string" && c.department.trim()) ||
                        (typeof c.faculty_department === "string" && c.faculty_department.trim()) ||
                        department;
                    city = typeof c.city === "string" ? c.city : city;
                    contact = pickProfileContact(cached) || contact;
                }

                const storedUser = localStorage.getItem("ciel_user");
                let userId: unknown = null;
                if (storedUser) {
                    try {
                        userId = JSON.parse(storedUser).id;
                    } catch (e) {
                        console.error("Failed to parse user from local storage", e);
                    }
                }

                const res = await authenticatedFetch(`/api/v1/user/me`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
                });
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success && data.data) {
                        const user = data.data as Record<string, unknown>;
                        contact = pickProfileContact(user) || contact;
                        department =
                            (typeof user.department === "string" && user.department.trim()) ||
                            (typeof user.faculty_department === "string" && user.faculty_department.trim()) ||
                            department;
                        email = pickProfileEmail(user) || email;
                        name = (typeof user.name === "string" && user.name) || name;
                        institution =
                            (typeof user.institution === "string" && user.institution) ||
                            (typeof user.university === "string" && user.university) ||
                            institution;
                        city = (typeof user.city === "string" && user.city) || city;
                    }
                }

                const mergedForGate: Record<string, unknown> = {
                    ...base,
                    name,
                    email,
                    contact,
                    phone: contact,
                    institution,
                    university: institution,
                    department,
                    faculty_department: department,
                    city,
                };

                if (!isStudentProfileComplete(mergedForGate)) {
                    router.replace("/dashboard/student/profile");
                    return;
                }

                setStudentDetails({
                    name,
                    email,
                    institution,
                    department,
                    city,
                    contact,
                });

                const editParam =
                    typeof window !== "undefined"
                        ? new URLSearchParams(window.location.search).get("edit")?.trim()
                        : "";
                if (!editParam) {
                    try {
                        const draftRaw = localStorage.getItem(STUDENT_OPPORTUNITY_DRAFT_KEY);
                        if (draftRaw) {
                            const draft = JSON.parse(draftRaw) as {
                                formData?: Record<string, unknown>;
                                studentDetails?: Record<string, string>;
                                expandedSections?: string[];
                            };
                            if (draft.formData && typeof draft.formData === "object") {
                                setFormData((prev) =>
                                    normalizeSupervisionIndependentPhone(
                                        deepMergeDraft(
                                            prev as unknown as Record<string, unknown>,
                                            draft.formData!,
                                        ) as typeof prev,
                                    ),
                                );
                            }
                            if (draft.studentDetails && typeof draft.studentDetails === "object") {
                                setStudentDetails((prev) => ({ ...prev, ...draft.studentDetails }));
                            }
                            if (Array.isArray(draft.expandedSections) && draft.expandedSections.length > 0) {
                                setExpandedSections(draft.expandedSections);
                            }
                            toast.success("Saved draft restored.");
                        }
                    } catch {
                        /* ignore corrupt draft */
                    }
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [router]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const e = new URLSearchParams(window.location.search).get("edit")?.trim();
        if (e) setEditingOpportunityId(e);
    }, []);

    useEffect(() => {
        if (!editingOpportunityId || isLoadingProfile) return;
        let cancelled = false;
        (async () => {
            setIsLoadingEdit(true);
            try {
                const res = await authenticatedFetch(`/api/v1/opportunities/detail`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editingOpportunityId }),
                });
                if (!res?.ok) {
                    toast.error("Could not load this opportunity");
                    return;
                }
                const json = await res.json();
                const d = json?.data as Record<string, unknown> | undefined;
                if (!d) {
                    toast.error("Opportunity not found");
                    return;
                }
                let myId: string | null = null;
                try {
                    const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                    if (raw) {
                        const u = JSON.parse(raw) as { id?: string | number; userId?: string | number };
                        const v = u.id ?? u.userId;
                        myId = v != null ? String(v) : null;
                    }
                } catch {
                    /* ignore */
                }
                const creatorRaw = d.creatorId ?? d.creator_id;
                if (myId != null && creatorRaw != null && String(creatorRaw) !== myId) {
                    toast.error("You can only edit opportunities you created");
                    setEditingOpportunityId(null);
                    return;
                }
                const { studentDetailsPatch, formDataPatch } = mapOpportunityDetailToStudentForm(d);
                if (cancelled) return;
                setStudentDetails((prev) => ({
                    ...prev,
                    ...(studentDetailsPatch.institution?.trim() ? { institution: studentDetailsPatch.institution } : {}),
                    ...(studentDetailsPatch.contact?.trim() ? { contact: studentDetailsPatch.contact } : {}),
                }));
                setFormData((prev) => {
                    const p = formDataPatch;
                    const merged = {
                        ...prev,
                        ...p,
                        location: { ...prev.location, ...(p.location as typeof prev.location) },
                        dates: { ...prev.dates, ...(p.dates as typeof prev.dates) },
                        capacity: { ...prev.capacity, ...(p.capacity as typeof prev.capacity) },
                        objectives: { ...prev.objectives, ...(p.objectives as typeof prev.objectives) },
                        activity: { ...prev.activity, ...(p.activity as typeof prev.activity) },
                        supervision: { ...prev.supervision, ...(p.supervision as typeof prev.supervision) },
                        sectionFConfirmations: {
                            ...prev.sectionFConfirmations,
                            ...(p.sectionFConfirmations as typeof prev.sectionFConfirmations),
                        },
                        participation: { ...prev.participation, ...(p.participation as typeof prev.participation) },
                    };
                    return normalizeSupervisionIndependentPhone(merged);
                });
            } catch {
                if (!cancelled) toast.error("Could not load this opportunity");
            } finally {
                if (!cancelled) setIsLoadingEdit(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [editingOpportunityId, isLoadingProfile]);

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    return (
        <div className="max-w-8xl mx-auto p-4 space-y-4 pb-24">
            <div className="mb-4">
                <h1 className="text-3xl font-bold text-slate-900">
                    {editingOpportunityId ? "Edit student opportunity" : "Create Student Opportunity"}
                </h1>
                <p className="text-slate-500">
                    {editingOpportunityId
                        ? "Update your opportunity and submit again for review."
                        : "Create an SDG-aligned volunteer opportunity or project."}
                </p>
                {isLoadingEdit ? (
                    <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading opportunity…
                    </p>
                ) : null}
            </div>

            {/* SECTION A: STUDENT DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Section A: Student Details
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">All fields are shown from your profile (read-only).</p>
                    </div>
                    {isLoadingProfile ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isLoadingProfile ? (
                        <div className="col-span-2 text-center py-4 text-slate-400">Loading details...</div>
                    ) : (
                        <>
                            <div className="opacity-75">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Student Name</label>
                                <input type="text" value={studentDetails.name} readOnly tabIndex={-1} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium pointer-events-none" />
                            </div>
                            <div className="opacity-75">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Institution</label>
                                <input type="text" value={studentDetails.institution} readOnly tabIndex={-1} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium pointer-events-none" />
                            </div>
                            <div className="opacity-75">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                <input type="text" value={studentDetails.email} readOnly tabIndex={-1} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium pointer-events-none" />
                            </div>
                            <div className="opacity-75">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                                <input type="text" value={studentDetails.department} readOnly tabIndex={-1} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium pointer-events-none" />
                            </div>
                            <div className="opacity-75">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">City / Province</label>
                                <input type="text" value={studentDetails.city} readOnly tabIndex={-1} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium pointer-events-none" />
                            </div>
                            <div className="opacity-75 pointer-events-none">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact No. <span className="text-red-500">*</span></label>
                                <PhoneConnectivityRow
                                    phoneCountryKey={displayStudentContact.phoneCountryKey}
                                    nationalDigits={displayStudentContact.national}
                                    readOnly
                                    placeholderNational="—"
                                    selectClassName="rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-700"
                                    inputClassName="rounded-lg border border-slate-200 bg-slate-50 py-2 text-sm font-medium text-slate-700"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* SECTION B: OPPORTUNITY OVERVIEW */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 ${expandedSections.includes('B') ? 'border-blue-500 shadow-xl ring-1 ring-blue-500' : 'border-slate-200 shadow-sm'}`}>
                <div
                    className="p-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                >
                    <div onClick={() => toggleSection("B")}>
                        <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('B') ? 'text-blue-600' : 'text-slate-800'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('B') ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>B</div>
                            Section B: Project Overview
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 pl-8">Basic details about the activity.</p>
                    </div>
                    <div onClick={() => toggleSection("B")}>
                        {expandedSections.includes('B') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                </div>

                <div className={`p-8 space-y-8 ${!expandedSections.includes('B') ? 'hidden' : ''}`}>
                    {/* B1. Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">B1. Project Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                            placeholder="e.g. Community Clean Up Drive"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>
                    {/* B2. Type */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-3">B2. Activity Type <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ACTIVITY_TYPES_MAIN.map((type) => (
                                <label key={type} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.opportunityType.includes(type) ? 'bg-blue-50 border-blue-200' : 'border-slate-100 hover:border-slate-300'}`}>
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        checked={formData.opportunityType.includes(type)}
                                        onChange={() => toggleType(type)}
                                    />
                                    <span className={`text-sm font-medium ${formData.opportunityType.includes(type) ? 'text-blue-700' : 'text-slate-600'}`}>{type}</span>
                                </label>
                            ))}
                            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.opportunityType.includes("Other") ? 'bg-blue-50 border-blue-200' : 'border-slate-100 hover:border-slate-300'}`}>
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    checked={formData.opportunityType.includes("Other")}
                                    onChange={() => toggleType("Other")}
                                />
                                <span className={`text-sm font-medium ${formData.opportunityType.includes("Other") ? 'text-blue-700' : 'text-slate-600'}`}>Other</span>
                            </label>
                        </div>
                        {formData.opportunityType.includes("Other") && (
                            <div className="mt-4 space-y-3 pl-4 border-l-2 border-blue-100">
                                <p className="text-xs font-bold text-slate-500 uppercase">Specify each &quot;Other&quot; activity (add as many as needed)</p>
                                {formData.otherActivitySpecs.map((spec, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                placeholder="Describe this activity type…"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm transition-all"
                                                value={spec}
                                                onChange={(e) => {
                                                    const next = [...formData.otherActivitySpecs];
                                                    next[idx] = e.target.value;
                                                    setFormData({ ...formData, otherActivitySpecs: next });
                                                }}
                                            />
                                            {formData.otherActivitySpecs.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = formData.otherActivitySpecs.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, otherActivitySpecs: next.length ? next : [""] });
                                                    }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                                    aria-label="Remove row"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, otherActivitySpecs: [...formData.otherActivitySpecs, ""] })}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-2 py-1"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add another Other
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* B3. Mode */}
                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-3">B3. Mode of Engagement <span className="text-red-500">*</span></label>
                            <div className="space-y-3">
                                {['On site', 'Remote', 'Hybrid'].map((m) => (
                                    <label key={m} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.mode === m ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'border-slate-100 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="mode"
                                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                            checked={formData.mode === m}
                                            onChange={() => setFormData({ ...formData, mode: m })}
                                        />
                                        <div>
                                            <span className="block text-sm font-bold text-slate-700">{m}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* B4. Location */}
                        {(formData.mode === 'On site' || formData.mode === 'Hybrid') && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300 col-span-1 md:col-span-2">
                                <label className="block text-sm font-bold text-slate-900 mb-3">B4. Location Details <span className="text-red-500">*</span></label>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="City / Area"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm"
                                            value={formData.location.city}
                                            onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })}
                                        />
                                    </div>

                                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pin Implementation Location</label>
                                        <LocationPicker
                                            onLocationSelect={(loc) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    location: {
                                                        ...prev.location,
                                                        venue: loc.address || prev.location.venue || "", // Use address if returned by Nominatim, otherwise keep existing
                                                        pin: `${loc.lat},${loc.lng}`
                                                    }
                                                }));
                                            }}
                                        />
                                    </div>

                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1 h-4 bg-slate-300 rounded-full"></div>
                                        <input
                                            type="text"
                                            placeholder="Exact Venue (Optional)"
                                            className="w-full pl-6 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm"
                                            value={formData.location.venue}
                                            onChange={(e) => setFormData({ ...formData, location: { ...formData.location, venue: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* B5. Timeline */}
                    <div className="pt-6 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-900 mb-4">B5. Duration & Commitment <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Timeline Type</label>
                                <div className="flex gap-2 mb-4">
                                    {['Fixed dates', 'Flexible', 'Ongoing'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setFormData({ ...formData, timelineType: t })}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${formData.timelineType === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>

                                {(TIMELINES_WITH_SCHEDULE_UI as readonly string[]).includes(formData.timelineType) && (
                                    <div className="space-y-3 animate-in fade-in zoom-in-95">
                                        <p className="text-xs text-slate-500">
                                            Start/end dates and daily times are optional for all timeline types.
                                        </p>
                                        <div className="flex gap-2 flex-wrap">
                                            <input
                                                type="date"
                                                className="flex-1 min-w-[140px] px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                value={formData.dates.start}
                                                onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, start: e.target.value } })}
                                            />
                                            <span className="self-center text-slate-400">-</span>
                                            <input
                                                type="date"
                                                className="flex-1 min-w-[140px] px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                value={formData.dates.end}
                                                onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, end: e.target.value } })}
                                            />
                                        </div>
                                        <div className="flex gap-2 flex-wrap items-center">
                                            <div className="flex-1 min-w-[140px]">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">From Time</label>
                                                <input
                                                    type="time"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                    value={formData.dates.fromTime}
                                                    onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, fromTime: e.target.value } })}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-[140px]">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">End Time</label>
                                                <input
                                                    type="time"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                    value={formData.dates.endTime}
                                                    onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, endTime: e.target.value } })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="mb-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Expected Hours (Per Student)</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                            placeholder="e.g. 20"
                                            value={formData.capacity.hours}
                                            onChange={(e) => setFormData({ ...formData, capacity: { ...formData.capacity, hours: e.target.value } })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Volunteers/Team Size (Minimum 2 & Maximum team size 20)</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                            placeholder="e.g. 5"
                                            value={formData.capacity.volunteers}
                                            onChange={(e) => setFormData({ ...formData, capacity: { ...formData.capacity, volunteers: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION C: SDG SELECTION */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 ${expandedSections.includes('C') ? 'border-purple-500 shadow-xl ring-1 ring-purple-500' : 'border-slate-200 shadow-sm'}`}>
                <div
                    className="p-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSection("C")}
                >
                    <div>
                        <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('C') ? 'text-purple-600' : 'text-slate-800'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('C') ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>C</div>
                            Section C: SDG Selection
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 pl-8">Link your project to Global Goals.</p>
                    </div>
                    {expandedSections.includes('C') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>

                <div className={`p-8 space-y-6 ${!expandedSections.includes('C') ? 'hidden' : ''}`}>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 text-sm text-amber-800 mb-6">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <strong>Important:</strong> The Primary (and optional Secondary) SDG selections, including Target and Indicator where chosen, will be
                            <span className="font-bold underline ml-1">locked</span> for your report.
                        </div>
                    </div>

                    {/* C1. Primary SDG */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">C1. Select PRIMARY SDG <span className="text-red-500">*</span></label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-medium"
                            value={formData.sdg}
                            onChange={(e) => {
                                const v = e.target.value;
                                setFormData({
                                    ...formData,
                                    sdg: v,
                                    target: "",
                                    indicator: "",
                                    ...(formData.secondarySdg === v
                                        ? { secondarySdg: "", secondaryTarget: "", secondaryIndicator: "" }
                                        : {})
                                });
                            }}
                        >
                            <option value="">Select an SDG...</option>
                            {opportunityFormSdgList.map((sdg) => (
                                <option key={sdg.id} value={sdg.id}>
                                    SDG {sdg.number} — {sdg.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* C2. SDG Target */}
                    <div className={!formData.sdg ? "opacity-50 pointer-events-none" : ""}>
                        <label className="block text-sm font-bold text-slate-900 mb-2">C2. Select SDG Target <span className="text-red-500">*</span></label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-medium"
                            value={formData.target}
                            onChange={(e) => setFormData({ ...formData, target: e.target.value, indicator: "" })}
                        >
                            <option value="">Select a Target...</option>
                            {formData.sdg && findSdgById(formData.sdg)?.targets.map((target) => (
                                <option key={target.id} value={target.id}>
                                    Target {target.id} — {target.description}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* C3. SDG Indicator */}
                    <div className={!formData.target ? "opacity-50 pointer-events-none" : ""}>
                        <label className="block text-sm font-bold text-slate-900 mb-2">C3. SDG Indicator</label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-medium"
                            value={formData.indicator}
                            onChange={(e) => setFormData({ ...formData, indicator: e.target.value })}
                        >
                            <option value="">Select an Indicator...</option>
                            {formData.sdg && formData.target && findSdgById(formData.sdg)
                                ?.targets
                                .find(target => target.id === formData.target)?.indicators.map((indicator) => (
                                    <option key={indicator.id} value={indicator.id}>
                                        Indicator {indicator.id} — {indicator.description}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="border-t border-slate-100 pt-8 space-y-6">
                        <div>
                            <p className="text-sm font-bold text-slate-800">Secondary SDG (optional)</p>
                            <p className="text-xs text-slate-500 mt-1">If this project also advances another goal, choose it below. Leave blank if not applicable.</p>
                        </div>

                        {/* C4. Secondary SDG */}
                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">C4. Select SECONDARY SDG</label>
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-medium"
                                value={formData.secondarySdg}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        secondarySdg: e.target.value,
                                        secondaryTarget: "",
                                        secondaryIndicator: ""
                                    })
                                }
                            >
                                <option value="">Select an SDG...</option>
                                {opportunityFormSdgList
                                    .filter((sdg) => sdg.id !== formData.sdg)
                                    .map((sdg) => (
                                        <option key={sdg.id} value={sdg.id}>
                                            SDG {sdg.number} — {sdg.title}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* C5. Secondary SDG Target */}
                        <div className={!formData.secondarySdg ? "opacity-50 pointer-events-none" : ""}>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                                C5. Select SDG Target {formData.secondarySdg ? <span className="text-red-500">*</span> : null}
                            </label>
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-medium"
                                value={formData.secondaryTarget}
                                onChange={(e) =>
                                    setFormData({ ...formData, secondaryTarget: e.target.value, secondaryIndicator: "" })
                                }
                            >
                                <option value="">Select a Target...</option>
                                {formData.secondarySdg &&
                                    findSdgById(formData.secondarySdg)?.targets.map((target) => (
                                        <option key={target.id} value={target.id}>
                                            Target {target.id} — {target.description}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* C6. Secondary SDG Indicator */}
                        <div className={!formData.secondaryTarget ? "opacity-50 pointer-events-none" : ""}>
                            <label className="block text-sm font-bold text-slate-900 mb-2">C6. SDG Indicator</label>
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-medium"
                                value={formData.secondaryIndicator}
                                onChange={(e) => setFormData({ ...formData, secondaryIndicator: e.target.value })}
                            >
                                <option value="">Select an Indicator...</option>
                                {formData.secondarySdg &&
                                    formData.secondaryTarget &&
                                    findSdgById(formData.secondarySdg)
                                        ?.targets.find((t) => t.id === formData.secondaryTarget)
                                        ?.indicators.map((indicator) => (
                                            <option key={indicator.id} value={indicator.id}>
                                                Indicator {indicator.id} — {indicator.description}
                                            </option>
                                        ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION D: OBJECTIVES */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 ${expandedSections.includes('D') ? 'border-teal-500 shadow-xl ring-1 ring-teal-500' : 'border-slate-200 shadow-sm'}`}>
                <div
                    className="p-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                >
                    <div onClick={() => toggleSection("D")}>
                        <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('D') ? 'text-teal-600' : 'text-slate-800'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('D') ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>D</div>
                            Section D: Objectives
                        </h2>
                    </div>
                    <div onClick={() => toggleSection("D")}>
                        {expandedSections.includes('D') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                </div>

                <div className={`p-8 space-y-6 ${!expandedSections.includes('D') ? 'hidden' : ''}`}>
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">D1. Project Objective <span className="text-red-500">*</span></label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none font-medium h-32"
                            placeholder="What do you aim to achieve?"
                            value={formData.objectives.description}
                            onChange={(e) => setFormData({ ...formData, objectives: { ...formData.objectives, description: e.target.value } })}
                        ></textarea>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <label className="block text-sm font-bold text-slate-900 mb-4">D2. Expected Outreach</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Number of Beneficiaries</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-teal-500 outline-none"
                                    placeholder="e.g. 50"
                                    value={formData.objectives.beneficiariesCount}
                                    onChange={(e) => setFormData({ ...formData, objectives: { ...formData.objectives, beneficiariesCount: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Type of Beneficiaries</label>
                                <div className="h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 space-y-2">
                                    {BENEFICIARY_PREDEFINED.map((b) => (
                                        <label key={b} className="flex items-center gap-2 text-sm text-slate-600">
                                            <input
                                                type="checkbox"
                                                className="rounded text-teal-600 focus:ring-teal-500"
                                                checked={formData.objectives.beneficiariesType.includes(b)}
                                                onChange={() => {
                                                    const types = formData.objectives.beneficiariesType.includes(b)
                                                        ? formData.objectives.beneficiariesType.filter((t) => t !== b)
                                                        : [...formData.objectives.beneficiariesType, b];
                                                    setFormData({
                                                        ...formData,
                                                        objectives: { ...formData.objectives, beneficiariesType: types },
                                                    });
                                                }}
                                            />{" "}
                                            {b}
                                        </label>
                                    ))}
                                </div>
                                <div className="mt-3">
                                    <label
                                        className={`flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-all ${formData.objectives.isOtherBeneficiaryChecked ? "bg-teal-50 border-teal-200" : "border-slate-100"}`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="rounded text-teal-600 focus:ring-teal-500"
                                            checked={formData.objectives.isOtherBeneficiaryChecked}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    objectives: {
                                                        ...formData.objectives,
                                                        isOtherBeneficiaryChecked: e.target.checked,
                                                        ...(e.target.checked ? {} : { otherBeneficiarySpecs: [""] }),
                                                    },
                                                })
                                            }
                                        />
                                        <span
                                            className={`text-sm font-medium ${formData.objectives.isOtherBeneficiaryChecked ? "text-teal-700" : "text-slate-600"}`}
                                        >
                                            Other (please specify)
                                        </span>
                                    </label>
                                    {formData.objectives.isOtherBeneficiaryChecked && (
                                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-teal-100">
                                            <p className="text-xs font-bold text-slate-500 uppercase">
                                                Add one or more other beneficiary types
                                            </p>
                                            {formData.objectives.otherBeneficiarySpecs.map((spec, idx) => (
                                                <div key={idx} className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            placeholder="Specify beneficiary type…"
                                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-sm transition-all"
                                                            value={spec}
                                                            onChange={(e) => {
                                                                const next = [...formData.objectives.otherBeneficiarySpecs];
                                                                next[idx] = e.target.value;
                                                                setFormData({
                                                                    ...formData,
                                                                    objectives: {
                                                                        ...formData.objectives,
                                                                        otherBeneficiarySpecs: next,
                                                                    },
                                                                });
                                                            }}
                                                        />
                                                        {formData.objectives.otherBeneficiarySpecs.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const next = formData.objectives.otherBeneficiarySpecs.filter(
                                                                        (_, i) => i !== idx,
                                                                    );
                                                                    setFormData({
                                                                        ...formData,
                                                                        objectives: {
                                                                            ...formData.objectives,
                                                                            otherBeneficiarySpecs: next.length ? next : [""],
                                                                        },
                                                                    });
                                                                }}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                                                aria-label="Remove row"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormData({
                                                        ...formData,
                                                        objectives: {
                                                            ...formData.objectives,
                                                            otherBeneficiarySpecs: [
                                                                ...formData.objectives.otherBeneficiarySpecs,
                                                                "",
                                                            ],
                                                        },
                                                    })
                                                }
                                                className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1.5 px-2 py-1"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add another
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION E: ACTIVITY DETAILS */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 ${expandedSections.includes('E') ? 'border-indigo-500 shadow-xl ring-1 ring-indigo-500' : 'border-slate-200 shadow-sm'}`}>
                <div
                    className="p-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSection("E")}
                >
                    <div>
                        <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('E') ? 'text-indigo-600' : 'text-slate-800'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('E') ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>E</div>
                            Section E: Activity Details
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 pl-8">What exactly will you do?</p>
                    </div>
                    {expandedSections.includes('E') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>

                <div className={`p-8 space-y-6 ${!expandedSections.includes('E') ? 'hidden' : ''}`}>
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">E1. Detailed Plan (Bullet List) <span className="text-red-500">*</span></label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium h-32"
                            placeholder="• Step 1: ..."
                            value={formData.activity.responsibilities}
                            onChange={(e) => setFormData({ ...formData, activity: { ...formData.activity, responsibilities: e.target.value } })}
                        ></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">E2. Skills Students Will Gain (Select up to 10)</label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                "Leadership", "Communication", "Teaching", "Teamwork", 
                                "Digital Skills", "Community Engagement", "Critical Thinking", 
                                "Problem Solving", "Time Management", "Project Management", 
                                "Research", "Documentation", "Financial Literacy", 
                                "Public Speaking", "Event Planning", "Media/Content Creation"
                            ].map(s => (
                                <label key={s} className="flex items-center gap-2 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                        checked={formData.activity.skills.includes(s)}
                                        onChange={(e) => {
                                            if (e.target.checked && formData.activity.skills.length >= 10) {
                                                toast.error("You can select up to 10 skills.");
                                                return;
                                            }
                                            const skills = formData.activity.skills.includes(s)
                                                ? formData.activity.skills.filter(i => i !== s)
                                                : [...formData.activity.skills, s];
                                            setFormData({ ...formData, activity: { ...formData.activity, skills: skills } });
                                        }}
                                    />
                                    <span className="text-sm font-medium text-slate-700">{s}</span>
                                </label>
                            ))}
                        </div>
                        <div className="mt-3">
                            <label className="flex items-center gap-2 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer w-full md:w-1/3 mb-4">
                                <input
                                    type="checkbox"
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                    checked={formData.activity.isOtherSkillChecked}
                                    onChange={(e) => setFormData({ ...formData, activity: { ...formData.activity, isOtherSkillChecked: e.target.checked } })}
                                />
                                <span className="text-sm font-medium text-slate-700">Other</span>
                            </label>

                            {formData.activity.isOtherSkillChecked && (
                                <div className="space-y-3 pl-4 border-l-2 border-indigo-100">
                                    {formData.activity.otherSkills.map((skill, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Please specify other skill..."
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm transition-all"
                                                    value={skill}
                                                    onChange={(e) => {
                                                        const newOthers = [...formData.activity.otherSkills];
                                                        newOthers[idx] = e.target.value;
                                                        setFormData({ ...formData, activity: { ...formData.activity, otherSkills: newOthers } });
                                                    }}
                                                />
                                                {formData.activity.otherSkills.length > 1 && (
                                                    <button
                                                        onClick={() => {
                                                            const newOthers = formData.activity.otherSkills.filter((_, i) => i !== idx);
                                                            setFormData({ ...formData, activity: { ...formData.activity, otherSkills: newOthers } });
                                                        }}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ 
                                            ...formData, 
                                            activity: { 
                                                ...formData.activity, 
                                                otherSkills: [...formData.activity.otherSkills, ""] 
                                            } 
                                        })}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-2 py-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add another skill
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION F: STUDENT-CREATED OPPORTUNITY (CONTROLLED) */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 ${expandedSections.includes('F') ? 'border-orange-500 shadow-xl ring-1 ring-orange-500' : 'border-slate-200 shadow-sm'}`}>
                <div
                    className="p-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSection("F")}
                >
                    <div>
                        <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('F') ? 'text-orange-600' : 'text-slate-800'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('F') ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>F</div>
                            Section F: Supervision, Safety &amp; Participation Scope
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 pl-8">Faculty approval, executing context, declarations, and who can apply.</p>
                    </div>
                    {expandedSections.includes('F') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
                <div className={`p-8 space-y-10 ${!expandedSections.includes('F') ? 'hidden' : ''}`}>
                    <p className="text-sm text-slate-600">
                        Student-created opportunities stay within your university, require faculty verification by email, and are reviewed by CIEL Admin before going live.
                    </p>

                    {/* F1 Faculty approval */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">F1. Faculty approval (mandatory)</h3>
                        <p className="text-sm text-slate-600">
                            A verification email is sent to the faculty member. The opportunity does not proceed without faculty approval.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Faculty name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.supervision.facultyName}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, facultyName: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Designation <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.supervision.facultyDesignation}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, facultyDesignation: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.supervision.facultyDepartment}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, facultyDepartment: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">University name <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        readOnly
                                        tabIndex={-1}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm pointer-events-none"
                                        value={studentDetails.institution}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">From your profile; cross-university listing is not allowed.</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Official email address <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    placeholder="faculty.name@university.edu"
                                    value={formData.supervision.facultyOfficialEmail}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, facultyOfficialEmail: e.target.value } })}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>This confirms the opportunity is valid, supervised, and academically acceptable. Faculty approval is required before the opportunity can proceed.</span>
                        </p>
                    </div>

                    {/* F2 Executing context */}
                    <div className="space-y-4 border-t border-slate-100 pt-8">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">F2. Executing context (choose one)</h3>
                        <p className="text-sm text-slate-600">Is this opportunity conducted with an external organization?</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${formData.supervision.executingContext === "partner" ? "border-orange-300 bg-orange-50/50" : "border-slate-200 hover:border-slate-300"}`}>
                                <input
                                    type="radio"
                                    name="executingContext"
                                    className="mt-1 text-orange-600"
                                    checked={formData.supervision.executingContext === "partner"}
                                    onChange={() => setFormData({ ...formData, supervision: { ...formData.supervision, executingContext: "partner" } })}
                                />
                                <span className="text-sm font-medium text-slate-800">Yes — partner organization involved</span>
                            </label>
                            <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${formData.supervision.executingContext === "independent" ? "border-orange-300 bg-orange-50/50" : "border-slate-200 hover:border-slate-300"}`}>
                                <input
                                    type="radio"
                                    name="executingContext"
                                    className="mt-1 text-orange-600"
                                    checked={formData.supervision.executingContext === "independent"}
                                    onChange={() => setFormData({ ...formData, supervision: { ...formData.supervision, executingContext: "independent" } })}
                                />
                                <span className="text-sm font-medium text-slate-800">No — independent community-based activity</span>
                            </label>
                        </div>
                        {formData.supervision.executingContext === "partner" && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs font-bold text-slate-500 uppercase">Partner organization</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Organization name *"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                        value={formData.supervision.partnerOrgName}
                                        onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, partnerOrgName: e.target.value } })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Contact person *"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                        value={formData.supervision.partnerContactPerson}
                                        onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, partnerContactPerson: e.target.value } })}
                                    />
                                    <input
                                        type="email"
                                        placeholder="Official email *"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                        value={formData.supervision.partnerEmail}
                                        onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, partnerEmail: e.target.value } })}
                                    />
                                </div>
                                <p className="text-xs text-slate-500">A verification email may be sent to the partner contact.</p>
                            </div>
                        )}
                        {formData.supervision.executingContext === "independent" && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs font-bold text-slate-500 uppercase">Independent community activity</p>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm min-h-[88px]"
                                    placeholder="Activity location / site description *"
                                    value={formData.supervision.independentSiteDescription}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, independentSiteDescription: e.target.value } })}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Local contact person (e.g. teacher, community rep — not a family member) *"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                        value={formData.supervision.independentLocalContact}
                                        onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, independentLocalContact: e.target.value } })}
                                    />
                                    <div className="space-y-1.5">
                                        <span className="block text-xs font-bold text-slate-500 uppercase">
                                            Contact number <span className="text-red-500">*</span>
                                        </span>
                                        <PhoneConnectivityRow
                                            phoneCountryKey={formData.supervision.independentContactPhoneKey}
                                            nationalDigits={formData.supervision.independentContactPhone}
                                            onPhoneCountryKeyChange={(independentContactPhoneKey) =>
                                                setFormData({
                                                    ...formData,
                                                    supervision: { ...formData.supervision, independentContactPhoneKey },
                                                })
                                            }
                                            onNationalDigitsChange={(independentContactPhone) =>
                                                setFormData({
                                                    ...formData,
                                                    supervision: { ...formData.supervision, independentContactPhone },
                                                })
                                            }
                                            maxNationalDigits={15}
                                            selectClassName="rounded-xl border border-slate-200 py-3 text-xs font-semibold focus:border-orange-500"
                                            inputClassName="rounded-xl border border-slate-200 py-3 text-sm font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* F3 Safety declaration */}
                    <div className="space-y-4 border-t border-slate-100 pt-8">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">F3. Safety &amp; responsibility (mandatory)</h3>
                        <p className="text-sm text-slate-600">
                            Primary supervision lies with the faculty. If a partner organization is involved, operational safety is shared.
                        </p>
                        <div className="space-y-3 bg-orange-50/60 p-5 rounded-xl border border-orange-100 text-sm">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mt-1 rounded text-orange-600"
                                    checked={formData.supervision.declSafeEnvironment}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, declSafeEnvironment: e.target.checked } })}
                                />
                                <span className="text-slate-800">The activity environment is safe and appropriate.</span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mt-1 rounded text-orange-600"
                                    checked={formData.supervision.declNoHazardous}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, declNoHazardous: e.target.checked } })}
                                />
                                <span className="text-slate-800">No hazardous or high-risk tasks are involved.</span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mt-1 rounded text-orange-600"
                                    checked={formData.supervision.declFacultyOversight}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, declFacultyOversight: e.target.checked } })}
                                />
                                <span className="text-slate-800">Faculty oversight is ensured.</span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mt-1 rounded text-orange-600"
                                    checked={formData.supervision.declEthicalLawful}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, declEthicalLawful: e.target.checked } })}
                                />
                                <span className="text-slate-800">All activities are ethical and lawful.</span>
                            </label>
                        </div>
                    </div>

                    {/* F4 Admin */}
                    <div className="space-y-2 border-t border-slate-100 pt-8">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">F4. Admin approval (mandatory)</h3>
                        <p className="text-sm text-slate-600">
                            CIEL Admin will review feasibility and clarity, SDG alignment, risk level, and authenticity before the opportunity is published for applicants at your institution.
                        </p>
                    </div>

                    {/* F5 Visibility & participation */}
                    <div className="space-y-4 border-t border-slate-100 pt-8">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">F5. Visibility &amp; participation scope</h3>
                        <div className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-slate-900">Restricted to your university only</p>
                                <p className="text-slate-600 mt-1">Only students from the same university can view and apply. Cross-university participation is not allowed.</p>
                            </div>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Optional department-level restriction</p>
                        <div className="space-y-3">
                            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${formData.participation.departmentScope === "all" ? "border-orange-200 bg-orange-50/30" : "border-slate-200"}`}>
                                <input
                                    type="radio"
                                    name="deptScope"
                                    className="text-orange-600"
                                    checked={formData.participation.departmentScope === "all"}
                                    onChange={() => setFormData({ ...formData, participation: { ...formData.participation, departmentScope: "all" } })}
                                />
                                <span className="text-sm font-medium text-slate-800">Open to all departments within the university</span>
                            </label>
                            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${formData.participation.departmentScope === "specific" ? "border-orange-200 bg-orange-50/30" : "border-slate-200"}`}>
                                <input
                                    type="radio"
                                    name="deptScope"
                                    className="text-orange-600"
                                    checked={formData.participation.departmentScope === "specific"}
                                    onChange={() => setFormData({ ...formData, participation: { ...formData.participation, departmentScope: "specific" } })}
                                />
                                <span className="text-sm font-medium text-slate-800">Restricted to specific departments/programs</span>
                            </label>
                        </div>
                        {formData.participation.departmentScope === "specific" && (
                            <div className="pl-1 space-y-3 border-l-2 border-orange-100">
                                <p className="text-xs text-slate-500">Add each department or program (multi-entry).</p>
                                {formData.participation.departments.map((dep, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Department or program name"
                                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                                            value={dep}
                                            onChange={(e) => {
                                                const next = [...formData.participation.departments];
                                                next[idx] = e.target.value;
                                                setFormData({ ...formData, participation: { ...formData.participation, departments: next } });
                                            }}
                                        />
                                        {formData.participation.departments.length > 1 && (
                                            <button
                                                type="button"
                                                className="p-2 text-slate-400 hover:text-red-500"
                                                aria-label="Remove department"
                                                onClick={() => {
                                                    const next = formData.participation.departments.filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, participation: { ...formData.participation, departments: next.length ? next : [""] } });
                                                }}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFormData({
                                            ...formData,
                                            participation: { ...formData.participation, departments: [...formData.participation.departments, ""] },
                                        })
                                    }
                                    className="text-xs font-bold text-orange-600 flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add department
                                </button>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sections / class (optional)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                                        placeholder="e.g. BBA Section A"
                                        value={formData.participation.sectionsNote}
                                        onChange={(e) => setFormData({ ...formData, participation: { ...formData.participation, sectionsNote: e.target.value } })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SECTION G: VERIFICATION */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 ${expandedSections.includes('G') ? 'border-cyan-500 shadow-xl ring-1 ring-cyan-500' : 'border-slate-200 shadow-sm'}`}>
                <div
                    className="p-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSection("G")}
                >
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('G') ? 'text-cyan-600' : 'text-slate-800'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('G') ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-600'}`}>G</div>
                        Section G: Evidence & Verification
                    </h2>
                    {expandedSections.includes('G') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
                <div className={`p-8 space-y-6 ${!expandedSections.includes('G') ? 'hidden' : ''}`}>
                    <label className="block text-sm font-bold text-slate-900 mb-2">How will you prove your work?</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {["Attendance sheets", "Supervisor sign-off", "Photos of activities", "Assessment sheets", "Digital logs"].map(v => (
                            <label key={v} className={`flex items-center gap-2 text-sm font-medium text-slate-700`}>
                                <input
                                    type="checkbox"
                                    className="rounded text-cyan-600 focus:ring-cyan-500"
                                    checked={formData.verification.includes(v)}
                                    onChange={() => {
                                        const vers = formData.verification.includes(v)
                                            ? formData.verification.filter(i => i !== v)
                                            : [...formData.verification, v];
                                        setFormData({ ...formData, verification: vers });
                                    }}
                                /> {v}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* SECTION: F6 REQUIRED CONFIRMATIONS + DECLARATION */}
            <div className="bg-slate-900 rounded-2xl text-white p-8">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-400" /> Final confirmations
                </h2>
                <p className="text-sm text-slate-400 mb-6">Section F6 — by submitting, you confirm the following.</p>
                <div className="space-y-4 mb-8">
                    <label className="flex items-start gap-3 cursor-pointer text-sm text-slate-200">
                        <input
                            type="checkbox"
                            className="mt-1 rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500"
                            checked={formData.sectionFConfirmations.facultyApproval}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    sectionFConfirmations: { ...formData.sectionFConfirmations, facultyApproval: e.target.checked },
                                })
                            }
                        />
                        <span>Faculty approval has been obtained or will be obtained (verification email will be sent).</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer text-sm text-slate-200">
                        <input
                            type="checkbox"
                            className="mt-1 rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500"
                            checked={formData.sectionFConfirmations.genuineAccurate}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    sectionFConfirmations: { ...formData.sectionFConfirmations, genuineAccurate: e.target.checked },
                                })
                            }
                        />
                        <span>The opportunity is genuine and accurately described.</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer text-sm text-slate-200">
                        <input
                            type="checkbox"
                            className="mt-1 rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500"
                            checked={formData.sectionFConfirmations.safeAppropriate}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    sectionFConfirmations: { ...formData.sectionFConfirmations, safeAppropriate: e.target.checked },
                                })
                            }
                        />
                        <span>The activity is safe and appropriate.</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer text-sm text-slate-200">
                        <input
                            type="checkbox"
                            className="mt-1 rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500"
                            checked={formData.sectionFConfirmations.truthfulVerifiable}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    sectionFConfirmations: { ...formData.sectionFConfirmations, truthfulVerifiable: e.target.checked },
                                })
                            }
                        />
                        <span>All provided information is truthful and verifiable.</span>
                    </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-700">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Student name</label>
                        <input type="text" value={studentDetails.name} readOnly className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">University (locked scope)</label>
                        <input type="text" value={studentDetails.institution} readOnly className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-300" />
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 md:left-64 right-0 p-4 bg-white border-t border-slate-200 z-50 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-6 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={isSubmitting || isLoadingEdit || Boolean(editingOpportunityId)}
                >
                    Save Draft
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || isLoadingEdit}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isSubmitting
                        ? "Submitting..."
                        : editingOpportunityId
                          ? "Save changes"
                          : "Submit Project"}
                </button>
            </div>
        </div>
    );
}
