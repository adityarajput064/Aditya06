import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { ArrowLeft, Smile, Send as SendIcon } from "lucide-react";
import api from "../utils/api";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
const TYPING_STOP_DELAY_MS = 1500;

const EMOJI_LIST = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🤩", "🥳",
  "😢", "😭", "😡", "🤔", "😴", "🥺", "😅", "🙄", "😬", "🤯",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "✌️", "🤞", "👋",
  "❤️", "🔥", "💯", "🎉", "✅", "❌", "⭐", "💡", "📚", "🎯",
];

// === DIRECT MESSAGES — standalone page, sirf 1-on-1 chat ke liye ===
// Chat.jsx (Group Discussion + DM tabs) se alag isliye banaya hai:
// 1) Mobile pe tab-based layout squeeze ho raha tha aur poora content nahi dikh raha tha.
// 2) Message input "controlled" tha (React state se value set hoti thi) — Android
//    keyboards (Gboard predictive text) ke saath ye conflict karta hai kyunki har
//    keystroke pe React re-render hota hai jab keyboard abhi composition mein hota hai,
//    jisse letters/words scramble ho jaate the ("hello" -> "hlelo" jaisa kuch).
//    Fix: input ab "uncontrolled" hai (ref se value padhte hain, React state se nahi
//    control karte) — isse React beech mein re-render nahi karta aur keyboard ko
//    apna kaam karne deta hai bina interfere kiye.
export const DirectMessages = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [privateChat, setPrivateChat] = useState([]);
  const [onlineUsernames, setOnlineUsernames] = useState([]);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const inputRef = useRef(null); // NAYA — uncontrolled input, scrambling fix
  const typingTimeoutRef = useRef(null);
  const chatEndRef = useRef(null);
  const emojiRef = useRef(null);

  // Bahar click karne pe emoji picker band ho jaye
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [privateChat]);

  // Online users + register
  useEffect(() => {
    if (username) socket.emit("register-user", username);
    socket.on("online-users", (list) => setOnlineUsernames(list));
    return () => socket.off("online-users");
  }, [username]);

  // Students list fetch
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/api/users");
        setUsers(res.data);
      } catch (err) { console.error(err); }
    };
    fetchUsers();
  }, []);

  const openChat = async (otherUser) => {
    setSelectedUser(otherUser);
    setIsOtherUserTyping(false);
    setShowEmoji(false);
    if (inputRef.current) inputRef.current.value = "";
    socket.emit("join-private-room", { myUsername: username, otherUsername: otherUser.username });
    try {
      const res = await api.get(`/api/messages/private/${otherUser.username}`);
      setPrivateChat(res.data);
    } catch (err) { console.error(err); }
  };

  const backToInbox = () => {
    setSelectedUser(null);
    setPrivateChat([]);
    setIsOtherUserTyping(false);
  };

  useEffect(() => {
    socket.on("receive-private-msg", (data) => {
      if (
        selectedUser &&
        ((data.from === username && data.to === selectedUser.username) ||
          (data.from === selectedUser.username && data.to === username))
      ) {
        setPrivateChat((prev) => [...prev, data]);
        setIsOtherUserTyping(false);
      }
    });

    socket.on("private-typing-start", ({ from }) => {
      if (selectedUser && from === selectedUser.username) setIsOtherUserTyping(true);
    });
    socket.on("private-typing-stop", ({ from }) => {
      if (selectedUser && from === selectedUser.username) setIsOtherUserTyping(false);
    });

    return () => {
      socket.off("receive-private-msg");
      socket.off("private-typing-start");
      socket.off("private-typing-stop");
    };
  }, [selectedUser, username]);

  const sendMessage = () => {
    const text = inputRef.current?.value.trim();
    if (!text || !selectedUser) return;
    socket.emit("send-private-msg", { from: username, to: selectedUser.username, text });
    inputRef.current.value = "";
    clearTimeout(typingTimeoutRef.current);
    socket.emit("private-typing-stop", { from: username, to: selectedUser.username });
  };

  // NAYA — uncontrolled input pe typing indicator: onInput se seedha e.target.value
  // padhte hain, koi React state update nahi karte (yehi scrambling se bachata hai)
  const handleInput = () => {
    if (!selectedUser) return;
    socket.emit("private-typing-start", { from: username, to: selectedUser.username });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("private-typing-stop", { from: username, to: selectedUser.username });
    }, TYPING_STOP_DELAY_MS);
  };

  const insertEmoji = (emoji) => {
    if (!inputRef.current) return;
    inputRef.current.value += emoji;
    inputRef.current.focus();
    handleInput();
  };

  const isUserOnline = (uname) => onlineUsernames.includes(uname);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-[#0b0b0b] shrink-0">
        <button
          onClick={() => (selectedUser ? backToInbox() : navigate("/dashboard"))}
          className="text-cyan-400 flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft size={18} />
          {selectedUser ? "Students" : "Back"}
        </button>

        {selectedUser && (
          <div className="flex items-center gap-2 ml-1">
            <div className="w-8 h-8 bg-cyan-900 rounded-full flex items-center justify-center text-sm font-bold text-cyan-300">
              {selectedUser.username[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-white text-sm flex items-center gap-1.5">
                {selectedUser.username}
                {isUserOnline(selectedUser.username) && (
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                )}
              </p>
              <p className="text-[10px] text-gray-500">
                {isOtherUserTyping ? "typing..." : "Messages 6h baad delete ho jaate hain"}
              </p>
            </div>
          </div>
        )}

        {!selectedUser && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {onlineUsernames.length} Online
          </span>
        )}
      </div>

      {/* INBOX — list of students */}
      {!selectedUser && (
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {users.length === 0 ? (
            <p className="text-gray-600 text-sm text-center mt-10">Koi aur student nahi mila.</p>
          ) : (
            <div className="space-y-1.5">
              {users.map((u) => (
                <button
                  key={u._id}
                  onClick={() => openChat(u)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#111111] hover:bg-gray-800 transition text-left"
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 bg-cyan-900 rounded-full flex items-center justify-center text-base font-bold text-cyan-300">
                      {u.username[0].toUpperCase()}
                    </div>
                    {isUserOnline(u.username) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#111111]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{u.username}</p>
                    <p className="text-xs text-gray-500 truncate">{u.department || "Message bhejo"}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* THREAD — open conversation */}
      {selectedUser && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {privateChat.map((m) => (
              <div key={m._id} className={`mb-2.5 flex ${m.from === username ? "justify-end" : "justify-start"}`}>
                <span className={`px-3.5 py-2.5 rounded-2xl text-sm max-w-[75%] break-words ${m.from === username ? "bg-cyan-700" : "bg-gray-800"}`}>
                  {m.text}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* INPUT BAR — fixed at bottom, uncontrolled input */}
          <div
            className="flex gap-2 p-3 border-t border-gray-800 bg-[#0b0b0b] relative shrink-0"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
            ref={emojiRef}
          >
            <input
              ref={inputRef}
              type="text"
              defaultValue=""
              onInput={handleInput}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`${selectedUser.username} ko message bhejo...`}
              className="w-full bg-gray-800 p-3 rounded-xl outline-none text-sm text-white min-w-0"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <button
              type="button"
              onClick={() => setShowEmoji((prev) => !prev)}
              className="bg-gray-800 px-3.5 rounded-xl hover:bg-gray-700 transition shrink-0"
            >
              <Smile size={20} className="text-yellow-400" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-16 right-3 z-20 bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 shadow-xl w-64 grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="text-xl hover:bg-gray-800 rounded-lg p-1 transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={sendMessage}
              className="bg-cyan-600 hover:bg-cyan-500 px-4 rounded-xl font-bold flex items-center justify-center shrink-0 transition"
              aria-label="Send"
            >
              <SendIcon size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};