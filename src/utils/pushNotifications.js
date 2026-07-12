import api from "./api";

// VAPID public key (base64url string) ko Uint8Array mein convert karta hai
// — pushManager.subscribe() ko yahi format chahiye hota hai
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Login ke baad (ya Dashboard mount hote hi) isse call karo.
// Permission maangega, browser ko push ke liye subscribe karega,
// aur subscription backend ko save karne ke liye bhej dega.
export const subscribeToPush = async () => {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Ye browser push notifications support nahi karta.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("User ne push permission nahi di.");
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    // Agar pehle se subscribe hai to wahi use karo, warna naya bana lo
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidRes = await api.get("/api/vapid-public-key");
      const vapidPublicKey = vapidRes.data;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // Backend ko subscription bhejo — token api.js interceptor khud attach kar dega
    await api.post("/api/subscribe", subscription);
    console.log("Push subscription save ho gayi!");
  } catch (err) {
    console.error("Push subscription fail ho gayi:", err);
  }
};
