import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 1. 把警告阈值调高到 1000kb (默认是 500kb)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 2. 手动拆包：把第三方库单独打包成 vendor.js
        manualChunks: {
          vendor: [
            'react', 
            'react-dom', 
            'three', 
            '@react-three/fiber', 
            '@react-three/drei', 
            '@supabase/supabase-js'
          ]
        }
      }
    }
  }
})