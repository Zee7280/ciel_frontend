
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "../../report/components/ui/button";
import { Badge } from "../../report/components/ui/badge";
import { authenticatedFetch } from "@/utils/api";
import { Loader2, MapPin, Calendar, Clock, Globe, ArrowLeft, Building2, Share2, CheckCircle2, User } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";


export default function OpportunityDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [opportunity, setOpportunity] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isApplying, setIsApplying] = useState(false);

    useEffect(() => {
        if (id) {
            fetchOpportunityDetails();
        }
    }, [id]);

    const fetchOpportunityDetails = async () => {
        try {
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/opportunities/${id}`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    console.log(data.data);
                    setOpportunity(data.data);
                } else {
                    toast.error(data.message || "Failed to load opportunity details");
                }
            } else {
                toast.error("Failed to fetch opportunity");
            }
        } catch (error) {
            console.error("Error fetching opportunity", error);
            toast.error("An error occurred while loading details");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = async () => {
        setIsApplying(true);
        try {
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/opportunities/${id}/apply`, {
                method: 'POST'
            });

            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    toast.success("Application submitted successfully!");
                    setOpportunity({ ...opportunity, hasApplied: true });
                } else {
                    toast.error(data.message || "Failed to submit application");
                }
            } else {
                toast.error("Failed to connect to server");
            }
        } catch (error) {
            console.error("Error applying", error);
            toast.error("An error occurred while applying");
        } finally {
            setIsApplying(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!opportunity) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] space-y-4">
                <p className="text-slate-500 text-lg">Opportunity not found.</p>
                <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500 pb-24">
            {/* Header Actions */}
            <div className="flex justify-between items-center print:hidden">
                <Link href="/dashboard/student/browse" className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back to Opportunities
                </Link>
                <div className="flex gap-3">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
                        <Share2 className="w-4 h-4" /> Print / Save PDF
                    </button>

                    {opportunity.hasApplied ? (
                        <div className="flex items-center gap-2">
                            {['active', 'pending', 'pending_approval', 'completed', 'applied', 'accepted'].includes(opportunity.status) && (
                                <Link href={`/dashboard/student/report?projectId=${id}`}>
                                    <Button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
                                        Submit Report
                                    </Button>
                                </Link>
                            )}
                            <Button className="flex items-center gap-2 px-6 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg shadow-none cursor-default font-medium hover:bg-emerald-50">
                                <CheckCircle2 className="w-4 h-4" /> Applied
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={handleApply}
                            disabled={isApplying}
                            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium shadow-sm"
                        >
                            {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply Now"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Document View */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                {/* Title Section */}
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 print:bg-white print:border-none">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">{opportunity.title}</h1>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {opportunity.location?.city || opportunity.city || "Remote"}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Start: {opportunity.timeline?.start_date ? new Date(opportunity.timeline.start_date).toLocaleDateString() : (opportunity.start_date ? new Date(opportunity.start_date).toLocaleDateString() : "Flexible")}</span>
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">{opportunity.mode || "On Site"}</span>
                                {opportunity.status === 'active' && (
                                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">Active</span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-400">Opportunity ID</div>
                            <div className="font-mono font-bold text-slate-600">#{id.substring(0, 8)}...</div>
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
                                    <div className="text-sm font-bold text-slate-900">{opportunity.organization?.name || opportunity.organization_name || "Partner Organization"}</div>
                                    <div className="text-xs text-slate-500">Verified Partner</div>
                                </div>
                                {opportunity.organization && (
                                    <div>
                                        <div className="text-xs text-slate-500 mb-1">Contact</div>
                                        <div className="text-sm font-medium text-slate-900">{opportunity.organization.city || "Lahore"}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="h-px bg-slate-200"></div>
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">SDG Alignment</h3>
                            <div className="bg-white p-4 rounded-xl border border-slate-100 text-center space-y-3">
                                <div>
                                    <div className="text-4xl font-bold text-slate-900 mb-1">{opportunity.sdg ? opportunity.sdg : "?"}</div>
                                    <div className="text-xs text-slate-500 uppercase font-bold">Goal {opportunity.sdg || "N/A"}</div>
                                </div>
                            </div>
                        </div>
                        {opportunity.verification_method && opportunity.verification_method.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Verification</h3>
                                <ul className="space-y-2">
                                    {opportunity.verification_method.map((v: string) => (
                                        <li key={v} className="text-sm text-slate-600 flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {v}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Middle/Right Column: Main Details */}
                    <div className="p-8 space-y-8 md:col-span-8 lg:col-span-9">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                                <div className="text-xs font-bold text-orange-600 uppercase mb-1">Volunteers Needed</div>
                                <div className="text-2xl font-bold text-orange-900">{opportunity.timeline?.volunteers_required || opportunity.volunteers_needed || "Open"}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <div className="text-xs font-bold text-blue-600 uppercase mb-1">Hours/Student</div>
                                <div className="text-2xl font-bold text-blue-900">{opportunity.timeline?.expected_hours || opportunity.hours || 0}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                                <div className="text-xs font-bold text-purple-600 uppercase mb-1">Duration</div>
                                <div className="text-2xl font-bold text-purple-900">{opportunity.timeline?.type || opportunity.timeline_type || "Flexible"}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Beneficiaries</div>
                                <div className="text-2xl font-bold text-emerald-900">{opportunity.objectives?.beneficiaries_count || "N/A"}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <section>
                                <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Objectives</h3>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm border-l-4 border-slate-200 pl-4">
                                    {opportunity.objectives?.description || opportunity.description || "No description provided."}
                                </p>
                                {opportunity.objectives?.beneficiaries_type && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {Array.isArray(opportunity.objectives.beneficiaries_type)
                                            ? opportunity.objectives.beneficiaries_type.map((b: string) => (
                                                <span key={b} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{b}</span>
                                            ))
                                            : <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{opportunity.objectives.beneficiaries_type}</span>
                                        }
                                    </div>
                                )}
                            </section>
                            <section>
                                <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Student Activities</h3>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm mb-4 border-l-4 border-slate-200 pl-4">
                                    {opportunity.activity_details?.student_responsibilities || "No specific responsibilities listed."}
                                </p>
                                {opportunity.activity_details?.skills_gained && (
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Skills to be Gained</span>
                                        <div className="flex flex-wrap gap-2">
                                            {opportunity.activity_details.skills_gained.map((s: string) => (
                                                <span key={s} className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-full">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        <div className="h-px bg-slate-100"></div>

                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <h3 className="text-sm font-bold text-slate-900 mb-3">Timeline & Location</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs text-slate-500 mb-1">Start Date</div>
                                        <div className="text-sm font-medium text-slate-900">{opportunity.timeline?.start_date ? new Date(opportunity.timeline.start_date).toLocaleDateString() : (opportunity.start_date ? new Date(opportunity.start_date).toLocaleDateString() : "Flexible")}</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs text-slate-500 mb-1">End Date</div>
                                        <div className="text-sm font-medium text-slate-900">{opportunity.timeline?.end_date ? new Date(opportunity.timeline.end_date).toLocaleDateString() : (opportunity.end_date ? new Date(opportunity.end_date).toLocaleDateString() : "Flexible")}</div>
                                    </div>
                                    <div className="col-span-2 bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs text-slate-500 mb-1">Venue</div>
                                        <div className="text-sm font-medium text-slate-900">{opportunity.location?.venue || "N/A"}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{opportunity.location?.city}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-1">
                                <h3 className="text-sm font-bold text-slate-900 mb-3">Supervision</h3>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 h-full">
                                    {opportunity.supervision ? (
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-slate-500 text-xs">Supervisor</div>
                                                <div className="font-medium text-slate-900">{opportunity.supervision.supervisor_name || "N/A"}</div>
                                                <div className="text-xs text-slate-500">{opportunity.supervision.role}</div>
                                            </div>
                                            <div className="pt-2 border-t border-slate-200">
                                                <div className="space-y-2">
                                                    <span className={`flex items-center gap-1.5 text-xs font-medium ${opportunity.supervision.safe_environment ? 'text-green-600' : 'text-red-500'}`}>
                                                        {opportunity.supervision.safe_environment ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full bg-red-500" />} Safe Env.
                                                    </span>
                                                    <span className={`flex items-center gap-1.5 text-xs font-medium ${opportunity.supervision.supervised ? 'text-green-600' : 'text-amber-500'}`}>
                                                        {opportunity.supervision.supervised ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full bg-amber-500" />} Supervised
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-sm">No supervision details provided.</div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );

}
