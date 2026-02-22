"use client";

import { useState, useEffect, Suspense } from "react";
import ConversationList from "./ConversationList";
import ChatWindow from "./ChatWindow";
import { authenticatedFetch } from "@/utils/api";
import { MessageSquare, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import UserSearchModal from "./UserSearchModal";

function ChatPageContent() {
    const searchParams = useSearchParams();
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(searchParams ? searchParams.get("conversationId") : null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    useEffect(() => {
        fetchUser();
        fetchConversations();

        // Polling for new conversations
        const interval = setInterval(() => {
            fetchConversations();
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const fetchUser = async () => {
        try {
            const res = await authenticatedFetch("/api/v1/user/me");
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setCurrentUserId(data.data.id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch user", error);
        }
    };

    const fetchConversations = async () => {
        try {
            const res = await authenticatedFetch("/api/v1/chat/conversations");
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    console.log("Fetched Conversations: ", JSON.stringify(data.data, null, 2));
                    setConversations(data.data);
                }
            }
        } catch (error) {
            console.error("Failed to fetch conversations", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartChat = async (userId: string) => {
        console.log("Starting chat with user:", userId);
        try {
            const res = await authenticatedFetch("/api/v1/chat/conversations", {
                method: "POST",
                body: JSON.stringify({
                    participantIds: [userId],
                    type: "DIRECT"
                })
            });

            if (res && res.ok) {
                const data = await res.json();
                console.log("Conversation creation response:", data);
                if (data.success) {
                    const newConv = data.data;
                    // Add to list if not there
                    setConversations(prev => {
                        if (!prev.find(c => c.id === newConv.id)) {
                            return [newConv, ...prev];
                        }
                        return prev;
                    });
                    setSelectedId(newConv.id);
                    setIsSearchModalOpen(false);
                } else {
                    console.error("Failed to start chat: success was false", data);
                }
            } else {
                console.error("Failed to start chat: response not ok", res?.status);
            }
        } catch (error) {
            console.error("Failed to start chat error:", error);
        }
    };

    const selectedConversation = conversations.find(c => c.id === selectedId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-120px)] bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-slate-500 font-medium font-inter">Loading conversations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            {/* Sidebar */}
            <div className={clsx(
                "w-full md:w-80 lg:w-96 shrink-0 z-20",
                selectedId ? "hidden md:block" : "block"
            )}>
                <ConversationList
                    conversations={conversations}
                    selectedId={selectedId || undefined}
                    onSelect={setSelectedId}
                    currentUserId={currentUserId}
                    onNewChat={() => setIsSearchModalOpen(true)}
                />
            </div>

            {/* Chat Window */}
            <div className={clsx(
                "flex-1 z-10",
                !selectedId ? "hidden md:flex items-center justify-center bg-slate-50 relative" : "flex"
            )}>
                {selectedId ? (
                    <ChatWindow
                        conversationId={selectedId}
                        currentUserId={currentUserId}
                        onBack={() => setSelectedId(null)}
                        otherUser={selectedConversation?.otherParticipants[0]}
                    />
                ) : (
                    <div className="text-center group">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 transform transition-all group-hover:scale-110 group-hover:rotate-6">
                            <MessageSquare className="w-10 h-10 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Your Inbox</h2>
                        <p className="text-slate-500 max-w-xs mx-auto text-sm">Select a conversation from the sidebar to start chatting with your partners and team.</p>

                        {/* Decorative background elements */}
                        <div className="absolute top-10 right-10 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl" />
                        <div className="absolute bottom-10 left-10 w-24 h-24 bg-emerald-50/50 rounded-full blur-2xl" />
                    </div>
                )}
            </div>

            <UserSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onSelectUser={handleStartChat}
            />
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-[calc(100vh-120px)] bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-slate-500 font-medium">Loading chat...</p>
                </div>
            </div>
        }>
            <ChatPageContent />
        </Suspense>
    );
}

