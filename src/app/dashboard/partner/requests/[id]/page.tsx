"use client";

import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Info, MapPin, Calendar, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Users, Loader2, Edit, ArrowLeft, Save, X, Trash2, Printer, Share2 } from "lucide-react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { sdgData } from "@/utils/sdgData";

const LocationPicker = dynamic(() => import("@/components/ui/LocationPicker"), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-slate-400">Loading Map...</div>
});

export default function OpportunityDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const id = params.id;
    const isEditMode = searchParams.get('edit') === 'true';

    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);


    const [expandedSections, setExpandedSections] = useState<string[]>(["A", "B", "C", "D", "E", "F", "G", "H", "I"]);

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
            skills: [] as string[]
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

    const [orgDetails, setOrgDetails] = useState({
        organizationName: "",
        organizationType: "",
        city: "",
        focalPerson: { name: "", contact: "" }
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    const toggleType = (type: string) => {
        if (!isEditing) return;
        setFormData(prev => {
            const types = prev.opportunityType.includes(type)
                ? prev.opportunityType.filter(t => t !== type)
                : [...prev.opportunityType, type];
            return { ...prev, opportunityType: types };
        });
    };

    // Fetch Opportunity Details
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Opportunity
                const res = await authenticatedFetch(`/api/v1/opportunities/detail`, {
                    method: 'POST',
                    body: JSON.stringify({ id })
                });

                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success || data.id) {
                        const opp = data.data || data;

                        // Map API response to Form Data
                        setFormData({
                            title: opp.title || "",
                            opportunityType: opp.types || [],
                            mode: opp.mode || "",
                            location: {
                                city: opp.location?.city || "",
                                venue: opp.location?.venue || "",
                                pin: opp.location?.pin || ""
                            },
                            timelineType: opp.timeline?.type || "",
                            dates: {
                                start: opp.timeline?.start_date || "",
                                end: opp.timeline?.end_date || ""
                            },
                            capacity: {
                                hours: opp.timeline?.expected_hours?.toString() || "",
                                volunteers: opp.timeline?.volunteers_required?.toString() || ""
                            },
                            sdg: opp.sdg_info?.sdg_id?.toString() || "",
                            target: opp.sdg_info?.target_id?.toString() || "",
                            indicator: opp.sdg_info?.indicator_id?.toString() || "",
                            objectives: {
                                description: opp.objectives?.description || "",
                                beneficiariesCount: opp.objectives?.beneficiaries_count?.toString() || "",
                                beneficiariesType: opp.objectives?.beneficiaries_type || []
                            },
                            activity: {
                                responsibilities: opp.activity_details?.student_responsibilities || "",
                                skills: opp.activity_details?.skills_gained || []
                            },
                            supervision: {
                                name: opp.supervision?.supervisor_name || "",
                                role: opp.supervision?.role || "",
                                contact: opp.supervision?.contact || "",
                                isHarmful: opp.supervision?.safe_environment === false, // Inverted logic as per creation
                                isSupervised: opp.supervision?.supervised || false
                            },
                            verification: opp.verification_method || [],
                            visibility: opp.visibility || "public"
                        });
                    }
                } else {
                    toast.error("Failed to load opportunity details");
                }

                // Initial fetch uses stored user for basic org details, 
                // but real app might want to fetch org details *of the opportunity creator* if different.
                // For now, assuming partner views their own opportunities.
                const storedUser = localStorage.getItem("ciel_user");
                if (storedUser) {
                    const userObj = JSON.parse(storedUser);
                    const userId = userObj.id || userObj.userId;

                    const resOrg = await authenticatedFetch(`/api/v1/organisation/profile/detail`, {
                        method: 'POST',
                        body: JSON.stringify({ userId })
                    });
                    if (resOrg && resOrg.ok) {
                        const dataOrg = await resOrg.json();
                        const apiData = dataOrg.data || dataOrg;
                        if (apiData) {
                            setOrgDetails({
                                organizationName: apiData.name || "",
                                organizationType: apiData.orgType || "",
                                city: apiData.city || "",
                                focalPerson: { name: apiData.contactName || "", contact: apiData.contactPhone || "" }
                            });
                        }
                    }
                }

            } catch (error) {
                console.error("Error loading data and checking logic", error);

            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    useEffect(() => {
        setIsEditing(searchParams.get('edit') === 'true');
    }, [searchParams]);

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

    const handleUpdate = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            // Transform back to API spec
            const payload = {
                id: id,
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
                    skills_gained: formData.activity.skills
                },
                supervision: {
                    supervisor_name: formData.supervision.name,
                    role: formData.supervision.role,
                    contact: formData.supervision.contact,
                    safe_environment: !formData.supervision.isHarmful, // Inverted Logic: Checkbox "No Harmful" = true means safe = true
                    supervised: formData.supervision.isSupervised
                },
                verification_method: formData.verification,
                visibility: formData.visibility
            };

            const res = await authenticatedFetch(`/api/v1/opportunities/update`, {
                method: 'POST', // or PATCH/PUT depending on your API
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                const data = await res.json();
                toast.success("Opportunity updated successfully!");
                router.replace(pathname);
                router.refresh(); // Refresh server components if any
            } else if (res) {
                const data = await res.json();
                toast.error(data.message || "Failed to update opportunity");
            } else {
                toast.error("Failed to update opportunity");
            }
        } catch (error) {
            console.error("Update failed", error);
            toast.error("Failed to update");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this opportunity? This action cannot be undone.")) return;

        setIsSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/opportunities/${id}`, {
                method: 'DELETE'
            });

            if (res && res.ok) {
                toast.success("Opportunity deleted successfully");
                router.push("/dashboard/partner/requests");
            } else if (res) {
                const data = await res.json();
                toast.error(data.message || "Failed to delete opportunity");
            } else {
                toast.error("Failed to delete opportunity");
            }
        } catch (error) {
            console.error("Delete failed", error);
            toast.error("Failed to delete opportunity");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
    }

    /* -------------------------------------------------------------------------- */
    /*                                VIEW MODE UI                                */
    /* -------------------------------------------------------------------------- */
    if (!isEditing) {
        return (
            <div className="w-full space-y-8 animate-in fade-in duration-500 pb-24">
                {/* Header Actions */}
                <div className="flex justify-between items-center print:hidden">
                    <Link href="/dashboard/partner/requests" className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back to List
                    </Link>
                    <div className="flex gap-3">
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
                            <Printer className="w-4 h-4" /> Print PDF
                        </button>
                        <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 text-red-600 rounded-lg hover:bg-red-100 font-medium">
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium shadow-sm">
                            <Edit className="w-4 h-4" /> Edit Opportunity
                        </button>
                    </div>
                </div>

                {/* Document View */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                    {/* Title Section */}
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 print:bg-white print:border-none">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 mb-2">{formData.title}</h1>
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {formData.location.city || "Remote"}</span>
                                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Last Updated: {new Date().toLocaleDateString()}</span>
                                    <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">{formData.mode}</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${formData.visibility === 'public' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{formData.visibility}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-slate-400">Opportunity ID</div>
                                <div className="font-mono font-bold text-slate-600">#{id}</div>
                            </div>
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {/* Left Column: Organization & key details */}
                        <div className="p-8 space-y-8 md:col-span-4 lg:col-span-3 bg-slate-50/30">
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Organization</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{orgDetails.organizationName || "Your Organization"}</div>
                                        <div className="text-xs text-slate-500">{orgDetails.organizationType}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 mb-1">Focal Person</div>
                                        <div className="text-sm font-medium text-slate-900">{orgDetails.focalPerson.name}</div>
                                        <div className="text-xs text-slate-500">{orgDetails.focalPerson.contact}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="h-px bg-slate-200"></div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">SDG Alignment</h3>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 text-center space-y-3">
                                    <div>
                                        <div className="text-4xl font-bold text-slate-900 mb-1">{formData.sdg || "?"}</div>
                                        <div className="text-xs text-slate-500 uppercase font-bold">Goal {formData.sdg}</div>
                                    </div>
                                    {formData.target && <div className="text-xs bg-slate-100 py-1.5 px-3 rounded-lg font-medium">Target {formData.target}</div>}
                                    {formData.indicator && <div className="text-xs bg-slate-50 py-1.5 px-3 rounded-lg text-slate-500 italic">Indicator: {formData.indicator}</div>}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Verification</h3>
                                <ul className="space-y-2">
                                    {formData.verification.map(v => (
                                        <li key={v} className="text-sm text-slate-600 flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {v}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Middle/Right Column: Main Details */}
                        <div className="p-8 space-y-8 md:col-span-8 lg:col-span-9">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                                    <div className="text-xs font-bold text-orange-600 uppercase mb-1">Volunteers Needed</div>
                                    <div className="text-2xl font-bold text-orange-900">{formData.capacity.volunteers || "-"}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                    <div className="text-xs font-bold text-blue-600 uppercase mb-1">Hours/Student</div>
                                    <div className="text-2xl font-bold text-blue-900">{formData.capacity.hours || "-"}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                                    <div className="text-xs font-bold text-purple-600 uppercase mb-1">Duration</div>
                                    <div className="text-2xl font-bold text-purple-900">{formData.timelineType}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                    <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Beneficiaries</div>
                                    <div className="text-2xl font-bold text-emerald-900">{formData.objectives.beneficiariesCount || "-"}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <section>
                                    <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Objectives</h3>
                                    <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm border-l-4 border-slate-200 pl-4">
                                        {formData.objectives.description || "No description provided."}
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {formData.objectives.beneficiariesType.map(b => (
                                            <span key={b} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{b}</span>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Student Activities</h3>
                                    <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm mb-4 border-l-4 border-slate-200 pl-4">
                                        {formData.activity.responsibilities || "No specific responsibilities listed."}
                                    </p>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Skills to be Gained</span>
                                        <div className="flex flex-wrap gap-2">
                                            {formData.activity.skills.map(s => (
                                                <span key={s} className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-full">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div className="h-px bg-slate-100"></div>

                            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-bold text-slate-900 mb-3">Timeline & Location</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <div className="text-xs text-slate-500 mb-1">Start Date</div>
                                            <div className="text-sm font-medium text-slate-900">{formData.dates.start || "Flexible"}</div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <div className="text-xs text-slate-500 mb-1">End Date</div>
                                            <div className="text-sm font-medium text-slate-900">{formData.dates.end || "Flexible"}</div>
                                        </div>
                                        <div className="col-span-2 bg-slate-50 p-3 rounded-lg">
                                            <div className="text-xs text-slate-500 mb-1">Venue</div>
                                            <div className="text-sm font-medium text-slate-900">{formData.location.venue || "N/A"}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{formData.location.city}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-1">
                                    <h3 className="text-sm font-bold text-slate-900 mb-3">Supervision</h3>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 h-full">
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-slate-500 text-xs">Supervisor</div>
                                                <div className="font-medium text-slate-900">{formData.supervision.name || "N/A"}</div>
                                                <div className="text-xs text-slate-500">{formData.supervision.role}</div>
                                            </div>
                                            <div className="pt-2 border-t border-slate-200">
                                                <div className="space-y-2">
                                                    <span className={`flex items-center gap-1.5 text-xs font-medium ${!formData.supervision.isHarmful ? 'text-green-600' : 'text-red-500'}`}>
                                                        {!formData.supervision.isHarmful ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} Safe Env.
                                                    </span>
                                                    <span className={`flex items-center gap-1.5 text-xs font-medium ${formData.supervision.isSupervised ? 'text-green-600' : 'text-amber-500'}`}>
                                                        {formData.supervision.isSupervised ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} Supervised
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        );
    }


    /* -------------------------------------------------------------------------- */
    /*                                EDIT MODE UI                                */
    /* -------------------------------------------------------------------------- */
    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button onClick={() => setIsEditing(false)} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-2 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Cancel Editing
                    </button>
                    <h1 className="text-3xl font-bold text-slate-900">Edit Opportunity</h1>
                    <p className="text-slate-500">Update the details of your opportunity.</p>
                </div>
            </div>

            {/* SECTION A: ORGANIZATION DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Section A: Organization Details
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Auto-filled details</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75 grayscale-[0.5] pointer-events-none">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Organization Name</label>
                        <input type="text" value={orgDetails.organizationName} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Organization Type</label>
                        <input type="text" value={orgDetails.organizationType} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">City / Province</label>
                        <input type="text" value={orgDetails.city} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Focal Person</label>
                        <div className="flex gap-2">
                            <input type="text" value={orgDetails.focalPerson.name} readOnly className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
                            <input type="text" value={orgDetails.focalPerson.contact} readOnly className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
                        </div>
                    </div>
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
                            Section B: Opportunity Overview
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 pl-8">Basic details about the activity and commitment.</p>
                    </div>
                    <div onClick={() => toggleSection("B")}>
                        {expandedSections.includes('B') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                </div>

                <div className={`p-8 space-y-8 ${!expandedSections.includes('B') ? 'hidden' : ''}`}>
                    {/* B1. Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">B1. Opportunity Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"

                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium disabled:bg-slate-50 disabled:text-slate-500"
                            placeholder="e.g. Digital Literacy Training for Orphanage Students"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* B2. Type */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-3">B2. Opportunity Type <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {["Community Service", "Volunteer Activity", "Awareness Campaign", "Training / Teaching", "Research / Survey Support", "Technical / Professional Support", "Environmental Action", "Corporate CSR Activity"].map(type => (
                                <label key={type} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.opportunityType.includes(type) ? 'bg-blue-50 border-blue-200' : 'border-slate-100'}`}>
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
                                    <label key={m} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${formData.mode === m ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'border-slate-100 hover:border-slate-300'}`}>
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
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <label className="block text-sm font-bold text-slate-900 mb-3">B4. Location Details <span className="text-red-500">*</span></label>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="City / Area"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm disabled:bg-slate-50"
                                            value={formData.location.city}
                                            onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Pin Exact Location</label>
                                        <div className="rounded-xl overflow-hidden border border-slate-200">
                                            {(() => {
                                                let initialLat = 31.5204;
                                                let initialLng = 74.3587;
                                                try {
                                                    if (formData.location.pin && formData.location.pin.includes(',')) {
                                                        const [lat, lng] = formData.location.pin.split(',').map(s => parseFloat(s.trim()));
                                                        if (!isNaN(lat) && !isNaN(lng)) {
                                                            initialLat = lat;
                                                            initialLng = lng;
                                                        }
                                                    }
                                                } catch (e) {
                                                    // fallback
                                                }

                                                return (
                                                    <LocationPicker
                                                        initialLocation={{ lat: initialLat, lng: initialLng }}
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
                                                );
                                            })()}
                                        </div>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1 h-4 bg-slate-300 rounded-full"></div>
                                            <input
                                                type="text"
                                                placeholder="Exact Venue"
                                                className="w-full pl-6 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm disabled:bg-slate-50"
                                                value={formData.location.venue}
                                                onChange={(e) => setFormData({ ...formData, location: { ...formData.location, venue: e.target.value } })}
                                            />
                                        </div>
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
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${formData.timelineType === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>

                                {(formData.timelineType === 'Fixed dates' || formData.dates.start) && (
                                    <div className="flex gap-2 animate-in fade-in zoom-in-95">
                                        <input
                                            type="date"

                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                                            value={formData.dates.start}
                                            onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, start: e.target.value } })}
                                        />
                                        <span className="self-center text-slate-400">-</span>
                                        <input
                                            type="date"

                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                                            value={formData.dates.end}
                                            onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, end: e.target.value } })}
                                        />
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

                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
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

                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
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
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('C') ? 'text-purple-600' : 'text-slate-800'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('C') ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>C</div>
                        Section C: SDG Selection
                    </h2>
                    {expandedSections.includes('C') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>

                <div className={`p-8 space-y-6 ${!expandedSections.includes('C') ? 'hidden' : ''}`}>
                    {/* C1. Primary SDG */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">C1. Select PRIMARY SDG <span className="text-red-500">*</span></label>
                        <select

                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-medium disabled:bg-slate-50"
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

                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-medium disabled:bg-slate-50"
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

                    {/* C3. Indicator */}
                    <div className={!formData.target ? "opacity-50 pointer-events-none" : ""}>
                        <label className="block text-sm font-bold text-slate-900 mb-2">C3. SDG Indicator</label>
                        <select

                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-medium disabled:bg-slate-50"
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

            {/* SECTION D: SDG ALIGNED OBJECTIVES */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 ${expandedSections.includes('D') ? 'border-teal-500 shadow-xl ring-1 ring-teal-500' : 'border-slate-200 shadow-sm'}`}>
                <div
                    className="p-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSection("D")}
                >
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('D') ? 'text-teal-600' : 'text-slate-800'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('D') ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>D</div>
                        Section D: SDG Aligned Objectives
                    </h2>
                    {expandedSections.includes('D') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>

                <div className={`p-8 space-y-6 ${!expandedSections.includes('D') ? 'hidden' : ''}`}>
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">D1. Project Objective <span className="text-red-500">*</span></label>
                        <textarea

                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none font-medium h-32 disabled:bg-slate-50"
                            value={formData.objectives.description}
                            onChange={(e) => setFormData({ ...formData, objectives: { ...formData.objectives, description: e.target.value } })}
                        ></textarea>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <label className="block text-sm font-bold text-slate-900 mb-4">D2. Local Project Targets</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Number of Beneficiaries</label>
                                <input
                                    type="number"

                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-teal-500 outline-none disabled:bg-slate-100"
                                    value={formData.objectives.beneficiariesCount}
                                    onChange={(e) => setFormData({ ...formData, objectives: { ...formData.objectives, beneficiariesCount: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Type of Beneficiaries</label>
                                <div className={`h-32 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 space-y-2`}>
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
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('E') ? 'text-indigo-600' : 'text-slate-800'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('E') ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>E</div>
                        Section E: Activity Details
                    </h2>
                    {expandedSections.includes('E') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>

                <div className={`p-8 space-y-6 ${!expandedSections.includes('E') ? 'hidden' : ''}`}>
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">E1. Student Responsibilities</label>
                        <textarea

                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-medium h-32 disabled:bg-slate-50"
                            value={formData.activity.responsibilities}
                            onChange={(e) => setFormData({ ...formData, activity: { ...formData.activity, responsibilities: e.target.value } })}
                        ></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">E2. Skills Gained</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {["Leadership", "Communication", "Teaching", "Teamwork", "Digital Skills", "Research", "Problem Solving"].map(s => (
                                <label key={s} className={`flex items-center gap-2 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer`}>
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
                        Section F: Supervision & Safety
                    </h2>
                    {expandedSections.includes('F') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
                <div className={`p-8 space-y-6 ${!expandedSections.includes('F') ? 'hidden' : ''}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input
                            type="text"

                            placeholder="Supervisor Name"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none disabled:bg-slate-50"
                            value={formData.supervision.name}
                            onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, name: e.target.value } })}
                        />
                        <input
                            type="text"

                            placeholder="Role"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none disabled:bg-slate-50"
                            value={formData.supervision.role}
                            onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, role: e.target.value } })}
                        />
                        <input
                            type="text"

                            placeholder="Contact"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none disabled:bg-slate-50"
                            value={formData.supervision.contact}
                            onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, contact: e.target.value } })}
                        />
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl space-y-2 border border-orange-100">
                        <label className={`flex items-center gap-3 cursor-pointer`}>
                            <input
                                type="checkbox"

                                className="rounded text-orange-600 focus:ring-orange-500"
                                checked={formData.supervision.isHarmful}
                                onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, isHarmful: e.target.checked } })}
                            />
                            <span className="text-sm font-medium text-orange-900">No harmful or hazardous activity is involved</span>
                        </label>
                        <label className={`flex items-center gap-3 cursor-pointer`}>
                            <input
                                type="checkbox"

                                className="rounded text-orange-600 focus:ring-orange-500"
                                checked={formData.supervision.isSupervised}
                                onChange={(e) => setFormData({ ...formData, supervision: { ...formData.supervision, isSupervised: e.target.checked } })}
                            />
                            <span className="text-sm font-medium text-orange-900">Students will be supervised</span>
                        </label>
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
                    <label className="block text-sm font-bold text-slate-900 mb-2">G1. Verification of participation</label>
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

            {/* SECTION H: VISIBILITY */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 ${expandedSections.includes('H') ? 'border-pink-500 shadow-xl ring-1 ring-pink-500' : 'border-slate-200 shadow-sm'}`}>
                <div
                    className="p-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSection("H")}
                >
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${expandedSections.includes('H') ? 'text-pink-600' : 'text-slate-800'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${expandedSections.includes('H') ? 'bg-pink-600 text-white' : 'bg-slate-200 text-slate-600'}`}>H</div>
                        Section H: Visibility
                    </h2>
                    {expandedSections.includes('H') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
                <div className={`p-8 space-y-4 ${!expandedSections.includes('H') ? 'hidden' : ''}`}>
                    <label className={`flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50`}>
                        <input
                            type="radio"
                            name="visibility"

                            className="w-5 h-5 text-pink-600"
                            checked={formData.visibility === 'public'}
                            onChange={() => setFormData({ ...formData, visibility: 'public' })}
                        />
                        <div>
                            <span className="block font-bold text-slate-900">Open to all universities</span>
                        </div>
                    </label>
                    <label className={`flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50`}>
                        <input
                            type="radio"
                            name="visibility"

                            className="w-5 h-5 text-pink-600"
                            checked={formData.visibility === 'restricted'}
                            onChange={() => setFormData({ ...formData, visibility: 'restricted' })}
                        />
                        <div>
                            <span className="block font-bold text-slate-900">Restricted</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Action Bar for Edit Mode */}
            <div className="fixed bottom-0 left-0 md:left-64 right-0 p-4 bg-white border-t border-slate-200 z-50 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button
                    onClick={() => router.replace(pathname)}
                    className="px-6 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2"
                >
                    <X className="w-4 h-4" /> Cancel
                </button>
                <button
                    onClick={handleUpdate}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2"
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSubmitting ? "Updating..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
