"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, User, Bot, Sparkles, RefreshCw, AlertTriangle, Globe, ChevronDown, ChevronUp, ExternalLink, FileText, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "bot" | "error";
  content: string;
  id: string;
  modelName?: string;
  isDeepResearchResult?: boolean;
  sources?: Array<{title: string; url: string}>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const STREAM_URL = `${API_BASE}/chat/stream`;

// ─── Components ───────────────────────────────────────────────────────────────

function BlinkingCursor() {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      className="inline-block w-[2px] h-[1.1em] bg-cyan-400 ml-1 align-middle shadow-[0_0_8px_rgba(34,211,238,0.8)]"
      aria-hidden="true"
    />
  );
}

function TypingDots() {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
        <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
      </div>
      <div className="flex items-center gap-1.5 bg-slate-800/50 backdrop-blur-sm px-5 py-3.5 rounded-2xl rounded-tl-none border border-slate-700/50 shadow-xl">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -5, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            className="w-1.5 h-1.5 bg-cyan-500 rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(true);
  const [isDeepSearchEnabled, setIsDeepSearchEnabled] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const uid = () => Math.random().toString(36).slice(2);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || isStreaming) return;

    const userMsg: Message = { role: "user", content: text, id: uid() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const currentIsDeep = isDeepSearchEnabled && isWebSearchEnabled;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(STREAM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, is_local_only: !isWebSearchEnabled, deep_research: currentIsDeep }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      const botId = uid();
      setMessages((prev) => [...prev, { role: "bot", content: "", id: botId, isDeepResearchResult: currentIsDeep }]);

      let fullContent = "";
      let buffer = "";
      let streamStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const packet = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          
          if (packet.startsWith("data: ")) {
            const data = packet.slice(6).trim();
            if (data === "[DONE]") {
              setIsLoading(false);
              setIsStreaming(false);
              return;
            }
            try {
              const event = JSON.parse(data);
              
              // Sources metadata arrives before streaming begins
              if (event.sources) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botId ? { ...m, sources: event.sources } : m
                  )
                );
              }
              
              if (event.token) {
                if (!streamStarted) {
                  streamStarted = true;
                  setIsLoading(false);
                  setIsStreaming(true);
                }
                fullContent += event.token;
                const latestModel = event.model;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botId
                      ? { ...m, content: fullContent, modelName: latestModel || m.modelName }
                      : m
                  )
                );
              }
            } catch (e) {}
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => [...prev, { role: "error", content: `Failed: ${err.message}`, id: uid() }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [isLoading, isStreaming, isWebSearchEnabled, isDeepSearchEnabled]);

  const handleSend = () => sendMessage(input);

  const renderMessageContent = (msg: Message) => {
    // Sources come from the SSE metadata event (msg.sources), NOT from response text
    const shouldShowSources = msg.isDeepResearchResult && msg.sources && msg.sources.length > 0;

    return (
      <div className="space-y-4 relative pb-2 overflow-hidden">
        <div className="whitespace-pre-wrap leading-relaxed">
          {msg.content}
          {isStreaming && msg.id === messages[messages.length-1].id && msg.role === "bot" && <BlinkingCursor />}
        </div>
        
        {shouldShowSources && (
          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <button 
              onClick={() => setExpandedSources(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
              className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-lg hover:bg-cyan-400/20 transition-all uppercase tracking-wider"
            >
              {expandedSources[msg.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Evidence ({msg.sources!.length})
            </button>
            <AnimatePresence>
              {expandedSources[msg.id] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 space-y-2">
                  {msg.sources!.map((s, idx) => (
                    <motion.div key={idx} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.05 }}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2.5 bg-slate-900/60 border border-slate-700/30 rounded-xl text-[11px] text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all group">
                        <Globe className="w-3.5 h-3.5 text-cyan-500" />
                        <span className="truncate flex-1 font-medium">{s.title || s.url}</span>
                        <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {msg.role === "bot" && (
          <div className={`mt-2 flex justify-end transition-opacity duration-1000 ${isStreaming && msg.id === messages[messages.length-1].id ? "opacity-30" : "opacity-100"}`}>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-colors">
              <Cpu className="w-3 h-3" />
              {msg.modelName || "Llama 3"}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[650px] bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-lg tracking-tight italic">Mitra AI</h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Hinglish Guardian</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => { setIsWebSearchEnabled(!isWebSearchEnabled); if (isWebSearchEnabled) setIsDeepSearchEnabled(false); }} className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[11px] font-black transition-all duration-300 border ${isWebSearchEnabled ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-500 opacity-40"}`}>
            <Globe className="w-3.5 h-3.5" />
            {isWebSearchEnabled ? "Online" : "Offline"}
          </button>
          <AnimatePresence>
            {isWebSearchEnabled && (
              <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={() => setIsDeepSearchEnabled(!isDeepSearchEnabled)} className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[11px] font-black transition-all duration-300 border ${isDeepSearchEnabled ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-slate-800 border-slate-700 text-slate-500"}`}>
                <Sparkles className="w-3.5 h-3.5" />
                {isDeepSearchEnabled ? "Deep Search" : "Fast Search"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth custom-scrollbar">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400/40 gap-6">
            <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center">
              <Sparkles className="w-10 h-10 opacity-20" />
            </div>
            <p className="max-w-[280px] text-center text-sm font-medium italic">"Financial security ka bharosa, Mitra AI ka saath." 👋</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`flex group ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-4 max-w-[90%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 border ${msg.role === "user" ? "bg-slate-800 border-white/5" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"}`}>
                  {msg.role === "user" ? <User className="w-5 h-5 text-slate-500" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={`px-5 py-4 rounded-3xl text-[14px] leading-relaxed tracking-wide shadow-2xl ${msg.role === "user" ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none" : "bg-slate-800/60 text-slate-200 rounded-tl-none border border-white/5 backdrop-blur-md"}`}>
                  {renderMessageContent(msg)}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && <TypingDots />}
      </div>

      <div className="p-6 bg-slate-950/40 border-t border-white/5 backdrop-blur-3xl">
        <div className="relative flex gap-3 max-w-5xl mx-auto">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder="Ask me anything..." disabled={isLoading || isStreaming} className="flex-1 bg-slate-900/50 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white" />
          <button onClick={handleSend} disabled={!input.trim() || isLoading} className="px-6 py-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-xl shadow-cyan-500/20 active:scale-95 transition-all outline-none">
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
