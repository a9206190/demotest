import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteObfuscate from 'vite-plugin-javascript-obfuscator'; 
import { terser } from "rollup-plugin-terser";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    viteObfuscate({
      apply: 'build',
      include: [/\.js$/, /\.jsx$/], 
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: true,
        debugProtectionInterval: 4000,
        disableConsoleOutput: true,
        identifierNamesGenerator: "hexadecimal",
        renameGlobals: true,
        stringArray: true,
        stringArrayEncoding: ["rc4"],
        stringArrayThreshold: 0.8
      },
    }),
  ],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@config': path.resolve(__dirname, 'config'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false, 
    minify: 'terser',  
    rollupOptions: {
      plugins: [
        terser({
          compress: true,
          mangle: true,
          format: { comments: false },
        }),
      ],
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            const randomHash = Math.random().toString(36).slice(2, 10);
            return `assets/[name]-${randomHash}[extname]`;
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
