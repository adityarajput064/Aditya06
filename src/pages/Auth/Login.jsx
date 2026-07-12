import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { Loader2, ArrowLeft } from "lucide-react";

export const Login = () => {
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // === 🛑 NAYA: FORGOT PASSWORD FLOW ===
  // step: "login" (default) -> "email" (email daalo, OTP bhejo) -> "reset" (OTP + naya password)
  const [step, setStep] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

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

  // Step 1 — email daal ke OTP mangwao
  const handleSendResetOtp = async () => {
    if (resetLoading) return;
    if (!resetEmail.trim()) {
      alert("Pehle apni email daalo");
      return;
    }
    setResetLoading(true);
    try {
      const res = await api.post("/api/otp/send-reset", { email: resetEmail.trim() });
      alert(res.data.message || "OTP bhej diya gaya hai");
      setStep("reset");
    } catch (err) {
      alert(err.response?.data?.message || "OTP bhejne mein error aaya");
      console.error(err);
    } finally {
      setResetLoading(false);
    }
  };

  // Step 2 — OTP + naya password bhej ke reset karo
  const handleResetPassword = async () => {
    if (resetLoading) return;
    if (!resetOtp.trim() || !newPassword || !confirmPassword) {
      alert("OTP aur naya password (dono baar) daalo");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Dono password match nahi kar rahe");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password kam se kam 6 characters ka hona chahiye");
      return;
    }
    setResetLoading(true);
    try {
      const res = await api.post("/api/reset-password", {
        email: resetEmail.trim(),
        otp: resetOtp.trim(),
        newPassword,
      });
      alert(res.data.message || "Password reset ho gaya");
      // Sab reset karke wapas login form pe le jao
      setStep("login");
      setResetEmail("");
      setResetOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setFormData((f) => ({ ...f, identifier: resetEmail.trim() }));
    } catch (err) {
      alert(err.response?.data?.message || "Password reset nahi ho paya");
      console.error(err);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResetLoading(true);
    try {
      const res = await api.post("/api/otp/send-reset", { email: resetEmail.trim() });
      alert(res.data.message || "OTP dobara bhej diya gaya hai");
    } catch (err) {
      alert(err.response?.data?.message || "OTP bhejne mein error aaya");
    } finally {
      setResetLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--surface-2)",
    color: "var(--text-main)",
    border: "1px solid var(--border-subtle)",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-base)" }}>
      <div className="glass p-8 rounded-3xl w-full max-w-md shadow-2xl" style={{ background: "var(--surface-1)" }}>

        {step === "login" && (
          <>
            <h2 className="text-2xl font-semibold mb-8 text-center" style={{ color: "var(--accent-1)" }}>Welcome Back</h2>

            <input
              className="w-full p-4 mb-4 rounded-xl outline-none text-sm transition"
              style={inputStyle}
              placeholder="Username, Email, or Mobile Number"
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              onKeyDown={handleKeyDown}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-1)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            />

            <input
              className="w-full p-4 mb-2 rounded-xl outline-none text-sm transition"
              style={inputStyle}
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              onKeyDown={handleKeyDown}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-1)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            />

            <div className="text-right mb-6">
              <span
                className="text-xs cursor-pointer hover:underline"
                style={{ color: "var(--text-muted)" }}
                onClick={() => {
                  setResetEmail(formData.identifier.includes("@") ? formData.identifier : "");
                  setStep("email");
                }}
              >
                Forgot password?
              </span>
            </div>

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
          </>
        )}

        {step === "email" && (
          <>
            <button
              onClick={() => setStep("login")}
              className="flex items-center gap-1.5 text-xs mb-6"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft size={14} /> Back to login
            </button>

            <h2 className="text-2xl font-semibold mb-2 text-center" style={{ color: "var(--accent-1)" }}>Reset Password</h2>
            <p className="text-xs text-center mb-6" style={{ color: "var(--text-muted)" }}>
              Apni registered email daalo, hum OTP bhejenge.
            </p>

            <input
              className="w-full p-4 mb-6 rounded-xl outline-none text-sm transition"
              style={inputStyle}
              type="email"
              placeholder="Registered Email Address"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendResetOtp()}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-1)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            />

            <button
              onClick={handleSendResetOtp}
              disabled={resetLoading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-sm transition disabled:opacity-60"
              style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
            >
              {resetLoading && <Loader2 size={16} className="animate-spin" />}
              {resetLoading ? "Sending OTP..." : "Send OTP"}
            </button>
          </>
        )}

        {step === "reset" && (
          <>
            <button
              onClick={() => setStep("email")}
              className="flex items-center gap-1.5 text-xs mb-6"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft size={14} /> Email badlo
            </button>

            <h2 className="text-2xl font-semibold mb-2 text-center" style={{ color: "var(--accent-1)" }}>Enter OTP</h2>
            <p className="text-xs text-center mb-6" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "var(--text-main)" }}>{resetEmail}</span> pe OTP bheja gaya hai.
            </p>

            <input
              className="w-full p-4 mb-4 rounded-xl outline-none text-sm transition tracking-widest text-center"
              style={inputStyle}
              placeholder="6-digit OTP"
              maxLength={6}
              value={resetOtp}
              onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-1)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            />

            <input
              className="w-full p-4 mb-4 rounded-xl outline-none text-sm transition"
              style={inputStyle}
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-1)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            />

            <input
              className="w-full p-4 mb-6 rounded-xl outline-none text-sm transition"
              style={inputStyle}
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-1)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            />

            <button
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-sm transition disabled:opacity-60"
              style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
            >
              {resetLoading && <Loader2 size={16} className="animate-spin" />}
              {resetLoading ? "Resetting..." : "Reset Password"}
            </button>

            <div className="mt-4 text-center">
              <span
                className="text-xs cursor-pointer hover:underline"
                style={{ color: "var(--text-muted)" }}
                onClick={handleResendOtp}
              >
                Resend OTP
              </span>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
