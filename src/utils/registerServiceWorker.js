// Registers the service worker (offline caching + PWA installability).
// Called only in production builds from main.jsx.

export const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("Service worker registered:", registration.scope);

        // Naya version mil jaaye to user ko batao (simple approach — auto update)
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Naya SW install ho gaya hai, purana abhi bhi control kar raha hai.
              // Turant activate karwa dete hain aur page reload kar dete hain.
              newWorker.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch((err) => {
        console.error("Service worker registration failed:", err);
      });

    // Jab naya SW control lele, page ko ek baar reload kar do taaki latest assets mil jayein
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
};
