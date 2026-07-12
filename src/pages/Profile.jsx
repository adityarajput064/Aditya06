import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { Navbar } from "../components/Navbar";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { GlowCard } from "../components/GlowCard";
import {
  ArrowLeft,
  Pencil,
  Save,
  X,
  Loader2,
  Mail,
  Phone,
  Building2,
  Hash,
  Sparkles,
} from "lucide-react";

export const Profile = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Guest";

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [form, setForm] = useState({
    bio: "",
    department: "",
    institute: "",
    enrollmentNumber: "",
    skills: "",
    profilePic: "",
  });

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/users/${username}`);
      setProfile(res.data);
      setForm({
        bio: res.data.bio || "",
        department: res.data.department || "",
        institute: res.data.institute || "",
        enrollmentNumber: res.data.enrollmentNumber || "",
        skills: res.data.skills || "",
        profilePic: res.data.profilePic || "",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5000000) {
      alert("Image 5MB se badi hai!");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, profilePic: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    setForm({
      bio: profile.bio || "",
      department: profile.department || "",
      institute: profile.institute || "",
      enrollmentNumber: profile.enrollmentNumber || "",
      skills: profile.skills || "",
      profilePic: profile.profilePic || "",
    });
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/api/users/${username}`, form);
      setProfile(res.data);

      // Keep localStorage in sync since Navbar/other pages read from it directly
      localStorage.setItem("bio", res.data.bio || "");
      localStorage.setItem("department", res.data.department || "");
      localStorage.setItem("institute", res.data.institute || "");
      localStorage.setItem("enrollmentNumber", res.data.enrollmentNumber || "");
      localStorage.setItem("skills", res.data.skills || "");
      localStorage.setItem("profilePic", res.data.profilePic || "");

      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || "Profile update nahi ho paya.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent-1)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative font-sans" style={{ background: "var(--bg-base)", color: "var(--text-main)" }}>
      <AnimatedBackground />
      <Navbar username={username} profilePic={profile?.profilePic} />

      <div className="max-w-2xl mx-auto w-full py-8 px-4 z-10 relative">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm font-medium mb-6"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} /> Back to feed
        </button>

        <GlowCard className="p-6 mb-6">
          {/* === 🛑 FIX: chhoti/mobile screen pe ye row overflow ho ke bahar nikal raha
              tha (Edit/Cancel/Save buttons avatar+email ke saath side-by-side fit
              nahi ho paate the). Ab "sm" se neeche stack ho jata hai — upar
              avatar+naam, neeche buttons apni poori width lete hain. */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={
                    (editing ? form.profilePic : profile?.profilePic) ||
                    `https://ui-avatars.com/api/?name=${username}&background=00E5FF&color=000`
                  }
                  alt="avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-2"
                  style={{ borderColor: "var(--accent-1)" }}
                />
                {editing && (
                  <label
                    className="absolute -bottom-2 -right-2 cursor-pointer w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
                  >
                    <Pencil size={14} />
                    <input type="file" accept="image/*" onChange={handlePicChange} className="hidden" />
                  </label>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold truncate">{profile?.username || username}</h1>
                <p className="text-xs flex items-center gap-1.5 mt-1 truncate" style={{ color: "var(--text-muted)" }}>
                  <Mail size={12} className="shrink-0" /> <span className="truncate">{profile?.email}</span>
                </p>
                {profile?.mobile && (
                  <p className="text-xs flex items-center gap-1.5 mt-1" style={{ color: "var(--text-muted)" }}>
                    <Phone size={12} className="shrink-0" /> {profile.mobile}
                  </p>
                )}
              </div>
            </div>

            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg shrink-0 self-start"
                style={{ background: "var(--surface-2)", color: "var(--text-main)" }}
              >
                <Pencil size={14} /> Edit
              </button>
            ) : (
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg"
                  style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
                  style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="mb-5">
            <label className="text-xs block mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Bio
            </label>
            {editing ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                placeholder="Apne baare mein kuch likho..."
                className="w-full p-3 rounded-xl outline-none text-sm resize-none"
                style={{ background: "var(--surface-2)", color: "var(--text-main)", border: "1px solid var(--border-subtle)" }}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-main)" }}>
                {profile?.bio || "No bio yet."}
              </p>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProfileField
              icon={Building2}
              label="Department"
              editing={editing}
              value={editing ? form.department : profile?.department}
              onChange={(v) => setForm({ ...form, department: v })}
              placeholder="e.g. Mechanical"
            />
            <ProfileField
              icon={Building2}
              label="Institute"
              editing={editing}
              value={editing ? form.institute : profile?.institute}
              onChange={(v) => setForm({ ...form, institute: v })}
              placeholder="e.g. Govt. Polytechnic"
            />
            <ProfileField
              icon={Hash}
              label="Enrollment number"
              editing={editing}
              value={editing ? form.enrollmentNumber : profile?.enrollmentNumber}
              onChange={(v) => setForm({ ...form, enrollmentNumber: v })}
              placeholder="e.g. 2023CS045"
            />
            <ProfileField
              icon={Sparkles}
              label="Skills"
              editing={editing}
              value={editing ? form.skills : profile?.skills}
              onChange={(v) => setForm({ ...form, skills: v })}
              placeholder="e.g. React, AutoCAD, Public speaking"
            />
          </div>
        </GlowCard>
      </div>
    </div>
  );
};

const ProfileField = ({ icon: Icon, label, editing, value, onChange, placeholder }) => (
  <div>
    <label className="text-xs flex items-center gap-1.5 mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
      <Icon size={12} /> {label}
    </label>
    {editing ? (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2.5 rounded-xl outline-none text-sm"
        style={{ background: "var(--surface-2)", color: "var(--text-main)", border: "1px solid var(--border-subtle)" }}
      />
    ) : (
      <p className="text-sm" style={{ color: value ? "var(--text-main)" : "var(--text-muted)" }}>
        {value || "Not set"}
      </p>
    )}
  </div>
);
