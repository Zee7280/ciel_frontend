"use client";

import { useState, useEffect } from "react";
import { X, Search, User, Loader2, MessageSquarePlus } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import clsx from "clsx";

interface UserCandidate {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
}

interface UserSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectUser: (userId: string) => void;
}

export default function UserSearchModal({ isOpen, onClose, onSelectUser }: UserSearchModalProps) {
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState<UserCandidate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [startingUserId, setStartingUserId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSearch("");
            setUsers([]);
            setStartingUserId(null);
            fetchUsers("");
        }
    }, [isOpen]);

    const fetchUsers = async (query: string) => {
        setIsLoading(true);
        try {
            const res = await authenticatedFetch(`/api/v1/chat/users?search=${encodeURIComponent(query)}`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setUsers(data.data);
                }
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value);
        // Basic debouncing would be better here, but for simplicity:
        const timeoutId = setTimeout(() => fetchUsers(value), 300);
        return () => clearTimeout(timeoutId);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquarePlus className="w-5 h-5 text-blue-600" />
                        New Message
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                fetchUsers(e.target.value);
                            }}
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                        {isLoading && users.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <p className="text-xs">Finding people...</p>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-sm italic">No users found.</p>
                            </div>
                        ) : (
                            users.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        setStartingUserId(user.id);
                                        onSelectUser(user.id);
                                    }}
                                    disabled={startingUserId !== null}
                                    className={clsx(
                                        "w-full p-3 flex items-center gap-3 rounded-xl transition-all text-left group",
                                        startingUserId === user.id ? "bg-blue-50 ring-1 ring-blue-100" : "hover:bg-slate-50",
                                        startingUserId && startingUserId !== user.id ? "opacity-50 grayscale-[0.5]" : ""
                                    )}
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-blue-50 group-hover:scale-105 transition-transform">
                                        {user.avatar ? (
                                            <img src={user.avatar} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-5 h-5 text-blue-600" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-sm text-slate-900 truncate">{user.name}</h4>
                                            {startingUserId === user.id && (
                                                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-slate-400 mr-1 italic">
                                                {user.role}
                                            </span>
                                            {user.email}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
