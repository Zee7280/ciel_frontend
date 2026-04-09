"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { authenticatedFetch } from "@/utils/api";
import { Loader2, Mail, Phone, MapPin, Building2, User, Save, Camera, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { missingProfileFieldsForRole } from "@/utils/profileCompletion";

export default function FacultyProfilePage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<Record<string, unknown> | null>(null);
    const isMounted = useRef(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        contact: "",
        institution: "",
        department: "",
        city: "",
        bio: ""
    });

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        isMounted.current = true;
        fetchProfile();
        return () => {
            isMounted.current = false;
        };
    }, []);

    const fetchProfile = async () => {
        try {
            const storedUserStr = localStorage.getItem("ciel_user") || localStorage.getItem("user");

            if (storedUserStr) {
                try {
                    const parsedUser = JSON.parse(storedUserStr) as Record<string, unknown>;
                    setUser(parsedUser);
                    setFormData({
                        name: typeof parsedUser.name === "string" ? parsedUser.name : "",
                        email: typeof parsedUser.email === "string" ? parsedUser.email : "",
                        contact:
                            (typeof parsedUser.contact === "string" && parsedUser.contact) ||
                            (typeof parsedUser.phone === "string" && parsedUser.phone) ||
                            "",
                        institution:
                            (typeof parsedUser.institution === "string" && parsedUser.institution) ||
                            (typeof parsedUser.university === "string" && parsedUser.university) ||
                            "",
                        department:
                            (typeof parsedUser.department === "string" && parsedUser.department) ||
                            (typeof parsedUser.faculty_department === "string" && parsedUser.faculty_department) ||
                            "",
                        city: typeof parsedUser.city === "string" ? parsedUser.city : "",
                        bio: typeof parsedUser.bio === "string" ? parsedUser.bio : ""
                    });
                    const img = parsedUser.image ?? parsedUser.avatar_url;
                    if (typeof img === "string" && img) {
                        setImagePreview(img);
                    }
                } catch (e) {
                    console.error("Failed to parse user from local storage", e);
                }
            }
        } catch (error) {
            console.error("Error loading profile", error);
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error("Full Name is required");
            return;
        }
        if (!formData.department.trim()) {
            toast.error("Department is required before you can create opportunities");
            return;
        }
        if (!formData.institution.trim() || !formData.city.trim() || !formData.contact.trim()) {
            toast.error("Institution, city, and phone are required");
            return;
        }

        const storedUser = localStorage.getItem("ciel_user") || localStorage.getItem("user");
        let userId: unknown = null;
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser) as Record<string, unknown>;
                userId = parsedUser.id;
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        }

        if (!userId) {
            toast.error("User ID not found. Please log in again.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = new FormData();
            payload.append("name", formData.name);
            payload.append("institution", formData.institution);
            payload.append("university", formData.institution);
            payload.append("city", formData.city);
            payload.append("contact", formData.contact);
            payload.append("phone", formData.contact);
            payload.append("department", formData.department);
            payload.append("faculty_department", formData.department);
            payload.append("bio", formData.bio);

            if (selectedImage) {
                payload.append("image", selectedImage);
                payload.append("avatar", selectedImage);
            }

            const res = await authenticatedFetch(`/api/v1/user/update`, {
                method: "POST",
                body: payload
            });

            if (res && res.ok) {
                const data = await res.json();
                if (data.success && data.data) {
                    toast.success("Profile updated successfully!");
                    setUser(data.data);

                    const storedUserStr = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                    if (storedUserStr) {
                        const storedUserObj = JSON.parse(storedUserStr) as Record<string, unknown>;
                        const d = data.data as Record<string, unknown>;
                        storedUserObj.name = d.name ?? storedUserObj.name;
                        storedUserObj.city = d.city ?? storedUserObj.city;
                        storedUserObj.bio = d.bio ?? storedUserObj.bio;
                        const phone = d.phone as string | undefined;
                        if (phone) {
                            storedUserObj.phone = phone;
                            storedUserObj.contact = phone;
                        }
                        const uni = d.university as string | undefined;
                        if (uni) {
                            storedUserObj.university = uni;
                            storedUserObj.institution = uni;
                        }
                        storedUserObj.email = formData.email.trim() || storedUserObj.email || (d.email as string | undefined);
                        storedUserObj.department = formData.department.trim();
                        storedUserObj.faculty_department = formData.department.trim();
                        if (d.image || d.avatar_url) {
                            const url = (d.image || d.avatar_url) as string;
                            storedUserObj.image = url;
                            storedUserObj.avatar_url = url;
                        }
                        const s = JSON.stringify(storedUserObj);
                        localStorage.setItem("user", s);
                        localStorage.setItem("ciel_user", s);
                    }
                } else {
                    toast.error(data.message || "Failed to update profile");
                }
            } else {
                toast.error("Failed to connect to server");
            }
        } catch (error) {
            console.error("Error updating profile", error);
            toast.error("An error occurred while saving profile");
        } finally {
            if (isMounted.current) setIsSaving(false);
        }
    };

    const profileGateUser = useMemo(
        () =>
            ({
                ...(user || {}),
                name: formData.name,
                email: formData.email,
                contact: formData.contact,
                phone: formData.contact,
                institution: formData.institution,
                university: formData.institution,
                department: formData.department,
                city: formData.city,
            }) as Record<string, unknown>,
        [user, formData]
    );

    const missingProfile = missingProfileFieldsForRole("faculty", profileGateUser);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    const displayName = typeof user?.name === "string" ? user.name : formData.name || "Faculty";

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Faculty Profile</h1>
                <p className="text-slate-500 mt-2 text-lg">Complete your details so approvals and messaging use the right contact information.</p>
            </div>

            {missingProfile.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950">
                    <p className="font-semibold text-sm">Complete your profile to create opportunities</p>
                    <p className="text-sm mt-1 text-amber-900/90">Still needed: {missingProfile.join(", ")}.</p>
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden relative group">
                        <div className="h-32 bg-gradient-to-r from-violet-600 to-indigo-600" />
                        <div className="px-6 pb-8 text-center -mt-16 bg-white relative rounded-t-[30px] pt-16 mx-4 mb-4 shadow-sm">
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                                <div className="relative cursor-pointer group/avatar" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg ring-4 ring-white/50">
                                        <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden relative">
                                            {imagePreview ? (
                                                <Image
                                                    src={imagePreview}
                                                    alt="Profile"
                                                    width={96}
                                                    height={96}
                                                    className="w-full h-full object-cover"
                                                    unoptimized={imagePreview.startsWith("data:")}
                                                />
                                            ) : (
                                                <span className="text-violet-600 font-bold text-3xl">
                                                    {displayName.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-violet-600 text-white rounded-full p-2 shadow-lg hover:bg-violet-700 transition-colors border-2 border-white">
                                        <Camera className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-slate-900 mt-2">{displayName}</h2>
                            <p className="text-slate-500">Faculty</p>

                            <div className="mt-6 flex items-center justify-center gap-2">
                                <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-100 flex items-center gap-1">
                                    <GraduationCap className="w-3 h-3" />
                                    Faculty account
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Personal details</h3>
                                <p className="text-slate-500 text-sm mt-1">Name, institution, and phone are required for a complete profile.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">Full name</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-violet-600 transition-colors" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all duration-200 font-medium text-slate-800 placeholder:text-slate-400"
                                        placeholder="Your full name"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        readOnly
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 text-slate-500 font-medium outline-none cursor-not-allowed"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-2 pl-1">Email is tied to your login account.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">Institution</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-violet-600 transition-colors" />
                                    <input
                                        type="text"
                                        value={formData.institution}
                                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all duration-200 font-medium text-slate-800 placeholder:text-slate-400"
                                        placeholder="University / college"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">
                                    Department <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-violet-600 transition-colors" />
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all duration-200 font-medium text-slate-800 placeholder:text-slate-400"
                                        placeholder="e.g. Electrical Engineering"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">City</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-violet-600 transition-colors" />
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all duration-200 font-medium text-slate-800 placeholder:text-slate-400"
                                        placeholder="City"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">Phone</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-violet-600 transition-colors" />
                                    <input
                                        type="tel"
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all duration-200 font-medium text-slate-800 placeholder:text-slate-400"
                                        placeholder="+92 300 1234567"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">Bio (optional)</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all duration-200 font-medium text-slate-800 placeholder:text-slate-400 min-h-[120px] resize-y"
                                    placeholder="Department, research interests, or teaching focus…"
                                />
                            </div>
                        </div>

                        <div className="pt-8 flex justify-end border-t border-slate-50 mt-8">
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white min-w-[150px] h-12 rounded-xl text-base font-medium shadow-lg shadow-violet-500/30 transition-all hover:scale-[1.02]"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                ) : (
                                    <Save className="w-5 h-5 mr-2" />
                                )}
                                Save changes
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
