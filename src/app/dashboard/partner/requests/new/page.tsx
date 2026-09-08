"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Info, MapPin, AlertCircle, ChevronDown, Loader2, Plus, X } from "lucide-react";
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
import { isPartnerOrganizationComplete } from "@/utils/profileCompletion";
import { readStoredCurrentUser } from "@/utils/currentUser";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import { composeInternationalPhone, DEFAULT_PHONE_COUNTRY_KEY } from "@/utils/countryCallingCodes";
import {
    resolveFacultyFlashEligibility,
    StudentOpportunityFlashcard,
    type FlashViewer,
} from "@/app/dashboard/student/create-opportunity/StudentOpportunityFlashcard";

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const LocationPicker = dynamic(() => import("@/components/ui/LocationPicker"), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-slate-400">Loading Map...</div>
});

/** Timeline modes that collect start/end date + optional daily from/to time (sent as timeline.* on create). */
const TIMELINES_WITH_SCHEDULE_UI = ["Fixed dates", "Flexible", "Ongoing"] as const;
const PARTNER_OPPORTUNITY_DRAFT_KEY = "ciel_partner_create_opportunity_draft_v1";

const WIZARD_STEPS = [
    { key: "A", label: "Creator", sub: "Organization profile", icon: "💚" },
    { key: "B", label: "Opportunity", sub: "Title, type, mode", icon: "🚀" },
    { key: "SCHED", label: "Schedule", sub: "Dates, seats, hours", icon: "📅" },
    { key: "C", label: "SDG & impact", sub: "Goals, objective, outputs", icon: "🌍" },
    { key: "E", label: "Student experience", sub: "Plan & skills gained", icon: "🛠️" },
    { key: "F", label: "Verification", sub: "Optional faculty & co-host", icon: "✅" },
    { key: "VIS", label: "Visibility", sub: "Who can Apply Now", icon: "📣" },
    { key: "SAFE", label: "Safety", sub: "Declarations & signature", icon: "🛡️" },
    { key: "SUBMIT", label: "Flashcard", sub: "Review & submit", icon: "🃏" },
] as const;

const NGO_CREATOR_TYPES = [
    "NGO / Nonprofit",
    "Foundation / Trust",
    "Charity / Welfare Organization",
    "Community-Based Organization",
    "Social Development Organization",
    "Other Civil Society Body",
] as const;

const PARTNER_CREATOR_TYPES = [
    "Private Company / Corporate",
    "Public Sector Organization",
    "Government Department / Authority",
    "Corporate CSR / Foundation",
    "SME / Local Business",
    "Social Enterprise",
    "Professional / Industry Association",
    "Community Organization",
    "Independent / Individual Partner",
    "Other Legitimate Partner",
] as const;

const COHOST_ORG_TYPES = [
    "NGO / Nonprofit",
    "Private Company / Corporate",
    "Public Sector / Government",
    "SME / Local Business",
    "Social Enterprise",
    "Community Organization",
    "Professional / Industry Body",
    "Individual / Independent Partner",
    "Other",
] as const;

function storedOrgTypeHint(): string {
    const u = readStoredCurrentUser();
    if (!u) return "";
    return String(u.orgType || u.organization_type || u.type || "");
}

function storedSignupRole(): string {
    const u = readStoredCurrentUser();
    return String(u?.role || "").trim().toLowerCase();
}

function isNgoOrganizationType(orgType: string): boolean {
    const t = orgType.trim().toLowerCase();
    if (!t) return false;
    if (t.includes("university") || t.includes("corporate") || t.includes("company")) return false;
    return (
        t === "ngo" ||
        t.includes("ngo") ||
        t.includes("nonprofit") ||
        t.includes("non-profit") ||
        t.includes("civil society") ||
        t.includes("charity")
    );
}

function isNgoCreatorAccount(orgType: string): boolean {
    const role = storedSignupRole();
    if (role === "ngo") return true;
    if (role === "corporate" || role === "government" || role === "university") return false;
    return isNgoOrganizationType(orgType);
}

function defaultCreatorDetailType(orgType: string): string {
    if (isNgoOrganizationType(orgType)) return "NGO / Nonprofit";
    const t = orgType.trim().toLowerCase();
    if (t.includes("government") || t.includes("public sector")) return "Public Sector Organization";
    if (t.includes("corporate") || t.includes("company")) return "Private Company / Corporate";
    return "";
}

type ParticipationRule =
    | "open_all_universities"
    | "restricted_specific_universities"
    | "departments_across_universities";

type NgoApplyScope = "all" | "multi_all" | "multi_depts" | "one_all" | "one_depts";

