"use client";

import Navbar from "@/components/Navbar";
import PartnersFooter from "@/components/PartnersFooter";
import FooterBanner from "@/components/FooterBanner";
import Footer from "@/components/Footer";
import { MapPin, Users, Target, ArrowLeft, CheckCircle2, Loader2, Globe2, Sparkles, Building2, Tag, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { authenticatedFetch, isTokenValid } from "@/utils/api";

interface ProjectDetails {
    id: string | number;
    title: string;
    partner_name?: string;
    org?: string;
    organization_name?: string;
    organization?: {
        name?: string;
        city?: string;
    };
    location?: string | { pin?: string; city?: string; venue?: string; district?: string };
    status: string;
    participant_count?: number;
    description: string;
    types?: string[];
    sdg?: string | number;
    sdg_info?: { sdg_id?: string; description?: string };
    submitted_at?: string;
    start_date?: string;
    end_date?: string;
    timeline_type?: string;
    hours?: string | number;
    volunteers_needed?: string | number;
    mode?: string;
    timeline?: {
        start_date?: string;
        end_date?: string;
        expected_hours?: string | number;
        volunteers_required?: string | number;
        type?: string;
    };
    objectives?: {
        description?: string;
        beneficiaries_count?: string | number;
        beneficiaries_type?: string[] | string;
    };
    activity_details?: {
        student_responsibilities?: string;
        skills_gained?: string[];
    };
    supervision?: {
        supervisor_name?: string;
        role?: string;
        safe_environment?: boolean;
        supervised?: boolean;
    };
    verification_method?: string[];
}

function normalizeTextList(value?: string[] | string): string[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
    if (typeof value === "string" && value.trim()) {
        return value
            .split(/[,\n]/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
}

/** When an opportunity is not in the public list, a logged-in student can still open `/projects/{id}` via share link. */
function coerceProjectDetailsFromStudentApi(raw: unknown): ProjectDetails | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const id = r.id;
    if (id == null) return null;
    const base = { ...r, id, title: String(r.title ?? "Project") } as ProjectDetails;
    if (!base.description) base.description = String(r.description ?? "");
    if (!base.status) base.status = String(r.status ?? "Active");
    return base;
}

export default function ProjectDetailsPage() {
    const params = useParams();
    const projectId = params.id as string;
    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [applyHref, setApplyHref] = useState("/login");
    const [applyLabel, setApplyLabel] = useState("Log in to Apply");

    useEffect(() => {
        const fetchProjectDetails = async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "";
                const baseUrl = backendUrl.endsWith("/api/v1") ? backendUrl.replace("/api/v1", "") : backendUrl;

                let resolved: ProjectDetails | null = null;

                const detailResponse = await fetch(`${baseUrl}/api/v1/public/opportunities/${projectId}`);
                const detailData = await detailResponse.json().catch(() => ({}));

                if (detailResponse.ok && detailData.success && detailData.data) {
                    resolved = detailData.data as ProjectDetails;
                } else {
                    const fallbackResponse = await fetch(`${backendUrl}/public/opportunities`);
                    const fallbackData = await fallbackResponse.json();

                    if (fallbackData.success && Array.isArray(fallbackData.data)) {
                        const found = (fallbackData.data as ProjectDetails[]).find((p) => p.id.toString() === projectId);
                        if (found) {
                            resolved = found;
                        }
                    }
                }

                if (!resolved) {
                    const token = typeof window !== "undefined" ? localStorage.getItem("ciel_token") : null;
                    const user = readStoredCurrentUser();
                    const role = String(user?.role ?? "")
                        .trim()
                        .toLowerCase();
                    if (isTokenValid(token) && role === "student") {
                        const sres = await authenticatedFetch(`/api/v1/student/projects/${projectId}`);
                        if (sres?.ok) {
                            const sbody = await sres.json().catch(() => ({}));
                            const raw = sbody && typeof sbody === "object" && "data" in sbody ? (sbody as { data?: unknown }).data : sbody;
                            const fromStudent = coerceProjectDetailsFromStudentApi(raw);
                            if (fromStudent) {
                                resolved = fromStudent;
                            }
                        }
                    }
                }

                if (resolved) {
                    setProject(resolved);
                }
            } catch (err) {
                console.error("Failed to fetch project details:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjectDetails();
    }, [projectId]);

    useEffect(() => {
        const nextPath = `/dashboard/student/browse/${projectId}`;

        try {
            const user = readStoredCurrentUser();
            const role = String(user?.role ?? "").trim().toLowerCase();
            const hasToken = typeof window !== "undefined" && Boolean(window.localStorage.getItem("ciel_token"));

            if (hasToken && role === "student") {
                setApplyHref(nextPath);
                setApplyLabel("Open in Student Dashboard");
                return;
            }
        } catch {
            /* ignore CTA personalization errors */
        }

        setApplyHref(`/login?next=${encodeURIComponent(nextPath)}`);
        setApplyLabel("Log in to Apply");
    }, [projectId]);

    const getDisplayLocation = (loc: ProjectDetails["location"]) => {
        if (!loc) return "Remote / Pakistan";
        if (typeof loc === "string") return loc;
        const parts = [];
        if (loc.city) parts.push(loc.city);
        if (loc.district) parts.push(loc.district);
        if (loc.venue) parts.push(loc.venue);
        return parts.length > 0 ? parts.join(", ") : (loc.pin || "Pakistan");
    };

    const formatDate = (value?: string) => {
        if (!value) return "Flexible";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "Flexible" : date.toLocaleDateString();
    };

    if (isLoading) {
        return (
            <main className="min-h-screen bg-slate-50 font-sans text-center">
                <Navbar />
                <div className="flex flex-col items-center justify-center min-h-screen pt-20 text-slate-400 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#4285F4]" />
                    <p className="font-bold text-sm tracking-widest uppercase">Fetching Details...</p>
                </div>
            </main>
        );
    }

    if (!project) {
        return (
            <main className="min-h-screen bg-slate-50 font-sans">
                <Navbar />
                <div className="pt-48 pb-20 px-6 max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Project Not Found</h1>
                    <Link href="/projects" className="inline-flex items-center gap-3 px-8 py-4 bg-[#4285F4] text-white font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-blue-200">
                        ← Back to Projects
                    </Link>
                </div>
                <PartnersFooter />
                <Footer />
            </main>
        );
    }

    const category = (project.types && project.types.length > 0) ? project.types[0] : "Social Impact";
    const status = project.status || "Active";
    const displayLocation = getDisplayLocation(project.location);
    const partnerName = project.organization?.name || project.organization_name || project.partner_name || project.org || "Verified Organization";
    const primaryDescription = project.objectives?.description || project.description;
    const skills = normalizeTextList(project.activity_details?.skills_gained);
    const verificationMethods = normalizeTextList(project.verification_method);
    const beneficiaryTypes = normalizeTextList(project.objectives?.beneficiaries_type);
    const volunteersNeeded = project.timeline?.volunteers_required || project.volunteers_needed || project.participant_count || 0;
    const expectedHours = project.timeline?.expected_hours || project.hours || 0;
    const beneficiaries = project.objectives?.beneficiaries_count || "N/A";
    const startDate = formatDate(project.timeline?.start_date || project.start_date || project.submitted_at);
    const endDate = formatDate(project.timeline?.end_date || project.end_date);
    const duration = project.timeline?.type || project.timeline_type || "Flexible";
    const venue =
        project.location && typeof project.location === "object"
            ? (project.location.venue || "To be shared after login")
            : displayLocation;
    const orgCity =
        project.organization?.city ||
        (project.location && typeof project.location === "object"
            ? project.location.city || project.location.district || ""
            : "");
    const sdgLabel = project.sdg_info?.sdg_id || (project.sdg ? `SDG ${project.sdg}` : "UN Global Goal");
    const sdgDescription =
        project.sdg_info?.description || "This opportunity supports measurable community impact goals.";

    return (
        <main className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 pb-20">
            <Navbar />

            <div className="pt-40 px-6 max-w-5xl mx-auto mb-10 text-center md:text-left transition-all">
                <Link href="/projects" className="group inline-flex items-center gap-2 text-slate-500 hover:text-[#4285F4] font-black text-[10px] uppercase tracking-widest mb-10">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Projects list
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight leading-tight">{project.title}</h1>
                        <p className="text-lg font-bold text-[#4285F4]">{partnerName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {project.mode ? (
                            <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
                                {project.mode}
                            </span>
                        ) : null}
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                status.toLowerCase() === "active" ? "bg-green-50 text-green-700 border border-green-100" :
                                status.toLowerCase() === "recruiting" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                                "bg-slate-50 text-slate-600 border border-slate-100"
                            }`}>
                                {status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Consolidated Details Card */}
            <div className="px-6 max-w-5xl mx-auto">
                <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 animate-fade-in-up">
                    
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-10 mb-10 border-b border-slate-100">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                                <MapPin className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Location</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">{displayLocation}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Users className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Volunteers</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">{volunteersNeeded} Needed</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Hours</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">{expectedHours || 0} Hours</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Tag className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Category</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">{category}</span>
                        </div>
                    </div>

                    {/* Description Section */}
                    <div className="mb-10">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">About the Project</h3>
                        <p className="text-base text-slate-600 leading-7 whitespace-pre-line">
                            {primaryDescription}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Building2 className="w-5 h-5 text-[#4285F4]" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Organization</h3>
                            </div>
                            <div className="space-y-2 text-sm text-slate-600">
                                <p><span className="font-bold text-slate-900">Name:</span> {partnerName}</p>
                                <p><span className="font-bold text-slate-900">City:</span> {orgCity || "Not provided"}</p>
                                <p><span className="font-bold text-slate-900">Mode:</span> {project.mode || "Not provided"}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Globe2 className="w-5 h-5 text-[#4285F4]" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">SDG Alignment</h3>
                            </div>
                            <div className="space-y-2 text-sm text-slate-600">
                                <p><span className="font-bold text-slate-900">Goal:</span> {sdgLabel}</p>
                                <p className="leading-6">{sdgDescription}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Clock className="w-5 h-5 text-[#4285F4]" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Quick Info</h3>
                            </div>
                            <div className="space-y-2 text-sm text-slate-600">
                                <p><span className="font-bold text-slate-900">Start:</span> {startDate}</p>
                                <p><span className="font-bold text-slate-900">End:</span> {endDate}</p>
                                <p><span className="font-bold text-slate-900">Duration:</span> {duration}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Target className="w-5 h-5 text-[#4285F4]" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Student Responsibilities</h3>
                            </div>
                            <p className="text-sm text-slate-600 leading-7 whitespace-pre-line">
                                {project.activity_details?.student_responsibilities || "Detailed student responsibilities will be shared after login through the student dashboard."}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Building2 className="w-5 h-5 text-[#4285F4]" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Timeline & Venue</h3>
                            </div>
                            <div className="space-y-3 text-sm text-slate-600">
                                <p><span className="font-bold text-slate-900">Start:</span> {startDate}</p>
                                <p><span className="font-bold text-slate-900">End:</span> {endDate}</p>
                                <p><span className="font-bold text-slate-900">Venue:</span> {venue}</p>
                                <p><span className="font-bold text-slate-900">Location:</span> {displayLocation}</p>
                                <p><span className="font-bold text-slate-900">Beneficiaries:</span> {beneficiaries}</p>
                                <p><span className="font-bold text-slate-900">Beneficiary Type:</span> {beneficiaryTypes.length > 0 ? beneficiaryTypes.join(", ") : "Not provided"}</p>
                            </div>
                        </div>
                    </div>

                    {(skills.length > 0 || verificationMethods.length > 0 || project.supervision) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            <div className="md:col-span-2 bg-white border border-slate-100 rounded-3xl p-6">
                                <div className="flex items-center gap-3 mb-5">
                                    <Sparkles className="w-5 h-5 text-[#4285F4]" />
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Skills & Verification</h3>
                                </div>
                                {skills.length > 0 ? (
                                    <div className="flex flex-wrap gap-3 mb-6">
                                        {skills.map((skill) => (
                                            <span key={skill} className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                                {verificationMethods.length > 0 ? (
                                    <div className="space-y-2">
                                        {verificationMethods.map((method) => (
                                            <div key={method} className="flex items-start gap-2 text-sm text-slate-600">
                                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                                                <span>{method}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Globe2 className="w-5 h-5 text-[#4285F4]" />
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Supervision</h3>
                                </div>
                                <div className="space-y-3 text-sm text-slate-600">
                                    <p><span className="font-bold text-slate-900">Organization:</span> {partnerName}</p>
                                    <p><span className="font-bold text-slate-900">Supervisor:</span> {project.supervision?.supervisor_name || "Assigned Coordinator"}</p>
                                    <p><span className="font-bold text-slate-900">Role:</span> {project.supervision?.role || "Project Lead"}</p>
                                    <p><span className="font-bold text-slate-900">Safe Environment:</span> {project.supervision?.safe_environment ? "Confirmed" : "Shared after onboarding"}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Apply Action */}
                    <Link 
                        href={applyHref}
                        className="w-full flex items-center justify-center py-4 rounded-2xl bg-[#4285F4] text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-blue-100 tracking-[0.2em] uppercase"
                    >
                        {applyLabel}
                    </Link>
                    <p className="text-[10px] text-center text-slate-400 font-black mt-6 tracking-widest uppercase italic">
                        Apply flow student dashboard me available hai. Login karke Browse Opportunities se apply karein.
                    </p>
                </div>
            </div>

            <PartnersFooter />
            <FooterBanner />
            <Footer />
        </main>
    );
}

