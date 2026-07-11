import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../utils/api";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
const GROUP_MESSAGE_LIFETIME_MS = 30000; // 30 seconds

export const Chat = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const [activeTab, setActiveTab] = useState("group"); // "group" | "private"

  // --- Group chat state ---
  const [groupMsg, setGroupMsg] = useState("");
  const [groupChat, setGroupChat] = useState([]);
  const groupTimers = useRef({}); // messageId -> timeout handle

  // --- Private chat state ---
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [privateMsg, setPrivateMsg] = useState("");
  const [privateChat, setPrivateChat] = useState([]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupChat, privateChat]);

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
    });

    return () => {
      socket.off("receive-group-msg");
      Object.values(groupTimers.current).forEach(clearTimeout);
    };
  }, []);

  const sendGroupMessage = () => {
    if (!groupMsg.trim()) return;
    socket.emit("send-group-msg", { username, text: groupMsg });
    setGroupMsg("");
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
      }
    });
    return () => socket.off("receive-private-msg");
  }, [selectedUser, username]);

  const sendPrivateMessage = () => {
    if (!privateMsg.trim() || !selectedUser) return;
    socket.emit("send-private-msg", { from: username, to: selectedUser.username, text: privateMsg });
    setPrivateMsg("");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col">
      <button onClick={() => navigate("/dashboard")} className="text-cyan-400 mb-4 self-start">← Back</button>

      <div className="flex gap-2 mb-4 max-w-4xl mx-auto w-full">
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
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex gap-4 min-h-0">

        {activeTab === "group" && (
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
            <div className="mt-4 flex gap-2">
              <input
                className="w-full bg-gray-800 p-3 rounded-lg outline-none"
                value={groupMsg}
                onChange={(e) => setGroupMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendGroupMessage()}
                placeholder="Sabko message bhejo..."
              />
              <button onClick={sendGroupMessage} className="bg-cyan-600 px-6 rounded-lg font-bold">Send</button>
            </div>
          </div>
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
                  <div className="w-8 h-8 bg-cyan-900 rounded-full flex items-center justify-center text-sm font-bold text-cyan-300">
                    {u.username[0].toUpperCase()}
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
                    <p className="font-bold text-cyan-400">{selectedUser.username}</p>
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
                  <div className="flex gap-2 p-3 bg-[#111111] rounded-b-2xl border border-gray-800 border-t-0">
                    <input
                      className="w-full bg-gray-800 p-3 rounded-lg outline-none"
                      value={privateMsg}
                      onChange={(e) => setPrivateMsg(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendPrivateMessage()}
                      placeholder={`${selectedUser.username} ko message bhejo...`}
                    />
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
