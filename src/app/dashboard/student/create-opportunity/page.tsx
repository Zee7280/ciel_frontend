"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, AlertCircle, ChevronDown, Loader2, X, Plus, ExternalLink } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import dynamic from 'next/dynamic';
import { findSdgById, opportunityFormSdgList } from "@/utils/sdgData";
import { isStudentProfileComplete, isValidEmailFormat, pickProfileEmail } from "@/utils/profileCompletion";
import { mapOpportunityDetailToStudentForm } from "./mapDetailToStudentForm";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import PartnerOrganizationGuidance from "@/components/ui/PartnerOrganizationGuidance";
import {
    composeInternationalPhone,
    DEFAULT_PHONE_COUNTRY_KEY,
    parsePhoneForDisplay,
} from "@/utils/countryCallingCodes";
import { PAKISTAN_REGION_OPTIONS } from "@/utils/pakistanRegions";
import { OpportunitySubmittedReviewModal } from "@/app/dashboard/student/components/OpportunityLifecyclePrompts";
import {
    ACTIVITY_TYPE_EMOJI,
    BENEFICIARY_EMOJI,
    CoChip,
    CoSectionHead,
    MODE_EMOJI,
    SKILL_EMOJI,
    TIMELINE_EMOJI,
    VERIFICATION_EMOJI,
} from "@/components/opportunities/CreateOpportunityChrome";
import "@/components/opportunities/create-opportunity.css";

// Dynamically import LocationPicker to avoid SSR issues with Google Maps.
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

/** Display-only weekday for HTML date input value (YYYY-MM-DD); does not change stored values. */
function weekdayLabelFromDateInput(value: string): string | null {
    const v = value.trim();
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    const [ys, ms, ds] = v.split("-");
    const y = Number(ys);
    const m = Number(ms);
    const d = Number(ds);
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-US", { weekday: "long" });
}

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

type SimilarOpportunityMatch = {
    id: string;
    title: string;
    status?: string | null;
    workflow_stage?: string | null;
    match_strength?: "exact" | "similar";
};

