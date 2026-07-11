import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // zaroori hai — Electron production build ko file:// se load karta hai, absolute '/' paths kaam nahi karenge
  server: {
    port: 5173,
  },
})
