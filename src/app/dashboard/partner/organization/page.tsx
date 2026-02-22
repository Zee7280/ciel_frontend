"use client";

import { useState, useEffect, useRef } from "react";
import { Building2, MapPin, Mail, Phone, Edit, CheckCircle, Upload, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

export default function OrganizationProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [orgData, setOrgData] = useState({
        // Basic Info
        name: "", // Read-only
        type: "", // Read-only
        description: "",
        website: "",
        city: "",
        address: "",
        region: "",
        country: "Pakistan", // Read-only (default)
        image: "", // Logo (simplifying as string for now)

        // Contact Info
        contactName: "",
        contactEmail: "",
        contactPhone: "",

        // Governance (Read-only)
        verificationStatus: "",
        verificationScope: "",
        worksWithMinors: false,

        // Compliance (Actionable)
        isSafeguardingAcknowledged: false,
        isDataPolicyAcknowledged: false
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Get user ID from local storage
                const storedUser = localStorage.getItem("ciel_user");
                let userId = null;
                if (storedUser) {
                    try {
                        const userObj = JSON.parse(storedUser);
                        userId = userObj.id || userObj.userId;
                    } catch (e) {
                        console.error("Failed to parse user data");
                    }
                }

                if (!userId) {
                    toast.error("User session invalid. Please login again.");
                    return;
                }

                const res = await authenticatedFetch(`/api/v1/organisation/profile/detail`, {
                    method: 'POST',
                    body: JSON.stringify({ userId })
                });

                if (res && res.ok) {
                    const data = await res.json();
                    const apiData = data.data || data;

                    if (apiData) {
                        // Handle logo URL
                        let logoUrl = apiData.logoUrl || apiData.image || "";
                        if (logoUrl && logoUrl.startsWith("/")) {
                            // Force the base URL to localhost:3000 as explicitly requested
                            logoUrl = `http://localhost:3000${logoUrl}`;
                        }

                        setOrgData(prev => ({
                            ...prev,
                            name: apiData.name,
                            type: apiData.orgType,
                            description: apiData.description,
                            website: apiData.websiteUrl,
                            city: apiData.city,
                            region: apiData.region,
                            address: apiData.address,
                            country: apiData.country || "Pakistan",
                            image: logoUrl,
                            contactName: apiData.contactName,
                            contactEmail: apiData.contactEmail,
                            contactPhone: apiData.contactPhone,
                            verificationStatus: apiData.verificationStatus,
                            verificationScope: apiData.verificationScope,
                            worksWithMinors: apiData.worksWithMinors,
                            isSafeguardingAcknowledged: apiData.safeguardingAcknowledged,
                            isDataPolicyAcknowledged: apiData.dataPolicyAcknowledged
                        }));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
                toast.error("Failed to load organization profile");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error("Image size should be less than 5MB");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("logo", file);

        // Get user ID
        const storedUser = localStorage.getItem("ciel_user");
        if (storedUser) {
            try {
                const userObj = JSON.parse(storedUser);
                const userId = userObj.id || userObj.userId;
                if (userId) {
                    formData.append("userId", userId);
                    formData.append("id", userId); // Sending both to be safe as per user request "ngo ki"
                }
            } catch (e) {
                console.error("Failed to parse user for upload");
            }
        }

        try {
            const res = await authenticatedFetch(`/api/v1/partners/profile/logo`, {
                method: 'POST',
                body: formData
            });

            if (res && res.ok) {
                const data = await res.json();
                const uploadedUrl = data.data?.logo_url || data.data?.url;

                if (data.success && uploadedUrl) {
                    // Force the base URL to localhost:3000 as explicitly requested
                    let fullUrl = uploadedUrl;
                    if (uploadedUrl.startsWith("/")) {
                        fullUrl = `http://localhost:3000${uploadedUrl}`;
                    }

                    setOrgData(prev => ({ ...prev, image: fullUrl }));
                    toast.success("Logo uploaded successfully");
                } else {
                    toast.error(data.message || "Failed to upload logo");
                }
            } else {
                toast.error("Failed to upload logo");
            }
        } catch (error) {
            console.error("Upload error", error);
            toast.error("An error occurred while uploading");
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleSave = async () => {
        setIsSaving(true);

        // Validation
        const requiredFields = [
            { key: 'description', label: 'Description' },
            { key: 'website', label: 'Website URL' },
            { key: 'city', label: 'City' },
            { key: 'region', label: 'Region' },
            { key: 'contactName', label: 'Contact Person Name' },
            { key: 'contactEmail', label: 'Email Address' },
            { key: 'contactPhone', label: 'Phone Number' }
        ] as const;

        for (const field of requiredFields) {
            // @ts-ignore
            if (!orgData[field.key] || !orgData[field.key].toString().trim()) {
                toast.error(`${field.label} is required`);
                setIsSaving(false);
                return;
            }
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(orgData.contactEmail)) {
            toast.error("Please enter a valid email address");
            setIsSaving(false);
            return;
        }
        try {
            // Get user ID from local storage
            const storedUser = localStorage.getItem("ciel_user");
            let userId = null;
            if (storedUser) {
                try {
                    const userObj = JSON.parse(storedUser);
                    userId = userObj.id || userObj.userId;
                } catch (e) {
                    console.error("Failed to parse user data");
                }
            }

            // Map state keys to API DTO keys
            const payload = {
                userId, // Pass logged-in user ID
                description: orgData.description,
                websiteUrl: orgData.website,
                city: orgData.city,
                region: orgData.region,
                address: orgData.address,
                contactName: orgData.contactName,
                contactEmail: orgData.contactEmail,
                contactPhone: orgData.contactPhone,
                logoUrl: orgData.image,
                safeguardingAcknowledged: orgData.isSafeguardingAcknowledged,
                dataPolicyAcknowledged: orgData.isDataPolicyAcknowledged
            };

            const res = await authenticatedFetch(`/api/v1/organisation/profile`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                const data = await res.json();
                // Allow success flag OR if data is returned directly (implied success via res.ok)
                if (data.success || data.id || data.userId) {
                    setIsEditing(false);
                    // Optionally update state with response data if API returns updated object
                    // Note: If API returns the mapped object, we might need to map it back to state if we use the response
                    toast.success("Profile updated successfully!");
                } else {
                    toast.error(data.message || "Failed to update profile");
                }
            } else {
                toast.error("Failed to connect to server");
            }
        } catch (error) {
            console.error("Error updating profile", error);
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Organization</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your organization profile and public trading settings.</p>
                </div>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
                >
                    <Edit className="w-4 h-4" /> {isEditing ? "Cancel Editing" : "Edit Profile"}
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Column: Logo & Governance Status */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
                        {isLoading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                            </div>
                        ) : (
                            <>
                                <div className="w-32 h-32 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg overflow-hidden relative group">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                    {isUploading ? (
                                        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                        </div>
                                    ) : orgData.image ? (
                                        <img src={orgData.image} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <Building2 className="w-12 h-12 text-slate-400" />
                                    )}
                                    {isEditing && !isUploading && (
                                        <div
                                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">{orgData.name || "Organization Name"}</h2>
                                {orgData.verificationStatus && (
                                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold mt-2">
                                        <CheckCircle className="w-3 h-3" /> {orgData.verificationStatus}
                                    </div>
                                )}
                                <p className="text-sm text-slate-500 mt-4">{orgData.type || "Organization Type"}</p>
                            </>
                        )}
                    </div>

                    {/* Governance Signals (Read Only) */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide">Governance Status</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-slate-50">
                                <span className="text-slate-500">Verification Scope</span>
                                <span className="font-bold text-slate-700">{orgData.verificationScope || "N/A"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-50">
                                <span className="text-slate-500">Works with Minors</span>
                                <span className={`font-bold ${orgData.worksWithMinors ? "text-blue-600" : "text-slate-700"}`}>
                                    {orgData.worksWithMinors ? "Yes" : "No"}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-50">
                                <span className="text-slate-500">Safeguarding</span>
                                <span className={`font-bold ${orgData.isSafeguardingAcknowledged ? "text-green-600" : "text-amber-500"}`}>
                                    {orgData.isSafeguardingAcknowledged ? "Acknowledged" : "Pending"}
                                </span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-slate-500">Data Policy</span>
                                <span className={`font-bold ${orgData.isDataPolicyAcknowledged ? "text-green-600" : "text-amber-500"}`}>
                                    {orgData.isDataPolicyAcknowledged ? "Acknowledged" : "Pending"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Forms */}
                <div className="xl:col-span-8 space-y-6">
                    {/* 1. Basic Information */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-6 text-lg border-b border-slate-100 pb-4">Basic Information</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">Description</label>
                                {isEditing ? (
                                    <textarea
                                        className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:border-blue-500 min-h-[100px]"
                                        value={orgData.description}
                                        onChange={(e) => setOrgData({ ...orgData, description: e.target.value })}
                                        placeholder="Briefly describe your organization..."
                                    />
                                ) : (
                                    <p className="text-slate-600 leading-relaxed text-sm">{orgData.description || "No description provided."}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase mb-1">Website URL</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                                            value={orgData.website}
                                            onChange={(e) => setOrgData({ ...orgData, website: e.target.value })}
                                        />
                                    ) : (
                                        <a href={`https://${orgData.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{orgData.website || "N/A"}</a>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase mb-1">Country (Locked)</label>
                                    <input type="text" value={orgData.country} readOnly className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase mb-1">City</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                                            value={orgData.city}
                                            onChange={(e) => setOrgData({ ...orgData, city: e.target.value })}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 text-slate-700"><MapPin className="w-4 h-4 text-slate-400" /> {orgData.city || "N/A"}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase mb-1">Region / Province</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                                            value={orgData.region}
                                            onChange={(e) => setOrgData({ ...orgData, region: e.target.value })}
                                        />
                                    ) : (
                                        <div className="text-slate-700">{orgData.region || "N/A"}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Contact Information */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-6 text-lg border-b border-slate-100 pb-4">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-500 uppercase mb-1">Contact Person Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                                        value={orgData.contactName}
                                        onChange={(e) => setOrgData({ ...orgData, contactName: e.target.value })}
                                    />
                                ) : (
                                    <div className="text-slate-700 font-medium">{orgData.contactName || "N/A"}</div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 uppercase mb-1">Email Address</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                                        value={orgData.contactEmail}
                                        onChange={(e) => setOrgData({ ...orgData, contactEmail: e.target.value })}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-700"><Mail className="w-4 h-4 text-slate-400" /> {orgData.contactEmail || "N/A"}</div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                                        value={orgData.contactPhone}
                                        onChange={(e) => setOrgData({ ...orgData, contactPhone: e.target.value })}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-700"><Phone className="w-4 h-4 text-slate-400" /> {orgData.contactPhone || "N/A"}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 3. Compliance Acknowledgements */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-6 text-lg border-b border-slate-100 pb-4">Compliance & Policies</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                                <input
                                    type="checkbox"
                                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    checked={orgData.isSafeguardingAcknowledged}
                                    onChange={(e) => {
                                        setOrgData(prev => ({ ...prev, isSafeguardingAcknowledged: e.target.checked }));
                                    }}
                                />
                                <div>
                                    <label className="font-bold text-slate-900 block mb-1">Safeguarding Policy Acknowledgment</label>
                                    <p className="text-xs text-slate-500">I acknowledge that our organization adheres to the strict safeguarding policies regarding minors and vulnerable groups.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                                <input
                                    type="checkbox"
                                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    checked={orgData.isDataPolicyAcknowledged}
                                    onChange={(e) => {
                                        setOrgData(prev => ({ ...prev, isDataPolicyAcknowledged: e.target.checked }));
                                    }}
                                />
                                <div>
                                    <label className="font-bold text-slate-900 block mb-1">Data Privacy Policy Acknowledgment</label>
                                    <p className="text-xs text-slate-500">I confirm that we comply with data protection regulations and respect user privacy as per the platform's terms.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-50 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:static md:shadow-none md:border-t-0 md:bg-transparent md:p-0">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-50 font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2"
                            >
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
