import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, FileText, Atom, ScrollText, CalendarCheck2, PartyPopper, Sparkles } from "lucide-react";
import api from "../utils/api";

// === 🛑 NAYA: CAMPUS AI — FULL PAGE VERSION ===
// Desktop left sidebar ke "Campus AI" nav item se yahan aate hain (/campus-ai route).
// Same backend route (/api/ai/chat) use karta hai jo chhote floating widget
// (components/AIAssistant.jsx) mein use hota hai, bas yahan poori screen pe khulta hai.

const QUICK_ACTIONS = [
  { key: "notes", label: "Find Notes", icon: FileText, kind: "navigate", to: "/study-materials" },
  { key: "physics", label: "Explain Physics", icon: Atom, kind: "prompt", prompt: "Mujhe Physics ka koi ek important concept simple bhasha mein samjhao aur pucho ki mujhe kaunsa topic chahiye." },
  { key: "pyq", label: "GTU PYQ", icon: ScrollText, kind: "prompt", prompt: "GTU ke purane papers (PYQ) se exam prep kaise karu? Kuch tips do." },
  { key: "attendance", label: "Attendance", icon: CalendarCheck2, kind: "prompt", prompt: "Meri attendance kaise check karu is app mein?" },
  { key: "events", label: "Events", icon: PartyPopper, kind: "navigate", to: "/notice-board" },
];

export const CampusAI = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey! Main Campus AI hoon 🤖 Padhai, notes, ya app se related kuch bhi pooch sakte ho." },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await api.post("/api/ai/chat", { message: trimmed });
      setMessages((prev) => [...prev, { role: "assistant", text: res.data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Abhi jawab nahi de paa raha, thodi der baad try karo." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action) => {
    if (action.kind === "navigate") {
      navigate(action.to);
    } else {
      sendMessage(action.prompt);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#050505", color: "#e5e5e5" }}>
      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-gray-800 bg-[#0b0b0b]">
        <button
          onClick={() => navigate("/dashboard")}
          aria-label="Back to Dashboard"
          className="p-2 rounded-xl hover:bg-gray-800 transition"
        >
          <ArrowLeft size={20} className="text-gray-300" />
        </button>
        <Sparkles size={20} className="text-cyan-400" />
        <div>
          <p className="font-bold text-white">Campus AI</p>
          <p className="text-[11px] text-gray-500">Powered by Gemini</p>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="flex gap-2 overflow-x-auto px-4 md:px-6 py-3 border-b border-gray-800 scrollbar-hide">
        {QUICK_ACTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleQuickAction(QUICK_ACTIONS.find((a) => a.key === key))}
            className="flex items-center gap-1.5 flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        <div className="max-w-2xl mx-auto w-full space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <span
                className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] whitespace-pre-wrap ${
                  m.role === "user" ? "bg-cyan-700 text-white" : "bg-gray-800 text-gray-100"
                }`}
              >
                {m.text}
              </span>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <span className="px-4 py-2.5 rounded-2xl text-sm bg-gray-800 text-gray-400 italic">
                Campus AI type kar raha hai...
              </span>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* INPUT */}
      <div className="border-t border-gray-800 bg-[#0b0b0b] px-4 md:px-6 py-3">
        <div className="max-w-2xl mx-auto w-full flex gap-2">
          <input
            className="w-full bg-gray-800 text-sm p-3 rounded-xl outline-none text-white"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask Campus AI..."
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isTyping}
            className="bg-cyan-600 disabled:opacity-50 px-4 rounded-xl flex items-center justify-center"
          >
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
