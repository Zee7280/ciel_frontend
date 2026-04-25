"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "../report/components/ui/button";
import { authenticatedFetch } from "@/utils/api";
import { Loader2, Mail, MapPin, Building2, User, Save, Camera, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { missingProfileFieldsForRole } from "@/utils/profileCompletion";
import { pakistaniUniversities } from "@/utils/universityData";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import {
    composeInternationalPhone,
    DEFAULT_PHONE_COUNTRY_KEY,
    parsePhoneForDisplay,
} from "@/utils/countryCallingCodes";

export default function StudentProfilePage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const isMounted = useRef(false);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        contact: "",
        institution: "",
        department: "",
        city: "",
        bio: ""
    });

    // Image Upload State
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [phoneCountryKey, setPhoneCountryKey] = useState(DEFAULT_PHONE_COUNTRY_KEY);
    const [phoneNational, setPhoneNational] = useState("");
    const phoneCountryKeyRef = useRef(phoneCountryKey);
    const phoneNationalRef = useRef(phoneNational);
    phoneCountryKeyRef.current = phoneCountryKey;
    phoneNationalRef.current = phoneNational;

    useEffect(() => {
        isMounted.current = true;
        fetchProfile();
        return () => { isMounted.current = false; };
    }, []);

    const fetchProfile = async () => {
        try {
            // Load from local storage first for speed
            const storedUserStr = localStorage.getItem("ciel_user") || localStorage.getItem("user");

            if (storedUserStr) {
                try {
                    const parsedUser = JSON.parse(storedUserStr);
                    setUser(parsedUser);
                    const rawPhone = parsedUser.contact || parsedUser.phone || "";
                    const phoneParts = parsePhoneForDisplay(
                        typeof rawPhone === "string" ? rawPhone : String(rawPhone ?? "")
                    );
                    setPhoneCountryKey(phoneParts.phoneCountryKey);
                    setPhoneNational(phoneParts.national);
                    const contactE164 = composeInternationalPhone(
                        phoneParts.phoneCountryKey,
                        phoneParts.national
                    );
                    setFormData({
                        name: parsedUser.name || "",
                        email: parsedUser.email || "",
                        contact: contactE164,
                        institution: parsedUser.institution || parsedUser.university || "",
                        department:
                            parsedUser.department ||
                            parsedUser.faculty_department ||
                            "",
                        city: parsedUser.city || "",
                        bio: parsedUser.bio || ""
                    });
                    if (parsedUser.image || parsedUser.avatar_url) {
                        setImagePreview(parsedUser.image || parsedUser.avatar_url);
                    }
                } catch (e) {
                    console.error("Failed to parse user from local storage");
                }
            }

            // API fetch removed per request

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
        const contactE164 = composeInternationalPhone(phoneCountryKey, phoneNational);
        const nationalDigits = phoneNational.replace(/\D/g, "");
        if (!formData.institution.trim() || !formData.city.trim() || !contactE164.trim()) {
            toast.error("Institution, city, and phone are required");
            return;
        }
        if (nationalDigits.length < 10) {
            toast.error("Enter a valid phone number (at least 10 digits after country code)");
            return;
        }

        const storedUser = localStorage.getItem("ciel_user") || localStorage.getItem("user");
        let userId = null;
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                userId = parsedUser.id;
            } catch (e) {
                console.error("Failed to parse user");
            }
        }

        if (!userId) {
            toast.error("User ID not found. Please log in again.");
            return;
        }

        setIsSaving(true);
        try {
            // Create FormData
            const payload = new FormData();
            // payload.append("userId", userId); // Not needed for /users/me
            payload.append("name", formData.name);

            // Send both for compatibility
            payload.append("institution", formData.institution);
            payload.append("university", formData.institution);

            payload.append("city", formData.city);

            payload.append("contact", contactE164);
            payload.append("phone", contactE164);

            payload.append("department", formData.department);
            payload.append("faculty_department", formData.department);

            payload.append("bio", formData.bio);

            if (selectedImage) {
                payload.append("image", selectedImage);
                payload.append("avatar", selectedImage); // Try both keys
            }

            // Note: Content-Type header is NOT set manually so browser can set boundary
            const res = await authenticatedFetch(`/api/v1/user/update`, {
                method: 'POST',
                body: payload
            });

            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    toast.success("Profile updated successfully!");
                    setUser(data.data); // Update local user preview

                    // Update local storage with all fields
                    const storedUserStr = localStorage.getItem("user");
                    if (storedUserStr) {
                        const storedUser = JSON.parse(storedUserStr);
                        // Update all profile fields
                        storedUser.name = data.data.name;
                        storedUser.email = formData.email.trim() || storedUser.email || data.data.email;
                        storedUser.city = data.data.city;
                        storedUser.bio = data.data.bio;
                        const savedPhone =
                            typeof data.data.phone === "string" && data.data.phone.trim()
                                ? data.data.phone.trim()
                                : contactE164;
                        storedUser.phone = savedPhone;
                        storedUser.contact = savedPhone;
                        const parsedSaved = parsePhoneForDisplay(savedPhone);
                        setPhoneCountryKey(parsedSaved.phoneCountryKey);
                        setPhoneNational(parsedSaved.national);
                        setFormData((f) => ({ ...f, contact: savedPhone }));
                        storedUser.university = data.data.university;
                        storedUser.institution = data.data.university;
                        storedUser.department = formData.department.trim();
                        storedUser.faculty_department = formData.department.trim();
                        if (data.data.image || data.data.avatar_url) {
                            storedUser.image = data.data.image || data.data.avatar_url;
                            storedUser.avatar_url = data.data.image || data.data.avatar_url;
                        }
                        localStorage.setItem("user", JSON.stringify(storedUser));
                        localStorage.setItem("ciel_user", JSON.stringify(storedUser));
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

    const contactE164ForGate = useMemo(
        () => composeInternationalPhone(phoneCountryKey, phoneNational),
        [phoneCountryKey, phoneNational]
    );

    const profileGateUser = useMemo(
        () =>
            ({
                ...(user || {}),
                name: formData.name,
                email: formData.email,
                contact: contactE164ForGate,
                phone: contactE164ForGate,
                institution: formData.institution,
                university: formData.institution,
                department: formData.department,
                city: formData.city,
            }) as Record<string, unknown>,
        [user, formData, contactE164ForGate]
    );

    const missingProfile = missingProfileFieldsForRole("student", profileGateUser);

    const institutionInList = useMemo(
        () => pakistaniUniversities.includes(formData.institution),
        [formData.institution]
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Profile</h1>
                <p className="text-slate-500 mt-2 text-lg">Manage your personal information and complete your profile.</p>
            </div>

            {missingProfile.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950">
                    <p className="font-semibold text-sm">Complete your profile to create opportunities</p>
                    <p className="text-sm mt-1 text-amber-900/90">Still needed: {missingProfile.join(", ")}.</p>
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Profile Card */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden relative group">
                        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                        <div className="px-6 pb-8 text-center -mt-16 bg-white relative rounded-t-[30px] pt-16 mx-4 mb-4 shadow-sm">
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                                <div className="relative cursor-pointer group/avatar" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg ring-4 ring-white/50">
                                        <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden relative">
                                            {imagePreview ? (
                                                <Image src={imagePreview} alt="Profile" width={96} height={96} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-blue-600 font-bold text-3xl">{user?.name?.charAt(0).toUpperCase() || "S"}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition-colors border-2 border-white">
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

                            <h2 className="text-2xl font-bold text-slate-900 mt-2">{user?.name}</h2>
                            <p className="text-slate-500">{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Student"}</p>

                            <div className="mt-6 flex items-center justify-center gap-2">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Verified Student
                                </span>
                            </div>
                        </div>

                        <div className="px-6 pb-6 pt-2">
                            {/* Stats section - can be populated from API later */}
                            {user?.stats && (
                                <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-slate-900">{user.stats.impact || 0}</div>
                                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Impact</div>
                                    </div>
                                    <div className="text-center border-l border-slate-100">
                                        <div className="text-2xl font-bold text-slate-900">{user.stats.projects || 0}</div>
                                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Projects</div>
                                    </div>
                                    <div className="text-center border-l border-slate-100">
                                        <div className="text-2xl font-bold text-slate-900">{user.stats.hours || 0}</div>
                                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Hours</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Edit Form */}
                <div className="lg:col-span-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Personal Details</h3>
                                <p className="text-slate-500 text-sm mt-1">Update your information here.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 font-medium text-slate-800 placeholder:text-slate-400"
                                        placeholder="Enter your full name"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        readOnly
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 text-slate-500 font-medium outline-none cursor-not-allowed"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-2 pl-1">Email address is managed by your institution.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">Institution</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                    <select
                                        value={formData.institution}
                                        disabled
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 bg-slate-50/50 outline-none transition-all font-bold text-slate-800 appearance-none cursor-not-allowed border-slate-100 opacity-95"
                                    >
                                        <option value="">Select Institution</option>
                                        {formData.institution && !institutionInList ? (
                                            <option value={formData.institution}>{formData.institution}</option>
                                        ) : null}
                                        {pakistaniUniversities.map((u) => (
                                            <option key={u} value={u}>
                                                {u}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-slate-400 mt-2 pl-1">Same list as signup; cannot be changed here.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">Program / Department</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.department}
                                        readOnly
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 text-slate-500 font-medium outline-none cursor-not-allowed"
                                        placeholder="—"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-2 pl-1">Filled at registration; contact support to update.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">City</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 font-medium text-slate-800 placeholder:text-slate-400"
                                        placeholder="Your City"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">Phone Number</label>
                                <PhoneConnectivityRow
                                    phoneCountryKey={phoneCountryKey}
                                    nationalDigits={phoneNational}
                                    onPhoneCountryKeyChange={(key) => {
                                        setPhoneCountryKey(key);
                                        setFormData((f) => ({
                                            ...f,
                                            contact: composeInternationalPhone(
                                                key,
                                                phoneNationalRef.current
                                            ),
                                        }));
                                    }}
                                    onNationalDigitsChange={(national) => {
                                        setPhoneNational(national);
                                        setFormData((f) => ({
                                            ...f,
                                            contact: composeInternationalPhone(
                                                phoneCountryKeyRef.current,
                                                national
                                            ),
                                        }));
                                    }}
                                    maxNationalDigits={15}
                                    placeholderNational="3001234567"
                                    selectClassName="rounded-2xl border border-slate-200 bg-slate-50 py-3.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    inputClassName="rounded-2xl border border-slate-200 bg-slate-50 py-3.5 font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                                <p className="text-xs text-slate-400 mt-2 pl-1">
                                    Full number: <span className="font-mono text-slate-600">{contactE164ForGate || "—"}</span>
                                </p>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">Bio / About Me</label>
                                <textarea spellCheck={true}
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 font-medium text-slate-800 placeholder:text-slate-400 min-h-[120px] resize-y"
                                    placeholder="Tell us a bit about yourself..."
                                ></textarea>
                            </div>
                        </div>

                        <div className="pt-8 flex justify-end border-t border-slate-50 mt-8">
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white min-w-[150px] h-12 rounded-xl text-base font-medium shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02]"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
