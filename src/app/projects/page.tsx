"use client";

import Navbar from "@/components/Navbar";
import PartnersFooter from "@/components/PartnersFooter";
import FooterBanner from "@/components/FooterBanner";
import { Search, MapPin, Users, Calendar, ArrowRight, Filter } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

// Mock Data for Public View
const MOCK_PROJECTS = [
    {
        id: 1,
        title: "Clean Water Initiative",
        org: "Water for Life",
        location: "Tharparkar, Sindh",
        status: "Active",
        volunteers: 45,
        description: "Installing solar-powered water pumps in remote villages to provide clean drinking water.",
        category: "Infrastructure"
    },
    {
        id: 2,
        title: "Tech Skills for Youth",
        org: "Digital Future",
        location: "Lahore, Punjab",
        status: "Recruiting",
        volunteers: 120,
        description: "A 3-month coding boot camp for underprivileged youth to cover basic web development skills.",
        category: "Education"
    },
    {
        id: 3,
        title: "Urban Forest Drive",
        org: "Green Pakistan",
        location: "Islamabad",
        status: "Completed",
        volunteers: 300,
        description: "Planting 10,000 trees in the capital city to combat urban heat islands.",
        category: "Environment"
    },
    {
        id: 4,
        title: "Rural Health Camp",
        org: "Red Crescent",
        location: "Swat, KPK",
        status: "Active",
        volunteers: 25,
        description: "Providing free medical checkups and medicine to remote mountain communities.",
        category: "Health"
    },
    {
        id: 5,
        title: "Women Entrepreneurship",
        org: "Empower Her",
        location: "Quetta, Balochistan",
        status: "Active",
        volunteers: 15,
        description: "Workshops on financial literacy and small business management for women.",
        category: "Economic Growth"
    },
    {
        id: 6,
        title: "School Renovation",
        org: "Build Education",
        location: "Multan, Punjab",
        status: "Recruiting",
        volunteers: 60,
        description: "Repairing classrooms and installing fans in government primary schools.",
        category: "Infrastructure"
    }
];

export default function ProjectsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    const categories = ["All", "Education", "Health", "Environment", "Infrastructure", "Economic Growth"];

    const filteredProjects = MOCK_PROJECTS.filter(project => {
        const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.location.toLowerCase().includes(searchQuery.toLowerCase());
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project, index) => (
                        <div key={project.id} className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col hover:shadow-lg transition-all hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: `${(index + 3) * 50}ms` }}>

                            <div className="flex items-center justify-between mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${project.status === 'Active' ? 'bg-green-100 text-green-700' :
                                    project.status === 'Recruiting' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                    {project.status}
                                </span>
                                <span className="text-xs font-bold text-slate-400">{project.category}</span>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-2">{project.title}</h3>
                            <p className="text-sm font-semibold text-blue-600 mb-4">{project.org}</p>

                            <p className="text-slate-500 text-sm mb-6 flex-grow leading-relaxed">
                                {project.description}
                            </p>

                            <div className="border-t border-slate-50 pt-4 flex items-center justify-between text-sm text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4" /> {project.location}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4" /> {project.volunteers}
                                </div>
                            </div>

                            <Link
                                href={`/projects/${project.id}`}
                                className="mt-6 w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 group"
                            >
                                View Details <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            <PartnersFooter />
            <FooterBanner />
        </main>
    );
}
