"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, User, Bot, Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "bot" | "error";
  content: string;
  id: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const STREAM_URL = `${API_BASE}/chat/stream`;

// ─── Blinking cursor shown while a bot message is actively streaming ──────────

function BlinkingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      className="inline-block w-[2px] h-[1em] bg-emerald-400 ml-0.5 align-middle"
      aria-hidden="true"
    />
  );
}

// ─── Typing dots — shown only before the first token arrives ─────────────────

function TypingDots() {
  return (
    <div className="flex justify-start" aria-label="Mitra is typing…">
      <div className="flex items-center gap-1.5 bg-slate-800 px-5 py-4 rounded-2xl rounded-tl-none border border-slate-700">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            className="w-2 h-2 bg-cyan-400 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Chat component ──────────────────────────────────────────────────────

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  /** true only while waiting for the FIRST token (shows typing dots) */
  const [isLoading, setIsLoading] = useState(false);
  /** true from first token until [DONE] (shows blinking cursor on last message) */
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const uid = () => Math.random().toString(36).slice(2);

  // ── Core streaming logic ──────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || isStreaming) return;

    setLastError(null);

    // Optimistically add user message
    const userMsg: Message = { role: "user", content: text, id: uid() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(STREAM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, is_local_only: false }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("ReadableStream not supported by this browser.");

      const decoder = new TextDecoder();
      let lineBuffer = ""; // accumulate partial SSE lines across read() calls
      const botId = uid();

      // Add the initial empty bot bubble
      setMessages((prev) => [...prev, { role: "bot", content: "", id: botId }]);

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });

        // SSE lines are separated by "\n\n"
        const parts = lineBuffer.split("\n\n");
        // Keep the last (potentially incomplete) part in the buffer
        lineBuffer = parts.pop() ?? "";

        for (const part of parts) {
          // Each SSE event can have multiple lines; find the data: line
          for (const line of part.split("\n")) {
            if (!line.startsWith("data: ")) continue;

            const payload = line.slice(6).trim();

            // ── Terminal sentinel ─────────────────────────────────────
            if (payload === "[DONE]") {
              setIsLoading(false);
              setIsStreaming(false);
              break outer;
            }

            // ── JSON event ────────────────────────────────────────────
            try {
              const event = JSON.parse(payload) as {
                token?: string;
                error?: string;
              };

              if (event.error) {
                throw new Error(event.error);
              }

              if (event.token) {
                // First token: transition from loading→streaming
                if (isLoading) {
                  setIsLoading(false);
                  setIsStreaming(true);
                }

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botId
                      ? { ...m, content: m.content + event.token! }
                      : m
                  )
                );
              }
            } catch (parseErr) {
              // Non-JSON data line — ignore silently
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;

      const msg = err instanceof Error ? err.message : "Unknown error";
      setLastError(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          content: `Kuch gadbad ho gayi! ${msg}`,
          id: uid(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [isLoading, isStreaming]);

  const handleSend = () => sendMessage(input);

  const handleRetry = () => {
    // Find the last user message and resend it
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      setLastError(null);
      // Remove the error bubble(s)
      setMessages((prev) => prev.filter((m) => m.role !== "error"));
      sendMessage(lastUser.content);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const canSend = !isLoading && !isStreaming && input.trim().length > 0;
  const lastMsgId = messages[messages.length - 1]?.id;

  return (
    <div className="flex flex-col h-[620px] bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 italic">Mitra AI</h3>
            <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Hinglish Advisor Online
            </p>
          </div>
        </div>
        {isStreaming && (
          <span className="text-xs text-cyan-400 font-medium animate-pulse">
            Typing…
          </span>
        )}
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar"
      >
        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center gap-4">
            <Sparkles className="w-12 h-12 opacity-20" />
            <p className="max-w-[220px] text-sm leading-relaxed">
              Namaste! 🙏 Ask me about UPI security, taxes, EMI, or any money
              question.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* Error bubble */}
              {msg.role === "error" ? (
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="bg-red-950/50 border border-red-500/30 px-4 py-3 rounded-2xl rounded-tl-none space-y-2">
                    <p className="text-sm text-red-300">{msg.content}</p>
                    <button
                      onClick={handleRetry}
                      disabled={isLoading || isStreaming}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-white transition-colors font-medium"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Dubara try karo
                    </button>
                  </div>
                </div>
              ) : (
                /* Regular message bubble */
                <div
                  className={`flex gap-3 max-w-[85%] ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      msg.role === "user"
                        ? "bg-slate-700"
                        : "bg-cyan-600/30 text-cyan-400"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                    }`}
                  >
                    {/* Preserve whitespace/newlines from the model */}
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                    {/* Show blinking cursor on the active streaming message */}
                    {isStreaming &&
                      msg.role === "bot" &&
                      msg.id === lastMsgId && <BlinkingCursor />}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing dots — only before first token */}
        {isLoading && <TypingDots />}
      </div>

      {/* Input area */}
      <div className="p-5 bg-slate-900/50 border-t border-slate-800">
        {lastError && !isLoading && !isStreaming && (
          <p className="text-xs text-red-400 mb-2 px-1">
            ⚠ Connection issue. Check if the backend is running.
          </p>
        )}
        <div className="relative flex gap-2">
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type your query (e.g., Ye UPI link safe hai?)…"
            disabled={isLoading || isStreaming}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl py-3.5 pl-5 pr-4 text-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-500"
          />
          <button
            id="chat-send-btn"
            onClick={handleSend}
            disabled={!canSend}
            className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700
                       rounded-xl transition-all duration-150 active:scale-95
                       disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
