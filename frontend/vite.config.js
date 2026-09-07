import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  define: {
    'process.env': {}
  },
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    hmr: {
      port: 5173,
      host: 'localhost'
    },
    watch: {
      usePolling: true
    }
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress certain warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return
        }
        warn(warning)
      }
    }
  }
})
