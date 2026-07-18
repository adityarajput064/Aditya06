import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, FileText, Atom, ScrollText, CalendarCheck2, PartyPopper, Sparkles } from "lucide-react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";

// === 🛑 NAYA: AI ASSISTANT (bottom-right floating widget, ab draggable + toggleable) ===
// OpenAI se connected — /api/ai/chat route backend mein handle karta hai.
// Poore app mein globally dikhta hai (App.jsx se render hota hai), sirf
// login/signup pe khud-ba-khud hide ho jata hai, aur Settings se on/off ho sakta hai.

const QUICK_ACTIONS = [
  { key: "notes", label: "Find Notes", icon: FileText, kind: "navigate", to: "/study-materials" },
  { key: "physics", label: "Explain Physics", icon: Atom, kind: "prompt", prompt: "Mujhe Physics ka koi ek important concept simple bhasha mein samjhao aur pucho ki mujhe kaunsa topic chahiye." },
  { key: "pyq", label: "GTU PYQ", icon: ScrollText, kind: "prompt", prompt: "GTU ke purane papers (PYQ) se exam prep kaise karu? Kuch tips do." },
  { key: "attendance", label: "Attendance", icon: CalendarCheck2, kind: "prompt", prompt: "Meri attendance kaise check karu is app mein?" },
  { key: "events", label: "Events", icon: PartyPopper, kind: "navigate", to: "/notice-board" },
];

// NAYA — draggable positioning helpers
const BUTTON_SIZE = 56; // w-14 h-14
const EDGE_MARGIN = 8;

function getDefaultPosition() {
  return {
    x: window.innerWidth - BUTTON_SIZE - 20,
    y: window.innerHeight - BUTTON_SIZE - 96, // purani jagah jaisi hi (bottom-24 right-5)
  };
}

function clampPosition(pos) {
  const maxX = Math.max(EDGE_MARGIN, window.innerWidth - BUTTON_SIZE - EDGE_MARGIN);
  const maxY = Math.max(EDGE_MARGIN, window.innerHeight - BUTTON_SIZE - EDGE_MARGIN);
  return {
    x: Math.min(Math.max(EDGE_MARGIN, pos.x), maxX),
    y: Math.min(Math.max(EDGE_MARGIN, pos.y), maxY),
  };
}

export function AIAssistant() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  // NAYA — Settings se on/off control
  const [enabled, setEnabled] = useState(localStorage.getItem("campusAIEnabled") !== "false");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey! Main Campus AI hoon 🤖 Padhai, notes, ya app se related kuch bhi pooch sakte ho." },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  // NAYA — draggable button ki position (localStorage mein save hoti hai)
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem("campusAIPosition");
      if (saved) return clampPosition(JSON.parse(saved));
    } catch {
      /* corrupt value ho to ignore */
    }
    return getDefaultPosition();
  });
  const dragRef = useRef({ dragging: false, moved: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  useEffect(() => {
    // NAYA — login/logout aur Campus AI on/off dono ka turant sync
    const checkLogin = () => setIsLoggedIn(!!localStorage.getItem("token"));
    const checkEnabled = () => setEnabled(localStorage.getItem("campusAIEnabled") !== "false");
    window.addEventListener("storage", checkLogin);
    window.addEventListener("storage", checkEnabled);
    window.addEventListener("campusai-toggle", checkEnabled); // Settings page (same tab) se aata hai
    checkLogin();
    checkEnabled();
    return () => {
      window.removeEventListener("storage", checkLogin);
      window.removeEventListener("storage", checkEnabled);
      window.removeEventListener("campusai-toggle", checkEnabled);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  // NAYA — screen rotate/resize hone par button viewport ke bahar na chala jaye
  useEffect(() => {
    const handleResize = () => setPosition((p) => clampPosition(p));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // === NAYA: DRAG HANDLERS (mouse + touch dono ke liye pointer events use kiye) ===
  const handlePointerDown = (e) => {
    dragRef.current = {
      dragging: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    if (!dragRef.current.moved) return;
    setPosition(clampPosition({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy }));
  };

  const handlePointerUp = () => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    if (dragRef.current.moved) {
      // NAYA — drag khatam, naye position ko yaad rakho
      setPosition((p) => {
        const clamped = clampPosition(p);
        localStorage.setItem("campusAIPosition", JSON.stringify(clamped));
        return clamped;
      });
    } else {
      // Bina hilaye tap kiya — normal open/close
      setIsOpen((prev) => !prev);
    }
  };

  if (!isLoggedIn || !enabled) return null; // Login/Signup pe ya Settings se off kiya ho to widget nahi dikhega

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

  // NAYA — chat panel ko button ke upar/paas hi khulwate hain, viewport ke andar clamp karke
  const panelWidth = Math.min(384, window.innerWidth * 0.92);
  const panelHeight = Math.min(560, window.innerHeight * 0.7);
  const panelLeft = Math.min(
    Math.max(8, position.x + BUTTON_SIZE - panelWidth),
    window.innerWidth - panelWidth - 8
  );
  const panelTop = Math.max(8, position.y - panelHeight - 12);

  return (
    <>
      {/* FLOATING BUTTON — ab draggable, finger/mouse dono se kahin bhi le ja sakte ho */}
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="AI Assistant"
        className="fixed z-50 w-14 h-14 rounded-full bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-900/50 flex items-center justify-center transition-colors touch-none"
        style={{ left: position.x, top: position.y }}
      >
        {isOpen ? <X size={24} className="text-white" /> : <Bot size={26} className="text-white" />}
      </button>

      {/* CHAT PANEL */}
      {isOpen && (
        <div
          className="fixed z-50 bg-[#111111] border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ left: panelLeft, top: panelTop, width: panelWidth, height: panelHeight }}
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