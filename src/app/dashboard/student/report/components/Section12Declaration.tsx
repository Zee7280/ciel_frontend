import { ShieldCheck, FileCheck, CheckCircle2, UserCheck, Calendar, Lock, Signature, Landmark } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { FileUpload } from "./ui/file-upload";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

export default function Section12Declaration() {
    const { data, updateSection } = useReportForm();
    const { student_declaration, partner_verification } = data.section12;

    return (
        <div className="space-y-12">
            {/* Section Header */}
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Formal Attestation</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Declarations & Verifications</h2>
                <p className="text-slate-500 max-w-2xl font-medium">Finalize your submission by certifying the truthfulness of the information provided and attaching partner proof.</p>
            </div>

            {/* Student Declaration Card */}
            <div className="space-y-8">
                <div
                    className={clsx(
                        "group relative overflow-hidden transition-all duration-500 rounded-[3rem] p-1 shadow-2xl cursor-pointer",
                        student_declaration
                            ? "bg-gradient-to-br from-green-400 to-green-600 scale-[1.02]"
                            : "bg-slate-200"
                    )}
                >
                    <div className="bg-white rounded-[2.8rem] p-10 space-y-8 relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                                <div className={clsx(
                                    "w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 border shadow-lg",
                                    student_declaration
                                        ? "bg-green-100 text-green-600 border-green-200 scale-110"
                                        : "bg-slate-50 text-slate-300 border-slate-100"
                                )}>
                                    <Signature className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Student Declaration</h3>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Formal Certification of Accuracy</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 px-6 py-4 rounded-[2rem] bg-slate-50 border border-slate-100">
                                <Checkbox
                                    id="decl-student"
                                    checked={student_declaration}
                                    onChange={(e: any) => updateSection('section12', { student_declaration: e.target.checked })}
                                    className="w-6 h-6 rounded-full border-slate-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                />
                                <Label htmlFor="decl-student" className="text-xs font-black text-slate-500 uppercase tracking-widest cursor-pointer">Signed & Certified</Label>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 relative group-hover:bg-slate-50 transition-colors">
                            <p className="text-lg font-medium text-slate-700 leading-relaxed italic">
                                "I hereby certify that the information, data points, and visual evidence submitted in this report are accurate, truthful, and were collected adhering to all ethical guidelines and university standards for social responsibility projects."
                            </p>
                            <div className="mt-8 pt-8 border-t border-slate-100 flex flex-wrap items-center gap-10">
                                <div className="flex items-center gap-3">
                                    <UserCheck className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signatory student</div>
                                        <div className="text-xs font-bold text-slate-900">Ayesha Khan</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dated</div>
                                        <div className="text-xs font-bold text-slate-900">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Lock className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security</div>
                                        <div className="text-xs font-bold text-slate-900">Blockchain Verified</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Partner Verification Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
                    <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-900 border border-slate-200 shadow-sm">
                                <Landmark className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-slate-900 tracking-tight">External Verification</h4>
                                <p className="text-xs text-slate-500 font-medium italic">Partner-side confirmation of data.</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <Checkbox
                                id="partner-verify"
                                checked={partner_verification}
                                onChange={(e: any) => updateSection('section12', { partner_verification: e.target.checked })}
                                className="w-5 h-5 rounded-md border-slate-300"
                            />
                            <Label htmlFor="partner-verify" className="text-xs font-black text-slate-700 uppercase tracking-widest cursor-pointer leading-tight">
                                I have received partner confirmation
                            </Label>
                        </div>

                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            While optional, attaching a formal letter from your partner organization significantly increases the credibility of your report.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-[3rem] p-1 shadow-inner group">
                        <div className="bg-slate-50 rounded-[2.9rem] h-full p-10 flex flex-col items-center justify-center text-center space-y-6 border border-white">
                            <div className="w-16 h-16 rounded-[2rem] bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                <FileCheck className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h5 className="font-bold text-slate-900">Upload Confirmation Proof</h5>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PDF, JPG or PNG (Max 5MB)</p>
                            </div>
                            <FileUpload label="Attach Verification Document" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
