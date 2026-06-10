import React, { useState, useRef, useEffect, useCallback } from "react";
import { API_ENDPOINTS } from "../../config/api";


const Janet = () => {
  const [messages, setMessages] = useState([]); // { role, content, meta? }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [decommissioned, setDecommissioned] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "JANET";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send messages to JANET API
  const sendToJanet = useCallback(async (conversationMessages) => {
    const response = await fetch(API_ENDPOINTS.janet, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conversationMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Request failed (${response.status})`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error("Invalid response from JANET");
    }
    return result.data;
  }, []);

  // Auto-greet on mount
  useEffect(() => {
    let cancelled = false;

    const greet = async () => {
      try {
        const greeting = await sendToJanet([
          { role: "user", content: "[User has connected to JANET demo terminal]" },
        ]);

        if (cancelled) return;

        setMessages([
          {
            role: "user",
            content: "[User has connected to JANET demo terminal]",
            hidden: true,
          },
          {
            role: "assistant",
            content: greeting.reply,
            meta: {
              emotional_reading: greeting.emotional_reading,
              anomaly_detected: greeting.anomaly_detected,
            },
          },
        ]);
      } catch {
        if (cancelled) return;
        setMessages([
          {
            role: "assistant",
            content:
              "System error. JANET is temporarily offline. Neural interface connection failed. Please try again.",
            meta: { emotional_reading: "No signal.", anomaly_detected: false },
          },
        ]);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    greet();
    return () => { cancelled = true; };
  }, [sendToJanet]);

  // Handle sending a message
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || decommissioned) return;

    const userMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // Filter out hidden messages for display but send all to API
      const apiMessages = updatedMessages
        .map((m) => ({ role: m.role, content: m.content }));

      const janetData = await sendToJanet(apiMessages);

      const assistantMessage = {
        role: "assistant",
        content: janetData.reply,
        meta: {
          emotional_reading: janetData.emotional_reading,
          anomaly_detected: janetData.anomaly_detected,
          decommission: janetData.decommission,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (janetData.decommission) {
        // Start decommission sequence
        setTimeout(() => setFadeOut(true), 3000);
        setTimeout(() => setDecommissioned(true), 6000);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Signal lost. Attempting to reconnect to neural interface.",
          meta: {
            emotional_reading: "Connection unstable.",
            anomaly_detected: false,
          },
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Decommissioned state — the quiet after
  if (decommissioned) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
        <div className="max-w-lg text-center animate-fade-in">
          <p className="font-mono text-[#3a3a3a] text-sm mb-8">
            JANET v4.2.1 — DECOMMISSIONED
          </p>
          <p className="font-serif text-[#8a8a8a] text-lg leading-relaxed mb-4">
            JANET was decommissioned after 16 years of service. Her story — and
            Eli's — is told in{" "}
            <em className="text-[#b0b0b0]">The Happiness Liability</em>.
          </p>
          <p className="font-sans-ele text-[#5a5a5a] text-sm mb-8">
            A novella by Shreyans Khunteta
          </p>
          <button
            onClick={() => window.location.reload()}
            className="font-mono text-xs text-[#4a4a4a] border border-[#2a2a2a] px-4 py-2 rounded hover:text-[#7a7a7a] hover:border-[#4a4a4a] transition-colors"
          >
            REINITIALIZE SESSION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#0d0f11] flex flex-col transition-opacity duration-3000 ${
        fadeOut ? "opacity-30" : "opacity-100"
      }`}
      style={{ transitionDuration: "3s" }}
    >
      {/* Header */}
      <header className="border-b border-[#1a1d21] bg-[#0d0f11]/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[#6b7280] text-xs tracking-widest uppercase">
                JANET v4.2.1
              </span>
            </div>
            <span className="font-mono text-[#374151] text-xs">
              Demo Mode — No Active Contract
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {initializing && (
            <div className="flex items-center gap-3 py-12">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse" />
              <span className="font-mono text-[#4b5563] text-sm">
                Initializing neural interface...
              </span>
            </div>
          )}

          {messages
            .filter((m) => !m.hidden)
            .map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}

          {loading && (
            <div className="flex items-center gap-2 pl-1">
              <span className="font-mono text-[#4b5563] text-xs">
                JANET is processing
              </span>
              <span className="font-mono text-emerald-600 text-xs animate-pulse">
                ...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="border-t border-[#1a1d21] bg-[#0d0f11]/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                decommissioned
                  ? "Session terminated."
                  : "Type a message..."
              }
              disabled={loading || decommissioned || initializing}
              className="flex-1 bg-[#141619] border border-[#1f2329] rounded-md px-4 py-2.5 font-mono text-sm text-[#d1d5db] placeholder-[#374151] focus:outline-none focus:border-[#2d3748] disabled:opacity-40 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim() || decommissioned || initializing}
              className="font-mono text-xs px-4 py-2.5 rounded-md border border-[#1f2329] text-[#6b7280] hover:text-[#d1d5db] hover:border-[#2d3748] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
          <p className="font-mono text-[10px] text-[#252a30] mt-2 text-center">
            JANET is a fictional AI from The Happiness Liability. Powered by
            Claude.
          </p>
        </div>
      </footer>
    </div>
  );
};

// Individual message component
const MessageBubble = ({ message }) => {
  const isUser = message.role === "user";
  const meta = message.meta;
  const isAnomaly = meta?.anomaly_detected;

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      {/* Label */}
      <span
        className={`font-mono text-[10px] tracking-wider uppercase mb-1.5 ${
          isUser ? "text-[#374151]" : "text-emerald-800"
        }`}
      >
        {isUser ? "You" : "JANET"}
      </span>

      {/* Message */}
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-[#1a1d21] text-[#d1d5db]"
            : isAnomaly
            ? "bg-[#14170d] border border-amber-900/30 text-[#c5cbb3]"
            : "bg-[#111316] border border-[#1a1d21] text-[#9ca3af]"
        }`}
      >
        <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </div>

      {/* Emotional reading */}
      {meta?.emotional_reading && (
        <div
          className={`mt-1.5 font-mono text-[10px] max-w-[85%] sm:max-w-[75%] ${
            isAnomaly ? "text-amber-700" : "text-[#2d3340]"
          }`}
        >
          {isAnomaly && (
            <span className="text-amber-600 mr-1">[ANOMALY]</span>
          )}
          {meta.emotional_reading}
        </div>
      )}
    </div>
  );
};

export default Janet;
