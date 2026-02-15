"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Facebook, Instagram, Youtube, Twitter, Phone } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-white pt-8 pb-10 border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-8">
                    {/* Left Column: Brand & Newsletter */}
                    <div className="max-w-md">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 mb-4 group cursor-pointer">
                            <div className="relative w-10 h-10 flex items-center justify-center">
                                <Image src="/ciel-logo-v2.png" alt="CIEL Logo" width={40} height={40} className="object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                                    CIEL <span className="text-emerald-500">PK</span>
                                </span>
                            </div>
                        </Link>

                        <p className="text-slate-500 font-medium mb-4 leading-relaxed">
                            Stay in the loop and sign up for the <br />
                            CIEL PK newsletter:
                        </p>

                        {/* Newsletter Input */}
                        <div className="relative mb-6">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="w-full pl-6 pr-14 py-4 rounded-full border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow shadow-sm"
                            />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-orange-400 hover:bg-orange-500 text-white rounded-full transition-colors shadow-md">
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-sm text-slate-500">
                            <div>
                                <p className="font-bold text-slate-900">Contact Us</p>
                                <a href="mailto:support@cielpk.com" className="block hover:text-emerald-600 transition-colors">support@cielpk.com</a>
                            </div>

                            <a
                                href="https://wa.me/923001234567" // Placeholder number, user should update or provide
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                            >
                                <Phone className="w-4 h-4 fill-current" />
                                <span>WhatsApp Us</span>
                            </a>
                        </div>
                    </div>

                    {/* Right Column: Links & Contact Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                        {/* Links Section */}
                        <div className="grid grid-cols-2 gap-8">
                            {/* Organization Links */}
                            <div>
                                <h4 className="font-bold text-slate-900 mb-4">Organization</h4>
                                <ul className="space-y-3">
                                    {['Home', 'How It Works', 'About Us', 'FAQs'].map((item) => (
                                        <li key={item}>
                                            <Link href="#" className="text-slate-500 hover:text-orange-500 font-medium text-sm transition-colors">
                                                {item}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Social Links */}
                            <div>
                                <h4 className="font-bold text-slate-900 mb-4">Social</h4>
                                <ul className="space-y-3">
                                    {[
                                        { name: 'Facebook', icon: Facebook },
                                        { name: 'Instagram', icon: Instagram },
                                        { name: 'Youtube', icon: Youtube },
                                        { name: 'Twitter', icon: Twitter }
                                    ].map((item) => (
                                        <li key={item.name}>
                                            <Link href="#" className="text-slate-500 hover:text-orange-500 font-medium text-sm transition-colors flex items-center gap-2">
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Quick Contact Form */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <h4 className="font-bold text-slate-900 mb-4">Get in Touch</h4>
                            <form className="space-y-3">
                                <input type="text" placeholder="Name" className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                <textarea placeholder="Message" rows={2} className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"></textarea>
                                <button type="button" className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">
                                    Send Message
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm font-bold text-slate-500">
                        © CIEL PK. All Rights Reserved 2026
                    </p>
                    <div className="flex gap-8">
                        <Link href="#" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                            Terms & Conditions
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
