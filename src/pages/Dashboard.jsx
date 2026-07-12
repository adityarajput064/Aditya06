import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../utils/api";
import { Navbar } from "../components/Navbar";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { PostSkeleton } from "../components/PostSkeleton";
import { StatCard } from "../components/StatCard";
import { TrendingSidebar } from "../components/TrendingSidebar";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import { StudentsModal } from "../components/StudentsModal";
import { subscribeToPush } from "../utils/pushNotifications";
import {
  Building2,
  MessageCircle,
  BookOpen,
  Pin,
  Plus,
  LogOut,
  GraduationCap,
  FileText,
  Megaphone,
  PartyPopper,
  Wrench,
  Gamepad2,
  BookMarked,
  Rocket,
  Briefcase,
  Mail,
  Phone,
  Layers,
  School,
  IdCard,
  Pencil,
  MapPinned,
  Info,
} from "lucide-react";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");

const NAV_ITEMS = [
  { key: "feed", label: "Campus Feed", icon: Building2, path: null },
  { key: "chat", label: "Discussion Room", icon: MessageCircle, path: "/chat" },
  { key: "materials", label: "Study Materials", icon: BookOpen, path: "/study-materials" },
  { key: "notices", label: "Notice Board", icon: Pin, path: "/notice-board" },
];

const CLUBS = [
  { name: "Mechanical Dept", slug: "mechanical-dept", icon: Wrench, accent: "var(--text-muted)" },
  { name: "Esports Club", slug: "esports-club", icon: Gamepad2, accent: "var(--accent-1)" },
  { name: "Lit Society", slug: "lit-society", icon: BookMarked, accent: "var(--accent-3)" },
  { name: "Tech Fest", slug: "tech-fest", icon: Rocket, accent: "var(--accent-2)" },
  { name: "Placement Cell", slug: "placement-cell", icon: Briefcase, accent: "var(--accent-1)" },
];

const EVENTS = [
  { title: "Mid-1 Examinations", meta: "Semester 1 Schedule Check", status: "SOON" },
  { title: "Workshop Practicals", meta: "Manual Submissions", status: "PENDING" },
  { title: "SSC CHSL Prep Group", meta: "Slot Selection Help Desk", status: "ACTIVE" },
];

const STATUS_STYLES = {
  SOON: { bg: "rgba(239,68,68,0.12)", fg: "#f87171" },
  PENDING: { bg: "rgba(245,158,11,0.12)", fg: "#fbbf24" },
  ACTIVE: { bg: "rgba(34,197,94,0.12)", fg: "#4ade80" },
};

