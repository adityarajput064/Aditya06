import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Lock, Globe, LogOut, Check,
  Users, X as XIcon, Save,
} from "lucide-react";
import api from "../utils/api";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useLanguage } from "../context/LanguageContext";

export const Settings = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const username = localStorage.getItem("username") || "";

  const [profile, setProfile] = useState(null);
  // NAYA: Form state mein 'name' aur 'username' add kiye gaye hain
  const [form, setForm] = useState({ name: "", username: "", bio: "", department: "", institute: "", enrollmentNumber: "", skills: "" });
  const [saved, setSaved] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get(`/api/users/${username}`);
      setProfile(res.data);
      setForm({
        name: res.data.name || "",
        username: res.data.username || "",
        bio: res.data.bio || "",
        department: res.data.department || "",
        institute: res.data.institute || "",
        enrollmentNumber: res.data.enrollmentNumber || "",
        skills: res.data.skills || "",
      });
    } catch (err) { console.error("Profile load failed:", err); }
    finally { setLoading(false); }
  }, [username]);

  const loadFollowRequests = useCallback(async () => {
    try {
      const res = await api.get("/api/follow-requests");
      setRequests(res.data);
    } catch (err) { console.error("Follow requests load failed:", err); }
  }, []);

  useEffect(() => {
    if (!username) { navigate("/login"); return; }
    loadProfile();
    loadFollowRequests();
  }, [username, loadProfile, loadFollowRequests, navigate]);

  // NAYA: Handle Save jisme Username change check hota hai
  const handleSaveAccount = async () => {
    try {
      const formattedUsername = form.username.toLowerCase().replace(/\s+/g, '');
      const res = await api.put(`/api/users/${username}`, { ...form, username: formattedUsername });
      
      // Agar username change hua hai toh localStorage aur API tokens ko naye username ke sath set karo
      if (formattedUsername !== username) {
        localStorage.setItem("username", formattedUsername);
        if (form.name) localStorage.setItem("name", form.name);
        if (res.data.newToken) localStorage.setItem("token", res.data.newToken);
        alert("Username successfully updated! Reloading app...");
        window.location.reload();
        return;
      }

      if (form.name) localStorage.setItem("name", form.name);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save failed:", err);
      alert(err.response?.data?.message || "Save nahi ho paya, dobara try karo.");
    }
  };

  const handleTogglePrivate = async () => {
    const newVal = !profile.isPrivate;
    setProfile((p) => ({ ...p, isPrivate: newVal }));
    try {
      await api.put(`/api/users/${username}`, { isPrivate: newVal });
    } catch (err) {
      console.error(err);
      setProfile((p) => ({ ...p, isPrivate: !newVal }));
    }
  };

  const handleTogglePrivacyField = async (field) => {
    const newPrivacy = { ...profile.privacy, [field]: !profile.privacy?.[field] };
    setProfile((p) => ({ ...p, privacy: newPrivacy }));
    try {
      await api.put(`/api/users/${username}`, { privacy: newPrivacy });
    } catch (err) { console.error(err); }
  };

  const handleAccept = async (requesterUsername) => {
    try {
      await api.put(`/api/follow-requests/${requesterUsername}/accept`);
      setRequests((prev) => prev.filter((r) => r.username !== requesterUsername));
      setProfile((p) => ({ ...p, followersCount: (p.followersCount || 0) + 1 }));
    } catch (err) { console.error(err); }
  };

  const handleReject = async (requesterUsername) => {
    try {
      await api.put(`/api/follow-requests/${requesterUsername}/reject`);
      setRequests((prev) => prev.filter((r) => r.username !== requesterUsername));
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loading || !profile) {
    return <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-main)" }}>{t("settings")}</h1>

      {/* === ACCOUNT SECTION === */}
      <div className="glow-card p-5">
        <h2 className="flex items-center gap-2 font-semibold mb-4" style={{ color: "var(--accent-1)" }}>
          <User size={18} /> {t("account")}
        </h2>

        <div className="space-y-3">
          {/* NAYA: Full Name aur Username input fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Aapka Poora Naam"
                className="w-full p-3 rounded-xl outline-none text-sm border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Username</label>
              <input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                placeholder="aadi064"
                className="w-full p-3 rounded-xl outline-none text-sm border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>{t("bio")}</label>
            <textarea
              rows="2"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className="w-full p-3 rounded-xl outline-none text-sm resize-none border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>{t("department")}</label>
              <input
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full p-3 rounded-xl outline-none text-sm border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>{t("institute")}</label>
              <input
                value={form.institute}
                onChange={(e) => setForm((f) => ({ ...f, institute: e.target.value }))}
                className="w-full p-3 rounded-xl outline-none text-sm border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>{t("enrollmentNumber")}</label>
            <input
              value={form.enrollmentNumber}
              onChange={(e) => setForm((f) => ({ ...f, enrollmentNumber: e.target.value }))}
              className="w-full p-3 rounded-xl outline-none text-sm border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>{t("skills")}</label>
            <input
              value={form.skills}
              onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
              className="w-full p-3 rounded-xl outline-none text-sm border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
            />
          </div>

          <button
            onClick={handleSaveAccount}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
          >
            {saved ? <Check size={15} /> : <Save size={15} />} {saved ? t("saved") : t("save")}
          </button>
        </div>
      </div>

      {/* === PRIVACY SECTION === */}
      <div className="glow-card p-5">
        <h2 className="flex items-center gap-2 font-semibold mb-4" style={{ color: "var(--accent-1)" }}>
          <Lock size={18} /> {t("privacy")}
        </h2>

        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-main)" }}>{t("privateAccount")}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t("privateAccountDesc")}</p>
          </div>
          <ToggleSwitch checked={!!profile.isPrivate} onChange={handleTogglePrivate} />
        </div>

        <div className="flex items-center justify-between gap-4 py-2 border-t mt-2 pt-3" style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-main)" }}>{t("showEmail")}</p>
          <ToggleSwitch checked={!!profile.privacy?.showEmail} onChange={() => handleTogglePrivacyField("showEmail")} />
        </div>
        <div className="flex items-center justify-between gap-4 py-2">
          <p className="text-sm font-medium" style={{ color: "var(--text-main)" }}>{t("showMobile")}</p>
          <ToggleSwitch checked={!!profile.privacy?.showMobile} onChange={() => handleTogglePrivacyField("showMobile")} />
        </div>
      </div>

      {/* === FOLLOW REQUESTS SECTION === */}
      <div className="glow-card p-5">
        <h2 className="flex items-center gap-2 font-semibold mb-4" style={{ color: "var(--accent-1)" }}>
          <Users size={18} /> {t("followRequests")} {requests.length > 0 && `(${requests.length})`}
        </h2>

        {requests.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("noFollowRequests")}</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.username} className="flex items-center justify-between gap-3 p-2 rounded-xl" style={{ background: "var(--surface-2)" }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  {r.profilePic ? (
                    <img src={r.profilePic} alt={r.username} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                      style={{ background: "color-mix(in srgb, var(--accent-1) 16%, transparent)", color: "var(--accent-1)" }}
                    >
                      {r.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-main)" }}>{r.username}</p>
                    {r.department && <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{r.department}</p>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleAccept(r.username)}
                    className="p-2 rounded-lg"
                    style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
                    aria-label="Accept"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => handleReject(r.username)}
                    className="p-2 rounded-lg"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
                    aria-label="Reject"
                  >
                    <XIcon size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === LANGUAGE SECTION === */}
      <div className="glow-card p-5">
        <h2 className="flex items-center gap-2 font-semibold mb-4" style={{ color: "var(--accent-1)" }}>
          <Globe size={18} /> {t("language")}
        </h2>
        <LanguageSwitcher />
      </div>

      {/* === LOGOUT === */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm"
        style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}
      >
        <LogOut size={16} /> {t("logout")}
      </button>
    </div>
  );
};

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className="relative w-11 h-6 rounded-full transition shrink-0"
    style={{ background: checked ? "var(--accent-1)" : "var(--surface-2)" }}
    aria-pressed={checked}
  >
    <span
      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
      style={{ left: checked ? "22px" : "2px" }}
    />
  </button>
);