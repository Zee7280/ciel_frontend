"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, CheckCircle, School, Landmark, ArrowLeft, Building2, User, GraduationCap, Phone, Globe, Heart } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";

export default function SignUpPage() {
    const router = useRouter();
    const [step, setStep] = useState<"role" | "form">("role");
    const [role, setRole] = useState<string | null>(null);
    const [hoveredRole, setHoveredRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        institution: "",
        department: "",
        orgName: "",
        orgType: "",
        contactPerson: "",
        countryCode: "+92",
        phone: "",
        cnic: "",
    });

    const roles = [
        { id: "student", label: "Student", icon: GraduationCap, desc: "Join verified projects, document your community impact, and earn SDG‑aligned records.", color: "blue" },
        { id: "faculty", label: "Faculty / Academic Staff", icon: User, desc: "Oversee student engagement, validate learning and impact, and support SDG‑ready reporting.", color: "amber" },
        { id: "university", label: "University / Institution", icon: School, desc: "Monitor engagement, aggregate verified impact data, and generate institutional SDG reports.", color: "indigo" },
        { id: "ngo", label: "NGO / Non-Profit", icon: Heart, desc: "Post SDG‑aligned opportunities, engage students, and receive verified impact reports.", color: "green" },
        { id: "corporate", label: "Corporate / Private", icon: Building2, desc: "Support impactful projects and track CSR goals aligned with SDGs.", color: "slate" },
    ];

    const handleRoleSelect = (selectedRole: any) => {
        setRole(selectedRole);
        if (['university', 'ngo', 'corporate'].includes(selectedRole)) {
            setFormData(prev => ({ ...prev, orgType: selectedRole }));
        }
        setStep("form");
        setErrors({});
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/[^0-9]/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        setFormData({ ...formData, phone: value });
        if (errors.phone) setErrors({ ...errors, phone: "" });
    };

    const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/[^0-9-]/g, "");
        if (value.length > 15) value = value.slice(0, 15);
        setFormData({ ...formData, cnic: value });
        if (errors.cnic) setErrors({ ...errors, cnic: "" });
    };

    const handleGenericChange = (field: string, value: string) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) setErrors({ ...errors, [field]: "" });
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (['university', 'ngo', 'corporate'].includes(role || "")) {
            if (!formData.orgName.trim()) newErrors.orgName = "Organization Name is required";
            if (!formData.contactPerson.trim()) newErrors.contactPerson = "Contact Person is required";
        } else {
            if (!formData.name.trim()) newErrors.name = "Full Name is required";
        }

        if (role === "student" || role === "faculty") {
            if (!formData.institution.trim()) newErrors.institution = "Institution is required";
            if (!formData.department.trim()) newErrors.department = role === "student" ? "Degree Program is required" : "Department is required";
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "Phone Number is required";
        } else if (formData.phone.length < 10) {
            newErrors.phone = "Phone Number must be at least 10 digits";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = "Invalid email formatting";
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
        }

        if (formData.cnic && formData.cnic.replace(/-/g, "").length !== 13) {
            newErrors.cnic = "CNIC must be 13 digits";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    role,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || data.error || "Signup failed");
            }

            const data = await response.json();

            if (data.user?.status === "pending") {
                router.push("/login?signup=pending");
            } else {
                router.push("/login?signup=success");
            }
        } catch (error) {
            console.error("Signup failed", error);
            setFormError(error instanceof Error ? error.message : "Signup failed");
        } finally {
            setIsLoading(false);
        }
    };

    const activeRoleData = roles.find(r => r.id === (hoveredRole || role));
    const displayTitle = step === 'form'
        ? `Register as ${roles.find(r => r.id === role)?.label}`
        : hoveredRole
            ? activeRoleData?.label
            : "Create Your CIEL Account";

    const displayText = step === 'form'
        ? "Fill in your details to create your account and start making an impact."
        : hoveredRole
            ? activeRoleData?.desc
            : "Choose how you want to engage with CIEL’s Community Impact Education Lab.";

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 min-h-[600px]">
                <div className="bg-slate-900 p-12 text-white relative overflow-hidden flex flex-col justify-between order-2 lg:order-1">
                    <div className="relative z-10 space-y-4">
                        <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity w-fit">
                            <div className="relative w-14 h-14 flex items-center justify-center">
                                <Image src="/ciel-logo-v2.png" alt="CIEL Logo" width={56} height={56} className="object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-black tracking-tight text-white leading-none">
                                    CIEL <span className="text-blue-500">PK</span>
                                </span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                                    Education Lab
                                </span>
                            </div>
                        </Link>

                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300" key={displayTitle}>
                            <h1 className="text-4xl font-bold leading-tight">
                                {displayTitle}
                            </h1>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                {displayText}
                            </p>
                        </div>
                    </div>

                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500 rounded-full blur-[100px] opacity-10 -ml-20 -mb-20"></div>

                    {step === "form" && (
                        <button
                            onClick={() => setStep("role")}
                            className="relative z-10 flex items-center gap-2 text-slate-400 hover:text-white transition-colors mt-auto"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Role Selection
                        </button>
                    )}
                </div>

                <div className="p-12 flex flex-col justify-center order-1 lg:order-2 relative">
                    {step === "role" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Create an Account</h2>
                                <p className="text-slate-500">Choose how you want to engage with CIEL’s Community Impact Education Lab.</p>
                            </div>

                            <div className="grid gap-4">
                                {roles.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => handleRoleSelect(r.id)}
                                        onMouseEnter={() => setHoveredRole(r.id)}
                                        onMouseLeave={() => setHoveredRole(null)}
                                        className="flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all group text-left"
                                    >
                                        <div className={`w-12 h-12 rounded-full bg-${r.color}-50 flex items-center justify-center text-${r.color}-600 group-hover:scale-110 transition-transform`}>
                                            <r.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{r.label}</h3>
                                            <p className="text-sm text-slate-500 lg:hidden">{r.desc}</p>
                                        </div>
                                        <ArrowRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </button>
                                ))}
                            </div>

                            <div className="text-center pt-4">
                                <p className="text-slate-500 text-sm">
                                    Already have an account? <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700">Log in</Link>
                                </p>
                            </div>
                        </div>
                    )}

                    {step === "form" && (
                        <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
                            {['university', 'ngo', 'corporate'].includes(role || "") ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-bold text-slate-700">
                                            {role === 'university' ? "Institution Name" :
                                                role === 'corporate' ? "Company Name" :
                                                    "Organization Name"}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.orgName}
                                            onChange={(e) => handleGenericChange("orgName", e.target.value)}
                                            className={clsx(
                                                "w-full mt-1 px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition-all",
                                                errors.orgName ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                            )}
                                            placeholder="e.g. Al-Khidmat Foundation"
                                        />
                                        {errors.orgName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.orgName}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-bold text-slate-700">Org Type</label>
                                            <select
                                                value={formData.orgType}
                                                onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}
                                                className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                                                disabled // Auto-selected based on role
                                            >
                                                <option value="ngo">NGO / Non-Profit</option>
                                                <option value="university">University / College</option>
                                                <option value="corporate">Corporate / Private Sector</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-slate-700">Contact Person</label>
                                            <input
                                                type="text"
                                                value={formData.contactPerson}
                                                onChange={(e) => handleGenericChange("contactPerson", e.target.value)}
                                                className={clsx(
                                                    "w-full mt-1 px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition-all",
                                                    errors.contactPerson ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                                )}
                                                placeholder="Full Name"
                                            />
                                            {errors.contactPerson && <p className="text-xs text-red-500 mt-1 font-medium">{errors.contactPerson}</p>}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-sm font-bold text-slate-700">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleGenericChange("name", e.target.value)}
                                        className={clsx(
                                            "w-full mt-1 px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition-all",
                                            errors.name ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        )}
                                        placeholder="John Doe"
                                    />
                                    {errors.name && <p className="text-xs text-red-500 mt-1 font-medium">{errors.name}</p>}
                                </div>
                            )}

                            {(role === "student" || role === "faculty") && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-bold text-slate-700">Institution</label>
                                        <input
                                            type="text"
                                            value={formData.institution}
                                            onChange={(e) => handleGenericChange("institution", e.target.value)}
                                            className={clsx(
                                                "w-full mt-1 px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition-all",
                                                errors.institution ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                            )}
                                            placeholder="NUST"
                                        />
                                        {errors.institution && <p className="text-xs text-red-500 mt-1 font-medium">{errors.institution}</p>}
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-slate-700">{role === "student" ? "Degree Program" : "Department"}</label>
                                        <input
                                            type="text"
                                            value={formData.department}
                                            onChange={(e) => handleGenericChange("department", e.target.value)}
                                            className={clsx(
                                                "w-full mt-1 px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition-all",
                                                errors.department ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                            )}
                                            placeholder={role === "student" ? "BS CS" : "Computer Science"}
                                        />
                                        {errors.department && <p className="text-xs text-red-500 mt-1 font-medium">{errors.department}</p>}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-bold text-slate-700">Phone Number</label>
                                <div className="flex gap-2 mt-1">
                                    <div className="relative w-28">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            value={formData.countryCode}
                                            onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                                            className="w-full pl-9 pr-2 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none text-sm"
                                        >
                                            <option value="+93">🇦🇫 +93 Afghanistan</option>
                                            <option value="+355">🇦🇱 +355 Albania</option>
                                            <option value="+213">🇩🇿 +213 Algeria</option>
                                            <option value="+376">🇦🇩 +376 Andorra</option>
                                            <option value="+244">🇦🇴 +244 Angola</option>
                                            <option value="+54">🇦🇷 +54 Argentina</option>
                                            <option value="+374">🇦🇲 +374 Armenia</option>
                                            <option value="+61">🇦🇺 +61 Australia</option>
                                            <option value="+43">🇦🇹 +43 Austria</option>
                                            <option value="+994">🇦🇿 +994 Azerbaijan</option>
                                            <option value="+973">🇧🇭 +973 Bahrain</option>
                                            <option value="+880">🇧🇩 +880 Bangladesh</option>
                                            <option value="+375">🇧🇾 +375 Belarus</option>
                                            <option value="+32">🇧🇪 +32 Belgium</option>
                                            <option value="+501">🇧🇿 +501 Belize</option>
                                            <option value="+229">🇧🇯 +229 Benin</option>
                                            <option value="+975">🇧🇹 +975 Bhutan</option>
                                            <option value="+591">🇧🇴 +591 Bolivia</option>
                                            <option value="+387">🇧🇦 +387 Bosnia</option>
                                            <option value="+267">🇧🇼 +267 Botswana</option>
                                            <option value="+55">🇧🇷 +55 Brazil</option>
                                            <option value="+673">🇧🇳 +673 Brunei</option>
                                            <option value="+359">🇧🇬 +359 Bulgaria</option>
                                            <option value="+226">🇧🇫 +226 Burkina Faso</option>
                                            <option value="+257">🇧🇮 +257 Burundi</option>
                                            <option value="+855">🇰🇭 +855 Cambodia</option>
                                            <option value="+237">🇨🇲 +237 Cameroon</option>
                                            <option value="+1">🇨🇦 +1 Canada</option>
                                            <option value="+238">🇨🇻 +238 Cape Verde</option>
                                            <option value="+236">🇨🇫 +236 Central African Republic</option>
                                            <option value="+235">🇹🇩 +235 Chad</option>
                                            <option value="+56">🇨🇱 +56 Chile</option>
                                            <option value="+86">🇨🇳 +86 China</option>
                                            <option value="+57">🇨🇴 +57 Colombia</option>
                                            <option value="+269">🇰🇲 +269 Comoros</option>
                                            <option value="+242">🇨🇬 +242 Congo</option>
                                            <option value="+506">🇨🇷 +506 Costa Rica</option>
                                            <option value="+385">🇭🇷 +385 Croatia</option>
                                            <option value="+53">🇨🇺 +53 Cuba</option>
                                            <option value="+357">🇨🇾 +357 Cyprus</option>
                                            <option value="+420">🇨🇿 +420 Czech Republic</option>
                                            <option value="+45">🇩🇰 +45 Denmark</option>
                                            <option value="+253">🇩🇯 +253 Djibouti</option>
                                            <option value="+593">🇪🇨 +593 Ecuador</option>
                                            <option value="+20">🇪🇬 +20 Egypt</option>
                                            <option value="+503">🇸🇻 +503 El Salvador</option>
                                            <option value="+240">🇬🇶 +240 Equatorial Guinea</option>
                                            <option value="+291">🇪🇷 +291 Eritrea</option>
                                            <option value="+372">🇪🇪 +372 Estonia</option>
                                            <option value="+251">🇪🇹 +251 Ethiopia</option>
                                            <option value="+679">🇫🇯 +679 Fiji</option>
                                            <option value="+358">🇫🇮 +358 Finland</option>
                                            <option value="+33">🇫🇷 +33 France</option>
                                            <option value="+241">🇬🇦 +241 Gabon</option>
                                            <option value="+220">🇬🇲 +220 Gambia</option>
                                            <option value="+995">🇬🇪 +995 Georgia</option>
                                            <option value="+49">🇩🇪 +49 Germany</option>
                                            <option value="+233">🇬🇭 +233 Ghana</option>
                                            <option value="+30">🇬🇷 +30 Greece</option>
                                            <option value="+502">🇬🇹 +502 Guatemala</option>
                                            <option value="+224">🇬🇳 +224 Guinea</option>
                                            <option value="+245">🇬🇼 +245 Guinea-Bissau</option>
                                            <option value="+592">🇬🇾 +592 Guyana</option>
                                            <option value="+509">🇭🇹 +509 Haiti</option>
                                            <option value="+504">🇭🇳 +504 Honduras</option>
                                            <option value="+852">🇭🇰 +852 Hong Kong</option>
                                            <option value="+36">🇭🇺 +36 Hungary</option>
                                            <option value="+354">🇮🇸 +354 Iceland</option>
                                            <option value="+91">🇮🇳 +91 India</option>
                                            <option value="+62">🇮🇩 +62 Indonesia</option>
                                            <option value="+98">🇮🇷 +98 Iran</option>
                                            <option value="+964">🇮🇶 +964 Iraq</option>
                                            <option value="+353">🇮🇪 +353 Ireland</option>
                                            <option value="+972">🇮🇱 +972 Israel</option>
                                            <option value="+39">🇮🇹 +39 Italy</option>
                                            <option value="+225">🇨🇮 +225 Ivory Coast</option>
                                            <option value="+81">🇯🇵 +81 Japan</option>
                                            <option value="+962">🇯🇴 +962 Jordan</option>
                                            <option value="+7">🇰🇿 +7 Kazakhstan</option>
                                            <option value="+254">🇰🇪 +254 Kenya</option>
                                            <option value="+965">🇰🇼 +965 Kuwait</option>
                                            <option value="+996">🇰🇬 +996 Kyrgyzstan</option>
                                            <option value="+856">🇱🇦 +856 Laos</option>
                                            <option value="+371">🇱🇻 +371 Latvia</option>
                                            <option value="+961">🇱🇧 +961 Lebanon</option>
                                            <option value="+266">🇱🇸 +266 Lesotho</option>
                                            <option value="+231">🇱🇷 +231 Liberia</option>
                                            <option value="+218">🇱🇾 +218 Libya</option>
                                            <option value="+423">🇱🇮 +423 Liechtenstein</option>
                                            <option value="+370">🇱🇹 +370 Lithuania</option>
                                            <option value="+352">🇱🇺 +352 Luxembourg</option>
                                            <option value="+853">🇲🇴 +853 Macau</option>
                                            <option value="+389">🇲🇰 +389 Macedonia</option>
                                            <option value="+261">🇲🇬 +261 Madagascar</option>
                                            <option value="+265">🇲🇼 +265 Malawi</option>
                                            <option value="+60">🇲🇾 +60 Malaysia</option>
                                            <option value="+960">🇲🇻 +960 Maldives</option>
                                            <option value="+223">🇲🇱 +223 Mali</option>
                                            <option value="+356">🇲🇹 +356 Malta</option>
                                            <option value="+222">🇲🇷 +222 Mauritania</option>
                                            <option value="+230">🇲🇺 +230 Mauritius</option>
                                            <option value="+52">🇲🇽 +52 Mexico</option>
                                            <option value="+373">🇲🇩 +373 Moldova</option>
                                            <option value="+377">🇲🇨 +377 Monaco</option>
                                            <option value="+976">🇲🇳 +976 Mongolia</option>
                                            <option value="+382">🇲🇪 +382 Montenegro</option>
                                            <option value="+212">🇲🇦 +212 Morocco</option>
                                            <option value="+258">🇲🇿 +258 Mozambique</option>
                                            <option value="+95">🇲🇲 +95 Myanmar</option>
                                            <option value="+264">🇳🇦 +264 Namibia</option>
                                            <option value="+977">🇳🇵 +977 Nepal</option>
                                            <option value="+31">🇳🇱 +31 Netherlands</option>
                                            <option value="+64">🇳🇿 +64 New Zealand</option>
                                            <option value="+505">🇳🇮 +505 Nicaragua</option>
                                            <option value="+227">🇳🇪 +227 Niger</option>
                                            <option value="+234">🇳🇬 +234 Nigeria</option>
                                            <option value="+850">🇰🇵 +850 North Korea</option>
                                            <option value="+47">🇳🇴 +47 Norway</option>
                                            <option value="+968">🇴🇲 +968 Oman</option>
                                            <option value="+92">🇵🇰 +92 Pakistan</option>
                                            <option value="+970">🇵🇸 +970 Palestine</option>
                                            <option value="+507">🇵🇦 +507 Panama</option>
                                            <option value="+675">🇵🇬 +675 Papua New Guinea</option>
                                            <option value="+595">🇵🇾 +595 Paraguay</option>
                                            <option value="+51">🇵🇪 +51 Peru</option>
                                            <option value="+63">🇵🇭 +63 Philippines</option>
                                            <option value="+48">🇵🇱 +48 Poland</option>
                                            <option value="+351">🇵🇹 +351 Portugal</option>
                                            <option value="+974">🇶🇦 +974 Qatar</option>
                                            <option value="+40">🇷🇴 +40 Romania</option>
                                            <option value="+7">🇷🇺 +7 Russia</option>
                                            <option value="+250">🇷🇼 +250 Rwanda</option>
                                            <option value="+966">🇸🇦 +966 Saudi Arabia</option>
                                            <option value="+221">🇸🇳 +221 Senegal</option>
                                            <option value="+381">🇷🇸 +381 Serbia</option>
                                            <option value="+248">🇸🇨 +248 Seychelles</option>
                                            <option value="+232">🇸🇱 +232 Sierra Leone</option>
                                            <option value="+65">🇸🇬 +65 Singapore</option>
                                            <option value="+421">🇸🇰 +421 Slovakia</option>
                                            <option value="+386">🇸🇮 +386 Slovenia</option>
                                            <option value="+252">🇸🇴 +252 Somalia</option>
                                            <option value="+27">🇿🇦 +27 South Africa</option>
                                            <option value="+82">🇰🇷 +82 South Korea</option>
                                            <option value="+211">🇸🇸 +211 South Sudan</option>
                                            <option value="+34">🇪🇸 +34 Spain</option>
                                            <option value="+94">🇱🇰 +94 Sri Lanka</option>
                                            <option value="+249">🇸🇩 +249 Sudan</option>
                                            <option value="+597">🇸🇷 +597 Suriname</option>
                                            <option value="+46">🇸🇪 +46 Sweden</option>
                                            <option value="+41">🇨🇭 +41 Switzerland</option>
                                            <option value="+963">🇸🇾 +963 Syria</option>
                                            <option value="+886">🇹🇼 +886 Taiwan</option>
                                            <option value="+992">🇹🇯 +992 Tajikistan</option>
                                            <option value="+255">🇹🇿 +255 Tanzania</option>
                                            <option value="+66">🇹🇭 +66 Thailand</option>
                                            <option value="+228">🇹🇬 +228 Togo</option>
                                            <option value="+676">🇹🇴 +676 Tonga</option>
                                            <option value="+216">🇹🇳 +216 Tunisia</option>
                                            <option value="+90">🇹🇷 +90 Turkey</option>
                                            <option value="+993">🇹🇲 +993 Turkmenistan</option>
                                            <option value="+256">🇺🇬 +256 Uganda</option>
                                            <option value="+380">🇺🇦 +380 Ukraine</option>
                                            <option value="+971">🇦🇪 +971 UAE</option>
                                            <option value="+44">🇬🇧 +44 United Kingdom</option>
                                            <option value="+1">🇺🇸 +1 United States</option>
                                            <option value="+598">🇺🇾 +598 Uruguay</option>
                                            <option value="+998">🇺🇿 +998 Uzbekistan</option>
                                            <option value="+678">🇻🇺 +678 Vanuatu</option>
                                            <option value="+58">🇻🇪 +58 Venezuela</option>
                                            <option value="+84">🇻🇳 +84 Vietnam</option>
                                            <option value="+967">🇾🇪 +967 Yemen</option>
                                            <option value="+260">🇿🇲 +260 Zambia</option>
                                            <option value="+263">🇿🇼 +263 Zimbabwe</option>
                                        </select>
                                    </div>
                                    <div className="relative flex-1">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={handlePhoneChange}
                                            className={clsx(
                                                "w-full pl-12 pr-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition-all",
                                                errors.phone ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                            )}
                                            placeholder="3001234567"
                                        />
                                    </div>
                                </div>
                                {errors.phone && <p className="text-xs text-red-500 mt-1 font-medium">{errors.phone}</p>}
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-700">
                                    CNIC / National ID <span className="text-slate-400 font-normal">(Optional for international users)</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.cnic}
                                    onChange={handleCnicChange}
                                    className={clsx(
                                        "w-full mt-1 px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition-all",
                                        errors.cnic ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    )}
                                    placeholder="12345-1234567-1"
                                />
                                {errors.cnic && <p className="text-xs text-red-500 mt-1 font-medium">{errors.cnic}</p>}
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-700">Email Address</label>
                                <div className="relative mt-1">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleGenericChange("email", e.target.value)}
                                        className={clsx(
                                            "w-full pl-12 pr-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition-all",
                                            errors.email ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        )}
                                        placeholder="you@example.com"
                                    />
                                </div>
                                {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email}</p>}
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700">Password</label>
                                <div className="relative mt-1">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => handleGenericChange("password", e.target.value)}
                                        className={clsx(
                                            "w-full pl-12 pr-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition-all",
                                            errors.password ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        )}
                                        placeholder="••••••••"
                                    />
                                </div>
                                {errors.password && <p className="text-xs text-red-500 mt-1 font-medium">{errors.password}</p>}
                            </div>

                            {formError && (
                                <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    {formError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        Complete Registration <CheckCircle className="w-5 h-5" />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-slate-400 mt-4">
                                By continuing, you agree to CIEL's Term of Service and Privacy Policy.
                            </p>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
