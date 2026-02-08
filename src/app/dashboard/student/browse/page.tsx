"use client";

import { useEffect, useState } from "react";
import { Button } from "../report/components/ui/button";
import { Badge } from "../report/components/ui/badge";
import { authenticatedFetch } from "@/utils/api";
import { Loader2, MapPin, Calendar, Clock, Globe, ArrowRight, CheckCircle2, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import ApplicationDialog from "./components/ApplicationDialog";

export default function StudentBrowseOpportunitiesPage() {
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [applyingTitle, setApplyingTitle] = useState<string | undefined>(undefined);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Filters & View State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sdgFilter, setSdgFilter] = useState<string>('all');
    const [cityFilter, setCityFilter] = useState<string>('all');

    // Derived Data
    const uniqueSDGs = Array.from(new Set(opportunities.map(op => op.category || "Social Impact"))).sort();
    const uniqueCities = Array.from(new Set(opportunities.map(op => op.city || "Remote"))).sort();

    const filteredOpportunities = opportunities.filter(op => {
        const matchSDG = sdgFilter === 'all' || (op.category || "Social Impact") === sdgFilter;
        const matchCity = cityFilter === 'all' || (op.city || "Remote") === cityFilter;
        return matchSDG && matchCity;
    });

    const openApplicationDialog = (id: string, title: string) => {
        setApplyingId(id);
        setApplyingTitle(title);
        setIsDialogOpen(true);
    };

    const handleSuccess = (id: string) => {
        setOpportunities(prev => prev.map(op =>
            op.id === id ? { ...op, hasApplied: true } : op
        ));
        setApplyingId(null);
        setApplyingTitle(undefined);
    };

    useEffect(() => {
        fetchOpportunities();
    }, []);

    const fetchOpportunities = async () => {
        try {
            // Get user info first to get the ID
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

            // Fetching all approved opportunities using the requested endpoint
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/opportunities?status=approved`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ student_id: userId })
            });

            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    const mappedOps = (data.data || []).map((op: any) => ({
                        ...op,
                        hasApplied: op.status === 'applied' || op.hasApplied
                    }));
                    setOpportunities(mappedOps);
                }
            }
        } catch (error) {
            console.error("Failed to fetch opportunities", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = async (opportunityId: string) => {
        setApplyingId(opportunityId);
        try {
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/opportunities/${opportunityId}/apply`, {
                method: 'POST'
            });

            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    toast.success("Application submitted successfully!");
                    // Refresh list or update local state
                    setOpportunities(prev => prev.map(op =>
                        op.id === opportunityId ? { ...op, hasApplied: true } : op
                    ));
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
            setApplyingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Browse Opportunities</h1>
                    <p className="text-slate-500">Discover and apply to volunteer projects from our partners.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Filters */}
                    <select
                        value={sdgFilter}
                        onChange={(e) => setSdgFilter(e.target.value)}
                        className="h-9 px-3 text-sm rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="all">All Categories</option>
                        {uniqueSDGs.map(sdg => <option key={sdg} value={sdg}>{sdg}</option>)}
                    </select>

                    <select
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        className="h-9 px-3 text-sm rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="all">All Cities</option>
                        {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
                    </select>

                    <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block" />

                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {filteredOpportunities.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
                    <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">No Opportunities Found</h3>
                    <p className="text-slate-500 mb-6">Try adjusting your filters.</p>
                    <Button variant="outline" onClick={() => { setSdgFilter('all'); setCityFilter('all'); }}>Clear Filters</Button>
                </div>
            ) : (
                <div className={viewMode === 'grid'
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "space-y-4"
                }>
                    {filteredOpportunities.map((op) => (
                        viewMode === 'grid' ? (
                            // GRID VIEW CARD
                            <div key={op.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
                                <div className="p-6 flex-1 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">
                                            {op.category || "Social Impact"}
                                        </Badge>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {op.mode || "On Site"}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                            {op.title}
                                        </h3>
                                        <p className="text-sm font-medium text-slate-500 mt-1 line-clamp-1">
                                            by {op.organization_name || "Partner Organization"}
                                        </p>
                                    </div>

                                    <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                                        {op.description}
                                    </p>

                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {op.city || "Remote"}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {op.start_date ? new Date(op.start_date).toLocaleDateString() : "Flexible Dates"}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            {op.hours || "0"} Hours Credit
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-slate-50 bg-slate-50/50 rounded-b-2xl flex justify-between items-center">
                                    <Link href={`/dashboard/student/browse/${op.id}`} className="text-sm font-bold text-slate-600 hover:text-slate-900">
                                        View Details
                                    </Link>
                                    {op.hasApplied ? (
                                        <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50 pointer-events-none">
                                            <CheckCircle2 className="w-4 h-4 mr-1" /> Applied
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            className="bg-slate-900 hover:bg-blue-600 text-white transition-colors"
                                            onClick={() => openApplicationDialog(op.id, op.title)}
                                            disabled={op.hasApplied}
                                        >
                                            Apply Now
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // LIST VIEW CARD
                            <div key={op.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all group flex flex-col md:flex-row gap-6 items-start md:items-center">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">
                                            {op.category || "Social Impact"}
                                        </Badge>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {op.mode || "On Site"}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                        {op.title}
                                    </h3>

                                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-slate-500">
                                        <span className="font-medium text-slate-600">by {op.organization_name || "Partner Organization"}</span>
                                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {op.city || "Remote"}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {op.start_date ? new Date(op.start_date).toLocaleDateString() : "Flexible Dates"}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {op.hours || "0"} Hours</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
                                    <Link href={`/dashboard/student/browse/${op.id}`} className="flex-1 md:flex-none">
                                        <Button variant="outline" className="w-full">Details</Button>
                                    </Link>
                                    {op.hasApplied ? (
                                        <Button variant="ghost" className="text-green-600 bg-green-50 pointer-events-none flex-1 md:flex-none">
                                            <CheckCircle2 className="w-4 h-4 mr-2" /> Applied
                                        </Button>
                                    ) : (
                                        <Button
                                            className="bg-slate-900 hover:bg-blue-600 text-white transition-colors flex-1 md:flex-none"
                                            onClick={() => openApplicationDialog(op.id, op.title)}
                                            disabled={op.hasApplied}
                                        >
                                            Apply Now
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}

            <ApplicationDialog
                opportunityId={applyingId}
                opportunityTitle={applyingTitle}
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                        setApplyingId(null);
                        setApplyingTitle(undefined);
                    }
                }}
                onSuccess={handleSuccess}
            />
        </div>
    );
}
