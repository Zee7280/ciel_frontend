"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Info, MapPin, Calendar, Clock, CheckCircle, Circle, AlertCircle, ChevronDown, ChevronUp, Users, Loader2, Plus, X } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import {
    ACTIVITY_TYPE_EMOJI,
    BENEFICIARY_EMOJI,
    CoChip,
    CoFormHero,
    CoLivePreview,
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
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import { composeInternationalPhone, DEFAULT_PHONE_COUNTRY_KEY } from "@/utils/countryCallingCodes";

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
        opportunityType: [] as string[],
        isOtherTypeChecked: false,
        otherTypeSpecs: [""] as string[],
        mode: "", // on-site, remote, hybrid
        location: { city: "", venue: "", pin: "" },
        timelineType: "", // fixed, flexible, ongoing
        dates: { start: "", end: "", fromTime: "", endTime: "" },
        capacity: { hours: "", volunteers: "" },

        // Section C
        sdg: "",
        target: "",
        indicator: "",
        secondarySdgs: [] as { sdgId: string, targetId: string, indicatorId: string, justification: string }[],

        // Section D
        objectives: {
            description: "",
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
            representativeName: "",
            designation: "",
            officialEmail: "",
        },

        // Section G
        verification: [] as string[],
        isOtherVerificationChecked: false,
        otherVerification: "",

        // Section H
        visibility: "public", // 'public' or 'restricted'
        restrictedUniversities: [] as string[],
    });

    const validateForm = () => {
        if (!formData.title.trim()) {
            toast.error("Please enter an Opportunity Title (Section B)");
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
                toast.error("Please enter a City/Area (Section B)");
                return false;
            }
            if (!formData.location.venue.trim()) {
                toast.error("Please enter an Exact Venue (Section B)");
                return false;
            }
        }
        if (!formData.timelineType) {
            toast.error("Please select a Timeline Type (Section B)");
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

        // Section D
        if (!formData.objectives.description.trim()) {
            toast.error("Please enter Project Objectives (Section D)");
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
                toast.error("Please enter Partner Organization Name (Section F2)");
                return false;
            }
            if (!vs.partnerOrg.contactPerson.trim()) {
                toast.error("Please enter Partner Contact Person Name (Section F2)");
                return false;
            }
            if (!vs.partnerOrg.officialEmail.trim() || !isValidEmail(vs.partnerOrg.officialEmail)) {
                toast.error("Please enter a valid official email for the partner organization (Section F2)");
                return false;
            }
        }
        if (!vs.safety.siteSafeSuitable || !vs.safety.lawfulNoHazards || !vs.safety.supervisedThroughout || !vs.safety.basicEmergencyMeasures) {
            toast.error("Please confirm all safety & supervision declarations (Section F3)");
            return false;
        }
        if (
            !vs.submissionConfirmations.genuineAccurate ||
            !vs.submissionConfirmations.orgResponsibleExecution ||
            !vs.submissionConfirmations.environmentSafe ||
            !vs.submissionConfirmations.informationVerifiable
        ) {
            toast.error("Please confirm all required statements before submitting (Section F6)");
            return false;
        }

        // Section H (+ F5 academic linkage when restricted)
        if (formData.visibility === 'restricted') {
            if (formData.restrictedUniversities.length === 0) {
                toast.error("Please select at least one university for restricted visibility (Section H)");
                return false;
            }
            const fl = formData.restrictedFacultyLinkage;
            if (!fl.representativeName.trim()) {
                toast.error("Please enter Faculty / Institutional Representative Name (Section H — restricted visibility)");
                return false;
            }
            if (!fl.designation.trim()) {
                toast.error("Please enter Representative Designation (Section H — restricted visibility)");
                return false;
            }
            if (!fl.officialEmail.trim() || !isValidEmail(fl.officialEmail)) {
                toast.error("Please enter a valid official email for the institutional representative (Section H)");
                return false;
            }
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
                },
                // Legacy shape — keep for older backends; mirrors executing-org contact + safety flags
                supervision: {
                    supervisor_name: formData.verificationSafety.executingOrg.contactPersonName.trim(),
                    role: "Executing organization — official contact",
                    contact: formData.verificationSafety.executingOrg.officialEmail.trim(),
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
                },
                partner_organization: formData.verificationSafety.partnerOrg.hasPartner
                    ? {
                        organization_name: formData.verificationSafety.partnerOrg.orgName.trim(),
                        contact_person_name: formData.verificationSafety.partnerOrg.contactPerson.trim(),
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
                    visibility_type:
                        formData.visibility === "restricted"
                            ? "restricted_universities"
                            : "open_all_universities",
                    restricted_university_names:
                        formData.visibility === "restricted" ? formData.restrictedUniversities : [],
                    faculty_institutional_representative:
                        formData.visibility === "restricted"
                            ? {
                                name: formData.restrictedFacultyLinkage.representativeName.trim(),
                                designation: formData.restrictedFacultyLinkage.designation.trim(),
                                official_email: formData.restrictedFacultyLinkage.officialEmail.trim(),
                            }
                            : null,
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
                visibility: formData.visibility,
                restricted_universities: formData.visibility === 'restricted' ? formData.restrictedUniversities : null
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

    const [activeSection, setActiveSection] = useState("A");

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

    return (
        <div className="co-form">
            <CoFormHero
                crumb={
                    <>
                        Community Service → <b className="text-[#0e7d74]">Create an Opportunity</b>
                    </>
                }
                backHref="/dashboard/partner/community-service"
                kicker="CREATE PARTNER OPPORTUNITY · SDG-ALIGNED"
                title="Work with students — let’s build it 🚀"
                subtitle="Same form as students and faculty. Your organization is already filled. Submit still goes through the existing partner review flow."
            />

            {/* SECTION A: ORGANIZATION DETAILS */}
            <div className="co-card">
                <CoSectionHead letter="A" title="Organization details" tag="✅ FROM YOUR PROFILE — NOTHING TO TYPE" tagAuto color="#0d2b33" />
                {isLoadingProfile ? (
                    <div className="py-4 text-center text-[#7a919a]">
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading details...
                    </div>
                ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                        <span className="co-locked">🤝 <b>{orgDetails.organizationName || "—"}</b><span className="co-lock-badge">🔒</span></span>
                        {orgDetails.organizationType ? <span className="co-locked">{orgDetails.organizationType}</span> : null}
                        {orgDetails.city ? <span className="co-locked">📍 {orgDetails.city}</span> : null}
                        {orgDetails.focalPerson.name ? <span className="co-locked">👤 {orgDetails.focalPerson.name}</span> : null}
                        {orgDetails.focalPerson.contact ? <span className="co-locked">📱 {orgDetails.focalPerson.contact}</span> : null}
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

                    {/* B5. Timeline */}
                    <div className="pt-6 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-900 mb-4">B5. Duration & Commitment <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Timeline Type</label>
                                <div className="co-chips mb-4">
                                    {(["Fixed dates", "Flexible", "Ongoing"] as const).map((t) => (
                                        <CoChip key={t} selected={formData.timelineType === t} onClick={() => setFormData({ ...formData, timelineType: t })}>
                                            {TIMELINE_EMOJI[t]} {t}
                                        </CoChip>
                                    ))}
                                </div>

                                {(TIMELINES_WITH_SCHEDULE_UI as readonly string[]).includes(formData.timelineType) && (
                                    <div className="space-y-3 animate-in fade-in zoom-in-95">
                                        <p className="text-xs text-slate-500">
                                            Start/end dates and daily times are optional for all timeline types.
                                        </p>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                                value={formData.dates.start}
                                                onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, start: e.target.value } })}
                                            />
                                            <span className="self-center text-slate-400">-</span>
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                                value={formData.dates.end}
                                                onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, end: e.target.value } })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-center">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">From time</label>
                                                <input
                                                    type="time"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                    value={formData.dates.fromTime}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            dates: { ...formData.dates, fromTime: e.target.value },
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">To time</label>
                                                <input
                                                    type="time"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                    value={formData.dates.endTime}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            dates: { ...formData.dates, endTime: e.target.value },
                                                        })
                                                    }
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
                                            placeholder="Min 16 hours"
                                            value={formData.capacity.hours}
                                            onChange={(e) => setFormData({ ...formData, capacity: { ...formData.capacity, hours: e.target.value } })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Volunteers Required</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                            placeholder="e.g. 15"
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
            <div className="co-card co-accent" style={{ borderTopColor: "#6d28d9" }}>
                <CoSectionHead
                    letter="C"
                    title="SDG selection"
                    tag="LOCKED FOR STUDENTS"
                    color="#6d28d9"
                    expanded={expandedSections.includes("C")}
                    onToggle={() => toggleSection("C")}
                />

                <div className={`space-y-6 p-5 sm:p-8 ${!expandedSections.includes('C') ? 'hidden' : ''}`}>
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
            {/* SECTION D: SDG ALIGNED OBJECTIVES */}
            <div className="co-card co-accent" style={{ borderTopColor: "#0e7d74" }}>
                <CoSectionHead
                    letter="D"
                    title="SDG-aligned objectives"
                    tag="LOCAL ACTION"
                    color="#0e7d74"
                    expanded={expandedSections.includes("D")}
                    onToggle={() => toggleSection("D")}
                />

                <div className={`space-y-6 p-5 sm:p-8 ${!expandedSections.includes('D') ? 'hidden' : ''}`}>
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

            {/* SECTION E: ACTIVITY DETAILS */}
            <div className="co-card co-accent" style={{ borderTopColor: "#6d28d9" }}>
                <CoSectionHead
                    letter="E"
                    title="Activity details"
                    tag="WHAT STUDENTS DO"
                    color="#6d28d9"
                    expanded={expandedSections.includes("E")}
                    onToggle={() => toggleSection("E")}
                />

                <div className={`space-y-6 p-5 sm:p-8 ${!expandedSections.includes('E') ? 'hidden' : ''}`}>
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
                </div>
            </div>

            {/* SECTION F: VERIFICATION & SAFETY (NGO / CORPORATE) */}
            <div className="co-card co-accent" style={{ borderTopColor: "#b45309" }}>
                <CoSectionHead
                    letter="F"
                    title="Verification & safety"
                    tag="EXECUTING ORG"
                    color="#b45309"
                    expanded={expandedSections.includes("F")}
                    onToggle={() => toggleSection("F")}
                />
                <div className={`space-y-8 p-5 sm:p-8 ${!expandedSections.includes('F') ? 'hidden' : ''}`}>
                    <p className="text-sm text-slate-600">
                        The organization posting this opportunity is the <strong>Executing Organization</strong>. This section establishes accountability, verification, and a safe environment for students.
                    </p>

                    {/* F1 */}
                    <div className="rounded-xl border border-slate-200 p-6 space-y-4">
                        <h3 className="text-sm font-black text-orange-700 uppercase tracking-wide">F1. Executing organization verification (required)</h3>
                        <p className="text-xs text-slate-500">
                            Organization name is taken from your registered profile (Section A). A verification email will be sent to the official email below. The opportunity will not become active until that step is completed.
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

                    {/* F2 */}
                    <div className="rounded-xl border border-slate-200 p-6 space-y-4">
                        <h3 className="text-sm font-black text-orange-700 uppercase tracking-wide">F2. Additional partner organization (optional)</h3>
                        <p className="text-xs text-slate-500">If another organization collaborates on this activity, you may record their details. Partner verification does not block activation.</p>
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 animate-in fade-in duration-200">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Partner organization name <span className="text-red-500">*</span></label>
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
                            </div>
                        )}
                    </div>

                    {/* F3 */}
                    <div className="rounded-xl border border-slate-200 p-6 space-y-4">
                        <h3 className="text-sm font-black text-orange-700 uppercase tracking-wide">F3. Safety & supervision declaration (required)</h3>
                        <p className="text-sm text-slate-600">The Executing Organization confirms that:</p>
                        <div className="space-y-3">
                            {(
                                [
                                    {
                                        key: "siteSafeSuitable" as const,
                                        label: "The activity site is safe and suitable for student participation",
                                    },
                                    {
                                        key: "lawfulNoHazards" as const,
                                        label: "Activities are lawful and free from hazardous elements",
                                    },
                                    {
                                        key: "supervisedThroughout" as const,
                                        label: "Students will be properly supervised throughout the activity",
                                    },
                                    {
                                        key: "basicEmergencyMeasures" as const,
                                        label: "Basic safety and emergency measures are in place",
                                    },
                                ] as const
                            ).map(({ key, label }) => (
                                <label key={key} className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="mt-1 rounded text-orange-600 focus:ring-orange-500"
                                        checked={formData.verificationSafety.safety[key]}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                verificationSafety: {
                                                    ...formData.verificationSafety,
                                                    safety: {
                                                        ...formData.verificationSafety.safety,
                                                        [key]: e.target.checked,
                                                    },
                                                },
                                            })
                                        }
                                    />
                                    <span className="text-sm text-slate-800">{label}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-slate-600 border-t border-slate-100 pt-4">
                            <strong>Responsibility:</strong> All on-ground execution, supervision, and participant safety remain the responsibility of the Executing Organization.
                        </p>
                    </div>

                    {/* F4 */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-6 space-y-2">
                        <h3 className="text-sm font-black text-blue-800 uppercase tracking-wide">F4. Admin approval (platform validation)</h3>
                        <p className="text-sm text-blue-900/90">
                            CIEL Admin will review this opportunity for realistic scope, SDG alignment, accuracy, and ethical engagement. Platform approval supports quality standards and does not replace field responsibility by the Executing Organization.
                        </p>
                    </div>

                    {/* F5 note — inputs live in Section H with visibility */}
                    <div className="rounded-xl border border-dashed border-slate-300 p-5 bg-slate-50">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-1">F5. Visibility & academic linkage</h3>
                        <p className="text-xs text-slate-600">
                            Configure visibility in <strong>Section H</strong>. If you choose restricted universities, you will provide faculty / institutional representative details there for academic supervision and controlled access.
                        </p>
                    </div>

                    {/* F6 */}
                    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-6 space-y-3">
                        <h3 className="text-sm font-black text-orange-800 uppercase tracking-wide flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-orange-600" /> F6. Required confirmations
                        </h3>
                        <p className="text-xs text-slate-600">By submitting, the Executing Organization confirms that:</p>
                        {(
                            [
                                {
                                    key: "genuineAccurate" as const,
                                    label: "The opportunity is genuine and accurately described",
                                },
                                {
                                    key: "orgResponsibleExecution" as const,
                                    label: "The organization is responsible for execution and supervision",
                                },
                                {
                                    key: "environmentSafe" as const,
                                    label: "The activity environment is safe and appropriate for students",
                                },
                                {
                                    key: "informationVerifiable" as const,
                                    label: "All information provided is correct and verifiable",
                                },
                            ] as const
                        ).map(({ key, label }) => (
                            <label key={key} className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mt-1 rounded text-orange-600 focus:ring-orange-500"
                                    checked={formData.verificationSafety.submissionConfirmations[key]}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            verificationSafety: {
                                                ...formData.verificationSafety,
                                                submissionConfirmations: {
                                                    ...formData.verificationSafety.submissionConfirmations,
                                                    [key]: e.target.checked,
                                                },
                                            },
                                        })
                                    }
                                />
                                <span className="text-sm font-medium text-orange-950">{label}</span>
                            </label>
                        ))}
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900 text-slate-100 p-5 text-sm space-y-2">
                        <p className="font-bold text-white flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-400" /> Activation rule
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-300 text-xs">
                            <li>
                                If you add an <strong>additional partner organization (F2)</strong>, the official executing-organization contact must sign in and confirm execution on the opportunity detail page before admin approval. Otherwise only CIEL admin approval applies (plus F3 confirmations).
                            </li>
                            <li>Partner details (F2) and faculty linkage (Section H, when restricted) are not required for activation.</li>
                        </ul>
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
                <div className={`space-y-6 p-5 sm:p-8 ${!expandedSections.includes('G') ? 'hidden' : ''}`}>
                    <label className="co-label">G1 · How will student participation be verified?</label>
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

            {/* SECTION H: VISIBILITY */}
            <div className="co-card co-accent" style={{ borderTopColor: "#db2777" }}>
                <CoSectionHead
                    letter="H"
                    title="Visibility"
                    tag="WHO CAN JOIN"
                    color="#db2777"
                    expanded={expandedSections.includes("H")}
                    onToggle={() => toggleSection("H")}
                />
                <div className={`space-y-4 p-5 sm:p-8 ${!expandedSections.includes('H') ? 'hidden' : ''}`}>
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                        <input
                            type="radio"
                            name="visibility"
                            className="w-5 h-5 text-pink-600"
                            checked={formData.visibility === 'public'}
                            onChange={() => setFormData({ ...formData, visibility: 'public' })}
                        />
                        <div>
                            <span className="block font-bold text-slate-900">Open to all universities</span>
                            <span className="text-xs text-slate-500">Visible to all registered students on Ciel</span>
                        </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                        <input
                            type="radio"
                            name="visibility"
                            className="w-5 h-5 text-pink-600"
                            checked={formData.visibility === 'restricted'}
                            onChange={() => setFormData({ ...formData, visibility: 'restricted' })}
                        />
                        <div>
                            <span className="block font-bold text-slate-900">Restricted</span>
                            <span className="text-xs text-slate-500">Only visible to specific universities (e.g. for MoUs)</span>
                        </div>
                    </label>

                    {formData.visibility === 'restricted' && (
                        <div className="p-6 bg-pink-50 rounded-2xl border border-pink-100 space-y-6 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-4">
                                <label className="block text-xs font-black text-pink-600 uppercase tracking-widest">H1. Select target universities</label>
                                <p className="text-xs text-slate-600">Restricted visibility (Section F5): only students from these institutions see the opportunity.</p>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-sm font-bold bg-white"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val && !formData.restrictedUniversities.includes(val)) {
                                            setFormData({
                                                ...formData,
                                                restrictedUniversities: [...formData.restrictedUniversities, val]
                                            });
                                        }
                                        e.target.value = "";
                                    }}
                                >
                                    <option value="">Add University...</option>
                                    {pakistaniUniversities
                                        .filter(u => !formData.restrictedUniversities.includes(u))
                                        .map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                </select>

                                <div className="flex flex-wrap gap-2">
                                    {formData.restrictedUniversities.map(u => (
                                        <div key={u} className="bg-white px-3 py-1.5 rounded-lg border border-pink-200 flex items-center gap-2 shadow-sm animate-in zoom-in-95">
                                            <span className="text-xs font-bold text-slate-700 max-w-[240px] truncate">{u}</span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    restrictedUniversities: formData.restrictedUniversities.filter(item => item !== u)
                                                })}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.restrictedUniversities.length === 0 && (
                                        <p className="text-xs text-pink-400 italic font-medium">No universities selected yet.</p>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-pink-200 pt-6 space-y-4">
                                <label className="block text-xs font-black text-pink-600 uppercase tracking-widest">H2. Faculty / institutional representative (required if restricted)</label>
                                <p className="text-xs text-slate-600">Supports academic supervision, credit mapping, and MoU-style programs.</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-sm bg-white"
                                            value={formData.restrictedFacultyLinkage.representativeName}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    restrictedFacultyLinkage: {
                                                        ...formData.restrictedFacultyLinkage,
                                                        representativeName: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Designation <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-sm bg-white"
                                            value={formData.restrictedFacultyLinkage.designation}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    restrictedFacultyLinkage: {
                                                        ...formData.restrictedFacultyLinkage,
                                                        designation: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Official email <span className="text-red-500">*</span></label>
                                        <input
                                            type="email"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-sm bg-white"
                                            value={formData.restrictedFacultyLinkage.officialEmail}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    restrictedFacultyLinkage: {
                                                        ...formData.restrictedFacultyLinkage,
                                                        officialEmail: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* SECTION I: SUBMIT */}
            <div className="co-final mb-3 rounded-[20px] bg-[#0d2b33] p-5 text-white">
                <div className="mb-1 flex items-center gap-2.5">
                    <span className="flex h-[26px] min-w-[28px] items-center justify-center rounded-[9px] bg-[#2dd4bf] px-2 text-[11px] font-extrabold text-[#04252b]">✓</span>
                    <h2 className="text-[14.5px] font-extrabold text-white">Before you submit</h2>
                </div>
                <p className="mb-2 text-[11px] leading-relaxed text-[#a5e8de]">
                    Confirmations live in Section F. Submit still goes to admin review — extra partner (F2) still confirms on the existing detail page first.
                </p>
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

            <CoLivePreview
                emoji={previewEmoji}
                title={formData.title}
                bits={previewBits}
                sdgs={
                    <>
                        {previewPrimarySdg ? (
                            <span className="co-sdg" style={{ background: previewPrimarySdg.color ?? "#0e7d74" }}>
                                SDG {previewPrimarySdg.number}
                                {formData.target ? ` · ${formData.target}` : ""}
                            </span>
                        ) : null}
                        {previewSecondarySdg ? (
                            <span className="co-sdg" style={{ background: previewSecondarySdg.color ?? "#6d28d9" }}>
                                SDG {previewSecondarySdg.number}
                            </span>
                        ) : null}
                    </>
                }
            />
        </div>
    );
}
