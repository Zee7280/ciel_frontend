"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Info, MapPin, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Users, Loader2, Plus } from "lucide-react";
import { X } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { findSdgById, opportunityFormSdgList } from "@/utils/sdgData";
import { pakistaniUniversities } from "@/utils/universityData";
import { isFacultyProfileComplete, pickProfileEmail } from "@/utils/profileCompletion";
import { mapOpportunityDetailToFacultyForm } from "./mapDetailToForm";

const LocationPicker = dynamic(() => import("@/components/ui/LocationPicker"), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-slate-400">Loading Map...</div>
});

/** Timeline modes that collect start/end date + optional daily from/to time (sent as timeline.* on create). */
/** Optional schedule fields for these timeline types. */
const TIMELINES_WITH_SCHEDULE_UI = ["Fixed dates", "Flexible", "Ongoing"] as const;

/** F5.1 participation scope (faculty-created opportunity). */
type ParticipationRule =
    | "open_all_universities"
    | "restricted_specific_universities"
    | "own_university_only"
    | "departments_across_universities"
    | "own_university_departments";

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
            otherBeneficiarySpecs: [""] as string[]
        },

        // Section E
        activity: {
            responsibilities: "",
            skills: [] as string[],
            isOtherSkillChecked: false,
            otherSkills: [""] as string[]
        },

        // Section F — Verification & safety (faculty academic lead)
        academicLead: {
            designation: "",
            department: "",
            officialEmail: "",
        },
        partnerCollaboration: {
            hasPartner: false,
            orgName: "",
            contactPerson: "",
            email: "",
        },
        safetyDeclarations: {
            safeAppropriate: false,
            guidedSupervised: false,
            lawfulEthical: false,
            precautionsInPlace: false,
        },

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
            toast.error("Please enter an Opportunity Title (Section B)");
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
        for (let i = 0; i < formData.secondarySdgs.length; i++) {
            const s = formData.secondarySdgs[i];
            if (s.sdgId && !s.targetId.trim()) {
                toast.error(`Please select a target for Secondary SDG ${i + 1} (Section C)`);
                return false;
            }
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
            toast.error("Please enter your designation and department (Section F — F1)");
            return false;
        }
        if (!formData.academicLead.officialEmail.trim() || !isValidEmail(formData.academicLead.officialEmail)) {
            toast.error("Please enter a valid official email address (Section F — F1)");
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

        // Section F3 — Safety & supervision declaration
        const sd = formData.safetyDeclarations;
        if (!sd.safeAppropriate || !sd.guidedSupervised || !sd.lawfulEthical || !sd.precautionsInPlace) {
            toast.error("Please confirm all items in Safety & Supervision Declaration (Section F — F3)");
            return false;
        }

        // Section H — F5 participation scope
        const rule = formData.participationScope.rule;
        const ownUni = facultyDetails.institution.trim();
        if (rule === "restricted_specific_universities" || rule === "departments_across_universities") {
            if (formData.participationScope.selectedUniversities.length === 0) {
                toast.error("Please add at least one university (Section H — F5.1)");
                return false;
            }
        }
        if (rule === "own_university_only" || rule === "own_university_departments") {
            if (!ownUni) {
                toast.error("Your university is not set in your profile; complete Section A first (Section H — F5.1)");
                return false;
            }
        }
        if (rule === "departments_across_universities" || rule === "own_university_departments") {
            const deps = formData.participationScope.departments.map((d) => d.trim()).filter(Boolean);
            if (deps.length === 0) {
                toast.error("Please add at least one department or program (Section H — F5.1)");
                return false;
            }
        }

        // Section I — F6 required confirmations
        const fc = formData.finalConfirmations;
        if (!fc.academicallyValid || !fc.properlySupervised || !fc.safeEnvironment || !fc.correctVerifiable) {
            toast.error("Please accept all required confirmations (Section I — F6)");
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

            const participationRule = formData.participationScope.rule;
            const ownInstitution = facultyDetails.institution.trim();
            const selectedUnis = formData.participationScope.selectedUniversities;
            const deptList = formData.participationScope.departments.map((d) => d.trim()).filter(Boolean);
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
                    beneficiaries_type: otherBeneficiaryMerged
                },
                activity_details: {
                    student_responsibilities: formData.activity.responsibilities,
                    skills_gained: skillsPayload
                },
                supervision: {
                    supervisor_name: facultyDetails.name.trim(),
                    role: formData.academicLead.designation.trim(),
                    contact: formData.academicLead.officialEmail.trim(),
                    faculty_department: formData.academicLead.department.trim(),
                    faculty_university_name: ownInstitution,
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
                restricted_universities: visibility === "restricted" ? restrictedUniversitiesPayload : null
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
                    toast.success(isEdit ? "Opportunity updated successfully!" : "Opportunity created successfully!");
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
        // For now, treat draft as a submit but maybe with a 'draft' status if supported later.
        // The user just wants it to work.
        handleSubmit();
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

    return (
        <div className="max-w-8xl mx-auto p-4 space-y-4 pb-24">
            <div className="mb-4">
                <h1 className="text-3xl font-bold text-slate-900">
                    {editingOpportunityId ? "Edit faculty opportunity" : "Create Faculty Opportunity"}
                </h1>
                <p className="text-slate-500">
                    {editingOpportunityId
                        ? "Update your posting. Some fields may be restricted after approval."
                        : "Post an SDG-aligned opportunity for students (same workflow as partner postings)."}
                </p>
                {isLoadingEdit ? (
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading opportunity…
                    </div>
                ) : null}
            </div>

            {/* SECTION A: FACULTY DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Section A: Faculty Details
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">From your profile (read-only). Update under My Profile if needed.</p>
                    </div>
                    {isLoadingProfile ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75 pointer-events-none grayscale-[0.5]">
                    {isLoadingProfile ? (
                        <div className="col-span-2 text-center py-4 text-slate-400">Loading your details...</div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Faculty name</label>
                                <input type="text" value={facultyDetails.name} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Institution</label>
                                <input type="text" value={facultyDetails.institution} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">City</label>
                                <input type="text" value={facultyDetails.city} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact <span className="text-red-500">*</span></label>
                                <input type="text" value={facultyDetails.contact} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
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
                            Section B: Opportunity overview
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 pl-8">Basic details about the activity and commitment.</p>
                    </div>
                    <div onClick={() => toggleSection("B")}>
                        {expandedSections.includes('B') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                </div>

                <div className="p-8 space-y-8">
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
                        <label className="block text-sm font-bold text-slate-900 mb-3">B2. Opportunity Type <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {["Community Service", "Volunteer Activity", "Awareness Campaign", "Training / Teaching", "Research / Survey Support", "Technical / Professional Support", "Environmental Action", "Corporate CSR Activity"].map(type => (
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
                        </div>
                        <div className="mt-3">
                            <label className={`flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer w-full md:w-1/3 mb-2 transition-all ${formData.isOtherTypeChecked ? 'bg-blue-50 border-blue-200' : 'border-slate-100'}`}>
                                <input
                                    type="checkbox"
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                    checked={formData.isOtherTypeChecked}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            isOtherTypeChecked: e.target.checked,
                                            ...(e.target.checked ? {} : { otherTypeSpecs: [""] }),
                                        })
                                    }
                                />
                                <span className={`text-sm font-medium ${formData.isOtherTypeChecked ? 'text-blue-700' : 'text-slate-600'}`}>Other</span>
                            </label>
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
                                            <span className="text-xs text-slate-500">
                                                {m === 'On site' && 'Fieldwork, training, camps'}
                                                {m === 'Remote' && 'Data analysis, content, research'}
                                                {m === 'Hybrid' && 'Planning online + field execution'}
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* B4. Location */}
                        {(formData.mode === 'On site' || formData.mode === 'Hybrid') && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <label className="block text-sm font-bold text-slate-900 mb-3">B4. Location Details <span className="text-red-500">*</span></label>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="City / Area (e.g. Lahore, Township)"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm"
                                            value={formData.location.city}
                                            onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })}
                                        />
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
                                                onChange={(e) =>
                                                    setFormData({ ...formData, dates: { ...formData.dates, start: e.target.value } })
                                                }
                                            />
                                            <span className="self-center text-slate-400">-</span>
                                            <input
                                                type="date"
                                                className="flex-1 min-w-[140px] px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                value={formData.dates.end}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, dates: { ...formData.dates, end: e.target.value } })
                                                }
                                            />
                                        </div>
                                        <div className="flex gap-2 flex-wrap items-center">
                                            <div className="flex-1 min-w-[140px]">
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
                                            <div className="flex-1 min-w-[140px]">
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
                        <p className="text-xs text-slate-500 mt-1 pl-8">Critical Linkage (Locked for students)</p>
                    </div>
                    {expandedSections.includes('C') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>

                <div className={`p-8 space-y-6 ${!expandedSections.includes('C') ? 'hidden' : ''}`}>
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
                                                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
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
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Select Target</label>
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
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Select Indicator</label>
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
            {/* SECTION D: SDG ALIGNED OBJECTIVES */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 ${expandedSections.includes('D') ? 'border-teal-500 shadow-xl ring-1 ring-teal-500' : 'border-slate-200 shadow-sm'}`}>
                <div
                    className="p-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSection("D")}
                >
                    <div>
                        <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('D') ? 'text-teal-600' : 'text-slate-800'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('D') ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>D</div>
                            Section D: SDG Aligned Objectives
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 pl-8">Translate global SDGs into clear local action.</p>
                    </div>
                    {expandedSections.includes('D') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>

                <div className={`p-8 space-y-6 ${!expandedSections.includes('D') ? 'hidden' : ''}`}>
                    {/* D1. Project Objective */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">D1. Project Objective <span className="text-red-500">*</span></label>
                        <textarea
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
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Type of Beneficiaries</label>
                                <div className="h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 space-y-2">
                                    {["Children", "Youth", "Women", "Elderly", "Persons with disabilities", "Students", "Community members"].map(b => (
                                        <label key={b} className="flex items-center gap-2 text-sm text-slate-600">
                                            <input
                                                type="checkbox"
                                                className="rounded text-teal-600 focus:ring-teal-500"
                                                checked={formData.objectives.beneficiariesType.includes(b)}
                                                onChange={() => {
                                                    const types = formData.objectives.beneficiariesType.includes(b)
                                                        ? formData.objectives.beneficiariesType.filter(t => t !== b)
                                                        : [...formData.objectives.beneficiariesType, b];
                                                    setFormData({ ...formData, objectives: { ...formData.objectives, beneficiariesType: types } });
                                                }}
                                            /> {b}
                                        </label>
                                    ))}
                               
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
                                </div>
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
                        <p className="text-xs text-slate-500 mt-1 pl-8">What students will actually do.</p>
                    </div>
                    {expandedSections.includes('E') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>

                <div className={`p-8 space-y-6 ${!expandedSections.includes('E') ? 'hidden' : ''}`}>
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">E1. Student Responsibilities (Bullet List) <span className="text-red-500">*</span></label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium h-32"
                            placeholder="• Conduct survey..."
                            value={formData.activity.responsibilities}
                            onChange={(e) => setFormData({ ...formData, activity: { ...formData.activity, responsibilities: e.target.value } })}
                        ></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">E2. Skills Gained</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {["Leadership", "Communication", "Teaching", "Teamwork", "Digital Skills", "Research", "Problem Solving"].map(s => (
                                <label key={s} className="flex items-center gap-2 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                        checked={formData.activity.skills.includes(s)}
                                        onChange={() => {
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
                </div>
            </div>

            {/* SECTION F: VERIFICATION & SAFETY (FACULTY-CREATED) */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 ${expandedSections.includes('F') ? 'border-orange-500 shadow-xl ring-1 ring-orange-500' : 'border-slate-200 shadow-sm'}`}>
                <div
                    className="p-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSection("F")}
                >
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('F') ? 'text-orange-600' : 'text-slate-800'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('F') ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>F</div>
                        Section F — Verification &amp; Safety
                    </h2>
                    {expandedSections.includes('F') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
                <div className={`p-8 space-y-10 ${!expandedSections.includes('F') ? 'hidden' : ''}`}>
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

                    {/* F3 */}
                    <div className="space-y-4 border-t border-slate-100 pt-8">
                        <h3 className="text-sm font-black text-orange-700 uppercase tracking-wide">F3. Safety &amp; supervision declaration (mandatory)</h3>
                        <p className="text-xs text-slate-600 mb-2">
                            Responsibility: you hold responsibility for academic supervision and oversight. If a partner organization is involved, operational safety is shared accordingly.
                        </p>
                        <div className="space-y-3 bg-orange-50 p-6 rounded-xl border border-orange-100">
                            {(
                                [
                                    {
                                        key: "safeAppropriate" as const,
                                        label:
                                            "The activity environment is safe and appropriate for student participation.",
                                    },
                                    {
                                        key: "guidedSupervised" as const,
                                        label: "Students will be guided and supervised throughout the activity.",
                                    },
                                    {
                                        key: "lawfulEthical" as const,
                                        label: "Activities are lawful, ethical, and non-hazardous.",
                                    },
                                    {
                                        key: "precautionsInPlace" as const,
                                        label: "Necessary precautions and basic safety measures are in place.",
                                    },
                                ] as const
                            ).map(({ key, label }) => (
                                <label key={key} className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="mt-1 rounded text-orange-600 focus:ring-orange-500"
                                        checked={formData.safetyDeclarations[key]}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                safetyDeclarations: {
                                                    ...formData.safetyDeclarations,
                                                    [key]: e.target.checked,
                                                },
                                            })
                                        }
                                    />
                                    <span className="text-sm font-medium text-orange-950">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* F4 */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">F4. Admin approval (platform validation)</h3>
                        <p className="text-sm text-slate-600">
                            CIEL Admin will review this opportunity for clear scope and feasibility, alignment with SDGs and academic objectives, accuracy, and ethical engagement before it is published.
                        </p>
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
                        Section G: Verification
                    </h2>
                    {expandedSections.includes('G') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
                <div className={`p-8 space-y-6 ${!expandedSections.includes('G') ? 'hidden' : ''}`}>
                    <label className="block text-sm font-bold text-slate-900 mb-2">G1. How will student participation be verified?</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {["Attendance sheets", "Supervisor sign-off", "Photos of activities", "Assessment sheets", "Digital logs"].map(v => (
                            <label key={v} className="flex items-center gap-2 text-sm font-medium text-slate-700">
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

            {/* SECTION H: VISIBILITY & INSTITUTIONAL ACCESS (F5) */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 ${expandedSections.includes('H') ? 'border-pink-500 shadow-xl ring-1 ring-pink-500' : 'border-slate-200 shadow-sm'}`}>
                <div
                    className="p-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSection("H")}
                >
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('H') ? 'text-pink-600' : 'text-slate-800'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('H') ? 'bg-pink-600 text-white' : 'bg-slate-200 text-slate-600'}`}>H</div>
                        Section H — Visibility &amp; institutional access (F5)
                    </h2>
                    {expandedSections.includes('H') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
                <div className={`p-8 space-y-6 ${!expandedSections.includes('H') ? 'hidden' : ''}`}>
                    <div>
                        <h3 className="text-sm font-black text-pink-700 uppercase tracking-wide mb-1">F5.1 Participation scope</h3>
                        <p className="text-xs text-slate-500 mb-4">Select who can view and apply. One option required.</p>
                        <div className="space-y-3">
                            {(
                                [
                                    {
                                        rule: "open_all_universities" as ParticipationRule,
                                        title: "1. Open to all universities (default)",
                                        hint: "All universities are treated as in scope. Students from all universities and departments can apply.",
                                    },
                                    {
                                        rule: "restricted_specific_universities" as ParticipationRule,
                                        title: "2. Restricted to specific universities",
                                        hint: "Add universities. All departments within those universities can apply.",
                                    },
                                    {
                                        rule: "own_university_only" as ParticipationRule,
                                        title: "3. Restricted to own university only",
                                        hint: "Your university from your profile is locked. All departments within your university can apply.",
                                    },
                                    {
                                        rule: "departments_across_universities" as ParticipationRule,
                                        title: "4. Restricted to specific departments/programs (across universities)",
                                        hint: "Select universities, then departments/programs (filtered by your selection). Optional sections/classes.",
                                    },
                                    {
                                        rule: "own_university_departments" as ParticipationRule,
                                        title: "5. Restricted to departments/programs of own university",
                                        hint: "Your university is locked. Select departments/programs; optional sections/classes.",
                                    },
                                ] as const
                            ).map(({ rule, title, hint }) => (
                                <label
                                    key={rule}
                                    className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                                        formData.participationScope.rule === rule
                                            ? "border-pink-300 bg-pink-50/50"
                                            : "border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="participation_scope_faculty"
                                        className="w-5 h-5 text-pink-600 mt-0.5 shrink-0"
                                        checked={formData.participationScope.rule === rule}
                                        onChange={() =>
                                            setFormData({
                                                ...formData,
                                                participationScope: {
                                                    ...formData.participationScope,
                                                    rule,
                                                    ...(rule === "open_all_universities" ? { selectedUniversities: [] } : {}),
                                                },
                                            })
                                        }
                                    />
                                    <div>
                                        <span className="block font-bold text-slate-900 text-sm">{title}</span>
                                        <span className="text-xs text-slate-500">{hint}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
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
                                        setFormData({
                                            ...formData,
                                            participationScope: {
                                                ...formData.participationScope,
                                                selectedUniversities: [...formData.participationScope.selectedUniversities, val],
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

            {/* SECTION I: F6 REQUIRED CONFIRMATIONS */}
            <div className="bg-slate-900 rounded-2xl text-white p-8">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-400" /> Section I — Required confirmations (F6)
                </h2>
                <p className="text-sm text-slate-400 mb-6">By submitting, you confirm the following:</p>
                <div className="space-y-4">
                    {(
                        [
                            {
                                key: "academicallyValid" as const,
                                label: "The opportunity is academically valid and accurately described.",
                            },
                            {
                                key: "properlySupervised" as const,
                                label: "The activity will be properly supervised.",
                            },
                            {
                                key: "safeEnvironment" as const,
                                label: "The environment is safe and appropriate for students.",
                            },
                            {
                                key: "correctVerifiable" as const,
                                label: "All provided information is correct and verifiable.",
                            },
                        ] as const
                    ).map(({ key, label }) => (
                        <label key={key} className="flex items-start gap-4 cursor-pointer opacity-90 hover:opacity-100">
                            <input
                                type="checkbox"
                                className="mt-1 w-5 h-5 rounded border-slate-600 text-green-500 focus:ring-offset-slate-900 focus:ring-green-500 shrink-0"
                                checked={formData.finalConfirmations[key]}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        finalConfirmations: {
                                            ...formData.finalConfirmations,
                                            [key]: e.target.checked,
                                        },
                                    })
                                }
                            />
                            <span className="text-sm leading-relaxed">{label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 md:left-64 right-0 p-4 bg-white border-t border-slate-200 z-50 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button
                    type="button"
                    onClick={() => router.push("/dashboard/faculty")}
                    className="px-6 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2"
                >
                    <X className="w-4 h-4" /> Cancel
                </button>
                <button
                    onClick={handleSaveDraft}
                    className="px-6 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
                    disabled={isSubmitting}
                >
                    Save Draft
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isSubmitting ? "Submitting..." : "Submit Opportunity"}
                </button>
            </div>
        </div>
    );
}
