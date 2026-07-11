import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

// Drop <InstallPrompt /> once near the top of MainLayout.
// Shows nothing until the browser signals the app is installable,
// and nothing at all if it's already installed or on iOS Safari
// (which doesn't fire beforeinstallprompt — see note below).
export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(localStorage.getItem("pwa-install-dismissed") === "1");

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (!visible || dismissed || !deferredPrompt) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div
      className="glass flex items-center gap-3 p-3 rounded-xl mb-4"
      style={{ borderColor: "var(--border-subtle)" }}
      role="region"
      aria-label="Install Campus Connect app"
    >
      <span
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
        style={{ background: "color-mix(in srgb, var(--accent-1) 16%, transparent)", color: "var(--accent-1)" }}
      >
        <Download size={17} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: "var(--text-main)" }}>Install Campus Connect</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add it to your home screen for the full app experience.</p>
      </div>
      <button
        onClick={handleInstall}
        className="text-xs font-semibold px-3 py-2 rounded-lg shrink-0"
        style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 p-1 rounded-lg"
        style={{ color: "var(--text-muted)" }}
      >
        <X size={16} strokeWidth={1.8} />
      </button>
    </div>
  );
};
