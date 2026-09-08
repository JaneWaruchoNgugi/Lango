import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose FIREBASE_-prefixed vars to the client (in addition to VITE_).
  // Firebase web config is public by design; this lets the Vercel keys drop the VITE_ prefix.
  envPrefix: ['VITE_', 'FIREBASE_'],
})