function formatSimilarOpportunityStatus(row: SimilarOpportunityMatch): string {
    const st = (row.status || row.workflow_stage || "").trim().toLowerCase();
    if (!st) return "In review";
    if (st === "live") return "Live";
    if (st.includes("pending")) return "Pending approval";
    if (st === "revision") return "Needs revision";
    return st.replace(/_/g, " ");
}

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
    const [showSubmittedReviewModal, setShowSubmittedReviewModal] = useState(false);
    const [submittedOpportunityTitle, setSubmittedOpportunityTitle] = useState("");
    /** One lead per project: show notice before the create form (skipped when ?edit= is present). */
    const [showTeamLeadNotice, setShowTeamLeadNotice] = useState(false);
    const [similarMatches, setSimilarMatches] = useState<SimilarOpportunityMatch[]>([]);
    const [similarCheckLoading, setSimilarCheckLoading] = useState(false);

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
        if (formData.activity.responsibilities.length > 12_000) {
            toast.error("Detailed plan is too long (max 12,000 characters). Use a concise bullet summary.");
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

        if (!editingOpportunityId && similarMatches.length > 0) {
            toast.error(
                "Disclaimer: A similar project already exists at your university. Ask your team lead to add you via Apply Now. Do not create another listing.",
                { duration: 6000 },
            );
            return;
        }

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
                if (isEdit) {
                    toast.success("Opportunity updated successfully!");
                    router.push("/dashboard/student/projects");
                } else {
                    setSubmittedOpportunityTitle(formData.title.trim());
                    setShowSubmittedReviewModal(true);
                }
            } else {
                const errObj = data as {
                    message?: string | { message?: string; similarOpportunities?: SimilarOpportunityMatch[] };
                    error?: string;
                    statusCode?: number;
                    similarOpportunities?: SimilarOpportunityMatch[];
                };
                const nestedMsg =
                    errObj.message && typeof errObj.message === "object" && !Array.isArray(errObj.message)
                        ? errObj.message.message
                        : undefined;
                const similarFrom409 =
                    errObj.similarOpportunities ||
                    (errObj.message &&
                    typeof errObj.message === "object" &&
                    !Array.isArray(errObj.message)
                        ? errObj.message.similarOpportunities
                        : undefined);
                if (res.status === 409 && Array.isArray(similarFrom409) && similarFrom409.length > 0) {
                    setSimilarMatches(similarFrom409);
                }
                const fromNest = Array.isArray((data as { message?: unknown }).message)
                    ? String((data as { message: string[] }).message[0])
                    : undefined;
                const flatMsg = typeof errObj.message === "string" ? errObj.message : undefined;
                const msg =
                    nestedMsg ||
                    flatMsg ||
                    fromNest ||
                    (typeof errObj.error === "string" ? errObj.error : undefined) ||
                    (res.status === 409
                        ? "Disclaimer: A similar project already exists. Join the existing team via Apply Now instead of creating a duplicate listing."
                        : res.status === 401 || res.status === 403
                          ? "Not authorized. Please log in again."
                          : res.status >= 500
                            ? "Server error. Try again later or contact support."
                            : isEdit
                              ? `Could not update opportunity (${res.status}).`
                              : `Could not create opportunity (${res.status}).`);
                toast.error(msg, { duration: res.status === 409 ? 7000 : 4000 });
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

    const [expandedSections, setExpandedSections] = useState<string[]>(["A", "B", "C", "D", "E", "F", "G"]);

    const displayStudentContact = useMemo(
        () => parsePhoneForDisplay(studentDetails.contact),
        [studentDetails.contact],
    );

    const timelineStartWeekdayLabel = useMemo(
        () => weekdayLabelFromDateInput(formData.dates.start),
        [formData.dates.start],
    );
    const timelineEndWeekdayLabel = useMemo(
        () => weekdayLabelFromDateInput(formData.dates.end),
        [formData.dates.end],
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
        if (e) {
            setEditingOpportunityId(e);
            setShowTeamLeadNotice(false);
        } else {
            setShowTeamLeadNotice(true);
        }
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

    useEffect(() => {
        if (!showTeamLeadNotice) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [showTeamLeadNotice]);

    const checkSimilarTitles = useCallback(async (title: string, university: string, excludeId?: string | null) => {
        const trimmed = title.trim();
        const uni = university.trim();
        if (trimmed.length < 6 || !uni) {
            setSimilarMatches([]);
            return;
        }
        setSimilarCheckLoading(true);
        try {
            const params = new URLSearchParams({ title: trimmed, university: uni });
            if (excludeId) params.set("excludeId", excludeId);
            const res = await authenticatedFetch(`/api/v1/student/opportunities/similar?${params.toString()}`);
            if (!res?.ok) {
                setSimilarMatches([]);
                return;
            }
            const json = (await res.json()) as { success?: boolean; data?: SimilarOpportunityMatch[] };
            setSimilarMatches(Array.isArray(json.data) ? json.data : []);
        } catch {
            setSimilarMatches([]);
        } finally {
            setSimilarCheckLoading(false);
        }
    }, []);

    useEffect(() => {
        if (editingOpportunityId) {
            setSimilarMatches([]);
            return;
        }
        const title = formData.title.trim();
        const uni = studentDetails.institution.trim();
        if (title.length < 6 || !uni) {
            setSimilarMatches([]);
            return;
        }
        const timer = window.setTimeout(() => {
            void checkSimilarTitles(title, uni);
        }, 500);
        return () => window.clearTimeout(timer);
    }, [formData.title, studentDetails.institution, editingOpportunityId, checkSimilarTitles]);

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    const previewType = formData.opportunityType.find((t) => t !== "Other") || formData.opportunityType[0] || "";
    const previewEmoji = ACTIVITY_TYPE_EMOJI[previewType] || "✨";
    const previewBits = [
        formData.mode || "",
        formData.capacity.hours.trim() ? `${formData.capacity.hours}h per student` : "",
        formData.capacity.volunteers.trim() ? `team of ${formData.capacity.volunteers}` : "",
        formData.objectives.beneficiariesCount.trim() ? `~${formData.objectives.beneficiariesCount} beneficiaries` : "",
        formData.supervision.facultyName.trim() ? `supervised by ${formData.supervision.facultyName}` : "",
    ].filter(Boolean);
    const previewPrimarySdg = formData.sdg ? findSdgById(formData.sdg) : null;
    const previewSecondarySdg = formData.secondarySdg ? findSdgById(formData.secondarySdg) : null;

    return (
        <div className="co-form">
            {showTeamLeadNotice ? (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(4,37,43,0.6)] p-5"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="team-lead-notice-title"
                >
                    <div className="w-full max-w-[440px] rounded-[24px] bg-white p-[26px] text-left">
                        <div className="mb-3 flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-[#e3f4fa] text-[22px]">👥</div>
                        <p className="mb-2.5 block text-base font-extrabold text-[#0d2b33]" id="team-lead-notice-title">
                            One opportunity per team project
                        </p>
                        <p className="mb-2 text-[11.5px] leading-relaxed text-[#3c5a5c]">
                            <strong>Do not create separate opportunities</strong> for the same team project — only one listing is needed per project.
                        </p>
                        <p className="mb-2 text-[11.5px] leading-relaxed text-[#3c5a5c]">
                            <strong>One team lead</strong> creates it. Once approved and live, the lead uses <strong>Apply Now</strong> on that listing and adds all other team members there.
                        </p>
                        <p className="mb-2 text-[11.5px] leading-relaxed text-[#3c5a5c]">
                            If duplicates already exist, agree on a single project lead and remove the extras.
                        </p>
                        <button
                            type="button"
                            className="mt-2 w-full rounded-[13px] bg-[#0e7d74] py-3 text-[12.5px] font-extrabold text-white"
                            onClick={() => setShowTeamLeadNotice(false)}
                        >
                            I understand — let’s build it 🚀
                        </button>
                    </div>
                </div>
            ) : null}

            <div className="mb-3.5 flex items-center gap-3">
                <div>
                    <p className="text-[10px] text-[#7a919a]">
                        Community Service → <b className="text-[#0e7d74]">Create an Opportunity</b>
                    </p>
                </div>
                <Link
                    href="/dashboard/student/paths/community-service"
                    className="ml-auto rounded-full border border-[#dcebee] bg-white px-4 py-2 text-[10.5px] font-extrabold text-[#0e7d74]"
                >
                    ← Back
                </Link>
            </div>

            <div className="relative mb-4 overflow-hidden rounded-[24px] bg-[linear-gradient(115deg,#04252b,#0e5f63_55%,#12a5a0_110%)] px-[26px] py-[22px] text-white">
                <div className="pointer-events-none absolute right-[-8px] top-2 text-[38px] tracking-[10px] opacity-[0.13]" aria-hidden>
                    🚀 💡 🤝 🌱
                </div>
                <p className="text-[9.5px] font-extrabold tracking-[0.22em] text-[#99f6e4]">
                    {editingOpportunityId ? "EDIT STUDENT OPPORTUNITY · SDG-ALIGNED" : "CREATE STUDENT OPPORTUNITY · SDG-ALIGNED"}
                </p>
                <h1 className="mt-1.5 text-[21px] font-extrabold">
                    {editingOpportunityId ? "Update your listing" : "Your idea, your crew — let’s build it 🚀"}
                </h1>
                <p className="mt-1 max-w-[560px] text-xs leading-relaxed text-[#cdf5f0]">
                    {editingOpportunityId
                        ? "Update your opportunity and submit again for review."
                        : "Seven quick sections. Your details are already filled, chips do most of the typing, and your listing preview builds itself at the bottom as you go."}
                </p>
                {isLoadingEdit ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-[#cdf5f0]">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading opportunity…
                    </p>
                ) : null}
            </div>

            {/* SECTION A: STUDENT DETAILS */}
            <div className="co-card">
                <CoSectionHead letter="A" title="Student details" tag="✅ FROM YOUR PROFILE — NOTHING TO TYPE" tagAuto color="#0d2b33" />
                {isLoadingProfile ? (
                    <div className="py-4 text-center text-[#7a919a]">
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading details...
                    </div>
                ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                        <span className="co-locked">🧑‍🎓 <b>{studentDetails.name || "—"}</b><span className="co-lock-badge">🔒</span></span>
                        <span className="co-locked">🏛️ {studentDetails.institution || "—"}<span className="co-lock-badge">🔒</span></span>
                        {studentDetails.department ? <span className="co-locked">🎓 {studentDetails.department}</span> : null}
                        {studentDetails.email ? <span className="co-locked">📧 {studentDetails.email}</span> : null}
                        {studentDetails.city ? <span className="co-locked">📍 {studentDetails.city}</span> : null}
                        <span className="co-locked pointer-events-none">
                            📱
                            <PhoneConnectivityRow
                                phoneCountryKey={displayStudentContact.phoneCountryKey}
                                nationalDigits={displayStudentContact.national}
                                readOnly
                                placeholderNational="—"
                                selectClassName="rounded-lg border border-transparent bg-transparent py-0 text-xs font-medium text-[#0d2b33]"
                                inputClassName="rounded-lg border-transparent bg-transparent py-0 text-sm font-medium text-[#0d2b33]"
                            />
                        </span>
                    </div>
                )}
            </div>

            {/* SECTION B: OPPORTUNITY OVERVIEW */}
            <div className="co-card co-accent" style={{ borderTopColor: "#0891b2" }}>
                <CoSectionHead
                    letter="B"
                    title="Project overview"
                    tag="THE BASICS"
                    color="#0891b2"
                    expanded={expandedSections.includes("B")}
                    onToggle={() => toggleSection("B")}
                />

                <div className={`${!expandedSections.includes('B') ? 'hidden' : ''}`}>
                    {/* B1. Title */}
                    <div>
                        <label className="co-label" style={{ marginTop: 4 }}>B1 · Project title</label>
                        <input
                            type="text"
                            placeholder="e.g. Community Clean Up Drive"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                        {!editingOpportunityId && (similarCheckLoading || similarMatches.length > 0) ? (
                            <div
                                className={`mt-3 rounded-xl border p-4 ${
                                    similarMatches.length > 0
                                        ? "border-amber-200 bg-amber-50"
                                        : "border-slate-200 bg-slate-50"
                                }`}
                                role="status"
                            >
                                {similarCheckLoading ? (
                                    <p className="text-sm text-slate-600 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Checking for existing projects at your university…
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex gap-2 items-start">
                                            <AlertCircle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
                                            <div className="text-sm text-amber-950 leading-relaxed">
                                                <p className="text-xs font-bold uppercase tracking-widest text-amber-800">Disclaimer</p>
                                                <p className="font-bold mt-1">
                                                    A similar project title already exists at your university.
                                                </p>
                                                <p className="mt-1">
                                                    You should not create another copy. Only <strong>one team lead</strong> should submit the opportunity. All other members must open an existing listing below and join through{" "}
                                                    <strong>Apply Now</strong> so team members can be added correctly.
                                                </p>
                                            </div>
                                        </div>
                                        <ul className="space-y-2">
                                            {similarMatches.map((row) => (
                                                <li
                                                    key={row.id}
                                                    className="flex flex-col gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 line-clamp-2">{row.title}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {formatSimilarOpportunityStatus(row)}
                                                            {row.match_strength === "exact" ? " · Same title" : " · Similar title"}
                                                        </p>
                                                    </div>
                                                    <Link
                                                        href={`/dashboard/student/browse/${encodeURIComponent(row.id)}`}
                                                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                                    >
                                                        View &amp; apply <ExternalLink className="h-3.5 w-3.5" />
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link
                                            href="/dashboard/student/browse"
                                            className="inline-block text-xs font-semibold text-amber-900 underline underline-offset-2"
                                        >
                                            Browse all opportunities
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                    {/* B2. Type */}
                    <div>
                        <label className="co-label">B2 · Activity type · tap one or more</label>
                        <div className="co-chips">
                            {ACTIVITY_TYPES_MAIN.map((type) => (
                                <CoChip key={type} selected={formData.opportunityType.includes(type)} onClick={() => toggleType(type)}>
                                    {ACTIVITY_TYPE_EMOJI[type] || ""} {type}
                                </CoChip>
                            ))}
                            <CoChip selected={formData.opportunityType.includes("Other")} onClick={() => toggleType("Other")}>
                                ✏️ Other
                            </CoChip>
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
                            <label className="co-label">B3 · Mode of engagement</label>
                            <div className="co-chips">
                                {['On site', 'Remote', 'Hybrid'].map((m) => (
                                    <CoChip key={m} selected={formData.mode === m} onClick={() => setFormData({ ...formData, mode: m })}>
                                        {MODE_EMOJI[m] || ""} {m === "On site" ? "On-site" : m}
                                    </CoChip>
                                ))}
                            </div>
                        </div>

                        {/* B4. Location */}
                        {(formData.mode === 'On site' || formData.mode === 'Hybrid') && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300 col-span-1 md:col-span-2">
                                <label className="co-label">B4 · Location details</label>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 z-10 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        <select
                                            value={formData.location.city}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    location: { ...formData.location, city: e.target.value },
                                                })
                                            }
                                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm appearance-none cursor-pointer bg-white"
                                        >
                                            <option value="">Select city / area</option>
                                            {formData.location.city.trim() &&
                                            !(PAKISTAN_REGION_OPTIONS as readonly string[]).includes(
                                                formData.location.city.trim()
                                            ) ? (
                                                <option value={formData.location.city}>
                                                    {formData.location.city} (current)
                                                </option>
                                            ) : null}
                                            {PAKISTAN_REGION_OPTIONS.map((c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </div>

                                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pin Implementation Location</label>
                                        <LocationPicker
                                            onLocationSelect={(loc) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    location: {
                                                        ...prev.location,
                                                        venue: loc.address || prev.location.venue || "",
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
                    <div className="pt-2">
                        <label className="co-label">B5 · Duration &amp; commitment</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="co-chips mb-3">
                                    {['Fixed dates', 'Flexible', 'Ongoing'].map((t) => (
                                        <CoChip key={t} selected={formData.timelineType === t} onClick={() => setFormData({ ...formData, timelineType: t })}>
                                            {TIMELINE_EMOJI[t] || ""} {t}
                                        </CoChip>
                                    ))}
                                </div>

                                {(TIMELINES_WITH_SCHEDULE_UI as readonly string[]).includes(formData.timelineType) && (
                                    <div className="space-y-3 animate-in fade-in zoom-in-95">
                                        <p className="text-xs text-slate-500">
                                            Start/end dates and daily times are optional for all timeline types.
                                        </p>
                                        <div className="flex gap-2 flex-wrap items-start">
                                            <div className="flex-1 min-w-[140px] space-y-1">
                                                <input
                                                    type="date"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                    value={formData.dates.start}
                                                    onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, start: e.target.value } })}
                                                />
                                                {timelineStartWeekdayLabel && (
                                                    <p className="text-xs font-medium text-slate-500 pl-0.5" aria-live="polite">
                                                        {timelineStartWeekdayLabel}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-slate-400 pt-2.5 shrink-0" aria-hidden>
                                                -
                                            </span>
                                            <div className="flex-1 min-w-[140px] space-y-1">
                                                <input
                                                    type="date"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                    value={formData.dates.end}
                                                    onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, end: e.target.value } })}
                                                />
                                                {timelineEndWeekdayLabel && (
                                                    <p className="text-xs font-medium text-slate-500 pl-0.5" aria-live="polite">
                                                        {timelineEndWeekdayLabel}
                                                    </p>
                                                )}
                                            </div>
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

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="co-label" style={{ marginTop: 0 }}>⏱️ Expected hours · per student</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 20"
                                        value={formData.capacity.hours}
                                        onChange={(e) => setFormData({ ...formData, capacity: { ...formData.capacity, hours: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="co-label" style={{ marginTop: 0 }}>👥 Team size · min 2, max 20</label>
                                    <input
                                        type="number"
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

            {/* SECTION C: SDG SELECTION */}
            <div className="co-card co-accent" style={{ borderTopColor: "#6d28d9" }}>
                <CoSectionHead
                    letter="C"
                    title="SDG selection"
                    tag="LINK IT TO THE GLOBAL GOALS"
                    color="#6d28d9"
                    expanded={expandedSections.includes("C")}
                    onToggle={() => toggleSection("C")}
                />

                <div className={`${!expandedSections.includes('C') ? 'hidden' : ''}`}>
                    <div className="co-note">
                        🔒 <span><b>Important:</b> the Primary (and optional Secondary) SDG you choose here — including Target and Indicator — will be <b>locked</b> into every member’s report. Choose once, choose well.</span>
                    </div>

                    {/* C1. Primary SDG */}
                    <div>
                        <label className="co-label">C1 · Primary SDG</label>
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
                        <label className="co-label">C2 · SDG target</label>
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
                        <label className="co-label">C3 · SDG indicator · optional</label>
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
                            <p className="co-label" style={{ marginTop: 14 }}>Secondary SDG · optional — leave blank if not applicable</p>
                            <p className="co-hint">If this project also advances another goal, choose it below.</p>
                        </div>

                        {/* C4. Secondary SDG */}
                        <div>
                            <label className="co-label">C4 · Secondary SDG</label>
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
                            <label className="co-label">
                                C5 · Secondary target {formData.secondarySdg ? <span className="text-red-500">*</span> : null}
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
                            <label className="co-label">C6 · Secondary indicator</label>
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
            <div className="co-card co-accent" style={{ borderTopColor: "#0e7d74" }}>
                <CoSectionHead
                    letter="D"
                    title="Objectives"
                    tag="WHAT & FOR WHOM"
                    color="#0e7d74"
                    expanded={expandedSections.includes("D")}
                    onToggle={() => toggleSection("D")}
                />

                <div className={`${!expandedSections.includes('D') ? 'hidden' : ''}`}>
                    <div>
                        <label className="co-label" style={{ marginTop: 4 }}>D1 · Project objective</label>
                        <textarea spellCheck={true}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none font-medium h-32"
                            placeholder="What do you aim to achieve?"
                            value={formData.objectives.description}
                            onChange={(e) => setFormData({ ...formData, objectives: { ...formData.objectives, description: e.target.value } })}
                        ></textarea>
                    </div>
                    <div>
                        <label className="co-label">D2 · Expected outreach</label>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="co-label" style={{ marginTop: 0 }}>Number of beneficiaries</label>
                                <input
                                    type="number"
                                    min={1}
                                    placeholder="e.g. 50"
                                    value={formData.objectives.beneficiariesCount}
                                    onChange={(e) => setFormData({ ...formData, objectives: { ...formData.objectives, beneficiariesCount: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="co-label" style={{ marginTop: 0 }}>Type of beneficiaries · tap all</label>
                                <div className="co-chips">
                                    {BENEFICIARY_PREDEFINED.map((b) => (
                                        <CoChip
                                            key={b}
                                            selected={formData.objectives.beneficiariesType.includes(b)}
                                            onClick={() => {
                                                const types = formData.objectives.beneficiariesType.includes(b)
                                                    ? formData.objectives.beneficiariesType.filter((t) => t !== b)
                                                    : [...formData.objectives.beneficiariesType, b];
                                                setFormData({
                                                    ...formData,
                                                    objectives: { ...formData.objectives, beneficiariesType: types },
                                                });
                                            }}
                                        >
                                            {BENEFICIARY_EMOJI[b] || ""} {b}
                                        </CoChip>
                                    ))}
                                    <CoChip
                                        selected={formData.objectives.isOtherBeneficiaryChecked}
                                        onClick={() =>
                                            setFormData({
                                                ...formData,
                                                objectives: {
                                                    ...formData.objectives,
                                                    isOtherBeneficiaryChecked: !formData.objectives.isOtherBeneficiaryChecked,
                                                    ...(formData.objectives.isOtherBeneficiaryChecked ? { otherBeneficiarySpecs: [""] } : {}),
                                                },
                                            })
                                        }
                                    >
                                        ✏️ Other
                                    </CoChip>
                                </div>
                                {formData.objectives.isOtherBeneficiaryChecked && (
                                        <div className="mt-3 space-y-3">
                                            <p className="co-hint">Who else? Please specify…</p>
                                            {formData.objectives.otherBeneficiarySpecs.map((spec, idx) => (
                                                <div key={idx} className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Specify beneficiary type…"
                                                        className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none text-sm"
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
                                                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1.5"
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

            {/* SECTION E: ACTIVITY DETAILS */}
            <div className="co-card co-accent" style={{ borderTopColor: "#38bdf8" }}>
                <CoSectionHead
                    letter="E"
                    title="Activity details"
                    tag="THE PLAN"
                    color="#38bdf8"
                    expanded={expandedSections.includes("E")}
                    onToggle={() => toggleSection("E")}
                />

                <div className={`${!expandedSections.includes('E') ? 'hidden' : ''}`}>
                    <div>
                        <label className="co-label" style={{ marginTop: 4 }}>E1 · Detailed plan — bullet list</label>
                        <p className="co-hint" style={{ margin: "0 0 6px" }}>
                            Short bullet points only (max 12,000 characters). Not an essay — you can attach the full roadmap later if needed.
                        </p>
                        <textarea spellCheck={true}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium h-32"
                            placeholder="• Step 1: ..."
                            maxLength={12000}
                            value={formData.activity.responsibilities}
                            onChange={(e) => setFormData({ ...formData, activity: { ...formData.activity, responsibilities: e.target.value } })}
                        ></textarea>
                        <p className="mt-1 text-right text-[8.5px] font-extrabold tracking-[0.08em] text-[#7a919a]">
                            {formData.activity.responsibilities.length.toLocaleString()} / 12,000 CHARACTERS
                        </p>
                    </div>
                    <div>
                        <label className="co-label">E2 · Skills students will gain · tap up to 10</label>
                        <div className="co-chips">
                            {[
                                "Leadership", "Communication", "Teaching", "Teamwork", 
                                "Digital Skills", "Community Engagement", "Critical Thinking", 
                                "Problem Solving", "Time Management", "Project Management", 
                                "Research", "Documentation", "Financial Literacy", 
                                "Public Speaking", "Event Planning", "Media/Content Creation"
                            ].map(s => (
                                <CoChip
                                    key={s}
                                    selected={formData.activity.skills.includes(s)}
                                    onClick={() => {
                                        if (!formData.activity.skills.includes(s) && formData.activity.skills.length >= 10) {
                                            toast.error("You can select up to 10 skills.");
                                            return;
                                        }
                                        const skills = formData.activity.skills.includes(s)
                                            ? formData.activity.skills.filter(i => i !== s)
                                            : [...formData.activity.skills, s];
                                        setFormData({ ...formData, activity: { ...formData.activity, skills: skills } });
                                    }}
                                >
                                    {SKILL_EMOJI[s] || ""} {s}
                                </CoChip>
                            ))}
                            <CoChip
                                selected={formData.activity.isOtherSkillChecked}
                                onClick={() => setFormData({ ...formData, activity: { ...formData.activity, isOtherSkillChecked: !formData.activity.isOtherSkillChecked } })}
                            >
                                ✏️ Other
                            </CoChip>
                        </div>
                        <p className="co-hint">{formData.activity.skills.length} of 10 selected</p>
                        {formData.activity.isOtherSkillChecked && (
                                <div className="mt-3 space-y-3">
                                    {formData.activity.otherSkills.map((skill, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Another skill…"
                                                    value={skill}
                                                    onChange={(e) => {
                                                        const newOthers = [...formData.activity.otherSkills];
                                                        newOthers[idx] = e.target.value;
                                                        setFormData({ ...formData, activity: { ...formData.activity, otherSkills: newOthers } });
                                                    }}
                                                />
                                                {formData.activity.otherSkills.length > 1 && (
                                                    <button
                                                        type="button"
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
                                        className="flex items-center gap-1.5 px-2 py-1 text-xs font-extrabold text-[#0e7d74]"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add another skill
                                    </button>
                                </div>
                            )}
                    </div>
                </div>
            </div>

            {/* SECTION F: STUDENT-CREATED OPPORTUNITY (CONTROLLED) */}
            <div className="co-card co-accent" style={{ borderTopColor: "#b45309" }}>
                <CoSectionHead
                    letter="F"
                    title="Supervision, safety & participation scope"
                    tag="MANDATORY"
                    color="#b45309"
                    expanded={expandedSections.includes("F")}
                    onToggle={() => toggleSection("F")}
                />
                <div className={`${!expandedSections.includes('F') ? 'hidden' : ''}`}>
                    <p className="mb-3 text-[11px] leading-relaxed text-[#7a919a]">
                        Student-created opportunities stay within your university, require faculty verification by email, and are reviewed by CIEL Admin before going live.
                    </p>

                    {/* F1 Faculty approval */}
                    <div>
                        <label className="co-label">F1 · Faculty approval — a verification email is sent; <b className="text-[#b45309]">nothing proceeds without it</b></label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Faculty name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Faculty name…"
                                    value={formData.supervision.facultyName}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, facultyName: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Designation <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Designation…"
                                    value={formData.supervision.facultyDesignation}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, facultyDesignation: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Department…"
                                    value={formData.supervision.facultyDepartment}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, facultyDepartment: e.target.value } })}
                                />
                            </div>
                            <div>
                                <span className="co-locked w-full">🏛️ {studentDetails.institution || "—"}<span className="co-lock-badge">🔒</span></span>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Official email address <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    placeholder="Official email address — faculty.name@university.edu…"
                                    value={formData.supervision.facultyOfficialEmail}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, facultyOfficialEmail: e.target.value } })}
                                />
                            </div>
                        </div>
                        <div className="co-note aqua">
                            📧 <span>This confirms the opportunity is valid, supervised, and academically acceptable. Faculty approval is required before the opportunity can proceed.</span>
                        </div>
                    </div>

                    <div>
                        <label className="co-label" style={{ marginTop: 14 }}>F2 · Executing context · choose one</label>
                        <PartnerOrganizationGuidance context="create" />
                        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <button
                                type="button"
                                className={`co-choice${formData.supervision.executingContext === "partner" ? " on" : ""}`}
                                onClick={() => setFormData({ ...formData, supervision: { ...formData.supervision, executingContext: "partner" } })}
                            >
                                <div className="text-[22px]">🤝</div>
                                <div className="mt-1 text-xs font-extrabold">Yes — partner organisation involved</div>
                                <div className="mt-0.5 text-[10px] leading-snug text-[#7a919a]">NGO, school, hospital, community group…</div>
                            </button>
                            <button
                                type="button"
                                className={`co-choice${formData.supervision.executingContext === "independent" ? " on" : ""}`}
                                onClick={() => setFormData({ ...formData, supervision: { ...formData.supervision, executingContext: "independent" } })}
                            >
                                <div className="text-[22px]">🧑‍🤝‍🧑</div>
                                <div className="mt-1 text-xs font-extrabold">No — independent community-based</div>
                                <div className="mt-0.5 text-[10px] leading-snug text-[#7a919a]">Your crew, directly with the community.</div>
                            </button>
                        </div>
                        {formData.supervision.executingContext === "partner" && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs font-bold text-slate-500 uppercase">Partner organization</p>
                                <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 leading-relaxed">
                                    Add the NGO, company, or institution where you will carry out this activity. Use the
                                    partner&apos;s official contact email so they can log in to CIEL and approve your opportunity.
                                </p>
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
                                <textarea spellCheck={true}
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
                    <div className="pt-2">
                        <label className="co-label" style={{ marginTop: 14 }}>F3 · Safety &amp; responsibility · tap all four to confirm</label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button type="button" className={`co-safe${formData.supervision.declSafeEnvironment ? " on" : ""}`} onClick={() => setFormData({ ...formData, supervision: { ...formData.supervision, declSafeEnvironment: !formData.supervision.declSafeEnvironment } })}>
                                <span className="co-tick">{formData.supervision.declSafeEnvironment ? "✓" : ""}</span>
                                <span>This activity environment is safe and appropriate</span>
                            </button>
                            <button type="button" className={`co-safe${formData.supervision.declNoHazardous ? " on" : ""}`} onClick={() => setFormData({ ...formData, supervision: { ...formData.supervision, declNoHazardous: !formData.supervision.declNoHazardous } })}>
                                <span className="co-tick">{formData.supervision.declNoHazardous ? "✓" : ""}</span>
                                <span>No hazardous or high-risk tasks are involved</span>
                            </button>
                            <button type="button" className={`co-safe${formData.supervision.declFacultyOversight ? " on" : ""}`} onClick={() => setFormData({ ...formData, supervision: { ...formData.supervision, declFacultyOversight: !formData.supervision.declFacultyOversight } })}>
                                <span className="co-tick">{formData.supervision.declFacultyOversight ? "✓" : ""}</span>
                                <span>Faculty oversight is ensured</span>
                            </button>
                            <button type="button" className={`co-safe${formData.supervision.declEthicalLawful ? " on" : ""}`} onClick={() => setFormData({ ...formData, supervision: { ...formData.supervision, declEthicalLawful: !formData.supervision.declEthicalLawful } })}>
                                <span className="co-tick">{formData.supervision.declEthicalLawful ? "✓" : ""}</span>
                                <span>All activities are ethical and lawful</span>
                            </button>
                        </div>
                    </div>

                    {/* F4 Admin */}
                    <div className="co-note aqua" style={{ marginTop: 12 }}>
                        🛡️ <span><b>F4 · Admin approval:</b> CIEL Admin will review feasibility and clarity, SDG alignment, risk level, and authenticity before this is published at your institution.</span>
                    </div>

                    {/* F5 Visibility & participation */}
                    <div>
                        <label className="co-label" style={{ marginTop: 14 }}>F5 · Visibility &amp; participation scope</label>
                        <span className="co-locked w-full">🔒 <b>Restricted to your university only</b> — only {studentDetails.institution || "your university"} students can view and apply. Cross-university participation is not allowed.</span>
                        <div className="co-chips mt-2">
                            <CoChip
                                selected={formData.participation.departmentScope === "all"}
                                onClick={() => setFormData({ ...formData, participation: { ...formData.participation, departmentScope: "all" } })}
                            >
                                🌐 Open to all departments within the university
                            </CoChip>
                            <CoChip
                                selected={formData.participation.departmentScope === "specific"}
                                onClick={() => setFormData({ ...formData, participation: { ...formData.participation, departmentScope: "specific" } })}
                            >
                                🎯 Restricted to specific departments / programs
                            </CoChip>
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
            <div className="co-card co-accent" style={{ borderTopColor: "#f472b6" }}>
                <CoSectionHead
                    letter="G"
                    title="Evidence & verification"
                    tag="SET EXPECTATIONS NOW"
                    tagAuto
                    color="#f472b6"
                    expanded={expandedSections.includes("G")}
                    onToggle={() => toggleSection("G")}
                />
                <div className={`${!expandedSections.includes('G') ? 'hidden' : ''}`}>
                    <p className="mb-3 text-[11px] leading-relaxed text-[#7a919a]">What proof will your crew log as they go? Tap what applies — it becomes the checklist inside every member’s report.</p>
                    <div className="co-chips">
                        {["Attendance sheets", "Supervisor sign-off", "Photos of activities", "Assessment sheets", "Digital logs"].map(v => (
                            <CoChip
                                key={v}
                                selected={formData.verification.includes(v)}
                                onClick={() => {
                                    const vers = formData.verification.includes(v)
                                        ? formData.verification.filter(i => i !== v)
                                        : [...formData.verification, v];
                                    setFormData({ ...formData, verification: vers });
                                }}
                            >
                                {VERIFICATION_EMOJI[v] || ""} {v}
                            </CoChip>
                        ))}
                    </div>
                </div>
            </div>

            {/* SECTION: F6 REQUIRED CONFIRMATIONS + DECLARATION */}
            <div className="co-final mb-3 rounded-[20px] bg-[#0d2b33] p-5 text-white">
                <div className="mb-1 flex items-center gap-2.5">
                    <span className="flex h-[26px] min-w-[28px] items-center justify-center rounded-[9px] bg-[#2dd4bf] px-2 text-[11px] font-extrabold text-[#04252b]">✓</span>
                    <h2 className="text-[14.5px] font-extrabold text-white">Final confirmations</h2>
                </div>
                <p className="mb-2 text-[11px] leading-relaxed text-[#a5e8de]">By submitting, you confirm the following — tap each:</p>
                <button
                    type="button"
                    className={`co-confirm${formData.sectionFConfirmations.facultyApproval ? " on" : ""}`}
                    onClick={() =>
                        setFormData({
                            ...formData,
                            sectionFConfirmations: { ...formData.sectionFConfirmations, facultyApproval: !formData.sectionFConfirmations.facultyApproval },
                        })
                    }
                >
                    <span className="co-tick">{formData.sectionFConfirmations.facultyApproval ? "✓" : ""}</span>
                    <span>Faculty approval has been obtained or will be obtained — the verification email will be sent.</span>
                </button>
                <button
                    type="button"
                    className={`co-confirm${formData.sectionFConfirmations.genuineAccurate ? " on" : ""}`}
                    onClick={() =>
                        setFormData({
                            ...formData,
                            sectionFConfirmations: { ...formData.sectionFConfirmations, genuineAccurate: !formData.sectionFConfirmations.genuineAccurate },
                        })
                    }
                >
                    <span className="co-tick">{formData.sectionFConfirmations.genuineAccurate ? "✓" : ""}</span>
                    <span>The opportunity is genuine and accurately described.</span>
                </button>
                <button
                    type="button"
                    className={`co-confirm${formData.sectionFConfirmations.safeAppropriate ? " on" : ""}`}
                    onClick={() =>
                        setFormData({
                            ...formData,
                            sectionFConfirmations: { ...formData.sectionFConfirmations, safeAppropriate: !formData.sectionFConfirmations.safeAppropriate },
                        })
                    }
                >
                    <span className="co-tick">{formData.sectionFConfirmations.safeAppropriate ? "✓" : ""}</span>
                    <span>The activity is safe and appropriate.</span>
                </button>
                <button
                    type="button"
                    className={`co-confirm${formData.sectionFConfirmations.truthfulVerifiable ? " on" : ""}`}
                    onClick={() =>
                        setFormData({
                            ...formData,
                            sectionFConfirmations: { ...formData.sectionFConfirmations, truthfulVerifiable: !formData.sectionFConfirmations.truthfulVerifiable },
                        })
                    }
                >
                    <span className="co-tick">{formData.sectionFConfirmations.truthfulVerifiable ? "✓" : ""}</span>
                    <span>All provided information is truthful and verifiable.</span>
                </button>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <span className="co-locked" style={{ background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.25)", color: "#fff" }}>
                        🧑‍🎓 <b style={{ color: "#fff" }}>{studentDetails.name || "—"}</b><span className="co-lock-badge">🔒</span>
                    </span>
                    <span className="co-locked" style={{ background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.25)", color: "#fff" }}>
                        🏛️ {studentDetails.institution || "—"} · LOCKED SCOPE<span className="co-lock-badge">🔒</span>
                    </span>
                </div>
                <div className="mt-3.5 flex gap-2.5">
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="flex-1 rounded-[13px] border border-white/30 bg-transparent py-3 text-xs font-extrabold text-[#d9f7f2] disabled:opacity-50"
                        disabled={isSubmitting || isLoadingEdit || Boolean(editingOpportunityId)}
                    >
                        💾 Save draft
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || isLoadingEdit}
                        className="flex-[2] rounded-[13px] bg-[linear-gradient(90deg,#0e7d74,#2dd4bf)] py-3 text-[13px] font-extrabold text-white disabled:opacity-70"
                    >
                        {isSubmitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : null}
                        {isSubmitting
                            ? "Submitting..."
                            : editingOpportunityId
                              ? "Save changes"
                              : "🚀 Submit project"}
                    </button>
                </div>
            </div>

            <div className="sticky bottom-3.5 z-40 mt-4 overflow-hidden rounded-[20px] border border-[#dcebee] bg-white shadow-[0_-8px_30px_rgba(4,37,43,.10)]">
                <div className="flex flex-wrap items-center gap-3 bg-[linear-gradient(130deg,#04252b,#0e5f63_55%,#12a5a0_120%)] px-4 py-3 text-white">
                    <span className="text-[22px]">{previewEmoji}</span>
                    <div className="min-w-0 flex-1">
                        <b className="block text-[13px]">{formData.title.trim() || "Your listing builds itself here…"}</b>
                        <span className="text-[9.5px] text-[#cdf5f0]">
                            {previewBits.length ? previewBits.join(" · ") : "fill the form above and watch this card come alive"}
                        </span>
                    </div>
                    <div className="flex gap-1">
                        {previewPrimarySdg ? (
                            <span className="co-sdg" style={{ background: previewPrimarySdg.color ?? "#0e7d74" }}>
                                SDG {previewPrimarySdg.number}{formData.target ? ` · ${formData.target}` : ""}
                            </span>
                        ) : null}
                        {previewSecondarySdg ? (
                            <span className="co-sdg" style={{ background: previewSecondarySdg.color ?? "#6d28d9" }}>
                                SDG {previewSecondarySdg.number}
                            </span>
                        ) : null}
                    </div>
                    <span className="rounded-full bg-white/18 px-2.5 py-1 text-[7.5px] font-extrabold">● LIVE PREVIEW</span>
                </div>
            </div>
            <OpportunitySubmittedReviewModal
                open={showSubmittedReviewModal}
                opportunityTitle={submittedOpportunityTitle}
                onClose={() => {
                    setShowSubmittedReviewModal(false);
                    router.push("/dashboard/student/projects");
                }}
            />
        </div>
    );
}
