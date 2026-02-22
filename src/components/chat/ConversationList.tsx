"use client";

import { useState, useEffect } from "react";
import { MessageSquare, User, Clock, MessageSquarePlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";

interface Participant {
    id: string;
    name: string;
    avatar?: string;
    role: string;
}

interface LastMessage {
    content: string;
    createdAt: string;
    isRead: boolean;
    senderId: string;
}

interface Conversation {
    id: string;
    type: string;
    lastMessage?: LastMessage;
    otherParticipants: Participant[];
}

interface ConversationListProps {
    conversations: Conversation[];
    selectedId?: string;
    onSelect: (id: string) => void;
    currentUserId: string;
    onNewChat?: () => void;
}

export default function ConversationList({
    conversations,
    selectedId,
    onSelect,
    currentUserId,
    onNewChat
}: ConversationListProps) {
    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">Conversations</h2>
                    <div className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-bold">
                        {conversations.length}
                    </div>
                </div>
                <button
                    onClick={onNewChat}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-100 group"
                    title="New Chat"
                >
                    <MessageSquarePlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                        <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">No conversations yet.</p>
                    </div>
                ) : (
                    conversations.map((conv) => {
                        const otherUser = conv.otherParticipants[0];
                        const lastMsg = conv.lastMessage;
                        const isSelected = selectedId === conv.id;
                        const hasUnread = lastMsg && !lastMsg.isRead && lastMsg.senderId !== currentUserId;

                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelect(conv.id)}
                                className={clsx(
                                    "w-full p-4 flex gap-3 text-left transition-colors border-b border-slate-50",
                                    isSelected ? "bg-blue-50 border-blue-100" : "hover:bg-slate-50"
                                )}
                            >
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                                        {otherUser?.avatar ? (
                                            <img src={otherUser.avatar} alt={otherUser.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-6 h-6 text-slate-400" />
                                        )}
                                    </div>
                                    {hasUnread && (
                                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-sm" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className={clsx(
                                            "font-bold text-sm truncate",
                                            hasUnread ? "text-slate-900" : "text-slate-700"
                                        )}>
                                            {otherUser?.name || "Unknown User"}
                                        </h3>
                                        {lastMsg && (
                                            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                                {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false })}
                                            </span>
                                        )}
                                    </div>

                                    <p className={clsx(
                                        "text-xs truncate",
                                        hasUnread ? "text-blue-600 font-medium" : "text-slate-500"
                                    )}>
                                        {lastMsg ? lastMsg.content : "Start a conversation"}
                                    </p>

                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 italic">
                                            {otherUser?.role}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
