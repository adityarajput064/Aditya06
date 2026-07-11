import axios from "axios";

// Ek hi jagah base URL define — deploy ke time sirf ye ek line change karni hogi
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

// Har request ke saath automatically token attach ho jayega, agar hai to
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Agar token expire/invalid ho jaye, seedha login pe bhej do
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