export const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, notes: 0, notices: 0, events: 0 });
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);

  const [username, setUsername] = useState(localStorage.getItem("username") || "Guest");
  const [email, setEmail] = useState(localStorage.getItem("email") || "student@campus.edu");
  const [mobile, setMobile] = useState(localStorage.getItem("mobile") || "Not provided");
  const [profilePic, setProfilePic] = useState(localStorage.getItem("profilePic") || "");
  const [department, setDepartment] = useState(localStorage.getItem("department") || "");
  const [institute, setInstitute] = useState(localStorage.getItem("institute") || "");
  const [enrollmentNumber, setEnrollmentNumber] = useState(localStorage.getItem("enrollmentNumber") || "");

  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
    fetchStats();
    subscribeToPush(); // NAYA — login/dashboard load hote hi push ke liye subscribe karo
    socket.on("receive-notification", (data) => { alert(data.text); });
    return () => socket.off("receive-notification");
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get("/api/stats");
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchPosts = async () => {
    try {
      const res = await api.get("/api/posts");
      setPosts(res.data);
    } catch (err) { console.error(err); }
    finally { setPostsLoading(false); }
  };

  const handlePost = async (postData) => {
    try {
      await api.post("/api/posts", postData);
      setShowModal(false);
      fetchPosts();
      fetchStats();
    } catch (err) { alert("Server error! Post nahi hua."); }
  };

  const handleLike = async (id) => {
    try {
      const res = await api.put(`/api/posts/${id}/like`);
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch (err) { alert("Like nahi ho paya."); }
  };

  const handleSave = async (id) => {
    try {
      const res = await api.put(`/api/posts/${id}/save`);
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch (err) { alert("Save nahi ho paya."); }
  };

  const handleShare = async (id) => {
    try {
      const res = await api.put(`/api/posts/${id}/share`);
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
      const link = `${window.location.origin}/dashboard`;
      await navigator.clipboard.writeText(link);
      alert("Link copy ho gaya! Kahin bhi paste karke share kar do.");
    } catch (err) { alert("Share nahi ho paya."); }
  };

  const handleVote = async (id, optionIndex) => {
    try {
      const res = await api.put(`/api/posts/${id}/vote`, { optionIndex });
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch (err) { alert("Vote nahi ho paya."); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/api/posts/${id}`); fetchPosts(); fetchStats(); }
    catch (err) {
      alert(err.response?.data?.message || "Delete nahi ho paya.");
    }
  };

  const handleReply = async (id, text) => {
    if (!text.trim()) return;
    try {
      const res = await api.post(`/api/posts/${id}/reply`, { text });
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch (err) { alert("Reply nahi ho paya."); }
  };

  const handleProfilePic = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) { alert("Profile photo 5MB se badi hai!"); return; }
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          setProfilePic(reader.result);
          localStorage.setItem("profilePic", reader.result);
          // Ab backend/database mein bhi save karte hain, taaki naye posts pe
          // aur dusre users ko bhi sahi profile photo dikhe (sirf apne browser
          // ke localStorage mein hi na reh jaaye)
          await api.put(`/api/users/${username}`, { profilePic: reader.result });
        }
        catch (err) { alert("Photo save nahi ho payi, dobara try karo."); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfileDetails = async () => {
    try {
      await api.put(`/api/users/${username}`, { email, mobile, department, institute, enrollmentNumber });
      localStorage.setItem("email", email);
      localStorage.setItem("mobile", mobile);
      localStorage.setItem("department", department);
      localStorage.setItem("institute", institute);
      localStorage.setItem("enrollmentNumber", enrollmentNumber);
      setShowProfileModal(false);
      alert("Profile details saved!");
    } catch (err) {
      alert("Profile save nahi hua, server error.");
    }
  };

  return (
    <div className="min-h-screen relative font-sans" style={{ background: "var(--bg-base)", color: "var(--text-main)" }}>

      <AnimatedBackground />

      <Navbar username={username} profilePic={profilePic} />

      <div className="flex items-start">

        {/* SIDEBAR */}
        <div
          className="w-20 md:w-64 h-[calc(100vh-4rem)] sticky top-16 border-r py-8 px-4 flex flex-col justify-between z-10 glass"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div>
            <h1
              className="hidden md:block text-xl font-semibold mb-10 tracking-wide"
              style={{ color: "var(--accent-1)" }}
            >
              Campus Connect
            </h1>
            <h1
              className="md:hidden text-xl font-semibold mb-10 text-center"
              style={{ color: "var(--accent-1)" }}
            >
              CC
            </h1>

            <div className="space-y-1">
              {NAV_ITEMS.map(({ key, label, icon: Icon, path }) => (
                <button
                  key={key}
                  onClick={() => (path ? navigate(path) : window.scrollTo({ top: 0, behavior: "smooth" }))}
                  className="flex items-center gap-4 w-full p-3 rounded-xl transition"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="hidden md:block text-sm font-medium">{label}</span>
                </button>
              ))}

              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-4 w-full p-3 mt-3 rounded-xl border transition text-sm font-medium"
                style={{
                  background: "color-mix(in srgb, var(--accent-1) 12%, transparent)",
                  borderColor: "color-mix(in srgb, var(--accent-1) 35%, transparent)",
                  color: "var(--accent-1)",
                }}
              >
                <Plus size={19} strokeWidth={2} />
                <span className="hidden md:block">Share Update</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => navigate("/about")}
              className="flex items-center gap-4 w-full p-3 rounded-xl transition text-sm font-medium"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Info size={19} strokeWidth={1.8} />
              <span className="hidden md:block">About App</span>
            </button>

            <button
              onClick={() => { localStorage.clear(); navigate("/login"); }}
              className="flex items-center gap-4 w-full p-3 rounded-xl transition text-sm font-medium"
              style={{ color: "#f87171" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut size={19} strokeWidth={1.8} />
              <span className="hidden md:block">Logout</span>
            </button>
          </div>
        </div>

        {/* FEED */}
        <div className="flex-1 max-w-2xl mx-auto w-full py-8 px-4 z-10 overflow-y-auto">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <button onClick={() => setShowStudentsModal(true)} className="text-left">
              <StatCard icon={<GraduationCap size={18} />} label="Students" value={stats.students} />
            </button>
            <StatCard icon={<FileText size={18} />} label="Notes" value={stats.notes} />
            <StatCard icon={<Megaphone size={18} />} label="Notices" value={stats.notices} />
            <StatCard icon={<PartyPopper size={18} />} label="Events" value={stats.events} />
          </div>

          <h3
            className="text-xs font-semibold mb-4 px-1 tracking-widest uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            Active Campus Groups
          </h3>
          <div
            className="flex gap-4 overflow-x-auto pb-6 mb-6 border-b scrollbar-hide"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {CLUBS.map(({ name, slug, icon: Icon, accent }) => (
              <button
                key={name}
                onClick={() => navigate(`/club/${slug}`)}
                className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 group"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition group-hover:scale-105"
                  style={{
                    background: "color-mix(in srgb, " + accent + " 14%, var(--surface-1))",
                    border: "1px solid color-mix(in srgb, " + accent + " 30%, var(--border-subtle))",
                  }}
                >
                  <Icon size={22} strokeWidth={1.7} style={{ color: accent }} />
                </div>
                <span className="text-xs font-medium text-center" style={{ color: "var(--text-muted)" }}>
                  {name}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-8 mt-4">
            {postsLoading ? (
              <>
                <PostSkeleton />
                <PostSkeleton />
              </>
            ) : posts.length > 0 ? posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                currentUsername={username}
                onDelete={handleDelete}
                onLike={handleLike}
                onSave={handleSave}
                onShare={handleShare}
                onVote={handleVote}
                onReply={handleReply}
              />
            )) : (
              <div className="glow-card text-center mt-16 p-10">
                <Megaphone size={40} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} className="mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">No updates yet</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Be the first to share a campus notice, ask a doubt, or upload notes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div
          className="hidden lg:block w-[340px] h-[calc(100vh-4rem)] sticky top-16 py-8 px-6 z-10 glass border-l"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="glow-card p-5 mb-8">
            <div className="flex flex-col items-center">
              <img
                src={profilePic || `https://ui-avatars.com/api/?name=${username}&background=00E5FF&color=111`}
                className="w-20 h-20 rounded-full object-cover"
                style={{ border: "3px solid var(--accent-1)" }}
                alt="Profile"
              />
              <h3 className="font-semibold text-base mt-3">{username}</h3>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-4"
                style={{ color: "var(--accent-1)" }}
              >
                Student Profile
              </p>

              <div
                className="w-full space-y-2.5 text-sm rounded-xl p-3.5"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}
              >
                <ProfileRow icon={Mail} label="Email" value={email} />
                <ProfileRow icon={Phone} label="Mobile" value={mobile} />
                <ProfileRow icon={Layers} label="Department" value={department || "Not set"} />
                <ProfileRow icon={School} label="Institute" value={institute || "Not set"} />
                <ProfileRow icon={IdCard} label="Enrollment" value={enrollmentNumber || "Not set"} />
              </div>

              <button
                onClick={() => setShowProfileModal(true)}
                className="mt-4 w-full text-xs font-semibold py-2.5 rounded-lg transition"
                style={{ background: "var(--surface-2)", color: "var(--text-main)" }}
              >
                Edit details
              </button>
            </div>
          </div>

          <h3
            className="text-xs font-semibold mb-4 tracking-widest uppercase flex items-center gap-2"
            style={{ color: "var(--text-muted)" }}
          >
            <MapPinned size={14} /> Upcoming Events
          </h3>

          <div className="space-y-3">
            {EVENTS.map(({ title, meta, status }) => {
              const s = STATUS_STYLES[status];
              return (
                <button
                  key={title}
                  onClick={() => navigate("/notice-board")}
                  className="glow-card p-4 cursor-pointer w-full text-left block"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm truncate" style={{ color: "var(--accent-1)" }}>
                        {title}
                      </h4>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{meta}</p>
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0"
                      style={{ background: s.bg, color: s.fg }}
                    >
                      {status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => navigate("/about")}
            className="text-[11px] leading-relaxed mt-10 text-center w-full transition"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            Campus Connect V1.0 <br /> Built by ADITECH
          </button>

          <div className="mt-6">
            <TrendingSidebar posts={posts} />
          </div>
        </div>

      </div>

      {showModal && (
        <PostComposer onSubmit={handlePost} onClose={() => setShowModal(false)} />
      )}

      {showProfileModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-[70] backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div className="glass p-8 rounded-3xl w-full max-w-md" style={{ background: "var(--surface-1)" }}>
            <h2 className="text-xl font-semibold mb-6 text-center" style={{ color: "var(--accent-1)" }}>
              Student Profile
            </h2>

            <div className="flex justify-center mb-6">
              <div className="relative">
                <img
                  src={profilePic || `https://ui-avatars.com/api/?name=${username}`}
                  className="w-24 h-24 rounded-full object-cover"
                  style={{ border: "2px solid var(--accent-1)" }}
                  alt="Profile"
                />
                <label
                  className="absolute bottom-0 right-0 p-2 rounded-full cursor-pointer"
                  style={{ background: "var(--accent-1)", border: "2px solid var(--surface-1)" }}
                >
                  <input type="file" className="hidden" accept="image/*" onChange={handleProfilePic} />
                  <Pencil size={13} style={{ color: "var(--bg-base)" }} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <Field label="Full Name">
                <input
                  type="text"
                  disabled
                  className="w-full p-3 rounded-xl outline-none cursor-not-allowed text-sm"
                  style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}
                  value={username}
                />
              </Field>
              <Field label="College Email">
                <ThemedInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Contact Number">
                <ThemedInput type="text" value={mobile} onChange={(e) => setMobile(e.target.value)} />
              </Field>
              <Field label="Department">
                <ThemedInput type="text" placeholder="e.g. Mechanical Engineering" value={department} onChange={(e) => setDepartment(e.target.value)} />
              </Field>
              <Field label="Institute Name">
                <ThemedInput type="text" placeholder="e.g. XYZ Institute of Technology" value={institute} onChange={(e) => setInstitute(e.target.value)} />
              </Field>
              <Field label="Enrollment Number">
                <ThemedInput type="text" placeholder="e.g. 21XY1A0512" value={enrollmentNumber} onChange={(e) => setEnrollmentNumber(e.target.value)} />
              </Field>
            </div>

            <div className="flex gap-4 mt-8 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-full py-3 rounded-xl font-medium text-sm transition"
                style={{ background: "var(--surface-2)", color: "var(--text-main)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfileDetails}
                className="w-full py-3 rounded-xl font-medium text-sm transition"
                style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
              >
                Save details
              </button>
            </div>
          </div>
        </div>
      )}

      {showStudentsModal && (
        <StudentsModal onClose={() => setShowStudentsModal(false)} />
      )}
    </div>
  );
};

function ProfileRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
        <Icon size={13} /> {label}
      </span>
      <span className="truncate max-w-[150px] text-right" style={{ color: "var(--text-main)" }}>{value}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs block mb-1 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ThemedInput(props) {
  return (
    <input
      {...props}
      className="w-full p-3 rounded-xl outline-none text-sm transition"
      style={{ background: "var(--surface-2)", color: "var(--text-main)", border: "1px solid var(--border-subtle)" }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-1)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
    />
  );
}
