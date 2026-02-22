"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Info, MapPin, Calendar, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Users, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { sdgData } from "@/utils/sdgData";

export default function FacultyOpportunityCreationPage() {
    const router = useRouter();
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Organization/Student Details State
    const [orgDetails, setOrgDetails] = useState({
        organizationName: "University Department",
        organizationType: "Faculty/University",
        city: "Lahore",
        focalPerson: { name: "Dr. Faculty", contact: "" }
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
        indicator: ""
    });

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Validate essential fields
            if (!formData.title || !formData.mode || !formData.sdg) {
                toast.error("Please fill in all required fields (Title, Mode, SDG)");
                setIsSubmitting(false);
                return;
            }

            const res = await authenticatedFetch(`/api/v1/opportunities`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    toast.success("Opportunity created successfully!");
                    router.push("/dashboard/faculty/courses"); // Redirect to appropriate list
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
        // Retrieve faculty profile logic here if endpoint exists
        setIsLoadingProfile(false);
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
                <h1 className="text-3xl font-bold text-slate-900">Create Faculty Opportunity</h1>
                <p className="text-slate-500">Post a new project or opportunity for your students.</p>
            </div>

            {/* SECTION A: FACULTY DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Section A: Faculty Details
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Auto-filled</p>
                    </div>
                    {isLoadingProfile ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75 pointer-events-none grayscale-[0.5]">
                    {isLoadingProfile ? (
                        <div className="col-span-2 text-center py-4 text-slate-400">Loading details...</div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department / Faculty</label>
                                <input type="text" value={orgDetails.organizationName} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                <input type="text" value={orgDetails.organizationType} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 font-medium" />
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

                <div className="p-8 space-y-8">
                    {/* B1. Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">B1. Project Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                            placeholder="e.g. Department Research Study"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* B2. Type */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-3">B2. Activity Type <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {["Research", "Field Work", "Department Project", "Community Service", "Workshop", "Other"].map(type => (
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
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <label className="block text-sm font-bold text-slate-900 mb-3">B4. Location Details <span className="text-red-500">*</span></label>
                                <div className="space-y-3">
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
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1 h-4 bg-slate-300 rounded-full"></div>
                                        <input
                                            type="text"
                                            placeholder="Exact Venue"
                                            className="w-full pl-6 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm"
                                            value={formData.location.venue}
                                            onChange={(e) => setFormData({ ...formData, location: { ...formData.location, venue: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
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
                    {/* C1. Primary SDG */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">C1. Select PRIMARY SDG <span className="text-red-500">*</span></label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-medium"
                            value={formData.sdg}
                            onChange={(e) => setFormData({ ...formData, sdg: e.target.value, target: "", indicator: "" })}
                        >
                            <option value="">Select an SDG...</option>
                            {sdgData.map(sdg => (
                                <option key={sdg.id} value={sdg.id}>SDG {sdg.number} — {sdg.title}</option>
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
                            {sdgData.find(s => s.id === formData.sdg)?.targets.map(target => (
                                <option key={target.id} value={target.id}>Target {target.id} — {target.description}</option>
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
                            {sdgData.find(s => s.id === formData.sdg)?.targets.find(t => t.id === formData.target)?.indicators.map(indicator => (
                                <option key={indicator.id} value={indicator.id}>Indicator {indicator.id} — {indicator.description}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* SECTION F: SUBMISSION */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-50 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <Button variant="outline" type="button">Save Draft</Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Post Opportunity
                </Button>
            </div>
        </div>
    );
}
