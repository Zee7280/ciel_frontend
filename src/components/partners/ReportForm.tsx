
import { useState, useEffect } from "react";
import { X, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

interface ReportFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function ReportForm({ onClose, onSuccess, initialData }: ReportFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        beneficiaries: 0,
        hoursLogged: 0,
        sdgs: [] as number[],
        evidence: [] as string[],
        status: "draft"
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || "",
                description: initialData.description || "",
                beneficiaries: initialData.beneficiaries || 0,
                hoursLogged: initialData.hoursLogged || 0,
                sdgs: initialData.sdgs || [],
                evidence: initialData.evidence || [],
                status: initialData.status || "draft"
            });
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const url = initialData
                ? `/api/v1/partners/reports/${initialData.id}`
                : `/api/v1/partners/reports`;

            const method = initialData ? "PUT" : "POST";

            const res = await authenticatedFetch(url, {
                method,
                body: JSON.stringify(formData),
            });

            if (res && res.ok) {
                toast.success(initialData ? "Report updated successfully" : "Report created successfully");
                onSuccess();
            } else {
                const data = res ? await res.json() : { message: "Network error" };
                toast.error(data.message || "Something went wrong");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to save report");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSdg = (sdg: number) => {
        setFormData(prev => ({
            ...prev,
            sdgs: prev.sdgs.includes(sdg)
                ? prev.sdgs.filter(s => s !== sdg)
                : [...prev.sdgs, sdg]
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-slate-900">
                        {initialData ? "Edit Report" : "Create New Report"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Report Title</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="e.g. Q1 Community Outreach"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea
                                required
                                rows={4}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                placeholder="Describe the activities and outcomes..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Beneficiaries Reached</label>
                            <input
                                type="number"
                                min="0"
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={formData.beneficiaries}
                                onChange={e => setFormData({ ...formData, beneficiaries: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Hours Logged</label>
                            <input
                                type="number"
                                min="0"
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={formData.hoursLogged}
                                onChange={e => setFormData({ ...formData, hoursLogged: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    {/* SDGs */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">SDG Alignment</label>
                        <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 17 }, (_, i) => i + 1).map(sdg => (
                                <button
                                    key={sdg}
                                    type="button"
                                    onClick={() => toggleSdg(sdg)}
                                    className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${formData.sdgs.includes(sdg)
                                        ? "bg-blue-600 text-white scale-110 shadow-md ring-2 ring-offset-2 ring-blue-600"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                        }`}
                                >
                                    {sdg}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Select the Sustainable Development Goals addressed by this activity.</p>
                    </div>

                    {/* Status Toggle (only if draft) */}
                    {(formData.status === 'draft' || !initialData) && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="submit-toggle"
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                checked={formData.status === 'submitted'}
                                onChange={e => setFormData({ ...formData, status: e.target.checked ? 'submitted' : 'draft' })}
                            />
                            <label htmlFor="submit-toggle" className="text-sm text-slate-700 select-none">
                                Submit this report immediately (cannot be edited after submission)
                            </label>
                        </div>
                    )}
                </form>

                <div className="sticky bottom-0 bg-white border-t border-slate-100 p-6 flex justify-end gap-3 z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {initialData ? "Save Changes" : "Create Report"}
                    </button>
                </div>
            </div>
        </div>
    );
}
