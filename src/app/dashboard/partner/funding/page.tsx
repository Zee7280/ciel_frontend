"use client";

import { useState, useEffect } from "react";
import { DollarSign, Calendar, FileText, Send, CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import FundingApplicationForm from "@/components/partners/FundingApplicationForm";

interface FundingOpportunity {
    id: number;
    title: string;
    amount: number;
    deadline: string;
    eligibility: string;
    status: "open" | "closed";
}

interface Application {
    id: number;
    fundingTitle: string;
    amount: number;
    status: "pending" | "approved" | "rejected";
    submittedDate: string;
}

function FundingEmpty({ title, text }: { title: string; text: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
            <DollarSign className="mx-auto mb-3 h-9 w-9 text-slate-300" />
            <p className="font-bold text-slate-800">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
        </div>
    );
}

export default function PartnerFundingPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [activeTab, setActiveTab] = useState<"opportunities" | "applications">("opportunities");
    const [selectedOpportunity, setSelectedOpportunity] = useState<FundingOpportunity | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [oppRes, appRes] = await Promise.all([
                authenticatedFetch(`/api/v1/partners/funding/opportunities`),
                authenticatedFetch(`/api/v1/partners/funding/applications`)
            ]);

            if (oppRes && oppRes.ok) {
                const data = await oppRes.json();
                if (data.success) setOpportunities(data.data || []);
            }

            if (appRes && appRes.ok) {
                const data = await appRes.json();
                if (data.success) setApplications(data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch funding data", error);
            toast.error("Failed to load funding information");
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "open": return "bg-green-100 text-green-700";
            case "closed": return "bg-slate-100 text-slate-700";
            case "pending": return "bg-blue-100 text-blue-700";
            case "approved": return "bg-green-100 text-green-700";
            case "rejected": return "bg-red-100 text-red-700";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Funding Opportunities</h1>
                <p className="text-slate-500">Explore and apply for funding to scale your impact.</p>
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-4 overflow-x-auto border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("opportunities")}
                    className={`pb-3 px-4 font-semibold transition-colors relative ${activeTab === "opportunities"
                        ? "text-[#0e7d74]"
                        : "text-slate-500 hover:text-slate-700"
                        }`}
                >
                    Available Opportunities
                    {activeTab === "opportunities" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0e7d74]" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("applications")}
                    className={`pb-3 px-4 font-semibold transition-colors relative ${activeTab === "applications"
                        ? "text-[#0e7d74]"
                        : "text-slate-500 hover:text-slate-700"
                        }`}
                >
                    My Applications{applications.length ? ` (${applications.length})` : ""}
                    {activeTab === "applications" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0e7d74]" />
                    )}
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                </div>
            ) : activeTab === "opportunities" && opportunities.length === 0 ? (
                <FundingEmpty title="No funding calls open right now" text="New funding opportunities from CIEL PK and its partners will appear here." />
            ) : activeTab === "applications" && applications.length === 0 ? (
                <FundingEmpty title="No applications yet" text="Applications you submit for open funding calls are tracked here." />
            ) : activeTab === "opportunities" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {opportunities.map((opp) => (
                        <div
                            key={opp.id}
                            className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <h3 className="text-xl font-bold text-slate-900">{opp.title}</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(opp.status)}`}>
                                    {opp.status}
                                </span>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                    <span className="font-semibold">Up to ${Number(opp.amount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    <span>Deadline: {new Date(opp.deadline).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-start gap-3 text-slate-600">
                                    <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
                                    <span className="text-sm">{opp.eligibility}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedOpportunity(opp)}
                                disabled={opp.status === "closed"}
                                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${opp.status === "open"
                                    ? "bg-[#0e7d74] text-white hover:bg-[#0b6760]"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    }`}
                            >
                                <Send className="w-5 h-5" />
                                {opp.status === "open" ? "Apply Now" : "Closed"}
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {applications.map((app) => (
                        <div
                            key={app.id}
                            className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:p-6"
                        >
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{app.fundingTitle}</h3>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                                    <span className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        ${Number(app.amount || 0).toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(app.submittedDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase flex items-center gap-2 ${getStatusColor(app.status)}`}>
                                {app.status === "pending" && <Clock className="w-4 h-4" />}
                                {app.status === "approved" && <CheckCircle className="w-4 h-4" />}
                                {app.status === "rejected" && <AlertCircle className="w-4 h-4" />}
                                {app.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {selectedOpportunity && (
                <FundingApplicationForm
                    opportunity={selectedOpportunity}
                    onClose={() => setSelectedOpportunity(null)}
                    onSuccess={() => {
                        setSelectedOpportunity(null);
                        setActiveTab("applications");
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}
