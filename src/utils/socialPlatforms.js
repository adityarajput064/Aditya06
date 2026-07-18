// === NAYA: SOCIAL PLATFORM AUTO-DETECTION ===
// User bas apna link paste kare, hum URL ke domain se khud pehchan lete hain
// ki kaunsa platform hai (Instagram, Facebook, GitHub, waghera) aur uska
// naam + icon-key wapas karte hain. Pehchan na ho paye to generic "Website" fallback.

export const SOCIAL_PLATFORMS = [
  { key: "instagram", match: ["instagram.com"], label: "Instagram" },
  { key: "facebook", match: ["facebook.com", "fb.com"], label: "Facebook" },
  { key: "twitter", match: ["twitter.com", "x.com"], label: "X (Twitter)" },
  { key: "linkedin", match: ["linkedin.com"], label: "LinkedIn" },
  { key: "github", match: ["github.com"], label: "GitHub" },
  { key: "youtube", match: ["youtube.com", "youtu.be"], label: "YouTube" },
  { key: "snapchat", match: ["snapchat.com"], label: "Snapchat" },
  { key: "tiktok", match: ["tiktok.com"], label: "TikTok" },
  { key: "whatsapp", match: ["wa.me", "whatsapp.com"], label: "WhatsApp" },
  { key: "telegram", match: ["t.me", "telegram.org"], label: "Telegram" },
  { key: "discord", match: ["discord.gg", "discord.com"], label: "Discord" },
  { key: "pinterest", match: ["pinterest.com"], label: "Pinterest" },
  { key: "reddit", match: ["reddit.com"], label: "Reddit" },
  { key: "spotify", match: ["spotify.com"], label: "Spotify" },
  { key: "twitch", match: ["twitch.tv"], label: "Twitch" },
];

// URL se platform detect karo. Match na mile to generic "website" object deta hai.
export function detectPlatform(rawUrl) {
  if (!rawUrl) return { key: "website", label: "Website" };
  try {
    const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    const hostname = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    const found = SOCIAL_PLATFORMS.find((p) => p.match.some((m) => hostname.includes(m)));
    return found ? { key: found.key, label: found.label } : { key: "website", label: "Website" };
  } catch {
    return { key: "website", label: "Website" };
  }
}

// Input mein "http(s)://" na ho to add kar do, taaki link hamesha valid rahe
export function normalizeUrl(rawUrl) {
  if (!rawUrl) return "";
  const trimmed = rawUrl.trim();
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}