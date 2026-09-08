"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Info, MapPin, AlertCircle, ChevronDown, Loader2, Plus } from "lucide-react";
import { X } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
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
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { findSdgById, opportunityFormSdgList } from "@/utils/sdgData";
import { pakistaniUniversities } from "@/utils/universityData";
import { PAKISTAN_REGION_OPTIONS } from "@/utils/pakistanRegions";
import { isFacultyProfileComplete, pickProfileEmail } from "@/utils/profileCompletion";
import { mapOpportunityDetailToFacultyForm } from "./mapDetailToForm";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import { composeInternationalPhone, DEFAULT_PHONE_COUNTRY_KEY, parsePhoneForDisplay } from "@/utils/countryCallingCodes";
import {
    resolveFacultyFlashEligibility,
    StudentOpportunityFlashcard,
    type FlashViewer,
} from "@/app/dashboard/student/create-opportunity/StudentOpportunityFlashcard";

const LocationPicker = dynamic(() => import("@/components/ui/LocationPicker"), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-slate-400">Loading Map...</div>
});

/** Timeline modes that collect start/end date + optional daily from/to time (sent as timeline.* on create). */
/** Optional schedule fields for these timeline types. */
const TIMELINES_WITH_SCHEDULE_UI = ["Fixed dates", "Flexible", "Ongoing"] as const;

const WIZARD_STEPS = [
    { key: "A", label: "Creator", sub: "Faculty profile", icon: "👩‍🏫" },
    { key: "B", label: "Opportunity", sub: "Title, type, mode", icon: "🚀" },
    { key: "SCHED", label: "Schedule", sub: "Dates, seats, hours", icon: "📅" },
    { key: "C", label: "SDG & impact", sub: "Goals, objective, outputs", icon: "🌍" },
    { key: "E", label: "Student experience", sub: "Plan & skills gained", icon: "🛠️" },
    { key: "F", label: "Verification", sub: "You + optional partner", icon: "✅" },
    { key: "VIS", label: "Visibility", sub: "Who can Apply Now", icon: "📣" },
    { key: "SAFE", label: "Safety", sub: "Declarations & signature", icon: "🛡️" },
    { key: "SUBMIT", label: "Flashcard", sub: "Review & submit", icon: "🃏" },
] as const;

/** "Save draft" only persists locally on this device — there is no faculty draft endpoint on the
 * backend (unlike the student flow), so this must never call the real submit API. */
const FACULTY_OPPORTUNITY_DRAFT_KEY = "ciel_faculty_opportunity_draft_v1";

type ParticipationRule =
    | "open_all_universities"
    | "restricted_specific_universities"
    | "own_university_only"
    | "departments_across_universities"
    | "own_university_departments";

type FacultyApplyScope =
    | "all"
    | "multi_all"
    | "multi_depts"
    | "one_all"
    | "one_depts"
    | "own_uni_all"
    | "own_dept";

function applyScopeToRule(scope: FacultyApplyScope): ParticipationRule {
    switch (scope) {
        case "all":
            return "open_all_universities";
        case "multi_all":
        case "one_all":
            return "restricted_specific_universities";
        case "multi_depts":
        case "one_depts":
            return "departments_across_universities";
        case "own_uni_all":
            return "own_university_only";
        case "own_dept":
            return "own_university_departments";
    }
}

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

