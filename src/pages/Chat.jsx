import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import { Smile } from "lucide-react";
import api from "../utils/api";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
const GROUP_MESSAGE_LIFETIME_MS = 30000; // 30 seconds
const TYPING_STOP_DELAY_MS = 1500; // itni der chup rehne pe "typing" hat jayega

// === 🛑 NAYA: EMOJI LIST (koi external library nahi, curated list) ===
const EMOJI_LIST = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🤩", "🥳",
  "😢", "😭", "😡", "🤔", "😴", "🥺", "😅", "🙄", "😬", "🤯",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "✌️", "🤞", "👋",
  "❤️", "🔥", "💯", "🎉", "✅", "❌", "⭐", "💡", "📚", "🎯",
];

export const Chat = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "private" ? "private" : "group"); // "group" | "private"

  // NAYA — Dashboard se "Direct Message" button dabane par ?tab=private aata hai,
  // isse turant Direct Messages tab khul jaye (chahe Chat page already khula ho)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "private" || tab === "group") setActiveTab(tab);
  }, [searchParams]);

  // --- Group chat state ---
  const [groupMsg, setGroupMsg] = useState("");
  const [groupChat, setGroupChat] = useState([]);
  const groupTimers = useRef({}); // messageId -> timeout handle

  // --- Private chat state ---
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [privateMsg, setPrivateMsg] = useState("");
  const [privateChat, setPrivateChat] = useState([]);

  // --- 🛑 NAYA: Online users state ---
  const [onlineUsernames, setOnlineUsernames] = useState([]);

  // --- 🛑 NAYA: Typing indicator state ---
  const [groupTypingUsers, setGroupTypingUsers] = useState([]); // usernames jo abhi type kar rahe hain
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false); // private chat ke liye
  const groupTypingTimeoutRef = useRef(null); // apna typing-stop bhejne ka debounce timer
  const privateTypingTimeoutRef = useRef(null);
  const otherTypingTimersRef = useRef({}); // group: har typing user ka apna auto-clear timer

  const chatEndRef = useRef(null);

  // === 🛑 NAYA: EMOJI PICKER STATE ===
  const [showGroupEmoji, setShowGroupEmoji] = useState(false);
  const [showPrivateEmoji, setShowPrivateEmoji] = useState(false);
  const groupEmojiRef = useRef(null);
  const privateEmojiRef = useRef(null);

  // NAYA — bahar click karne pe emoji picker band ho jaye
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (groupEmojiRef.current && !groupEmojiRef.current.contains(e.target)) {
        setShowGroupEmoji(false);
      }
      if (privateEmojiRef.current && !privateEmojiRef.current.contains(e.target)) {
        setShowPrivateEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupChat, privateChat]);

  // === 🛑 NAYA: ONLINE USERS + REGISTER ===
  useEffect(() => {
    if (username) socket.emit("register-user", username);

    socket.on("online-users", (usernamesList) => {
      setOnlineUsernames(usernamesList);
    });

    return () => socket.off("online-users");
  }, [username]);

  const scheduleRemoval = (msgId) => {
    const timeout = setTimeout(() => {
      setGroupChat((prev) => prev.filter((m) => m._id !== msgId));
      delete groupTimers.current[msgId];
    }, GROUP_MESSAGE_LIFETIME_MS);
    groupTimers.current[msgId] = timeout;
  };

  // === GROUP CHAT SETUP ===
  useEffect(() => {
    const fetchGroupMessages = async () => {
      try {
        const res = await api.get("/api/messages/group");
        setGroupChat(res.data);
        res.data.forEach((msg) => {
          const age = Date.now() - new Date(msg.createdAt).getTime();
          const remaining = GROUP_MESSAGE_LIFETIME_MS - age;
          if (remaining <= 0) {
            setGroupChat((prev) => prev.filter((m) => m._id !== msg._id));
          } else {
            const timeout = setTimeout(() => {
              setGroupChat((prev) => prev.filter((m) => m._id !== msg._id));
              delete groupTimers.current[msg._id];
            }, remaining);
            groupTimers.current[msg._id] = timeout;
          }
        });
      } catch (err) { console.error(err); }
    };
    fetchGroupMessages();

    socket.on("receive-group-msg", (data) => {
      setGroupChat((prev) => [...prev, data]);
      scheduleRemoval(data._id);
      // NAYA — message aa gaya, to us user ka typing indicator turant hata do
      setGroupTypingUsers((prev) => prev.filter((u) => u !== data.username));
      clearTimeout(otherTypingTimersRef.current[data.username]);
    });

    // === 🛑 NAYA: GROUP TYPING INDICATOR LISTENERS ===
    socket.on("group-typing-start", (typingUsername) => {
      if (typingUsername === username) return; // apna khud ka typing skip
      setGroupTypingUsers((prev) => (prev.includes(typingUsername) ? prev : [...prev, typingUsername]));
      // Safety net — agar kisi wajah se "stop" event miss ho jaye, to 3 sec baad khud hata do
      clearTimeout(otherTypingTimersRef.current[typingUsername]);
      otherTypingTimersRef.current[typingUsername] = setTimeout(() => {
        setGroupTypingUsers((prev) => prev.filter((u) => u !== typingUsername));
      }, 3000);
    });
    socket.on("group-typing-stop", (typingUsername) => {
      setGroupTypingUsers((prev) => prev.filter((u) => u !== typingUsername));
      clearTimeout(otherTypingTimersRef.current[typingUsername]);
    });

    return () => {
      socket.off("receive-group-msg");
      socket.off("group-typing-start");
      socket.off("group-typing-stop");
      Object.values(groupTimers.current).forEach(clearTimeout);
      Object.values(otherTypingTimersRef.current).forEach(clearTimeout);
    };
  }, [username]);

  const sendGroupMessage = () => {
    if (!groupMsg.trim()) return;
    socket.emit("send-group-msg", { username, text: groupMsg });
    setGroupMsg("");
    // NAYA — message bhejte hi apna typing indicator band kar do
    clearTimeout(groupTypingTimeoutRef.current);
    socket.emit("group-typing-stop", username);
  };

  // === 🛑 NAYA: GROUP INPUT TYPING HANDLER ===
  const handleGroupInputChange = (e) => {
    setGroupMsg(e.target.value);
    socket.emit("group-typing-start", username);
    clearTimeout(groupTypingTimeoutRef.current);
    groupTypingTimeoutRef.current = setTimeout(() => {
      socket.emit("group-typing-stop", username);
    }, TYPING_STOP_DELAY_MS);
  };

  // === PRIVATE CHAT SETUP ===
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/api/users");
        setUsers(res.data);
      } catch (err) { console.error(err); }
    };
    fetchUsers();
  }, []);

  const openPrivateChat = async (otherUser) => {
    setSelectedUser(otherUser);
    setActiveTab("private");
    setIsOtherUserTyping(false);
    socket.emit("join-private-room", { myUsername: username, otherUsername: otherUser.username });
    try {
      const res = await api.get(`/api/messages/private/${otherUser.username}`);
      setPrivateChat(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    socket.on("receive-private-msg", (data) => {
      if (
        selectedUser &&
        ((data.from === username && data.to === selectedUser.username) ||
          (data.from === selectedUser.username && data.to === username))
      ) {
        setPrivateChat((prev) => [...prev, data]);
        setIsOtherUserTyping(false); // NAYA — message aa gaya to typing indicator hata do
      }
    });

    // === 🛑 NAYA: PRIVATE TYPING INDICATOR LISTENERS ===
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

  const sendPrivateMessage = () => {
    if (!privateMsg.trim() || !selectedUser) return;
    socket.emit("send-private-msg", { from: username, to: selectedUser.username, text: privateMsg });
    setPrivateMsg("");
    // NAYA — message bhejte hi apna typing indicator band kar do
    clearTimeout(privateTypingTimeoutRef.current);
    socket.emit("private-typing-stop", { from: username, to: selectedUser.username });
  };

  // === 🛑 NAYA: PRIVATE INPUT TYPING HANDLER ===
  const handlePrivateInputChange = (e) => {
    setPrivateMsg(e.target.value);
    if (!selectedUser) return;
    socket.emit("private-typing-start", { from: username, to: selectedUser.username });
    clearTimeout(privateTypingTimeoutRef.current);
    privateTypingTimeoutRef.current = setTimeout(() => {
      socket.emit("private-typing-stop", { from: username, to: selectedUser.username });
    }, TYPING_STOP_DELAY_MS);
  };

  const isUserOnline = (uname) => onlineUsernames.includes(uname);

  // === 🛑 NAYA: EMOJI PICKER POPUP (reusable) ===
  const EmojiPicker = ({ onSelect }) => (
    <div className="absolute bottom-14 right-0 z-20 bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 shadow-xl w-64 grid grid-cols-8 gap-1">
      {EMOJI_LIST.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="text-xl hover:bg-gray-800 rounded-lg p-1 transition"
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col">
      <button onClick={() => navigate("/dashboard")} className="text-cyan-400 mb-4 self-start">← Back</button>

      <div className="flex gap-2 mb-4 max-w-5xl mx-auto w-full">
        <button
          onClick={() => setActiveTab("group")}
          className={`px-6 py-2 rounded-xl font-bold transition ${activeTab === "group" ? "bg-cyan-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
        >
          🏫 Group Discussion
        </button>
        <button
          onClick={() => setActiveTab("private")}
          className={`px-6 py-2 rounded-xl font-bold transition ${activeTab === "private" ? "bg-cyan-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
        >
          💬 Direct Messages
        </button>

        {/* NAYA — kitne log abhi online hain, quick glance */}
        <div className="ml-auto flex items-center gap-2 px-4 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          {onlineUsernames.length} Online
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full flex-1 flex gap-4 min-h-0">

        {activeTab === "group" && (
          <>
            <div className="flex-1 flex flex-col">
              <p className="text-xs text-gray-500 mb-2">⏱️ Messages yahan 30 second baad automatically gayab ho jaate hain.</p>
              <div className="h-[55vh] bg-[#111111] p-4 rounded-2xl overflow-y-scroll border border-gray-800 flex-1">
                {groupChat.length === 0 && (
                  <p className="text-gray-600 text-center mt-10">Koi message nahi — sabse pehle likho!</p>
                )}
                {groupChat.map((c) => (
                  <p key={c._id} className="mb-2">
                    <strong className="text-cyan-400">{c.username}:</strong> {c.text}
                  </p>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* NAYA — GROUP TYPING INDICATOR */}
              <div className="h-5 mt-1 text-xs text-gray-500 italic px-1">
                {groupTypingUsers.length > 0 && (
                  groupTypingUsers.length === 1
                    ? `${groupTypingUsers[0]} type kar raha hai...`
                    : `${groupTypingUsers.join(", ")} type kar rahe hain...`
                )}
              </div>

              <div className="mt-1 flex gap-2 relative" ref={groupEmojiRef}>
                <input
                  className="w-full bg-gray-800 p-3 rounded-lg outline-none"
                  value={groupMsg}
                  onChange={handleGroupInputChange}
                  onKeyDown={(e) => e.key === "Enter" && sendGroupMessage()}
                  placeholder="Sabko message bhejo..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  onClick={() => setShowGroupEmoji((prev) => !prev)}
                  className="bg-gray-800 px-4 rounded-lg hover:bg-gray-700 transition"
                >
                  <Smile size={20} className="text-yellow-400" />
                </button>
                {showGroupEmoji && (
                  <EmojiPicker
                    onSelect={(emoji) => handleGroupInputChange({ target: { value: groupMsg + emoji } })}
                  />
                )}
                <button onClick={sendGroupMessage} className="bg-cyan-600 px-6 rounded-lg font-bold">Send</button>
              </div>
            </div>

            {/* NAYA — ONLINE USERS SIDEBAR (Discord-style) */}
            <div className="hidden md:block w-56 bg-[#111111] rounded-2xl border border-gray-800 p-3 overflow-y-auto h-[65vh]">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 px-2">
                Online — {onlineUsernames.length}
              </h3>
              {onlineUsernames.length === 0 && (
                <p className="text-gray-600 text-sm px-2">Abhi koi online nahi.</p>
              )}
              {onlineUsernames.map((u) => (
                <div key={u} className="flex items-center gap-2 p-2 rounded-xl mb-1">
                  <div className="relative">
                    <div className="w-8 h-8 bg-cyan-900 rounded-full flex items-center justify-center text-sm font-bold text-cyan-300">
                      {u[0]?.toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#111111]" />
                  </div>
                  <span className="text-sm truncate">{u}{u === username ? " (You)" : ""}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "private" && (
          <>
            <div className="w-64 bg-[#111111] rounded-2xl border border-gray-800 p-3 overflow-y-auto h-[65vh]">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 px-2">Students</h3>
              {users.length === 0 && <p className="text-gray-600 text-sm px-2">Koi aur user nahi mila.</p>}
              {users.map((u) => (
                <button
                  key={u._id}
                  onClick={() => openPrivateChat(u)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl mb-1 transition ${selectedUser?.username === u.username ? "bg-cyan-900/40 border border-cyan-800" : "hover:bg-gray-800"}`}
                >
                  <div className="relative">
                    <div className="w-8 h-8 bg-cyan-900 rounded-full flex items-center justify-center text-sm font-bold text-cyan-300">
                      {u.username[0].toUpperCase()}
                    </div>
                    {/* NAYA — online status dot */}
                    {isUserOnline(u.username) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#111111]" />
                    )}
                  </div>
                  <span className="text-sm truncate">{u.username}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 flex flex-col">
              {!selectedUser ? (
                <div className="h-[65vh] bg-[#111111] rounded-2xl border border-gray-800 flex items-center justify-center text-gray-600">
                  Baat karne ke liye koi student chuno
                </div>
              ) : (
                <>
                  <div className="bg-[#111111] px-4 py-3 rounded-t-2xl border border-gray-800 border-b-0">
                    <p className="font-bold text-cyan-400 flex items-center gap-2">
                      {selectedUser.username}
                      {isUserOnline(selectedUser.username) && (
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      )}
                    </p>
                    <p className="text-[10px] text-gray-500">⏱️ Messages 6 ghante baad automatically delete ho jaate hain</p>
                  </div>
                  <div className="h-[50vh] bg-[#111111] p-4 overflow-y-scroll border-l border-r border-gray-800 flex-1">
                    {privateChat.map((m) => (
                      <div key={m._id} className={`mb-2 flex ${m.from === username ? "justify-end" : "justify-start"}`}>
                        <span className={`px-3 py-2 rounded-xl text-sm max-w-xs ${m.from === username ? "bg-cyan-700" : "bg-gray-800"}`}>
                          {m.text}
                        </span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* NAYA — PRIVATE TYPING INDICATOR */}
                  <div className="h-5 px-4 bg-[#111111] border-l border-r border-gray-800 text-xs text-gray-500 italic flex items-center">
                    {isOtherUserTyping && `${selectedUser.username} type kar raha hai...`}
                  </div>

                  <div className="flex gap-2 p-3 bg-[#111111] rounded-b-2xl border border-gray-800 border-t-0 relative" ref={privateEmojiRef}>
                    <input
                      className="w-full bg-gray-800 p-3 rounded-lg outline-none"
                      value={privateMsg}
                      onChange={handlePrivateInputChange}
                      onKeyDown={(e) => e.key === "Enter" && sendPrivateMessage()}
                      placeholder={`${selectedUser.username} ko message bhejo...`}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPrivateEmoji((prev) => !prev)}
                      className="bg-gray-800 px-4 rounded-lg hover:bg-gray-700 transition"
                    >
                      <Smile size={20} className="text-yellow-400" />
                    </button>
                    {showPrivateEmoji && (
                      <EmojiPicker
                        onSelect={(emoji) => handlePrivateInputChange({ target: { value: privateMsg + emoji } })}
                      />
                    )}
                    <button onClick={sendPrivateMessage} className="bg-cyan-600 px-6 rounded-lg font-bold">Send</button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};