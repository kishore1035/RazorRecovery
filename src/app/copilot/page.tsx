"use client";

import { useState } from "react";

export default function CopilotPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const sendMessage = async (presetText?: string) => {
    const textToSend = presetText || input;
    if (!textToSend.trim()) return;

    const userMsg = { id: Date.now(), role: "USER", content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!presetText) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg.content, conversationId })
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl shadow-xs border border-zinc-200 overflow-hidden font-sans">
      {/* Header (Soft Charcoal / Light Black) */}
      <div className="px-6 py-4 border-b border-zinc-700/60 bg-zinc-800 text-zinc-100 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-300 animate-pulse"></span>
            <h1 className="text-base font-bold text-white">Ask RazorRecovery Copilot</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">Context-Aware Financial Intelligence Agent</p>
        </div>
        <button
          className="text-xs font-bold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
          onClick={() => { setMessages([]); setConversationId(null); }}
        >
          + New Session
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="w-12 h-12 bg-zinc-100 text-black rounded-2xl flex items-center justify-center text-xs font-bold border border-zinc-300">
              AI
            </div>
            <div>
              <h2 className="text-base font-bold text-black">Contextual Revenue Intelligence</h2>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Ask about active revenue leaks, net recovery predictions, historical evidence, or policy limits.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg pt-2">
              <button
                onClick={() => sendMessage("Why is revenue at risk today?")}
                className="px-3.5 py-2 bg-zinc-50 border border-zinc-300 text-black rounded-xl text-xs font-bold hover:bg-zinc-100 transition-colors"
              >
                Why is revenue at risk today?
              </button>
              <button
                onClick={() => sendMessage("Show me active revenue leaks and impact")}
                className="px-3.5 py-2 bg-zinc-50 border border-zinc-300 text-black rounded-xl text-xs font-bold hover:bg-zinc-100 transition-colors"
              >
                Active Leaks & Impact
              </button>
              <button
                onClick={() => sendMessage("What strategy has highest NET recovery rate?")}
                className="px-3.5 py-2 bg-zinc-50 border border-zinc-300 text-black rounded-xl text-xs font-bold hover:bg-zinc-100 transition-colors"
              >
                Highest Net Recovery Strategy
              </button>
            </div>
          </div>
        )}

        {messages.map((m, idx) => {
          let structured = null;
          if (m.structuredData) {
            try { structured = JSON.parse(m.structuredData); } catch (e) {}
          }

          return (
            <div key={idx} className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                m.role === "USER" ? "bg-zinc-800 text-zinc-100 shadow-xs" : "bg-zinc-50 border border-zinc-200 text-black"
              }`}>
                <p className="text-xs leading-relaxed whitespace-pre-wrap font-sans">{m.content}</p>

                {structured && (
                  <div className="mt-4 pt-3 border-t border-zinc-200 space-y-3">
                    {structured.evidence && (
                      <div className="bg-white p-3 rounded-xl border border-zinc-300 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-black font-bold text-[10px] uppercase tracking-wider">
                          <span>EVIDENCE</span> • Verified Citation
                        </div>
                        <p className="text-zinc-800 font-medium">{structured.evidence}</p>
                      </div>
                    )}

                    {structured.proposals?.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-zinc-300 space-y-2 text-black">
                        <span className="text-[10px] font-bold text-black uppercase tracking-wider block">
                          Policy Action Proposal
                        </span>
                        {structured.proposals.map((p: any) => (
                          <div key={p.id} className="text-xs space-y-1">
                            <p><strong>Action:</strong> {p.requestedAction}</p>
                            <p className="text-[11px] text-zinc-500">Requires explicit merchant policy authorization.</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-50 border border-zinc-300 text-zinc-700 rounded-2xl px-5 py-3 text-xs font-bold animate-pulse">
              Synthesizing revenue intelligence...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-200 bg-white">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask RazorRecovery about revenue at risk, leaks, or recovery net ROI..."
            className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-700"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-zinc-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-700 disabled:opacity-50 transition-colors shadow-2xs"
          >
            Send →
          </button>
        </form>
      </div>
    </div>
  );
}
