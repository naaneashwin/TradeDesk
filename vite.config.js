import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forward /api/* to Netlify functions dev server (netlify dev runs on 8888)
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
})