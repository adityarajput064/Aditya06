import {
  FaInstagram,
  FaFacebook,
  FaXTwitter,
  FaLinkedin,
  FaGithub,
  FaYoutube,
  FaSnapchat,
  FaTiktok,
  FaWhatsapp,
  FaTelegram,
  FaDiscord,
  FaPinterest,
  FaRedditAlien,
  FaSpotify,
  FaTwitch,
} from "react-icons/fa6";
import { Globe } from "lucide-react";

// NAYA — platform key ko uske brand icon se map karta hai.
// Pehchan na ho (ya generic website ho) to Globe icon fallback hota hai.
const ICON_MAP = {
  instagram: FaInstagram,
  facebook: FaFacebook,
  twitter: FaXTwitter,
  linkedin: FaLinkedin,
  github: FaGithub,
  youtube: FaYoutube,
  snapchat: FaSnapchat,
  tiktok: FaTiktok,
  whatsapp: FaWhatsapp,
  telegram: FaTelegram,
  discord: FaDiscord,
  pinterest: FaPinterest,
  reddit: FaRedditAlien,
  spotify: FaSpotify,
  twitch: FaTwitch,
};

// Brand-accurate colors — icon ko uske platform jaisa dikhne ke liye
const COLOR_MAP = {
  instagram: "#E4405F",
  facebook: "#1877F2",
  twitter: "#000000",
  linkedin: "#0A66C2",
  github: "#181717",
  youtube: "#FF0000",
  snapchat: "#FFFC00",
  tiktok: "#000000",
  whatsapp: "#25D366",
  telegram: "#26A5E4",
  discord: "#5865F2",
  pinterest: "#BD081C",
  reddit: "#FF4500",
  spotify: "#1DB954",
  twitch: "#9146FF",
};

export const SocialIcon = ({ platform, size = 18 }) => {
  const Icon = ICON_MAP[platform] || Globe;
  const color = COLOR_MAP[platform] || "var(--accent-1)";
  return <Icon size={size} color={color} />;
};