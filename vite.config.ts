import { defineConfig } from 'vite';

// base is injected at deploy time (it must be "/<repo>/" for GitHub Pages project sites,
// "/" for local dev/preview). The deploy workflow sets VITE_BASE.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  build: { target: 'es2020', outDir: 'dist' },
});