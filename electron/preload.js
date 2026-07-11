// Abhi ke liye koi special Node API frontend ko expose karne ki zaroorat nahi hai,
// kyunki React app sirf http://localhost:5000/api (local backend) ko call karta hai
// jaise ek normal web app karta. Agar aage chalke Electron-specific features
// (jaise native file dialogs, notifications, auto-update) chahiye hon, unhe
// yahan contextBridge.exposeInMainWorld se safely expose karna.

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronApp', {
  isDesktop: true,
});
