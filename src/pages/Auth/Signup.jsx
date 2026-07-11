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
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      await api.post("/api/signup", formData);
      alert("Account created successfully!");
      navigate("/login");
    } catch (err) {
      const message = err.response?.data?.message || "Signup Failed. Check your connection or data.";
      alert(message);
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="bg-[#111111] p-8 rounded-3xl border border-gray-800 w-full max-w-md shadow-2xl glass">
        <h2 className="text-3xl font-bold mb-8 text-cyan-400 text-center">Join Campus Connect</h2>

        <input
          className="w-full bg-gray-900 text-white p-4 mb-4 rounded-xl outline-none border border-gray-700 focus:border-cyan-500"
          placeholder="Username"
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        />

        <input
          className="w-full bg-gray-900 text-white p-4 mb-4 rounded-xl outline-none border border-gray-700 focus:border-cyan-500"
          placeholder="Email Address"
          type="email"
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <input
          className="w-full bg-gray-900 text-white p-4 mb-4 rounded-xl outline-none border border-gray-700 focus:border-cyan-500"
          placeholder="Mobile Number"
          type="tel"
          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
        />

        <input
          className="w-full bg-gray-900 text-white p-4 mb-6 rounded-xl outline-none border border-gray-700 focus:border-cyan-500"
          type="password"
          placeholder="Create Password"
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />

        <button
          onClick={handleSignup}
          className="w-full bg-cyan-600 hover:bg-cyan-500 py-4 rounded-xl font-bold text-white transition duration-200"
        >
          Sign Up
        </button>

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
