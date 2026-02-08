import { Activity, Landmark, Coins, Receipt, Car, Printer, Utensils, Box, MoreHorizontal, AlertCircle, FileCheck, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { FileUpload } from "./ui/file-upload";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

export default function Section4Activities() {
    const { data, updateSection } = useReportForm();
    const {
        activity_description,
        has_financial_resources,
        personal_funds,
        raised_funds,
        personal_funds_purpose,
        raised_funds_source
    } = data.section4;

    const handlePurposeChange = (item: string, checked: boolean) => {
        const current = [...personal_funds_purpose];
        if (checked) {
            updateSection('section4', { personal_funds_purpose: [...current, item] });
        } else {
            updateSection('section4', { personal_funds_purpose: current.filter(i => i !== item) });
        }
    };

    const financeOptions = [
        { id: 'Transport', icon: Car, label: 'Transport' },
        { id: 'Printing', icon: Printer, label: 'Printing' },
        { id: 'Food', icon: Utensils, label: 'Food' },
        { id: 'Equipment', icon: Box, label: 'Equipment' },
        { id: 'Other', icon: MoreHorizontal, label: 'Other' }
    ];

    return (
        <div className="space-y-12">
            {/* Section Header */}
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                    <Activity className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Execution & Logistics</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Activities & Resources</h2>
                <p className="text-slate-500 max-w-2xl font-medium">Detail the specific actions taken and the resources utilized to achieve your project goals.</p>
            </div>

            {/* Activities Description */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg border-2 border-slate-700">1</div>
                    <h3 className="text-xl font-bold text-slate-900">What did you actually do?</h3>
                </div>

                <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 space-y-4">
                            <Label className="text-sm font-bold text-slate-700">Detailed Activity Description</Label>
                            <Textarea
                                placeholder="Describe the steps, engagement levels, and factual execution flow..."
                                className="min-h-[220px] rounded-[1.5rem] border-slate-200 p-6 font-medium text-slate-700 shadow-sm focus:ring-4 focus:ring-blue-50 transition-all bg-white"
                                value={activity_description}
                                onChange={(e) => updateSection('section4', { activity_description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileCheck className="w-3 h-3 text-green-500" /> Reporting Guide
                                </h4>
                                <ul className="space-y-3">
                                    {[
                                        "Use factual, neutral language.",
                                        "Specify the number of sessions.",
                                        "Mention who the audience was.",
                                        "Avoid emotive or flowery text."
                                    ].map((guide, i) => (
                                        <li key={i} className="text-xs font-medium text-slate-500 leading-relaxed flex gap-2">
                                            <div className="w-1 h-1 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                                            {guide}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-800 font-bold leading-relaxed">Ensure this matches the evidence photos you'll upload later.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Resources */}
            <div className="space-y-8 pt-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-xl italic font-serif">Rs</div>
                        <h3 className="text-xl font-bold text-slate-900">Resource Utilization</h3>
                    </div>
                    <RadioGroup
                        value={has_financial_resources}
                        onValueChange={(val) => updateSection('section4', { has_financial_resources: val as 'yes' | 'no' })}
                        className="flex items-center gap-6"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="no-finance" className="border-slate-300" />
                            <Label htmlFor="no-finance" className="text-xs font-bold text-slate-500 cursor-pointer">Time Only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="yes-finance" className="border-slate-300" />
                            <Label htmlFor="yes-finance" className="text-xs font-bold text-slate-500 cursor-pointer">Financial Resources</Label>
                        </div>
                    </RadioGroup>
                </div>

                {has_financial_resources === "yes" && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Personal Funds Card */}
                            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100">
                                        <Landmark className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-slate-900">Personal Contribution</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Total Amount (PKR)</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">Rs.</span>
                                            <Input
                                                type="number"
                                                className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-black text-lg focus:bg-white transition-all shadow-inner"
                                                value={personal_funds}
                                                onChange={(e) => updateSection('section4', { personal_funds: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Main Expense Areas</Label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {financeOptions.map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => handlePurposeChange(opt.id, !personal_funds_purpose.includes(opt.id))}
                                                    className={clsx(
                                                        "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                                                        personal_funds_purpose.includes(opt.id)
                                                            ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200"
                                                            : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
                                                    )}
                                                >
                                                    <opt.icon className="w-3.5 h-3.5" /> {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Raised Funds Card */}
                            <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-xl text-white space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 border border-white/10">
                                        <Coins className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-white">External Funds / Sponsorship</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Amount Raised (PKR)</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-500">Rs.</span>
                                            <Input
                                                type="number"
                                                className="h-14 pl-12 rounded-2xl border-white/5 bg-white/5 font-black text-lg focus:bg-white/10 transition-all text-white"
                                                value={raised_funds}
                                                onChange={(e) => updateSection('section4', { raised_funds: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-3">
                                        <Receipt className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Ensure you have documentation for any sponsorship or grants. This is crucial for financial auditing.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Evidence Upload Area */}
                        <div className="bg-blue-50/50 rounded-[2.5rem] p-8 border border-blue-100 flex flex-col md:flex-row items-center gap-8 group">
                            <div className="bg-white p-4 rounded-3xl shadow-sm border border-blue-100 shrink-0">
                                <Receipt className="w-8 h-8 text-blue-600" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <h4 className="text-xl font-black text-slate-900 tracking-tight">Financial Evidence</h4>
                                <p className="text-sm text-blue-800/60 font-medium">Upload receipts, invoices, or photos of items purchased for the project.</p>
                                <FileUpload label="Drag & drop receipts here" />
                            </div>
                            <div className="hidden lg:block shrink-0 px-6 py-4 border-l border-blue-100 space-y-1">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Audit Ready</span>
                                </div>
                                <p className="text-[10px] text-blue-500/50 font-medium max-w-[120px]">Meets university financial reporting standards.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
