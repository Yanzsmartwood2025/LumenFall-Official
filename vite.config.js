import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // 1. Esto le dice a Vite: "Oye, voy a usar React"
  plugins: [react()],
  
  // 2. IMPORTANTE: Esto arregla los enlaces rotos en Vercel
  base: './', 
  
  // 3. Esto permite que veas la página desde tu celular
  server: {
    host: true
  },
  
  // 4. Esto le dice a Vercel: "Guarda la web terminada en la carpeta 'dist'"
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
