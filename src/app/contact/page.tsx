"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin, Send, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "General Inquiry",
        message: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: "" });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: null, message: "" });

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
            const response = await fetch(`${backendUrl}/public/contact/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                setStatus({ type: 'success', message: "Your message has been sent successfully! We'll get back to you shortly." });
                setFormData({ name: "", email: "", subject: "General Inquiry", message: "" });
            } else {
                setStatus({ type: 'error', message: data.message || "Failed to send message. Please try again later." });
            }
        } catch (err) {
            console.error("Contact form error:", err);
            setStatus({ type: 'error', message: "An unexpected error occurred. Please check your connection." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-white font-sans">
            <Navbar />

            {/* Page Header */}
            <section className="pt-32 pb-12 bg-emerald-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-orange-100 rounded-full blur-[80px] -z-10 translate-x-1/3 -translate-y-1/3" />
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-4 tracking-tight">
                        Get in <span className="text-emerald-500">Touch</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl mx-auto">
                        Have questions about our programs or want to partner with us? We'd love to hear from you.
                    </p>
                </div>
            </section>

            <section className="py-20 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Contact Information */}
                    <div className="space-y-10">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Contact Information</h2>
                            <p className="text-slate-600 leading-relaxed mb-8">
                                Reach out to us directly for immediate assistance or inquiries about our community impact initiatives.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-colors group">
                                <div className="p-3 bg-white rounded-full shadow-sm text-emerald-500 group-hover:text-emerald-600">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 mb-1">Email Us</h3>
                                    <p className="text-slate-600 font-bold">support@cielpk.com</p>
                                    <p className="text-slate-500 text-sm mt-1">Response time: 24 hours</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-colors group">
                                <div className="p-3 bg-white rounded-full shadow-sm text-emerald-500 group-hover:text-emerald-600">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 mb-1">Call Us</h3>
                                    <p className="text-slate-600 font-bold">+92 300 1234567</p>
                                    <p className="text-slate-500 text-sm mt-1">Mon-Fri, 9am - 5pm EST</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-colors group">
                                <div className="p-3 bg-white rounded-full shadow-sm text-emerald-500 group-hover:text-emerald-600">
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 mb-1">Visit Us</h3>
                                    <p className="text-slate-600 font-bold">Islamabad, Pakistan</p>
                                    <p className="text-slate-500 text-sm mt-1">By appointment only</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-100 shadow-xl relative overflow-hidden">
                        {status.type === 'success' && (
                            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-10 text-center animate-fade-in">
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-3">Message Received!</h3>
                                <p className="text-slate-600 font-medium mb-10">{status.message}</p>
                                <button 
                                    onClick={() => setStatus({ type: null, message: "" })}
                                    className="px-8 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all"
                                >
                                    Send Another Message
                                </button>
                            </div>
                        )}

                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Send a Message</h2>
                        
                        {status.type === 'error' && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-bold">
                                <AlertCircle className="w-5 h-5" />
                                {status.message}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-bold text-slate-700">Full Name</label>
                                    <input 
                                        type="text" id="name" required placeholder="John Doe" 
                                        value={formData.name} onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-slate-50 focus:bg-white" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-bold text-slate-700">Email Address</label>
                                    <input 
                                        type="email" id="email" required placeholder="john@example.com" 
                                        value={formData.email} onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-slate-50 focus:bg-white" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="subject" className="text-sm font-bold text-slate-700">Subject</label>
                                <select 
                                    id="subject" value={formData.subject} onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-slate-50 focus:bg-white text-slate-600"
                                >
                                    <option>General Inquiry</option>
                                    <option>Partnership Opportunity</option>
                                    <option>Student Support</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-bold text-slate-700">Message</label>
                                <textarea 
                                    id="message" rows={5} required placeholder="How can we help you?" 
                                    value={formData.message} onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-slate-50 focus:bg-white resize-none"
                                ></textarea>
                            </div>

                            <button 
                                type="submit" disabled={isSubmitting}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-bold rounded-xl shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Sending Intelligence...
                                    </>
                                ) : (
                                    <>
                                        Send Message
                                        <Send className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}