function applyScopeToRule(scope: NgoApplyScope): ParticipationRule {
    switch (scope) {
        case "all":
            return "open_all_universities";
        case "multi_all":
        case "one_all":
            return "restricted_specific_universities";
        case "multi_depts":
        case "one_depts":
            return "departments_across_universities";
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

export default function OpportunityPostingPage() {
    const router = useRouter();
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Organization Details State (fetched from API)
    const [orgDetails, setOrgDetails] = useState({
        organizationName: "",
        organizationType: "",
        city: "",
        focalPerson: { name: "", contact: "" }
    });

    // Form State
    const [formData, setFormData] = useState({
        // Section B
        title: "",
        hook: "",
        creatorDetailType: "",
        creatorSector: "",
        opportunityType: [] as string[],
        isOtherTypeChecked: false,
        otherTypeSpecs: [""] as string[],
        mode: "", // on-site, remote, hybrid
        location: { city: "", venue: "", pin: "" },
        timelineType: "Fixed dates",
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
            otherBeneficiary: ""
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

        // Section F — Verification & safety (executing org, partner, declarations, confirmations)
        verificationSafety: {
            executingOrg: {
                contactPersonName: "",
                officialEmail: "",
                whatsappCountryKey: DEFAULT_PHONE_COUNTRY_KEY,
                whatsappNational: "",
            },
            partnerOrg: {
                hasPartner: false,
                orgName: "",
                contactPerson: "",
                officialEmail: "",
                designation: "",
                orgType: "",
                functionInOpportunity: "",
            },
            safety: {
                siteSafeSuitable: false,
                lawfulNoHazards: false,
                supervisedThroughout: false,
                basicEmergencyMeasures: false,
            },
            submissionConfirmations: {
                genuineAccurate: false,
                orgResponsibleExecution: false,
                environmentSafe: false,
                informationVerifiable: false,
            },
        },
        restrictedFacultyLinkage: {
            hasFacultyLink: false,
            representativeName: "",
            designation: "",
            officialEmail: "",
            university: "",
            department: "",
        },
        extraSafety: {
            communicateChanges: false,
            visibilityIntentional: false,
            cielNotGuarantee: false,
            signatureAck: false,
        },
        electronicSignature: "",
        flashApprove: false,
        applyScope: "all" as NgoApplyScope,
        selectedDepartments: [""] as string[],

        // Section G
        verification: [] as string[],
        isOtherVerificationChecked: false,
        otherVerification: "",

        // Section H
        visibility: "public",
        restrictedUniversities: [] as string[],
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
    const chooseApplyScope = useCallback((scope: NgoApplyScope) => {
        setFormData((prev) => {
            let restrictedUniversities = prev.restrictedUniversities;
            if (scope === "all") restrictedUniversities = [];
            else if ((scope === "one_all" || scope === "one_depts") && restrictedUniversities.length > 1) {
                restrictedUniversities = restrictedUniversities.slice(0, 1);
            }
            return {
                ...prev,
                applyScope: scope,
                visibility: scope === "all" ? "public" : "restricted",
                restrictedUniversities,
            };
        });
    }, []);

    const validateForm = () => {
        if (!formData.creatorDetailType.trim()) {
            toast.error("Please select your organization type (Step 1).");
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
            const otherSpecs = formData.otherTypeSpecs.map((s) => s.trim()).filter(Boolean);
            if (otherSpecs.length === 0) {
                toast.error("Please add at least one Other opportunity type description (Section B)");
                return false;
            }
        }
        if (!formData.mode) {
            toast.error("Please select a Mode of Engagement (Section B)");
            return false;
        }
        if (formData.mode !== 'Remote') {
            if (!formData.location.city.trim()) {
                toast.error("Please enter a City/Area");
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
        if (!formData.sdg) {
            toast.error("Please select a Primary SDG");
            return false;
        }
        if (!formData.sdgWhy.trim()) {
            toast.error("Please explain why this SDG is genuinely relevant.");
            return false;
        }

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

        const vs = formData.verificationSafety;
        if (!vs.executingOrg.contactPersonName.trim()) {
            toast.error("Please enter Contact Person Name for the executing organization (Section F1)");
            return false;
        }
        if (!vs.executingOrg.officialEmail.trim() || !isValidEmail(vs.executingOrg.officialEmail)) {
            toast.error("Please enter a valid official email for the executing organization (Section F1)");
            return false;
        }
        if (vs.partnerOrg.hasPartner) {
            if (!vs.partnerOrg.orgName.trim()) {
                toast.error("Please enter co-host / collaborator organization name");
                return false;
            }
            if (!vs.partnerOrg.contactPerson.trim()) {
                toast.error("Please enter co-host contact person name");
                return false;
            }
            if (!vs.partnerOrg.officialEmail.trim() || !isValidEmail(vs.partnerOrg.officialEmail)) {
                toast.error("Please enter a valid official email for the co-host organization");
                return false;
            }
            if (!vs.partnerOrg.designation.trim()) {
                toast.error("Please enter the co-host designation / role");
                return false;
            }
            if (!vs.partnerOrg.functionInOpportunity.trim()) {
                toast.error("Please describe the co-host’s function in this opportunity");
                return false;
            }
        }
        if (formData.restrictedFacultyLinkage.hasFacultyLink) {
            const fl = formData.restrictedFacultyLinkage;
            if (!fl.representativeName.trim() || !fl.university.trim() || !fl.officialEmail.trim()) {
                toast.error("Please complete the optional academic contact (name, university, and email).");
                return false;
            }
            if (!isValidEmail(fl.officialEmail)) {
                toast.error("Please enter a valid official email for the academic contact.");
                return false;
            }
        }
        if (!vs.safety.siteSafeSuitable || !vs.safety.lawfulNoHazards || !vs.safety.supervisedThroughout || !vs.safety.basicEmergencyMeasures) {
            toast.error("Please confirm all safety & supervision declarations");
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
        if (
            !vs.submissionConfirmations.genuineAccurate ||
            !vs.submissionConfirmations.orgResponsibleExecution ||
            !vs.submissionConfirmations.environmentSafe ||
            !vs.submissionConfirmations.informationVerifiable
        ) {
            toast.error("Please confirm all required statements before submitting");
            return false;
        }

        const applyScope = formData.applyScope;
        const selectedUnis = formData.restrictedUniversities.map((u) => u.trim()).filter(Boolean);
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
        if (applyScope === "multi_depts" || applyScope === "one_depts") {
            const deps = formData.selectedDepartments.map((d) => d.trim()).filter(Boolean);
            if (deps.length === 0) {
                toast.error("Please add at least one department or programme.");
                return false;
            }
        }
        if (!formData.flashApprove) {
            toast.error("Please review and approve the opportunity flashcard.");
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            // Transform state to match API Spec
            const otherTypeLabels = formData.isOtherTypeChecked
                ? formData.otherTypeSpecs.map((s) => s.trim()).filter(Boolean).map((s) => `Other: ${s}`)
                : [];
            const participationRule = applyScopeToRule(formData.applyScope);
            const selectedUnis = formData.restrictedUniversities.map((u) => u.trim()).filter(Boolean);
            const deptList = formData.selectedDepartments.map((d) => d.trim()).filter(Boolean);
            const departmentRestrictionScope =
                participationRule === "departments_across_universities" ? "specific" : "all";
            // Browse's "Restricted"/"Open to all" badge and filter read this — must reflect the actual
            // participation scope. Apply Now eligibility is separately gated by participation_scope;
            // the directory card stays visible either way (backend isPubliclyVisibleOpportunity), this
            // only fixes the label/filter being wrong.
            const visibility = participationRule === "open_all_universities" ? "public" : "restricted";
            const applyRestrictedUnis = participationRule === "open_all_universities" ? [] : selectedUnis;
            const fl = formData.restrictedFacultyLinkage;
            const payload = {
                title: formData.title,
                types:
                    otherTypeLabels.length > 0
                        ? [...formData.opportunityType, ...otherTypeLabels]
                        : formData.opportunityType,
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
                    beneficiaries_type: formData.objectives.isOtherBeneficiaryChecked && formData.objectives.otherBeneficiary.trim()
                        ? [...formData.objectives.beneficiariesType, formData.objectives.otherBeneficiary.trim()]
                        : formData.objectives.beneficiariesType
                },
                activity_details: {
                    student_responsibilities: formData.activity.responsibilities,
                    skills_gained: formData.activity.isOtherSkillChecked
                        ? [
                            ...formData.activity.skills,
                            ...formData.activity.otherSkills.map((s) => s.trim()).filter(Boolean),
                        ]
                        : formData.activity.skills,
                    prerequisites: formData.activity.prerequisites.trim() || undefined,
                    resources: formData.activity.resources.trim() || undefined,
                },
                // Legacy shape — keep for older backends; mirrors executing-org contact + safety flags
                supervision: {
                    supervisor_name: formData.verificationSafety.executingOrg.contactPersonName.trim(),
                    role: "Executing organization — official contact",
                    contact: formData.verificationSafety.executingOrg.officialEmail.trim(),
                    electronic_signature: formData.electronicSignature.trim(),
                    safe_environment: formData.verificationSafety.safety.siteSafeSuitable,
                    supervised: formData.verificationSafety.safety.supervisedThroughout,
                    ...(composeInternationalPhone(
                        formData.verificationSafety.executingOrg.whatsappCountryKey,
                        formData.verificationSafety.executingOrg.whatsappNational,
                    )
                        ? {
                              whatsapp_e164: composeInternationalPhone(
                                  formData.verificationSafety.executingOrg.whatsappCountryKey,
                                  formData.verificationSafety.executingOrg.whatsappNational,
                              ),
                          }
                        : {}),
                },
                executing_organization: {
                    name: orgDetails.organizationName.trim(),
                    contact_person_name: formData.verificationSafety.executingOrg.contactPersonName.trim(),
                    official_email: formData.verificationSafety.executingOrg.officialEmail.trim(),
                    organization_type: formData.creatorDetailType.trim(),
                    sector: formData.creatorSector.trim() || undefined,
                },
                partner_organization: formData.verificationSafety.partnerOrg.hasPartner
                    ? {
                        organization_name: formData.verificationSafety.partnerOrg.orgName.trim(),
                        contact_person_name: formData.verificationSafety.partnerOrg.contactPerson.trim(),
                        official_email: formData.verificationSafety.partnerOrg.officialEmail.trim(),
                        designation: formData.verificationSafety.partnerOrg.designation.trim() || undefined,
                        organization_type: formData.verificationSafety.partnerOrg.orgType.trim() || undefined,
                        function_in_opportunity: formData.verificationSafety.partnerOrg.functionInOpportunity.trim() || undefined,
                    }
                    : null,
                external_partner_collaboration: formData.verificationSafety.partnerOrg.hasPartner
                    ? {
                        organization_name: formData.verificationSafety.partnerOrg.orgName.trim(),
                        contact_person: formData.verificationSafety.partnerOrg.contactPerson.trim(),
                        official_email: formData.verificationSafety.partnerOrg.officialEmail.trim(),
                    }
                    : null,
                safety_declaration: {
                    environment_safe_and_appropriate: formData.verificationSafety.safety.siteSafeSuitable,
                    students_guided_and_supervised: formData.verificationSafety.safety.supervisedThroughout,
                    lawful_ethical_and_non_hazardous: formData.verificationSafety.safety.lawfulNoHazards,
                    precautions_and_basic_safety: formData.verificationSafety.safety.basicEmergencyMeasures,
                },
                safety_supervision_declaration: {
                    site_safe_and_suitable: formData.verificationSafety.safety.siteSafeSuitable,
                    lawful_and_free_from_hazards: formData.verificationSafety.safety.lawfulNoHazards,
                    students_properly_supervised: formData.verificationSafety.safety.supervisedThroughout,
                    basic_safety_and_emergency_measures: formData.verificationSafety.safety.basicEmergencyMeasures,
                },
                visibility_and_academic_linkage: {
                    visibility_type: participationRule,
                    restricted_university_names: applyRestrictedUnis,
                    faculty_institutional_representative:
                        fl.hasFacultyLink
                            ? {
                                name: fl.representativeName.trim(),
                                designation: fl.designation.trim(),
                                official_email: fl.officialEmail.trim(),
                                university: fl.university.trim(),
                                department: fl.department.trim() || undefined,
                            }
                            : null,
                },
                participation_scope: {
                    rule: participationRule,
                    apply_scope: formData.applyScope,
                    creator_university_name: orgDetails.organizationName.trim(),
                    university_names: participationRule === "open_all_universities" ? [] : selectedUnis,
                    department_restriction: {
                        scope: departmentRestrictionScope,
                        departments: departmentRestrictionScope === "specific" ? deptList : [],
                        sections_or_class_note: null,
                    },
                },
                submission_confirmations: {
                    academically_valid_and_accurately_described:
                        formData.verificationSafety.submissionConfirmations.genuineAccurate,
                    activity_properly_supervised:
                        formData.verificationSafety.submissionConfirmations.orgResponsibleExecution,
                    environment_safe_and_appropriate:
                        formData.verificationSafety.submissionConfirmations.environmentSafe,
                    information_correct_and_verifiable:
                        formData.verificationSafety.submissionConfirmations.informationVerifiable,
                    genuine_and_accurate: formData.verificationSafety.submissionConfirmations.genuineAccurate,
                    organization_responsible_for_execution:
                        formData.verificationSafety.submissionConfirmations.orgResponsibleExecution,
                    information_accurate_and_verifiable:
                        formData.verificationSafety.submissionConfirmations.informationVerifiable,
                },
                admin_approval_required: true,
                verification_method: formData.isOtherVerificationChecked && formData.otherVerification.trim()
                    ? [...formData.verification, formData.otherVerification.trim()]
                    : formData.verification,
                visibility,
                restricted_universities: applyRestrictedUnis.length ? applyRestrictedUnis : null
            };

            const res = await authenticatedFetch(`/api/v1/opportunities`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                const data = await res.json();
                // Check for success flag OR direct object return (id/title)
                if (data.success || data.id || data.title) {
                    toast.success("Submitted for review. Your opportunity will appear as Live after admin approval.");
                    router.push("/dashboard/partner/requests"); // Redirect to list
                } else {
                    toast.error(data.message || data.error || "Failed to create opportunity");
                }
            } else if (!res) {
                toast.error("Your session may have expired. Please sign in again.");
            } else {
                let detail = "Could not create the opportunity. Please try again.";
                try {
                    const errJson = (await res.json()) as { message?: unknown; error?: unknown };
                    const m =
                        (typeof errJson.message === "string" && errJson.message) ||
                        (typeof errJson.error === "string" && errJson.error);
                    if (m) detail = m;
                } catch {
                    if (res.statusText) detail = `${detail} (${res.status} ${res.statusText})`;
                }
                toast.error(detail);
            }
        } catch (error) {
            console.error("Error submitting form", error);
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveDraft = () => {
        try {
            localStorage.setItem(
                PARTNER_OPPORTUNITY_DRAFT_KEY,
                JSON.stringify({
                    v: 1,
                    savedAt: Date.now(),
                    formData,
                    orgDetails,
                    expandedSections,
                }),
            );
            toast.success("Draft saved on this device.");
        } catch (error) {
            console.error("Partner draft save failed", error);
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

    // Fetch Organization Profile on Mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Get user ID from local storage
                const storedUser = localStorage.getItem("ciel_user");
                let userId = null;
                if (storedUser) {
                    try {
                        const userObj = JSON.parse(storedUser);
                        userId = userObj.id || userObj.userId || userObj.user_id;
                    } catch (e) {
                        console.error("Failed to parse user data");
                    }
                }

                if (!userId) {
                    toast.error("User session invalid.");
                    setIsLoadingProfile(false);
                    return;
                }

                const [orgRes, userRes] = await Promise.all([
                    authenticatedFetch(`/api/v1/organisation/profile/detail`, {
                        method: 'POST',
                        body: JSON.stringify({ userId })
                    }),
                    authenticatedFetch(`/api/v1/profile`),
                ]);

                let userEmail = "";
                if (userRes && userRes.ok) {
                    try {
                        const userJson = await userRes.json();
                        const u = userJson.data || userJson;
                        userEmail = (u.email as string) || "";
                    } catch {
                        /* ignore */
                    }
                }

                let orgNameGate = "";
                let orgCityGate = "";
                let orgRecordGate: Record<string, unknown> | null = null;

                if (orgRes && orgRes.ok) {
                    const data = await orgRes.json();
                    const apiData = data.data || data;

                    if (apiData) {
                        orgRecordGate = apiData as Record<string, unknown>;
                        orgNameGate = apiData.name || "";
                        orgCityGate = apiData.city || "";
                        setOrgDetails({
                            organizationName: apiData.name || "",
                            organizationType: apiData.orgType || "",
                            city: apiData.city || "",
                            focalPerson: {
                                name: apiData.contactName || "",
                                contact: apiData.contactPhone || ""
                            }
                        });
                        setFormData((prev) => ({
                            ...prev,
                            creatorDetailType:
                                prev.creatorDetailType.trim() ||
                                defaultCreatorDetailType(
                                    String(apiData.orgType || storedSignupRole() || ""),
                                ),
                            verificationSafety: {
                                ...prev.verificationSafety,
                                executingOrg: {
                                    ...prev.verificationSafety.executingOrg,
                                    contactPersonName:
                                        apiData.contactName?.trim() ||
                                        prev.verificationSafety.executingOrg.contactPersonName,
                                    officialEmail:
                                        userEmail.trim() ||
                                        prev.verificationSafety.executingOrg.officialEmail,
                                },
                            },
                        }));
                    }
                }

                if (!orgRecordGate || !isPartnerOrganizationComplete(orgRecordGate)) {
                    router.replace("/dashboard/partner/organization");
                    return;
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
                toast.error("Failed to load organization profile");
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [router]);

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
        orgDetails.organizationName.trim() || "",
    ].filter(Boolean);
    const previewPrimarySdg = formData.sdg ? findSdgById(formData.sdg) : null;
    const previewSecondarySdg = formData.secondarySdgs[0] ? findSdgById(formData.secondarySdgs[0].sdgId) : null;
    const timelineStartWeekdayLabel = weekdayLabelFromDateInput(formData.dates.start);
    const timelineEndWeekdayLabel = weekdayLabelFromDateInput(formData.dates.end);

    const isNgoCreator = isNgoCreatorAccount(orgDetails.organizationType || storedOrgTypeHint());
    const creatorTypes = isNgoCreator ? NGO_CREATOR_TYPES : PARTNER_CREATOR_TYPES;
    const creatorCopy = isNgoCreator
        ? {
            eyebrow: "CIEL PK · NGO / NONPROFIT COMMUNITY SERVICE",
            heroTitle: "Create an opportunity — faculty is optional, Apply Now is yours to define.",
            intro: "Faculty linkage is optional. The opportunity may be open across all universities or targeted to selected universities/departments. Add a co-host only when a separate collaborator is involved.",
            flow: "NGO/Nonprofit creator → co-host acknowledgement if another organization is named → CIEL PK final review → Published opportunity",
            badge: "NGO / NONPROFIT CREATOR",
            unitFallback: "Programme / Project Unit",
            icon: "💚",
            facultyHint: "Optional academic linkage is not a prerequisite for NGO / nonprofit creators.",
            visIntro: "approved NGO / nonprofit opportunities are publicly discoverable",
            sectorLabel: "Programme / Sector",
            sectorPlaceholder: "e.g. education, health, livelihoods",
            typeNotice: "",
        }
        : {
            eyebrow: "CIEL PK · PARTNER CREATOR",
            heroTitle: "Create an opportunity — with the right checks for partner creator.",
            intro: "Private, public, government, CSR, SME, social-enterprise, professional and community partners are supported. Faculty is optional. Add another partner only when there is a separate co-host/collaborator.",
            flow: "Partner creator → CIEL PK review → Published opportunity; co-host acknowledgement first when another organization is named",
            badge: "PARTNER CREATOR",
            unitFallback: "Community / CSR / Outreach Unit",
            icon: "🏢",
            facultyHint: "Optional academic linkage is not a prerequisite for Partner or CIEL PK creators.",
            visIntro: "approved partner creator opportunities are publicly discoverable",
            sectorLabel: "Sector / Field",
            sectorPlaceholder: "e.g. Education, Health, Technology, Retail, Public Service",
            typeNotice: "Partner can be private, public or anything legitimate: the organization type is recorded for verification but does not limit opportunity visibility.",
        };

    const flashcardModel = useMemo(() => {
        const scopeMap: Record<NgoApplyScope, string> = {
            all: "All Universities · All Departments",
            multi_all: "Selected Universities · All Departments",
            multi_depts: "Selected Universities · Selected Departments",
            one_all: "One University · All Departments",
            one_depts: "One University · Selected Departments",
        };
        const selectedUnis = formData.restrictedUniversities.map((u) => u.trim()).filter(Boolean).join(", ");
        const selectedDepts = formData.selectedDepartments.map((d) => d.trim()).filter(Boolean).join(", ");
        let scopeDetail = "CIEL PK network";
        if (formData.applyScope === "multi_all") scopeDetail = selectedUnis || "Selected universities";
        else if (formData.applyScope === "multi_depts") scopeDetail = `${selectedUnis} · ${selectedDepts}`;
        else if (formData.applyScope === "one_all") scopeDetail = selectedUnis || "One university";
        else if (formData.applyScope === "one_depts") scopeDetail = `${selectedUnis} · ${selectedDepts}`;
        const elig = resolveFacultyFlashEligibility({
            viewer: flashViewer,
            applyScope: formData.applyScope,
            creatorUniversity: orgDetails.organizationName,
        });
        const skills = [
            ...formData.activity.skills,
            ...(formData.activity.isOtherSkillChecked ? formData.activity.otherSkills.map((s) => s.trim()).filter(Boolean) : []),
        ].join(", ");
        const bens = [
            ...formData.objectives.beneficiariesType,
            ...(formData.objectives.isOtherBeneficiaryChecked && formData.objectives.otherBeneficiary.trim()
                ? [formData.objectives.otherBeneficiary.trim()]
                : []),
        ].join(", ");
        const partnerOn = formData.verificationSafety.partnerOrg.hasPartner;
        const facultyOn = formData.restrictedFacultyLinkage.hasFacultyLink;
        return {
            title: formData.title,
            hook: formData.hook,
            summary: formData.objectives.description,
            activityType: formData.opportunityType[0] || "Community Service",
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
            creatorName: orgDetails.focalPerson.name || orgDetails.organizationName,
            orgLabel: orgDetails.organizationName || "—",
            unitLabel: formData.creatorDetailType || orgDetails.organizationType || creatorCopy.unitFallback,
            badgeLabel: creatorCopy.badge,
            privateCandidate: false,
            facultyName: facultyOn ? formData.restrictedFacultyLinkage.representativeName : "Optional / not required",
            facultyEmail: facultyOn ? formData.restrictedFacultyLinkage.officialEmail : "—",
            host: partnerOn ? formData.verificationSafety.partnerOrg.orgName : orgDetails.organizationName || "No additional co-host",
            partnerEmail: partnerOn ? formData.verificationSafety.partnerOrg.officialEmail : "",
            verification: formData.verification.join(", "),
            scopeLabel: scopeMap[formData.applyScope] || formData.applyScope,
            scopeDetail,
            approvalText: partnerOn
                ? "Pending co-host acknowledgement → CIEL PK final review"
                : "Pending CIEL PK final review",
            eligible: elig.eligible,
            eligibilityWhy: elig.why,
        };
    }, [formData, orgDetails, flashViewer, creatorCopy.badge, creatorCopy.unitFallback]);

    return (
        <div className="co-form">
            <div className="mb-3.5 flex items-center gap-3">
                <div>
                    <p className="text-[10px] text-[#7a919a]">
                        Community Service → <b className="text-[#0e7d74]">Create an Opportunity</b>
                    </p>
                </div>
                <Link
                    href="/dashboard/partner/community-service"
                    className="ml-auto rounded-full border border-[#dcebee] bg-white px-4 py-2 text-[10.5px] font-extrabold text-[#0e7d74]"
                >
                    ← Back
                </Link>
            </div>

            <div className="co-hero">
                <div className="co-hero-copy">
                    <p className="co-hero-eyebrow">{creatorCopy.eyebrow}</p>
                    <h1>{creatorCopy.heroTitle}</h1>
                    <p>
                        {creatorCopy.intro}
                    </p>
                    <div className="co-hero-chips">
                        <span className="co-hero-chip">🧭 Guided 9-step form</span>
                        <span className="co-hero-chip">🃏 Final flashcard</span>
                        <span className="co-hero-chip">🎯 Role-aware Apply Now</span>
                        <span className="co-hero-chip">🔒 Private contacts protected</span>
                    </div>
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
                                    <span className="co-step-ico">{idx === 0 ? creatorCopy.icon : step.icon}</span>
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
                            {creatorCopy.flow}
                        </p>
                    </div>
                </aside>

                <div className="co-wizard-main">

            {activeStep === "A" && (
            <div className="co-card">
                <CoSectionHead letter="A" title="Creator profile & accountability" tag="PROFILE LINKED" tagAuto color="#0d2b33" />
                {isLoadingProfile ? (
                    <div className="py-4 text-center text-[#7a919a]">
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading details...
                    </div>
                ) : (
                    <div className="space-y-4 p-5 sm:p-8">
                        <div className="flex items-center gap-3 rounded-2xl border border-[#c9e5da] bg-[linear-gradient(135deg,#f0faf6,#fff)] p-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#15988b] text-lg">{creatorCopy.icon}</div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[8px] font-black tracking-[0.12em] text-[#15988b]">SIGNED-IN CREATOR</div>
                                <b className="block text-[12px]">{orgDetails.focalPerson.name || orgDetails.organizationName || "—"}</b>
                                <p className="m-0 text-[10px] text-[#7a919a]">
                                    {orgDetails.organizationName || "—"} · {formData.creatorDetailType || creatorCopy.unitFallback}
                                </p>
                            </div>
                            <span className="rounded-full border border-[#c6e1dc] bg-white px-2.5 py-1 text-[8px] font-black text-[#22685f] whitespace-nowrap">{creatorCopy.badge}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                                <label className="co-label" style={{ marginTop: 0 }}>Creator name</label>
                                <input
                                    readOnly
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm"
                                    value={orgDetails.focalPerson.name || "—"}
                                />
                            </div>
                            <div>
                                <label className="co-label" style={{ marginTop: 0 }}>Organization / institution</label>
                                <input
                                    readOnly
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm"
                                    value={orgDetails.organizationName || "—"}
                                />
                            </div>
                            <div>
                                <label className="co-label" style={{ marginTop: 0 }}>Department / programme / unit</label>
                                <input
                                    readOnly
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm"
                                    value={orgDetails.organizationType || creatorCopy.unitFallback}
                                />
                            </div>
                            <div>
                                <label className="co-label" style={{ marginTop: 0 }}>Official email <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-sm"
                                    value={formData.verificationSafety.executingOrg.officialEmail}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            verificationSafety: {
                                                ...formData.verificationSafety,
                                                executingOrg: {
                                                    ...formData.verificationSafety.executingOrg,
                                                    officialEmail: e.target.value,
                                                },
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="co-label" style={{ marginTop: 0 }}>Organization type <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-sm bg-white"
                                    value={formData.creatorDetailType}
                                    onChange={(e) => setFormData({ ...formData, creatorDetailType: e.target.value })}
                                >
                                    <option value="">Select type</option>
                                    {creatorTypes.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="co-label" style={{ marginTop: 0 }}>{creatorCopy.sectorLabel}</label>
                                <input
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-sm"
                                    placeholder={creatorCopy.sectorPlaceholder}
                                    value={formData.creatorSector}
                                    onChange={(e) => setFormData({ ...formData, creatorSector: e.target.value })}
                                />
                            </div>
                        </div>
                        {creatorCopy.typeNotice ? (
                            <div className="rounded-xl border border-[#d5e8f0] bg-[#edf7fc] p-3 text-[11px] leading-relaxed text-[#3b697d]">
                                <b>Partner can be private, public or anything legitimate:</b> {creatorCopy.typeNotice.replace(/^Partner can be private, public or anything legitimate:\s*/i, "")}
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
            )}

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

                <div className="space-y-8 p-5 sm:p-8">
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
                                        otherTypeSpecs: !formData.isOtherTypeChecked ? formData.otherTypeSpecs : [""],
                                    })
                                }
                            >
                                ✏️ Other
                            </CoChip>
                        </div>
                            {formData.isOtherTypeChecked && (
                                <div className="mt-4 space-y-3 pl-4 border-l-2 border-blue-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase">
                                        Specify each &quot;Other&quot; type (add as many as needed)
                                    </p>
                                    {formData.otherTypeSpecs.map((spec, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Describe this opportunity type…"
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
                                                            setFormData({
                                                                ...formData,
                                                                otherTypeSpecs: next.length ? next : [""],
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
                                                otherTypeSpecs: [...formData.otherTypeSpecs, ""],
                                            })
                                        }
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
                    <div>
                        <label className="co-label">Why is this SDG genuinely relevant? *</label>
                        <textarea
                            spellCheck={true}
                            placeholder="Explain the actual connection instead of selecting an SDG only because it sounds related."
                            value={formData.sdgWhy}
                            onChange={(e) => setFormData({ ...formData, sdgWhy: e.target.value })}
                        />
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

                    {/* C4. Secondary SDG */}
                    <div className="pt-6 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-900 mb-2">C4. Secondary SDG (Optional)</label>
                        <p className="text-xs text-slate-500 mb-4">If this project also contributes to another SDG, select it below.</p>

                        <div className="space-y-4">
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-medium"
                                value={formData.secondarySdgs[0]?.sdgId || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({
                                        ...formData,
                                        secondarySdgs: val
                                            ? [{ sdgId: val, targetId: "", indicatorId: "", justification: "" }]
                                            : [],
                                    });
                                }}
                            >
                                <option value="">Select a Secondary SDG...</option>
                                {opportunityFormSdgList
                                    .filter((sdg) => sdg.id !== formData.sdg)
                                    .map((sdg) => (
                                        <option key={sdg.id} value={sdg.id}>
                                            SDG {sdg.number} — {sdg.title}
                                        </option>
                                    ))}
                            </select>

                            <div className={!formData.secondarySdgs[0]?.sdgId ? "opacity-50 pointer-events-none space-y-4" : "space-y-4"}>
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">C5. Select SDG Target</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-medium"
                                        value={formData.secondarySdgs[0]?.targetId || ""}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                secondarySdgs: formData.secondarySdgs[0]
                                                    ? [{
                                                        ...formData.secondarySdgs[0],
                                                        targetId: e.target.value,
                                                        indicatorId: "",
                                                    }]
                                                    : [],
                                            })
                                        }
                                    >
                                        <option value="">Select a Target...</option>
                                        {(formData.secondarySdgs[0]?.sdgId
                                            ? findSdgById(formData.secondarySdgs[0].sdgId)?.targets
                                            : []
                                        )?.map((target) => (
                                            <option key={target.id} value={target.id}>
                                                Target {target.id} — {target.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={!formData.secondarySdgs[0]?.targetId ? "opacity-50 pointer-events-none" : ""}>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">C6. SDG Indicator</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-medium"
                                        value={formData.secondarySdgs[0]?.indicatorId || ""}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                secondarySdgs: formData.secondarySdgs[0]
                                                    ? [{
                                                        ...formData.secondarySdgs[0],
                                                        indicatorId: e.target.value,
                                                    }]
                                                    : [],
                                            })
                                        }
                                    >
                                        <option value="">Select an Indicator...</option>
                                        {(formData.secondarySdgs[0]?.sdgId && formData.secondarySdgs[0]?.targetId
                                            ? findSdgById(formData.secondarySdgs[0].sdgId)
                                                ?.targets.find((target) => target.id === formData.secondarySdgs[0].targetId)
                                                ?.indicators
                                            : []
                                        )?.map((indicator) => (
                                            <option key={indicator.id} value={indicator.id}>
                                                Indicator {indicator.id} — {indicator.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>
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
                                    <label className="flex items-center gap-2 text-sm text-slate-600">
                                        <input
                                            type="checkbox"
                                            className="rounded text-teal-600 focus:ring-teal-500"
                                            checked={formData.objectives.beneficiariesType.some(t => !["Children", "Youth", "Women", "Elderly", "Persons with disabilities", "Students", "Community members"].includes(t))}
                                            onChange={(e) => {
                                                const predefined = ["Children", "Youth", "Women", "Elderly", "Persons with disabilities", "Students", "Community members"];
                                                if (!e.target.checked) {
                                                    setFormData({
                                                        ...formData,
                                                        objectives: { ...formData.objectives, beneficiariesType: formData.objectives.beneficiariesType.filter(t => predefined.includes(t)) }
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        objectives: { ...formData.objectives, beneficiariesType: [...formData.objectives.beneficiariesType, "Other"] }
                                                    });
                                                }
                                            }}
                                        /> Other (please specify)
                                    </label>
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
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                objectives: { ...formData.objectives, isOtherBeneficiaryChecked: e.target.checked }
                                            })}
                                        />
                                        <span className={`text-sm font-medium ${formData.objectives.isOtherBeneficiaryChecked ? 'text-teal-700' : 'text-slate-600'}`}>Other</span>
                                    </label>
                                    {formData.objectives.isOtherBeneficiaryChecked && (
                                        <input
                                            type="text"
                                            placeholder="Please specify other beneficiary type..."
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-sm transition-all"
                                            value={formData.objectives.otherBeneficiary}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                objectives: { ...formData.objectives, otherBeneficiary: e.target.value }
                                            })}
                                        />
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
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setFormData({
                                            ...formData,
                                            activity: {
                                                ...formData.activity,
                                                isOtherSkillChecked: checked,
                                                otherSkills: checked
                                                    ? formData.activity.otherSkills.length
                                                        ? formData.activity.otherSkills
                                                        : [""]
                                                    : [""],
                                            },
                                        });
                                    }}
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
                                                        setFormData({
                                                            ...formData,
                                                            activity: { ...formData.activity, otherSkills: newOthers },
                                                        });
                                                    }}
                                                />
                                                {formData.activity.otherSkills.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newOthers = formData.activity.otherSkills.filter((_, i) => i !== idx);
                                                            setFormData({
                                                                ...formData,
                                                                activity: {
                                                                    ...formData.activity,
                                                                    otherSkills: newOthers.length ? newOthers : [""],
                                                                },
                                                            });
                                                        }}
                                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                                        aria-label="Remove skill"
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
                                        Add another skill
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
                    tag="ROLE-SMART"
                    color="#18755f"
                    expanded
                />
                <div className="space-y-8 p-5 sm:p-8">
                    <div className="mb-1 flex items-center gap-3 rounded-2xl border border-[#c9e5da] bg-[linear-gradient(135deg,#f0faf6,#fff)] p-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#15988b] text-lg">{creatorCopy.icon}</div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[8px] font-black tracking-[0.12em] text-[#15988b]">SIGNED-IN CREATOR / HOST</div>
                            <b className="block text-[12px]">{orgDetails.organizationName || "—"}</b>
                            <p className="m-0 text-[10px] text-[#7a919a]">
                                Your organization is already the creator/host. Faculty is optional. Add another organization only if a separate co-host is involved.
                            </p>
                        </div>
                        <span className="rounded-full bg-[#15988b] px-2.5 py-1 text-[8px] font-black text-white">AUTO-LINKED</span>
                    </div>

                    {/* F1 */}
                    <div className="rounded-xl border border-slate-200 p-6 space-y-4">
                        <h3 className="text-sm font-black text-orange-700 uppercase tracking-wide">F1. Executing organization contact (required)</h3>
                        <p className="text-xs text-slate-500">
                            Organization name is taken from your registered profile. Use the official contact below for coordination — it stays off the public flashcard unless you choose to show a public host name.
                        </p>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Organization name</label>
                            <input
                                type="text"
                                readOnly
                                value={orgDetails.organizationName}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-1">Contact person name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.verificationSafety.executingOrg.contactPersonName}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            verificationSafety: {
                                                ...formData.verificationSafety,
                                                executingOrg: {
                                                    ...formData.verificationSafety.executingOrg,
                                                    contactPersonName: e.target.value,
                                                },
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-1">Official email address <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    placeholder="name@organization.org"
                                    value={formData.verificationSafety.executingOrg.officialEmail}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            verificationSafety: {
                                                ...formData.verificationSafety,
                                                executingOrg: {
                                                    ...formData.verificationSafety.executingOrg,
                                                    officialEmail: e.target.value,
                                                },
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-900 mb-1">WhatsApp number (optional)</label>
                                <PhoneConnectivityRow
                                    phoneCountryKey={formData.verificationSafety.executingOrg.whatsappCountryKey}
                                    nationalDigits={formData.verificationSafety.executingOrg.whatsappNational}
                                    placeholderNational="3001234567"
                                    selectClassName="rounded-xl border-slate-200 focus:border-orange-500 py-3"
                                    inputClassName="rounded-xl border-slate-200 focus:border-orange-500 py-3"
                                    onPhoneCountryKeyChange={(key) =>
                                        setFormData({
                                            ...formData,
                                            verificationSafety: {
                                                ...formData.verificationSafety,
                                                executingOrg: { ...formData.verificationSafety.executingOrg, whatsappCountryKey: key },
                                            },
                                        })
                                    }
                                    onNationalDigitsChange={(digits) =>
                                        setFormData({
                                            ...formData,
                                            verificationSafety: {
                                                ...formData.verificationSafety,
                                                executingOrg: { ...formData.verificationSafety.executingOrg, whatsappNational: digits },
                                            },
                                        })
                                    }
                                />
                                <p className="mt-1 text-[11px] text-slate-400">Shown to students on the opportunity so they can message you directly. Leave blank to skip.</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-6 space-y-4">
                        <h3 className="text-sm font-black text-orange-700 uppercase tracking-wide">Academic / faculty link <span className="normal-case tracking-normal text-[#7a919a]">optional</span></h3>
                        <p className="text-xs text-slate-500">{creatorCopy.facultyHint}</p>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="org_faculty_link"
                                    className="text-orange-600"
                                    checked={!formData.restrictedFacultyLinkage.hasFacultyLink}
                                    onChange={() =>
                                        setFormData({
                                            ...formData,
                                            restrictedFacultyLinkage: { ...formData.restrictedFacultyLinkage, hasFacultyLink: false },
                                        })
                                    }
                                />
                                <span className="text-sm font-medium text-slate-800">No faculty link required</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="org_faculty_link"
                                    className="text-orange-600"
                                    checked={formData.restrictedFacultyLinkage.hasFacultyLink}
                                    onChange={() =>
                                        setFormData({
                                            ...formData,
                                            restrictedFacultyLinkage: { ...formData.restrictedFacultyLinkage, hasFacultyLink: true },
                                        })
                                    }
                                />
                                <span className="text-sm font-medium text-slate-800">Add academic contact</span>
                            </label>
                        </div>
                        {formData.restrictedFacultyLinkage.hasFacultyLink && (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label className="co-label" style={{ marginTop: 0 }}>Faculty / academic contact *</label>
                                    <input
                                        type="text"
                                        value={formData.restrictedFacultyLinkage.representativeName}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                restrictedFacultyLinkage: { ...formData.restrictedFacultyLinkage, representativeName: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="co-label" style={{ marginTop: 0 }}>University / institution *</label>
                                    <input
                                        type="text"
                                        value={formData.restrictedFacultyLinkage.university}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                restrictedFacultyLinkage: { ...formData.restrictedFacultyLinkage, university: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="co-label" style={{ marginTop: 0 }}>Department / programme</label>
                                    <input
                                        type="text"
                                        value={formData.restrictedFacultyLinkage.department}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                restrictedFacultyLinkage: { ...formData.restrictedFacultyLinkage, department: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="co-label" style={{ marginTop: 0 }}>Official email *</label>
                                    <input
                                        type="email"
                                        value={formData.restrictedFacultyLinkage.officialEmail}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                restrictedFacultyLinkage: { ...formData.restrictedFacultyLinkage, officialEmail: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* F2 */}
                    <div className="rounded-xl border border-slate-200 p-6 space-y-4">
                        <h3 className="text-sm font-black text-orange-700 uppercase tracking-wide">F2. Additional co-host / collaborator (optional)</h3>
                        <p className="text-xs text-slate-500">Your own organization is already the creator/host. Add another organization only if a separate co-host/collaborator is involved. Acknowledgement is recorded before activation where required.</p>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="hasPartnerOrg"
                                    className="text-orange-600"
                                    checked={!formData.verificationSafety.partnerOrg.hasPartner}
                                    onChange={() =>
                                        setFormData({
                                            ...formData,
                                            verificationSafety: {
                                                ...formData.verificationSafety,
                                                partnerOrg: {
                                                    ...formData.verificationSafety.partnerOrg,
                                                    hasPartner: false,
                                                },
                                            },
                                        })
                                    }
                                />
                                <span className="text-sm font-medium text-slate-800">No</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="hasPartnerOrg"
                                    className="text-orange-600"
                                    checked={formData.verificationSafety.partnerOrg.hasPartner}
                                    onChange={() =>
                                        setFormData({
                                            ...formData,
                                            verificationSafety: {
                                                ...formData.verificationSafety,
                                                partnerOrg: {
                                                    ...formData.verificationSafety.partnerOrg,
                                                    hasPartner: true,
                                                },
                                            },
                                        })
                                    }
                                />
                                <span className="text-sm font-medium text-slate-800">Yes</span>
                            </label>
                        </div>
                        {formData.verificationSafety.partnerOrg.hasPartner && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in duration-200">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Organization name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                        value={formData.verificationSafety.partnerOrg.orgName}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                verificationSafety: {
                                                    ...formData.verificationSafety,
                                                    partnerOrg: {
                                                        ...formData.verificationSafety.partnerOrg,
                                                        orgName: e.target.value,
                                                    },
                                                },
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Organization type</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm bg-white"
                                        value={formData.verificationSafety.partnerOrg.orgType}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                verificationSafety: {
                                                    ...formData.verificationSafety,
                                                    partnerOrg: {
                                                        ...formData.verificationSafety.partnerOrg,
                                                        orgType: e.target.value,
                                                    },
                                                },
                                            })
                                        }
                                    >
                                        <option value="">Select type</option>
                                        {COHOST_ORG_TYPES.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Contact person <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                        value={formData.verificationSafety.partnerOrg.contactPerson}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                verificationSafety: {
                                                    ...formData.verificationSafety,
                                                    partnerOrg: {
                                                        ...formData.verificationSafety.partnerOrg,
                                                        contactPerson: e.target.value,
                                                    },
                                                },
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Designation / role <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                        value={formData.verificationSafety.partnerOrg.designation}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                verificationSafety: {
                                                    ...formData.verificationSafety,
                                                    partnerOrg: {
                                                        ...formData.verificationSafety.partnerOrg,
                                                        designation: e.target.value,
                                                    },
                                                },
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Official email <span className="text-red-500">*</span></label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                        value={formData.verificationSafety.partnerOrg.officialEmail}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                verificationSafety: {
                                                    ...formData.verificationSafety,
                                                    partnerOrg: {
                                                        ...formData.verificationSafety.partnerOrg,
                                                        officialEmail: e.target.value,
                                                    },
                                                },
                                            })
                                        }
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Function in opportunity <span className="text-red-500">*</span></label>
                                    <textarea
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                        placeholder="How this organization hosts, delivers, supervises, or verifies the activity"
                                        value={formData.verificationSafety.partnerOrg.functionInOpportunity}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                verificationSafety: {
                                                    ...formData.verificationSafety,
                                                    partnerOrg: {
                                                        ...formData.verificationSafety.partnerOrg,
                                                        functionInOpportunity: e.target.value,
                                                    },
                                                },
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">CIEL PK final review</h3>
                        <p className="text-sm text-slate-600">
                            After you submit, a named co-host (if any) acknowledges first. CIEL PK then completes final review before the opportunity is published.
                        </p>
                    </div>

                    <div className="pt-2">
                        <label className="co-label">Participation verification</label>
                        <p className="mb-3 text-[11px] leading-relaxed text-[#7a919a]">What proof will students log as they go? Tap what applies.</p>
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
                            <CoChip
                                selected={formData.isOtherVerificationChecked}
                                onClick={() =>
                                    setFormData({
                                        ...formData,
                                        isOtherVerificationChecked: !formData.isOtherVerificationChecked,
                                    })
                                }
                            >
                                ✏️ Other
                            </CoChip>
                        </div>
                        {formData.isOtherVerificationChecked && (
                            <input
                                type="text"
                                placeholder="Please specify other verification method..."
                                className="mt-3 w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm"
                                value={formData.otherVerification}
                                onChange={(e) => setFormData({ ...formData, otherVerification: e.target.value })}
                            />
                        )}
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
                        🌍 <b>Public by default:</b> {creatorCopy.visIntro}. The selection below controls who can use Apply Now.
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
                    {(formData.applyScope === "multi_all" || formData.applyScope === "multi_depts" || formData.applyScope === "one_all" || formData.applyScope === "one_depts") && (
                        <div className="mt-4 p-6 bg-pink-50 rounded-2xl border border-pink-100 space-y-4">
                            <span className="text-xs font-black text-pink-600 uppercase tracking-widest">
                                {formData.applyScope === "one_all" || formData.applyScope === "one_depts" ? "Select university" : "Add universities"}
                            </span>
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-sm font-bold bg-white"
                                value=""
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && !formData.restrictedUniversities.includes(val)) {
                                        const oneOnly = formData.applyScope === "one_all" || formData.applyScope === "one_depts";
                                        setFormData({
                                            ...formData,
                                            restrictedUniversities: oneOnly ? [val] : [...formData.restrictedUniversities, val],
                                        });
                                    }
                                    e.target.value = "";
                                }}
                            >
                                <option value="">Add university…</option>
                                {pakistaniUniversities
                                    .filter((u) => !formData.restrictedUniversities.includes(u))
                                    .map((u) => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                            </select>
                            <div className="flex flex-wrap gap-2">
                                {formData.restrictedUniversities.map((u) => (
                                    <div key={u} className="bg-white px-3 py-1.5 rounded-lg border border-pink-200 flex items-center gap-2 shadow-sm">
                                        <span className="text-xs font-bold text-slate-700">{u}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFormData({
                                                    ...formData,
                                                    restrictedUniversities: formData.restrictedUniversities.filter((item) => item !== u),
                                                })
                                            }
                                            className="text-slate-400 hover:text-red-500"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {(formData.applyScope === "multi_depts" || formData.applyScope === "one_depts") && (
                                <div className="space-y-3 pt-2">
                                    <label className="co-label">Departments / programmes *</label>
                                    {formData.selectedDepartments.map((dep, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Department or programme"
                                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm"
                                                value={dep}
                                                onChange={(e) => {
                                                    const next = [...formData.selectedDepartments];
                                                    next[idx] = e.target.value;
                                                    setFormData({ ...formData, selectedDepartments: next });
                                                }}
                                            />
                                            {formData.selectedDepartments.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = formData.selectedDepartments.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, selectedDepartments: next.length ? next : [""] });
                                                    }}
                                                    className="px-3 text-slate-400 hover:text-red-500"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="text-xs font-bold text-pink-600"
                                        onClick={() => setFormData({ ...formData, selectedDepartments: [...formData.selectedDepartments, ""] })}
                                    >
                                        + Add department
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
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
                        All on-ground execution, supervision, and participant safety remain the responsibility of the executing organization.
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button type="button" className={`co-safe${formData.verificationSafety.safety.siteSafeSuitable ? " on" : ""}`} onClick={() => setFormData({ ...formData, verificationSafety: { ...formData.verificationSafety, safety: { ...formData.verificationSafety.safety, siteSafeSuitable: !formData.verificationSafety.safety.siteSafeSuitable } } })}>
                            <span className="co-tick">{formData.verificationSafety.safety.siteSafeSuitable ? "✓" : ""}</span>
                            <span>The activity site is safe and suitable for student participation.</span>
                        </button>
                        <button type="button" className={`co-safe${formData.verificationSafety.safety.supervisedThroughout ? " on" : ""}`} onClick={() => setFormData({ ...formData, verificationSafety: { ...formData.verificationSafety, safety: { ...formData.verificationSafety.safety, supervisedThroughout: !formData.verificationSafety.safety.supervisedThroughout } } })}>
                            <span className="co-tick">{formData.verificationSafety.safety.supervisedThroughout ? "✓" : ""}</span>
                            <span>Students will be properly supervised throughout the activity.</span>
                        </button>
                        <button type="button" className={`co-safe${formData.verificationSafety.safety.lawfulNoHazards ? " on" : ""}`} onClick={() => setFormData({ ...formData, verificationSafety: { ...formData.verificationSafety, safety: { ...formData.verificationSafety.safety, lawfulNoHazards: !formData.verificationSafety.safety.lawfulNoHazards } } })}>
                            <span className="co-tick">{formData.verificationSafety.safety.lawfulNoHazards ? "✓" : ""}</span>
                            <span>Activities are lawful and free from hazardous elements.</span>
                        </button>
                        <button type="button" className={`co-safe${formData.verificationSafety.safety.basicEmergencyMeasures ? " on" : ""}`} onClick={() => setFormData({ ...formData, verificationSafety: { ...formData.verificationSafety, safety: { ...formData.verificationSafety.safety, basicEmergencyMeasures: !formData.verificationSafety.safety.basicEmergencyMeasures } } })}>
                            <span className="co-tick">{formData.verificationSafety.safety.basicEmergencyMeasures ? "✓" : ""}</span>
                            <span>Basic safety and emergency measures are in place.</span>
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
                                placeholder={orgDetails.focalPerson.name || "Your full name"}
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
                        { key: "genuineAccurate" as const, label: "The opportunity is genuine and accurately described." },
                        { key: "orgResponsibleExecution" as const, label: "The organization is responsible for execution and supervision." },
                        { key: "environmentSafe" as const, label: "The activity environment is safe and appropriate for students." },
                        { key: "informationVerifiable" as const, label: "All information provided is correct and verifiable." },
                    ] as const
                ).map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        className={`co-confirm${formData.verificationSafety.submissionConfirmations[key] ? " on" : ""}`}
                        onClick={() =>
                            setFormData({
                                ...formData,
                                verificationSafety: {
                                    ...formData.verificationSafety,
                                    submissionConfirmations: {
                                        ...formData.verificationSafety.submissionConfirmations,
                                        [key]: !formData.verificationSafety.submissionConfirmations[key],
                                    },
                                },
                            })
                        }
                    >
                        <span className="co-tick">{formData.verificationSafety.submissionConfirmations[key] ? "✓" : ""}</span>
                        <span>{label}</span>
                    </button>
                ))}
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <span className="co-locked" style={{ background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.25)", color: "#fff" }}>
                        🤝 <b style={{ color: "#fff" }}>{orgDetails.organizationName || "—"}</b><span className="co-lock-badge">🔒</span>
                    </span>
                    <span className="co-locked" style={{ background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.25)", color: "#fff" }}>
                        📍 {orgDetails.city || "—"}<span className="co-lock-badge">🔒</span>
                    </span>
                </div>
                <div className="mt-3.5 flex gap-2.5">
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="flex-1 rounded-[13px] border border-white/30 bg-transparent py-3 text-xs font-extrabold text-[#d9f7f2] disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        💾 Save draft
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-[2] rounded-[13px] bg-[linear-gradient(90deg,#0e7d74,#2dd4bf)] py-3 text-[13px] font-extrabold text-white disabled:opacity-70"
                    >
                        {isSubmitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : null}
                        {isSubmitting ? "Submitting..." : "🚀 Submit opportunity"}
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
