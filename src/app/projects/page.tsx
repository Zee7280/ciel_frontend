"use client";

import Navbar from "@/components/Navbar";
import PartnersFooter from "@/components/PartnersFooter";
import FooterBanner from "@/components/FooterBanner";
import Footer from "@/components/Footer";
import { Search, MapPin, Users, Calendar, ArrowRight, Filter, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Project {
    id: string | number;
    title: string;
    partner_name?: string;
    org?: string;
    location?: string;
    status: string;
    participant_count?: number;
    volunteers?: number;
    description: string;
    category?: string;
    types?: string[];
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    const categories = ["All", "Education", "Health", "Environment", "Infrastructure", "Economic Growth"];

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
                const response = await fetch(`${backendUrl}/public/opportunities`);
                const data = await response.json();
                
                if (data.success && Array.isArray(data.data)) {
                    // Map API fields to UI fields
                    const mappedProjects = data.data.map((p: any) => {
                        // Handle location if it's an object {pin, city, venue}
                        let displayLocation = "Remote / Pakistan";
                        if (typeof p.location === 'object' && p.location !== null) {
                            const parts = [];
                            if (p.location.city) parts.push(p.location.city);
                            if (p.location.venue) parts.push(p.location.venue);
                            displayLocation = parts.length > 0 ? parts.join(", ") : (p.location.pin || "Pakistan");
                        } else if (typeof p.location === 'string' && p.location.trim()) {
                            displayLocation = p.location;
                        }

                        return {
                            id: p.id,
                            title: p.title,
                            org: p.partner_name || "Verified Partner",
                            location: displayLocation,
                            status: p.status || "Active",
                            volunteers: p.participant_count || 0,
                            description: p.description,
                            category: (p.types && p.types.length > 0) ? p.types[0] : "Social Impact"
                        };
                    });
                    setProjects(mappedProjects);
                }
            } catch (err) {
                console.error("Failed to fetch projects:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (project.location || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "All" || project.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <main className="min-h-screen bg-slate-50 font-sans">
            <Navbar />

            {/* Header */}
            <section className="pt-32 pb-12 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-2 animate-fade-in-up">Active Projects</h1>
                        <p className="text-slate-500 animate-fade-in-up" style={{ animationDelay: '100ms' }}>Discover how our community is making a difference across Pakistan.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center mb-10 animate-fade-in-up" style={{ animationDelay: '200ms' }}>

                    {/* Search */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search projects or locations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium"
                        />
                    </div>

                    {/* Categories */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                        <Filter className="w-5 h-5 text-slate-400 hidden md:block" />
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${selectedCategory === cat
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin" />
                        <p className="font-bold text-sm tracking-widest uppercase">Fetching Projects...</p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold">No projects found matching your criteria.</p>
                        <button 
                            onClick={() => {setSearchQuery(""); setSelectedCategory("All");}} 
                            className="mt-4 text-blue-600 font-bold hover:underline"
                        >
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredProjects.map((project, index) => (
                            <div key={project.id} className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">

                                <div className="flex items-center justify-between mb-6">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        project.status?.toLowerCase() === 'active' ? 'bg-green-50 text-green-700 border border-green-100' :
                                        project.status?.toLowerCase() === 'recruiting' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                        'bg-slate-50 text-slate-600 border border-slate-100'
                                    }`}>
                                        {project.status}
                                    </span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{project.category}</span>
                                </div>

                                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight group-hover:text-blue-600 transition-colors line-clamp-2">{project.title}</h3>
                                <p className="text-sm font-bold text-blue-500 mb-6">{project.org}</p>

                                <p className="text-slate-500 text-[15px] font-medium mb-8 flex-grow leading-relaxed line-clamp-3">
                                    {project.description}
                                </p>

                                <div className="border-t border-slate-50 pt-6 flex items-center justify-between text-[13px] font-bold text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-300" /> {project.location}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-slate-300" /> {project.volunteers}
                                    </div>
                                </div>

                                <Link
                                    href={`/projects/${project.id}`}
                                    className="mt-8 w-full py-4 rounded-2xl bg-slate-50 text-slate-900 font-bold text-sm hover:bg-slate-900 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                                >
                                    View Details <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform" />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <PartnersFooter />
            <FooterBanner />
            <Footer />
        </main>
    );
}
