import React from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface Message {
  sender: string;
  role: string;
  text: string;
  time: string;
  avatar: string;
}

const messages: Message[] = [
  {
    sender: "Alex",
    role: "Tenant",
    text: "The hallway light is out on 3rd floor.",
    time: "2m ago",
    avatar: "https://app.banani.co/avatar1.jpeg",
  },
  {
    sender: "Morgan",
    role: "Manager",
    text: "Thanks, we'll dispatch maintenance today.",
    time: "Just now",
    avatar: "https://app.banani.co/avatar2.jpg",
  },
];

const MessageBubble = ({ message }: { message: Message }) => (
  <div className="group flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-neon-blue/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]">
    <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/15">
      <img
        src={message.avatar}
        alt={`${message.sender} profile`}
        className="h-full w-full object-cover"
      />
      <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-neon" />
    </div>
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
          {message.role}
        </span>
        <span className="font-mono text-sm text-slate-100">
          {message.sender}
        </span>
        <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
          {message.time}
        </span>
      </div>
      <div className="font-mono text-base text-slate-50">{message.text}</div>
    </div>
  </div>
);

export const MessagingCard: React.FC = () => (
  <GlassCard
    title="Messaging"
    subtitle="Tenant <> manager command channel"
    actionSlot={
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-slate-200">
        <MessageCircle className="h-4 w-4 text-neon-blue" />
        Live
      </div>
    }
  >
    <div className="flex flex-col gap-2">
      {messages.map((message) => (
        <MessageBubble key={`${message.sender}-${message.time}`} message={message} />
      ))}
    </div>

    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-[10px] uppercase tracking-[0.28em] text-slate-400">
        Shared interface for rapid tenant + manager loops.
      </div>
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-neon-blue/50 bg-linear-to-r from-neon-blue/30 to-neon-purple/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-white transition hover:shadow-[0_0_15px_rgba(0,240,255,0.35)]"
      >
        Quick reply
        <Sparkles className="h-4 w-4" />
      </button>
    </div>
  </GlassCard>
);
