
import { useState } from "react";
import { X, Send, Loader2, Upload } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

interface FundingApplicationFormProps {
    opportunity: {
        id: number;
        title: string;
        amount: number;
    };
    onClose: () => void;
    onSuccess: () => void;
}

export default function FundingApplicationForm({ opportunity, onClose, onSuccess }: FundingApplicationFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        proposedBudget: "",
        projectDescription: "",
        expectedBeneficiaries: "",
        documents: [] as string[] // For now just strings (URLs) or file names
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await authenticatedFetch(`/api/v1/partners/funding/applications`, {
                method: "POST",
                body: JSON.stringify({
                    fundingId: opportunity.id,
                    proposedBudget: parseFloat(formData.proposedBudget),
                    projectDescription: formData.projectDescription,
                    expectedBeneficiaries: parseInt(formData.expectedBeneficiaries),
                    documents: formData.documents
                }),
            });

            if (res && res.ok) {
                toast.success("Application submitted successfully");
                onSuccess();
            } else {
                const data = res ? await res.json() : { message: "Network error" };
                toast.error(data.message || "Failed to submit application");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="border-b border-slate-100 p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Apply for Funding</h2>
                        <p className="text-sm text-slate-500 mt-1">Applying for: {opportunity.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project Description</label>
                        <textarea
                            required
                            rows={4}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                            placeholder="Describe your project proposal..."
                            value={formData.projectDescription}
                            onChange={e => setFormData({ ...formData, projectDescription: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Proposed Budget ($)</label>
                            <input
                                type="number"
                                min="0"
                                max={opportunity.amount}
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder={`Max $${opportunity.amount}`}
                                value={formData.proposedBudget}
                                onChange={e => setFormData({ ...formData, proposedBudget: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Exp. Beneficiaries</label>
                            <input
                                type="number"
                                min="0"
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="e.g. 500"
                                value={formData.expectedBeneficiaries}
                                onChange={e => setFormData({ ...formData, expectedBeneficiaries: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Supporting Documents</label>
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                            <Upload className="w-8 h-8 mb-2" />
                            <p className="text-sm font-medium">Click to upload files</p>
                            <p className="text-xs text-slate-400 mt-1">PDF, DOCX up to 10MB</p>
                        </div>
                        {/* File upload logic to be implemented, using mock for now */}
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Submit Application
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
