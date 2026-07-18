import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { translations, LANGUAGES } from "../i18n/translations";
import api from "../utils/api";

// === NAYA: App-wide language context ===
// Wrap App.jsx (ya main.jsx) mein <LanguageProvider>...</LanguageProvider> se,
// phir kisi bhi component mein: const { t, language, setLanguage } = useLanguage();

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem("appLanguage") || "en";
    } catch {
      return "en";
    }
  });

  // Translate helper — key na mile to English fallback, wo bhi na ho to key khud dikha do
  const t = useCallback(
    (key) => translations[language]?.[key] ?? translations.en?.[key] ?? key,
    [language]
  );

  const setLanguage = useCallback(async (code) => {
    setLanguageState(code);
    try {
      localStorage.setItem("appLanguage", code);
    } catch { /* localStorage blocked ho sakta hai, ignore */ }

    // NAYA — agar login hai, to backend pe bhi save karo taaki dusre device pe bhi yaad rahe
    try {
      const token = localStorage.getItem("token");
      const username = localStorage.getItem("username");
      if (token && username) {
        await api.put(`/api/users/${username}`, { language: code });
      }
    } catch (err) {
      console.error("Language backend save failed:", err); // UI block nahi karna, sirf log
    }
  }, []);

  // Login ke baad agar backend pe language already saved hai to usse sync karo
  useEffect(() => {
    const syncFromBackend = async () => {
      try {
        const username = localStorage.getItem("username");
        if (!username) return;
        const res = await api.get(`/api/users/${username}`);
        if (res.data?.language && res.data.language !== language) {
          setLanguageState(res.data.language);
          localStorage.setItem("appLanguage", res.data.language);
        }
      } catch { /* logged out ya error — silently skip */ }
    };
    syncFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
};