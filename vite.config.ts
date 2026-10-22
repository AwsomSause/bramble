import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/bramble/',
  plugins: [react()],
  build: { manifest: true },
});
