import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

export const Signup = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    mobile: "",
    password: ""
  });

  // === 🛑 NAYA: 2-step flow — pehle "details" fill karo, phir email "otp" verify karo ===
  const [step, setStep] = useState("details"); // "details" | "otp"
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const navigate = useNavigate();

  // === 🛑 NAYA: Step 1 — form validate karke email pe OTP bhejo ===
  const handleSendOtp = async () => {
    const { username, email, password } = formData;
    if (!username.trim() || !email.trim() || !password.trim()) {
      alert("Username, email, aur password bharo pehle.");
      return;
    }

    setIsSending(true);
    try {
      await api.post("/api/otp/send-signup", { email });
      alert("OTP bhej diya gaya hai — apni email check karo!");
      setStep("otp");
    } catch (err) {
      const message = err.response?.data?.message || "OTP bhejne mein error aaya.";
      alert(message);
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  // === 🛑 NAYA: Step 2 — OTP ke saath account create karo ===
  const handleVerifyAndSignup = async () => {
    if (!otp.trim()) {
      alert("OTP daalo.");
      return;
    }

    setIsVerifying(true);
    try {
      await api.post("/api/signup", { ...formData, otp });
      alert("Account created successfully!");
      navigate("/login");
    } catch (err) {
      const message = err.response?.data?.message || "Signup Failed. Check your connection or data.";
      alert(message);
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="bg-[#111111] p-8 rounded-3xl border border-gray-800 w-full max-w-md shadow-2xl glass">
        <h2 className="text-3xl font-bold mb-8 text-cyan-400 text-center">Join Campus Connect</h2>

        {step === "details" && (
          <>
            <input
              className="w-full bg-gray-900 text-white p-4 mb-4 rounded-xl outline-none border border-gray-700 focus:border-cyan-500"
              placeholder="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />

            <input
              className="w-full bg-gray-900 text-white p-4 mb-4 rounded-xl outline-none border border-gray-700 focus:border-cyan-500"
              placeholder="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <p className="text-[11px] text-gray-600 -mt-3 mb-4 px-1">
              Real email use karo — temporary/disposable email allowed nahi hai.
            </p>

            <input
              className="w-full bg-gray-900 text-white p-4 mb-4 rounded-xl outline-none border border-gray-700 focus:border-cyan-500"
              placeholder="Mobile Number"
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            />

            <input
              className="w-full bg-gray-900 text-white p-4 mb-6 rounded-xl outline-none border border-gray-700 focus:border-cyan-500"
              type="password"
              placeholder="Create Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            <button
              onClick={handleSendOtp}
              disabled={isSending}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 py-4 rounded-xl font-bold text-white transition duration-200"
            >
              {isSending ? "Sending OTP..." : "Verify Email & Continue"}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <p className="text-sm text-gray-400 mb-1 text-center">
              OTP bhej diya gaya hai:
            </p>
            <p className="text-sm text-cyan-400 mb-6 text-center font-semibold">{formData.email}</p>

            <input
              className="w-full bg-gray-900 text-white p-4 mb-4 rounded-xl outline-none border border-gray-700 focus:border-cyan-500 text-center text-2xl tracking-[0.5em]"
              placeholder="------"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />

            <button
              onClick={handleVerifyAndSignup}
              disabled={isVerifying}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 py-4 rounded-xl font-bold text-white transition duration-200"
            >
              {isVerifying ? "Verifying..." : "Verify & Create Account"}
            </button>

            <div className="mt-4 flex justify-between text-xs">
              <button
                onClick={() => { setStep("details"); setOtp(""); }}
                className="text-gray-500 hover:underline"
              >
                ← Email badlo
              </button>
              <button
                onClick={handleSendOtp}
                disabled={isSending}
                className="text-cyan-400 hover:underline disabled:opacity-50"
              >
                {isSending ? "Resending..." : "Resend OTP"}
              </button>
            </div>
          </>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?
            <span
              className="text-cyan-400 cursor-pointer ml-1 hover:underline"
              onClick={() => navigate("/login")}
            >
              Login
            </span>
          </p>
        </div>
      </div>

      <style>{`
        .glass { background: rgba(17, 17, 17, 0.8); backdrop-filter: blur(10px); }
      `}</style>
    </div>
  );
};
