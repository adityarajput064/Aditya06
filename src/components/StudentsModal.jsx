import { useState, useEffect } from "react";
import { X, UserPlus, UserCheck } from "lucide-react";
import api from "../utils/api";

export const StudentsModal = ({ onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users");
      setUsers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleFollow = async (username) => {
    try {
      const res = await api.put(`/api/users/${username}/follow`);
      setUsers((prev) =>
        prev.map((u) =>
          u.username === username
            ? { ...u, isFollowing: res.data.following, followersCount: res.data.followersCount }
            : u
        )
      );
    } catch (err) { alert("Follow/unfollow nahi ho paya."); }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[70] backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div className="glass p-6 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col" style={{ background: "var(--surface-1)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: "var(--accent-1)" }}>
            Students
          </h2>
          <button onClick={onClose}>
            <X size={20} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {loading ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Koi aur student nahi mila.</p>
          ) : (
            users.map((u) => (
              <div
                key={u.username}
                className="flex items-center justify-between gap-3 p-3 rounded-xl"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={u.profilePic || `https://ui-avatars.com/api/?name=${u.username}&background=00E5FF&color=111`}
                    className="w-11 h-11 rounded-full object-cover shrink-0"
                    alt={u.username}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.username}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {u.department || "Department not set"} · {u.followersCount} followers
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleFollow(u.username)}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition"
                  style={
                    u.isFollowing
                      ? { background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }
                      : { background: "var(--accent-1)", color: "var(--bg-base)" }
                  }
                >
                  {u.isFollowing ? (
                    <>
                      <UserCheck size={13} /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} /> Follow
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