function isValidEmail(s: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function pickProfileContact(u: unknown): string {
    if (!u || typeof u !== "object") return "";
    const o = u as Record<string, unknown>;
    const raw = o.contact ?? o.phone ?? o.mobile ?? o.phone_number;
    if (raw == null) return "";
    return String(raw).trim();
}

export default function FacultyOpportunityCreationPage() {
    const router = useRouter();
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
    const [isLoadingEdit, setIsLoadingEdit] = useState(false);

    const [facultyDetails, setFacultyDetails] = useState({
        name: "",
        institution: "",
        city: "",
        contact: "",
        email: "",
    });

    // Form State
    const [formData, setFormData] = useState({
        // Section B
        title: "",
        hook: "",
        opportunityType: [] as string[],
        isOtherTypeChecked: false,
        otherTypeSpecs: [""] as string[],
        mode: "", // on-site, remote, hybrid
        location: { city: "", venue: "", pin: "" },
        timelineType: "Fixed dates", // fixed, flexible, ongoing
        dates: { start: "", end: "", fromTime: "", endTime: "" },
        applicationDeadline: "",
        scheduleNotes: "",
        capacity: { hours: "", volunteers: "" },

        // Section C
        sdg: "",
        target: "",
        indicator: "",
        sdgWhy: "",
        secondarySdgs: [] as { sdgId: string, targetId: string, indicatorId: string, justification: string }[],

        // Section D
        objectives: {
            description: "",
            outputs: "",
            outcome: "",
            beneficiariesCount: "",
            beneficiariesType: [] as string[],
            isOtherBeneficiaryChecked: false,
            otherBeneficiarySpecs: [""] as string[]
        },

        // Section E
        activity: {
            responsibilities: "",
            skills: [] as string[],
            isOtherSkillChecked: false,
            otherSkills: [""] as string[],
            prerequisites: "",
            resources: "",
        },

        // Section F — Verification & safety (faculty academic lead)
        academicLead: {
            designation: "",
            department: "",
            officialEmail: "",
            whatsappCountryKey: DEFAULT_PHONE_COUNTRY_KEY,
            whatsappNational: "",
        },
        partnerCollaboration: {
            hasPartner: false,
            orgName: "",
            contactPerson: "",
            email: "",
            designation: "",
            function: "",
        },
        safetyDeclarations: {
            safeAppropriate: false,
            guidedSupervised: false,
            lawfulEthical: false,
            precautionsInPlace: false,
        },
        extraSafety: {
            communicateChanges: false,
            visibilityIntentional: false,
            cielNotGuarantee: false,
            signatureAck: false,
        },
        electronicSignature: "",
        flashApprove: false,
        applyScope: "all" as FacultyApplyScope,

        // Section G
        verification: [] as string[],
        isOtherVerificationChecked: false,
        otherVerification: "",

        // Section H — F5 visibility & institutional access
        participationScope: {
            rule: "open_all_universities" as ParticipationRule,
            selectedUniversities: [] as string[],
            departments: [""] as string[],
            sectionsNote: "",
        },
        academicLinkage: {
            courseName: "",
            semester: "",
        },

        // Section I — F6 final confirmations (wired to submit)
        finalConfirmations: {
            academicallyValid: false,
            properlySupervised: false,
            safeEnvironment: false,
            correctVerifiable: false,
        },
    });
    const [flashViewer, setFlashViewer] = useState<FlashViewer>("eligible");
    const [activeStep, setActiveStep] = useState<string>("A");
    const activeStepIndex = WIZARD_STEPS.findIndex((s) => s.key === activeStep);
    const goToStep = useCallback((key: string) => {
        setActiveStep(key);
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);
    const goNextStep = useCallback(() => {
        const i = WIZARD_STEPS.findIndex((s) => s.key === activeStep);
        if (i >= 0 && i < WIZARD_STEPS.length - 1) goToStep(WIZARD_STEPS[i + 1].key);
    }, [activeStep, goToStep]);
    const goBackStep = useCallback(() => {
        const i = WIZARD_STEPS.findIndex((s) => s.key === activeStep);
        if (i > 0) goToStep(WIZARD_STEPS[i - 1].key);
    }, [activeStep, goToStep]);

    const chooseApplyScope = useCallback((scope: FacultyApplyScope) => {
        setFormData((prev) => {
            const rule = applyScopeToRule(scope);
            let selectedUniversities = prev.participationScope.selectedUniversities;
            if (scope === "all" || scope === "own_uni_all" || scope === "own_dept") {
                selectedUniversities = [];
            } else if ((scope === "one_all" || scope === "one_depts") && selectedUniversities.length > 1) {
                selectedUniversities = selectedUniversities.slice(0, 1);
            }
            let departments = prev.participationScope.departments;
            if (scope === "own_dept") {
                const ownDept = prev.academicLead.department.trim();
                if (ownDept && !departments.some((d) => d.trim())) {
                    departments = [ownDept];
                }
            }
            return {
                ...prev,
                applyScope: scope,
                participationScope: {
                    ...prev.participationScope,
                    rule,
                    selectedUniversities,
                    departments,
                },
            };
        });
    }, []);

    const displayFacultyContact = useMemo(
        () => parsePhoneForDisplay(facultyDetails.contact),
        [facultyDetails.contact],
    );

    const validateForm = () => {
        if (!facultyDetails.contact.trim()) {
            toast.error("Contact No. is missing from your profile. Add it under Faculty Profile, then try again.");
            return false;
        }
        if (!facultyDetails.email.trim() || !isValidEmail(facultyDetails.email)) {
            toast.error("A valid profile email is required. Update your faculty profile, then try again.");
            return false;
        }
        if (!formData.title.trim()) {
            toast.error("Please enter an Opportunity Title");
            return false;
        }
        if (!formData.hook.trim()) {
            toast.error("Please add a one-line student hook.");
            return false;
        }
        if (formData.opportunityType.length === 0 && !formData.isOtherTypeChecked) {
            toast.error("Please select at least one Opportunity Type (Section B)");
            return false;
        }
        if (formData.isOtherTypeChecked) {
            const specs = formData.otherTypeSpecs.map((s) => s.trim()).filter(Boolean);
            if (specs.length === 0) {
                toast.error("Please add at least one other opportunity type (Section B)");
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
        }
        if (!formData.timelineType) {
            toast.error("Please select a Timeline Type");
            return false;
        }
        if (!formData.applicationDeadline.trim()) {
            toast.error("Please set an application deadline.");
            return false;
        }
        if (!formData.dates.start.trim() || !formData.dates.end.trim()) {
            toast.error("Please set both a start date and an end date.");
            return false;
        }
        if (formData.dates.start > formData.dates.end) {
            toast.error("End date must be on or after the start date.");
            return false;
        }
        if (formData.applicationDeadline > formData.dates.start) {
            toast.error("Application deadline cannot be after the start date.");
            return false;
        }
        const hoursNum = parseInt(formData.capacity.hours, 10);
        if (!formData.capacity.hours.trim() || Number.isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 500) {
            toast.error("Required hours per student must be between 1 and 500.");
            return false;
        }
        const volNum = parseInt(formData.capacity.volunteers, 10);
        if (!formData.capacity.volunteers.trim() || Number.isNaN(volNum) || volNum < 1 || volNum > 5000) {
            toast.error("Available seats must be between 1 and 5000.");
            return false;
        }
        // Section C
        if (!formData.sdg) {
            toast.error("Please select a Primary SDG");
            return false;
        }
        if (!formData.sdgWhy.trim()) {
            toast.error("Please explain why this SDG is genuinely relevant.");
            return false;
        }
        // Secondary SDGs (C4): optional; rows without a target are not sent in secondary_sdgs (see payload filter).

        // Section D
        if (!formData.objectives.description.trim()) {
            toast.error("Please enter the primary objective");
            return false;
        }
        if (!formData.objectives.outputs.trim()) {
            toast.error("Please describe expected outputs.");
            return false;
        }

        // Section E
        if (!formData.activity.responsibilities.trim()) {
            toast.error("Please list Student Responsibilities (Section E)");
            return false;
        }
        if (formData.objectives.isOtherBeneficiaryChecked) {
            const ob = formData.objectives.otherBeneficiarySpecs.map((s) => s.trim()).filter(Boolean);
            if (ob.length === 0) {
                toast.error("Please add at least one other beneficiary type (Section D)");
                return false;
            }
        }
        if (formData.activity.isOtherSkillChecked) {
            const os = formData.activity.otherSkills.map((s) => s.trim()).filter(Boolean);
            if (os.length === 0) {
                toast.error("Please add at least one other skill (Section E)");
                return false;
            }
        }

        // Section F1 — Academic lead / faculty verification
        if (!facultyDetails.name.trim()) {
            toast.error("Faculty name is missing from your profile (Section A / F1)");
            return false;
        }
        if (!facultyDetails.institution.trim()) {
            toast.error("University / institution is missing from your profile (Section A / F1)");
            return false;
        }
        if (!formData.academicLead.designation.trim() || !formData.academicLead.department.trim()) {
            toast.error("Please enter your designation and department so students know the academic owner.");
            return false;
        }
        if (!formData.academicLead.officialEmail.trim() || !isValidEmail(formData.academicLead.officialEmail)) {
            toast.error("Please enter a valid official email address");
            return false;
        }

        // Section F2 — External partner (optional; required when Yes)
        if (formData.partnerCollaboration.hasPartner) {
            const p = formData.partnerCollaboration;
            if (!p.orgName.trim() || !p.contactPerson.trim() || !p.email.trim()) {
                toast.error("Please complete partner organization details (Section F — F2)");
                return false;
            }
            if (!isValidEmail(p.email)) {
                toast.error("Please enter a valid partner organization email (Section F — F2)");
                return false;
            }
        }

        const sd = formData.safetyDeclarations;
        if (!sd.safeAppropriate || !sd.guidedSupervised || !sd.lawfulEthical || !sd.precautionsInPlace) {
            toast.error("Please confirm all items in Safety & Supervision Declaration");
            return false;
        }
        if (!formData.extraSafety.communicateChanges || !formData.extraSafety.visibilityIntentional || !formData.extraSafety.cielNotGuarantee || !formData.extraSafety.signatureAck) {
            toast.error("Please confirm all safety and accountability declarations.");
            return false;
        }
        if (!formData.electronicSignature.trim()) {
            toast.error("Please type your full name as an electronic signature.");
            return false;
        }

        const applyScope = formData.applyScope;
        const ownUni = facultyDetails.institution.trim();
        const selectedUnis = formData.participationScope.selectedUniversities.map((u) => u.trim()).filter(Boolean);
        if (applyScope === "multi_all" || applyScope === "multi_depts") {
            if (selectedUnis.length === 0) {
                toast.error("Please add at least one university for this Apply Now scope.");
                return false;
            }
        }
        if (applyScope === "one_all" || applyScope === "one_depts") {
            if (selectedUnis.length !== 1) {
                toast.error("Please select exactly one university for this Apply Now scope.");
                return false;
            }
        }
        if (applyScope === "own_uni_all" || applyScope === "own_dept") {
            if (!ownUni) {
                toast.error("Your university is not set in your profile. Complete your profile first.");
                return false;
            }
        }
        if (applyScope === "multi_depts" || applyScope === "one_depts" || applyScope === "own_dept") {
            const deps = formData.participationScope.departments.map((d) => d.trim()).filter(Boolean);
            if (deps.length === 0) {
                toast.error("Please add at least one department or programme.");
                return false;
            }
        }

        const fc = formData.finalConfirmations;
        if (!fc.academicallyValid || !fc.properlySupervised || !fc.safeEnvironment || !fc.correctVerifiable) {
            toast.error("Please accept all required confirmations");
            return false;
        }
        if (!formData.flashApprove) {
            toast.error("Please review and approve the opportunity flashcard.");
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (isLoadingEdit) return;
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            // Transform state to match API Spec
            const otherTypeStrings = formData.otherTypeSpecs.map((s) => s.trim()).filter(Boolean);
            const typesPayload =
                formData.isOtherTypeChecked && otherTypeStrings.length > 0
                    ? [
                          ...formData.opportunityType,
                          ...otherTypeStrings.map((s) => `Other: ${s}`),
                      ]
                    : formData.opportunityType;

            const otherBeneficiaryMerged = formData.objectives.isOtherBeneficiaryChecked
                ? [
                      ...formData.objectives.beneficiariesType,
                      ...formData.objectives.otherBeneficiarySpecs.map((s) => s.trim()).filter(Boolean),
                  ]
                : formData.objectives.beneficiariesType;

            const skillsPayload = formData.activity.isOtherSkillChecked
                ? [
                      ...formData.activity.skills,
                      ...formData.activity.otherSkills.map((s) => s.trim()).filter(Boolean),
                  ]
                : formData.activity.skills;

            const participationRule = applyScopeToRule(formData.applyScope);
            const ownInstitution = facultyDetails.institution.trim();
            const selectedUnis = formData.participationScope.selectedUniversities.map((u) => u.trim()).filter(Boolean);
            const ownDept = formData.academicLead.department.trim();
            const deptList = (
                formData.applyScope === "own_dept" && !formData.participationScope.departments.some((d) => d.trim())
                    ? (ownDept ? [ownDept] : [])
                    : formData.participationScope.departments.map((d) => d.trim()).filter(Boolean)
            );
            // Browse's "Restricted"/"Open to all" badge and filter read this — must reflect the actual
            // participation scope, not always claim "public"/"open all". Apply Now eligibility is
            // still separately gated by participation_scope; the directory card itself stays visible
            // either way (backend OpportunitiesService.isPubliclyVisibleOpportunity), this only fixes
            // the label/filter being wrong.
            const visibility = participationRule === "open_all_universities" ? "public" : "restricted";
            const restrictedUniversitiesPayload =
                participationRule === "open_all_universities"
                    ? null
                    : participationRule === "restricted_specific_universities" || participationRule === "departments_across_universities"
                      ? selectedUnis
                      : [ownInstitution].filter(Boolean);

            const departmentRestrictionScope =
                participationRule === "departments_across_universities" || participationRule === "own_university_departments"
                    ? "specific"
                    : "all";

            const allSafetyConfirmed =
                formData.safetyDeclarations.safeAppropriate &&
                formData.safetyDeclarations.guidedSupervised &&
                formData.safetyDeclarations.lawfulEthical &&
                formData.safetyDeclarations.precautionsInPlace;

            const payload = {
                title: formData.title,
                types: typesPayload,
                mode: formData.mode,
                location: formData.mode === 'Remote' ? null : formData.location,
                timeline: {
                    type: formData.timelineType,
                    start_date: formData.dates.start,
                    end_date: formData.dates.end,
                    application_deadline: formData.applicationDeadline || undefined,
                    schedule_notes: formData.scheduleNotes.trim() || undefined,
                    ...((TIMELINES_WITH_SCHEDULE_UI as readonly string[]).includes(formData.timelineType)
                        ? {
                              ...(formData.dates.fromTime.trim() ? { from_time: formData.dates.fromTime.trim() } : {}),
                              ...(formData.dates.endTime.trim() ? { to_time: formData.dates.endTime.trim() } : {}),
                          }
                        : {}),
                    expected_hours: parseInt(formData.capacity.hours) || 0,
                    volunteers_required: parseInt(formData.capacity.volunteers) || 0
                },
                sdg: formData.sdg,
                sdg_info: {
                    sdg_id: formData.sdg,
                    target_id: formData.target,
                    indicator_id: formData.indicator,
                    why_relevant: formData.sdgWhy.trim(),
                },
                secondary_sdgs: formData.secondarySdgs
                    .filter((s) => s.sdgId && s.targetId)
                    .map((s) => ({
                        sdg_id: s.sdgId,
                        target_id: s.targetId,
                        indicator_id: s.indicatorId,
                        justification: s.justification
                    })),
                objectives: {
                    description: formData.objectives.description,
                    hook: formData.hook.trim(),
                    outputs: formData.objectives.outputs.trim(),
                    outcome: formData.objectives.outcome.trim() || undefined,
                    beneficiaries_count: parseInt(formData.objectives.beneficiariesCount) || 0,
                    beneficiaries_type: otherBeneficiaryMerged
                },
                activity_details: {
                    student_responsibilities: formData.activity.responsibilities,
                    skills_gained: skillsPayload,
                    prerequisites: formData.activity.prerequisites.trim() || undefined,
                    resources: formData.activity.resources.trim() || undefined,
                },
                supervision: {
                    supervisor_name: facultyDetails.name.trim(),
                    role: formData.academicLead.designation.trim(),
                    contact: formData.academicLead.officialEmail.trim(),
                    faculty_department: formData.academicLead.department.trim(),
                    faculty_university_name: ownInstitution,
                    ...(composeInternationalPhone(formData.academicLead.whatsappCountryKey, formData.academicLead.whatsappNational)
                        ? {
                              whatsapp_e164: composeInternationalPhone(
                                  formData.academicLead.whatsappCountryKey,
                                  formData.academicLead.whatsappNational,
                              ),
                          }
                        : {}),
                    ...(formData.partnerCollaboration.hasPartner
                        ? {
                              external_partner_org_name: formData.partnerCollaboration.orgName.trim(),
                              external_partner_contact_person: formData.partnerCollaboration.contactPerson.trim(),
                              external_partner_email: formData.partnerCollaboration.email.trim(),
                          }
                        : {}),
                    safe_environment: allSafetyConfirmed,
                    supervised: allSafetyConfirmed,
                    information_accurate:
                        formData.finalConfirmations.academicallyValid && formData.finalConfirmations.correctVerifiable,
                    electronic_signature: formData.electronicSignature.trim(),
                },
                safety_declaration: {
                    environment_safe_and_appropriate: formData.safetyDeclarations.safeAppropriate,
                    students_guided_and_supervised: formData.safetyDeclarations.guidedSupervised,
                    lawful_ethical_and_non_hazardous: formData.safetyDeclarations.lawfulEthical,
                    precautions_and_basic_safety: formData.safetyDeclarations.precautionsInPlace,
                },
                external_partner_collaboration: formData.partnerCollaboration.hasPartner
                    ? {
                          organization_name: formData.partnerCollaboration.orgName.trim(),
                          contact_person: formData.partnerCollaboration.contactPerson.trim(),
                          official_email: formData.partnerCollaboration.email.trim(),
                      }
                    : null,
                participation_scope: {
                    rule: participationRule,
                    apply_scope: formData.applyScope,
                    creator_university_name: ownInstitution,
                    university_names:
                        participationRule === "open_all_universities"
                            ? []
                            : participationRule === "restricted_specific_universities" ||
                                participationRule === "departments_across_universities"
                              ? selectedUnis
                              : [ownInstitution].filter(Boolean),
                    department_restriction: {
                        scope: departmentRestrictionScope,
                        departments: departmentRestrictionScope === "specific" ? deptList : [],
                        sections_or_class_note: formData.participationScope.sectionsNote.trim() || null,
                    },
                },
                ...(formData.academicLinkage.courseName.trim() || formData.academicLinkage.semester.trim()
                    ? {
                          academic_linkage: {
                              course_name: formData.academicLinkage.courseName.trim() || null,
                              semester: formData.academicLinkage.semester.trim() || null,
                          },
                      }
                    : {}),
                submission_confirmations: {
                    academically_valid_and_accurately_described: formData.finalConfirmations.academicallyValid,
                    activity_properly_supervised: formData.finalConfirmations.properlySupervised,
                    environment_safe_and_appropriate: formData.finalConfirmations.safeEnvironment,
                    information_correct_and_verifiable: formData.finalConfirmations.correctVerifiable,
                },
                verification_method: formData.isOtherVerificationChecked && formData.otherVerification.trim()
                    ? [...formData.verification, formData.otherVerification.trim()]
                    : formData.verification,
                visibility,
                visibility_and_academic_linkage: {
                    visibility_type: participationRule,
                    restricted_university_names: restrictedUniversitiesPayload || [],
                },
                restricted_universities: restrictedUniversitiesPayload
            };

            const isEdit = Boolean(editingOpportunityId);
            const res = await authenticatedFetch(
                isEdit ? `/api/v1/opportunities/update` : `/api/v1/opportunities`,
                {
                    method: "POST",
                    body: JSON.stringify(isEdit ? { id: editingOpportunityId, ...payload } : payload),
                },
            );

            if (res && res.ok) {
                const data = await res.json();
                // Check for success flag OR direct object return (id/title)
                if (data.success || data.id || data.title) {
                    toast.success(
                        isEdit
                            ? "Opportunity updated successfully."
                            : "Opportunity submitted. Track partner (if any) and admin approval under My Opportunities.",
                    );
                    try {
                        localStorage.removeItem(FACULTY_OPPORTUNITY_DRAFT_KEY);
                    } catch {
                        // best-effort cleanup only
                    }
                    router.push(isEdit ? "/dashboard/faculty/my-opportunities" : "/dashboard/faculty");
                } else {
                    toast.error(data.message || (isEdit ? "Failed to update opportunity" : "Failed to create opportunity"));
                }
            } else {
                toast.error("Failed to connect to server");
            }
        } catch (error) {
            console.error("Error submitting form", error);
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveDraft = () => {
        // There is no faculty draft endpoint on the backend — this must stay a local-only save and
        // must never call handleSubmit(), which posts a real, live opportunity into the approval queue.
        try {
            localStorage.setItem(
                FACULTY_OPPORTUNITY_DRAFT_KEY,
                JSON.stringify({ v: 1, savedAt: Date.now(), formData }),
            );
            toast.success("Draft saved on this device — resume it next time you open this page.");
        } catch (e) {
            console.error("Draft save failed", e);
            toast.error("Could not save draft. Check browser storage.");
        }
    };

    const toggleType = (type: string) => {
        setFormData(prev => {
            const types = prev.opportunityType.includes(type)
                ? prev.opportunityType.filter(t => t !== type)
                : [...prev.opportunityType, type];
            return { ...prev, opportunityType: types };
        });
    };

    const [expandedSections, setExpandedSections] = useState<string[]>(["A", "B"]);

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

                let name = typeof base.name === "string" ? base.name : "";
                let email = pickProfileEmail(base);
                let institution =
                    (typeof base.institution === "string" && base.institution.trim()) ||
                    (typeof base.university === "string" && base.university.trim()) ||
                    "";
                let city = typeof base.city === "string" ? base.city : "";
                let contact = pickProfileContact(base);
                let department =
                    (typeof base.department === "string" && base.department.trim()) ||
                    (typeof base.faculty_department === "string" && base.faculty_department.trim()) ||
                    "";
                let designation =
                    (typeof base.designation === "string" && base.designation.trim()) ||
                    (typeof base.title === "string" && base.title.trim()) ||
                    "";

                const storedUser = localStorage.getItem("ciel_user");
                let userId: string | number | null = null;
                if (storedUser) {
                    try {
                        const userObj = JSON.parse(storedUser) as { id?: string | number; userId?: string | number };
                        userId = userObj.id ?? userObj.userId ?? null;
                    } catch {
                        console.error("Failed to parse user data");
                    }
                }

                if (userId != null) {
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
                            const apiDept = user.department ?? user.faculty_department;
                            const apiDesig = user.designation ?? user.title ?? user.role;
                            const emailFromApi =
                                typeof user.email === "string" && user.email.trim() ? user.email.trim() : "";
                            name = (typeof user.name === "string" && user.name) || name;
                            institution =
                                (typeof user.institution === "string" && user.institution) ||
                                (typeof user.university === "string" && user.university) ||
                                institution;
                            city = (typeof user.city === "string" && user.city) || city;
                            email = emailFromApi || email;
                            if (typeof apiDept === "string" && apiDept.trim()) department = apiDept.trim();
                            if (typeof apiDesig === "string" && apiDesig.trim()) designation = apiDesig.trim();
                        }
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

                if (!isFacultyProfileComplete(mergedForGate)) {
                    router.replace("/dashboard/faculty/profile");
                    return;
                }

                setFacultyDetails({
                    name,
                    institution,
                    city,
                    contact,
                    email,
                });
                setFormData((p) => ({
                    ...p,
                    academicLead: {
                        ...p.academicLead,
                        officialEmail: email || p.academicLead.officialEmail,
                        department: department || p.academicLead.department,
                        designation: designation || p.academicLead.designation,
                    },
                }));
            } catch (error) {
                console.error("Failed to fetch faculty profile", error);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [router]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const p = new URLSearchParams(window.location.search);
        const e = p.get("edit")?.trim();
        if (e) {
            setEditingOpportunityId(e);
            return;
        }
        try {
            const raw = localStorage.getItem(FACULTY_OPPORTUNITY_DRAFT_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as { formData?: typeof formData; savedAt?: number };
            if (!parsed?.formData) return;
            const savedAt = parsed.savedAt ? new Date(parsed.savedAt).toLocaleString() : "earlier";
            if (window.confirm(`Resume the opportunity draft you saved on this device (${savedAt})?`)) {
                setFormData(parsed.formData);
            } else {
                localStorage.removeItem(FACULTY_OPPORTUNITY_DRAFT_KEY);
            }
        } catch (err) {
            console.error("Failed to restore local draft", err);
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
                        const u = JSON.parse(raw) as { id?: string };
                        myId = u.id ?? null;
                    }
                } catch {
                    /* ignore */
                }
                if (myId && typeof d.creatorId === "string" && d.creatorId !== myId) {
                    toast.error("You can only edit opportunities you created");
                    setEditingOpportunityId(null);
                    return;
                }
                const { facultyDetailsPatch, formDataPatch } = mapOpportunityDetailToFacultyForm(d);
                if (cancelled) return;
                setFacultyDetails((prev) => ({
                    ...prev,
                    ...facultyDetailsPatch,
                    contact: prev.contact,
                    email: prev.email,
                }));
                setFormData((prev) => ({
                    ...prev,
                    ...(formDataPatch as typeof prev),
                    location: { ...prev.location, ...(formDataPatch.location as typeof prev.location) },
                    dates: { ...prev.dates, ...(formDataPatch.dates as typeof prev.dates) },
                    capacity: { ...prev.capacity, ...(formDataPatch.capacity as typeof prev.capacity) },
                    objectives: { ...prev.objectives, ...(formDataPatch.objectives as typeof prev.objectives) },
                    activity: { ...prev.activity, ...(formDataPatch.activity as typeof prev.activity) },
                    academicLead: { ...prev.academicLead, ...(formDataPatch.academicLead as typeof prev.academicLead) },
                    partnerCollaboration: {
                        ...prev.partnerCollaboration,
                        ...(formDataPatch.partnerCollaboration as typeof prev.partnerCollaboration),
                    },
                    safetyDeclarations: {
                        ...prev.safetyDeclarations,
                        ...(formDataPatch.safetyDeclarations as typeof prev.safetyDeclarations),
                    },
                    extraSafety: {
                        ...prev.extraSafety,
                        ...(formDataPatch.extraSafety as typeof prev.extraSafety),
                    },
                    participationScope: {
                        ...prev.participationScope,
                        ...(formDataPatch.participationScope as typeof prev.participationScope),
                    },
                    academicLinkage: {
                        ...prev.academicLinkage,
                        ...(formDataPatch.academicLinkage as typeof prev.academicLinkage),
                    },
                    finalConfirmations: {
                        ...prev.finalConfirmations,
                        ...(formDataPatch.finalConfirmations as typeof prev.finalConfirmations),
                    },
                }));
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

    const previewType = formData.opportunityType[0] || "";
    const previewEmoji = ACTIVITY_TYPE_EMOJI[previewType] || "✨";
    const previewBits = [
        formData.mode || "",
        formData.capacity.hours.trim() ? `${formData.capacity.hours}h per student` : "",
        formData.capacity.volunteers.trim() ? `${formData.capacity.volunteers} students` : "",
        formData.objectives.beneficiariesCount.trim() ? `~${formData.objectives.beneficiariesCount} beneficiaries` : "",
        facultyDetails.name.trim() ? `led by ${facultyDetails.name}` : "",
    ].filter(Boolean);
    const previewPrimarySdg = formData.sdg ? findSdgById(formData.sdg) : null;
    const previewSecondarySdg = formData.secondarySdgs[0] ? findSdgById(formData.secondarySdgs[0].sdgId) : null;
    const timelineStartWeekdayLabel = weekdayLabelFromDateInput(formData.dates.start);
    const timelineEndWeekdayLabel = weekdayLabelFromDateInput(formData.dates.end);

    const flashcardModel = useMemo(() => {
        const scopeMap: Record<FacultyApplyScope, string> = {
            all: "All Universities · All Departments",
            multi_all: "Selected Universities · All Departments",
            multi_depts: "Selected Universities · Selected Departments",
            one_all: "One University · All Departments",
            one_depts: "One University · Selected Departments",
            own_uni_all: "My University · All Departments",
            own_dept: "My Department / Programme Only",
        };
        const selectedUnis = formData.participationScope.selectedUniversities.map((u) => u.trim()).filter(Boolean).join(", ");
        const selectedDepts = formData.participationScope.departments.map((d) => d.trim()).filter(Boolean).join(", ");
        let scopeDetail = "CIEL PK network";
        if (formData.applyScope === "multi_all") scopeDetail = selectedUnis || "Selected universities";
        else if (formData.applyScope === "multi_depts") scopeDetail = `${selectedUnis} · ${selectedDepts}`;
        else if (formData.applyScope === "one_all") scopeDetail = selectedUnis || "One university";
        else if (formData.applyScope === "one_depts") scopeDetail = `${selectedUnis} · ${selectedDepts}`;
        else if (formData.applyScope === "own_uni_all") scopeDetail = facultyDetails.institution || "Your university";
        else if (formData.applyScope === "own_dept") {
            scopeDetail = `${facultyDetails.institution || "Your university"} · ${formData.academicLead.department || selectedDepts || "Your department"}`;
        }
        const elig = resolveFacultyFlashEligibility({
            viewer: flashViewer,
            applyScope: formData.applyScope,
            creatorUniversity: facultyDetails.institution,
        });
        const types = formData.opportunityType;
        const skills = [
            ...formData.activity.skills,
            ...(formData.activity.isOtherSkillChecked ? formData.activity.otherSkills.map((s) => s.trim()).filter(Boolean) : []),
        ].join(", ");
        const bens = [
            ...formData.objectives.beneficiariesType,
            ...(formData.objectives.isOtherBeneficiaryChecked ? formData.objectives.otherBeneficiarySpecs.map((s) => s.trim()).filter(Boolean) : []),
        ].join(", ");
        const partnerOn = formData.partnerCollaboration.hasPartner;
        return {
            title: formData.title,
            hook: formData.hook,
            summary: formData.objectives.description,
            activityType: types[0] || "Community Service",
            mode: formData.mode,
            city: formData.location.city,
            hours: formData.capacity.hours,
            seats: formData.capacity.volunteers,
            start: formData.dates.start,
            end: formData.dates.end,
            deadline: formData.applicationDeadline,
            beneficiariesCount: formData.objectives.beneficiariesCount || "—",
            beneficiaryType: bens || "Community",
            responsibilities: formData.activity.responsibilities,
            scheduleNotes: formData.scheduleNotes,
            skills,
            resources: formData.activity.resources,
            prerequisites: formData.activity.prerequisites,
            sdg: formData.sdg,
            objective: formData.objectives.description,
            outputs: formData.objectives.outputs,
            creatorName: facultyDetails.name,
            orgLabel: facultyDetails.institution || "—",
            unitLabel: formData.academicLead.department || "—",
            badgeLabel: "FACULTY CREATOR",
            privateCandidate: false,
            facultyName: facultyDetails.name,
            facultyEmail: formData.academicLead.officialEmail || facultyDetails.email,
            host: partnerOn ? formData.partnerCollaboration.orgName : "No external partner",
            partnerEmail: partnerOn ? formData.partnerCollaboration.email : "",
            verification: formData.verification.join(", "),
            scopeLabel: scopeMap[formData.applyScope] || formData.applyScope,
            scopeDetail,
            approvalText: partnerOn
                ? "Pending partner acknowledgement → CIEL PK final review"
                : "Pending CIEL PK final review",
            eligible: elig.eligible,
            eligibilityWhy: elig.why,
        };
    }, [formData, facultyDetails, flashViewer]);

    return (
        <div className="co-form">
            <div className="mb-3.5 flex items-center gap-3">
                <div>
                    <p className="text-[10px] text-[#7a919a]">
                        Community Service → <b className="text-[#0e7d74]">Create an Opportunity</b>
                    </p>
                </div>
                <Link
                    href="/dashboard/faculty/community-service"
                    className="ml-auto rounded-full border border-[#dcebee] bg-white px-4 py-2 text-[10.5px] font-extrabold text-[#0e7d74]"
                >
                    ← Back
                </Link>
            </div>

            <div className="co-hero">
                <div className="co-hero-copy">
                    <p className="co-hero-eyebrow">
                        {editingOpportunityId ? "EDIT FACULTY OPPORTUNITY · SDG-ALIGNED" : "CIEL PK · FACULTY COMMUNITY SERVICE"}
                    </p>
                    <h1>
                        {editingOpportunityId ? "Update your listing" : "Create an opportunity — you are the academic owner."}
                    </h1>
                    <p>
                        {editingOpportunityId
                            ? "Update your posting. Some fields may be restricted after approval."
                            : "You are auto-linked as the faculty owner. Partner acknowledgement is optional. CIEL PK completes final review before the opportunity is published."}
                    </p>
                    <div className="co-hero-chips">
                        <span className="co-hero-chip">🧭 Guided 9-step form</span>
                        <span className="co-hero-chip">🃏 Final flashcard</span>
                        <span className="co-hero-chip">🎯 Role-aware Apply Now</span>
                        <span className="co-hero-chip">🔒 Private contacts protected</span>
                    </div>
                    {isLoadingEdit ? (
                        <p className="mt-2 flex items-center gap-2 text-sm text-[#70808a]">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading opportunity…
                        </p>
                    ) : null}
                </div>
                <div
                    className="co-progress-ring"
                    style={{
                        background: `conic-gradient(#15988b ${Math.max(0, Math.min(100, Math.round((activeStepIndex / (WIZARD_STEPS.length - 1)) * 100)))}%, #e8edef 0)`,
                    }}
                >
                    <strong>{Math.max(0, Math.min(100, Math.round((activeStepIndex / (WIZARD_STEPS.length - 1)) * 100)))}%</strong>
                    <span>COMPLETE</span>
                </div>
            </div>

            <div className="co-wizard-layout">
                <aside className="co-wizard-side">
                    <div className="co-side-card">
                        <h3>Opportunity Builder</h3>
                        <div className="co-step-list">
                            {WIZARD_STEPS.map((step, idx) => (
                                <button
                                    key={step.key}
                                    type="button"
                                    className={`co-step-btn${activeStep === step.key ? " active" : ""}${idx < activeStepIndex ? " done" : ""}`}
                                    onClick={() => goToStep(step.key)}
                                >
                                    <span className="co-step-ico">{step.icon}</span>
                                    <span className="co-step-copy">
                                        <b>{step.label}</b>
                                        <span>{step.sub}</span>
                                    </span>
                                    <span className="co-step-num">{idx < activeStepIndex ? "✓" : idx + 1}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="co-fun-tip">
                        <b>Design rule</b>
                        <p>The card can be publicly discoverable while Apply Now stays limited to the universities or departments you select.</p>
                    </div>
                    <div className="co-side-card">
                        <h3>Approval path</h3>
                        <p>
                            Faculty (auto-linked academic owner) → Partner/host acknowledgement if named → CIEL PK final review → Published opportunity
                        </p>
                    </div>
                </aside>

                <div className="co-wizard-main">

            {/* SECTION A: FACULTY DETAILS */}
            {activeStep === "A" && (
            <div className="co-card">
                <CoSectionHead letter="A" title="Faculty details" tag="✅ FROM YOUR PROFILE — NOTHING TO TYPE" tagAuto color="#0d2b33" />
                {isLoadingProfile ? (
                    <div className="py-4 text-center text-[#7a919a]">
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading details...
                    </div>
                ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                        <span className="co-locked">🧑‍🏫 <b>{facultyDetails.name || "—"}</b><span className="co-lock-badge">🔒</span></span>
                        <span className="co-locked">🏛️ {facultyDetails.institution || "—"}<span className="co-lock-badge">🔒</span></span>
                        {facultyDetails.city ? <span className="co-locked">📍 {facultyDetails.city}</span> : null}
                        {facultyDetails.email ? <span className="co-locked">📧 {facultyDetails.email}</span> : null}
                        <span className="co-locked pointer-events-none">
                            📱
                            <PhoneConnectivityRow
                                phoneCountryKey={displayFacultyContact.phoneCountryKey}
                                nationalDigits={displayFacultyContact.national}
                                readOnly
                                placeholderNational="—"
                                selectClassName="rounded-lg border border-transparent bg-transparent py-0 text-xs font-medium text-[#0d2b33]"
                                inputClassName="rounded-lg border-transparent bg-transparent py-0 text-sm font-medium text-[#0d2b33]"
                            />
                        </span>
                    </div>
                )}
            </div>
            )}

            {/* SECTION B: OPPORTUNITY OVERVIEW */}
            {activeStep === "B" && (
            <div className="co-card co-accent" style={{ borderTopColor: "#0891b2" }}>
                <CoSectionHead
                    letter="B"
                    title="Project overview"
                    tag="THE BASICS"
                    color="#0891b2"
                    expanded={expandedSections.includes("B")}
                    onToggle={() => toggleSection("B")}
                />

                <div className={`${!expandedSections.includes("B") ? "hidden" : ""}`}>
                    {/* B1. Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">B1. Opportunity Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                            placeholder="e.g. Digital Literacy Training for Orphanage Students"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><Info className="w-3 h-3" /> Give a clear, simple title that describes the activity.</p>
                    </div>
                    <div>
                        <label className="co-label">One-line student hook *</label>
                        <input
                            type="text"
                            maxLength={180}
                            placeholder="Why would a student want to join?"
                            value={formData.hook}
                            onChange={(e) => setFormData({ ...formData, hook: e.target.value })}
                        />
                    </div>

                    {/* B2. Type */}
                    <div>
                        <label className="co-label">B2 · Activity type · tap one or more</label>
                        <div className="co-chips">
                            {["Community Service", "Volunteer Activity", "Awareness Campaign", "Training / Teaching", "Research / Survey Support", "Technical / Professional Support", "Environmental Action", "Corporate CSR Activity"].map((type) => (
                                <CoChip key={type} selected={formData.opportunityType.includes(type)} onClick={() => toggleType(type)}>
                                    {ACTIVITY_TYPE_EMOJI[type] || ""} {type}
                                </CoChip>
                            ))}
                            <CoChip
                                selected={formData.isOtherTypeChecked}
                                onClick={() =>
                                    setFormData({
                                        ...formData,
                                        isOtherTypeChecked: !formData.isOtherTypeChecked,
                                        ...(!formData.isOtherTypeChecked ? {} : { otherTypeSpecs: [""] }),
                                    })
                                }
                            >
                                ✏️ Other
                            </CoChip>
                        </div>
                            {formData.isOtherTypeChecked && (
                                <div className="mt-4 space-y-3 pl-4 border-l-2 border-blue-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Add one or more other types</p>
                                    {formData.otherTypeSpecs.map((spec, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Please specify other type…"
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm transition-all"
                                                    value={spec}
                                                    onChange={(e) => {
                                                        const next = [...formData.otherTypeSpecs];
                                                        next[idx] = e.target.value;
                                                        setFormData({ ...formData, otherTypeSpecs: next });
                                                    }}
                                                />
                                                {formData.otherTypeSpecs.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = formData.otherTypeSpecs.filter((_, i) => i !== idx);
                                                            setFormData({ ...formData, otherTypeSpecs: next.length ? next : [""] });
                                                        }}
                                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 transition-colors"
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
                                            setFormData({ ...formData, otherTypeSpecs: [...formData.otherTypeSpecs, ""] })
                                        }
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-2 py-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add another
                                    </button>
                                </div>
                            )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* B3. Mode */}
                        <div>
                            <label className="co-label">B3 · Mode of engagement</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["On site", "Remote", "Hybrid"] as const).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        className={`co-choice${formData.mode === m ? " on" : ""}`}
                                        onClick={() => setFormData({ ...formData, mode: m })}
                                    >
                                        <span className="text-lg">{MODE_EMOJI[m]}</span>
                                        <b className="mt-1 block text-[11px]">{m}</b>
                                        <span className="mt-0.5 block text-[9px] text-[#7a919a]">
                                            {m === "On site" && "Fieldwork, training, camps"}
                                            {m === "Remote" && "Data analysis, content, research"}
                                            {m === "Hybrid" && "Planning online + field execution"}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* B4. Location */}
                        {(formData.mode === 'On site' || formData.mode === 'Hybrid') && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <label className="block text-sm font-bold text-slate-900 mb-3">B4. Location Details <span className="text-red-500">*</span></label>
                                <div className="space-y-3">
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

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Pin Exact Location</label>
                                        <div className="rounded-xl overflow-hidden border border-slate-200">
                                            <LocationPicker
                                                onLocationSelect={(loc) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        location: {
                                                            ...prev.location,
                                                            venue: loc.address || "",
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
                                                placeholder="Venue Name / Address (Auto-filled from map)"
                                                className="w-full pl-6 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm"
                                                value={formData.location.venue}
                                                onChange={(e) => setFormData({ ...formData, location: { ...formData.location, venue: e.target.value } })}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-400">Click on the map to pin the exact location.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )}

            {activeStep === "SCHED" && (
            <div className="co-card co-accent" style={{ borderTopColor: "#b88313" }}>
                <CoSectionHead
                    letter="3"
                    title="Dates, capacity & service commitment"
                    tag="COMMITMENT"
                    color="#b88313"
                    expanded
                />
                <div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                            <label className="co-label" style={{ marginTop: 0 }}>Application deadline *</label>
                            <input
                                type="date"
                                value={formData.applicationDeadline}
                                onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="co-label" style={{ marginTop: 0 }}>Start date *</label>
                            <input
                                type="date"
                                value={formData.dates.start}
                                onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, start: e.target.value } })}
                            />
                            {timelineStartWeekdayLabel ? <p className="mt-1 text-xs text-slate-500">{timelineStartWeekdayLabel}</p> : null}
                        </div>
                        <div>
                            <label className="co-label" style={{ marginTop: 0 }}>End date *</label>
                            <input
                                type="date"
                                value={formData.dates.end}
                                onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, end: e.target.value } })}
                            />
                            {timelineEndWeekdayLabel ? <p className="mt-1 text-xs text-slate-500">{timelineEndWeekdayLabel}</p> : null}
                        </div>
                    </div>
                    <div className="pt-2">
                        <label className="co-label">Duration type</label>
                        <div className="co-chips mb-3">
                            {(["Fixed dates", "Flexible", "Ongoing"] as const).map((t) => (
                                <CoChip key={t} selected={formData.timelineType === t} onClick={() => setFormData({ ...formData, timelineType: t })}>
                                    {TIMELINE_EMOJI[t]} {t}
                                </CoChip>
                            ))}
                        </div>
                        {(TIMELINES_WITH_SCHEDULE_UI as readonly string[]).includes(formData.timelineType) && (
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
                        )}
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="co-label" style={{ marginTop: 0 }}>Required hours / student *</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={500}
                                    placeholder="e.g. 16"
                                    value={formData.capacity.hours}
                                    onChange={(e) => setFormData({ ...formData, capacity: { ...formData.capacity, hours: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="co-label" style={{ marginTop: 0 }}>Available seats * · 1–5000</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={5000}
                                    placeholder="e.g. 20"
                                    value={formData.capacity.volunteers}
                                    onChange={(e) => setFormData({ ...formData, capacity: { ...formData.capacity, volunteers: e.target.value } })}
                                />
                            </div>
                        </div>
                        <div className="mt-3">
                            <label className="co-label" style={{ marginTop: 0 }}>Schedule / attendance notes</label>
                            <textarea
                                spellCheck={true}
                                placeholder="e.g. Saturdays 10am–2pm; four sessions"
                                value={formData.scheduleNotes}
                                onChange={(e) => setFormData({ ...formData, scheduleNotes: e.target.value })}
                            />
                        </div>
                        <div className="co-note aqua mt-3">
                            <span><b>Checks:</b> deadline must be on/before start date; end date cannot be before start date; hours 1–500; seats 1–5000.</span>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {activeStep === "C" && (
            <div className="co-card co-accent" style={{ borderTopColor: "#6d28d9" }}>
                <CoSectionHead
                    letter="C"
                    title="SDG & impact"
                    tag="IMPACT"
                    color="#6d28d9"
                    expanded
                />

                <div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 text-sm text-amber-800 mb-6">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <strong>Important:</strong> The SDG, Target, and Indicator selected here will be
                            <span className="font-bold underline ml-1">locked</span> and automatically linked to student application forms and reports.
                            Please select carefully.
                        </div>
                    </div>

                    {/* C1. Primary SDG */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">C1. Select PRIMARY SDG <span className="text-red-500">*</span></label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-medium"
                            value={formData.sdg}
                            onChange={(e) => setFormData({ ...formData, sdg: e.target.value, target: "", indicator: "" })}
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
                        <label className="block text-sm font-bold text-slate-900 mb-2">C2. Select SDG Target <span className="font-medium normal-case tracking-normal text-[#7a919a]">optional</span></label>
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
                        <label className="block text-sm font-bold text-slate-900 mb-2">C3. SDG Indicator (Strongly Recommended)</label>
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
                        <p className="text-xs text-slate-500 mt-2">Selecting an indicator improves UN, QS, and government reporting quality.</p>
                    </div>

                    {/* Examples Helper */}
                    <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 text-slate-600">
                        <div className="font-bold text-slate-800 uppercase mb-1">🧭 Quick Examples</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <span className="font-bold">Training / Teaching</span> <br />
                                SDG 4 → Target 4.4 → Indicator 4.4.1
                            </div>
                            <div>
                                <span className="font-bold">Environmental Action</span> <br />
                                SDG 13 → Target 13.3 → Indicator 13.3.1
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="co-label">Why is this SDG genuinely relevant? *</label>
                        <textarea
                            spellCheck={true}
                            placeholder="Explain the actual connection instead of selecting an SDG only because it sounds related."
                            value={formData.sdgWhy}
                            onChange={(e) => setFormData({ ...formData, sdgWhy: e.target.value })}
                        />
                    </div>

                    {/* C4. Secondary SDGs */}
                    <div className="pt-6 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-900 mb-2">C4. Secondary SDGs (Optional)</label>
                        <p className="text-xs text-slate-500 mb-4">Select other SDGs this project contributes to and provide a brief justification.</p>

                        <div className="space-y-4">
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-medium text-sm"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && !formData.secondarySdgs.find(s => s.sdgId === val)) {
                                        setFormData({
                                            ...formData,
                                            secondarySdgs: [...formData.secondarySdgs, { sdgId: val, targetId: "", indicatorId: "", justification: "" }]
                                        });
                                    }
                                    e.target.value = "";
                                }}
                            >
                                <option value="">Add a Secondary SDG...</option>
                                {opportunityFormSdgList
                                    .filter(sdg => sdg.id !== formData.sdg && !formData.secondarySdgs.find(s => s.sdgId === sdg.id))
                                    .map((sdg) => (
                                        <option key={sdg.id} value={sdg.id}>
                                            SDG {sdg.number} — {sdg.title}
                                        </option>
                                    ))}
                            </select>

                            <div className="grid grid-cols-1 gap-4">
                                {formData.secondarySdgs.map((item, index) => {
                                    const sdg = findSdgById(item.sdgId);
                                    const availableTargets = sdg?.targets || [];
                                    const availableIndicators = availableTargets.find(t => t.id === item.targetId)?.indicators || [];

                                    return (
                                        <div key={item.sdgId} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col gap-4 relative animate-in fade-in slide-in-from-top-2">
                                            <button
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    secondarySdgs: formData.secondarySdgs.filter(s => s.sdgId !== item.sdgId)
                                                })}
                                                className="absolute top-2 right-2 p-2 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>

                                            {/* SDG Header */}
                                            <div className="flex items-center gap-3 pb-2 border-b border-slate-200/60">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-purple-600 shadow-sm">
                                                    {sdg?.number}
                                                </div>
                                                <div>
                                                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Secondary SDG {sdg?.number}</span>
                                                    <p className="text-xs text-slate-500">{sdg?.title}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Target Dropdown */}
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">
                                                        Select Target <span className="font-normal normal-case text-slate-400">(optional)</span>
                                                    </label>
                                                    <select
                                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none text-xs font-bold bg-white"
                                                        value={item.targetId}
                                                        onChange={(e) => {
                                                            const newSecondary = [...formData.secondarySdgs];
                                                            newSecondary[index].targetId = e.target.value;
                                                            newSecondary[index].indicatorId = ""; // Reset indicator
                                                            setFormData({ ...formData, secondarySdgs: newSecondary });
                                                        }}
                                                    >
                                                        <option value="">Choose Target...</option>
                                                        {availableTargets.map(t => (
                                                            <option key={t.id} value={t.id}>Target {t.id} — {t.description.substring(0, 60)}...</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Indicator Dropdown */}
                                                <div className={!item.targetId ? "opacity-50 pointer-events-none" : ""}>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">
                                                        Select Indicator <span className="font-normal normal-case text-slate-400">(optional)</span>
                                                    </label>
                                                    <select
                                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none text-xs font-bold bg-white"
                                                        value={item.indicatorId}
                                                        onChange={(e) => {
                                                            const newSecondary = [...formData.secondarySdgs];
                                                            newSecondary[index].indicatorId = e.target.value;
                                                            setFormData({ ...formData, secondarySdgs: newSecondary });
                                                        }}
                                                    >
                                                        <option value="">Choose Indicator...</option>
                                                        {availableIndicators.map(i => (
                                                            <option key={i.id} value={i.id}>Indicator {i.id} — {i.description.substring(0, 60)}...</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}
            {activeStep === "C" && (
            <div className="co-card co-accent" style={{ borderTopColor: "#0e7d74" }}>
                <CoSectionHead
                    letter="D"
                    title="SDG-aligned objectives"
                    tag="LOCAL ACTION"
                    color="#0e7d74"
                    expanded
                />

                <div>
                    {/* D1. Project Objective */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">D1. Project Objective <span className="text-red-500">*</span></label>
                        <textarea spellCheck={true}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none font-medium h-32"
                            placeholder="In simple language, describe what this activity aims to achieve..."
                            value={formData.objectives.description}
                            onChange={(e) => setFormData({ ...formData, objectives: { ...formData.objectives, description: e.target.value } })}
                        ></textarea>
                        <p className="text-xs text-slate-500 mt-2">Do not use phrases like "achieve SDG" or "solve poverty". Focus on local impact.</p>
                    </div>
                    <div>
                        <label className="co-label">Expected outputs *</label>
                        <textarea
                            spellCheck={true}
                            placeholder="What will be produced or delivered?"
                            value={formData.objectives.outputs}
                            onChange={(e) => setFormData({ ...formData, objectives: { ...formData.objectives, outputs: e.target.value } })}
                        />
                    </div>
                    <div>
                        <label className="co-label">Expected outcome / success measure</label>
                        <textarea
                            spellCheck={true}
                            placeholder="How will you know this worked?"
                            value={formData.objectives.outcome}
                            onChange={(e) => setFormData({ ...formData, objectives: { ...formData.objectives, outcome: e.target.value } })}
                        />
                    </div>

                    {/* D2. Local Targets */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <label className="block text-sm font-bold text-slate-900 mb-4">D2. Local Project Targets (Numbers)</label>
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
                                <label className="co-label">Type of beneficiaries</label>
                                <div className="co-chips">
                                    {["Children", "Youth", "Women", "Elderly", "Persons with disabilities", "Students", "Community members"].map((b) => (
                                        <CoChip
                                            key={b}
                                            selected={formData.objectives.beneficiariesType.includes(b)}
                                            onClick={() => {
                                                const types = formData.objectives.beneficiariesType.includes(b)
                                                    ? formData.objectives.beneficiariesType.filter((t) => t !== b)
                                                    : [...formData.objectives.beneficiariesType, b];
                                                setFormData({ ...formData, objectives: { ...formData.objectives, beneficiariesType: types } });
                                            }}
                                        >
                                            {BENEFICIARY_EMOJI[b] || ""} {b}
                                        </CoChip>
                                    ))}
                                </div>
                                    {formData.objectives.beneficiariesType.some(t => !["Children", "Youth", "Women", "Elderly", "Persons with disabilities", "Students", "Community members"].includes(t)) && (
                                        <div className="pl-6 animate-in fade-in slide-in-from-top-2">
                                            <input
                                                type="text"
                                                placeholder="Please specify"
                                                className="w-full px-3 py-1.5 rounded border border-teal-200 focus:border-teal-500 outline-none text-xs"
                                                value={formData.objectives.beneficiariesType.find(t => !["Children", "Youth", "Women", "Elderly", "Persons with disabilities", "Students", "Community members"].includes(t)) !== "Other" ? formData.objectives.beneficiariesType.find(t => !["Children", "Youth", "Women", "Elderly", "Persons with disabilities", "Students", "Community members"].includes(t)) || "" : ""}
                                                onChange={(e) => {
                                                    const predefined = ["Children", "Youth", "Women", "Elderly", "Persons with disabilities", "Students", "Community members"];
                                                    const cleanTypes = formData.objectives.beneficiariesType.filter(t => predefined.includes(t));
                                                    if (e.target.value.trim() !== "") {
                                                        cleanTypes.push(e.target.value);
                                                    } else {
                                                        cleanTypes.push("Other");
                                                    }
                                                    setFormData({
                                                        ...formData,
                                                        objectives: { ...formData.objectives, beneficiariesType: cleanTypes }
                                                    });
                                                }}
                                            />
                                        </div>
                                    )}
                                <div className="mt-3">
                                    <label className={`flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-all ${formData.objectives.isOtherBeneficiaryChecked ? 'bg-teal-50 border-teal-200' : 'border-slate-100'}`}>
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
                                        <span className={`text-sm font-medium ${formData.objectives.isOtherBeneficiaryChecked ? 'text-teal-700' : 'text-slate-600'}`}>Other</span>
                                    </label>
                                    {formData.objectives.isOtherBeneficiaryChecked && (
                                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-teal-100">
                                            <p className="text-xs font-bold text-slate-500 uppercase">Add one or more other beneficiary types</p>
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
                                                                    objectives: { ...formData.objectives, otherBeneficiarySpecs: next },
                                                                });
                                                            }}
                                                        />
                                                        {formData.objectives.otherBeneficiarySpecs.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const next = formData.objectives.otherBeneficiarySpecs.filter(
                                                                        (_, i) => i !== idx
                                                                    );
                                                                    setFormData({
                                                                        ...formData,
                                                                        objectives: {
                                                                            ...formData.objectives,
                                                                            otherBeneficiarySpecs: next.length ? next : [""],
                                                                        },
                                                                    });
                                                                }}
                                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 transition-colors"
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
                                                            otherBeneficiarySpecs: [...formData.objectives.otherBeneficiarySpecs, ""],
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
            )}

            {activeStep === "E" && (
            <div className="co-card co-accent" style={{ borderTopColor: "#6d28d9" }}>
                <CoSectionHead
                    letter="E"
                    title="Student experience"
                    tag="WHAT STUDENTS DO"
                    color="#6d28d9"
                    expanded
                />

                <div>
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">E1. Student Responsibilities (Bullet List) <span className="text-red-500">*</span></label>
                        <textarea spellCheck={true}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium h-32"
                            placeholder="• Conduct survey..."
                            value={formData.activity.responsibilities}
                            onChange={(e) => setFormData({ ...formData, activity: { ...formData.activity, responsibilities: e.target.value } })}
                        ></textarea>
                    </div>
                    <div>
                        <label className="co-label">E2 · Skills gained · tap what applies</label>
                        <div className="co-chips">
                            {["Leadership", "Communication", "Teaching", "Teamwork", "Digital Skills", "Research", "Problem Solving"].map((s) => (
                                <CoChip
                                    key={s}
                                    selected={formData.activity.skills.includes(s)}
                                    onClick={() => {
                                        const skills = formData.activity.skills.includes(s)
                                            ? formData.activity.skills.filter((i) => i !== s)
                                            : [...formData.activity.skills, s];
                                        setFormData({ ...formData, activity: { ...formData.activity, skills } });
                                    }}
                                >
                                    {SKILL_EMOJI[s] || ""} {s}
                                </CoChip>
                            ))}
                        </div>
                        <div className="mt-3">
                            <label className="flex items-center gap-2 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer w-full md:w-1/3 mb-2">
                                <input
                                    type="checkbox"
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                    checked={formData.activity.isOtherSkillChecked}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            activity: {
                                                ...formData.activity,
                                                isOtherSkillChecked: e.target.checked,
                                                ...(e.target.checked ? {} : { otherSkills: [""] }),
                                            },
                                        })
                                    }
                                />
                                <span className="text-sm font-medium text-slate-700">Other</span>
                            </label>
                            {formData.activity.isOtherSkillChecked && (
                                <div className="mt-3 space-y-3 pl-4 border-l-2 border-indigo-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Add one or more other skills</p>
                                    {formData.activity.otherSkills.map((spec, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Specify skill…"
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm transition-all"
                                                    value={spec}
                                                    onChange={(e) => {
                                                        const next = [...formData.activity.otherSkills];
                                                        next[idx] = e.target.value;
                                                        setFormData({
                                                            ...formData,
                                                            activity: { ...formData.activity, otherSkills: next },
                                                        });
                                                    }}
                                                />
                                                {formData.activity.otherSkills.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = formData.activity.otherSkills.filter((_, i) => i !== idx);
                                                            setFormData({
                                                                ...formData,
                                                                activity: {
                                                                    ...formData.activity,
                                                                    otherSkills: next.length ? next : [""],
                                                                },
                                                            });
                                                        }}
                                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 transition-colors"
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
                                                activity: {
                                                    ...formData.activity,
                                                    otherSkills: [...formData.activity.otherSkills, ""],
                                                },
                                            })
                                        }
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-2 py-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add another
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                            <label className="co-label">Prerequisites / eligibility notes</label>
                            <textarea
                                spellCheck={true}
                                placeholder="Any skills, year, or language needed?"
                                value={formData.activity.prerequisites}
                                onChange={(e) => setFormData({ ...formData, activity: { ...formData.activity, prerequisites: e.target.value } })}
                            />
                        </div>
                        <div>
                            <label className="co-label">Resources / support provided</label>
                            <textarea
                                spellCheck={true}
                                placeholder="Orientation, transport, materials…"
                                value={formData.activity.resources}
                                onChange={(e) => setFormData({ ...formData, activity: { ...formData.activity, resources: e.target.value } })}
                            />
                        </div>
                    </div>
                </div>
            </div>
            )}

            {activeStep === "F" && (
            <div className="co-card co-accent" style={{ borderTopColor: "#18755f" }}>
                <CoSectionHead
                    letter="F"
                    title="Verification & collaboration"
                    tag="AUTO-LINKED"
                    color="#18755f"
                    expanded
                />
                <div className="space-y-8 p-5 sm:p-8">
                    <div className="mb-1 flex items-center gap-3 rounded-2xl border border-[#c9e5da] bg-[linear-gradient(135deg,#f0faf6,#fff)] p-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#15988b] text-lg">👩‍🏫</div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[8px] font-black tracking-[0.12em] text-[#15988b]">ACADEMIC OWNER</div>
                            <b className="block text-[12px]">{facultyDetails.name || "—"}</b>
                            <p className="m-0 text-[10px] text-[#7a919a]">
                                {facultyDetails.institution || "Your university"}{formData.academicLead.department ? ` · ${formData.academicLead.department}` : ""}. You are automatically the faculty owner/reviewer.
                            </p>
                        </div>
                        <span className="rounded-full bg-[#15988b] px-2.5 py-1 text-[8px] font-black text-white">AUTO-LINKED</span>
                    </div>
                    <p className="text-sm text-slate-600">
                        Academic validity, supervision, and optional external collaboration. The opportunity is treated as institutionally verified from your official credentials as Academic Lead.
                    </p>

                    {/* F1 */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-orange-700 uppercase tracking-wide">F1. Faculty verification (mandatory)</h3>
                        <p className="text-xs text-slate-500">
                            You act as the Academic Lead and responsible authority. Fields below mirror your profile where noted; update Section A via My Profile if needed.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Faculty name</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={facultyDetails.name}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Designation <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. Assistant Professor"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.academicLead.designation}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            academicLead: { ...formData.academicLead, designation: e.target.value },
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. Computer Science"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.academicLead.department}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            academicLead: { ...formData.academicLead, department: e.target.value },
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">University / institution</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={facultyDetails.institution}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Official email address <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    placeholder="name@university.edu.pk"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.academicLead.officialEmail}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            academicLead: { ...formData.academicLead, officialEmail: e.target.value },
                                        })
                                    }
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp number (optional)</label>
                                <PhoneConnectivityRow
                                    phoneCountryKey={formData.academicLead.whatsappCountryKey}
                                    nationalDigits={formData.academicLead.whatsappNational}
                                    placeholderNational="3001234567"
                                    selectClassName="rounded-xl border-slate-200 focus:border-orange-500 py-3"
                                    inputClassName="rounded-xl border-slate-200 focus:border-orange-500 py-3"
                                    onPhoneCountryKeyChange={(key) =>
                                        setFormData({
                                            ...formData,
                                            academicLead: { ...formData.academicLead, whatsappCountryKey: key },
                                        })
                                    }
                                    onNationalDigitsChange={(digits) =>
                                        setFormData({
                                            ...formData,
                                            academicLead: { ...formData.academicLead, whatsappNational: digits },
                                        })
                                    }
                                />
                                <p className="mt-1 text-[11px] text-slate-400">Shown to students on the opportunity so they can message you directly. Leave blank to skip.</p>
                            </div>
                        </div>
                    </div>

                    {/* F2 */}
                    <div className="space-y-4 border-t border-slate-100 pt-8">
                        <h3 className="text-sm font-black text-orange-700 uppercase tracking-wide">F2. Partner organization (optional)</h3>
                        <p className="text-xs text-slate-500">Only if the activity is conducted in collaboration with an external organization. A verification email may be sent to the organization.</p>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="faculty_ext_partner"
                                    className="text-orange-600"
                                    checked={!formData.partnerCollaboration.hasPartner}
                                    onChange={() =>
                                        setFormData({
                                            ...formData,
                                            partnerCollaboration: {
                                                hasPartner: false,
                                                orgName: "",
                                                contactPerson: "",
                                                email: "",
                                                designation: "",
                                                function: "",
                                            },
                                        })
                                    }
                                />
                                <span className="text-sm font-medium text-slate-800">No</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="faculty_ext_partner"
                                    className="text-orange-600"
                                    checked={formData.partnerCollaboration.hasPartner}
                                    onChange={() =>
                                        setFormData({
                                            ...formData,
                                            partnerCollaboration: { ...formData.partnerCollaboration, hasPartner: true },
                                        })
                                    }
                                />
                                <span className="text-sm font-medium text-slate-800">Yes</span>
                            </label>
                        </div>
                        {formData.partnerCollaboration.hasPartner && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                                <input
                                    type="text"
                                    placeholder="Organization name"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.partnerCollaboration.orgName}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            partnerCollaboration: { ...formData.partnerCollaboration, orgName: e.target.value },
                                        })
                                    }
                                />
                                <input
                                    type="text"
                                    placeholder="Contact person"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.partnerCollaboration.contactPerson}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            partnerCollaboration: { ...formData.partnerCollaboration, contactPerson: e.target.value },
                                        })
                                    }
                                />
                                <input
                                    type="email"
                                    placeholder="Official email"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.partnerCollaboration.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            partnerCollaboration: { ...formData.partnerCollaboration, email: e.target.value },
                                        })
                                    }
                                />
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">CIEL PK final review</h3>
                        <p className="text-sm text-slate-600">
                            After you submit, a named partner (if any) acknowledges first. CIEL PK then completes final review before the opportunity is published.
                        </p>
                    </div>

                    <div className="pt-2">
                        <label className="co-label">Participation verification</label>
                        <p className="mb-3 text-[11px] leading-relaxed text-[#7a919a]">What proof will students log as they go? Tap what applies — it becomes the checklist inside every member’s report.</p>
                        <div className="co-chips">
                            {["Attendance sheets", "Supervisor sign-off", "Photos of activities", "Assessment sheets", "Digital logs"].map((v) => (
                                <CoChip
                                    key={v}
                                    selected={formData.verification.includes(v)}
                                    onClick={() => {
                                        const vers = formData.verification.includes(v)
                                            ? formData.verification.filter((i) => i !== v)
                                            : [...formData.verification, v];
                                        setFormData({ ...formData, verification: vers });
                                    }}
                                >
                                    {VERIFICATION_EMOJI[v] || ""} {v}
                                </CoChip>
                            ))}
                        </div>
                        <div className="mt-4">
                            <label className={`flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer w-full md:w-1/3 mb-2 transition-all ${formData.isOtherVerificationChecked ? 'bg-cyan-50 border-cyan-200' : 'border-slate-100'}`}>
                                <input
                                    type="checkbox"
                                    className="rounded text-cyan-600 focus:ring-cyan-500"
                                    checked={formData.isOtherVerificationChecked}
                                    onChange={(e) => setFormData({ ...formData, isOtherVerificationChecked: e.target.checked })}
                                />
                                <span className={`text-sm font-medium ${formData.isOtherVerificationChecked ? 'text-cyan-700' : 'text-slate-600'}`}>Other</span>
                            </label>
                            {formData.isOtherVerificationChecked && (
                                <input
                                    type="text"
                                    placeholder="Please specify other verification method..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none text-sm transition-all"
                                    value={formData.otherVerification}
                                    onChange={(e) => setFormData({ ...formData, otherVerification: e.target.value })}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {activeStep === "VIS" && (
            <div className="co-card co-accent" style={{ borderTopColor: "#b24f85" }}>
                <CoSectionHead
                    letter="7"
                    title="Who can see this card — and who can Apply Now?"
                    tag="PUBLIC CARD"
                    color="#b24f85"
                    expanded
                />
                <div>
                    <div className="rounded-2xl border border-[#cfe6df] bg-[linear-gradient(135deg,#edf8f4,#fff)] p-3 text-[11px] leading-relaxed text-[#376b60]">
                        🌍 <b>Public by default:</b> approved faculty opportunities are publicly discoverable. The selection below controls who can use Apply Now.
                    </div>
                    <div className="co-policy-grid">
                        <div className="co-policy"><small>Card visibility</small><b>Public across CIEL PK</b><p>Students can discover the opportunity across institutions.</p></div>
                        <div className="co-policy"><small>Apply Now eligibility</small><b>Creator-defined</b><p>Default is all universities; targeting is optional.</p></div>
                    </div>
                    <div className="co-aud-grid">
                        {([
                            ["all", "🌍", "All Universities · All Departments", "Default public opportunity."],
                            ["multi_all", "🏛️", "Selected Universities · All Departments", "Choose multiple universities."],
                            ["multi_depts", "🎯", "Selected Universities · Selected Departments", "Target selected disciplines across universities."],
                            ["one_all", "🎓", "One University · All Departments", "Restrict applications to one university."],
                            ["one_depts", "🏫", "One University · Selected Departments", "Restrict to defined programmes."],
                            ["own_uni_all", "🏠", "My University · All Departments", `Open applications to all eligible students in ${facultyDetails.institution || "your university"}.`],
                            ["own_dept", "👩‍🏫", "My Department / Programme Only", "Restrict applications to your academic unit."],
                        ] as const).map(([scope, ico, title, sub]) => (
                            <button
                                key={scope}
                                type="button"
                                className={`co-aud${formData.applyScope === scope ? " on" : ""}`}
                                onClick={() => chooseApplyScope(scope)}
                            >
                                <div className="ai">{ico}</div>
                                <div><b>{title}</b><small>{sub}</small></div>
                                <div className="ck">{formData.applyScope === scope ? "✓" : ""}</div>
                            </button>
                        ))}
                    </div>

                    {(formData.participationScope.rule === "restricted_specific_universities" ||
                        formData.participationScope.rule === "departments_across_universities") && (
                        <div className="p-6 bg-pink-50 rounded-2xl border border-pink-100 space-y-4">
                            <div className="flex items-center gap-2">
                                <Plus className="w-4 h-4 text-pink-600" />
                                <span className="text-xs font-black text-pink-600 uppercase tracking-widest">Add universities</span>
                            </div>
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-sm font-bold bg-white"
                                value=""
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && !formData.participationScope.selectedUniversities.includes(val)) {
                                        const oneOnly = formData.applyScope === "one_all" || formData.applyScope === "one_depts";
                                        setFormData({
                                            ...formData,
                                            participationScope: {
                                                ...formData.participationScope,
                                                selectedUniversities: oneOnly
                                                    ? [val]
                                                    : [...formData.participationScope.selectedUniversities, val],
                                            },
                                        });
                                    }
                                    e.target.value = "";
                                }}
                            >
                                <option value="">Add university…</option>
                                {pakistaniUniversities
                                    .filter((u) => !formData.participationScope.selectedUniversities.includes(u))
                                    .map((u) => (
                                        <option key={u} value={u}>
                                            {u}
                                        </option>
                                    ))}
                            </select>
                            <div className="flex flex-wrap gap-2">
                                {formData.participationScope.selectedUniversities.map((u) => (
                                    <div
                                        key={u}
                                        className="bg-white px-3 py-1.5 rounded-lg border border-pink-200 flex items-center gap-2 shadow-sm"
                                    >
                                        <span className="text-xs font-bold text-slate-700">{u}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFormData({
                                                    ...formData,
                                                    participationScope: {
                                                        ...formData.participationScope,
                                                        selectedUniversities: formData.participationScope.selectedUniversities.filter(
                                                            (item) => item !== u
                                                        ),
                                                    },
                                                })
                                            }
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {formData.participationScope.selectedUniversities.length === 0 && (
                                    <p className="text-xs text-pink-500 italic font-medium">No universities added yet.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {(formData.participationScope.rule === "own_university_only" ||
                        formData.participationScope.rule === "own_university_departments") && (
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your university (locked)</label>
                            <input
                                type="text"
                                readOnly
                                value={facultyDetails.institution || "— Complete your profile —"}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm"
                            />
                        </div>
                    )}

                    {(formData.participationScope.rule === "departments_across_universities" ||
                        formData.participationScope.rule === "own_university_departments") && (
                        <div className="space-y-4 border-t border-slate-100 pt-6">
                            {formData.participationScope.rule === "departments_across_universities" && (
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tab 2 — Departments / programs</p>
                            )}
                            {formData.participationScope.rule === "own_university_departments" && (
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Step 1 — Departments / programs</p>
                            )}
                            <p className="text-xs text-slate-500">
                                Add each department or program name. For option 4, choices apply within the universities you selected above.
                            </p>
                            {formData.participationScope.departments.map((dep, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. BBA, Computer Science"
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-sm"
                                        value={dep}
                                        onChange={(e) => {
                                            const next = [...formData.participationScope.departments];
                                            next[idx] = e.target.value;
                                            setFormData({
                                                ...formData,
                                                participationScope: { ...formData.participationScope, departments: next },
                                            });
                                        }}
                                    />
                                    {formData.participationScope.departments.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = formData.participationScope.departments.filter((_, i) => i !== idx);
                                                setFormData({
                                                    ...formData,
                                                    participationScope: {
                                                        ...formData.participationScope,
                                                        departments: next.length ? next : [""],
                                                    },
                                                });
                                            }}
                                            className="px-3 text-slate-400 hover:text-red-500"
                                            aria-label="Remove department"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({
                                        ...formData,
                                        participationScope: {
                                            ...formData.participationScope,
                                            departments: [...formData.participationScope.departments, ""],
                                        },
                                    })
                                }
                                className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add department / program
                            </button>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 mt-4">
                                    Optional — sections / classes (e.g. A, B, Spring 2026)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. BBA Section A, Fall 2026"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-sm"
                                    value={formData.participationScope.sectionsNote}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            participationScope: {
                                                ...formData.participationScope,
                                                sectionsNote: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </div>
                        </div>
                    )}

                    <div className="border-t border-slate-100 pt-8 space-y-4">
                        <h3 className="text-sm font-black text-pink-700 uppercase tracking-wide">F5.2 Optional academic linkage</h3>
                        <p className="text-xs text-slate-500">Helps with course mapping, credit tracking, and reporting.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Course name (optional)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-sm"
                                    value={formData.academicLinkage.courseName}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            academicLinkage: { ...formData.academicLinkage, courseName: e.target.value },
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Semester (optional)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-sm"
                                    placeholder="e.g. Spring 2026"
                                    value={formData.academicLinkage.semester}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            academicLinkage: { ...formData.academicLinkage, semester: e.target.value },
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {activeStep === "SAFE" && (
            <div className="co-card co-accent" style={{ borderTopColor: "#b45309" }}>
                <CoSectionHead
                    letter="8"
                    title="Safety & accountability"
                    tag="DECLARATION"
                    color="#b45309"
                    expanded
                />
                <div>
                    <div className="co-note mt-1">
                        <span><b>CIEL PK role:</b> CIEL PK provides opportunity publication, workflow, reporting, verification and facilitation. Unless expressly stated otherwise, it does not itself operate or physically supervise independently created third-party activities.</span>
                    </div>
                    <p className="mb-2 text-xs text-slate-600">
                        You hold responsibility for academic supervision and oversight. If a partner organization is involved, operational safety is shared accordingly.
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button type="button" className={`co-safe${formData.safetyDeclarations.safeAppropriate ? " on" : ""}`} onClick={() => setFormData({ ...formData, safetyDeclarations: { ...formData.safetyDeclarations, safeAppropriate: !formData.safetyDeclarations.safeAppropriate } })}>
                            <span className="co-tick">{formData.safetyDeclarations.safeAppropriate ? "✓" : ""}</span>
                            <span>The activity environment is safe and appropriate for student participation.</span>
                        </button>
                        <button type="button" className={`co-safe${formData.safetyDeclarations.guidedSupervised ? " on" : ""}`} onClick={() => setFormData({ ...formData, safetyDeclarations: { ...formData.safetyDeclarations, guidedSupervised: !formData.safetyDeclarations.guidedSupervised } })}>
                            <span className="co-tick">{formData.safetyDeclarations.guidedSupervised ? "✓" : ""}</span>
                            <span>Students will be guided and supervised throughout the activity.</span>
                        </button>
                        <button type="button" className={`co-safe${formData.safetyDeclarations.lawfulEthical ? " on" : ""}`} onClick={() => setFormData({ ...formData, safetyDeclarations: { ...formData.safetyDeclarations, lawfulEthical: !formData.safetyDeclarations.lawfulEthical } })}>
                            <span className="co-tick">{formData.safetyDeclarations.lawfulEthical ? "✓" : ""}</span>
                            <span>Activities are lawful, ethical, and non-hazardous.</span>
                        </button>
                        <button type="button" className={`co-safe${formData.safetyDeclarations.precautionsInPlace ? " on" : ""}`} onClick={() => setFormData({ ...formData, safetyDeclarations: { ...formData.safetyDeclarations, precautionsInPlace: !formData.safetyDeclarations.precautionsInPlace } })}>
                            <span className="co-tick">{formData.safetyDeclarations.precautionsInPlace ? "✓" : ""}</span>
                            <span>Necessary precautions and basic safety measures are in place.</span>
                        </button>
                        <button type="button" className={`co-safe${formData.extraSafety.communicateChanges ? " on" : ""}`} onClick={() => setFormData({ ...formData, extraSafety: { ...formData.extraSafety, communicateChanges: !formData.extraSafety.communicateChanges } })}>
                            <span className="co-tick">{formData.extraSafety.communicateChanges ? "✓" : ""}</span>
                            <span>I agree to communicate material changes in location, activity, supervision, dates, capacity or safety arrangements.</span>
                        </button>
                        <button type="button" className={`co-safe${formData.extraSafety.visibilityIntentional ? " on" : ""}`} onClick={() => setFormData({ ...formData, extraSafety: { ...formData.extraSafety, visibilityIntentional: !formData.extraSafety.visibilityIntentional } })}>
                            <span className="co-tick">{formData.extraSafety.visibilityIntentional ? "✓" : ""}</span>
                            <span>The visibility and Apply Now eligibility scope selected in Step 7 is intentional and accurate.</span>
                        </button>
                        <button type="button" className={`co-safe${formData.extraSafety.cielNotGuarantee ? " on" : ""}`} onClick={() => setFormData({ ...formData, extraSafety: { ...formData.extraSafety, cielNotGuarantee: !formData.extraSafety.cielNotGuarantee } })}>
                            <span className="co-tick">{formData.extraSafety.cielNotGuarantee ? "✓" : ""}</span>
                            <span>Publication or approval on CIEL PK is not by itself a guarantee by CIEL PK regarding a third-party location or activity.</span>
                        </button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                            <label className="co-label">Electronic signature — type full name *</label>
                            <input
                                type="text"
                                placeholder={facultyDetails.name || "Your full name"}
                                value={formData.electronicSignature}
                                onChange={(e) => setFormData({ ...formData, electronicSignature: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="co-label">Signed date & time</label>
                            <input type="text" readOnly value={new Date().toLocaleString()} className="bg-slate-50" />
                        </div>
                    </div>
                    <button type="button" className={`co-safe mt-3 w-full text-left${formData.extraSafety.signatureAck ? " on" : ""}`} onClick={() => setFormData({ ...formData, extraSafety: { ...formData.extraSafety, signatureAck: !formData.extraSafety.signatureAck } })}>
                        <span className="co-tick">{formData.extraSafety.signatureAck ? "✓" : ""}</span>
                        <span>I confirm typing my name records my electronic acknowledgement of these declarations for this opportunity record.</span>
                    </button>
                </div>
            </div>
            )}

            {activeStep === "SUBMIT" && (
            <>
            <div className="co-card mb-3">
                <CoSectionHead letter="9" title="Review the student-facing opportunity flashcard" tag="FLASHCARD" color="#0e7d74" />
                <div className="previewTools mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfe7ea] bg-[#f8fafb] p-3">
                    <div>
                        <b className="text-[12px]">Eligibility preview</b>
                        <small className="mt-0.5 block text-[10px] text-[#70818a]">See how Apply Now changes by viewer. Phone/WhatsApp stays private.</small>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {([
                            ["eligible", "Eligible Student"],
                            ["wrongdept", "Wrong Department"],
                            ["otheruni", "Other University"],
                        ] as const).map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${flashViewer === id ? "border-[#102f3d] bg-[#102f3d] text-white" : "border-[#dfe7ea] bg-white text-[#52646c]"}`}
                                onClick={() => setFlashViewer(id)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <StudentOpportunityFlashcard model={flashcardModel} />
                <button
                    type="button"
                    className={`co-safe mt-3 w-full text-left${formData.flashApprove ? " on" : ""}`}
                    onClick={() => setFormData({ ...formData, flashApprove: !formData.flashApprove })}
                >
                    <span className="co-tick">{formData.flashApprove ? "✓" : ""}</span>
                    <span>I have reviewed this flashcard and confirm it accurately represents the opportunity being submitted.</span>
                </button>
            </div>
            <div className="co-final mb-3 rounded-[20px] bg-[#0d2b33] p-5 text-white">
                <div className="mb-1 flex items-center gap-2.5">
                    <span className="flex h-[26px] min-w-[28px] items-center justify-center rounded-[9px] bg-[#2dd4bf] px-2 text-[11px] font-extrabold text-[#04252b]">✓</span>
                    <h2 className="text-[14.5px] font-extrabold text-white">Final confirmations</h2>
                </div>
                <p className="mb-2 text-[11px] leading-relaxed text-[#a5e8de]">By submitting, you confirm the following — tap each:</p>
                {(
                    [
                        { key: "academicallyValid" as const, label: "The opportunity is academically valid and accurately described." },
                        { key: "properlySupervised" as const, label: "The activity will be properly supervised." },
                        { key: "safeEnvironment" as const, label: "The environment is safe and appropriate for students." },
                        { key: "correctVerifiable" as const, label: "All provided information is correct and verifiable." },
                    ] as const
                ).map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        className={`co-confirm${formData.finalConfirmations[key] ? " on" : ""}`}
                        onClick={() =>
                            setFormData({
                                ...formData,
                                finalConfirmations: {
                                    ...formData.finalConfirmations,
                                    [key]: !formData.finalConfirmations[key],
                                },
                            })
                        }
                    >
                        <span className="co-tick">{formData.finalConfirmations[key] ? "✓" : ""}</span>
                        <span>{label}</span>
                    </button>
                ))}
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <span className="co-locked" style={{ background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.25)", color: "#fff" }}>
                        🧑‍🏫 <b style={{ color: "#fff" }}>{facultyDetails.name || "—"}</b><span className="co-lock-badge">🔒</span>
                    </span>
                    <span className="co-locked" style={{ background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.25)", color: "#fff" }}>
                        🏛️ {facultyDetails.institution || "—"}<span className="co-lock-badge">🔒</span>
                    </span>
                </div>
                <div className="mt-3.5 flex gap-2.5">
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="flex-1 rounded-[13px] border border-white/30 bg-transparent py-3 text-xs font-extrabold text-[#d9f7f2] disabled:opacity-50"
                        disabled={isSubmitting || isLoadingEdit}
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
                        {isSubmitting ? "Submitting..." : editingOpportunityId ? "Save changes" : "🚀 Submit opportunity"}
                    </button>
                </div>
            </div>
            </>
            )}

                    <div className="co-form-nav">
                        {activeStepIndex > 0 ? (
                            <button type="button" className="co-nav-btn back" onClick={goBackStep}>← Back</button>
                        ) : <span />}
                        {activeStep !== "SUBMIT" ? (
                            <button
                                type="button"
                                className={`co-nav-btn ${activeStepIndex === WIZARD_STEPS.length - 2 ? "finish" : "next"}`}
                                onClick={goNextStep}
                            >
                                {WIZARD_STEPS[activeStepIndex + 1]?.label ? `${WIZARD_STEPS[activeStepIndex + 1].label} →` : "Next →"}
                            </button>
                        ) : null}
                    </div>
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
        </div>
    );
}
