import { Landmark, Coins, Receipt, Car, Printer, Utensils, Box, MoreHorizontal } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
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
        <div className="space-y-8">
            {/* Activities Description */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">1</div>
                    <h3 className="text-xl font-bold text-slate-900">What did you actually do?</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Detailed Activity Description</Label>
                        <Textarea
                            placeholder="Describe the steps, engagement levels, and factual execution flow..."
                            className="min-h-[180px] rounded-xl border-slate-200 p-4 text-slate-700"
                            value={activity_description || ''}
                            onChange={(e) => updateSection('section4', { activity_description: e.target.value })}
                        />
                        <p className="text-xs text-slate-500">Use factual language and specify the number of sessions and audience.</p>
                    </div>
                </div>
            </div>

            {/* Financial Resources */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">2</div>
                        <h3 className="text-xl font-bold text-slate-900">Resource Utilization</h3>
                    </div>
                    <RadioGroup
                        value={has_financial_resources}
                        onValueChange={(val) => {
                            const isNo = val === 'no';
                            updateSection('section4', {
                                has_financial_resources: val as 'yes' | 'no',
                                personal_funds: isNo ? '' : personal_funds,
                                raised_funds: isNo ? '' : raised_funds,
                                personal_funds_purpose: isNo ? [] : personal_funds_purpose,
                                raised_funds_source: isNo ? [] : raised_funds_source
                            });
                        }}
                        className="flex items-center gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="no-finance" />
                            <Label htmlFor="no-finance" className="text-sm font-medium">Time Only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="yes-finance" />
                            <Label htmlFor="yes-finance" className="text-sm font-medium">Financial Resources</Label>
                        </div>
                    </RadioGroup>
                </div>

                {has_financial_resources === "yes" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Personal Funds Card */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                                        <Landmark className="w-4 h-4" />
                                    </div>
                                    <h4 className="font-semibold text-slate-900">Personal Contribution</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-600">Total Amount (PKR)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400">Rs.</span>
                                            <Input
                                                type="number"
                                                className="h-10 pl-10 rounded-lg border-slate-200"
                                                value={personal_funds || ''}
                                                onChange={(e) => updateSection('section4', { personal_funds: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-600">Main Expense Areas</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {financeOptions.map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => handlePurposeChange(opt.id, !personal_funds_purpose.includes(opt.id))}
                                                    className={clsx(
                                                        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                                                        personal_funds_purpose.includes(opt.id)
                                                            ? "bg-blue-600 text-white border-blue-600"
                                                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
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
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                                        <Coins className="w-4 h-4" />
                                    </div>
                                    <h4 className="font-semibold text-slate-900">External Funds / Sponsorship</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-600">Amount Raised (PKR)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400">Rs.</span>
                                            <Input
                                                type="number"
                                                className="h-10 pl-10 rounded-lg border-slate-200"
                                                value={raised_funds || ''}
                                                onChange={(e) => updateSection('section4', { raised_funds: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                                        <Receipt className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-800">Ensure you have documentation for any sponsorship or grants.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
