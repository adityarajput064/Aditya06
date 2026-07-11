import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { Loader2 } from "lucide-react";

export const Login = () => {
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post("/api/login", {
        identifier: formData.identifier,
        password: formData.password
      });

      // Ab token + poori profile info save ho rahi hai, sirf username nahi
      const { token, username, email, mobile, profilePic, bio, department, institute, enrollmentNumber, skills } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("username", username);
      localStorage.setItem("email", email || "");
      localStorage.setItem("mobile", mobile || "");
      localStorage.setItem("profilePic", profilePic || "");
      localStorage.setItem("bio", bio || "");
      localStorage.setItem("department", department || "");
      localStorage.setItem("institute", institute || "");
      localStorage.setItem("enrollmentNumber", enrollmentNumber || "");
      localStorage.setItem("skills", skills || "");

      navigate("/dashboard");
    } catch (err) {
      const message = err.response?.data?.message || "Invalid Username/Email/Mobile or Password";
      alert("Login Failed: " + message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-base)" }}>
      <div className="glass p-8 rounded-3xl w-full max-w-md shadow-2xl" style={{ background: "var(--surface-1)" }}>
        <h2 className="text-2xl font-semibold mb-8 text-center" style={{ color: "var(--accent-1)" }}>Welcome Back</h2>

        <input
          className="w-full p-4 mb-4 rounded-xl outline-none text-sm transition"
          style={{ background: "var(--surface-2)", color: "var(--text-main)", border: "1px solid var(--border-subtle)" }}
          placeholder="Username, Email, or Mobile Number"
          value={formData.identifier}
          onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
          onKeyDown={handleKeyDown}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-1)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
        />

        <input
          className="w-full p-4 mb-6 rounded-xl outline-none text-sm transition"
          style={{ background: "var(--surface-2)", color: "var(--text-main)", border: "1px solid var(--border-subtle)" }}
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          onKeyDown={handleKeyDown}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-1)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-sm transition disabled:opacity-60"
          style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            New here?
            <span
              className="cursor-pointer ml-1 hover:underline font-medium"
              style={{ color: "var(--accent-1)" }}
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
