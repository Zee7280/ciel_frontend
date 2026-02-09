
"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin, Send, ArrowRight } from "lucide-react";

export default function ContactPage() {
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
                                    <p className="text-slate-600">hello@ciel.pk</p>
                                    <p className="text-slate-500 text-sm mt-1">Response time: 24 hours</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-colors group">
                                <div className="p-3 bg-white rounded-full shadow-sm text-emerald-500 group-hover:text-emerald-600">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 mb-1">Call Us</h3>
                                    <p className="text-slate-600">+92 300 1234567</p>
                                    <p className="text-slate-500 text-sm mt-1">Mon-Fri, 9am - 5pm EST</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-colors group">
                                <div className="p-3 bg-white rounded-full shadow-sm text-emerald-500 group-hover:text-emerald-600">
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 mb-1">Visit Us</h3>
                                    <p className="text-slate-600">Islamabad, Pakistan</p>
                                    <p className="text-slate-500 text-sm mt-1">By appointment only</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-100 shadow-xl">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Send a Message</h2>
                        <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-bold text-slate-700">Full Name</label>
                                    <input type="text" id="name" placeholder="John Doe" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-bold text-slate-700">Email Address</label>
                                    <input type="email" id="email" placeholder="john@example.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="subject" className="text-sm font-bold text-slate-700">Subject</label>
                                <select id="subject" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white text-slate-600">
                                    <option>General Inquiry</option>
                                    <option>Partnership Opportunity</option>
                                    <option>Student Support</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-bold text-slate-700">Message</label>
                                <textarea id="message" rows={5} placeholder="How can we help you?" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white resize-none"></textarea>
                            </div>

                            <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.6)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2">
                                Send Message
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}

