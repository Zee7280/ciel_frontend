"use client";

import { useState, useEffect, useRef } from "react";
import { authenticatedFetch } from "@/utils/api";
import { ArrowLeft, Send, User, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";

interface Participant {
    id: string;
    name: string;
    avatar?: string;
    role: string;
}

interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    isRead: boolean;
    createdAt: string;
    sender?: {
        id: string;
        name: string;
        avatar?: string;
    };
}

interface ChatWindowProps {
    conversationId: string;
    currentUserId: string;
    onBack: () => void;
    otherUser?: Participant;
}

export default function ChatWindow({
    conversationId,
    currentUserId,
    onBack,
    otherUser,
}: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMessages();
        markAsRead();

        const interval = setInterval(() => {
            fetchMessages();
        }, 90000);

        return () => clearInterval(interval);
    }, [conversationId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const res = await authenticatedFetch(
                `/api/v1/chat/conversations/${conversationId}/messages`
            );
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setMessages(data.data);
                }
            }
        } catch (error) {
            console.error("Failed to fetch messages", error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async () => {
        try {
            await authenticatedFetch(
                `/api/v1/chat/conversations/${conversationId}/read`,
                { method: "PATCH" }
            );
        } catch {
            // non-critical
        }
    };

    const handleSend = async () => {
        const content = newMessage.trim();
        if (!content || isSending) return;

        setIsSending(true);
        setNewMessage("");

        // Optimistic update
        const tempMsg: Message = {
            id: `temp-${Date.now()}`,
            conversationId,
            senderId: currentUserId,
            content,
            isRead: false,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempMsg]);

        try {
            const res = await authenticatedFetch(
                `/api/v1/chat/messages`,
                {
                    method: "POST",
                    body: JSON.stringify({ conversationId, content }),
                }
            );

            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    // Replace temp message with real one
                    setMessages((prev) =>
                        prev.map((m) => (m.id === tempMsg.id ? data.data : m))
                    );
                }
            }
        } catch (error) {
            console.error("Failed to send message", error);
            // Remove temp message on failure
            setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
            setNewMessage(content);
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col w-full h-full bg-slate-50">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm shrink-0">
                <button
                    onClick={onBack}
                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
                    aria-label="Back"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {otherUser?.avatar ? (
                        <img
                            src={otherUser.avatar}
                            alt={otherUser.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <User className="w-5 h-5 text-slate-400" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">
                        {otherUser?.name || "Unknown User"}
                    </h3>
                    {otherUser?.role && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 italic">
                            {otherUser.role}
                        </span>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                        <p>No messages yet. Say hello! 👋</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMine = msg.senderId === currentUserId;
                        return (
                            <div
                                key={msg.id}
                                className={clsx(
                                    "flex gap-2 max-w-[80%]",
                                    isMine
                                        ? "ml-auto flex-row-reverse"
                                        : "mr-auto"
                                )}
                            >
                                {!isMine && (
                                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0 self-end">
                                        {otherUser?.avatar ? (
                                            <img
                                                src={otherUser.avatar}
                                                alt={otherUser.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-4 h-4 text-slate-400" />
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-col gap-1">
                                    <div
                                        className={clsx(
                                            "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                                            isMine
                                                ? "bg-blue-600 text-white rounded-br-sm"
                                                : "bg-white text-slate-800 rounded-bl-sm border border-slate-200"
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                    <span
                                        className={clsx(
                                            "text-[10px] text-slate-400",
                                            isMine ? "text-right" : "text-left"
                                        )}
                                    >
                                        {formatDistanceToNow(
                                            new Date(msg.createdAt),
                                            { addSuffix: true }
                                        )}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-4 py-3 bg-white border-t border-slate-200">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                        disabled={isSending}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || isSending}
                        className={clsx(
                            "p-2 rounded-xl transition-all",
                            newMessage.trim() && !isSending
                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                        aria-label="Send"
                    >
                        {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
