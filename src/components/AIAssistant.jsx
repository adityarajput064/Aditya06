import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, FileText, Atom, ScrollText, CalendarCheck2, PartyPopper, Sparkles } from "lucide-react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";

// === 🛑 NAYA: AI ASSISTANT (bottom-right floating widget) ===
// OpenAI se connected — /api/ai/chat route backend mein handle karta hai.
// Poore app mein globally dikhta hai (App.jsx se render hota hai), sirf
// login/signup pe khud-ba-khud hide ho jata hai (neeche check dekho).

const QUICK_ACTIONS = [
  { key: "notes", label: "Find Notes", icon: FileText, kind: "navigate", to: "/study-materials" },
  { key: "physics", label: "Explain Physics", icon: Atom, kind: "prompt", prompt: "Mujhe Physics ka koi ek important concept simple bhasha mein samjhao aur pucho ki mujhe kaunsa topic chahiye." },
  { key: "pyq", label: "GTU PYQ", icon: ScrollText, kind: "prompt", prompt: "GTU ke purane papers (PYQ) se exam prep kaise karu? Kuch tips do." },
  { key: "attendance", label: "Attendance", icon: CalendarCheck2, kind: "prompt", prompt: "Meri attendance kaise check karu is app mein?" },
  { key: "events", label: "Events", icon: PartyPopper, kind: "navigate", to: "/notice-board" },
];

export function AIAssistant() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey! Main Campus AI hoon 🤖 Padhai, notes, ya app se related kuch bhi pooch sakte ho." },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    // NAYA — agar user login/logout karta hai to widget khud update ho jaye
    const checkLogin = () => setIsLoggedIn(!!localStorage.getItem("token"));
    window.addEventListener("storage", checkLogin);
    checkLogin();
    return () => window.removeEventListener("storage", checkLogin);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  if (!isLoggedIn) return null; // Login/Signup page pe widget nahi dikhega

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
      setIsOpen(false);
      navigate(action.to);
    } else {
      sendMessage(action.prompt);
    }
  };

  return (
    <>
      {/* FLOATING BUTTON — chhota popup, har screen size pe dikhta hai.
          Left sidebar ka "Campus AI" is se alag hai — wo poora page (/campus-ai) kholta hai. */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="AI Assistant"
        className="fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-900/50 flex items-center justify-center transition"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {isOpen ? <X size={24} className="text-white" /> : <Bot size={26} className="text-white" />}
      </button>

      {/* CHAT PANEL */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-sm h-[70vh] max-h-[560px] bg-[#111111] border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* HEADER */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#0b0b0b] border-b border-gray-800">
            <Sparkles size={18} className="text-cyan-400" />
            <div>
              <p className="text-sm font-bold text-white">Campus AI</p>
              <p className="text-[10px] text-gray-500">Powered by Gemini</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="ml-auto text-gray-500 hover:text-gray-300">
              <X size={18} />
            </button>
          </div>

          {/* QUICK ACTIONS */}
          <div className="flex gap-2 overflow-x-auto px-3 py-2 border-b border-gray-800 scrollbar-hide">
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
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <span
                  className={`px-3 py-2 rounded-xl text-sm max-w-[85%] whitespace-pre-wrap ${
                    m.role === "user" ? "bg-cyan-700 text-white" : "bg-gray-800 text-gray-100"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <span className="px-3 py-2 rounded-xl text-sm bg-gray-800 text-gray-400 italic">
                  Campus AI type kar raha hai...
                </span>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* INPUT */}
          <div className="flex gap-2 p-3 border-t border-gray-800">
            <input
              className="w-full bg-gray-800 text-sm p-2.5 rounded-lg outline-none text-white"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="Ask Campus AI..."
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isTyping}
              className="bg-cyan-600 disabled:opacity-50 px-3 rounded-lg flex items-center justify-center"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
