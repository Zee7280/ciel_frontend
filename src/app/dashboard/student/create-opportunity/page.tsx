"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Info, MapPin, Calendar, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Users, Loader2, X } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import dynamic from 'next/dynamic';
import { sdgData } from "@/utils/sdgData";

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('@/components/ui/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center text-slate-400">Loading Map...</div>
});

export default function StudentOpportunityCreationPage() {
    const router = useRouter();
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Student Details State
    const [studentDetails, setStudentDetails] = useState({
        name: "",
        institution: "",
        city: "",
        contact: ""
    });

    // Form State
    const [formData, setFormData] = useState({
        // Section B
        title: "",
        opportunityType: [] as string[],
        mode: "", // on-site, remote, hybrid
        location: { city: "", venue: "", pin: "" },
        timelineType: "", // fixed, flexible, ongoing
        dates: { start: "", end: "" },
        capacity: { hours: "", volunteers: "" },

        // Section C
        sdg: "",
        target: "",
        indicator: "",

        // Section D
        objectives: {
            description: "",
            beneficiariesCount: "",
            beneficiariesType: [] as string[]
        },

        // Section E
        activity: {
            responsibilities: "",
            skills: [] as string[],
            isOtherSkillChecked: false,
            otherSkill: ""
        },

        // Section F
        supervision: {
            name: "",
            role: "",
            contact: "",
            isHarmful: false,
            isSupervised: false
        },

        // Section G
        verification: [] as string[],

        // Section H
        visibility: "public" // 'public' or 'restricted'
    });

    const validateForm = () => {
        if (!formData.title.trim()) {
            toast.error("Please enter an Opportunity Title (Section B)");
            return false;
        }
        if (formData.opportunityType.length === 0) {
            toast.error("Please select at least one Opportunity Type (Section B)");
            return false;
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
        if (formData.timelineType === 'Fixed dates') {
            if (!formData.dates.start || !formData.dates.end) {
                toast.error("Please select both Start and End dates (Section B)");
                return false;
            }
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

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            // Transform state to match API Spec
            const payload = {
                title: formData.title,
                types: formData.opportunityType,
                mode: formData.mode,
                location: formData.mode === 'Remote' ? null : formData.location,
                timeline: {
                    type: formData.timelineType,
                    start_date: formData.dates.start,
                    end_date: formData.dates.end,
                    expected_hours: parseInt(formData.capacity.hours) || 0,
                    volunteers_required: parseInt(formData.capacity.volunteers) || 0
                },
                sdg_info: {
                    sdg_id: formData.sdg,
                    target_id: formData.target,
                    indicator_id: formData.indicator
                },
                objectives: {
                    description: formData.objectives.description,
                    beneficiaries_count: parseInt(formData.objectives.beneficiariesCount) || 0,
                    beneficiaries_type: formData.objectives.beneficiariesType
                },
                activity_details: {
                    student_responsibilities: formData.activity.responsibilities,
                    // Append `otherSkill` if checked and not empty
                    skills_gained: formData.activity.isOtherSkillChecked && formData.activity.otherSkill.trim()
                        ? [...formData.activity.skills, formData.activity.otherSkill.trim()]
                        : formData.activity.skills
                },
                supervision: {
                    supervisor_name: formData.supervision.name,
                    role: formData.supervision.role,
                    contact: formData.supervision.contact,
                    safe_environment: formData.supervision.isHarmful, // Logic check needed based on checkbox meaning
                    supervised: formData.supervision.isSupervised
                },
                verification_method: formData.verification,
                visibility: formData.visibility
            };

            // Use the NEW separate API endpoint for students
            const res = await authenticatedFetch(`/api/v1/student/opportunity`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                const data = await res.json();
                if (data.success || data.id || data.title) {
                    toast.success("Opportunity created successfully!");
                    router.push("/dashboard/students/projects"); // Redirect to projects list
                } else {
                    toast.error(data.message || "Failed to create opportunity");
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
                const storedUser = localStorage.getItem("ciel_user");
                let userId = null;
                if (storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        userId = parsedUser.id;
                    } catch (e) {
                        console.error("Failed to parse user from local storage");
                    }
                }

                const res = await authenticatedFetch(`/api/v1/user/me`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId: userId })
                });
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        const user = data.data;
                        setStudentDetails({
                            name: user.name,
                            institution: user.institution || "Student Initiative",
                            city: user.city || "Lahore",
                            contact: user.contact || ""
                        });
                    }
                } else {
                    // Fallback
                    setStudentDetails({
                        name: "Student Name",
                        institution: "University/College",
                        city: "City",
                        contact: ""
                    });
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchProfile();
    }, []);

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
                <h1 className="text-3xl font-bold text-slate-900">Create Student Opportunity</h1>
                <p className="text-slate-500">Create an SDG-aligned volunteer opportunity or project.</p>
            </div>

            {/* SECTION A: STUDENT DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Section A: Student Details
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Auto-filled from your profile</p>
                    </div>
                    {isLoadingProfile ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75 pointer-events-none grayscale-[0.5]">
                    {isLoadingProfile ? (
                        <div className="col-span-2 text-center py-4 text-slate-400">Loading details...</div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Student Name</label>
                                <input type="text" value={studentDetails.name} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Institution</label>
                                <input type="text" value={studentDetails.institution} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">City / Province</label>
                                <input type="text" value={studentDetails.city} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact</label>
                                <input type="text" value={studentDetails.contact} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
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
                            {["Community Service", "Volunteer Activity", "Awareness Campaign", "Training / Teaching", "Research", "Technical Support", "Environmental Action", "Other"].map(type => (
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
                                            placeholder="Exact Venue (e.g. Govt High School)"
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

                                {formData.timelineType === 'Fixed dates' && (
                                    <div className="flex gap-2 animate-in fade-in zoom-in-95">
                                        <input
                                            type="date"
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            value={formData.dates.start}
                                            onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, start: e.target.value } })}
                                        />
                                        <span className="self-center text-slate-400">-</span>
                                        <input
                                            type="date"
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            value={formData.dates.end}
                                            onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, end: e.target.value } })}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="mb-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Expected Hours</label>
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
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Volunteers/Team Size</label>
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
                            <strong>Important:</strong> The SDG, Target, and Indicator selected here will be
                            <span className="font-bold underline ml-1">locked</span> for your report.
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
                            {sdgData.map((sdg) => (
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
                            {formData.sdg && sdgData.find(sdg => sdg.id === formData.sdg)?.targets.map((target) => (
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
                            {formData.sdg && formData.target && sdgData
                                .find(sdg => sdg.id === formData.sdg)?.targets
                                .find(target => target.id === formData.target)?.indicators.map((indicator) => (
                                    <option key={indicator.id} value={indicator.id}>
                                        Indicator {indicator.id} — {indicator.description}
                                    </option>
                                ))}
                        </select>
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
                                <div className="h-32 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 space-y-2">
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
                        <label className="block text-sm font-bold text-slate-900 mb-2">E2. Skills Needed/Gained</label>
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
                                </label>
                            ))}
                        </div>
                        <div className="mt-3">
                            <label className="flex items-center gap-2 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer w-full md:w-1/3 mb-2">
                                <input
                                    type="checkbox"
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                    checked={formData.activity.isOtherSkillChecked}
                                    onChange={(e) => setFormData({ ...formData, activity: { ...formData.activity, isOtherSkillChecked: e.target.checked } })}
                                />
                                <span className="text-sm font-medium text-slate-700">Other</span>
                            </label>
                            {formData.activity.isOtherSkillChecked && (
                                <input
                                    type="text"
                                    placeholder="Please specify other skill..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm transition-all"
                                    value={formData.activity.otherSkill}
                                    onChange={(e) => setFormData({ ...formData, activity: { ...formData.activity, otherSkill: e.target.value } })}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION F: SUPERVISION */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 ${expandedSections.includes('F') ? 'border-orange-500 shadow-xl ring-1 ring-orange-500' : 'border-slate-200 shadow-sm'}`}>
                <div
                    className="p-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSection("F")}
                >
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('F') ? 'text-orange-600' : 'text-slate-800'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('F') ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>F</div>
                        Section F — Institutional Verification & Safety
                    </h2>
                    {expandedSections.includes('F') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
                <div className={`p-8 space-y-8 ${!expandedSections.includes('F') ? 'hidden' : ''}`}>
                    <div className="text-sm text-slate-600">
                        To ensure safe, credible, and institutionally recognized engagement, the following confirmations are required.
                    </div>

                    <div className="space-y-6">
                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-md font-bold text-slate-900 mb-3">1️⃣ Institutional Liaison</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                All student-created opportunities must be developed in coordination with their School, College, or University.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-2">The student must:</h4>
                                    <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                                        <li>Add an Official Institutional Representative</li>
                                        <li>Provide name, designation, and contact details</li>
                                        <li>Ensure institutional verification of the activity</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-2">The Institutional Representative will confirm:</h4>
                                    <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                                        <li>The activity is institutionally recognized</li>
                                        <li>Student participation is valid</li>
                                        <li>Reported hours are accurate</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <input
                                    type="text"
                                    placeholder="Representative Name"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.supervision.name}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, name: e.target.value } })}
                                />
                                <input
                                    type="text"
                                    placeholder="Designation"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.supervision.role}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, role: e.target.value } })}
                                />
                                <input
                                    type="text"
                                    placeholder="Contact Details"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm"
                                    value={formData.supervision.contact}
                                    onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, contact: e.target.value } })}
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-md font-bold text-slate-900 mb-3">2️⃣ Supervision & Site Responsibility</h3>
                            <p className="text-sm text-slate-600 mb-2">The Partner Organization confirms that:</p>
                            <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1 mb-4">
                                <li>The project site is suitable and safe for student participation</li>
                                <li>Activities are lawful and free from hazardous elements</li>
                                <li>Students will be appropriately supervised</li>
                                <li>Necessary safety and emergency measures are in place</li>
                            </ul>
                            <p className="text-sm text-slate-600 font-medium">
                                Operational supervision and on-ground management remain the responsibility of the Partner Organization.
                            </p>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-md font-bold text-slate-900 mb-3">3️⃣ Role of CIEL PK</h3>
                            <div className="text-sm text-slate-600 space-y-2">
                                <p>CIEL PK functions as a verification and reporting platform.</p>
                                <p>CIEL PK does not directly supervise field activities or manage on-site operations.</p>
                                <p>Responsibility for execution and safety rests with the Partner Organization and the participating institution.</p>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500" /> Required Confirmations
                            </h3>
                            <div className="space-y-4 bg-orange-50 p-6 rounded-xl border border-orange-100">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="mt-1 rounded text-orange-600 focus:ring-orange-500 transition-colors"
                                        checked={formData.supervision.isSupervised}
                                        onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, isSupervised: e.target.checked } })}
                                    />
                                    <span className="text-sm font-medium text-orange-900 group-hover:text-orange-950 transition-colors">
                                        I confirm this opportunity is created in liaison with my institution and an official representative has been added.
                                    </span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="mt-1 rounded text-orange-600 focus:ring-orange-500 transition-colors"
                                        checked={formData.supervision.isHarmful}
                                        onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, isHarmful: e.target.checked } })}
                                    />
                                    <span className="text-sm font-medium text-orange-900 group-hover:text-orange-950 transition-colors">
                                        I confirm that the site and activities meet safety and supervision requirements as stated above.
                                    </span>
                                </label>
                            </div>
                        </div>
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

            {/* SECTION I: DECLARATION */}
            <div className="bg-slate-900 rounded-2xl text-white p-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-400" /> Final Declaration
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Student Name</label>
                        <input type="text" value={studentDetails.name} readOnly className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-1 focus:ring-green-500" />
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-50 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isSubmitting ? "Submitting..." : "Submit Project"}
                </button>
            </div>
        </div>
    );
}
